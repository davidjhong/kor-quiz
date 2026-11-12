import assert from 'node:assert/strict';
import test from 'node:test';
import {readFileSync} from 'node:fs';
import {mkdtemp, mkdir, writeFile, rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {getCompactQuestionLayout,COMPACT_PROMPT_HEIGHT, COUNTDOWN_ROW, getExplanationCaption, getNarrationCaption, getSynchronizedCta, getMusicGain, MUSIC_MIX, presentationSchema} from '../src/presentation.ts';
import {productionSettings} from '../scripts/productionPlan.ts';
import {NAMED_VOICE_PROFILES,resolveVoiceProfileFile} from '../scripts/voiceProfiles.ts';
import {fileURLToPath} from 'node:url';
import {CAPTION_BAND} from '../src/phraseCaptions.ts';
import {defaultVoiceProfile} from '../scripts/generationContent.ts';
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

test('countdown has padded room inside short, two-line and crowded panels without changing choice geometry',()=>{
  for(const [prompt,context] of [[72.32,33.6],[144.64,33.6],[163,36],[163,62]]){
    const g=getCompactQuestionLayout(prompt,context);
    assert(g.feedbackDisplayHeight>=COUNTDOWN_ROW.minimumHeight);
    assert(g.feedback+g.feedbackDisplayHeight<=CAPTION_BAND.panelHeight-COUNTDOWN_ROW.bottomGap);
    assert(g.feedbackDisplayHeight-2*COUNTDOWN_ROW.padding>COUNTDOWN_ROW.barHeight);
    assert.equal(g.feedback-g.answers,3*136+2*14+(prompt+context>200?8:prompt>150?12:24));
  }
  assert.equal(t.question.revealStart-t.question.countdownStart,150);
});

test('named voice overrides resolve to the exact tested profiles; Achird stays default',async()=>{
  const root=fileURLToPath(new URL('../',import.meta.url));
  for(const [name,file] of Object.entries(NAMED_VOICE_PROFILES)){
    const settings=await productionSettings({voiceFile:name,presentationFile:'content/production/default.json',noMusic:true},root);
    assert.deepEqual(settings.voice,json(file).profile);
    assert.deepEqual(settings.voice, (await productionSettings({voiceFile:file,presentationFile:'content/production/default.json'},root)).voice);
  }
  assert.deepEqual(json('content/voice-profiles/selected-default.json').profile,json(NAMED_VOICE_PROFILES.achird).profile);
  assert.equal(resolveVoiceProfileFile('custom/profile.json'),'custom/profile.json');
});

test('changing only the English voice invalidates English audio, preserves Korean audio, and ignores scenery',()=>{
  const base=json(NAMED_VOICE_PROFILES.achird).profile,changed=structuredClone(base);
  changed.voices['en-US']=json(NAMED_VOICE_PROFILES.kore).profile.voices['en-US'];
  const en=selected.find(s=>s.language==='en-US'),ko=selected.find(s=>s.language==='ko-KR');
  assert.notEqual(audioCacheKey(en,base),audioCacheKey(en,changed));
  assert.equal(audioCacheKey(ko,base),audioCacheKey(ko,changed));
  assert.equal(audioCacheKey({...en,backgroundAssetId:'some-other-image'},base),audioCacheKey(en,base));
});

test('compact geometry removes short-heading whitespace with fixed gaps and readable feedback space', () => {
  const short = getCompactQuestionLayout(72.32, 33.6), long = getCompactQuestionLayout(144.64, 33.6);
  assert.equal(short.answers - (short.context + 34), 20);
  assert(short.answers < long.answers); assert(long.answers <= 326);
  for (const layout of [short,long]) assert(layout.feedbackHeight >= 164);
  for (const phase of ['reading','countdown','reveal','comment']) assert.deepEqual(getCompactQuestionLayout(72.32,33.6), short, phase);
  assert.throws(() => getCompactQuestionLayout(350,36), /insufficient/u);
});
test('three-line headings retain font floors, fixed choice spacing and a countdown inside the compact panel',()=>{
  assert(COMPACT_PROMPT_HEIGHT>=Math.ceil(48*1.13*3));
  const geometry=getCompactQuestionLayout(Math.ceil(48*1.13*3),36);
  assert.equal(geometry.answers-geometry.context-36,20);
  assert(geometry.feedback+geometry.feedbackDisplayHeight<=CAPTION_BAND.panelHeight-12);
  for(const phase of ['reading','countdown','reveal'])assert.deepEqual(getCompactQuestionLayout(163,36),geometry,phase);
});
test('a three-line heading plus two-line context fits above captions without shrinking the answer rows',()=>{
  const layout=getCompactQuestionLayout(163,62);
  assert.equal(layout.answers-layout.context-62,12);
  assert.equal(layout.feedback-layout.answers,3*136+2*14+8);
  assert(layout.feedback+layout.feedbackDisplayHeight<=CAPTION_BAND.panelHeight-12);
  assert.equal(layout.feedbackDisplayHeight,72);
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

test('all exact speech captions use measured boundaries and never return bonus answer/explanation text', () => {
  for (const clip of t.audio) {
    assert.notEqual(getNarrationCaption(clip.start-1,clip.contentId,t.audio)?.role,clip.role);
    assert.equal(getNarrationCaption(clip.start,clip.contentId,t.audio)?.text,clip.text);
    assert.equal(getNarrationCaption(clip.end-1,clip.contentId,t.audio)?.text,clip.text);
    assert.notEqual(getNarrationCaption(clip.end,clip.contentId,t.audio)?.role,clip.role);
    if (['answer','explanation'].includes(clip.role)) assert.equal(getNarrationCaption(clip.start,clip.contentId,t.audio,true),null);
  }
  const question = t.audio.find(c=>c.role==='question');
  assert.notEqual(question.text,quiz.questions[2].prompt);
  assert.equal(getNarrationCaption(t.question.countdownStart,question.contentId,t.audio),null);
});

test('configurable music multiplier raises every gain including ducking by exactly 25 percent', () => {
  assert.equal(presentationSchema.parse({compactSpacing:true,synchronizedCaptions:true,backgroundAudio:true}).musicGain,1);
  for(let f=0;f<t.durationInFrames;f++) {
    const before=getMusicGain(f,t.durationInFrames,t.audio,[t.question]);
    assert.equal(getMusicGain(f,t.durationInFrames,t.audio,[t.question],1.25),before*1.25);
  }
  assert(Math.abs(20*Math.log10(1.25)-1.9382)<0.001);
  assert.equal(getMusicGain(0,t.durationInFrames,t.audio,[t.question],1.25),0);
  assert.equal(getMusicGain(t.durationInFrames-1,t.durationInFrames,t.audio,[t.question],1.25),0);
});

test('Achird is the selected generation default without mutating existing accepted or manual voice profiles', () => {
  assert.deepEqual(defaultVoiceProfile,profiles[2]);
  assert.equal(draft.narration.profile.voices['en-US'],'en-US-Chirp3-HD-Kore');
  voiceProfileSchema.parse(draft.narration.profile);
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

