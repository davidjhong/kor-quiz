# Pipeline Checkpoint B — visual variety and mix audition

Historical B acceptance. [Checkpoint C](pipeline-checkpoint-c.md) documents the
current new-job defaults; saved B jobs retain the settings reported here.

This is section 8 of the revised pipeline task, separate from the earlier phases.
Checkpoint C has not started. No paid providers, new artwork, downloaded music,
new speech or full episode renders were used. A's real new-episode pacing and
subjective balance remain unverified.

## Working interface

`video` is the primary convenience entry point; low-level `produce` keeps its
previous defaults. New `video` jobs add `variety-v1` and `visual-variety-v1`.
Existing jobs without those fields retain their exact legacy selection behavior.
Do not add new variety flags when resuming an old job.

| Option | Supported values |
| --- | --- |
| `--palette` | `auto` (default), `cream-navy`, `sage-coral`, `midnight-gold`, `blush-plum` |
| `--motion` | `auto` (default), `slow-push`, `slow-pull`, `slow-pan-left`, `slow-pan-right` |
| `--music` | `auto` (default), `subtle-bass`, `none`; `--no-music` also disables it |
| `--seed` | Nonempty text, up to 128 characters; defaults to the allocated job ID |
| `--background` | `auto` (default), `pool`, `new`, registered asset ID |

Voice remains independent: `--voice achird` (default), `--voice kore`, or the
existing profile-file override. Character is an explicit, separate constraint:
`--background-character "adult woman"`, `"adult man"` or `"adult traveler"`.
Unknown values fail before paid work. Default concise countdowns remain 3 seconds
for easy/medium and 4 for hard/bonus; `--countdown 5` keeps the explicit override.
Neither narration rate nor the fixed ending pauses changed.

**Proposed new production plan, not executed:**

```powershell
Set-Location 'C:\Users\david\Documents\kor-vids'
npm.cmd run video -- --scenario "Beginner Korean shopping at a convenience store: finding a snack, asking the price, requesting a bag, and paying by card." --job-id store-b-01 --output out/store-b-01.mp4 --voice kore --background auto --background-character "adult woman" --palette auto --motion auto --music auto --seed store-b-01 --dry-run
```

The command saves the exact selections and prints stage bounds, blockers and the
resume command. Inspect the saved plan; no cap is authorized by a dry run:

```powershell
Get-Content -LiteralPath data/production-jobs/store-b-01/plan.json -Raw
npm.cmd run video -- --resume store-b-01 --dry-run

# Proposed execution: interactively approve the displayed total, then run sequentially.
npm.cmd run video -- --resume store-b-01

# Alternative unattended execution, only after YOU choose the exact total cap:
$cap = Read-Host 'Authorized total USD cap'
npm.cmd run video -- --resume store-b-01 --max-cost-usd $cap --yes

# Later resume of that same job; never recreate it to retry.
npm.cmd run video -- --resume store-b-01
```

