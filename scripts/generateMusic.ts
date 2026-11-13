import {mkdir,readFile,writeFile,open} from 'node:fs/promises';
import {join} from 'node:path';
import {RECIPES,synthesizeMusic,rawIdentity,decodeLoopWav,encodeWav,loopMetrics,assertLoopSeam,MUSIC_PROCESSING,type LocalAudioId} from './localMusicSynthesis.ts';
import {librarySchema,loadAudioLibrary,validateLocalBed,type LibraryEntry} from './audioLibrary.ts';
import {musicSpectrum} from './musicSpectrum.ts';
import {canonical,sha256} from './narrationFiles.ts';
import {atomicJson} from './draftWorkflow.ts';
import {measureAudio} from './audioMeter.ts';
import {PROJECT_ROOT,runRemotion} from './remotionCommand.ts';
import {acquireJobLock} from './jobLocks.ts';
import {namedArguments} from './audioArguments.ts';
export const DEFAULT_MUSIC_SEED='korean-quiz-local-library-v1';
const immutable=async(file:string,bytes:Buffer)=>{try{const h=await open(file,'wx');try{await h.writeFile(bytes);await h.sync();}finally{await h.close();}}
  catch(e){if((e as NodeJS.ErrnoException).code!=='EEXIST')throw e;if(sha256(await readFile(file))!==sha256(bytes))throw new Error(`Immutable local audio differs: ${file}; preserve the existing version`);}};
export const generateMusicLibrary=async(root=PROJECT_ROOT,seed=DEFAULT_MUSIC_SEED)=>{
  if(!seed.trim()||seed.length>128)throw new Error('Music seed must contain 1–128 characters');
  const release=await acquireJobLock(join(root,'data/audio-assets/library-lock'));
  try{
    const library=await loadAudioLibrary(root),ffmpeg=(await runRemotion(['ffmpeg','-version'],true,30000)).split(/\r?\n/u)[0];
    const report=[];await mkdir(join(root,'public/audio/music'),{recursive:true});
    for(const id of Object.keys(RECIPES) as LocalAudioId[]){
      const existing=library.entries.find(e=>e.id===id);
      if(existing){if(existing.seed!==seed||canonical(existing.synthesis)!==canonical(rawIdentity(id,seed)))throw new Error(`${id}: library identity already exists with another seed/version. Preserve it; use a deliberately new library version/ID.`);
        await validateLocalBed(existing.asset,root);report.push({id,reused:true,...existing.measurements});continue;}
      const raw=synthesizeMusic(id,seed),recipe=RECIPES[id],hash=sha256(canonical({identity:raw.identity,processing:MUSIC_PROCESSING}));
      const folder=join(root,'data/audio-assets',id,hash);await mkdir(folder,{recursive:true});const rawFile=join(folder,'raw.wav');await immutable(rawFile,raw.bytes);assertLoopSeam(loopMetrics(raw.bytes));
      const before=await measureAudio(rawFile),gainDb=Math.min(MUSIC_PROCESSING.targetLUFS-before.integratedLUFS,-3.05-before.truePeakDbTP);
      if(Math.abs(before.integratedLUFS+gainDb+20)>.6)throw new Error(`${id}: raw crest factor cannot reach -20 ±0.6 LUFS with -3 dBTP headroom; revise synthesis, never bypass the check`);
      // A single measured static gain preserves the periodic seam. Full-video
      // mixes still use the normal two-pass loudnorm finalizer.
      const decoded=decodeLoopWav(raw.bytes),processed=encodeWav(decoded.left,decoded.right,10**(gainDb/20));
      const file=`audio/music/${id}-${hash.slice(0,12)}.wav`,output=join(root,'public',file);await immutable(output,processed);
      const measured=await measureAudio(output);if(Math.abs(measured.integratedLUFS+20)>.6||measured.truePeakDbTP> -2.95)throw new Error(`${id}: normalized music failed loudness/peak checks`);
      const seam=loopMetrics(processed);assertLoopSeam(seam);
      const entry:LibraryEntry={id,title:recipe.title,kind:recipe.kind,asset:{file,sha256:sha256(processed),durationSeconds:raw.durationSeconds,mixTrimDb:recipe.trimDb,mixVersion:'local-bed-trim-v1'},
        frames:raw.frames,sampleRate:48000,channels:2,bits:16,tempoBPM:recipe.bpm,bars:recipe.bars,key:recipe.key,mood:recipe.mood,seed,generationVersion:raw.identity.version,rawSha256:raw.rawSha256,
        synthesis:raw.identity,processing:{...MUSIC_PROCESSING,gainDb,before,seamStrategy:'circular note tails; duration-preserving periodic noise overlap; static gain; no temporal compression'},
        runtime:{node:process.version,ffmpeg,platform:process.platform},measurements:{integratedLUFS:measured.integratedLUFS,truePeakDbTP:measured.truePeakDbTP,loudnessRangeLU:measured.loudnessRangeLU},
        seam,spectral:musicSpectrum(processed),provenance:{method:'repository-procedural-synthesis',sourceCode:'scripts/localMusicSynthesis.ts',samples:'none',paidServices:0,
          rightsStatus:'Repository-generated procedural asset. No third-party samples or rights clearance claimed; copyright and Content ID risk are not guaranteed absent.',attribution:'No third-party attribution requirement identified; retain this generation provenance.'}};
      await atomicJson(join(folder,'build.json'),{entry,rawFile,rawSha256:raw.rawSha256,processedSha256:entry.asset.sha256,providerCalls:0});
      library.entries.push(entry);await atomicJson(join(root,'public/audio/music/library.json'),librarySchema.parse(library));report.push({id,reused:false,...entry.measurements});
    }
    return {version:'music-library-build-v1',seed,providerCalls:0,entries:report};
  }finally{await release();}
};
if(process.argv[1]?.replaceAll('\\','/').endsWith('/generateMusic.ts')){
  const args=namedArguments(process.argv.slice(2),['--seed'],['--help']);if(args.flags.has('--help'))console.log('npm run music:generate -- [--seed TEXT]\nExplicit local-only library build; never called by rendering. Existing IDs/bytes are preserved.');
  else generateMusicLibrary(PROJECT_ROOT,args.values.get('--seed')??DEFAULT_MUSIC_SEED).then(r=>console.log(JSON.stringify(r,null,2))).catch(e=>{console.error((e as Error).message);process.exitCode=1;});
}
