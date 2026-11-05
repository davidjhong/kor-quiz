# PRIVATE Phase 5B quality comparison and candidate handoff

Status: content/background review checkpoint. No new content approval, Google
TTS, image generation or production video render has occurred. Local font-fit
stills were used only to evaluate the existing layout constraint.

The user separately approved **$0.12** for `phase5b-quality-02`. All three new
requests used `gpt-6-luna`, medium reasoning, 12,000 maximum output tokens,
`phase5b-quality-v1` / `phase5b-quality-education-v1`, and the exact frozen
experiment `40a229f9def7aa3ab269d4894b03e1c305f9605327eefd9ee305060b46165415`.
Each scenario passed on its first request. No repair, retry, selective
regeneration, second model or fallback was used. The original API outputs remain
unchanged. Later candidate edits are reported separately below.

This compares practical saved results. The old run used evolving prompts v1–v4,
low reasoning and a different model. The new run changed both prompt and model
configuration. **It is not a controlled estimate of model superiority**, nor do
three results establish production reliability or linguistic correctness.

## Results and costs

| Metric | Previous nano smoke test | New frozen Luna experiment |
| --- | --- | --- |
| First-attempt structural results | Café FAIL; store FAIL; transit PASS under v3, later rejected by the stronger narration guard | All three PASS |
| Additional requests | One repair per scenario | None |
| Final structural results | Café FAIL; store FAIL; transit PASS under v4 | All three PASS |
| Requests | 6 | 3 |
| Input tokens | 13,447 | 6,501 |
| Output tokens, including reasoning | 12,171 | 12,615 |
| Reasoning tokens, already included in output | 4,480 | 7,588 |
| Reported cached input tokens | 0 | 2,740 |
| Conservative generation estimate | $0.005540750 | **$0.007120125** |
| Authorized cap | $0.15 (old scope) | $0.12 (separate new scope) |

| New scenario | Input | Output | Reasoning (inside output) | Cached input | Attempts / repairs | Conservative estimate |
| --- | ---: | ---: | ---: | ---: | --- | ---: |
| Café dessert | 2,177 | 4,134 | 2,588 | 0 | 1 / 0 | $0.002339125 |
| Convenience store | 2,163 | 3,261 | 1,509 | 1,370 | 1 / 0 | $0.001900875 |
| Public transit | 2,161 | 5,220 | 3,491 | 1,370 | 1 / 0 | $0.002880125 |

The ledger conservatively prices every input token at the $0.125/M cache-write
upper rate and output at $0.50/M, without cache discounts. A cache-aware standard
estimate from reported counts is $0.006711, assuming $0.10/M uncached input,
$0.01/M cached input and no separately billed cache writes or other charges.
Neither figure is an inspected invoice. Reasoning is not counted twice.

[Shared ledger](../data/generation-budgets/phase5b-quality-02.json) ·
[Machine-readable results](../data/generation-experiments/phase5b-quality-02.results.json) ·
[Authorization record](../data/generation-experiments/phase5b-quality-02.authorization.json)

Every draft has raw request/response/text, candidate JSON, per-attempt validation,
request ID, returned model, timestamps, provenance and a `cost-estimate.json`.
All returned model identifiers matched `gpt-6-luna`. The remaining possible
requests were not used to polish results. A rerun of all three saved results made
zero new calls. The previous ledger still contains its original six attempts;
all three previous content hashes match the pre-experiment values.

## Café dessert counter

[Previous review](../drafts/cafe-dessert-03/review.md) ·
[New unedited review](../drafts/cafe-dessert-04/review.md) ·
[New draft](../drafts/cafe-dessert-04/draft.json)

