# Phase 4: complete narrated café episode

Final ending fix: [current MP4](../out/cafe-six-narrated-ending.mp4), **3302 frames /
110.067 seconds**, with the neutral spoken CTA after the bonus countdown. The
earlier 108.767-second version below is retained for comparison. The owner accepts
that runtime and treats 80–95 seconds as advisory, not a hard failure. Ending
verification and audio measurements are in
[this report](../out/phase4-ending-review/verification.json).

Checkpoint date: 2026-11-04. [MP4](../out/cafe-six-narrated.mp4) and
[separate creator-only bonus answer key](../out/cafe-six-narrated.answer-key.txt).
No publishing, music, new artwork or Phase 5 work was added.

## Results and evidence

| Check | Result | Evidence |
| --- | --- | --- |
| TypeScript | PASS | `npm.cmd run typecheck` |
| Existing runner plus focused narration tests | PASS | `npm.cmd test`: 66 passed, 0 failed; local fixtures/mocks, no paid failure cases |
| Full render and complete video/audio decode | PASS | Render CLI inspected temporary MP4, decoded it with FFmpeg `-xerror`, then promoted it |
| Media format | PASS | 1080 × 1920, 30/1 FPS, H.264, yuv420p, 3263 frames; AAC 48 kHz stereo; [FFprobe JSON](../out/cafe-six-narrated-review/ffprobe.json) |
| Minimum duration | PASS | 108.766667-second video exceeds the configured 65-second minimum |
| 80–95-second target | ADVISORY, ACCEPTED | Original natural duration is 108.767 seconds. The ending fix adds 1.3 seconds. No speech speedup, removed listening time or empty padding |
| Container timestamp tolerance | PASS | Container/audio 108.779 seconds; 12.33 ms beyond video, within one frame + 1 ms (34.33 ms) |
| Cached rerun | PASS | Second preparation: 17 cache hits, 0 synthesis requests, $0 estimated new cost; [usage record](../out/cafe-six-narrated-review/usage.json) |
| Cache invalidation and damaged/missing assets | PASS | Keys cover every synthesis input; tests change one segment, detect stale identities/content, corrupt WAV/checksum, absent files, wrong durations and missing manifest before render |
| Bonus isolation | PASS | Source narration has only its question segment. Preparation filters forbidden roles; rendering rejects manifests that still contain them. Bonus visual state can never become reveal, even beyond its planned hold |
| Silent workflow | PASS | `render:illustrated-preview` regression rendered 390 frames / 13 seconds with the original silent inspector; [MP4](../out/cafe-six-narrated-review/silent-regression.mp4) |
| Frame inspection | PASS for sampled frames | 41 frames covering the opening, each question/countdown, five reveals/holds, inter-question transitions and bonus ending; [frame index](../out/cafe-six-narrated-review/frame-index.json) |
| Pronunciation, tone, audible artifacts, perceived balance, phone readability | NOT CHECKED | Requires owner listening and actual phone review; frame and metadata checks cannot certify these |

## Audio preparation, cost and cache

