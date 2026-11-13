import {z} from 'zod';
import {ILLUSTRATED_THEME} from './illustratedTheme.ts';
export const PALETTE_IDS=['cream-navy','sage-coral','midnight-gold','blush-plum'] as const;
export const MOTION_IDS=['slow-push','slow-pull','slow-pan-left','slow-pan-right'] as const;
type Colors={ [K in keyof typeof ILLUSTRATED_THEME.colors]:string };
export const PALETTES:Record<typeof PALETTE_IDS[number],Colors>={
  'cream-navy':ILLUSTRATED_THEME.colors,
  'sage-coral':{panel:'#EDF2E8',text:'#203C35',answer:'#FFFFFF',accent:'#B64835',correct:'#D0E9D8',teal:'#175B43',secondary:'#425E53',subdued:'#E3EADD',track:'#C3D0BD',background:'#DCE5D4'},
  'midnight-gold':{panel:'#182D42',text:'#FFF4DB',answer:'#243C54',accent:'#F0C969',correct:'#254E45',teal:'#BFEED4',secondary:'#D0DCE5',subdued:'#1D344B',track:'#4D6172',background:'#111F30'},
  'blush-plum':{panel:'#F8EAF0',text:'#44283F',answer:'#FFF9FC',accent:'#A44062',correct:'#DDEEDB',teal:'#315F43',secondary:'#695062',subdued:'#F0DFE8',track:'#D9BFCE',background:'#EAD9E1'},
};
export const motionConfigSchema=z.strictObject({version:z.literal('motion-v2'),zoomTravel:z.number().min(0).max(.06),panTravel:z.number().min(0).max(30),panScale:z.number().min(1).max(1.04),topInset:z.number().min(0).max(12),
  declaredRegion:z.strictObject({left:z.number(),right:z.number(),top:z.number(),bottom:z.number()}),regionSource:z.literal('declared-generic-features-not-face-detection')});
const visualFields={palette:z.enum(PALETTE_IDS),motion:z.enum(MOTION_IDS),width:z.number().int().positive(),height:z.number().int().positive()};
export const visualVarietySchema=z.discriminatedUnion('version',[
  z.strictObject({version:z.literal('visual-variety-v1'),...visualFields}),
  z.strictObject({version:z.literal('visual-variety-v2'),...visualFields,motionConfig:motionConfigSchema})]);
export type VisualVariety=z.infer<typeof visualVarietySchema>;
const clamp=(v:number)=>Math.max(0,Math.min(1,v));
/** CSS object-fit:cover (center crop), then top-center scale and translation. */
export const coverBounds=(width:number,height:number,scale:number,x:number,y:number)=>{
  const cover=Math.max(1080/width,1920/height),w=width*cover,h=height*cover;
  return {left:540-w*scale/2+x,right:540+w*scale/2+x,top:(1920-h)*scale/2+y,bottom:(1920+h)*scale/2+y};
};
/** One continuous episode clock. Only 2% zoom travel and 10px horizontal travel.
 * The -8px vertical inset protects the top edge even on exact 9:16 artwork. */
export const varietyMotion=(id:typeof MOTION_IDS[number],frame:number,duration:number)=>{
  const u=clamp(frame/Math.max(1,duration-1)),t=u*u*(3-2*u);
  return {extraScale:id==='slow-push'?1+.02*t:id==='slow-pull'?1.02-.02*t:1.01,
    x:id==='slow-pan-left'?5-10*t:id==='slow-pan-right'?-5+10*t:0,y:-8};
};
const safeRegion={left:650,right:930,top:1210,bottom:1580};
export const motionV2=(id:typeof MOTION_IDS[number],frame:number,duration:number,c:z.infer<typeof motionConfigSchema>)=>{
  const u=clamp(frame/Math.max(1,duration-1)),t=u*u*(3-2*u);
  return {extraScale:id==='slow-push'?1+c.zoomTravel*t:id==='slow-pull'?1+c.zoomTravel*(1-t):c.panScale,
    x:id==='slow-pan-left'?c.panTravel*(.5-t):id==='slow-pan-right'?c.panTravel*(t-.5):0,y:-c.topInset};
};
export const declaredMotionSafe=(width:number,height:number,framing:number,c:z.infer<typeof motionConfigSchema>)=>{
  const r=c.declaredRegion;
  for(const id of MOTION_IDS)for(const f of [0,30,60,90,120]){
    const m=motionV2(id,f,121,c),b=coverBounds(width,height,framing*m.extraScale,m.x,m.y);
    if(b.left>0||b.top>0||b.right<1080||b.bottom<1920)return false;
    // Region is in the already-framed reference. Unit geometry, not a promise
    // that a future generated face occupies these coordinates.
    if(540+(r.left-540)*m.extraScale+m.x<70||540+(r.right-540)*m.extraScale+m.x>972||r.top*m.extraScale+m.y<1200||r.bottom*m.extraScale+m.y>1670)return false;
  }return true;
};
export const resolveMotionConfig=(width:number,height:number,framing=1.02)=>{
  for(let strength=1;strength>=0;strength-=.05){const c=motionConfigSchema.parse({version:'motion-v2',zoomTravel:.05*Math.max(0,strength),panTravel:26*Math.max(0,strength),panScale:1+.025*Math.max(0,strength),topInset:8,declaredRegion:safeRegion,regionSource:'declared-generic-features-not-face-detection'});
    if(declaredMotionSafe(width,height,framing,c))return c;}
  throw new Error('Background crop/declared feature region cannot support safe motion; inspect framing before a new job');
};
export const getVarietyMotion=(v:VisualVariety,frame:number,duration:number)=>v.version==='visual-variety-v1'?varietyMotion(v.motion,frame,duration):motionV2(v.motion,frame,duration,v.motionConfig);
export const contrast=(a:string,b:string)=>{
  const l=(s:string)=>{const v=s.match(/[0-9a-f]{2}/gi)!.map(h=>parseInt(h,16)/255).map(c=>c<=.04045?c/12.92:((c+.055)/1.055)**2.4);return .2126*v[0]+.7152*v[1]+.0722*v[2];};
  const x=l(a),y=l(b);return (Math.max(x,y)+.05)/(Math.min(x,y)+.05);
};
