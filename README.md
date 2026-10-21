# Korean quiz videos — Phase 1

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

Stop here and inspect this sample before starting the three-question template.

## Official references

- [Remotion setup and system requirements](https://www.remotion.dev/docs/)
- [Render CLI](https://www.remotion.dev/docs/cli/render)
- [Managed Chrome installation](https://www.remotion.dev/docs/miscellaneous/chrome-headless-shell)
- [Font loading](https://www.remotion.dev/docs/fonts)
- [Bundled FFprobe](https://www.remotion.dev/docs/cli/ffprobe)
- [Noto Sans KR at Fontsource](https://fontsource.org/fonts/noto-sans-kr)
