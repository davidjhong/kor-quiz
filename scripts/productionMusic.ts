import {loadMusic} from './comparisonWorkflow.ts';
/** Checkpoint A selection only: preserve the actual Subtle Bass file and license.
 * New generated tracks and automatic library selection belong to later checkpoints. */
export const PRODUCTION_MUSIC_IDS=['subtle-bass','none'] as const;
export type ProductionMusicId=typeof PRODUCTION_MUSIC_IDS[number];
export const loadProductionMusic=async(id:ProductionMusicId='subtle-bass',enabled=true,root?:string)=>{
  if(!PRODUCTION_MUSIC_IDS.includes(id))throw new Error(`Unknown music track ${id}; use subtle-bass or none`);
  return loadMusic(enabled&&id!=='none',root);
};
