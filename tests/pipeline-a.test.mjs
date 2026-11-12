import assert from 'node:assert/strict';
import test from 'node:test';
import {mkdtemp,mkdir,copyFile,readFile,writeFile,rm,access} from 'node:fs/promises';
import {join,dirname} from 'node:path';
import {tmpdir} from 'node:os';
import {spawn} from 'node:child_process';
import {runVideo,parseVideoArguments,resolveVideoDestination} from '../scripts/videoCli.ts';
import {moneyUnits,suggestedCap} from '../scripts/money.ts';
import {acquireJobLock,classifyLockOwner} from '../scripts/jobLocks.ts';
import {withCancellation,withSignalCancellation,ownWorker,checkCancellation} from '../scripts/cancellation.ts';
import {resolveProductionPreset,LOUDNESS_CONCISE} from '../src/productionPresets.ts';
import {countEnglishWords,assertConciseExplanation} from '../src/editorialPolicy.ts';
import {getNarratedTimeline} from '../src/narrationTiming.ts';
import {runtimeQuiz} from '../src/production.ts';
import {timingReport} from '../scripts/timingReport.ts';
import {assertFinalMix} from '../scripts/finalMix.ts';
import {assembleGeneratedDraft,CONCISE_PROMPT_VERSION,CONCISE_SCHEMA_VERSION} from '../scripts/generationContent.ts';
import {generationCostBound} from '../scripts/generationModels.ts';
import {assertProductionPricing} from '../scripts/productionBudget.ts';
const repo=new URL('../',import.meta.url),json=async p=>JSON.parse(await readFile(p,'utf8'));
const exists=p=>access(p).then(()=>true,()=>false);
const temporary=async t=>{const root=await mkdtemp(join(tmpdir(),'pipeline-a-'));t.after(()=>rm(root,{recursive:true,force:true}));return root;};
const fixture=async t=>{const root=await temporary(t);for(const file of ['content/voice-profiles/selected-default.json','content/voice-profiles/a-baseline.json','content/voice-profiles/c-achird.json','content/production/default.json']){
 const p=join(root,file);await mkdir(dirname(p),{recursive:true});await copyFile(new URL(file,repo),p);}
 let calls=0;const deps={root,log:()=>{},interactive:false,preflight:async()=>({ready:true,blockers:[],checks:{fixture:'local dependencies mocked'},providerCalls:0}),
  loadPaidConfig:()=>{},imageClient:async()=>{calls++;throw new Error('MOCK uncertain provider outcome');}};
 return {root,deps,get calls(){return calls;},args:['--scenario','Beginner Korean at a convenience store','--voice','kore','--background','new','--background-character','adult woman','--no-music','--job-id','planned'],job:join(root,'data/production-jobs/planned/job.json')};};

