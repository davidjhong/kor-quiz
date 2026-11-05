# Korean quiz videos

## Phase 5C comparison checkpoint — choose a voice

Three comparable narrated excerpts use the same transit question, compact spacing,
exact explanation captions and licensed quiet music bed. The original transit
episode and production default remain intact. Full Phase 5C completion awaits
voice selection and one full polished transit render.

- [A — current Kore](out/phase5c/a-baseline.mp4)
- [B — conversational Puck](out/phase5c/b-puck.mp4)
- [C — Achird male English/Korean fallback pair](out/phase5c/c-achird.mp4)
- [Comparison, costs, limitations and exact PowerShell commands](docs/phase5c-voice-comparison.md)

## Current Phase 5B development workflow

Automated linguistic review is now an explicit alternative to manual review.
It records a hash-bound **automated acceptance**, never a human approval. The
transit development episode uses the existing template and Kore voices with a
new, developer-selected local subway illustration. Publishing remains outside
this workflow.

- [Automated mode, bounded review calls, costs and reproduction commands](docs/phase5b-automated-development.md)
- [Transit automated review](drafts/public-transit-02-candidate/review.md)
- [Transit video](out/public-transit-02-automated.mp4)

The sections below describe earlier checkpoints and their original approval
requirements. Manual mode still uses those requirements; automated development
mode uses the separate acceptance path documented above.

## Phase 5B: controlled quality retry and non-café review candidate

The frozen GPT-6 Luna experiment produced three structurally valid drafts on
their first requests, with zero repairs. The conservative ledger estimate is
**$0.007120125** under the separately approved **$0.12** cap. Korean/romanization
and pedagogical review remain necessary. All original API results are preserved.

- [Full side-by-side quality comparison](docs/phase5b-quality-comparison.md)
- [Café review](drafts/cafe-dessert-04/review.md)
- [Store review](drafts/convenience-store-02/review.md)
- [Transit source review](drafts/public-transit-02/review.md)
- [Recommended transit candidate: complete private review](drafts/public-transit-02-candidate/review.md)
- [Frozen configuration, costs and exact commands](docs/phase5b-quality-experiment.md)

The recommended candidate contains separately documented coding-assistant
corrections and a new hash; it is unapproved and has no matching background yet.
No TTS, image generation or production rendering ran. Review content and the
manual background brief before the next production step. Phase 5B remains open.

## Phase 5B: LLM drafts through the existing review workflow

`draft generate` now uses the official OpenAI Responses SDK with Structured
Outputs, explicit paid opt-in, a persistent shared budget, at most two requests
per scenario, raw-output retention and saved-draft reuse. Existing import,
hash-bound human approval, Google ADC audio preparation and local render paths
remain available. All previous dependency versions are retained; only the pinned
OpenAI SDK was added.

The authorized three-scenario smoke test used six requests, estimated **$0.00554075**
under the **$0.15** cap. Café/store drafts failed validation after their allowed
repair; transit passed structurally but has linguistic review flags. All three
remain unapproved. No TTS, image generation or production render ran.

- [Café dessert review](drafts/cafe-dessert-03/review.md)
- [Convenience-store review](drafts/convenience-store-01/review.md)
- [Public-transit review](drafts/public-transit-01/review.md)
- [Actual results, costs and content flags](docs/phase5b-smoke-results.md)
- [Architecture and exact PowerShell commands](docs/phase5b-generation.md)
- [Manual transit-background brief](docs/public-transit-background-brief.md)

```powershell
npm.cmd run draft -- generate --brief content/briefs/public-transit-01.json --id public-transit-01 --out drafts/public-transit-01 --dry-run
npm.cmd run draft -- review --draft drafts/public-transit-01
```

New paid generation requires locally configured `OPENAI_API_KEY` in ignored `.env`
and separately scoped spending approval. The three smoke-test scenarios have
exhausted their request limits. Non-café production also requires a matching
approved local background. Phase 5B is not complete until a human-reviewed,
approved non-café episode succeeds through audio preparation and rendering.

## Earlier Phase 5 checkpoint 1: local draft, validation and human review

The new café episode is **unapproved** and has not entered audio preparation or
rendering. Review [the private review document](drafts/cafe-friends-02/review.md),
[draft JSON](drafts/cafe-friends-02/draft.json),
[separate bonus key](drafts/cafe-friends-02/answer-key.json), and
[validation report](drafts/cafe-friends-02/validation.json).
The revised exact narration and two-part ending are recorded in the
[narration plan](drafts/cafe-friends-02/narration-plan.json) and
[cost estimate](drafts/cafe-friends-02/cost-estimate.json). Spoken prompts are
separate from visible context. The comment and follow clips use a deterministic
1.5-second pause between them, followed by a one-second hold and the existing fade.
This wording revision remains unapproved and has not been synthesized or rendered.

The local workflow is brief + authored JSON → imported draft → deterministic
validation → human review → separate hash-bound approval → existing audio cache →
existing renderer. No generation API is used. Exact commands, architecture,
repetition tracking and future spending requirements are in
[the Phase 5 checkpoint guide](docs/phase5-checkpoint.md).

```powershell
npm.cmd run draft -- import --source content/authored/cafe-friends-02.json --brief content/briefs/cafe-friends-02.json --out drafts/cafe-friends-02
npm.cmd run draft -- validate --draft drafts/cafe-friends-02
npm.cmd run draft -- review --draft drafts/cafe-friends-02
npm.cmd run audio:prepare -- --draft drafts/cafe-friends-02 --output public/audio/cafe-friends-02/manifest.json --estimate
# Explicitly save a review-only estimate, without writing an audio manifest:
npm.cmd run audio:prepare -- --draft drafts/cafe-friends-02 --output public/audio/cafe-friends-02/manifest.json --estimate --report drafts/cafe-friends-02/cost-estimate.json
```

The estimate/dry-run operation makes no paid calls or manifest writes. Actual
preparation and narrated rendering require explicit human approval of the current
hash. New synthesis additionally requires a new scoped spending approval. Any
content, narration, private-key or brief/provenance field change invalidates
approval. Existing demo narration is pinned by hash; silent visual-review tools
remain available. No new dependency versions were introduced.

## Final Phase 4 ending fix

[Updated MP4](out/cafe-six-narrated-ending.mp4) ·
[authoritative narration/timeline data](out/cafe-six-narrated-ending.timeline.json) ·
[verification and inspected ending frames](out/phase4-ending-review/verification.json).
The bonus countdown is now followed by the spoken neutral comment invitation,
with the choices visible through narration plus a one-second pause. Only the new
44-character English segment was synthesized: 17 cache hits, one request,
estimated $0.00132 before any eligible free allowance, within a $0.003 sub-cap of
the previously approved $0.03 episode budget. The updated runtime is
**3302 frames / 110.067 seconds**. The 80–95-second target is advisory; the
65-second minimum and media/timing checks still apply.

## Phase 4: complete narrated café episode

The complete six-question episode uses the approved illustration, layout,
romanization and fixed English/Korean Kore voices. Questions 1–5 reveal their
answers; question 6 ends with the neutral comment invitation. Its answer is saved
in a separate `.answer-key.txt`, never narrated or highlighted. The opening says
**6 questions · Easy to hard**. There is no score interstitial or music.

[Full narrated MP4](out/cafe-six-narrated.mp4) ·
[verification, measurements, timeline and review checklist](docs/phase4-episode.md).

```powershell
Set-Location 'C:\Users\david\Documents\kor-vids'
npm.cmd run typecheck
npm.cmd test

# Unchanged inputs: cache only, no new synthesis or TTS cost.
npm.cmd run audio:prepare -- --input content/cafe-six.json --script content/narration/cafe-six.json --output public/audio/cafe-six/manifest.json
npm.cmd run render:narrated -- --input content/cafe-six.json --audio-manifest public/audio/cafe-six/manifest.json --output out/cafe-six-narrated.mp4 --overwrite
Invoke-Item .\out\cafe-six-narrated.mp4

# Cost estimate only; no requests or manifest writes.
npm.cmd run audio:prepare -- --input content/cafe-six.json --script content/narration/cafe-six.json --output public/audio/cafe-six/manifest.json --estimate

npx.cmd remotion ffprobe -v error -show_entries stream=codec_name,codec_type,width,height,pix_fmt,avg_frame_rate,nb_frames,duration,sample_rate,channels:format=duration,size -of json out/cafe-six-narrated.mp4
```

