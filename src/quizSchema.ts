import {z} from 'zod';
import {BACKGROUND_ASSET_IDS} from './assets/backgrounds.ts';

export const CONTENT_LIMITS = {
  id: 64,
  scenario: 40,
  prompt: 100,
  choice: 24,
  romanization: 72,
  explanation: 180,
  questions: 6,
} as const;

// NFKC also unifies compatibility characters, full-width spaces, and Hangul forms.
const text = (maximum: number) => z.string()
  .transform((value) => value.normalize('NFKC').trim())
  .pipe(z.string().min(1, 'Must not be empty or whitespace-only'))
  .refine((value) => [...value].length <= maximum, `Must contain at most ${maximum} Unicode code points`)
  .refine((value) => !/[\u0000-\u001f\u007f\u2028\u2029]/u.test(value), 'Must be a single line without control characters');

// Keep legacy string choices intact; paired choices travel together when reordered.
export const quizChoiceSchema = z.union([
  text(CONTENT_LIMITS.choice),
  z.strictObject({
    hangul: text(CONTENT_LIMITS.choice),
    romanization: text(CONTENT_LIMITS.romanization).optional(),
  }),
]);
export type QuizChoice = z.infer<typeof quizChoiceSchema>;
export const getChoiceHangul = (choice: QuizChoice): string => typeof choice === 'string' ? choice : choice.hangul;
export const getChoiceRomanization = (choice: QuizChoice): string | undefined =>
  typeof choice === 'string' ? undefined : choice.romanization;

export const quizQuestionSchema = z.strictObject({
  id: text(CONTENT_LIMITS.id),
  scenario: text(CONTENT_LIMITS.scenario),
  difficulty: z.enum(['easy', 'medium', 'hard']).optional(),
  context: text(80).optional(),
  prompt: text(CONTENT_LIMITS.prompt),
  choices: z.tuple([quizChoiceSchema, quizChoiceSchema, quizChoiceSchema])
    .superRefine((choices, context) => {
      const seen = new Set<string>();
      choices.forEach((choice, index) => {
        const hangul = getChoiceHangul(choice);
        if (seen.has(hangul)) {
          context.addIssue({code: 'custom', path: [index], message: 'Duplicate choice after trimming and NFKC normalization'});
        }
        seen.add(hangul);
      });
    }),
  correctAnswerIndex: z.union([z.literal(0), z.literal(1), z.literal(2)], {
    error: 'Expected an integer correctAnswerIndex of 0, 1, or 2',
  }),
  explanation: text(CONTENT_LIMITS.explanation),
  suggestedComment: text(220).optional(),
  reveal: z.strictObject({
    translation: text(80),
    teachingPoint: text(100),
  }).optional(),
});

export const quizInputSchema = z.strictObject({
  videoId: text(CONTENT_LIMITS.id),
  episodeTitle: text(80).optional(),
  openingSubtitle: text(60).optional(),
  endingMode: z.enum(['standard', 'comment-challenge']).optional(),
  minimumDurationSeconds: z.number().finite().positive().max(600).optional(),
  showRomanization: z.boolean().optional(),
  backgroundAssetId: z.enum(BACKGROUND_ASSET_IDS, {
    error: 'Unknown background asset ID; select an approved local manifest ID',
  }).optional(),
  questions: z.array(quizQuestionSchema).min(1, 'At least one question is required')
    .max(CONTENT_LIMITS.questions, `At most ${CONTENT_LIMITS.questions} questions are supported`),
}).superRefine((quiz, context) => {
  if (quiz.endingMode === 'comment-challenge') {
    if (quiz.questions.length < 2) {
      context.addIssue({code: 'custom', path: ['questions'], message: 'Comment-challenge mode requires at least two questions'});
    }
    const lastIndex = quiz.questions.length - 1;
    if (lastIndex >= 0 && !quiz.questions[lastIndex].reveal) {
      context.addIssue({code: 'custom', path: ['questions', lastIndex, 'reveal'],
        message: 'The bonus must retain its translation and teaching point in source data'});
    }
  }
  const seen = new Set<string>();
  quiz.questions.forEach((question, index) => {
    if (seen.has(question.id)) {
      context.addIssue({code: 'custom', path: ['questions', index, 'id'], message: 'Duplicate question ID after trimming and NFKC normalization'});
    }
    seen.add(question.id);
    if (quiz.showRomanization) {
      question.choices.forEach((choice, choiceIndex) => {
        if (!getChoiceRomanization(choice)) {
          context.addIssue({code: 'custom', path: ['questions', index, 'choices', choiceIndex, 'romanization'],
            message: 'Nonempty romanization is required for every choice when showRomanization is true'});
        }
      });
    }
  });
});

export type QuizQuestion = z.infer<typeof quizQuestionSchema>;
export type QuizInput = z.infer<typeof quizInputSchema>;

export const parseQuizInput = (input: unknown): QuizInput => {
  const result = quizInputSchema.safeParse(input);
  if (result.success) return result.data;

  const questions = typeof input === 'object' && input !== null && 'questions' in input
    && Array.isArray(input.questions) ? input.questions : [];
  const errors = result.error.issues.map((issue) => {
    const index = issue.path[0] === 'questions' && typeof issue.path[1] === 'number'
      ? issue.path[1] : null;
    const rawQuestion = index === null ? null : questions[index];
    const id = typeof rawQuestion === 'object' && rawQuestion !== null && 'id' in rawQuestion
      && typeof rawQuestion.id === 'string' ? ` (id ${JSON.stringify(rawQuestion.id)})` : '';
    const label = index === null ? 'Quiz' : `Question ${index + 1}${id}`;
    const field = issue.path.reduce<string>((path, part) => typeof part === 'number'
      ? `${path}[${part}]` : `${path}${path ? '.' : ''}${String(part)}`, '') || 'input';
    return `${label} — ${field}: ${issue.message}`;
  });
  throw new Error(`Quiz validation failed:\n${errors.map((error) => `  - ${error}`).join('\n')}`);
};
