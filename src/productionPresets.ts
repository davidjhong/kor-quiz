import {z} from 'zod';
export const productionPresetName=z.enum(['legacy-v1','concise-v1','concise-v2']);
export type ProductionPresetName=z.infer<typeof productionPresetName>;
export type TimingSettings={fps:number;openingMinimum:number;readingMinimum:number;countdown:number;countdownHard?:number;
  revealMinimum:number;settlePause:number;afterHook:number;afterQuestion:number;answerGap:number;afterExplanation:number;
  transition:number;finalFade:number;commentHold:number;afterComment:number;afterFollow:number};
export const LEGACY_TIMING:TimingSettings={fps:30,openingMinimum:90,readingMinimum:120,countdown:150,revealMinimum:120,
  settlePause:6,afterHook:15,afterQuestion:15,answerGap:10,afterExplanation:30,transition:12,finalFade:12,commentHold:120,afterComment:45,afterFollow:30};
export const LOUDNESS_CONCISE={version:'final-mix-concise-v1',integratedLUFS:-14,truePeakDbTP:-1.5,loudnessRangeLU:11,
  integratedToleranceLU:0.5,truePeakMeterToleranceDb:0.1,encoderHeadroomDb:0.3} as const;
export type FinalMixSettings={version:string;integratedLUFS:number;truePeakDbTP:number;loudnessRangeLU:number;integratedToleranceLU:number;truePeakMeterToleranceDb:number;encoderHeadroomDb?:number};
/** Missing fields explicitly mean legacy behavior. New video jobs persist concise-v1. */
export const resolveProductionPreset=(id:ProductionPresetName='legacy-v1',countdownSeconds?:5)=>{
  productionPresetName.parse(id);if(countdownSeconds!==undefined&&countdownSeconds!==5)throw new Error('Explicit countdown override must be 5 seconds');
  const concise=id!=='legacy-v1',boost=id==='concise-v2'?10**(3/20):1;
  return {id,timing:{...LEGACY_TIMING,...(concise?{readingMinimum:90,countdown:90,countdownHard:120,revealMinimum:0,
      afterHook:9,afterQuestion:9,answerGap:9,afterExplanation:15,transition:10}:{}),
      ...(countdownSeconds?{countdown:150,countdownHard:150}:{})},
    music:{idle:(concise?0.45:0.25)*boost,thinking:(concise?0.30:0.14)*boost,speech:(concise?0.20:0.10)*boost},
    ...(id==='concise-v2'?{mixVersion:'source-music-plus3-v1',relativeMusicDb:3}:{}),
    finalMix:concise?LOUDNESS_CONCISE:null,editorial:concise?'concise-explanations-v1' as const:null,
    advisoryDurationSeconds:concise?[75,85]:null,minimumDurationSeconds:65};
};
