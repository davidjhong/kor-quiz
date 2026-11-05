# Phase 5B automated development workflow

The development path is generation/import → structural validation → automated
linguistic review → matching local asset → audio preparation → local render.
Human linguistic and aesthetic approval are optional in this explicit mode.
Manual mode remains the default and retains its separate hash-bound approval.
Neither mode publishes anything.

## Acceptance and bounded review

`draft auto-review` sends quiz content, exact narration, and the private bonus key
to the configured economical model in a separate request. It does not send the
generator's reasoning. The reviewer checks natural/complete Korean, answer
uniqueness, romanization, meanings/explanations, English speech and bonus
isolation. Findings identify exact question IDs and fields.

There is one review, at most one correction pass, and one verification after a
correction: at most three requests, with SDK retries disabled. The correction
can edit bounded content fields only, preserves original inputs/responses,
journals every change, synchronizes affected narration, and reruns structural
validation. Verification must explicitly resolve every original blocking finding
and check all six questions again. Remaining blocking findings stop that episode
as `needs-revision`; there is no stronger-model fallback or extra repair loop.

Accepted records live separately in `data/automated-acceptances/<hash>.json` and
contain `humanReviewed: false`, exact content hash, reviewer/model/prompt versions,
request IDs, findings, revisions and background checksum/selection. Any content
change invalidates acceptance. Changed asset bytes also fail readiness. Raw
requests, responses and parsed findings remain under the draft's
`automated-review/` directory. Persistent reservations and request limits live in
`data/automated-review-budgets/`; interrupted/uncertain requests are not blindly
retried. Do not reset ledgers to obtain more attempts.

The same model in separate requests is **not independent proof of correctness**.
An automated pass can miss ambiguity, unnatural Korean or romanization errors.
It supports quick development viewing, not a claim of human certification.

## Transit candidate and provenance

The supplied starting hash matched:
`399899ccb71ee6597783f75fac00b8237f192197c3d8c8a8fde64c078fecd4e8`.
An exact starting snapshot is retained in
`drafts/public-transit-02-candidate/automated-review/starting-state.json`.
Original generation outputs and the earlier coding-assistant revision record
remain unchanged. No scenario was regenerated.

Selecting the new subway asset in the brief and quiz changed the hash to
`194914b5a3f37cae33226de035954d6cc6a4bab831c4b5e6eb5b96bc3546fdd0`.
This event is recorded separately in `automated-revisions.json`. GPT-6 Luna's
review reported all six categories passing for all six questions, with no
findings and no linguistic corrections. Acceptance is automated, not human.

The one built-in generated background is **developer-selected**. Its native
916 × 1717 resolution is recorded accurately; the existing renderer scales it to
1080 × 1920. See [the asset provenance](public-transit-background-provenance.json).
The tool did not expose its model, token usage or dollar cost. There were zero
separately billed image API calls.

## Commands (PowerShell)

These commands reuse the saved accepted review and prepared audio. The audio
command deliberately omits `--synthesize`, so missing audio fails without a paid
request. Rendering uses local audio only. Existing outputs require the explicit
`--overwrite` option.

```powershell
Set-Location 'C:\Users\david\Documents\kor-vids'
npm.cmd run typecheck
npm.cmd test
npm.cmd run draft -- validate --draft drafts/public-transit-02-candidate --review-mode automated
npm.cmd run draft -- review --draft drafts/public-transit-02-candidate --review-mode automated
npm.cmd run audio:prepare -- --draft drafts/public-transit-02-candidate --review-mode automated --output public/audio/public-transit-02/manifest.json --usage-report out/transit-development/audio-cache-rerun.json
npm.cmd run render:narrated -- --draft drafts/public-transit-02-candidate --review-mode automated --audio-manifest public/audio/public-transit-02/manifest.json --output out/public-transit-02-automated.mp4 --overwrite
Invoke-Item .\out\public-transit-02-automated.mp4
```

The bounded review command used for this job was:

```powershell
npm.cmd run draft -- auto-review --draft drafts/public-transit-02-candidate --model gpt-6-luna --budget-id transit-auto-review-01 --max-cost-usd 0.0564 --allow-paid
```

Rerunning unchanged accepted content reuses its acceptance with zero requests.
Changed content requires new scoped authorization/accounting; an old acceptance
or a new budget ID is not spending permission. Manual mode uses `draft review`,
`draft approve`, then audio/render without `--review-mode automated`.

## Budget and actual usage

The user authorized **$0.20 combined**, itemized as review up to **$0.0564** and
Google TTS up to **$0.14**, totaling $0.1964. This scope is recorded in
`data/development-spending/transit-auto-01.authorization.json`.

Review made **one request** to `gpt-6-luna`: 2,930 input tokens, 1,486 output
tokens (including 1,164 reasoning), zero cached input. The ledger's conservative
estimate is **$0.00110925**, pricing all input at the $0.125/M cache-write rate and
output at $0.50/M. Standard $0.10/M input would estimate $0.001036. No invoice was
inspected. No correction or verification call was needed.

Audio preflight found 19 segments: two reusable, 17 missing, 1,045 uncached
characters. At $0.00003/character the estimate is **$0.03135**, or $0.06270 with
one bounded rate-limit retry for every clip. The authorized preparation command
was `audio:prepare` with the draft/mode/output above plus
`--synthesize --max-cost-usd 0.14 --usage-report out/transit-development/audio-preparation.json`.
Preparation actually made **17 requests for 1,045 characters**, with **two cache
hits** and no retries, estimated at **$0.03135**. A second, cache-only preparation
reused **all 19 clips**, with **zero requests** and zero new estimated synthesis
cost. The conservative combined review + TTS estimate is **$0.03245925**, below
the $0.20 authorization. Actual request counts and costs are recorded in that
report and `out/transit-development/audio-cache-rerun.json`. Unchanged audio
identity includes exact text, language, provider/model, voice, rate, format,
sample rate and processing version. Existing ADC and ignored `.env` remain
server-side; rendering receives an empty environment file and local props only.

