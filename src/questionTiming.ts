export const QUIZ_FPS = 30;

export const QUESTION_SECONDS = {
  reading: 3,
  countdown: 5,
  reveal: 5,
  entrance: 0.5,
  revealFade: 0.4,
} as const;

type QuestionSeconds = {reading: number; countdown: number; reveal: number; entrance: number; revealFade: number};

export const createQuestionTimeline = (seconds: QuestionSeconds) => {
  const readingFrames = Math.round(seconds.reading * QUIZ_FPS);
  const countdownFrames = Math.round(seconds.countdown * QUIZ_FPS);
  const revealFrames = Math.round(seconds.reveal * QUIZ_FPS);
  return {
    countdownStart: readingFrames,
    revealStart: readingFrames + countdownFrames,
    durationInFrames: readingFrames + countdownFrames + revealFrames,
    countdownFrames,
    entranceFrames: Math.round(seconds.entrance * QUIZ_FPS),
    revealFadeFrames: Math.round(seconds.revealFade * QUIZ_FPS),
  };
};

export const QUESTION_TIMELINE = createQuestionTimeline(QUESTION_SECONDS);
export const PREVIEW_QUESTION_SECONDS = {...QUESTION_SECONDS, reading: 4, countdown: 5, reveal: 4} as const;
export const PREVIEW_QUESTION_TIMELINE = createQuestionTimeline(PREVIEW_QUESTION_SECONDS);

const clampProgress = (value: number) => Math.min(1, Math.max(0, value));

/** Receives a scene-local Remotion frame; no clocks, side effects, or React state. */
export const getQuestionState = (frame: number, timeline = QUESTION_TIMELINE) => {
  const phase = frame < timeline.countdownStart
    ? 'reading'
    : frame < timeline.revealStart ? 'countdown' : 'reveal';

  return {
    phase,
    secondsRemaining: phase === 'countdown'
      ? Math.ceil((timeline.revealStart - frame) / QUIZ_FPS)
      : null,
    countdownProgress: clampProgress(
      (frame - timeline.countdownStart) / timeline.countdownFrames,
    ),
    entranceProgress: clampProgress(frame / timeline.entranceFrames),
    revealProgress: clampProgress(
      (frame - timeline.revealStart) / timeline.revealFadeFrames,
    ),
  };
};

/** A bonus never enters a reveal state, including frames beyond its planned hold. */
export const getIllustratedQuestionState = (frame: number, bonus: boolean) => {
  const state = getQuestionState(frame, PREVIEW_QUESTION_TIMELINE);
  if (!bonus) return state;
  return {...state, phase: state.phase === 'reveal' ? 'comment' as const : state.phase,
    revealProgress: 0};
};
