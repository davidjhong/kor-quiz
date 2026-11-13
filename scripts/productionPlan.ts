import {validateLocalBed} from './audioLibrary.ts';
import {assertVarietyConfiguration,type VarietyOptions,type VarietySelection} from './varietySelection.ts';
import {readFile,stat,access,realpath} from 'node:fs/promises';
import {join,resolve} from 'node:path';
import {z} from 'zod';
import {briefSchema,draftSchema,draftToQuiz,type BonusAnswerKey} from '../src/draftSchema.ts';
import {voiceProfileSchema,buildNarrationPlan,BONUS_CTA_TEXT,BONUS_FOLLOW_TEXT,type PreparedClip,type NarrationSegment,type NarrationScript} from '../src/narration.ts';
import {presentationSchema} from '../src/presentation.ts';
import {ALIGNMENT_CONFIG} from '../src/phraseCaptions.ts';
import {CONTENT_LIMITS} from '../src/quizSchema.ts';
import {inspectDraft,readDraft,contentHash,assertHumanApproval} from './draftWorkflow.ts';
import {assertAutomatedAcceptance,backgroundFingerprint} from './automatedAcceptance.ts';
import {AUDIO_PROCESSING,audioCacheKey,getClipCacheLocation,synthesisIdentity,canonical,sha256,readJsonFile,validateAudioFile,wavPeakDbFS,requireWithin} from './narrationFiles.ts';
import {readAlignment,alignmentKey} from './captionAlignment.ts';
import {GROUPING_CONFIG,groupAlignedText} from './productionCaptions.ts';
import {loadProductionMusic,type ProductionMusicId} from './productionMusic.ts';
import {resolveProductionPreset,type ProductionPresetName} from '../src/productionPresets.ts';
import {modelProfile,modelChargeUnits} from './generationModels.ts';
import {PRODUCTION_PRICING} from './productionBudget.ts';
import {resolveScenarioBrief,scenarioBackgroundRequirement,type ScenarioSource} from './scenarioBrief.ts';
import {planBackground,type BackgroundOptions,type BackgroundBinding} from './backgroundImages.ts';
import {catalogAsset} from './backgroundCatalog.ts';
import {resolveVoiceProfileFile} from './voiceProfiles.ts';
export type SourceBundle=Awaited<ReturnType<typeof readDraft>>;
export type ProduceConfig={varietyOptions?:VarietyOptions;varietyVersion?:'variety-v2';variety?:VarietySelection;characterExplicit?:boolean;source:{kind:'draft'|'brief';path:string}|ScenarioSource;output:string;reviewMode:'automated'|'manual';
  voiceFile:string;presentationFile:string;noMusic:boolean;model:string;maxOutputTokens:number;
  backgroundOptions?:BackgroundOptions;backgroundBinding?:BackgroundBinding;productionPreset?:ProductionPresetName;countdownSeconds?:5;musicTrackId?:ProductionMusicId;contentPolicy?:'concise-explanations-v1'};
