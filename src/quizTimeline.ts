import {CONTENT_LIMITS} from './quizSchema.ts';
import {PREVIEW_QUESTION_TIMELINE, QUESTION_TIMELINE, QUIZ_FPS} from './questionTiming.ts';
import type {QuizInput} from './quizSchema.ts';
import {getEpisodePolicy} from './episodePolicy.ts';

// Phase 2 has no standalone intro, outro, or transition scenes. Entrance animation
// is already included in every question's reading period; cuts add no frames.
export const QUIZ_SECTION_FRAMES = {opening: 0, transition: 0, ending: 0} as const;

export const BASELINE_TIMELINE_SETTINGS = {question: QUESTION_TIMELINE, sections: QUIZ_SECTION_FRAMES};
type TimelineSettings = {
  question: typeof QUESTION_TIMELINE;
  sections: {opening: number; transition: number; ending: number};
};

export const getQuizTimeline = (questionCount: number, settings: TimelineSettings = BASELINE_TIMELINE_SETTINGS) => {
  if (!Number.isInteger(questionCount) || questionCount < 1 || questionCount > CONTENT_LIMITS.questions) {
    throw new Error(`Question count must be an integer from 1 to ${CONTENT_LIMITS.questions}`);
  }
  const questionFrames = settings.question.durationInFrames;
  const sections = settings.sections;
  return {
    questionStarts: Array.from({length: questionCount}, (_, index) =>
      sections.opening + index * (questionFrames + sections.transition)),
    durationInFrames: sections.opening + questionCount * questionFrames
      + (questionCount - 1) * sections.transition + sections.ending,
  };
};

/** Exit occupies only added transition frames, preserving the complete reveal. */
export const getPanelExitOpacity = (frame: number, questionFrames: number, exitFrames: number) =>
  exitFrames === 0 || frame < questionFrames ? 1
    : Math.max(0, 1 - (frame - questionFrames + 1) / exitFrames);

// Opening is centralized for a future max(3s, measured speech + pause) policy.
export const EPISODE_TIMING = {
  openingFrames: 3 * QUIZ_FPS,
  transitionFrames: Math.round(0.4 * QUIZ_FPS),
  scoreFrames: Math.round(2.5 * QUIZ_FPS),
  commentHoldFrames: 4 * QUIZ_FPS,
  question: PREVIEW_QUESTION_TIMELINE,
} as const;

export type EpisodeScene = {
  kind: 'opening' | 'question' | 'score';
  questionIndex?: number;
  bonus?: boolean;
  start: number; end: number; sequenceStart: number; sequenceEnd: number;
};

/** Full phases are separated by explicit transitions; transitions steal no reading time. */
export const getIllustratedEpisodeTimeline = (quiz: QuizInput) => {
  const policy = getEpisodePolicy(quiz);
  // Retain the existing count bounds in the shared dynamic pipeline.
  getQuizTimeline(policy.totalQuestions);
  const {question, transitionFrames, openingFrames, scoreFrames, commentHoldFrames} = EPISODE_TIMING;
  const planned: Array<{kind: EpisodeScene['kind']; duration: number; questionIndex?: number; bonus?: boolean}> = [
    {kind: 'opening', duration: openingFrames},
  ];
  quiz.questions.forEach((_, questionIndex) => {
    const bonus = policy.isBonus(questionIndex);
    planned.push({kind: 'question', questionIndex, bonus,
      duration: bonus ? question.revealStart + commentHoldFrames : question.durationInFrames});
  });
  if (!policy.commentChallenge) planned.push({kind: 'score', duration: scoreFrames});
  let cursor = 0;
  const scenes: EpisodeScene[] = planned.map((scene, index) => {
    const start = cursor;
    const end = start + scene.duration;
    cursor = end + (index < planned.length - 1 ? transitionFrames : 0);
    return {kind: scene.kind, questionIndex: scene.questionIndex, bonus: scene.bonus, start, end,
      sequenceStart: start - (index === 0 ? 0 : transitionFrames / 2),
      sequenceEnd: end + (index === planned.length - 1 ? 0 : transitionFrames / 2)};
  });
  return {...policy, scenes, questionStarts: scenes.filter((scene) => scene.kind === 'question').map((scene) => scene.start),
    durationInFrames: cursor};
};

/** Only one scene's text exists at any frame; the underlying cream panel stays opaque. */
export const getEpisodeSceneOpacity = (frame: number, scene: EpisodeScene) => {
  if (frame < scene.start) return Math.min(1, (frame - scene.sequenceStart + 1) / (scene.start - scene.sequenceStart));
  if (frame >= scene.end && scene.sequenceEnd > scene.end) return Math.max(0, 1 - (frame - scene.end + 1) / (scene.sequenceEnd - scene.end + 1));
  return 1;
};
