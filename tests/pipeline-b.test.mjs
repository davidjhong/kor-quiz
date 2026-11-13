import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,copyFile,readFile,writeFile,rm} from 'node:fs/promises';
import {join,dirname} from 'node:path';
import {tmpdir} from 'node:os';
import {chooseVariety,backgroundDecision,eligibleBackgrounds,resolveVariety,assertVarietyConfiguration} from '../scripts/varietySelection.ts';
import {catalogSchema,writePrivateJson,catalogFile,loadBackgroundCatalog,recordCompletedVarietyUse} from '../scripts/backgroundCatalog.ts';
import {backgroundOptionsSchema,planBackground} from '../scripts/backgroundImages.ts';
import {parseVideoArguments,runVideo} from '../scripts/videoCli.ts';
import {PALETTES,PALETTE_IDS,MOTION_IDS,contrast,varietyMotion,coverBounds} from '../src/variety.ts';
import {ILLUSTRATED_THEME} from '../src/illustratedTheme.ts';
import {canonical,sha256} from '../scripts/narrationFiles.ts';
const repo=new URL('../',import.meta.url),json=async p=>JSON.parse(await readFile(p,'utf8'));
const temporary=async t=>{const root=await mkdtemp(join(tmpdir(),'pipeline-b-'));t.after(()=>rm(root,{recursive:true,force:true}));return root;};
const mockEntry=(i,uses=[])=>({render:{id:`generated-restaurant-${String(i).padStart(16,'0')}`,file:`backgrounds/mock-${i}.png`,sha256:'a'.repeat(64),scenarioType:'restaurant',selection:'developer-selected',scenarioLabel:'RESTAURANT',framing:{scale:1.02,origin:'50% 0%'}},
  setting:'restaurant',tags:['restaurant'],style:'warm-painted-animation-v1',composition:'quiz-safe-v1',prompt:'Friendly adult woman,',model:'mock',settings:{},width:1024,height:1536,format:'png',receipt:null,reportedUsage:null,estimatedCostUSD:null,completedEpisodeIds:uses,createdAt:'fixture',variety:{composition:'quiz-safe-v1',character:'adult woman',descriptor:'fixture'}});