export const productionSettings=async(config:ProduceConfig,root:string)=>{
  if(config.variety)assertVarietyConfiguration(config.variety);
  const raw=await readJsonFile(resolve(root,resolveVoiceProfileFile(config.voiceFile))) as {profile?:unknown};
  const voice=voiceProfileSchema.parse(raw.profile??raw);
  if(voice.model!=='chirp3-hd')throw new Error('Production supports the verified Chirp EN/KO profiles; Gemini audition access/reservations are separate');
  const value=await readJsonFile(resolve(root,config.presentationFile)) as {presentation?:unknown};
  const presentation=presentationSchema.parse(value.presentation??value);
  if(config.noMusic)presentation.backgroundAudio=false;
  return {voice,presentation,preset:resolveProductionPreset(config.productionPreset,config.countdownSeconds)};
};
export const readProductionSource=async(config:ProduceConfig,root:string):Promise<{bundle:SourceBundle|null;brief:z.infer<typeof briefSchema>;identity:string;directory?:string;importSource?:unknown;deriveBrief?:boolean}>=>{
  if(config.source.kind==='scenario'){
    const brief=resolveScenarioBrief(config.source);if(config.backgroundBinding)brief.backgroundAssetId=config.backgroundBinding.assetId;
    return {bundle:null,brief,identity:sha256(canonical({source:config.source,brief})),deriveBrief:true};
  }
  const path=resolve(root,config.source.path);requireWithin(root,path);const info=await stat(path);
  if(config.source.kind==='brief'){
    const brief=briefSchema.parse(await readJsonFile(path));if(config.backgroundBinding)brief.backgroundAssetId=config.backgroundBinding.assetId;return {bundle:null,brief,identity:sha256(canonical(brief))};
  }
  if(info.isDirectory()){
    const bundle=await readDraft(path,root);return {bundle,brief:bundle.draft.brief,identity:bundle.contentHash,directory:path};
  }
  const raw=z.object({brief:briefSchema,quiz:z.unknown(),narration:z.unknown(),bonusAnswerKey:z.unknown()}).parse(await readJsonFile(path));
  const importSource={quiz:raw.quiz,narration:raw.narration,bonusAnswerKey:raw.bonusAnswerKey};
  const draft=draftSchema.parse({version:1,brief:raw.brief,quiz:raw.quiz,narration:raw.narration,provenance:{method:'local-import',provider:'local-authoring',model:null,
    promptVersion:'phase5-local-v1',generatedAt:info.mtime.toISOString(),sourceHash:sha256(canonical({source:importSource,brief:raw.brief})),reportedUsage:null,estimatedCostUSD:0}});
  const report=await inspectDraft(draft,raw.bonusAnswerKey,root);if(!report.valid)throw new Error(report.errors.join('; '));
  const key=raw.bonusAnswerKey as BonusAnswerKey,bundle={draft,key,quiz:draftToQuiz(draft),contentHash:contentHash(draft,key)};
  return {bundle,brief:raw.brief,identity:sha256(await readFile(path)),importSource};
};
export const checkMatchingBackground=async(brief:z.infer<typeof briefSchema>,root:string)=>{
  const asset=brief.backgroundAssetId&&await catalogAsset(brief.backgroundAssetId,root);
  if(!asset||!brief.scenarioType||asset.scenarioType!==brief.scenarioType)throw new Error('A registered background matching brief.scenarioType is required before paid generation or TTS');
  const fingerprint=await backgroundFingerprint({backgroundAssetId:brief.backgroundAssetId} as SourceBundle['quiz'],root);
  const bytes=await readFile(join(root,'public',asset.file));
  if(!bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]))||bytes.length<33||bytes.readUInt32BE(16)<1||bytes.readUInt32BE(20)<1)
    throw new Error('Registered background is corrupt or not a valid PNG');
  return {...asset,...fingerprint};
};
export type ClipInspection={id:string;key:string;status:'verified'|'recoverable'|'missing'|'corrupt'|'uncertain';clip?:PreparedClip;characters:number;alignment:'verified'|'needed'|'invalid'|'after-audio';alignmentHash?:string;error?:string};
const exists=async(p:string)=>access(p).then(()=>true,()=>false);
export const inspectProductionClip=async(segment:NarrationSegment,profile:NarrationScript['profile'],root:string,checkAudio=validateAudioFile):Promise<ClipInspection>=>{
  let checksum:string|undefined;
  if(segment.localFile){const local=await realpath(resolve(root,segment.localFile));requireWithin(root,local);checksum=sha256(await readFile(local));}
  const key=audioCacheKey(segment,profile,checksum),location=getClipCacheLocation(root,key),base={id:segment.id,key,characters:[...segment.text].length,alignment:'after-audio' as const};
  try{
    if(await exists(join(location.directory,'clip.json'))){
      const cached=await readJsonFile(join(location.directory,'clip.json')) as {synthesisInput:unknown;media:Omit<PreparedClip,keyof NarrationSegment>};
      if(canonical(cached.synthesisInput)!==canonical(synthesisIdentity(segment,profile,checksum)))throw new Error('Cache identity mismatch');
      const m=cached.media;if(m.cacheKey!==key||m.file!==`audio/cache/${key}.wav`)throw new Error('Cache path mismatch');
      const file=await realpath(location.file);requireWithin(join(root,'public'),file);
      const bytes=await readFile(file);if(sha256(bytes)!==m.sha256)throw new Error('Cache checksum mismatch');
      if(Math.abs(await checkAudio(file)-m.durationSeconds)>1/24000)throw new Error('Cached measured duration changed');wavPeakDbFS(bytes);
      const clip={...segment,...m} as PreparedClip;
      let aligned:string|null=null;
      if(await exists(join(root,'.audio-cache/caption-alignments',alignmentKey(clip)+'.json'))){try{const a=await readAlignment(clip,root);groupAlignedText(a,GROUPING_CONFIG,clip.id);aligned=sha256(canonical(a));}
        catch(e){return {...base,status:'verified',clip,alignment:'invalid',error:`${clip.id}: saved alignment/grouping invalid; raw cache preserved, no automatic overwrite. ${e instanceof Error?e.message:''}`};}}
      return {...base,status:'verified',clip,alignment:aligned?'verified':'needed',alignmentHash:aligned??undefined};
    }
    if(await exists(join(location.directory,'original.bin'))){await checkAudio(join(location.directory,'original.bin'));return {...base,status:'recoverable'};}
    if(await exists(join(location.directory,'pending-request.json'))||await exists(join(location.directory,'.lock')))
      return {...base,status:'uncertain',error:'Pending/locked cache needs interrupted-request recovery; no blind synthesis retry'};
    return {...base,status:segment.localFile?'recoverable':'missing'};
  }catch(e){return {...base,status:'corrupt',error:`${segment.id}: ${e instanceof Error?e.message:'Invalid cache'}; restore the cached artifact before production`};}
};
export const planProduction=async(config:ProduceConfig,root:string,override?:SourceBundle,checkAudio=validateAudioFile)=>{
  const source=await readProductionSource(config,root),bundle=override??source.bundle,settings=await productionSettings(config,root);
  const blockers:string[]=[];let background,acceptance:{valid:boolean;kind:string;error?:string}={valid:false,kind:config.reviewMode};
  const image=config.backgroundOptions?await planBackground(root,bundle?.draft.brief??source.brief,config.output,config.backgroundOptions,config.backgroundBinding):undefined;
  try{background=await checkMatchingBackground(bundle?.draft.brief??source.brief,root);}catch(e){
    if(image?.action!=='generate')blockers.push(source.deriveBrief?scenarioBackgroundRequirement(bundle?.draft.brief??source.brief)??(e as Error).message:(e as Error).message);}
  if(config.variety?.checksums.background&&background?.sha256!==config.variety.checksums.background)blockers.push('Persisted variety background checksum changed; restore the selected asset');
  let music=null;try{music=await loadProductionMusic(config.musicTrackId,settings.presentation.backgroundAudio,root,config.variety?.audio?.music);}catch(e){blockers.push((e as Error).message);}
  const ambience=config.variety?.audio?.ambience??undefined;
  if(ambience)try{await validateLocalBed(ambience.asset,root);}catch(e){blockers.push((e as Error).message);}
  if(config.variety?.checksums.music&&music?.sha256!==config.variety.checksums.music)blockers.push('Persisted variety music checksum changed; restore the selected track');
  if(bundle){try{if(config.reviewMode==='automated')await assertAutomatedAcceptance(bundle,root);else{await assertHumanApproval(bundle,root);if(background?.selection!=='human-approved')throw new Error('Manual review mode requires a human-approved background');}acceptance.valid=true;}
    catch(e){acceptance.error=(e as Error).message;if(config.reviewMode==='manual')blockers.push(acceptance.error);}}
  const script=bundle?{...bundle.draft.narration,profile:settings.voice}:null;
  const segments=bundle&&script?buildNarrationPlan(bundle.quiz,script):null;
  if(bundle&&settings.presentation.bookendStyle==='display'&&bundle.quiz.episodeTitle!=='Can you say it in Korean?')blockers.push('Current display hook requires "Can you say it in Korean?"; select a classic presentation for a different exact hook');
  const inventory:ClipInspection[]=[];
  for(const segment of segments??[])inventory.push(await inspectProductionClip(segment,settings.voice,root,checkAudio));
  blockers.push(...inventory.filter(c=>['corrupt','uncertain'].includes(c.status)||c.alignment==='invalid').map(c=>c.error!));
  const missing=inventory.filter(c=>c.status==='missing'),characters=missing.reduce((n,c)=>n+c.characters,0);
  const pricing=modelProfile(config.model);
  if(!Number.isInteger(config.maxOutputTokens)||config.maxOutputTokens<2048||config.maxOutputTokens>16000)throw new Error('Invalid bounded maximum output tokens');
  const perRequest=modelChargeUnits(config.model,pricing.reservedInputTokens,config.maxOutputTokens);
  const reviewRequest=modelChargeUnits(config.model,pricing.reservedInputTokens,12000);
  const unknownCharacters=6*CONTENT_LIMITS.spokenPrompt+5*CONTENT_LIMITS.choice+5*CONTENT_LIMITS.explanation+'Can you say it in Korean?'.length+BONUS_CTA_TEXT.length+BONUS_FOLLOW_TEXT.length;
  const ttsEstimate=bundle?characters*PRODUCTION_PRICING.chirpUSDPerCharacter:null;
  const stages={image:{wouldRun:image?.action==='generate',provider:'OpenAI Images',maximumRequests:image?.maximumRequests??0,conservativeBoundUSD:image?.conservativeBoundUSD??0},generation:{wouldRun:!bundle,provider:'OpenAI',maximumRequests:bundle?0:2,conservativeBoundUSD:bundle?0:perRequest*2/1e9,
      derivesBriefInSameRequest:!!source.deriveBrief&&!bundle,separateBriefPlanningCalls:0},
    review:{wouldRun:!acceptance.valid&&config.reviewMode==='automated',provider:'OpenAI',maximumRequests:acceptance.valid||config.reviewMode==='manual'?0:3,
      conservativeBoundUSD:acceptance.valid||config.reviewMode==='manual'?0:reviewRequest*3/1e9},
    tts:{wouldRun:bundle?missing.length>0:null,provider:'Google Cloud Chirp 3 HD',maximumRequests:bundle?missing.length*2:38,
      exactUncachedCharacters:bundle?characters:null,estimatedNewSynthesisUSD:ttsEstimate,
      conservativeBoundUSD:(bundle?characters:unknownCharacters)*PRODUCTION_PRICING.chirpUSDPerCharacter*2,
      basis:bundle?'Verified final narration and per-clip cache checks':'Conditional schema text-length ceiling; exact narration and cache availability do not exist yet'},
    alignment:{wouldRun:!bundle||inventory.some(c=>c.alignment!=='verified'),provider:null,costUSD:0},
    render:{wouldRun:true,provider:null,costUSD:0}};
  const hashes={content:bundle?.contentHash??source.identity,speech:sha256(canonical(script)),voice:sha256(canonical(settings.voice)),
    presentation:sha256(canonical(settings.presentation)),audioProcessing:sha256(AUDIO_PROCESSING),alignment:sha256(canonical(ALIGNMENT_CONFIG)),
    grouping:sha256(canonical(GROUPING_CONFIG)),background:background?.sha256??null,music:music?.sha256??null,
    ...(config.variety?{variety:sha256(canonical(config.variety))}:{}),
    ...(config.productionPreset||config.countdownSeconds?{productionPreset:sha256(canonical(settings.preset))}:{})};
  return {version:1 as const,variety:config.variety,ambience,source,bundle,settings,script,segments,inventory,background,image,music,acceptance,blockers,hashes,stages,
    conservativeTotalUSD:stages.image.conservativeBoundUSD+stages.generation.conservativeBoundUSD+stages.review.conservativeBoundUSD+stages.tts.conservativeBoundUSD,
    verifiedCacheHits:inventory.filter(c=>c.status==='verified').length,alignmentCacheHits:inventory.filter(c=>c.alignment==='verified').length,
    newSynthesisRequests:missing.length,pricing:PRODUCTION_PRICING,providerCalls:0};
};
export const publicProductionPlan=(p:Awaited<ReturnType<typeof planProduction>>)=>({version:p.version,source:p.source.identity,contentHash:p.bundle?.contentHash??null,
  variety:p.variety,preset:p.settings.preset,brief:{status:p.bundle?'validated-content':p.source.deriveBrief?'seed-only; objectives/context await the existing generation request':'supplied',
    value:p.bundle?.draft.brief??p.source.brief},
  acceptance:p.acceptance,assets:{background:p.background,image:p.image,music:p.music,...(p.ambience?{ambience:p.ambience}:{})},hashes:p.hashes,blockers:p.blockers,
  inventory:p.inventory.map(({clip,...row})=>row),verifiedCacheHits:p.verifiedCacheHits,alignmentCacheHits:p.alignmentCacheHits,stages:p.stages,
  conservativeTotalUSD:p.conservativeTotalUSD,pricing:p.pricing,providerCalls:0,
  note:'Dry run: no generation, synthesis, alignment or render. Cache hits require checksum, identity, duration and decode checks; estimates for ungenerated content are conditional.'});
