import {mkdir,mkdtemp,writeFile,rm} from 'node:fs/promises';
import {dirname,join} from 'node:path';
import {runRemotion} from './remotionCommand.ts';
import {atomicJson} from './draftWorkflow.ts';
import {checkOutput,promoteOutput} from './output.ts';
import {normalizeFinalMix} from './finalMix.ts';
import type {FinalMixSettings} from '../src/productionPresets.ts';
import {inspectNarratedVideo} from './mediaInspection.ts';
import {requireWithin} from './narrationFiles.ts';
/** Same existing encoder/mix/inspection settings; destination-local atomic promotion. */
export const renderLocalVideo=async(options:{root:string;composition:string;props:unknown;output:string;overwrite:boolean;frames:number;speechEnd:number;minimumDurationSeconds?:number;
  finalMix?:FinalMixSettings;beforePromote?:(file:string,result:unknown)=>Promise<void>})=>{
  const {root,output,overwrite}=options;await mkdir(dirname(output),{recursive:true});await checkOutput(output,overwrite);
  const temporary=await mkdtemp(join(dirname(output),'.production-render-'));
  try{
    const props=join(temporary,'props.json'),env=join(temporary,'empty.env'),video=join(temporary,'video.mp4');
    await atomicJson(props,options.props);await writeFile(env,'');
    await runRemotion(['render',join(root,'src/index.ts'),options.composition,video,`--props=${props}`,`--env-file=${env}`,
      '--codec=h264','--pixel-format=yuv420p','--color-space=bt709','--crf=18','--concurrency=2','--audio-codec=aac','--audio-bitrate=192k']);
    const normalized=join(temporary,'normalized.mp4');
    const {before,after,settings,calibrationGainDb,initialEncodedMeasurement}=await normalizeFinalMix(video,normalized,options.frames/30,options.finalMix);
    const metadata=await inspectNarratedVideo(normalized,options.frames,options.speechEnd,options.minimumDurationSeconds);
    await runRemotion(['ffmpeg','-v','error','-xerror','-i',normalized,'-c:v','rawvideo','-f','null','-'],true,120000);
    const result={metadata,fullDecode:'PASS',rawMixedAudio:before,finalMixedAudio:after,finalMixSettings:settings,
      finalMixProcessing:{calibrationGainDb,initialEncodedMeasurement},zeroProviderCallsDuringRender:true};
    await atomicJson(join(temporary,'verified.json'),result);await options.beforePromote?.(normalized,result);await promoteOutput(normalized,output,overwrite);
    return result;
  }finally{requireWithin(dirname(output),temporary);await rm(temporary,{recursive:true,force:true});}
};
