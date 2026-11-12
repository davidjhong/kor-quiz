import {join,resolve,extname} from 'node:path';
import {readFile} from 'node:fs/promises';
import {loadEnvFile} from 'node:process';
import {z} from 'zod';
import {questionExcerptInputSchema,questionExcerptPropsSchema,getQuestionExcerptTimeline} from '../src/questionExcerptModel.ts';
import {getChoiceHangul,parseQuizInput} from '../src/quizSchema.ts';
import {narrationScriptSchema} from '../src/narration.ts';
import {backgroundOptionsSchema,backgroundBindingSchema,planBackground,prepareBackground,type ImageClient} from './backgroundImages.ts';
import {catalogAsset,inspectBackgroundPNG,writePrivateJson,recordCompletedBackgroundUse} from './backgroundCatalog.ts';
import {productionSettings,inspectProductionClip,type ProduceConfig} from './productionPlan.ts';
import {acquireJobLock,loadJobBudget,chargedUnits,allocateBudget,saveBudget,assertProductionPricing,PRODUCTION_PRICING} from './productionBudget.ts';
import {prepareProductionAudio} from './productionAudio.ts';
import {prepareLocalAlignments} from './localAlignment.ts';
import {productionPhrases,GROUPING_CONFIG} from './productionCaptions.ts';
import {generationCostBound,QUALITY_DRAFT_MODEL} from './generationModels.ts';
import {reviewQuestionPreview} from './previewReview.ts';
import {canonical,sha256,readJsonFile,requireWithin} from './narrationFiles.ts';
import {renderLocalVideo} from './renderLocalVideo.ts';
import {inspectNarratedVideo} from './mediaInspection.ts';
import {fileHash,codeFingerprint} from './productionJobs.ts';
import {promoteOutput,checkOutput} from './output.ts';
import {PROJECT_ROOT} from './remotionCommand.ts';
import type {ProduceOptions} from './productionPipeline.ts';
import type {GenerationClient} from './openaiGeneration.ts';
const jobSchema=z.object({version:z.literal(1),kind:z.literal('question-preview'),jobId:z.string(),state:z.string(),
  source:z.object({file:z.string(),sha256:z.string(),input:questionExcerptInputSchema}),output:z.string(),backgroundOptions:backgroundOptionsSchema,
  binding:backgroundBindingSchema,voiceFile:z.string(),presentationFile:z.string(),noMusic:z.boolean(),model:z.string(),
  paidOptIn:z.boolean(),maxCostUSD:z.number().positive().optional(),certificate:z.string().optional(),createdAt:z.string()});
