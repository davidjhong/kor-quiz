import {z} from 'zod';
import {briefSchema} from '../src/draftSchema.ts';
import {BACKGROUND_ASSETS,type BackgroundAssetId,SCENARIO_TYPES} from '../src/assets/backgrounds.ts';

export const SCENARIO_DEFAULTS_VERSION='phase6-scenario-defaults-v1';
export const scenarioTextSchema=z.string().max(1000).transform(s=>s.normalize('NFC').trim())
  .pipe(z.string().min(1,'Scenario must not be blank'));
export const SCENARIO_DEFAULTS={audience:'English-speaking adults learning practical beginner Korean for travel',
  level:'Beginner: two easy, two medium and two hard questions, with the sixth as the unanswered comment bonus'} as const;
type ScenarioType=typeof SCENARIO_TYPES[number];
const classifiers:{type:ScenarioType;pattern:RegExp}[]=[
  {type:'cafe',pattern:/(?:^|[^\p{L}\p{N}])(?:caf[eé]s?|coffee\s*shops?)(?=$|[^\p{L}\p{N}])|카페/iu},
  {type:'convenience-store',pattern:/\b(?:convenience\s*stores?|mini-?marts?)\b|편의점/iu},
  {type:'public-transit',pattern:/\b(?:public\s*(?:transit|transport)|transit|subways?|metros?|trains?|buses|bus|railways?|platforms?)\b|지하철/iu},
  {type:'hotel',pattern:/\b(?:hotels?|hostels?|guesthouses?)\b|호텔|숙소/iu},
  {type:'restaurant',pattern:/\b(?:restaurants?|dining|ordering food)\b|식당|음식점/iu},
];
export type ScenarioSource={kind:'scenario';text:string;defaultsVersion:string;brief:z.infer<typeof briefSchema>};
export const makeScenarioSource=(raw:string):ScenarioSource=>{
  const text=scenarioTextSchema.parse(raw),matches=classifiers.filter(c=>c.pattern.test(text));
  return {kind:'scenario',text,defaultsVersion:SCENARIO_DEFAULTS_VERSION,brief:briefSchema.parse({scenario:text,...SCENARIO_DEFAULTS,
    backgroundAssetId:null,...(matches.length===1?{scenarioType:matches[0].type}:{})})};
};
/** Select only a real registered asset for one unambiguous setting. Never invent a path. */
export const resolveScenarioBrief=(source:ScenarioSource)=>{
  const brief=briefSchema.parse(source.brief);
  if(brief.scenario!==scenarioTextSchema.parse(source.text))throw new Error('Stored scenario text and seed brief disagree; preserve this job and start a new source revision');
  // An unresolved seed can become usable after a setting/asset is registered.
  // The caller hashes/preserves each resulting binding as a separate source revision.
  if(!brief.scenarioType){const matches=classifiers.filter(c=>c.pattern.test(source.text));if(matches.length===1)brief.scenarioType=matches[0].type;}
  const assets=Object.entries(BACKGROUND_ASSETS).filter(([,a])=>a.scenarioType===brief.scenarioType);
  const preferred:Partial<Record<ScenarioType,BackgroundAssetId>>={cafe:'korean-cafe-illustrated-v1','public-transit':'korean-transit-illustrated-dev-v1'};
  const selected=assets.find(([id])=>id===preferred[brief.scenarioType!])??(assets.length===1?assets[0]:undefined);
  return briefSchema.parse({...brief,backgroundAssetId:selected?.[0]??null});
};
export const scenarioBackgroundRequirement=(brief:z.infer<typeof briefSchema>)=>brief.backgroundAssetId?null:
  `No registered matching ${brief.scenarioType??'unambiguous scenario'} background is available. Supply/register a matching local illustration in src/assets/backgrounds.ts (and its setting classifier for an unknown setting), then resume. The CLI does not generate or download images; a hotel cannot use the café or transit background.`;
