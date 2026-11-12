# Pipeline Checkpoint A — reliability, pacing and mix

Implemented **sections 1–7 only** of the revised `Downloads/pipeline_task1.md`
(the supplied replacement for `PIPELINE_TASK.md`). This is separate from the
earlier Phase milestones. Checkpoints B/C and publishing are not implemented.

**Actual work:** zero paid provider calls, no new TTS or background images, no
full episode render. One short cached-audio mix audition and two PNG stills were
produced. Existing jobs, media, receipts, approvals/acceptances, ledgers and caches
were preserved. [Machine-readable verification](../out/checkpoint-a/verification.json).

## Working commands

```powershell
Set-Location 'C:\Users\david\Documents\kor-vids'
npm.cmd run video -- --help

# Zero-call NEW job. Prints its unique ID, output and exact resume command.
npm.cmd run video -- --scenario "Beginner Korean shopping at a convenience store: finding a snack, asking the price, requesting a bag, and paying by card." --voice kore --background new --background-character "adult woman" --dry-run
```

That dry run was executed. It created **`video-20261112-d95b432c`**, output
`out/video-20261112-d95b432c.mp4`. Its [stored job](../data/production-jobs/video-20261112-d95b432c/job.json)
and [plan](../data/production-jobs/video-20261112-d95b432c/plan.json) are reproducible,
unauthorised and have no spending ledger. Do **not** rerun the scenario command
just to execute this plan: it intentionally allocates another unique job.

| Stage | Maximum requests | Conservative reservation |
| --- | ---: | ---: |
| New medium 1024×1536 PNG | 1 | $0.505100 |
| Quiz and objectives in the same generation flow | 2 | $0.037600 |
| Review / at most one correction / verification | 3 | $0.056400 |
| TTS, including bounded rate-limit retries | 38 | $0.131220 |
| **Total** | | **$0.730320** |

The suggestion is **$0.75**: round the bound UP to cents, then add $0.01 using
integer nano-USD arithmetic. This is a suggestion, not authorization. TTS remains
a conditional character ceiling until actual text/cache inventory exists. Image
allowances are not provider-enforced maximum bills: the API has no output-token cap.
Reported unexpected image usage stops downstream spending. No expected actual
cost range is invented from earlier episodes.

```powershell
# Executed locally: read-only planning, no new authorization.
npm.cmd run video -- --resume video-20261112-d95b432c --dry-run

# NOT EXECUTED: interactive execution asks before committing the displayed cap.
npm.cmd run video -- --resume video-20261112-d95b432c

# NOT EXECUTED: explicitly authorize EXACTLY this total for unattended execution.
npm.cmd run video -- --resume video-20261112-d95b432c --max-cost-usd 0.75 --yes

# After a successful run, unchanged resume reuses its verified output/caches.
npm.cmd run video -- --resume video-20261112-d95b432c

# Once it exists, the output can be viewed with:
Start-Process -FilePath 'C:\Users\david\Documents\kor-vids\out\video-20261112-d95b432c.mp4'
```

`--yes` without a numeric cap fails before job creation. A cap without `--yes`
still requires interactive confirmation. Noninteractive execution with missing
confirmation gives the exact resume instructions. A rejected/declined cap leaves
the job unauthorised and reserves no provider funds. A stored valid cap cannot be
changed; mismatch errors identify stored and requested values. Planning,
preflight, confirmation and commit occur under the same job lock.

Help needs no credentials or job creation. Normal paid execution checks local
Python/import versions, the cached Whisper model checksum, managed browser,
FFmpeg and FFprobe before committing authorization. The actual Windows preflight
passed. Native macOS alignment remains unsupported; no Mac readiness is claimed.
Provider credentials/access were not exercised in this zero-call checkpoint.

Other supported controls include `--draft`, `--brief`, `--job-id`, `--output`,
`--voice achird|kore|FILE`, `--presentation`, `--review-mode manual`, `--model`,
`--max-output-tokens`, existing image controls, `--overwrite` and `--recover-lock`.
Low-level `produce` remains available. Automated content review remains default;
manual approval is optional. No new human gate was added.

## Pinned new-job behavior

New **`video`** jobs store `concise-v1`. Missing preset fields explicitly resolve
to `legacy-v1`; existing jobs and low-level `produce` defaults keep legacy behavior.
Explicit overrides are available:

