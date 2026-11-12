import assert from 'node:assert/strict';
import test from 'node:test';
import {mkdtemp,readFile,writeFile,mkdir,copyFile,rm,access} from 'node:fs/promises';
import {join,dirname,resolve} from 'node:path';
import {tmpdir} from 'node:os';
import {loadBackgroundCatalog,selectCatalogAsset,recordCompletedBackgroundUse,inspectBackgroundPNG,writePrivateJson,catalogSchema,catalogFile} from '../scripts/backgroundCatalog.ts';
import {backgroundOptionsSchema,planBackground,prepareBackground,imageAllowanceUSD,makeBackgroundPrompt} from '../scripts/backgroundImages.ts';
import {loadJobBudget,chargedUnits} from '../scripts/productionBudget.ts';
import {produceQuestionPreview} from '../scripts/questionPreviewPipeline.ts';
import {reviewQuestionPreview,validatePreviewFindings} from '../scripts/previewReview.ts';
import {questionExcerptInputSchema,getQuestionExcerptTimeline} from '../src/questionExcerptModel.ts';
import {draftQuizSchema} from '../src/draftSchema.ts';
import {getIllustratedQuestionState} from '../src/questionTiming.ts';
import {renderBackgroundSchema} from '../src/assets/backgroundSchema.ts';
import {sha256} from '../scripts/narrationFiles.ts';
import {groupAlignedText} from '../scripts/productionCaptions.ts';
import {makeCaptionPhrases} from '../src/phraseCaptions.ts';
const repo=new URL('../',import.meta.url),json=async p=>JSON.parse(await readFile(p,'utf8'));
const exists=p=>access(p).then(()=>true,()=>false);
const fixture=async t=>{const parent=resolve(tmpdir()),root=await mkdtemp(join(parent,'quiz-background-test-'));assert.equal(dirname(root),parent);t.after(()=>rm(root,{recursive:true,force:true}));
  const folder=join(root,'data/production-jobs/image-test');await mkdir(folder,{recursive:true});
  const options=backgroundOptionsSchema.parse({character:'adult woman'}),brief={scenario:'Beginner Korean ordering food in a restaurant.',scenarioType:'restaurant',backgroundAssetId:null};
  const plan=await planBackground(root,brief,'fixture',options),budget=await loadJobBudget(root,'image-test',2,true);
  // Deliberately tiny mock payload. No generated fixture is used by a real render.
  const bytes=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a5X8AAAAASUVORK5CYII=','base64');
  const response={created:1804896000,data:[{b64_json:bytes.toString('base64')}],requestId:'fixture-request',usage:{input_tokens:100,output_tokens:1000,total_tokens:1100,input_tokens_details:{text_tokens:100,image_tokens:0}}};
  let calls=0;return {root,folder,options,brief,plan,budget,bytes,response,get calls(){return calls;},client:async()=>{calls++;return response;},inspect:async(file)=>({width:1024,height:1536,format:'png',sha256:sha256(await readFile(file))})};};
test('meaningful matching reuse, explicit setting override, retired assets retained, and configurable limits',async t=>{
  const f=await fixture(t);assert.equal(selectCatalogAsset(await loadBackgroundCatalog(f.root),'cafe'),'korean-cafe-illustrated-v1');
  await prepareBackground({...f,binding:f.plan.binding});let c=await loadBackgroundCatalog(f.root),id=c.entries[0].render.id;
  assert.equal(selectCatalogAsset(c,'restaurant'),id);assert.throws(()=>selectCatalogAsset(c,'hotel',{explicit:id}),/match/u);
  c.entries[0].completedEpisodeIds=['e1','e2','e3','e4','e5'];assert.equal(selectCatalogAsset(c,'restaurant'),null);
  assert.equal(selectCatalogAsset(c,'restaurant',{limit:10}),id);assert.equal(selectCatalogAsset(c,'restaurant',{explicit:id}),id);
  assert.equal(selectCatalogAsset(c,'restaurant',{fresh:true}),null);assert.throws(()=>selectCatalogAsset(c,'restaurant',{limit:11}));assert.equal(c.entries.length,1);
});

