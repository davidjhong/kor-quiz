import {z} from 'zod';
export const displayCuesSchema=z.strictObject({sayItStart:z.number().int(),inStart:z.number().int(),koreanStart:z.number().int(),
  commentPromptStart:z.number().int(),commentInvitationStart:z.number().int(),followMoreStart:z.number().int(),followKoreanStart:z.number().int()});
export type DisplayCues=z.infer<typeof displayCuesSchema>;
const clamp=(n:number)=>Math.max(0,Math.min(1,n));
const smooth=(n:number)=>{const p=clamp(n);return p*p*(3-2*p);};
export const getDisplayEntrance=(frame:number,start:number)=>{
  const p=clamp((frame-start+1)/6);
  return {opacity:p,scale:0.95+0.05*(1-(1-p)**3)};
};
/** Single episode-level movement; frozen during reading/countdowns, continuous at cuts. */
export const getDisplayBackgroundMotion=(frame:number,openingEnd:number,commentStart:number,end:number)=>{
  const opening=smooth(frame/openingEnd),ending=smooth((frame-commentStart)/(end-commentStart));
  return {extraScale:1+0.015*opening+0.015*ending,x:-4+4*opening-5*ending,y:-3-3*opening-4*ending};
};
export const getBonusPanelOpacity=(frame:number,followStart:number)=>1-clamp((frame-followStart+6)/6);
