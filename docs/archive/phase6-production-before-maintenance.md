> Archived maintenance snapshot. For current commands use the [primary usage guide](../../README.md). Historical authorizations apply only to their recorded jobs.

# Phase 6 — local production

`produce` orchestrates the existing draft/import, structural checks, hash-bound
automated review, cached Google narration, local English/Korean alignment,
Remotion rendering and media inspection. Automated review is the default; it is
not independent proof of Korean correctness. Publishing remains Phase 7.

The [automatic-background extension](../phase6-background-generation.md) now adds
Images API generation and a private reusable asset catalog to new scenario/brief
jobs. It supersedes the earlier manual-artwork limitation below. Image spending
shares the same total job envelope; existing hotel/transit approvals do not grant
image spending for another job. The supplied single-question restaurant preview
uses a separate excerpt contract, preserving production's six-question validation.

The [first acceptance run](../phase6-results.md) is complete:
[120.1-second transit MP4](../../out/public-transit-02-production.mp4), all 19 clips
and alignments cached, and unchanged resume verified with zero provider calls.

The first plain-language scenario episode is also complete:
[115.4-second hotel MP4](../../out/hotel-01.mp4) ·
[hotel results, usage and background provenance](../hotel-01-results.md).
The existing `hotel-01` was resumed, with its original source record preserved.
Use `--resume hotel-01` for that completed job; use a new job ID/output when
starting another scenario.

## Start with a scenario

You do not need to write a brief, objectives, questions or narration. The simplest
offline planning command is:

```powershell
npm.cmd run produce -- --scenario "Beginner Korean at a hotel" --output out/hotel-01.mp4 --job-id hotel-01 --dry-run
```

This exact dry run has been run locally. It creates `hotel-01` with **zero provider
calls**, uses the selected Achird EN/KO voices/presentation, adult English-speaking
beginner audience and six-question progression. Its structured seed is saved in
`data/production-jobs/hotel-01/brief.json` and the original scenario/defaults in
`job.json` plus a hash-named `sources/` record. To inspect the same job again:

```powershell
npm.cmd run produce -- --resume hotel-01 --dry-run
```

Scenario-specific context and six learning objectives are derived **inside the
existing quiz-generation response**, together with the questions and narration;
there is no additional LLM planning call. They are not invented in a dry run.
The extended Structured Outputs contract is separate from the existing brief and
frozen-experiment contracts. Code controls voices, assets, IDs and fixed CTAs.
Generated context/objectives must validate, and are saved in the generated
`draft.json`, `brief.json`, per-attempt brief/candidate artifacts and immutable job
revisions. The final brief also replaces the seed at the job's `brief.json`.
Changed content invalidates acceptance through the existing hash checks.

Once a matching background exists and a **new job's total paid cap is explicitly
authorized**, one command can generate, review, prepare audio and render. For a
new café job, the example below proposes a **$0.23 total cap**, covering the
current $0.22522 conditional ceiling. It is not covered by an earlier approval;
run it only when you authorize that new job and amount:

```powershell
# A café has a matching registered local illustration already.
npm.cmd run produce -- --scenario "Beginner Korean at a café" --output out/cafe-new.mp4 --job-id cafe-new --allow-paid --max-cost-usd 0.23

# Authorized hotel production invocation (completed; unchanged runs reuse output):
npm.cmd run produce -- --resume hotel-01 --allow-paid --max-cost-usd 0.23
```

The initial hotel plan reported conditional conservative bounds of **$0.03760 for
generation** (at most two requests), **$0.05640 for review** (at most three), and
**$0.13122 for TTS** (schema text ceiling, at most 38 requests including bounded
retries): **$0.22522 total**. This is a planning ceiling, not an exact TTS quote,
spending approval or bill. Exact narration/cache inventory is recomputed after
generation and any correction. All paid stages share the existing total job
envelope. A dry run alone authorizes/performs no hotel synthesis or generation.
The hotel job received its own explicit $0.23 total authorization on 2026-11-11;
the earlier transit $0.05 approval does not apply to it.

### Backgrounds: current capability and remaining integration

The CLI selects only real registered matching assets. Unambiguous café scenarios
use `korean-cafe-illustrated-v1`; public-transit scenarios use
`korean-transit-illustrated-dev-v1`. Hotels now use `korean-hotel-illustrated-v1`,
created with the built-in tool and registered as developer-selected
([actual provenance and dimensions](../hotel-background-provenance.json)).
Convenience stores currently have no registered matching illustration. Unknown or mixed settings are reported
as unresolved; there is no café/transit fallback for a hotel.

