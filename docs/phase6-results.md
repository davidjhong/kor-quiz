# Phase 6 acceptance run

Completed 2026-11-11 Pacific. One complete production video was rendered; no
additional episodes or voice comparisons were rendered. Publishing remains Phase 7.

[Watch the full transit episode](../out/public-transit-02-production.mp4).
[Detailed verification](../out/public-transit-02-production.verification.json).
[Usage, commands and recovery](phase6-production.md).

| Check | Actual result |
| --- | --- |
| Typecheck | PASS |
| Regression suite | PASS: 154 checks, 0 failures/skips; includes 16 new orchestration tests |
| Full audio/video decode | PASS before output promotion |
| Video | H.264, 1080 × 1920, 30 FPS, yuv420p; 3,603 frames / 120.100 seconds |
| Audio | AAC, stereo, 48 kHz; 120.100 seconds |
| Final mixed audio | −16.02 LUFS integrated, −2.00 dBTP true peak, 13.7 LU loudness range; no measured clipping |
| Timeline/captions | PASS: measured audio, 150-frame countdowns, aligned exact phrases, no narration overlaps or early reveal captions |
| Ending | PASS: actual Achird bonus question; comment → 45-frame pause → follow → 30-frame hold → 12-frame fade |
| Bonus privacy | PASS: strict public question has no answer/index/reveal/explanation; no bonus answer narration/caption/highlight |
| Text fit / visual sampling | PASS: no render-time overflow errors; 47 diagnostic frames inspected across seven sheets and three full-size frames |
| Unchanged resume | PASS: 19 verified clips, 19 alignment hits, 0 new provider calls, verified existing MP4 reused |
| Original accepted source / baseline | PASS: preserved source hash, original video/manifests/clips; old Gemini reservation retained |
| Phone playback / subjective listening | NOT CHECKED |

Initial preparation reused 6 Achird clips and made **13 Google Chirp requests** for
**815 Unicode characters**, with **0 retries**. Estimated synthesis cost is
**$0.02445** before any eligible free allowance, under the separately authorized
**$0.05 total job cap**. The ledger conservatively rounds individual charges to
nano-dollars and records $0.024450002. No provider invoice was inspected. Generation
and review made **0 new requests** because the existing exact-hash automated
acceptance was reusable. Thirteen missing word alignments were computed locally;
all 19 are now cached. Failure tests used mocks/local fixtures, with no paid calls.

Content hash remains
`194914b5a3f37cae33226de035954d6cc6a4bab831c4b5e6eb5b96bc3546fdd0`.
Video SHA-256 is
`38cfcb9d7417ae3c71c00a1341693c7dbad42f31cf3118823f8cda9782e78b11`.
The finished MP4 is 21,758,995 bytes. Both stream durations equal the calculated
120.100 seconds, within the existing one-frame-plus-1-ms tolerance.

## Implementation

- `scripts/produce.ts`, `productionPipeline.ts`, `productionJobs.ts` and
  `productionPlan.ts` provide planning, atomic job state, dependency verification,
  source snapshots, review orchestration and safe resume.
- `productionBudget.ts` links existing generation/review ledgers to one shared
  job envelope. `productionAudio.ts` adds durable TTS receipts/recovery while
  reusing the existing synthesis/cache/processing path. Generation and review
  adapters accept only validated production reservations; old workflows remain.
- `localAlignment.ts` reuses the pinned English/Korean worker and audio-keyed
  alignment cache. `productionCaptions.ts` builds short groups automatically from
  those word timings, with no equal-duration fallback or hand-authored episode
  phrase JSON.
- `src/production.ts`, `ProductionVideo.tsx` and the new `KoreanProduction`
  composition reuse the approved bookends, shared question scene, measured
  timeline, captions, background and configurable 1.25× music. Public bonus data
  excludes the private fields entirely.
- `renderLocalVideo.ts` uses the established encoder/mix/inspection settings,
  destination-local temporary output and verification certificate before atomic
  promotion. A prior good MP4 is retained until a replacement passes.
- `tests/production.test.mjs` covers zero-call dry runs, conditional estimates,
  cached resume, JSON import, invalidation, stale acceptance/corrections, corrupt
  assets, blocked review, budget exhaustion, interrupted promotion, locks and
  bonus isolation. Existing tests and silent-render scripts remain available.

Dependency versions and lockfile were preserved. The current selection is
`en-US-Chirp3-HD-Achird` / `ko-KR-Chirp3-HD-Achird`, normal rate, LINEAR16/24 kHz
prepared audio. Music remains the same TinyWorlds SubtleBass CC0 asset documented
in [its rights record](audio/subtle-bass-license.md), at the previously selected
1.25× gain, applied once.

## Exact commands used

```powershell
Set-Location 'C:\Users\david\Documents\kor-vids'
npm.cmd run typecheck
npm.cmd test

# Initial planning command (job already exists now):
npm.cmd run produce -- --draft drafts/public-transit-02-candidate --output out/public-transit-02-production.mp4 --job-id transit-phase6-01 --dry-run

# Reinspect the existing job without paid work:
npm.cmd run produce -- --resume transit-phase6-01 --dry-run

# Authorized production invocation used for this job:
npm.cmd run produce -- --resume transit-phase6-01 --allow-paid --max-cost-usd 0.05

# Verified unchanged reuse, no rendering or paid requests:
npm.cmd run produce -- --resume transit-phase6-01
```

Evidence: `out/phase6-tests.log`, `out/phase6-dry-run.log`,
`out/phase6-production.log`, `out/phase6-resume.log`, and
`out/phase6/inspection.json`. The job's original dry-run inventory remains in the
saved log; its manifest and private immutable revision live under
`data/production-jobs/transit-phase6-01/`.

The sampled images show readable Hangul/romanization and below-panel captions,
correct Q1–Q5 mappings B/C/A/B/A, stable choices and neutral bonus choices. These
are visual observations, not a listening assessment. Korean correctness is not
guaranteed by the reused automated acceptance. Phone readability, Korean
pronunciation/tone, voice consistency, perceived phrase synchronization, pacing
and subjective narration/music balance remain honest playback checks. No technical
blockers remain.
