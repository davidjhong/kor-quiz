import {access,mkdir,copyFile} from 'node:fs/promises';
import {join,resolve,dirname,extname} from 'node:path';
import {loadEnvFile} from 'node:process';
import {preparedNarrationSchema} from '../src/narration.ts';
import {productionPropsSchema} from '../src/production.ts';
import {getNarratedTimeline} from '../src/narrationTiming.ts';
import {ALIGNMENT_CONFIG} from '../src/phraseCaptions.ts';
import {readDraft,atomicJson,contentHash,importDraft} from './draftWorkflow.ts';
import {assertAutomatedAcceptance} from './automatedAcceptance.ts';
import {runAutomatedReview} from './automatedReview.ts';
import {generateDraft} from './openaiGeneration.ts';
import {QUALITY_DRAFT_MODEL} from './generationModels.ts';
import {canonical,sha256,readJsonFile,requireWithin,AUDIO_PROCESSING,quizSpeechFingerprint} from './narrationFiles.ts';
import {planProduction,publicProductionPlan,readProductionSource,type ProduceConfig} from './productionPlan.ts';
import {acquireJobLock,loadJobBudget,allocateBudget,saveBudget,settleAllocation,assertProductionPricing,chargedUnits,type ProductionReservation} from './productionBudget.ts';
import {readJob,saveJob,startStage,completeStage,fileHash,codeFingerprint,outputExists,type ProductionJob} from './productionJobs.ts';
import {prepareProductionAudio,recoverTtsArtifacts} from './productionAudio.ts';
import {prepareLocalAlignments} from './localAlignment.ts';
import {productionPhrases,GROUPING_CONFIG} from './productionCaptions.ts';
import {loadDisplayCues,alignmentKey} from './captionAlignment.ts';
import {renderLocalVideo} from './renderLocalVideo.ts';
import {inspectNarratedVideo} from './mediaInspection.ts';
import {promoteOutput} from './output.ts';
import {PROJECT_ROOT} from './remotionCommand.ts';
import {makeScenarioSource} from './scenarioBrief.ts';
import {backgroundOptionsSchema,planBackground,prepareBackground,type BackgroundOptions,type ImageClient} from './backgroundImages.ts';
import {recordCompletedBackgroundUse} from './backgroundCatalog.ts';
import {inspectProductionReadiness,type Readiness} from './productionReadiness.ts';
import {validateAuthorizationCap} from './money.ts';
import {checkCancellation,cancellationRequested,ProductionCancelled} from './cancellation.ts';
import type {ProductionPresetName} from '../src/productionPresets.ts';
import type {ProductionMusicId} from './productionMusic.ts';
import {assertConciseNarration} from '../src/editorialPolicy.ts';
import {timingReport} from './timingReport.ts';
export type ProduceOptions={draft?:string;brief?:string;scenario?:string;output?:string;resume?:string;jobId?:string;reviewMode?:'automated'|'manual';
  voiceFile?:string;presentationFile?:string;noMusic?:boolean;model?:string;maxOutputTokens?:number;dryRun?:boolean;allowPaid?:boolean;
  maxCostUSD?:number;overwrite?:boolean;recoverLock?:boolean;backgroundOptions?:Partial<BackgroundOptions>;
  productionPreset?:ProductionPresetName;countdownSeconds?:5;musicTrackId?:ProductionMusicId};
export type ProductionDependencies={root?:string;checkAudio?:Parameters<typeof planProduction>[3];generate?:typeof generateDraft;review?:typeof runAutomatedReview;
  align?:typeof prepareLocalAlignments;render?:typeof renderLocalVideo;inspectOutput?:typeof inspectNarratedVideo;codeHash?:()=>Promise<string>;
  imageClient?:ImageClient;generator?:Parameters<typeof prepareProductionAudio>[0]['generator'];log?:(message:string)=>void;loadPaidConfig?:()=>void;
  preflight?:(root:string,plan:Awaited<ReturnType<typeof planProduction>>,model:string)=>Promise<Readiness>;
  onPlan?:(plan:ReturnType<typeof publicProductionPlan>,job:ProductionJob)=>void|Promise<void>;
  authorize?:(plan:ReturnType<typeof publicProductionPlan>,job:ProductionJob)=>Promise<number|undefined>};
