import assert from 'node:assert/strict';
import test from 'node:test';
import {mkdtemp,mkdir,copyFile,readFile,writeFile,rm,access} from 'node:fs/promises';
import {join,dirname} from 'node:path';
import {tmpdir} from 'node:os';
import {produce} from '../scripts/productionPipeline.ts';
import {planProduction,inspectProductionClip} from '../scripts/productionPlan.ts';
import {readDraft,atomicJson} from '../scripts/draftWorkflow.ts';
import {audioCacheKey,synthesisIdentity,sha256,canonical} from '../scripts/narrationFiles.ts';
import {alignmentKey} from '../scripts/captionAlignment.ts';
import {ALIGNMENT_CONFIG} from '../src/phraseCaptions.ts';
import {groupAlignedText,GROUPING_CONFIG} from '../scripts/productionCaptions.ts';
import {allocateBudget,chargedUnits,loadJobBudget,saveBudget,recordTtsRequest,acquireJobLock,assertProductionReservation} from '../scripts/productionBudget.ts';
import {recoverTtsArtifacts} from '../scripts/productionAudio.ts';
import {promoteOutput} from '../scripts/output.ts';
import {stageReusable} from '../scripts/productionJobs.ts';
import {productionPropsSchema} from '../src/production.ts';
import {makeScenarioSource,resolveScenarioBrief} from '../scripts/scenarioBrief.ts';
import {generateDraft} from '../scripts/openaiGeneration.ts';

const repo=new URL('../',import.meta.url),hash='194914b5a3f37cae33226de035954d6cc6a4bab831c4b5e6eb5b96bc3546fdd0';
const json=async p=>JSON.parse(await readFile(p,'utf8'));
const exists=p=>access(p).then(()=>true,()=>false);
// Synthetic PCM and deliberately uneven TEST timings. Never used as production alignment.
const wav=()=>{const n=72000,b=Buffer.alloc(44+n*2);b.write('RIFF');b.writeUInt32LE(b.length-8,4);b.write('WAVEfmt ',8);b.writeUInt32LE(16,16);
  b.writeUInt16LE(1,20);b.writeUInt16LE(1,22);b.writeUInt32LE(24000,24);b.writeUInt32LE(48000,28);b.writeUInt16LE(2,32);b.writeUInt16LE(16,34);b.write('data',36);b.writeUInt32LE(n*2,40);
  for(let i=0;i<n;i++)b.writeInt16LE(Math.round(Math.sin(i*.115)*5000),44+i*2);return b;};
