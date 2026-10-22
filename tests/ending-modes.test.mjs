import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {existsSync, readFileSync} from 'node:fs';
import {mkdtemp, rm, writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
import test from 'node:test';
import {parseQuizInput} from '../src/quizSchema.ts';
import {getEpisodePolicy, getScorePrompt} from '../src/episodePolicy.ts';
import {getIllustratedQuestionState} from '../src/questionTiming.ts';
import {EPISODE_TIMING, getEpisodeSceneOpacity, getIllustratedEpisodeTimeline} from '../src/quizTimeline.ts';
import {createBonusAnswerKey} from '../scripts/answerKey.ts';
import {validateMinimumDuration, validateProbeMetadata} from '../scripts/mediaInspection.ts';

const root = fileURLToPath(new URL('../', import.meta.url));
const read = (file) => JSON.parse(readFileSync(join(root, file), 'utf8'));
const six = parseQuizInput(read('content/cafe-six.json'));

test('legacy input remains unchanged and standard mode scores/reveals every question', () => {
  const input = read('content/cafe.json');
  const quiz = parseQuizInput(input);
  assert.deepEqual(quiz, input);
  const policy = getEpisodePolicy(quiz);
  assert.equal(policy.commentChallenge, false);
  assert.equal(policy.scoredQuestions, 3);
  assert.ok(quiz.questions.every((_, index) => !policy.isBonus(index)));
  assert.equal(getIllustratedQuestionState(270, false).phase, 'reveal');
  const timeline = getIllustratedEpisodeTimeline(quiz);
  assert.equal(timeline.scenes.at(-1).kind, 'score');
  assert.equal(createBonusAnswerKey(quiz), undefined);
  assert.equal(getScorePrompt(3, false), 'How many did you get right?');
});

test('comment challenge rejects fewer than two questions and missing source translation', () => {
  assert.throws(() => parseQuizInput({...six, questions: [six.questions[0]]}), /at least two/u);
  const missing = structuredClone(six);
  delete missing.questions.at(-1).reveal;
  assert.throws(() => parseQuizInput(missing), /Question 6.*reveal.*translation/u);
  assert.throws(() => parseQuizInput({...six, endingMode: 'random'}), /endingMode/u);
});

test('six-question progression is easy/easy/medium/medium/hard/hard; only final question is unscored', () => {
  assert.deepEqual(six.questions.map((question) => question.difficulty), ['easy', 'easy', 'medium', 'medium', 'hard', 'hard']);
  assert.equal(six.showRomanization, true);
  const policy = getEpisodePolicy(six);
  assert.equal(policy.totalQuestions, 6);
  assert.equal(policy.scoredQuestions, 5);
  assert.deepEqual(six.questions.map((_, index) => policy.isBonus(index)), [false, false, false, false, false, true]);
  assert.equal(getScorePrompt(policy.scoredQuestions, true), 'How many of the first 5 did you get right?');
  const two = {...six, questions: six.questions.slice(-2)};
  assert.equal(getEpisodePolicy(two).scoredQuestions, 1);
});

test('bonus has a normal countdown then a neutral comment state at every would-be reveal frame', () => {
  assert.equal(getIllustratedQuestionState(119, true).phase, 'reading');
  assert.equal(getIllustratedQuestionState(120, true).secondsRemaining, 5);
  assert.equal(getIllustratedQuestionState(269, true).secondsRemaining, 1);
  for (let frame = 270; frame < 500; frame++) {
    const state = getIllustratedQuestionState(frame, true);
    assert.equal(state.phase, 'comment');
    assert.equal(state.revealProgress, 0);
    assert.equal(state.secondsRemaining, null);
  }
  assert.equal(getIllustratedQuestionState(270, false).phase, 'reveal');
});

test('comment challenge goes directly from the completed fifth reveal to bonus with no score scene or leftover gap', () => {
  const timeline = getIllustratedEpisodeTimeline(six);
  assert.equal(timeline.durationInFrames, 2502);
  assert.deepEqual(timeline.questionStarts, [102, 504, 906, 1308, 1710, 2112]);
  assert.equal(timeline.scenes[0].end - timeline.scenes[0].start, 90);
  assert.deepEqual(timeline.scenes.map((scene) => scene.kind), ['opening', 'question', 'question', 'question', 'question', 'question', 'question']);
  const fifth = timeline.scenes.at(-2);
  const bonus = timeline.scenes.at(-1);
  assert.equal(fifth.end - (fifth.start + 270), 120);
  assert.equal(bonus.start - fifth.end, EPISODE_TIMING.transitionFrames);
  assert.equal(fifth.sequenceEnd, bonus.sequenceStart);
  for (let index = 0; index < timeline.scenes.length; index++) {
    const scene = timeline.scenes[index];
    if (index > 0) {
      const previous = timeline.scenes[index - 1];
      assert.equal(scene.sequenceStart, previous.sequenceEnd);
      assert.equal(scene.start - previous.end, EPISODE_TIMING.transitionFrames);
    }
    for (let frame = scene.sequenceStart; frame < scene.sequenceEnd; frame++) {
      assert.ok(getEpisodeSceneOpacity(frame, scene) > 0);
    }
    if (scene.kind === 'question') {
      assert.equal(scene.end - scene.start, 390);
      assert.equal(getIllustratedQuestionState(120, scene.bonus).secondsRemaining, 5);
    }
  }
  assert.equal(timeline.scenes.at(-1).end - (timeline.scenes.at(-1).start + 270), 120);
  const standard = getIllustratedEpisodeTimeline({...six, endingMode: 'standard'});
  assert.equal(standard.durationInFrames - timeline.durationInFrames,
    EPISODE_TIMING.scoreFrames + EPISODE_TIMING.transitionFrames);
  assert.equal(standard.scoredQuestions, 6);
  assert.equal(standard.scenes.at(-1).kind, 'score');
  assert.ok(standard.scenes.filter((scene) => scene.kind === 'question').every((scene) => !scene.bonus));
});

test('private key retains the bonus ID, correct answer, translation, explanation, and suggested comment', () => {
  const bonus = six.questions.at(-1);
  const key = createBonusAnswerKey(six);
  for (const value of [bonus.id, 'C — 아메리카노로 주세요.', bonus.reveal.translation, bonus.explanation, bonus.suggestedComment]) {
    assert.ok(key.includes(value));
  }
});

test('minimum duration is optional, validated, and checked against actual metadata', () => {
  assert.doesNotThrow(() => validateMinimumDuration(13));
  assert.doesNotThrow(() => validateMinimumDuration(65, 65));
  assert.throws(() => validateMinimumDuration(64.999, 65), /Minimum duration/u);
  for (const minimum of [0, -1, Infinity, NaN]) {
    assert.throws(() => validateMinimumDuration(83.4, minimum), /finite positive/u);
    assert.throws(() => parseQuizInput({...six, minimumDurationSeconds: minimum}), /minimumDurationSeconds/u);
  }
  const probe = {streams: [{codec_name: 'h264', width: 1080, height: 1920, pix_fmt: 'yuv420p', avg_frame_rate: '30/1', nb_frames: '2502'}], format: {duration: '83.400000'}};
  assert.equal(validateProbeMetadata(probe, 2502, 65).duration, 83.4);
  assert.throws(() => validateProbeMetadata(probe, 2502, 90), /Minimum duration/u);
});

test('impossible minimum duration fails actual CLI before starting Remotion or creating output', async (context) => {
  const directory = await mkdtemp(join(tmpdir(), 'korean-duration-test-'));
  context.after(() => rm(directory, {recursive: true, force: true}));
  const input = join(directory, 'input.json');
  const outputFolder = join(directory, 'never-created');
  await writeFile(input, JSON.stringify({...six, minimumDurationSeconds: 90}));
  const result = spawnSync(process.execPath, ['--experimental-strip-types', join(root, 'scripts/render.ts'),
    '--illustrated', '--input', input, '--output', join(outputFolder, 'quiz.mp4')],
  {cwd: root, encoding: 'utf8', windowsHide: true, shell: false, timeout: 10000});
  assert.equal(result.status, 1, result.error?.message);
  assert.match(result.stderr, /Minimum duration is 90s/u);
  assert.doesNotMatch(result.stdout, /Starting Remotion|Bundling/u);
  assert.equal(existsSync(outputFolder), false);
});

test('generic full render defaults legacy JSON to the standard episode timeline', async (context) => {
  const directory = await mkdtemp(join(tmpdir(), 'korean-standard-test-'));
  context.after(() => rm(directory, {recursive: true, force: true}));
  const input = join(directory, 'input.json');
  const output = join(directory, 'existing.mp4');
  await writeFile(output, 'preserve this file');
  for (const endingMode of [undefined, 'standard']) {
    // Baseline two-question timing was 26s. Standard episode timing is 32.7s.
    await writeFile(input, JSON.stringify({...read('content/short.json'), endingMode, minimumDurationSeconds: 30}));
    const result = spawnSync(process.execPath, ['--experimental-strip-types', join(root, 'scripts/render.ts'),
      '--input', input, '--output', output],
    {cwd: root, encoding: 'utf8', windowsHide: true, shell: false, timeout: 10000});
    assert.equal(result.status, 1, result.error?.message);
    assert.match(result.stderr, /Output already exists/u);
    assert.doesNotMatch(result.stderr, /Minimum duration/u);
    assert.doesNotMatch(result.stdout, /Starting Remotion/u);
  }
});
