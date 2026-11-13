import {decodeLoopWav} from './localMusicSynthesis.ts';
/** Modest Welch energy diagnostic. It cannot establish perceived phone quality. */
export const musicSpectrum=(bytes:Buffer)=>{
  const {left,right,frames}=decodeLoopWav(bytes),n=2048,bins=new Float64Array(n/2),windows=Math.min(96,Math.floor(frames/n));
  for(let w=0;w<windows;w++){
    const at=Math.floor(w*(frames-n)/Math.max(1,windows-1)),re=new Float64Array(n),im=new Float64Array(n);
    for(let i=0;i<n;i++)re[i]=(left[at+i]+right[at+i])*.5*(.5-.5*Math.cos(2*Math.PI*i/(n-1)));
    for(let i=1,j=0;i<n;i++){let bit=n>>1;for(;j&bit;bit>>=1)j^=bit;j^=bit;if(i<j)[re[i],re[j]]=[re[j],re[i]];}
    for(let size=2;size<=n;size*=2)for(let start=0;start<n;start+=size)for(let j=0;j<size/2;j++){
      const angle=-2*Math.PI*j/size,c=Math.cos(angle),s=Math.sin(angle),a=start+j,b=a+size/2,x=re[b]*c-im[b]*s,y=re[b]*s+im[b]*c;
      re[b]=re[a]-x;im[b]=im[a]-y;re[a]+=x;im[a]+=y;
    }
    for(let k=0;k<n/2;k++)bins[k]+=re[k]**2+im[k]**2;
  }
  let total=0,low=0,phone=0;for(let k=1;k<bins.length;k++){const f=k*48000/n;total+=bins[k];if(f<200)low+=bins[k];if(f>=200&&f<4000)phone+=bins[k];}
  return {method:'96-window Hann Welch, 2048 points, stereo mid',below200HzFraction:low/total,between200And4000HzFraction:phone/total,
    lowPhoneBandFlag:phone/total<.05,limitation:'Energy heuristic only; no listening, speaker response, masking or quality assessment.'};
};
