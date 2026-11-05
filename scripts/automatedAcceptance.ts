import {readFile} from 'node:fs/promises';
import {join} from 'node:path';
import {z} from 'zod';
import {getBackgroundAsset} from '../src/assets/backgrounds.ts';
import type {Draft} from '../src/draftSchema.ts';
import type {QuizInput} from '../src/quizSchema.ts';
import {readJsonFile, sha256} from './narrationFiles.ts';
import {validateBackgroundAsset} from './assets.ts';

export const REVIEW_CATEGORIES = ['naturalKorean', 'uniqueAnswer', 'romanization', 'meaningExplanation', 'englishNarration', 'bonusIsolation'] as const;
const outcome = z.enum(['pass', 'warning', 'blocking']);
const text = z.string().min(1).max(1200);
export const automatedFindingsSchema = z.strictObject({
  questions: z.array(z.strictObject({questionId: z.string().min(1).max(64),
    checks: z.strictObject({naturalKorean: outcome, uniqueAnswer: outcome, romanization: outcome,
      meaningExplanation: outcome, englishNarration: outcome, bonusIsolation: outcome}),
    findings: z.array(z.strictObject({id: z.string().min(1).max(100), category: z.enum(REVIEW_CATEGORIES),
      field: z.string().min(1).max(100), severity: z.enum(['warning', 'blocking']), message: text, suggestion: text.nullable()})).max(16),
  })).length(6),
  resolutions: z.array(z.strictObject({findingId: z.string().min(1).max(100), status: z.enum(['resolved', 'unresolved']), details: text})).max(96),
});
export type AutomatedFindings = z.infer<typeof automatedFindingsSchema>;
export const validateAutomatedFindings = (raw: unknown, questionIds: string[], verifyIds?: string[]) => {
  const report = automatedFindingsSchema.parse(raw);
  const ids = report.questions.map((q) => q.questionId);
  if (new Set(ids).size !== questionIds.length || ids.some((id) => !questionIds.includes(id))) throw new Error('Automated review must cover each exact question ID once');
  const findings = report.questions.flatMap((q) => q.findings);
  if (new Set(findings.map((f) => f.id)).size !== findings.length) throw new Error('Duplicate automated finding IDs');
  for (const question of report.questions) for (const category of REVIEW_CATEGORIES) {
    const relevant = question.findings.filter((f) => f.category === category);
    if (question.checks[category] !== 'pass' && relevant.length === 0) throw new Error(`${question.questionId}.${category}: non-pass check needs an actionable finding`);
    if (question.checks[category] === 'blocking' && !relevant.some((f) => f.severity === 'blocking')) throw new Error('Blocking check must identify a blocking finding');
  }
  if (verifyIds) {
    const resolved = report.resolutions.map((r) => r.findingId);
    if (new Set(resolved).size !== verifyIds.length || resolved.some((id) => !verifyIds.includes(id))) throw new Error('Verification must explicitly resolve every originally flagged blocking finding once');
  } else if (report.resolutions.length) throw new Error('Initial review must not invent prior resolutions');
  return report;
};
export const blockingFindingIds = (report: AutomatedFindings) => report.questions.flatMap((q) => q.findings.filter((f) => f.severity === 'blocking').map((f) => f.id));
export const automatedReviewAccepted = (report: AutomatedFindings) => blockingFindingIds(report).length === 0
  && report.questions.every((q) => Object.values(q.checks).every((status) => status !== 'blocking'))
  && report.resolutions.every((r) => r.status === 'resolved');

export const automatedAcceptanceSchema = z.strictObject({version: z.literal(1), kind: z.literal('automated-content-acceptance'),
  status: z.literal('accepted'), humanReviewed: z.literal(false), contentHash: z.string().regex(/^[a-f0-9]{64}$/u),
  sourceContentHash: z.string().regex(/^[a-f0-9]{64}$/u), episodeId: z.string(), acceptedAt: z.string().datetime(),
  reviewerModel: z.string(), reviewPromptVersion: z.string(), verificationPromptVersion: z.string().nullable(),
  correctionPromptVersion: z.string().nullable(), reviewRequestIds: z.array(z.string().nullable()).min(1).max(3),
  independence: z.literal('Separate requests to the configured model; not independent proof of Korean correctness.'),
  finalFindings: automatedFindingsSchema, verifiedFindingIds: z.array(z.string()),
  revisions: z.array(z.unknown()), asset: z.strictObject({id: z.string(), sha256: z.string(), selection: z.enum(['human-approved', 'developer-selected'])}),
});
export const backgroundFingerprint = async (quiz: QuizInput, root: string) => {
  const asset = getBackgroundAsset(quiz.backgroundAssetId);
  if (!asset || !quiz.backgroundAssetId) throw new Error('Matching registered background is required for automated render readiness');
  await validateBackgroundAsset(quiz, join(root, 'public'));
  return {id: quiz.backgroundAssetId, sha256: sha256(await readFile(join(root, 'public', asset.file))), selection: asset.selection};
};
export const assertAutomatedAcceptance = async (bundle: {contentHash: string; draft: Draft; quiz: QuizInput}, root: string) => {
  const raw = await readJsonFile(join(root, 'data/automated-acceptances', `${bundle.contentHash}.json`))
    .catch(() => {throw new Error(`Missing or stale automated acceptance for hash ${bundle.contentHash}; run draft auto-review. No human approval is required in automated mode.`);});
  const record = automatedAcceptanceSchema.parse(raw);
  const report = validateAutomatedFindings(record.finalFindings, bundle.quiz.questions.map((q) => q.id),
    record.verificationPromptVersion ? record.verifiedFindingIds : undefined);
  if (record.contentHash !== bundle.contentHash || record.episodeId !== bundle.quiz.videoId || !automatedReviewAccepted(report)) {
    throw new Error('Automated acceptance is stale or contains unresolved blocking linguistic findings');
  }
  const current = await backgroundFingerprint(bundle.quiz, root);
  if (current.id !== record.asset.id || current.sha256 !== record.asset.sha256 || current.selection !== record.asset.selection) throw new Error('Background changed after automated acceptance; recheck readiness');
  return record;
};
