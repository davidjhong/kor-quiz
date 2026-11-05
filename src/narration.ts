import {z} from 'zod';
import {getChoiceHangul, type QuizInput} from './quizSchema.ts';
import {getEpisodePolicy} from './episodePolicy.ts';

const nonblank = z.string().min(1).max(1000).refine((value) => value.trim().length > 0, 'Must not be blank');
export const LEGACY_BONUS_CTA_TEXT = 'What do you think? Comment A, B, or C below!';
export const BONUS_CTA_TEXT = 'What do you think? Comment your answer!';
export const BONUS_FOLLOW_TEXT = 'Follow for more Korean!';
export const BONUS_CTA_LABELS = {comment: 'Comment your answer 💬', follow: 'Follow for more Korean ✨'} as const;
export type BonusCtaState = 'legacy-comment' | keyof typeof BONUS_CTA_LABELS;
export const narrationSegmentSchema = z.strictObject({
  id: z.string().regex(/^[a-z0-9][a-z0-9-]{0,63}$/u),
  contentId: nonblank,
  role: z.enum(['hook', 'question', 'answer', 'explanation', 'comment', 'follow']),
  language: z.enum(['en-US', 'ko-KR']),
  text: nonblank,
  localFile: nonblank.optional(),
  recordingId: nonblank.optional(),
});
const chirpProfileSchema = z.strictObject({
  provider: z.literal('google-cloud-tts'), model: z.literal('chirp3-hd'),
  voices: z.strictObject({'en-US': z.enum(['en-US-Chirp3-HD-Kore', 'en-US-Chirp3-HD-Puck', 'en-US-Chirp3-HD-Achird']),
    'ko-KR': z.enum(['ko-KR-Chirp3-HD-Kore', 'ko-KR-Chirp3-HD-Puck', 'ko-KR-Chirp3-HD-Achird'])}),
  outputFormat: z.literal('LINEAR16'), sampleRateHertz: z.literal(24000), speakingRate: z.literal(1),
});
const geminiProfileSchema = z.strictObject({provider: z.literal('google-cloud-tts'), model: z.literal('gemini-2.5-flash-tts'),
  voices: z.strictObject({'en-US': z.literal('Achird'), 'ko-KR': z.literal('Achird')}),
  stylePrompts: z.strictObject({'en-US': nonblank, 'ko-KR': nonblank}),
  outputFormat: z.literal('LINEAR16'), sampleRateHertz: z.literal(24000), speakingRate: z.literal(1)});
export const voiceProfileSchema = z.discriminatedUnion('model', [chirpProfileSchema, geminiProfileSchema]);
export const narrationScriptSchema = z.strictObject({
  version: z.literal(1), profile: voiceProfileSchema,
  segments: z.array(narrationSegmentSchema).min(1).max(19),
});
export type NarrationScript = z.infer<typeof narrationScriptSchema>;
export type NarrationSegment = z.infer<typeof narrationSegmentSchema>;
export const preparedClipSchema = narrationSegmentSchema.omit({localFile: true}).extend({
  cacheKey: z.string().regex(/^[a-f0-9]{64}$/u),
  file: z.string().regex(/^audio\/cache\/[a-f0-9]{64}\.wav$/u),
  sha256: z.string().regex(/^[a-f0-9]{64}$/u),
  durationSeconds: z.number().finite().positive().max(60),
  sourceKind: z.enum(['local', 'google-cloud-tts']),
  sourceChecksum: z.string().regex(/^[a-f0-9]{64}$/u),
  peakDbFS: z.number().finite().max(0),
});
export const preparedNarrationSchema = z.strictObject({
  version: z.literal(1), quizFingerprint: z.string().regex(/^[a-f0-9]{64}$/u),
  profile: voiceProfileSchema, processing: z.literal('loudnorm-I-16-TP-1.5-LRA-11-mono-24000-v1'),
  clips: z.array(preparedClipSchema).min(4).max(19),
});
export type PreparedNarration = z.infer<typeof preparedNarrationSchema>;
export type PreparedClip = z.infer<typeof preparedClipSchema>;

