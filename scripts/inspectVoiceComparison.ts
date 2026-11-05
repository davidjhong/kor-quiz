import assert from 'node:assert/strict';
import {mkdir, readFile, stat} from 'node:fs/promises';
import {join} from 'node:path';
import {atomicJson} from './draftWorkflow.ts';
import {canonical, readJsonFile, sha256} from './narrationFiles.ts';
import {PROJECT_ROOT, runRemotion} from './remotionCommand.ts';
import {loadComparison, verifyBaseline} from './comparisonWorkflow.ts';
import {comparisonPropsSchema, getComparisonTimeline} from '../src/comparison.ts';
import {getExplanationCaption, getSynchronizedCta} from '../src/presentation.ts';
import {inspectNarratedVideo} from './mediaInspection.ts';
const input=await loadComparison(), folder=join(PROJECT_ROOT,'out/phase5c');
await verifyBaseline();
const profiles=[]; let content:string|undefined, settings:string|undefined, bed:string|undefined;
for(const profile of input.profiles){
  const id=profile.id, props=comparisonPropsSchema.parse(await readJsonFile(join(folder,`${id}.props.json`)));
  const video=join(folder,`${id}.mp4`), t=getComparisonTimeline(props.quiz,props.questionIndex,props.narration);
  const check=await readJsonFile(join(folder,`${id}.render-check.json`)) as {fullDecode:string;finalMixedAudio:{integratedLUFS:number;truePeakDbTP:number;loudnessRangeLU:number}};
  const identity=canonical({quiz:props.quiz,questionIndex:props.questionIndex,speech:props.narration.clips.map(({text,role,language})=>({text,role,language}))});
  if(content)assert.equal(content,identity);else content=identity;
  if(settings)assert.equal(settings,canonical(props.presentation));else settings=canonical(props.presentation);
  if(bed)assert.equal(bed,props.music?.sha256);else bed=props.music?.sha256;
  assert.equal(check.fullDecode,'PASS'); assert(check.finalMixedAudio.truePeakDbTP<0);
  assert.equal(t.question.revealStart-t.question.countdownStart,150);
  assert(t.question.countdownStart >= t.audio[1].end+15); assert(t.question.countdownStart >=t.question.start+120);
  assert.equal(t.ending.followStart-t.ending.commentEnd,45);assert.equal(t.ending.end-t.ending.followEnd,30);
  assert.equal(t.durationInFrames-t.ending.end,12);
  for(let i=0;i<t.audio.length;i++){
    assert.equal(t.audio[i].end-t.audio[i].start,Math.ceil(t.audio[i].durationSeconds*30));
    assert(t.audio[i].end<=t.durationInFrames);if(i)assert(t.audio[i].start>=t.audio[i-1].end);
  }
  assert.deepEqual(t.audio.filter(c=>c.contentId===props.narration.clips[4].contentId).map(c=>c.role),['comment','follow']);
  const e=t.audio.find(c=>c.role==='explanation')!, qid=props.quiz.questions[props.questionIndex].id;
  assert(e.start>t.question.revealStart);
  assert.equal(getExplanationCaption(e.start-1,qid,t.audio),null);assert.equal(getExplanationCaption(e.start,qid,t.audio),e.text);
  assert.equal(getExplanationCaption(e.end,qid,t.audio),null);
  assert.equal(getSynchronizedCta(t.ending.commentStart-1,t.audio,props.narration.clips[4].contentId),null);
  assert.equal(getSynchronizedCta(t.ending.followStart,t.audio,props.narration.clips[4].contentId),'follow');
  const metadata=await inspectNarratedVideo(video,t.durationInFrames,t.speechEnd);
  const probe=JSON.parse(await runRemotion(['ffprobe','-v','error','-show_entries',
    'stream=codec_name,codec_type,width,height,pix_fmt,avg_frame_rate,nb_frames,duration,sample_rate,channels:format=duration,size','-of','json',video],true,30000));
  const frames=[{name:'opening',frame:30},{name:'question-reading',frame:t.question.start+45},
    {name:'countdown',frame:t.question.countdownStart},{name:'before-reveal',frame:t.question.revealStart-1},
    {name:'korean-answer',frame:t.question.revealStart+15},{name:'before-caption',frame:e.start-1},
    {name:'caption-start',frame:e.start},{name:'caption-middle',frame:Math.floor((e.start+e.end)/2)},
    {name:'caption-end',frame:e.end-1},{name:'after-caption',frame:e.end},{name:'before-comment',frame:t.ending.commentStart-1},
    {name:'comment-start',frame:t.ending.commentStart},{name:'comment-pause',frame:t.ending.commentEnd+15},
    {name:'before-follow',frame:t.ending.followStart-1},{name:'follow-start',frame:t.ending.followStart},
    {name:'final-hold',frame:t.ending.followEnd+15},{name:'final-fade',frame:t.durationInFrames-1}];
  const imageFolder=join(folder,'frames',id);await mkdir(imageFolder,{recursive:true});
  for(let offset=0;offset<frames.length;offset+=4){
    const results=await Promise.allSettled(frames.slice(offset,offset+4).map(async item=>{
      const file=join(imageFolder,`${item.name}.png`),seconds=Math.max(0,(item.frame-0.25)/30).toFixed(9);
      await runRemotion(['ffmpeg','-v','error','-xerror','-ss',seconds,'-i',video,'-frames:v','1','-y',file],true,30000);
      return {...item,file};
    }));
    for(const result of results)if(result.status==='rejected')throw result.reason;
  }
  profiles.push({id,label:profile.label,voices:profile.profile.voices,model:profile.profile.model,
    video,bytes:(await stat(video)).size,sha256:sha256(await readFile(video)),durationSeconds:t.durationInFrames/30,
    metadata,probe,audio:check.finalMixedAudio,frames:frames.map(item=>({...item,file:join(imageFolder,`${item.name}.png`)}))});
  console.log(`Inspected ${id}: ${t.durationInFrames/30}s; ${check.finalMixedAudio.integratedLUFS} LUFS; ${check.finalMixedAudio.truePeakDbTP} dBTP`);
}
const spread=Math.max(...profiles.map(p=>p.audio.integratedLUFS))-Math.min(...profiles.map(p=>p.audio.integratedLUFS));assert(spread<=0.5);
const report={phase:'5C comparison checkpoint; full episode awaits user voice selection',sourceContentHash:input.bundle.contentHash,planHash:input.planHash,
  identicalContentVisualSettingsMusic:true,measuredDurationRules:true,noTimeStretching:true,narrationOverlap:false,
  captions:'Exact explanation text; half-open measured speech boundaries; no duplicate hook/question subtitles',
  ending:'comment speech -> 45 frame pause -> follow speech -> 30 frame hold -> 12 frame fade',
  fullDecode:'PASS for every completed normalized MP4 in the render pipeline',
  baselinePreserved:true,productionVoiceChanged:false,profiles,mixedLoudnessSpreadLU:spread,
  music:await readJsonFile(join(PROJECT_ROOT,'public/audio/music/manifest.json')),
  cacheRerun:await readJsonFile(join(folder,'cache-rerun.json')),
  budgetLedger:await readJsonFile(join(PROJECT_ROOT,'data/voice-comparison/transit-01/synthesis-ledger.json')),
  visualInspection:'pending contact-sheet inspection',listeningPerformed:false,
  notChecked:['pronunciation','expressiveness','accent quality','audible cut-off words','subjective mix balance','actual phone playback'],
  generatedAt:new Date().toISOString()};
await atomicJson(join(folder,'verification.json'),report);
