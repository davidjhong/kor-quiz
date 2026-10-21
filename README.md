# Korean quiz videos

## Phase 2, checkpoint 1: typed content and one reusable scene

`CafeQuestion` renders **only the first question**, using the new `QuestionScene` component. The original `KoreanSample` composition, source, output path, and commands remain available for comparison. Dependencies, lockfile, and encoding settings are unchanged.

### Separation of responsibilities

- `src/QuizQuestion.ts`: compile-time content contract. A readonly tuple requires exactly three choices; `0 | 1 | 2` restricts the correct-answer index. IDs are stable identifiers, independent of array position. This type does not validate runtime JSON or prove linguistic accuracy.
- `src/content/cafeQuestions.ts`: three hardcoded questions with no rendering logic. These are drafts pending human linguistic review.
- `src/questionTiming.ts`: 30 FPS, reading/countdown/reveal durations, animation durations, derived frame boundaries, and a pure function calculating scene state.
- `src/QuestionScene.tsx`: presentation only. Receives `question` as props, reads the Remotion frame, and displays the question, choices, countdown, and explanation. It uses the existing local fonts and visual palette.
- `src/Root.tsx`: registers both compositions and supplies the first question to `CafeQuestion`. The new composition gets its frame count and FPS from the timing module.
- `tests/question-timing.test.mjs`: tests phase boundaries, one-second countdown digits, ring progress, and scene duration using Node's built-in test runner.
- `package.json`: adds `test`, `render:question`, and `inspect:question`; all original commands remain intact.

No timers, randomness, network requests, or content generation occur in the scene. Reuse the component with different typed content by passing a different `question` prop. Arbitrary long-content fitting and runtime validation are later checkpoints; this checkpoint checks the first question's layout visually.

### Questions for linguistic review

| ID / scenario | English prompt | A | B | C | Correct |
| --- | --- | --- | --- | --- | --- |
| `cafe-request-water` / At a cafe counter | Ask the barista to give you water. | 물 있어요. | 물 주세요. | 물 마셔요. | B |
| `cafe-takeaway` / Choosing takeaway | You want your drink to go. What do you say? | 여기서 마실게요. | 다 마셨어요. | 포장해 주세요. | C |
| `cafe-without-ice` / Customizing your drink | Order your drink without ice. What do you say? | 얼음 빼 주세요. | 얼음 더 주세요. | 얼음 넣어 주세요. | A |

The stored explanations are:

1. 물 주세요 means “Water, please.” 주세요 politely asks someone to give you something.
2. 포장해 주세요 asks for takeaway. 여기서 마실게요 means you will drink it here.
3. 얼음 빼 주세요 asks to leave out the ice. 빼 주세요 asks for something to be removed or omitted.

The prompts specify the desired action; the distractors express different actions rather than competing levels of politeness. Other natural phrasings can exist outside these choices. Review the Korean wording and explanations before treating the content as approved. Questions two and three are stored but are not rendered in this checkpoint.

### Run this checkpoint in PowerShell

```powershell
Set-Location 'C:\Users\david\Documents\kor-vids'
npm run typecheck
npm test
npm run render:question
npm run inspect:question
Invoke-Item .\out\cafe-question.mp4
```

No installation or lockfile update is required. Tests use Node 22's `--experimental-strip-types` flag to import the pure TypeScript timing module; an experimental-feature warning is expected on Node 22.13.1. Node may also report that it detected ES module syntax in that file. Neither warning is a test failure. Type stripping executes the module but does not typecheck it, so run `typecheck` as well.

The render command retains H.264, `yuv420p`, BT.709, CRF 18, concurrency 2, and 1080 × 1920 at 30 FPS. Expected FFprobe output: **390 frames**, **13.000000 seconds**, `h264`, `yuv420p`, `1080` / `1920`, and `30/1`.

