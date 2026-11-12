import {z} from 'zod';
import {CONTENT_LIMITS, quizInputSchema, quizQuestionSchema, parseQuizInput, type QuizInput} from './quizSchema.ts';
import {SCENARIO_TYPES} from './assets/backgrounds.ts';
import {backgroundIdSchema} from './assets/backgroundSchema.ts';
import {BONUS_CTA_TEXT, buildNarrationPlan, narrationScriptSchema} from './narration.ts';

const text = (max: number) => z.string().min(1).max(max).refine((s) => s.trim().length > 0, 'Must not be blank');
export const ENGLISH_NARRATION_PATTERN = /^[^가-힣]*$/u;
export const briefLearningSchema = z.strictObject({context: text(1000), learningObjectives: z.array(text(160)).length(6)});
export const briefSchema = z.strictObject({scenario: text(1000), audience: text(240), level: text(240),
  backgroundAssetId: backgroundIdSchema.nullable(), scenarioType: z.enum(SCENARIO_TYPES).optional(),
  context: briefLearningSchema.shape.context.optional(), learningObjectives: briefLearningSchema.shape.learningObjectives.optional()});
export const bonusAnswerKeySchema = z.strictObject({questionId: quizQuestionSchema.shape.id,
  correctAnswerIndex: quizQuestionSchema.shape.correctAnswerIndex,
  explanation: quizQuestionSchema.shape.explanation, translation: text(CONTENT_LIMITS.translation), teachingPoint: text(CONTENT_LIMITS.teachingPoint)});
const bonusQuestionSchema = quizQuestionSchema.omit({correctAnswerIndex: true, explanation: true, reveal: true, suggestedComment: true});
export const draftQuizSchema = z.strictObject({...quizInputSchema.shape,
  backgroundAssetId: backgroundIdSchema.nullable().optional(), questions: z.tuple([
  quizQuestionSchema, quizQuestionSchema, quizQuestionSchema, quizQuestionSchema, quizQuestionSchema, bonusQuestionSchema,
])});
export const draftSourceSchema = z.strictObject({quiz: draftQuizSchema, narration: narrationScriptSchema,
  bonusAnswerKey: bonusAnswerKeySchema});
export const tokenUsageSchema = z.strictObject({inputTokens: z.number().int().nonnegative(), outputTokens: z.number().int().nonnegative(),
  totalTokens: z.number().int().nonnegative(), reasoningTokens: z.number().int().nonnegative(), cachedInputTokens: z.number().int().nonnegative()});
const localProvenance = z.strictObject({method: z.literal('local-import'), provider: z.literal('local-authoring'), model: z.null(),
    promptVersion: z.literal('phase5-local-v1'), generatedAt: z.string().datetime(), sourceHash: z.string().regex(/^[a-f0-9]{64}$/u),
    reportedUsage: z.null(), estimatedCostUSD: z.literal(0)});
export const generatedProvenanceSchema = z.strictObject({method: z.literal('openai-responses'), provider: z.literal('openai'),
  model: text(100), requestedModel: text(100), returnedModel: text(100), promptVersion: text(80), schemaVersion: text(80),
  generatedAt: z.string().datetime(), sourceHash: z.string().regex(/^[a-f0-9]{64}$/u), requestId: text(160).nullable(),
  responseId: text(160).nullable(), reportedUsage: tokenUsageSchema.nullable(), estimatedCostUSD: z.number().finite().nonnegative(),
  attempts: z.number().int().min(1).max(2), pricingSource: z.string().url(), pricingDate: text(10), generationId: text(80)});
export const draftSchema = z.strictObject({version: z.literal(1), brief: briefSchema,
  provenance: z.discriminatedUnion('method', [localProvenance, generatedProvenanceSchema]),
  quiz: draftQuizSchema, narration: narrationScriptSchema});
export type Draft = z.infer<typeof draftSchema>;
export type BonusAnswerKey = z.infer<typeof bonusAnswerKeySchema>;

