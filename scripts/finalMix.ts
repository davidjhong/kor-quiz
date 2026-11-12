import {runRemotion} from './remotionCommand.ts';
import {measureAudio} from './audioMeter.ts';
import type {FinalMixSettings} from '../src/productionPresets.ts';
import {rename} from 'node:fs/promises';
export const assertFinalMix=(m:{integratedLUFS:number;truePeakDbTP:number},settings:FinalMixSettings)=>{
  if(!Number.isFinite(m.integratedLUFS)||!Number.isFinite(m.truePeakDbTP)
    ||Math.abs(m.integratedLUFS-settings.integratedLUFS)>settings.integratedToleranceLU
    ||m.truePeakDbTP>settings.truePeakDbTP+settings.truePeakMeterToleranceDb)
    throw new Error(`Encoded final mix fails ${settings.version}: I=${m.integratedLUFS} LUFS, TP=${m.truePeakDbTP} dBTP; target ${settings.integratedLUFS} ±${settings.integratedToleranceLU} LU, ceiling ${settings.truePeakDbTP} +${settings.truePeakMeterToleranceDb} dB meter tolerance. Previous output preserved.`);
};
export const normalizeFinalMix=async(input:string,output:string,duration:number,settings?:FinalMixSettings)=>{
  const target=settings??{version:'legacy-final-mix-v1',integratedLUFS:-16,truePeakDbTP:-2,loudnessRangeLU:11,integratedToleranceLU:0.5,truePeakMeterToleranceDb:0};
  // Leave documented AAC encoder headroom while enforcing the named final ceiling.
  const processingTarget={...target,truePeakDbTP:target.truePeakDbTP-(settings?.encoderHeadroomDb??0)};
  const before=await measureAudio(input,processingTarget),m=before.raw;
  const filter=`loudnorm=I=${processingTarget.integratedLUFS}:TP=${processingTarget.truePeakDbTP}:LRA=${processingTarget.loudnessRangeLU}:measured_I=${m.input_i}:measured_TP=${m.input_tp}:measured_LRA=${m.input_lra}:measured_thresh=${m.input_thresh}:offset=${m.target_offset}:linear=true`;
  const encode=(file:string,gain=0)=>runRemotion(['ffmpeg','-v','error','-xerror','-i',input,'-map','0:v:0?','-map','0:a:0','-c:v','copy',
    '-af',filter+(gain?`,volume=${gain}dB`:''),'-c:a','aac','-b:a','192k','-ar','48000','-t',String(duration),file],true,120000);
  await encode(output);let after=await measureAudio(output,target),calibrationGainDb=0;
  const initialEncodedMeasurement=after;
  // One bounded local encoding calibration, from the original input (no lossy cascade).
  // Never relax acceptance: use only measured available peak room and remeasure AAC.
  if(settings&&after.integratedLUFS<target.integratedLUFS-target.integratedToleranceLU){
    const available=target.truePeakDbTP-after.truePeakDbTP-0.1;
    calibrationGainDb=Math.max(0,Math.min(1,target.integratedLUFS-after.integratedLUFS,available));
    if(calibrationGainDb>0&&Math.abs(after.integratedLUFS+calibrationGainDb-target.integratedLUFS)<=target.integratedToleranceLU){
      const adjusted=output+'.calibrated.mp4';await encode(adjusted,calibrationGainDb);
      const measured=await measureAudio(adjusted,target);assertFinalMix(measured,settings);await rename(adjusted,output);after=measured;
    }
  }
  if(settings)assertFinalMix(after,settings);
  else if(after.truePeakDbTP>=0||Math.abs(after.integratedLUFS+16)>.5)throw new Error('Mixed output fails existing loudness/clipping thresholds; previous output preserved');
  return {before,after,settings:target,calibrationGainDb,initialEncodedMeasurement,encodedFinalMeasured:true};
};
