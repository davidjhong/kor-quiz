import {z} from 'zod';
import type {BonusCtaState} from './narration.ts';
import {ILLUSTRATED_THEME} from './illustratedTheme.ts';
import {CAPTION_BAND} from './phraseCaptions.ts';
// Three lines at 48px need 163px plus the bundled font's ink overhang (170px measured).
export const COMPACT_PROMPT_HEIGHT=172;
export const COMPACT_CONTEXT_HEIGHT=64;
export const COUNTDOWN_ROW={minimumHeight:72,padding:8,fontSize:70,numberWidth:66,barHeight:12,gap:28,bottomGap:12} as const;
export const presentationSchema = z.strictObject({compactSpacing: z.boolean(), synchronizedCaptions: z.boolean(),
  backgroundAudio: z.boolean(), musicGain: z.number().min(0).max(2).default(1),
  captionStyle: z.enum(['segments', 'phrases']).default('segments'),
  bookendStyle: z.enum(['classic', 'display']).default('classic')});
export type PresentationSettings = z.infer<typeof presentationSchema>;
export type SpeechSpan = {role: string; contentId: string; text: string; start: number; end: number};
/** Public speech only, on the same half-open measured interval as its audio. */
export const getNarrationCaption = (frame: number, contentId: string, audio: SpeechSpan[], bonus = false) =>
  audio.find((clip) => clip.contentId === contentId && frame >= clip.start && frame < clip.end
    && (!bonus || !['answer', 'explanation'].includes(clip.role))) ?? null;
/** Measured local font geometry only; independent of animation phase/frame. */
export const getCompactQuestionLayout = (promptHeight: number, contextHeight: number) => {
  if (![promptHeight, contextHeight].every(Number.isFinite) || promptHeight <= 0 || contextHeight < 0) throw new Error('Invalid measured question geometry');
  const {panel, slots, answers} = ILLUSTRATED_THEME;
  const crowded=promptHeight+contextHeight>200;
  const context = slots.prompt + Math.ceil(promptHeight) + (crowded?8:14);
  const answerTop = context + Math.ceil(contextHeight) + (contextHeight ? (crowded?12:20) : 6);
  const longHeading=promptHeight>150||crowded;
  const feedback = answerTop + 3 * answers.height + 2 * answers.gap + (crowded?8:longHeading?12:24);
  const feedbackDisplayHeight=Math.min(crowded?72:longHeading?80:120,CAPTION_BAND.panelHeight-COUNTDOWN_ROW.bottomGap-feedback);
  if(feedbackDisplayHeight<COUNTDOWN_ROW.minimumHeight)throw new Error('Question heading leaves insufficient countdown space above captions');
  const feedbackHeight = panel.height - panel.padding - feedback;
  if (feedbackHeight < 164) throw new Error('Question heading leaves insufficient readable explanation space');
  return {context, answers: answerTop, feedback, feedbackHeight,feedbackDisplayHeight};
};
export const getExplanationCaption = (frame: number, contentId: string, audio: SpeechSpan[], bonus = false) => bonus ? null
  : audio.find((clip) => clip.contentId === contentId && clip.role === 'explanation' && frame >= clip.start && frame < clip.end)?.text ?? null;
export const getSynchronizedCta = (frame: number, audio: SpeechSpan[], contentId: string): BonusCtaState | null => {
  const comment = audio.find((clip) => clip.contentId === contentId && clip.role === 'comment');
  const follow = audio.find((clip) => clip.contentId === contentId && clip.role === 'follow');
  if (!comment || frame < comment.start) return null;
  return follow && frame >= follow.start ? 'follow' : 'comment';
};
export const MUSIC_MIX = {idle: 0.25, thinking: 0.14, speech: 0.10, attack: 9, release: 18, fade: 30} as const;
const clamp = (value: number) => Math.max(0, Math.min(1, value));
export const getMusicGain = (frame: number, duration: number, audio: SpeechSpan[], countdowns: {countdownStart: number; revealStart: number}[], multiplier = 1,
  levels:{idle:number;thinking:number;speech:number}=MUSIC_MIX) => {
  const thinking = Math.max(0, ...countdowns.map((q) => Math.min(clamp((frame - q.countdownStart + MUSIC_MIX.attack) / MUSIC_MIX.attack),
    clamp((q.revealStart + MUSIC_MIX.release - frame) / MUSIC_MIX.release))));
  const base = levels.idle + (levels.thinking - levels.idle) * thinking;
  const duck = Math.max(0, ...audio.map((clip) => Math.min(clamp((frame - clip.start + MUSIC_MIX.attack) / MUSIC_MIX.attack),
    clamp((clip.end + MUSIC_MIX.release - frame) / MUSIC_MIX.release))));
  const fade = Math.min(clamp(frame / MUSIC_MIX.fade), clamp((duration - 1 - frame) / MUSIC_MIX.fade));
  return (base + (levels.speech - base) * duck) * fade * multiplier;
};