test('explicit woman/man characters and fresh mode persist new setting-specific requests independently of voice',async t=>{
  const f=await fixture(t);await prepareBackground({...f,binding:f.plan.binding});
  for(const [setting,character] of [['restaurant','adult woman'],['hotel','adult man']]){
    const options=backgroundOptionsSchema.parse({mode:'new',character});
    const brief={scenario:`Beginner Korean at a ${setting}`,scenarioType:setting,backgroundAssetId:null};
    const p=await planBackground(f.root,brief,`fresh-${setting}`,options);
    assert.equal(p.action,'generate');assert.equal(p.maximumRequests,1);assert.equal(p.providerCalls,0);
    assert.match(p.binding.request.prompt,new RegExp(`Friendly ${character},`,'u'));
    assert.equal(p.binding.request.setting,setting);
    assert.equal(p.binding.request.n,1);
    assert.doesNotMatch(p.binding.request.prompt,/\b(?:Achird|Kore|narrator)\b/iu);
    if(setting==='hotel')assert.match(p.binding.request.prompt,/hotel lobby with a reception desk/u);
    const resumed=await planBackground(f.root,brief,`fresh-${setting}`,options,p.binding);
    assert.deepEqual(resumed.binding,p.binding);
  }
  assert.throws(()=>backgroundOptionsSchema.parse({character:'infer from narrator'}));
});
test('preview consumes no production usage; distinct completed episode IDs are idempotent across resumes',async t=>{
  const f=await fixture(t);await prepareBackground({...f,binding:f.plan.binding});const id=f.plan.binding.assetId;
  await recordCompletedBackgroundUse(f.root,id,'preview',true);assert.deepEqual((await loadBackgroundCatalog(f.root)).entries[0].completedEpisodeIds,[]);
  await recordCompletedBackgroundUse(f.root,id,'episode-01');await recordCompletedBackgroundUse(f.root,id,'episode-01');
  assert.deepEqual((await loadBackgroundCatalog(f.root)).entries[0].completedEpisodeIds,['episode-01']);
});
test('bound image remains selected even when catalog availability/reuse limits change',async t=>{
  const f=await fixture(t);await prepareBackground({...f,binding:f.plan.binding});
  const plan=await planBackground(f.root,f.brief,'different-scope',{...f.options,mode:'new'},f.plan.binding);
  assert.equal(plan.action,'reuse');assert.equal(plan.binding.assetId,f.plan.binding.assetId);assert.equal(plan.maximumRequests,0);
});
test('shared image allowance refuses insufficient budget before SDK request',async t=>{
  const f=await fixture(t);f.budget.budget.capUnits=1;
  await assert.rejects(prepareBackground({...f,binding:f.plan.binding}),/budget exhausted/u);assert.equal(f.calls,0);
});
test('interruption after durable result recovers image/catalog/receipt without another request',async t=>{
  const f=await fixture(t);await assert.rejects(prepareBackground({...f,binding:f.plan.binding,afterResponseSaved:async()=>{throw new Error('fixture interruption');}}),/failed/u);
  assert.equal(f.calls,1);const saved=chargedUnits(f.budget.budget);assert(saved>0);
  const restored=await prepareBackground({...f,binding:f.plan.binding});assert.equal(f.calls,1);assert.equal(restored.newImageRequests,0);
  assert.equal((await loadBackgroundCatalog(f.root)).entries.length,1);assert.equal(await exists(restored.receipt),true);
  const before=await readFile(join(f.root,'public',restored.asset.file));assert.deepEqual(before,f.bytes);
  assert.equal(chargedUnits(f.budget.budget),30500000);
});
test('unknown image outcomes retain reservations and never automatically retry or change models',async t=>{
  const f=await fixture(t);let calls=0;const options={...f,binding:f.plan.binding,client:async()=>{calls++;throw new Error('timeout');}};
  await assert.rejects(prepareBackground(options),/No automatic retry/u);const reserved=chargedUnits(f.budget.budget);
  await assert.rejects(prepareBackground(options),/no retry made/u);assert.equal(calls,1);assert.equal(chargedUnits(f.budget.budget),reserved);
  assert.throws(()=>backgroundOptionsSchema.parse({model:'gpt-image-1-mini'}));
});
test('image-sized durable base64 response recovers beyond the ordinary content JSON limit',async t=>{
  const f=await fixture(t);const bytes=await readFile(new URL('public/backgrounds/korean-hotel-illustrated-v1.png',repo));
  // A large real PNG payload; codec/dimensions are injected by this persistence-only mock.
  f.response.data[0].b64_json=bytes.toString('base64');
  await assert.rejects(prepareBackground({...f,binding:f.plan.binding,afterResponseSaved:async()=>{throw new Error('interrupt large response');}}));
  const recovered=await prepareBackground({...f,binding:f.plan.binding});assert.equal(f.calls,1);assert.equal(recovered.newImageRequests,0);
  assert.deepEqual(await readFile(join(f.root,'public',recovered.asset.file)),bytes);
});
test('corrupt image processing retains response and missing/corrupt assets are actionable',async t=>{
  const f=await fixture(t);const o={...f,binding:f.plan.binding,inspect:async()=>{throw new Error('corrupt PNG fixture');}};
  await assert.rejects(prepareBackground(o),/corrupt PNG/u);await assert.rejects(prepareBackground(o),/corrupt PNG/u);assert.equal(f.calls,1);
  const bad=join(f.root,'bad.png');await writeFile(bad,'not a PNG');await assert.rejects(inspectBackgroundPNG(bad,f.root),/complete PNG/u);
  await assert.rejects(inspectBackgroundPNG(join(f.root,'missing.png'),f.root),/ENOENT/u);
});
test('actual bundled FFmpeg fully decodes a known local PNG with its supported rawvideo null encoder',async()=>{
  const root=resolve(new URL('../',import.meta.url).pathname.replace(/^\/([A-Za-z]:)/u,'$1'));
  const result=await inspectBackgroundPNG(join(root,'public/backgrounds/korean-hotel-illustrated-v1.png'),root);
  assert.equal(result.width,941);assert.equal(result.height,1672);assert.equal(result.format,'png');
});
test('catalog validates private provenance and public projection excludes prompts/receipts',async t=>{
  const f=await fixture(t);await prepareBackground({...f,binding:f.plan.binding});const c=await loadBackgroundCatalog(f.root),a=c.entries[0];
  assert.equal(a.model,'gpt-image-2.6-flare');assert.match(a.prompt,/adult woman/u);assert.match(a.prompt,/y=1068/u);assert.equal(a.estimatedCostUSD,.0305);
  assert.throws(()=>renderBackgroundSchema.parse({...a.render,prompt:a.prompt}));assert.throws(()=>catalogSchema.parse({...c,entries:[a,a]}));
  await writeFile(catalogFile(f.root),'{}');await assert.rejects(loadBackgroundCatalog(f.root));
});
test('question preview dry run/resume makes zero providers; low combined cap blocks before any request',async t=>{
  const f=await fixture(t);for(const file of ['content/voice-profiles/selected-default.json','content/production/default.json','content/previews/restaurant-menu.json']){
    await mkdir(dirname(join(f.root,file)),{recursive:true});await copyFile(new URL(file,repo),join(f.root,file));}
  const args={jobId:'preview-test',previewQuestion:'content/previews/restaurant-menu.json',output:'out/restaurant-preview.mp4',noMusic:true,dryRun:true};
  const p=await produceQuestionPreview(args,{root:f.root,imageClient:async()=>assert.fail('dry run made image call')});
  assert.equal(p.providerCalls,0);assert.equal(p.maximumNewRequests.generation,0);assert.equal(p.maximumNewRequests.image,1);assert.equal(p.maximumNewRequests.review,1);assert.equal(p.productionUsageConsumed,0);
  const resumed=await produceQuestionPreview({resume:'preview-test',dryRun:true},{root:f.root});assert.deepEqual(resumed.image.binding,p.image.binding);
  await assert.rejects(produceQuestionPreview({resume:'preview-test',allowPaid:true,maxCostUSD:.001},{root:f.root,imageClient:async()=>assert.fail('over-budget image call')}),/exceeds.*cap/u);
});
const findings=(id,blocking=false)=>({questions:[{questionId:id,checks:{naturalKorean:'pass',uniqueAnswer:blocking?'blocking':'pass',romanization:'pass',meaningExplanation:'pass',englishNarration:'pass',bonusIsolation:'pass'},
  findings:blocking?[{id:'ambiguous',category:'uniqueAnswer',field:'choices',severity:'blocking',message:'fixture ambiguity',suggestion:null}]:[]}],resolutions:[]});
