# Hotel-01 — first scenario-driven production episode

[Watch hotel-01.mp4](../out/hotel-01.mp4) · [Verification and usage](../out/hotel-01.verification.json)

The existing `hotel-01` job was resumed; it was not recreated. Its original null-background source record remains intact. The registered hotel asset produced a new bound source record, followed by one generated brief/quiz and one hash-bound automated acceptance. No human approval was claimed. Publishing has not run.

## Background

- Asset ID: `korean-hotel-illustrated-v1`.
- Saved file: `public/backgrounds/korean-hotel-illustrated-v1.png`.
- Real file: PNG/RGB, **941 × 1672**, 2,622,932 bytes. This is below the preferred native resolution; it was not upscaled or mislabeled. The established renderer covers the 1080 × 1920 canvas.
- SHA-256: `8b58c68bb61b3480461764b1ba403069723300e087c725b3da7809cf04d0d9f8`.
- One final illustration, made with the built-in image tool and one targeted refinement to lower the traveler and remove a jacket mark. No external image API calls. Tool model/dollar cost were not exposed.
- Developer-selected, not human-approved. [Provenance](hotel-background-provenance.json) · [Exact initial/refinement prompts](hotel-background-prompt.md).

## Actual verification

| Check | Result |
| --- | --- |
| MP4 duration | 115.400 seconds / 3462 frames |
| Media | H.264, 1080 × 1920, 30 FPS, yuv420p; AAC stereo, 48 kHz |
| Full decode / output promotion | PASS before final MP4 promotion |
| Final mixed audio | -16.08 LUFS integrated; -1.46 dBTP true peak; 13.2 LU loudness range; no measured clipping |
| Timing / privacy | PASS: measured narration, six 150-frame countdowns, exact 45-frame comment pause, 30-frame hold and 12-frame fade; no narration overlaps or bonus answer props/audio/captions |
| Layout | PASS: 8 preflight stills and 47 final-video frames inspected; no missing glyphs, clipping, face obstruction or overlapping choice/caption text observed |
| Tests | Typecheck PASS; 163 full-runner checks PASS before the final context adjustment, then 47 final focused checks PASS on the final code |
| Unchanged successful resume | PASS: existing verified MP4 reused; all 19 clips/alignments verified; zero new provider calls |
| Subjective listening / phone playback | NOT CHECKED |

A first local render stopped safely on a long heading before output promotion. Focused geometry fixes accommodate three-line headings and a two-line context at the existing font floors; answer-row dimensions, romanization, caption band, content, audio, voices and all timing stayed unchanged. The final render reused every prepared clip and alignment. A usage-summary fix counts generation/review child-ledger requests as well as TTS receipts.

## Reported usage and estimated cost

| Stage | Requests / cache | Reported usage | Conservative estimate |
| --- | --- | --- | --- |
| Generation — gpt-6-luna | 1 | 2317 input / 4368 output tokens; 2545 reasoning tokens already included in output | $0.002473625 |
| Automated review — gpt-6-luna | 1; 0 findings, 0 corrections | 2951 input / 1184 output tokens; 862 reasoning included | $0.000960875 |
| Google Chirp3 HD — Achird EN/KO | 16 new; 3 initial cache hits; 0 retries | 923 new Unicode characters | $0.02769 |
| Total LLM/TTS | | | **$0.0311245**, under **$0.23** |

These are estimates based on reported usage and the existing conservative pricing profile, before any eligible TTS free allowance; no invoice was inspected. Built-in image-tool cost is unknown and is not represented as zero. No paid failure tests ran. The successful unchanged resume made zero LLM/TTS calls and did not rerender.

## Reproduction and evidence

```powershell
Set-Location 'C:\Users\david\Documents\kor-vids'
npm.cmd run produce -- --resume hotel-01 --dry-run
# Authorized production invocation used:
npm.cmd run produce -- --resume hotel-01 --allow-paid --max-cost-usd 0.23
# Unchanged successful reuse:
npm.cmd run produce -- --resume hotel-01
```

The pre-generation dry run had no blockers and a $0.22522 conditional bound, below the authorized cap. Logs: `out/hotel-01-dry-run.log`, `out/hotel-01-render-resume.log`, `out/hotel-01-unchanged-resume.log`, `out/hotel-01-full-tests.log`, `out/hotel-01-final-tests.log`, `out/hotel-01/inspection.json`. Paid receipts/reservations remain in the existing shared job budget and referenced child ledgers.

Content hash: `c519daeaf626938596b948906210b50527fd074af6e94f4969d7eab9f25caa4d`. Video SHA-256: `ddeac381ecf54172543ef7f24e13cbfd93e8d60cedc0893c5c4460729cf8312e`.

Automated acceptance is not independent proof of Korean correctness. Korean pronunciation/tone, voice consistency, perceived phrase timing/pacing, subjective narration/music balance and actual phone readability remain playback-review items. They are not a mandatory human approval gate. No unresolved technical blockers remain.