Audio timing uses measured durations rounded **up** to frames. Every question gets
at least four seconds of reading after the panel settles, its complete question
narration and a half-second pause, then exactly five silent countdown seconds.
Reveals play Korean, a short pause, then English, followed by a reading hold.
The natural full runtime is **3263 frames / 108.767 seconds**: above the 65-second
minimum but outside the 80–95-second target. Speech and holds were not shortened
to force the target, and no empty padding was added.

The separately approved full-episode preparation cap was **$0.03**. It reused four
clips and made 13 new requests for 570 characters, estimated **$0.0171** before
any eligible free allowance. A second preparation reused all 17 clips with zero
requests. Render commands only accept prepared local audio; missing, corrupt or
stale assets fail before rendering. Cache keys include exact text, language,
provider/model, voice, settings, output format/sample rate and processing version.
No additional dependencies or version changes were needed for this expansion.

### Earlier checkpoint: one narrated water-question audition

[Narrated MP4](out/cafe-water-narrated-preview.mp4) ·
[playable clips](out/water-voice-audition/index.html) ·
[voice comparison, sources, costs, timing and listening checks](docs/phase4-voices.md).
This earlier checkpoint narrated one standard question. Its preview and all
silent inputs remain available for comparison; the completed episode is above.

```powershell
Set-Location 'C:\Users\david\Documents\kor-vids'
npm.cmd run typecheck
npm.cmd test

# Reuse the accepted cached clips. This command cannot synthesize or incur TTS cost.
npm.cmd run audio:prepare -- --input content/cafe-narrated-preview.json --script content/narration/water.json --output public/audio/water-preview/manifest.json
npm.cmd run render:narrated -- --input content/cafe-narrated-preview.json --audio-manifest public/audio/water-preview/manifest.json --output out/cafe-water-narrated-preview.mp4 --overwrite
Invoke-Item .\out\cafe-water-narrated-preview.mp4

# Separate metadata report
npx.cmd remotion ffprobe -v error -show_entries stream=codec_name,codec_type,width,height,pix_fmt,avg_frame_rate,nb_frames,duration,sample_rate,channels:format=duration -of json out/cafe-water-narrated-preview.mp4
```

On macOS use `npm`/`npx` rather than `npm.cmd`/`npx.cmd`, omit `Set-Location`, and
use `open out/cafe-water-narrated-preview.mp4`. The TypeScript scripts use Node
path/subprocess APIs and Remotion's bundled media tools on either OS.

### Preparation, credentials and accepted files

The approved provider is Google Cloud **Chirp 3 HD**, using the fixed stock pair
`en-US-Chirp3-HD-Kore` / `ko-KR-Chirp3-HD-Kore`, normal pace 1.0 and LINEAR16
24 kHz WAV. The official client library uses **Application Default Credentials**;
keep `GOOGLE_CLOUD_PROJECT` in the ignored `.env` or environment. No manually
copied access-token variable is needed. For a fresh host, configure your own
billing-enabled project/TTS API and local ADC (`gcloud auth application-default
login`); `.env.example` documents configuration without containing credentials.
Do not put ADC files, tokens, or API keys in public assets or JSON.

The owner approved **at most $0.02 for this four-clip audition**, which used 160
characters: estimated $0.0048 before the eligible free allowance, not actual billed
cost. To prepare uncached speech in that scope, the explicit command is:

```powershell
npm.cmd run audio:prepare -- --input content/cafe-narrated-preview.json --script content/narration/water.json --output public/audio/water-preview/manifest.json --synthesize --max-cost-usd 0.02
```

`--synthesize` is opt-in and requires an explicit budget. Existing accepted clips
are reused even with that flag. SDK retries are disabled; one rate-limit retry is
bounded. Uncertain outcomes are not automatically repeated and leave a pending
marker. `--retry-uncertain` explicitly acknowledges possible duplicate charges;
prior uncertain charges are excluded from a new invocation's usage estimate.
Review them before using that flag. Never clear pending state just to bypass it.

`content/narration/water.json` contains the four ordered texts and voice profile,
separate from quiz content and layout. Use a copy of
`content/narration/water.local.example.json` with `localFile` and `recordingId`
for your approved recordings, then prepare without `--synthesize`. Local paths are
relative to the repository and must stay within it. Mixed local/generated clips
are supported. Romanization is never used for Korean synthesis.

Original audio and per-clip synthesis metadata live in ignored `.audio-cache/`;
accepted processed WAVs live in `public/audio/cache/`. The public manifest records
identities, voice configuration, measured durations, source/final checksums and
peak levels. Preserve the accepted clips and manifest for reproducibility. Cache
keys include exact text, language, provider/model/voice, speech settings, format,
sample rate and processing version (plus recording checksum/ID for local audio).
Styling changes do not regenerate speech; one segment change invalidates that
segment only. Corrupt cache entries fail rather than silently spending on replacements.
Temporary audio is decoded/processed/validated before finalization; saved original
responses can recover interrupted processing without another paid request.

### Timeline, rendering and protection

`src/narrationTiming.ts` converts measured durations with `ceil(seconds × FPS)`.
It centralizes opening/reading/reveal minimums, settle/pause/gap lengths, the exact
five-second countdown, transition and final fade. For this accepted audio the
countdown is **8.767–13.767 s**, Korean **13.967–15.667 s**, English explanation
**16.000–20.200 s**, then reading hold and fade to **21.600 s / 648 frames**.
Container duration is **21.611 s** due to AAC padding, within the existing tolerance.
The renderer reads local audio only; no network or TTS request occurs during it.

`buildNarrationPlan` excludes a comment-bonus answer/explanation before any cache
lookup or synthesis. It validates content IDs/order, prompt/context agreement,
and Hangul answers. Preparation/render CLIs now accept up to six validated
questions. Bonus answer/explanation roles are excluded before preparation and
rejected outright in prepared rendering props. The private answer key remains
separate from narration.

Changed files: `src/narration.ts`, `src/narrationTiming.ts`,
`src/NarratedQuestionPreview.tsx`, the shared scene/timing's optional timeline,
`src/Root.tsx`; `scripts/googleTts.ts`, `scripts/narrationFiles.ts`,
`scripts/prepareAudio.ts`, `scripts/renderNarrated.ts`, `scripts/audioArguments.ts`,
media inspection and subprocess timeout support; new content/script/examples,
tests, `.env.example`, cache ignore rule and this documentation. The requested ADC
client adds pinned `@google-cloud/text-to-speech` **7.2.0**, requiring a lockfile
update; existing direct dependency versions were preserved. The installation's
audit report concerns the existing pinned Remotion/Zod tree, not the added Google
client; no forced dependency upgrades were applied.

Verification: typechecking, the extended Node tests, real cached clip preparation,
the H.264/AAC render, metadata inspection, full decode and representative-frame
inspection passed. Cache-only preparation was rerun with synthesis disabled.
Level measurements and the complete source-linked comparison are in
`docs/phase4-voices.md`. The labeled technical test-tone render is a pipeline test,
not a voice audition. Pronunciation, perceived balance, audible artifacts and
full-speed pacing still require your listening review. Full-episode verification
is documented above. Phase 5 has not started.

## Final Phase 3.5: six-question café comment challenge

The current Studio default is the complete **six-question** episode in
`content/cafe-six.json`, using the approved local illustration and design.
Review [the video](out/cafe-six-comment-challenge.mp4),
[opening screenshot](out/cafe-six-frames/opening.png), and
[bonus ending](out/cafe-six-direct-bonus-frames/bonus-comment.png).
The three-question `content/cafe.json`, original sample/short JSON, and all
one-question comparison inputs remain available and unchanged.

```powershell
Set-Location 'C:\Users\david\Documents\kor-vids'
npm.cmd run typecheck
npm.cmd test
npm.cmd run render:cafe -- --input content/cafe-six.json --output out/cafe-six-comment-challenge.mp4 --overwrite
Invoke-Item .\out\cafe-six-comment-challenge.mp4
Get-Content -Encoding UTF8 .\out\cafe-six-comment-challenge.answer-key.txt

# Additional metadata report (automatic inspection already runs before promotion)
npx.cmd remotion ffprobe -v error -show_entries stream=codec_name,codec_type,width,height,pix_fmt,avg_frame_rate,nb_frames:format=duration -of json out/cafe-six-comment-challenge.mp4

# Standard ending and legacy Hangul-only compatibility
npm.cmd run render:cafe -- --input content/short.json --output out/cafe-standard-hangul.mp4 --overwrite
```

