# Phase 5B: generation and content-review checkpoint

**Current development mode:** [automated review and local rendering](phase5b-automated-development.md)
supersede the mandatory human stops described in this historical checkpoint.
Manual review remains available and is the default. Paid-service opt-in,
budgets, raw-response retention and cache checks apply in both modes.

The next controlled retry is documented in
[the frozen quality experiment](phase5b-quality-experiment.md). It adds one
explicitly selected Luna profile to the same SDK path, an offline `draft freeze`
command and `--experiment` generation scope. Old results/budgets remain intact;
the original nano commands below still reuse their saved drafts.

The existing `draft` CLI now supports real OpenAI Responses Structured Outputs.
Manual `import`, `validate`, `review`, `approve`, Google ADC audio preparation,
local audio caching and Remotion rendering remain available. This checkpoint does
not approve content, synthesize speech or render new production videos.

## Commands (PowerShell)

Configure `OPENAI_API_KEY` locally in the ignored `.env`. Never paste its value
into chat or put it in JSON content. Optional `OPENAI_DRAFT_MODEL` selects the
default; `--model` overrides it. The verified model profile is
`gpt-5-nano-2025-08-07` (alias `gpt-5-nano` accepted). Unknown models fail before a
request until their support/pricing profile has been verified; there is no fallback.

```powershell
Set-Location 'C:\Users\david\Documents\kor-vids'
npm.cmd run typecheck
npm.cmd test

# No calls and no draft writes. Audience/level/scenario/asset selection live in the brief.
npm.cmd run draft -- generate --brief content/briefs/public-transit-01.json --id public-transit-01 --out drafts/public-transit-01 --dry-run

# Original authorized smoke-test commands. Existing results are reused with zero calls.
npm.cmd run draft -- generate --brief content/briefs/cafe-dessert-03.json --id cafe-dessert-03 --out drafts/cafe-dessert-03 --model gpt-5-nano-2025-08-07 --allow-paid --max-cost-usd 0.15 --budget-id phase5b-smoke-01
npm.cmd run draft -- generate --brief content/briefs/convenience-store-01.json --id convenience-store-01 --out drafts/convenience-store-01 --model gpt-5-nano-2025-08-07 --allow-paid --max-cost-usd 0.15 --budget-id phase5b-smoke-01
npm.cmd run draft -- generate --brief content/briefs/public-transit-01.json --id public-transit-01 --out drafts/public-transit-01 --model gpt-5-nano-2025-08-07 --allow-paid --max-cost-usd 0.15 --budget-id phase5b-smoke-01

# Review commands never call a model. Invalid drafts intentionally exit nonzero.
npm.cmd run draft -- review --draft drafts/cafe-dessert-03
npm.cmd run draft -- review --draft drafts/convenience-store-01
npm.cmd run draft -- review --draft drafts/public-transit-01
```

`--regenerate` explicitly permits a second request only if the original content
has not been edited and the scenario still has an attempt left. It cannot reset
the two-request limit. It passes current validation failures to the repair prompt.
A normal rerun reuses the saved draft even after a code/prompt upgrade. Human
edits are preserved and their hashes journaled in `generation/edits.json`.
Changed user inputs require a new output directory; a directory name is not a
new spending authorization. Do not change the budget ID to bypass attempt limits.

The smoke-test cap is shared across all three commands and persists in
`data/generation-budgets/phase5b-smoke-01.json`. Do not delete/reset that ledger.
An exclusive lock prevents competing processes from spending the same reservation.
After a hard process kill, inspect any `.lock`, saved response and provider usage
before manually clearing the stale lock. Uncertain billing is not retried.

## Content, code and credentials

- `scripts/generationContent.ts`: bounded prompt, approved examples/history,
  compatible transport schema and explicit adapter to the existing draft shape.
  The API supplies educational content only. Cardinalities are checked against
  existing tuple types, and API length hints reuse `CONTENT_LIMITS`. The existing
  validators remain authoritative after parsing and Unicode normalization.
- `scripts/openaiGeneration.ts`: official SDK, `responses.create`, `zodTextFormat`,
  retries disabled, persistence, conservative reservations and sanitized errors.
  Response output is saved before parsing; completed responses can resume locally.
  IDs, voices, approved asset selection, provenance, fixed CTAs and timing are code
  controlled. Generated strings are never executed or used as filesystem paths.