const fixture=async(t,cached=true)=>{
  const root=await mkdtemp(join(tmpdir(),'quiz-production-'));t.after(()=>rm(root,{recursive:true,force:true}));
  const copy=async file=>{await mkdir(dirname(join(root,file)),{recursive:true});await copyFile(new URL(file,repo),join(root,file));};
  for(const f of ['drafts/public-transit-02-candidate/draft.json','drafts/public-transit-02-candidate/answer-key.json',
    `data/automated-acceptances/${hash}.json`,'public/backgrounds/korean-transit-illustrated-dev-v1.png','content/voice-profiles/selected-default.json','content/production/default.json'])await copy(f);
  await atomicJson(join(root,'data/legacy-demos.json'),{version:1,note:'isolated production test',entries:[]});
  const directory=join(root,'drafts/public-transit-02-candidate'),output=join(root,'out/production.mp4');
  const config={source:{kind:'draft',path:directory},output,reviewMode:'automated',voiceFile:'content/voice-profiles/selected-default.json',presentationFile:'content/production/default.json',noMusic:true,model:'gpt-6-luna',maxOutputTokens:12000};
  const initial=await planProduction(config,root,undefined,async()=>3);
  const cache=async(segment,profile=initial.settings.voice)=>{
    const bytes=wav(),key=audioCacheKey(segment,profile),file=`audio/cache/${key}.wav`,digest=sha256(bytes);
    await mkdir(join(root,'public/audio/cache'),{recursive:true});await writeFile(join(root,'public',file),bytes);
    const media={cacheKey:key,file,sha256:digest,durationSeconds:3,sourceKind:'google-cloud-tts',sourceChecksum:digest,peakDbFS:-16.3};
    await atomicJson(join(root,'.audio-cache',key,'clip.json'),{synthesisInput:synthesisIdentity(segment,profile),media});
    const clip={...segment,...media},ak=alignmentKey(clip),tokens=segment.text.trim().split(/\s+/u);
    const weights=tokens.map((_,i)=>1+(i%3)*.2),total=weights.reduce((a,b)=>a+b,0);let cursor=.08;
    const words=tokens.map((text,i)=>{const start=cursor,end=start+2.6*weights[i]/total;cursor=end+.002;return {text,start,end,probability:.98};});
    await atomicJson(join(root,'.audio-cache/caption-alignments',ak+'.json'),{key:ak,audioSha256:digest,transcript:segment.text,language:segment.language,configuration:ALIGNMENT_CONFIG,durationSeconds:3,words});
    return clip;
  };
  if(cached)for(const s of initial.script.segments)await cache(s);
  const counts={render:0,align:0,paid:0,generate:0,review:0};
  const deps={root,checkAudio:async()=>3,codeHash:async()=> 'fixture-code-v1',log:()=>{},loadPaidConfig:()=>{counts.paid++;},
    preflight:async()=>({ready:true,blockers:[],checks:{fixture:'explicit mocked prerequisites'},providerCalls:0}),
    generate:async()=>{counts.generate++;throw new Error('Unexpected generation');},review:async()=>{counts.review++;throw new Error('Unexpected review');},
    align:async()=>{counts.align++;return {cacheHits:19,newAlignments:0,providerCalls:0};},
    inspectOutput:async file=>{assert.match(await readFile(file,'utf8'),/^verified fixture/u);return {frames:3000};},
    render:async o=>{counts.render++;await mkdir(dirname(o.output),{recursive:true});const temporary=o.output+'.candidate.mp4';
      await writeFile(temporary,'verified fixture video');const result={fullDecode:'MOCK',zeroProviderCallsDuringRender:true};
      await o.beforePromote(temporary,result);await promoteOutput(temporary,o.output,o.overwrite);return result;}};
  const options={draft:directory,output,jobId:'fixture',noMusic:true};
  return {root,directory,output,config,initial,cache,counts,deps,options,job:join(root,'data/production-jobs/fixture/job.json')};
};

