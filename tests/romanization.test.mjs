import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {existsSync, readFileSync} from 'node:fs';
import {mkdtemp, rm, writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {dirname, join, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import test from 'node:test';
import {CONTENT_LIMITS, getChoiceHangul, getChoiceRomanization, parseQuizInput} from '../src/quizSchema.ts';
import {parseRenderArguments} from '../scripts/arguments.ts';
import {loadQuizFile} from '../scripts/input.ts';

const root = fileURLToPath(new URL('../', import.meta.url));
const legacy = JSON.parse(readFileSync(join(root, 'content/sample.json'), 'utf8'));
const preview = JSON.parse(readFileSync(join(root, 'content/cafe-illustrated-preview.json'), 'utf8'));

test('legacy strings remain unchanged; optional paired pronunciation works when disabled', () => {
  assert.deepEqual(parseQuizInput(legacy), legacy);
  const input = structuredClone(preview);
  input.showRomanization = false;
  delete input.questions[0].choices[0].romanization;
  assert.equal(getChoiceRomanization(parseQuizInput(input).questions[0].choices[0]), undefined);
});

test('paired sample validates local illustration and preserves water B mapping', async () => {
  const quiz = await loadQuizFile(join(root, 'content/cafe-illustrated-preview.json'));
  assert.equal(quiz.backgroundAssetId, 'korean-cafe-illustrated-v1');
  assert.equal(quiz.showRomanization, true);
  assert.equal(quiz.questions[0].correctAnswerIndex, 1);
  assert.deepEqual(quiz.questions[0].choices.map(getChoiceHangul), legacy.questions[0].choices);
});

test('enabled pronunciation requires every choice in every question, including legacy strings', () => {
  for (const missing of ['물 있어요.', {hangul: '물 있어요.'}, {hangul: '물 있어요.', romanization: '  '}]) {
    const input = structuredClone(preview);
    input.questions[2].choices[0] = missing;
    assert.throws(() => parseQuizInput(input), /Question 3.*choices\[0\].*romanization/u);
  }
  assert.throws(() => parseQuizInput({...legacy, showRomanization: true}), /romanization is required/u);
  assert.throws(() => parseQuizInput({...legacy, showRomanization: 'true'}), /showRomanization/u);
});

test('duplicates compare normalized Hangul, independent of pronunciation or old/new format', () => {
  for (const duplicate of ['  물 주세요. ', {hangul: ' 물 주세요. ', romanization: 'a different spelling'}]) {
    const input = structuredClone(preview);
    input.questions[0].choices[0] = duplicate;
    assert.throws(() => parseQuizInput(input), /Duplicate choice/u);
  }
});

test('reordering keeps Hangul and pronunciation paired, and pronunciation has a bounded length', () => {
  const input = structuredClone(preview);
  input.questions[0].choices.reverse();
  const choice = parseQuizInput(input).questions[0].choices[0];
  assert.equal(getChoiceHangul(choice), '물 마셔요.');
  assert.equal(getChoiceRomanization(choice), 'mul masyeoyo.');
  input.questions[0].choices[0].romanization = 'x'.repeat(CONTENT_LIMITS.romanization + 1);
  assert.throws(() => parseQuizInput(input), /romanization.*at most 72/u);
});

test('illustrated preview mode is explicit, mutually exclusive, and cannot be repeated', () => {
  const paths = ['--input', 'a.json', '--output', 'a.mp4'];
  assert.equal(parseRenderArguments(['--illustrated-preview', ...paths]).illustratedPreview, true);
  assert.throws(() => parseRenderArguments(['--illustrated-preview', '--preview', ...paths]), /not both/u);
  assert.throws(() => parseRenderArguments(['--illustrated-preview', '--illustrated-preview', ...paths]), /repeated/u);
});

test('full illustrated mode renders all questions and cannot be combined with a preview flag', () => {
  const paths = ['--input', 'a.json', '--output', 'a.mp4'];
  assert.deepEqual(parseRenderArguments(['--illustrated', ...paths]), {
    input: 'a.json', output: 'a.mp4', overwrite: false, illustrated: true,
  });
  for (const previewMode of ['--preview', '--illustrated-preview']) {
    assert.throws(() => parseRenderArguments(['--illustrated', previewMode, ...paths]), /not both/u);
  }
  assert.throws(() => parseRenderArguments(['--illustrated', '--illustrated', ...paths]), /repeated/u);
});

test('full cafe episode preserves question order, paired pronunciations and B/C/A mappings with consistent reveals', async () => {
  const episode = await loadQuizFile(join(root, 'content/cafe.json'));
  assert.equal(episode.episodeTitle, 'Can you order in Korean?');
  assert.equal(episode.backgroundAssetId, preview.backgroundAssetId);
  assert.equal(episode.showRomanization, true);
  assert.deepEqual(episode.questions.map((question) => question.id), preview.questions.map((question) => question.id));
  assert.deepEqual(episode.questions.map((question) => question.correctAnswerIndex), [1, 2, 0]);
  for (const [index, question] of episode.questions.entries()) {
    assert.deepEqual(question.choices, preview.questions[index].choices);
    assert.ok(question.explanation.includes(question.reveal.translation));
    assert.ok(question.reveal.teachingPoint.length > 0);
  }
});

test('missing pronunciation exits actual CLI before starting Remotion or creating outputs', async (context) => {
  const parent = resolve(tmpdir());
  const directory = await mkdtemp(join(parent, 'korean-romanization-test-'));
  assert.equal(dirname(directory), parent);
  context.after(() => rm(directory, {recursive: true, force: true}));
  const input = structuredClone(preview);
  delete input.questions[0].choices[1].romanization;
  const inputPath = join(directory, 'invalid.json');
  const outputFolder = join(directory, 'never-created');
  await writeFile(inputPath, JSON.stringify(input));
  const result = spawnSync(process.execPath, ['--experimental-strip-types', join(root, 'scripts/render.ts'),
    '--illustrated-preview', '--input', inputPath, '--output', join(outputFolder, 'preview.mp4')],
  {cwd: root, encoding: 'utf8', shell: false, windowsHide: true, timeout: 10000});
  assert.equal(result.status, 1, result.error?.message);
  assert.match(result.stderr, /Question 1.*choices\[1\].romanization.*required/u);
  assert.doesNotMatch(result.stdout, /Starting Remotion|Bundling/u);
  assert.equal(existsSync(outputFolder), false);
});