const exists=(p:string)=>access(p).then(()=>true,()=>false);
const jobIdPattern=/^[a-z0-9][a-z0-9-]{0,31}$/u;
const loadPaidEnv=()=>{try{loadEnvFile('.env');}catch(e){if((e as NodeJS.ErrnoException).code!=='ENOENT')throw e;}};
const fingerprint=(p:Awaited<ReturnType<typeof planProduction>>)=>sha256(canonical({hashes:p.hashes,inventory:p.inventory.map(c=>({key:c.key,status:c.status,sha:c.clip?.sha256,alignment:c.alignment,alignmentHash:c.alignmentHash}))}));
const sanitize=(e:unknown)=>e instanceof Error&&e.message.length<3000&&!/authorization:|bearer\s|api[_ -]?key\s*[:=]/iu.test(e.message)?e.message:'Production stage failed; inspect local retained artifacts without printing credentials';
export const produce=async(options:ProduceOptions,deps:ProductionDependencies={})=>{
  const root=resolve(deps.root??PROJECT_ROOT),log=deps.log??console.log;
  const sources=[options.draft,options.brief,options.scenario].filter(v=>v!==undefined).length;
  if(options.resume&&sources)throw new Error('Use --resume or exactly one of --draft/--brief/--scenario');
  if(!options.resume&&(sources!==1||!options.output))throw new Error('New production requires exactly one --draft, --brief or --scenario and an explicit --output');
  const scenario=options.scenario!==undefined?makeScenarioSource(options.scenario):undefined;
  const id=options.resume??options.jobId??`job-${sha256(canonical({draft:options.draft,brief:options.brief,...(scenario?{scenario}:{}),output:options.output})).slice(0,16)}`;
  if(!jobIdPattern.test(id))throw new Error('Job ID must be lowercase letters/digits/hyphens, at most 32 characters');
  const folder=join(root,'data/production-jobs',id),jobFile=join(folder,'job.json');
  const prior=await exists(jobFile)?await readJob(jobFile):null;
  const previousCap=prior?.maxCostUSD;
  if(previousCap!==undefined&&options.maxCostUSD!==undefined&&options.maxCostUSD!==previousCap)throw new Error(`Production authorization total cap cannot be changed on resume; stored $${previousCap}, requested $${options.maxCostUSD}`);
  if(options.resume&&!prior)throw new Error('Unknown production job ID');
  if(prior&&!options.resume)throw new Error(`Job already exists; use --resume ${id}`);
  const config:ProduceConfig=prior?{...prior.config}:{source:scenario??{kind:options.draft?'draft':'brief',path:resolve(root,options.draft??options.brief!)},
    output:resolve(root,options.output!),reviewMode:options.reviewMode??'automated',voiceFile:'content/voice-profiles/selected-default.json',
    presentationFile:'content/production/default.json',noMusic:false,model:QUALITY_DRAFT_MODEL,maxOutputTokens:12000,
    ...(!options.draft?{backgroundOptions:backgroundOptionsSchema.parse(options.backgroundOptions??{})}:{})};
  if(prior&&options.backgroundOptions)throw new Error('Resume keeps its bound background/settings; use a new job for explicit image changes');
  if(options.draft&&options.backgroundOptions)throw new Error('Draft backgrounds are content-hash bound; supply a separate brief/scenario revision for image selection');
  if(options.output&&resolve(root,options.output)!==config.output)throw new Error('Resume keeps the original output path; use a new job to change the destination');
  if(options.reviewMode)config.reviewMode=options.reviewMode;if(options.voiceFile)config.voiceFile=options.voiceFile;
  if(options.presentationFile)config.presentationFile=options.presentationFile;if(options.noMusic!==undefined)config.noMusic=options.noMusic;
  if(options.model)config.model=options.model;if(options.maxOutputTokens!==undefined)config.maxOutputTokens=options.maxOutputTokens;
  if(options.productionPreset)config.productionPreset=options.productionPreset;
  if(options.countdownSeconds)config.countdownSeconds=options.countdownSeconds;
  if(options.musicTrackId)config.musicTrackId=options.musicTrackId;
  // Freeze the NEW generation contract before its first authorization; never retrofit accepted drafts.
  if((!prior||(!prior.paidOptIn&&!prior.workDirectory))&&config.source.kind!=='draft'&&config.productionPreset==='concise-v1')config.contentPolicy='concise-explanations-v1';
  if(options.maxCostUSD!==undefined&&(!Number.isFinite(options.maxCostUSD)||options.maxCostUSD<=0))throw new Error('--max-cost-usd must be finite and positive');
  requireWithin(root,config.output);if(extname(config.output).toLowerCase()!=='.mp4')throw new Error('Production output must be a local MP4');
  const presetProps={...(config.productionPreset?{productionPreset:config.productionPreset}:{}),...(config.countdownSeconds?{countdownSeconds:config.countdownSeconds}:{})};
  const release=await acquireJobLock(folder,options.recoverLock);
  const lockedPrior=await exists(jobFile)?await readJob(jobFile):null;
  if(canonical(lockedPrior)!==canonical(prior)){await release();throw new Error('Stored job changed before lock acquisition; no authorization committed. Inspect stored job and resume with the intended configuration.');}
  const job:ProductionJob=prior??{version:1,jobId:id,config,state:'planning',stages:{},history:[],revisions:[],paidOptIn:false,createdAt:new Date().toISOString(),updatedAt:new Date().toISOString()};
  job.config=config;
  let activeStage='planning',budgetHandle:Awaited<ReturnType<typeof loadJobBudget>>|undefined;
  const persist=()=>{if(budgetHandle)job.budget={ledger:budgetHandle.file,...budgetHandle.budget};return saveJob(folder,job);};
  const snapshot=async(bundle:Awaited<ReturnType<typeof readDraft>>)=>{
    const directory=join(folder,'revisions',bundle.contentHash);
    if(!await exists(join(directory,'draft.json'))){await atomicJson(join(directory,'draft.json'),bundle.draft);await atomicJson(join(directory,'answer-key.json'),bundle.key);}
    const verified=await readDraft(directory,root);if(verified.contentHash!==bundle.contentHash)throw new Error('Immutable production revision checksum mismatch');
    if(!job.revisions.some(r=>r.hash===bundle.contentHash))job.revisions.push({hash:bundle.contentHash,directory,sourceIdentity:job.sourceIdentity!});
    job.contentHash=bundle.contentHash;return directory;
  };
  const authorize=async()=>{
    if(!job.paidOptIn)throw new Error('Additional production spending authorization is required. Inspect plan.json; then resume with --allow-paid --max-cost-usd <approved-total>');
    checkCancellation();budgetHandle??=await loadJobBudget(root,id,job.maxCostUSD,true);return budgetHandle;
  };
  const allocation=async(stage:'generation'|'review'|'tts',inputHash:string,units:number)=>{
    const h=await authorize(),key=`${stage}-${inputHash.slice(0,24)}`,a=allocateBudget(h.budget,key,stage,inputHash,units);
    if(stage!=='tts')a.childLedger=join(root,stage==='generation'?'data/generation-budgets':'data/automated-review-budgets',a.childBudgetId+'.json');
    await saveBudget(h.file,h.budget);return {handle:h,key,a,reference:{file:h.file,key,childBudgetId:a.childBudgetId} satisfies ProductionReservation};
  };
  const settleChild=async(info:Awaited<ReturnType<typeof allocation>>)=>{
    if(!info.a.childLedger)return;
    const raw=await readJsonFile(info.a.childLedger).catch((e:NodeJS.ErrnoException)=>{if(e.code==='ENOENT')return null;throw e;}) as {scenarios?:Record<string,{attempts:unknown[]}>;attempts?:unknown[]}|null;
    if(!raw){settleAllocation(info.handle.budget,info.key,0);await saveBudget(info.handle.file,info.handle.budget);return;}
    const attempts=(raw.attempts??Object.values(raw.scenarios??{}).flatMap(s=>s.attempts)) as {state:string;chargedUnits:number;usage?:unknown}[];
    if(attempts.some(a=>['pending','uncertain'].includes(a.state)))return;
    settleAllocation(info.handle.budget,info.key,attempts.reduce((n,a)=>n+a.chargedUnits,0),attempts.map(a=>({state:a.state,usage:a.usage})));
    await saveBudget(info.handle.file,info.handle.budget);
  };
  try{
    if(!options.dryRun&&await exists(join(root,'data/generation-budgets',`produce-${id}.json`))){
      budgetHandle=await loadJobBudget(root,id,job.maxCostUSD,false);
      for(const [key,a] of Object.entries(budgetHandle.budget.allocations)){
        if(a.stage==='tts')await recoverTtsArtifacts({...budgetHandle,key},root,deps.checkAudio);
        else if(a.stage!=='image'&&a.state!=='settled')await settleChild({handle:budgetHandle,key,a,reference:{file:budgetHandle.file,key,childBudgetId:a.childBudgetId}});
      }
    }
    let source=await readProductionSource(config,root);
    if(config.backgroundOptions&&!config.backgroundBinding){
      config.backgroundBinding=(await planBackground(root,source.brief,config.output,config.backgroundOptions)).binding;
      await persist();source=await readProductionSource(config,root);
    }
    if(source.deriveBrief)await atomicJson(join(folder,'sources',source.identity+'.json'),{
      source:config.source,identity:source.identity,seedBrief:source.brief,learningPlan:'Pending: derived together with questions in the existing generation call',providerCalls:0});
    if(job.sourceIdentity!==source.identity){job.sourceIdentity=source.identity;job.workDirectory=undefined;job.lastPlanHash=undefined;}
    let working:Awaited<ReturnType<typeof readDraft>>|undefined;
    if(job.workDirectory&&await exists(join(job.workDirectory,'draft.json'))){
      try{working=await readDraft(job.workDirectory,root);}catch(error){
        let recovered=false;
        if(!options.dryRun&&budgetHandle)for(const a of Object.values(budgetHandle.budget.allocations).filter(a=>a.stage==='review'&&a.childLedger)){
          const ledger=await readJsonFile(a.childLedger!).catch(()=>null) as {proposedHash?:string}|null;
          const proposal=await readJsonFile(join(job.workDirectory,'automated-review',a.childBudgetId,'proposed.json')).catch(()=>null) as {draft:unknown;key:unknown}|null;
          if(proposal&&ledger?.proposedHash&&contentHash(proposal.draft,proposal.key)===ledger.proposedHash){
            await atomicJson(join(job.workDirectory,'draft.json'),proposal.draft);await atomicJson(join(job.workDirectory,'answer-key.json'),proposal.key);
            working=await readDraft(job.workDirectory,root);job.history.push({recovery:'restored verified correction proposal after interrupted two-file commit',hash:ledger.proposedHash});recovered=true;break;
          }
        }
        if(!recovered&&config.source.kind==='draft')throw error;
      }
    }
    let plan=await planProduction(config,root,working,deps.checkAudio);
    await atomicJson(join(folder,'brief.json'),plan.bundle?.draft.brief??source.brief);
    await atomicJson(join(folder,'plan.json'),publicProductionPlan(plan));
    job.configuration={voice:plan.settings.voice,presentation:plan.settings.presentation,alignment:ALIGNMENT_CONFIG,grouping:GROUPING_CONFIG,audioProcessing:AUDIO_PROCESSING,
      ...(config.productionPreset?{productionPreset:plan.settings.preset}:{})};
    job.narration=plan.script;job.contentHash=plan.bundle?.contentHash;job.assets={background:plan.background,music:plan.music};
    for(const name of ['generation','import','validation','review','audio','alignment','captions','render','verification'])
      job.stages[name]??={status:'planned',inputHash:plan.hashes.content,outputs:[],details:{wouldRun:name==='review'?!plan.acceptance.valid:undefined}};
    await persist();
    await deps.onPlan?.(publicProductionPlan(plan),job);
    if(options.dryRun){
      if(job.renderCertificate&&plan.bundle&&plan.acceptance.valid&&plan.inventory.length===19&&plan.inventory.every(c=>c.clip&&c.alignment==='verified')){
        const narration=preparedNarrationSchema.parse({version:1,quizFingerprint:quizSpeechFingerprint(plan.bundle.quiz),profile:plan.settings.voice,processing:AUDIO_PROCESSING,clips:plan.inventory.map(c=>c.clip!)});
        const t=getNarratedTimeline(narration,plan.bundle.quiz,plan.settings.preset.timing),bonus=t.questions.at(-1)!;
        const phrases=await productionPhrases(narration.clips,t.audio,Object.fromEntries(t.questions.map(q=>[q.id,q.revealStart])),bonus.id,root);
        const cues=plan.settings.presentation.bookendStyle==='display'?await loadDisplayCues(narration.clips,t.audio,root):undefined;
        const props=productionPropsSchema.parse({...presetProps,quiz:plan.bundle.draft.quiz,narration,presentation:plan.settings.presentation,music:plan.music,phraseCaptions:phrases,displayCues:cues,
          ...(plan.background?.id.startsWith('generated-')?{background:plan.background}:{})});
        const renderHash=sha256(canonical({props,code:await (deps.codeHash??(()=>codeFingerprint(root)))(),grouping:GROUPING_CONFIG}));
        const c=await readJsonFile(job.renderCertificate).catch(()=>null) as {renderHash:string;sha256:string}|null;
        if(c?.renderHash===renderHash&&await fileHash(config.output).catch(()=>null)===c.sha256)plan.stages.render.wouldRun=false;
      }
      await atomicJson(join(folder,'plan.json'),publicProductionPlan(plan));if(job.state!=='complete')job.state='planned';await persist();
      return {jobId:id,jobManifest:jobFile,planFile:join(folder,'plan.json'),dryRun:true,...publicProductionPlan(plan)};
    }
    if(plan.blockers.length)throw new Error(plan.blockers.join('; '));
    if(await outputExists(config.output)&&!options.overwrite&&(!job.renderCertificate||!plan.acceptance.valid||plan.inventory.length!==19||plan.inventory.some(c=>!c.clip||c.alignment!=='verified')))
      throw new Error('Output exists but dependencies require new work; use --overwrite for explicit replacement before authorizing paid stages');
    const requestedCap=options.allowPaid?(options.maxCostUSD??job.maxCostUSD):undefined;
    const needsPaid=plan.conservativeTotalUSD>0;
    if(requestedCap!==undefined)validateAuthorizationCap(requestedCap,plan.conservativeTotalUSD,previousCap);
    if(needsPaid){
      const readiness=await (deps.preflight??inspectProductionReadiness)(root,plan,config.model);
      await atomicJson(join(folder,'readiness.json'),readiness);
      if(!readiness.ready)throw new Error(`Local production prerequisites block paid work: ${readiness.blockers.join('; ')}`);
      if(!job.paidOptIn){const cap=requestedCap??await deps.authorize?.(publicProductionPlan(plan),job);
        if(cap===undefined)throw new Error('Additional production spending authorization is required. Inspect plan.json, then resume with --allow-paid --max-cost-usd <approved-total> or npm run video -- --resume '+id);
        validateAuthorizationCap(cap,plan.conservativeTotalUSD);checkCancellation();
        job.paidOptIn=true;job.maxCostUSD=cap;job.history.push({authorization:'explicit scoped total',capUSD:cap,planHash:sha256(canonical(publicProductionPlan(plan))),at:new Date().toISOString()});await persist();
      }
    }
    if(plan.image?.action==='reuse'&&config.backgroundBinding?.request&&budgetHandle&&Object.values(budgetHandle.budget.allocations).some(a=>a.stage==='image'&&a.state!=='settled')){
      await prepareBackground({root,folder,binding:config.backgroundBinding,budget:budgetHandle,client:deps.imageClient});
    }
    if(plan.image?.action==='generate'){
      if(!job.paidOptIn||!job.maxCostUSD)throw new Error('Image generation requires scoped total spending authorization; inspect the zero-call plan and resume with --allow-paid --max-cost-usd');
      if(plan.conservativeTotalUSD>job.maxCostUSD)throw new Error('Total conditional image/content/review/TTS plan exceeds the authorized job cap; no request made');
      activeStage='image';startStage(job,'image',sha256(canonical(config.backgroundBinding)));await persist();
      (deps.loadPaidConfig??loadPaidEnv)();
      const preparedImage=await prepareBackground({root,folder,binding:config.backgroundBinding!,budget:await authorize(),client:deps.imageClient});
      await completeStage(job,'image',[join(root,'public',preparedImage.asset.file),preparedImage.receipt]);await persist();
      plan=await planProduction(config,root,working,deps.checkAudio);
      if(plan.blockers.length)throw new Error(plan.blockers.join('; '));
    }
    startStage(job,'validation',plan.hashes.content);await completeStage(job,'validation',[],{structural:'PASS',background:plan.background,acceptance:plan.acceptance});await persist();
    const currentCode=await (deps.codeHash??(()=>codeFingerprint(root)))();
    const verifyCertificate=async(renderHash:string)=>{
      if(!job.renderCertificate)return null;
      const c=await readJsonFile(job.renderCertificate).catch(()=>null) as {renderHash:string;sha256:string;temporary:string;verification:unknown;propsFile:string;audioFile:string}|null;
      if(!c||c.renderHash!==renderHash)return null;
      if(await fileHash(config.output).catch(()=>null)!==c.sha256){
        if(await fileHash(c.temporary).catch(()=>null)!==c.sha256)return null;
        requireWithin(dirname(config.output),c.temporary);await promoteOutput(c.temporary,config.output,!!options.overwrite||job.replacementRenderHash===renderHash);
      }
      return c;
    };
    // Recover promotion interrupted after durable verification, even without a completed stage flag.
    if(job.renderCertificate&&plan.bundle&&plan.acceptance.valid&&plan.inventory.length===19&&plan.inventory.every(c=>c.clip&&c.alignment==='verified')){
      const narration=preparedNarrationSchema.parse({version:1,quizFingerprint:quizSpeechFingerprint(plan.bundle.quiz),profile:plan.settings.voice,processing:AUDIO_PROCESSING,clips:plan.inventory.map(c=>c.clip!)});
      const timeline=getNarratedTimeline(narration,plan.bundle.quiz,plan.settings.preset.timing),last=timeline.questions.at(-1)!;
      const phrases=await productionPhrases(narration.clips,timeline.audio,Object.fromEntries(timeline.questions.map(q=>[q.id,q.revealStart])),last.id,root);
      const displayCues=plan.settings.presentation.bookendStyle==='display'?await loadDisplayCues(narration.clips,timeline.audio,root):undefined;
      const props=productionPropsSchema.parse({...presetProps,quiz:plan.bundle.draft.quiz,narration,presentation:plan.settings.presentation,music:plan.music,phraseCaptions:phrases,displayCues,
        ...(plan.background?.id.startsWith('generated-')?{background:plan.background}:{})});
      const hash=sha256(canonical({props,code:currentCode,grouping:GROUPING_CONFIG})),c=await verifyCertificate(hash);
      if(c){await (deps.inspectOutput??inspectNarratedVideo)(config.output,timeline.durationInFrames,timeline.speechEnd,65);
        requireWithin(join(root,'public/audio/production',id),c.audioFile);requireWithin(folder,c.propsFile);
        await atomicJson(c.audioFile,narration);await atomicJson(c.propsFile,props);
        await snapshot(plan.bundle);job.lastPlanHash=fingerprint(plan);job.lastRenderHash=hash;
        startStage(job,'render',hash);await completeStage(job,'render',[config.output,c.propsFile,job.renderCertificate],c.verification);
        const reportFile=config.output.slice(0,-4)+'.verification.json';
        const report=await readJsonFile(reportFile).catch(()=>({})) as Record<string,unknown>;
        const refreshed={...report,jobId:id,output:config.output,videoSha256:c.sha256,contentHash:plan.bundle.contentHash,verification:c.verification,
          reusedVerifiedRender:true,resumeProviderCalls:0,cacheAfterPreparation:{verifiedClips:19,verifiedAlignments:19},
          reviewMode:config.reviewMode,voice:plan.settings.voice,presentation:plan.settings.presentation,
          viewing:report.viewing??{visualInspection:'not yet performed',listeningPerformed:false,phonePlaybackPerformed:false},resumedAt:new Date().toISOString()};
        await atomicJson(reportFile,refreshed);await atomicJson(join(folder,'verification.json'),refreshed);
        job.state='complete';await persist();await recordCompletedBackgroundUse(root,plan.background!.id,plan.bundle.quiz.videoId);return {jobId:id,output:config.output,report:reportFile,reusedVerifiedRender:true,providerCalls:0,cacheHits:19,alignmentCacheHits:19};}
    }
    if(await outputExists(config.output)&&!options.overwrite)throw new Error('Output exists but its current dependencies are not verified unchanged; use --overwrite for an authorized replacement, or choose a new job/output');
    if(!working){
      if(source.bundle){activeStage='import';startStage(job,'import',source.identity);const saved=await snapshot(source.bundle);
        job.workDirectory=join(folder,'work',source.identity);await mkdir(job.workDirectory,{recursive:true});
        if(source.importSource)await importDraft(source.importSource,source.brief,job.workDirectory,{root,generatedAt:source.bundle.draft.provenance.generatedAt});
        else{await copyFile(join(saved,'draft.json'),join(job.workDirectory,'draft.json'));await copyFile(join(saved,'answer-key.json'),join(job.workDirectory,'answer-key.json'));}
        working=await readDraft(job.workDirectory,root);await completeStage(job,'import',[join(job.workDirectory,'draft.json'),join(job.workDirectory,'answer-key.json')]);await persist();
      }else{
        activeStage='generation';const hash=sha256(canonical({brief:source.brief,model:config.model,maxOutput:config.maxOutputTokens,...(source.deriveBrief?{deriveBrief:true}:{}),...(config.contentPolicy?{contentPolicy:config.contentPolicy}:{})}));
        const info=await allocation('generation',hash,Math.ceil(plan.stages.generation.conservativeBoundUSD*1e9));
        job.workDirectory=join(folder,'generated',source.identity);startStage(job,'generation',hash);await persist();(deps.loadPaidConfig??loadPaidEnv)();
        try{await (deps.generate??generateDraft)({brief:source.brief,episodeId:`production-${id}`.slice(0,40),output:job.workDirectory,model:config.model,maxOutputTokens:config.maxOutputTokens,
          root,allowPaid:true,maxCostUSD:info.a.allocatedUnits/1e9,budgetId:info.a.childBudgetId,productionReservation:info.reference,
          deriveBrief:source.deriveBrief,contentPolicy:config.contentPolicy,regenerate:await exists(join(job.workDirectory,'generation.json'))});}
        finally{await settleChild(info);}
        working=await readDraft(job.workDirectory,root);await snapshot(working);await atomicJson(join(folder,'brief.json'),working.draft.brief);
        await completeStage(job,'generation',[join(job.workDirectory,'draft.json'),join(job.workDirectory,'answer-key.json')]);await persist();
      }
    }
    plan=await planProduction(config,root,working,deps.checkAudio);
    if(!plan.acceptance.valid){
      if(config.reviewMode==='manual')throw new Error(plan.acceptance.error??'Manual content approval required');
      activeStage='review';let reviewHash=working.contentHash;
      if(budgetHandle)for(const a of Object.values(budgetHandle.budget.allocations).filter(a=>a.stage==='review'&&a.childLedger)){
        const ledger=await readJsonFile(a.childLedger!).catch(()=>null) as {sourceHash?:string;proposedHash?:string;finalHash?:string;state?:string}|null;
        if(ledger&&[ledger.sourceHash,ledger.proposedHash,ledger.finalHash].includes(working.contentHash)){
          if(ledger.state==='needs-revision')throw new Error('Automated review remains needs-revision; edit a separate source revision before further paid work');
          reviewHash=a.inputHash;break;
        }
      }
      const info=await allocation('review',reviewHash,Math.ceil(plan.stages.review.conservativeBoundUSD*1e9));
      startStage(job,'review',working.contentHash);await persist();(deps.loadPaidConfig??loadPaidEnv)();
      try{const review=await (deps.review??runAutomatedReview)({directory:job.workDirectory!,root,model:config.model,allowPaid:true,
          maxCostUSD:info.a.allocatedUnits/1e9,budgetId:info.a.childBudgetId,productionReservation:info.reference,
          contentPolicy:working.draft.provenance.method==='openai-responses'&&working.draft.provenance.schemaVersion.startsWith('pipeline-concise-')?'concise-explanations-v1':undefined});
        if(review.status!=='accepted')throw new Error('Automated review has unresolved blocking findings; episode needs revision');}
      finally{await settleChild(info);}
      working=await readDraft(job.workDirectory!,root);await assertAutomatedAcceptance(working,root);await snapshot(working);
      await completeStage(job,'review',[join(root,'data/automated-acceptances',working.contentHash+'.json')]);await persist();
      plan=await planProduction(config,root,working,deps.checkAudio); // Corrections rebuild narration/cache and budget before TTS.
    }
    if(plan.blockers.length)throw new Error(plan.blockers.join('; '));
    if(working.draft.provenance.method==='openai-responses'&&working.draft.provenance.schemaVersion.startsWith('pipeline-concise-'))assertConciseNarration(working.draft.narration.segments);
    await snapshot(working);job.narration=plan.script;job.contentHash=working.contentHash;
    await atomicJson(join(folder,'brief.json'),working.draft.brief);
    if(plan.acceptance.valid){startStage(job,'review',working.contentHash);await completeStage(job,'review',[
      join(root,config.reviewMode==='automated'?'data/automated-acceptances':'data/approvals',working.contentHash+'.json')],{reusedAcceptance:true,humanReviewed:config.reviewMode==='manual'});}
    await atomicJson(join(folder,'plan.json'),publicProductionPlan(plan));await persist();
    activeStage='audio';const audioHash=sha256(canonical({script:plan.script,processing:AUDIO_PROCESSING}));
    const missing=plan.inventory.filter(c=>c.status==='missing');
    let tts:Awaited<ReturnType<typeof allocation>>|undefined;
    if(missing.length){assertProductionPricing();tts=await allocation('tts',audioHash,Math.ceil(plan.stages.tts.conservativeBoundUSD*1e9));(deps.loadPaidConfig??loadPaidEnv)();}
    else if(budgetHandle){const key=`tts-${audioHash.slice(0,24)}`,a=budgetHandle.budget.allocations[key];if(a)tts={handle:budgetHandle,key,a,reference:{file:budgetHandle.file,key,childBudgetId:a.childBudgetId}};}
    startStage(job,'audio',audioHash);await persist();
    const prepared=await prepareProductionAudio({script:plan.script!,quiz:working.quiz,inventory:plan.inventory,root,folder,
      budget:tts?{...tts.handle,key:tts.key}:undefined,generator:deps.generator});
    const audioFile=join(root,'public/audio/production',id,audioHash+'.json');await atomicJson(audioFile,prepared.narration);
    await completeStage(job,'audio',[audioFile],prepared.usage);await persist();
    activeStage='alignment';const alignmentHash=sha256(canonical({audio:prepared.narration.clips.map(c=>({sha256:c.sha256,text:c.text,language:c.language})),configuration:ALIGNMENT_CONFIG}));
    startStage(job,'alignment',alignmentHash);await persist();const alignment=await (deps.align??prepareLocalAlignments)(prepared.narration.clips,root);
    await completeStage(job,'alignment',prepared.narration.clips.map(c=>join(root,'.audio-cache/caption-alignments',alignmentKey(c)+'.json')),alignment);await persist();
    activeStage='captions';const t=getNarratedTimeline(prepared.narration,working.quiz,plan.settings.preset.timing),bonus=t.questions.at(-1)!;
    const breakdown=timingReport(t,plan.settings.preset.advisoryDurationSeconds);await atomicJson(join(folder,'timing.json'),breakdown);
    log(JSON.stringify({measuredTiming:breakdown}));
    if(breakdown.minimumConflict)throw new Error(`Measured episode duration ${breakdown.totalSeconds}s is below the retained 65-second minimum; no filler, speech cutting or render attempted. Inspect timing.json.`);
    const phrases=await productionPhrases(prepared.narration.clips,t.audio,Object.fromEntries(t.questions.map(q=>[q.id,q.revealStart])),bonus.id,root);
    const cues=plan.settings.presentation.bookendStyle==='display'?await loadDisplayCues(prepared.narration.clips,t.audio,root):undefined;
    const props=productionPropsSchema.parse({...presetProps,quiz:working.draft.quiz,narration:prepared.narration,presentation:plan.settings.presentation,
      music:plan.music,phraseCaptions:phrases,displayCues:cues,...(plan.background?.id.startsWith('generated-')?{background:plan.background}:{})});
    const captionHash=sha256(canonical({phrases,grouping:GROUPING_CONFIG,alignmentHash}));startStage(job,'captions',captionHash);
    const captionFile=join(folder,'artifacts',captionHash+'.captions.json');await atomicJson(captionFile,{configuration:GROUPING_CONFIG,phrases});
    await completeStage(job,'captions',[captionFile]);await persist();
    activeStage='render';const renderHash=sha256(canonical({props,code:currentCode,grouping:GROUPING_CONFIG}));
    const propsFile=join(folder,'artifacts',renderHash+'.props.json');await atomicJson(propsFile,props);
    let certificate=await verifyCertificate(renderHash),verification:unknown;
    if(certificate){verification=certificate.verification;log('Recovered an already verified render without repeating rendering');}
    else{
      startStage(job,'render',renderHash);await persist();
      if(options.overwrite){job.replacementRenderHash=renderHash;await persist();}
      verification=await (deps.render??renderLocalVideo)({root,composition:'KoreanProduction',props,output:config.output,overwrite:!!options.overwrite,
        frames:t.durationInFrames,speechEnd:t.speechEnd,minimumDurationSeconds:65,finalMix:plan.settings.preset.finalMix??undefined,beforePromote:async(temporary,result)=>{
          const file=join(folder,'artifacts',renderHash+'.verified.json');
          await atomicJson(file,{renderHash,sha256:await fileHash(temporary),temporary,verification:result,propsFile,audioFile});
          job.renderCertificate=file;job.lastRenderHash=renderHash;await persist();
        }});
    }
    await completeStage(job,'render',[config.output,propsFile,job.renderCertificate!],verification);
    job.lastRenderHash=renderHash;
    const finalPlan=await planProduction(config,root,working,deps.checkAudio);job.lastPlanHash=fingerprint(finalPlan);job.state='complete';
    const budget=budgetHandle?.budget;
    const report={jobId:id,output:config.output,videoSha256:await fileHash(config.output),contentHash:working.contentHash,reviewMode:config.reviewMode,
      voice:plan.settings.voice,presentation:plan.settings.presentation,productionPreset:plan.settings.preset,timingBreakdown:breakdown,timeline:{frames:t.durationInFrames,durationSeconds:t.durationInFrames/30,
        questions:t.questions.map(q=>({id:q.id,bonus:q.bonus,start:q.start,countdownStart:q.countdownStart,revealStart:q.revealStart,end:q.end})),
        commentPauseFrames:45,followHoldFrames:30,fadeFrames:12},verification,bonusIsolation:'PASS: strict public bonus schema has no answer/reveal/explanation metadata; actual question audio required',
      audioPreparation:prepared.usage,alignment,cacheAfterPreparation:{verifiedClips:finalPlan.verifiedCacheHits,verifiedAlignments:finalPlan.alignmentCacheHits},
      costs:{estimatedUSD:budget?chargedUnits(budget)/1e9:0,capUSD:budget?budget.capUnits/1e9:0,ledger:budgetHandle?.file,
        allocations:budget?Object.values(budget.allocations).map(a=>({stage:a.stage,state:a.state,reservedUSD:a.allocatedUnits/1e9,chargedEstimateUSD:a.chargedUnits/1e9,
          requests:a.stage==='tts'||a.stage==='image'?a.requests.length:Array.isArray(a.usage)?a.usage.length:0,childLedger:a.childLedger,usage:a.usage})):[],invoiceInspected:false},
      viewing:{visualInspection:'not yet performed',listeningPerformed:false,phonePlaybackPerformed:false},generatedAt:new Date().toISOString()};
    const reportFile=config.output.slice(0,-4)+'.verification.json';await atomicJson(reportFile,report);await atomicJson(join(folder,'verification.json'),report);await persist();
    startStage(job,'verification',renderHash);await completeStage(job,'verification',[reportFile],verification);job.state='complete';await persist();
    await recordCompletedBackgroundUse(root,plan.background!.id,working.quiz.videoId);
    return {jobId:id,output:config.output,report:reportFile,reusedVerifiedRender:!!certificate,...report.costs};
  }catch(error){const e=cancellationRequested()?new ProductionCancelled():error;job.state=e instanceof ProductionCancelled?'cancelled':/authorization|required.*budget|budget exhausted|unauthorised/iu.test(sanitize(e))?'awaiting-authorization':'failed';
    if(job.stages[activeStage]?.status==='running'){job.stages[activeStage].status='failed';job.stages[activeStage].error=sanitize(e);}job.history.push({stage:activeStage,error:sanitize(e),at:new Date().toISOString()});
    await persist();throw new Error(`${sanitize(e)}\nJob ${id}: ${jobFile}`);
  }finally{await release();}
};
