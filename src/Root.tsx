import {Composition} from 'remotion';
import {KoreanSample} from './KoreanSample';
import {QuestionScene} from './QuestionScene';
import {cafeQuestions} from './content/cafeQuestions';
import {QUESTION_TIMELINE, QUIZ_FPS} from './questionTiming';

export const Root = () => (
  <>
    <Composition
      id="KoreanSample"
      component={KoreanSample}
      width={1080}
      height={1920}
      fps={30}
      durationInFrames={360}
    />
    <Composition
      id="CafeQuestion"
      component={QuestionScene}
      defaultProps={{question: cafeQuestions[0]}}
      width={1080}
      height={1920}
      fps={QUIZ_FPS}
      durationInFrames={QUESTION_TIMELINE.durationInFrames}
    />
  </>
);