/** Exclude hidden roles before any cache lookup or synthesis. No answer choice list is spoken. */
export const buildNarrationPlan = (quiz: QuizInput, script: NarrationScript): NarrationSegment[] => {
  const policy = getEpisodePolicy(quiz);
  const questions = new Map(quiz.questions.map((question, index) => [question.id, {question, index}]));
  const ids = new Set<string>();
  const filtered = script.segments.filter((segment) => {
    if (ids.has(segment.id)) throw new Error(`Duplicate narration segment ID: ${segment.id}`);
    ids.add(segment.id);
    if (segment.role === 'hook') {
      if (segment.contentId !== quiz.videoId || segment.language !== 'en-US'
        || segment.text !== quiz.episodeTitle) throw new Error('Hook must match this episode ID and title in English');
      return true;
    }
    const entry = questions.get(segment.contentId);
    if (!entry) throw new Error(`Unknown narration content ID: ${segment.contentId}`);
    if (policy.isBonus(entry.index) && (segment.role === 'answer' || segment.role === 'explanation')) return false;
    if ((segment.role === 'comment' || segment.role === 'follow') && (!policy.isBonus(entry.index) || segment.language !== 'en-US'
      || (segment.role === 'follow' ? segment.text !== BONUS_FOLLOW_TEXT
        : segment.text !== BONUS_CTA_TEXT && segment.text !== LEGACY_BONUS_CTA_TEXT))) {
      throw new Error(`${segment.id}: bonus CTA must use the fixed neutral invitation and follow text`);
    }
    if (segment.role === 'answer') {
      if (segment.language !== 'ko-KR' || !/[가-힣]/u.test(segment.text)
        || segment.text !== getChoiceHangul(entry.question.choices[entry.question.correctAnswerIndex])) {
        throw new Error(`${segment.id}: synthesize the correct Hangul answer, never romanization`);
      }
    } else if (segment.language !== 'en-US') throw new Error(`${segment.id}: expected English narration`);
    if (segment.role === 'question') {
      const expected = entry.question.spokenPrompt ?? `${entry.question.prompt}${entry.question.context ? ` ${entry.question.context}` : ''}`;
      if (segment.text !== expected) throw new Error(`${segment.id}: question narration must match spokenPrompt, or the legacy prompt and context`);
    }
    return true;
  });
  const expected = [`${quiz.videoId}:hook`];
  quiz.questions.forEach((question, index) => {
    expected.push(`${question.id}:question`);
    if (!policy.isBonus(index)) expected.push(`${question.id}:answer`, `${question.id}:explanation`);
    else {
      const comment = script.segments.find((segment) => segment.role === 'comment');
      if (comment) expected.push(`${question.id}:comment`);
      if (comment?.text === BONUS_CTA_TEXT) expected.push(`${question.id}:follow`);
    }
  });
  if (JSON.stringify(filtered.map((segment) => `${segment.contentId}:${segment.role}`)) !== JSON.stringify(expected)) {
    throw new Error('Narration segments must be ordered: hook, then each question, Hangul answer, English explanation (bonus answers excluded)');
  }
  return filtered;
};

export const assertNarratedCheckpoint = (quiz: QuizInput) => {
  if (!quiz.episodeTitle) throw new Error('Narrated episodes require an episodeTitle for the opening hook');
};

/** Prepared props must never carry even an unused bonus answer or explanation clip. */
export const validatePreparedNarrationPlan = (quiz: QuizInput, narration: PreparedNarration) => {
  assertNarratedCheckpoint(quiz);
  const plan = buildNarrationPlan(quiz, {version: 1, profile: narration.profile, segments: narration.clips});
  if (plan.length !== narration.clips.length) throw new Error('Prepared audio contains forbidden bonus answer/explanation clips; rerun audio:prepare');
  return plan;
};
