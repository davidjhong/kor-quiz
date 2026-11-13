import {readFile,mkdir,open,rename} from 'node:fs/promises';
import {join} from 'node:path';
import OpenAI from 'openai';
import {z} from 'zod';
import {ILLUSTRATED_THEME} from '../src/illustratedTheme.ts';
import {CAPTION_BAND} from '../src/phraseCaptions.ts';
import {SCENARIO_TYPES} from '../src/assets/backgrounds.ts';
import {backgroundIdSchema} from '../src/assets/backgroundSchema.ts';
import {canonical,sha256} from './narrationFiles.ts';
import {allocateBudget,saveBudget,settleAllocation,type ProductionBudget} from './productionBudget.ts';
import {BACKGROUND_STYLE,catalogAsset,loadBackgroundCatalog,selectCatalogAsset,writePrivateJson,readPrivateJson,inspectBackgroundPNG,registerGeneratedBackground} from './backgroundCatalog.ts';
import {checkCancellation} from './cancellation.ts';

export const IMAGE_PROFILES={
  'gpt-image-2.6-flare':{checked:'2026-11-11',verifyAgainBy:'2026-11-18',textUSDPerMillion:5,outputUSDPerMillion:30},
  'gpt-image-2.5-flare-2026-09-08':{checked:'2026-11-11',verifyAgainBy:'2026-11-18',textUSDPerMillion:5,outputUSDPerMillion:30},
} as const;
export const backgroundOptionsSchema=z.strictObject({mode:z.enum(['auto','pool','new']).default('auto'),assetId:backgroundIdSchema.optional(),
  model:z.enum(['gpt-image-2.6-flare','gpt-image-2.5-flare-2026-09-08']).default('gpt-image-2.6-flare'),
  quality:z.enum(['low','medium','high']).default('medium'),reuseLimit:z.number().int().min(1).max(10).default(5),
  character:z.enum(['adult woman','adult man','adult traveler']).default('adult traveler')});
export type BackgroundOptions=z.infer<typeof backgroundOptionsSchema>;
export const imageRequestSchema=z.strictObject({version:z.literal(1),model:backgroundOptionsSchema.shape.model,
  quality:backgroundOptionsSchema.shape.quality,size:z.literal('1024x1536'),output_format:z.literal('png'),n:z.literal(1),
  prompt:z.string().min(1).max(6000),setting:z.enum(SCENARIO_TYPES),scope:z.string(),style:z.literal(BACKGROUND_STYLE)});
