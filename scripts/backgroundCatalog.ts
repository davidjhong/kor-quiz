import {readFile,mkdir,open,rename,unlink,readdir,stat} from 'node:fs/promises';
import {join} from 'node:path';
import {realpathSync} from 'node:fs';
import {z} from 'zod';
import {BACKGROUND_ASSETS,SCENARIO_TYPES,registerCatalogBackgrounds} from '../src/assets/backgrounds.ts';
import {renderBackgroundSchema,type RenderBackground} from '../src/assets/backgroundSchema.ts';
import {readJsonFile,sha256,requireWithin,canonical} from './narrationFiles.ts';
import {runRemotion} from './remotionCommand.ts';

export const BACKGROUND_STYLE='warm-painted-animation-v1';
const unique=z.array(z.string().min(1)).refine(a=>new Set(a).size===a.length,'Duplicate completed episode ID');
export const catalogEntrySchema=z.strictObject({render:renderBackgroundSchema,setting:z.enum(SCENARIO_TYPES),tags:z.array(z.string().min(1)).min(1),
  style:z.literal(BACKGROUND_STYLE),composition:z.string().min(1),prompt:z.string().nullable(),model:z.string().nullable(),settings:z.unknown(),
  width:z.number().int().positive(),height:z.number().int().positive(),format:z.literal('png'),receipt:z.string().nullable(),
  reportedUsage:z.unknown(),estimatedCostUSD:z.number().nonnegative().nullable(),completedEpisodeIds:unique,createdAt:z.string()});
export type CatalogEntry=z.infer<typeof catalogEntrySchema>;
export const catalogSchema=z.strictObject({version:z.literal(1),entries:z.array(catalogEntrySchema),legacyUsage:z.record(z.string(),unique)})
  .superRefine((c,ctx)=>{const ids=c.entries.map(a=>a.render.id);if(new Set(ids).size!==ids.length)ctx.addIssue({code:'custom',message:'Duplicate catalog asset ID'});
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
  for(const id of await readdir(join(root,'data/production-jobs')).catch(()=>[])){
    const j=await readOptional(join(root,'data/production-jobs',id,'job.json')) as {kind?:string;state?:string;narration?:{segments?:{role:string;contentId:string}[]};assets?:{background?:{id?:string}}}|null;
    if(j?.state!=='complete'||j.kind==='question-preview')continue;
    const asset=j.assets?.background?.id,episode=j.narration?.segments?.find(s=>s.role==='hook')?.contentId;
    if(asset&&episode&&Object.hasOwn(BACKGROUND_ASSETS,asset))catalog.legacyUsage[asset]=[...new Set([...(catalog.legacyUsage[asset]??[]),episode])];
  }
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
export const mutateCatalog=async(root:string,change:(c:BackgroundCatalog)=>void)=>{
  const file=catalogFile(root);await mkdir(join(file,'..'),{recursive:true});const lock=await open(file+'.lock','wx').catch(()=>{throw new Error('Background catalog is locked; inspect the active process before retrying');});
  try{const c=await loadBackgroundCatalog(root);change(c);await writePrivateJson(file,catalogSchema.parse(c));await loadBackgroundCatalog(root);}
  finally{await lock.close();await unlink(file+'.lock');}
};
export const registerGeneratedBackground=async(root:string,entry:CatalogEntry)=>mutateCatalog(root,c=>{
  const prior=c.entries.find(a=>a.render.id===entry.render.id);
  if(prior){if(canonical({...prior,completedEpisodeIds:[]})!==canonical({...entry,completedEpisodeIds:[]}))throw new Error('Immutable background receipt changed');return;}
  c.entries.push(entry);
});
export const recordCompletedBackgroundUse=async(root:string,assetId:string,episodeId:string,preview=false)=>{
  if(preview)return;await mutateCatalog(root,c=>{const entry=c.entries.find(a=>a.render.id===assetId);
    const list=entry?entry.completedEpisodeIds:(c.legacyUsage[assetId]??=[]);if(!list.includes(episodeId))list.push(episodeId);});
};
/** Decode the actual PNG, rather than trusting its extension or header alone. */
export const inspectBackgroundPNG=async(file:string,root:string)=>{
  const real=realpathSync(file);requireWithin(root,real);const b=await readFile(real);
  if(b.length<45||!b.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]))||b.subarray(-8,-4).toString('ascii')!=='IEND')throw new Error('Background is not a complete PNG; restore saved image bytes');
  const width=b.readUInt32BE(16),height=b.readUInt32BE(20);if(width<1||height<1||width*height>16_000_000)throw new Error('Invalid PNG dimensions');
  await runRemotion(['ffmpeg','-v','error','-xerror','-i',real,'-frames:v','1','-c:v','rawvideo','-f','null','-'],true,30000);
  return {width,height,format:'png' as const,sha256:sha256(b)};
};
