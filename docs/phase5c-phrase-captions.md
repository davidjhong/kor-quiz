# Phase 5C — phrase captions for C

Current output: `out/phase5c/c-achird-phrase-captions.mp4`. Only this C excerpt
is rendered. Earlier A/B/C videos and the boxed-caption revision remain intact.
Achird EN/KO remains selected. No Phase 6 work or new review gate is added.

The new `phrases` presentation mode removes speech boxes and redundant reveal
notes from the cream panel. Its bottom moves from y=1190 to y=1052, reclaiming
the former caption area. Heading, context, choice rows, Hangul and romanization
retain their positions and size floors. The countdown fits inside the shortened
panel. Captions occupy a fixed x=70–950, y=1068–1200 band above the character's
head, with 60px bold local Noto Sans KR (54px minimum), at most two lines,
white fill, dark outline/shadow, and occasional warm yellow emphasis. Four-frame
scale/fade entrances and three-frame exits come entirely from frame numbers.
There is no rectangle or moving caption position.

## Alignment, not estimated word allocation

Existing prepared manifests contain measured whole-clip durations, with **no
word/phrase timestamps**. The six existing Achird WAVs are locally aligned to
their exact transcripts using **stable-ts 2.19.1 / multilingual Whisper base
20250625 / CPU PyTorch and TorchAudio 2.8.0+cpu**. This uses acoustic cross-attention
and dynamic time warping, not equal divisions of clip duration. There is no new
TTS, free-form transcription, paid service, or content-model request.

Primary references checked before choosing the dependency:

- [Stable-ts known-transcript alignment](https://github.com/jianfch/stable-ts#alignment).
  Its development is paused; the working version is pinned in a separate optional
  Python environment. The Node/Remotion dependency versions and lockfile are unchanged.
- [Whisper's supported languages](https://github.com/openai/whisper/blob/main/whisper/tokenizer.py)
  include `en` and `ko`; both were used successfully here.
- [Official model checksums](https://github.com/openai/whisper/blob/main/whisper/__init__.py).
  The multilingual base checkpoint's SHA-256 is checked before alignment.
  [Whisper license](https://github.com/openai/whisper/blob/main/LICENSE) and
  [stable-ts license](https://github.com/jianfch/stable-ts/blob/main/LICENSE) are MIT.

`content/caption-phrases/transit-c-achird.json` groups the exact existing speech
into 17 phrases of 2–5 words, preserving the Korean answer as one phrase. These
are text boundaries only. Each phrase uses its first and last aligned word times,
rounded upward to composition frames. Silence between sentences is retained.
No word timestamps are created from phrase length or clip duration.

`.audio-cache/caption-alignments/<key>.json` retains raw word times. The identity
includes audio SHA-256, exact transcript, language, model checksum, engine/library
versions and alignment settings. Changing any identity invalidates reuse.
Missing/stale/mismatched results block phrase rendering with a local preparation
command. Rendering only reads prepared JSON/audio; it never starts the aligner,
downloads a model, loads credentials or calls a provider. Source content acceptance
and optional manual review remain unchanged.

Alignment provides model-estimated word boundaries, not manually certified timing.
Checks compare coverage, order, duration bounds and acoustic activity; they do not
establish pronunciation or subjective lip/speech synchronization. Listening and
actual phone readability remain human viewing items.

## Reproduce in PowerShell

Existing environment/cache:

```powershell
Set-Location 'C:\Users\david\Documents\kor-vids'
npm.cmd run typecheck
node --experimental-strip-types --test tests/phrase-captions.test.mjs tests/presentation-polish.test.mjs
npm.cmd run voice:align -- --config content/voice-comparison/transit-01-c-phrases.json --profile c-achird
npm.cmd run voice:compare -- render --config content/voice-comparison/transit-01-c-phrases.json --profile c-achird --output out/phase5c/c-achird-phrase-captions.mp4
```

Add `--overwrite` only to replace this new output. Alignment reruns reuse all six
entries without loading the model. `--force` recomputes local alignment if needed.

For a fresh local setup (free package/checkpoint downloads, no paid API):

```powershell
uv --cache-dir .audio-cache/uv venv .audio-cache/alignment-venv --python python
uv --cache-dir .audio-cache/uv pip install --python .audio-cache/alignment-venv/Scripts/python.exe -r scripts/alignment-requirements.txt
```

The preparation script can download the MIT-licensed 139MiB base checkpoint on
first use; subsequent runs are local. Python 3.13.9 was used for this checkpoint.
The isolated environment/model/cache are ignored. `alignment-report.json` under
`out/phase5c/c-phrases/` retains configuration, raw words and derived phrases.

Music remains **exactly 1.25× the original bed**, including ducking, with the same
fades and narration gain. It is not multiplied by 1.25 again. The same local CC0
[Subtle Bass asset](audio/subtle-bass-license.md) is reused. No new paid requests
or changes to accepted content, timing, voices or background are needed.

## Actual verification

- **One new C MP4:** 31.433 seconds / 943 frames, 1080 × 1920 / 30 FPS,
  H.264 / yuv420p / AAC. Complete audio/video decode passed before promotion.
- **Audio unchanged:** SHA-256 of decoded PCM matches the preceding C revision.
  Final mix remains −15.96 LUFS / −2.00 dBTP; no clipping detected. This confirms
  preservation of the existing mix, not a listening judgment.
- Typecheck and **21 focused tests** passed. Local tests cover acoustic-boundary
  grouping, exact text, cache invalidation, missing/stale data, Korean grouping,
  reveal/bonus guards, bounded animation and two-line band geometry.
- **33 exact-index decoded frames** were visually inspected, covering all 17
  phrases, entrance/exit examples, representative question/explanation, Korean,
  countdown, pre-reveal, comment pause and follow hold/fade. No text clipping,
  choice/romanization overlap, face overlap or early answer captions observed.
  Four design stills also passed font/overflow guards before the MP4 render.
- Six local alignments were created; the unchanged rerun had **6 cache hits /
  0 new alignments**. All original comparison videos, earlier C revision, six
  source WAVs, source manifest, spending ledger, music and background retained
  their checksums. Original full transit baseline preservation also passed.
- **Zero paid API requests / $0 new paid cost.** Actual listening and phone
  playback were not performed. Word times are local model estimates, not
  manually certified phonetic boundaries.

[Verification record](../out/phase5c/c-phrases/verification.json) ·
[Question frame](../out/phase5c/c-phrases/frames/question-representative.png) ·
[Explanation frame](../out/phase5c/c-phrases/frames/explanation-representative.png)
