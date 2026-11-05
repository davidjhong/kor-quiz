# Phase 4 voice selection and audition

Research date: **2026-11-04**. Three providers were compared. No voice cloning is
used. Language support is documented capability; natural pronunciation and voice
quality are listening judgments. I cannot reliably listen with the available
tools, so this checkpoint supplies playable files for the owner's review.

## Comparison

| Candidate | English / Korean and stock audition | Current cost / access | Integration and tradeoff |
| --- | --- | --- | --- |
| **Google Cloud Chirp 3 HD — selected** | Locale-qualified stock Kore voices exist for en-US and ko-KR; other stock profiles have catalogue players. | First 1M characters/month listed as free, then $30/M characters; billing-enabled Cloud project required, no monthly subscription specified. | Official Node client with ADC; WAV/LINEAR16 or MP3. Fixed Kore-family pair supports locale-specific synthesis; perceived identity and Korean naturalness require review. |
| ElevenLabs `eleven_multilingual_v2` | One stock/library voice can synthesize English and Korean; official Voice Library/TTS page has audition players. | API page lists $0.08/1K characters. Starter's documented commercial-license subscription is $6/month (promotions excluded). PAYG also exists; its exact commercial-license minimum should be confirmed before switching. | Simple voice-ID API and compressed output; higher-resolution PCM depends on tier. Plausible quality candidate, not subjectively ranked here. |
| OpenAI `gpt-4o-mini-tts` | English and Korean supported; built-in voices include marin/cedar, with official demo playback. Voices are optimized for English. | $0.60/M input text tokens and $12/M output audio tokens; new prepaid accounts have a $5 minimum credit purchase. | Simple Speech endpoint and WAV/PCM/MP3 formats, but current docs announce shutdown January 6, 2027 and migration to a different Realtime workflow. Not selected for a new integration. |

