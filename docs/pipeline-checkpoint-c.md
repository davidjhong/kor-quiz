# Pipeline Checkpoint C — local audio library and approved mix

The approved stronger balance is now the **new `video` job default**, under
`concise-v2` / `source-music-plus3-v1`. Timing is identical to `concise-v1`.
Existing jobs, including both planned store/B jobs, keep their saved mix,
motion, artwork and track. Low-level `produce` defaults are unchanged.

No paid provider, downloaded sample, new TTS, new image or full episode render
was used. Publishing is not implemented. Automated acceptance, optional manual
review, budget authorization, bounded retries and recent-lesson history remain.

## Listen and watch

The WAV auditions are 12-second extracts with short entry/exit fades. The full
reusable loops are the checksum-named WAVs in `public/audio/music/`; the table
reports **full-loop measurements**, not the faded audition extracts.

| Asset / audition | Full loop | Tempo / bars | LUFS / true peak | Per-track trim |
| --- | ---: | --- | --- | ---: |
| [Soft Lofi Keys](../out/checkpoint-c/soft-lofi-keys-audition.wav) | 49.23077 s | 78 BPM / 16 | −19.99 / −4.38 dBTP | −2 dB |
| [Warm Pluck Groove](../out/checkpoint-c/warm-pluck-groove-audition.wav) | 50.00000 s | 96 BPM / 20 | −20.24 / −3.05 dBTP | −3 dB |
| [Airy Pad Drift](../out/checkpoint-c/airy-pad-drift-audition.wav) | 54.85715 s | 70 BPM / 16 | −20.01 / −9.48 dBTP | −2.5 dB |
| [Soft Room Tone](../out/checkpoint-c/soft-room-tone-audition.wav), synthetic | 48 s | Texture | −20.00 / −7.34 dBTP | −7 dB |
| [Gentle Rain](../out/checkpoint-c/gentle-rain-audition.wav), synthetic | 48 s | Texture | −20.00 / −13.82 dBTP | −9 dB |

**[One cached-narration/motion preview](../out/checkpoint-c/new-track-motion-excerpt.mp4)**:
17.43333 seconds, restaurant Q3, existing Kore EN/KO clips and existing illustration,
Soft Lofi Keys, ambience off. H.264/yuv420p, 1080×1920, 30 FPS, AAC stereo 48 kHz,
523 frames; full decode passed. Normal final mix measures **−14.27 LUFS,
−1.66 dBTP**, within −14 ±0.5 LU and the −1.5 dBTP ceiling plus 0.1 dB meter
tolerance. No exception or looser production threshold was used.

```powershell
Set-Location 'C:\Users\david\Documents\kor-vids'
Start-Process -FilePath 'out/checkpoint-c/soft-lofi-keys-audition.wav'
Start-Process -FilePath 'out/checkpoint-c/warm-pluck-groove-audition.wav'
Start-Process -FilePath 'out/checkpoint-c/airy-pad-drift-audition.wav'
Start-Process -FilePath 'out/checkpoint-c/soft-room-tone-audition.wav'
Start-Process -FilePath 'out/checkpoint-c/gentle-rain-audition.wav'
Start-Process -FilePath 'out/checkpoint-c/new-track-motion-excerpt.mp4'
```

The normalized render-required files are:

```text
public/audio/music/soft-lofi-keys-611ed6264145.wav
public/audio/music/warm-pluck-groove-b992ec53fe43.wav
public/audio/music/airy-pad-drift-8481f52d4b68.wav
public/audio/music/soft-room-tone-99c949555e65.wav
public/audio/music/gentle-rain-a39c30f6b957.wav
public/audio/music/library.json
```

**Subjective listening was not performed.** Phone audibility, musical quality,
masking of Korean consonants and perceived pacing remain listening judgments.
The trims above are conservative engineering starting points for the new tracks,
not claimed listening approval. The underlying +3 dB balance is your approved B
choice. There is no new mandatory human content-approval gate.

## Mix and motion versions