- `src/draftSchema.ts` / `scripts/draftWorkflow.ts`: the same review/hash/approval
  pipeline for imported and generated drafts, strict unknown-field rejection,
  exact bonus-role isolation, separate private answer key and repetition checks.
  English narration rejects Hangul and known choice romanization/word-pair
  fragments. This is a guard, not a complete language detector or Korean validator.
- `src/assets/backgrounds.ts` / `scripts/assets.ts`: real approved local assets
  only, with explicit scenario classification. Missing/mismatched non-café assets
  block production without blocking text generation or content review. Text errors
  and asset blockers are reported separately, including on invalid drafts.

`.env` loads only in the Node CLI. Nothing passes it to Remotion props. The SDK
endpoint is fixed to OpenAI, logging is off and errors do not dump SDK objects,
headers or credential-bearing messages. Existing Google ADC configuration is
unchanged. Only `openai@7.51.0` was added; existing dependency versions remain pinned.

Each private output directory contains `draft.json`, `answer-key.json`, `review.md`,
`validation.json`, `narration-plan.json`, `generation.json`, and the raw requests,
responses, text, candidates and per-attempt validation in `generation/`. Invalid
results are retained. An invalid narration plan has no renderable segments.
An API refusal/incomplete result with no complete draft has a failure review rather
than a fabricated quiz. No model-supplied approval is accepted.

The comment and follow CTAs remain separate cached segments: measured comment
duration → 45 silent frames → measured follow duration → 30-frame hold → existing
12-frame fade, at 30 FPS. Clip durations and absolute frames await later measured
audio; no timing values are invented during generation. Bonus answer data stays
in the separate private key, with no answer/reveal/explanation narration.

## Pricing and limits

Official pages checked 2026-11-04:
[model/support/pricing](https://developers.openai.com/api/docs/models/gpt-5-nano),
[current pricing](https://developers.openai.com/api/docs/pricing),
[deprecation dates](https://developers.openai.com/api/docs/deprecations),
[Responses Structured Outputs](https://developers.openai.com/api/docs/guides/structured-outputs?api-mode=responses),
[official SDK](https://developers.openai.com/api/docs/libraries).

The lowest verified available standard text model with Structured Outputs was
GPT-5 nano: $0.05/M input and $0.40/M output tokens. GPT-4.1 nano had already shut
down; GPT-5 nano itself is deprecated and scheduled to shut down 2026-12-11.
Availability/pricing must be rechecked by 2026-11-11 before further paid generation.
This is a dated, limited profile, not a claim of long-term suitability.

Default maximum output is 12,000 tokens, including reasoning. Configurable range:
2,048–16,000. The input estimate uses bounded UTF-8 request bytes plus overhead;
the reservation conservatively prices the model's entire 400,000-token input
ceiling rather than trusting an approximate tokenizer. At 12,000 output tokens:
$0.0248/request, $0.0496/scenario (two attempts), $0.1488 for six requests, under
the explicit $0.15 approval. Request bodies are capped at 96 KiB; history is capped
at 12 question summaries with two approved examples. Reasoning tokens are already
inside `output_tokens` and are not charged twice. Reported costs are estimates,
not an inspected invoice; cached input is conservatively priced at the full rate.

Before every call, the ledger checks the remaining shared cap and persists the
reservation. Missing usage and unknown billing retain the full reservation.
At most one additional request covers either a rate-limit retry or validation
repair. Authentication, permissions, credits and unsupported models are terminal;
timeouts/connections/server failures are uncertain and not blindly retried. SDK
automatic retries are disabled. There is no stronger model or paid reviewer.

## Review and next checkpoint

Read [the actual smoke-test results](phase5b-smoke-results.md) before approving any
content. Structural checks cannot establish Korean naturalness, romanization,
correct difficulty or exactly one defensible answer. No draft is approved by
these checks or by this integration.

The recommended next scenario is public transit **after human revisions/review**
and a matching manually approved image using
[the background brief](public-transit-background-brief.md). Then obtain hash-bound
content approval and any separately required Google TTS spending authorization,
prepare measured local audio and render through the existing pipeline. Verify
fit, speech timing, bonus isolation, cache reuse and media properties. **Phase 5B
is not complete until that approved non-café end-to-end episode succeeds.**