```powershell
# Examples for a NEW job; not executed:
npm.cmd run video -- --scenario "Beginner Korean at a café" --preset concise-v1 --countdown 5 --dry-run
npm.cmd run video -- --scenario "Beginner Korean at a café" --preset legacy-v1 --music none --dry-run
```

Concise defaults are 3 seconds for easy/medium countdowns and 4 for hard/bonus.
`--countdown 5` sets all to five seconds. Numerals and bars use the actual frame
duration. Reading uses `max(required reading, measured question end + settle)`;
pauses are not added twice. Every voice remains at rate 1. Opening remains at
least three seconds. Korean answer → short gap → full English explanation → brief
hold is preserved. Bonus ending remains comment → 45 silent frames → follow →
30-frame hold → 12-frame fade at 30 FPS. No bonus answer metadata enters public props.

Only NEW generated content uses `concise-explanations-v1`: one useful English
explanation sentence, at most 12 words, with the existing 180-character ceiling
separate. Unicode letter/number runs are words; contractions keep apostrophes,
hyphens split words, standalone punctuation does not count. Sentence punctuation
is checked deterministically. The generator is asked for meaning plus a specific
language point; counts alone cannot establish usefulness or linguistic accuracy.
The new prompt/schema versions are separate; frozen experiments and accepted old
drafts are not retroactively constrained. Corrections still get at most one pass.

Timing is saved in each newly executed job's `timing.json` and final report by
hook speech/hold, question speech, reading-only time, countdowns, answers,
explanations, transitions, reveal gaps/holds, CTA speech/pause/hold and fade.
Below 65 seconds stops before rendering, without filler or speech cutting.
75–85 seconds is advisory for concise jobs, not imposed on old episodes.

Measured-duration predictions using **unchanged old speech**, not new concise TTS:

| Cached episode | Legacy | Concise timing with the same old recordings |
| --- | ---: | ---: |
| Restaurant fresh 02 | 119.40 s | 105.00 s |
| Hotel 01 | 115.40 s | 99.03 s |
| Transit production | 120.10 s | 105.63 s |

All exceed the advisory range and pass 65 seconds. No claim is made that new
12-word explanations will produce a real 75–85-second episode before actual audio
exists. [Complete category breakdowns](../out/checkpoint-a/predicted-timings.json).

## Alignment and lock reliability

Yesterday's workaround broadened accepted zero-duration English words and added
full JSON `console.error` dumps in `productionCaptions.ts`; a test still expected
a zero-duration content word to fail. The useful behavior is retained with shared
validation and downstream grouping version **v4-acoustic-groups**, replacing dumps
with clip/word/condition errors.

Validation rejects nonfinite/negative/reversed/out-of-order spans, material
overlap, endpoints beyond the clip, transcript mismatch, and entirely zero-length
clips. The documented timestamp rounding tolerance is 1 ms. A single zero-duration
word is text, not an individually measured interval. Groups use actual positive
anchors; dynamic programming can merge/rebalance across preferred sentence breaks
within five-word/36-code-point readability limits. Impossible grouping fails the
segment. No evenly divided or invented word timestamps are used.

The actual saved `chosen`, `but`, `Your`, `finished` alignments were inspected and
copied byte-for-byte into hashed historical fixtures. Raw audio, `AUDIO_PROCESSING`,
raw alignment configuration/keys and saved word output remain unchanged. Invalid
saved alignment/grouping is now a blocker; it is never automatically overwritten
to repair a grouping failure. Only genuinely missing alignments are generated
locally. Positive-duration Korean phrases and bonus isolation have regression tests.

Locks record machine identity, PID, process-start identity and an ownership token.
Only a positively absent same-machine owner is automatically recovered under an
exclusive guard. Matching active, PID-reused, permission-unknown, legacy-incomplete
or foreign-machine ownership is never force-removed, even with `--recover-lock`.
SIGINT/SIGTERM stop new work, terminate/wait for owned local children, save resumable
state and release only the run's own locks. A current provider response is allowed
to finish/save; uncertain reservations remain held. Hard termination cannot promise
cleanup; the next run handles a provably stale lock. An ambiguous/orphan recovery
guard still requires an audited manual inspection, not deletion of a live guard.

## Final mix audition

Play [the 21.6-second mix preview](../out/checkpoint-a/mix-preview.mp4). It reuses
the original restaurant opening/Q1 video and exact cached Kore speech, **so its
visual countdown is legacy pacing**. It auditions the new mix, not a new full
episode. The separate [easy 3-second](../out/checkpoint-a/frames/easy-3.png) and
[hard 4-second](../out/checkpoint-a/frames/hard-4.png) stills demonstrate new timing.