`concise-v2` music levels are idle **0.6356419**, thinking **0.4237613**, speech
**0.2825075**: exactly the previous `.45/.30/.20` multiplied by `10^(3/20)` once.
The existing presentation `musicGain: 1.25` is still applied **once**. Per-track
trim then applies separately. The preview's effective gains are **.6311354 /
.4207569 / .2805046** after its −2 dB keys trim. Narration gain remains 1.
Normal `ProductionVideo` / `BackgroundAudio` mixing uses local source stems and
the existing smooth duck/fade envelope; there is **no post-master reconstruction**.

The source PCM reference, before final normalization, puts music about 15.51 dB
below question speech, 17.85 dB below the Korean answer and 15.08 dB below the
English explanation. Countdown music is about −28.61 dBFS RMS. These use the
actual voice PCM and shared frame-gain music reference over the same intervals;
browser resampling/initial AAC can differ slightly. They are not inferred from
overall LUFS or claimed isolated post-master measurements.

`visual-variety-v2` / `motion-v2` requests **5% extra zoom or 26 px total pan**,
with a 2.5% safety scale for pan. Native cover crop, asset framing and a declared
feature region clamp strength before planning; exact limits/config/checksum are
saved. The foreground panel, choices, countdown and captions do not move.
There is one smooth episode clock and no question reset. `visual-variety-v1`
retains its original 2% / 10 px behavior.

The preview is a continuous **36.30–53.73 s** slice of the actual **105 s**
measured timeline. Extra scale changes from **1.38% to 2.59%** during that slice;
it does not play the entire 5% motion in 17 seconds. The original accepted
narration was reused without shortening its longer explanation. This is not a
new full-episode pacing result.

Inspected [full-clock artwork contact sheet](../out/checkpoint-c/motion-full-clock-contact.jpg)
and [actual preview frames](../out/checkpoint-c/preview-contact.jpg). Coverage
and sampled faces remain intact on café, transit, hotel and restaurant art.
The geometry tests establish safety for a **declared region**, not face detection
or a guarantee that new generated art follows a prompt. The restaurant hair
already approaches the caption band; sampled text remains above the eyes.

## Library, synthesis and rights

Explicit local build (executed; unchanged rerun reuses all five assets):

```powershell
npm.cmd run music:generate
```

This never runs implicitly during job planning/rendering. A seed override is
supported on initial creation (`-- --seed TEXT`); existing IDs refuse a different
seed/version rather than replacing pinned files. Missing/corrupt registered
bytes must be restored. Jobs bind the exact WAV path/checksum, track trim,
mix settings and motion config; a later library-index change cannot reroll a
resume or silently change its trim. Grouping/render changes do not alter TTS
cache identities.

The generator uses original oscillators, seeded noise, envelopes and sparse
arrangements. No downloaded samples, vocals, recorded announcements or provider
calls. Music has an exact whole-bar period to the nearest sample. Circular note
tails and a 0.75-beat phase rotation put seams within sustained notes. Synthetic
textures use a duration-preserving periodic overlap. No silence gap is inserted.
Raw and processed seams are checked for wrap jump, derivative behavior against
nearby samples and edge-energy change; fast noise uses a relative derivative
bound rather than treating every normal adjacent noise sample as a click.

The independent `loop-static-lufs-v1` path uses measured static gain, aiming at
−20 ±0.6 LUFS with a −3 dBTP ceiling (+0.05 dB meter tolerance). Static gain keeps
the seam periodic. The pluck loop uses −20.24 LUFS to preserve peak headroom.
Full videos retain the normal measured two-pass finalizer and encoded-output
checks. Prepared TTS processing is unchanged.

`library.json` contains IDs, checksums, format, duration, kind, tempo/key, mood,
seed/version, synthesis/processing settings, measured levels/seams/spectrum and
provenance. Private recipes/raw PCM/build records are under `data/audio-assets/`.
Same-seed raw PCM was reproduced and matched all five saved hashes under the
recorded Node/Windows runtime. Processed-byte identity is limited to that pinned
toolchain; no cross-platform bit identity is promised. No dependencies were added.

Generated assets are labeled repository procedural synthesis, with no third-party
samples and **no separate exclusive-rights, clearance or zero Content ID-risk
claim**. Subtle Bass's original file, TinyWorlds CC0 record, source and license
remain untouched. Its manifest stays separate from the new library index.

