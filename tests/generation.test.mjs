import assert from 'node:assert/strict';
import {readFileSync, existsSync} from 'node:fs';
import {mkdir, mkdtemp, readFile, rm, writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import test from 'node:test';
import {DEFAULT_DRAFT_MODEL, generateDraft, generationCostBound} from '../scripts/openaiGeneration.ts';
import {approveDraft, contentHash, loadProductionDraft, readDraft, writeReview} from '../scripts/draftWorkflow.ts';
import {assembleGeneratedDraft, defaultVoiceProfile,scenarioGenerationOutputSchema,generationPrompt,SCENARIO_PLANNING_INSTRUCTION} from '../scripts/generationContent.ts';

// Manually authored material is used ONLY as a deterministic mock fixture, never as a live generated draft.
const source = JSON.parse(readFileSync(new URL('../content/authored/cafe-friends-02.json', import.meta.url), 'utf8'));
const baseBrief = JSON.parse(readFileSync(new URL('../content/briefs/cafe-friends-02.json', import.meta.url), 'utf8'));
const save = (file, data) => writeFile(file, JSON.stringify(data, null, 2), 'utf8');
const json = async (file) => JSON.parse(await readFile(file, 'utf8'));
const education = () => {
  const questions = source.quiz.questions.map((q, i) => ({scenario: q.scenario, prompt: q.prompt, context: q.context,
    spokenPrompt: q.spokenPrompt, choices: structuredClone(q.choices),
    correctAnswerIndex: i === 5 ? source.bonusAnswerKey.correctAnswerIndex : q.correctAnswerIndex,
    translation: i === 5 ? source.bonusAnswerKey.translation : q.reveal.translation,
    explanation: i === 5 ? source.bonusAnswerKey.explanation : q.explanation,
    teachingPoint: i === 5 ? source.bonusAnswerKey.teachingPoint : q.reveal.teachingPoint,
    ...(i < 5 ? {explanationNarration: source.narration.segments.find((s) => s.contentId === q.id && s.role === 'explanation').text} : {})}));
  return {questions: questions.slice(0, 5), bonus: questions[5]};
};
const response = (data = education(), overrides = {}) => ({id: 'resp_mock', model: DEFAULT_DRAFT_MODEL,
  status: 'completed', incomplete_details: null, _request_id: 'req_mock',
  usage: {input_tokens: 1000, output_tokens: 800, total_tokens: 1800,
    input_tokens_details: {cached_tokens: 0}, output_tokens_details: {reasoning_tokens: 100}},
  output: [{type: 'message', content: [{type: 'output_text', text: JSON.stringify(data)}]}], ...overrides});
const fixture = async (t) => {
  const root = await mkdtemp(join(tmpdir(), 'quiz-generation-test-'));
  t.after(() => rm(root, {recursive: true, force: true}));
  await mkdir(join(root, 'data'), {recursive: true});
  await save(join(root, 'data/legacy-demos.json'), {version: 1, note: 'isolated test', entries: []});
  await mkdir(join(root, 'public/backgrounds'), {recursive: true});
  await writeFile(join(root, 'public/backgrounds/korean-cafe-illustrated-v1.png'), 'fixture');
  const directory = join(root, 'drafts/mock');
  const options = {root, output: directory, brief: {...baseBrief, scenarioType: 'cafe'}, episodeId: 'mock',
    allowPaid: true, maxCostUSD: 0.15, budgetId: 'mock-test', now: new Date('2026-11-04T12:00:00Z'),
    prompt: {system: 'mock system', user: 'mock brief', exampleCount: 2, historyCount: 0}, pause: async () => {}};
  return {root, directory, options, ledger: join(root, 'data/generation-budgets/mock-test.json')};
};

test('dry run and paid opt-in/cost bounds are enforced without a call or draft writes', async (t) => {
  const {directory, options} = await fixture(t);
  const client = {create: () => assert.fail('dry run invoked API')};
  const result = await generateDraft({...options, dryRun: true, client});
  assert.equal(result.calls, 0);
  assert.equal(result.dryRun.estimatedMaximumPerRequestUSD, 0.0248);
  assert.equal(result.dryRun.estimatedMaximumScenarioUSD, 0.0496);
  assert.equal(result.dryRun.reasoningIncludedInOutputLimit, true);
  assert.equal(existsSync(directory), false);
  await assert.rejects(generateDraft({...options, allowPaid: false, client}), /explicit --allow-paid/u);
  await assert.rejects(generateDraft({...options, maxCostUSD: 0.02, client}), /Remaining authorized budget/u);
  assert.throws(() => generationCostBound(12000, 'unverified-model'), /No verified/u);
  assert.throws(() => generationCostBound(12000, DEFAULT_DRAFT_MODEL, new Date('2026-11-11')), /reverified/u);
});

test('valid Structured Output enters existing private review, key, fixed voices/CTA and hash approval workflow', async (t) => {
  const {root, directory, options, ledger} = await fixture(t);
  let calls = 0;
  const result = await generateDraft({...options, client: {create: async (request) => {
    calls++;
    assert.equal(request.text.format.type, 'json_schema');
    assert.equal(request.text.format.strict, true);
    assert.equal(request.store, false);
    assert.equal(request.max_output_tokens, 12000);
    assert.equal(request.tools, undefined);
    assert.equal(request.text.format.schema.properties.approved, undefined);
    return response();
  }}});
  assert.equal(calls, 1); assert.equal(result.report.valid, true);
  const bundle = await readDraft(directory, root);
  assert.equal(bundle.draft.provenance.provider, 'openai');
  assert.equal(bundle.draft.provenance.requestedModel, DEFAULT_DRAFT_MODEL);
  assert.equal(bundle.draft.provenance.returnedModel, DEFAULT_DRAFT_MODEL);
  assert.deepEqual(bundle.draft.narration.profile, defaultVoiceProfile);
  assert.equal(bundle.draft.narration.segments.length, 19);
  assert.equal(bundle.draft.narration.segments.at(-2).text, 'What do you think? Comment your answer!');
  assert.equal(bundle.draft.narration.segments.at(-1).text, 'Follow for more Korean!');
  assert.equal(bundle.draft.quiz.questions[5].correctAnswerIndex, undefined);
  assert.deepEqual(bundle.draft.quiz.questions.map((q) => q.difficulty), ['easy','easy','medium','medium','hard','hard']);
  assert.equal((await json(ledger)).scenarios.mock.attempts.length, 1);
  assert.equal(result.scenarioEstimatedCostUSD, 0.00037); // Reasoning is already included in output_tokens.
  assert.match(await readFile(join(directory, 'review.md'), 'utf8'), /NOT GRANTED/u);
  assert.equal((await json(join(directory, 'narration-plan.json'))).timingRules.afterComment, 45);
  await assert.rejects(loadProductionDraft(directory, true, root), /Unapproved/u);
  assert.ok(existsSync(join(directory, 'generation/attempt-1.response.json')));
  assert.equal(existsSync(join(root, 'data/approvals')), false);
});

test('selected Achird default remains overridable by an explicit validated voice profile', () => {
  assert.equal(defaultVoiceProfile.voices['ko-KR'],'ko-KR-Chirp3-HD-Achird');
  const result=assembleGeneratedDraft(education(),baseBrief,'manual-voice-override',source.provenance,source.narration.profile);
  assert.deepEqual(result.draft.narration.profile,source.narration.profile);
  assert.notDeepEqual(result.draft.narration.profile,defaultVoiceProfile);
});

test('scenario learning plan validates six useful nonblank fields and cannot supply operational settings',()=>{
  const derivedBrief={context:'Order and customize drinks while visiting a café with a friend.',learningObjectives:[
    'Greet staff','Order one drink','Choose a temperature','Add milk','Return the cup','Request charging permission']};
  const raw={...education(),derivedBrief};
  assert.equal(scenarioGenerationOutputSchema.safeParse(raw).success,true);
  for(const invalid of [{...derivedBrief,learningObjectives:[]},{...derivedBrief,context:' '},{...derivedBrief,learningObjectives:[' ',...derivedBrief.learningObjectives.slice(1)]},
    {...derivedBrief,backgroundAssetId:'fake'},{...derivedBrief,voices:{}}])assert.equal(scenarioGenerationOutputSchema.safeParse({...raw,derivedBrief:invalid}).success,false);
  const result=assembleGeneratedDraft(raw,baseBrief,'scenario-fixture',source.provenance,defaultVoiceProfile,true);
  assert.deepEqual(result.draft.brief.learningObjectives,derivedBrief.learningObjectives);assert.equal(result.draft.brief.context,derivedBrief.context);
  assert.equal(result.draft.brief.backgroundAssetId,baseBrief.backgroundAssetId);assert.equal(result.draft.quiz.questions[5].correctAnswerIndex,undefined);
});
test('scenario planning instruction rides in the existing generation prompt and advanced brief fields remain available',async()=>{
  const plan={...baseBrief,context:'Meet a friend at the café.',learningObjectives:['Greet','Order','Customize','Pay','Clear up','Ask permission']};
  const plain=await generationPrompt(plan);assert.equal(JSON.parse(plain.user).brief.context,plan.context);assert.equal(plain.system.includes(SCENARIO_PLANNING_INSTRUCTION),false);
  const scenario=await generationPrompt(baseBrief,undefined,true);assert(scenario.system.includes(SCENARIO_PLANNING_INSTRUCTION));
  assert.match(JSON.parse(scenario.user).briefExpansion,/no separate planning call/u);
});

test('invalid references, Unicode duplicates, schema approval injection and bonus hints get one repair at most', async (t) => {
  for (const [name, mutate] of [
    ['reference', (d) => {d.questions[0].correctAnswerIndex = 3;}],
    ['duplicate', (d) => {d.questions[0].choices[1].hangul = ` ${d.questions[0].choices[0].hangul.normalize('NFD')} `;}],
    ['approval', (d) => {d.approved = true;}],
    ['bonus-hint', (d) => {d.bonus.context = 'The correct answer is B.';}],
    ['bonus-narration', (d) => {d.bonus.explanationNarration = 'The answer is B.';}],
    ['english-voice', (d) => {d.questions[0].explanationNarration = d.questions[0].choices[0].romanization;}],
    ['english-fragment', (d) => {d.questions[1].explanationNarration = 'Use han jan when ordering cups of a drink.';}],
  ]) {
    await t.test(name, async (t) => {
      const {directory, options, ledger} = await fixture(t);
      const bad = education(); mutate(bad); let calls = 0;
      await assert.rejects(generateDraft({...options, client: {create: async () => {calls++; return response(bad);}}}), /two-request limit/u);
      assert.equal(calls, 2);
      assert.equal((await json(ledger)).scenarios.mock.attempts.length, 2);
      const validation = await json(join(directory, 'validation.json'));
      assert.equal(validation.valid, false);
      if (existsSync(join(directory, 'draft.json'))) assert.ok(validation.generationEstimatedCostUSD > 0);
      assert.ok(existsSync(join(directory, 'generation/attempt-1.text.txt')));
      await generateDraft({...options, client: {create: () => assert.fail('rerun made a third call')}}).catch(() => {});
      await assert.rejects(generateDraft({...options,regenerate:true,
        client:{create:()=>assert.fail('explicit regeneration made a third call')}}),/Two-request scenario limit/u);
    });
  }
});

test('refusal is terminal; incomplete output can use the single remaining attempt', async (t) => {
  const {options, directory} = await fixture(t); let calls = 0;
  await assert.rejects(generateDraft({...options, client: {create: async () => {
    calls++; return response(null, {output: [{type:'message', content:[{type:'refusal', refusal:'No'}]}]});
  }}}), /two-request limit/u);
  assert.equal(calls, 1);
  assert.match(await readFile(join(directory, 'review.md'), 'utf8'), /No complete reviewable draft/u);
  const second = await fixture(t); calls = 0;
  const result = await generateDraft({...second.options, client: {create: async () => ++calls === 1
    ? response(null, {status:'incomplete', incomplete_details:{reason:'max_output_tokens'}}) : response()}});
  assert.equal(result.report.valid, true); assert.equal(calls, 2);
  assert.equal((await json(second.ledger)).scenarios.mock.attempts[0].state, 'incomplete');
  assert.equal(existsSync(join(second.directory, 'generation/edits.json')), false);
});

test('one successful repair preserves the invalid raw attempt without recording automatic repair as a human edit', async (t) => {
  const {options, directory, ledger} = await fixture(t); let calls = 0;
  const bad = education(); bad.questions[0].choices[1] = {...bad.questions[0].choices[0]};
  const result = await generateDraft({...options, client:{create:async (request) => {
    if (++calls === 1) return response(bad);
    assert.match(request.input[1].content,/Repair these validation failures/u);
    return response();
  }}});
  assert.equal(result.report.valid,true); assert.equal(calls,2);
  assert.deepEqual((await json(ledger)).scenarios.mock.attempts.map((a) => a.state),['invalid','valid']);
  assert.equal((await json(join(directory,'generation/attempt-1.validation.json'))).valid,false);
  assert.equal(existsSync(join(directory,'generation/edits.json')),false);
});

test('malformed JSON is saved and bounded; no partial draft is presented as valid', async (t) => {
  const {options,directory} = await fixture(t); let calls = 0;
  await assert.rejects(generateDraft({...options,client:{create:async () => {
    calls++; return response(undefined,{output:[{type:'message',content:[{type:'output_text',text:'{"questions":['}]}]});
  }}}),/two-request limit/u);
  assert.equal(calls,2); assert.equal(existsSync(join(directory,'draft.json')),false);
  assert.equal((await json(join(directory,'validation.json'))).valid,false);
  assert.match(await readFile(join(directory,'generation/attempt-1.text.txt'),'utf8'),/questions/u);
});

test('auth, permissions, quota, unsupported models and uncertain timeouts never retry or leak API error text', async (t) => {
  for (const error of [{status:401}, {status:403}, {status:429, code:'insufficient_quota'}, {status:404}, new Error('secret-token')]) {
    const {options, directory, ledger} = await fixture(t); let calls = 0;
    const client = {create: async () => {calls++; throw {...error, message:'secret-token'};}};
    await assert.rejects(generateDraft({...options, client}));
    await assert.rejects(generateDraft({...options, client}));
    assert.equal(calls, 1);
    assert.doesNotMatch(await readFile(join(directory, 'generation-error.json'), 'utf8'), /secret-token/u);
    assert.equal((await json(ledger)).scenarios.mock.attempts[0].chargedUnits, 24800000);
  }
});

test('rate limit shares the two-attempt bound with validation repairs', async (t) => {
  const {options, ledger} = await fixture(t); let calls = 0;
  const bad = education(); bad.questions[0].correctAnswerIndex = 8;
  await assert.rejects(generateDraft({...options, client: {create: async () => {
    if (++calls === 1) throw {status:429, code:'rate_limit_exceeded'};
    return response(bad);
  }}}), /two-request limit/u);
  assert.equal(calls, 2);
  assert.deepEqual((await json(ledger)).scenarios.mock.attempts.map((a) => a.state), ['rate-limit','invalid']);
});

test('shared persisted cap prevents a new scenario call and cannot be increased by rerunning', async (t) => {
  const {options, root} = await fixture(t);
  await generateDraft({...options, maxCostUSD:0.025, client:{create:async () => response()}});
  await assert.rejects(generateDraft({...options, output:join(root,'drafts/other'), episodeId:'other', maxCostUSD:0.025,
    client:{create:()=>assert.fail('budget-exhausted call')}}), /Remaining authorized budget/u);
  await assert.rejects(generateDraft({...options, regenerate:true, maxCostUSD:0.15,
    client:{create:()=>assert.fail('increased budget')}}), /cap cannot be reset/u);
});

test('saved completed response survives a local interruption and resumes without a duplicate request', async (t) => {
  const {options, directory} = await fixture(t); let calls = 0;
  await assert.rejects(generateDraft({...options, client:{create:async () => {calls++; return response();}},
    afterResponseSaved:async () => {throw new Error('local interruption');}}), /local interruption/u);
  assert.ok(existsSync(join(directory,'generation/attempt-1.response.json')));
  const result = await generateDraft({...options, client:{create:()=>assert.fail('duplicate request')}});
  assert.equal(calls, 1); assert.equal(result.calls, 0); assert.equal(result.report.valid, true);
});

test('unknown interrupted billing retains reserve and refuses retry; missing usage is conservatively charged', async (t) => {
  const {options, directory, ledger} = await fixture(t);
  await generateDraft({...options, client:{create:async () => response(undefined, {usage:undefined})}});
  assert.equal((await json(ledger)).scenarios.mock.attempts[0].chargedUnits, 24800000);
  // Simulate an interruption after request reservation but before any durable response.
  const state = await json(ledger); state.scenarios.mock.attempts[0].state = 'pending';
  await save(ledger,state);
  await rm(join(directory,'generation.json'));
  await rm(join(directory,'draft.json'));
  await rm(join(directory,'generation/attempt-1.response.json'));
  await assert.rejects(generateDraft({...options, client:{create:()=>assert.fail('billing-uncertain retry')}}), /billing outcome unknown/u);
  assert.equal((await json(ledger)).scenarios.mock.attempts[0].state, 'uncertain');
});

test('saved draft reuse preserves edits, journals them and invalidates hash approval', async (t) => {
  const {options, directory, root} = await fixture(t);
  await generateDraft({...options, client:{create:async () => response()}});
  const bundle = await readDraft(directory, root);
  const expiredReuse = await generateDraft({...options,now:new Date('2027-01-01'),allowPaid:false,
    client:{create:()=>assert.fail('expired-price cache reuse called API')}});
  assert.equal(expiredReuse.reused,true); assert.equal(expiredReuse.calls,0);
  await assert.rejects(generateDraft({...options,output:join(root,'drafts/relocated'),
    client:{create:()=>assert.fail('relocated duplicate request')}}),/another output directory/u);
  await approveDraft(directory,'Fixture human',bundle.contentHash,true,{root});
  const draft = await json(join(directory,'draft.json'));
  draft.quiz.questions[0].context = 'Say hello at the counter.';
  await save(join(directory,'draft.json'),draft);
  const currentHash = contentHash(draft,bundle.key);
  const result = await generateDraft({...options, client:{create:()=>assert.fail('cached rerun')}});
  assert.equal(result.reused, true); assert.equal(result.calls, 0);
  assert.equal(result.report.contentHash,currentHash);
  assert.equal((await json(join(directory,'generation/edits.json')))[0].contentHash,currentHash);
  await assert.rejects(loadProductionDraft(directory,true,root), /Unapproved or changed/u);
  await assert.rejects(generateDraft({...options,regenerate:true}), /Human edits detected/u);
});

test('non-café content reviews without invented assets; production still requires a matching approved file', async (t) => {
  const {options, root, directory} = await fixture(t);
  const result = await generateDraft({...options,brief:{...options.brief,scenarioType:'public-transit',backgroundAssetId:null},
    client:{create:async () => response()}});
  assert.equal(result.report.valid,true); assert.equal(result.report.renderReady,false);
  assert.match(result.report.renderBlockers.join(' '),/Matching approved background missing/u);
  const bundle = await readDraft(directory,root);
  await approveDraft(directory,'Fixture human',bundle.contentHash,true,{root});
  await assert.rejects(loadProductionDraft(directory,true,root), /Production blocked/u);
  const draft = await json(join(directory,'draft.json'));
  draft.brief.backgroundAssetId = 'korean-cafe-illustrated-v1'; draft.quiz.backgroundAssetId = 'korean-cafe-illustrated-v1';
  await save(join(directory,'draft.json'),draft);
  const report = await writeReview(directory,root);
  assert.equal(report.valid,true); assert.match(report.renderBlockers.join(' '),/does not match/u);
  draft.brief.backgroundAssetId = null; draft.quiz.backgroundAssetId = null;
  draft.quiz.questions[0].prompt = 'x'.repeat(101);
  await save(join(directory,'draft.json'),draft);
  const invalid = await writeReview(directory,root);
  assert.equal(invalid.valid,false);
  assert.match(invalid.renderBlockers.join(' '),/Matching approved background missing/u);
});
