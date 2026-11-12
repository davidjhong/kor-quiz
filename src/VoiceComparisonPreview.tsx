import {Html5Audio, Sequence, staticFile, useCurrentFrame} from 'remotion';
import {IllustratedBackground, IllustratedPanel, IllustratedBookend} from './IllustratedFrame';
import {IllustratedQuestionScene} from './IllustratedQuestionScene';
import {getComparisonTimeline, type ComparisonProps} from './comparison';
import {getEpisodeSceneOpacity} from './quizTimeline';
import {getExplanationCaption, getSynchronizedCta, getNarrationCaption} from './presentation';
import {BONUS_CTA_LABELS} from './narration';
import {NARRATION_TIMING} from './narrationTiming';
import {BackgroundAudio} from './BackgroundAudio';
import {PhraseCaption} from './PhraseCaption';
import {CAPTION_BAND} from './phraseCaptions';
import {OpeningHook,CommentInvitation,FollowEnding} from './BookendDisplays';
import {getBonusPanelOpacity,getDisplayBackgroundMotion} from './displayBookends';

export const VoiceComparisonPreview = ({quiz, narration, questionIndex, presentation, music, phraseCaptions,bonusReadingFrames,displayCues}: ComparisonProps) => {
  const frame = useCurrentFrame(), t = getComparisonTimeline(quiz, questionIndex, narration,bonusReadingFrames);
  const q = quiz.questions[questionIndex], cta = getSynchronizedCta(frame, t.audio, narration.clips[4].contentId);
  const hook = getNarrationCaption(frame, narration.clips[0].contentId, t.audio);
  const endingClip = getNarrationCaption(frame, narration.clips[4].contentId, t.audio, true);
  const endingText = cta === 'follow' ? narration.clips[5].text : narration.clips[4].text;
  const phrases=presentation.synchronizedCaptions && presentation.captionStyle==='phrases';
  const display=presentation.bookendStyle==='display' && displayCues!==undefined;
  const panelVisible=!display || (frame>=t.question.sequenceStart&&frame<t.ending.followStart);
  const panelOpacity=!display?1:frame<t.question.start?getEpisodeSceneOpacity(frame,t.question):getBonusPanelOpacity(frame,t.ending.followStart);
  const bonusQuestion=quiz.questions.at(-1)!;
  const endingOpacity = frame >= t.ending.end ? Math.max(0, 1 - (frame - t.ending.end + 1) / NARRATION_TIMING.finalFade)
    : getEpisodeSceneOpacity(frame, t.ending);
  return <>
    <IllustratedBackground assetId={quiz.backgroundAssetId} motion={display?getDisplayBackgroundMotion(frame,t.opening.end,t.ending.commentStart,t.durationInFrames):undefined}/>
    {display&&frame<t.opening.sequenceEnd?<OpeningHook frame={frame} cues={displayCues} end={t.opening.end} sequenceEnd={t.opening.sequenceEnd}/>:null}
    {panelVisible?<IllustratedPanel height={phrases ? CAPTION_BAND.panelHeight : undefined} opacity={panelOpacity}>
      {!display?<Sequence from={0} durationInFrames={t.opening.sequenceEnd}>
        <IllustratedBookend title={presentation.synchronizedCaptions && hook ? hook.text : quiz.episodeTitle!}
          embedded contentOpacity={getEpisodeSceneOpacity(frame, t.opening)} />
      </Sequence>:null}
      <Sequence from={t.question.sequenceStart} durationInFrames={t.question.sequenceEnd - t.question.sequenceStart}>
        <IllustratedQuestionScene question={q} questionIndex={questionIndex} questionCount={quiz.questions.length}
          showRomanization={quiz.showRomanization} embedded compactSpacing={presentation.compactSpacing}
          explanationCaption={presentation.synchronizedCaptions && !phrases ? getExplanationCaption(frame, q.id, t.audio) : undefined}
          narrationCaption={presentation.synchronizedCaptions && !phrases ? getNarrationCaption(frame, q.id, t.audio) : undefined}
          hideRevealNotes={phrases}
          settleFrames={t.question.start - t.question.sequenceStart} questionTimeline={t.question.questionTimeline}
          contentOpacity={getEpisodeSceneOpacity(frame, t.question)} />
      </Sequence>
      {display&&t.bonus?<Sequence from={t.bonus.sequenceStart} durationInFrames={t.bonus.sequenceEnd-t.bonus.sequenceStart}>
        <IllustratedQuestionScene question={bonusQuestion} questionIndex={quiz.questions.length-1} questionCount={quiz.questions.length}
          bonus bonusCta={null} showRomanization={quiz.showRomanization} embedded compactSpacing={presentation.compactSpacing}
          hideRevealNotes settleFrames={t.bonus.start-t.bonus.sequenceStart} questionTimeline={t.bonus.questionTimeline}
          contentOpacity={getEpisodeSceneOpacity(frame,t.bonus)}/>
      </Sequence>:null}
      {!display?<Sequence from={t.ending.sequenceStart} durationInFrames={t.ending.sequenceEnd - t.ending.sequenceStart}>
        {cta && cta !== 'legacy-comment' ? <IllustratedBookend title={presentation.synchronizedCaptions ? endingClip?.text ?? endingText : BONUS_CTA_LABELS[cta]}
          embedded contentOpacity={endingOpacity} /> : null}
      </Sequence>:null}
    </IllustratedPanel>:null}
    {display?<CommentInvitation frame={frame} cues={displayCues} followStart={t.ending.followStart}/>:null}
    {display&&frame>=t.ending.followStart?<FollowEnding frame={frame} start={t.ending.followStart} end={t.ending.end}
      sequenceEnd={t.durationInFrames} cues={displayCues}/>:null}
    {phrases ? <PhraseCaption phrases={display?phraseCaptions.filter(p=>!['hook','comment','follow'].includes(p.role)):phraseCaptions}
      bonusIds={[narration.clips[4].contentId]} revealStart={t.question.revealStart} /> : null}
    {t.audio.map((clip) => <Sequence key={clip.id} from={clip.start} durationInFrames={clip.end - clip.start} layout="none">
      <Html5Audio src={staticFile(clip.file)} volume={1} />
    </Sequence>)}
    {presentation.backgroundAudio && music ? <BackgroundAudio file={music.file} duration={t.durationInFrames}
      audio={t.audio} countdowns={t.bonus?[t.question,t.bonus]:[t.question]} gain={presentation.musicGain} /> : null}
  </>;
};