The modest spectral heuristic measures energy from 200–4000 Hz. The three tracks
have about **28.9%, 49.4% and 82.9%** there, respectively. This is not a speaker
response simulation or listening-quality proof; no noise was added to satisfy a
metric. Optional room/rain are explicitly synthetic textures, not real ambience.

## Current selection controls

- `--music auto` chooses among available validated Subtle Bass + three new tracks
  using the persisted seed/recent completed-episode history. Explicit IDs and
  `none` work. Auto never generates a missing track.
- `--ambience none` is the default. Optional `--ambience soft-room-tone` or
  `--ambience gentle-rain`, with `--ambience-gain 0..1`, has independent low gains
  and ducking. The preview intentionally leaves ambience off.
- `--preset concise-v1` retains the older balance for an explicitly new job;
  `concise-v2` is the new `video` default. New variety resolves to v2; old resolved
  or interrupted B plans retain their v1 engine. Do not add variety flags on resume.
- Meaningful lesson variety/history and automated structural/linguistic checks
  remain active. Cosmetic variety is not an eligibility guarantee.

## New full convenience-store episode — proposed, NOT executed

Run this in an interactive PowerShell terminal after listening. It allocates a
fresh job/output, requests **one new image** featuring an adult woman, explicitly
selects Kore independently of that character, resolves automatic palette/motion/
music, displays the total bounds and asks for budget confirmation. No cap for
this paid episode was authorized or committed during this checkpoint.

```powershell
Set-Location 'C:\Users\david\Documents\kor-vids'
npm.cmd run video -- --scenario "Beginner Korean shopping at a convenience store: finding a snack, asking the price, requesting a bag, and paying by card." --voice kore --background new --background-character "adult woman" --palette auto --motion auto --music auto --seed "store-first-publish-01"
```

Append `--dry-run` for an offline plan instead. **Then resume its printed job ID**
rather than rerunning the source command and creating a different job:

```powershell
# Replace ACTUAL_JOB_ID with the printed ID; proposed execution, not run here.
npm.cmd run video -- --resume ACTUAL_JOB_ID --dry-run
npm.cmd run video -- --resume ACTUAL_JOB_ID
```

Unattended authorization still requires both an explicit numeric
`--max-cost-usd CAP` and `--yes`. A new ID does not grant spending. Existing
pricing-expiry checks and image-allowance limitations remain in force.

## Executed verification and preservation

Local commands executed: `music:generate` plus unchanged rerun; focused tests;
`typecheck`; full `npm test`; one partial-range `KoreanProduction` render; normal
final loudness/peak/media/full-decode checks; actual PNG inspection. New offline
job `pipeline-c-pool-01` selects concise-v2, warm-pluck-groove and motion v2,
ambience off, with a $0.22522 conditional content/review/TTS bound and $0 image.
It remains unexecuted and unauthorized. Its read-only resume and B's read-only
resume preserved job/library/catalog bytes and did not increment completed use.

Typechecking and the full suite passed **215 tests, zero failures/skips**.
The earlier focused run passed 50 A/B/C/production checks; the final suite also
covers the added legacy-engine compatibility case. No paid failure requests ran.

Evidence: `out/checkpoint-c/full-tests.log`, `focused-tests.log`, `typecheck.log`,
`music-cache-rerun.log`, `preview-verification.json`, `persistence-evidence.json`
and `protected-verification.json`. All **655 protected files** remain unchanged:
existing jobs, budgets/receipts, accepted sources, artwork, speech/alignment caches,
Subtle Bass/license, lockfile and completed videos. In particular,
`video-20261112-d95b432c`, `pipeline-b-pool-01` and the restaurant/hotel jobs were
not upgraded or executed. Historical render signatures can be stale after renderer
changes; historical MP4s/verification remain preserved, not relabeled as current.

Changed code adds procedural synthesis/library validation, selection bindings,
versioned source gains/motion, optional ambience and regression tests. The final
meter accepts an optional input filter solely for the diagnostic's speech-free
boundary fades; ordinary full production has the exact prior default filter path.
Two A assertions intentionally now expect the new-job default `concise-v2`.
No new agents, image service, scheduling or publishing were added.
