# Phase 6 — operational reference

The [primary usage guide](../README.md) owns current scenario-to-video commands,
voice selection and the new restaurant test. This page covers persistence,
readiness and recovery. [The previous full guide is archived](archive/phase6-production-before-maintenance.md).
Publishing remains outside Phase 6.

## Inputs and readiness

Choose one scenario, brief or existing draft. Objectives/context are generated
with the quiz, not with an extra planning call. Advanced briefs remain available.
Selected defaults are Achird EN/KO, display bookends, compact panels, aligned
phrase captions, and the CC0 music at 1.25× applied once. Voice is independent of
background and character. Named overrides and custom JSON paths use the same
existing voice-profile validation.

Automated mode is the production default: structural validation, hash-bound
linguistic acceptance, matching registered developer-selected background, prepared
local audio and alignment, then local render. Changed content invalidates acceptance.
One bounded correction and verification are permitted; unresolved blocking findings
stop the job without model escalation. Automated review is not proof of correct Korean.
Manual mode preserves exact-hash human approval and human-approved background checks.

All six production questions require their actual selected-voice recordings.
Countdown starts after measured narration and minimum reading time; it lasts
150 frames at 30 FPS. English meaning/explanation captions appear during reveal
speech. Bonus has no public correct-answer index, meaning, explanation or reveal.
Comment → measured clip end → 45 silent frames → follow → measured clip end →
30-frame hold → 12-frame fade. The old short-excerpt silent-bonus exception is
not supported. Natural approximately two-minute episode pacing is preserved.

Alignment is local English/Korean alignment against the exact transcript. It is
keyed by audio checksum, text, language and pinned configuration. Phrase groups
preserve transcript substrings and acoustic boundaries; there is no evenly split
word timing or paid transcription fallback. See the [alignment environment](../scripts/alignment-requirements.txt).
Rendering consumes local prepared assets with an empty environment file and no
LLM/TTS/image requests. Silent-render and historical preview scripts remain available.

## Persisted state and paid controls

`data/production-jobs/<id>/job.json` stores source identity, immutable revisions,
exact speech, config, checksums, stage hashes, failures and budget references.
`brief.json` and `plan.json` retain the structured brief/seed and current plan.
Do not manually replace immutable sources. Resume the job instead of recreating it.
Output path and authorized total cap stay bound to the job. Another ID is not a
spending authorization. Explicit voice/presentation overrides also work on resume;
dry-run them first to inspect changed audio costs and render invalidation. They
do not increase the existing total cap. Matching cached speech is reusable across jobs.

One envelope in `data/generation-budgets/produce-<id>.json` reserves the total
before image, generation, review and missing TTS requests. Child reservations
cannot collectively exceed it. SDK retries are disabled; existing TTS permits
one bounded rate-limit retry per clip. Unknown outcomes retain reservations.
Saved provider responses support local recovery. No stronger-model fallback or
unapproved paid repair runs. Images use the [separate bounded integration](phase6-background-generation.md).
Costs are estimates before eligible free allowances, not inspected invoices.
Pricing checks and their expiry are enforced by existing provider profiles; a
zero-call cache reuse does not need new provider credentials or pricing approval.

Audio keys include exact text/language, provider/model, that language's voice and
supported settings, format/sample rate and processing version. Changing one
language's voice preserves the other language's clips. Background does not enter
speech identity. Voice changes do not invalidate educational acceptance; they
invalidate affected audio/alignment and downstream presentation work. The new
countdown component is included in the rendering code fingerprint.

Each output has a sibling `.verification.json`. Private snapshots, provider
receipts and final verification stay under the job directory. Bonus answer keys,
review records, prompts and private manifests must not become public render props.

## Failures and recovery

- **Locked job:** do not run two processes against it. Verify the recorded PID
  exited, then use `--resume <id> --recover-lock`. Active/unverifiable PIDs are
  refused and recovered locks are archived. A leftover `lock-recovery.guard`
  requires checking that no acquisition/recovery process remains before manually
  removing that guard. Never delete a live job/provider lock.
- **Unknown paid outcome:** retain reservations. A saved response is recovered
  locally. Missing responses, uncertain billing, terminal credentials or exhausted
  attempts stop instead of blindly retrying. Inspect provider usage and retained
  request/response ledgers before manual reconciliation. Never reset a ledger.
- **Missing/corrupt assets:** errors identify the file/segment. Restore retained
  original bytes. Checksum failures are not cache hits. Saved TTS WAVs can rebuild
  interrupted local processing without synthesis; saved image responses can
  rebuild local assets without an image request. No automatic paid replacement.
- **Needs revision:** prepare a separate source revision and new dry run. Do not
  force acceptance or add a third correction. Corrections record a new hash and
  replan speech/cost before TTS.
- **Existing output:** matching dependencies and verified checksum reuse it.
  Changed dependencies require explicit `--overwrite`. The old good MP4 remains
  until the temporary candidate passes metadata, full decode, text fit, timing,
  bonus and loudness/true-peak checks. A durable verification certificate recovers
  interrupted promotion without another render. Maintenance did not rerender old
  episodes; their render signatures now reflect earlier countdown code.

Preserve caches, receipts, locks, ledgers, licenses, provenance and completed videos
when cleaning. Measurements do not establish pronunciation, tone, phone readability
or subjective mix quality; these are viewing/listening judgments, not mandatory
human content gates in automated mode.