Omit `--overwrite` to refuse existing outputs. Comment-challenge renders also
protect the companion `.answer-key.txt` path. Each output is installed with the
existing protected promotion mechanism after verification. The video and text
are separate files, so their promotion is not a single two-file transaction.
Both full JSON commands (`render` and `render:cafe`) now use the approved episode
and ending policy. Omitted `endingMode` means standard, including the final score
prompt. Single-question preview flags are rejected for comment challenges.
The original comparison compositions remain in Studio and the dedicated sample
scripts; their historical render settings are retained. Existing JSON content
needs no migration, although full-video timing now includes the new opening and
explicit transitions.

### Content and ending policy

Read [all six questions, 18 paired pronunciations, answers and explanations](docs/cafe-six-review.md)
for linguistic review. Difficulty is relative to English-speaking beginners:

| Questions | Difficulty | What changes |
| --- | --- | --- |
| 1–2 | Easy | Recognize the basic water request and price question |
| 3–4 | Medium | Match takeaway and no-ice requests to a specific situation |
| 5–6 | Hard | Distinguish plausible replacement/additional-drink requests by context |

The first five correct answers are **B, A, C, A, B**. The final question is labeled
**HARD · BONUS**, remains unscored, and has no reveal. Its answer remains in source
JSON and the separate [creator answer key](out/cafe-six-comment-challenge.answer-key.txt),
including a suggested comment for manual review/posting. Nothing is published.

`endingMode` supports `standard` and `comment-challenge`; omission means standard
without adding fields to old normalized JSON. Standard reveals every answer and
ends with the self-assessed score prompt. Comment challenge requires at least two
questions, excludes the final question from scoring, and transitions directly from
the penultimate explanation into the bonus without a score interstitial.
During bonus reading, “Final challenge: what would you say?” occupies the reserved
bottom area; the countdown replaces it. The final state holds neutral choices
with “Comment A, B, or C below” and a
small code-rendered speech-bubble icon. No emoji font dependency is needed. The
bonus cannot enter a reveal phase, so no correct fill/border/check, dimmed
distractor, English meaning, or explanation appears at any point.

Minimal schema additions: optional question `difficulty` (`easy`, `medium`, `hard`)
for old-input compatibility, optional `suggestedComment` (220 code points), episode
`openingSubtitle` (60), `endingMode`, and `minimumDurationSeconds` (finite, positive,
up to 600). The six-question sample supplies difficulty and structured translations
for every question. Comment-challenge data must retain the bonus translation and
teaching point. Existing IDs, normalization, duplicate detection, text limits,
choice tuples, pronunciation requirements, and asset validation remain in force.

### Timing and transitions

`EPISODE_TIMING` in `src/quizTimeline.ts` centralizes the 3-second opening,
0.4-second transitions, standard-mode-only 2.5-second score card, 4-second comment hold, and approved
question preset. Opening wording is in JSON; count comes from the questions array.
The opening duration is isolated so a future narration phase can use the greater
of three seconds or measured speech plus a pause; no audio logic is added now.

Every ordinary question keeps **4 seconds reading + 5 countdown + 4 reveal**.
The bonus keeps **4 reading + 5 countdown + 4 comment hold**. There are no extra
reading/explanation extensions. Transitions now have their own frames: six frames
fade out the outgoing text, six fade in the incoming text, then the full reading
period starts. Their text sequences never overlap. A single opaque cream panel
and static background stay mounted throughout, so there is no background flash,
empty full-frame gap, panel movement, or per-question motion reset.

`90 opening + 5 × 390 ordinary + 390 bonus + 6 × 12 transitions`
gives **2502 frames / 83.4 seconds** at 30 FPS. Removing the score interstitial
also removes its extra transition: **87 frames / 2.9 seconds** shorter. Progress
remains `1 / 6` through `6 / 6`. No reading, countdown, explanation, or comment-hold
time was shortened, and no filler was added.

| Scene | Full-content start | Countdown / reveal or comment start | End, exclusive |
| --- | --- | --- | --- |
| Opening | 0 | — | 90 |
| Q1 water | 102 | 222 / 372 | 492 |
| Q2 price | 504 | 624 / 774 | 894 |
| Q3 takeaway | 906 | 1026 / 1176 | 1296 |
| Q4 no ice | 1308 | 1428 / 1578 | 1698 |
| Q5 replacement | 1710 | 1830 / 1980 | 2100 |
| Q6 bonus | 2112 | 2232 / 2382 | 2502 |

The sample requires at least **65 seconds**. The CLI rejects an impossible minimum
before rendering; output inspection checks the actual duration too. Other inputs
may omit the requirement and remain short. This is a duration check only and says
nothing about platform monetization eligibility. Exact-frame/codec checks and the
existing one-frame-plus-1-ms MP4 timestamp tolerance still apply.

### Focused changes

- `content/cafe-six.json`: new default episode; existing JSON files are unchanged.
- `src/quizSchema.ts`, `src/episodePolicy.ts`: compatible optional fields, ending
  rules, total/scored counts, and score prompt.
- `src/questionTiming.ts`, `src/quizTimeline.ts`: permanent bonus-reveal suppression
  and explicit scene/transition schedule, without shortening reading or explanation.
- `src/QuizVideo.tsx`, `src/IllustratedFrame.tsx`, `src/IllustratedQuestionScene.tsx`:
  reuse the approved scene and panel; add data-derived difficulty/hook/score text
  and neutral bonus hold. The teaching-point slot is 84 px to accommodate two
  readable lines in the same reserved panel area. Minimum font sizes stay intact.
- `src/Root.tsx`: six-question Studio default and dynamic episode metadata.
- `scripts/render.ts`, `scripts/mediaInspection.ts`, `scripts/answerKey.ts`: optional
  minimum-duration preflight/inspection and protected plain-text answer-key output.
- `tests/ending-modes.test.mjs`, timing tests, `package.json`: focused schema,
  suppression, score/count, transition, key, and duration tests in the existing
  Node runner. Dependency versions and lockfile are preserved.
- `docs/cafe-six-review.md`, this README: content review and reproduction notes.

The image is reused unchanged from `public/backgrounds/korean-cafe-illustrated-v1.png`.
No generation, download, narration, sound, publishing, scheduling, database, or
content-generation integration is part of this checkpoint.

### Verification completed

Typechecking and all **54 tests** passed. The six-question challenge rendered,
passed the existing automatic inspection, and matched a separate FFprobe report:
**H.264, 1080 × 1920, 30/1 FPS, yuv420p, 2502 frames, 83.400000 seconds**, one video
stream and no audio. The configured 65-second minimum passed. Full FFmpeg decoding
completed without errors. An impossible minimum was tested through the actual CLI
and failed before Remotion or output-directory creation.

For the focused direct-bonus fix, **11 frame pairs** (1080 × 1920 and 360 × 640)
were extracted to `out/cafe-six-direct-bonus-frames/`; `frames.json` records the
exact frames. Inspection confirmed the full fifth explanation at frame 2099,
one transition into the settled bonus at 2112, and the introduction in the reserved
bottom area without crowding the scenario, prompt, or answer rows. The introduction
is replaced by countdown 5 at frame 2232. Countdown 1 at 2381 becomes the comment
invitation at 2382; the neutral choices remain visible through final frame 2501.
No answer translation, explanation, checkmark, correct styling, or dimmed distractor
was visible in the bonus. Panel and background remain continuous. Tests confirm
the score scene and its extra transition are absent, with no leftover timeline gap.
Earlier all-question review frames remain in `out/cafe-six-frames/` as historical
artifacts; their bonus timestamps predate this 2.9-second pacing change.

In the preceding checkpoint, unmodified Hangul-only `content/short.json` rendered in standard mode at
**981 frames / 32.700000 seconds**, with matching encoding metadata and successful
full decoding. Reading, final reveal, and `/2` score frames were inspected.
Its missing pronunciation/background fields remain supported. The generic full
CLI is also regression-tested to use standard episode timing with omitted or
explicit `endingMode: "standard"`.

