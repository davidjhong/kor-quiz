import {join,resolve} from 'node:path';
import {access} from 'node:fs/promises';
import {readJob,codeFingerprint,fileHash} from './productionJobs.ts';
import {readDraft} from './draftWorkflow.ts';
import {planProduction,publicProductionPlan} from './productionPlan.ts';
import {readJsonFile,canonical,sha256,AUDIO_PROCESSING,quizSpeechFingerprint} from './narrationFiles.ts';
import {preparedNarrationSchema} from '../src/narration.ts';
import {getNarratedTimeline} from '../src/narrationTiming.ts';
import {productionPropsSchema} from '../src/production.ts';
import {productionPhrases,GROUPING_CONFIG} from './productionCaptions.ts';
import {loadDisplayCues} from './captionAlignment.ts';
import {timingReport} from './timingReport.ts';
import {acquireJobLock} from './jobLocks.ts';
import {inspectProductionReadiness} from './productionReadiness.ts';
import type {ProductionDependencies,ProduceOptions} from './productionPipeline.ts';
/** Existing-job dry inspection is read-only: historical reports and snapshots stay historical. */
export const inspectVideoJob=async(id:string,root:string,deps:ProductionDependencies={},overrides:ProduceOptions={})=>{
  if(!/^[a-z0-9][a-z0-9-]{0,31}$/u.test(id))throw new Error('Invalid job ID');
  const folder=join(root,'data/production-jobs',id);await access(join(folder,'job.json')).catch(()=>{throw new Error(`Unknown production job ${id}; no job created`);});
  const release=await acquireJobLock(folder,overrides.recoverLock);
  try{const job=await readJob(join(folder,'job.json')),config=structuredClone(job.config);
    if(overrides.backgroundOptions)throw new Error('Resume keeps its bound background/settings; use a new job for explicit image changes');
    if(overrides.output&&resolve(root,overrides.output)!==config.output)throw new Error('Resume keeps the original output path');
    if(overrides.maxCostUSD!==undefined&&job.maxCostUSD!==undefined&&overrides.maxCostUSD!==job.maxCostUSD)throw new Error(`Stored total cap $${job.maxCostUSD}; requested $${overrides.maxCostUSD}. Existing authorization cannot be changed.`);
    if(overrides.reviewMode)config.reviewMode=overrides.reviewMode;if(overrides.model)config.model=overrides.model;
    if(overrides.maxOutputTokens!==undefined)config.maxOutputTokens=overrides.maxOutputTokens;
    if(overrides.voiceFile)config.voiceFile=overrides.voiceFile;if(overrides.productionPreset)config.productionPreset=overrides.productionPreset;
    if(overrides.countdownSeconds)config.countdownSeconds=overrides.countdownSeconds;if(overrides.presentationFile)config.presentationFile=overrides.presentationFile;
    if(overrides.noMusic!==undefined)config.noMusic=overrides.noMusic;if(overrides.musicTrackId)config.musicTrackId=overrides.musicTrackId;
    const working=job.workDirectory?await readDraft(job.workDirectory,root):undefined;
    const plan=await planProduction(config,root,working,deps.checkAudio);let timing:ReturnType<typeof timingReport>|undefined,renderStatus='not prepared';
    if(plan.bundle&&plan.inventory.length===19&&plan.inventory.every(c=>c.clip&&c.alignment==='verified')){
      const narration=preparedNarrationSchema.parse({version:1,quizFingerprint:quizSpeechFingerprint(plan.bundle.quiz),profile:plan.settings.voice,processing:AUDIO_PROCESSING,clips:plan.inventory.map(c=>c.clip!)});
      const timeline=getNarratedTimeline(narration,plan.bundle.quiz,plan.settings.preset.timing),bonus=timeline.questions.at(-1)!;timing=timingReport(timeline,plan.settings.preset.advisoryDurationSeconds);
      const phrases=await productionPhrases(narration.clips,timeline.audio,Object.fromEntries(timeline.questions.map(q=>[q.id,q.revealStart])),bonus.id,root);
      const cues=plan.settings.presentation.bookendStyle==='display'?await loadDisplayCues(narration.clips,timeline.audio,root):undefined;
      const props=productionPropsSchema.parse({...(config.productionPreset?{productionPreset:config.productionPreset}:{}),...(config.countdownSeconds?{countdownSeconds:config.countdownSeconds}:{}),
        quiz:plan.bundle.draft.quiz,narration,presentation:plan.settings.presentation,music:plan.music,phraseCaptions:phrases,displayCues:cues,
        ...(plan.background?.id.startsWith('generated-')?{background:plan.background}:{})});
      const currentHash=sha256(canonical({props,code:await (deps.codeHash??(()=>codeFingerprint(root)))(),grouping:GROUPING_CONFIG}));
      const certificate=job.renderCertificate?await readJsonFile(job.renderCertificate) as {renderHash:string;sha256:string}:null;
      const existingHash=await fileHash(config.output).catch(()=>null);
      plan.stages.render.wouldRun=!(certificate?.renderHash===currentHash&&existingHash===certificate.sha256);
      renderStatus=plan.stages.render.wouldRun?'renderer/grouping dependencies changed; existing MP4 preserved, explicit replacement required':'unchanged verified output reusable';
    }
    const readiness=plan.conservativeTotalUSD>0?await (deps.preflight??inspectProductionReadiness)(root,plan,config.model):{ready:true,checks:{paidReadiness:'no paid work required; expiry not required for cache reuse'},blockers:[],providerCalls:0 as const};
    return {...publicProductionPlan(plan),jobId:id,jobManifest:join(folder,'job.json'),output:config.output,paidOptIn:job.paidOptIn,
      storedCapUSD:job.maxCostUSD,voiceProfileId:config.voiceFile,musicTrackId:config.musicTrackId??'subtle-bass',readiness,blockers:[...plan.blockers,...readiness.blockers],timing,renderStatus,providerCalls:0};
  }finally{await release();}
};
