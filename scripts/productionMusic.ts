import {loadMusic} from './comparisonWorkflow.ts';
import {MUSIC_IDS,type RenderMusic} from '../src/musicLibrary.ts';
import {getLibraryEntry,loadAudioLibrary,validateLocalBed} from './audioLibrary.ts';
export const PRODUCTION_MUSIC_IDS=[...MUSIC_IDS,'none'] as const;
export type ProductionMusicId=typeof PRODUCTION_MUSIC_IDS[number];
export const loadProductionMusic=async(id:ProductionMusicId='subtle-bass',enabled=true,root?:string,binding?:RenderMusic|null)=>{
  if(!PRODUCTION_MUSIC_IDS.includes(id))throw new Error(`Unknown music track ${id}; choose a registered library ID or none`);
  if(!enabled||id==='none')return null;
  if(id==='subtle-bass'){const asset=await loadMusic(true,root);if(binding&&binding.sha256!==asset!.sha256)throw new Error('Pinned Subtle Bass checksum changed');return asset;}
  if(!root)throw new Error('Local library resolution requires project root');
  return binding?validateLocalBed(binding,root):(await getLibraryEntry(id,root,'music')).asset;
};
export const availableMusicIds=async(root:string)=>{
  const library=await loadAudioLibrary(root);for(const e of library.entries.filter(e=>e.kind==='music'))await validateLocalBed(e.asset,root);
  const ids=library.entries.filter(e=>e.kind==='music').map(e=>e.id) as string[];
  // Legacy installations remain useful before opting into music:generate.
  if(!ids.length){await loadMusic(true,root);return ['subtle-bass'];}
  await loadMusic(true,root);return ['subtle-bass',...ids];
};
