import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {existsSync, readFileSync} from 'node:fs';
import {copyFile, mkdir, mkdtemp, rm, writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {dirname, join, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import test from 'node:test';
import {getBackgroundAsset} from '../src/assets/backgrounds.ts';
import {parseQuizInput} from '../src/quizSchema.ts';
import {getQuestionState, PREVIEW_QUESTION_TIMELINE} from '../src/questionTiming.ts';
import {parseRenderArguments} from '../scripts/arguments.ts';
import {loadQuizFile} from '../scripts/input.ts';
import {validateBackgroundAsset} from '../scripts/assets.ts';

const root = fileURLToPath(new URL('../', import.meta.url));
const preview = JSON.parse(readFileSync(join(root, 'content/cafe-preview.json'), 'utf8'));
const sample = JSON.parse(readFileSync(join(root, 'content/sample.json'), 'utf8'));

const temporaryDirectory = async (context) => {
  const parent = resolve(tmpdir());
  const directory = await mkdtemp(join(parent, 'korean-preview-test-'));
  assert.equal(dirname(directory), parent);
  context.after(() => rm(directory, {recursive: true, force: true}));
  return directory;
};

test('legacy JSON without background or structured reveal still works, even without a public directory', async (context) => {
  const directory = await temporaryDirectory(context);
  const quiz = await loadQuizFile(join(root, 'content/sample.json'), join(directory, 'no-public-folder'));
  assert.deepEqual(quiz, sample);
  assert.equal(getBackgroundAsset(undefined), undefined);
});

test('unknown IDs, remote URLs, filesystem paths, and prototype names are refused', () => {
  for (const backgroundAssetId of ['unknown-cafe', 'https://example.com/photo.png', '../outside.png', 'C:\\photo.png', '__proto__']) {
    assert.throws(() => parseQuizInput({...sample, backgroundAssetId}), /backgroundAssetId.*Unknown background asset ID/u);
    assert.throws(() => getBackgroundAsset(backgroundAssetId), /Unknown background asset ID/u);
  }
});

test('missing referenced assets fail during input loading, before rendering', async (context) => {
  const directory = await temporaryDirectory(context);
  const input = join(directory, 'preview.json');
  await writeFile(input, JSON.stringify(preview));
  await assert.rejects(loadQuizFile(input, directory), /Background asset "korean-cafe-v1".*missing or invalid/u);
});

test('approved local asset resolves and empty referenced files are rejected', async (context) => {
  const directory = await temporaryDirectory(context);
  const asset = getBackgroundAsset('korean-cafe-v1');
  const file = join(directory, asset.file);
  await mkdir(dirname(file), {recursive: true});
  await writeFile(file, '');
  await assert.rejects(validateBackgroundAsset(parseQuizInput(preview), directory), /nonempty regular file/u);
  await copyFile(join(root, 'public', asset.file), file);
  await assert.doesNotReject(validateBackgroundAsset(parseQuizInput(preview), directory));
});

test('preview content keeps the water choices and correct B mapping, with structured data for reveal', () => {
  const quiz = parseQuizInput(preview);
  assert.equal(quiz.questions.length, 3);
  assert.deepEqual(quiz.questions[0].choices, sample.questions[0].choices);
  assert.equal(quiz.questions[0].correctAnswerIndex, 1);
  assert.equal(quiz.questions[0].reveal.translation, 'Water, please.');
  assert.equal(quiz.questions[0].reveal.teachingPoint, '주세요 = please give me');
  const invalid = structuredClone(preview);
  invalid.questions[0].reveal.translation = ' ';
  assert.throws(() => parseQuizInput(invalid), /reveal.translation/u);
});

test('preview timing is four seconds reading, five countdown, four reveal without changing baseline timing', () => {
  const state = (frame) => getQuestionState(frame, PREVIEW_QUESTION_TIMELINE);
  assert.equal(state(119).phase, 'reading');
  for (const [frame, digit] of [[120, 5], [150, 4], [180, 3], [210, 2], [240, 1]]) {
    assert.equal(state(frame).secondsRemaining, digit);
    assert.equal(state(frame + 29).secondsRemaining, digit);
  }
  assert.equal(state(269).phase, 'countdown');
  assert.equal(state(269).secondsRemaining, 1);
  assert.equal(state(270).phase, 'reveal');
  assert.equal(state(270).revealProgress, 0);
  assert.equal(state(282).revealProgress, 1);
  assert.equal(PREVIEW_QUESTION_TIMELINE.durationInFrames, 390);
  assert.equal(getQuestionState(119).phase, 'countdown');
  assert.equal(getQuestionState(240).phase, 'reveal');
});

test('preview mode is explicit and cannot be supplied twice', () => {
  assert.equal(parseRenderArguments(['--preview', '--input', 'x.json', '--output', 'x.mp4']).preview, true);
  assert.equal(parseRenderArguments(['--input', 'x.json', '--output', 'x.mp4']).preview, undefined);
  assert.throws(() => parseRenderArguments(['--preview', '--preview']), /repeated/u);
});

test('unknown background fails clearly in the actual CLI before creating any render directory', async (context) => {
  const directory = await temporaryDirectory(context);
  const input = join(directory, 'invalid.json');
  const outputFolder = join(directory, 'never-created');
  await writeFile(input, JSON.stringify({...preview, backgroundAssetId: 'unknown-cafe'}));
  const result = spawnSync(process.execPath, ['--experimental-strip-types', join(root, 'scripts/render.ts'),
    '--preview', '--input', input, '--output', join(outputFolder, 'preview.mp4')], {
    cwd: root, encoding: 'utf8', shell: false, windowsHide: true, timeout: 10000,
  });
  assert.equal(result.status, 1, result.error?.message);
  assert.match(result.stderr, /backgroundAssetId.*Unknown background asset ID/u);
  assert.doesNotMatch(result.stdout, /Starting Remotion|Bundling/u);
  assert.equal(existsSync(outputFolder), false);
});
