/** Explicit local-only diagnostic, not a production job or content-generation path. */
import {readFile,writeFile,mkdir,mkdtemp,rename} from 'node:fs/promises';
import {join,resolve} from 'node:path';
import {loadAudioLibrary,validateLocalBed} from './audioLibrary.ts';
import {decodeLoopWav,encodeWav} from './localMusicSynthesis.ts';
import {runRemotion} from './remotionCommand.ts';
import {getNarratedTimeline} from '../src/narrationTiming.ts';
import {runtimeQuiz,productionPropsSchema} from '../src/production.ts';
import {resolveProductionPreset} from '../src/productionPresets.ts';
import {resolveVariety} from './varietySelection.ts';
import {backgroundOptionsSchema} from './backgroundImages.ts';
import {withCatalogLock} from './backgroundCatalog.ts';
import {productionPhrases} from './productionCaptions.ts';
import {loadDisplayCues} from './captionAlignment.ts';
import {normalizeFinalMix} from './finalMix.ts';
import {inspectNarratedVideo} from './mediaInspection.ts';
import {getVarietyMotion} from '../src/variety.ts';
import {getMusicGain} from '../src/presentation.ts';
import {sha256} from './narrationFiles.ts';
const root=resolve('.'),folder=join(root,'out/checkpoint-c');await mkdir(join(folder,'frames'),{recursive:true});
const json=async f=>JSON.parse(await readFile(f,'utf8'));
const library=await loadAudioLibrary(root);
for(const e of library.entries){await validateLocalBed(e.asset,root);const wav=decodeLoopWav(await readFile(join(root,'public',e.asset.file))),count=12*48000,a=wav.left.slice(0,count),b=wav.right.slice(0,count);
  for(let i=0;i<count;i++){const fade=Math.min(1,i/(.25*48000),(count-1-i)/(.5*48000));a[i]*=fade;b[i]*=fade;}
  await writeFile(join(folder,e.id+'-audition.wav'),encodeWav(a,b));}
const job=await json('data/production-jobs/restaurant-fresh-02/job.json'),certificate=await json(job.renderCertificate),original=await json(certificate.propsFile);
const preset=resolveProductionPreset('concise-v2'),timeline=getNarratedTimeline(original.narration,runtimeQuiz(original.quiz),preset.timing),q=timeline.questions[2],bonus=timeline.questions.at(-1);
const {selection}=await withCatalogLock(root,()=>resolveVariety(root,{scenario:'Beginner Korean ordering dinner at a restaurant',scenarioType:'restaurant',backgroundAssetId:original.background.id},'checkpoint-c-diagnostic',
  {seed:'checkpoint-c',palette:'cream-navy',motion:'slow-push',music:'soft-lofi-keys'},backgroundOptionsSchema.parse({assetId:original.background.id})));
const phrases=await productionPhrases(original.narration.clips,timeline.audio,Object.fromEntries(timeline.questions.map(q=>[q.id,q.revealStart])),bonus.id,root);
const cues=await loadDisplayCues(original.narration.clips,timeline.audio,root);
const props=productionPropsSchema.parse({...original,productionPreset:'concise-v2',variety:selection.visual,music:selection.audio.music,phraseCaptions:phrases,displayCues:cues});
const frames=q.sequenceEnd-q.sequenceStart,duration=frames/30;if(duration<15||duration>25)throw Error('Representative complete question must fit the requested 15–25s diagnostic');
const work=await mkdtemp(join(folder,'local-preview-')),propsFile=join(folder,'preview.props.json'),env=join(folder,'empty.env');await writeFile(propsFile,JSON.stringify(props));await writeFile(env,'');
const raw=join(work,'source-render.mp4');
await runRemotion(['render','src/index.ts','KoreanProduction',raw,`--props=${propsFile}`,`--env-file=${env}`,`--frames=${q.sequenceStart}-${q.sequenceEnd-1}`,
  '--codec=h264','--pixel-format=yuv420p','--color-space=bt709','--crf=18','--concurrency=2','--audio-codec=aac','--audio-bitrate=192k'],true,300000);
// Boundary fades are downstream, identical across speech/music, and wholly in
// the excerpt's speech-free entry/hold. The full episode retains its own fades.
const fade=`volume='min(1,max(0,t/0.15))*min(1,max(0,(${duration}-t)/0.35))':eval=frame`;
const candidate=join(work,'verified.mp4'),normalized=await normalizeFinalMix(raw,candidate,duration,preset.finalMix,fade);
const speech=timeline.audio.filter(a=>a.contentId===q.id),metadata=await inspectNarratedVideo(candidate,frames,Math.max(...speech.map(a=>a.end))-q.sequenceStart);
await runRemotion(['ffmpeg','-v','error','-xerror','-i',candidate,'-c:v','rawvideo','-f','null','-'],true,120000);
const output=join(folder,'new-track-motion-excerpt.mp4');await rename(candidate,output);
for(const [name,at] of [['reading',q.start+30],['countdown',q.countdownStart+30],['answer',q.revealStart+15],['explanation',speech.find(a=>a.role==='explanation').start+30],['end',q.end-5]]){
  await runRemotion(['ffmpeg','-v','error','-ss',String((at-q.sequenceStart)/30),'-i',output,'-frames:v','1',join(folder,'frames',name+'.png')],true,30000);
}
const levels=preset.music,multiplier=props.presentation.musicGain,trim=props.music.mixTrimDb??0;
const report={output,sha256:sha256(await readFile(output)),sourceJob:'restaurant-fresh-02 (read-only)',sourceVoices:props.narration.profile,
  sourceFullTimelineSeconds:timeline.durationInFrames/30,excerpt:{questionIndex:2,startFrame:q.sequenceStart,endFrame:q.sequenceEnd,frames,durationSeconds:duration,clockSpeed:1,fullEpisodeMotionCompressed:false},
  motion:{selection:selection.visual,start:getVarietyMotion(selection.visual,q.sequenceStart,timeline.durationInFrames),end:getVarietyMotion(selection.visual,q.sequenceEnd-1,timeline.durationInFrames)},
  sourceStemMix:{version:preset.mixVersion,relativeMusicDb:3,levels,presentationMultiplier:multiplier,trackTrimDb:trim,track:props.music,
    effectiveIdleGain:levels.idle*multiplier*10**(trim/20),effectiveThinkingGain:levels.thinking*multiplier*10**(trim/20),effectiveSpeechGain:levels.speech*multiplier*10**(trim/20),ambience:'off',narrationGain:1,
    normalProductionComponent:true,postMasterStemReconstruction:false},
  metadata,fullDecode:'PASS',normalFinalizer:normalized,bonusIsolation:'Strict full-six-question props validated; excerpt contains only Q3, no private bonus data',
  captionTiming:'Exact existing cached alignment, regrouped only for the unchanged concise timeline; frame range preserves absolute clocks',
  speechFreeBoundaryFades:{inSeconds:.15,outSeconds:.35},providerCalls:0,newTts:0,newImages:0,listeningPerformed:false,phonePlaybackPerformed:false,
  rawSourceMix:raw,propsFile};
await writeFile(join(folder,'preview-verification.json'),JSON.stringify(report,null,2));console.log(JSON.stringify({output,durationSeconds:duration,frames,final:normalized.after,motion:report.motion},null,2));