An existing ID is preserved and refused as a new job. A new ID does not grant
spending. Existing authorization scope, integer-money cap checks, pricing expiry,
reservations, uncertain-outcome handling and local dependency preflight remain
unchanged. See [A's authorization/recovery guide](pipeline-checkpoint-a.md) and
[production recovery](phase6-production.md#failures-and-recovery).

## Selection and preservation

- Resolve once under the job lock and shared catalog lock. Persist the seed,
  version, resolved IDs, candidates, excluded/recent choices, history hashes,
  palette/motion/music checksums, native dimensions and background binding.
  Pending images have a request hash and **null** image checksum; the actual
  checksum is sealed after receiving/validating the saved image. Resume does not
  reroll, regenerate a bound image, or rewrite immutable receipts.
- Compatible backgrounds must match setting, painted style and declared overlay
  composition; pass file checksum/PNG decode, size and portrait-aspect checks;
  satisfy any explicit character constraint; and remain below the completed-use
  limit (default 5). Unknown character metadata cannot satisfy a constraint.
  Existing request provenance is usable; no narrator is inferred from the art.
- `auto` plans at most one variant per job while fewer than 3 eligible images
  exist; at 3 it rotates. `pool` never generates and stops on an empty eligible
  pool. `new` binds one new request. Explicit matching IDs ignore retirement,
  retain checksum checks and honor an explicit character constraint. Retirement
  removes an image from automatic eligibility, never from disk or old renders.
- Candidates are bounded to 128. Exclude the last K compatible completed choices,
  K = min(3, pool size − 1), then rank remaining choices by seed/category hash.
  There is a least-recent-use fallback. One-item pools necessarily repeat.
  Music auto currently has only Subtle Bass; it cannot promise variety yet.
- Only completed distinct full episodes enter usage/history. Dry runs, failed
  jobs and question previews do not. Re-rendering the same episode is not another
  distinct episode. Catalog counters and new history commit atomically under a
  shared owner-aware lock; concurrent writers are serialized. Historical completed
  episodes are read into the selection context without rewriting their jobs.
  Original render-certificate time supplies historical completion order.
- Deterministic lighting/camera/layout/prop/clothing descriptors extend the image
  prompt, preserving safe areas and avoiding answer hints; no LLM planning call.
  Automated review, content checks and recent-question history remain effective.
  Cosmetic variation is not a platform eligibility guarantee.

Palettes share geometry, font floors, choice rows and reveal/countdown tokens.
Cream-navy preserves all original color values. Tests check text/secondary pairs
against actual panel/answer/dimmed/revealed surfaces at 4.5:1, checkmarks at 3:1,
and caption foreground against its fixed dark outline. The outlined captions
remain consistent over artwork; palette ratios alone do not prove art contrast.

Motion uses one episode clock, at most 2% extra zoom, 10 px total pan and an 8 px
top inset. Cover geometry accounts for native crop, framing and top-center CSS
transform origin. Tests cover frame extrema and question-transition frames.
Declared face-region tests are geometry checks, **not face detection**. Inspected
café/transit/hotel/restaurant artwork remains covered; the restaurant's hair
already approaches the panel/caption band. Its sampled actual captions fit to
the left of the face. New-art face placement remains an inspection limitation; the prompt cannot
guarantee exact coordinates. No face detector or new human approval gate was added.

## Local deliverables and executed checks

- [Four palettes, same countdown/question/art](../out/checkpoint-b/palette-comparison-countdown.jpg)
  and [same reveal](../out/checkpoint-b/palette-comparison-reveal.jpg).
- [20-second silent motion demonstration](../out/checkpoint-b/motion-presets-silent.mp4):
  push, pull, pan left, pan right, five seconds each. These labeled demo cuts do
  not imply a production background reset; production motion stays continuous.
- [26.8-second A/B music audition](../out/checkpoint-b/music-a-b-comparison.mp4):
  two labeled 13.4-second sections with the same cached Korean answer, English
  explanation, countdown and track. Static viewing card; not a pacing demo.
- Actual zero-call CLI plan: `pipeline-b-pool-01`, Kore, seed `b-pool-audition`,
  pool asset `generated-restaurant-379962e8db662f67`, midnight-gold, slow-push,
  Subtle Bass. Two eligible restaurant images; pool reuses rather than filling it.
  Conditional content/review/TTS bound **$0.22522**, image $0. It remains planned,
  unauthorized and unexecuted. Its read-only resume preserved job/catalog bytes.

```powershell
# These planning/inspection commands WERE executed; safe to inspect again.
npm.cmd run video -- --resume pipeline-b-pool-01 --dry-run
npm.cmd run video -- --resume restaurant-fresh-02 --dry-run

# Local checks, no provider calls:
npm.cmd run typecheck
npm.cmd test

# Open the finished diagnostic artifacts:
Start-Process -FilePath 'out/checkpoint-b/palette-comparison-countdown.jpg'
Start-Process -FilePath 'out/checkpoint-b/motion-presets-silent.mp4'
Start-Process -FilePath 'out/checkpoint-b/music-a-b-comparison.mp4'
```

Typechecking and all **207 tests passed** (zero failures/skips). After adding
the inspected transit asset's exact 916 ? 1717 size, its affected cover-crop test
passed again; the implementation did not change. Focused A/B/image checks also
passed **37 tests**. The silent preview is H.264, 1080 ? 1920, 30 FPS; the
26.8-second labeled audio card is H.264, 540 ? 960, 30 FPS with AAC. Both streams
of the audio comparison span the full 26.8 seconds. Full decoding passed.

Evidence lives under `out/checkpoint-b/`: focused/full test logs, typecheck log,
CLI logs, `persistence-evidence.json`, `protected-verification.json`,
`music-balance.json`, frames and contact sheets. Protected baseline hashes cover
652 files: existing jobs/revisions/acceptances/budgets/receipts, artwork, audio,
alignment caches and completed MP4s. None changed. A's planned
`video-20261112-d95b432c` remains planned, byte-identical and unexecuted; it was
not assigned B fields. Restaurant-fresh-01 stays failed, restaurant-fresh-02
complete and hotel-fresh-01 planned. Restaurant-fresh-02 needs zero new provider
work, with 19 clips/alignments reusable. Its historical MP4 is preserved; current
renderer signatures differ and explicit replacement would be needed.

Changed modules: `varietySelection` and catalog/image planning for selection,
locks/history/binding; video/pipeline/plan/read-only inspection for persistence;
`variety`/`Palette` and shared scenes for colors/motion; render fingerprint/public
props for honest invalidation. Diagnostic helpers and B regression tests are
separate from production. Dependency versions/lockfile, TTS processing, raw
alignments, phrase grouping, frozen experiments and renderComparison stay intact.
Two A CLI assertions intentionally now accept B's auto music/palette interface.

## Music gain audit and audition

The actual A helper used concise gains **idle .45 / thinking .30 / speech .20**,
then the existing **1.25 once**, smooth attack/release and start/end fades. The
prepared track itself was already normalized near −20 LUFS; speech clip gain is
1. No extra legacy attenuation or second 1.25 multiplier was found. A's final
two-pass normalizer used dynamic processing because peak/range constraints did
not permit a purely linear boost. It changes music and speech levels together
over time; it did not bypass the selected preset. Overall LUFS does not measure
their balance.

B multiplies the estimated A music contribution by **1.41254 (+3 dB)**. Equivalent
pre-master base gains are **.63564 / .42376 / .28251**, still with 1.25 once.
This is an **audition candidate only**: no production gain/pinned job was changed.
Both sections share −0.35 dB encoder headroom; narration gain is otherwise
identical. A comes from its actual encoded mix. Known cached stems estimate A's
dynamic master gain in 10 ms blocks (median correlation 0.999986; reconstruction
residual about −52.3 dBFS), allowing B to raise the bed without independently
normalizing or boosting its voice. Post-master separation is an estimate, not
an exact isolated provider stem.

| Interval | A music vs voice | B music vs voice | Evidence |
| --- | ---: | ---: | --- |
| Korean answer | about −9.56 dB | about −6.56 dB | Estimated post-master RMS stems |
| English explanation | about −9.86 dB | about −6.86 dB | Estimated post-master RMS stems |
| Countdown | Music only | **+3.00 dB** over A | Direct decoded music-only RMS |

Decoded residual narration differs by less than **0.003 dB** in both speech
windows. Exact pre-master music/voice ratios are about −10.67 dB Korean and
−10.29 dB English. The final combined encoded audition measures **−15.27 LUFS,
−1.51 dBTP**, with complete decode passing. A/B sections measure −15.44/−15.02
LUFS and −1.83/−1.52 dBTP. The reference excerpt intentionally retains A's
dynamics/level with common headroom, rather than forcing this partial excerpt
to the full-program −14 LUFS target. Its explicit excerpt tolerance and the
unchanged −1.5 dBTP ceiling (+0.1 dB meter tolerance) pass. Production still uses
the existing −14 ±0.5 LUFS checks.

About **99.5%** of this track window's spectral energy is below 200 Hz, so weak
phone bass reproduction is a plausible limitation. This is a spectral heuristic,
not listening evidence. No pronunciation, subjective masking/balance, phone
playback or real full-episode pacing was assessed here. Listen before adopting
the stronger candidate. Subtle Bass remains TinyWorlds' CC0 track with its
existing source/license/checksum unchanged; no new tracks were generated.

Checkpoint C can add the reusable locally generated track library through this
selection interface. No C synthesis, publishing or scheduling is implemented here.