| Review dimension | Previous saved result | New unedited result |
| --- | --- | --- |
| Structure / repair | Both attempts failed; scenario length and empty bonus speech remain | First PASS; no repair; final PASS |
| Korean completeness | Bonus became private-review instructions rather than a normal learner question | Complete utterances on text inspection; no obvious clipped ending spotted; human naturalness review pending |
| Distractors | Multiple menu/cake requests could fit the same context | Objects, quantities and ingredients differ clearly; all correct positions are A, which needs review |
| Romanization | Inconsistencies and mismatches remained | Q2 uses `jojak` for 조각; review against `jogak`. Q5/bonus 견과류 romanization also needs review. Check every row |
| English narration | Korean answers appeared in English question fields; bonus speech was empty | Conversational English with no observed process instructions or Korean speech fragments; some questions are overly generic without the on-screen prompt |
| Explanation usefulness | Often labels or generic advice | Meanings and useful request/counting/ingredient points; review whether Q3 fork request is really harder than Q2 slice ordering |
| Length / fit | Definite schema violations | All schema lengths pass; long bonus romanization still requires actual frame-fit inspection |
| Repetition warnings | Full pass not reached because of schema errors | No deterministic repetition warnings; repeated polite-request patterns remain a pedagogical judgment |

No assistant edits were applied to this API draft. The romanization observations
are review flags, not a native-speaker certification.

## Convenience store

[Previous review](../drafts/convenience-store-01/review.md) ·
[New unedited review](../drafts/convenience-store-02/review.md) ·
[New draft](../drafts/convenience-store-02/draft.json)

| Review dimension | Previous saved result | New unedited result |
| --- | --- | --- |
| Structure / repair | Both attempts failed on the overlong compound bonus prompt | First PASS; no repair; final PASS |
| Korean completeness | Question/romanization quality was unreliable; some malformed alternatives | Complete-looking requests on inspection; human politeness/naturalness review pending |
| Distractors | Bag and heating requests had defensible alternatives with the same meaning | Distinct items/actions/payment intentions. Card-permission versus card-payment statement should still be checked under the exact task; all answers are A |
| Romanization | Obvious mismatches, including an English “manually” fragment | Q1 `beontu` mismatches 봉투; review `bongtu`. Q1/Q2 initial `jjeotgarak` should be reviewed against `jeotgarak` for 젓가락 |
| English narration | Hangul in English explanation speech; other wording/meaning problems | No observed process/Hangul fragments, but Q1 incorrectly says “one” comes before the item; actual noun-first order is visible in the Korean |
| Explanation usefulness | Generic location/payment advice and confusing written breakdowns | Generally meaning plus a useful request/permission point. Q1 word-order claim needs correction. “Hard” location Q5 may be easier than medium permission Q4 |
| Length / fit | Definite bonus length violation | All schema lengths pass; actual full-scene fit remains untested |
| Repetition warnings | Full pass not reached | No deterministic warnings; vocabulary/grammar repetition still needs human review |

Suggested Q1 explanation speech, **not applied**: “One shopping bag, please. The
item comes first, followed by the number one and the polite request ending.”
No assistant edits were applied to the source draft. A matching store background
is missing; content review remains possible and production remains blocked.

## Public transit

[Previous review](../drafts/public-transit-01/review.md) ·
[New unedited review](../drafts/public-transit-02/review.md) ·
[New draft](../drafts/public-transit-02/draft.json)

| Review dimension | Previous saved result | New unedited result |
| --- | --- | --- |
| Structure / repair | Initial PASS under v3, then narration-fragment failure; one repair passed v4 | First PASS; no repair; final PASS |
| Korean completeness | Q3 ended in 어디예; other text/meaning alignment concerns | Short complete first-five phrases; no obvious incomplete ending spotted. The long bonus can be shortened for this layout; human review required |
| Distractors | Equivalent ticket questions, destination/exit ambiguities | Distinct locations, buying/receiving/checking, destinations and transfer/get-off/boarding tasks. Check Q5 nuance under its explicit transfer context; all answers are A |
| Romanization | Numerous conspicuous spelling/spacing errors | Much cleaner, with Q2 `maepyosomeun` mismatching 매표소는; inconsistent optional hyphens in bonus place-plus-particle forms |
| English narration | Romanized grammar fragments, then process aside after repair | No observed internal instructions or Korean fragments. Useful conversational meaning/grammar points; several questions rely on displayed context for the exact target |
| Explanation usefulness | Some generic advice rather than teaching | Meanings plus location, destination and transfer points. Written Q2 incorrectly equates a topic marker with a subject and should be clarified |
| Length / fit | Truncated-looking choice at the 24-character cap | Schema PASS; bonus romanization is relatively long. The same layout already rejected representative 51/54-character romanization at the font floor |
| Repetition warnings | No deterministic warnings on final valid draft | No deterministic warnings. Repeated location patterns are reasonable practice but actual difficulty remains a human judgment |

