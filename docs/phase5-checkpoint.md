# Phase 5 checkpoint 1 — ready for human content review

Prepared on 2026-11-04. This checkpoint stops with a concrete **unapproved** new
episode. It has not been synthesized or rendered. The Phase 4 ending fix is complete.

## Review these files

- [Draft JSON](../drafts/cafe-friends-02/draft.json)
- [Private review document](../drafts/cafe-friends-02/review.md): all six questions,
  choices, romanization, private correct answers, meanings, explanations, warnings,
  exact spoken text, voice settings and a linguistic-review checklist.
- [Validation report](../drafts/cafe-friends-02/validation.json)
- [Narration review plan](../drafts/cafe-friends-02/narration-plan.json), with separate cache identities for comment/follow clips and pending measured durations
- [Cost estimate](../drafts/cafe-friends-02/cost-estimate.json), bound to the revised content hash
- [Separate bonus answer key](../drafts/cafe-friends-02/answer-key.json)
- [Scenario brief](../content/briefs/cafe-friends-02.json)
- [Locally authored import source](../content/authored/cafe-friends-02.json)

The new episode teaches greeting staff, ordering one coffee, ordering a hot coffee,
adding milk, asking where to leave an empty cup, and requesting permission to charge
a phone. All questions differ from the existing episode. The exact answer mapping
is in the private review/key. No new background is needed.

## Implemented workflow

This milestone uses local authoring/import with no LLM generation API or fallback.
The brief accepts scenario, audience, level and an approved episode-level asset ID.
The authored source contains quiz data, a narration script and a separate private
bonus-key object. Import writes the key to its own file; `draft.json` contains no
bonus answer reference, explanation, reveal or suggested-comment data.

The wording revision keeps all visible questions, contexts, choices, romanizations
and correct-answer references. Optional validated `spokenPrompt` fields contain
the exact shorter question narration, so useful context is not automatically read
aloud. The five English explanations contain no romanized Korean; Korean answers
remain separate `ko-KR` segments using the existing Korean voice. Q5's written
explanation and full-question teaching point are corrected in both source and draft.

`src/draftSchema.ts` reuses existing question, choice, length, narration and asset-ID
schemas. Validation enforces six questions, ordered easy/easy/medium/medium/hard/hard,
three choices, integer answer references 0/1/2 (displayed as A/B/C), required paired
romanization, meanings/teaching points for questions 1–5, matching approved background
IDs and a separate valid key for question 6. Choices compare NFKC-normalized Hangul
without whitespace, so spacing variants do not become fake distractors.

The revised bonus permits only `question`, `comment` and `follow` narration, in that
order. The last two texts must be exactly “What do you think? Comment your answer!”
and “Follow for more Korean!” Any answer/explanation segment, bonus
reveal data or extra model-supplied `approved` field fails validation. The renderer
adapter supplies fixed unused placeholders for legacy-required bonus fields; the
actual bonus answer and teaching explanation never enter video props. Its correct
choice still appears normally among the three unmarked choices.
Explicit answer-letter hints and Hangul answer text in the English bonus prompt
are rejected as well; semantic hints still require the human checklist.

After the countdown, show “Comment your answer 💬” during comment narration and
the following **45-frame / 1.5-second pause**. At the follow clip's start, switch to
“Follow for more Korean ✨”. After that clip finishes, hold for **30 frames / one
second**, then use the existing 12-frame fade. Choices stay visible and neutral.
Both clips have separate cache keys and will receive measured durations during
future approved preparation. No new durations or absolute frames are fabricated
for this review. Existing demo endings remain compatible with their cached audio.

**Structural validation cannot prove Korean accuracy/naturalness, appropriate
politeness, romanization pronunciation, difficulty or semantic answer uniqueness.**
Those judgments remain in the human checklist. Similar choices can be intentional
contrasts; every distractor needs human review even if no automatic warning appears.

## Approval and local repetition history

Approval lives separately in `data/approvals/<content-hash>.json`, not in generated
content. The SHA-256 binds every draft field, exact narration text/profile/settings,
brief/provenance and the private answer key. JSON formatting/key-order changes do
not alter the hash; changes to field values do. A changed draft cannot use an old
approval. The approval CLI requires a reviewer, explicit checklist acknowledgment
and the exact reviewed hash. No real approval was created for this new draft.

