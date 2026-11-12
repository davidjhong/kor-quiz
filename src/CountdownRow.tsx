import {useLayoutEffect,useRef} from 'react';
import {useDelayRender} from 'remotion';
import {COUNTDOWN_ROW} from './presentation';

/** Fixed row geometry; center the bundled-font digit's actual ink on the bar. */
export const CountdownRow=({seconds,progress,height,visible,color,trackColor,accent,
  fontSize=COUNTDOWN_ROW.fontSize,numberWidth=COUNTDOWN_ROW.numberWidth}:{seconds:number|null;progress:number;height:number;
  visible:boolean;color:string;trackColor:string;accent:string;fontSize?:number;numberWidth?:number})=>{
  const ref=useRef<SVGTextElement>(null),text=seconds===null?'':String(seconds),innerHeight=height-2*COUNTDOWN_ROW.padding;
  const {delayRender,continueRender,cancelRender}=useDelayRender();
  useLayoutEffect(()=>{
    if(!text)return;
    const handle=delayRender('Centering countdown digit');let active=true,pending=true;
    const finish=()=>{if(pending){pending=false;continueRender(handle);}};
    document.fonts.load(`700 ${fontSize}px "Noto Sans KR"`,text).then(()=>{
      if(!active||!ref.current)return;
      // SVG getBBox includes this font's tall line box; Canvas exposes the visible ink.
      const context=document.createElement('canvas').getContext('2d');
      if(!context)throw new Error('Countdown font measurement is unavailable');
      context.font=`700 ${fontSize}px "Noto Sans KR"`;const metrics=context.measureText(text);
      const ascent=metrics.actualBoundingBoxAscent,descent=metrics.actualBoundingBoxDescent;
      const width=metrics.actualBoundingBoxLeft+metrics.actualBoundingBoxRight;
      if(ascent+descent>innerHeight||width>numberWidth)throw new Error('Countdown digit does not fit its padded row');
      ref.current.setAttribute('x',String((numberWidth-width)/2+metrics.actualBoundingBoxLeft));
      ref.current.setAttribute('y',String((innerHeight+ascent-descent)/2));finish();
    }).catch(e=>{if(active)cancelRender(e instanceof Error?e:new Error(String(e)));});
    return()=>{active=false;finish();};
  },[text,fontSize,numberWidth,innerHeight,delayRender,continueRender,cancelRender]);
  return <div data-countdown-row style={{height,boxSizing:'border-box',paddingBlock:COUNTDOWN_ROW.padding,
    display:'flex',alignItems:'center',gap:COUNTDOWN_ROW.gap,visibility:visible?'visible':'hidden',color}}>
    <svg width={numberWidth} height={innerHeight} style={{flexShrink:0,overflow:'visible'}} aria-label={text?`${text} seconds remaining`:undefined}>
      <text ref={ref} x={0} y={0} fill="currentColor" fontFamily='"Noto Sans KR", sans-serif' fontSize={fontSize} fontWeight={700}>{text}</text>
    </svg>
    <div style={{height:COUNTDOWN_ROW.barHeight,flex:1,borderRadius:8,background:trackColor,overflow:'hidden'}}>
      <div style={{height:'100%',background:accent,transformOrigin:'left center',transform:`scaleX(${1-progress})`}}/>
    </div>
  </div>;
};
