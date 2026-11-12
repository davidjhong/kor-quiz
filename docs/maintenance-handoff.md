# Maintenance handoff before the independent restaurant test

This task made **zero paid calls, zero new synthesis requests, and zero video
renders**. Thirteen diagnostic PNGs were rendered from existing content/assets.
No new full episode job was created. The [primary usage guide](../README.md)
contains the proposed PowerShell restaurant workflow; those commands were not
executed during this pass. Automated acceptance, optional manual mode, shared
budgets, provider retries, caching and publishing scope are unchanged.

## Changes

- `src/CountdownRow.tsx`: one padded flex row for numeral and bar. The bundled
  font's actual glyph ink is measured before frame capture, centering it on the
  bar rather than centering a tall text line box. Colors, font sizes, bar animation
  and five-second frame calculation are preserved.
- `src/presentation.ts`: limit the compact countdown row to the available panel
  space with a 12px bottom margin and a 72px minimum row. Choice geometry and
  below-panel caption geometry are unchanged. Previously a two-line heading could
  leave a 120px footer extending below the compact panel.
- `src/IllustratedQuestionScene.tsx` and `src/PolishedQuestionPreview.tsx`: reuse
  the shared row, preserving each scene's existing colors and numeral size.
  `scripts/productionJobs.ts` includes the new component in the render fingerprint.
- `scripts/voiceProfiles.ts` and `scripts/productionPlan.ts`: resolve `--voice achird`
  and `--voice kore` to the exact existing tested JSON profiles. Custom file paths
  and the Achird selected-default file remain available. Artwork is never consulted.
- `tests/presentation-polish.test.mjs`: added compact-row fit/choice geometry,
  named-profile/default and language-specific cache invalidation checks.
- Removed compiler-confirmed unused import bindings from the existing review,
  draft, audio, preview and production modules, plus one unused local `Attempt`
  type in `scripts/openaiGeneration.ts`. No workflow or exported component was
  deleted. Strict compiler unused-binding inspection now passes.
- Consolidated current commands into `README.md`. `docs/phase6-production.md`
  retains operational/recovery details; background docs link to the primary guide.
  Complete previous README, production guide and handoff plan are preserved in
  [the archive](archive/README-before-maintenance.md), with rebased relative links.
  The old handoff path remains a pointer. Other phase records remain intact.

No disposable known-prefix render directories were found. Nothing was deleted
from media, caches, jobs, budgets, receipts, licenses or provenance. Existing
rendered MP4s remain unchanged. Their render signatures predate the countdown
change, so an old job may require explicit replacement if later rerendered;
ordinary resume should not be given `--overwrite` casually.

## Voice and English meanings: actual state

| Name | English | Korean |
| --- | --- | --- |
| `achird` (default) | `en-US-Chirp3-HD-Achird` | `ko-KR-Chirp3-HD-Achird` |
| `kore` | `en-US-Chirp3-HD-Kore` | `ko-KR-Chirp3-HD-Kore` |

Both are Google Cloud TTS `chirp3-hd`, rate 1, LINEAR16, 24000 Hz, exactly as
tested previously. Explicit selection is independent of character and background.
Cache keys already include each segment's exact text/language and only that
language's voice/settings. Changing English alone changes English keys while
preserving Korean keys; matching clips reuse their caches. Alignment/render work
depending on changed clips is invalidated. Educational acceptance stays separate.

English meanings are **partially represented, with different presentation modes**:

- Current production and question excerpts hide written reveal notes. Exact spoken
  English meaning/explanation appears as synchronized phrases below the panel
  during the explanation clip after reveal, not as a persistent definition label.
- Older illustrated silent scenes display the correct answer's `reveal.translation`
  and `teachingPoint` after reveal. They do not display these during countdown.
- Per-choice English definitions are **not implemented** in the schema or layout.
  Countdown retains Hangul/romanization and the English question/context only.
- Bonus has no public answer/meaning/explanation, stays in comment rather than
  reveal state, and never receives answer/explanation caption roles.

No meanings feature was silently added in this maintenance pass.

## Restaurant image provenance audit