| Period | Frames (inclusive) | Behavior |
| --- | --- | --- |
| Reading | 0–89 | All three choices appear; timer displays `?` |
| Countdown | 90–239 | 5, 4, 3, 2, 1; each lasts 30 frames |
| Reveal / explanation | 240–389 | B turns green; A and C dim; explanation fades in over 12 frames |

`durationInFrames` is calculated from the sum of reading, countdown, and reveal durations; it is not separately hardcoded in the composition. Animation fade durations are also centralized. In Studio (`npm run dev`), select `CafeQuestion` and compare **frame 239** (countdown `1`, no highlighted choice), **frame 240** (B highlighted, explanation starts fading), and **frame 252** (explanation fully visible). Check Hangul, line wrapping, and the final frame 389. Play the full MP4 to assess readability and pacing on your phone.

For the original sample, continue to use `npm run render`, `npm run inspect`, and `out/korean-sample.mp4`. Stop after reviewing this one-question scene before assembling a full quiz.

Checkpoint verification completed: typechecking and all five timing tests passed; the new composition rendered successfully; FFprobe reported the expected codec, pixel format, dimensions, FPS, 390 frames, and 13-second duration. A full FFmpeg decode completed without errors. Frames extracted from the MP4 during reading, before/at reveal, after the explanation fade, and at the end showed legible Hangul, no visible clipping, and B highlighted at reveal. The original sample source and lockfile are unchanged. Human linguistic review and full playback for mobile readability/pacing remain outstanding.

## Phase 1 reference

A single, silent, 12-second video rendered locally: 1080 × 1920, 30 FPS, H.264 MP4 with the broadly supported `yuv420p` pixel format. It asks how to request water at a cafe, counts down, and highlights **물 주세요.** (“Water, please.”).

This checkpoint establishes the renderer. The three-question template, JSON/Zod validation, narration, AI services, and publishing belong to later phases.

## How rendering works

React describes the text, cards, and SVG countdown ring. Remotion supplies a frame number to the component. At 30 FPS, frame 60 is two seconds into the video. The component calculates its appearance from that frame number, so frames can be rendered independently and in parallel without timers or animation state.

The CLI bundles the TypeScript/React source, opens its managed headless Chrome browser, captures the frames, and encodes them using its bundled media tools. The result is an ordinary MP4; no running web server is needed to play it. The renderer makes no content-generation or external font requests. Initial package and browser installation require internet access.

Direct FFmpeg rendering is excellent for encoding, trimming, and combining media. For this project's animated bilingual cards, React/CSS makes layout and iteration easier than a growing FFmpeg filter graph. Use Remotion for visuals and FFmpeg/FFprobe for media processing and inspection.

## Tools and dependencies

The initial machine has Windows x64, Node **22.13.1**, npm **11.1.0**, and Git **2.47.1**. No standalone FFmpeg or FFprobe was found on PATH. Node 22 meets Remotion's documented minimum of Node 16; this project sets Node 22 as its own minimum.

- `react` and `react-dom`: describe and render the visual layout.
- `remotion`: composition metadata and frame-based animation helpers.
- `@remotion/cli`: preview Studio, bundle, render, and bundled FFmpeg/FFprobe commands. Its version matches `remotion` exactly.
- `typescript`, `@types/react`, `@types/react-dom`: static checks while developing; they do not appear as video content. TypeScript 5 is sufficient for this small project.
- `@fontsource/noto-sans-kr`: local Korean and Latin font files in regular and bold weights. Font assets are bundled rather than fetched from Google during rendering. The font package includes its license.

Direct dependency versions are pinned in `package.json`; `package-lock.json` pins the resolved dependency tree. Keep both files in source control. Use `npm ci` to recreate that tree.

## Files

```text
src/index.ts          Registers the React root with Remotion
src/Root.tsx          Defines the composition ID, size, FPS, and frame count
src/KoreanSample.tsx  Hardcoded sample visuals and frame-based timing
package.json         Dependencies and simple npm commands
package-lock.json    Exact dependency resolution
tsconfig.json        Strict TypeScript settings
.gitignore           Excludes packages, build files, video outputs, and secrets
```

