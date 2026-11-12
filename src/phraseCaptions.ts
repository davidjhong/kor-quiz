import {z} from 'zod';
import {validateAlignedWords,usableWord,groupAcousticText} from './alignmentValidation.ts';
export const ALIGNMENT_CONFIG = {
  version: 'phrase-alignment-v1', engine: 'stable-ts', engineVersion: '2.19.1', whisperVersion: '20250625',
  torchVersion: '2.8.0+cpu', model: 'base',
  modelSha256: 'ed3a0b6b1c0edf879ad9b11b1af5a0e6ab5db9205f891f668f8b0e6c6326e34e',
  device: 'cpu', sampleRate: 16000, threads: 4, fp16: false, regroup: false,
  suppressSilence: true, vad: false, fastMode: false,
} as const;
export const alignmentSchema = z.strictObject({key: z.string(), audioSha256: z.string(), transcript: z.string(),
  language: z.enum(['en-US', 'ko-KR']), configuration: z.unknown(), durationSeconds: z.number().positive(),
  words: z.array(z.strictObject({text: z.string().min(1), start: z.number().nonnegative(), end: z.number().nonnegative(),
    probability: z.number().nullable()})).min(1)});
export type AlignedWords = z.infer<typeof alignmentSchema>;
/** A zero-duration token is retained as text, never animated as an individually timed word. */
export const usableAlignedWord=(w:AlignedWords['words'][number],_language:AlignedWords['language'])=>usableWord(w);
export const phraseSchema = z.strictObject({clipId: z.string(), contentId: z.string(),
  role: z.enum(['hook','question','answer','explanation','comment','follow']), language: z.enum(['en-US','ko-KR']),
  text: z.string().min(1), start: z.number().int().nonnegative(), end: z.number().int().positive(),
  emphasis: z.boolean(), alignmentKey: z.string()});
export type CaptionPhrase = z.infer<typeof phraseSchema>;
export const CAPTION_BAND = {left: 70, top: 1068, width: 880, height: 132, panelHeight: 872,
  fontSize: 60, minimumFontSize: 54, lineHeight: 1.08, entranceFrames: 4, exitFrames: 3} as const;
export const getActivePhrase = (frame: number, phrases: CaptionPhrase[], bonusIds: string[] = [], revealStart = 0) =>
  phrases.find((p) => frame >= p.start && frame < p.end &&
    (!['answer','explanation'].includes(p.role) || (!bonusIds.includes(p.contentId) && frame >= revealStart))) ?? null;
export const getPhraseAnimation = (frame: number, phrase: CaptionPhrase) => {
  const entrance = Math.min(1, Math.max(0, (frame - phrase.start + 1) / CAPTION_BAND.entranceFrames));
  return {opacity: Math.min(entrance, Math.max(0, (phrase.end - frame) / CAPTION_BAND.exitFrames)),
    scale: 0.96 + 0.04 * entrance};
};
/** Phrase text is editorial grouping only. Timing always comes from aligned words. */
export const makeCaptionPhrases = (alignment: AlignedWords, groups: string[],
  clip: {id: string; contentId: string; role: CaptionPhrase['role']; language: CaptionPhrase['language']; start: number; end: number},
  revealStart: number, bonusIds: string[] = []): CaptionPhrase[] => {
  const normalize = (s: string) => s.replace(/\s+/gu,'');
  if (normalize(groups.join(' ')) !== normalize(alignment.transcript)
    || normalize(alignment.words.map(w=>w.text).join(' ')) !== normalize(alignment.transcript)) throw new Error(`${clip.id}: caption transcript mismatch`);
  if (bonusIds.includes(clip.contentId) && ['answer','explanation'].includes(clip.role)) throw new Error('Bonus answer/explanation captions are forbidden');
  validateAlignedWords(alignment,clip.id);
  // Hand-authored comparison groups remain unchanged unless a group lacks anchors.
  let checkedCursor=0;
  const needsAnchors=groups.some(text=>{let left=normalize(text),positive=false;
    while(left&&checkedCursor<alignment.words.length){const w=alignment.words[checkedCursor++];positive ||= w.end>w.start;
      if(!left.startsWith(normalize(w.text)))throw new Error(`${clip.id}: phrase splits an aligned word`);left=left.slice(normalize(w.text).length);}
    return !positive;});
  if(needsAnchors)groups=groupAcousticText(alignment);
  let cursor=0;
  const phrases=groups.map((text,index)=>{
    const count=text.trim().split(/\s+/u).length;
    if(count<1 || count>5 || (count===1&&clip.language!=='ko-KR'&&groups.length>1)) throw new Error(`${clip.id}: use 2–5 words per English phrase; keep short Korean utterances intact`);
    let remaining=normalize(text), first=cursor;
    while(remaining && cursor<alignment.words.length){
      const word=normalize(alignment.words[cursor].text);
      if(!remaining.startsWith(word)) throw new Error(`${clip.id}: phrase splits an aligned word`);
      remaining=remaining.slice(word.length); cursor++;
    }
    if(remaining)throw new Error(`${clip.id}: incomplete phrase alignment`);
    const anchors=alignment.words.slice(first,cursor).filter(w=>w.end>w.start);
    if(!anchors.length)throw new Error(`${clip.id}: caption phrase has no acoustic interval`);
    const start=clip.start+Math.ceil(anchors[0].start*30);
    const end=Math.min(clip.end,clip.start+Math.ceil(anchors.at(-1)!.end*30));
    if(end<=start || (['answer','explanation'].includes(clip.role) && start<revealStart)) throw new Error(`${clip.id}: unsafe caption timing`);
    return {clipId:clip.id,contentId:clip.contentId,role:clip.role,language:clip.language,
      text,start,end,emphasis:index%3===1,alignmentKey:alignment.key};
  });
  for(let i=1;i<phrases.length;i++)if(phrases[i].start<phrases[i-1].end)throw new Error(`${clip.id}: overlapping caption groups`);
  return phrases;
};