test('single-question automatic acceptance is hash-bound, separately recorded, and blocks unresolved findings',async t=>{
  const f=await fixture(t),input=questionExcerptInputSchema.parse(await json(new URL('content/previews/restaurant-menu.json',repo)));let calls=0;
  const client={create:async()=>{calls++;return {id:'fixture',model:'gpt-6-luna',status:'completed',usage:{input_tokens:100,output_tokens:100,total_tokens:200},output:[{type:'message',content:[{type:'output_text',text:JSON.stringify(findings(input.question.id))}]}]};}};
  const o={folder:f.folder,hash:'a'.repeat(64),input,model:'gpt-6-luna',budget:f.budget,client};await reviewQuestionPreview(o);const reused=await reviewQuestionPreview(o);assert.equal(reused.calls,0);assert.equal(calls,1);
  await assert.rejects(reviewQuestionPreview({...o,hash:'b'.repeat(64)}),/stale/u);
  assert.equal(reused.acceptance.humanReviewed,false);assert.throws(()=>validatePreviewFindings(findings('wrong'),input.question.id),/exact question/u);
  const g=await fixture(t);await assert.rejects(reviewQuestionPreview({...o,folder:g.folder,budget:g.budget,client:{create:async()=>({...await client.create(),output:[{type:'message',content:[{type:'output_text',text:JSON.stringify(findings(input.question.id,true))}]}]})}}),/unresolved blocking/u);
  assert.equal(await exists(join(g.folder,'review/acceptance.json')),false);
});
test('excerpt timing preserves reading, 150-frame countdown and reveal guard; production still rejects one question',async()=>{
  const input=questionExcerptInputSchema.parse(await json(new URL('content/previews/restaurant-menu.json',repo))),profile=(await json(new URL('content/voice-profiles/selected-default.json',repo))).profile;
  const clips=['question','answer','explanation'].map((role,i)=>({id:`clip-${i}`,contentId:input.question.id,role,language:i===1?'ko-KR':'en-US',text:['Question','메뉴 좀 주세요.','Explanation'][i],
    cacheKey:'a'.repeat(64),file:`audio/cache/${'a'.repeat(64)}.wav`,sha256:'b'.repeat(64),sourceChecksum:'b'.repeat(64),sourceKind:'google-cloud-tts',durationSeconds:[2,1,3][i],peakDbFS:-3}));
  const t=getQuestionExcerptTimeline({version:1,quizFingerprint:'c'.repeat(64),profile,processing:'loudnorm-I-16-TP-1.5-LRA-11-mono-24000-v1',clips});
  assert.equal(t.question.countdownStart,120);assert.equal(t.question.revealStart,270);assert.equal(t.audio[1].start,276);assert.equal(t.audio[2].start-t.audio[1].end,10);
  assert.equal(getIllustratedQuestionState(269,false,t.questionTimeline).phase,'countdown');assert.equal(getIllustratedQuestionState(270,false,t.questionTimeline).phase,'reveal');
  const d=await json(new URL('drafts/public-transit-02-candidate/draft.json',repo));assert.equal(draftQuizSchema.safeParse({...d.quiz,questions:[input.question]}).success,false);
});
test('zero-duration English and Korean tokens remain text inside measured positive phrases',()=>{
  const a={key:'fixture',transcript:'The menu, please.',language:'en-US',durationSeconds:1.4,words:[
    {text:' The',start:.1,end:.1,probability:.06},{text:' menu,',start:.1,end:.66,probability:.8},{text:' please.',start:.9,end:1.18,probability:.5}]};
  const groups=groupAlignedText(a);assert.deepEqual(groups,['The menu, please.']);
  const full={...a,transcript:'The menu, please. This is a polite way to ask for it.',durationSeconds:3.44,
    words:[...a.words,...['This','is','a','polite','way','to','ask','for','it.'].map((text,i)=>({text,start:1.7+i*.18,end:1.8+i*.18,probability:.9}))]};
  assert.deepEqual(groupAlignedText(full),['The menu, please.','This is a polite','way to ask for it.']);
  const phrases=makeCaptionPhrases(a,groups,{id:'test',contentId:'q',role:'explanation',language:'en-US',start:300,end:342},270);
  assert.equal(phrases[0].start,303);assert.equal(phrases[0].end,336);assert.equal(a.words[0].end,a.words[0].start);
  const retained=groupAlignedText({...a,words:a.words.map((w,i)=>i===1?{...w,end:w.start}:w)});assert.deepEqual(retained,['The menu, please.']);
  assert.deepEqual(groupAlignedText({...a,language:'ko-KR'}),['The menu, please.']);
  assert.throws(()=>groupAlignedText({...a,words:a.words.map(w=>({...w,end:w.start}))}),/all words.*zero/u);
});
