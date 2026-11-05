import {z} from 'zod';
import {voiceProfileSchema, preparedNarrationSchema, type PreparedNarration} from './narration.ts';
import {presentationSchema} from './presentation.ts';
import {getNarratedTimeline, NARRATION_TIMING, audioDurationToFrames} from './narrationTiming.ts';
import {quizInputSchema, type QuizInput} from './quizSchema.ts';
export const auditionProfileSchema = z.strictObject({id: z.enum(['a-baseline', 'b-puck', 'c-achird']), label: z.string(), profile: voiceProfileSchema});
export const comparisonConfigSchema = z.strictObject({id: z.literal('transit-01'), draftDirectory: z.string(),
  expectedContentHash: z.string().regex(/^[a-f0-9]{64}$/u), questionId: z.string(), profiles: z.array(z.string()).length(3), presentation: presentationSchema});
export const comparisonPropsSchema = z.strictObject({quiz: quizInputSchema, questionIndex: z.number().int().min(0).max(4),
  narration: preparedNarrationSchema, presentation: presentationSchema,
  music: z.strictObject({file: z.string(), sha256: z.string(), durationSeconds: z.number().positive()}).nullable()});
export type ComparisonProps = z.infer<typeof comparisonPropsSchema>;
export const getComparisonTimeline = (quiz: QuizInput, questionIndex: number, narration: PreparedNarration) => {
  if (narration.clips.length !== 6 || JSON.stringify(narration.clips.map((c) => c.role)) !== JSON.stringify(['hook', 'question', 'answer', 'explanation', 'comment', 'follow'])) throw new Error('Comparison requires exactly hook/question/answer/explanation/comment/follow');
  const excerptQuiz = {...quiz, questions: [quiz.questions[questionIndex]], endingMode: 'standard' as const, minimumDurationSeconds: undefined};
  const base = getNarratedTimeline({...narration, clips: narration.clips.slice(0, 4)}, excerptQuiz);
  const question = base.questions[0], r = NARRATION_TIMING;
  question.sequenceEnd = question.end + r.transition / 2;
  const start = question.end + r.transition, commentStart = start + r.settlePause;
  const commentEnd = commentStart + audioDurationToFrames(narration.clips[4].durationSeconds);
  const followStart = commentEnd + r.afterComment;
  const followEnd = followStart + audioDurationToFrames(narration.clips[5].durationSeconds);
  const end = followEnd + r.afterFollow, durationInFrames = end + r.finalFade;
  const ending = {kind: 'ending-demo' as const, start, end, sequenceStart: start - r.transition / 2,
    sequenceEnd: durationInFrames, commentStart, commentEnd, followStart, followEnd};
  const audio = [...base.audio, ...narration.clips.slice(4).map((clip, i) => ({...clip,
    start: i ? followStart : commentStart, end: i ? followEnd : commentEnd}))];
  return {opening: base.scenes[0], question, ending, audio, durationInFrames, speechEnd: followEnd};
};
