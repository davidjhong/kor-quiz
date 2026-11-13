import {MUSIC_IDS,AMBIENCE_IDS,AMBIENCE_MIX,type RenderMusic} from '../src/musicLibrary.ts';
import {availableMusicIds,loadProductionMusic,type ProductionMusicId} from './productionMusic.ts';
import {getLibraryEntry} from './audioLibrary.ts';
import {readFile} from 'node:fs/promises';
import {join} from 'node:path';
import {z} from 'zod';
import {PALETTE_IDS,MOTION_IDS,PALETTES,resolveMotionConfig,visualVarietySchema} from '../src/variety.ts';
import {BACKGROUND_ASSETS} from '../src/assets/backgrounds.ts';
import {loadBackgroundCatalog,catalogAsset,inspectBackgroundPNG,BACKGROUND_STYLE,type BackgroundCatalog} from './backgroundCatalog.ts';
import {imageRequestSchema,imageRequestHash,makeBackgroundPrompt,type BackgroundOptions,type BackgroundBinding} from './backgroundImages.ts';
import {canonical,sha256} from './narrationFiles.ts';
import type {briefSchema} from '../src/draftSchema.ts';
export const varietyOptionsSchema=z.strictObject({palette:z.enum(['auto',...PALETTE_IDS]).default('auto'),motion:z.enum(['auto',...MOTION_IDS]).default('auto'),
  music:z.enum(['auto','none',...MUSIC_IDS]).default('auto'),ambience:z.enum(['none',...AMBIENCE_IDS]).default('none'),ambienceGain:z.number().min(0).max(1).default(1),seed:z.string().trim().min(1).max(128).optional()});
export type VarietyOptions=z.input<typeof varietyOptionsSchema>;
export type ChoiceContext={candidates:string[];excluded:string[];selected:string;historyHash:string;recentChoices:string[];reason:string};
export type VarietySelection={version:'variety-v1'|'variety-v2';audio?:{music:RenderMusic|null;ambience:{asset:RenderMusic;gain:number;mixVersion:'ambience-mix-v1'}|null};seed:string;requested:z.infer<typeof varietyOptionsSchema>;palette:ChoiceContext;motion:ChoiceContext;music:ChoiceContext;
  background:ChoiceContext&{action:'reuse'|'generate';eligibleCount:number;target:3};checksums:{palette:string;motion:string;music:string|null;background:string|null;request:string|null;mix?:string};
  visual:z.infer<typeof visualVarietySchema>};
