import type {AlignedWords} from './phraseCaptions.ts';

/** Timestamp tolerance is 1 ms for saved aligner rounding, never invented speech. */
export const ALIGNMENT_TOLERANCE_SECONDS=0.001;
export const normalizeAlignmentText=(text:string)=>text.replace(/\s+/gu,'');
export const usableWord=(w:{start:number;end:number;text:string})=>Number.isFinite(w.start)&&Number.isFinite(w.end)
  &&w.start>=0&&w.end>=w.start&&normalizeAlignmentText(w.text).length>0;
export const validateAlignedWords=(a:Pick<AlignedWords,'words'|'transcript'|'durationSeconds'>,label='segment')=>{
  const fail=(condition:string,i?:number)=>{const word=i===undefined?'':` word ${i+1} ${JSON.stringify(a.words[i].text.trim().slice(0,60))}`;
    throw new Error(`${label}${word}: invalid alignment (${condition})`);};
  if(!Number.isFinite(a.durationSeconds)||a.durationSeconds<=0)fail('clip duration must be finite and positive');
  if(!a.words.length)fail('no words');
  a.words.forEach((w,i)=>{
    if(!usableWord(w))fail('nonfinite, negative, reversed or empty word span',i);
    if(w.end>a.durationSeconds+ALIGNMENT_TOLERANCE_SECONDS)fail('endpoint exceeds clip duration',i);
    if(i&&w.start<a.words[i-1].start)fail('word starts out of order',i);
    if(i&&w.start<a.words[i-1].end-ALIGNMENT_TOLERANCE_SECONDS)fail('material overlap',i);
  });
  if(!a.words.some(w=>w.end>w.start))fail('all words have zero duration; no acoustic interval');
  if(normalizeAlignmentText(a.words.map(w=>w.text).join(''))!==normalizeAlignmentText(a.transcript))fail('transcript mismatch');
};

/** Dynamic programming preserves every source character and uses positive acoustic spans.
 * Sentence breaks are preferences. Unlocated words are text inside anchored phrases. */
export const groupAcousticText=(a:AlignedWords,options={englishWords:4,maximumWords:5,maximumCharacters:36})=>{
  validateAlignedWords(a);
  const ranges:{start:number;end:number}[]=[];let pos=0;
  for(const w of a.words){while(pos<a.transcript.length&&/\s/u.test(a.transcript[pos]))pos++;
    const start=pos;let remaining=normalizeAlignmentText(w.text);
    while(remaining){while(pos<a.transcript.length&&/\s/u.test(a.transcript[pos]))pos++;
      if(a.transcript[pos]!==remaining[0])throw new Error('segment: cannot map exact aligned tokens');pos++;remaining=remaining.slice(1);}
    ranges.push({start,end:pos});
  }
  type Candidate={cost:number;texts:string[];firstFrame:number};
  const best:(Candidate|undefined)[]=new Array(ranges.length+1);
  best[ranges.length]={cost:0,texts:[],firstFrame:Infinity};
  for(let first=ranges.length-1;first>=0;first--){
    for(let last=first;last<ranges.length;last++){
      const text=a.transcript.slice(ranges[first].start,ranges[last].end),count=text.trim().split(/\s+/u).length;
      if(count>options.maximumWords||[...text].length>options.maximumCharacters)break;
      if(count===1&&a.language==='en-US'&&ranges.length>1)continue;
      const anchors=a.words.slice(first,last+1).filter(w=>w.end>w.start),next=best[last+1];
      if(!anchors.length||!next)continue;
      const start=Math.ceil(anchors[0].start*30),end=Math.ceil(Math.min(a.durationSeconds,anchors.at(-1)!.end)*30);
      if(end<=start||end>next.firstFrame)continue;
      const sentence=/[.!?][”’"']?$/u.test(text),punct=/[,;:]$/u.test(text);
      const cost=next.cost+Math.pow(count-options.englishWords,2)+(sentence?-6:punct?-2:2);
      if(!best[first]||cost<best[first]!.cost)best[first]={cost,texts:[text,...next.texts],firstFrame:start};
    }
  }
  if(!best[0])throw new Error('segment: no readable grouping with positive acoustic intervals; preserve saved alignment and revise grouping');
  return best[0]!.texts;
};