Registered asset: `generated-restaurant-379962e8db662f67`.
File: [`public/backgrounds/generated-restaurant-379962e8db662f67.png`](../public/backgrounds/generated-restaurant-379962e8db662f67.png).
Real PNG: **1024 × 1536**, **2,933,905 bytes**.
SHA-256: `a9405bcdcc310ef167f3918ff66282cc308c4b5cc59c61303e3a0933e0b3aa7b`.

The decoded base64 bytes in the saved response equal `original.png` and the final
registered PNG byte for byte. Receipt and catalog checksums match. The retained
request and implementation use `client.images.generate().withResponse()` through
the direct OpenAI Images API, not the assistant-operated image tool.

- **Locally recorded request:** `gpt-image-2.6-flare`, medium, 1024×1536, PNG, n=1;
  the SDK body also requests an opaque background. This is a requested model ID,
  not proof of an unreturned model snapshot.
- **Provider response facts retained by the adapter:** created `1794460826`,
  medium/1024×1536/PNG, input 362 tokens, output 1132 tokens, total 1494.
- **HTTP request identifier from SDK response metadata:**
  `req_0f62b9ef611c4e6c8aea041f59b398cf`; response and receipt match.
  No image-object ID or returned model/snapshot ID is present in the saved response;
  the receipt explicitly records `returnedModel: null`.
- **Local cost calculation:** $0.03577 for that earlier request. It is not a
  provider-returned price or inspected invoice. No new image call ran.

[Sanitized provenance audit](../out/maintenance/provenance.json) records exact
request/response/receipt paths without exposing credentials or base64 payloads.

## Actual verification

- `npm.cmd run typecheck`: PASS. Also ran
  `node node_modules/typescript/bin/tsc --noEmit --noUnusedLocals --noUnusedParameters`: PASS.
- `npm.cmd test`: **181 passed, 0 failed**. Local fixtures/mocks only for paid
  failure paths. [Full test log](../out/maintenance/tests.log).
- Nine existing-composition stills plus four short/long compact-layout probes:
  **13 rendered and visually inspected**. No missing glyphs or clipping observed;
  centered digits/bar and unchanged readable choices/romanization in the sampled frames.
- Restaurant countdown f120/f269 has no English definition; explanation f324
  displays “The menu, please.” after reveal. Legacy café f150 has no meaning;
  f300 displays “Water, please.” and its teaching note. Hotel bonus countdown/comment
  remains neutral without meanings, highlights or explanations.
- In-memory offline plans checked both voice names against the registered
  restaurant image: no blockers, zero provider calls, image action `reuse`,
  **$0.22522 conditional bound** (image $0, generation $0.03760, review $0.05640,
  TTS $0.13122). These did not create a production job or authorize spending.
- Hash audit confirms **261 existing protected files unchanged** across the data,
  audio and background trees and top-level completed MP4s. Dependencies/lockfile
  were not edited in this pass. No active workflow, relevant test or recovery
  instructions were removed.

Representative stills:

- [Restaurant countdown at 5](../out/maintenance/frames/restaurant-countdown-5.png)
  / [at 1](../out/maintenance/frames/restaurant-countdown-1.png)
- [Crowded hotel bonus countdown](../out/maintenance/frames/hotel-01-countdown.png)
- [Short café prompt](../out/maintenance/frames/cafe-short-compact.png)
  / [long café prompt](../out/maintenance/frames/cafe-long-compact.png)
- [Short transit prompt](../out/maintenance/frames/transit-short-compact.png)
  / [long transit prompt](../out/maintenance/frames/transit-long-compact.png)
- [Production English reveal caption](../out/maintenance/frames/restaurant-explanation-caption.png)
  / [legacy written meaning](../out/maintenance/frames/cafe-written-meaning-after-reveal.png)
- [Neutral bonus comment](../out/maintenance/frames/hotel-bonus-comment-neutral.png)

[Machine-readable verification](../out/maintenance/verification.json) and
[offline voice plans](../out/maintenance/voice-plans.json) retain the evidence.
Listening, phone playback and a new full-video decode were not performed in this
cosmetic task. Pronunciation, perceived mix and phone readability remain your
independent viewing/listening checks.