Illustration SHA-256 remains
`CC00225E1C491E322DDC51E9B055F03E83BBC3643E10008BC44A3F7523A804F0`;
lockfile SHA-256 remains
`FF6BFA2C3A63CA4993B56D5DDFEA941F2DE85E9CDB223CB715B3631672835B36`.
Both files are unchanged. Full-speed physical-phone playback, platform overlays,
and independent linguistic/pronunciation review remain manual checks. Metadata
and frame inspection do not establish every aspect of playback or visual quality.

## Previous Phase 3.5 checkpoint: three-question illustrated café episode

The approved illustrated scene now renders the complete three-question episode:
[full café quiz](out/cafe-illustrated-quiz.mp4). It uses the exact same local image,
palette, panel, typography, choice pronunciations, and B/C/A highlights as the
approved preview. The previous one-question compositions and outputs remain
available for comparison. No dependencies or images were changed.

```powershell
Set-Location 'C:\Users\david\Documents\kor-vids'
npm.cmd run typecheck
npm.cmd test
npm.cmd run render:cafe -- --input content/cafe.json --output out/cafe-illustrated-quiz.mp4 --overwrite
Invoke-Item .\out\cafe-illustrated-quiz.mp4

# Separate metadata report; the render command already performs these checks
npx.cmd remotion ffprobe -v error -show_entries stream=codec_name,codec_type,width,height,pix_fmt,avg_frame_rate,nb_frames:format=duration -of json out/cafe-illustrated-quiz.mp4

# Existing Hangul-only JSON through the same full illustrated pipeline
npm.cmd run render:cafe -- --input content/short.json --output out/cafe-hangul-compatibility.mp4 --overwrite
```

Omit `--overwrite` to protect an existing output. `render:cafe` adds the explicit
`--illustrated` mode to the existing TypeScript CLI; it still validates JSON/assets
before rendering, creates a temporary MP4, verifies it, and promotes it to the
requested path. Generic `render`, both one-question preview commands, and older
sample commands retain their existing behavior. All three illustrated modes
accept the same schema; legacy choice strings and omitted pronunciation remain
supported. In Studio, select `CafeIllustratedQuiz` for this episode.

### Shared architecture and changed files

- `content/cafe.json`: complete episode, title, episode-level illustration ID,
  pronunciations, and consistent structured reveals. Questions retain the
  approved order and choices: water **B**, takeaway **C**, without ice **A**.
  The new takeaway/ice reveals read “To go, please.” / “포장해 주세요 = please pack
  it to go” and “No ice, please.” / “빼 주세요 = please leave it out”. Full
  explanations remain in JSON and agree with those teaching points.
- `src/IllustratedQuestionScene.tsx`: extracted approved layout; receives one
  question, its index/count, pronunciation flag, and optional exit length. No
  question-specific text is coded into it. Text still fits within fixed slots
  and fails clearly below the existing readable minimums rather than clipping.
- `src/IllustratedFrame.tsx`: shared panel, opening/ending, and background.
  The background mounts once at episode level, outside question `Sequence`s.
  Its approved 1.12× crop is static throughout; there is no zoom reset or image
  transition. Opening title comes from `episodeTitle`; the ending uses the actual
  question count and makes no claim about the viewer's score.
- `src/IllustratedQuestionPreview.tsx`: now a small wrapper around the same scene,
  retaining the first-question comparison instead of duplicating its UI.
- `src/QuizVideo.tsx`: the existing variable-count sequencer chooses the approved
  illustrated scene when enabled; the baseline remains available. Each outgoing
  panel fades only during its added transition frames, then unmounts before the
  next question. The ending begins after the final four-second explanation.
- `src/quizTimeline.ts`: the existing calculation accepts a timing preset. The
  illustrated preset reuses approved 4/5/4 question timing and adds a 1-second
  opening, 0.4-second transitions, and 2.5-second ending. The baseline default is
  unchanged. Timing is shared by the composition, sequencer, and CLI inspection.
- `src/Root.tsx`, `scripts/arguments.ts`, `scripts/render.ts`, `package.json`:
  register/select the full composition and add `render:cafe`. Full mode and
  single-question preview flags are mutually exclusive.
- `tests/quiz-timeline.test.mjs`, `tests/romanization.test.mjs`: extend the existing
  runner with variable-count episode timing, full reveal/transition separation,
  mode selection, and episode content/mapping consistency checks.

### Calculated episode timing

`opening + questions × 390 + (questions − 1) × transition + ending` gives
`30 + 3 × 390 + 2 × 12 + 75 = 1299 frames`, or **43.3 seconds at 30 FPS**.
Nothing is stretched to reach a target runtime. The two-question compatibility
input calculates **897 frames / 29.9 seconds**, with an ending denominator of `/2`.

| Section | Frames, inclusive | Time |
| --- | --- | --- |
| Opening title | 0–29 | 0–1 s |
| Question 1, water | 30–419 | 1–14 s |
| Panel transition | 420–431 | 14–14.4 s |
| Question 2, takeaway | 432–821 | 14.4–27.4 s |
| Panel transition | 822–833 | 27.4–27.8 s |
| Question 3, without ice | 834–1223 | 27.8–40.8 s |
| Ending | 1224–1298 | 40.8–43.3 s |

Each question uses local reading frames 0–119, countdown 120–269, and reveal
270–389, including the existing 12-frame highlight/explanation fade. The opening
adds only one second before question one. Countdown starts at episode frames
150/552/954; reveals start at **300/702/1104**. Panel placement and answer spacing
are fixed. Outgoing explanation panels cannot overlap the next question or ending.

### Verification completed

Typechecking and all **45 tests** passed. The full episode rendered and passed the
existing automatic inspection at **1299 frames / 43.300000 seconds**. A separate
FFprobe report confirmed **H.264, 1080 × 1920, 30/1 FPS, yuv420p**, one video stream
and no audio. Duration matches the calculated timeline exactly; the existing
acceptance tolerance remains one frame plus 1 ms. The MP4 fully decoded with
FFmpeg without errors.

Saved **28 representative frames** at full resolution and 360 × 640 in
`out/cafe-episode-frames/`; `frames.json` records their exact episode frames.
Inspection covered every question's reading/countdown, immediately before/at
each reveal, settled explanations, both transitions, the final explanation, and
the ending. Questions appeared once in the requested order with progress 1/3,
2/3, 3/3 and correct B/C/A border/check/mint highlights. Pronunciation lines and
the longer prompt/choices/teaching points fit without visible clipping. The
character and static background remained continuous. Transition-end and next-start
frames showed no outgoing explanation; frame 1223 still had the final reveal,
while the ending occupied frames 1224–1298 with `/3` and no claimed score.

The unmodified legacy `content/short.json` also rendered through this composition
and passed automatic/separate inspection at **897 frames / 29.900000 seconds**,
with the same encoding parameters and no audio. Full decoding succeeded. Its
reading frame has no empty pronunciation line; the ending correctly displays `/2`.

The approved illustration SHA-256 remains
`CC00225E1C491E322DDC51E9B055F03E83BBC3643E10008BC44A3F7523A804F0`.
The lockfile SHA-256 remains
`FF6BFA2C3A63CA4993B56D5DDFEA941F2DE85E9CDB223CB715B3631672835B36`.
Neither file was modified for this checkpoint. Palette, geometry, and question
timing files also remain unchanged; the shared scene was extracted from the
approved preview rather than recreated.

Physical-phone playback, platform overlay placement, and independent linguistic
review remain human checks. Romanization follows the established convention and
is a pronunciation aid; validation and metadata cannot prove linguistic or visual
correctness. No narration, sound effects, generation, or publishing is included.

## Previous Phase 3.5 revision: approved one-question preview

`CafeIllustratedPreview` is the current design-review checkpoint. It renders **only
the first question** from `content/cafe-illustrated-preview.json`, with data-derived
progress `1 / 3`. The other two questions retain paired pronunciation data but are
not rendered here. The full-episode design is still the Phase 3 baseline.

Review [the MP4](out/cafe-illustrated-preview.mp4), [reading frame](out/cafe-illustrated-frames/reading.png),
and [settled reveal](out/cafe-illustrated-frames/explanation.png). The photographic
[previous preview](out/cafe-polish-preview.mp4) and its source/JSON remain available.