Official prices checked 2026-11-05:
[GPT-6 Luna](https://developers.openai.com/api/docs/models/gpt-6-luna),
[Google Cloud TTS](https://cloud.google.com/text-to-speech/pricing).
Google estimates precede any eligible free allowance and are not billed totals.

## Code organization and verification

- `scripts/automatedAcceptance.ts`: strict findings, exact coverage/resolution,
  separate acceptance records, hash and background identity checks.
- `scripts/automatedReview.ts`: bounded SDK requests, accounting, saved-response
  recovery, correction journal and verified acceptance.
- `scripts/draftWorkflow.ts` / `scripts/draft.ts`: explicit review mode, reports
  and existing production-readiness gate. Manual approval remains available.
- `scripts/prepareAudio.ts` / `scripts/renderNarrated.ts`: mode-aware readiness,
  preparation usage reports, existing measured audio/cache/render checks.
- `src/assets/backgrounds.ts`, `scripts/assets.ts`, `src/IllustratedFrame.tsx`:
  real asset selection/provenance, checksum and transit-specific static framing.
- `tests/automated-review.test.mjs`: local mocks cover acceptance separation,
  hash invalidation, unresolved findings, bounded corrections/calls/costs,
  failures/recovery, manual mode and changed asset bytes. No paid failure tests.
- `scripts/checkDraftLayout.ts`: silent preflight through the actual font fitter,
  independently of acceptance/audio. It does not substitute for final video QA.

Final media measurements and inspected frames are recorded in
`out/transit-development/verification.json`. The fixed ending remains separate
comment speech → 45-frame pause → follow speech → 30-frame hold → 12-frame fade.
The bonus answer remains solely in the separate private key, with neutral choices
through the ending. Technical checks cannot establish Korean pronunciation,
tone, subjective pacing, or actual phone readability; those remain viewing items.

### Completed transit output

[Watch the MP4](../out/public-transit-02-automated.mp4) ·
[FFprobe](../out/transit-development/ffprobe.json) ·
[audio measurements](../out/transit-development/audio-measurements.json) ·
[frame inspection report](../out/transit-development/verification.json).

| Check | Actual result |
| --- | --- |
| Typecheck / full regression suite | PASS; 112 tests, no failures/skips; final focused review/generation rerun passed 29 tests |
| Automated linguistic review | ACCEPTED; one GPT-6 Luna call, all six categories pass on six questions, no findings or corrections; human review not claimed |
| Full render and decode | PASS; completed MP4 promoted only after metadata and complete video/audio decode with `-xerror` |
| Media | H.264, 1080 × 1920, 30/1 FPS, yuv420p; AAC, 48 kHz stereo; 3,769 video frames; 10,991,998 bytes |
| Duration | Timeline/video 125.633333 s; MP4 container 125.653 s, difference 0.019667 s within the explicit 0.034333 s tolerance |
| Minimum / advisory target | 65-second minimum PASS; earlier 80–95-second target exceeded; no filler or accelerated speech used |
| Deterministic timing | PASS; no overlapping clips/countdown speech; Korean answer → 10-frame gap → English explanation; listening/reading holds retained |
| Final ending | Comment ends f3642; follow begins f3687 after exactly 45 frames; follow ends f3727, hold until f3757, 12-frame fade ends f3769 |
| Bonus isolation | PASS; authored bonus has no answer/reveal fields; actual key is separate. Legacy common scene props use a fixed unused index 0 and generic withheld explanation, never the private key. Bonus state cannot become `reveal`. |
| Cache | Preparation: 2 hits / 17 new requests. Unchanged rerun: 19 hits / zero requests. Render uses prepared files only. |
| Visual inspection | 47 extracted frames inspected in seven diagnostic contact sheets; Q4/Q5 reveals and bonus follow hold also inspected full size. Progress 1/6–6/6; Q1–Q5 highlights B/C/A/B/A; bonus always neutral. No observed overflow, missing Hangul glyphs, early translations or overlapping explanations. Same static background throughout. |
| Audio | Encoded program −16.88 LUFS, −4.39 dBTP true peak, LRA 6.4 LU; English concatenation −16.79 LUFS vs Korean −17.85 LUFS; difference 1.06 LU, below 3 LU flag; no over-zero clipping flag |
| Silence | 16 detected spans ≥1 second at −45 dB; none wholly inside a scheduled clip. Long gaps coincide with countdowns/holds or between-clip silence. This does not establish absence of audible cut-off words. |
| Not checked | Actual phone viewing; listening assessment of pronunciation, tone, voice consistency, audible artifacts or subjective pacing; provider invoice |

The bundled FFmpeg omits `select` and `tile`. The diagnostic helper reuses the
earlier accurate timestamp-seeking approach; Pillow creates labelled contact
sheets without changing the video or background. The initial audit incorrectly
expected no bonus index in the legacy props; it was corrected to verify the
documented fixed placeholder and the actual absence of private answer data.
These inspection-helper corrections required no content change, new model call,
new speech or rerender.

For optional viewing: check Hangul/romanization on a phone, listen for Korean
pronunciation and any cut-off words, compare the two voices' perceived volume,
and assess reading/listening pace and the final pause. This is not an approval
gate. No publishing, music, captions, agents or scheduling were added.
