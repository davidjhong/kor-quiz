# Phase 5B smoke-test results — content review only

Historical results follow. The later [automated development workflow](phase5b-automated-development.md)
removes mandatory human approval for that explicit mode; this report preserves
the original smoke test's outputs, limitations and spending scope.

Run: 2026-11-04 Pacific / 2026-11-05 UTC. Requested and returned model on all six
requests: `gpt-5-nano-2025-08-07`. Explicit authorization: three scenarios, at most
two requests each, shared **$0.15** cap, excluding TTS, images and stronger models.
No other paid service was invoked. The cap and attempts are preserved in the
[local ledger](../data/generation-budgets/phase5b-smoke-01.json).

**Integration implemented; three approved-quality drafts were not achieved.**
All raw results are preserved. No substantive Korean content was silently repaired
in code or manually relabeled as API generation. No draft is approved, and no new
speech or production video was produced.

| Scenario | Draft / private review | Initial validation | Additional request | Final current validation | Estimated API cost |
| --- | --- | --- | --- | --- | --- |
| New café dessert counter | [draft](../drafts/cafe-dessert-03/draft.json) / [review](../drafts/cafe-dessert-03/review.md) | FAIL (v1) | One repair, FAIL | FAIL: scenario over 40 characters; empty bonus spoken prompt; further narration/content review required | $0.00194055 |
| Convenience store | [draft](../drafts/convenience-store-01/draft.json) / [review](../drafts/convenience-store-01/review.md) | FAIL (v2) | One repair, FAIL | FAIL: bonus prompt over 100 characters; further narration/content review required | $0.00171710 |
| Public transit | [draft](../drafts/public-transit-01/draft.json) / [review](../drafts/public-transit-01/review.md) | PASS (v3), then narration-fragment guard found an issue | One repair, PASS (v4) | PASS structurally; linguistic approval NOT granted | $0.00188310 |

Total: **6 requests**, **$0.00554075 estimated**, versus $0.15 authorized. No invoice
was inspected. No network retry or stronger-model fallback occurred; three
additional requests were content/validation repairs. Each scenario exhausted its
two-request allowance. Unspent dollars do not authorize a third attempt or a new
test under a different budget ID.

| Scenario | Input tokens | Output tokens | Reasoning tokens (already inside output) | Cached input |
| --- | ---: | ---: | ---: | ---: |
| Café | 3,987 | 4,353 | 1,984 | 0 |
| Store | 4,646 | 3,712 | 1,152 | 0 |
| Transit | 4,814 | 4,106 | 1,344 | 0 |
| Total | 13,447 | 12,171 | 4,480 | 0 |

Per-attempt request IDs, exact usage, timestamps, raw outputs, validation and price
assumptions are retained in each draft's `generation/` directory and
`cost-estimate.json`. Final content hashes:

- Café: `852b9e625443da31b551517285997444768f00bb242aa6454780f89eca3bb44c`
- Store: `a55bcb2157895da6f48a89ac54d23587acf7c74f608789e5f77328f4527d2027`
- Transit: `da7dadc5ea01626898092490c11408bcd37590eed4b53c6e5c680608a6beb7e2`

## What the test showed

Initial v1 exposed field-purpose/cardinality confusion: the model produced an
extra normal question, put Korean answers into English spoken prompts, and turned
the bonus into private-review instructions. Both v1 attempts remain inspectable.
v2 added explicit field descriptions and cardinalities; both store attempts still
exceeded the bonus prompt limit. v3 sent the existing text-length limits and
English-no-Hangul constraint in the API schema. The first transit result passed
that schema but put romanized grammar fragments into English explanation speech.
The final guard now rejects known multiword fragments from choice romanization;
v4 also states that Korean breakdowns belong in written teaching points. The
one allowed transit repair removed those narration fragments.

Because the prompt/schema evolved across scenarios, this is not a controlled
comparison or a reliability rate for the final prompt. It is a small smoke test
that exposed real limitations. All historical requests/responses and versions are
saved; the initial validation reports have not been rewritten as failures/successes
under a version they did not use. A separate revalidation records the old transit
candidate against the stronger narration guard.

Deterministic repetition checks reported no repetition warnings for the final
structurally valid transit draft. Café/store schema failures prevent the full
repetition pass, so their repetition status is **not checked**, not “zero repeats.”
Semantic ambiguity is outside those checks.

## Private content-review flags — not approval

The cheap model is **not recommended for regular use from this evidence**. Even
the structurally passing transit draft needs substantive human review/revision:

- Transit Q2 A/B appear to ask the same ticket-purchase question. Q4 and the bonus
  also need distractor-uniqueness review. The bonus's “closest exit” meaning adds
  a criterion absent from its displayed prompt.
- Transit Q3 A ends in `어디예`, appears incomplete, and has mismatched romanization.
  Its answer also uses the entire 24-code-point allowance. The adapter did not
  truncate it; this is the saved model output. Q2/Q4/Q5 and bonus romanization
  have conspicuous spelling/spacing problems. A reviewer should check every row.
- Transit Q2 explanation narration contains a process aside (“without using Korean
  words in the narration”), and several other explanations give generic travel
  advice instead of the requested useful meaning plus language point.
- Café/store alternatives often appear to express the same valid request.
  Store romanization includes obvious mismatches such as an English “manually”
  fragment. Their English speech also needs review after schema failures are fixed.

These are review flags from text inspection, not native-speaker certification.
No pronunciation, tone, actual audio pacing, phone readability or rendered text
fit was assessed: no new TTS or production render ran at this checkpoint.

## Verification and blockers

- Typecheck passed. The full local runner passed **96 tests**, covering the original
  workflow and the generation tests. After final accounting/cache-reuse checks,
  all **20 focused generation checks** passed again.
- Mock/local failure tests cover invalid schema/references, Unicode duplicates,
  approval injection, bonus leakage, English romanization fragments, refusals,
  incomplete/invalid JSON, auth/permissions/quota/unsupported model, timeouts,
  rate-limit/repair sharing, persisted cost/attempt limits, response recovery,
  saved-result reuse, edit preservation, hash invalidation and asset gating.
- Real saved-result reruns for all three scenarios made **zero new API calls**,
  including the v1/v2 drafts after prompt upgrades. No API key was needed for reuse.
- No generated content approvals were stored. Existing café-friends approval,
  prepared audio and caches were preserved. Silent-render scripts remain available.
- Café uses the exact existing approved illustration. Store and transit have
  `backgroundAssetId: null` and explicit matching-asset blockers; no fake path or
  café fallback was created. Both production paths still require content approval
  and an approved matching local asset.

Next non-café candidate: **public transit, after human content revisions**. Use
the [manual background brief](public-transit-background-brief.md). A human must
resolve the flags, review the exact narration, approve the matching background
and current content hash, then authorize any needed Google TTS spending. The
existing measured-audio/render pipeline should then be tested end to end.
**Phase 5B remains incomplete until that approved non-café episode succeeds.**

[Exact CLI commands and architecture](phase5b-generation.md).