```powershell
Set-Location 'C:\Users\david\Documents\kor-vids'
npm.cmd run typecheck
npm.cmd test
npm.cmd run render:illustrated-preview -- --input content/cafe-illustrated-preview.json --output out/cafe-illustrated-preview.mp4 --overwrite
Invoke-Item .\out\cafe-illustrated-preview.mp4

# Compatibility check: original JSON, no pronunciation or background required
npm.cmd run render:illustrated-preview -- --input content/sample.json --output out/cafe-illustrated-hangul.mp4 --overwrite

# Reproduce the preserved photographic comparison
npm.cmd run render:preview -- --input content/cafe-preview.json --output out/cafe-polish-preview.mp4 --overwrite
```

Omit `--overwrite` to refuse replacing an existing file. `npm.cmd` preserves CLI
argument forwarding in this machine's PowerShell setup. Both preview commands
use the existing validated input, temporary-MP4, FFprobe, and final-file promotion
pipeline. No dependency versions or lockfile were changed by this revision.

### Content, presentation, and timing

- `content/cafe-illustrated-preview.json` holds the scenario, prompt, optional
  `context`, choices, explicit pronunciation, B mapping, reveal copy, and local
  background ID. `showRomanization` is an episode-level boolean.
- `src/quizSchema.ts` accepts legacy choice strings or paired objects such as
  `{"hangul":"물 주세요.","romanization":"mul juseyo."}`. Types are inferred
  from Zod. Both fields use NFKC normalization, trimming, nonempty and single-line
  checks. Duplicate choices compare normalized Hangul even across formats.
  Reordering a choice preserves its associated pronunciation; the author must
  also update `correctAnswerIndex` when reordering answers.
- With `showRomanization: true`, every choice in every question must supply
  nonblank pronunciation; missing values identify the question and field before
  Remotion starts. False/omitted leaves no pronunciation line or placeholder.
  New limits: romanization **72 Unicode code points** (room for transliterated
  phrases while bounding layout), optional context **80**. Existing limits remain.
  Text fitting still fails clearly if a valid string cannot fit its visual slot.
- `src/IllustratedQuestionPreview.tsx` renders the new design;
  `src/illustratedTheme.ts` centralizes palette, fixed panel geometry, slots, and
  background framing. Panel: **880 × 1010**, left **70**, top **180**, inner inset
  **48**, corner radius **28**. It remains stable after its short entrance.
  Hangul is 52 px and romanization 31 px (about 60%) for the reviewed sample.
  No translation appears in choices before reveal. Countdown and explanation
  share the reserved bottom slot; B gets a mint fill, teal border/check, navy text.
- The local illustration is selected through `src/assets/backgrounds.ts` and
  validated by the existing `scripts/assets.ts` before rendering. Asset:
  `public/backgrounds/korean-cafe-illustrated-v1.png`.
  [Exact image prompts and provenance](docs/cafe-illustrated-background.md).
  There is no dark overlay, runtime generation/fetch, or ongoing background motion.
- `src/questionTiming.ts` remains unchanged: **4 seconds reading + 5 countdown +
  4 reveal = 390 frames / 13 seconds**. Countdown starts at frame **120**, B's
  border/check appears at **270**, mint/explanation fade settles at **282**.
  All animation comes from frame numbers. No timers or speech animation.
- `src/Root.tsx`, `scripts/arguments.ts`, `scripts/render.ts`, and `package.json`
  register/select the new preview via `--illustrated-preview` and the new npm
  shortcut. `--preview` still selects the photographic comparison. The two modes
  are mutually exclusive; full JSON rendering still uses the dynamic timeline.
- `src/QuestionScene.tsx` / `src/QuizVideo.tsx` understand paired choices and the
  pronunciation flag while preserving the legacy Hangul-only presentation.
  `src/PolishedQuestionPreview.tsx` reads Hangul from either choice format.
- `tests/romanization.test.mjs` adds compatibility, paired content, required-field,
  duplication, length, mode selection, and actual early-failing CLI tests to the
  existing Node test runner; no styling-value tests or framework were added.

### Pronunciation review

