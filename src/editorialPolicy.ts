/** Unicode letter/number runs are words; apostrophes stay inside contractions.
 * Hyphens split words; punctuation and symbols alone are not words. */
export const countEnglishWords=(text:string)=>(text.match(/[\p{L}\p{N}]+(?:['’][\p{L}\p{N}]+)*/gu)??[]).length;
export const assertConciseExplanation=(text:string,label='explanationNarration')=>{
  const sentences=text.trim().match(/[.!?]+[”’"']?(?=\s|$)/gu)??[];
  const words=countEnglishWords(text);
  if(!words||words>12||sentences.length!==1||!/[.!?][”’"']?$/u.test(text.trim()))
    throw new Error(`${label}: concise-explanations-v1 requires one useful English sentence, 1–12 words (got ${words}); character limits also apply`);
};
export const assertConciseNarration=(segments:{id:string;role:string;text:string}[])=>{
  for(const s of segments)if(s.role==='explanation')assertConciseExplanation(s.text,s.id);
};