test('all CLI variety values validate before job/provider work; auto/none and seeds',()=>{
  const p=parseVideoArguments(['--scenario','Restaurant','--palette','auto','--motion','slow-pull','--music','auto','--seed','one','--background','pool']);
  assert.equal(p.options.backgroundOptions.mode,'pool');assert.equal(p.options.varietyOptions.seed,'one');
  assert.equal(parseVideoArguments(['--scenario','Hotel','--music','none']).options.varietyOptions.music,'none');
  for(const args of [['--palette','rainbow'],['--motion','random'],['--music','commercial-song'],['--seed','  '],['--unknown','foo']])assert.throws(()=>parseVideoArguments(['--scenario','Hotel',...args]));
});
test('seed/category selection is deterministic, bounded, recent-excluding; singleton repeats honestly',()=>{
  const ids=['a','b','c','d'];for(let i=0;i<20;i++){const a=chooseVariety(ids,['a','b','c'],String(i),'palette');assert.equal(a.selected,'d');assert.deepEqual(a,chooseVariety([...ids].reverse(),['a','b','c'],String(i),'palette'));}
  assert.match(chooseVariety(['a'],['a'],'x','music').reason,/necessarily repeats/u);
  assert.deepEqual(chooseVariety(['a'],['a'],'x','music').excluded,[]);
  assert.equal(chooseVariety(ids,['a','b','c'],'x','palette','a').selected,'a');assert.throws(()=>chooseVariety(ids,[],'x','palette','z'));
});
test('mock pool grows at most one per job until three eligible images, rotates at target, retires without deletion',()=>{
  for(let n=0;n<3;n++)assert.equal(backgroundDecision(Array.from({length:n},(_,i)=>String(i)),'auto'),'generate');
  assert.equal(backgroundDecision(['a','b','c'],'auto'),'reuse');assert.equal(backgroundDecision(['a'],'pool'),'reuse');assert.throws(()=>backgroundDecision([],'pool'),/forbids/u);assert.equal(backgroundDecision(['a','b','c'],'new'),'generate');
  const c=catalogSchema.parse({version:1,entries:[mockEntry(1),mockEntry(2,['a','b','c','d','e']),{...mockEntry(3),variety:{composition:'quiz-safe-v1',character:'adult man',descriptor:'fixture'}}],legacyUsage:{}});
  assert.deepEqual(eligibleBackgrounds(c,'restaurant',5,'adult woman'),[mockEntry(1).render.id]);assert.equal(c.entries.length,3);
  assert.equal(backgroundDecision([], 'auto',mockEntry(2).render.id),'reuse'); // explicit ID ignores retirement
});
test('real planning binds request once; mocked pool decisions never call Images; explicit character independent of voice',async t=>{
  const root=await temporary(t),brief={scenario:'Beginner Korean ordering dinner',scenarioType:'restaurant',backgroundAssetId:null},options=backgroundOptionsSchema.parse({character:'adult woman'});
  const r=await resolveVariety(root,brief,'job-one',{seed:'s',music:'none'},options,true);
  assertVarietyConfiguration(r.selection);const changed=structuredClone(r.selection);changed.checksums.palette='0'.repeat(64);assert.throws(()=>assertVarietyConfiguration(changed),/configuration changed/u);
  assert.equal(r.selection.background.action,'generate');assert.match(r.binding.request.prompt,/Friendly adult woman,/u);assert.match(r.binding.request.prompt,/Deterministic scene variant:/u);assert.equal(r.selection.checksums.background,null);
  const plan=await planBackground(root,brief,'job-one',options,r.binding);assert.equal(plan.maximumRequests,1);assert.equal(plan.providerCalls,0);assert.deepEqual(plan.binding,r.binding);
  const saved=mockEntry(1);saved.render.id=r.binding.assetId;saved.prompt=r.binding.request.prompt;
  await writePrivateJson(catalogFile(root),{version:1,entries:[saved],legacyUsage:{}});
  const resumed=await planBackground(root,brief,'job-one',options,r.binding);assert.equal(resumed.action,'reuse');assert.equal(resumed.maximumRequests,0);assert.equal(resumed.conservativeBoundUSD,0);assert.deepEqual(resumed.binding,r.binding);
  // pool for another incompatible setting still cannot spend.
  await assert.rejects(resolveVariety(root,{...brief,scenarioType:'hotel'},'pool',{music:'none'},backgroundOptionsSchema.parse({mode:'pool'})),/pool.*forbids/u);
});
test('mocked three-image catalog resolves reuse, excludes recent compatible choice, filters corrupt/retired assets',async t=>{
  const root=await temporary(t),brief={scenario:'Beginner Korean ordering dinner',scenarioType:'restaurant',backgroundAssetId:null};
  // Real tiny PNG bytes, mocked inspection dimensions. These are never production artwork.
  const bytes=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a5X8AAAAASUVORK5CYII=','base64');
  const entries=[1,2,3].map(i=>{const e=mockEntry(i);e.render.sha256=sha256(bytes);return e;});
  for(const e of entries){await mkdir(dirname(join(root,'public',e.render.file)),{recursive:true});await writeFile(join(root,'public',e.render.file),bytes);}
  const c={version:1,entries,legacyUsage:{},varietyHistory:[{episodeId:'older',background:entries[1].render.id,palette:'cream-navy',motion:'slow-push',music:'none'}]};
  await writePrivateJson(catalogFile(root),c);
  const inspect=async()=>({width:1024,height:1536}),options=backgroundOptionsSchema.parse({character:'adult woman'});
  const r=await resolveVariety(root,brief,'job',{seed:'pool',music:'none'},options,true,inspect);
  assert.equal(r.selection.background.action,'reuse');assert.equal(r.selection.background.eligibleCount,3);assert.notEqual(r.binding.assetId,entries[1].render.id);
  assert.equal(r.selection.checksums.background,sha256(bytes));assert.equal(r.binding.request,undefined);
  entries[0].completedEpisodeIds=['a','b','c','d','e'];await writePrivateJson(catalogFile(root),c);
  assert.equal((await resolveVariety(root,brief,'job',{music:'none'},options,true,inspect)).selection.background.action,'generate');
  const explicit=await resolveVariety(root,brief,'job',{music:'none'},backgroundOptionsSchema.parse({mode:'pool',assetId:entries[0].render.id}),false,inspect);assert.equal(explicit.binding.assetId,entries[0].render.id);
  await writeFile(join(root,'public',entries[1].render.file),'corrupt');const corrupt=await resolveVariety(root,brief,'job',{music:'none'},options,true,inspect);assert.equal(corrupt.selection.background.eligibleCount,1);
  await assert.rejects(resolveVariety(root,brief,'job',{music:'none'},backgroundOptionsSchema.parse({mode:'pool',character:'adult man'}),true,inspect),/forbids/u);
});
test('new-job dry run persists exact choices/context, resume is byte-preserving, no usage/budget writes',async t=>{
  const root=await temporary(t);for(const f of ['content/voice-profiles/selected-default.json','content/production/default.json']){await mkdir(dirname(join(root,f)),{recursive:true});await copyFile(new URL(f,repo),join(root,f));}
  const deps={root,log:()=>{},preflight:async()=>({ready:true,checks:{},blockers:[],providerCalls:0}),imageClient:async()=>{throw new Error('Unexpected provider call');}};
  const first=await runVideo(['--scenario','Beginner Korean at a restaurant','--job-id','b-dry','--seed','stable','--music','none','--dry-run'],deps);
  const file=join(root,'data/production-jobs/b-dry/job.json'),bytes=await readFile(file),j=await json(file);
  assert.equal(j.config.variety.seed,'stable');assert.equal(j.paidOptIn,false);assert.equal(first.variety.background.action,'generate');
  const second=await runVideo(['--resume','b-dry','--dry-run'],deps);assert.deepEqual(second.variety,j.config.variety);assert.deepEqual(await readFile(file),bytes);
  assert.deepEqual((await loadBackgroundCatalog(root)).varietyHistory,undefined);assert.equal(first.providerCalls,0);assert.equal(second.providerCalls,0);
  await recordCompletedVarietyUse(root,{episodeId:'mock-completed',background:'mock',palette:j.config.variety.palette.selected,motion:j.config.variety.motion.selected,music:'none'});
  const afterHistory=await runVideo(['--resume','b-dry','--dry-run'],deps);assert.deepEqual(afterHistory.variety,j.config.variety);assert.deepEqual(await readFile(file),bytes);assert.equal((await loadBackgroundCatalog(root)).varietyHistory.length,1);
  await assert.rejects(runVideo(['--resume','b-dry','--seed','new','--dry-run'],deps),/persisted variety/u);
});
test('concurrent completed history/catalog writes are atomic, distinct, idempotent; previews excluded',async t=>{
  const root=await temporary(t),a={episodeId:'e1',background:'fixture',palette:'cream-navy',motion:'slow-push',music:'subtle-bass'};
  await Promise.all([recordCompletedVarietyUse(root,a),recordCompletedVarietyUse(root,{...a,episodeId:'e2'})]);
  await recordCompletedVarietyUse(root,a);await recordCompletedVarietyUse(root,{...a,episodeId:'preview'},true);
  const c=await loadBackgroundCatalog(root);assert.equal(c.varietyHistory.length,2);assert.equal(c.legacyUsage.fixture.length,2);
  await recordCompletedVarietyUse(root,{...a,palette:'midnight-gold'});assert.equal((await loadBackgroundCatalog(root)).varietyHistory.length,2);
});
test('palettes preserve exact legacy and meet actual surface/text contrast floors',()=>{
  assert.deepEqual(PALETTES['cream-navy'],ILLUSTRATED_THEME.colors);
  for(const id of PALETTE_IDS){const c=PALETTES[id];for(const surface of ['panel','answer','subdued','correct'])for(const text of ['text','secondary'])assert.ok(contrast(c[text],c[surface])>=4.5,`${id} ${text}/${surface}`);
    assert.ok(contrast(c.teal,c.correct)>=3,`${id} check mark`);assert.ok(contrast('#FFFFFF','#172B3A')>4.5,'caption outline');assert.ok(contrast('#FFD978','#172B3A')>4.5);}
});
test('cover-crop motion covers frame across native aspects, extrema, transitions; declared face region stays safe',()=>{
  for(const [w,h] of [[941,1672],[916,1717],[1024,1536],[1080,1920]])for(const framing of [1.02,1.12])for(const motion of MOTION_IDS)for(let f=0;f<=3600;f+=3){const m=varietyMotion(motion,f,3601),scale=framing*m.extraScale,b=coverBounds(w,h,scale,m.x,m.y);
    assert.ok(b.left<=0&&b.top<=0&&b.right>=1080&&b.bottom>=1920,`${w} ${h} ${motion} ${f}`);
    assert.ok(m.extraScale>=1&&m.extraScale<=1.02&&Math.abs(m.x)<=5&&Math.abs(m.y)<=8);
    // Declared final-frame face region, not image recognition or a guarantee from the prompt.
    for(const [x,y] of [[650,1285],[900,1530]]){const tx=540+(x-540)*m.extraScale+m.x,ty=y*m.extraScale+m.y;assert.ok(tx>70&&tx<972&&ty>1200&&ty<1670);}
    const next=varietyMotion(motion,f+1,3601);assert.ok(Math.abs(m.x-next.x)<.1&&Math.abs(m.extraScale-next.extraScale)<.001);}
});
