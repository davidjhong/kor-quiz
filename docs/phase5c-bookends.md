# Phase 5C — final opening and ending excerpt

Output: `out/phase5c/c-achird-bookends-excerpt.mp4`. This is an excerpt of the
accepted transit content: opening → Q3 in full → Q6 visual bonus/countdown →
comment → follow. It is not a complete six-question episode. Excerpt labels
exist only in the filename/report, not in the viewer-facing video.

The opening and follow screen have no cream panel or duplicate speech caption.
Large bundled bold Noto Sans KR uses deliberate line breaks, cream/navy outlines,
warm yellow Korean emphasis and coral accents. The opening shows meaningful text
on frame zero. Word-group entrances use cached local alignment; existing hook
audio and the three-second minimum opening are retained.

One episode-level background instance gently zooms/pans during bookends. It stays
still during question reading/countdowns and remains continuous across cuts.
Coverage bounds are tested. Question geometry, romanization, phrase captions,
Achird EN/KO, six prepared WAVs and music source gains are unchanged; music is
still **1.25×**, with the existing ducking/fades and final mix processing.

The bonus keeps all three choices neutral through reading, the full five-second
countdown, comment speech and pause. A large comment invitation with a small SVG
speech bubble occupies the existing caption band. At follow narration, the panel
gives way to full-screen display text. Comment/follow display text replaces the
duplicate phrase overlay. The 45-frame pause, 30-frame hold and 12-frame fade remain.

## Explicit zero-synthesis preview exception

The six cached Achird clips cover hook, Q3, comment and follow. There is **no
cached Achird Q6 question recording**. This preview therefore displays its existing
prompt/context/choices without question speech. It retains **151 reading frames**,
calculated from the original baseline's 4.32-second Q6 recording plus existing
settle/listening margins, then 150 countdown frames. The baseline Kore recording
is not played, substituted or copied into an Achird manifest. No answer clip,
highlight, translation or explanation is shown for the bonus. Production must
prepare the actual Achird question audio; see the Phase 6 handoff.

No synthesis, content generation, model download or other paid call is needed.
The source content/hash and automated acceptance remain unchanged. Manual review
and explicit profile overrides are preserved. Existing outputs are retained.

## Reproduce in PowerShell

```powershell
Set-Location 'C:\Users\david\Documents\kor-vids'
npm.cmd run typecheck
node --experimental-strip-types --test tests/display-bookends.test.mjs tests/phrase-captions.test.mjs tests/presentation-polish.test.mjs
npm.cmd run voice:compare -- render --config content/voice-comparison/transit-01-c-bookends.json --profile c-achird --output out/phase5c/c-achird-bookends-excerpt.mp4
Invoke-Item .\out\phase5c\c-achird-bookends-excerpt.mp4
```

The renderer refuses an existing output unless `--overwrite` is supplied. It
validates local audio and cached alignment before rendering. The selected config
contains this preview's timing-reference path and presentation settings; no
question-specific text was placed in a component.

Changed code: `BookendDisplays.tsx` and `displayBookends.ts` contain the display
scenes/motion; `VoiceComparisonPreview.tsx` reuses the existing question scene for
both Q3 and bonus. Comparison schemas/timeline and the loader carry the explicit
preview timing and alignment cues. `IllustratedBackground` accepts optional
deterministic motion. Existing classic/phrase configurations remain available.

[Phase 6 implementation handoff](phase6-handoff.md). Phase 6 is a plan only;
publishing remains Phase 7. Listening and actual phone readability have not been
assessed by this checkpoint's technical checks.

## Actual verification

- **41.467 seconds / 1,244 frames**, 1080 × 1920 / 30 FPS, H.264 / yuv420p /
  AAC. Complete audio/video decode passed before promoting the single new MP4.
- Typecheck and **25 focused tests** passed. Timing tests preserve the main
  question, full bonus reading/countdown, comment pause, follow hold and fade.
  Motion checks cover frame edges, restrained speed and continuity.
- **20 exact-index decoded frames** were inspected, plus full-size design
  stills and a detailed crop of the actual bonus/comment panel. The opening has
  text at frame zero; hook/follow screens have no cream panel or duplicate
  subtitle. Text fits above the character's face. Main question captions remain
  in the approved band. All bonus choices remain visible and neutral during
  countdown/comment/pause; sampled row fills remain white. No answer, translation,
  explanation or correct-choice marker appears in the bonus.
- Mixed audio: **−15.92 LUFS / −1.99 dBTP**, no clipping detected. Existing six
  narration clips are unchanged and do not overlap or extend beyond their scenes.
  Music source gains remain 1.25×; no time stretching or speech acceleration.
- **Zero provider calls / zero synthesis / zero new local alignments / $0 new
  paid cost.** Six prepared clips and six cached alignment entries reused. Earlier
  videos, content, private key, manifests, spending ledger and asset checksums
  are preserved. No other voice variant or full episode was rendered.

[Verification JSON](../out/phase5c/c-bookends/verification.json) ·
[Opening](../out/phase5c/c-bookends/frames/opening-full.png) ·
[Bonus/comment](../out/phase5c/c-bookends/frames/comment-invitation.png) ·
[Follow](../out/phase5c/c-bookends/frames/follow-full.png)