/** The bonus answer never enters renderer props; fixed unused placeholders satisfy the legacy scene type. */
export const draftToQuiz = (draft: Draft): QuizInput => {
  const {backgroundAssetId, ...quiz} = draft.quiz;
  return parseQuizInput({...quiz, ...(backgroundAssetId ? {backgroundAssetId} : {}),
    questions: quiz.questions.map((question, index) => index < 5 ? question : {...question,
      correctAnswerIndex: 0, explanation: 'Answer withheld for the comment challenge.'})});
};

export const validateDraftContent = (draft: Draft, key: BonusAnswerKey) => {
  const quiz = draftToQuiz(draft); // Reuse shared length, uniqueness, romanization and asset-ID validation.
  if (!quiz.episodeTitle || quiz.endingMode !== 'comment-challenge' || !quiz.showRomanization) {
    throw new Error('quiz: title, comment-challenge ending and enabled romanization are required');
  }
  if ((quiz.backgroundAssetId ?? null) !== draft.brief.backgroundAssetId) throw new Error('quiz.backgroundAssetId must match the registered asset ID in brief');
  if (JSON.stringify(quiz.questions.map((q) => q.difficulty)) !== JSON.stringify(['easy', 'easy', 'medium', 'medium', 'hard', 'hard'])) {
    throw new Error('quiz.questions: required order is easy, easy, medium, medium, hard, hard (relative to beginners)');
  }
  quiz.questions.slice(0, 5).forEach((question, index) => {
    if (!question.reveal) throw new Error(`Question ${index + 1} (${question.id}).reveal: English meaning and teaching point required`);
  });
  const bonus = quiz.questions[5];
  if (key.questionId !== bonus.id) throw new Error('answer-key.questionId must identify question 6');
  const bonusPrompt = `${bonus.prompt} ${bonus.context ?? ''} ${bonus.spokenPrompt ?? ''}`;
  if (/[가-힣]/u.test(bonusPrompt) || /\b(?:correct\s+(?:answer|choice)\s*(?:is|:|=)|answer\s+is)\s*[ABC]\b/iu.test(bonusPrompt)) {
    throw new Error('Question 6 prompt/context: use an English scenario without a Hangul answer or explicit answer-letter hint');
  }
  const bonusSegments = draft.narration.segments.filter((s) => s.contentId === bonus.id);
  if (JSON.stringify(bonusSegments.map((s) => s.role)) !== JSON.stringify(['question', 'comment', 'follow'])) {
    throw new Error('Question 6 narration: only question, neutral comment and follow CTAs allowed; no bonus answer/explanation');
  }
  if (bonusSegments[1].text !== BONUS_CTA_TEXT) throw new Error('Question 6: use the revised fixed neutral invitation before the follow CTA');
  const plan = buildNarrationPlan(quiz, draft.narration);
  if (plan.length !== draft.narration.segments.length) throw new Error('Narration contains hidden bonus answer data');
  if (draft.provenance.method === 'openai-responses') {
    quiz.questions.forEach((q, index) => q.choices.forEach((choice, choiceIndex) => {
      const hangul = typeof choice === 'string' ? choice : choice.hangul;
      const romanization = typeof choice === 'string' ? '' : choice.romanization ?? '';
      if (!/[가-힣]/u.test(hangul) || /[가-힣]/u.test(romanization)) throw new Error(`Question ${index + 1}.choices[${choiceIndex}]: Hangul and Latin romanization must stay separate`);
      const phrase = romanization.toLowerCase().replace(/[.!?]/gu, '').trim();
      const words = phrase.replace(/-/gu, ' ').split(/\s+/u);
      const fragments = [phrase, ...words.slice(0, -1).map((word, i) => `${word} ${words[i + 1]}`)]
        .filter((part) => part.length >= 6);
      for (const segment of plan.filter((s) => s.language === 'en-US')) {
        const spoken = segment.text.toLowerCase().replace(/[-.!?]/gu, ' ').replace(/\s+/gu, ' ');
        if (!ENGLISH_NARRATION_PATTERN.test(segment.text) || fragments.some((part) => spoken.includes(part.replace(/[.!?]/gu, '')))) {
          throw new Error(`${segment.id}: English narration must not speak Hangul or romanized Korean answers`);
        }
      }
    }));
  }
  return quiz;
};