test('money suggestions round UP in integer cents plus one cent; explicit yes needs a cap before job creation',()=>{
 assert.equal(moneyUnits('0.73'),730000000);assert.equal(suggestedCap(.730335),.75);assert.equal(suggestedCap(.729895),.74);
 for(const v of ['NaN','Infinity','1e9','-1','0.0000000001'])assert.throws(()=>moneyUnits(v));
 assert.throws(()=>parseVideoArguments(['--scenario','Hotel','--yes']),/explicit numeric/u);
 assert.throws(()=>parseVideoArguments(['--scenario','Hotel','--music','auto']),/Checkpoint A/u);
 assert.throws(()=>parseVideoArguments(['--scenario','Hotel','--palette','auto']),/Unknown/u);
});
test('help succeeds with no setup, credentials, job or provider activity; automatic ID handles collisions',async t=>{
 const root=await temporary(t);assert.equal((await runVideo(['--help'],{root,log:()=>{}})).help,true);assert.equal(await exists(join(root,'data')),false);
 await mkdir(join(root,'data/production-jobs/collision'),{recursive:true});let n=0;
 const options=await resolveVideoDestination({scenario:'Hotel'},root,()=>n++?'unique':'collision');assert.equal(options.jobId,'unique');assert.equal(options.output,'out/unique.mp4');assert.equal(options.productionPreset,'concise-v1');
});
test('zero-call dry run creates an unauthorised concise job; read-only resume preserves its bytes',async t=>{
 const f=await fixture(t),p=await runVideo([...f.args,'--dry-run','--yes','--max-cost-usd','0.80'],f.deps),before=await readFile(f.job);
 assert.equal(p.providerCalls,0);assert.equal(f.calls,0);assert.equal((await json(f.job)).paidOptIn,false);assert.equal((await json(f.job)).config.productionPreset,'concise-v1');
 assert.equal((await json(f.job)).config.contentPolicy,'concise-explanations-v1');
 assert.equal(p.assets.image.action,'generate');assert.match(p.resumeCommand,/--resume planned/u);
 await runVideo(['--resume','planned','--dry-run'],f.deps);assert.deepEqual(await readFile(f.job),before);
 const manual=await runVideo(['--resume','planned','--dry-run','--review-mode','manual'],f.deps);assert.equal(manual.acceptance.kind,'manual');
 await assert.rejects(runVideo(['--resume','planned','--dry-run','--background','new'],f.deps),/bound background/u);
 await assert.rejects(runVideo(['--resume','planned','--dry-run','--output','out/different.mp4'],f.deps),/original output/u);
 assert.deepEqual(await readFile(f.job),before);
 assert.equal(await exists(join(f.root,'data/generation-budgets/produce-planned.json')),false);
});
test('noninteractive, rejected and declined caps leave no authorization; a later valid exact cap can commit',async t=>{
 const f=await fixture(t);
 await assert.rejects(runVideo(f.args,f.deps),/Confirmation needed/u);assert.equal((await json(f.job)).paidOptIn,false);
 await assert.rejects(runVideo(['--resume','planned','--max-cost-usd','0.80'],f.deps),/Confirmation needed/u);
 await assert.rejects(runVideo(['--resume','planned','--max-cost-usd','0.01','--yes'],f.deps),/below conservative/u);
 assert.equal((await json(f.job)).maxCostUSD,undefined);assert.equal(await exists(join(f.root,'data/generation-budgets/produce-planned.json')),false);
 await assert.rejects(runVideo(['--resume','planned'],{...f.deps,interactive:true,confirm:async()=>false}),/declined/u);
 await assert.rejects(runVideo(['--resume','planned','--max-cost-usd','0.80','--yes'],f.deps),/Images API failed/u);
 assert.equal(f.calls,1);assert.equal((await json(f.job)).maxCostUSD,.8);assert.equal((await json(f.job)).paidOptIn,true);
 await assert.rejects(runVideo(['--resume','planned','--max-cost-usd','0.81','--yes'],f.deps),/Stored total cap|stored \$0.8/u);
});
test('blockers and failed local readiness prevent commit; confirmation occurs under the held job lock',async t=>{
 const f=await fixture(t);
 await assert.rejects(runVideo(f.args,{...f.deps,preflight:async()=>({ready:false,blockers:['model missing'],checks:{},providerCalls:0})}),/model missing/u);
 assert.equal((await json(f.job)).paidOptIn,false);assert.equal(f.calls,0);
 await assert.rejects(runVideo(['--resume','planned'],{...f.deps,interactive:true,confirm:async()=>{
  await assert.rejects(acquireJobLock(dirname(f.job)),/locked/u);return false;}}),/declined/u);
});
test('same-machine dead locks recover automatically; active, reused PID, permission, legacy and foreign owners are protected',async t=>{
 const root=await temporary(t),release=await acquireJobLock(root),file=join(root,'job.lock'),owner=await json(file);
 assert.equal((await classifyLockOwner(owner,owner.machine,()=>({alive:true}),async()=>owner.processStart)).state,'active');
 assert.equal((await classifyLockOwner(owner,owner.machine,()=>({alive:true}),async()=>'different-start')).state,'unknown');
 assert.equal((await classifyLockOwner(owner,owner.machine,()=>({alive:false,unknown:true}))).state,'unknown');
 assert.equal((await classifyLockOwner(owner,'foreign-machine',()=>({alive:false}))).state,'unknown');
 assert.equal((await classifyLockOwner({pid:1},owner.machine,()=>({alive:false}))).state,'unknown');
 await assert.rejects(acquireJobLock(root,true),/active/u);await release();
 await writeFile(file,JSON.stringify({...owner,pid:99999999}));
 const competing=await Promise.allSettled([acquireJobLock(root),acquireJobLock(root)]);assert.equal(competing.filter(r=>r.status==='fulfilled').length,1);
 for(const r of competing)if(r.status==='fulfilled')await r.value();
 await writeFile(file,JSON.stringify({...owner,machine:'foreign-machine'}));await assert.rejects(acquireJobLock(root,true),/unknown/u);
});
test('a hard-exited local owner is recovered; cooperative cancellation waits for owned children and preserves uncertain reservations',async t=>{
 const root=await temporary(t),module=new URL('../scripts/jobLocks.ts',import.meta.url).href;
 const child=spawn(process.execPath,['--experimental-strip-types','--input-type=module','-e',`import {acquireJobLock} from ${JSON.stringify(module)};await acquireJobLock(${JSON.stringify(root)});process.exit(0);`],{stdio:'ignore',windowsHide:true});
 await new Promise((ok,fail)=>{child.once('error',fail);child.once('close',c=>c===0?ok():fail(new Error('lock child failed')));});
 const release=await acquireJobLock(root);await release();
 const controller=new AbortController();let worker;
 await withCancellation(controller.signal,async()=>{worker=spawn(process.execPath,['-e','setInterval(()=>{},1000)'],{stdio:'ignore',windowsHide:true});ownWorker(worker);
  setTimeout(()=>controller.abort(),50);await new Promise(ok=>worker.once('close',ok));});assert.notEqual(worker.exitCode,null);
 const f=await fixture(t),cancel=new AbortController();
 await assert.rejects(withCancellation(cancel.signal,()=>runVideo([...f.args,'--yes','--max-cost-usd','0.80'],{...f.deps,imageClient:async()=>{cancel.abort();throw new Error('mock in-flight uncertainty');}})),/cancelled/u);
 const j=await json(f.job),b=await json(join(f.root,'data/generation-budgets/produce-planned.json'));
 assert.equal(j.state,'cancelled');assert.equal(await exists(join(dirname(f.job),'job.lock')),false);
 assert(Object.values(b.allocations).some(a=>a.state==='uncertain'));assert(Object.values(b.allocations).some(a=>a.chargedUnits>0));
});
test('new editorial limits are deterministic and separate from character counts; rate stays 1',()=>{
 assert.equal(countEnglishWords("You've found Wi-Fi, please."),5);assertConciseExplanation('Use this polite request to order one drink.');
 assert.throws(()=>assertConciseExplanation('Hello. Another sentence.'),/one useful English sentence/u);
 assert.throws(()=>assertConciseExplanation('One two three four five six seven eight nine ten eleven twelve thirteen.'),/got 13/u);
 const p=resolveProductionPreset('concise-v1');assert.equal(p.timing.countdown,90);assert.equal(p.timing.countdownHard,120);
 assert.equal(resolveProductionPreset('concise-v1',5).timing.countdownHard,150);
 assert.equal(resolveProductionPreset().timing.countdown,150);assert.deepEqual(p.music,{idle:.45,thinking:.30,speech:.20});
});
test('real measured cached fixture timing accounts for every frame, preserves pauses and never overlaps countdown speech',async()=>{
 const props=await json(new URL('./fixtures/restaurant-measured-timeline.json',import.meta.url));
 const legacy=getNarratedTimeline(props.narration,runtimeQuiz(props.quiz)),preset=resolveProductionPreset('concise-v1'),t=getNarratedTimeline(props.narration,runtimeQuiz(props.quiz),preset.timing),report=timingReport(t);
 assert(t.durationInFrames<legacy.durationInFrames);assert.equal(Object.values(report.frames).reduce((a,b)=>a+b,0),t.durationInFrames);
 assert.deepEqual(t.questions.map(q=>q.revealStart-q.countdownStart),[90,90,90,90,120,120]);
 const bonus=t.questions.at(-1),comment=t.audio.find(a=>a.role==='comment'),follow=t.audio.find(a=>a.role==='follow');
 assert.equal(follow.start-comment.end,45);assert.equal(bonus.end-follow.end,30);assert.equal(t.durationInFrames-bonus.end,12);
 assert.equal(props.narration.profile.speakingRate,1); // No TTS speed adjustment.
});
test('encoded final mix enforces intended true-peak ceiling/tolerance and integrated loudness, not exact LRA',()=>{
 assertFinalMix({integratedLUFS:-14,truePeakDbTP:-1.41,loudnessRangeLU:20},LOUDNESS_CONCISE);
 for(const m of [{integratedLUFS:-15,truePeakDbTP:-2},{integratedLUFS:-14,truePeakDbTP:-1.3},{integratedLUFS:NaN,truePeakDbTP:-2}])assert.throws(()=>assertFinalMix(m,LOUDNESS_CONCISE),/Encoded final mix/u);
});

