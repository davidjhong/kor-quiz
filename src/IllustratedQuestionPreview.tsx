import {IllustratedBackground} from './IllustratedFrame';
import {IllustratedQuestionScene} from './IllustratedQuestionScene';
import type {QuizInput} from './quizSchema';

/** Preserve the approved one-question comparison using the shared scene. */
export const IllustratedQuestionPreview = ({quiz}: {quiz: QuizInput}) => <>
  <IllustratedBackground assetId={quiz.backgroundAssetId} />
  <IllustratedQuestionScene question={quiz.questions[0]} questionIndex={0}
    questionCount={quiz.questions.length} showRomanization={quiz.showRomanization} />
</>;
