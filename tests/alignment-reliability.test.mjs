import assert from 'node:assert/strict';
import test from 'node:test';
import {readFile,mkdtemp,mkdir,writeFile,rm} from 'node:fs/promises';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {createHash} from 'node:crypto';
import {groupAlignedText} from '../scripts/productionCaptions.ts';
import {makeCaptionPhrases} from '../src/phraseCaptions.ts';
import {validateAlignedWords} from '../src/alignmentValidation.ts';
import {prepareLocalAlignments} from '../scripts/localAlignment.ts';
import {alignmentKey} from '../scripts/captionAlignment.ts';
import {ALIGNMENT_CONFIG} from '../src/phraseCaptions.ts';
const c={id:'fixture-question',contentId:'q',role:'question',language:'en-US',start:0,end:600};
const fixture=()=>({key:'synthetic',transcript:'One two three four five six.',language:'en-US',durationSeconds:3,
 words:['One','two','three','four','five','six.'].map((text,i)=>({text,start:i*.3,end:i*.3+.2,probability:1}))});
test('historical chosen/but/Your/finished fixtures are byte copies of saved output and yield anchored exact captions',async()=>{
 const folder=new URL('./fixtures/restaurant-alignments/',import.meta.url),seen=[],manifest=JSON.parse(await readFile(new URL('manifest.json',folder),'utf8'));
 for(const {file,sha256}of manifest.entries){
  const bytes=await readFile(new URL(file,folder)),a=JSON.parse(bytes);
  assert.equal(createHash('sha256').update(bytes).digest('hex'),sha256);
  seen.push(...a.words.filter(w=>w.start===w.end).map(w=>w.text.trim()));
  const groups=groupAlignedText(a),phrases=makeCaptionPhrases(a,groups,{...c,end:Math.ceil(a.durationSeconds*30)},0);
  assert.equal(phrases.map(p=>p.text).join(' '),a.transcript);
  for(const p of phrases)assert(p.end>p.start);
 }
 for(const word of ['chosen','but','Your','finished'])assert(seen.includes(word));
});
test('leading, trailing and middle zero groups merge into readable positive phrases, including Korean',()=>{
 for(const indices of [[0],[5],[2,3]]){const a=fixture();for(const i of indices)a.words[i].end=a.words[i].start;
  const groups=groupAlignedText(a),p=makeCaptionPhrases(a,groups,c,0);assert.equal(p.map(x=>x.text).join(' '),a.transcript);assert(p.every(x=>x.end>x.start));}
 const a=fixture();a.words[2].end=a.words[2].start;a.words[3].end=a.words[3].start;
 const merged=makeCaptionPhrases(a,['One two','three four','five six.'],c,0);
 assert.equal(merged.map(p=>p.text).join(' '),a.transcript);assert(merged.every(p=>p.end>p.start));
 const ko={key:'synthetic-ko',language:'ko-KR',durationSeconds:2,transcript:'물 좀 주세요.',words:[{text:'물',start:0,end:0},{text:' 좀',start:.1,end:.5},{text:' 주세요.',start:.5,end:1.2}]};
 assert.deepEqual(groupAlignedText(ko),[ko.transcript]);assert(makeCaptionPhrases(ko,[ko.transcript],{...c,language:'ko-KR'},0)[0].end>0);
});
test('invalid numeric spans, overlaps, reversed/order/out-of-range, all-zero and mismatched transcripts fail without dumps',async t=>{
 for(const patch of [{start:NaN},{end:Infinity},{start:-.1},{end:-.1},{start:1,end:.4},{end:4}]){const a=fixture();Object.assign(a.words[1],patch);assert.throws(()=>validateAlignedWords(a,'clip-id'),/clip-id.*invalid alignment/u);}
 const a=fixture();a.words[1].start=0;assert.throws(()=>groupAlignedText(a),/order|overlap/u);
 assert.throws(()=>groupAlignedText({...fixture(),transcript:'Wrong text.'}),/mismatch/u);
 const zeros=fixture();for(const w of zeros.words)w.end=w.start;assert.throws(()=>groupAlignedText(zeros),/all words.*zero/u);
 assert.throws(()=>groupAlignedText({...fixture(),durationSeconds:NaN}),/duration/u);
 const root=await mkdtemp(join(tmpdir(),'raw-alignment-preserved-'));t.after(()=>rm(root,{recursive:true,force:true}));
 const clip={id:'corrupt-segment',sha256:'a'.repeat(64),text:zeros.transcript,language:'en-US',durationSeconds:3},key=alignmentKey(clip),folder=join(root,'.audio-cache/caption-alignments');await mkdir(folder,{recursive:true});
 const file=join(folder,key+'.json'),saved=JSON.stringify({...zeros,key,audioSha256:clip.sha256,configuration:ALIGNMENT_CONFIG});await writeFile(file,saved);
 await assert.rejects(prepareLocalAlignments([clip],root),/corrupt-segment.*raw cache preserved/u);assert.equal(await readFile(file,'utf8'),saved);
});
