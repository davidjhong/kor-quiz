import {access,mkdir,mkdtemp,readFile,rm} from 'node:fs/promises';
import {join} from 'node:path';
import {spawn} from 'node:child_process';
import {namedArguments} from './audioArguments.ts';
import {loadComparison,verifyBaseline} from './comparisonWorkflow.ts';
import {atomicJson} from './draftWorkflow.ts';
import {readJsonFile,sha256,requireWithin} from './narrationFiles.ts';
import {preparedNarrationSchema} from '../src/narration.ts';
import {ALIGNMENT_CONFIG} from '../src/phraseCaptions.ts';
import {getComparisonTimeline} from '../src/comparison.ts';
import {alignmentKey,loadAlignedPhrases,readAlignment} from './captionAlignment.ts';
import {PROJECT_ROOT} from './remotionCommand.ts';
const main=async()=>{
  const args=namedArguments(process.argv.slice(2),['--config','--profile'],['--force']);
  const input=await loadComparison(args.values.get('--config')),id=args.values.get('--profile')??'c-achird';
  if(!input.profiles.some(p=>p.id===id))throw new Error('Unknown profile');
  const saved=await readJsonFile(join(PROJECT_ROOT,'public/audio/voice-comparison/transit-01',id+'.json')) as {narration:unknown;planHash:string};
  if(saved.planHash!==input.planHash)throw new Error('Prepared comparison narration is stale');
  const narration=preparedNarrationSchema.parse(saved.narration),missing=[];let hits=0;
  for(const clip of narration.clips){
    if(sha256(await readFile(join(PROJECT_ROOT,'public',clip.file)))!==clip.sha256)throw new Error(`${clip.id}: corrupt cached audio`);
    if(!args.flags.has('--force') && await readAlignment(clip).then(()=>true,()=>false))hits++;
    else missing.push({...clip,key:alignmentKey(clip),audioSha256:clip.sha256,transcript:clip.text,
      file:join(PROJECT_ROOT,'public',clip.file)});
  }
  await mkdir(join(PROJECT_ROOT,'.audio-cache/caption-alignments'),{recursive:true});
  if(missing.length){
    const python=join(PROJECT_ROOT,'.audio-cache/alignment-venv/Scripts/python.exe');
    await access(python).catch(()=>{throw new Error('Missing local alignment environment; see docs/phase5c-phrase-captions.md setup commands');});
    const temporary=await mkdtemp(join(PROJECT_ROOT,'.audio-cache/alignment-job-'));
    try{
      const job=join(temporary,'job.json');await atomicJson(job,{configuration:ALIGNMENT_CONFIG,clips:missing,
        cacheDirectory:join(PROJECT_ROOT,'.audio-cache/caption-alignments'),modelDirectory:join(PROJECT_ROOT,'.audio-cache/whisper')});
      await new Promise<void>((ok,fail)=>{const child=spawn(python,[join(PROJECT_ROOT,'scripts/alignNarration.py'),job],
        {cwd:PROJECT_ROOT,shell:false,windowsHide:true,stdio:['ignore','inherit','inherit']});
        child.on('error',fail);child.on('close',code=>code===0?ok():fail(new Error('Local alignment failed; see its diagnostics. Rendering has not started.')));});
    }finally{requireWithin(join(PROJECT_ROOT,'.audio-cache'),temporary);await rm(temporary,{recursive:true,force:true});}
  }
  const t=getComparisonTimeline(input.bundle.quiz,input.questionIndex,narration,input.bonusReadingFrames);
  const phrases=await loadAlignedPhrases(narration.clips,t.audio,input.config.captionPhrases,t.question.revealStart,[narration.clips[4].contentId]);
  await verifyBaseline();
  const report={profile:id,configuration:ALIGNMENT_CONFIG,cacheHits:hits,newLocalAlignments:missing.length,providerCalls:0,
    estimatedPaidCostUSD:0,phrases,clips:await Promise.all(narration.clips.map(c=>readAlignment(c)))};
  await atomicJson(join(PROJECT_ROOT,'out/phase5c/c-phrases/alignment-report.json'),report);
  console.log(`Aligned ${missing.length} local clips; ${hits} cache hits; ${phrases.length} phrases; zero paid calls.`);
};
main().catch((e:unknown)=>{console.error(e instanceof Error?e.message:'Alignment failed');process.exitCode=1;});
