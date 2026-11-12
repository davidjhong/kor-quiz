import type {CSSProperties} from 'react';
import {FittedText} from './FittedText';
import {CAPTION_BAND} from './phraseCaptions';
import {getDisplayEntrance,type DisplayCues} from './displayBookends';
const ink='#172B3A',cream='#FFF7E8',yellow='#FFD978',coral='#E66B57';
const display:CSSProperties={fontFamily:'"Noto Sans KR", sans-serif',color:cream,WebkitTextStroke:`12px ${ink}`,
  paintOrder:'stroke fill',textShadow:'0 6px 16px rgba(23,43,58,0.28)',textAlign:'left'};
const line=(top:number,height:number):CSSProperties=>({position:'absolute',left:110,right:140,top,height});
const Accent=({opacity=1}:{opacity?:number})=><div style={{position:'absolute',left:118,top:934,width:400,height:12,
  borderRadius:6,background:coral,boxShadow:`0 3px 0 ${ink}`,opacity}}/>;
export const OpeningHook=({frame,cues,end,sequenceEnd}:{frame:number;cues:DisplayCues;end:number;sequenceEnd:number})=>{
  const say=getDisplayEntrance(frame,cues.sayItStart),inside=getDisplayEntrance(frame,cues.inStart),korean=getDisplayEntrance(frame,cues.koreanStart);
  const opacity=frame<end?1:Math.max(0,1-(frame-end+1)/(sequenceEnd-end+1));
  return <div data-opening-hook style={{...display,position:'absolute',inset:0,opacity}}>
    <div style={{position:'absolute',left:118,top:235,width:100,height:10,background:coral,borderRadius:5}}/>
    <div style={line(282,180)}><FittedText text="Can you" label="hook Can you" height={180} fontSize={142} minFontSize={130}
      lineHeight={1.12} fontWeight={700} letterSpacing={-4}/></div>
    <div style={{...line(470,180),opacity:say.opacity,transform:`scale(${say.scale})`,transformOrigin:'left center'}}>
      <FittedText text="say it in" label="hook say it in" height={180} fontSize={140} minFontSize={124} lineHeight={1.12} fontWeight={700} letterSpacing={-4}>
        say it <span style={{opacity:inside.opacity}}>in</span>
      </FittedText>
    </div>
    <div style={{...line(678,230),color:yellow,opacity:korean.opacity,transform:`scale(${korean.scale})`,transformOrigin:'left center'}}>
      <FittedText text="Korean?" label="hook Korean" height={230} fontSize={178} minFontSize={150} lineHeight={1.12} fontWeight={700} letterSpacing={-5}/>
    </div>
    <Accent opacity={korean.opacity}/>
  </div>;
};
export const CommentInvitation=({frame,cues,followStart}:{frame:number;cues:DisplayCues;followStart:number})=>{
  if(frame<cues.commentPromptStart||frame>=followStart)return null;
  const invitation=frame>=cues.commentInvitationStart,start=invitation?cues.commentInvitationStart:cues.commentPromptStart;
  const a=getDisplayEntrance(frame,start),text=invitation?'Comment your answer!':'What do you think?';
  return <div data-comment-invitation style={{...display,position:'absolute',left:CAPTION_BAND.left,top:CAPTION_BAND.top,
    width:CAPTION_BAND.width,height:CAPTION_BAND.height,display:'flex',alignItems:'center',gap:16,textAlign:'center',
    WebkitTextStroke:`6px ${ink}`,opacity:a.opacity*Math.min(1,(followStart-frame)/6),transform:`scale(${a.scale})`}}>
    <svg width={48} height={48} viewBox="0 0 48 48" style={{flexShrink:0}} aria-hidden>
      <path d="M8 7h32v25H24l-12 9v-9H8Z" fill={cream} stroke={ink} strokeWidth={3} strokeLinejoin="round"/>
      <circle cx={18} cy={19} r={2.5} fill={coral}/><circle cx={29} cy={19} r={2.5} fill={coral}/>
    </svg>
    <FittedText text={text} label="comment display" height={132} fontSize={62} minFontSize={54} lineHeight={1.08} fontWeight={700} center balance>
      {invitation?<>Comment your <span style={{color:yellow}}>answer!</span></>:text}
    </FittedText>
  </div>;
};
export const FollowEnding=({frame,start,end,sequenceEnd,cues}:{frame:number;start:number;end:number;sequenceEnd:number;cues:DisplayCues})=>{
  const a=getDisplayEntrance(frame,start),more=getDisplayEntrance(frame,cues.followMoreStart),korean=getDisplayEntrance(frame,cues.followKoreanStart);
  const fade=frame<end?1:Math.max(0,1-(frame-end+1)/(sequenceEnd-end));
  return <div data-follow-ending style={{...display,position:'absolute',inset:0,opacity:a.opacity*fade}}>
    <div style={{...line(328,180),transform:`scale(${a.scale})`,transformOrigin:'left center'}}>
      <FittedText text="Follow for" label="follow title" height={180} fontSize={132} minFontSize={118} lineHeight={1.12} fontWeight={700} letterSpacing={-4}/>
    </div>
    <div style={{...line(510,180),opacity:more.opacity}}><FittedText text="more" label="follow more" height={180}
      fontSize={144} minFontSize={130} lineHeight={1.12} fontWeight={700} letterSpacing={-4}/></div>
    <div style={{...line(690,225),color:yellow,opacity:korean.opacity,transform:`scale(${korean.scale})`,transformOrigin:'left center'}}>
      <FittedText text="Korean!" label="follow Korean" height={225} fontSize={176} minFontSize={150} lineHeight={1.12} fontWeight={700} letterSpacing={-5}/>
    </div>
    <Accent opacity={korean.opacity}/>
  </div>;
};
