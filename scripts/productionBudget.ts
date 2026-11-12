import {writeFileSync,renameSync} from 'node:fs';
import {join,resolve} from 'node:path';
import {z} from 'zod';
import {atomicJson} from './draftWorkflow.ts';
import {readJsonFile,requireWithin,sha256} from './narrationFiles.ts';
export const PRODUCTION_PRICING={checked:'2026-11-10',verifyAgainBy:'2026-11-17',
  chirpUSDPerCharacter:0.00003,googleSource:'https://cloud.google.com/text-to-speech/pricing',
  openaiSource:'https://developers.openai.com/api/docs/models/gpt-6-luna'} as const;
export const assertProductionPricing=(now=new Date())=>{
  if(now.toISOString().slice(0,10)>=PRODUCTION_PRICING.verifyAgainBy)throw new Error(`Google Cloud Chirp 3 HD production pricing verification expired: ${PRODUCTION_PRICING.googleSource}; scripts/productionBudget.ts PRODUCTION_PRICING.verifyAgainBy=${PRODUCTION_PRICING.verifyAgainBy}. Reverify before new TTS; do not just extend the date.`);
};
const requestSchema=z.object({key:z.string(),state:z.enum(['reserved','received','terminal','uncertain']),units:z.number().int(),rawFile:z.string().optional(),sha256:z.string().optional()});
const allocationSchema=z.object({stage:z.enum(['generation','review','tts','image']),inputHash:z.string(),allocatedUnits:z.number().int().nonnegative(),
  chargedUnits:z.number().int().nonnegative(),state:z.enum(['reserved','settled','uncertain']),childBudgetId:z.string(),childLedger:z.string().optional(),
  requests:z.array(requestSchema),usage:z.unknown().optional()});
export const productionBudgetSchema=z.object({version:z.literal(2),kind:z.literal('production-budget'),jobId:z.string(),capUnits:z.number().int().positive(),
  authorization:z.literal('Explicit --allow-paid and total --max-cost-usd for this production job'),allocations:z.record(z.string(),allocationSchema)});
export type ProductionBudget=z.infer<typeof productionBudgetSchema>;
export type ProductionReservation={file:string;key:string;childBudgetId:string};
export const chargedUnits=(b:ProductionBudget)=>Object.values(b.allocations).reduce((n,a)=>n+a.chargedUnits,0);
export const allocateBudget=(b:ProductionBudget,key:string,stage:'generation'|'review'|'tts'|'image',inputHash:string,units:number)=>{
  const prior=b.allocations[key];
  if(prior){if(prior.inputHash!==inputHash||prior.stage!==stage)throw new Error('Production reservation dependency changed');
    if(prior.state==='settled'){
      if(chargedUnits(b)-prior.chargedUnits+prior.allocatedUnits>b.capUnits)throw new Error('Total production budget cannot cover the resumed stage reservation');
      prior.state='reserved';prior.chargedUnits=prior.allocatedUnits;
    }return prior;}
  if(!Number.isInteger(units)||units<0||chargedUnits(b)+units>b.capUnits)throw new Error('Total production job budget exhausted before paid work; no request made');
  return b.allocations[key]={stage,inputHash,allocatedUnits:units,chargedUnits:units,state:'reserved',
    childBudgetId:`p6-${sha256(b.jobId+inputHash).slice(0,20)}-${stage}`,requests:[]};
};
export const assertProductionReservation=async(reference:ProductionReservation,root:string,budgetId:string,requiredUnits:number)=>{
  requireWithin(join(root,'data/generation-budgets'),resolve(reference.file));
  const b=productionBudgetSchema.parse(await readJsonFile(reference.file)),a=b.allocations[reference.key];
  if(!a||a.state!=='reserved'||a.childBudgetId!==budgetId||reference.childBudgetId!==budgetId||a.allocatedUnits<requiredUnits)
    throw new Error('Missing shared production-budget reservation; paid stage cannot run independently');
};
export const loadJobBudget=async(root:string,jobId:string,capUSD:number|undefined,allowPaid:boolean)=>{
  const file=join(root,'data/generation-budgets',`produce-${jobId}.json`);
  const saved=await readJsonFile(file).catch((e:NodeJS.ErrnoException)=>{if(e.code==='ENOENT')return null;throw e;});
  if(saved){const b=productionBudgetSchema.parse(saved);if(b.jobId!==jobId || (capUSD!==undefined&&b.capUnits!==Math.floor(capUSD*1e9)))throw new Error('Existing production total cap cannot be changed or reset');return {file,budget:b};}
  if(!allowPaid||!Number.isFinite(capUSD)||capUSD!<=0)throw new Error('Additional production authorization required: use --allow-paid and a scoped total --max-cost-usd after approval');
  const budget:ProductionBudget={version:2,kind:'production-budget',jobId,capUnits:Math.floor(capUSD!*1e9),
    authorization:'Explicit --allow-paid and total --max-cost-usd for this production job',allocations:{}};
  await atomicJson(file,budget);return {file,budget};
};
export const saveBudget=(file:string,b:ProductionBudget)=>atomicJson(file,b);
export const saveBudgetSync=(file:string,b:ProductionBudget)=>{const temporary=`${file}.${process.pid}.tmp`;writeFileSync(temporary,JSON.stringify(b,null,2));renameSync(temporary,file);};
export const recordTtsRequest=(b:ProductionBudget,key:string,cacheKey:string,units:number)=>{
  const a=b.allocations[key];if(!a||a.state!=='reserved')throw new Error('TTS requires an active shared reservation');
  if(a.requests.filter(r=>r.key===cacheKey).length>=2||a.requests.reduce((n,r)=>n+r.units,0)+units>a.allocatedUnits)
    throw new Error('Production TTS retry limit or shared allocation exhausted before request');
  const request:z.infer<typeof requestSchema>={key:cacheKey,state:'reserved',units};a.requests.push(request);return request;
};
export const settleAllocation=(b:ProductionBudget,key:string,units:number,usage?:unknown)=>{
  const a=b.allocations[key];if(!a||!Number.isInteger(units)||units<0||units>a.allocatedUnits)throw new Error('Untrustworthy stage accounting; reservation retained');
  a.state='settled';a.chargedUnits=units;a.usage=usage;
};
export {acquireJobLock} from './jobLocks.ts';
