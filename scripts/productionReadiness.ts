import {access,readdir} from 'node:fs/promises';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import {spawn} from 'node:child_process';
import {createReadStream} from 'node:fs';
import {ALIGNMENT_CONFIG} from '../src/phraseCaptions.ts';
import {runRemotion} from './remotionCommand.ts';
import {checkCancellation,ownWorker} from './cancellation.ts';
import {generationCostBound} from './generationModels.ts';
import {assertProductionPricing} from './productionBudget.ts';
import {IMAGE_PROFILES} from './backgroundImages.ts';
import type {planProduction} from './productionPlan.ts';
export type Readiness={ready:boolean;blockers:string[];checks:Record<string,string>;providerCalls:0};
const localCommand=(file:string,args:string[])=>new Promise<string>((ok,fail)=>{
  checkCancellation();const child=spawn(file,args,{windowsHide:true,shell:false,stdio:['ignore','pipe','pipe']});ownWorker(child);
  let output='';child.stdout.on('data',b=>{output=(output+b).slice(-32768);});child.stderr.on('data',()=>{});
  const timer=setTimeout(()=>child.kill(),30000);child.once('error',e=>{clearTimeout(timer);fail(e);});
  child.once('close',c=>{clearTimeout(timer);c===0?ok(output.trim()):fail(new Error(`Local dependency process failed (${c}); check the installed environment, no provider request made`));});
});
const browserFile=async(root:string)=>{
  const base=join(root,'node_modules/.remotion/chrome-headless-shell');
  const find=async(p:string,depth:number):Promise<string|undefined>=>{if(!depth)return;for(const e of await readdir(p,{withFileTypes:true})){const f=join(p,e.name);if(e.isFile()&&['chrome-headless-shell','chrome-headless-shell.exe'].includes(e.name))return f;
    if(e.isDirectory()){const child=await find(f,depth-1);if(child)return child;}}};
  return find(base,4);
};
let localCache:{root:string;promise:Promise<Readiness>}|undefined;
export const inspectLocalReadiness=(root:string):Promise<Readiness>=>{
  if(localCache?.root===root)return localCache.promise;
  const promise=(async()=>{const checks:Record<string,string>={},blockers:string[]=[];
    const check=async(name:string,fn:()=>Promise<string>)=>{try{checks[name]=await fn();}catch(e){checks[name]='FAIL';blockers.push(`${name}: ${e instanceof Error?e.message:'unavailable'}`);}};
    await check('alignment',async()=>{
      if(process.platform!=='win32')throw new Error('Native alignment is verified on Windows only; Scripts/python.exe and pinned +cpu builds are required. Do not spend before preparing a supported local environment.');
      const python=join(root,'.audio-cache/alignment-venv/Scripts/python.exe');await access(python);
      const raw=await localCommand(python,['-c',"import importlib.metadata,json; import torch,torchaudio,stable_whisper; print(json.dumps({p:importlib.metadata.version(p) for p in ['torch','torchaudio','stable-ts','openai-whisper']}))"]);
      const v=JSON.parse(raw);for(const [pkg,version]of Object.entries({'torch':ALIGNMENT_CONFIG.torchVersion,'torchaudio':ALIGNMENT_CONFIG.torchVersion,'stable-ts':ALIGNMENT_CONFIG.engineVersion,'openai-whisper':ALIGNMENT_CONFIG.whisperVersion}))if(v[pkg]!==version)throw new Error(`${pkg}: installed ${v[pkg]}, required ${version}`);
      const model=join(root,'.audio-cache/whisper',ALIGNMENT_CONFIG.model+'.pt'),hash=createHash('sha256');for await(const b of createReadStream(model))hash.update(b);
      if(hash.digest('hex')!==ALIGNMENT_CONFIG.modelSha256)throw new Error('Cached alignment model checksum differs; restore verified local model before spending');
      return 'PASS: executable, imports, pinned versions and cached model checksum';
    });
    await check('renderer',async()=>{await access(join(root,'node_modules/@remotion/cli/package.json'));const browser=await browserFile(root);if(!browser)throw new Error('Missing managed browser; run npm run browser:ensure locally before paid work');
      await localCommand(browser,['--version']);await runRemotion(['ffmpeg','-version'],true,15000);await runRemotion(['ffprobe','-version'],true,15000);return 'PASS: managed browser, FFmpeg and FFprobe';});
    return {ready:!blockers.length,blockers,checks,providerCalls:0 as const};})();
  localCache={root,promise};return promise;
};
export const inspectProductionReadiness=async(root:string,plan:Awaited<ReturnType<typeof planProduction>>,model:string,now=new Date())=>{
  const result=await inspectLocalReadiness(root),blockers=[...result.blockers],checks={...result.checks};
  const verify=(name:string,fn:()=>void)=>{try{fn();checks[name]='PASS';}catch(e){checks[name]='FAIL';blockers.push((e as Error).message);}};
  if(plan.stages.image.maximumRequests){const id=plan.image!.binding.request!.model,p=IMAGE_PROFILES[id];verify('imagePricing',()=>{if(now.toISOString().slice(0,10)>=p.verifyAgainBy)throw new Error(`OpenAI Images ${id}: pricing expired; https://developers.openai.com/api/docs/models/${id}; scripts/backgroundImages.ts IMAGE_PROFILES[${id}].verifyAgainBy=${p.verifyAgainBy}`);});}
  if(plan.stages.generation.maximumRequests||plan.stages.review.maximumRequests)verify('textPricing',()=>{generationCostBound(12000,model,now);});
  if(plan.stages.tts.maximumRequests)verify('ttsPricing',()=>assertProductionPricing(now));
  return {...result,blockers,checks,ready:!blockers.length};
};
