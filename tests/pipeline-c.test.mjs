import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir,copyFile,mkdtemp,rm} from 'node:fs/promises';
import {join,dirname} from 'node:path';
import {tmpdir} from 'node:os';
import {synthesizeMusic,RECIPES,decodeLoopWav,loopMetrics,assertLoopSeam} from '../scripts/localMusicSynthesis.ts';
import {librarySchema,loadAudioLibrary,validateLocalBed} from '../scripts/audioLibrary.ts';
import {loadProductionMusic,availableMusicIds} from '../scripts/productionMusic.ts';
import {resolveProductionPreset} from '../src/productionPresets.ts';
import {getMusicGain} from '../src/presentation.ts';
import {visualVarietySchema,getVarietyMotion,varietyMotion,resolveMotionConfig,declaredMotionSafe,coverBounds,MOTION_IDS} from '../src/variety.ts';
import {resolveVariety,assertVarietyConfiguration} from '../scripts/varietySelection.ts';
import {backgroundOptionsSchema} from '../scripts/backgroundImages.ts';
import {runVideo,parseVideoArguments} from '../scripts/videoCli.ts';
import {inspectVideoJob} from '../scripts/videoPlanning.ts';
import {measureAudio} from '../scripts/audioMeter.ts';
import {sha256,canonical} from '../scripts/narrationFiles.ts';
import {generateMusicLibrary,DEFAULT_MUSIC_SEED} from '../scripts/generateMusic.ts';
const root=new URL('../',import.meta.url),repo=decodeURIComponent(root.pathname).replace(/^\/(?=[A-Za-z]:)/u,'');
const json=async p=>JSON.parse(await readFile(p,'utf8'));
const temporary=async t=>{const dir=await mkdtemp(join(tmpdir(),'pipeline-c-'));assert.equal(dirname(dir),tmpdir());t.after(()=>rm(dir,{recursive:true,force:true}));return dir;};
test('approved +3 dB source gains apply once; legacy/v1 and timing/1.25 semantics stay pinned',()=>{
  const a=resolveProductionPreset('concise-v1'),c=resolveProductionPreset('concise-v2');assert.deepEqual(a.timing,c.timing);assert.deepEqual(a.music,{idle:.45,thinking:.30,speech:.20});assert.equal(c.mixVersion,'source-music-plus3-v1');
  for(const key of ['idle','thinking','speech'])assert.ok(Math.abs(20*Math.log10(c.music[key]/a.music[key])-3)<1e-10);
  const speech=[{start:100,end:200}],counts=[{countdownStart:300,revealStart:390}];
  for(const frame of [50,150,340])assert.ok(Math.abs(getMusicGain(frame,500,speech,counts,1.25,c.music)/getMusicGain(frame,500,speech,counts,1.25,a.music)-10**(3/20))<1e-10);
  assert.deepEqual(resolveProductionPreset().music,{idle:.25,thinking:.14,speech:.10});
});
test('new motion uses actual crop coverage/safe-region clamps, while v1 remains identical',()=>{
  for(const [width,height] of [[941,1672],[916,1717],[1024,1536],[1080,1920]])for(const framing of [1.02,1.12]){
    const config=resolveMotionConfig(width,height,framing);assert.ok(config.zoomTravel>=.04&&config.zoomTravel<=.06);assert.ok(config.panTravel>=20&&config.panTravel<=30);assert.ok(declaredMotionSafe(width,height,framing,config));
    for(const motion of MOTION_IDS){const v=visualVarietySchema.parse({version:'visual-variety-v2',palette:'cream-navy',motion,width,height,motionConfig:config});
      for(let f=0;f<3600;f+=7){const m=getVarietyMotion(v,f,3600),next=getVarietyMotion(v,f+1,3600),b=coverBounds(width,height,framing*m.extraScale,m.x,m.y);assert.ok(b.left<=0&&b.right>=1080&&b.top<=0&&b.bottom>=1920);assert.ok(Math.abs(next.x-m.x)<.1&&Math.abs(next.extraScale-m.extraScale)<.001);}
      for(const boundary of [95,564,1089,1612,2122,2671,3149])for(const f of [boundary-1,boundary,boundary+1]){const m=getVarietyMotion(v,f,3150),b=coverBounds(width,height,framing*m.extraScale,m.x,m.y);assert.ok(b.left<=0&&b.right>=1080&&b.top<=0&&b.bottom>=1920);}
      const old={version:'visual-variety-v1',palette:'cream-navy',motion,width,height};assert.deepEqual(getVarietyMotion(old,1500,3600),varietyMotion(motion,1500,3600));}
  }
  const v={version:'visual-variety-v2',palette:'cream-navy',motion:'slow-push',width:1024,height:1536,motionConfig:resolveMotionConfig(1024,1536)};
  const delta=getVarietyMotion(v,1611,3150).extraScale-getVarietyMotion(v,1089,3150).extraScale;assert.ok(delta>.01&&delta<.02,'17.4s excerpt is a real fraction of a 105s timeline, not an accelerated whole push');
  assert.throws(()=>resolveMotionConfig(1080,1920,1),/safe motion/u);
});
test('all five recipes reproduce identical raw PCM, whole bars and seam bounds without network',async()=>{
  const recorded=await loadAudioLibrary(repo);
  for(const id of Object.keys(RECIPES)){
    const a=synthesizeMusic(id,DEFAULT_MUSIC_SEED),b=synthesizeMusic(id,DEFAULT_MUSIC_SEED);assert.equal(a.rawSha256,b.rawSha256);assert.deepEqual(a.bytes,b.bytes);assert.equal(a.rawSha256,recorded.entries.find(e=>e.id===id).rawSha256);
    const wav=decodeLoopWav(a.bytes);assert.equal(wav.frames,a.frames);assert.ok(wav.durationSeconds>=40&&wav.durationSeconds<=65);assertLoopSeam(loopMetrics(a.bytes));
    if(RECIPES[id].bpm)assert.ok(Math.abs(a.durationSeconds-RECIPES[id].bars*4*60/RECIPES[id].bpm)<=1/48000);
  }
  assert.notEqual(synthesizeMusic('soft-lofi-keys','other-seed').rawSha256,synthesizeMusic('soft-lofi-keys',DEFAULT_MUSIC_SEED).rawSha256);
  assert.throws(()=>assertLoopSeam({wrapJump:.5,derivativeChange:.8,nearbyMaxDerivative:.01,edgeEnergyDifferenceDb:0}),/seam/u);
  assert.throws(()=>decodeLoopWav(Buffer.from('broken')),/WAV/u);
});
test('actual library assets, normalized loudness/peaks, provenance and encoded PCM seams verify',async()=>{
  const library=await loadAudioLibrary(repo);assert.equal(library.entries.length,5);
  for(const e of library.entries){await validateLocalBed(e.asset,repo);const measured=await measureAudio(join(repo,'public',e.asset.file));assert.ok(Math.abs(measured.integratedLUFS+20)<=.6);assert.ok(measured.truePeakDbTP<=-2.95);assert.equal(e.provenance.samples,'none');assert.equal(e.provenance.paidServices,0);assert.match(e.provenance.rightsStatus,/not guaranteed/u);}
  assert.equal((await availableMusicIds(repo)).length,4);
});
test('missing/corrupt/tampered beds fail actionably; pinned paths survive unrelated manifest entries',async t=>{
  const dir=await temporary(t),entry=(await loadAudioLibrary(repo)).entries[0];await mkdir(dirname(join(dir,'public',entry.asset.file)),{recursive:true});
  await assert.rejects(validateLocalBed(entry.asset,dir),/Missing local bed/u);await writeFile(join(dir,'public',entry.asset.file),'corrupt');await assert.rejects(validateLocalBed(entry.asset,dir),/checksum/u);
  await copyFile(join(repo,'public',entry.asset.file),join(dir,'public',entry.asset.file));assert.deepEqual(await loadProductionMusic(entry.id,true,dir,entry.asset),entry.asset);
  assert.equal(await loadProductionMusic('none',true,dir),null);await assert.rejects(loadProductionMusic(entry.id,true,dir),/music:generate/u);
  assert.throws(()=>librarySchema.parse({version:'local-audio-library-v1',entries:[{...entry,measurements:{...entry.measurements,integratedLUFS:-5}}]}),/normalization/u);
});
test('CLI validates all tracks/independent optional textures before paid work; selection binds trims and motion version',async()=>{
  for(const id of ['auto','none','subtle-bass','soft-lofi-keys','warm-pluck-groove','airy-pad-drift'])assert.equal(parseVideoArguments(['--scenario','Hotel','--music',id]).options.varietyOptions.music,id);
  for(const args of [['--ambience','chatter'],['--ambience-gain','2']])assert.throws(()=>parseVideoArguments(['--scenario','Hotel',...args]));
  const brief={scenario:'Beginner Korean at a restaurant',scenarioType:'restaurant',backgroundAssetId:null},opts=backgroundOptionsSchema.parse({mode:'new'});
  const selection=await resolveVariety(repo,brief,'test-only-no-job',{seed:'c-test',music:'soft-lofi-keys',ambience:'soft-room-tone',ambienceGain:.5},opts);
  assert.equal(selection.selection.version,'variety-v2');assert.equal(selection.selection.visual.version,'visual-variety-v2');assert.equal(selection.selection.audio.music.mixTrimDb,-2);assert.equal(selection.selection.audio.ambience.gain,.5);assertVarietyConfiguration(selection.selection);
  const tampered=structuredClone(selection.selection);tampered.audio.music.mixTrimDb=0;assert.throws(()=>assertVarietyConfiguration(tampered),/configuration changed/u);
  const none=await resolveVariety(repo,brief,'test-only-no-job',{music:'none'},opts);assert.equal(none.selection.audio.music,null);assert.equal(none.selection.audio.ambience,null);
});
test('unchanged explicit library build reuses five assets with zero synthesis/network and no byte changes',async()=>{
  const path=join(repo,'public/audio/music/library.json'),before=await readFile(path);const result=await generateMusicLibrary(repo);assert.equal(result.providerCalls,0);assert.ok(result.entries.every(e=>e.reused));assert.deepEqual(await readFile(path),before);
});
test('old unresolved B planning retains its v1 engine; new C planning binds a separate engine',async()=>{
  const brief={scenario:'Beginner Korean at a restaurant',scenarioType:'restaurant',backgroundAssetId:null},background=backgroundOptionsSchema.parse({mode:'new'});
  const old=await resolveVariety(repo,brief,'test-no-job',{music:'none'},background,false,undefined,'variety-v1');assert.equal(old.selection.visual.version,'visual-variety-v1');assert.equal(old.selection.version,'variety-v1');assert.equal(old.selection.audio,undefined);assertVarietyConfiguration(old.selection);assert.doesNotMatch(old.binding.request.prompt,/26 pixels/u);
  const modern=await resolveVariety(repo,brief,'test-no-job',{music:'none'},background);assert.equal(modern.selection.visual.version,'visual-variety-v2');assert.match(modern.binding.request.prompt,/26 pixels/u);
});
