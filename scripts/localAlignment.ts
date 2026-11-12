import {access,mkdir,mkdtemp,rm} from 'node:fs/promises';
import {spawn} from 'node:child_process';
import {join} from 'node:path';
import {ALIGNMENT_CONFIG} from '../src/phraseCaptions.ts';
import type {PreparedClip} from '../src/narration.ts';
import {alignmentKey,readAlignment} from './captionAlignment.ts';
import {groupAlignedText,GROUPING_CONFIG} from './productionCaptions.ts';
import {atomicJson} from './draftWorkflow.ts';
import {requireWithin} from './narrationFiles.ts';
import {checkCancellation,ownWorker} from './cancellation.ts';
export const prepareLocalAlignments=async(clips:PreparedClip[],root:string)=>{
  const missing:unknown[]=[];let cacheHits=0;
  for(const clip of clips){const file=join(root,'.audio-cache/caption-alignments',alignmentKey(clip)+'.json');
    const present=await access(file).then(()=>true,(e:NodeJS.ErrnoException)=>{if(e.code==='ENOENT')return false;throw e;});
    if(present){try{groupAlignedText(await readAlignment(clip,root),GROUPING_CONFIG,clip.id);cacheHits++;}
      catch(e){throw new Error(`${clip.id}: saved alignment/grouping is unusable; raw cache preserved, no automatic overwrite. Restore/archive it before explicit local repair. ${e instanceof Error?e.message:''}`);}}
    else missing.push({...clip,key:alignmentKey(clip),audioSha256:clip.sha256,transcript:clip.text,file:join(root,'public',clip.file)});}
  if(missing.length){
    checkCancellation();
    const python=join(root,'.audio-cache/alignment-venv/Scripts/python.exe');
    await access(python).catch(()=>{throw new Error('Missing local alignment environment. Install scripts/alignment-requirements.txt into .audio-cache/alignment-venv; no paid fallback is used');});
    const base=join(root,'.audio-cache');await mkdir(join(base,'caption-alignments'),{recursive:true});
    const temporary=await mkdtemp(join(base,'production-alignment-'));
    try{const file=join(temporary,'job.json');await atomicJson(file,{configuration:ALIGNMENT_CONFIG,clips:missing,cacheDirectory:join(base,'caption-alignments'),modelDirectory:join(base,'whisper')});
      await new Promise<void>((ok,fail)=>{const child=spawn(python,[join(root,'scripts/alignNarration.py'),file],{cwd:root,shell:false,windowsHide:true,stdio:['ignore','inherit','inherit']});
        ownWorker(child);
        child.on('error',fail);child.on('close',code=>code===0?ok():fail(new Error('Local alignment failed; inspect the affected segment. No evenly distributed timing fallback is permitted')));});
    }finally{requireWithin(base,temporary);await rm(temporary,{recursive:true,force:true});}
  }
  const phraseAnchoredArticles:{clipId:string;text:string;atSeconds:number}[]=[],unlocatedWords:{clipId:string;text:string;boundarySeconds:number;individualTimingMeasured:false}[]=[];
  for(const clip of clips){try{const a=await readAlignment(clip,root);groupAlignedText(a);
    for(const word of a.words.filter(w=>w.end===w.start)){unlocatedWords.push({clipId:clip.id,text:word.text.trim(),boundarySeconds:word.start,individualTimingMeasured:false});
      if(a.language==='en-US'&&/^(?:a|an|the)[,.!?]?$/iu.test(word.text.trim()))phraseAnchoredArticles.push({clipId:clip.id,text:word.text.trim(),atSeconds:word.start});}
  }catch(e){throw new Error(`${clip.id}: unusable local alignment: ${e instanceof Error?e.message:'validation failed'}`);}}
  return {cacheHits,newLocalAlignments:missing.length,providerCalls:0,phraseAnchoredArticles,unlocatedWords};
};
