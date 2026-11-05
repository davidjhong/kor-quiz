import assert from 'node:assert/strict';
import test from 'node:test';
import {readFileSync} from 'node:fs';
import {mkdir,mkdtemp,readFile,rm,writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {GENERATION_SYSTEM_PROMPT,PROMPT_VERSION,SCHEMA_VERSION} from '../scripts/generationContent.ts';
import {freezeGenerationExperiment,loadGenerationExperiment} from '../scripts/generationExperiment.ts';
import {generationCostBound,QUALITY_DRAFT_MODEL} from '../scripts/generationModels.ts';
import {generateDraft} from '../scripts/openaiGeneration.ts';
import {contentHash,writeReview} from '../scripts/draftWorkflow.ts';
import {canonical,sha256} from '../scripts/narrationFiles.ts';

const authored = JSON.parse(readFileSync(new URL('../content/authored/cafe-friends-02.json',import.meta.url),'utf8'));
const baseBrief = JSON.parse(readFileSync(new URL('../content/briefs/cafe-friends-02.json',import.meta.url),'utf8'));
const save = (file,data) => writeFile(file,JSON.stringify(data,null,2),'utf8');
const json = async (file) => JSON.parse(await readFile(file,'utf8'));
const now = new Date('2026-11-04T12:00:00Z');
const response = () => {
  const all = authored.quiz.questions.map((q,i)=>({scenario:q.scenario,prompt:q.prompt,context:q.context,
    spokenPrompt:q.spokenPrompt,choices:q.choices,correctAnswerIndex:i===5?authored.bonusAnswerKey.correctAnswerIndex:q.correctAnswerIndex,
    translation:i===5?authored.bonusAnswerKey.translation:q.reveal.translation,
    explanation:i===5?authored.bonusAnswerKey.explanation:q.explanation,
    teachingPoint:i===5?authored.bonusAnswerKey.teachingPoint:q.reveal.teachingPoint,
    ...(i<5?{explanationNarration:authored.narration.segments.find((s)=>s.contentId===q.id&&s.role==='explanation').text}:{})}));
  return {id:'resp_mock',model:QUALITY_DRAFT_MODEL,status:'completed',incomplete_details:null,_request_id:'req_mock',
    usage:{input_tokens:1000,output_tokens:800,total_tokens:1800,input_tokens_details:{cached_tokens:0},output_tokens_details:{reasoning_tokens:100}},
    output:[{type:'message',content:[{type:'output_text',text:JSON.stringify({questions:all.slice(0,5),bonus:all[5]})}]}]};
};
const fixture = async (t) => {
  const root = await mkdtemp(join(tmpdir(),'quiz-frozen-experiment-'));
  t.after(()=>rm(root,{recursive:true,force:true}));
  await mkdir(join(root,'data'),{recursive:true});
  await save(join(root,'data/legacy-demos.json'),{version:1,note:'test fixture',entries:[]});
  await mkdir(join(root,'public/backgrounds'),{recursive:true});
  await writeFile(join(root,'public/backgrounds/korean-cafe-illustrated-v1.png'),'fixture');
  const scenarios=[];
  for (const [i,scenarioType] of ['cafe','convenience-store','public-transit'].entries()) {
    const briefFile=`brief-${i}.json`;
    await save(join(root,briefFile),{...baseBrief,scenarioType,backgroundAssetId:i===0?'korean-cafe-illustrated-v1':null});
    scenarios.push({episodeId:`quality-${i}`,briefFile,output:`drafts/quality-${i}`,baseline:`drafts/old-${i}`});
  }
  const spec={version:1,experimentId:'quality-test',budgetId:'quality-test',model:QUALITY_DRAFT_MODEL,
    maxOutputTokens:12000,maxCostUSD:0.12,scenarios};
  const file=join(root,'data/frozen.json');
  const freezeOptions={root,now,getPrompt:async (brief)=>({system:GENERATION_SYSTEM_PROMPT,user:JSON.stringify(brief),exampleCount:2,historyCount:0})};
  await freezeGenerationExperiment(spec,file,freezeOptions);
  const options=async (i=0)=>({root,now,experiment:file,brief:await json(join(root,scenarios[i].briefFile)),
    episodeId:scenarios[i].episodeId,output:join(root,scenarios[i].output),model:spec.model,maxOutputTokens:spec.maxOutputTokens,
    budgetId:spec.budgetId,maxCostUSD:spec.maxCostUSD,allowPaid:true});
  return {root,file,spec,freezeOptions,options};
};

test('freeze is offline, reproducible, bounded and binds all three briefs to one contract',async (t)=>{
  const {file,spec,freezeOptions}=await fixture(t);
  const ex=await loadGenerationExperiment(file);
  assert.equal(ex.payload.contract.promptVersion,PROMPT_VERSION);
  assert.equal(ex.payload.contract.schemaVersion,SCHEMA_VERSION);
  assert.ok(ex.payload.scenarios.every((s)=>s.prompt.system===GENERATION_SYSTEM_PROMPT));
  assert.equal(generationCostBound(12000,QUALITY_DRAFT_MODEL,now),18800000);
  const rerun=await freezeGenerationExperiment(spec,file,freezeOptions);
  assert.equal(rerun.reused,true); assert.equal(rerun.paidCalls,0);
  assert.equal(rerun.estimatedMaximumUSD,0.1128);
  await assert.rejects(freezeGenerationExperiment({...spec,maxCostUSD:0.10},file,freezeOptions),/cap does not cover/u);
  await assert.rejects(freezeGenerationExperiment({...spec,maxCostUSD:0.13},file,freezeOptions),/already frozen/u);
});

test('all scenarios use the exact frozen model/settings and one shared experiment ledger',async(t)=>{
  const {root,file,options}=await fixture(t); let calls=0;
  for(let i=0;i<3;i++) {
    const opt=await options(i);
    const result=await generateDraft({...opt,client:{create:async(body)=>{
      calls++; assert.equal(body.model,QUALITY_DRAFT_MODEL); assert.equal(body.reasoning.effort,'medium');
      assert.equal(body.max_output_tokens,12000); assert.equal(body.input[0].content,GENERATION_SYSTEM_PROMPT);
      assert.equal(body.service_tier,'default'); return response();
    }}});
    assert.equal(result.report.valid,true);
  }
  assert.equal(calls,3);
  const ledger=await json(join(root,'data/generation-budgets/quality-test.json'));
  assert.equal(ledger.contractHash,(await loadGenerationExperiment(file)).hash);
  assert.equal(ledger.pricing,'gpt-6-luna-2026-11-04');
  assert.equal(Object.values(ledger.scenarios).reduce((n,s)=>n+s.attempts.length,0),3);
  await assert.rejects(generateDraft({...await options(0),regenerate:true,
    client:{create:()=>assert.fail('selective quality regeneration')}}),/quality polishing/u);
});

test('changed brief, model, settings or scope fails before a request',async(t)=>{
  const {root,options}=await fixture(t),opt=await options();
  const client={create:()=>assert.fail('changed experiment called API')};
  for(const change of [{model:'gpt-5-nano-2025-08-07'},{maxOutputTokens:16000},{maxCostUSD:0.13},
    {episodeId:'outside-experiment'},{output:join(root,'drafts/other')}]) {
    await assert.rejects(generateDraft({...opt,...change,client}),/frozen|Frozen/u);
  }
  await save(join(root,'brief-0.json'),{...opt.brief,scenario:'Changed brief'});
  await assert.rejects(generateDraft({...opt,client}),/brief changed/u);
});

test('tampered freeze and changed contract cannot be mixed into an experiment',async(t)=>{
  const {file,options}=await fixture(t),opt=await options(),original=await json(file);
  const changed=structuredClone(original); changed.payload.contract.promptVersion='other-experiment';
  await save(file,changed);
  await assert.rejects(loadGenerationExperiment(file),/hash mismatch/u);
  changed.hash=sha256(canonical(changed.payload)); await save(file,changed);
  await assert.rejects(generateDraft({...opt,client:{create:()=>assert.fail('mixed contracts')}}),/contract changed/u);
});

test('legacy price ledgers cannot fund the upgrade; no implicit budget/model reset',async(t)=>{
  const {root,options}=await fixture(t),opt=await options();
  await mkdir(join(root,'data/generation-budgets'),{recursive:true});
  const ledger={version:1,budgetId:opt.budgetId,capUnits:120000000,createdAt:now.toISOString(),
    pricing:'gpt-5-nano-2026-11-04',scenarios:{}};
  const file=join(root,'data/generation-budgets/quality-test.json'); await save(file,ledger);
  await assert.rejects(generateDraft({...opt,client:{create:()=>assert.fail('legacy budget spent')}}),/different model or frozen contract/u);
  assert.deepEqual(await json(file),ledger);
});

test('unexpected returned model stays billing-uncertain with no fallback or retry',async(t)=>{
  const {root,options}=await fixture(t),opt=await options(); let calls=0;
  await assert.rejects(generateDraft({...opt,client:{create:async()=>{calls++;return {...response(),model:'unexpected-model'};}}}),/no fallback/u);
  await assert.rejects(generateDraft({...opt,client:{create:()=>assert.fail('uncertain retry')}}),/billing-uncertain/u);
  assert.equal(calls,1);
  const ledger=await json(join(root,'data/generation-budgets/quality-test.json'));
  assert.equal(ledger.scenarios['quality-0'].attempts[0].state,'uncertain');
  assert.equal(ledger.scenarios['quality-0'].attempts[0].chargedUnits,18800000);
});

test('review labels assistant revisions separately and warns when the revision hash becomes stale',async(t)=>{
  const {options,root}=await fixture(t),opt=await options();
  await generateDraft({...opt,client:{create:async()=>response()}});
  const draft=await json(join(opt.output,'draft.json')),key=await json(join(opt.output,'answer-key.json'));
  const sourceContentHash=contentHash(draft,key),before=draft.quiz.questions[0].context;
  draft.quiz.questions[0].context='Greet the staff at the counter.';
  await save(join(opt.output,'draft.json'),draft);
  await save(join(opt.output,'revision.json'),{version:1,kind:'coding-assistant-content-revision',sourceDirectory:'isolated mock source',
    sourceContentHash,revisedContentHash:contentHash(draft,key),recordedAt:now.toISOString(),
    changes:[{field:'quiz.questions[0].context',before,after:draft.quiz.questions[0].context,reason:'Test-only context wording revision'}]});
  const report=await writeReview(opt.output,root);
  assert.equal(report.valid,true);
  assert.match(await readFile(join(opt.output,'review.md'),'utf8'),/not unedited model output/u);
  assert.ok(!report.warnings.some((w)=>w.includes('earlier hash')));
  draft.quiz.questions[0].context='Greet staff as you enter.';await save(join(opt.output,'draft.json'),draft);
  assert.match((await writeReview(opt.output,root)).warnings.join(' '),/revision record describes an earlier hash/u);
});
