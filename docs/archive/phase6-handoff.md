> Archived maintenance snapshot. For current commands use the [primary usage guide](../../README.md). Historical authorizations apply only to their recorded jobs.

# Phase 6 handoff — single-command local production

Historical handoff plan. Phase 6 is now implemented in `npm run produce`;
see [commands, budgets and recovery](../phase6-production.md). Publishing belongs to Phase 7.
The [complete acceptance video and results](../phase6-results.md) are ready.
The final Phase 5C viewing artifact is
[`c-achird-bookends-excerpt.mp4`](../../out/phase5c/c-achird-bookends-excerpt.mp4).

## Proposed command

```powershell
# Implemented interface:
npm.cmd run produce -- --draft drafts/public-transit-02-candidate --output out/transit-polished.mp4 --review-mode automated --dry-run
```

The selected default supplies Achird EN/KO, display hook/follow scenes, compact
question panels, aligned phrase captions and the local CC0 bed at **1.25×**.
Expose explicit voice/presentation overrides, music disable, and optional manual
review. Use `--brief` instead of `--draft` when content generation is needed.

## Implementation sequence

1. **Resolve and plan.** Create a persisted job manifest with source, content hash,
   exact narration, selected voice/style hashes, asset IDs and output path. Reuse
   immutable accepted content; bind voice overrides separately as the comparison
   workflow does. Do not edit the accepted source or fabricate a new acceptance.
   A dry run reports missing assets/clips/alignments, bounded paid calls and cost.

2. **Validate and accept automatically.** Reuse structural checks and hash-bound
   automated linguistic acceptance. Changed content invalidates acceptance; allow
   the existing bounded review/correction/verification flow, then stop on unresolved
   blocking findings. Manual mode stays optional. Require a registered matching
   background before spending on narration. Automated acceptance is not proof of
   correct Korean.

3. **Prepare authorized assets.** Reuse exact cached audio; synthesize only missing
   segments after explicit paid opt-in and scoped budget authorization. Preserve
   locks, reservations, bounded retries, uncertain-outcome handling and sanitized
   credential errors. Audition authorizations do not cover full production.
   Align missing transcripts locally, keyed by audio checksum/text/configuration.
   Build short phrase groups automatically from punctuation, language and text-fit
   limits so generated episodes need no hand-authored phrase JSON.

4. **Assemble and render locally.** Generalize the existing shared question scene
   and measured timeline to all six questions. Reuse the display hook, restrained
   continuous background motion, neutral bonus/comment panel and dedicated follow
   ending. Preserve five-second countdowns, 45-frame comment pause, 30-frame final
   hold and 12-frame fade. Suppress duplicate speech captions in large-text scenes.
   Keep bonus answer data outside render props and every public caption/audio role.
   Rendering consumes prepared local assets and makes zero provider calls.

5. **Verify and resume.** Render to a temporary MP4, check text fit, timing,
   bonus isolation, metadata, complete decoding, loudness and true peak, then
   atomically promote it. Save verification, stage hashes, usage and costs.
   Resume completed stages without repeating paid requests; refuse overwrites
   unless explicitly requested. Preserve the silent-render path.

## First acceptance run and known gap

Run one complete transit episode with the selected profile, then repeat unchanged
preparation to prove zero new paid requests. Cover stale acceptance, changed
speech/voice/processing, missing/corrupt assets, failed review, budget exhaustion,
caption boundaries, neutral bonus and interrupted-job recovery with local tests.

Planning-time inventory (now resolved): **19 full-episode clips; 6 Achird clips cached;
13 missing, totaling 815 Unicode characters**. Recheck inventory and current
provider pricing before requesting a full-production cap. Six word-alignment
caches already exist. The Phase 5C excerpt intentionally uses an on-screen-only
bonus prompt because its Achird question clip is missing; it borrows the original
bonus reading duration without playing its Kore recording. **Do not carry this
exception into production:** require the prepared Achird bonus question and derive
its reading/countdown boundary from that actual recording.

Keep phone readability, pronunciation, voice consistency and perceived pacing as
honest viewing/listening uncertainties, without adding a mandatory content-review
stop in automated mode. No scheduling, agents, analytics or publishing in Phase 6.
