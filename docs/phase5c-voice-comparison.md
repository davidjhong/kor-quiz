# Phase 5C — presentation and voice comparison checkpoint

Status: **Achird selected; final Phase 5C checkpoint is the revised C excerpt**
under the user's 2026-11-10 scope. No full episode or Phase 6 work is included.
Phase 5B remains complete. The original transit MP4,
draft, private key, audio manifest and all 19 cached clips are byte-for-byte
preserved by `data/voice-comparison/transit-01/baseline-preservation.json`.
The selected default for new drafts is now Achird EN/KO. Existing accepted drafts,
their voice profiles, and manual overrides remain intact.

## Final C revision

**Latest:** [opening/bonus/follow excerpt and Phase 6 handoff](phase5c-bookends.md).
The viewer-facing excerpt labels are removed; earlier versions remain available.

**Current:** the [phrase-caption revision](phase5c-phrase-captions.md) supersedes
the boxed style described below. Its output is `out/phase5c/c-achird-phrase-captions.mp4`.
The earlier boxed MP4 is preserved for comparison.

The original C MP4 was decoded again for inspection. Its English explanation was
present as plain text in the feedback area during frames 480–705 (16.0–23.533 s),
but the old implementation captioned only that segment. It incorrectly treated
the shorter displayed question as equivalent to the spoken wording, and the
ending displayed abbreviated invitation labels. There was no exact question
caption or dedicated Korean speech caption. The prior report overstated coverage.

The revision uses a white, teal-edged speech box in the reserved feedback area,
below all three choices and their romanization. It displays the exact question,
Korean answer and English explanation during their measured `[start, end)` spans,
replacing the written teaching note during speech. The opening already matches
the hook exactly. The ending now displays the full exact comment/follow wording,
switching at the corresponding clip starts and retaining each invitation through
its existing pause/hold. No timing, speech, answer or background asset changed.

`content/voice-comparison/transit-01-c-revised.json` sets `musicGain: 1.25`:
idle 0.3125, countdown 0.175, speech 0.125 (+1.938 dB versus prior settings).
Attack/release/fades and narration source gain 1 are unchanged. Existing final
mixed-track loudness processing remains in place. Set the multiplier to 1 to
restore the old bed setting, or `backgroundAudio: false` to disable it.

Only the revised C excerpt is rendered, to
`out/phase5c/c-achird-captions-music.mp4`; all original comparison MP4s and their
sidecars are preserved. New output sidecars use the new filename. Rendering
validates and reuses the six prepared Achird clips; it makes no provider calls.
`content/voice-profiles/selected-default.json` records the user's voice selection.
New generated drafts use it; explicit validated profiles remain available.
Automated content acceptance and optional manual review are unchanged.

```powershell
Set-Location 'C:\Users\david\Documents\kor-vids'
npm.cmd run typecheck
node --experimental-strip-types --test tests/presentation-polish.test.mjs tests/generation.test.mjs tests/automated-review.test.mjs
npm.cmd run voice:compare -- render --config content/voice-comparison/transit-01-c-revised.json --profile c-achird --output out/phase5c/c-achird-captions-music.mp4
Invoke-Item .\out\phase5c\c-achird-captions-music.mp4
```

The renderer refuses to replace an existing output unless `--overwrite` is added.
This command renders C only. The earlier three-profile instructions below are
historical comparison instructions, not part of the final revision checkpoint.

Final verification: **31.433 s / 943 frames**, 1080 × 1920, 30 FPS, H.264/yuv420p
with AAC. Full audio/video decode passed. Final mix: **−15.96 LUFS, −2.00 dBTP**;
no clipping detected. Typecheck and **45 focused checks** passed. All 29 diagnostic
frames were extracted by exact decoded frame index and visually inspected,
including question/answer/explanation boundaries, countdown and both invitations.
Captions fit without covering choices or romanization; notes are replaced during
speech. The original three MP4s, prepared C manifest, spending ledger and original
transit baseline all retained their checksums. Six cached clips reused, **zero new
provider requests and $0 new synthesis cost**. No listening assessment was made;
measurements do not establish an audible improvement or subjective mix balance.
Evidence: [revision verification](../out/phase5c/c-revision/verification.json).

## Watch the comparable excerpts