The original hotel dry run reported a background blocker; registration resolved
it on resume without replacing the original source record or recreating the job.
For missing artwork the same check stops paid generation/TTS before requests.
Supply a local matching PNG and register
its path, `hotel` scenario type, provenance, selection status and checksum in
`src/assets/backgrounds.ts`; no questions/narration JSON is needed. For a new
setting, also add its recognized type and classifier in `scripts/scenarioBrief.ts`.
Resume re-resolves the registry, retains the original seed record and records a
new source identity when the asset binding changes. No human approval is fabricated;
automated mode permits developer-selected assets, as before.

The hotel illustration used the earlier **assistant-operated built-in tool**.
The subsequent automatic-background extension implements a direct Images API
adapter through the existing official SDK, with explicit model/quality profiles,
shared-budget reservations, durable private receipts, PNG decode/checksum checks,
and catalog selection before render readiness. See the linked extension guide for
the exact image scope, planning assumptions, supported settings and new commands.
No assistant-only image bridge is required by the CLI, and no publishing was added.

Verified 2026-11-11: typechecking and **160 regression checks passed**, followed
by **50 final focused checks** after the unresolved-setting resume adjustment.
At the earlier scenario-extension checkpoint, hotel and café dry runs made **zero provider calls**.
The café plan found its illustration; hotel planning initially retained a missing-background
blocker, since resolved by the later asset registration. An existing transit dry run still found all
19 clips/alignments and set `render.wouldRun: false`, with zero cost/calls.
No new content, TTS, images or MP4s were generated at that earlier extension checkpoint.
Mocked calls test the new single-response brief path, not live linguistic quality.
Evidence: `out/phase6-scenario-full-tests.log`, `out/phase6-scenario-final-tests.log`,
`out/scenario-hotel-dry-run.log`, `out/scenario-hotel-resume.log`,
`out/scenario-cafe-dry-run.log`, and `out/phase6-scenario-transit-regression.log`.
The SDK schema path follows the
[official Structured Outputs guide](https://developers.openai.com/api/docs/guides/structured-outputs?api-mode=responses).

## PowerShell commands

```powershell
Set-Location 'C:\Users\david\Documents\kor-vids'
npm.cmd run typecheck
npm.cmd test

# Inspect the current acceptance, registered assets and decoded caches. No providers,
# generation, synthesis, alignment or rendering; no credentials required.
npm.cmd run produce -- --draft drafts/public-transit-02-candidate --output out/public-transit-02-production.mp4 --job-id transit-phase6-01 --dry-run

# Once that job exists, inspect it again with this command:
npm.cmd run produce -- --resume transit-phase6-01 --dry-run

# The user approved this specific job's $0.05 cap; this was its production command:
npm.cmd run produce -- --resume transit-phase6-01 --allow-paid --max-cost-usd 0.05

# Resume safely, including returning an unchanged verified existing MP4:
npm.cmd run produce -- --resume transit-phase6-01
```

The first command creates a job; repeating a source command with the same job ID
refuses to replace it. Use `--resume`. The output path and authorized total cap
are immutable for that job. A different destination or cap needs a separate job
and, for paid work, separate authorization. A new ID does not grant spending.

Exactly one `--scenario <plain-language-text>`, `--draft <directory-or-json>` or `--brief <json>` is required for a
new job, together with `--output`. A draft directory contains the existing
`draft.json` and private `answer-key.json`; an import JSON contains `brief`,
`quiz`, `narration` and `bonusAnswerKey`. A brief uses the existing bounded
generation adapter. `--brief` remains available for advanced audience/level,
registered-background, context and six-objective control. Dry-run TTS costs for ungenerated content are conditional
schema ceilings, never an exact price for nonexistent narration.

Optional overrides are `--voice <profile-json>`, `--presentation <settings-json>`,
`--no-music`, `--review-mode manual`, `--model <verified-model>` and
`--max-output-tokens <2048–16000>` for generation. Review keeps its existing
12,000-token limit. Voice JSON accepts a profile or the selected-default wrapper;
presentation accepts settings or a `presentation` wrapper. For music without a
disable override, use a new job; `--no-music` persists on resume. Manual mode keeps
the existing exact-hash human approval and approved-background checks. Automated
mode accepts registered developer-selected backgrounds and does not add a human
review stop. Silent rendering commands remain unchanged.

## Assets, timing and privacy

Selected defaults are Achird EN/KO, normal speech, compact panels, romanization,
animated aligned phrases below the panel, display hook/follow scenes, continuous
restrained background motion and the same CC0 music at **1.25×**, applied once.
The full production requires all 19 clips, including the actual Achird bonus
question; the comparison excerpt's silent-bonus exception is unavailable.

All boundaries use measured audio rounded up to whole 30 FPS frames. Countdown
starts after speech and minimum reading time. The ending is measured comment →
45 silent frames → measured follow → 30-frame hold → 12-frame fade. No speech
acceleration or empty padding is applied. The accepted approximately two-minute
pace has no old 80–95-second upper target.

Phrase groups use punctuation, language and fit limits over locally aligned
words. They preserve exact transcript substrings and acoustic boundaries.
Alignment is keyed by WAV checksum, transcript, language and pinned configuration;
grouping changes reuse audio/alignment. Failed alignment stops with a segment ID;
there is no evenly distributed timing or paid transcription fallback.

The optional alignment environment is documented in
[`alignment-requirements.txt`](../../scripts/alignment-requirements.txt) and uses the
existing cached multilingual Whisper base model. Install it locally before an
uncached run. Rendering itself only consumes prepared local assets and an empty
environment file; it makes no LLM/TTS calls.

The sixth public question has **no** correct-answer index, reveal, explanation or
private key. Strict props and caption checks reject bonus-answer roles and early
reveal captions. The timing adapter's legacy dummy index is internal only and is
never serialized into public props. Job revisions and review records are private
local artifacts; do not publish the private job directory or answer keys.

## Persistence and paid safety

`data/production-jobs/<id>/job.json` is an atomically written, versioned manifest
with source/revision identity, exact narration, configurations, asset checksums,
stage input/output hashes, failures and budget references. Immutable snapshots
and corrected working copies remain separate from the original accepted source.
Content changes invalidate acceptance; bounded review may make one correction
and one verification, then stops if blocking findings remain.

One shared envelope in `data/generation-budgets/produce-<id>.json` reserves funds
before generation, review and missing TTS. Existing provider ledgers remain as
children of that envelope; their reservations cannot collectively exceed the job
cap. SDK retries remain disabled. TTS permits only the existing one bounded
rate-limit retry per clip. Usage and costs are estimates, not inspected invoices.
Earlier café/audition permissions and the unresolved Gemini reservation are not
production authorization and are never released by this command.

Official pricing checked 2026-11-10:
[Google Chirp pricing](https://cloud.google.com/text-to-speech/pricing) is $30 per
million characters before eligible free allowance. The verified
[Luna profile](https://developers.openai.com/api/docs/models/gpt-6-luna) reserves
short-context input conservatively at $0.125/M and output at $0.50/M. Pricing must
be rechecked after 2026-11-17 before new paid work. Valid local cache/output reuse
does not require credentials or a new paid request.

## Failures and recovery

- **Locked job:** do not run two processes against it. After verifying the recorded
  PID has exited, use `--resume <id> --recover-lock`. Active/unverifiable PIDs are
  refused; the old lock is archived. A leftover `lock-recovery.guard` requires
  checking that no acquisition/recovery process remains before removing that
  guard manually. Never delete a live job/provider lock.
- **Unknown paid outcome:** reservations remain held. A saved provider response is
  recovered locally. Missing responses, uncertain billing, terminal credentials
  or exhausted attempts stop instead of blindly retrying. Inspect the retained
  request/response ledger and provider billing before any manual reconciliation.
- **Missing/corrupt assets:** the error names the segment or background. Restore
  the original cache/asset from its archive; a checksum failure is not a cache hit.
  A saved TTS WAV can rebuild interrupted local processing without synthesis.
- **Needs revision:** change a separate source revision and inspect a new dry run.
  No model escalation or third correction is automatic. Corrections are recorded
  with their new hash and replan narration/cost before any further TTS.
- **Existing output:** unchanged dependencies plus a verified file checksum reuse
  it. Changed dependencies refuse overwrite unless `--overwrite` is supplied.
  Replacement renders to a destination-local temporary MP4; the prior good video
  stays intact until the candidate passes metadata, full decode, text-fit/timing,
  bonus checks and loudness/true-peak thresholds. A durable verification certificate
  allows recovery after an interrupted promotion without another render.

Each MP4 has a sibling `.verification.json`; private plans, stage artifacts,
provider receipts and final verification remain under its job directory.
Measurements do not establish pronunciation, tone, phone readability or subjective
mix quality. Those remain viewing/listening judgments, not mandatory content gates.
