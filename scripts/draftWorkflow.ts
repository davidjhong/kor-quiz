import {mkdir, readdir, rename, writeFile} from 'node:fs/promises';
import {dirname, join, resolve} from 'node:path';
import {z} from 'zod';
import {briefSchema, bonusAnswerKeySchema, draftSchema, validateDraftContent,
  type Draft, type BonusAnswerKey} from '../src/draftSchema.ts';
import {getBackgroundAsset} from '../src/assets/backgrounds.ts';
import {loadBackgroundCatalog} from './backgroundCatalog.ts';
import {tokenUsageSchema} from '../src/draftSchema.ts';
import {getChoiceHangul, type QuizInput} from '../src/quizSchema.ts';
import {BONUS_CTA_LABELS, buildNarrationPlan, type NarrationScript} from '../src/narration.ts';
import {NARRATION_TIMING} from '../src/narrationTiming.ts';
import {audioCacheKey, canonical, readJsonFile, sha256} from './narrationFiles.ts';
import {PROJECT_ROOT} from './remotionCommand.ts';
import {validateBackgroundAsset} from './assets.ts';
import {createBonusAnswerKey} from './answerKey.ts';

const hashSchema = z.string().regex(/^[a-f0-9]{64}$/u);
export const contentRevisionSchema = z.strictObject({version: z.literal(1), kind: z.literal('coding-assistant-content-revision'),
  sourceDirectory: z.string().min(1), sourceContentHash: hashSchema, revisedContentHash: hashSchema,
  recordedAt: z.string().datetime(), changes: z.array(z.strictObject({field: z.string(), before: z.unknown(), after: z.unknown(), reason: z.string()})).min(1)});
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
  linguisticReviewRequired: true; generationEstimatedCostUSD: number; reportedGenerationUsage: z.infer<typeof tokenUsageSchema> | null;
  renderReady: boolean; renderBlockers: string[]};
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
  await loadBackgroundCatalog(root);
  const report: ValidationReport = {valid: false, contentHash: contentHash(raw, rawKey), errors: [], warnings: [
    'Structural validation does not establish Korean accuracy, naturalness, difficulty or semantic answer uniqueness. A separate manual or automated linguistic review is required.',
  ], linguisticReviewRequired: true, generationEstimatedCostUSD: 0, reportedGenerationUsage: null, renderReady: false, renderBlockers: []};
  const provenance = draftSchema.shape.provenance.safeParse((raw as Partial<Draft> | null)?.provenance);
  if (provenance.success) {
    report.generationEstimatedCostUSD = provenance.data.estimatedCostUSD;
    report.reportedGenerationUsage = provenance.data.reportedUsage;
  }
  // Asset readiness is independent of text validity: an invalid draft still needs an actionable asset report.
  const parsedBrief = briefSchema.safeParse((raw as Partial<Draft> | null)?.brief);
  if (parsedBrief.success) {
    const brief = parsedBrief.data, asset = getBackgroundAsset(brief.backgroundAssetId ?? undefined);
    if (!asset) report.renderBlockers.push(`Matching approved background missing for ${brief.scenarioType ?? 'this scenario'}; content review may proceed`);
    else if (brief.scenarioType && asset.scenarioType !== brief.scenarioType) report.renderBlockers.push('Selected background does not match the scenario; no café-image fallback is allowed');
    else {
      try {await validateBackgroundAsset({backgroundAssetId: brief.backgroundAssetId ?? undefined}, join(root, 'public')); report.renderReady = true;}
      catch (error) {report.renderBlockers.push(...messages(error));}
    }
  }
  try {
    const draft = draftSchema.parse(raw), key = bonusAnswerKeySchema.parse(rawKey);
    const quiz = validateDraftContent(draft, key);
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
  report.renderReady = report.valid && report.renderReady;
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
export const reviewMarkdown = (raw: unknown, rawKey: unknown, report: ValidationReport, mode: ReviewMode = 'manual') => {
  const data = (raw && typeof raw === 'object' ? raw : {}) as Partial<Draft>;
  const key = (rawKey && typeof rawKey === 'object' ? rawKey : {}) as Partial<BonusAnswerKey>;
  const lines = [mode === 'manual' ? '# PRIVATE content review — unapproved draft' : '# PRIVATE automated development review', '', `Content hash: \`${report.contentHash}\``, '',
    `Structural validation: **${report.valid ? 'PASS' : 'FAIL'}**. ${mode === 'manual' ? 'Linguistic approval: **NOT GRANTED**.' : 'Mode: **AUTOMATED DEVELOPMENT**. Human review: **NOT CLAIMED**.'}`, '',
    `Scenario brief: ${safe(data.brief?.scenario)}`, `Audience: ${safe(data.brief?.audience)}`, `Level: ${safe(data.brief?.level)}`, '',
    `Render readiness: **${report.renderReady ? 'READY' : 'BLOCKED'}**`, ...report.renderBlockers.map((b) => `- ${safe(b)}`), '',
    '## Validation failures', '', ...report.errors.map((e) => `- ${safe(e)}`), ...(report.errors.length ? [] : ['None.']), '',
    '## Warnings and repetition/ambiguity review', '', ...report.warnings.map((w) => `- ${safe(w)}`), ''];
  if(data.brief?.context||data.brief?.learningObjectives)lines.push('## Learning plan', '',
    ...(data.brief.context?[`Context: ${safe(data.brief.context)}`,'']:[]),
    ...(data.brief.learningObjectives??[]).map((objective,i)=>`${i+1}. ${safe(objective)}`),'');
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
    `Generated: ${safe(data.provenance?.generatedAt)}; generation API cost estimate: $${safe(data.provenance?.estimatedCostUSD)} (not invoiced cost)`,
    `Reported token usage: ${safe(data.provenance?.reportedUsage ? JSON.stringify(data.provenance.reportedUsage) : 'none')}`, '');
  if (data.provenance?.method === 'openai-responses') lines.push(`Requested model: ${safe(data.provenance.requestedModel)}; returned model: ${safe(data.provenance.returnedModel)}; request ID: ${safe(data.provenance.requestId)}`,
    `Schema: ${safe(data.provenance.schemaVersion)}; attempts: ${data.provenance.attempts}; pricing verified: ${safe(data.provenance.pricingDate)}`, '');
  if (Array.isArray(data.narration?.segments)) for (const s of data.narration.segments) lines.push(`- ${safe(s?.id)} / ${safe(s?.role)} / ${safe(s?.language)}: ${safe(s?.text)}`);
  if (data.narration?.segments?.some((s) => s?.role === 'follow')) {
    lines.push('', '## Deterministic bonus ending', '',
      `After the countdown, display ${safe(BONUS_CTA_LABELS.comment)} while the comment clip plays. Keep all choices neutral and visible.`,
      `After that clip finishes, pause ${NARRATION_TIMING.afterComment / NARRATION_TIMING.fps} seconds (${NARRATION_TIMING.afterComment} frames).`,
      `At follow narration start, display ${safe(BONUS_CTA_LABELS.follow)}. Hold ${NARRATION_TIMING.afterFollow / NARRATION_TIMING.fps} second (${NARRATION_TIMING.afterFollow} frames) after it finishes, then use the existing ${NARRATION_TIMING.finalFade}-frame fade.`,
      'Clip durations and absolute scene frames await measured audio preparation; no duration is invented for this review.', '');
  }
  if (mode === 'manual') lines.push('', '## Human review checklist', '', '- [ ] Korean is natural and appropriate for the intended politeness.',
    '- [ ] Romanization matches the established convention and pronunciation.', '- [ ] English scenario/prompt and meaning are clear and accurate.',
    '- [ ] Exactly one choice is defensibly correct; alternatives cannot reasonably fit.', '- [ ] Difficulty progression and repetitions suit beginners.',
    '- [ ] Bonus narration/visuals disclose no answer; the neutral CTA is safe.',
    '- [ ] All exact narration text and voice settings above are approved.', '',
    'Approval is a separate human action bound to this hash. This document and deterministic checks cannot approve content.', '');
  else lines.push('', 'Automated acceptance is recorded separately against this exact hash. Content changes invalidate it. A model review is not independent proof of Korean correctness. No human checklist or approval is required for this development mode.', '');
  return lines.join('\n');
};
export const atomicJson = async (path: string, value: unknown) => {
  await mkdir(dirname(path), {recursive: true});
  const temporary = `${path}.${process.pid}.tmp`;
  await writeFile(temporary, JSON.stringify(value, null, 2), 'utf8');
  await rename(temporary, path);
};
export const writeReview = async (directory: string, root = PROJECT_ROOT, mode: ReviewMode = 'manual') => {
  const raw = await readJsonFile(join(directory, 'draft.json')), key = await readJsonFile(join(directory, 'answer-key.json'));
  const report = await inspectDraft(raw, key, root);
  const rawRevision = await readJsonFile(join(directory, 'revision.json')).catch((error: NodeJS.ErrnoException) => {
    if (error.code === 'ENOENT') return null; throw error;
  });
  const revision = rawRevision ? contentRevisionSchema.parse(rawRevision) : undefined;
  const additional = await readJsonFile(join(directory, 'automated-revisions.json')).catch((error: NodeJS.ErrnoException) => {
    if (error.code === 'ENOENT') return null; throw error;
  }) as Array<{beforeHash: string; afterHash: string}> | null;
  let coveredHash = revision?.revisedContentHash;
  for (const entry of additional ?? []) if (entry.beforeHash === coveredHash) coveredHash = entry.afterHash;
  if (revision && revision.revisedContentHash !== report.contentHash && coveredHash !== report.contentHash) report.warnings.push('The revision record describes an earlier hash; additional edits require review and an updated revision record.');
  await atomicJson(join(directory, 'validation.json'), report);
  const revisionNote = revision ? ['\n## Coding-assistant revisions after API generation', '',
    'This candidate contains separately recorded coding-assistant changes. It is not unedited model output and has no human approval.',
    `Original draft directory: ${safe(revision.sourceDirectory)}`,
    `Original content hash: \`${revision.sourceContentHash}\``,
    `Revised content hash: \`${revision.revisedContentHash}\``,
    'The exact before/after values are retained in revision.json. Model-quality comparisons refer to the original API draft.', '',
    ...revision.changes.map((c) => `- ${safe(c.field)}: ${safe(c.reason)}`),
    ...(additional?.length ? ['', 'Subsequent developer/model revisions and their hash chain are recorded separately in automated-revisions.json.'] : []), ''].join('\n') : '';
  let automaticNote = '';
  if (mode === 'automated') {
    const state = await readJsonFile(join(directory, 'automated-review/status.json')).catch((error: NodeJS.ErrnoException) => {
      if (error.code === 'ENOENT') return null; throw error;
    }) as {status: string; contentHash: string; model?: string; promptVersion?: string} | null;
    automaticNote = ['\n## Automated acceptance state', '',
      `Status: **${state?.contentHash === report.contentHash ? safe(state.status) : 'pending or stale'}**`,
      `Reviewer model: ${safe(state?.model)}; prompt: ${safe(state?.promptVersion)}`,
      'Findings, exact requests/responses and reported usage are in automated-review/. No human approval is fabricated.', ''].join('\n');
  }
  await writeFile(join(directory, 'review.md'), reviewMarkdown(raw, key, report, mode) + revisionNote + automaticNote, 'utf8');
  const draft = report.valid ? draftSchema.parse(raw) : undefined;
  await atomicJson(join(directory, 'narration-plan.json'), {version: 1, kind: 'narration-review-plan',
    valid: report.valid, contentHash: report.contentHash, profile: draft?.narration.profile,
    timingRules: NARRATION_TIMING, endingDisplay: BONUS_CTA_LABELS,
    timingStatus: 'Absolute frames require measured audio; this is not a prepared render manifest.',
    segments: draft ? buildNarrationPlan(validateDraftContent(draft, bonusAnswerKeySchema.parse(key)), draft.narration).map((segment) => {
      const cacheKey = segment.localFile ? null : audioCacheKey(segment, draft.narration.profile);
      return {...segment, cacheKey, file: cacheKey ? `audio/cache/${cacheKey}.wav` : null, durationSeconds: null};
    }) : []});
  if ((raw as Partial<Draft>)?.provenance?.method === 'openai-responses') {
    const {recordGenerationEdits} = await import('./openaiGeneration.ts');
    await recordGenerationEdits(directory);
  }
  return report;
};
export const importDraft = async (source: unknown, brief: unknown, directory: string, options: {dryRun?: boolean; replace?: boolean; root?: string; generatedAt?:string} = {}) => {
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
      generatedAt: options.generatedAt ?? new Date().toISOString(), sourceHash, reportedUsage: null, estimatedCostUSD: 0}};
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

export type ReviewMode = 'manual' | 'automated';
export const parseReviewMode = (value?: string): ReviewMode => {
  if (value === undefined || value === 'manual') return 'manual';
  if (value === 'automated') return 'automated';
  throw new Error('--review-mode must be manual or automated');
};
export const loadProductionDraft = async (directory: string, requireApproval = true, root = PROJECT_ROOT, mode: ReviewMode = 'manual') => {
  const bundle = await readDraft(resolve(directory), root);
  if (requireApproval) {
    if (mode === 'automated') {
      const {assertAutomatedAcceptance} = await import('./automatedAcceptance.ts');
      await assertAutomatedAcceptance(bundle, root);
    } else {
      await assertHumanApproval(bundle, root);
      const asset = getBackgroundAsset(bundle.quiz.backgroundAssetId);
      if (asset && asset.selection !== 'human-approved') throw new Error('Manual mode requires a human-approved background; automated development mode permits developer-selected assets');
    }
    const readiness = await inspectDraft(bundle.draft, bundle.key, root);
    if (!readiness.renderReady) throw new Error(`Production blocked: ${readiness.renderBlockers.join('; ')}`);
  }
  return {...bundle, script: bundle.draft.narration, answerKey: privateAnswerKey(bundle)};
};
