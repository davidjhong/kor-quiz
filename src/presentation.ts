import {z} from 'zod';
import type {BonusCtaState} from './narration.ts';
import {ILLUSTRATED_THEME} from './illustratedTheme.ts';
export const presentationSchema = z.strictObject({compactSpacing: z.boolean(), synchronizedCaptions: z.boolean(),
  backgroundAudio: z.boolean()});
export type PresentationSettings = z.infer<typeof presentationSchema>;
export type SpeechSpan = {role: string; contentId: string; text: string; start: number; end: number};
/** Measured local font geometry only; independent of animation phase/frame. */
export const getCompactQuestionLayout = (promptHeight: number, contextHeight: number) => {
  if (![promptHeight, contextHeight].every(Number.isFinite) || promptHeight <= 0 || contextHeight < 0) throw new Error('Invalid measured question geometry');
  const {panel, slots, answers} = ILLUSTRATED_THEME;
  const context = slots.prompt + Math.ceil(promptHeight) + 14;
  const answerTop = context + Math.ceil(contextHeight) + (contextHeight ? 20 : 6);
  const feedback = answerTop + 3 * answers.height + 2 * answers.gap + 24;
  const feedbackHeight = panel.height - panel.padding - feedback;
  if (feedbackHeight < 164) throw new Error('Question heading leaves insufficient readable explanation space');
  return {context, answers: answerTop, feedback, feedbackHeight};
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
export const getMusicGain = (frame: number, duration: number, audio: SpeechSpan[], countdowns: {countdownStart: number; revealStart: number}[]) => {
  const thinking = Math.max(0, ...countdowns.map((q) => Math.min(clamp((frame - q.countdownStart + MUSIC_MIX.attack) / MUSIC_MIX.attack),
    clamp((q.revealStart + MUSIC_MIX.release - frame) / MUSIC_MIX.release))));
  const base = MUSIC_MIX.idle + (MUSIC_MIX.thinking - MUSIC_MIX.idle) * thinking;
  const duck = Math.max(0, ...audio.map((clip) => Math.min(clamp((frame - clip.start + MUSIC_MIX.attack) / MUSIC_MIX.attack),
    clamp((clip.end + MUSIC_MIX.release - frame) / MUSIC_MIX.release))));
  const fade = Math.min(clamp(frame / MUSIC_MIX.fade), clamp((duration - 1 - frame) / MUSIC_MIX.fade));
  return (base + (MUSIC_MIX.speech - base) * duck) * fade;
};