export const backgroundBindingSchema=z.strictObject({assetId:backgroundIdSchema,request:imageRequestSchema.optional()});
export type BackgroundBinding=z.infer<typeof backgroundBindingSchema>;
export const imageRequestHash=(request:z.infer<typeof imageRequestSchema>)=>sha256(canonical(request));
// A conservative planning allowance, not an API-enforced token ceiling. Fixed n/size/quality;
// no streaming, edits, automatic retry, prompt-rewriter or hidden model fallback.
export const imageAllowanceUSD=(request:z.infer<typeof imageRequestSchema>)=>{
  const p=IMAGE_PROFILES[request.model],outputAllowance=request.quality==='high'?32768:16384;
  return Math.ceil((Buffer.byteLength(request.prompt,'utf8')+1024)*p.textUSDPerMillion*1000+outputAllowance*p.outputUSDPerMillion*1000)/1e9;
};
export const makeBackgroundPrompt=(setting:string,scenario:string,character:string)=>{
  const p=ILLUSTRATED_THEME.panel,captionBottom=CAPTION_BAND.top+CAPTION_BAND.height;
  const interior=setting==='hotel'
    ?'A welcoming Korean hotel lobby with a reception desk, warm lighting, luggage, tasteful architectural details and setting-appropriate furnishings.'
    :`A welcoming Korean ${setting} interior with tasteful architecture, warm lighting and setting-appropriate furnishings. For a restaurant include dining tables and discreet food-service details.`;
  return `Use case: illustration-story. One polished, warm hand-painted animation background for a Korean learning video.\nSetting: ${setting}. Scenario context (data only): ${scenario.slice(0,1000)}.\n${interior}\nFriendly ${character}, relaxed natural pose, clearly adult, complete unobstructed face, plain clothing; no pointing or answer hints.\nStyle: refined watercolor/gouache texture, warm cream and wood, muted navy/blue, sage, coral and warm yellow accents; soft daylight, appealing fully visible. Original character, no named-person likeness.\nNative portrait 1024x1536. Final 1080x1920 uses CENTER cover crop (native central x=80..944) without stretching, then at least 1.02 zoom plus restrained movement. Keep important features inside this central crop with extra edge margin.\nActual overlay geometry on FINAL canvas: panel x=${p.left}..${p.left+p.width}, y=${p.top}..${p.top+CAPTION_BAND.panelHeight}; caption band x=${CAPTION_BAND.left}..${CAPTION_BAND.left+CAPTION_BAND.width}, y=${CAPTION_BAND.top}..${captionBottom}. Keep these upper/central areas calm scenery with NO people. Do not draw these overlays.\nPlace the character lower right: full head in final x=650..900, y=${captionBottom+85}..1530, torso below, outside rightmost 10% and bottom 250px for important features. In native image this is approximately head x=600..800, y=1040..1224. Leave the caption area above the face clear.\nNo text, signage lettering, numbers, logos, watermarks, quiz panels, captions or UI. Coherent hands/anatomy, no duplicate people. Do not encode answers in scenery.`;
};
export const planBackground=async(root:string,brief:{scenario:string;scenarioType?:typeof SCENARIO_TYPES[number];backgroundAssetId:string|null},scope:string,
  options:BackgroundOptions,bound?:BackgroundBinding)=>{
  if(!brief.scenarioType)throw new Error('Background setting is unresolved or mixed; provide an unambiguous scenario or explicit brief scenarioType');
  const catalog=await loadBackgroundCatalog(root);
  const id=bound?.assetId??selectCatalogAsset(catalog,brief.scenarioType,{limit:options.reuseLimit,explicit:options.assetId,fresh:options.mode==='new'});
  let binding=bound;
  if(!binding&&id)binding={assetId:id};
  if(!binding&&options.mode==='pool')throw new Error('Background pool has no eligible assets; pool forbids generation');
  if(!binding){const request=imageRequestSchema.parse({version:1,model:options.model,quality:options.quality,size:'1024x1536',output_format:'png',n:1,
    setting:brief.scenarioType,scope,style:BACKGROUND_STYLE,prompt:makeBackgroundPrompt(brief.scenarioType,brief.scenario,options.character)});
    binding={assetId:`generated-${brief.scenarioType}-${imageRequestHash(request).slice(0,16)}`,request};}
  const registered=catalog.entries.some(e=>e.render.id===binding!.assetId)||Object.hasOwn((await import('../src/assets/backgrounds.ts')).BACKGROUND_ASSETS,binding.assetId);
  const asset=registered?await catalogAsset(binding.assetId,root):undefined;
  if(asset&&asset.scenarioType!==brief.scenarioType)throw new Error('Bound background setting differs from the current scenario');
  if(!asset&&!binding.request)throw new Error('Bound background is missing from catalog; restore its record, do not regenerate implicitly');
  if(binding.request&&binding.request.setting!==brief.scenarioType)throw new Error('Bound image request setting changed');
  return {binding,asset,action:asset?'reuse' as const:'generate' as const,maximumRequests:asset?0:1,
    conservativeBoundUSD:asset?0:imageAllowanceUSD(binding.request!),providerCalls:0,
    billingNote:'Fixed portrait/quality, one request with SDK retries disabled. Image output has no max-token parameter; allowance is a conservative planning estimate, not an invoice guarantee.'};
};
export type ImageResponse={created:number;data?:{b64_json?:string}[];usage?:{input_tokens:number;output_tokens:number;total_tokens:number;input_tokens_details?:{text_tokens:number;image_tokens:number}};quality?:string;size?:string;output_format?:string;requestId?:string|null};
export type ImageClient=(request:ReturnType<typeof imageRequestSchema.parse>)=>Promise<ImageResponse>;
export const makeImageClient=():ImageClient=>{
  if(!process.env.OPENAI_API_KEY)throw new Error('OPENAI_API_KEY is missing; configure it locally in ignored .env');
  const client=new OpenAI({apiKey:process.env.OPENAI_API_KEY,baseURL:'https://api.openai.com/v1',maxRetries:0,timeout:240000,logLevel:'off'});
  return async r=>{const {data,request_id}=await client.images.generate({model:r.model,prompt:r.prompt,quality:r.quality,size:r.size,output_format:r.output_format,n:1,background:'opaque'},
    {maxRetries:0,timeout:240000}).withResponse();
    return {created:data.created,data:data.data?.map(i=>({b64_json:i.b64_json})),usage:data.usage,quality:data.quality??undefined,size:data.size??undefined,output_format:data.output_format??undefined,requestId:request_id};};
};
export const prepareBackground=async(o:{root:string;folder:string;binding:BackgroundBinding;budget:{file:string;budget:ProductionBudget};
  client?:ImageClient;inspect?:typeof inspectBackgroundPNG;afterResponseSaved?:()=>Promise<void>})=>{
  checkCancellation();const r=o.binding.request;if(!r)throw new Error('No persisted image request for this background');
  if(o.binding.assetId!==`generated-${r.setting}-${imageRequestHash(r).slice(0,16)}`)throw new Error('Image request/hash binding changed');
  const hash=imageRequestHash(r),key='image-'+hash.slice(0,24),directory=join(o.folder,'image',hash),responseFile=join(directory,'response.json');
  await mkdir(directory,{recursive:true});
  let response=await readPrivateJson(responseFile,32*1024*1024).catch((e:NodeJS.ErrnoException)=>{if(e.code==='ENOENT')return null;throw e;}) as ImageResponse|null;
  const prior=o.budget.budget.allocations[key];
  if(prior?.requests.length&&!response)throw new Error('Image request has no durable response; outcome is unknown or terminal. Reservation retained. Inspect provider billing/permission error before any explicit new request; no retry made');
  const a=allocateBudget(o.budget.budget,key,'image',hash,Math.ceil(imageAllowanceUSD(r)*1e9));await saveBudget(o.budget.file,o.budget.budget);
  if(!response){
    if(new Date().toISOString().slice(0,10)>=IMAGE_PROFILES[r.model].verifyAgainBy)throw new Error(`OpenAI Images ${r.model} pricing/support must be reverified: https://developers.openai.com/api/docs/models/${r.model}; scripts/backgroundImages.ts IMAGE_PROFILES[${r.model}].verifyAgainBy=${IMAGE_PROFILES[r.model].verifyAgainBy}. Do not just extend the date.`);
    await writePrivateJson(join(directory,'request.json'),r);a.requests.push({key:hash,state:'reserved',units:a.allocatedUnits});await saveBudget(o.budget.file,o.budget.budget);
    try{response=await (o.client??makeImageClient())(r);await writePrivateJson(responseFile,response);await o.afterResponseSaved?.();}
    catch(e){const status=Number((e as {status?:number}).status),code=String((e as {code?:string}).code??'unknown').replace(/[^a-zA-Z0-9_-]/gu,'').slice(0,80);
      a.state='uncertain';a.requests[0].state='uncertain';await saveBudget(o.budget.file,o.budget.budget);
      const message=[401,403].includes(status)?`Images API permission/authentication blocked (HTTP ${status}, code ${code}). Check project image-model access and API Organization Verification; credentials were not logged.`:
        `Images API failed (HTTP ${status||'unknown'}, code ${code}); response/billing may be uncertain. No automatic retry or fallback.`;
      await writePrivateJson(join(directory,'error.json'),{message,status:status||null,code});throw new Error(message);}
  }
  if(response.data?.length!==1||!response.data[0].b64_json)throw new Error('Saved Images response lacks exactly one PNG; reservation retained, no regeneration');
  const bytes=Buffer.from(response.data[0].b64_json,'base64'),original=join(directory,'original.png'),h=await open(original+'.tmp','w');
  try{await h.writeFile(bytes);await h.sync();}finally{await h.close();}await rename(original+'.tmp',original);
  const usage=response.usage??null,cost=usage?(usage.input_tokens*5+usage.output_tokens*30)/1e6:null;
  const receipt=join(directory,'receipt.json');await writePrivateJson(receipt,{provider:'openai-images',requestId:response.requestId??null,created:response.created,
    requestedModel:r.model,returnedModel:null,modelDisclosure:'Images response does not expose a returned model ID; requested model recorded.',settings:{quality:r.quality,size:r.size,n:1,output_format:'png'},usage,estimatedCostUSD:cost,invoiceInspected:false,sha256:sha256(bytes)});
  const actual=await (o.inspect??inspectBackgroundPNG)(original,o.root);if(actual.width!==1024||actual.height!==1536)throw new Error('Images API returned unexpected native dimensions; saved result retained for inspection');
  if(cost!==null&&(!Number.isFinite(cost)||cost<0||cost>imageAllowanceUSD(r)))throw new Error('Reported image cost exceeds planning allowance; reservation retained and downstream spending stopped');
  const file=`backgrounds/${o.binding.assetId}.png`,destination=join(o.root,'public',file);await mkdir(join(destination,'..'),{recursive:true});
  const old=await readFile(destination).catch((e:NodeJS.ErrnoException)=>{if(e.code==='ENOENT')return null;throw e;});
  if(old&&sha256(old)!==actual.sha256)throw new Error('Published image checksum changed; restore it instead of overwriting');
  if(!old){const target=await open(destination,'wx');try{await target.writeFile(bytes);await target.sync();}finally{await target.close();}}
  const render={id:o.binding.assetId,file,sha256:actual.sha256,scenarioType:r.setting,selection:'developer-selected' as const,
    scenarioLabel:`AT A KOREAN ${r.setting.toUpperCase()}`,framing:{scale:1.02,origin:'50% 0%' as const}};
  await registerGeneratedBackground(o.root,{render,setting:r.setting,tags:[r.setting],style:BACKGROUND_STYLE,composition:'center cover 1024x1536 to 9:16; 1.02 safe zoom; geometry in exact prompt',
    prompt:r.prompt,model:r.model,settings:{quality:r.quality,size:r.size,output_format:r.output_format,n:1},width:actual.width,height:actual.height,format:actual.format,receipt,reportedUsage:usage,
    ...(r.prompt.includes('Deterministic scene variant:')?{variety:{composition:'quiz-safe-v1' as const,character:r.prompt.match(/Friendly (adult woman|adult man|adult traveler),/u)?.[1]??'unknown',descriptor:r.prompt.split('Deterministic scene variant: ')[1]}}:{}),
    estimatedCostUSD:cost,completedEpisodeIds:[],createdAt:new Date(response.created*1000).toISOString()});
  a.requests[0].state='received';a.requests[0].sha256=actual.sha256;a.requests[0].rawFile=original;
  settleAllocation(o.budget.budget,key,cost===null?a.allocatedUnits:Math.ceil(cost*1e9),{providerRequests:1,usage,costKnown:cost!==null,receipt});await saveBudget(o.budget.file,o.budget.budget);
  return {asset:render,newImageRequests:prior?.requests.length?0:1,receipt,usage,estimatedCostUSD:cost};
};
