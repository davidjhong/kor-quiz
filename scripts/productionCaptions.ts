import type {AlignedWords} from '../src/phraseCaptions.ts';
import type {PreparedClip} from '../src/narration.ts';
import {makeCaptionPhrases} from '../src/phraseCaptions.ts';
import {groupAcousticText} from '../src/alignmentValidation.ts';
import {readAlignment} from './captionAlignment.ts';
export const GROUPING_CONFIG={version:'automatic-phrases-v4-acoustic-groups',englishWords:4,maximumWords:5,maximumCharacters:36,koreanWholeUtterance:true} as const;
/** Preserve exact source substrings; group at acoustic word boundaries, never divide time. */
export const groupAlignedText=(a:AlignedWords,configuration=GROUPING_CONFIG,label=a.key??'segment'):string[]=>{
  try{return groupAcousticText(a,configuration);}catch(e){throw new Error(`${label}: ${e instanceof Error?e.message:'unusable grouping'}; raw alignment preserved`);}
};
export const productionPhrases=async(clips:PreparedClip[],audio:{id:string;start:number;end:number}[],reveals:Record<string,number>,bonusId:string,root:string)=>{
  const result=[];
  for(const clip of clips){const a=await readAlignment(clip,root),span=audio.find(c=>c.id===clip.id)!;
    result.push(...makeCaptionPhrases(a,groupAlignedText(a,GROUPING_CONFIG,clip.id),{...clip,...span},reveals[clip.contentId]??0,[bonusId]));}
  return result;
};
