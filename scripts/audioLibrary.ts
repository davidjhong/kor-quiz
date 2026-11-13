import {readFile,realpath} from 'node:fs/promises';
import {join} from 'node:path';
import {z} from 'zod';
import {LOCAL_MUSIC_IDS,AMBIENCE_IDS,renderMusicSchema,type RenderMusic} from '../src/musicLibrary.ts';
import {readJsonFile,sha256,requireWithin} from './narrationFiles.ts';
import {decodeLoopWav,assertLoopSeam,loopMetrics} from './localMusicSynthesis.ts';
export const libraryEntrySchema=z.strictObject({id:z.enum([...LOCAL_MUSIC_IDS,...AMBIENCE_IDS]),title:z.string(),kind:z.enum(['music','ambience']),
  asset:renderMusicSchema,frames:z.number().int().positive(),sampleRate:z.literal(48000),channels:z.literal(2),bits:z.literal(16),
  tempoBPM:z.number().positive().nullable(),bars:z.number().int().positive().nullable(),key:z.string().nullable(),mood:z.string(),seed:z.string(),generationVersion:z.string(),rawSha256:z.string(),
  synthesis:z.unknown(),processing:z.unknown(),runtime:z.strictObject({node:z.string(),ffmpeg:z.string(),platform:z.string()}),
  measurements:z.strictObject({integratedLUFS:z.number().finite(),truePeakDbTP:z.number().finite(),loudnessRangeLU:z.number().finite()}),seam:z.unknown(),spectral:z.unknown(),
  provenance:z.strictObject({method:z.literal('repository-procedural-synthesis'),sourceCode:z.string(),samples:z.literal('none'),paidServices:z.literal(0),rightsStatus:z.string(),attribution:z.string()})});
export const librarySchema=z.strictObject({version:z.literal('local-audio-library-v1'),entries:z.array(libraryEntrySchema)}).superRefine((p,ctx)=>{
  if(new Set(p.entries.map(e=>e.id)).size!==p.entries.length)ctx.addIssue({code:'custom',message:'Duplicate library track ID'});
  for(const e of p.entries)if((e.kind==='music')!==(LOCAL_MUSIC_IDS as readonly string[]).includes(e.id)||Math.abs(e.asset.durationSeconds-e.frames/48000)>1/48000||e.asset.durationSeconds<40||e.asset.durationSeconds>65
    ||(e.kind==='music'&&(!e.tempoBPM||!e.bars||Math.abs(e.frames/48000-e.bars*4*60/e.tempoBPM)>1/48000))
    ||Math.abs(e.measurements.integratedLUFS+20)>.6||e.measurements.truePeakDbTP> -2.95)ctx.addIssue({code:'custom',message:`${e.id}: inconsistent media/kind or unverified normalization`});
});
export type LibraryEntry=z.infer<typeof libraryEntrySchema>;
export const loadAudioLibrary=async(root:string)=>{
  const file=join(root,'public/audio/music/library.json');try{return librarySchema.parse(await readJsonFile(file));}catch(e){if((e as NodeJS.ErrnoException).code==='ENOENT')return {version:'local-audio-library-v1' as const,entries:[]};throw new Error('Local audio library is invalid; inspect public/audio/music/library.json. Do not regenerate implicitly. '+(e as Error).message);}
};
export const validateLocalBed=async(asset:RenderMusic,root:string)=>{
  const a=renderMusicSchema.parse(asset),file=await realpath(join(root,'public',a.file)).catch(()=>{throw new Error(`Missing local bed ${a.file}; restore the pinned checksum from its archive. music:generate creates missing library IDs explicitly but does not overwrite a registered pinned asset.`);});requireWithin(join(root,'public/audio/music'),file);
  const bytes=await readFile(file);if(sha256(bytes)!==a.sha256)throw new Error(`Music/ambience checksum mismatch: ${a.file}; restore pinned bytes. No implicit regeneration.`);
  const wav=decodeLoopWav(bytes);if(Math.abs(wav.durationSeconds-a.durationSeconds)>1/48000)throw new Error(`Music duration mismatch: ${a.file}`);assertLoopSeam(loopMetrics(bytes));return a;
};
export const getLibraryEntry=async(id:string,root:string,kind:'music'|'ambience')=>{
  const library=await loadAudioLibrary(root),entry=library.entries.find(e=>e.id===id&&e.kind===kind);if(!entry)throw new Error(`Missing ${kind} '${id}'; explicitly run npm run music:generate, then inspect its local auditions. Rendering never generates assets.`);
  await validateLocalBed(entry.asset,root);return entry;
};