test('production dry run validates caches with zero stage/provider/credential calls or paid opt-in',async t=>{
  const f=await fixture(t);const result=await produce({...f.options,dryRun:true,allowPaid:true,maxCostUSD:.05},f.deps);
  assert.equal(result.providerCalls,0);assert.equal(result.verifiedCacheHits,19);assert.equal(result.alignmentCacheHits,19);
  assert.equal(result.stages.generation.maximumRequests,0);assert.equal(result.stages.review.maximumRequests,0);assert.equal(result.stages.tts.estimatedNewSynthesisUSD,0);
  assert.deepEqual(f.counts,{render:0,align:0,paid:0,generate:0,review:0});assert.equal((await json(f.job)).paidOptIn,false);
  assert.equal(await exists(join(f.root,'data/generation-budgets/produce-fixture.json')),false);
});
test('brief dry run reports conditional TTS bounds, checks matching asset before generation',async t=>{
  const f=await fixture(t,false),brief=f.initial.bundle.draft.brief,path=join(f.root,'brief.json');await atomicJson(path,brief);
  const result=await produce({brief:path,output:f.output,jobId:'brief',noMusic:true,dryRun:true,maxOutputTokens:2048},f.deps);
  assert.equal(result.stages.tts.exactUncachedCharacters,null);assert.equal(result.stages.tts.estimatedNewSynthesisUSD,null);
  assert.equal(result.stages.generation.maximumRequests,2);assert.equal(result.stages.review.maximumRequests,3);
  assert.equal(result.stages.review.conservativeBoundUSD,.0564);assert.equal(f.counts.generate,0);
  await atomicJson(path,{...brief,backgroundAssetId:null});
  const resumed=await produce({resume:'brief',dryRun:true},f.deps);assert.equal(resumed.assets.background.id,brief.backgroundAssetId);assert.equal(f.counts.generate,0);
});
test('cached full production then unchanged resume reuses verified output and strict public bonus',async t=>{
  const f=await fixture(t);await produce(f.options,f.deps);assert.equal(f.counts.render,1);
  const job=await json(f.job),cert=await json(job.renderCertificate),props=await json(cert.propsFile),bonus=props.quiz.questions[5];
  for(const field of ['correctAnswerIndex','explanation','reveal','answerKey'])assert.equal(field in bonus,false);
  assert.deepEqual(props.narration.clips.filter(c=>c.contentId===bonus.id).map(c=>c.role),['question','comment','follow']);
  const resumed=await produce({resume:'fixture'},f.deps);assert.equal(resumed.reusedVerifiedRender,true);assert.equal(resumed.providerCalls,0);
  assert.equal(resumed.cacheHits,19);assert.equal(f.counts.render,1);assert.equal(f.counts.paid,0);assert.equal(f.counts.align,1);
  const dry=await produce({resume:'fixture',dryRun:true},f.deps);assert.equal(dry.stages.render.wouldRun,false);
  assert.equal((await json(f.job)).contentHash,hash);
  const expiredModelReuse=await produce({resume:'fixture',model:'gpt-5-nano'},f.deps);
  assert.equal(expiredModelReuse.providerCalls,0);assert.equal(expiredModelReuse.reusedVerifiedRender,true);assert.equal(f.counts.paid,0);
});
test('JSON import uses the existing importer and keeps its deterministic source identity',async t=>{
  const f=await fixture(t),b=f.initial.bundle,path=join(f.root,'authored.json');
  await atomicJson(path,{brief:b.draft.brief,quiz:b.draft.quiz,narration:b.draft.narration,bonusAnswerKey:b.key});
  const plan=await produce({draft:path,output:f.output,jobId:'json-import',noMusic:true,dryRun:true},f.deps);
  await assert.rejects(produce({resume:'json-import'},f.deps),/spending authorization/u);
  const job=await json(join(f.root,'data/production-jobs/json-import/job.json'));
  assert.equal(job.contentHash,plan.contentHash);assert.equal(job.workDirectory,undefined);assert.equal(await exists(path),true);
  assert.equal(job.paidOptIn,false); // Planned validated import is reviewable before committing authorization.
});
test('voice, exact speech, processing identity and alignment bytes invalidate the right dependencies',async t=>{
  const f=await fixture(t),segment=f.initial.script.segments[1],profile=f.initial.settings.voice;
  assert.notEqual(audioCacheKey({...segment,text:segment.text+' Please.'},profile),audioCacheKey(segment,profile));
  assert.notEqual(audioCacheKey(segment,{...profile,voices:{...profile.voices,'en-US':'en-US-Chirp3-HD-Puck'}}),audioCacheKey(segment,profile));
  const first=await planProduction(f.config,f.root,undefined,f.deps.checkAudio),clip=first.inventory[1].clip,file=join(f.root,'.audio-cache/caption-alignments',alignmentKey(clip)+'.json');
  const a=await json(file);a.words[0].start+=.01;await atomicJson(file,a);
  const next=await planProduction(f.config,f.root,undefined,f.deps.checkAudio);assert.equal(next.verifiedCacheHits,19);assert.notEqual(first.inventory[1].alignmentHash,next.inventory[1].alignmentHash);
  const changed=await inspectProductionClip({...segment,text:segment.text+' Please.'},profile,f.root,f.deps.checkAudio);assert.equal(changed.status,'missing');
  const present=await json(join(f.root,'content/production/default.json'));present.musicGain=1.1;await atomicJson(join(f.root,'content/production/default.json'),present);
  const p=await planProduction(f.config,f.root,undefined,f.deps.checkAudio);assert.equal(p.verifiedCacheHits,19);assert.notEqual(first.hashes.presentation,p.hashes.presentation);assert.equal(first.hashes.speech,p.hashes.speech);
});
test('missing/corrupt voice and background assets never count as valid cache hits',async t=>{
  const f=await fixture(t),p=await planProduction(f.config,f.root,undefined,f.deps.checkAudio),clip=p.inventory[0].clip;
  await writeFile(join(f.root,'public',clip.file),'corrupt');
  let report=await produce({...f.options,dryRun:true},f.deps);assert.equal(report.verifiedCacheHits,18);assert.match(report.blockers.join(' '),/checksum/u);
  await assert.rejects(produce({resume:'fixture'},f.deps),/checksum/u);assert.equal(f.counts.render,0);
  await rm(join(f.root,'public/backgrounds/korean-transit-illustrated-dev-v1.png'));
  report=await produce({resume:'fixture',dryRun:true},f.deps);assert.ok(report.blockers.length);assert.equal(f.counts.paid,0);
});
test('real pending cache filenames block blind synthesis before authorization',async t=>{
  const f=await fixture(t,false),key=f.initial.inventory[0].key;
  await atomicJson(join(f.root,'.audio-cache',key,'pending-request.json'),{outcome:'unknown'});
  const result=await produce({...f.options,dryRun:true},f.deps);assert.equal(result.inventory[0].status,'uncertain');
  await assert.rejects(produce({resume:'fixture',allowPaid:true,maxCostUSD:.1},f.deps),/no blind/u);assert.equal(f.counts.paid,0);
});
test('stale acceptance cannot bypass review through an old render certificate',async t=>{
  const f=await fixture(t);await produce(f.options,f.deps);await rm(join(f.root,'data/automated-acceptances',hash+'.json'));
  await assert.rejects(produce({resume:'fixture'},f.deps),/Output exists/u);
  await assert.rejects(produce({resume:'fixture',overwrite:true},f.deps),/spending authorization/u);assert.equal(f.counts.render,1);assert.equal(f.counts.review,0);
});
test('failed linguistic review blocks audio/render and total budget exhaustion blocks calls',async t=>{
  const f=await fixture(t);await rm(join(f.root,'data/automated-acceptances',hash+'.json'));
  await assert.rejects(produce({...f.options,allowPaid:true,maxCostUSD:.001},f.deps),/budget exhausted/u);assert.equal(f.counts.paid,0);
  const rejected=await json(f.job);assert.equal(rejected.paidOptIn,false);assert.equal(rejected.maxCostUSD,undefined);
  assert.equal(await exists(join(f.root,'data/generation-budgets/produce-fixture.json')),false);
  await assert.rejects(produce({resume:'fixture',allowPaid:true,maxCostUSD:.1},f.deps),/Unexpected review/u);
  assert.equal((await json(f.job)).maxCostUSD,.1); // A rejected cap no longer poisons the planned job.
  const g=await fixture(t);await rm(join(g.root,'data/automated-acceptances',hash+'.json'));
  g.deps.review=async()=>{g.counts.review++;return {status:'needs-revision'};};
  await assert.rejects(produce({...g.options,allowPaid:true,maxCostUSD:.1},g.deps),/blocking findings/u);assert.equal(g.counts.review,1);assert.equal(g.counts.render,0);assert.equal(g.counts.align,0);
});
test('automatic corrections stay in recorded working revision and rebuild final plan',async t=>{
  const f=await fixture(t),original=await readFile(join(f.directory,'draft.json'),'utf8');await rm(join(f.root,'data/automated-acceptances',hash+'.json'));
  f.deps.review=async o=>{const d=await json(join(o.directory,'draft.json'));d.quiz.questions[0].context='Ask the station worker politely.';
    await atomicJson(join(o.directory,'draft.json'),d);const revised=await readDraft(o.directory,f.root);
    const acceptance=await json(new URL(`data/automated-acceptances/${hash}.json`,repo));
    await atomicJson(join(f.root,'data/automated-acceptances',revised.contentHash+'.json'),{...acceptance,contentHash:revised.contentHash,sourceContentHash:hash,revisions:[{fixture:true}]});
    return {status:'accepted',contentHash:revised.contentHash};};
  await produce({...f.options,allowPaid:true,maxCostUSD:.1},f.deps);
  const job=await json(f.job);assert.notEqual(job.contentHash,hash);assert.equal(job.revisions.length,2);assert.equal(await readFile(join(f.directory,'draft.json'),'utf8'),original);
  assert.equal((await json(join(f.root,'public/audio/production/fixture',job.stages.audio.inputHash+'.json'))).clips.length,19);assert.equal(f.counts.render,1);
});
test('interruption after durable verification/promotion recovers without second render',async t=>{
  const f=await fixture(t),render=f.deps.render;f.deps.render=async o=>{await render(o);throw new Error('fixture interruption after promotion');};
  await assert.rejects(produce(f.options,f.deps),/fixture interruption/u);assert.equal(f.counts.render,1);
  const result=await produce({resume:'fixture'},f.deps);assert.equal(result.reusedVerifiedRender,true);assert.equal(f.counts.render,1);assert.equal(await exists(result.report),true);
});
test('changed presentation refuses overwrite; failed authorized replacement keeps good output',async t=>{
  const f=await fixture(t);await produce(f.options,f.deps);const original=await readFile(f.output);
  const p=await json(join(f.root,'content/production/default.json'));p.musicGain=1.1;await atomicJson(join(f.root,'content/production/default.json'),p);
  await assert.rejects(produce({resume:'fixture'},f.deps),/Output exists/u);
  f.deps.render=async()=>{throw new Error('replacement verification failed');};
  await assert.rejects(produce({resume:'fixture',overwrite:true},f.deps),/replacement verification failed/u);assert.deepEqual(await readFile(f.output),original);
});
test('bonus question audio and private-data exclusion are enforced in render props',async t=>{
  const f=await fixture(t);await produce(f.options,f.deps);const job=await json(f.job),certificate=await json(job.renderCertificate),props=await json(certificate.propsFile),bonus=props.quiz.questions[5];
  const missing=structuredClone(props);missing.narration.clips=missing.narration.clips.filter(c=>!(c.contentId===bonus.id&&c.role==='question'));assert.equal(productionPropsSchema.safeParse(missing).success,false);
  for(const field of ['correctAnswerIndex','explanation','reveal']){const leaked=structuredClone(props);leaked.quiz.questions[5][field]=field==='correctAnswerIndex'?1:'private';assert.equal(productionPropsSchema.safeParse(leaked).success,false);}
  const a=props.phraseCaptions.find(c=>c.role==='answer');a.start=0;assert.equal(productionPropsSchema.safeParse(props).success,false);
});
test('shared allocations cannot collectively exceed total and uncertain TTS is never repeated',async t=>{
  const f=await fixture(t,false),h=await loadJobBudget(f.root,'fixture',.05,true);
  const a=allocateBudget(h.budget,'generation','generation','hash-a',30000000);assert.throws(()=>allocateBudget(h.budget,'review','review','hash-b',30000000),/budget exhausted/u);
  assert.equal(chargedUnits(h.budget),30000000);await saveBudget(h.file,h.budget);
  await assertProductionReservation({file:h.file,key:'generation',childBudgetId:a.childBudgetId},f.root,a.childBudgetId,30000000);
  await assert.rejects(assertProductionReservation({file:h.file,key:'generation',childBudgetId:'fake'},f.root,'fake',1),/shared production-budget/u);
  allocateBudget(h.budget,'tts','tts','hash-c',10000000);const request=recordTtsRequest(h.budget,'tts',f.initial.inventory[0].key,1000);request.state='uncertain';await saveBudget(h.file,h.budget);
  await assert.rejects(recoverTtsArtifacts({...h,key:'tts'},f.root,f.deps.checkAudio),/no blind retry/u);assert.equal(chargedUnits(h.budget),40000000);
});
test('locks are exclusive, active locks cannot be recovered and artifacts require matching hashes',async t=>{
  const f=await fixture(t),folder=join(f.root,'lock-test'),release=await acquireJobLock(folder);
  await assert.rejects(acquireJobLock(folder),/locked/u);await assert.rejects(acquireJobLock(folder,true),/active/u);await release();
  const next=await acquireJobLock(folder);await next();const file=join(f.root,'artifact');await writeFile(file,'before');
  const stage={status:'complete',inputHash:'same',outputs:[{path:file,sha256:sha256('before')}]};assert.equal(await stageReusable(stage,'same'),true);
  await writeFile(file,'after');assert.equal(await stageReusable(stage,'same'),false);assert.equal(await stageReusable(stage,'changed'),false);
});
test('automatic phrase grouping preserves acoustic bounds and rejects unreliable alignment',()=>{
  const transcript='Where is the train? Please ask the worker.';const words=transcript.split(' ').map((text,i)=>({text,start:i*.2,end:i*.2+.15,probability:1}));
  const a={transcript,words,language:'en-US',durationSeconds:4};assert.deepEqual(groupAlignedText(a),['Where is the train?','Please ask the worker.']);
    assert.throws(()=>groupAlignedText({...a,words:words.map((w,i)=>i===1?{...w,start:0}:w)}),/invalid alignment/u);
  assert.equal(groupAlignedText({transcript:'안녕하세요.',words:[{text:'안녕하세요.',start:.2,end:.8}],language:'ko-KR',durationSeconds:1})[0],'안녕하세요.');
  assert.equal(GROUPING_CONFIG.maximumWords,5);
});

