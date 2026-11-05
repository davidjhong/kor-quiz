import assert from 'node:assert/strict';
import test from 'node:test';
import {readFileSync} from 'node:fs';
import {mkdtemp, mkdir, writeFile, rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {getCompactQuestionLayout, getExplanationCaption, getSynchronizedCta, getMusicGain, MUSIC_MIX} from '../src/presentation.ts';
import {getComparisonTimeline} from '../src/comparison.ts';
import {draftToQuiz} from '../src/draftSchema.ts';
import {preparedNarrationSchema, voiceProfileSchema} from '../src/narration.ts';
import {audioCacheKey} from '../scripts/narrationFiles.ts';
import {comparisonSegments, requestBound, reserveAttempt, GEMINI_REQUEST_BOUND_USD, loadMusic, applyFallbackAmendment, loadComparison, renderComparison} from '../scripts/comparisonWorkflow.ts';
import {synthesizeGoogle} from '../scripts/googleTts.ts';
import {crossfadeLoop} from '../scripts/prepareMusic.ts';
const json = (p) => JSON.parse(readFileSync(new URL(`../${p}`, import.meta.url), 'utf8'));
const draft = json('drafts/public-transit-02-candidate/draft.json'), quiz = draftToQuiz(draft);
const profiles = ['a-baseline','b-puck','c-achird'].map((id) => json(`content/voice-profiles/${id}.json`).profile);
const geminiProfile = json('content/voice-profiles/c-achird-gemini-requested.json').profile;
const full = json('public/audio/public-transit-02/manifest.json');
const selected = comparisonSegments(draft.narration, quiz.questions[2].id);
const narration = {...full, clips: full.clips.filter((c) => selected.some((s) => s.id === c.id))};
const t = getComparisonTimeline(quiz, 2, narration);

test('compact geometry removes short-heading whitespace with fixed gaps and readable feedback space', () => {
  const short = getCompactQuestionLayout(72.32, 33.6), long = getCompactQuestionLayout(144.64, 33.6);
  assert.equal(short.answers - (short.context + 34), 20);
  assert(short.answers < long.answers); assert(long.answers <= 326);
  for (const layout of [short,long]) assert(layout.feedbackHeight >= 164);
  for (const phase of ['reading','countdown','reveal','comment']) assert.deepEqual(getCompactQuestionLayout(72.32,33.6), short, phase);
  assert.throws(() => getCompactQuestionLayout(350,36), /insufficient/u);
});
test('excerpt reuses complete timing and exact six source segments without the bonus question or private key', () => {
  assert.deepEqual(selected.map((c) => c.role), ['hook','question','answer','explanation','comment','follow']);
  assert(t.durationInFrames / 30 >= 30 && t.durationInFrames / 30 <= 45);
  assert.equal(t.question.revealStart - t.question.countdownStart,150);
  assert(t.question.countdownStart >= t.audio[1].end + 15);
  assert.equal(t.ending.followStart - t.ending.commentEnd,45);
  assert.equal(t.ending.end - t.ending.followEnd,30);
  assert.equal(t.durationInFrames - t.ending.end,12);
  assert.equal(t.question.sequenceEnd,t.ending.sequenceStart);
  for (let i=1;i<t.audio.length;i++) assert(t.audio[i].start >= t.audio[i-1].end);
});
test('explanation captions use exact narration and half-open segment boundaries, never opening/question/bonus captions', () => {
  const clip = t.audio.find((c) => c.role === 'explanation'), id = quiz.questions[2].id;
  assert.equal(getExplanationCaption(clip.start - 1,id,t.audio),null);
  assert.equal(getExplanationCaption(clip.start,id,t.audio),clip.text);
  assert.equal(getExplanationCaption(clip.end - 1,id,t.audio),clip.text);
  assert.equal(getExplanationCaption(clip.end,id,t.audio),null);
  assert.equal(getExplanationCaption(clip.start,id,t.audio,true),null);
  assert.equal(getExplanationCaption(0,id,t.audio),null);
});
test('comment/follow visuals begin with corresponding audio, retaining neutral invitation during exact pause', () => {
  const id = selected[4].contentId;
  assert.equal(getSynchronizedCta(t.ending.commentStart-1,t.audio,id),null);
  assert.equal(getSynchronizedCta(t.ending.commentStart,t.audio,id),'comment');
  assert.equal(getSynchronizedCta(t.ending.followStart-1,t.audio,id),'comment');
  assert.equal(getSynchronizedCta(t.ending.followStart,t.audio,id),'follow');
});
test('music uses smooth timeline ducking, quiet countdowns, and zero-gain composition boundaries', () => {
  const duration = t.durationInFrames, gain = (frame) => getMusicGain(frame,duration,t.audio,[t.question]);
  assert.equal(gain(0),0); assert.equal(gain(duration-1),0);
  const speech = t.audio.find((c) => c.role === 'explanation');
  assert(gain(speech.start + 15) <= MUSIC_MIX.speech + 1e-10);
  assert(gain(t.question.countdownStart+30) <= MUSIC_MIX.thinking + 1e-10);
  for (let f=1;f<duration;f++) {assert(gain(f)>=0 && gain(f)<=0.25); assert(Math.abs(gain(f)-gain(f-1))<0.03);}
});
test('all baseline cache keys remain identical; alternatives and exact style settings invalidate identity', () => {
  for (const clip of narration.clips) assert.equal(audioCacheKey(clip,profiles[0]),clip.cacheKey);
  for (const profile of profiles) voiceProfileSchema.parse(profile);
  const segment = selected[1], key = audioCacheKey(segment,geminiProfile);
  assert.notEqual(key,audioCacheKey(segment,profiles[0]));
  assert.notEqual(key,audioCacheKey({...segment,text:segment.text+' Extra.'},geminiProfile));
  const edited = structuredClone(geminiProfile); edited.stylePrompts['en-US'] += ' Clearly.';
  assert.notEqual(key,audioCacheKey(segment,edited));
});
test('budget reserves full model ceilings, bounds per-key retries and enforces total cap before requests', () => {
  assert.equal(requestBound('abc',profiles[0]),0.00009);
  assert.equal(requestBound('abc',geminiProfile),GEMINI_REQUEST_BOUND_USD);
  const attempts=[], row={cacheKey:'a',profileId:'c-achird',model:profiles[2].model,characters:3,reservedUSD:GEMINI_REQUEST_BOUND_USD,chargedEstimateUSD:GEMINI_REQUEST_BOUND_USD,status:'reserved-before-request'};
  reserveAttempt(attempts,{...row},2.04); reserveAttempt(attempts,{...row},2.04);
  assert.throws(()=>reserveAttempt(attempts,{...row},2.04),/request limit/u);
  assert.throws(()=>reserveAttempt([],{...row},0.01),/cap/u);
});
test('Gemini uses documented prompt/model fields without unsupported pitch/rate controls; no paid request in test', async () => {
  let count=0;
  const client={synthesizeSpeech:async (request,options)=>{
    count++; assert.equal(request.voice.modelName,'gemini-2.5-flash-tts'); assert.equal(request.voice.name,'Achird');
    assert.equal(request.input.text,selected[1].text); assert.equal(request.input.prompt,geminiProfile.stylePrompts['en-US']);
    assert.equal(request.audioConfig.speakingRate,undefined); assert.equal(options.retry,null);
    return [{audioContent:Buffer.from('fixture only')}];
  }};
  await synthesizeGoogle(selected[1],geminiProfile,{project:'fixture'},client);
  assert.equal(count,1);
  await assert.rejects(synthesizeGoogle({...selected[1],text:'a'.repeat(4001)},geminiProfile,{project:'fixture'},client),/no request made/u);
  assert.equal(count,1);
});
test('fallback needs exact user scope amendment and retains the rejected request reservation',()=>{
  const ledger={planHash:'old',state:'blocked',attempts:[{cacheKey:'k',profileId:'c-achird',model:'gemini-2.5-flash-tts',characters:25,
    reservedUSD:GEMINI_REQUEST_BOUND_USD,chargedEstimateUSD:GEMINI_REQUEST_BOUND_USD,status:'reserved-before-request'}]};
  const amendment={kind:'user-authorized-chirp-fallback',source:'fixture user instruction',fromPlanHash:'old',toPlanHash:'new',contentHash:'hash',capUSD:2.04};
  assert.throws(()=>applyFallbackAmendment(structuredClone(ledger),{...amendment,toPlanHash:'wrong'},'new','hash'));
  applyFallbackAmendment(ledger,amendment,'new','hash');
  assert.equal(ledger.attempts[0].chargedEstimateUSD,GEMINI_REQUEST_BOUND_USD);
  assert.equal(ledger.attempts[0].status,'permission-rejected-reservation-retained');
  assert.equal(ledger.state,'ready'); assert.equal(ledger.planHash,'new');
});
test('missing/corrupt music fails clearly and disabled music needs no asset',async(t)=>{
  const root=await mkdtemp(join(tmpdir(),'quiz-music-')); t.after(()=>rm(root,{recursive:true,force:true}));
  assert.equal(await loadMusic(false,root),null);
  await assert.rejects(loadMusic(true,root),/Missing music manifest/u);
  await mkdir(join(root,'public/audio/music'),{recursive:true});
  const metadata={file:'audio/music/subtle-bass-loop.wav',sha256:'0'.repeat(64),durationSeconds:2,license:'CC0-1.0'};
  await writeFile(join(root,'public/audio/music/manifest.json'),JSON.stringify(metadata));
  await assert.rejects(loadMusic(true,root),/Missing prepared music WAV/u);
  await writeFile(join(root,metadata.file.replace('audio/','public/audio/')),'corrupt');
  await assert.rejects(loadMusic(true,root),/checksum mismatch/u);
});
test('prepared loop has documented rights and valid bounds; crossfade rejects malformed input',()=>{
  const music=json('public/audio/music/manifest.json');
  assert.equal(music.license,'CC0-1.0'); assert.equal(music.attributionRequired,false); assert(music.durationSeconds>45);
  assert.throws(()=>crossfadeLoop(Buffer.alloc(20)),/expects stereo/u);
});
test('comparison render preflight rejects missing/corrupt voice files before starting a browser',async(t)=>{
  const root=await mkdtemp(join(tmpdir(),'quiz-voice-preflight-')); t.after(()=>rm(root,{recursive:true,force:true}));
  const input=await loadComparison();
  // Isolated preservation record for a fixture root; no real baseline is edited.
  await mkdir(join(root,'data/voice-comparison/transit-01'),{recursive:true});
  await writeFile(join(root,'data/voice-comparison/transit-01/baseline-preservation.json'),JSON.stringify({files:[]}));
  await mkdir(join(root,'public/audio/voice-comparison/transit-01'),{recursive:true});
  const prepared={sourceContentHash:input.bundle.contentHash,planHash:input.planHash,narration};
  await writeFile(join(root,'public/audio/voice-comparison/transit-01/a-baseline.json'),JSON.stringify(prepared));
  await assert.rejects(renderComparison(input,'a-baseline',false,root),/local voice WAV missing/u);
  await mkdir(join(root,'public/audio/cache'),{recursive:true});
  await writeFile(join(root,'public',narration.clips[0].file),'invalid fixture bytes');
  await assert.rejects(renderComparison(input,'a-baseline',false,root),/corrupt voice WAV/u);
});
