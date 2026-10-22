import {Sequence, useCurrentFrame} from 'remotion';
import {QuestionScene} from './QuestionScene';
import type {QuizInput} from './quizSchema';
import {getEpisodeSceneOpacity, getIllustratedEpisodeTimeline, getQuizTimeline} from './quizTimeline';
import {IllustratedBackground, IllustratedBookend, IllustratedPanel} from './IllustratedFrame';
import {IllustratedQuestionScene} from './IllustratedQuestionScene';
import {getScorePrompt} from './episodePolicy';
import {QUESTION_TIMELINE} from './questionTiming';

export type QuizVideoProps = {quiz: QuizInput; illustrated?: boolean};

export const QuizVideo = ({quiz, illustrated = false}: QuizVideoProps) => {
  const frame = useCurrentFrame();
  if (illustrated || quiz.endingMode !== undefined) {
    const timeline = getIllustratedEpisodeTimeline(quiz);
    return <>
      <IllustratedBackground assetId={quiz.backgroundAssetId} />
      <IllustratedPanel>
        {timeline.scenes.map((scene, index) => <Sequence key={`${scene.kind}-${index}`}
          from={scene.sequenceStart} durationInFrames={scene.sequenceEnd - scene.sequenceStart}
          name={scene.kind === 'question' ? quiz.questions[scene.questionIndex!].id : scene.kind}>
          {scene.kind === 'question' ? <IllustratedQuestionScene
            question={quiz.questions[scene.questionIndex!]} questionIndex={scene.questionIndex!}
            questionCount={timeline.totalQuestions} showRomanization={quiz.showRomanization}
            bonus={scene.bonus} settleFrames={scene.start - scene.sequenceStart} embedded
            contentOpacity={getEpisodeSceneOpacity(frame, scene)} />
            : <IllustratedBookend embedded contentOpacity={getEpisodeSceneOpacity(frame, scene)}
              title={scene.kind === 'opening' ? quiz.episodeTitle ?? 'Korean quiz'
                : getScorePrompt(timeline.scoredQuestions, timeline.commentChallenge)}
              subtitle={scene.kind === 'opening' ? `${timeline.totalQuestions} ${timeline.totalQuestions === 1 ? 'question' : 'questions'}${quiz.openingSubtitle ? ` · ${quiz.openingSubtitle}` : ''}` : undefined}
              questionCount={scene.kind === 'score' ? timeline.scoredQuestions : undefined} />}
        </Sequence>)}
      </IllustratedPanel>
    </>;
  }
  const timeline = getQuizTimeline(quiz.questions.length);
  return <>
    {quiz.questions.map((question, index) => (
      <Sequence key={question.id} from={timeline.questionStarts[index]}
        durationInFrames={QUESTION_TIMELINE.durationInFrames} name={question.id}>
        <QuestionScene question={question} showRomanization={quiz.showRomanization} />
      </Sequence>
    ))}
  </>;
};
