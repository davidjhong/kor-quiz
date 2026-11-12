import assert from 'node:assert/strict';
import test from 'node:test';
import {mkdtemp,rm,mkdir,writeFile} from 'node:fs/promises';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {ALIGNMENT_CONFIG,CAPTION_BAND,makeCaptionPhrases,getActivePhrase,getPhraseAnimation} from '../src/phraseCaptions.ts';
import {alignmentKey,readAlignment} from '../scripts/captionAlignment.ts';
const clip={id:'q-question',contentId:'q',role:'question',language:'en-US',start:100,end:250};
const alignment={key:'key',audioSha256:'a',transcript:'You need a ticket before traveling.',language:'en-US',configuration:ALIGNMENT_CONFIG,
  durationSeconds:5,words:[['You',.1,.3],[' need',.32,.63],[' a',.64,.72],[' ticket',.74,1.28],[' before',1.62,1.97],[' traveling.',2.1,2.7]]
    .map(([text,start,end])=>({text,start,end,probability:.8}))};
test('phrase times use unequal acoustic word boundaries, preserving exact punctuation and text',()=>{
  const p=makeCaptionPhrases(alignment,['You need a ticket','before traveling.'],clip,300);
  assert.deepEqual(p.map(x=>[x.text,x.start,x.end]),[['You need a ticket',103,139],['before traveling.',149,181]]);
  assert.equal(getActivePhrase(102,p),null); assert.equal(getActivePhrase(103,p)?.text,p[0].text);
  assert.equal(getActivePhrase(139,p),null); assert.equal(getActivePhrase(149,p)?.text,p[1].text);
  assert.throws(()=>makeCaptionPhrases(alignment,['You need an extra ticket'],clip,300),/transcript mismatch/u);
  const anchored=makeCaptionPhrases({...alignment,words:alignment.words.map((w,i)=>i===0?{...w,end:w.start}:w)},['You need a ticket','before traveling.'],clip,300);
  assert.equal(anchored[0].start,110); // "You" is text anchored to measured "need", not an invented word interval.
});
test('Korean phrase stays together, with reveal/bonus protections at preparation and display',()=>{
  const a={...alignment,language:'ko-KR',transcript:'표는 어디에서 사요?',words:[{text:'표는 어디에서 사요?',start:.12,end:1.8,probability:.9}]};
  const c={...clip,role:'answer',language:'ko-KR',start:400,end:463};
  const p=makeCaptionPhrases(a,[a.transcript],c,390);
  assert.equal(p.length,1); assert.equal(p[0].text,a.transcript);
  assert.equal(getActivePhrase(p[0].start,p,['q'],390),null);
  assert.equal(getActivePhrase(p[0].start,p,[],500),null);
  assert.throws(()=>makeCaptionPhrases(a,[a.transcript],c,500),/unsafe/u);
  assert.throws(()=>makeCaptionPhrases(a,[a.transcript],c,390,['q']),/forbidden/u);
});
test('alignment cache binds exact audio checksum, transcript, language and configuration',()=>{
  const c={sha256:'a',text:alignment.transcript,language:'en-US'},key=alignmentKey(c);
  for(const changed of [{...c,sha256:'b'},{...c,text:c.text+' '},{...c,language:'ko-KR'}])assert.notEqual(alignmentKey(changed),key);
  assert.notEqual(alignmentKey(c,{...ALIGNMENT_CONFIG,model:'small'}),key);
  assert.equal(alignmentKey(c),key);
});
test('missing/stale alignment reports a local preparation command before rendering',async t=>{
  const root=await mkdtemp(join(tmpdir(),'caption-cache-'));t.after(()=>rm(root,{recursive:true,force:true}));
  const c={sha256:'a',text:alignment.transcript,language:'en-US',id:'clip',durationSeconds:5};
  await assert.rejects(readAlignment(c,root),/voice:align/u);
  await mkdir(join(root,'.audio-cache/caption-alignments'),{recursive:true});
  await writeFile(join(root,'.audio-cache/caption-alignments',alignmentKey(c)+'.json'),JSON.stringify({...alignment,key:alignmentKey(c),configuration:{old:true}}));
  await assert.rejects(readAlignment(c,root),/stale alignment/u);
});
test('caption band clears reclaimed panel, stays above the head and fits at most two lines without choice shrinkage',()=>{
  assert(CAPTION_BAND.top>180+CAPTION_BAND.panelHeight);
  assert(CAPTION_BAND.top+CAPTION_BAND.height<=1200);
  assert(CAPTION_BAND.minimumFontSize>=54);
  assert(CAPTION_BAND.height<CAPTION_BAND.minimumFontSize*CAPTION_BAND.lineHeight*3);
});
test('entrance/exit animation is bounded and deterministic, without positional bouncing',()=>{
  const p={start:10,end:35};
  for(let f=10;f<35;f++){
    const a=getPhraseAnimation(f,p);assert(a.opacity>0&&a.opacity<=1);assert(a.scale>=.96&&a.scale<=1);
    assert.deepEqual(getPhraseAnimation(f,p),a);
  }
  assert.equal(getPhraseAnimation(14,p).opacity,1);assert(getPhraseAnimation(34,p).opacity<1);
});
