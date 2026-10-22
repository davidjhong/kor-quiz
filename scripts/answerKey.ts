import {getEpisodePolicy} from '../src/episodePolicy.ts';
import {getChoiceHangul, type QuizInput} from '../src/quizSchema.ts';

/** Private companion text for the creator; never supplied to the video UI. */
export const createBonusAnswerKey = (quiz: QuizInput): string | undefined => {
  if (!getEpisodePolicy(quiz).commentChallenge) return undefined;
  const question = quiz.questions.at(-1)!;
  if (!question.reveal) throw new Error(`Bonus ${question.id} needs its source translation`);
  const letter = ['A', 'B', 'C'][question.correctAnswerIndex];
  const answer = getChoiceHangul(question.choices[question.correctAnswerIndex]);
  return [
    `Video: ${quiz.videoId}`,
    `Bonus question ID: ${question.id}`,
    `Correct answer: ${letter} — ${answer}`,
    `Translation: ${question.reveal.translation}`,
    `Explanation: ${question.explanation}`,
    '', 'Suggested comment — review and post manually:',
    question.suggestedComment ?? `${letter}: ${answer} = ${question.reveal.translation} ${question.explanation}`,
    '', 'Not published. The bonus answer is intentionally absent from the video.', '',
  ].join('\n');
};