These explicit spellings follow the [National Institute of Korean Language's
Revised Romanization rules](https://www.korean.go.kr/front_eng/roman/roman_01.do),
including `eo`, `eu`, `yeo`, `ss`, and `pp`, and `l` before a consonant or at a word
end. Word spacing follows the written Korean. Romanization is a beginner aid,
not an exact phonetic transcription; schema validation cannot prove accuracy.
In particular, `masilgeyo` follows the convention that morpheme-boundary
tensification is not reflected, rather than writing a pronunciation-style `kk`.
Independent Korean/pronunciation review remains required.

| Question / choice | Hangul | Stored Revised Romanization |
| --- | --- | --- |
| Water A | 물 있어요. | mul isseoyo. |
| Water B (correct) | 물 주세요. | mul juseyo. |
| Water C | 물 마셔요. | mul masyeoyo. |
| Takeaway A | 여기서 마실게요. | yeogiseo masilgeyo. |
| Takeaway B | 다 마셨어요. | da masyeosseoyo. |
| Takeaway C (correct) | 포장해 주세요. | pojanghae juseyo. |
| Ice A (correct) | 얼음 빼 주세요. | eoreum ppae juseyo. |
| Ice B | 얼음 더 주세요. | eoreum deo juseyo. |
| Ice C | 얼음 넣어 주세요. | eoreum neoeo juseyo. |

Text contrast computed from the actual theme pairs: navy/cream **13.67:1**,
navy/white **14.55:1**, navy/mint **12.51:1**; pronunciation text/white **6.05:1**,
pronunciation text/mint **5.20:1**, subdued text/subdued row **5.50:1**.
Coral/cream is only **2.99:1**, so coral is a decorative countdown bar, never small
text; the countdown number is navy. These calculations complement frame inspection.

This checkpoint stops for design review. Full-speed phone playback, platform
overlays, aesthetic preference, and independent linguistic approval remain human
checks. Metadata alone does not prove visual correctness. No narration or Phase 4
features have been added.

Verification completed for this revision: typechecking and all **41 tests** passed.
The illustrated preview and the original Hangul-only `content/sample.json` each
rendered as a one-question **390-frame / 13.000000-second** silent MP4. Automatic
inspection and a separate FFprobe report confirmed **H.264, 1080 × 1920, 30/1 FPS,
yuv420p**, exactly 390 frames, and no audio stream. Both fully decoded with FFmpeg
without errors. MP4 frames at 60, 165, 269, 270, 300, and 389 were extracted for
review. Reading/countdown/reveal inspection showed intact Hangul, aligned and
readable pronunciation, no visible clipping, a stable panel, B's boundary
border/check followed by mint fill, and a visible worker face below the panel.
No generated lettering or obvious character defects were visible in the inspected
crop. The Hangul-only frame contains no pronunciation placeholder.
Reading and reveal were additionally inspected at **360 × 640**;
Hangul remained dominant and pronunciation stayed aligned without wrapping or
clipping. Physical-phone playback remains a manual check. CLI tests
confirmed missing pronunciation fails before Remotion starts or an output folder
is created. Lockfile SHA-256 remains
`FF6BFA2C3A63CA4993B56D5DDFEA941F2DE85E9CDB223CB715B3631672835B36`.

## Previous Phase 3.5: photographic one-question comparison

This is a visual-review checkpoint. `CafePolishPreview` renders only the first question from `content/cafe-preview.json`, while showing progress calculated from its three-question data (`1 / 3`). The full `KoreanQuiz` composition and the previous `QuestionScene` remain the baseline; the redesign has not been applied to the complete video. Compare the existing `out/cafe-question.mp4` or `out/sample.mp4` with the new preview.

```powershell
npm run typecheck
npm test
npm.cmd run render:preview -- --input content/cafe-preview.json --output out/cafe-polish-preview.mp4
Invoke-Item .\out\cafe-polish-preview.mp4
```

For an intentional repeat render, append `--overwrite`. `render:preview` is the existing validated render/inspect workflow with an explicit `--preview` flag selecting the new composition. It retains temporary output, metadata checks, and overwrite protection. No dependencies were added or upgraded, and the lockfile is unchanged from the start of Phase 3.5.

### Focused additions

- `src/PolishedQuestionPreview.tsx`: the experimental question layout, opaque stacked cards, green B reveal, large translation, short teaching point, countdown number/bar, local background, and subtle frame-driven image zoom. Slogans, `YES!`, redundant answer labels, and instructional filler are absent from this preview.
- `src/FittedText.tsx`: an optional balanced-heading wrap mode, enabled only for the preview prompt; the baseline retains its default wrapping. The countdown number and bar appear together when the reading period finishes.
- `src/previewDesign.ts`: layout/crop/motion settings. Essential-content margin assumptions are top **140 px**, left **88 px**, right **180 px**, bottom **300 px**. These are adjustable design choices, not universal platform guarantees. The lower area is reserved primarily for scenery.
- `src/questionTiming.ts`: a reusable timeline factory and a preview preset: **4 seconds reading, 5 countdown, 4 reveal**. The baseline retains **3/5/5**. Both happen to total 390 frames at 30 FPS.
- `src/assets/backgrounds.ts`: approved local asset IDs and their public-relative files. `scripts/assets.ts` checks the resolved file is nonempty, regular, and inside the public directory. `scripts/input.ts` runs this before creating render artifacts or starting Remotion.
- `src/quizSchema.ts`: optional `backgroundAssetId`, `episodeTitle` (80 code points), and per-question `reveal: {translation, teachingPoint}` (80/100 code points). All use the existing normalization and nonempty checks. The original `explanation` remains required and is used by the preview when structured reveal is absent. Existing JSON inputs remain valid.
- `content/cafe-preview.json`: the original three choices and B mapping for the water question, with a conversational prompt and explicit polite café-staff context. Translation and teaching point live in this JSON, not in the component. Only its first question is rendered.
- `src/Root.tsx`, `scripts/arguments.ts`, `scripts/render.ts`, `package.json`: register/select the preview without changing the default full-video composition. `tests/assets-preview.test.mjs` adds focused compatibility, asset, timing, and CLI checks.

### Local background

`korean-cafe-v1` maps to `public/backgrounds/korean-cafe-v1.png`. It was created once using the built-in imagegen tool and copied into the repository. [Exact generation prompt and provenance](docs/cafe-background.md) are saved with the project. No placeholder or fallback image is used for this preview. Image generation, external image fetching, paid integration installation, and credential access do not occur during rendering.

JSON accepts only an asset ID from the manifest; filesystem paths, remote URLs, and unknown IDs are rejected. Missing or empty referenced files fail before rendering. Omitting `backgroundAssetId` remains supported; the preview then uses its plain template background. The baseline full-video template does not consume the experimental background design until visual review is complete.

The same image is used throughout the preview, with scale changing deterministically from 1.000 to 1.012. A strong coded dark gradient protects text contrast while leaving the lower café scene visible. Card surfaces stay nearly opaque. Existing `FittedText` handles measured wrapping after local fonts load; the preview uses larger minimum sizes and fails with a field name if text cannot fit. It does not truncate or shrink indefinitely.

### Review and verification

Expected output: **1080 × 1920, 30 FPS, H.264, yuv420p, 390 frames, 13 seconds**, silent. The CLI runs the existing FFprobe inspection automatically.

| State | Frame | Time |
| --- | --- | --- |
| Reading | 60 | 2 seconds |
| Countdown | 165 | 5.5 seconds; digit 4 |
| Last before reveal | 269 | 8.9667 seconds; digit 1 |
| First reveal | 270 | 9 seconds; B turns green |
| Settled explanation | 300 | 10 seconds |

In Studio (`npm run dev`), select `CafePolishPreview`. Assess Hangul, line breaks, contrast, background crop, subtle motion, and the balance between content and scenery. Confirm the water request remains **B: 물 주세요.** and the reveal reads “Water, please.” / “주세요 = please give me.” The shorter gloss is an instructional cue in the polite request context, not a claim that it covers every use of 주세요.

Verification completed: typechecking and all **34 tests** passed. The final preview rendered, passed the existing FFprobe checks at **390 frames / 13 seconds**, and decoded fully with FFmpeg without errors. MP4 frames were inspected visually during reading, countdown, immediately before/at reveal, after the explanation settled, and at the end. Hangul, balanced heading wraps, card contrast, the B highlight, and lower-scene crop were readable without visible clipping. The 1.2% zoom was checked at separated frames; full-speed motion/pacing and design preference remain for human visual review. The lockfile SHA-256 is unchanged from the start of this checkpoint.

Saved review frames: [reading](out/cafe-polish-frames/reading.png), [countdown](out/cafe-polish-frames/countdown.png), [last before reveal](out/cafe-polish-frames/before-reveal.png), [first reveal](out/cafe-polish-frames/reveal-start.png), and [settled explanation](out/cafe-polish-frames/explanation.png).

Stop at this one-question preview for visual review before extending the design to the full episode. No narration, opening/score scenes, LLM generation, publishing, scheduling, databases, or agents were added.

## Phase 3: reusable rendering engine

Edit a JSON input to produce a different silent quiz without editing presentation code. `content/sample.json` contains the original three cafe questions; `content/short.json` contains two of those questions in a different starting order. They produce 39-second and 26-second videos respectively. Reusing questions here is a rendering demonstration, not a proposal to publish duplicate content.

### Run in PowerShell

```powershell
npm ci
npm run typecheck
npm test
npm.cmd run render -- --input content/sample.json --output out/sample.mp4
npm.cmd run render -- --input content/short.json --output out/short.mp4
Invoke-Item .\out\sample.mp4
```

The public command is `npm run render -- --input content/sample.json --output out/sample.mp4`. Use `npm.cmd` in Windows PowerShell: the installed `npm.ps1` launcher drops the `--` separator on this machine and npm then consumes the flags. `npm.cmd` forwards them correctly. No application or global shell configuration changes are needed. Paths with spaces must be quoted.

Output directories are created automatically. Existing outputs are refused unless explicitly authorized:

```powershell
npm.cmd run render -- --input content/sample.json --output out/sample.mp4 --overwrite
```

No narration or audio stream is required. Rendering retains H.264, 1080 × 1920, 30 FPS, `yuv420p`, BT.709, CRF 18, and concurrency 2. Local font assets are bundled; initial dependency/browser installation requires internet, while rendering does not use external content services.

### Architecture and files

| Files | Responsibility |
| --- | --- |
| `content/sample.json`, `content/short.json` | Content only: `videoId` and a `questions` array |
| `src/quizSchema.ts` | Zod schema, normalization, duplicate detection, limits, contextual errors, inferred content types |
| `src/QuizQuestion.ts` | Compatibility type re-export; no duplicate type definition |
| `src/content/cafeQuestions.ts` | Loads validated sample defaults for Studio and the old one-question composition |
| `src/questionTiming.ts`, `src/quizTimeline.ts` | Existing scene timing plus calculated starts and total quiz duration |
| `src/QuizVideo.tsx`, `src/Root.tsx` | Sequence the reusable scene; `calculateMetadata` validates props and sets dynamic duration |
| `src/QuestionScene.tsx`, `src/FittedText.tsx` | Approved visual palette/layout, frame-driven animations, bounded font fitting |
| `scripts/arguments.ts`, `scripts/input.ts` | Strict flag parsing and bounded JSON loading/validation |
| `scripts/render.ts`, `scripts/remotionCommand.ts` | Render workflow and shell-free subprocess invocation of Remotion's public CLI |
| `scripts/mediaInspection.ts`, `scripts/output.ts` | FFprobe checks and safe installation of the verified output |
| `tests/*.test.mjs` | Built-in Node tests for content, timing, CLI failures, overwrite protection, and metadata |

Zod **4.5.4** is now a direct runtime dependency and `@types/node` **26.6.5** is a direct development dependency for the Node CLI. Both were already installed transitively at those exact versions. No existing package versions were upgraded; the lockfile records the new direct declarations. No render API packages or test framework were added. Node APIs used by the CLI work on the existing Node 22.13.1 installation; Node's TypeScript stripping remains experimental there, as in Phase 2.

### Validation and limits

Each question requires `id`, `scenario`, `prompt`, exactly three `choices`, `correctAnswerIndex` (`0`, `1`, or `2`), and `explanation`. The schema is the sole source of TypeScript content types. Extra properties are rejected to catch typos. All text is normalized with Unicode NFKC and trimmed before checking lengths, nonemptiness, duplicate choices, and duplicate question IDs. Control characters and manual line breaks are rejected so the template controls wrapping.

| Field | Maximum Unicode code points after normalization |
| --- | --- |
| Video/question ID | 64 |
| Scenario | 40 |
| Prompt | 100 |
| Each choice | 24 |
| Explanation | 180 |

Inputs allow **1–6 questions**, bounding render work and keeping videos at **13–78 seconds** with current timing. JSON files are capped at **64 KiB**. These are template-specific verbosity limits, not language rules. Scenario/prompt/choice/explanation slots shrink from their existing font sizes only when needed, stopping at 24/40/32/26 px respectively. The renderer waits for the bundled font before measuring, and fails with the question ID and field if content still cannot fit; it never silently clips overflowing text. Character counts alone cannot guarantee that every possible string will fit.

Validation runs before creating render artifacts or starting a Remotion subprocess. Errors identify the affected question and field, for example:

```text
Question 2 (id "cafe-takeaway") — questions[1].correctAnswerIndex: Expected an integer correctAnswerIndex of 0, 1, or 2
```

These checks do **not** establish Korean correctness, naturalness, educational value, or lack of contextual ambiguity. Those remain human-review responsibilities. Duplicate detection is within one input; persistent cross-video duplicate tracking is outside Phase 3.

### Timeline and output verification

The existing scene remains **3 seconds reading + 5 seconds countdown + 5 seconds reveal = 390 frames**. Every question gets a scene-local frame number through Remotion `Sequence`. Start frames are `0, 390, 780, ...`; total duration comes from the question count. The existing entrance animation is inside each reading period. Phase 2 had no standalone opening, ending, or transition clips, so those contributions are explicitly **zero** in `QUIZ_SECTION_FRAMES`; question changes are cuts followed by the existing entrance. Dedicated hook/outro scenes would require a later presentation change.

The CLI writes normalized props and a temporary MP4 in a unique directory inside the requested output folder. After rendering it rejects missing, empty, or non-file outputs, then uses the bundled FFprobe to require H.264, 1080 × 1920, 30 FPS, `yuv420p`, and the exact calculated frame count. Container duration must agree within **one frame plus 1 ms (about 0.034333 seconds)** to allow MP4 timebase/decimal rounding. Failed renders or inspections exit nonzero, remove temporary files, and leave any existing output intact.

Only verified files are installed at the final path. Without `--overwrite`, a hard link followed by removal of the temporary name prevents races with another process creating the destination; NTFS supports this. A filesystem without hard-link support fails safely. With `--overwrite`, a same-filesystem rename replaces the old file after verification. Close video players if Windows reports a sharing violation. Abrupt termination/power loss can leave a `.quiz-render-*` directory; ordinary errors clean it up.

Expected metadata:

| Input | Questions | Frames | Duration |
| --- | --- | --- | --- |
| `content/sample.json` | 3 | 1170 | 39 seconds |
| `content/short.json` | 2 | 780 | 26 seconds |

The CLI checks metadata automatically. For a manual report:

```powershell
npx.cmd remotion ffprobe -v error -select_streams v:0 -show_entries stream=codec_name,width,height,pix_fmt,avg_frame_rate,nb_frames:format=duration -of json out/sample.mp4
```

Metadata does not prove visual correctness or successful decoding of every frame. In Studio (`npm run dev`), select `KoreanQuiz` for the three-question default and inspect local frames 239/240 around the answer reveal, global frames 389/390 around the first question cut, and 779/780 around the next cut. Correct answers in `sample.json` are B, C, A; in `short.json` they are C, A. Play the MP4 to check full-motion pacing, Hangul, wrapping, and readability on a phone.

### Script changes

- `render` now invokes the TypeScript JSON CLI; `render:sample` preserves the original Phase 1 render command exactly.
- `render:question`, `inspect:question`, `inspect`, `dev`, `build`, and `browser:ensure` remain available.
- `test` runs all five test files using the existing Node runner; no new test framework is needed.
- Typechecking now includes `scripts`, supports explicit `.ts` imports for Node execution, and permits importing JSON Studio defaults.

The earlier checkpoint notes below are retained as historical references; use the Phase 3 commands above for JSON-driven rendering.

Phase 3 verification completed on the existing Windows/Node installation: typechecking and all **26 tests** passed. Both JSON inputs rendered and passed the automatic FFprobe checks at **1170 frames / 39 seconds** and **780 frames / 26 seconds**. Full FFmpeg decoding of both outputs completed without errors. Extracted MP4 frames showed intact Hangul, readable explanations, no visible clipping, the correct B/C/A highlights, and reset reading/countdown state at question cuts. Invalid-index and malformed-JSON CLI tests exited 1 before rendering or creating output directories; overwrite protection and final-file promotion tests passed. Temporary render directories were cleaned. Full-speed mobile playback/pacing and independent linguistic approval remain manual checks. Metadata alone does not prove visual quality.

## Phase 2 reference: typed content and one reusable scene

`CafeQuestion` renders **only the first question**, using the new `QuestionScene` component. The original `KoreanSample` composition, source, output path, and commands remain available for comparison. Dependencies, lockfile, and encoding settings are unchanged.

### Separation of responsibilities

- `src/QuizQuestion.ts`: compile-time content contract. A readonly tuple requires exactly three choices; `0 | 1 | 2` restricts the correct-answer index. IDs are stable identifiers, independent of array position. This type does not validate runtime JSON or prove linguistic accuracy.
- `src/content/cafeQuestions.ts`: three hardcoded questions with no rendering logic. These are drafts pending human linguistic review.
- `src/questionTiming.ts`: 30 FPS, reading/countdown/reveal durations, animation durations, derived frame boundaries, and a pure function calculating scene state.
- `src/QuestionScene.tsx`: presentation only. Receives `question` as props, reads the Remotion frame, and displays the question, choices, countdown, and explanation. It uses the existing local fonts and visual palette.
- `src/Root.tsx`: registers both compositions and supplies the first question to `CafeQuestion`. The new composition gets its frame count and FPS from the timing module.
- `tests/question-timing.test.mjs`: tests phase boundaries, one-second countdown digits, ring progress, and scene duration using Node's built-in test runner.
- `package.json`: adds `test`, `render:question`, and `inspect:question`; all original commands remain intact.

No timers, randomness, network requests, or content generation occur in the scene. Reuse the component with different typed content by passing a different `question` prop. Arbitrary long-content fitting and runtime validation are later checkpoints; this checkpoint checks the first question's layout visually.

### Questions for linguistic review

| ID / scenario | English prompt | A | B | C | Correct |
| --- | --- | --- | --- | --- | --- |
| `cafe-request-water` / At a cafe counter | Ask the barista to give you water. | 물 있어요. | 물 주세요. | 물 마셔요. | B |
| `cafe-takeaway` / Choosing takeaway | You want your drink to go. What do you say? | 여기서 마실게요. | 다 마셨어요. | 포장해 주세요. | C |
| `cafe-without-ice` / Customizing your drink | Order your drink without ice. What do you say? | 얼음 빼 주세요. | 얼음 더 주세요. | 얼음 넣어 주세요. | A |

The stored explanations are:

1. 물 주세요 means “Water, please.” 주세요 politely asks someone to give you something.
2. 포장해 주세요 asks for takeaway. 여기서 마실게요 means you will drink it here.
3. 얼음 빼 주세요 asks to leave out the ice. 빼 주세요 asks for something to be removed or omitted.

The prompts specify the desired action; the distractors express different actions rather than competing levels of politeness. Other natural phrasings can exist outside these choices. Review the Korean wording and explanations before treating the content as approved. Questions two and three are stored but are not rendered in this checkpoint.

### Run this checkpoint in PowerShell

```powershell
Set-Location 'C:\Users\david\Documents\kor-vids'
npm run typecheck
npm test
npm run render:question
npm run inspect:question
Invoke-Item .\out\cafe-question.mp4
```

No installation or lockfile update is required. Tests use Node 22's `--experimental-strip-types` flag to import the pure TypeScript timing module; an experimental-feature warning is expected on Node 22.13.1. Node may also report that it detected ES module syntax in that file. Neither warning is a test failure. Type stripping executes the module but does not typecheck it, so run `typecheck` as well.

The render command retains H.264, `yuv420p`, BT.709, CRF 18, concurrency 2, and 1080 × 1920 at 30 FPS. Expected FFprobe output: **390 frames**, **13.000000 seconds**, `h264`, `yuv420p`, `1080` / `1920`, and `30/1`.

| Period | Frames (inclusive) | Behavior |
| --- | --- | --- |
| Reading | 0–89 | All three choices appear; timer displays `?` |
| Countdown | 90–239 | 5, 4, 3, 2, 1; each lasts 30 frames |
| Reveal / explanation | 240–389 | B turns green; A and C dim; explanation fades in over 12 frames |

`durationInFrames` is calculated from the sum of reading, countdown, and reveal durations; it is not separately hardcoded in the composition. Animation fade durations are also centralized. In Studio (`npm run dev`), select `CafeQuestion` and compare **frame 239** (countdown `1`, no highlighted choice), **frame 240** (B highlighted, explanation starts fading), and **frame 252** (explanation fully visible). Check Hangul, line wrapping, and the final frame 389. Play the full MP4 to assess readability and pacing on your phone.

For the original sample, use `npm run render:sample`, `npm run inspect`, and `out/korean-sample.mp4`.

Checkpoint verification completed: typechecking and all five timing tests passed; the new composition rendered successfully; FFprobe reported the expected codec, pixel format, dimensions, FPS, 390 frames, and 13-second duration. A full FFmpeg decode completed without errors. Frames extracted from the MP4 during reading, before/at reveal, after the explanation fade, and at the end showed legible Hangul, no visible clipping, and B highlighted at reveal. The original sample source and lockfile are unchanged. Human linguistic review and full playback for mobile readability/pacing remain outstanding.

## Phase 1 reference

A single, silent, 12-second video rendered locally: 1080 × 1920, 30 FPS, H.264 MP4 with the broadly supported `yuv420p` pixel format. It asks how to request water at a cafe, counts down, and highlights **물 주세요.** (“Water, please.”).

This checkpoint establishes the renderer. The three-question template, JSON/Zod validation, narration, AI services, and publishing belong to later phases.

## How rendering works

React describes the text, cards, and SVG countdown ring. Remotion supplies a frame number to the component. At 30 FPS, frame 60 is two seconds into the video. The component calculates its appearance from that frame number, so frames can be rendered independently and in parallel without timers or animation state.

The CLI bundles the TypeScript/React source, opens its managed headless Chrome browser, captures the frames, and encodes them using its bundled media tools. The result is an ordinary MP4; no running web server is needed to play it. The renderer makes no content-generation or external font requests. Initial package and browser installation require internet access.

Direct FFmpeg rendering is excellent for encoding, trimming, and combining media. For this project's animated bilingual cards, React/CSS makes layout and iteration easier than a growing FFmpeg filter graph. Use Remotion for visuals and FFmpeg/FFprobe for media processing and inspection.

## Tools and dependencies

The initial machine has Windows x64, Node **22.13.1**, npm **11.1.0**, and Git **2.47.1**. No standalone FFmpeg or FFprobe was found on PATH. Node 22 meets Remotion's documented minimum of Node 16; this project sets Node 22 as its own minimum.

- `react` and `react-dom`: describe and render the visual layout.
- `remotion`: composition metadata and frame-based animation helpers.
- `@remotion/cli`: preview Studio, bundle, render, and bundled FFmpeg/FFprobe commands. Its version matches `remotion` exactly.
- `typescript`, `@types/react`, `@types/react-dom`: static checks while developing; they do not appear as video content. TypeScript 5 is sufficient for this small project.
- `@fontsource/noto-sans-kr`: local Korean and Latin font files in regular and bold weights. Font assets are bundled rather than fetched from Google during rendering. The font package includes its license.

Direct dependency versions are pinned in `package.json`; `package-lock.json` pins the resolved dependency tree. Keep both files in source control. Use `npm ci` to recreate that tree.

## Files

```text
src/index.ts          Registers the React root with Remotion
src/Root.tsx          Defines the composition ID, size, FPS, and frame count
src/KoreanSample.tsx  Hardcoded sample visuals and frame-based timing
package.json         Dependencies and simple npm commands
package-lock.json    Exact dependency resolution
tsconfig.json        Strict TypeScript settings
.gitignore           Excludes packages, build files, video outputs, and secrets
```

No custom render service or CLI is needed yet. The two-renderer concurrency limit keeps this first render's resource use modest. The render command explicitly selects BT.709 (the HD video color space) and limited-range `yuv420p`, rather than depending on Remotion's color defaults.

## Run locally in PowerShell

The project files are already created. From a fresh checkout, install the locked dependencies and the browser once:

```powershell
Set-Location 'C:\Users\david\Documents\kor-vids'
npm ci
npm run browser:ensure
```

Build and render:

```powershell
npm run build
npm run render:sample
npm run inspect
```

`build` checks types and produces a browser bundle in `build/`. `render:sample` bundles the source itself and writes `out/korean-sample.mp4`; you do not need to run `build` every time you render. A failed command returns a nonzero exit code: fix it before moving to the next command.

To preview and scrub the timeline interactively:

```powershell
npm run dev
```

Open the local URL printed by Remotion, then select `KoreanSample`. Stop the preview server with Ctrl+C. It is not required for command-line rendering.

## Verify the milestone

`npm run inspect` calls the bundled FFprobe. Expect:

| Property | Expected value |
| --- | --- |
| codec_name | h264 |
| width / height | 1080 / 1920 |
| pix_fmt | yuv420p |
| avg_frame_rate | 30/1 |
| nb_frames | 360 |
| duration | 12.000000 seconds |

There is intentionally no audio track in this phase. AAC will be relevant when audio is introduced.

Open the MP4 in your normal video player:

```powershell
Invoke-Item .\out\korean-sample.mp4
```

Check the complete playback:

- **0–2 s:** question and both Korean choices are readable; the timer displays `?`.
- **2–7 s:** the ring empties and the digits display 5, 4, 3, 2, 1, each for one second.
- **7–12 s:** answer A turns green and the English meaning and short explanation fade in. Answer B dims.
- Hangul appears as complete characters, with no missing-glyph boxes, clipped text, or overflow.

For exact boundary inspection in Studio: frame 60 starts `5`; 90 starts `4`; 120 starts `3`; 150 starts `2`; 180 starts `1`; 209 is the final countdown frame; 210 highlights A and begins the explanation fade; 222 finishes the fade. The final frame is 359.

FFprobe confirms media metadata, not readability. Playing the video and checking representative frames completes this milestone's visual verification.

## Common failures

- **PowerShell blocks `npm.ps1`:** use `npm.cmd` in place of `npm` (and `npx.cmd` in place of `npx`) without changing the machine's execution policy.
- **Browser download fails:** run `npm run browser:ensure` again after checking network/proxy access. Remotion stores its managed browser under `node_modules/.remotion`; no global Chrome installation is required.
- **Font or dependency files missing:** stop Studio, run `npm ci`, then retry. Do not replace Korean text with transliteration to mask a font issue.
- **Render process runs out of memory:** for the original sample try `npm.cmd run render:sample -- --concurrency=1`. The JSON CLI keeps concurrency fixed at 2. Full-HD portrait rendering is heavier than previewing a webpage.
- **Output file is locked:** close the video player before rerendering the same filename.
- **Source text looks garbled in an editor or terminal:** save source files as UTF-8. For PowerShell inspection use `Get-Content -Encoding UTF8`.

This section documents the original Phase 1 sample for comparison.

## Official references

- [Remotion setup and system requirements](https://www.remotion.dev/docs/)
- [Render CLI](https://www.remotion.dev/docs/cli/render)
- [Managed Chrome installation](https://www.remotion.dev/docs/miscellaneous/chrome-headless-shell)
- [Font loading](https://www.remotion.dev/docs/fonts)
- [Bundled FFprobe](https://www.remotion.dev/docs/cli/ffprobe)
- [Noto Sans KR at Fontsource](https://fontsource.org/fonts/noto-sans-kr)
- [Dynamic composition metadata](https://www.remotion.dev/docs/calculate-metadata)
- [Sequence and scene-local frames](https://www.remotion.dev/docs/sequence)
- [Render delay for font measurement](https://www.remotion.dev/docs/use-delay-render)
- [Zod schemas and refinements](https://zod.dev/api)
- [Node 22 subprocess APIs](https://nodejs.org/download/release/v22.13.1/docs/api/child_process.html)
