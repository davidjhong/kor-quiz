import {Composition} from 'remotion';
import {KoreanSample} from './KoreanSample';
import {QuestionScene} from './QuestionScene';
import {cafeQuestions, cafeQuiz} from './content/cafeQuestions';
import {QUESTION_TIMELINE, QUIZ_FPS} from './questionTiming';
import {QuizVideo} from './QuizVideo';
import {parseQuizInput} from './quizSchema';
import {getIllustratedEpisodeTimeline, getQuizTimeline} from './quizTimeline';
import {PolishedQuestionPreview} from './PolishedQuestionPreview';
import {PREVIEW_QUESTION_TIMELINE} from './questionTiming';
import previewContent from '../content/cafe-preview.json';
import illustratedContent from '../content/cafe-illustrated-preview.json';
import {IllustratedQuestionPreview} from './IllustratedQuestionPreview';
import cafeEpisodeContent from '../content/cafe-six.json';
import narratedContent from '../content/cafe-narrated-preview.json';
import {NarratedQuestionPreview} from './NarratedQuestionPreview';
import {preparedNarrationSchema} from './narration';
import {getNarratedTimeline} from './narrationTiming';
import {VoiceComparisonPreview} from './VoiceComparisonPreview';
import {comparisonPropsSchema, getComparisonTimeline, type ComparisonProps} from './comparison';

const previewQuiz = parseQuizInput(previewContent);
const illustratedQuiz = parseQuizInput(illustratedContent);
const cafeEpisode = parseQuizInput(cafeEpisodeContent);

export const Root = () => (
  <>
    <Composition id="VoiceComparisonExcerpt" component={VoiceComparisonPreview}
      defaultProps={{quiz: cafeEpisode, questionIndex: 0, narration: null, presentation: {compactSpacing: true, synchronizedCaptions: true, backgroundAudio: true}, music: null} as unknown as ComparisonProps}
      width={1080} height={1920} fps={QUIZ_FPS} durationInFrames={90}
      calculateMetadata={({props}) => {
        const parsed = comparisonPropsSchema.parse(props);
        return {props: parsed, durationInFrames: getComparisonTimeline(parsed.quiz, parsed.questionIndex, parsed.narration).durationInFrames};
      }} />
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
    <Composition
      id="KoreanQuiz"
      component={QuizVideo}
      defaultProps={{quiz: cafeQuiz}}
      width={1080}
      height={1920}
      fps={QUIZ_FPS}
      durationInFrames={getQuizTimeline(cafeQuiz.questions.length).durationInFrames}
      calculateMetadata={({props}) => {
        const quiz = parseQuizInput(props.quiz);
        return {props: {quiz}, durationInFrames: quiz.endingMode !== undefined
          ? getIllustratedEpisodeTimeline(quiz).durationInFrames : getQuizTimeline(quiz.questions.length).durationInFrames};
      }}
    />
    <Composition
      id="CafePolishPreview"
      component={PolishedQuestionPreview}
      defaultProps={{quiz: previewQuiz}}
      width={1080}
      height={1920}
      fps={QUIZ_FPS}
      durationInFrames={PREVIEW_QUESTION_TIMELINE.durationInFrames}
      calculateMetadata={({props}) => ({
        props: {quiz: parseQuizInput(props.quiz)},
        durationInFrames: PREVIEW_QUESTION_TIMELINE.durationInFrames,
      })}
    />
    <Composition
      id="CafeIllustratedPreview"
      component={IllustratedQuestionPreview}
      defaultProps={{quiz: illustratedQuiz}}
      width={1080}
      height={1920}
      fps={QUIZ_FPS}
      durationInFrames={PREVIEW_QUESTION_TIMELINE.durationInFrames}
      calculateMetadata={({props}) => ({
        props: {quiz: parseQuizInput(props.quiz)},
        durationInFrames: PREVIEW_QUESTION_TIMELINE.durationInFrames,
      })}
    />
    <Composition
      id="CafeIllustratedQuiz"
      component={QuizVideo}
      defaultProps={{quiz: cafeEpisode, illustrated: true}}
      width={1080}
      height={1920}
      fps={QUIZ_FPS}
      durationInFrames={getIllustratedEpisodeTimeline(cafeEpisode).durationInFrames}
      calculateMetadata={({props}) => {
        const quiz = parseQuizInput(props.quiz);
        return {props: {quiz, illustrated: true},
          durationInFrames: getIllustratedEpisodeTimeline(quiz).durationInFrames};
      }}
    />
    <Composition id="CafeNarratedPreview" component={NarratedQuestionPreview}
      defaultProps={{quiz: parseQuizInput(narratedContent), narration: null}}
      width={1080} height={1920} fps={QUIZ_FPS} durationInFrames={90}
      calculateMetadata={({props}) => {
        const narration = preparedNarrationSchema.parse(props.narration);
        const quiz = parseQuizInput(props.quiz);
        return {props: {quiz, narration}, durationInFrames: getNarratedTimeline(narration, quiz).durationInFrames};
      }} />
    <Composition id="CafeNarratedQuiz" component={NarratedQuestionPreview}
      defaultProps={{quiz: cafeEpisode, narration: null}}
      width={1080} height={1920} fps={QUIZ_FPS} durationInFrames={90}
      calculateMetadata={({props}) => {
        const narration = preparedNarrationSchema.parse(props.narration);
        const quiz = parseQuizInput(props.quiz);
        return {props: {quiz, narration}, durationInFrames: getNarratedTimeline(narration, quiz).durationInFrames};
      }} />
  </>
);
