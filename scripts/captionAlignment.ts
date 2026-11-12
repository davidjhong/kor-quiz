import {join, resolve} from 'node:path';
import {readFile} from 'node:fs/promises';
import {z} from 'zod';
import {ALIGNMENT_CONFIG, alignmentSchema, makeCaptionPhrases, type CaptionPhrase} from '../src/phraseCaptions.ts';
import {canonical, readJsonFile, requireWithin, sha256} from './narrationFiles.ts';
import {PROJECT_ROOT} from './remotionCommand.ts';
import type {PreparedClip} from '../src/narration.ts';
import {validateAlignedWords} from '../src/alignmentValidation.ts';
export const loadDisplayCues=async(clips:PreparedClip[],audio:{id:string;start:number}[],root=PROJECT_ROOT)=>{
  const wordFrame=async(role:'hook'|'comment'|'follow',word:string)=>{
    const clip=clips.find(c=>c.role===role),span=clip&&audio.find(c=>c.id===clip.id);
    if(!clip||!span)throw new Error(`Missing ${role} clip for display cues`);
    const alignment=await readAlignment(clip,root),timing=alignment.words.find(w=>w.text.trim().replace(/[?!.,]/gu,'')===word);
    if(!timing)throw new Error(`${clip.id}: missing cached display-word cue ${word}`);
    return span.start+Math.ceil(timing.start*30);
  };
  return {sayItStart:await wordFrame('hook','say'),inStart:await wordFrame('hook','in'),koreanStart:await wordFrame('hook','Korean'),
    commentPromptStart:await wordFrame('comment','What'),commentInvitationStart:await wordFrame('comment','Comment'),
    followMoreStart:await wordFrame('follow','more'),followKoreanStart:await wordFrame('follow','Korean')};
};
export const alignmentKey = (clip: Pick<PreparedClip,'sha256'|'text'|'language'>, configuration: unknown = ALIGNMENT_CONFIG) =>
  sha256(canonical({audioSha256:clip.sha256,transcript:clip.text,language:clip.language,configuration}));
export const readAlignment = async (clip: PreparedClip, root=PROJECT_ROOT) => {
  const key=alignmentKey(clip), file=join(root,'.audio-cache/caption-alignments',key+'.json');
  const alignment=alignmentSchema.parse(await readJsonFile(file).catch(()=>{throw new Error(`${clip.id}: missing/corrupt phrase alignment; run npm run voice:align -- --config content/voice-comparison/transit-01-c-phrases.json --profile c-achird`);}));
  if(alignment.key!==key || alignment.audioSha256!==clip.sha256 || alignment.transcript!==clip.text
    || alignment.language!==clip.language || canonical(alignment.configuration)!==canonical(ALIGNMENT_CONFIG)
    || Math.abs(alignment.durationSeconds-clip.durationSeconds)>1/24000)throw new Error(`${clip.id}: stale alignment cache; rerun voice:align with --force`);
  validateAlignedWords(alignment,clip.id);return alignment;
};
export const loadAlignedPhrases = async (clips: PreparedClip[], audio: {id:string;start:number;end:number}[],
  groupsFile: string | undefined, revealStart:number, bonusIds:string[], root=PROJECT_ROOT):Promise<CaptionPhrase[]> => {
  if(!groupsFile)throw new Error('Phrase captions require a local captionPhrases JSON path');
  const file=resolve(root,groupsFile); requireWithin(root,file);
  const groups=z.record(z.string(),z.array(z.string().min(1)).min(1)).parse(await readJsonFile(file));
  if(Object.keys(groups).sort().join('|')!==clips.map(c=>c.id).sort().join('|'))throw new Error('Caption phrase IDs must match the exact six prepared clips');
  const result:CaptionPhrase[]=[];
  for(const clip of clips){
    if(sha256(await readFile(join(root,'public',clip.file)))!==clip.sha256)throw new Error(`${clip.id}: audio checksum changed before alignment`);
    const span=audio.find(a=>a.id===clip.id); if(!span)throw new Error('Caption clip missing from timeline');
    result.push(...makeCaptionPhrases(await readAlignment(clip,root),groups[clip.id],{...clip,...span},revealStart,bonusIds));
  }
  for(let i=1;i<result.length;i++)if(result[i].start<result[i-1].end)throw new Error('Aligned caption phrases overlap');
  return result;
};
