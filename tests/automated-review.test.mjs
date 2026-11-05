import assert from 'node:assert/strict';
import test from 'node:test';
import {readFileSync,existsSync} from 'node:fs';
import {copyFile,mkdir,mkdtemp,readFile,rm,writeFile} from 'node:fs/promises';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {importDraft,readDraft,loadProductionDraft,approveDraft} from '../scripts/draftWorkflow.ts';
import {runAutomatedReview,applyReviewCorrections} from '../scripts/automatedReview.ts';
import {REVIEW_CATEGORIES,validateAutomatedFindings} from '../scripts/automatedAcceptance.ts';

const source=JSON.parse(readFileSync(new URL('../content/authored/cafe-friends-02.json',import.meta.url),'utf8'));
const brief=JSON.parse(readFileSync(new URL('../content/briefs/cafe-friends-02.json',import.meta.url),'utf8'));
const save=(p,v)=>writeFile(p,JSON.stringify(v,null,2),'utf8');
const json=async p=>JSON.parse(await readFile(p,'utf8'));
const response=data=>({id:'resp_review_fixture',model:'gpt-6-luna',status:'completed',incomplete_details:null,_request_id:'req_fixture',
  usage:{input_tokens:1000,output_tokens:500,total_tokens:1500,input_tokens_details:{cached_tokens:0},output_tokens_details:{reasoning_tokens:200}},
  output:[{type:'message',content:[{type:'output_text',text:JSON.stringify(data)}]}]});
const report=(ids,blocking=false,resolutions=[])=>({questions:ids.map((questionId,i)=>({questionId,
  checks:Object.fromEntries(REVIEW_CATEGORIES.map(c=>[c,blocking&&i===0&&c==='romanization'?'blocking':'pass'])),
  findings:blocking&&i===0?[{id:'q1-romanization',category:'romanization',field:'choices.0.romanization',severity:'blocking',
    message:'Fixture: romanization mismatches the Hangul.',suggestion:'annyeonghaseyo.'}]:[]})),resolutions});
const fixture=async(t,wrong=false)=>{
  const root=await mkdtemp(join(tmpdir(),'quiz-auto-review-'));t.after(()=>rm(root,{recursive:true,force:true}));
  await mkdir(join(root,'data'),{recursive:true});await save(join(root,'data/legacy-demos.json'),{version:1,note:'isolated fixture',entries:[]});
  await mkdir(join(root,'public/backgrounds'),{recursive:true});await writeFile(join(root,'public/backgrounds/korean-cafe-illustrated-v1.png'),'local fixture');
  const directory=join(root,'drafts/fixture'),authored=structuredClone(source);
  if(wrong)authored.quiz.questions[0].choices[0].romanization='wrong';
  await importDraft(authored,brief,directory,{root});
  const bundle=await readDraft(directory,root),ids=bundle.quiz.questions.map(q=>q.id);
  const options={directory,root,model:'gpt-6-luna',budgetId:'auto-fixture',maxCostUSD:0.0564,allowPaid:true,now:new Date('2026-11-05T12:00:00Z')};
  return {root,directory,bundle,ids,options,ledger:join(root,'data/automated-review-budgets/auto-fixture.json')};
};

