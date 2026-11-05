import {QUIZ_FPS, PREVIEW_QUESTION_TIMELINE} from './questionTiming.ts';
import type {PreparedNarration} from './narration.ts';
import {validatePreparedNarrationPlan} from './narration.ts';
import type {QuizInput} from './quizSchema.ts';
import {getEpisodePolicy} from './episodePolicy.ts';
import type {EpisodeScene} from './quizTimeline.ts';

export const NARRATION_TIMING = {
  fps: QUIZ_FPS, openingMinimum: 3 * QUIZ_FPS, readingMinimum: 4 * QUIZ_FPS,
  countdown: 5 * QUIZ_FPS, revealMinimum: 4 * QUIZ_FPS,
  settlePause: 6, afterHook: 15, afterQuestion: 15, answerGap: 10,
  afterExplanation: 30, transition: 12, finalFade: 12, commentHold: 4 * QUIZ_FPS,
} as const;
export const audioDurationToFrames = (seconds: number) => {
  if (!Number.isFinite(seconds) || seconds <= 0) throw new Error('Audio duration must be finite and positive');
  return Math.ceil(seconds * QUIZ_FPS);
};
export const getNarratedTimeline = (narration: PreparedNarration, quiz?: QuizInput) => {
  const rules = NARRATION_TIMING;
  if (quiz) validatePreparedNarrationPlan(quiz, narration);
  else if (JSON.stringify(narration.clips.map((clip) => clip.role)) !== JSON.stringify(['hook', 'question', 'answer', 'explanation'])) {
    throw new Error('Multi-question narration requires the validated quiz');
  }
  const policy = quiz ? getEpisodePolicy(quiz) : {isBonus: (_index: number) => false};
  const questionIds = quiz ? quiz.questions.map((question) => question.id) : [narration.clips[1].contentId];
  const frames = (index: number) => audioDurationToFrames(narration.clips[index].durationSeconds);
  const hookStart = rules.settlePause;
  const openingEnd = Math.max(rules.openingMinimum, hookStart + frames(0) + rules.afterHook);
  const starts: number[] = [hookStart];
  let cursor = openingEnd + rules.transition;
  let clipIndex = 1;
  const questions = questionIds.map((id, questionIndex) => {
    const start = cursor;
    const questionAudioStart = start + rules.settlePause;
    starts.push(questionAudioStart);
    const questionAudioEnd = questionAudioStart + frames(clipIndex++);
    const countdownStart = Math.max(start + rules.readingMinimum, questionAudioEnd + rules.afterQuestion);
    const revealStart = countdownStart + rules.countdown;
    const bonus = policy.isBonus(questionIndex);
    let speechEnd = questionAudioEnd;
    if (!bonus) {
      const answerStart = revealStart + rules.settlePause;
      const explanationStart = answerStart + frames(clipIndex++) + rules.answerGap;
      speechEnd = explanationStart + frames(clipIndex++);
      starts.push(answerStart, explanationStart);
    } else if (narration.clips[clipIndex]?.role === 'comment') {
      const commentStart = revealStart + rules.settlePause;
      starts.push(commentStart);
      speechEnd = commentStart + frames(clipIndex++);
    }
    const end = bonus ? Math.max(revealStart + rules.commentHold, speechEnd + rules.afterExplanation)
      : Math.max(revealStart + rules.revealMinimum, speechEnd + rules.afterExplanation);
    const last = questionIndex === questionIds.length - 1;
    cursor = end + (last ? rules.finalFade : rules.transition);
    return {kind: 'question' as const, id, questionIndex, bonus, start, end, countdownStart, revealStart, speechEnd,
      sequenceStart: start - rules.transition / 2,
      sequenceEnd: end + (last ? rules.finalFade : rules.transition / 2),
      questionTimeline: {...PREVIEW_QUESTION_TIMELINE, countdownStart: countdownStart - start,
        revealStart: revealStart - start, durationInFrames: end - start},
    };
  });
  const audio = narration.clips.map((clip, index) => ({id: clip.id, file: clip.file, role: clip.role,
    text: clip.text, language: clip.language, contentId: clip.contentId, durationSeconds: clip.durationSeconds,
    start: starts[index], end: starts[index] + frames(index)}));
  const scenes: EpisodeScene[] = [{kind: 'opening', start: 0, end: openingEnd, sequenceStart: 0,
    sequenceEnd: openingEnd + rules.transition / 2}, ...questions];
  const first = questions[0];
  return {openingEnd, questions, scenes, audio, durationInFrames: cursor,
    speechEnd: Math.max(...audio.map((clip) => clip.end)),
    // Single-question comparison fields retained for the approved preview and its tests.
    questionStart: first.start, countdownStart: first.countdownStart, revealStart: first.revealStart,
    revealEnd: first.end, questionTimeline: first.questionTimeline,
  };
};