The original approval was audition-only. The owner separately approved this
episode up to **$0.03** before new synthesis began. The prepared script has 17
segments: four accepted preview cache hits and 13 new requests, **570 new Unicode
characters**. At Google's documented Chirp 3 HD price of
[$0.00003/character](https://cloud.google.com/text-to-speech/pricing), the estimate
is **$0.0171 before any eligible free allowance**. No invoice was read, so actual
billed cost is not asserted. No retries were needed for this preparation.

The second preparation deliberately omitted `--synthesize`: **17 cache hits,
zero requests**. Rendering also made zero synthesis requests: it loads and validates
the prepared manifest and local WAVs, and has no synthesis call in its render path.
It does not load `.env`; credentials are not needed by rendering.

Unchanged voices and settings: Google Cloud Chirp 3 HD,
`en-US-Chirp3-HD-Kore` / `ko-KR-Chirp3-HD-Kore`, pace 1.0, LINEAR16 at 24 kHz.
ADC and `GOOGLE_CLOUD_PROJECT` are used only during approved preparation.
No credentials or tokens are printed, embedded in public files, or committed.

The canonical key includes exact text, language, provider, model, locale-specific
voice, speaking rate, output encoding, sample rate and processing version; local
recordings also include their checksum and recording ID. Changing one narration
segment changes only that segment's key. A manifest fingerprint binds it to quiz
content, and pre-render validation checks identities, file containment, checksums,
full decodability, measured duration and PCM peak headroom. Corrupt cache entries
fail with repair guidance instead of silently incurring replacement charges.

SDK retries remain disabled. One bounded rate-limit retry is permitted; each
attempt is counted and checked against the explicit cap before the SDK call.
Uncertain outcomes are never blindly retried. Saved original audio can recover
interrupted processing without paying for another request.

## Measured timing

All clip durations are measured after processing and rounded up with
`ceil(seconds × 30)`. The opening lasts at least three seconds and extends for its
hook plus pause. Reading begins after the incoming panel settles; every question
gets at least four seconds and complete prompt/context narration plus 0.5 seconds.
Countdowns are exactly 150 frames, with no narration. A reveal highlights the
answer, then plays Korean after six frames, a ten-frame language gap, and English.
The explanation remains for at least one second after its narration finishes.
Twelve-frame transitions are added after completed holds; they consume no reading
or listening time. The same background and panel remain mounted throughout.

| Question | Full panel start | Countdown | Reveal / comment starts | Full hold ends |
| --- | ---: | ---: | ---: | ---: |
| 1, easy water | 3.400 | 8.767–13.767 | 13.767 | 21.200 |
| 2, easy price | 21.600 | 26.667–31.667 | 31.667 | 38.100 |
| 3, medium takeaway | 38.500 | 44.533–49.533 | 49.533 | 56.600 |
| 4, medium no ice | 57.000 | 62.200–67.200 | 67.200 | 74.567 |
| 5, hard replacement | 74.967 | 81.000–86.000 | 86.000 | 92.167 |
| 6, hard comment bonus | 92.567 | 99.367–104.367 | 104.367 | 108.367 |

The last 0.4 seconds fade the bonus panel text. There is no score interstitial.
The bonus never has an answer/explanation audio segment, reveal caption or answer
highlight. Its countdown is followed by the existing comment invitation and
speech-bubble artwork. The answer key is a separate creator file.

No scheduled audio overlaps another clip, any countdown, or a question boundary.
Every reserved audio span is at least its measured sample duration. These checks
prevent schedule truncation; they do not prove the source pronunciation has no
audible cut-off words.

## Audio measurements and visual review

[Measurements](../out/cafe-six-narrated-review/audio-measurements.json) use FFmpeg
loudnorm metering on accepted WAVs and the decoded AAC program. Each language was
also measured as a concatenation of its accepted clips, without inserted timeline
silences. English is **−16.34 LUFS**, Korean **−17.15 LUFS**, a **0.81 LU**
difference, below the explicit 3 LU substantial-difference flag. Individual clips
range **−17.52 to −14.96 LUFS** (2.56 LU). The encoded program measures
**−16.36 LUFS**, **−4.46 dBTP**, LRA **6.1 LU**. Accepted clip true peaks are
at most **−1.49 dBTP**. There are no measured over-zero peaks; these numbers do not
prove the absence of audible artifacts or equal perceived loudness.

Silence detection at −45 dB for intervals of at least one second found 12 spans.
They align with the opening, deliberate countdowns, explanation holds and scene
transitions. No detected long silence lies wholly within a scheduled speech clip.
The longest, 10.187 seconds at the end, covers the bonus's trailing speech silence,
reading pause, five-second countdown, four-second comment hold and final fade.
That silence is intentional rather than an empty interstitial.

Inspected all 41 extracted frames in three diagnostic contact sheets:
[1](../out/cafe-six-narrated-review/contact-1.png),
[2](../out/cafe-six-narrated-review/contact-2.png),
[3](../out/cafe-six-narrated-review/contact-3.png). Also inspected full-size Q3–Q5
reveals and the bonus comment frame to check the longer Hangul, romanizations and
teaching points. No clipping/overflow was observed in these frames; the renderer's
existing text-fit guard also completed without an overflow error. Progress runs
1 / 6 through 6 / 6; Q1–Q5 highlight B, A, C, A, B respectively. Reading/countdown
frames have no English answer translations. Bonus rows stay neutral, with no
answer/explanation caption, through the final comment hold. Sampled transitions
show only the outgoing or incoming text, without overlapping explanations.

The opening reads **6 questions · Easy to hard**. The café character remains visible
and the background is visually continuous. The approved PNG's SHA-256 remains
`CC00225E1C491E322DDC51E9B055F03E83BBC3643E10008BC44A3F7523A804F0`.
These are still-frame checks, not an actual phone playback or subjective listening
assessment. The bundled FFmpeg omits `select`/`tile`; the diagnostic helper uses
accurate timestamp seeking and Pillow contact sheets without changing video/artwork.

Human review checklist:

- Watch the MP4 on a phone: Hangul/romanization size, contrast and platform UI clearance.
- Listen for natural Korean pronunciation, politeness and any cut-off words/artifacts.
- Compare English/Korean voice consistency and perceived volume.
- Watch at normal speed: reading time, reveal order, transition holds and bonus pacing.

## Focused changes and reproduction

- `content/narration/cafe-six.json`: reviewed spoken text and unchanged voice profile;
  existing `content/cafe-six.json` retains the six questions and answer mappings.
- `src/narration.ts`, `src/narrationTiming.ts`: variable-count manifests, strict
  bonus isolation and measured per-question schedules. Single-question compatibility remains.
- `src/NarratedQuestionPreview.tsx`, `src/Root.tsx`: reuse approved scenes for the
  complete narrated composition, actual progress counts and episode opening subtitle.
- Preparation/cache/Google-client scripts: request/cache reporting, per-attempt budget
  checks and stronger pre-render identity/missing-file guidance.
- Render/media inspection scripts: full timeline/minimum check, separate answer key,
  AAC bounds, complete decode and verified temporary-file promotion.
- `tests/narration.test.mjs` and README: focused tests and updated commands.
  No dependency changes, replacement project, new visual assets or silent-input edits.

```powershell
Set-Location 'C:\Users\david\Documents\kor-vids'
npm.cmd run typecheck
npm.cmd test
npm.cmd run audio:prepare -- --input content/cafe-six.json --script content/narration/cafe-six.json --output public/audio/cafe-six/manifest.json
npm.cmd run render:narrated -- --input content/cafe-six.json --audio-manifest public/audio/cafe-six/manifest.json --output out/cafe-six-narrated.mp4 --overwrite
npx.cmd remotion ffprobe -v error -show_entries stream=codec_name,codec_type,width,height,pix_fmt,avg_frame_rate,nb_frames,duration,sample_rate,channels:format=duration,size -of json out/cafe-six-narrated.mp4
Invoke-Item .\out\cafe-six-narrated.mp4
```

These reproduction commands have no synthesis flag. If content changes, estimate
uncached usage with `audio:prepare ... --estimate` and obtain a new scoped approval
before using `--synthesize --max-cost-usd`. Do not assume an unused previous cap
authorizes unrelated future content. Stop here for human review; Phase 5 is not begun.