Sources: [Google voices and players](https://docs.cloud.google.com/text-to-speech/docs/list-voices-and-types),
[Google pricing](https://cloud.google.com/text-to-speech/pricing),
[Google client/ADC](https://docs.cloud.google.com/text-to-speech/docs/libraries),
[ElevenLabs model languages](https://elevenlabs.io/docs/overview/models),
[ElevenLabs API pricing](https://elevenlabs.io/pricing/api),
[ElevenLabs subscriptions](https://elevenlabs.io/pricing),
[ElevenLabs TTS audition](https://elevenlabs.io/text-to-speech),
[OpenAI speech guide and lifecycle](https://developers.openai.com/api/docs/guides/text-to-speech),
[OpenAI model rates](https://developers.openai.com/api/docs/models/gpt-4o-mini-tts),
[OpenAI prepaid minimum](https://help.openai.com/en/articles/8264644-setting-up-and-managing-prepaid-api-billing).

Google is the lowest incremental-cost recommendation **assuming its monthly free
allowance remains available**. Even outside that allowance this small audition is
less than one cent. That recommendation is about cost and integration suitability,
not a claim that its Korean pronunciation beats the other services. A fixed
locale-qualified Kore pair is used rather than random voice rotation; matching
profile names do not by themselves prove perceptually identical voices.

## Commercial use and disclosure

Google's [TTS basics](https://docs.cloud.google.com/text-to-speech/docs/basics)
permits generated audio in applications/media subject to Cloud terms and applicable
law. Those cited TTS pages do not specify a provider-credit requirement; the preview
voluntarily labels its narration as AI-generated. Account-specific terms and any
platform disclosure requirements still govern publication.

ElevenLabs' [billing documentation](https://elevenlabs.io/docs/overview/administration/billing)
says paid plans provide commercial rights, while the free plan is noncommercial
with attribution. Confirm PAYG licensing explicitly if choosing that alternative.
OpenAI's [Services Agreement](https://openai.com/policies/services-agreement/)
assigns output rights subject to its terms; its speech guide requires clear
AI-voice disclosure. No service's language-support list certifies pronunciation.

## Exact configuration used

- Provider: Google Cloud Text-to-Speech, `@google-cloud/text-to-speech` **7.2.0**,
  standard v1 synthesis using the official client's ADC support.
- Model family: **Chirp 3 HD** (`chirp3-hd` in the saved profile, selected through
  the API voice name).
- English: **`en-US-Chirp3-HD-Kore`**.
- Korean: **`ko-KR-Chirp3-HD-Kore`**; synthesized from **물 주세요.**, not romanization.
- Pace **1.0**, output **LINEAR16**, **24,000 Hz**. No expressive instructions,
  pitch change, custom pronunciation, voice cloning, or post-processing speedup.
- Offline processing: FFmpeg loudness normalization, I=-16 LUFS, TP=-1.5 dBTP,
  LRA=11, mono 24 kHz signed 16-bit WAV. Durations measured after processing.
- Each request has a 30-second SDK timeout and SDK retries disabled (`retry: null`).
  The application permits one explicit rate-limit retry. Authentication/input errors
  are not retried; uncertain server/network outcomes leave a pending cache marker.
  Repeating an uncertain request requires explicit acknowledgment of possible
  duplicate charges. Neither credentials nor tokens are printed or cached.

## Actual usage and playable samples

The owner explicitly approved **up to $0.02 for this audition only**. Four accepted
segments total **160 Unicode characters** (24 + 61 + 6 + 69). At $0.00003/character,
the estimate is **$0.0048 before an eligible free allowance**, excluding taxes.
This is **not a reported billed cost**; no invoice/Cloud billing report was read.
No narration for the full six-question episode was generated.

- [Four-clip audition player](../out/water-voice-audition/index.html)
- [Hook](../out/water-voice-audition/water-hook-en.wav)
- [Question/context](../out/water-voice-audition/water-question-en.wav)
- [Korean answer](../out/water-voice-audition/water-answer-ko.wav)
- [Meaning/explanation](../out/water-voice-audition/water-explanation-en.wav)
- [One-question narrated MP4](../out/cafe-water-narrated-preview.mp4)

Existing official stock recordings were also downloaded for reference, without
synthesis: [English](../out/voice-reference/google-en-US-Kore-stock.wav) and
[Korean](../out/voice-reference/google-ko-KR-Kore-stock.wav).
Provenance: [English source](https://docs.cloud.google.com/static/text-to-speech/docs/audio/en-US-Chirp3-HD-Kore.wav),
[Korean source](https://docs.cloud.google.com/static/text-to-speech/docs/audio/ko-KR-Chirp3-HD-Kore.wav).
These stock recordings use different text; the four audition clips use the requested
representative sample exactly, plus the opening hook.

## Measured timeline

Clip durations are 1.640, 4.640, 1.680, and 4.200 seconds. The schedule reserves
**ceil(duration × 30)** frames per clip, so reserved end times may slightly exceed
the sample duration. No speech segment overlaps another or the countdown.

| Event | Start seconds / frame | Reserved end seconds / frame |
| --- | --- | --- |
| Hook speech | 0.200 / 6 | 1.867 / 56 |
| Opening visual | 0 / 0 | 3.000 / 90 |
| Transition | 3.000 / 90 | 3.400 / 102 |
| Question/context speech | 3.600 / 108 | 8.267 / 248 |
| Countdown, no speech | 8.767 / 263 | 13.767 / 413 |
| Correct B highlight | 13.767 / 413 | Held through reveal |
| Korean answer speech | 13.967 / 419 | 15.667 / 470 |
| English meaning/explanation | 16.000 / 480 | 20.200 / 606 |
| Final reading hold | 20.200 / 606 | 21.200 / 636 |
| Clean text fade | 21.200 / 636 | 21.600 / 648 |

Opening remains at least three seconds. Question reading starts after the transition
settles and extends until question speech plus a 0.5-second pause has finished.
Countdown stays exactly five seconds. Reveal extends for both clips, a 10-frame
language gap, and a one-second reading pause, retaining the four-second minimum.

## Objective checks and listening review

The output has **648 video frames / 21.600 seconds**, H.264, 1080 × 1920, 30 FPS,
yuv420p, and AAC 48 kHz stereo. MP4 container/audio duration is **21.611 seconds**
because of AAC padding, within the existing one-frame-plus-1-ms tolerance. Full
decoding succeeded. Scheduled speech ends at 20.200 seconds, before the final hold
and fade. Representative frames show intact Hangul/romanization, B highlighted at
frame 413, stable panel/background, and the explanation visible through the hold.

Metering after preparation: hook -16.02 LUFS, question -16.47, Korean -15.97,
explanation -17.41. Clip true peaks are at most -1.49 dBTP; encoded output meters
-16.96 LUFS and -4.49 dBTP. [Measurements](../out/water-voice-audition/level-measurements.json).
These metrics show headroom and a modest level spread, not equal perceived loudness
or proof of inaudible artifacts.

**Owner listening checks remain:** Korean naturalness and politeness, English pace,
voice compatibility across languages, perceived volume, audible clipping/artifacts,
and whether the pauses feel comfortable. I have not claimed to hear or approve the
actual audio. Stop here for voice and pacing review before any full-episode synthesis.
