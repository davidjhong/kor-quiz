import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {existsSync, readFileSync} from 'node:fs';
import {mkdir, mkdtemp, readFile, rm, writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join, dirname, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import test from 'node:test';
import {BONUS_CTA_TEXT, BONUS_FOLLOW_TEXT} from '../src/narration.ts';
import {draftToQuiz} from '../src/draftSchema.ts';
import {approveDraft, assertHumanApproval, contentHash, importDraft, inspectDraft, loadProductionDraft,
  normalizeQuestion, priorRecords, readDraft, writeReview} from '../scripts/draftWorkflow.ts';

const project = fileURLToPath(new URL('../', import.meta.url));
const source = JSON.parse(readFileSync(join(project, 'content/authored/cafe-friends-02.json'), 'utf8'));
const brief = JSON.parse(readFileSync(join(project, 'content/briefs/cafe-friends-02.json'), 'utf8'));
const json = async (file) => JSON.parse(await readFile(file, 'utf8'));
const save = (file, value) => writeFile(file, JSON.stringify(value), 'utf8');
const fixture = async (context, withImport = true) => {
  const parent = resolve(tmpdir());
  const root = await mkdtemp(join(parent, 'korean-draft-test-'));
  assert.equal(dirname(root), parent);
  context.after(() => rm(root, {recursive: true, force: true}));
  await mkdir(join(root, 'data'), {recursive: true});
  await save(join(root, 'data/legacy-demos.json'), {version: 1, note: 'test-only empty baseline', entries: []});
  await mkdir(join(root, 'public/backgrounds'), {recursive: true});
  await writeFile(join(root, 'public/backgrounds/korean-cafe-illustrated-v1.png'), 'local asset fixture');
  const directory = join(root, 'draft');
  if (withImport) await importDraft(source, brief, directory, {root});
  return {root, directory};
};

test('local import yields six validated questions and separate private key, with no approval or bonus answer in render props', async (context) => {
  const {root, directory} = await fixture(context);
  const bundle = await readDraft(directory, root);
  assert.equal(bundle.quiz.questions.length, 6);
  assert.equal(bundle.draft.narration.segments.length, 19);
  assert.equal(bundle.draft.provenance.provider, 'local-authoring');
  assert.equal(bundle.draft.provenance.model, null);
  assert.equal(bundle.draft.provenance.estimatedCostUSD, 0);
  for (const property of ['correctAnswerIndex', 'explanation', 'reveal', 'suggestedComment']) assert.equal(property in bundle.draft.quiz.questions[5], false);
  const renderedBonus = draftToQuiz(bundle.draft).questions[5];
  assert.equal(renderedBonus.reveal, undefined);
  assert.notEqual(renderedBonus.explanation, bundle.key.explanation);
  assert.notEqual(renderedBonus.correctAnswerIndex, bundle.key.correctAnswerIndex);
  assert.deepEqual(bundle.draft.narration.segments.filter((s) => s.contentId === bundle.key.questionId).map((s) => s.role), ['question', 'comment', 'follow']);
  assert.equal(bundle.draft.narration.segments.at(-2).text, BONUS_CTA_TEXT);
  assert.equal(bundle.draft.narration.segments.at(-1).text, BONUS_FOLLOW_TEXT);
  const plan = await json(join(directory, 'narration-plan.json'));
  assert.equal(plan.contentHash, bundle.contentHash);
  assert.equal(plan.segments.length, 19);
  assert.equal(plan.timingRules.afterComment, 45);
  assert.ok(plan.segments.every((s) => s.durationSeconds === null));
  assert.notEqual(plan.segments.at(-2).cacheKey, plan.segments.at(-1).cacheKey);
  assert.equal(existsSync(join(root, 'data/approvals')), false);
  const review = await readFile(join(directory, 'review.md'), 'utf8');
  assert.match(review, /PRIVATE content review/u);
  assert.match(review, /Korean is natural/u);
  assert.match(review, /Private correct answer: \*\*B\*\*/u);
  assert.match(review, /NOT GRANTED/u);
  assert.equal((await json(join(directory, 'validation.json'))).valid, true);
});

test('untrusted drafts reject invalid references, normalized duplicates, missing fields, wrong progression and all bonus disclosure fields', async (context) => {
  const {root, directory} = await fixture(context);
  const original = await json(join(directory, 'draft.json'));
  const key = await json(join(directory, 'answer-key.json'));
  const mutations = [
    [(d) => {d.quiz.questions[0].correctAnswerIndex = 3;}, /correctAnswerIndex/u],
    [(d) => {d.quiz.questions[0].choices[1].hangul = `  ${d.quiz.questions[0].choices[0].hangul.normalize('NFD')}  `;}, /Duplicate choice/u],
    [(d) => {d.quiz.questions[0].choices[1].hangul = '안 녕 하 세 요.';}, /Duplicate choice/u],
    [(d) => {d.quiz.questions[0].choices[0].hangul = '   ';}, /empty|whitespace/u],
    [(d) => {delete d.quiz.questions[0].choices[0].romanization;}, /romanization/u],
    [(d) => {d.quiz.questions[0].difficulty = 'hard';}, /required order/u],
    [(d) => {d.quiz.questions[0].prompt = 'x'.repeat(101);}, /100/u],
    [(d) => {d.quiz.questions.pop();}, /questions/u],
    [(d) => {d.quiz.questions[1].id = d.quiz.questions[0].id;}, /Duplicate question ID/u],
    [(d) => {d.quiz.questions[5].reveal = {translation: 'SECRET'};}, /reveal/u],
    [(d) => {d.quiz.questions[5].explanation = 'SECRET';}, /explanation/u],
    [(d) => {d.quiz.questions[5].correctAnswerIndex = 1;}, /correctAnswerIndex/u],
    [(d) => {d.quiz.questions[5].context = 'The correct answer is B.';}, /answer-letter hint/u],
    [(d) => {d.quiz.questions[5].context = d.quiz.questions[5].choices[1].hangul;}, /Hangul answer/u],
    [(d) => {d.quiz.questions[5].spokenPrompt = d.quiz.questions[5].choices[1].hangul;}, /Hangul answer/u],
    [(d) => {d.narration.segments.at(-2).text = 'Comment B to win!';}, /neutral invitation/u],
    [(d) => {d.narration.segments.at(-1).text = 'Answer B is correct.';}, /neutral invitation/u],
    [(d) => {d.narration.segments.at(-1).role = 'explanation';}, /no bonus answer/u],
    [(d) => {d.approved = true;}, /approved/u],
    [(d) => {d.quiz.backgroundAssetId = 'https://example.com/bg.png';}, /backgroundAssetId/u],
  ];
  for (const [change, expected] of mutations) {
    const draft = structuredClone(original); change(draft);
    const result = await inspectDraft(draft, key, root);
    assert.equal(result.valid, false, String(change));
    assert.match(result.errors.join('\n'), expected);
  }
  const badKey = {...key, correctAnswerIndex: 'D'};
  assert.equal((await inspectDraft(original, badKey, root)).valid, false);
  assert.equal((await inspectDraft(original, {...key, questionId: 'wrong-question'}, root)).valid, false);
  await rm(join(root, 'public/backgrounds/korean-cafe-illustrated-v1.png'));
  const missingAsset = await inspectDraft(original, key, root);
  assert.equal(missingAsset.valid, true);
  assert.equal(missingAsset.renderReady, false);
  assert.match(missingAsset.renderBlockers.join('\n'), /missing or invalid/u);
});

test('question normalization rejects exact duplicates within an episode but prior repeats/near duplicates remain review warnings', async (context) => {
  const {root, directory} = await fixture(context);
  const bundle = await readDraft(directory, root);
  assert.equal(normalizeQuestion(' Ｈello,  world! '), 'hello world');
  const duplicate = structuredClone(bundle.draft);
  duplicate.quiz.questions[1].prompt = duplicate.quiz.questions[0].prompt.toUpperCase();
  duplicate.quiz.questions[1].context = duplicate.quiz.questions[0].context;
  const s = duplicate.narration.segments.find((s) => s.contentId === duplicate.quiz.questions[1].id && s.role === 'question');
  s.text = duplicate.quiz.questions[1].spokenPrompt ?? `${duplicate.quiz.questions[1].prompt} ${duplicate.quiz.questions[1].context}`;
  assert.match((await inspectDraft(duplicate, bundle.key, root)).errors.join('\n'), /exact duplicate question text/u);
  // Test-only human approval record in an isolated temporary workspace, never the real draft.
  await approveDraft(directory, 'Fixture human', bundle.contentHash, true, {root});
  assert.equal((await priorRecords(root)).length, 1);
  const next = structuredClone(bundle.draft);
  next.quiz.videoId += '-next'; next.narration.segments[0].contentId = next.quiz.videoId;
  next.quiz.questions[0].id += '-next';
  for (const segment of next.narration.segments) if (segment.contentId === bundle.quiz.questions[0].id) segment.contentId = next.quiz.questions[0].id;
  next.quiz.questions[0].context += ' In the café.';
  next.narration.segments[1].text = next.quiz.questions[0].spokenPrompt ?? `${next.quiz.questions[0].prompt} ${next.quiz.questions[0].context}`;
  const result = await inspectDraft(next, bundle.key, root);
  assert.equal(result.valid, true);
  assert.match(result.warnings.join('\n'), /exact ID\/text repeat/u);
  assert.match(result.warnings.join('\n'), /likely near-duplicate/u);
  assert.match(result.warnings.join('\n'), /vocabulary reuse.*allowed/u);
});

test('approval is separate and any content, narration, voice/profile or private-key edit invalidates the approved hash', async (context) => {
  const {root, directory} = await fixture(context);
  const bundle = await readDraft(directory, root);
  await assert.rejects(assertHumanApproval(bundle, root), /Unapproved/u);
  await assert.rejects(approveDraft(directory, 'Fixture human', '0'.repeat(64), true, {root}), /exact current/u);
  await assert.rejects(approveDraft(directory, 'Fixture human', bundle.contentHash, false, {root}), /confirm-review/u);
  await approveDraft(directory, 'Fixture human', bundle.contentHash, true, {root});
  await assert.doesNotReject(loadProductionDraft(directory, true, root));
  for (const change of [(d) => {d.quiz.questions[0].explanation += ' Revised.';},
    (d) => {d.narration.segments[3].text += ' Revised.';},
    (d) => {d.quiz.questions[0].choices[0].romanization += '!';},
    (d) => {d.quiz.questions[0].spokenPrompt += ' Please.'; d.narration.segments[1].text = d.quiz.questions[0].spokenPrompt;},
    (d) => {d.brief.audience += ' Revised.';}]) {
    const draft = structuredClone(bundle.draft); change(draft);
    assert.notEqual(contentHash(draft, bundle.key), bundle.contentHash);
    await save(join(directory, 'draft.json'), draft);
    await assert.rejects(loadProductionDraft(directory, true, root), /Unapproved or changed/u);
  }
  await save(join(directory, 'draft.json'), bundle.draft);
  await save(join(directory, 'answer-key.json'), {...bundle.key, explanation: `${bundle.key.explanation} Revised.`});
  await assert.rejects(loadProductionDraft(directory, true, root), /Unapproved or changed/u);
  const voiceChanged = structuredClone(bundle.draft); voiceChanged.narration.profile.speakingRate = 1.1;
  assert.notEqual(contentHash(voiceChanged, bundle.key), bundle.contentHash);
});

test('actual production CLIs block unapproved drafts and extracted raw content before cache preparation/rendering', async (context) => {
  const {directory, root} = await fixture(context);
  const output = join(root, 'never-created/video.mp4');
  const raw = await readDraft(directory, root);
  await save(join(root, 'raw-quiz.json'), raw.quiz);
  await save(join(root, 'raw-script.json'), raw.draft.narration);
  const commands = [
    ['scripts/prepareAudio.ts', '--draft', directory, '--output', 'public/audio/never-created/manifest.json', '--synthesize', '--max-cost-usd', '999'],
    ['scripts/renderNarrated.ts', '--draft', directory, '--audio-manifest', join(root, 'missing.json'), '--output', output],
    ['scripts/prepareAudio.ts', '--input', join(root, 'raw-quiz.json'), '--script', join(root, 'raw-script.json'), '--output', 'public/audio/never-created/manifest.json', '--synthesize', '--max-cost-usd', '999'],
    ['scripts/renderNarrated.ts', '--input', join(root, 'raw-quiz.json'), '--audio-manifest', join(root, 'missing.json'), '--output', output],
  ];
  for (const [file, ...args] of commands) {
    const result = spawnSync(process.execPath, ['--experimental-strip-types', join(project, file), ...args],
      {cwd: project, encoding: 'utf8', shell: false, windowsHide: true, timeout: 15000});
    assert.equal(result.status, 1, result.error?.message);
    assert.match(result.stderr, /Unapproved|requires human approval/u);
    assert.doesNotMatch(result.stdout, /Preparing|Starting Remotion|Bundling|Validated .*local audio/u);
  }
  assert.equal(existsSync(dirname(output)), false);
  assert.equal(existsSync(join(project, 'public/audio/never-created')), false);
});

test('dry runs do not write; resumed imports preserve edits; invalid drafts are saved with actionable reports', async (context) => {
  const {root, directory} = await fixture(context, false);
  assert.equal((await importDraft(source, brief, directory, {root, dryRun: true})).valid, true);
  assert.equal(existsSync(directory), false);
  await importDraft(source, brief, directory, {root});
  const edited = await json(join(directory, 'draft.json'));
  edited.quiz.questions[0].explanation += ' Human edit.';
  await save(join(directory, 'draft.json'), edited);
  await importDraft(source, brief, directory, {root});
  assert.deepEqual(await json(join(directory, 'draft.json')), edited);
  await assert.rejects(importDraft(source, {...brief, scenario: 'Changed brief'}, directory, {root}), /edits were preserved/u);
  const invalid = structuredClone(source); invalid.quiz.questions[0].correctAnswerIndex = 8;
  const badFolder = join(root, 'invalid');
  const report = await importDraft(invalid, brief, badFolder, {root});
  assert.equal(report.valid, false);
  assert.match(report.errors.join('\n'), /questions.0.correctAnswerIndex/u);
  assert.match(await readFile(join(badFolder, 'review.md'), 'utf8'), /FAIL/u);
  assert.equal((await json(join(badFolder, 'validation.json'))).valid, false);
  assert.deepEqual((await json(join(badFolder, 'narration-plan.json'))).segments, []);
  const fakeApproval = structuredClone(source); fakeApproval.approved = true;
  await assert.rejects(importDraft(fakeApproval, brief, join(root, 'fake'), {root}), /approved/u);
});
