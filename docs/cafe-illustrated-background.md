# Illustrated café background provenance

Manifest ID: `korean-cafe-illustrated-v1`.

Local render asset: `public/backgrounds/korean-cafe-illustrated-v1.png`.
Created with the built-in image-generation tool for this project on 2026-10-21.
The final asset is original generated illustration, not a placeholder or a finished quiz screenshot.
All UI and text are rendered with code. Rendering only reads the saved local image.
The photographic `korean-cafe-v1` image, composition, JSON, and preview output are retained.

The second image is the selected revision. A fixed 1.12× crop anchored at top-center
places the worker below the cream panel. This is static framing, not an animated zoom.
The illustration is reused on every render; no image tool or remote fetch runs in Remotion.

Original tool outputs remain at:

```text
C:\Users\david\.codex\generated_images\01a15c72-28aa-7961-aa9b-a6de35a503cd\exec-26cda62f-61d2-4a20-a696-d656b92d88ac.png
C:\Users\david\.codex\generated_images\01a15c72-28aa-7961-aa9b-a6de35a503cd\exec-72b950b3-96b0-4883-b0a2-d674b34a4456.png
```

## Exact initial prompt

```text
Use case: illustration-story. Asset type: one original portrait 9:16 background illustration, 1080x1920 or larger, for a Korean cafe quiz video. Generate ONLY the background illustration, never a quiz screenshot or interface. Style: warm hand-painted Japanese animation aesthetic, soft watercolor and gouache textures, original expressive character design, cozy contemporary Korean cafe seen from the customer side of a wooden counter, natural daylight, storybook atmosphere, polished artwork that reads well on a phone. Balanced warm wood and cream with muted cool blue and sage accents. Composition is critical: a CODE-RENDERED opaque quiz panel will later cover x=70..950 and y=180..1190 on a 1080x1920 canvas. Do NOT draw that panel, text, a rectangle, or an empty UI box. Keep the whole illustration continuous. Place the only cafe worker entirely outside that covered area: a friendly original adult Korean cafe worker at lower-right, face centered approximately x=790, y=1360, all facial features between y=1240 and y=1460, upper body visible to y=1600. Keep the face inside x=660..920, away from the extreme right control region and above the bottom caption region starting near y=1650. Do not place any face above y=1200 or behind the future panel. Worker has short dark hair, a simple blue shirt and a muted sage apron, a warm relaxed expression, hands casually resting at the counter without pointing, handing over a drink, or gesturing toward an answer. Interesting exposed scenery below the future panel: wood counter, small leafy plants, a few unmarked empty ceramic cups on a shelf, restrained espresso equipment. Keep the bottom 250px largely counter texture rather than important character features. Upper and side areas are an attractive light-filled cafe wall, window, and restrained shelving. No existing film characters, recognizable franchise designs, logos, watermarks, menu boards, lettering, words, symbols, readable signage, labels, or generated text anywhere. No glass of water or answer-revealing object. Good anatomy, coherent perspective, no extra people. No dark gradient, no dark overlay, no green neon colors. One continuous bright original illustration.
```

## Exact edit prompt

The initial output was supplied as the reference image for this edit:

```text
Edit this original portrait cafe illustration for a strict video overlay composition. Preserve the bright hand-painted watercolor/gouache animation aesthetic, cozy Korean cafe, daylight, plants, blue shirt and sage apron. Move and scale the entire cafe worker DOWN and slightly LEFT. The final canvas is portrait 9:16. In normalized canvas coordinates the worker's hair must start below 64% of image height; eyes at 71%, chin at 77%, torso 78%-88%, hands at 90%. Face center at 73% width, 72% height. All hair and facial features must be BELOW y=62.5% and ABOVE y=80%. A future opaque panel covers x=6.5%-88%, y=9.4%-62%. No part of the head may be behind that panel. Make worker smaller if necessary so the full face and upper torso remain visible below it. Keep character within x=58%-88%, avoid rightmost 10%. Lower wood counter accordingly. Keep the upper 62% as continuous attractive cafe scenery with no faces. Do NOT draw the future panel. No text, lettering, labels, logo, watermark, speech, menu, UI, or signs. No water glass. Natural relaxed pose with good anatomy. One person only. Keep background a complete continuous portrait illustration with no borders or empty blocks.
```

No existing film character or named franchise was requested. Review the illustration
and final video before publication; generation and asset validation do not certify visual quality.