| Preview | English voice | Korean voice | Runtime | Successful new requests | Final cache-only rerun hits | Successful synthesis estimate | Final mixed audio |
| --- | --- | --- | ---: | ---: | ---: | ---: | --- |
| [A — current baseline](../out/phase5c/a-baseline.mp4) | en-US-Chirp3-HD-Kore | ko-KR-Chirp3-HD-Kore | 32.30 s | 0 | 6 | $0 | −16.02 LUFS / −2.79 dBTP |
| [B — conversational candidate](../out/phase5c/b-puck.mp4) | en-US-Chirp3-HD-Puck | ko-KR-Chirp3-HD-Puck | 30.20 s | 6 | 6 | $0.00876 | −16.19 LUFS / −2.02 dBTP |
| [C — male locale-pair fallback](../out/phase5c/c-achird.mp4) | en-US-Chirp3-HD-Achird | ko-KR-Chirp3-HD-Achird | 31.433 s | 6 | 6 | $0.00876 | −15.98 LUFS / −2.00 dBTP |

All final profiles use Google Cloud **Chirp 3 HD**, normal pace 1.0,
LINEAR16 / mono 24 kHz prepared WAVs, the same per-clip loudness processing,
and identical final two-pass −16 LUFS / −2 dBTP / LRA 11 settings. The measured
integrated-loudness spread is 0.21 LU. These are measurements, not listening
judgments about energy, accent or naturalness. The locale pairs are separate
English/Korean synthesis selections; a shared persona name does not establish
that the result sounds like one bilingual speaker.

Every excerpt contains the existing opening, complete transit Q3 (buying a ticket),
and the existing comment/follow speech. Exact source text and visuals are shared.
The opening explicitly says “Comparison excerpt · question 3 of 6”; the closing
panel says “Ending demonstration.” A/B/C labels appear only in filenames/reports.
No teaching text, hook, ad-lib or punctuation was changed. The six spoken segments
are in the separate local audition manifests under public/audio/voice-comparison/.

## Voice availability, controls and the permission fallback

Official documentation checked 2026-11-05:

