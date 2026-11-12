# Two prepared full production runs

**Prepared, not executed. Zero provider calls and no paid authorization stored.**
Both requested IDs and outputs were absent, so the exact requested IDs were used.
Initial and resume dry runs succeeded sequentially on Windows. Both image actions
are **generate**, not reuse. Full production is selected through `--scenario`;
`--preview-question` is not used.

| Job / output | Voice | New image character | Image | Quiz | Review | TTS | Conditional total |
| --- | --- | --- | ---: | ---: | ---: | ---: | ---: |
| `restaurant-fresh-01` / `out/restaurant-fresh-01.mp4` | `kore` | adult woman | $0.505115 | $0.037600 | $0.056400 | $0.131220 | **$0.730335** |
| `hotel-fresh-01` / `out/hotel-fresh-01.mp4` | `achird` | adult man | $0.504675 | $0.037600 | $0.056400 | $0.131220 | **$0.729895** |

Each total includes one new medium-quality `gpt-image-2.6-flare` PNG at
1024×1536, at most two quiz-generation requests, three automated-review requests
(review/correction/verification), and 38 TTS requests including bounded retries.
TTS is a schema ceiling; exact text and cache savings await generation/review.
Image allowance is deliberately conservative; the Images API has no output-token
cap, so this is not a provider-enforced invoice limit. Existing accounting stops
downstream spending on unexpected usage. No extra image or aesthetic retry is
authorized by planning. **$0.74 per job** would cover each current conditional
plan, but you choose the actual separate caps when executing. No prior episode's
or preview's authorization is reused.

## Persisted configurations

- Restaurant scenario: “Beginner Korean ordering dinner at a restaurant, including
  choosing a dish, ordering a drink, adjusting an order, and asking for the bill.”
  Voices: `en-US-Chirp3-HD-Kore` / `ko-KR-Chirp3-HD-Kore`.
- Hotel scenario: “Beginner Korean checking into a hotel and asking about breakfast,
  Wi-Fi, luggage storage, and checkout.”
  Voices: `en-US-Chirp3-HD-Achird` / `ko-KR-Chirp3-HD-Achird`.

Both keep Google Chirp normal rate 1, LINEAR16/24000 Hz preparation, the selected
presentation, six-question easy/easy/medium/medium/hard/hard progression, an
unanswered sixth bonus, phrase captions, bookends, five-second countdowns, music
gain 1.25× applied once, and automated acceptance. Character selection is independent
of narrator selection. The image schema now explicitly accepts `adult man`; no
new flag was invented. Future hotel prompts explicitly request a reception lobby.

The normal CLI persisted the exact image prompts/settings and distinct request
hashes in each job's `config.backgroundBinding`. Selection remains bound on resume:

- [Restaurant job](../data/production-jobs/restaurant-fresh-01/job.json),
  [seed brief](../data/production-jobs/restaurant-fresh-01/brief.json),
  [plan](../data/production-jobs/restaurant-fresh-01/plan.json).
- [Hotel job](../data/production-jobs/hotel-fresh-01/job.json),
  [seed brief](../data/production-jobs/hotel-fresh-01/brief.json),
  [plan](../data/production-jobs/hotel-fresh-01/plan.json).

No questions, learning objectives or narration have been invented in the offline
seed. The existing generation request will derive them. Accepted content, images,
receipts, audio and spending ledgers will be recorded through the existing workflow.

## Windows PowerShell — execute these prepared jobs sequentially

**These execution commands have not been run.** Enter a separate total cap for
each job. Hotel starts only if restaurant completes successfully. Never background
these commands or use `Start-Job`/parallel execution.

```powershell
Set-Location 'C:\Users\david\Documents\kor-vids'

# Optional: refresh the zero-call plans before choosing caps.
npm.cmd run produce -- --resume restaurant-fresh-01 --dry-run
if ($LASTEXITCODE -ne 0) { throw 'Restaurant planning failed.' }
npm.cmd run produce -- --resume hotel-fresh-01 --dry-run
if ($LASTEXITCODE -ne 0) { throw 'Hotel planning failed.' }

# Inspect all per-stage bounds, total and blockers.
foreach ($id in @('restaurant-fresh-01','hotel-fresh-01')) {
    $plan = Get-Content -LiteralPath "data/production-jobs/$id/plan.json" -Raw | ConvertFrom-Json
    $id
    $plan.stages | ConvertTo-Json -Depth 8
    $plan.conservativeTotalUSD
    $plan.blockers
}

$restaurantCap = Read-Host 'Authorize restaurant-fresh-01 TOTAL USD cap (current bound 0.730335)'
$hotelCap = Read-Host 'Authorize hotel-fresh-01 TOTAL USD cap (current bound 0.729895)'

npm.cmd run produce -- --resume restaurant-fresh-01 --allow-paid --max-cost-usd $restaurantCap
if ($LASTEXITCODE -ne 0) { throw 'Restaurant stopped. Inspect it before starting hotel.' }
npm.cmd run produce -- --resume hotel-fresh-01 --allow-paid --max-cost-usd $hotelCap
if ($LASTEXITCODE -ne 0) { throw 'Hotel stopped. Inspect the saved job/error.' }
```

