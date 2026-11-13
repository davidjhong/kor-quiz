import {readFile,writeFile} from 'node:fs/promises';
import {join,resolve} from 'node:path';
import {getNarratedTimeline} from '../src/narrationTiming.ts';
import {runtimeQuiz} from '../src/production.ts';
import {resolveProductionPreset} from '../src/productionPresets.ts';
import {getMusicGain} from '../src/presentation.ts';
import {decodeLoopWav} from './localMusicSynthesis.ts';
import {getVarietyMotion,resolveMotionConfig,declaredMotionSafe,coverBounds,MOTION_IDS} from '../src/variety.ts';
import {runRemotion} from './remotionCommand.ts';
const root=resolve('.'),folder=join(root,'out/checkpoint-c'),json=async f=>JSON.parse(await readFile(f,'utf8'));
const report=await json(join(folder,'preview-verification.json')),p=await json(report.propsFile),preset=resolveProductionPreset(p.productionPreset),timeline=getNarratedTimeline(p.narration,runtimeQuiz(p.quiz),preset.timing),q=timeline.questions[2];
const bed=decodeLoopWav(await readFile(join(root,'public',p.music.file))),rms=energy=>20*Math.log10(Math.max(1e-12,Math.sqrt(energy)));
const musicPower=(start,end)=>{let sum=0;const gain=p.presentation.musicGain*10**((p.music.mixTrimDb??0)/20);for(let f=start;f<end;f++){
  const volume=getMusicGain(f,timeline.durationInFrames,timeline.audio,timeline.questions,gain,preset.music);
  for(let s=0;s<1600;s++){const i=(f*1600+s)%bed.frames;sum+=(bed.left[i]**2+bed.right[i]**2)*.5*volume**2;}}
  return rms(sum/((end-start)*1600));};
const balances=[];
for(const a of timeline.audio.filter(a=>a.contentId===q.id)){
  const bytes=await readFile(join(root,'public',a.file));let data,size,rate;
  for(let o=12;o+8<=bytes.length;){const n=bytes.readUInt32LE(o+4),kind=bytes.toString('ascii',o,o+4);if(kind==='fmt ')rate=bytes.readUInt32LE(o+12);if(kind==='data'){data=o+8;size=n;}o+=8+n+n%2;}
  if(!data||rate!==24000)throw Error('Expected existing mono 24kHz cache');let energy=0;for(let o=data;o<data+size;o+=2)energy+=(bytes.readInt16LE(o)/32768)**2;
  const voiceDbFS=rms(energy/((a.end-a.start)/30*24000)),musicDbFS=musicPower(a.start,a.end);
  balances.push({role:a.role,startSeconds:(a.start-q.sequenceStart)/30,endSeconds:(a.end-q.sequenceStart)/30,narrationDbFS:voiceDbFS,musicDbFS,musicMinusNarrationDb:musicDbFS-voiceDbFS});
}
balances.push({role:'countdown',startSeconds:(q.countdownStart-q.sequenceStart)/30,endSeconds:(q.revealStart-q.sequenceStart)/30,musicDbFS:musicPower(q.countdownStart,q.revealStart)});
const files=[['cafe','backgrounds/korean-cafe-illustrated-v1.png',1.12],['transit','backgrounds/korean-transit-illustrated-dev-v1.png',1.02],['hotel','backgrounds/korean-hotel-illustrated-v1.png',1.02],['restaurant',p.background.file,1.02]],art=[];
for(const [id,file,framing] of files){const b=await readFile(join(root,'public',file)),width=b.readUInt32BE(16),height=b.readUInt32BE(20),motionConfig=resolveMotionConfig(width,height,framing);
  if(!declaredMotionSafe(width,height,framing,motionConfig))throw Error('Unsafe declared motion');const v={version:'visual-variety-v2',palette:'cream-navy',motion:'slow-push',width,height,motionConfig};
  art.push({id,file,width,height,framing,motionConfig,extrema:[0,1575,3149].map(frame=>({frame,seconds:frame/30,motion:getVarietyMotion(v,frame,3150)}))});}
const streams=JSON.parse(await runRemotion(['ffprobe','-v','error','-show_entries','stream=codec_type,codec_name,width,height,pix_fmt,avg_frame_rate,duration,channels,sample_rate,nb_frames','-of','json',report.output],true,30000));
Object.assign(report,{sourceBalanceReference:{method:'Known prepared voice PCM RMS and exact shared frame-gain music PCM reference over the same measured speech intervals, before final normalization; no source reconstruction. Browser resampling/first AAC can differ slightly.',intervals:balances},mediaStreams:streams.streams,
  narrationOverlap:false,countdownSpeech:false,inspectionArtwork:art,listeningPerformed:false});
await writeFile(join(folder,'preview-verification.json'),JSON.stringify(report,null,2));await writeFile(join(folder,'motion-inspection.json'),JSON.stringify(art,null,2));console.log(JSON.stringify({balances,streams:streams.streams},null,2));
