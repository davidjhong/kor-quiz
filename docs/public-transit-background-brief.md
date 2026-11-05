# Manual background brief — public transit

Status: implemented as a **developer-selected development asset** on 2026-11-05.
The built-in image-generation tool created one original illustration; no
separately billed image API was called. It is registered as
`korean-transit-illustrated-dev-v1` at
`public/backgrounds/korean-transit-illustrated-dev-v1.png`. It has no human
aesthetic approval. [Provenance and actual dimensions](public-transit-background-provenance.json).

The composition was inspected behind the existing panel. The worker's face is
visible below it, the displays are blank, and no obvious text, route claims or
answer clues were observed. Native size is 916 × 1717; the renderer scales and
crops it to the existing 1080 × 1920 composition, using static 1.02 framing.

The brief below records the original request. Its former manual approval stops
are optional in [automated development mode](phase5b-automated-development.md).

Selected for the [Phase 5B transit candidate](../drafts/public-transit-02-candidate/review.md).
The candidate remains unapproved and has no background asset ID. This brief keeps
image creation and approval as a separate manual step.

Create a single continuous 9:16 illustrated Korean subway concourse, 1080 × 1920
or larger. Match the approved café illustration's bright watercolor/gouache
texture, warm cream and wood tones, muted blue and sage, soft daylight and original
adult character design. A friendly station worker can stand below the quiz panel;
use station architecture, restrained ticket-gate shapes and an unlettered route
board to establish the setting. No real route, exit number or destination claim.

Keep the existing opaque code-rendered panel area clear of people: approximately
x=70–950, y=180–1190 at 1080 × 1920. Do not draw the panel, quiz text, labels, logos
or UI into the image. Place the worker's full head below y=1200 and above y=1540,
around x=790, y=1380, with the torso visible below. Keep important features outside
the rightmost 10% and bottom 250 pixels. Neutral relaxed pose; no pointing, fingers,
letter shapes, exit numbers or other visual answer hints. Leave the upper area as
coherent station scenery. Check the existing top-center crop against the actual
panel before approval; use a local crop or a manually reviewed asset revision if
needed, rather than redesigning the template.

After manual creation, inspect the image behind the existing panel, approve it,
then register its real local path and `public-transit` scenario type. The current
draft deliberately has `backgroundAssetId: null`; the café illustration is not a
fallback. Selecting an approved background changes the content hash and requires
review and a new hash-bound approval before production. Image generation, asset
approval, TTS spending and a full-video render are separate later steps.
