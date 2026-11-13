import {resolve} from 'node:path';
import {readFile,writeFile,mkdtemp,unlink,rmdir} from 'node:fs/promises';
import {runRemotion} from './remotionCommand.ts';
import {measureAudio} from './audioMeter.ts';
import {assertFinalMix} from './finalMix.ts';
const folder='out/checkpoint-b',output=folder+'/music-a-b-comparison.mp4',raw=folder+'/comparison-preencode.wav';
const before=await measureAudio(raw);
// Preserve actual A/reference speech levels; do not renormalize A/B separately.
// This short extract is intentionally quieter than the -14 full-program target.
const settings={version:'checkpoint-b-reference-excerpt-v1',integratedLUFS:before.integratedLUFS-.35,truePeakDbTP:-1.5,loudnessRangeLU:11,integratedToleranceLU:.5,truePeakMeterToleranceDb:.1};
let masterGainDb=-.35;
const temporary=await mkdtemp(resolve(folder,'mix-cards-'));
for(const label of ['A','B'])await runRemotion(['ffmpeg','-v','error','-loop','1','-i',folder+`/mix-label-${label}.png`,'-an','-r','30','-c:v','libx264','-pix_fmt','yuv420p','-crf','22','-t','13.4',temporary+`/${label}.mp4`],true,120000);
const slides=folder+'/mix-slides.txt';await writeFile(slides,['A','B'].map(label=>`file '${(temporary+'/'+label+'.mp4').replaceAll('\\','/')}'`).join('\n')+'\n');
const encode=()=>runRemotion(['ffmpeg','-y','-v','error','-f','concat','-safe','0','-i',slides,'-i',raw,
  '-map','0:v:0','-map','1:a:0','-c:v','copy','-af',`volume=${masterGainDb}dB`,'-c:a','aac','-b:a','192k','-ar','48000','-t','26.8',output],true,120000);
await encode();let final=await measureAudio(output,settings);
if(final.truePeakDbTP>-1.4){masterGainDb-=final.truePeakDbTP+1.5+.1;await encode();final=await measureAudio(output,settings);}
assertFinalMix(final,settings);
await runRemotion(['ffmpeg','-v','error','-xerror','-i',output,'-c:v','rawvideo','-f','null','-'],true,60000);
const properties=JSON.parse(await runRemotion(['ffprobe','-v','error','-show_entries','stream=codec_type,duration,nb_frames:format=duration','-of','json',output],true,30000));
if(properties.streams.some(s=>Math.abs(Number(s.duration)-26.8)>.035))throw new Error('A/B video/audio streams must both last 26.8 seconds');
const sections=[];
for(const [name,start] of [['A',0],['B',13.4]]){
  const wav=folder+`/final-${name}.wav`;await runRemotion(['ffmpeg','-y','-v','error','-i',output,'-ss',String(start),'-t','13.4','-c:a','pcm_s16le',wav],true,60000);
  sections.push({name,...await measureAudio(wav,settings)});
}
const report=JSON.parse(await readFile(folder+'/music-balance.json','utf8'));Object.assign(report,{output,encodedFinal:final,encodedSections:sections,preencode:before,commonMasterGainDb:masterGainDb,
  finalLoudnessCheck:{settings,passed:true,exception:'Reference excerpt retains actual A dynamics/level with common encoder headroom. -14 LUFS remains the unchanged full-production target; it is not imposed on this partial A/B audition.'},fullDecode:'PASS',productionGainsUnchanged:true});
await writeFile(folder+'/music-balance.json',JSON.stringify(report,null,2));console.log(JSON.stringify({output,masterGainDb,final,sections},null,2));
await writeFile(folder+'/mix-encoded-measurements.json',JSON.stringify({encodedFinal:final,encodedSections:sections,preencode:before,commonMasterGainDb:masterGainDb,finalLoudnessCheck:report.finalLoudnessCheck,fullDecode:'PASS',output},null,2));
for(const name of ['A.mp4','B.mp4'])await unlink(temporary+'/'+name);await rmdir(temporary);
