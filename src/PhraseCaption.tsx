import {useCurrentFrame} from 'remotion';
import {FittedText} from './FittedText';
import {CAPTION_BAND, getActivePhrase, getPhraseAnimation, type CaptionPhrase} from './phraseCaptions';
export const PhraseCaption = ({phrases, bonusIds, revealStart}: {phrases: CaptionPhrase[]; bonusIds: string[]; revealStart: number}) => {
  const frame=useCurrentFrame(), phrase=getActivePhrase(frame,phrases,bonusIds,revealStart);
  if(!phrase)return null;
  const animation=getPhraseAnimation(frame,phrase), words=phrase.text.split(/\s+/u), last=words.pop()!;
  return <div data-phrase-caption={phrase.text} style={{position:'absolute',left:CAPTION_BAND.left,top:CAPTION_BAND.top,
    width:CAPTION_BAND.width,height:CAPTION_BAND.height,display:'flex',alignItems:'center',
    color:'#FFFFFF',fontFamily:'"Noto Sans KR", sans-serif',textAlign:'center',
    WebkitTextStroke:'6px #172B3A',paintOrder:'stroke fill',textShadow:'0 4px 8px rgba(0,0,0,0.35)',
    opacity:animation.opacity,transform:`scale(${animation.scale})`,transformOrigin:'center center'}}>
    <FittedText text={phrase.text} label={`${phrase.clipId} phrase caption`} height={CAPTION_BAND.height}
      fontSize={CAPTION_BAND.fontSize} minFontSize={CAPTION_BAND.minimumFontSize} lineHeight={CAPTION_BAND.lineHeight}
      fontWeight={700} balance center lang={phrase.language==='ko-KR'?'ko':'en'}>
      {words.length ? words.join(' ')+' ' : ''}<span style={{color:phrase.emphasis?'#FFD978':'#FFFFFF'}}>{last}</span>
    </FittedText>
  </div>;
};
