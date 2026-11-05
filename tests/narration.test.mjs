import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {readFileSync} from 'node:fs';
import {mkdir, mkdtemp, readFile, rm, writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {dirname, join, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import test from 'node:test';
import {assertNarratedCheckpoint, BONUS_CTA_TEXT, buildNarrationPlan, narrationScriptSchema, preparedNarrationSchema, validatePreparedNarrationPlan} from '../src/narration.ts';
import {audioDurationToFrames, getNarratedTimeline, NARRATION_TIMING} from '../src/narrationTiming.ts';
import {getIllustratedQuestionState} from '../src/questionTiming.ts';
import {getChoiceHangul, parseQuizInput} from '../src/quizSchema.ts';
import {AUDIO_PROCESSING, audioCacheKey, loadPreparedNarration, prepareClip, quizSpeechFingerprint, sha256, validateAudioFile} from '../scripts/narrationFiles.ts';
import {synthesizeGoogle, UncertainSynthesisError} from '../scripts/googleTts.ts';
import {validateNarratedProbeMetadata, validateProbeMetadata} from '../scripts/mediaInspection.ts';
import {toneWav} from './helpers/audio.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const read = (file) => JSON.parse(readFileSync(join(root, file), 'utf8'));
const quiz = parseQuizInput(read('content/cafe-narrated-preview.json'));
const script = narrationScriptSchema.parse(read('content/narration/water.json'));
const episode = parseQuizInput(read('content/cafe-six.json'));
const episodeScript = narrationScriptSchema.parse(read('content/narration/cafe-six.json'));
const fakeManifest = (durations = [1, 1, 1, 1]) => ({version: 1, profile: script.profile, quizFingerprint: 'a'.repeat(64),
  processing: AUDIO_PROCESSING, clips: script.segments.map((segment, index) => ({...segment, file: `audio/cache/${'a'.repeat(64)}.wav`,
    cacheKey: 'a'.repeat(64), sha256: 'a'.repeat(64), sourceChecksum: 'a'.repeat(64), sourceKind: 'local',
    peakDbFS: -3, durationSeconds: durations[index]}))});
const temporaryDirectory = async (context) => {
  const parent = resolve(tmpdir());
  const directory = await mkdtemp(join(parent, 'korean-audio-test-'));
  assert.equal(dirname(directory), parent);
  context.after(() => rm(directory, {recursive: true, force: true}));
  return directory;
};

test('measured durations round up to complete integer frames and reject invalid durations', () => {
  assert.equal(audioDurationToFrames(1), 30);
  assert.equal(audioDurationToFrames(1.001), 31);
  for (const value of [0, -1, Infinity, NaN]) assert.throws(() => audioDurationToFrames(value), /finite and positive/u);
});

test('opening/question/reveal extend for speech; countdown remains exactly 150 silent frames with no overlaps', () => {
  const short = getNarratedTimeline(fakeManifest());
  assert.equal(short.openingEnd, 90);
  assert.equal(short.countdownStart - short.questionStart, 120);
  assert.equal(short.revealEnd - short.revealStart, 120);
  const long = getNarratedTimeline(fakeManifest([4.2, 6.1, 1.2, 9.2]));
  assert.ok(long.openingEnd >= long.audio[0].end + NARRATION_TIMING.afterHook);
  assert.ok(long.countdownStart >= long.audio[1].end + NARRATION_TIMING.afterQuestion);
  assert.ok(long.countdownStart >= long.questionStart + 120);
  assert.equal(long.revealStart - long.countdownStart, 150);
  assert.ok(long.revealEnd >= long.audio[3].end + 30);
  assert.ok(long.revealEnd - long.revealStart > 120);
  for (let index = 1; index < long.audio.length; index++) assert.ok(long.audio[index].start >= long.audio[index - 1].end);
  assert.ok(long.audio[1].start > long.questionStart);
  assert.ok(long.audio.every((clip) => clip.end <= long.countdownStart || clip.start >= long.revealStart));
  assert.equal(getIllustratedQuestionState(long.questionTimeline.revealStart - 1, false, long.questionTimeline).phase, 'countdown');
  assert.equal(getIllustratedQuestionState(long.questionTimeline.revealStart, false, long.questionTimeline).phase, 'reveal');
});

test('cache identity includes exact text, language, voice, model, settings, format, source and processing; visual style does not affect it', () => {
  const segment = script.segments[0];
  const key = audioCacheKey(segment, script.profile);
  assert.equal(key, audioCacheKey(segment, {...script.profile, background: 'changed-visual'}));
  for (const changed of [{...segment, text: `${segment.text} `}, {...segment, language: 'ko-KR'}]) {
    assert.notEqual(key, audioCacheKey(changed, script.profile));
  }
  for (const profile of [{...script.profile, provider: 'changed'}, {...script.profile, model: 'changed'}, {...script.profile, speakingRate: 0.9},
    {...script.profile, sampleRateHertz: 48000},
    {...script.profile, outputFormat: 'MP3'}, {...script.profile, voices: {...script.profile.voices, 'en-US': 'changed'}}]) {
    assert.notEqual(key, audioCacheKey(segment, profile));
  }
  assert.notEqual(audioCacheKey(segment, script.profile, 'a'.repeat(64)), audioCacheKey(segment, script.profile, 'b'.repeat(64)));
  const originalKeys = script.segments.map((item) => audioCacheKey(item, script.profile));
  const changedKeys = script.segments.map((item, index) => audioCacheKey(index === 1 ? {...item, text: `${item.text}!`} : item, script.profile));
  assert.deepEqual(originalKeys.map((value, index) => value !== changedKeys[index]), [false, true, false, false]);
});

test('plan uses explicit ordered Hangul answer and excludes hidden bonus answer/explanation before synthesis', () => {
  assert.equal(buildNarrationPlan(quiz, script).length, 4);
  const bad = structuredClone(script);
  bad.segments[2].text = 'mul juseyo';
  assert.throws(() => buildNarrationPlan(quiz, bad), /Hangul/u);
  const episode = parseQuizInput(read('content/cafe-six.json'));
  const segments = [{...script.segments[0], id: 'episode-hook', contentId: episode.videoId, text: episode.episodeTitle}];
  episode.questions.forEach((question, index) => {
    for (const role of ['question', 'answer', 'explanation']) segments.push({id: `q${index}-${role}`, contentId: question.id,
      role, language: role === 'answer' ? 'ko-KR' : 'en-US', text: role === 'answer'
        ? getChoiceHangul(question.choices[question.correctAnswerIndex]) : role === 'explanation' ? question.explanation
          : `${question.prompt}${question.context ? ` ${question.context}` : ''}`});
  });
  const plan = buildNarrationPlan(episode, {...script, segments});
  assert.deepEqual(plan.filter((segment) => segment.contentId === episode.questions.at(-1).id).map((segment) => segment.role), ['question']);
  assert.doesNotThrow(() => assertNarratedCheckpoint(episode));
  assert.throws(() => assertNarratedCheckpoint({...episode, episodeTitle: undefined}), /episodeTitle/u);
});

test('full measured timeline keeps six questions in order, complete reading/countdowns/reveals, direct Q5-to-bonus and no hidden speech', () => {
  const clips = buildNarrationPlan(episode, episodeScript).map((segment) => ({...fakeManifest().clips[0], ...segment, durationSeconds: 1}));
  const manifest = {...fakeManifest(), clips};
  const timeline = getNarratedTimeline(manifest, episode);
  assert.equal(timeline.durationInFrames, 2514); // Natural minimum: 83.8s, including terminal fade.
  assert.equal(timeline.questions.length, 6);
  assert.equal(timeline.audio.length, 18);
  assert.deepEqual(timeline.questions.map((question) => question.id), episode.questions.map((question) => question.id));
  assert.deepEqual(timeline.scenes.map((scene) => scene.kind), ['opening', ...Array(6).fill('question')]);
  for (const [index, question] of timeline.questions.entries()) {
    const speech = timeline.audio.filter((clip) => clip.contentId === question.id);
    assert.ok(question.countdownStart >= question.start + NARRATION_TIMING.readingMinimum);
    assert.ok(question.countdownStart >= speech[0].end + NARRATION_TIMING.afterQuestion);
    assert.equal(question.revealStart - question.countdownStart, 150);
    for (const clip of timeline.audio) assert.ok(clip.end <= question.countdownStart || clip.start >= question.revealStart);
    assert.equal(getIllustratedQuestionState(question.questionTimeline.revealStart - 1, question.bonus, question.questionTimeline).phase, 'countdown');
    assert.equal(getIllustratedQuestionState(question.questionTimeline.revealStart, question.bonus, question.questionTimeline).phase, question.bonus ? 'comment' : 'reveal');
    assert.deepEqual(speech.map((clip) => clip.role), question.bonus ? ['question', 'comment'] : ['question', 'answer', 'explanation']);
    assert.ok(speech.every((clip) => clip.start >= question.start && clip.end <= question.end));
    if (!question.bonus) {
      assert.ok(speech[1].start > question.revealStart);
      assert.equal(speech[2].start - speech[1].end, NARRATION_TIMING.answerGap);
      assert.ok(question.end >= speech[2].end + NARRATION_TIMING.afterExplanation);
    }
    if (index > 0) {
      const previous = timeline.questions[index - 1];
      assert.equal(question.start - previous.end, NARRATION_TIMING.transition);
      assert.equal(question.sequenceStart, previous.sequenceEnd);
    }
  }
  const bonus = timeline.questions.at(-1);
  for (let frame = bonus.revealStart; frame < timeline.durationInFrames; frame++) {
    assert.equal(getIllustratedQuestionState(frame - bonus.start, true, bonus.questionTimeline).phase, 'comment');
  }
  assert.equal(bonus.end - bonus.revealStart, NARRATION_TIMING.commentHold);
  assert.equal(timeline.durationInFrames - bonus.end, NARRATION_TIMING.finalFade);
  for (let index = 1; index < timeline.audio.length; index++) assert.ok(timeline.audio[index].start >= timeline.audio[index - 1].end);
  assert.throws(() => getNarratedTimeline(manifest), /validated quiz/u);
  const longer = structuredClone(manifest);
  longer.clips[0].durationSeconds = 4.201;
  longer.clips[4].durationSeconds = 8.001;
  longer.clips[6].durationSeconds = 9.001;
  const extended = getNarratedTimeline(longer, episode);
  assert.equal(extended.audio[0].end - extended.audio[0].start, 127);
  assert.ok(extended.openingEnd >= extended.audio[0].end + NARRATION_TIMING.afterHook);
  assert.ok(extended.questions[1].countdownStart >= extended.audio[4].end + NARRATION_TIMING.afterQuestion);
  assert.ok(extended.questions[1].end >= extended.audio[6].end + NARRATION_TIMING.afterExplanation);
});

test('bonus isolation filters forbidden source roles before preparation and refuses them in prepared rendering props', () => {
  const bonus = episode.questions.at(-1);
  assert.equal(episodeScript.segments.filter((segment) => segment.contentId === bonus.id).length, 2);
  const polluted = {...episodeScript, segments: [...episodeScript.segments,
    {id: 'forbidden-answer', contentId: bonus.id, role: 'answer', language: 'ko-KR', text: getChoiceHangul(bonus.choices[bonus.correctAnswerIndex])},
    {id: 'forbidden-explanation', contentId: bonus.id, role: 'explanation', language: 'en-US', text: bonus.reveal.translation}]};
  assert.equal(buildNarrationPlan(episode, polluted).length, 18);
  const clips = polluted.segments.map((segment) => ({...fakeManifest().clips[0], ...segment}));
  assert.throws(() => validatePreparedNarrationPlan(episode, {...fakeManifest(), clips}), /forbidden bonus/u);
});

test('neutral CTA starts only after the bonus countdown, extends the ending, and preserves exact caption timing data', () => {
  const clips = episodeScript.segments.map((segment) => ({...fakeManifest().clips[0], ...segment, durationSeconds: 1}));
  clips.at(-1).durationSeconds = 6.001;
  const timeline = getNarratedTimeline({...fakeManifest(), clips}, episode);
  const bonus = timeline.questions.at(-1), cta = timeline.audio.at(-1);
  assert.equal(cta.text, BONUS_CTA_TEXT);
  assert.equal(cta.language, 'en-US');
  assert.equal(cta.start, bonus.revealStart + NARRATION_TIMING.settlePause);
  assert.equal(cta.end - cta.start, 181);
  assert.ok(bonus.end >= cta.end + NARRATION_TIMING.afterExplanation);
  for (const [index, clip] of timeline.audio.entries()) {
    assert.equal(clip.text, clips[index].text);
    assert.equal(clip.durationSeconds, clips[index].durationSeconds);
    assert.equal(clip.end - clip.start, audioDurationToFrames(clip.durationSeconds));
  }
  const bad = structuredClone(episodeScript);
  bad.segments.at(-1).text = 'The correct answer is C.';
  assert.throws(() => buildNarrationPlan(episode, bad), /fixed neutral/u);
});

test('Google ADC client disables SDK retries and retries only one explicit rate limit, never auth/input/uncertain failures', async () => {
  const configuration = {project: 'test'};
  let calls = 0;
  const bytes = Buffer.from('test-response');
  const result = await synthesizeGoogle(script.segments[0], script.profile, configuration, {synthesizeSpeech: async (request, options) => {
    assert.equal(options.retry, null);
    assert.equal(options.timeout, 30000);
    assert.equal(request.voice.name, 'en-US-Chirp3-HD-Kore');
    calls++;
    if (calls === 1) throw Object.assign(new Error('quota'), {code: 8});
    return [{audioContent: bytes}];
  }}, async () => {});
  assert.equal(calls, 2); assert.deepEqual(result, bytes);
  for (const status of [3, 7, 16, 400, 401, 403, 500, 503]) {
    calls = 0;
    await assert.rejects(synthesizeGoogle(script.segments[0], script.profile, configuration,
      {synthesizeSpeech: async () => { calls++; throw Object.assign(new Error('test rejection'), {code: status}); }}));
    assert.equal(calls, 1);
  }
  calls = 0;
  await assert.rejects(synthesizeGoogle(script.segments[0], script.profile, configuration,
    {synthesizeSpeech: async () => { calls++; throw new Error('offline'); }}), UncertainSynthesisError);
  assert.equal(calls, 1);
  calls = 0;
  await assert.rejects(synthesizeGoogle(script.segments[0], script.profile,
    {...configuration, onRequest: () => { throw new Error('Budget exhausted'); }},
    {synthesizeSpeech: async () => { calls++; return [{audioContent: bytes}]; }}), /Budget exhausted/u);
  assert.equal(calls, 0);
});

test('local clips are processed before measurement, reused without synthesis, and reject corruption/missing data', async (context) => {
  const directory = await temporaryDirectory(context);
  const recording = join(directory, 'recording.wav');
  await writeFile(recording, toneWav());
  const local = {...script.segments[0], localFile: 'recording.wav', recordingId: 'technical-test-tone'};
  let generated = false;
  const options = {root: directory, generator: async () => { generated = true; throw new Error('No synthesis allowed in local test'); }};
  const first = await prepareClip(local, script.profile, options);
  const events = [];
  const again = await prepareClip(local, script.profile, {...options, onEvent: (kind) => events.push(kind)});
  assert.deepEqual(events, ['cache-hit']);
  assert.equal(generated, false);
  assert.equal(first.cacheKey, again.cacheKey);
  assert.ok(first.peakDbFS < -1);
  assert.ok(first.durationSeconds > 0);
  const changed = await prepareClip({...local, text: `${local.text}!`}, script.profile, {...options, onEvent: (kind) => events.push(kind)});
  assert.notEqual(first.cacheKey, changed.cacheKey);
  assert.deepEqual(events, ['cache-hit', 'local-prepared']);
  assert.equal((await prepareClip(local, script.profile, options)).cacheKey, first.cacheKey);
  await assert.rejects(validateAudioFile(join(directory, 'missing.wav')), /ENOENT/u);
  const corrupt = join(directory, 'corrupt.wav');
  await writeFile(corrupt, Buffer.from('not an audio file'));
  await assert.rejects(validateAudioFile(corrupt));
  await writeFile(join(directory, 'public', first.file), Buffer.from('tampered'));
  await assert.rejects(prepareClip(local, script.profile, options), /checksum mismatch/u);
});

test('prepared manifests bind content, checksums, durations and local paths before rendering', async (context) => {
  const directory = await temporaryDirectory(context);
  await writeFile(join(directory, 'recording.wav'), toneWav());
  const clips = [];
  for (const segment of script.segments) clips.push(await prepareClip({...segment, localFile: 'recording.wav'}, script.profile, {root: directory}));
  const manifest = preparedNarrationSchema.parse({version: 1, profile: script.profile, processing: AUDIO_PROCESSING,
    quizFingerprint: quizSpeechFingerprint(quiz), clips});
  const file = join(directory, 'manifest.json');
  await writeFile(file, JSON.stringify(manifest));
  await assert.doesNotReject(loadPreparedNarration(file, quiz, directory));
  await assert.rejects(loadPreparedNarration(file, {...quiz, episodeTitle: 'Different content'}, directory), /stale/u);
  const changed = structuredClone(manifest);
  changed.clips[3].text += ' Changed narration.';
  await writeFile(file, JSON.stringify(changed));
  await assert.rejects(loadPreparedNarration(file, quiz, directory), /stale audio identity.*audio:prepare/u);
  manifest.clips[0].durationSeconds += 0.1;
  await writeFile(file, JSON.stringify(manifest));
  await assert.rejects(loadPreparedNarration(file, quiz, directory), /duration mismatch/u);
  manifest.clips[0].durationSeconds -= 0.1;
  await writeFile(file, JSON.stringify(manifest));
  const audio = join(directory, 'public', clips[0].file);
  await writeFile(audio, Buffer.from('corrupt'));
  await assert.rejects(loadPreparedNarration(file, quiz, directory), /checksum mismatch.*restore/u);
  await rm(audio);
  await assert.rejects(loadPreparedNarration(file, quiz, directory), /prepared audio missing.*audio:prepare/u);
});

test('uncertain requests block duplicate synthesis; saved original audio recovers without another request', async (context) => {
  const directory = await temporaryDirectory(context);
  const segment = script.segments[0];
  const key = audioCacheKey(segment, script.profile);
  const cache = join(directory, '.audio-cache', key);
  await mkdir(cache, {recursive: true});
  const pending = join(cache, 'pending-request.json');
  await writeFile(pending, JSON.stringify({cacheKey: key, possibleCharge: true}));
  let calls = 0;
  const generator = async () => { calls++; throw new Error('Should not synthesize'); };
  await assert.rejects(prepareClip(segment, script.profile, {root: directory, synthesize: true, generator}), /outcome uncertain/u);
  assert.equal(calls, 0);
  await writeFile(join(cache, 'original.bin'), toneWav());
  const recovered = await prepareClip(segment, script.profile, {root: directory, generator});
  assert.equal(calls, 0);
  assert.ok(recovered.durationSeconds > 0);
  await assert.rejects(readFile(pending), /ENOENT/u);
});

test('missing manifest fails actual narrated CLI before a render directory is created', async (context) => {
  const directory = await temporaryDirectory(context);
  const outputFolder = join(directory, 'never-created');
  const result = spawnSync(process.execPath, ['--experimental-strip-types', join(root, 'scripts/renderNarrated.ts'),
    '--input', join(root, 'content/cafe-narrated-preview.json'), '--audio-manifest', join(directory, 'missing.json'),
    '--output', join(outputFolder, 'preview.mp4')], {cwd: root, encoding: 'utf8', shell: false, windowsHide: true, timeout: 10000});
  assert.equal(result.status, 1, result.error?.message);
  assert.doesNotMatch(result.stdout, /Validated .*local audio|Bundling/u);
  await assert.rejects(readFile(join(outputFolder, 'preview.mp4')), /ENOENT/u);
});

test('AAC output inspection extends silent checks and rejects truncated/wrong audio', () => {
  const video = {codec_type: 'video', codec_name: 'h264', width: 1080, height: 1920, pix_fmt: 'yuv420p', avg_frame_rate: '30/1', nb_frames: '504'};
  const probe = {streams: [video, {codec_type: 'audio', codec_name: 'aac', duration: '16.8'}], format: {duration: '16.8'}};
  assert.equal(validateNarratedProbeMetadata(probe, 504, 448).duration, 16.8);
  assert.throws(() => validateNarratedProbeMetadata({...probe, streams: [video]}, 504, 448), /AAC/u);
  assert.throws(() => validateNarratedProbeMetadata({...probe, streams: [video, {codec_type: 'audio', codec_name: 'mp3', duration: '16.8'}]}, 504, 448), /AAC/u);
  assert.throws(() => validateNarratedProbeMetadata({...probe, streams: [video, {codec_type: 'audio', codec_name: 'aac', duration: '2'}]}, 504, 448), /ends before/u);
  assert.throws(() => validateNarratedProbeMetadata({...probe, streams: [video, {codec_type: 'audio', codec_name: 'aac', duration: '20'}]}, 504, 448), /extends beyond/u);
  assert.throws(() => validateNarratedProbeMetadata(probe, 504, 448, 65), /Minimum duration/u);
  assert.equal(validateProbeMetadata({streams: [video], format: probe.format}, 504).duration, 16.8);
});
