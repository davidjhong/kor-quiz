import {readFile,stat} from 'node:fs/promises';
import {join} from 'node:path';
import {atomicJson} from './draftWorkflow.ts';
import {sha256,canonical,readJsonFile} from './narrationFiles.ts';
import type {ProduceConfig} from './productionPlan.ts';
import {checkCancellation} from './cancellation.ts';
export type Stage={status:'planned'|'running'|'complete'|'failed'|'invalidated';inputHash:string;outputs:{path:string;sha256:string}[];details?:unknown;error?:string};
export type ProductionJob={version:1;jobId:string;config:ProduceConfig;sourceIdentity?:string;workDirectory?:string;
  contentHash?:string;narration?:unknown;configuration?:unknown;assets?:unknown;state:string;
  stages:Record<string,Stage>;history:unknown[];revisions:{hash:string;directory:string;sourceIdentity:string}[];
  paidOptIn:boolean;maxCostUSD?:number;budget?:unknown;lastPlanHash?:string;lastRenderHash?:string;renderCertificate?:string;replacementRenderHash?:string;createdAt:string;updatedAt:string};
export const fileHash=async(path:string)=>sha256(await readFile(path));
export const stageReusable=async(stage:Stage|undefined,inputHash:string)=>{
  if(!stage||stage.status!=='complete'||stage.inputHash!==inputHash)return false;
  for(const output of stage.outputs){if(await fileHash(output.path).catch(()=>null)!==output.sha256)return false;}
  return true;
};
export const startStage=(job:ProductionJob,name:string,inputHash:string)=>{
  checkCancellation();
  if(job.stages[name])job.history.push({stage:name,previous:job.stages[name],invalidatedAt:new Date().toISOString()});
  job.stages[name]={status:'running',inputHash,outputs:[]};job.state=name;
};
export const completeStage=async(job:ProductionJob,name:string,paths:string[],details?:unknown)=>{
  job.stages[name]={...job.stages[name],status:'complete',outputs:await Promise.all(paths.map(async path=>({path,sha256:await fileHash(path)}))),details};
};
export const saveJob=async(folder:string,job:ProductionJob)=>{job.updatedAt=new Date().toISOString();await atomicJson(join(folder,'job.json'),job);};
export const readJob=async(file:string)=>{
  const j=await readJsonFile(file) as ProductionJob;
  if(j.version!==1||!j.jobId||!j.config||!j.stages||!Array.isArray(j.revisions))throw new Error('Invalid production job manifest');return j;
};
export const planFingerprint=(p:{hashes:unknown;inventory:unknown})=>sha256(canonical(p));
export const codeFingerprint=async(root:string)=>sha256(canonical(await Promise.all([
  'src/musicLibrary.ts','src/Palette.tsx','src/variety.ts','src/ProductionVideo.tsx','src/production.ts','src/BookendDisplays.tsx','src/displayBookends.ts','src/IllustratedFrame.tsx',
  'src/IllustratedQuestionScene.tsx','src/CountdownRow.tsx','src/FittedText.tsx','src/PhraseCaption.tsx','src/phraseCaptions.ts','src/presentation.ts',
  'src/narrationTiming.ts','src/productionPresets.ts','src/alignmentValidation.ts','src/BackgroundAudio.tsx','src/illustratedTheme.ts','scripts/renderLocalVideo.ts','scripts/finalMix.ts','scripts/audioMeter.ts','scripts/productionCaptions.ts',
].map(async file=>({file,sha256:await fileHash(join(root,file))})))));
export const outputExists=(file:string)=>stat(file).then(s=>s.isFile(),()=>false);
