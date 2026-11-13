import {createHash} from 'node:crypto';
export const SYNTH_VERSION='local-instrumentals-v1';
export const MUSIC_PROCESSING={version:'loop-static-lufs-v1',targetLUFS:-20,toleranceLU:.6,ceilingDbTP:-3,meterToleranceDb:.05,rate:48000,channels:2,bits:16} as const;
export const RECIPES={
  'soft-lofi-keys':{title:'Soft Lofi Keys',kind:'music',bpm:78,bars:16,key:'C major',mood:'gentle, warm keys',trimDb:-2},
  'warm-pluck-groove':{title:'Warm Pluck Groove',kind:'music',bpm:96,bars:20,key:'C major',mood:'light, friendly plucks',trimDb:-3},
  'airy-pad-drift':{title:'Airy Pad Drift',kind:'music',bpm:70,bars:16,key:'C major',mood:'spacious, calm pads',trimDb:-2.5},
  'soft-room-tone':{title:'Soft Room Tone',kind:'ambience',bpm:null,bars:null,key:null,mood:'synthetic soft ventilation texture',trimDb:-7},
  'gentle-rain':{title:'Gentle Rain',kind:'ambience',bpm:null,bars:null,key:null,mood:'synthetic rain-like texture',trimDb:-9},
} as const;
export type LocalAudioId=keyof typeof RECIPES;
const hash=(s:string|Buffer)=>createHash('sha256').update(s).digest('hex');
export const rawIdentity=(id:LocalAudioId,seed:string)=>({version:SYNTH_VERSION,id,seed,recipe:RECIPES[id],sampleRate:48000,channels:2,bits:16,loop:'circular tails; periodic noise overlap, duration retained; music phase offset 0.75 beat'});
const generator=(seed:string)=>{let x=parseInt(hash(seed).slice(0,8),16)||1;return ()=>{x^=x<<13;x^=x>>>17;x^=x<<5;return (x>>>0)/4294967296;};};
export const encodeWav=(left:Float64Array,right:Float64Array,gain=1)=>{
  if(left.length!==right.length||!Number.isFinite(gain)||gain<=0)throw new Error('Invalid PCM dimensions/gain');
  const out=Buffer.alloc(44+left.length*4);out.write('RIFF');out.writeUInt32LE(out.length-8,4);out.write('WAVEfmt ',8);out.writeUInt32LE(16,16);out.writeUInt16LE(1,20);out.writeUInt16LE(2,22);out.writeUInt32LE(48000,24);out.writeUInt32LE(192000,28);out.writeUInt16LE(4,32);out.writeUInt16LE(16,34);out.write('data',36);out.writeUInt32LE(left.length*4,40);
  for(let i=0;i<left.length;i++)for(let c=0;c<2;c++){const x=(c?right:left)[i]*gain;if(!Number.isFinite(x)||Math.abs(x)>=1)throw new Error('Synthesized PCM clips or is nonfinite');out.writeInt16LE(Math.round(x*32767),44+i*4+c*2);}return out;
};
export const decodeLoopWav=(b:Buffer)=>{
  if(b.length<44||b.toString('ascii',0,4)!=='RIFF'||b.toString('ascii',8,12)!=='WAVE'||b.readUInt32LE(4)+8!==b.length)throw new Error('Invalid or incomplete music WAV');
  let data=-1,bytes=0,valid=false;for(let o=12;o+8<=b.length;){const size=b.readUInt32LE(o+4);if(o+8+size>b.length)throw new Error('Incomplete PCM chunk');const kind=b.toString('ascii',o,o+4);
    if(kind==='fmt ')valid=size>=16&&b.readUInt16LE(o+8)===1&&b.readUInt16LE(o+10)===2&&b.readUInt32LE(o+12)===48000&&b.readUInt16LE(o+22)===16;
    if(kind==='data'){data=o+8;bytes=size;}o+=8+size+size%2;}
  if(!valid||data<0||!bytes||bytes%4)throw new Error('Music must be 48 kHz stereo 16-bit PCM');
  const left=new Float64Array(bytes/4),right=new Float64Array(bytes/4);for(let i=0;i<left.length;i++){left[i]=b.readInt16LE(data+i*4)/32768;right[i]=b.readInt16LE(data+i*4+2)/32768;}return {left,right,frames:left.length,durationSeconds:left.length/48000,sampleRate:48000,channels:2};
};
/** Pure CPU synthesis. Tails wrap into the next repetition; no silence seam or shortened bar. */
export const synthesizeMusic=(id:LocalAudioId,seed:string)=>{
  const recipe=RECIPES[id];if(!recipe||!seed.trim())throw new Error('Unknown local recipe or empty seed');
  const seconds=recipe.bpm?recipe.bars*4*60/recipe.bpm:48,frames=Math.round(seconds*48000),left=new Float64Array(frames),right=new Float64Array(frames),random=generator(seed+'|'+id);
  const add=(at:number,length:number,pan:number,sample:(t:number,i:number)=>number)=>{const start=Math.round(at*48000),n=Math.round(length*48000),l=Math.sqrt((1-pan)/2),r=Math.sqrt((1+pan)/2);for(let i=0;i<n;i++){const x=sample(i/48000,i),j=((start+i)%frames+frames)%frames;left[j]+=x*l;right[j]+=x*r;}};
  if(recipe.kind==='music'){
    const beat=60/recipe.bpm!,bar=beat*4,chords=[[48,55,59,64],[45,52,55,60],[41,48,52,57],[43,50,53,59]];
    const note=(at:number,midi:number,length:number,amp:number,pan:number,pad=false)=>{const hz=440*2**((midi-69)/12),phase=random()*Math.PI*2;
      add(at,length,pan,t=>{const attack=pad?.7:.012,release=pad?1.1:.18,envelope=Math.min(1,t/attack)*Math.min(1,(length-t)/release)*(pad?1:Math.exp(-t/(id==='warm-pluck-groove'?.4:.8)));
        return amp*envelope*(Math.sin(2*Math.PI*hz*t+phase)+.16*Math.sin(4*Math.PI*hz*t+phase)+.035*Math.sin(6*Math.PI*hz*t));});};
    for(let b=0;b<recipe.bars!;b++){
      const chord=chords[b%4],at=b*bar;
      if(id==='airy-pad-drift'){for(const [j,pitch] of chord.entries())note(at,pitch+12,bar+1.8,.075,(j-1.5)*.33,true);note(at,chord[0]-12,bar+.5,.055,0,true);
        if(b%2===0)note(at+2*beat,chord[2]+24,2*beat,.022,.35,true);
      }else{
        const strikes=id==='soft-lofi-keys'?[0,2.5]:[0,1.5,2.75];
        for(const [s,pos] of strikes.entries())for(const [j,pitch] of chord.entries())if(id==='soft-lofi-keys'||j===(b+s)%4||j===1)note(at+pos*beat+j*.009,pitch+(id==='warm-pluck-groove'?12:0),2.3,.075*(s?.62:1),(j-1.5)*.27);
        note(at,chord[0]-12,1.4,.10,0);if(b%2===1)note(at+2.5*beat,chord[0]-12,.9,.055,0);
        // Soft kick, brushed ticks: code-created tones/noise, no samples or speech.
        for(const pos of [0,2])add(at+pos*beat,.18,0,t=>.08*Math.sin(2*Math.PI*(48*t+30*.025*(1-Math.exp(-t/.025))))*Math.exp(-t/ .045)*Math.min(1,t/.003));
        for(const pos of [1,3]){let prev=0;add(at+pos*beat,.065,b%2?.2:-.2,t=>{const x=(random()*2-1),high=x-prev;prev=x;return .007*high*Math.exp(-t/.018)*Math.min(1,t/.003);});}
      }
    }
  }else{
    // Generate an extra second, crossfade it into the head, retain exactly 48s.
    // This is synthetic filtered noise, never a recording of a room or rain.
    const overlap=48000,a=new Float64Array(frames+overlap),c=new Float64Array(frames+overlap);let lo=0,mid=0,loR=0,midR=0;
    for(let i=0;i<a.length;i++){const n=random()*2-1,nr=random()*2-1;lo=.996*lo+.004*n;loR=.996*loR+.004*nr;mid=.73*mid+.27*n;midR=.73*midR+.27*nr;
      a[i]=id==='soft-room-tone'?lo*.8+mid*.045:(mid-lo)*.32;c[i]=id==='soft-room-tone'?loR*.8+midR*.045:(midR-loR)*.32;}
    for(let i=0;i<frames;i++){const tail=i>=frames-overlap,j=i-(frames-overlap),mix=tail?(j+1)/(overlap+1):0;
      left[i]=tail?a[i+overlap]*(1-mix)+a[j]*mix:a[i+overlap];right[i]=tail?c[i+overlap]*(1-mix)+c[j]*mix:c[i+overlap];}
  }
  // Put the seam within a sustained note rather than on a chord attack. Rotation
  // retains the exact whole-bar period; it does not shorten or stretch the loop.
  if(recipe.bpm){const shift=Math.round(.75*60/recipe.bpm*48000),a=left.slice(),b=right.slice();for(let i=0;i<frames;i++){left[i]=a[(i+shift)%frames];right[i]=b[(i+shift)%frames];}}
  // Gentle fixed master saturation, then one global peak scale. No TTS processing.
  let peak=0;for(let i=0;i<frames;i++){left[i]=Math.tanh(left[i]*1.6);right[i]=Math.tanh(right[i]*1.6);peak=Math.max(peak,Math.abs(left[i]),Math.abs(right[i]));}
  if(peak<=0)throw new Error('Empty synthesized track');const bytes=encodeWav(left,right,.72/peak);
  return {bytes,frames,durationSeconds:frames/48000,theoreticalSeconds:seconds,rawSha256:hash(bytes),identity:rawIdentity(id,seed)};
};
export const loopMetrics=(wav:Buffer)=>{
  const {left,right,frames}=decodeLoopWav(wav),n=960;let jump=0,derivative=0,nearDerivative=0,before=0,after=0;
  for(const x of [left,right]){jump=Math.max(jump,Math.abs(x[0]-x[frames-1]));derivative=Math.max(derivative,Math.abs((x[1]-x[0])-(x[frames-1]-x[frames-2])));
    for(let i=1;i<n;i++){if(i>8)nearDerivative=Math.max(nearDerivative,Math.abs(x[i]-x[i-1]),Math.abs(x[frames-i]-x[frames-i-1]));before+=x[frames-i]**2;after+=x[i]**2;}}
  return {wrapJump:jump,derivativeChange:derivative,nearbyMaxDerivative:nearDerivative,edgeEnergyDifferenceDb:10*Math.log10((after+1e-15)/(before+1e-15))};
};
export const assertLoopSeam=(m:ReturnType<typeof loopMetrics>)=>{if(m.wrapJump>Math.min(.15,Math.max(.015,m.nearbyMaxDerivative*1.25))||m.derivativeChange>Math.max(.01,m.nearbyMaxDerivative*3)||Math.abs(m.edgeEnergyDifferenceDb)>6)throw new Error(`Loop seam fails: ${JSON.stringify(m)}`);};
