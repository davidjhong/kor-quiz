# Restaurant preview — Phase 6 background extension

[Watch the 15.4-second MP4](../out/restaurant-menu-preview.mp4) ·
[Generated PNG](../public/backgrounds/generated-restaurant-379962e8db662f67.png) ·
[Verification and actual usage](../out/restaurant-menu-preview.verification.json)

One restaurant illustration and one single-question viewing artifact were
produced. No full six-question episode or publishing ran. Existing hotel/transit
MP4 checksums are unchanged. Dependency versions and the lockfile were preserved.

## Background

- Asset ID: `generated-restaurant-379962e8db662f67`.
- Exact saved file: `C:\Users\david\Documents\kor-vids\public\backgrounds\generated-restaurant-379962e8db662f67.png`.
- Actual file: **PNG, 1024 × 1536**, 2,933,905 bytes; checksum
  `a9405bcdcc310ef167f3918ff66282cc308c4b5cc59c61303e3a0933e0b3aa7b`.
- Requested model: **gpt-image-2.6-flare**, medium, one opaque portrait PNG.
  The response does not expose a returned model/snapshot ID; none was invented.
- Real CLI Images API request through the existing official OpenAI SDK. Exactly
  **one image request**, zero retries, no fallback or aesthetic regeneration.
- Developer-selected catalog record in `data/background-assets/catalog.json`.
  Completed production episode IDs: **[]**; this preview consumes no production use.
- [Exact request/prompt](../data/production-jobs/restaurant-preview-01/image/379962e8db662f6788de64dd9b2b63286f0a88c5a39bbe6f35d6246885ceb3ff/request.json)
  and [provider receipt](../data/production-jobs/restaurant-preview-01/image/379962e8db662f6788de64dd9b2b63286f0a88c5a39bbe6f35d6246885ceb3ff/receipt.json)
  remain private, outside `public/`. Only the render-required PNG is served.

The native 2:3 image uses center cover into 9:16, followed by the 1.02 framing
margin and restrained deterministic motion. It is not stretched or described as
native 1080 × 1920. Safe-area instructions use the real panel/caption geometry.
The adult woman's face stays visible below the panel/captions in inspected frames.
The warm painted restaurant, tables and service details have no obvious text,
logos or visual defects in the inspected image. This is a visual assessment,
separate from PNG decoding/checksum checks.

## Actual checks

| Check | Result |
| --- | --- |
| Duration | **15.400 seconds / 462 frames** |
| Video | H.264, 1080 × 1920, 30 FPS, yuv420p |
| Audio | AAC stereo, 48 kHz; **−16.10 LUFS**, **−1.80 dBTP**, 7.10 LU range |
| Complete video/audio decode | PASS before output promotion |
| Reading/countdown | Full four-second minimum reading period; countdown **f120–269**, exactly five seconds |
| Reveal | A first marked at **f270**; Korean speech starts f276, followed by the existing 10-frame gap and complete English speech |
| Captions/layout | PASS: 12 final frames inspected via contact sheet plus full-size question/explanation images; no missing glyphs, clipping, moving choices or obscured facial features observed |
| Isolation | Exactly question/answer/explanation roles; no hook, bonus, CTA, private key or “1/6” indicator |
| Voice/music | Achird EN/KO, normal pace; original music asset and **1.25×** gain, smooth ducking/fades |
| Typechecking | PASS on final code |
| Tests | **178** full regression checks passed; after the final sentence-boundary grouping fix, **58** affected checks passed again |
| Unchanged final resume | PASS: existing MP4 reused, **3 voice cache hits**, **3 alignment cache hits**, **0 provider calls** |
| Phone playback / subjective listening | NOT CHECKED |

Representative frames: [question caption](../out/restaurant-preview/frames/question-caption.png),
[Korean reveal](../out/restaurant-preview/frames/korean-answer.png),
[English explanation](../out/restaurant-preview/frames/explanation-1.png),
[all sampled frames](../out/restaurant-preview/contact-final.jpg).