const optional=async(file:string)=>readJsonFile(file).catch((e:NodeJS.ErrnoException)=>{if(e.code==='ENOENT')return null;throw e;});
const loadEnv=()=>{try{loadEnvFile('.env');}catch(e){if((e as NodeJS.ErrnoException).code!=='ENOENT')throw e;}};
export const produceQuestionPreview=async(options:ProduceOptions&{previewQuestion?:string},deps:{root?:string;imageClient?:ImageClient;reviewClient?:GenerationClient}={})=>{
  const root=resolve(deps.root??PROJECT_ROOT),id=options.resume??options.jobId;
  if(!id||!/^[a-z0-9][a-z0-9-]{0,31}$/u.test(id))throw new Error('Question preview requires a safe --job-id (or --resume)');
  const folder=join(root,'data/production-jobs',id),jobFile=join(folder,'job.json');
  const release=await acquireJobLock(folder,options.recoverLock);let job:z.infer<typeof jobSchema>|undefined;
  try{
    const previous=await optional(jobFile);
    if(previous&&!options.resume)throw new Error(`Job exists; use --resume ${id}`);
    if(!previous&&options.resume)throw new Error('Unknown question-preview job');
    if(previous){job=jobSchema.parse(previous);if(options.previewQuestion||options.backgroundOptions||options.voiceFile||options.presentationFile||options.noMusic!==undefined)throw new Error('Preview resume retains immutable source, image binding, voice and presentation');}
    else{if(!options.previewQuestion||!options.output)throw new Error('Question preview requires --preview-question and --output');
      const file=resolve(root,options.previewQuestion);requireWithin(root,file);const bytes=await readFile(file),input=questionExcerptInputSchema.parse(JSON.parse(bytes.toString('utf8')));
      const bg=backgroundOptionsSchema.parse({character:'adult woman',...options.backgroundOptions}),output=resolve(root,options.output);requireWithin(root,output);
      if(extname(output).toLowerCase()!=='.mp4')throw new Error('Preview output must be an MP4');
      const plan=await planBackground(root,{scenario:input.scenario,scenarioType:input.scenarioType,backgroundAssetId:null},output,bg);
      job=jobSchema.parse({version:1,kind:'question-preview',jobId:id,state:'planned',source:{file,sha256:sha256(bytes),input},output,backgroundOptions:bg,binding:plan.binding,
        voiceFile:options.voiceFile??'content/voice-profiles/selected-default.json',presentationFile:options.presentationFile??'content/production/default.json',
        noMusic:!!options.noMusic,model:options.model??QUALITY_DRAFT_MODEL,paidOptIn:false,createdAt:new Date().toISOString()});
      await writePrivateJson(join(folder,'source.json'),job.source);
    }
    const persist=()=>writePrivateJson(jobFile,job);
    if(sha256(await readFile(job.source.file))!==job.source.sha256)throw new Error('Preview source changed; preserve this job and start an explicit new revision/job');
    if(options.output&&resolve(root,options.output)!==job.output)throw new Error('Resume keeps the original preview output');
    if(options.maxCostUSD!==undefined&&job.maxCostUSD!==undefined&&job.maxCostUSD!==options.maxCostUSD)throw new Error('Existing job cap cannot change');
    if(options.allowPaid&&!options.dryRun){if(!Number.isFinite(options.maxCostUSD??job.maxCostUSD)||(options.maxCostUSD??job.maxCostUSD)!<=0)throw new Error('--allow-paid requires the approved positive total cap');job.paidOptIn=true;job.maxCostUSD=options.maxCostUSD??job.maxCostUSD;}
    await persist();const input=job.source.input;
    const config:ProduceConfig={source:{kind:'brief',path:''},output:job.output,voiceFile:job.voiceFile,presentationFile:job.presentationFile,noMusic:job.noMusic,reviewMode:'automated',model:job.model,maxOutputTokens:12000};
    const settings=await productionSettings(config,root),q=input.question;
    const script=narrationScriptSchema.parse({version:1,profile:settings.voice,segments:[
      {id:q.id+'-question',contentId:q.id,role:'question',language:'en-US',text:q.spokenPrompt??q.prompt},
      {id:q.id+'-answer',contentId:q.id,role:'answer',language:'ko-KR',text:getChoiceHangul(q.choices[q.correctAnswerIndex])},
      {id:q.id+'-explanation',contentId:q.id,role:'explanation',language:'en-US',text:input.explanationNarration}]});
    let image=await planBackground(root,{...input,backgroundAssetId:null},job.output,job.backgroundOptions,job.binding);
    if(image.asset){const checked=await inspectBackgroundPNG(join(root,'public',image.asset.file),root);if(checked.sha256!==image.asset.sha256)throw new Error('Bound background checksum mismatch; restore its saved PNG');}
    const contentHash=sha256(canonical({input,background:job.binding.assetId,voice:settings.voice}));
    const reviewSaved=await optional(join(folder,'review/acceptance.json')) as {contentHash?:string}|null;
    const inventory=[];for(const segment of script.segments)inventory.push(await inspectProductionClip(segment,settings.voice,root));
    const bad=inventory.find(c=>['corrupt','uncertain'].includes(c.status));if(bad)throw new Error(bad.error);
    const missing=inventory.filter(c=>c.status==='missing'),characters=missing.reduce((n,c)=>n+c.characters,0);
    const {loadMusic}=await import('./comparisonWorkflow.ts');const music=await loadMusic(settings.presentation.backgroundAudio,root);
    const bound={image:image.conservativeBoundUSD,generation:0,review:reviewSaved?.contentHash===contentHash?0:generationCostBound(12000,job.model)/1e9,tts:characters*PRODUCTION_PRICING.chirpUSDPerCharacter*2};
    const total=Object.values(bound).reduce((n,x)=>n+x,0),plan={kind:'question-preview',jobId:id,contentHash,providerCalls:0,image,conditionalBoundsUSD:bound,
      conservativeTotalUSD:total,narration:script,cacheHits:inventory.filter(c=>c.status==='verified').length,missingTtsCharacters:characters,
      maximumNewRequests:{image:image.maximumRequests,generation:0,review:bound.review?1:0,tts:missing.length*2},productionUsageConsumed:0,blockers:[]};
    await writePrivateJson(join(folder,'plan.json'),plan);
    if(options.dryRun)return {dryRun:true,...plan};
    if(!job.certificate)await checkOutput(job.output,!!options.overwrite);
    const needsPaid=total>0;
    if(needsPaid&&(!job.paidOptIn||job.maxCostUSD===undefined))throw new Error('Scoped preview budget authorization required after the zero-call dry run');
    if(job.maxCostUSD!==undefined&&total>job.maxCostUSD)throw new Error('Conditional image/review/TTS bound exceeds the job cap; no request made');
    const budget=needsPaid||job.maxCostUSD!==undefined?await loadJobBudget(root,id,job.maxCostUSD,job.paidOptIn):undefined;
    let providerCalls=0;
    const authorize=()=>{if(!budget)throw new Error('Missing shared job budget');assertProductionPricing();loadEnv();return budget;};
    const pendingImage=budget&&Object.values(budget.budget.allocations).some(a=>a.stage==='image'&&a.state!=='settled');
    if(image.action==='generate'||pendingImage){job.state='image';await persist();const result=await prepareBackground({root,folder,binding:job.binding,budget:authorize(),client:deps.imageClient});providerCalls+=result.newImageRequests;
      image=await planBackground(root,{...input,backgroundAssetId:null},job.output,job.backgroundOptions,job.binding);await writePrivateJson(join(folder,'image-result.json'),result);}
    const background=await catalogAsset(job.binding.assetId,root);if(!background)throw new Error('Background was not registered');
    const actual=await inspectBackgroundPNG(join(root,'public',background.file),root);if(actual.sha256!==background.sha256)throw new Error('Background checksum mismatch; restore the saved image instead of synthesizing another');
    if(budget){job.state='review';await persist();providerCalls+=(await reviewQuestionPreview({folder,hash:contentHash,input,model:job.model,budget:bound.review?authorize():budget,client:deps.reviewClient})).calls;}
    else throw new Error('Missing validated preview acceptance/budget history');
    const quiz=parseQuizInput({videoId:id,backgroundAssetId:background.id,showRomanization:true,questions:[q]});
    const audioHash=sha256(canonical(script)),ttsKey='tts-'+audioHash.slice(0,24);
    if(missing.length){allocateBudget(budget.budget,ttsKey,'tts',audioHash,Math.ceil(bound.tts*1e9));await saveBudget(budget.file,budget.budget);authorize();}
    const prepared=await prepareProductionAudio({script,quiz,inventory,root,folder,questionExcerpt:true,
      budget:budget.budget.allocations[ttsKey]?{...budget,key:ttsKey}:undefined});
    providerCalls+=prepared.usage.newSynthesisRequests;
    await writePrivateJson(join(folder,'audio-preparation-latest.json'),prepared.usage);
    const initialUsage=await optional(join(folder,'audio-preparation-initial.json'));if(!initialUsage)await writePrivateJson(join(folder,'audio-preparation-initial.json'),prepared.usage);
    job.state='alignment';await persist();const alignments=await prepareLocalAlignments(prepared.narration.clips,root);
    const t=getQuestionExcerptTimeline(prepared.narration),phrases=await productionPhrases(prepared.narration.clips,t.audio,{[q.id]:t.question.revealStart},'',root);
    const props=questionExcerptPropsSchema.parse({input,background,narration:prepared.narration,presentation:settings.presentation,phraseCaptions:phrases,music});
    const code=await codeFingerprint(root),excerptCode=await Promise.all(['src/QuestionExcerpt.tsx','src/questionExcerptModel.ts'].map(f=>fileHash(join(root,f))));
    const renderHash=sha256(canonical({props,code,excerptCode,grouping:GROUPING_CONFIG})),propsFile=join(folder,'artifacts',renderHash+'.props.json');
    await writePrivateJson(propsFile,props);const certFile=job.certificate??join(folder,'artifacts',renderHash+'.verified.json');
    let certificate=await optional(certFile) as {renderHash:string;sha256:string;temporary:string;verification:unknown}|null;
    let reused=false,verification:unknown;
    if(certificate?.renderHash===renderHash){
      if(await fileHash(job.output).catch(()=>null)!==certificate.sha256&&await fileHash(certificate.temporary).catch(()=>null)===certificate.sha256)await promoteOutput(certificate.temporary,job.output,!!options.overwrite);
      if(await fileHash(job.output).catch(()=>null)===certificate.sha256){await inspectNarratedVideo(job.output,t.durationInFrames,t.speechEnd);reused=true;verification=certificate.verification;}
    }
    if(!reused){await checkOutput(job.output,!!options.overwrite);job.state='render';await persist();verification=await renderLocalVideo({root,composition:'QuestionExcerpt',props,output:job.output,
      overwrite:!!options.overwrite,frames:t.durationInFrames,speechEnd:t.speechEnd,beforePromote:async(file,result)=>{
        job!.certificate=join(folder,'artifacts',renderHash+'.verified.json');await writePrivateJson(job!.certificate,{renderHash,sha256:await fileHash(file),temporary:file,verification:result,propsFile});await persist();}});}
    await recordCompletedBackgroundUse(root,background.id,id,true);job.state='complete';await persist();
    const reportFile=job.output.slice(0,-4)+'.verification.json',previousReport=await optional(reportFile) as Record<string,unknown>|null;
    const report={...previousReport,kind:'question-preview',jobId:id,output:job.output,videoSha256:await fileHash(job.output),contentHash,background,propsFile,
      timeline:t,verification,reusedVerifiedRender:reused,providerCallsThisResume:providerCalls,audioPreparation:prepared.usage,alignment:alignments,
      cost:{estimatedUSD:chargedUnits(budget.budget)/1e9,capUSD:job.maxCostUSD,allocations:budget.budget.allocations,invoiceInspected:false},
      productionUsageConsumed:0,notChecked:['subjective pronunciation/expressiveness/mix by listening','actual phone readability'],completedAt:new Date().toISOString()};
    await writePrivateJson(reportFile,report);return {jobId:id,output:job.output,report:reportFile,reusedVerifiedRender:reused,providerCalls,
      image:background,cacheHits:prepared.usage.cacheHits,alignments,estimatedUSD:report.cost.estimatedUSD};
  }catch(e){if(job){job.state='failed';await writePrivateJson(jobFile,job);}throw e;}finally{await release();}
};
