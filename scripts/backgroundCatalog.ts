import {readFile,mkdir,open,rename,readdir,stat} from 'node:fs/promises';
import {join} from 'node:path';
import {realpathSync} from 'node:fs';
import {z} from 'zod';
import {BACKGROUND_ASSETS,SCENARIO_TYPES,registerCatalogBackgrounds} from '../src/assets/backgrounds.ts';
import {renderBackgroundSchema,type RenderBackground} from '../src/assets/backgroundSchema.ts';
import {readJsonFile,sha256,requireWithin,canonical} from './narrationFiles.ts';
import {runRemotion} from './remotionCommand.ts';
import {acquireJobLock} from './jobLocks.ts';

export const BACKGROUND_STYLE='warm-painted-animation-v1';
export const varietyUseSchema=z.strictObject({episodeId:z.string(),background:z.string(),palette:z.string(),motion:z.string(),music:z.string()});
const unique=z.array(z.string().min(1)).refine(a=>new Set(a).size===a.length,'Duplicate completed episode ID');
export const catalogEntrySchema=z.strictObject({render:renderBackgroundSchema,setting:z.enum(SCENARIO_TYPES),tags:z.array(z.string().min(1)).min(1),
  style:z.literal(BACKGROUND_STYLE),composition:z.string().min(1),prompt:z.string().nullable(),model:z.string().nullable(),settings:z.unknown(),
  width:z.number().int().positive(),height:z.number().int().positive(),format:z.literal('png'),receipt:z.string().nullable(),
  reportedUsage:z.unknown(),estimatedCostUSD:z.number().nonnegative().nullable(),completedEpisodeIds:unique,createdAt:z.string(),
  variety:z.strictObject({composition:z.literal('quiz-safe-v1'),character:z.string(),descriptor:z.string()}).optional()});
export type CatalogEntry=z.infer<typeof catalogEntrySchema>;
export const catalogSchema=z.strictObject({version:z.literal(1),entries:z.array(catalogEntrySchema),legacyUsage:z.record(z.string(),unique),varietyHistory:z.array(varietyUseSchema).optional()})
  .superRefine((c,ctx)=>{const ids=c.entries.map(a=>a.render.id);if(new Set(ids).size!==ids.length)ctx.addIssue({code:'custom',message:'Duplicate catalog asset ID'});
    const episodes=c.varietyHistory?.map(h=>h.episodeId)??[];if(new Set(episodes).size!==episodes.length)ctx.addIssue({code:'custom',message:'Duplicate distinct completed episode in variety history'});
    for(const a of c.entries){if(Object.hasOwn(BACKGROUND_ASSETS,a.render.id)||a.render.scenarioType!==a.setting)ctx.addIssue({code:'custom',message:'Catalog setting/legacy identity mismatch'});}});
