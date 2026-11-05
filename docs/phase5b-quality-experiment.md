# Phase 5B quality retry: frozen experiment 02

This completed generation experiment is historical. Its original outputs,
revisions and spending records remain intact. The selected transit candidate
continues through [automated development review and local rendering](phase5b-automated-development.md),
which supersedes its former mandatory human approval stops in that explicit mode.

Scope: generate/review three new drafts with one economical model upgrade. The
previous six-request nano experiment, its results and exhausted limits are kept.
The user separately approved **up to $0.12** for this experiment. This excludes
Google TTS, images and rendering; it grants no content or background approval.

## Frozen inputs and model

- Model: `gpt-6-luna`, standard Responses processing, medium reasoning.
- Prompt: `phase5b-quality-v1`; schema: `phase5b-quality-education-v1`.
- Maximum output: 12,000 tokens per request, including reasoning. Maximum two
  requests per scenario (initial + retry OR validation repair), six across this
  three-scenario allowlist. SDK retries remain zero. No stronger fallback/reviewer.
- The existing three scenario briefs are reused unchanged; new IDs/directories are
  `cafe-dessert-04`, `convenience-store-02`, `public-transit-02`.
- [Plan](../content/experiments/phase5b-quality-02.json) and
  [frozen contract](../data/generation-experiments/phase5b-quality-02.json).
- Frozen experiment SHA-256:
  `40a229f9def7aa3ab269d4894b03e1c305f9605327eefd9ee305060b46165415`.

The freeze stores schema, system prompt, settings, pricing, source fingerprints,
exact brief/history/example snapshots and output/budget scope. All three use the
same contract, with only scenario data differing. Current contract/brief checks
must pass before a new request. A substantive change requires a separately named
experiment, not selectively improved results under the same label. The freeze
itself is not spending authorization. New experiments cannot relabel existing
draft directories as fresh generation.

