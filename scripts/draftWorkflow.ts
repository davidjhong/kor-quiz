import {mkdir, readFile, readdir, rename, writeFile} from 'node:fs/promises';
import {dirname, join, resolve} from 'node:path';
import {z} from 'zod';
import {briefSchema, bonusAnswerKeySchema, draftSchema, validateDraftContent,
  type Draft, type BonusAnswerKey} from '../src/draftSchema.ts';
import {getChoiceHangul, type QuizInput} from '../src/quizSchema.ts';
import type {NarrationScript} from '../src/narration.ts';
import {canonical, readJsonFile, sha256} from './narrationFiles.ts';
import {PROJECT_ROOT} from './remotionCommand.ts';
import {validateBackgroundAsset} from './assets.ts';
import {createBonusAnswerKey} from './answerKey.ts';

const hashSchema = z.string().regex(/^[a-f0-9]{64}$/u);
export const normalizeQuestion = (text: string) => text.normalize('NFKC').toLocaleLowerCase('en-US')
  .replace(/[\p{P}\p{S}]/gu, ' ').replace(/\s+/gu, ' ').trim();
const taughtPhrase = (text: string) => normalizeQuestion(text).replace(/\s+/gu, '');
export const contentHash = (draft: unknown, key: unknown) => sha256(canonical({draft, bonusAnswerKey: key}));
export const speechHash = (script: NarrationScript) => sha256(canonical({profile: script.profile,
  segments: script.segments.map(({id, contentId, role, language, text}) => ({id, contentId, role, language, text}))}));
const questionRecordSchema = z.strictObject({id: z.string(), scenario: z.string(), normalizedText: z.string(), phrase: z.string()});
export const approvalSchema = z.strictObject({version: z.literal(1), kind: z.literal('human-content-approval'),
  contentHash: hashSchema, episodeId: z.string(), reviewer: z.string().min(1).max(80), approvedAt: z.string().datetime(),
  checklistAcknowledged: z.literal(true), scenario: z.string(), questions: z.array(questionRecordSchema).length(6)});
export type QuestionRecord = z.infer<typeof questionRecordSchema>;
export type ValidationReport = {valid: boolean; contentHash: string; errors: string[]; warnings: string[];
  linguisticReviewRequired: true; generationEstimatedCostUSD: number; reportedGenerationUsage: null};
type Bundle = {draft: Draft; key: BonusAnswerKey; quiz: QuizInput; contentHash: string};
export const recordsFor = (quiz: QuizInput, key?: BonusAnswerKey): QuestionRecord[] => quiz.questions.map((q, i) => ({
  id: q.id, scenario: q.scenario, normalizedText: normalizeQuestion(`${q.prompt} ${q.context ?? ''}`),
  phrase: taughtPhrase(getChoiceHangul(q.choices[i === 5 && key ? key.correctAnswerIndex : q.correctAnswerIndex])),
}));
const tokens = (s: string) => new Set(s.split(' ').filter((t) => !['a', 'an', 'the', 'you', 'your', 'what', 'do', 'say', 'to', 'for', 'it', 'is', 'in', 'are', 'ask', 'please'].includes(t)));
const similarity = (a: string, b: string) => {
  const left = tokens(a), right = tokens(b);
  if (left.size < 3 || right.size < 3) return 0;
  return [...left].filter((t) => right.has(t)).length / new Set([...left, ...right]).size;
};
const legacyRegistrySchema = z.strictObject({version: z.literal(1), note: z.string(), entries: z.array(z.strictObject({
  file: z.string(), quizHash: hashSchema, speechHashes: z.array(hashSchema), repetitionBaseline: z.boolean(),
}))});
const legacyRegistry = async (root = PROJECT_ROOT) => legacyRegistrySchema.parse(await readJsonFile(join(root, 'data/legacy-demos.json')));
export const assertLegacyDemo = async (quiz: QuizInput, script?: NarrationScript, root = PROJECT_ROOT) => {
  const entry = (await legacyRegistry(root)).entries.find((e) => e.quizHash === sha256(canonical(quiz)));
  if (!entry || (script && !entry.speechHashes.includes(speechHash(script)))) {
    throw new Error('New or changed content requires human approval. Import with npm run draft -- import, review it, then use --draft with audio:prepare/render:narrated. A content-supplied approved field cannot grant approval.');
  }
};
export const priorRecords = async (root = PROJECT_ROOT): Promise<Array<{episodeId: string; source: string; questions: QuestionRecord[]}>> => {
  const records = [];
  const registry = await legacyRegistry(root);
  for (const entry of registry.entries.filter((e) => e.repetitionBaseline)) {
    const {parseQuizInput} = await import('../src/quizSchema.ts');
    const quiz = parseQuizInput(await readJsonFile(join(root, entry.file)));
    if (sha256(canonical(quiz)) === entry.quizHash) records.push({episodeId: quiz.videoId, source: 'legacy demo', questions: recordsFor(quiz)});
  }
  const folder = join(root, 'data/approvals');
  const names = await readdir(folder).catch((error: NodeJS.ErrnoException) => { if (error.code === 'ENOENT') return []; throw error; });
  for (const name of names.filter((n) => /^[a-f0-9]{64}\.json$/u.test(n))) {
    const approval = approvalSchema.parse(await readJsonFile(join(folder, name)));
    if (name !== `${approval.contentHash}.json`) throw new Error(`Approval/history filename mismatch: ${name}`);
    records.push({episodeId: approval.episodeId, source: 'human-approved episode', questions: approval.questions});
  }
  return records;
};
const messages = (error: unknown) => error instanceof z.ZodError
  ? error.issues.map((issue) => `${issue.path.join('.') || 'draft'}: ${issue.message}`)
  : [error instanceof Error ? error.message : String(error)];
