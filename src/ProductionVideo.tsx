import {Palette} from './Palette';
import {getVarietyMotion} from './variety';
import {AMBIENCE_MIX} from './musicLibrary';
import {Html5Audio,Sequence,staticFile,useCurrentFrame} from 'remotion';
import {IllustratedBackground,IllustratedBookend,IllustratedPanel} from './IllustratedFrame';
import {IllustratedQuestionScene} from './IllustratedQuestionScene';
import {OpeningHook,CommentInvitation,FollowEnding} from './BookendDisplays';
import {getBonusPanelOpacity,getDisplayBackgroundMotion} from './displayBookends';
import {getEpisodeSceneOpacity} from './quizTimeline';
import {getNarratedTimeline} from './narrationTiming';
import {runtimeQuiz,type ProductionProps} from './production';
import {CAPTION_BAND} from './phraseCaptions';
import {PhraseCaption} from './PhraseCaption';
import {BackgroundAudio} from './BackgroundAudio';
import {getSynchronizedCta} from './presentation';
import {BONUS_CTA_LABELS} from './narration';
import {resolveProductionPreset} from './productionPresets';
export const ProductionVideo=({quiz,narration,presentation,phraseCaptions,displayCues,music,background,productionPreset,countdownSeconds,variety,ambience}:ProductionProps)=>{
  const preset=resolveProductionPreset(productionPreset,countdownSeconds);
  const frame=useCurrentFrame(),t=getNarratedTimeline(narration,runtimeQuiz(quiz),preset.timing),opening=t.scenes[0],bonus=t.questions.at(-1)!;
  const followStart=bonus.followStart!,display=presentation.bookendStyle==='display'&&!!displayCues;
  const panelVisible=frame>=t.questions[0].sequenceStart&&frame<followStart;
  const panelOpacity=frame<t.questions[0].start?getEpisodeSceneOpacity(frame,t.questions[0]):getBonusPanelOpacity(frame,followStart);
  const cta=getSynchronizedCta(frame,t.audio,bonus.id);
  const visiblePhrases=phraseCaptions.filter(c=>(!display||!['hook','comment','follow'].includes(c.role))
    &&(!['answer','explanation'].includes(c.role)||frame>=t.questions.find(q=>q.id===c.contentId)!.revealStart));
  return <Palette id={variety?.palette??'cream-navy'}>
    <IllustratedBackground assetId={quiz.backgroundAssetId??undefined} assetOverride={background} motion={variety?getVarietyMotion(variety,frame,t.durationInFrames):getDisplayBackgroundMotion(frame,opening.end,bonus.commentStart!,t.durationInFrames)}/>
    {frame<opening.sequenceEnd?(display?<OpeningHook frame={frame} cues={displayCues} end={opening.end} sequenceEnd={opening.sequenceEnd}/>
      :<IllustratedBookend title={quiz.episodeTitle!}/>):null}
    {panelVisible?<IllustratedPanel height={CAPTION_BAND.panelHeight} opacity={panelOpacity}>
      {t.questions.map(q=><Sequence key={q.id} from={q.sequenceStart} durationInFrames={Math.min(q.sequenceEnd,followStart)-q.sequenceStart}>
        <IllustratedQuestionScene question={quiz.questions[q.questionIndex]} questionIndex={q.questionIndex} questionCount={6}
          bonus={q.bonus} bonusCta={null} showRomanization={quiz.showRomanization} embedded compactSpacing={presentation.compactSpacing}
          hideRevealNotes settleFrames={q.start-q.sequenceStart} questionTimeline={q.questionTimeline} contentOpacity={getEpisodeSceneOpacity(frame,q)}/>
      </Sequence>)}
    </IllustratedPanel>:null}
    {display?<CommentInvitation frame={frame} cues={displayCues} followStart={followStart}/>:null}
    {frame>=followStart?(display?<FollowEnding frame={frame} start={followStart} end={bonus.end} sequenceEnd={t.durationInFrames} cues={displayCues}/>
      :<IllustratedBookend title={BONUS_CTA_LABELS[cta==='follow'?'follow':'comment']}/>):null}
    {presentation.synchronizedCaptions?<PhraseCaption phrases={visiblePhrases} bonusIds={[bonus.id]} revealStart={0}/>:null}
    {t.audio.map(c=><Sequence key={c.id} from={c.start} durationInFrames={c.end-c.start} layout="none"><Html5Audio src={staticFile(c.file)} volume={1}/></Sequence>)}
    {presentation.backgroundAudio&&music?<BackgroundAudio file={music.file} duration={t.durationInFrames} audio={t.audio} countdowns={t.questions} gain={presentation.musicGain} levels={preset.music} trimDb={music.mixTrimDb}/>:null}
    {ambience?<BackgroundAudio file={ambience.asset.file} duration={t.durationInFrames} audio={t.audio} countdowns={t.questions} gain={ambience.gain} levels={AMBIENCE_MIX} trimDb={ambience.asset.mixTrimDb}/>:null}
  </Palette>;
};
