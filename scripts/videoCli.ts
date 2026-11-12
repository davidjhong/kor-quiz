import {randomUUID} from 'node:crypto';
import {access} from 'node:fs/promises';
import {join,resolve} from 'node:path';
import {createInterface} from 'node:readline/promises';
import {namedArguments} from './audioArguments.ts';
import {produce,type ProduceOptions,type ProductionDependencies} from './productionPipeline.ts';
import {inspectVideoJob} from './videoPlanning.ts';
import {backgroundOptionsSchema} from './backgroundImages.ts';
import {productionPresetName} from '../src/productionPresets.ts';
import {PRODUCTION_MUSIC_IDS,type ProductionMusicId} from './productionMusic.ts';
import {moneyUnits,suggestedCap,validateAuthorizationCap} from './money.ts';
import {PROJECT_ROOT} from './remotionCommand.ts';
import {checkCancellation,productionSignal} from './cancellation.ts';
import {readJsonFile} from './narrationFiles.ts';
import type {publicProductionPlan} from './productionPlan.ts';
export const VIDEO_HELP=`Usage: npm run video -- (--scenario TEXT | --brief FILE | --draft DIR | --resume ID) [options]
  --dry-run                  Zero provider calls; create a planned job or inspect resume read-only
  --job-id ID --output FILE   Optional for a new job; unique values are generated when omitted
  --voice achird|kore|FILE    Independent of artwork; Achird default
  --background auto|new|ID   Existing A behavior, no background pool policy
  --background-character "adult woman"|"adult man"|"adult traveler"
  --image-model MODEL --image-quality low|medium|high --background-reuse-limit 1..10
  --preset concise-v1|legacy-v1   NEW video default concise-v1; resumes keep stored settings
  --countdown 5               Explicit five-second override (default concise: 3 easy/medium, 4 hard)
  --music subtle-bass|none    Existing licensed bed only; --no-music also supported
  --presentation FILE --review-mode automated|manual --model MODEL --max-output-tokens N
  --max-cost-usd DECIMAL --yes   Authorize exactly that total for unattended execution
  --overwrite --recover-lock  Explicit replacement; recovery never overrides ambiguous owners
  --help                     No credentials, jobs or provider calls
Interactive runs ask for a displayed total cap. Noninteractive paid work requires BOTH cap and --yes.
Checkpoint A only: --palette, --motion, --seed, --background pool and --music auto are not implemented.`;
const valueFlags=['--scenario','--brief','--draft','--resume','--job-id','--output','--voice','--background','--background-character','--image-model','--image-quality','--background-reuse-limit',
  '--preset','--countdown','--music','--presentation','--review-mode','--model','--max-output-tokens','--max-cost-usd'];