- [Chirp 3 HD voices](https://docs.cloud.google.com/text-to-speech/docs/chirp3-hd):
  Kore is female; Puck and Achird are male. English US and Korean are supported,
  with locale-prefixed voice IDs. This audition uses normal rate only, without
  undocumented emotion/accent controls or punctuation tricks.
- [Gemini Cloud TTS](https://docs.cloud.google.com/text-to-speech/docs/gemini-tts):
  Gemini 2.5 Flash TTS supports English/Korean, Achird, and separate natural-language
  style/accent prompts through the same Cloud TTS client. The installed SDK already
  supports `input.prompt` and `voice.modelName`; dependency versions were preserved.
- [Google pricing](https://cloud.google.com/text-to-speech/pricing): Chirp 3 HD is
  $0.00003/character after eligible free usage; Gemini 2.5 Flash TTS is $0.50/M input
  text tokens and $10/M audio tokens, with 25 audio tokens/second.

C initially requested Gemini Achird with a warm Korean male presenter style and
subtle Korean-accented English, prioritizing intelligibility. The first request
was rejected with **permission code 7**, produced no audio, and was not retried.
The user explicitly chose the Chirp Achird fallback within the existing cap.
The requested Gemini profile is preserved as `c-achird-gemini-requested.json`;
its original plan and failed request reservation remain in the ledger. The scope
change has an explicit old/new plan hash and user instruction in
`data/voice-comparison/transit-01/fallback-amendment.json`.

The active C pairing has **no documented accent/style prompt control**. It is not
claimed to provide Korean-accented English or “brainrot” delivery. No Korean-only
voice was forced to read English. Expressiveness and voice consistency remain
for the user's comparison; no named person is imitated.

## Spending and cache accounting

The scoped authorization is **$2.04**, covering this excerpt only. Initial bounds:
B's 292 characters cost $0.00876, or $0.01752 with one rate-limit retry per clip.
Gemini's API has no request output-token cap; its documented 8,192 input / 16,384
audio-token ceilings reserved $0.167936 per attempt, up to 12 attempts. Combined
maximum was $2.032752. SDK retries remain disabled; only one explicit rate-limit
retry is allowed, and uncertain/terminal outcomes stop preparation.

Actual successful synthesis: **12 Chirp requests / 584 characters / $0.01752
estimated** before eligible free allowance. There was **one rejected Gemini
request**, no returned audio and no token usage accounting. Its full **$0.167936
reservation remains retained**, rather than claiming a zero bill. Thus the
ledger's conservative charged/reserved total is **$0.185456**, below $2.04.
No invoice was inspected. No paid failure tests or additional content-model calls
ran. The original generation/transit spending records remain separate.

A initially reused six clips. B and C each created six new cached clips. The
unchanged final preparation reused **all 18 clips with zero synthesis requests**.
Cache identity includes exact text, language, provider/model, voice, supported
settings/prompt, encoding/sample rate and processing version. Old Kore keys are
unchanged. Rendering reads local manifests/WAVs/music and does not load `.env` or
invoke TTS/LLMs. Only explicitly paid preparation loads local configuration.

## Presentation and mixing

Compact spacing uses the measured bundled-font heading/context heights and fixed
gaps. This calculation is independent of frame/phase; choice rows keep their
positions through reading, countdown and reveal. Existing Hangul, romanization
and heading size floors remain. Explanation space is reserved beneath the rows.
Short/long café and transit prompts passed 12 local still checks; no complete
café render was needed.

Only English explanation speech gets an exact speech caption, active on its
measured `[start, end)` frame span. Hook/question text already on screen is not
duplicated. Korean speech retains the answer highlight. Written Korean teaching
notes appear outside the English-caption interval and are visually secondary;
they are not presented as verbatim English speech. No invented word timestamps,
transcription or alignment service is used.

Comment and follow text start with their corresponding audio. The closing schedule
is measured comment → **45-frame pause** → measured follow → **30-frame hold** →
**12-frame fade**. Countdown remains exactly 150 frames after complete question
speech and at least four seconds of reading. The preview does not show the bonus
question or its answer; only its neutral fixed CTA recordings are reused.

The shared bed is **Subtle Bass by TinyWorlds, CC0 1.0**, downloaded from
[OpenGameArt](https://opengameart.org/content/subtle-bass).
[Rights/source record](audio/subtle-bass-license.md). Attribution is not required;
the suggested courtesy credit is “Subtle Bass by TinyWorlds (CC0), via OpenGameArt.org.”
Source bytes and checksums are retained. Local processing normalizes it to −20
LUFS and crossfades 250 ms of tail/head into a 60.390375-second loop. Frame-driven
gain is 0.25 idle, 0.14 countdown, 0.10 speech, with smooth ducking and one-second
outer fades. The same bed, phase and rules apply to each preview. The final mixed
track receives the same loudness process; speech is never time-stretched.

Set `presentation.backgroundAudio` to false in the comparison configuration to
disable the bed. Changing presentation alone does not synthesize new speech.

## Reproduce in PowerShell

```powershell
Set-Location 'C:\Users\david\Documents\kor-vids'
npm.cmd run typecheck
npm.cmd test
npm.cmd run voice:compare -- estimate
# Cache only; cannot synthesize or spend money:
npm.cmd run voice:compare -- prepare
npm.cmd run voice:compare -- render --overwrite
npm.cmd run voice:inspect
Invoke-Item .\out\phase5c\a-baseline.mp4
Invoke-Item .\out\phase5c\b-puck.mp4
Invoke-Item .\out\phase5c\c-achird.mp4
```

To render one comparison only: `npm.cmd run voice:compare -- render --profile b-puck --overwrite`.
The existing local music can be prepared again with `npm.cmd run music:prepare`.
New uncached speech requires the existing scoped authorization/ledger and explicit
`voice:compare -- prepare --synthesize`; changing the plan cannot reset attempts
or silently expand paid scope. Full-episode synthesis is outside this audition
authorization and will be estimated after the user chooses a voice.

## Verification and remaining viewing items

Media/decode, final audio measurements, deterministic boundaries, hashes, cache
rerun and representative frame paths are in
[verification.json](../out/phase5c/verification.json). The final render checks use
1080 × 1920 / 30 FPS / H.264 / yuv420p / AAC, exact expected frame count and the
existing one-frame-plus-1ms duration tolerance. All three normalized MP4s passed
complete audio/video decoding before promotion.

Typecheck passed. The full regression run passed **123 tests**; the final focused
run passed **12 checks**, including the additional isolated missing/corrupt voice
preflight test. Failure tests use mocks/local fixtures. Captions, CTA boundaries,
stable layout geometry, cache keys, scope amendments, missing/corrupt assets and
budget reservations are covered. The cache-only rerun proved zero new requests.

Actual listening and phone playback are unavailable here. Pronunciation,
expressiveness, accent quality, perceived English/Korean voice consistency,
audible cut-off words and subjective mix balance remain unassessed. Metadata,
complete measured speech spans and clipping checks do not establish those.
The original comparison checkpoint requested a voice selection and full episode.
The user's 2026-11-10 instruction selected Achird and superseded that stopping
point with the single revised C excerpt above. No full episode is required for
this final Phase 5C checkpoint, and Phase 6 has not begun.