Production `audio:prepare --draft` and `render:narrated --draft` enforce approval
before preparing assets or starting Remotion. `--input` narration is restricted to
hash-pinned existing demos in `data/legacy-demos.json`; extracting a new draft's
quiz/script into raw JSON does not evade that gate. The existing silent rendering
tools remain available for visual review and make no speech/generation calls.

Each separate approval record also stores episode/question IDs, scenario, normalized
question text and taught Korean phrases. These records are the simple local history;
there is no database, embedding or provider router. Existing approved demo content
is a labeled baseline. Exact duplicate normalized questions within one draft are
errors. Prior exact ID/text repeats, deterministic token-overlap near-duplicates and
taught-phrase reuse are warnings for review. Vocabulary reuse is permitted when
the task/context differs. Approval of intentional reuse must be a human decision.

## Commands

Run from the repository root in PowerShell. Import is resumable: unchanged source
and brief preserve saved draft edits and refresh the review/report. A changed source
requires a new directory or explicit `--replace`; edits are not silently discarded.
Invalid drafts with the expected import envelope are saved with validation failures
and a readable review. Unknown envelope keys are rejected. `--dry-run` writes nothing.

```powershell
Set-Location 'C:\Users\david\Documents\kor-vids'

# Dry-run, then import the locally authored episode. No paid requests.
npm.cmd run draft -- import --source content/authored/cafe-friends-02.json --brief content/briefs/cafe-friends-02.json --out drafts/cafe-friends-02 --dry-run
npm.cmd run draft -- import --source content/authored/cafe-friends-02.json --brief content/briefs/cafe-friends-02.json --out drafts/cafe-friends-02

# Validate and regenerate the private human-review files.
npm.cmd run draft -- validate --draft drafts/cafe-friends-02
npm.cmd run draft -- review --draft drafts/cafe-friends-02
Get-Content -Raw -Encoding UTF8 .\drafts\cafe-friends-02\review.md

# Unapproved drafts may be cost-estimated, but cannot prepare/render production audio.
npm.cmd run audio:prepare -- --draft drafts/cafe-friends-02 --output public/audio/cafe-friends-02/manifest.json --estimate
# Save the same estimate as a review artifact (no audio preparation):
npm.cmd run audio:prepare -- --draft drafts/cafe-friends-02 --output public/audio/cafe-friends-02/manifest.json --estimate --report drafts/cafe-friends-02/cost-estimate.json
```

Only a human who has completed the review checklist should run the approval command
below. Regenerate/re-read the review after editing; the command rejects a stale hash.
It grants content approval only, not permission for unbounded spending.

```powershell
$reviewHash = (Get-Content -Raw -Encoding UTF8 .\drafts\cafe-friends-02\validation.json | ConvertFrom-Json).contentHash
npm.cmd run draft -- approve --draft drafts/cafe-friends-02 --reviewer "David" --confirm-hash $reviewHash --confirm-review
```

After human content approval **and a separate TTS spending approval**, the following
are the production commands. **They were not run for this new draft.** The proposed
$0.05 cap is not currently authorized; it covers the current worst-case retry
estimate. Re-estimate if any narration or voice settings change.

```powershell
npm.cmd run audio:prepare -- --draft drafts/cafe-friends-02 --output public/audio/cafe-friends-02/manifest.json --synthesize --max-cost-usd 0.05

# Repeat without synthesis: unchanged work must report zero new requests.
npm.cmd run audio:prepare -- --draft drafts/cafe-friends-02 --output public/audio/cafe-friends-02/manifest.json

# Preflight only, then production render. Neither command invokes LLM/TTS.
npm.cmd run render:narrated -- --draft drafts/cafe-friends-02 --audio-manifest public/audio/cafe-friends-02/manifest.json --output out/cafe-friends-02.mp4 --dry-run
npm.cmd run render:narrated -- --draft drafts/cafe-friends-02 --audio-manifest public/audio/cafe-friends-02/manifest.json --output out/cafe-friends-02.mp4
```

The first render refuses an existing output; use `--overwrite` explicitly to replace
it. Existing demo commands still work, including:

```powershell
npm.cmd run render:cafe -- --input content/cafe-six.json --output out/cafe-six-comment-challenge.mp4 --overwrite
npm.cmd run render:narrated -- --input content/cafe-six.json --audio-manifest public/audio/cafe-six/manifest.json --output out/cafe-six-narrated-ending.mp4 --overwrite
```