test('concise generated schema is versioned and rejects long speech while legacy accepted content remains loadable',async()=>{
 const source=await json(new URL('../drafts/public-transit-02-candidate/draft.json',import.meta.url)),key=await json(new URL('../drafts/public-transit-02-candidate/answer-key.json',import.meta.url));
 const education=source.quiz.questions.map((q,i)=>({scenario:q.scenario,prompt:q.prompt,context:q.context,spokenPrompt:q.spokenPrompt,choices:q.choices,
  correctAnswerIndex:i===5?key.correctAnswerIndex:q.correctAnswerIndex,translation:i===5?key.translation:q.reveal.translation,explanation:i===5?key.explanation:q.explanation,teachingPoint:i===5?key.teachingPoint:q.reveal.teachingPoint,
  ...(i<5?{explanationNarration:source.narration.segments.find(s=>s.contentId===q.id&&s.role==='explanation').text}:{})}));
 education[0].explanationNarration='One two three four five six seven eight nine ten eleven twelve thirteen.';
 const raw={questions:education.slice(0,5),bonus:education[5]};
 assert.equal(assembleGeneratedDraft(raw,source.brief,'legacy-test',source.provenance).draft.narration.segments.length,19);
 assert.throws(()=>assembleGeneratedDraft(raw,source.brief,'new-test',{...source.provenance,promptVersion:CONCISE_PROMPT_VERSION,schemaVersion:CONCISE_SCHEMA_VERSION},undefined,false,'concise-explanations-v1'),/got 13/u);
});
test('SIGINT/SIGTERM handlers cancel cooperatively; lock release never unlinks another owner token',async t=>{
 for(const signal of ['SIGINT','SIGTERM'])await assert.rejects(withSignalCancellation(async()=>{process.emit(signal);checkCancellation();}),/cancelled/u);
 const root=await temporary(t),release=await acquireJobLock(root),file=join(root,'job.lock'),owner=await json(file);
 await writeFile(file,JSON.stringify({...owner,token:'replacement-owner'}));await release();assert.equal((await json(file)).token,'replacement-owner');
});
test('expiry errors name the provider/model, official source and exact config field without extending dates',()=>{
 const future=new Date('2030-01-01T00:00:00Z');
 assert.throws(()=>generationCostBound(12000,'gpt-6-luna',future),e=>/OpenAI gpt-6-luna/u.test(e.message)&&/https:\/\//u.test(e.message)&&/MODEL_PROFILES.*verifyAgainBy/u.test(e.message));
 assert.throws(()=>assertProductionPricing(future),e=>/Google Cloud Chirp/u.test(e.message)&&/PRODUCTION_PRICING.verifyAgainBy/u.test(e.message)&&/https:\/\//u.test(e.message));
});