export const assertVarietyConfiguration=(s:VarietySelection)=>{
  const visual=visualVarietySchema.parse(s.visual),v1=s.version==='variety-v1';
  if((!v1&&s.version!=='variety-v2')||visual.version!==(v1?'visual-variety-v1':'visual-variety-v2')||s.palette.selected!==visual.palette||s.motion.selected!==visual.motion
    ||s.checksums.palette!==sha256(canonical(PALETTES[visual.palette]))
    ||s.checksums.motion!==sha256(canonical(visual.version==='visual-variety-v1'?{version:visual.version,id:visual.motion}:{version:visual.version,id:visual.motion,config:visual.motionConfig}))
    ||(!v1&&s.checksums.mix!==sha256(canonical({audio:s.audio,ambienceMix:AMBIENCE_MIX}))))
    throw new Error('Persisted variety configuration changed; restore its versioned settings or create a new job');
};
export const chooseVariety=(ids:string[],recent:string[],seed:string,category:string,explicit?:string):ChoiceContext=>{
  const candidates=[...new Set(ids)].sort();if(!candidates.length)throw new Error(`No eligible ${category} candidates`);
  if(explicit&&!candidates.includes(explicit))throw new Error(`Unknown/incompatible ${category}: ${explicit}`);
  const compatibleRecent=recent.filter(id=>candidates.includes(id)),k=Math.min(3,candidates.length-1);
  const excluded=k?[...new Set(compatibleRecent.slice(-k))]:[],available=candidates.filter(id=>!excluded.includes(id));
  const ranked=(available.length?available:candidates).sort((a,b)=>!available.length?recent.lastIndexOf(a)-recent.lastIndexOf(b)||a.localeCompare(b):sha256(`${seed}|${category}|${a}`).localeCompare(sha256(`${seed}|${category}|${b}`)));
  return {candidates,excluded,selected:explicit??ranked[0],historyHash:sha256(canonical(recent)),recentChoices:compatibleRecent.slice(-3),reason:explicit?'explicit':candidates.length===1?'one-item pool necessarily repeats':available.length?'seeded after recent exclusion':'least recently used fallback'};
};
export const backgroundDecision=(ids:string[],mode:'auto'|'pool'|'new',explicit?:string)=>{
  if(explicit)return 'reuse';if(mode==='new'||(mode==='auto'&&ids.length<3))return 'generate';
  if(!ids.length)throw new Error('Background pool has no eligible matching assets; pool forbids image generation. Use auto/new or register a compatible image.');return 'reuse';
};
const DESCRIPTORS=[
  'Soft morning daylight; three-quarter camera; open central aisle; restrained potted plants; navy travel jacket.',
  'Warm late-afternoon lighting; symmetrical camera; broad quiet wall; a small luggage stand; sage cardigan.',
  'Gentle overcast daylight; slight left camera angle; curved reception details; understated ceramics; coral scarf.',
];
/** Only declared metadata/request provenance establishes compatibility. Unknown character is excluded for explicit constraints. */
export const eligibleBackgrounds=(c:BackgroundCatalog,setting:string,limit:number,character?:string)=>{
  const generated=c.entries.filter(e=>e.setting===setting&&e.style===BACKGROUND_STYLE&&e.completedEpisodeIds.length<limit
    &&(e.variety?.composition==='quiz-safe-v1'||/center cover|panel|overlay/iu.test(e.composition))
    &&(!character||(e.variety?.character===character||(!e.variety&&e.prompt?.includes(`Friendly ${character},`))))).map(e=>e.render.id);
  // Static illustrated assets have documented overlay-safe composition, but no typed character declaration.
  const legacy=character?[]:Object.entries(BACKGROUND_ASSETS).filter(([id,a])=>id!=='korean-cafe-v1'&&a.scenarioType===setting&&(c.legacyUsage[id]?.length??0)<limit).map(([id])=>id);
  return [...generated,...legacy].sort().slice(0,128);
};
export const resolveVariety=async(root:string,brief:z.infer<typeof briefSchema>,scope:string,requested:VarietyOptions,background:BackgroundOptions,characterExplicit=false,inspect=inspectBackgroundPNG,engine:'variety-v1'|'variety-v2'='variety-v2')=>{
  if(!brief.scenarioType)throw new Error('Variety requires an unambiguous scenario setting');
  const opts=varietyOptionsSchema.parse(requested),seed=opts.seed??scope,c=await loadBackgroundCatalog(root),history=c.varietyHistory??[];
  const select=(category:'palette'|'motion'|'music',ids:readonly string[],value:string)=>chooseVariety([...ids],history.map(h=>h[category]),seed,category,value==='auto'?undefined:value);
  const palette=select('palette',PALETTE_IDS,opts.palette),motion=select('motion',MOTION_IDS,opts.motion),music=select('music',opts.music==='none'?['none']:engine==='variety-v1'?['subtle-bass']:await availableMusicIds(root),opts.music);
  const candidates=[] as string[],dimensions=new Map<string,{width:number;height:number;checksum:string;framing:number}>();
  for(const id of eligibleBackgrounds(c,brief.scenarioType,background.reuseLimit,characterExplicit?background.character:undefined)){
    const asset=await catalogAsset(id,root);if(!asset)continue;
    try{const b=await readFile(join(root,'public',asset.file));if(sha256(b)!==asset.sha256||!b.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]))||b.length<45||b.subarray(-8,-4).toString()!=='IEND')continue;
      const {width,height}=await inspect(join(root,'public',asset.file),root);if(width<720||height<1280||width*height>16e6||width/height<.52||width/height>.70)continue;candidates.push(id);dimensions.set(id,{width,height,checksum:asset.sha256,framing:asset.framing.scale});}catch{/* corrupt/missing is ineligible, never a cache hit */}
  }
  if(background.assetId){const asset=await catalogAsset(background.assetId,root);if(!asset||asset.scenarioType!==brief.scenarioType)throw new Error('Explicit background must match setting');
    if(characterExplicit&&!eligibleBackgrounds({...c,entries:c.entries.map(e=>({...e,completedEpisodeIds:[]})),legacyUsage:{}},brief.scenarioType,10,background.character).includes(background.assetId))throw new Error('Explicit background lacks the requested character declaration');
    const b=await readFile(join(root,'public',asset.file));if(sha256(b)!==asset.sha256)throw new Error('Explicit background checksum mismatch');const {width,height}=await inspect(join(root,'public',asset.file),root);dimensions.set(asset.id,{width,height,checksum:asset.sha256,framing:asset.framing.scale});}
  const action=backgroundDecision(candidates,background.mode,background.assetId);
  let binding:BackgroundBinding,choice:ChoiceContext,descriptor:string|undefined;
  if(action==='generate'){
    descriptor=chooseVariety(DESCRIPTORS,[],seed,'variant').selected;
    const request=imageRequestSchema.parse({version:1,model:background.model,quality:background.quality,size:'1024x1536',output_format:'png',n:1,setting:brief.scenarioType,scope,style:BACKGROUND_STYLE,
      prompt:makeBackgroundPrompt(brief.scenarioType,brief.scenario,background.character)+`\nDeterministic scene variant: ${descriptor} Preserve every overlay/crop/face safe area above. No answer hints.`
        +(engine==='variety-v2'?' New-job motion may add up to 5% zoom or 26 pixels total horizontal travel after the baseline crop. Keep the face features comfortably inside the declared safe area and away from the caption band.':'')});
    binding={assetId:`generated-${brief.scenarioType}-${imageRequestHash(request).slice(0,16)}`,request};
    choice={candidates,excluded:[],selected:binding.assetId,historyHash:sha256(canonical(history)),recentChoices:history.map(h=>h.background).slice(-3),reason:background.mode==='new'?'explicit new image once':`eligible pool ${candidates.length}/3: one new variant`};
  }else{choice=chooseVariety(background.assetId?[...new Set([...candidates,background.assetId])]:candidates,history.map(h=>h.background),seed,'background',background.assetId);binding={assetId:choice.selected};}
  const size=dimensions.get(binding.assetId)??{width:1024,height:1536,checksum:null,framing:1.02};
  if(engine==='variety-v1')return {binding,descriptor,selection:{version:'variety-v1',seed,requested:opts,palette,motion,music,background:{...choice,action,eligibleCount:candidates.length,target:3},
    checksums:{palette:sha256(canonical(PALETTES[palette.selected as keyof typeof PALETTES])),motion:sha256(canonical({version:'visual-variety-v1',id:motion.selected})),music:(await loadProductionMusic(music.selected as ProductionMusicId,true,root))?.sha256??null,background:size.checksum,request:binding.request?imageRequestHash(binding.request):null},
    visual:{version:'visual-variety-v1',palette:palette.selected as keyof typeof PALETTES,motion:motion.selected as typeof MOTION_IDS[number],width:size.width,height:size.height}} satisfies VarietySelection};
  const musicAsset=await loadProductionMusic(music.selected as ProductionMusicId,true,root);
  const ambience=opts.ambience==='none'?null:{asset:(await getLibraryEntry(opts.ambience,root,'ambience')).asset,gain:opts.ambienceGain,mixVersion:'ambience-mix-v1' as const};
  const audio={music:musicAsset,ambience},motionConfig=resolveMotionConfig(size.width,size.height,size.framing);
  const selection:VarietySelection={version:'variety-v2',seed,requested:opts,palette,motion,music,audio,background:{...choice,action,eligibleCount:candidates.length,target:3},
    checksums:{palette:sha256(canonical(PALETTES[palette.selected as keyof typeof PALETTES])),motion:sha256(canonical({version:'visual-variety-v2',id:motion.selected,config:motionConfig})),music:musicAsset?.sha256??null,background:size.checksum,request:binding.request?imageRequestHash(binding.request):null,mix:sha256(canonical({audio,ambienceMix:AMBIENCE_MIX}))},
    visual:{version:'visual-variety-v2',palette:palette.selected as keyof typeof PALETTES,motion:motion.selected as typeof MOTION_IDS[number],width:size.width,height:size.height,motionConfig}};
  return {selection,binding,descriptor};
};