export const parseVideoArguments=(args:string[])=>{
  if(args.includes('--help'))return {help:true as const};
  const a=namedArguments(args,valueFlags,['--dry-run','--yes','--no-music','--overwrite','--recover-lock']);
  const capText=a.values.get('--max-cost-usd'),cap=capText===undefined?undefined:moneyUnits(capText)/1e9;
  if(cap!==undefined&&cap<=0)throw new Error('--max-cost-usd must be positive');
  if(a.flags.has('--yes')&&cap===undefined)throw new Error('--yes requires an explicit numeric --max-cost-usd; no job or authorization created');
  const preset=a.values.get('--preset'),music=a.values.get('--music'),review=a.values.get('--review-mode');
  if(preset)productionPresetName.parse(preset);if(music&&!PRODUCTION_MUSIC_IDS.includes(music as ProductionMusicId))throw new Error('--music must be subtle-bass or none at Checkpoint A');
  if(review&&!['automated','manual'].includes(review))throw new Error('--review-mode must be automated or manual');
  if(a.values.has('--countdown')&&a.values.get('--countdown')!=='5')throw new Error('--countdown supports the explicit value 5; concise defaults are difficulty-based');
  const bg=a.values.get('--background'),backgroundFlags=['--background','--background-character','--image-model','--image-quality','--background-reuse-limit'];
  if(bg==='pool')throw new Error('--background pool belongs to Checkpoint B, not A');
  const backgroundOptions=backgroundFlags.some(f=>a.values.has(f))?backgroundOptionsSchema.parse({mode:bg==='new'?'new':'auto',assetId:bg&&!['new','auto'].includes(bg)?bg:undefined,
    character:a.values.get('--background-character'),model:a.values.get('--image-model'),quality:a.values.get('--image-quality'),reuseLimit:a.values.has('--background-reuse-limit')?Number(a.values.get('--background-reuse-limit')):undefined}):undefined;
  const options:ProduceOptions={scenario:a.values.get('--scenario'),brief:a.values.get('--brief'),draft:a.values.get('--draft'),resume:a.values.get('--resume'),jobId:a.values.get('--job-id'),output:a.values.get('--output'),
    voiceFile:a.values.get('--voice'),backgroundOptions,productionPreset:preset as ProduceOptions['productionPreset'],countdownSeconds:a.values.has('--countdown')?5:undefined,musicTrackId:music as ProductionMusicId|undefined,
    presentationFile:a.values.get('--presentation'),reviewMode:review as ProduceOptions['reviewMode'],model:a.values.get('--model'),maxOutputTokens:a.values.has('--max-output-tokens')?Number(a.values.get('--max-output-tokens')):undefined,
    dryRun:a.flags.has('--dry-run'),noMusic:a.flags.has('--no-music')?true:undefined,overwrite:a.flags.has('--overwrite'),recoverLock:a.flags.has('--recover-lock')};
  const sources=[options.scenario,options.brief,options.draft].filter(x=>x!==undefined).length;
  if(options.resume?sources>0:sources!==1)throw new Error('Choose --resume or exactly one of --scenario, --brief, --draft');
  if(options.resume&&options.jobId)throw new Error('--resume already selects the job; do not supply --job-id');
  return {help:false as const,options,cap,yes:a.flags.has('--yes')};
};
const exists=(p:string)=>access(p).then(()=>true,()=>false);
export const resolveVideoDestination=async(options:ProduceOptions,root:string,idFactory=()=>`video-${new Date().toISOString().slice(0,10).replaceAll('-','')}-${randomUUID().slice(0,8)}`)=>{
  if(options.resume)return options;
  for(let i=0;i<16;i++){const id=options.jobId??idFactory(),output=options.output??`out/${id}.mp4`;
    if(!await exists(join(root,'data/production-jobs',id))&&!await exists(resolve(root,output)))return {...options,jobId:id,output,productionPreset:options.productionPreset??'concise-v1'};
    if(options.jobId||options.output)throw new Error(`Job/output already exists; preserve it and use --resume ${id} or a distinct new job/output`);
  }throw new Error('Could not allocate a unique job/output; no existing files replaced');
};
export type VideoDependencies=ProductionDependencies&{interactive?:boolean;confirm?:(cap:number)=>Promise<boolean>;idFactory?:()=>string};
export const runVideo=async(args:string[],deps:VideoDependencies={})=>{
  const parsed=parseVideoArguments(args),log=deps.log??console.log;if(parsed.help){log(VIDEO_HELP);return {help:true};}
  const root=resolve(deps.root??PROJECT_ROOT),options=await resolveVideoDestination(parsed.options,root,deps.idFactory);
  options.maxCostUSD=parsed.cap; // Validate stored/requested mismatch even when authorization already exists.
  const id=options.resume??options.jobId!,resumeCommand=`npm.cmd run video -- --resume ${id}`;
  const show=(p:ReturnType<typeof publicProductionPlan>,job:{jobId:string;maxCostUSD?:number;config?:ProduceOptions&{voiceFile?:string;musicTrackId?:string}})=>{
    log(`Job: ${job.jobId}\nResume: npm.cmd run video -- --resume ${job.jobId}`);
    log(JSON.stringify({stageReservationBounds:p.stages,conservativeTotalUSD:p.conservativeTotalUSD,suggestedTotalCapUSD:suggestedCap(p.conservativeTotalUSD),storedAuthorizationUSD:job.maxCostUSD,blockers:p.blockers},null,2));
    log('Reservation bounds are not historical actual estimates. Image allowances are not provider-enforced maximum bills.');
    log(JSON.stringify({selection:{background:p.assets.background?.id??p.assets.image?.binding.assetId,
      voiceProfile:job.config?.voiceFile,preset:p.preset.id,palette:'legacy cream-navy (unchanged)',motion:'existing restrained display motion (unchanged)',
      music:p.assets.music?{id:job.config?.musicTrackId??'subtle-bass',...p.assets.music}:null}},null,2));
  };
  if(options.resume&&options.dryRun){const p=await inspectVideoJob(id,root,deps,options);show(p,{jobId:id,maxCostUSD:p.storedCapUSD,config:{voiceFile:p.voiceProfileId,musicTrackId:p.musicTrackId as ProductionMusicId}});log(JSON.stringify({readiness:p.readiness,renderStatus:p.renderStatus,timing:p.timing},null,2));return {...p,dryRun:true,resumeCommand};}
  const result=await produce(options,{...deps,root,onPlan:show,authorize:async(p,job)=>{
    const cap=parsed.cap??suggestedCap(p.conservativeTotalUSD);validateAuthorizationCap(cap,p.conservativeTotalUSD,job.maxCostUSD);
    if(parsed.yes){checkCancellation();return cap;}
    if(!(deps.interactive??(!!process.stdin.isTTY&&!!process.stdout.isTTY)))throw new Error(`Confirmation needed. Resume interactively: ${resumeCommand}; or authorize exactly --max-cost-usd CAP --yes. Job remains unauthorised.`);
    let accepted:boolean;if(deps.confirm)accepted=await deps.confirm(cap);else{const reader=createInterface({input:process.stdin,output:process.stdout});try{accepted=/^y(?:es)?$/iu.test((await reader.question(`Authorize exactly $${cap.toFixed(9).replace(/0+$/u,'').replace(/\.$/u,'')} TOTAL for ${id}? [y/N] `,{signal:productionSignal()})).trim());}finally{reader.close();}}
    checkCancellation();if(!accepted)throw new Error('Authorization declined; planned job remains unauthorised');return cap;
  }});
  if(options.dryRun){const p=await inspectVideoJob(id,root,deps);log(JSON.stringify({readiness:p.readiness,blockers:p.blockers,resumeCommand},null,2));return {...result,readiness:p.readiness,blockers:p.blockers,resumeCommand};}
  log(JSON.stringify(result,null,2));if('report'in result&&result.report){const report=await readJsonFile(String(result.report)) as Record<string,unknown>;
    log(JSON.stringify({usageVersusReservations:report.costs,invoiceInspected:false,timing:report.timingBreakdown??report.timeline,voice:report.voice,presentation:report.presentation,
      productionPreset:report.productionPreset,verification:report.verification,subjectiveChecks:report.viewing},null,2));}
  if('output'in result){log(`Output: ${result.output}`);log(`Start-Process -FilePath '${String(result.output).replaceAll("'","''")}'`);}return result;
};
