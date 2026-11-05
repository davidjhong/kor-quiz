import {z} from 'zod';
import {quizInputSchema, quizQuestionSchema, parseQuizInput, type QuizInput} from './quizSchema.ts';
import {BACKGROUND_ASSET_IDS} from './assets/backgrounds.ts';
import {buildNarrationPlan, narrationScriptSchema} from './narration.ts';

const text = (max: number) => z.string().min(1).max(max).refine((s) => s.trim().length > 0, 'Must not be blank');
export const briefSchema = z.strictObject({scenario: text(1000), audience: text(240), level: text(240),
  backgroundAssetId: z.enum(BACKGROUND_ASSET_IDS)});
export const bonusAnswerKeySchema = z.strictObject({questionId: quizQuestionSchema.shape.id,
  correctAnswerIndex: quizQuestionSchema.shape.correctAnswerIndex,
  explanation: quizQuestionSchema.shape.explanation, translation: text(80), teachingPoint: text(100)});
const bonusQuestionSchema = quizQuestionSchema.omit({correctAnswerIndex: true, explanation: true, reveal: true, suggestedComment: true});
export const draftQuizSchema = z.strictObject({...quizInputSchema.shape, questions: z.tuple([
  quizQuestionSchema, quizQuestionSchema, quizQuestionSchema, quizQuestionSchema, quizQuestionSchema, bonusQuestionSchema,
])});
export const draftSourceSchema = z.strictObject({quiz: draftQuizSchema, narration: narrationScriptSchema,
  bonusAnswerKey: bonusAnswerKeySchema});
export const draftSchema = z.strictObject({version: z.literal(1), brief: briefSchema,
  provenance: z.strictObject({method: z.literal('local-import'), provider: z.literal('local-authoring'), model: z.null(),
    promptVersion: z.literal('phase5-local-v1'), generatedAt: z.string().datetime(), sourceHash: z.string().regex(/^[a-f0-9]{64}$/u),
    reportedUsage: z.null(), estimatedCostUSD: z.literal(0)}),
  quiz: draftQuizSchema, narration: narrationScriptSchema});
export type Draft = z.infer<typeof draftSchema>;
export type BonusAnswerKey = z.infer<typeof bonusAnswerKeySchema>;

/** The bonus answer never enters renderer props; fixed unused placeholders satisfy the legacy scene type. */
export const draftToQuiz = (draft: Draft): QuizInput => parseQuizInput({...draft.quiz,
  questions: draft.quiz.questions.map((question, index) => index < 5 ? question : {...question,
    correctAnswerIndex: 0, explanation: 'Answer withheld for the comment challenge.'})});

export const validateDraftContent = (draft: Draft, key: BonusAnswerKey) => {
  const quiz = draftToQuiz(draft); // Reuse shared length, uniqueness, romanization and asset-ID validation.
  if (!quiz.episodeTitle || quiz.endingMode !== 'comment-challenge' || !quiz.showRomanization) {
    throw new Error('quiz: title, comment-challenge ending and enabled romanization are required');
  }
  if (quiz.backgroundAssetId !== draft.brief.backgroundAssetId) throw new Error('quiz.backgroundAssetId must match the approved asset ID in brief');
  if (JSON.stringify(quiz.questions.map((q) => q.difficulty)) !== JSON.stringify(['easy', 'easy', 'medium', 'medium', 'hard', 'hard'])) {
    throw new Error('quiz.questions: required order is easy, easy, medium, medium, hard, hard (relative to beginners)');
  }
  quiz.questions.slice(0, 5).forEach((question, index) => {
    if (!question.reveal) throw new Error(`Question ${index + 1} (${question.id}).reveal: English meaning and teaching point required`);
  });
  const bonus = quiz.questions[5];
  if (key.questionId !== bonus.id) throw new Error('answer-key.questionId must identify question 6');
  const bonusPrompt = `${bonus.prompt} ${bonus.context ?? ''}`;
  if (/[가-힣]/u.test(bonusPrompt) || /\b(?:correct\s+(?:answer|choice)\s*(?:is|:|=)|answer\s+is)\s*[ABC]\b/iu.test(bonusPrompt)) {
    throw new Error('Question 6 prompt/context: use an English scenario without a Hangul answer or explicit answer-letter hint');
  }
  const bonusSegments = draft.narration.segments.filter((s) => s.contentId === bonus.id);
  if (JSON.stringify(bonusSegments.map((s) => s.role)) !== JSON.stringify(['question', 'comment'])) {
    throw new Error('Question 6 narration: only question and neutral comment CTA allowed; no bonus answer/explanation');
  }
  const plan = buildNarrationPlan(quiz, draft.narration);
  if (plan.length !== draft.narration.segments.length) throw new Error('Narration contains hidden bonus answer data');
  return quiz;
};