The new music starting values are idle 0.45, thinking 0.30, speech 0.20; existing
musicGain 1.25 is applied once. Smooth timeline ducking/fades remain. These are
audition settings, not a claim that louder is better. `--music subtle-bass|none`
is the minimal track interface; `--no-music` remains available. No library or new
tracks were generated. Existing [Subtle Bass metadata/license](../public/audio/music/manifest.json)
is unchanged: TinyWorlds, CC0, with its recorded OpenGameArt source/checksum.

Named final target: **−14 LUFS**, **−1.5 dBTP**, LRA target 11. Integrated tolerance
is 0.5 LU; final encoded peak acceptance is nominal ceiling +0.1 dB meter tolerance.
LRA is measured, not forced to equal 11. Measured two-pass loudnorm uses 0.3 dB AAC
headroom. At most one measured local encoding calibration (from the original input,
not a lossy cascade) may use available peak room; final AAC is measured again and
must pass the same limits. No acceptance tolerance was widened to pass the preview.

Actual encoded preview: **−14.41 LUFS / −1.42 dBTP**, decode PASS. Peak is 0.08 dB
above the nominal −1.5 ceiling, within the documented 0.1 dB tolerance, with no
clipping. Initial local candidates failed and were rejected; the accepted mix
used a measured +0.09 dB calibration. [Raw/encoded measurements](../out/checkpoint-a/mix-verification.json)
and [actual MP4 metadata](../out/checkpoint-a/mix-metadata.json) are retained.
Listening was **not performed**: Korean consonant clarity, subjective balance,
pronunciation and phone audibility remain unverified. −14 LUFS is a product choice,
not a platform requirement or engagement guarantee.

## Verification, preservation and remaining work

- `npm.cmd run typecheck`: PASS. Full suite run once: **198 passed, 0 failed**.
  After final reporting/cache-validation adjustments, **58 affected tests passed**.
  [Full log](../out/checkpoint-a/full-tests.log), [affected log](../out/checkpoint-a/affected-final.log).
- Intentional test changes: rejected caps no longer poison a job; authorization now
  precedes nonessential import work; supplied caps cover the full conservative
  plan; isolated English/Korean zero words are accepted inside anchored phrases.
  The tests still reject invalid/all-zero data, bonus leakage, unsafe ownership,
  stale hashes and uncertain retries. New tests cover CLI, cancellation, prices,
  measured timing and final peak acceptance.
- All **648 protected starting files** are byte-identical, including the three
  named jobs, their media/source revisions/acceptances/receipts/ledgers, caches,
  comparison implementation, frozen records and lockfile. Dependency versions
  are unchanged. Source snapshots preserve the prior uncommitted manual changes
  under `out/checkpoint-a/before/` for review.
- `restaurant-fresh-02`: complete, historical 119.4 s, stored cap $0.74, recorded
  estimated usage **$0.0672355**, invoice not inspected. Read-only dry run reuses
  **19 clips / 19 alignments** and requires **zero new image/text/review/TTS calls**.
  Its current renderer/grouping signature changed; its original MP4 and historical
  verification were neither overwritten nor relabeled as current-code verification.
  A replacement would require explicit `--overwrite`, without new paid regeneration.
- `restaurant-fresh-01`: retained failed state and rejected $0.73 authorization;
  **not repaired**. Do not edit/reset that job or its reservations to increase a
  cap. Any recovery is a separate audit of saved requests/ledgers and provider
  billing, followed by an explicit decision; a distinct new job does not itself
  grant spending permission. `hotel-fresh-01` remains planned and unauthorised.
- Package state contradicted the reported concern: root `"type": "module"` was
  already correct, no `scripts.type` existed, and repository `.js/.cjs` entry points
  were absent. That manual fix was preserved. The known Node type-stripping
  experimental warning remains; genuine warnings are not blanket-suppressed.
- Expired profiles now name provider/model, official URL and exact configuration
  field. No expiry dates were extended. Local cache/output reuse needs no current
  pricing if it requires no paid requests.

Checkpoint B's pools/palettes/motion/seed selection and Checkpoint C's generated
music library remain untouched. Their future flags are not accepted as working A
options. No agents, scheduling or publishing were added.
