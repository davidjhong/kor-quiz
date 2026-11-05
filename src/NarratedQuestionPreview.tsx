import {Html5Audio, Sequence, staticFile, useCurrentFrame} from 'remotion';
import {IllustratedBackground, IllustratedBookend, IllustratedPanel} from './IllustratedFrame';
import {IllustratedQuestionScene} from './IllustratedQuestionScene';
import type {QuizInput} from './quizSchema';
import type {PreparedNarration} from './narration';
import {getBonusCtaState, getNarratedTimeline, NARRATION_TIMING} from './narrationTiming';
import {getEpisodeSceneOpacity} from './quizTimeline';

export type NarratedQuestionPreviewProps = {quiz: QuizInput; narration: PreparedNarration | null};
export const NarratedQuestionPreview = ({quiz, narration}: NarratedQuestionPreviewProps) => {
  const frame = useCurrentFrame();
  if (!narration) throw new Error('Prepare and validate local audio before rendering CafeNarratedPreview');
  const timeline = getNarratedTimeline(narration, quiz);
  const fullEpisode = quiz.questions.length > 1;
  const subtitle = fullEpisode ? `${quiz.questions.length} questions${quiz.openingSubtitle ? ` · ${quiz.openingSubtitle}` : ''}`
    : narration.clips.some((clip) => clip.sourceKind === 'google-cloud-tts')
      ? 'AI-generated narration · voice audition' : 'Local recording · voice and pacing preview';
  return <>
    <IllustratedBackground assetId={quiz.backgroundAssetId} />
    <IllustratedPanel>
      {timeline.scenes.map((scene, index) => {
        const question = scene.kind === 'question' ? timeline.questions[scene.questionIndex!] : undefined;
        const opacity = index === timeline.scenes.length - 1 && frame >= scene.end
          ? Math.max(0, 1 - (frame - scene.end + 1) / NARRATION_TIMING.finalFade)
          : getEpisodeSceneOpacity(frame, scene);
        return <Sequence key={index} from={scene.sequenceStart} durationInFrames={scene.sequenceEnd - scene.sequenceStart}
          name={question ? quiz.questions[question.questionIndex].id : 'opening'}>
          {question ? <IllustratedQuestionScene question={quiz.questions[question.questionIndex]}
            questionIndex={question.questionIndex} questionCount={quiz.questions.length} bonus={question.bonus}
            bonusCta={getBonusCtaState(frame, question) ?? undefined}
            showRomanization={quiz.showRomanization} embedded contentOpacity={opacity}
            settleFrames={question.start - question.sequenceStart} questionTimeline={question.questionTimeline} />
            : <IllustratedBookend title={quiz.episodeTitle!} embedded contentOpacity={opacity} subtitle={subtitle} />}
        </Sequence>;
      })}
    </IllustratedPanel>
    {timeline.audio.map((clip) => <Sequence key={clip.id} from={clip.start} durationInFrames={clip.end - clip.start} layout="none">
      <Html5Audio src={staticFile(clip.file)} volume={1} />
    </Sequence>)}
  </>;
};
