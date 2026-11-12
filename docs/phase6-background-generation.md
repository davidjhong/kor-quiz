# Phase 6 — automatic local background catalog

`produce` now binds a matching registered background, or prepares one through the
official OpenAI SDK's direct Images API before content generation/review/TTS.
No image service is used during rendering. Publishing remains outside this workflow.
Production keeps its six-question schema. `--preview-question` is a separate
supplied-content, three-clip excerpt: question → five-second countdown → Korean
answer → English explanation → hold/fade, with no hook, bonus or episode counter.

Completed checkpoint: [15.4-second restaurant preview](../out/restaurant-menu-preview.mp4)
and [actual usage, verification and reproduction](restaurant-preview-results.md).

## Usage

Use the [primary usage guide](../README.md) for NEW full restaurant jobs, named
voices, budget inspection, execution and resume. Pin
`--background generated-restaurant-379962e8db662f67` to reuse the existing image
with zero image requests. The completed supplied-question test's historical
commands and job-specific authorization remain in [its results](restaurant-preview-results.md).

The source is supplied text, not a paid generation task or a linguistic approval.
One separate bounded economical-model review checks the same six linguistic
categories. Blocking findings stop this small test; it does not silently rewrite
the supplied text or escalate models. Acceptance is private, hash-bound and
explicitly automated. Production retains its existing bounded correction flow
and optional manual mode.

## Selection and reuse

Automatic selection requires an unambiguous supported setting and the current
style. It includes the static café/transit/hotel registry and the private JSON
catalog at `data/background-assets/catalog.json`. A restaurant never falls back
to a café. New settings need a recognized scenario type/classifier; unknown or
mixed settings stop with an actionable error.

The editorial default is five completed production episode IDs per asset;
`--background-reuse-limit 10` raises it to ten (values 1–10 accepted). Completed
IDs are distinct, so resume/rerender does not add another use. Test previews add
none. Existing completed production jobs are included when reading legacy use.
Old images/receipts remain available after the selection limit. This setting
does not promise platform monetization eligibility.

Options on a NEW job:

- `--background auto` (default), `--background new`, or `--background <asset-id>`.
  An explicit matching asset can intentionally override its editorial reuse limit.
- `--image-model gpt-image-2.6-flare` (default) or the verified pinned
  `gpt-image-2.5-flare-2026-09-08` profile; no model fallback.
- `--image-quality low|medium|high` (default medium). The API has additional
  options; this integration deliberately limits its verified profiles.
- `--background-character "adult woman"`, `"adult man"`, or `"adult traveler"`.
  The restaurant preview defaults to an adult woman.

The bound asset ID and exact image request are persisted before paid work.
Resume cannot switch them because catalog availability or usage changed. A
source draft's existing hash-bound background is preserved; use a separate
brief/scenario revision to select a different one. Existing manual review remains
available; generated artwork has developer-selected status, never human approval.

## API, pricing and composition

Official OpenAI documentation checked 2026-11-11:
[Images API](https://developers.openai.com/api/reference/resources/images/methods/generate),
[image guide/calculator](https://developers.openai.com/api/docs/guides/image-generation),
[Flare](https://developers.openai.com/api/docs/models/gpt-image-2.6-flare),
[pricing](https://developers.openai.com/api/docs/pricing),
[deprecations](https://developers.openai.com/api/docs/deprecations).
Mini/1.5/Image 2 are deprecated; they are not the default. Both implemented Flare
profiles use $5/M text input and $30/M image output tokens. New requests require
reverification from 2026-11-18 onward. Project image access and API Organization
Verification may be required. Authentication/permission failures report HTTP/code
without dumping SDK objects, headers or credentials.

Generation requests exactly one opaque PNG, explicitly `1024x1536`, with no
streaming or SDK retries. Native 2:3 artwork is center-covered into 9:16: native
central x=80..944 is visible before the 1.02 framing margin. There is no stretching
or native-resolution relabeling. Prompt geometry comes from the actual panel,
caption band and palette constants, with the woman's full head below the captions.
The same small background movement and 1.25× music setting are reused once.

Images have no output-token cap parameter. Planning reserves a deliberately
conservative image allowance (16,384 output tokens for low/medium, 32,768 for high,
plus UTF-8 prompt bytes and framing overhead at full input price). These are local
planning allowances, **not documented model maxima or provider-enforced caps**.
Fixed size/quality/count keep the request scoped. Reported usage is priced after
receipt; absent usage remains explicitly unknown and retains the allowance.
Unexpected usage beyond the allowance stops downstream spending. A provider-side
invoice cannot be guaranteed by a local ledger.

Image, generation, review and TTS reservations share the existing total job budget.
Image bytes, exact prompt/settings, receipt/request ID, reported usage and estimated
cost are stored privately under the job; the catalog records provenance, geometry,
native dimensions, checksum and completed production IDs. Only the PNG goes in
`public/backgrounds/`. Remotion receives a strict public projection containing
file/framing/checksum, never private prompts, receipts or secrets.

## Recovery and verification

A request reservation is durable before calling the SDK. The returned response
is flushed atomically before decoding/registering it. A saved response can recover
interrupted local processing without another call. A missing response after a
reservation retains its uncertain charge and stops; there is no blind retry or
aesthetic regeneration. Missing/corrupt bound assets identify the file and require
restoring retained bytes, rather than purchasing a replacement automatically.

PNG signature, complete-file trailer, dimensions, checksum and actual FFmpeg decode
are checked before use. These checks do not judge composition or artistic quality.
The actual restaurant render still requires frame inspection, complete media decode,
audio measurements and an unchanged-resume check; results are recorded separately
after the authorized test. No paid failure tests are used.

The completed test exposed and fixed two local recovery issues: the bundled PNG
decoder needs an explicit rawvideo null encoder, and image-sized base64 receipts
need a separate bounded 32 MiB reader. Ordinary content JSON remains limited to
256 KiB; the validated private catalog has a 16 MiB limit. One collapsed English
article is included in a phrase anchored by the actual neighboring words, with no
invented word interval. Comma clauses keep their short closing word before the
following sentence. Grouping has its own version; raw audio/alignment caches stay
unchanged. See the results for actual frame inspection and listening limitations.