No custom render service or CLI is needed yet. The two-renderer concurrency limit keeps this first render's resource use modest. The render command explicitly selects BT.709 (the HD video color space) and limited-range `yuv420p`, rather than depending on Remotion's color defaults.

## Run locally in PowerShell

The project files are already created. From a fresh checkout, install the locked dependencies and the browser once:

```powershell
Set-Location 'C:\Users\david\Documents\kor-vids'
npm ci
npm run browser:ensure
```

Build and render:

```powershell
npm run build
npm run render
npm run inspect
```

`build` checks types and produces a browser bundle in `build/`. `render` bundles the source itself and writes `out/korean-sample.mp4`; you do not need to run `build` every time you render. A failed command returns a nonzero exit code: fix it before moving to the next command.

To preview and scrub the timeline interactively:

```powershell
npm run dev
```

Open the local URL printed by Remotion, then select `KoreanSample`. Stop the preview server with Ctrl+C. It is not required for command-line rendering.

## Verify the milestone

`npm run inspect` calls the bundled FFprobe. Expect:

| Property | Expected value |
| --- | --- |
| codec_name | h264 |
| width / height | 1080 / 1920 |
| pix_fmt | yuv420p |
| avg_frame_rate | 30/1 |
| nb_frames | 360 |
| duration | 12.000000 seconds |

There is intentionally no audio track in this phase. AAC will be relevant when audio is introduced.

Open the MP4 in your normal video player:

```powershell
Invoke-Item .\out\korean-sample.mp4
```

Check the complete playback:

- **0–2 s:** question and both Korean choices are readable; the timer displays `?`.
- **2–7 s:** the ring empties and the digits display 5, 4, 3, 2, 1, each for one second.
- **7–12 s:** answer A turns green and the English meaning and short explanation fade in. Answer B dims.
- Hangul appears as complete characters, with no missing-glyph boxes, clipped text, or overflow.

For exact boundary inspection in Studio: frame 60 starts `5`; 90 starts `4`; 120 starts `3`; 150 starts `2`; 180 starts `1`; 209 is the final countdown frame; 210 highlights A and begins the explanation fade; 222 finishes the fade. The final frame is 359.

FFprobe confirms media metadata, not readability. Playing the video and checking representative frames completes this milestone's visual verification.

## Common failures

- **PowerShell blocks `npm.ps1`:** use `npm.cmd` in place of `npm` (and `npx.cmd` in place of `npx`) without changing the machine's execution policy.
- **Browser download fails:** run `npm run browser:ensure` again after checking network/proxy access. Remotion stores its managed browser under `node_modules/.remotion`; no global Chrome installation is required.
- **Font or dependency files missing:** stop Studio, run `npm ci`, then retry. Do not replace Korean text with transliteration to mask a font issue.
- **Render process runs out of memory:** try `npm run render -- --concurrency=1`. Rendering 360 full-HD portrait frames is heavier than previewing a webpage.
- **Output file is locked:** close the video player before rerendering the same filename.
- **Source text looks garbled in an editor or terminal:** save source files as UTF-8. For PowerShell inspection use `Get-Content -Encoding UTF8`.

This section documents the original Phase 1 sample for comparison.

## Official references

- [Remotion setup and system requirements](https://www.remotion.dev/docs/)
- [Render CLI](https://www.remotion.dev/docs/cli/render)
- [Managed Chrome installation](https://www.remotion.dev/docs/miscellaneous/chrome-headless-shell)
- [Font loading](https://www.remotion.dev/docs/fonts)
- [Bundled FFprobe](https://www.remotion.dev/docs/cli/ffprobe)
- [Noto Sans KR at Fontsource](https://fontsource.org/fonts/noto-sans-kr)