test('automated acceptance is separate, exact-hash bound and does not fabricate human approval',async(t)=>{
  const {root,directory,bundle,ids,options}=await fixture(t);let calls=0;
  const result=await runAutomatedReview({...options,client:{create:async(body)=>{
    calls++;assert.equal(body.store,false);assert.equal(body.previous_response_id,undefined);
    const input=JSON.parse(body.input[1].content);
    assert.deepEqual(Object.keys(input.content).sort(),['narration','privateBonusAnswerKey','quiz']);
    assert.equal(input.content.provenance,undefined);assert.equal(input.generatorReasoning,undefined);
    return response(report(ids));
  }}});
  assert.equal(result.status,'accepted');assert.equal(calls,1);assert.equal(result.acceptance.humanReviewed,false);
  assert.equal(existsSync(join(root,'data/approvals')),false);
  assert.equal((await loadProductionDraft(directory,true,root,'automated')).contentHash,bundle.contentHash);
  await assert.rejects(loadProductionDraft(directory,true,root,'manual'),/Unapproved/u);
  const markdown=await readFile(join(directory,'review.md'),'utf8');
  assert.match(markdown,/AUTOMATED DEVELOPMENT/u);assert.doesNotMatch(markdown,/## Human review checklist/u);
  const reused=await runAutomatedReview({...options,allowPaid:false,client:{create:()=>assert.fail('acceptance reuse called API')}});
  assert.equal(reused.calls,0);assert.equal(reused.reused,true);
  const acceptanceFile=join(root,'data/automated-acceptances',`${bundle.contentHash}.json`),validRecord=await json(acceptanceFile);
  await save(acceptanceFile,{...validRecord,finalFindings:report(ids,true)});
  await assert.rejects(loadProductionDraft(directory,true,root,'automated'),/unresolved blocking/u);
  await save(acceptanceFile,validRecord);
  const d=await json(join(directory,'draft.json'));d.quiz.questions[0].context='Greet staff at the counter.';await save(join(directory,'draft.json'),d);
  await assert.rejects(loadProductionDraft(directory,true,root,'automated'),/Missing or stale/u);
});

test('one correction then explicit verification can accept; all revisions and original input remain',async(t)=>{
  const {root,directory,bundle,ids,options,ledger}=await fixture(t,true);let calls=0;
  const queue=[report(ids,true),{patches:[{questionId:ids[0],field:'choices.0.romanization',replacement:'annyeonghaseyo.',findingIds:['q1-romanization'],reason:'Match the Hangul.'}]},
    report(ids,false,[{findingId:'q1-romanization',status:'resolved',details:'Corrected matching learner romanization.'}])];
  const result=await runAutomatedReview({...options,client:{create:async()=>response(queue[calls++])}});
  assert.equal(calls,3);assert.equal(result.status,'accepted');assert.notEqual(result.contentHash,bundle.contentHash);
  assert.equal((await json(ledger)).attempts.length,3);
  assert.equal((await json(join(directory,'automated-review/auto-fixture/input.json'))).draft.quiz.questions[0].choices[0].romanization,'wrong');
  assert.equal((await readDraft(directory,root)).draft.quiz.questions[0].choices[0].romanization,'annyeonghaseyo.');
  assert.ok((await json(join(directory,'automated-revisions.json'))).some(r=>r.kind==='automated-linguistic-correction'));
  assert.equal((await loadProductionDraft(directory,true,root,'automated')).contentHash,result.contentHash);
});

test('unresolved blocking findings stop the episode without acceptance or a fourth call',async(t)=>{
  const {root,directory,ids,options}=await fixture(t,true);let calls=0;
  const queue=[report(ids,true),{patches:[{questionId:ids[0],field:'choices.0.romanization',replacement:'annyeonghaseyo.',findingIds:['q1-romanization'],reason:'Fixture correction.'}]},
    report(ids,true,[{findingId:'q1-romanization',status:'unresolved',details:'Fixture: issue remains.'}])];
  const result=await runAutomatedReview({...options,client:{create:async()=>response(queue[calls++])}});
  assert.equal(result.status,'needs-revision');assert.equal(calls,3);
  await assert.rejects(loadProductionDraft(directory,true,root,'automated'),/Missing or stale/u);
  const resumed=await runAutomatedReview({...options,client:{create:()=>assert.fail('fourth review call')}});
  assert.equal(resumed.status,'needs-revision');assert.equal(resumed.calls,0);
});

test('missing verification resolutions, incomplete coverage and duplicate findings are rejected',async(t)=>{
  const {ids}=await fixture(t);
  assert.throws(()=>validateAutomatedFindings(report(ids),ids,['missing-finding']),/explicitly resolve/u);
  const partial=report(ids);partial.questions[5].questionId=ids[0];
  assert.throws(()=>validateAutomatedFindings(partial,ids),/exact question ID/u);
  const duplicate=report(ids,true);duplicate.questions[0].findings.push(duplicate.questions[0].findings[0]);
  assert.throws(()=>validateAutomatedFindings(duplicate,ids),/Duplicate/u);
});

test('correction cannot change settings, disclose a bonus explanation or omit blocking issues',async(t)=>{
  const {bundle,ids}=await fixture(t,true),input={draft:bundle.draft,key:bundle.key},findings=report(ids,true);
  const patch={questionId:ids[0],field:'voices',replacement:'other',findingIds:['q1-romanization'],reason:'bad'};
  assert.throws(()=>applyReviewCorrections(input,{patches:[patch]},findings));
  assert.throws(()=>applyReviewCorrections(input,{patches:[]},findings),/every blocking/u);
  const bonusFindings=report(ids);bonusFindings.questions[5].checks.bonusIsolation='blocking';
  bonusFindings.questions[5].findings=[{id:'bonus',category:'bonusIsolation',field:'explanationNarration',severity:'blocking',message:'fixture',suggestion:null}];
  assert.throws(()=>applyReviewCorrections(input,{patches:[{...patch,questionId:ids[5],field:'explanationNarration',findingIds:['bonus']}]},bonusFindings),/Bonus explanation/u);
});

test('paid opt-in/budget required; uncertain or auth failures never retry or leak SDK errors',async(t)=>{
  const {options,ids,ledger}=await fixture(t);
  await assert.rejects(runAutomatedReview({...options,allowPaid:false,client:{create:()=>assert.fail('unapproved')}}),/explicit --allow-paid/u);
  await assert.rejects(runAutomatedReview({...options,maxCostUSD:0.001,client:{create:()=>assert.fail('over budget')}}),/budget exhausted/u);
  const other=await fixture(t);let calls=0;
  await assert.rejects(runAutomatedReview({...other.options,client:{create:async()=>{calls++;throw {status:401,message:'secret_token'};}}}),/HTTP 401/u);
  await assert.rejects(runAutomatedReview({...other.options,client:{create:()=>assert.fail('auth retry')}}),/terminal/u);
  assert.equal(calls,1);assert.doesNotMatch(await readFile(other.ledger,'utf8'),/secret_token/u);
  const uncertain=await fixture(t);calls=0;
  await assert.rejects(runAutomatedReview({...uncertain.options,client:{create:async()=>{calls++;throw new Error('timeout secret');}}}),/uncertain/u);
  await assert.rejects(runAutomatedReview({...uncertain.options,client:{create:()=>assert.fail('uncertain retry')}}),/billing-uncertain/u);
  assert.equal(calls,1);assert.equal((await json(uncertain.ledger)).attempts[0].chargedUnits,18800000);
});

test('completed saved review recovers after local interruption without another paid call',async(t)=>{
  const {options,ids}=await fixture(t);let calls=0;
  await assert.rejects(runAutomatedReview({...options,client:{create:async()=>{calls++;return response(report(ids));}},
    afterResponseSaved:async()=>{throw new Error('local fixture interruption');}}),/local fixture/u);
  const result=await runAutomatedReview({...options,client:{create:()=>assert.fail('duplicate paid review')}});
  assert.equal(result.status,'accepted');assert.equal(result.calls,0);assert.equal(calls,1);
});

test('manual approval mode still works and automated records cannot pretend a human reviewed',async(t)=>{
  const {root,directory,bundle,ids,options}=await fixture(t);
  await approveDraft(directory,'Fixture human',bundle.contentHash,true,{root});
  assert.equal((await loadProductionDraft(directory,true,root,'manual')).contentHash,bundle.contentHash);
  const result=await runAutomatedReview({...options,client:{create:async()=>response(report(ids))}});
  const file=join(root,'data/automated-acceptances',`${result.contentHash}.json`),record=await json(file);
  record.humanReviewed=true;await save(file,record);
  await assert.rejects(loadProductionDraft(directory,true,root,'automated'));
});

test('developer-selected assets work in automated mode; manual mode and altered image bytes are blocked',async(t)=>{
  const {root,directory,ids,options}=await fixture(t),d=await json(join(directory,'draft.json'));
  d.brief.scenarioType='public-transit';
  d.brief.backgroundAssetId='korean-transit-illustrated-dev-v1';d.quiz.backgroundAssetId=d.brief.backgroundAssetId;
  await save(join(directory,'draft.json'),d);
  const image=join(root,'public/backgrounds/korean-transit-illustrated-dev-v1.png');
  await copyFile(new URL('../public/backgrounds/korean-transit-illustrated-dev-v1.png',import.meta.url),image);
  const result=await runAutomatedReview({...options,client:{create:async()=>response(report(ids))}});
  assert.equal(result.acceptance.asset.selection,'developer-selected');
  assert.equal((await loadProductionDraft(directory,true,root,'automated')).contentHash,result.contentHash);
  // Isolated fixture approval only: it does not grant aesthetic approval to a developer-selected image.
  await approveDraft(directory,'Fixture human',result.contentHash,true,{root});
  await assert.rejects(loadProductionDraft(directory,true,root,'manual'),/human-approved background/u);
  await writeFile(image,'changed bytes');
  await assert.rejects(loadProductionDraft(directory,true,root,'automated'),/checksum changed/u);
});
