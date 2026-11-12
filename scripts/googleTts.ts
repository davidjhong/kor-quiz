import {TextToSpeechClient} from '@google-cloud/text-to-speech';
import type {NarrationScript, NarrationSegment} from '../src/narration.ts';
import {checkCancellation} from './cancellation.ts';

export class UncertainSynthesisError extends Error {}
export const synthesizeGoogle = async (segment: NarrationSegment, profile: NarrationScript['profile'],
  configuration: {project: string; onRequest?: () => void}, injectedClient?: Pick<TextToSpeechClient, 'synthesizeSpeech'>,
  pause = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms))) => {
  if (Buffer.byteLength(segment.text, 'utf8') > 4000 || (profile.model === 'gemini-2.5-flash-tts'
    && Buffer.byteLength(profile.stylePrompts[segment.language], 'utf8') > 4000)) throw new Error('TTS text/prompt exceeds the verified 4,000-byte input limit; no request made');
  // ADC is resolved by the official library. No token is read, printed, or saved by project code.
  const ownedClient = injectedClient ? undefined : new TextToSpeechClient({projectId: configuration.project, fallback: true});
  const client = injectedClient ?? ownedClient!;
  const gemini = profile.model === 'gemini-2.5-flash-tts';
  const request = {input: {text: segment.text, ...(gemini ? {prompt: profile.stylePrompts[segment.language]} : {})},
    voice: {languageCode: segment.language, name: profile.voices[segment.language], ...(gemini ? {modelName: profile.model} : {})},
    audioConfig: {audioEncoding: profile.outputFormat, sampleRateHertz: profile.sampleRateHertz,
      ...(!gemini ? {speakingRate: profile.speakingRate} : {})}};
  try {
    for (let attempt = 0; attempt < 2; attempt++) {
      checkCancellation();
      let audioContent: Uint8Array | string | null | undefined;
      configuration.onRequest?.();
      try {
        const [response] = await client.synthesizeSpeech(request, {timeout: 30000, retry: null,
          otherArgs: {headers: {'x-goog-user-project': configuration.project}}});
        audioContent = response.audioContent;
      } catch (error) {
        const code = Number((error as {code?: unknown}).code);
        if ((code === 8 || code === 429) && attempt === 0) { await pause(1000); continue; }
        if ([3, 7, 8, 16, 400, 401, 403, 404, 429].includes(code)) {
          throw new Error(`${segment.id}: Google TTS rejected request (code ${code}); check ADC, billing, permissions, quota or input. No further retry.`);
        }
        throw new UncertainSynthesisError(`${segment.id}: Google TTS request outcome uncertain (code ${Number.isFinite(code) ? code : 'unknown'}); no automatic retry because it may have been billed`);
      }
      const bytes = typeof audioContent === 'string' ? Buffer.from(audioContent, 'base64')
        : audioContent instanceof Uint8Array ? Buffer.from(audioContent) : Buffer.alloc(0);
      if (!bytes.length || bytes.length > 20 * 1024 * 1024) {
        throw new UncertainSynthesisError(`${segment.id}: incomplete audio response; review possible charges before retrying`);
      }
      return bytes;
    }
    throw new Error(`${segment.id}: rate limit persisted after one bounded retry`);
  } finally {
    await ownedClient?.close();
  }
};