## Recommended non-café video candidate

Choose **public transit**, based on the complete useful phrases, clearer meaning
distinctions and more accurate explanation speech, not simply structural PASS.
Luna appears **provisionally usable for supervised drafting**, with mandatory
human Korean/romanization review and targeted editing. The three drafts do not
justify unattended approval or a reliability claim.

A separate candidate was prepared; **it is not unedited model output**:

- [Complete private candidate review](../drafts/public-transit-02-candidate/review.md)
- [Candidate JSON](../drafts/public-transit-02-candidate/draft.json) and
  [separate private bonus key](../drafts/public-transit-02-candidate/answer-key.json)
- [Exact narration plan](../drafts/public-transit-02-candidate/narration-plan.json)
- [Exact before/after revision record](../drafts/public-transit-02-candidate/revision.json)
- [Authored revision plan](../content/revisions/public-transit-02-candidate.json)

Candidate content hash:
`399899ccb71ee6597783f75fac00b8237f192197c3d8c8a8fde64c078fecd4e8`.
Original API content hash:
`5824a3b5d7a0ab035459f435d2e120ce376ee47e52a38909c95bb34d0fedcfbc`.

The candidate corrects the Q2 romanization and written topic-marker explanation,
proposes shorter **complete** bonus exit questions and matching private key
wording, and redistributes correct positions to avoid the original all-A pattern.
Hangul/romanization pairs stay together; answer mappings and the private bonus key
are updated. All first-five Korean answer speech and the entire narration script
remain unchanged. No added generation call was made for these
edits. The revision record contains 14 grouped before/after changes and is labeled
as coding-assistant work in the regenerated review. Human naturalness review of
the shorter bonus, every romanization, distractor uniqueness and actual difficulty
is still required. No approval is recorded.

The complete review includes all questions/choices, romanization, private correct
answers, meanings, explanations, teaching points and all 19 exact speech segments.
The final bonus has no answer/explanation narration or reveal data. The ending is
unchanged: “What do you think? Comment your answer!” → measured clip end plus
45 frames (1.5 s) → “Follow for more Korean!” → measured clip end plus 30 frames
(1 s) → existing 12-frame fade. Q5 goes directly to bonus through the existing
transition. Absolute frames await measured audio; no runtime is fabricated or
padded to reach the advisory 80–95-second range.

## Verification and approval boundary

- Typecheck and the **103-test** runner passed. New tests cover freeze
  integrity, common settings, scope/brief changes, old-ledger protection,
  uncertain returned models and separate/stale revision labeling. Existing
  approval, audio-cache, timing, bonus and media-inspection tests remain passing.
  After the final guard against selectively regenerating valid results, all
  **27 focused generation checks** passed again.
- Zero paid failure tests. Real generation used three requests, no repairs, no
  fallback; all three saved-result reruns made zero further requests.
- The previous draft content hashes were checked unchanged before and after this
  experiment. The original new API drafts are also preserved separately from the
  revised candidate. Existing voices, renderer, approved café illustration and
  prepared audio were not replaced. No dependencies were upgraded.
- The 24-character choice limit and font floors remain unchanged. Three local
  layout still fixtures were run; the fitting fixture was visually inspected.
  Full candidate layout, production transitions and phone readability are **not
  yet checked**. No production MP4 or audio was made.
- The candidate passes structural validation and remains **unapproved**. Its
  `backgroundAssetId` is null and the matching-public-transit asset blocker remains.
  The café background was not substituted. Use the existing
  [manual transit-background brief](public-transit-background-brief.md); no image
  generation API was called and no asset path/approval was invented.

Review the candidate and approve its content and a real matching background
before production. After those approvals, record approval against the current
hash, estimate missing Google TTS and obtain any required separate spending
approval, then prepare measured local audio and render through the existing
pipeline. Check full decode/media properties, every text/reveal/bonus transition,
overlap/truncation, the measured ending and a zero-synthesis unchanged preparation
rerun. Korean pronunciation, voice consistency, pacing and phone viewing remain
human review items.

**Phase 5B is not complete.** It requires the approved API-generated non-café
episode to render and pass the technical checks; final human viewing approval is
separate. [Exact commands and frozen configuration](phase5b-quality-experiment.md).
