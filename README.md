# Korean quiz videos

The separate [Pipeline Checkpoint A guide](docs/pipeline-checkpoint-a.md) documents
the new `npm.cmd run video` entry point, safe authorization, concise new-job preset
and cached mix audition. Existing `produce` commands below remain supported with
legacy defaults; this checkpoint does not implement B/C or publishing.

Create a local six-question Korean quiz from a plain-language scenario. `produce`
plans, generates content and objectives, validates, reviews automatically, prepares
cached narration and alignment, renders locally, and verifies the finished MP4.
Automated acceptance is hash-bound, not human approval or proof of correct Korean.
Manual review remains optional. Publishing is not implemented.

The requested fresh-background restaurant/Kore and hotel/Achird jobs are now
prepared: [their exact configurations, bounds and sequential execution commands](docs/fresh-production-runs.md).
That handoff also records the current native macOS alignment blocker.

## New full restaurant episode (PowerShell)

**Proposed commands for your independent test; not executed during maintenance.**
Use a new job ID and output. Select the voice before creating the job. This pins
the existing restaurant illustration, so no new image request is planned.

```powershell
Set-Location 'C:\Users\david\Documents\kor-vids'
$jobId = 'restaurant-full-01'
$voice = 'achird' # Or 'kore'; independent of the background or character.

npm.cmd run produce -- --scenario "Beginner Korean ordering food in a restaurant" --voice $voice --background generated-restaurant-379962e8db662f67 --output "out/$jobId.mp4" --job-id $jobId --dry-run
if ($LASTEXITCODE -ne 0) { throw 'Planning failed; inspect the reported error.' }

$plan = Get-Content -LiteralPath "data/production-jobs/$jobId/plan.json" -Raw | ConvertFrom-Json
$plan.stages | ConvertTo-Json -Depth 8
$plan.conservativeTotalUSD
$plan.blockers
$plan.assets.image
```

Dry run makes zero provider calls and persists the source seed and plan. Defaults
are English-speaking adult beginners, two easy/two medium/two hard questions,
with Q6 an unanswered comment bonus. Context and learning objectives are derived
with the quiz in the existing generation request; they are not invented offline.

Offline planning checked both named profiles: **$0.22522 conditional total bound**
($0 image, $0.03760 generation, $0.05640 review, $0.13122 TTS). Exact speech and
cache inventory exist only after generation/review. Inspect your job's current
plan and blockers; this estimate grants no spending authorization. Previous
preview, hotel and transit caps cover only those jobs.

**Execute only after you choose and authorize the NEW job's total cap:**

```powershell
$cap = Read-Host 'Authorized TOTAL USD cap for this new job, using a decimal point'
$capValue = [double]::Parse($cap, [Globalization.CultureInfo]::InvariantCulture)
if ($plan.blockers.Count -gt 0) { throw 'Resolve the plan blockers first.' }
if ($capValue -le 0 -or $capValue -lt [double]$plan.conservativeTotalUSD) { throw 'Cap is below the current conservative plan.' }
npm.cmd run produce -- --resume $jobId --allow-paid --max-cost-usd $cap
if ($LASTEXITCODE -ne 0) { throw 'Production stopped; inspect its saved job and error before resuming.' }

# Inspect or resume the same job; do not recreate it.
npm.cmd run produce -- --resume $jobId --dry-run
npm.cmd run produce -- --resume $jobId
```

The cap and output become immutable once authorized. Unchanged, verified output
and caches are reused with zero new provider calls. Changed dependencies require
explicit output replacement; do not add `--overwrite` to an ordinary resume.
After this maintenance layout change, older videos remain intact but their render
signature is stale. They were not rerendered.

## Tested voice profiles

| `--voice` | English | Korean |
| --- | --- | --- |
| `achird` (default) | `en-US-Chirp3-HD-Achird` | `ko-KR-Chirp3-HD-Achird` |
| `kore` | `en-US-Chirp3-HD-Kore` | `ko-KR-Chirp3-HD-Kore` |

Both use Google Cloud TTS, `chirp3-hd`, normal rate `1`, `LINEAR16`, 24,000 Hz.
Names resolve to the exact previously tested [Achird](content/voice-profiles/c-achird.json)
and [Kore](content/voice-profiles/a-baseline.json) files. No voice is inferred from
the artwork. A custom profile JSON path still works with the existing override.
Voice overrides do not change accepted educational content. Cache identity uses
the exact text, language, provider/model, selected language's voice/settings,
format and processing version. Only affected clips and downstream alignment/render
work change; matching cached clips stay reusable.

## Setup and advanced controls

Use Node 22+, existing pinned dependencies (`npm.cmd ci` on a new checkout), local
Google ADC/project configuration and an OpenAI key in ignored `.env`. Never put
credentials in content or render props. Uncached local English/Korean alignment
requires the [documented Python environment](scripts/alignment-requirements.txt).

Use exactly one source: `--scenario "..."`, `--brief path.json` for advanced
control, or `--draft draft-directory`. Other existing overrides include
`--presentation path.json`, `--no-music`, `--review-mode manual`, `--model` and
`--max-output-tokens`. New image selection is separately budgeted; specifying the
registered restaurant ID above deliberately reuses it. See [background controls
and recovery](docs/phase6-background-generation.md).

The selected style keeps Achird, illustrated bookends, compact question panels,
Hangul/romanization, aligned spoken phrases below the panel, five-second countdowns,
and the CC0 music bed at **1.25×**, applied once. Bonus ending: comment clip →
1.5-second pause → follow clip → one-second hold → fade. Rendering uses local
prepared assets and makes zero LLM/TTS/image requests.

English meanings: the current production template displays the exact spoken
English explanation in reveal captions. It does **not** display persistent
per-choice English definitions. Older illustrated silent scenes show the correct
answer's written meaning/teaching note after reveal. Countdown choices contain
only Korean and romanization; bonus has no answer/meaning/explanation captions.

## Verification, recovery and references

```powershell
npm.cmd run typecheck
npm.cmd test
```

Completed output has a sibling `.verification.json`; private job state, receipts,
plans, hashes and shared budget references are in `data/production-jobs/<id>/`.
Do not publish private job artifacts or answer keys. Preserve provider reservations
after uncertain failures; never reset ledgers or remove live locks to retry.

- [Operational details and failure recovery](docs/phase6-production.md)
- [Maintenance results, still frames and restaurant image provenance](docs/maintenance-handoff.md)
- [Restaurant preview and its actual usage](docs/restaurant-preview-results.md)
- [Hotel results](docs/hotel-01-results.md) / [transit results](docs/phase6-results.md)
- [Music license and source](public/audio/music/manifest.json)
- [Historical phase index and full previous README](docs/archive/README-before-maintenance.md)

Phone readability, pronunciation, expression and perceived mix quality require
viewing/listening. Metadata and automated linguistic review cannot establish them.