export const inspectDraft = async (raw: unknown, rawKey: unknown, root = PROJECT_ROOT): Promise<ValidationReport> => {
  const report: ValidationReport = {valid: false, contentHash: contentHash(raw, rawKey), errors: [], warnings: [
    'Structural validation does not establish Korean accuracy, naturalness, difficulty or semantic answer uniqueness. Human review is required.',
  ], linguisticReviewRequired: true, generationEstimatedCostUSD: 0, reportedGenerationUsage: null};
  try {
    const draft = draftSchema.parse(raw), key = bonusAnswerKeySchema.parse(rawKey);
    const quiz = validateDraftContent(draft, key);
    await validateBackgroundAsset(quiz, join(root, 'public'));
    const questions = recordsFor(quiz, key);
    for (let i = 0; i < questions.length; i++) {
      for (let j = 0; j < i; j++) {
        if (questions[i].normalizedText === questions[j].normalizedText) report.errors.push(`Question ${i + 1} (${questions[i].id}): exact duplicate question text of question ${j + 1}`);
        else if (similarity(questions[i].normalizedText, questions[j].normalizedText) >= 0.6) report.warnings.push(`Questions ${j + 1}/${i + 1}: likely near-duplicate task; review contexts and intentional vocabulary reuse`);
        if (questions[i].phrase === questions[j].phrase) report.warnings.push(`Questions ${j + 1}/${i + 1}: taught phrase repeats; check that the learning task differs`);
      }
    }
    for (const prior of await priorRecords(root)) {
      for (const [i, question] of questions.entries()) for (const old of prior.questions) {
        if (question.id === old.id || question.normalizedText === old.normalizedText) report.warnings.push(`Question ${i + 1}: exact ID/text repeat of ${prior.source} ${prior.episodeId}/${old.id}`);
        else if (similarity(question.normalizedText, old.normalizedText) >= 0.6) report.warnings.push(`Question ${i + 1}: likely near-duplicate of ${prior.source} ${prior.episodeId}/${old.id}`);
        if (question.phrase === old.phrase) report.warnings.push(`Question ${i + 1}: vocabulary reuse from ${prior.episodeId}/${old.id}; allowed when task/context differs`);
      }
    }
    quiz.questions.forEach((q, i) => {
      const choices = q.choices.map((choice) => taughtPhrase(getChoiceHangul(choice)));
      if (choices.some((c, j) => choices.some((other, k) => j !== k && (c.includes(other) || other.includes(c))))) {
        report.warnings.push(`Question ${i + 1}: similar/contained choice text; a human must check distractor ambiguity`);
      }
    });
    report.valid = report.errors.length === 0;
  } catch (error) { report.errors.push(...messages(error)); }
  return report;
};
export const readDraft = async (directory: string, root = PROJECT_ROOT): Promise<Bundle> => {
  const raw = await readJsonFile(join(directory, 'draft.json')), rawKey = await readJsonFile(join(directory, 'answer-key.json'));
  const report = await inspectDraft(raw, rawKey, root);
  if (!report.valid) throw new Error(`Draft validation failed:\n${report.errors.map((e) => `  - ${e}`).join('\n')}`);
  const draft = draftSchema.parse(raw), key = bonusAnswerKeySchema.parse(rawKey);
  return {draft, key, quiz: validateDraftContent(draft, key), contentHash: report.contentHash};
};
export const assertHumanApproval = async (bundle: Bundle, root = PROJECT_ROOT) => {
  const path = join(root, 'data/approvals', `${bundle.contentHash}.json`);
  const raw = await readJsonFile(path).catch(() => { throw new Error(`Unapproved or changed draft ${bundle.quiz.videoId}; review review.md and explicitly approve hash ${bundle.contentHash} with npm run draft -- approve. No audio preparation or render started.`); });
  const approval = approvalSchema.parse(raw);
  if (approval.contentHash !== bundle.contentHash || approval.episodeId !== bundle.quiz.videoId) throw new Error('Approval does not match this content/narration hash');
};
const safe = (value: unknown) => String(value ?? '(missing)').replace(/[\\`*_{}\[\]<>()#!|]/gu, '\\$&').replace(/[\r\n]/gu, ' ');
export const reviewMarkdown = (raw: unknown, rawKey: unknown, report: ValidationReport) => {
  const data = (raw && typeof raw === 'object' ? raw : {}) as Partial<Draft>;
  const key = (rawKey && typeof rawKey === 'object' ? rawKey : {}) as Partial<BonusAnswerKey>;
  const lines = ['# PRIVATE content review — unapproved draft', '', `Content hash: \`${report.contentHash}\``, '',
    `Structural validation: **${report.valid ? 'PASS' : 'FAIL'}**. Linguistic approval: **NOT GRANTED**.`, '',
    `Scenario brief: ${safe(data.brief?.scenario)}`, `Audience: ${safe(data.brief?.audience)}`, `Level: ${safe(data.brief?.level)}`, '',
    '## Validation failures', '', ...report.errors.map((e) => `- ${safe(e)}`), ...(report.errors.length ? [] : ['None.']), '',
    '## Warnings and repetition/ambiguity review', '', ...report.warnings.map((w) => `- ${safe(w)}`), ''];
  if (Array.isArray(data.quiz?.questions)) data.quiz.questions.forEach((q, i) => {
    if (!q || typeof q !== 'object') {lines.push(`Question ${i + 1}: invalid object; see validation failures.`, ''); return;}
    lines.push(`## ${i + 1}. ${safe(q.id)} — ${safe(q.difficulty)}${i === 5 ? ' — COMMENT BONUS' : ''}`, '',
      `Scenario: ${safe(q.scenario)}`, `Prompt: ${safe(q.prompt)}`, `Context: ${safe(q.context)}`, '');
    if (Array.isArray(q.choices)) q.choices.forEach((c, j) => lines.push(`- **${['A', 'B', 'C'][j]}** ${safe(typeof c === 'string' ? c : c?.hangul)} — ${safe(typeof c === 'string' ? '' : c?.romanization)}`));
    const index = i === 5 ? key.correctAnswerIndex : 'correctAnswerIndex' in q ? q.correctAnswerIndex : undefined;
    lines.push('', `Private correct answer: **${index === undefined ? '(invalid)' : ['A', 'B', 'C'][index] ?? '(invalid)'}**`,
      `Meaning: ${safe(i === 5 ? key.translation : 'reveal' in q ? q.reveal?.translation : undefined)}`,
      `Explanation: ${safe(i === 5 ? key.explanation : 'explanation' in q ? q.explanation : undefined)}`,
      `Teaching point: ${safe(i === 5 ? key.teachingPoint : 'reveal' in q ? q.reveal?.teachingPoint : undefined)}`, '');
  });
  lines.push('## Exact planned narration (private review)', '');
  const profile = data.narration?.profile;
  lines.push(`Voice provider/model: ${safe(profile?.provider)} / ${safe(profile?.model)}`,
    `English voice: ${safe(profile?.voices?.['en-US'])}; Korean voice: ${safe(profile?.voices?.['ko-KR'])}`,
    `Settings: rate ${safe(profile?.speakingRate)}, ${safe(profile?.outputFormat)}, ${safe(profile?.sampleRateHertz)} Hz`, '',
    `Draft provenance: ${safe(data.provenance?.provider)} / model ${safe(data.provenance?.model ?? 'none')}; prompt ${safe(data.provenance?.promptVersion)}`,
    `Generated: ${safe(data.provenance?.generatedAt)}; additional generation API cost estimate: $${safe(data.provenance?.estimatedCostUSD)}; reported API usage: none`, '');
  if (Array.isArray(data.narration?.segments)) for (const s of data.narration.segments) lines.push(`- ${safe(s?.id)} / ${safe(s?.role)} / ${safe(s?.language)}: ${safe(s?.text)}`);
  lines.push('', '## Human review checklist', '', '- [ ] Korean is natural and appropriate for the intended politeness.',
    '- [ ] Romanization matches the established convention and pronunciation.', '- [ ] English scenario/prompt and meaning are clear and accurate.',
    '- [ ] Exactly one choice is defensibly correct; alternatives cannot reasonably fit.', '- [ ] Difficulty progression and repetitions suit beginners.',
    '- [ ] Bonus narration/visuals disclose no answer; the neutral CTA is safe.',
    '- [ ] All exact narration text and voice settings above are approved.', '',
    'Approval is a separate human action bound to this hash. This document and deterministic checks cannot approve content.', '');
  return lines.join('\n');
};
export const atomicJson = async (path: string, value: unknown) => {
  await mkdir(dirname(path), {recursive: true});
  const temporary = `${path}.${process.pid}.tmp`;
  await writeFile(temporary, JSON.stringify(value, null, 2), 'utf8');
  await rename(temporary, path);
};
export const writeReview = async (directory: string, root = PROJECT_ROOT) => {
  const raw = await readJsonFile(join(directory, 'draft.json')), key = await readJsonFile(join(directory, 'answer-key.json'));
  const report = await inspectDraft(raw, key, root);
  await atomicJson(join(directory, 'validation.json'), report);
  await writeFile(join(directory, 'review.md'), reviewMarkdown(raw, key, report), 'utf8');
  return report;
};
export const importDraft = async (source: unknown, brief: unknown, directory: string, options: {dryRun?: boolean; replace?: boolean; root?: string} = {}) => {
  // Unknown fields such as model-supplied "approved" are rejected, never promoted to approvals.
  const input = z.strictObject({quiz: z.unknown(), narration: z.unknown(), bonusAnswerKey: z.unknown()}).parse(source);
  if (input.quiz === undefined || input.narration === undefined || input.bonusAnswerKey === undefined) throw new Error('Import requires quiz, narration and bonusAnswerKey fields');
  const parsedBrief = briefSchema.parse(brief);
  const sourceHash = sha256(canonical({source, brief}));
  const existing = await readJsonFile(join(directory, 'draft.json')).catch((error: NodeJS.ErrnoException) => { if (error.code === 'ENOENT') return null; throw error; });
  if (existing && !options.replace) {
    const saved = draftSchema.parse(existing);
    if (saved.provenance.sourceHash !== sourceHash) throw new Error('Import source/brief changed; use a new draft directory or --replace. Existing edits were preserved.');
    return options.dryRun ? inspectDraft(existing, await readJsonFile(join(directory, 'answer-key.json')), options.root)
      : writeReview(directory, options.root);
  }
  const draft = {version: 1, brief: parsedBrief, quiz: input.quiz, narration: input.narration,
    provenance: {method: 'local-import', provider: 'local-authoring', model: null, promptVersion: 'phase5-local-v1',
      generatedAt: new Date().toISOString(), sourceHash, reportedUsage: null, estimatedCostUSD: 0}};
  const report = await inspectDraft(draft, input.bonusAnswerKey, options.root);
  if (options.dryRun) return report;
  await atomicJson(join(directory, 'answer-key.json'), input.bonusAnswerKey);
  // The draft is the import commit point: a new draft never refers to an absent key.
  await atomicJson(join(directory, 'draft.json'), draft);
  return writeReview(directory, options.root);
};
export const approveDraft = async (directory: string, reviewer: string, confirmedHash: string, acknowledgeChecklist: boolean,
  options: {dryRun?: boolean; root?: string} = {}) => {
  const bundle = await readDraft(directory, options.root);
  if (!acknowledgeChecklist || confirmedHash !== bundle.contentHash || !reviewer.trim()) throw new Error('Human approval requires --reviewer, the exact current --confirm-hash, and --confirm-review after completing review.md');
  const approval = approvalSchema.parse({version: 1, kind: 'human-content-approval', contentHash: bundle.contentHash,
    episodeId: bundle.quiz.videoId, reviewer, approvedAt: new Date().toISOString(), checklistAcknowledged: true,
    scenario: bundle.draft.brief.scenario, questions: recordsFor(bundle.quiz, bundle.key)});
  if (!options.dryRun) await atomicJson(join(options.root ?? PROJECT_ROOT, 'data/approvals', `${bundle.contentHash}.json`), approval);
  return approval;
};
export const privateAnswerKey = (bundle: Bundle) => createBonusAnswerKey({...bundle.quiz,
  questions: bundle.quiz.questions.map((q, i) => i < 5 ? q : {...q, correctAnswerIndex: bundle.key.correctAnswerIndex,
    explanation: bundle.key.explanation, reveal: {translation: bundle.key.translation, teachingPoint: bundle.key.teachingPoint}})});

export const loadProductionDraft = async (directory: string, requireApproval = true, root = PROJECT_ROOT) => {
  const bundle = await readDraft(resolve(directory), root);
  if (requireApproval) await assertHumanApproval(bundle, root);
  return {...bundle, script: bundle.draft.narration, answerKey: privateAnswerKey(bundle)};
};
