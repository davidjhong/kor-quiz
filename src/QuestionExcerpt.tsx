import {Html5Audio,Sequence,staticFile,useCurrentFrame} from 'remotion';
import {IllustratedBackground,IllustratedPanel} from './IllustratedFrame';
import {IllustratedQuestionScene} from './IllustratedQuestionScene';
import {PhraseCaption} from './PhraseCaption';
import {BackgroundAudio} from './BackgroundAudio';
import {CAPTION_BAND} from './phraseCaptions';
import {getQuestionExcerptTimeline,type QuestionExcerptProps} from './questionExcerptModel';
export const QuestionExcerpt=({input,background,narration,presentation,phraseCaptions,music}:QuestionExcerptProps)=>{
  const frame=useCurrentFrame(),t=getQuestionExcerptTimeline(narration),progress=frame/Math.max(1,t.durationInFrames-1);
  const opacity=frame<t.end?1:Math.max(0,1-(frame-t.end+1)/(t.durationInFrames-t.end));
  return <>
    <IllustratedBackground assetId={background.id} assetOverride={background} motion={{extraScale:1+.004*progress,x:-2*progress,y:0}}/>
    <IllustratedPanel height={CAPTION_BAND.panelHeight} opacity={opacity}>
      <IllustratedQuestionScene question={input.question} questionIndex={0} questionCount={1} hideProgress showRomanization
        embedded compactSpacing={presentation.compactSpacing} hideRevealNotes questionTimeline={t.questionTimeline}/>
    </IllustratedPanel>
    {presentation.synchronizedCaptions?<PhraseCaption phrases={phraseCaptions} bonusIds={[]} revealStart={t.question.revealStart}/>:null}
    {t.audio.map(c=><Sequence key={c.id} from={c.start} durationInFrames={c.end-c.start} layout="none"><Html5Audio src={staticFile(c.file)} volume={1}/></Sequence>)}
    {presentation.backgroundAudio&&music?<BackgroundAudio file={music.file} duration={t.durationInFrames} audio={t.audio} countdowns={[t.question]} gain={presentation.musicGain}/>:null}
  </>;
};