test('plain-language scenario resolves defaults and only selects a matching registered illustration',()=>{
  const cafe=resolveScenarioBrief(makeScenarioSource('  Beginner Korean at a cafe\u0301  '));
  assert.equal(cafe.scenario,'Beginner Korean at a café');assert.equal(cafe.scenarioType,'cafe');assert.equal(cafe.backgroundAssetId,'korean-cafe-illustrated-v1');
  assert.equal(cafe.learningObjectives,undefined);assert.equal(cafe.context,undefined);assert.match(cafe.level,/sixth.*bonus/u);
  const hotel=resolveScenarioBrief(makeScenarioSource('Beginner Korean at a hotel'));assert.equal(hotel.scenarioType,'hotel');assert.equal(hotel.backgroundAssetId,'korean-hotel-illustrated-v1');
  const unresolved=makeScenarioSource('Beginner Korean at a hotel');delete unresolved.brief.scenarioType;assert.equal(resolveScenarioBrief(unresolved).scenarioType,'hotel');
  assert.equal(resolveScenarioBrief(makeScenarioSource('Beginner Korean at a clinic')).backgroundAssetId,null);
  assert.equal(resolveScenarioBrief(makeScenarioSource('A café inside a hotel')).backgroundAssetId,null);
  assert.throws(()=>makeScenarioSource('  '));assert.throws(()=>makeScenarioSource('x'.repeat(1001)));
});
test('unregistered known setting plans one bound image without calls, preserving generation/review bounds',async t=>{
  const f=await fixture(t),options={scenario:'Beginner Korean at a convenience store',output:f.output,jobId:'store-01',noMusic:true,dryRun:true};
  const result=await produce(options,f.deps);assert.equal(result.providerCalls,0);assert.match(result.brief.status,/seed-only/u);
  assert.match(result.brief.value.backgroundAssetId,/^generated-convenience-store-/u);assert.equal(result.brief.value.learningObjectives,undefined);
  assert.equal(result.stages.generation.maximumRequests,2);assert.equal(result.stages.generation.separateBriefPlanningCalls,0);assert.equal(result.stages.generation.derivesBriefInSameRequest,true);
  assert.equal(result.stages.review.maximumRequests,3);assert.equal(result.stages.tts.exactUncachedCharacters,null);assert.equal(result.stages.tts.estimatedNewSynthesisUSD,null);
  assert.equal(result.stages.image.maximumRequests,1);assert.equal(result.assets.image.action,'generate');assert.deepEqual(result.blockers,[]);assert.deepEqual(f.counts,{render:0,align:0,paid:0,generate:0,review:0});
  const folder=join(f.root,'data/production-jobs/store-01'),saved=await json(join(folder,'job.json'));assert.equal(saved.config.source.text,options.scenario);
  assert.equal((await json(join(folder,'brief.json'))).scenario,options.scenario);
  const resumed=await produce({resume:'store-01',dryRun:true},f.deps);assert.equal(result.source,resumed.source);assert.deepEqual(result.brief,resumed.brief);
  await assert.rejects(produce({resume:'store-01',allowPaid:true,maxCostUSD:.001},f.deps),/below conservative/u);assert.equal(f.counts.paid,0);
  assert.equal(await exists(join(f.root,'data/generation-budgets/produce-store-01.json')),false);
});
test('registered hotel background resolves on the scenario path without changing classification',async t=>{
  const f=await fixture(t);await copyFile(new URL('public/backgrounds/korean-hotel-illustrated-v1.png',repo),join(f.root,'public/backgrounds/korean-hotel-illustrated-v1.png'));
  const result=await produce({scenario:'Beginner Korean at a hotel',output:f.output,jobId:'hotel-01',noMusic:true,dryRun:true},f.deps);
  assert.deepEqual(result.blockers,[]);assert.equal(result.assets.background.id,'korean-hotel-illustrated-v1');
  assert.equal(result.assets.background.selection,'developer-selected');assert.equal(result.providerCalls,0);
});
test('scenario source is exclusive and cannot replace a resumed source',async t=>{
  const f=await fixture(t);
  for(const other of [{draft:f.directory},{brief:'brief.json'}])await assert.rejects(produce({...f.options,...other,scenario:'At a hotel'},f.deps),/exactly one/u);
  await assert.rejects(produce({...f.options,draft:undefined,scenario:''},f.deps),/Scenario must not be blank/u);
  await assert.rejects(produce({resume:'fixture',scenario:'At a hotel'},f.deps),/Use --resume/u);
});
test('scenario generates objectives and content in one bounded call, persists the final brief, and shares the review budget',async t=>{
  const f=await fixture(t),source=f.initial.bundle;
  const learning={context:'A visitor asks a station worker for help with tickets, trains and exits.',
    learningObjectives:['Find the entrance','Find a platform','Buy a ticket','Check the destination','Ask where to transfer','Ask which exit to use']};
  const all=source.draft.quiz.questions.map((q,i)=>({scenario:q.scenario,prompt:q.prompt,context:q.context,spokenPrompt:q.spokenPrompt,choices:q.choices,
    correctAnswerIndex:i===5?source.key.correctAnswerIndex:q.correctAnswerIndex,translation:i===5?source.key.translation:q.reveal.translation,
    explanation:i===5?source.key.explanation:q.explanation,teachingPoint:i===5?source.key.teachingPoint:q.reveal.teachingPoint,
    ...(i<5?{explanationNarration:source.draft.narration.segments.find(s=>s.contentId===q.id&&s.role==='explanation').text}:{})}));
  let calls=0;f.deps.generate=o=>{assert.equal(o.deriveBrief,true);assert(o.productionReservation);return generateDraft({...o,
    prompt:{system:'mock scenario contract',user:'mock untrusted scenario',exampleCount:0,historyCount:0},client:{create:async request=>{
      calls++;assert(request.text.format.schema.properties.derivedBrief);assert.equal(request.max_output_tokens,12000);
      return {id:'resp_fixture',model:'gpt-6-luna',status:'completed',incomplete_details:null,_request_id:'req_fixture',
        usage:{input_tokens:1000,output_tokens:800,total_tokens:1800,input_tokens_details:{cached_tokens:0},output_tokens_details:{reasoning_tokens:100}},
        output:[{type:'message',content:[{type:'output_text',text:JSON.stringify({questions:all.slice(0,5),bonus:all[5],derivedBrief:learning})}]}]};}}});};
  f.deps.review=async o=>{assert(o.productionReservation);f.counts.review++;return {status:'needs-revision'};};
  await assert.rejects(produce({scenario:'Beginner Korean on public transit',output:f.output,jobId:'scenario-run',noMusic:true,allowPaid:true,maxCostUSD:.23},f.deps),/blocking findings/u);
  assert.equal(calls,1);assert.equal(f.counts.review,1);assert.equal(f.counts.align,0);assert.equal(f.counts.render,0);
  const folder=join(f.root,'data/production-jobs/scenario-run'),job=await json(join(folder,'job.json')),bundle=await readDraft(job.workDirectory,f.root);
  assert.deepEqual(bundle.draft.brief.learningObjectives,learning.learningObjectives);assert.equal(bundle.draft.brief.context,learning.context);
  assert.deepEqual(await json(join(folder,'brief.json')),bundle.draft.brief);assert.deepEqual(await json(join(job.workDirectory,'brief.json')),bundle.draft.brief);
  assert.equal(bundle.draft.quiz.questions.length,6);assert.equal(bundle.draft.narration.segments.length,19);
  const budget=await json(join(f.root,'data/generation-budgets/produce-scenario-run.json'));
  assert.deepEqual(Object.values(budget.allocations).map(a=>a.stage),['generation','review']);assert(chargedUnits(budget)<=budget.capUnits);
  const reused=await generateDraft({brief:job.config.source.brief,episodeId:'production-scenario-run',output:job.workDirectory,root:f.root,model:'gpt-6-luna',deriveBrief:true,
    client:{create:()=>assert.fail('saved scenario called provider')}}).catch(e=>e);
  // Input includes the code-selected matching background, not the unbound seed.
  assert.match(reused.message,/inputs changed/iu);
  const exactBrief=resolveScenarioBrief(job.config.source);
  const cached=await generateDraft({brief:exactBrief,episodeId:'production-scenario-run',output:job.workDirectory,root:f.root,model:'gpt-6-luna',deriveBrief:true,
    client:{create:()=>assert.fail('saved scenario called provider')}});
  assert.equal(cached.calls,0);assert.equal(cached.reused,true);
});