## Costs, failure handling and future captions

The saved provenance records local import, provider `local-authoring`, no API model,
prompt version `phase5-local-v1`, timestamp/source hash, null reported API usage and
zero **additional generation API** cost. No LLM provider is implemented or called.

The revised draft's cost-only run found one reusable clip (the hook) and 18 missing
segments totaling **679 characters**. At the existing Google Chirp 3 HD
[$0.00003/character rate](https://cloud.google.com/text-to-speech/pricing), that is
**$0.02037**, or **$0.04074** allowing one rate-limit retry per missing segment,
before any eligible free allowance. These are estimates, not reported billed usage.
The earlier episode/audition scopes do not authorize this new episode's synthesis.

Existing preparation retains explicit opt-in and cost-cap checks, ADC without token
logging, bounded timeouts and one rate-limit retry. Preflight now includes potential
retry costs in the required budget; actual attempt counters are retained. Uncertain
outcomes are not blindly retried. Cache keys include all synthesis inputs, and
successful originals/clips are reused on resume. No failures were tested with paid
calls. Missing/corrupt/stale media fail before rendering, and new-draft manifests
must match the exact approved narration text/profile.

Prepared manifests retain exact text, language, audio file, checksum and measured
duration. The **same** `getNarratedTimeline` used by the renderer returns their frame
spans. Each render exports `<video>.timeline.json` with those exact segments and
question boundaries; a real-output check confirmed equality with the assembled
timeline. Future sentence captions can consume this data. No second timing
calculation, caption overlay, subtitles, transcription or alignment was added.

## Phase 4 ending fix and actual checks

[Updated MP4](../out/cafe-six-narrated-ending.mp4),
[timeline](../out/cafe-six-narrated-ending.timeline.json),
[verification](../out/phase4-ending-review/verification.json).

The approved English voice now says the fixed invitation after the bonus countdown.
The CTA is measured at **4.08 seconds**, reserved frames **3137–3260**. It starts
at 104.567 seconds, after the countdown ends at 104.367 seconds. Choices/comment
remain through frame 3290 (109.667 seconds), followed by a 12-frame fade. Full video
is **3302 frames / 110.067 seconds**; AAC/container is 110.080 seconds, within the
existing MP4 tolerance. The 80–95-second target is advisory. The 65-second minimum
and overlap/truncation checks remain enforced. All earlier question/countdown
boundaries and Q1–Q5 hold ends are unchanged.

Preparation reused 17 clips and made exactly one new 44-character request,
estimated **$0.00132**, under the $0.003 sub-cap and original $0.03 episode cap.
Cumulative new-episode estimate is $0.01842, excluding the earlier audition's
separately authorized usage. No invoice was inspected. No retry was needed. The
unchanged preparation rerun had **18 cache hits and zero requests**. Rendering used local clips, made no TTS/LLM calls,
and passed full video/audio decoding and H.264/yuv420p/AAC, 1080×1920/30 FPS checks.
The CTA measured −16.35 LUFS / −1.49 dBTP; encoded program −16.39 LUFS / −4.46 dBTP.
Inspected frames before the comment, during speech and at the final hold: choices
stay neutral/visible, the comment invitation fits, and no bonus answer is exposed.
Actual listening/phone playback remains human review.

Typecheck passed. The current full runner passed **76 tests**, including focused
draft tests for invalid answer references, Unicode/spacing duplicates, bonus
disclosure, hash invalidation, unapproved production CLI blocking, local history,
dry-run/resume and saved invalid reports. Existing mocks/local fixtures cover
network/retry failures and audio-cache corruption/missing/stale data. The wording
revision additionally verifies independent spoken prompts, unchanged legacy audio
fingerprints, separate comment/follow cache keys, exact 45-frame and 30-frame gaps,
CTA text boundaries and a neutral bonus through the final hold. All **69 existing
audio/cache files** have the same combined content hash before and after this work.
No synthesis or video render was performed for the revision. No heavyweight test
framework or dependency version change was introduced.

Changed code is limited to the new local draft schema/workflow/CLI, approval and
baseline JSON, the new authored draft/brief/review artifacts, CTA/timeline additions,
production approval gates, focused tests and documentation. Stop at human content
review. The new episode has no approval record, audio manifest or rendered MP4.
