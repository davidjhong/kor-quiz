export const QUIZ_FPS = 30;

export const QUESTION_SECONDS = {
  reading: 3,
  countdown: 5,
  reveal: 5,
  entrance: 0.5,
  revealFade: 0.4,
} as const;

const readingFrames = Math.round(QUESTION_SECONDS.reading * QUIZ_FPS);
const countdownFrames = Math.round(QUESTION_SECONDS.countdown * QUIZ_FPS);
const revealFrames = Math.round(QUESTION_SECONDS.reveal * QUIZ_FPS);

export const QUESTION_TIMELINE = {
  countdownStart: readingFrames,
  revealStart: readingFrames + countdownFrames,
  durationInFrames: readingFrames + countdownFrames + revealFrames,
  countdownFrames,
  entranceFrames: Math.round(QUESTION_SECONDS.entrance * QUIZ_FPS),
  revealFadeFrames: Math.round(QUESTION_SECONDS.revealFade * QUIZ_FPS),
} as const;

const clampProgress = (value: number) => Math.min(1, Math.max(0, value));

/** Receives a scene-local Remotion frame; no clocks, side effects, or React state. */
export const getQuestionState = (frame: number) => {
  const phase = frame < QUESTION_TIMELINE.countdownStart
    ? 'reading'
    : frame < QUESTION_TIMELINE.revealStart ? 'countdown' : 'reveal';

  return {
    phase,
    secondsRemaining: phase === 'countdown'
      ? Math.ceil((QUESTION_TIMELINE.revealStart - frame) / QUIZ_FPS)
      : null,
    countdownProgress: clampProgress(
      (frame - QUESTION_TIMELINE.countdownStart) / QUESTION_TIMELINE.countdownFrames,
    ),
    entranceProgress: clampProgress(frame / QUESTION_TIMELINE.entranceFrames),
    revealProgress: clampProgress(
      (frame - QUESTION_TIMELINE.revealStart) / QUESTION_TIMELINE.revealFadeFrames,
    ),
  };
};
