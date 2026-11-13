/** Local-only diagnostic entry. Never imported by the production renderer. */
import {Composition,registerRoot,useCurrentFrame} from 'remotion';
import {IllustratedBackground,IllustratedPanel} from '../src/IllustratedFrame';
import {IllustratedQuestionScene} from '../src/IllustratedQuestionScene';
import {Palette} from '../src/Palette';
import {MOTION_IDS,varietyMotion} from '../src/variety';
import {CAPTION_BAND} from '../src/phraseCaptions';
import {PREVIEW_QUESTION_TIMELINE} from '../src/questionTiming';
import type {ProductionProps} from '../src/production';
const Motion=({source}:{source:ProductionProps})=>{
  const f=useCurrentFrame(),index=Math.floor(f/150),local=f%150,id=MOTION_IDS[index];
  return <Palette id="cream-navy">
    <IllustratedBackground assetId={source.quiz.backgroundAssetId??undefined} assetOverride={source.background} motion={varietyMotion(id,local,150)}/>
    <IllustratedPanel height={CAPTION_BAND.panelHeight}><IllustratedQuestionScene question={source.quiz.questions[0]} questionIndex={0} questionCount={6}
      embedded compactSpacing showRomanization hideRevealNotes questionTimeline={{...PREVIEW_QUESTION_TIMELINE,countdownStart:10000,revealStart:10150,durationInFrames:10270}}/></IllustratedPanel>
    <div style={{position:'absolute',left:70,top:55,color:'#FFF7E8',font:'bold 34px "Noto Sans KR"',WebkitTextStroke:'4px #172B3A',paintOrder:'stroke fill'}}>MOTION DEMO · {id}</div>
  </Palette>;
};
registerRoot(()=> <Composition id="MotionDiagnostics" component={Motion} width={1080} height={1920} fps={30} durationInFrames={600} defaultProps={{source:{} as ProductionProps}}/>);