The official [model page](https://developers.openai.com/api/docs/models/gpt-6-luna)
and [standard pricing](https://developers.openai.com/api/docs/pricing) were checked
2026-11-04. Luna supports Responses Structured Outputs, multilingual text and
medium reasoning; its standard prices are $0.10/M input and $0.50/M output tokens.
No Luna shutdown is listed in the current
[deprecation notices](https://developers.openai.com/api/docs/deprecations).
It is an inexpensive current candidate for this focused task, not a claim that
higher price establishes Korean quality. Account access is confirmed only by
successful authorized requests; an unavailable model must stop without fallback.

## Conservative cost bound

Every request body, including a repair, is limited to 96 KiB UTF-8 JSON. The input
reservation is that entire byte ceiling plus 4,096 tokens of framing allowance:
102,400 input tokens. This intentionally overestimates the bounded text/schema
payload and remains below Luna's 272K long-input pricing threshold. Input is
reserved at the higher $0.125/M cache-write rate, without assuming cache discounts.

| Bound | Amount |
| --- | ---: |
| Input: 102,400 × $0.125 / 1M | $0.0128 |
| Output: 12,000 × $0.50 / 1M | $0.0060 |
| Maximum/request | $0.0188 |
| Two requests/scenario | $0.0376 |
| Six requests total | $0.1128 |
| Separately approved cap | **$0.12** |

The fixed global endpoint uses standard processing and no tools. No regional/Fast
mode or explicit paid cache configuration is enabled. Reasoning is inside the
output limit. Reported costs remain estimates, not invoice amounts. Prices must
be reverified by 2026-11-11 before further paid calls. Legacy nano keeps its
original profile/accounting; a ledger cannot switch models/contracts. Uncertain
billing retains reservations and blocks further requests under that budget.

## Layout finding and prompt changes

No layout, font floor or schema length limit was loosened. The existing answer
row has a 60 px Hangul slot and 36 px romanization slot. Local still fixtures used
the actual `IllustratedQuestionScene` and bundled fonts, without backgrounds,
TTS or production content:

| Hangul / romanization code points | Result |
| --- | --- |
| 14 / 30 | Fits; still inspected for Hangul and clipping |
| 22 / 51 | Fails at the existing 28 px romanization floor |
| 24 / 54 | Fails at the existing 28 px romanization floor |

[Measurement report](../out/phase5b-choice-layout/results.json) and
[positive still](../out/phase5b-choice-layout/short-complete.png).
The 24-code-point cap is an upper bound, not a guarantee that every string fits.
The frozen prompt targets shorter complete utterances, roughly 12–18 code points,
and short romanization. Longer expressions must be replaced by shorter COMPLETE
expressions, never truncated or squeezed below approved readable font sizes.
Actual generated content still needs a fit check before production.

Field purposes are explicit, including public bonus text versus private key data,
written Korean teaching points versus English speech, and a zero-based answer
index. Distractors must express different tasks/items/destinations rather than
equivalent polite wording. Narration must be conversational, meaning plus one
useful language point, with no internal process instructions. Two pinned approved
examples now include their approved English explanation narration and use the
same `translation` field name as the API schema. No phrase blacklist was added.
Deterministic guards remain structural; semantic quality requires human review.

## PowerShell commands

```powershell
Set-Location 'C:\Users\david\Documents\kor-vids'
npm.cmd run typecheck
npm.cmd test

# Offline freeze (an unchanged rerun reuses the saved freeze).
npm.cmd run draft -- freeze --experiment content/experiments/phase5b-quality-02.json --out data/generation-experiments/phase5b-quality-02.json

# Zero paid requests; repeat for any of the three IDs.
npm.cmd run draft -- generate --experiment data/generation-experiments/phase5b-quality-02.json --id public-transit-02 --dry-run

# Requires the separately approved experiment scope; existing results reuse with zero calls.
npm.cmd run draft -- generate --experiment data/generation-experiments/phase5b-quality-02.json --id cafe-dessert-04 --allow-paid
npm.cmd run draft -- generate --experiment data/generation-experiments/phase5b-quality-02.json --id convenience-store-02 --allow-paid
npm.cmd run draft -- generate --experiment data/generation-experiments/phase5b-quality-02.json --id public-transit-02 --allow-paid

npm.cmd run draft -- review --draft drafts/convenience-store-02
npm.cmd run draft -- review --draft drafts/public-transit-02

# Reproduce local layout still fixtures only.
node --experimental-strip-types scripts/checkChoiceLayout.ts
```

CLI options are checked against the frozen model, cap, scenario IDs and paths.
Explicit regeneration of an already valid result is rejected for frozen
experiments, so unused repair allowances cannot silently become quality-polishing
requests. Structural repair and rate-limit handling still share the two-request bound.
There is no silent model escalation or per-command budget reset. A new output path
does not authorize additional spending. Manual import, old saved generation,
hash-bound approval, Google ADC, local audio caching and renderer paths remain.
No dependencies or working dependency versions changed for this retry.

Implementation changes are limited to the shared prompt/schema adapter,
`generationModels.ts` (verified rates/settings), `generationExperiment.ts`
(offline freeze and scope checks), the existing generation engine/CLI, private
review revision labeling, `checkChoiceLayout.ts`, focused tests and documentation.
The renderer, Google authentication, audio processing/cache and design are reused.

## Next checkpoint

After authorized generation, compare original raw results and private reviews
side by side with the old run, which used evolving prompts. That is a practical
comparison, not a controlled claim of model superiority. Keep any later human or
assistant revisions separately and regenerate review/hash if applied.

Select the best non-café content, then stop for content and matching-background
approval. Missing assets allow text review but block production. Only after both
approvals should the existing pipeline estimate missing Google TTS, obtain its
separate spending approval, prepare measured/cacheable local audio and render.
No Phase 5B completion claim is appropriate until that approved API-generated
episode passes the existing technical checks; final human viewing remains separate.
