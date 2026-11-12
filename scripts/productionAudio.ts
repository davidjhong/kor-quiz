import {mkdir,readFile,copyFile,access,rename,writeFile} from 'node:fs/promises';
import {constants} from 'node:fs';
import {dirname,join} from 'node:path';
import type {NarrationScript,PreparedNarration} from '../src/narration.ts';
import {preparedNarrationSchema,preparedQuestionExcerptSchema} from '../src/narration.ts';
import type {QuizInput} from '../src/quizSchema.ts';
import {prepareClip,audioCacheKey,getClipCacheLocation,sha256,validateAudioFile,AUDIO_PROCESSING,quizSpeechFingerprint,requireWithin} from './narrationFiles.ts';
import {synthesizeGoogle,UncertainSynthesisError} from './googleTts.ts';
import {PRODUCTION_PRICING,recordTtsRequest,saveBudgetSync,settleAllocation,type ProductionBudget} from './productionBudget.ts';
import type {ClipInspection} from './productionPlan.ts';
import {checkCancellation} from './cancellation.ts';
type Handle={file:string;budget:ProductionBudget;key:string};
export const recoverTtsArtifacts=async(handle:Handle,root:string,checkAudio=validateAudioFile)=>{
  const allocation=handle.budget.allocations[handle.key];if(!allocation)return;
  for(const request of allocation.requests){
    if(request.state==='terminal')throw new Error('A prior production TTS request was terminal; inspect its provider error before continuing');
    if(request.state==='received'||request.state==='reserved'||request.state==='uncertain'){
      const raw=request.rawFile&&await access(request.rawFile).then(()=>true,()=>false);
      if(!raw){
        if(request.state!=='received')throw new Error('Interrupted TTS request has no saved response. Billing reservation retained; no blind retry');
        const location=getClipCacheLocation(root,request.key);
        if(!await access(join(location.directory,'clip.json')).then(()=>true,()=>false))throw new Error('Saved TTS response and prepared cache are missing; restore the response/archive before resuming. No replacement request made');
        continue;
      }
      requireWithin(join(root,'data/production-jobs'),request.rawFile!);
      const bytes=await readFile(request.rawFile!);if(request.sha256&&sha256(bytes)!==request.sha256)throw new Error('Saved production TTS response checksum changed');
      await checkAudio(request.rawFile!);
      const location=getClipCacheLocation(root,request.key),original=join(location.directory,'original.bin');
      if(!await access(join(location.directory,'clip.json')).then(()=>true,()=>false)){
        await mkdir(location.directory,{recursive:true});
        if(!await access(original).then(()=>true,()=>false))await copyFile(request.rawFile!,original,constants.COPYFILE_EXCL);
      }
      request.sha256=sha256(bytes);request.state='received';saveBudgetSync(handle.file,handle.budget);
    }
  }
};
export const prepareProductionAudio=async(options:{script:NarrationScript;quiz:QuizInput;inventory:ClipInspection[];root:string;folder:string;
  budget?:Handle;generator?:typeof synthesizeGoogle;questionExcerpt?:boolean})=>{
  const {script,root,budget}=options;
  const usage={cacheHits:0,recoveredOriginals:0,localPrepared:0,newSynthesisRequests:0,newSynthesisCharacters:0};
  if(budget)await recoverTtsArtifacts(budget,root);
  const clips=[];
  for(const segment of script.segments){
    checkCancellation();
    const cached=options.inventory.find(c=>c.id===segment.id);
    if(cached?.status==='verified'&&cached.clip){clips.push(cached.clip);usage.cacheHits++;continue;}
    const generator:typeof synthesizeGoogle=async(s,profile,configuration)=>{
      if(!budget)throw new Error('Uncached speech requires a shared production budget before synthesis');
      const key=audioCacheKey(s,profile),raw=join(options.folder,'tts-responses',key+'.wav');await mkdir(dirname(raw),{recursive:true});
      try{
        const bytes=await (options.generator??synthesizeGoogle)(s,profile,{...configuration,onRequest:()=>{
          const request=recordTtsRequest(budget.budget,budget.key,key,Math.ceil([...s.text].length*PRODUCTION_PRICING.chirpUSDPerCharacter*1e9));
          request.rawFile=raw;saveBudgetSync(budget.file,budget.budget);configuration.onRequest?.();
        }});
        const temporary=raw+'.tmp';await writeFile(temporary,bytes);await rename(temporary,raw);
        for(const r of budget.budget.allocations[budget.key].requests.filter(r=>r.key===key&&r.state==='reserved')){r.state='received';r.sha256=sha256(bytes);r.rawFile=raw;}
        saveBudgetSync(budget.file,budget.budget);return bytes;
      }catch(e){
        for(const r of budget.budget.allocations[budget.key].requests.filter(r=>r.key===key&&r.state==='reserved'))r.state=e instanceof UncertainSynthesisError?'uncertain':'terminal';
        saveBudgetSync(budget.file,budget.budget);throw e;
      }
    };
    clips.push(await prepareClip(segment,script.profile,{root,synthesize:!!budget,generator,onEvent:(kind,s)=>{
      if(kind==='cache-hit')usage.cacheHits++;if(kind==='recovered-original')usage.recoveredOriginals++;if(kind==='local-prepared')usage.localPrepared++;
      if(kind==='synthesis-request'){usage.newSynthesisRequests++;usage.newSynthesisCharacters+=[...s.text].length;}
    }}));
  }
  if(budget){const a=budget.budget.allocations[budget.key];if(a.requests.some(r=>r.state!=='received'))throw new Error('Unresolved TTS outcome; reservation retained');
    settleAllocation(budget.budget,budget.key,a.requests.reduce((n,r)=>n+r.units,0),{...usage,estimated:true});saveBudgetSync(budget.file,budget.budget);}
  const narration:PreparedNarration=(options.questionExcerpt?preparedQuestionExcerptSchema:preparedNarrationSchema).parse({version:1,profile:script.profile,processing:AUDIO_PROCESSING,quizFingerprint:quizSpeechFingerprint(options.quiz),clips});
  return {narration,usage};
};
