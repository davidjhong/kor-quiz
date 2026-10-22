import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {existsSync, readFileSync} from 'node:fs';
import {mkdtemp, readFile, rm, writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
import test from 'node:test';
import {parseRenderArguments} from '../scripts/arguments.ts';
import {promoteOutput} from '../scripts/output.ts';

const root = fileURLToPath(new URL('../', import.meta.url));
const cli = fileURLToPath(new URL('../scripts/render.ts', import.meta.url));
const sample = JSON.parse(readFileSync(new URL('../content/sample.json', import.meta.url), 'utf8'));
const invoke = (args) => spawnSync(process.execPath, ['--experimental-strip-types', cli, ...args], {
  cwd: root, encoding: 'utf8', shell: false, windowsHide: true, timeout: 10000,
});

test('parses required flags and paths with spaces without shell interpretation', () => {
  assert.deepEqual(parseRenderArguments(['--input', 'a b.json', '--output', 'c & d.mp4', '--overwrite']), {
    input: 'a b.json', output: 'c & d.mp4', overwrite: true,
  });
  assert.equal(parseRenderArguments(['--help']), null);
  for (const args of [[], ['--input'], ['--input', '--output', 'x'], ['--unknown'], ['--overwrite', '--overwrite']]) {
    assert.throws(() => parseRenderArguments(args));
  }
});

test('invalid content and malformed JSON exit nonzero before rendering or creating output directories', async (context) => {
  const directory = await mkdtemp(join(tmpdir(), 'korean-cli-test-'));
  context.after(() => rm(directory, {recursive: true, force: true}));
  const input = join(directory, 'input.json');
  const output = join(directory, 'not-created', 'output.mp4');
  const invalid = structuredClone(sample);
  invalid.questions[1].correctAnswerIndex = 3;
  await writeFile(input, JSON.stringify(invalid));
  const result = invoke(['--input', input, '--output', output]);
  assert.equal(result.status, 1, result.error?.message);
  assert.match(result.stderr, /Question 2.*cafe-takeaway.*correctAnswerIndex/u);
  assert.doesNotMatch(result.stdout, /Starting Remotion|Bundling/u);
  assert.equal(existsSync(join(directory, 'not-created')), false);
  await writeFile(input, '{bad JSON');
  const malformed = invoke(['--input', input, '--output', output]);
  assert.equal(malformed.status, 1);
  assert.match(malformed.stderr, /Invalid JSON/u);
  assert.equal(existsSync(output), false);
});

test('CLI refuses to replace an existing file before starting a render', async (context) => {
  const directory = await mkdtemp(join(tmpdir(), 'korean-overwrite-test-'));
  context.after(() => rm(directory, {recursive: true, force: true}));
  const output = join(directory, 'existing.mp4');
  await writeFile(output, 'keep this');
  const result = invoke(['--input', join(root, 'content/sample.json'), '--output', output]);
  assert.equal(result.status, 1);
  assert.match(result.stderr, /already exists.*--overwrite/u);
  assert.doesNotMatch(result.stdout, /Starting Remotion/u);
  assert.equal(await readFile(output, 'utf8'), 'keep this');
});

test('promotion prevents a destination collision and replaces only when authorized', async (context) => {
  const directory = await mkdtemp(join(tmpdir(), 'korean-promote-test-'));
  context.after(() => rm(directory, {recursive: true, force: true}));
  const temporary = join(directory, 'verified.mp4');
  const output = join(directory, 'output.mp4');
  await writeFile(temporary, 'new verified content');
  await writeFile(output, 'old content');
  await assert.rejects(promoteOutput(temporary, output, false), /EEXIST/u);
  assert.equal(await readFile(output, 'utf8'), 'old content');
  await promoteOutput(temporary, output, true);
  assert.equal(await readFile(output, 'utf8'), 'new verified content');
  assert.equal(existsSync(temporary), false);
  await writeFile(temporary, 'next verified content');
  const freshOutput = join(directory, 'fresh.mp4');
  await promoteOutput(temporary, freshOutput, false);
  assert.equal(await readFile(freshOutput, 'utf8'), 'next verified content');
  assert.equal(existsSync(temporary), false);
});
