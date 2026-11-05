import {Html5Audio, Sequence, staticFile, useCurrentFrame} from 'remotion';
import {IllustratedBackground, IllustratedPanel, IllustratedBookend} from './IllustratedFrame';
import {IllustratedQuestionScene} from './IllustratedQuestionScene';
import {getComparisonTimeline, type ComparisonProps} from './comparison';
import {getEpisodeSceneOpacity} from './quizTimeline';
import {getExplanationCaption, getSynchronizedCta} from './presentation';
import {BONUS_CTA_LABELS} from './narration';
import {NARRATION_TIMING} from './narrationTiming';
import {BackgroundAudio} from './BackgroundAudio';

export const VoiceComparisonPreview = ({quiz, narration, questionIndex, presentation, music}: ComparisonProps) => {
  const frame = useCurrentFrame(), t = getComparisonTimeline(quiz, questionIndex, narration);
  const q = quiz.questions[questionIndex], cta = getSynchronizedCta(frame, t.audio, narration.clips[4].contentId);
  const endingOpacity = frame >= t.ending.end ? Math.max(0, 1 - (frame - t.ending.end + 1) / NARRATION_TIMING.finalFade)
    : getEpisodeSceneOpacity(frame, t.ending);
  return <>
    <IllustratedBackground assetId={quiz.backgroundAssetId} />
    <IllustratedPanel>
      <Sequence from={0} durationInFrames={t.opening.sequenceEnd}>
        <IllustratedBookend title={quiz.episodeTitle!} subtitle={`Comparison excerpt · question ${questionIndex + 1} of ${quiz.questions.length}`}
          embedded contentOpacity={getEpisodeSceneOpacity(frame, t.opening)} />
      </Sequence>
      <Sequence from={t.question.sequenceStart} durationInFrames={t.question.sequenceEnd - t.question.sequenceStart}>
        <IllustratedQuestionScene question={q} questionIndex={questionIndex} questionCount={quiz.questions.length}
          showRomanization={quiz.showRomanization} embedded compactSpacing={presentation.compactSpacing}
          explanationCaption={presentation.synchronizedCaptions ? getExplanationCaption(frame, q.id, t.audio) : undefined}
          settleFrames={t.question.start - t.question.sequenceStart} questionTimeline={t.question.questionTimeline}
          contentOpacity={getEpisodeSceneOpacity(frame, t.question)} />
      </Sequence>
      <Sequence from={t.ending.sequenceStart} durationInFrames={t.ending.sequenceEnd - t.ending.sequenceStart}>
        {cta && cta !== 'legacy-comment' ? <IllustratedBookend title={BONUS_CTA_LABELS[cta]}
          subtitle="Ending demonstration" embedded contentOpacity={endingOpacity} /> : null}
      </Sequence>
    </IllustratedPanel>
    {t.audio.map((clip) => <Sequence key={clip.id} from={clip.start} durationInFrames={clip.end - clip.start} layout="none">
      <Html5Audio src={staticFile(clip.file)} volume={1} />
    </Sequence>)}
    {presentation.backgroundAudio && music ? <BackgroundAudio file={music.file} duration={t.durationInFrames}
      audio={t.audio} countdowns={[t.question]} /> : null}
  </>;
};