One article (`The`) had a zero-duration local-alignment interval at 0.1 seconds.
The raw cache is preserved. “The menu, please.” uses the actual positive
menu/please intervals; it does not invent a separate article timestamp or divide
clip duration evenly. Grouping also keeps that clause out of the next sentence.
All exact spoken text remains unchanged. Pronunciation, subjective phrase timing,
voice consistency, music balance and phone readability still need playback review;
automated acceptance is not independent proof of correct Korean.

## Actual requests and estimated costs

| Stage | Requests / usage | Estimated USD |
| --- | --- | ---: |
| Images API — Flare | **1**; 362 text-input / 1,132 image-output tokens | $0.0357700 |
| Content generation | **0** — supplied question | $0 |
| Automated linguistic review — Luna | **1**; 644 input / 230 output tokens, including 165 reasoning tokens; 0 findings/corrections | $0.0001955 |
| Google Achird EN/KO | **3**; 93 input Unicode characters; 0 retries; 0 initial cache hits | $0.0027900 |
| Total | 5 paid-service requests | **$0.0387555** |

The explicit job cap was **$0.53**. The zero-call planning bound was **$0.529035**
(image $0.504655, review $0.0188, TTS including one possible rate-limit retry per
clip $0.00558). Reported OpenAI usage and outgoing Google text underpin estimates;
Google provides no character-usage receipt. Eligible free allowances/credits were
not assumed and no invoice was inspected. Images have no output-token-cap field;
the documented local allowance is a conservative planning reserve, not a provider
billing guarantee. All allocations are settled within the shared job ledger.

Two local image-processing failures recovered from the saved response without
another image call. The later caption-only replacement render reused every asset.
Both unchanged-resume checks made zero provider calls; the final one reused the
finished output. No paid failure tests, other episode renders or image edits ran.

## Working commands (PowerShell)

The job already exists; use these commands now:

```powershell
Set-Location 'C:\Users\david\Documents\kor-vids'
# Dry run: local inspection only, zero provider calls.
npm.cmd run produce -- --resume restaurant-preview-01 --dry-run
# Scoped execution; unchanged completed inputs reuse the output:
npm.cmd run produce -- --resume restaurant-preview-01 --allow-paid --max-cost-usd 0.53
# Plain unchanged resume:
npm.cmd run produce -- --resume restaurant-preview-01
```

The original creation command (do not repeat against the existing ID) was:

```powershell
npm.cmd run produce -- --preview-question content/previews/restaurant-menu.json --output out/restaurant-menu-preview.mp4 --job-id restaurant-preview-01 --dry-run
```

For future **new** scenario jobs, no manually written objectives/questions/brief
are needed. Automatic selection uses a meaningful supported setting and the
current style, reuses a matching catalog/static asset with fewer than five completed
production IDs, or reserves/generates one. The limit can be raised to ten; explicit
matching selection or a new image is available. Binding is persisted before calls,
so resume does not switch assets or increment use. See
[profiles, options, architecture and recovery](phase6-background-generation.md).

Focused files: `scripts/backgroundCatalog.ts` and `backgroundImages.ts` provide
catalog/API/recovery; production planning/budget/CLI integrate selection and shared
spending; `questionPreviewPipeline.ts` / `previewReview.ts` implement the separate
supplied-content excerpt workflow. `QuestionExcerpt.tsx` reuses the existing panel,
question scene, phrase captions and music. Strict public background props bridge
the private catalog to rendering; production's six-question schema remains intact.
Tests cover reuse, limits/overrides, usage exclusion, budgets, corrupt/missing
images, large-response recovery, uncertain outcomes, acceptance hashes and timing.

Evidence: `out/phase6-background-complete-tests.log`,
`out/phase6-background-final-caption-tests.log`,
`out/restaurant-preview-inspection.log`,
`out/restaurant-preview-final-resume.log`, and the sibling verification JSON.

Final MP4 SHA-256: `cdc6367660aa8a6083d623d8802c0a3e828900e3690ad94eac84f2bf7fca8191`.
No unresolved technical blockers remain. Publishing/Phase 7 implementation is not included.