export type BackgroundCatalog=z.infer<typeof catalogSchema>;
export const catalogFile=(root:string)=>join(root,'data/background-assets/catalog.json');
/** Catalogs and base64 image receipts need their own bounded size, not the content JSON ceiling. */
export const readPrivateJson=async(file:string,maximumBytes:number)=>{
  const info=await stat(file);if(!info.isFile()||info.size>maximumBytes)throw new Error(`Private image/catalog JSON exceeds its ${maximumBytes}-byte limit: ${file}`);
  return JSON.parse((await readFile(file,'utf8')).replace(/^\uFEFF/u,'')) as unknown;
};
export const writePrivateJson=async(file:string,value:unknown)=>{
  await mkdir(join(file,'..'),{recursive:true});const temp=file+`.${process.pid}.tmp`,h=await open(temp,'w');
  try{await h.writeFile(JSON.stringify(value,null,2));await h.sync();}finally{await h.close();}await rename(temp,file);
};
const readOptional=async(file:string)=>readJsonFile(file).catch((e:NodeJS.ErrnoException)=>{if(e.code==='ENOENT')return null;throw e;});
export const loadBackgroundCatalog=async(root:string)=>{
  const raw=await readPrivateJson(catalogFile(root),16*1024*1024).catch((e:NodeJS.ErrnoException)=>{if(e.code==='ENOENT')return null;throw e;}),catalog=catalogSchema.parse(raw??{version:1,entries:[],legacyUsage:{}});
  // Account for already completed full episodes when migrating the static registry. Reading is zero-call.
  const completed:({episodeId:string;background:string;palette:string;motion:string;music:string;at:string})[]=[];
  for(const id of await readdir(join(root,'data/production-jobs')).catch(()=>[])){
    const j=await readOptional(join(root,'data/production-jobs',id,'job.json')) as {kind?:string;state?:string;narration?:{segments?:{role:string;contentId:string}[]};assets?:{background?:{id?:string}};updatedAt?:string;renderCertificate?:string;config?:{variety?:{palette:{selected:string};motion:{selected:string};music:{selected:string}};noMusic?:boolean}}|null;
    if(j?.state!=='complete'||j.kind==='question-preview')continue;
    const asset=j.assets?.background?.id,episode=j.narration?.segments?.find(s=>s.role==='hook')?.contentId;
    // Historical completion order comes from its immutable render certificate,
    // not a later resume's mutable updatedAt. No historical file is rewritten.
    const at=j.renderCertificate?await stat(j.renderCertificate).then(s=>s.mtime.toISOString(),()=>j.updatedAt??''):j.updatedAt??'';
    if(asset&&episode)completed.push({episodeId:episode,background:asset,palette:j.config?.variety?.palette.selected??'cream-navy',motion:j.config?.variety?.motion.selected??'legacy-display',music:j.config?.variety?.music.selected??(j.config?.noMusic?'none':'subtle-bass'),at});
    if(asset&&episode){const entry=catalog.entries.find(e=>e.render.id===asset),list=entry?entry.completedEpisodeIds:(catalog.legacyUsage[asset]??=[]);if(!list.includes(episode))list.push(episode);}
  }
  for(const {at,...use} of completed.sort((a,b)=>a.at.localeCompare(b.at)||a.episodeId.localeCompare(b.episodeId))){if(!catalog.varietyHistory?.some(h=>h.episodeId===use.episodeId))(catalog.varietyHistory??=[]).push(use);}
  registerCatalogBackgrounds(catalog.entries.map(e=>({id:e.render.id,asset:e.render})));
  return catalog;
};
export const catalogAsset=async(id:string|undefined,root:string):Promise<RenderBackground|undefined>=>{
  if(!id)return undefined;const c=await loadBackgroundCatalog(root),generated=c.entries.find(a=>a.render.id===id);if(generated)return generated.render;
  const a=Object.entries(BACKGROUND_ASSETS).find(([key])=>key===id)?.[1];if(!a)throw new Error(`Background ${id} is not in the validated local catalog`);
  return renderBackgroundSchema.parse({id,file:a.file,scenarioLabel:a.scenarioLabel,scenarioType:a.scenarioType,selection:a.selection,
    sha256:a.sha256??sha256(await readFile(join(root,'public',a.file))),framing:a.framing??{scale:1.12,origin:'50% 0%'}});
};
export const selectCatalogAsset=(catalog:BackgroundCatalog,setting:typeof SCENARIO_TYPES[number],options:{limit?:number;explicit?:string;fresh?:boolean;episodeId?:string}={})=>{
  const limit=options.limit??5;if(!Number.isInteger(limit)||limit<1||limit>10)throw new Error('Background reuse limit must be 1–10 completed episodes');
  if(options.explicit&&options.fresh)throw new Error('Choose an explicit background or request a new image, not both');
  const generated=catalog.entries.filter(e=>e.setting===setting&&e.style===BACKGROUND_STYLE);
  const legacy=Object.entries(BACKGROUND_ASSETS).filter(([,a])=>a.scenarioType===setting).map(([id,a])=>({render:{id,...a},completedEpisodeIds:catalog.legacyUsage[id]??[]}));
  const matches=[...generated,...legacy];
  if(options.explicit){const a=matches.find(a=>a.render.id===options.explicit);if(!a)throw new Error('Explicit background must be registered and match the scenario setting');return a.render.id;}
  if(options.fresh)return null;
  return matches.filter(a=>a.completedEpisodeIds.length<limit||a.completedEpisodeIds.includes(options.episodeId??''))
    .sort((a,b)=>a.completedEpisodeIds.length-b.completedEpisodeIds.length||Number(a.render.id==='korean-cafe-v1')-Number(b.render.id==='korean-cafe-v1')||a.render.id.localeCompare(b.render.id))[0]?.render.id??null;
};
export const withCatalogLock=async<T>(root:string,work:()=>Promise<T>):Promise<T>=>{
  // Keep the legacy lock respected during transition; never remove another owner's lock.
  if(await stat(catalogFile(root)+'.lock').then(()=>true,()=>false))throw new Error('Legacy background catalog lock exists; inspect its owner');
  let release:(()=>Promise<void>)|undefined;
  for(let i=0;i<60;i++){try{release=await acquireJobLock(join(root,'data/background-assets/.shared-lock'));break;}
    catch(e){if(!/matching PID|acquisition\/recovery is already running/u.test((e as Error).message)||i===59)throw e;await new Promise(r=>setTimeout(r,50));}}
  if(!release)throw new Error('Background catalog remains busy');try{return await work();}finally{await release();}
};
export const mutateCatalog=async(root:string,change:(c:BackgroundCatalog)=>void)=>withCatalogLock(root,async()=>{
  const c=await loadBackgroundCatalog(root);change(c);await writePrivateJson(catalogFile(root),catalogSchema.parse(c));await loadBackgroundCatalog(root);
});
export const registerGeneratedBackground=async(root:string,entry:CatalogEntry)=>mutateCatalog(root,c=>{
  const prior=c.entries.find(a=>a.render.id===entry.render.id);
  if(prior){if(canonical({...prior,completedEpisodeIds:[]})!==canonical({...entry,completedEpisodeIds:[]}))throw new Error('Immutable background receipt changed');return;}
  c.entries.push(entry);
});
export const recordCompletedBackgroundUse=async(root:string,assetId:string,episodeId:string,preview=false)=>{
  if(preview)return;await mutateCatalog(root,c=>{const entry=c.entries.find(a=>a.render.id===assetId);
    const list=entry?entry.completedEpisodeIds:(c.legacyUsage[assetId]??=[]);if(!list.includes(episodeId))list.push(episodeId);});
};
/** One atomic catalog commit for usage and variety. Dry planning never calls this. */
export const recordCompletedVarietyUse=async(root:string,use:z.infer<typeof varietyUseSchema>,preview=false)=>{
  if(preview)return;await mutateCatalog(root,c=>{
    const history=c.varietyHistory??=[];
    const prior=history.find(x=>x.episodeId===use.episodeId);
    if(!prior)history.push(varietyUseSchema.parse(use));
    // A new render of the same episode is not another distinct episode.
    if(prior&&canonical(prior)!==canonical(use))return;
    const entry=c.entries.find(e=>e.render.id===use.background),list=entry?entry.completedEpisodeIds:(c.legacyUsage[use.background]??=[]);
    if(!list.includes(use.episodeId))list.push(use.episodeId);
  });
};
/** Decode the actual PNG, rather than trusting its extension or header alone. */
export const inspectBackgroundPNG=async(file:string,root:string)=>{
  const real=realpathSync(file);requireWithin(root,real);const b=await readFile(real);
  if(b.length<45||!b.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]))||b.subarray(-8,-4).toString('ascii')!=='IEND')throw new Error('Background is not a complete PNG; restore saved image bytes');
  const width=b.readUInt32BE(16),height=b.readUInt32BE(20);if(width<1||height<1||width*height>16_000_000)throw new Error('Invalid PNG dimensions');
  await runRemotion(['ffmpeg','-v','error','-xerror','-i',real,'-frames:v','1','-c:v','rawvideo','-f','null','-'],true,30000);
  return {width,height,format:'png' as const,sha256:sha256(b)};
};