The existing ledger enforces the caps before requests; below-bound caps stop
before image spending. Once authorized, a job's total cap cannot be changed on
resume. A failed content review may stop an episode even when money remains.

Resume unchanged, including after completion, **sequentially**:

```powershell
npm.cmd run produce -- --resume restaurant-fresh-01
if ($LASTEXITCODE -ne 0) { throw 'Inspect the restaurant job before continuing.' }
npm.cmd run produce -- --resume hotel-fresh-01
if ($LASTEXITCODE -ne 0) { throw 'Inspect the hotel job.' }
```

Do not rerun the original source-creation commands for these existing IDs. Do not
pass `--background new` again on resume; the saved fresh-image request is already
bound. Do not add `--overwrite`, reset ledgers or replace immutable sources to retry.

## macOS zsh — syntax and current native blocker

**Native macOS full execution is currently BLOCKED; do not start paid stages on a
Mac yet.** `scripts/localAlignment.ts` selects
`.audio-cache/alignment-venv/Scripts/python.exe`, while `alignNarration.py` strictly
requires the pinned `torch`/`torchaudio` `2.8.0+cpu` builds. Native macOS needs a
platform-aware Python path and a tested, separately keyed compatible alignment
configuration/requirements. This preparation pass does not silently change
alignment engines, dependency versions or cache identity. No macOS runtime test ran.

Persisted jobs also contain absolute native paths. These Windows-prepared
manifests must not simply be copied/edited for Mac execution. On a fresh Mac
checkout, prepare native jobs with the following **zero-call** commands only when
those IDs do not already exist. Preserve any existing job; inspect its configuration
and use a distinct unused ID/output if it differs. Choose one execution machine per
job rather than duplicating paid runs on both platforms.

```zsh
cd /your/local/path/kor-vids

npm run produce -- --scenario "Beginner Korean ordering dinner at a restaurant, including choosing a dish, ordering a drink, adjusting an order, and asking for the bill." --voice kore --background new --background-character "adult woman" --image-model gpt-image-2.6-flare --image-quality medium --review-mode automated --output out/restaurant-fresh-01.mp4 --job-id restaurant-fresh-01 --dry-run
npm run produce -- --scenario "Beginner Korean checking into a hotel and asking about breakfast, Wi-Fi, luggage storage, and checkout." --voice achird --background new --background-character "adult man" --image-model gpt-image-2.6-flare --image-quality medium --review-mode automated --output out/hotel-fresh-01.mp4 --job-id hotel-fresh-01 --dry-run
```

The exact zsh execution/resume invocations below are supplied for after native
alignment readiness is fixed and tested, **not as a claim that Mac production now
works**. Reinspect native plans; do not authorize spending just from a Windows total.

```zsh
# NOT READY on native macOS: resolve the alignment blocker first.
read 'restaurantCap?Authorize restaurant-fresh-01 TOTAL USD cap: '
read 'hotelCap?Authorize hotel-fresh-01 TOTAL USD cap: '

npm run produce -- --resume restaurant-fresh-01 --allow-paid --max-cost-usd "$restaurantCap" && \
npm run produce -- --resume hotel-fresh-01 --allow-paid --max-cost-usd "$hotelCap"

# Inspect saved plans, or resume unchanged after success:
npm run produce -- --resume restaurant-fresh-01 --dry-run && \
npm run produce -- --resume hotel-fresh-01 --dry-run

npm run produce -- --resume restaurant-fresh-01 && \
npm run produce -- --resume hotel-fresh-01
```

## Actual checks and blockers

- Windows initial dry runs: 2 PASS; unchanged resume dry runs: 2 PASS. Zero provider
  calls throughout; `paidOptIn` remains false, no budget ledgers or MP4s created.
- Both plans: `assets.image.action: generate`, maximum one new image, distinct
  bound image IDs, no CLI blockers. The local Windows alignment environment and
  cached base model are present. Provider credentials/access were not tested.
- Typecheck PASS; **36 focused production/background tests PASS**, including
  explicit adult woman/man selection, fresh selection despite an existing matching
  image, durable bindings, budget enforcement, review, recovery and privacy checks.
- Native macOS alignment and job-path portability limitations are identified above.
  Pricing profiles also expire: generation/review/TTS from **2026-11-17 UTC**,
  images from **2026-11-18 UTC**. Existing guards require reverification before new
  paid requests after those dates; do not bypass them.

[Verification/configuration summary](../out/fresh-production-runs/verification.json).
Logs are under `out/fresh-production-runs/`. No images, audio, videos or publishing
actions were produced. [General usage and recovery](../README.md).
