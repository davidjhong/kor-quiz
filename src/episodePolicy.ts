import type {QuizInput} from './quizSchema.ts';

export const getEpisodePolicy = (quiz: QuizInput) => {
  const totalQuestions = quiz.questions.length;
  const commentChallenge = quiz.endingMode === 'comment-challenge';
  if (commentChallenge && totalQuestions < 2) throw new Error('Comment-challenge mode requires at least two questions');
  return {
    totalQuestions,
    scoredQuestions: totalQuestions - (commentChallenge ? 1 : 0),
    commentChallenge,
    isBonus: (index: number) => commentChallenge && index === totalQuestions - 1,
  };
};

export const getScorePrompt = (count: number, beforeBonus: boolean) => beforeBonus
  ? `How many of the first ${count} did you get right?`
  : 'How many did you get right?';
