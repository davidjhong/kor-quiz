import {access, mkdir, readFile, realpath, stat, writeFile} from 'node:fs/promises';
import {writeFileSync, renameSync} from 'node:fs';
import {join, resolve} from 'node:path';
import {z} from 'zod';
import {loadProductionDraft, atomicJson} from './draftWorkflow.ts';
import {PROJECT_ROOT, runRemotion} from './remotionCommand.ts';
import {audioCacheKey, canonical, getClipCacheLocation, prepareClip, quizSpeechFingerprint, readJsonFile, requireWithin, sha256, loadPreparedNarration} from './narrationFiles.ts';
import {comparisonConfigSchema, auditionProfileSchema, comparisonPropsSchema, getComparisonTimeline} from '../src/comparison.ts';
import {AUDIO_PROCESSING} from './narrationFiles.ts';
import {preparedNarrationSchema, type NarrationScript, type PreparedClip} from '../src/narration.ts';
import {inspectNarratedVideo} from './mediaInspection.ts';
import {checkOutput, promoteOutput} from './output.ts';
import {measureAudio} from './audioMeter.ts';

export const GEMINI_REQUEST_BOUND_USD = 8192 * 0.50 / 1e6 + 16384 * 10 / 1e6;
export const requestBound = (text: string, profile: NarrationScript['profile']) => profile.model === 'chirp3-hd'
  ? [...text].length * 0.00003 : GEMINI_REQUEST_BOUND_USD;
export const comparisonSegments = (script: NarrationScript, questionId: string) => {
  const clips = script.segments.filter((s) => s.role === 'hook' || s.contentId === questionId || s.role === 'comment' || s.role === 'follow');
  if (JSON.stringify(clips.map((s) => s.role)) !== JSON.stringify(['hook', 'question', 'answer', 'explanation', 'comment', 'follow'])) throw new Error('Choose a normal existing question; excerpt needs exactly six existing speech segments');
  return clips;
};
export const loadComparison = async (configFile = 'content/voice-comparison/transit-01.json', root = PROJECT_ROOT) => {
  const config = comparisonConfigSchema.parse(await readJsonFile(resolve(root, configFile)));
  const directory = resolve(root, config.draftDirectory); requireWithin(root, directory);
  const bundle = await loadProductionDraft(directory, true, root, 'automated');
  if (bundle.contentHash !== config.expectedContentHash) throw new Error('Comparison source changed; update its scope and obtain matching automated acceptance before preparing audio');
  const profiles = await Promise.all(config.profiles.map(async (path) => {
    const file = resolve(root, path); requireWithin(root, file); return auditionProfileSchema.parse(await readJsonFile(file));
  }));
  if (new Set(profiles.map((p) => p.id)).size !== 3) throw new Error('Comparison needs distinct A/B/C profiles');
  const questionIndex = bundle.quiz.questions.findIndex((q) => q.id === config.questionId);
  if (questionIndex < 0 || questionIndex >= 5) throw new Error('Comparison question must be an existing non-bonus question');
  const segments = comparisonSegments(bundle.script, config.questionId);
  const identity = {sourceContentHash: bundle.contentHash, questionId: config.questionId, profiles, segments};
  return {config, bundle, profiles, questionIndex, segments, planHash: sha256(canonical(identity))};
};

export const verifyBaseline = async (root = PROJECT_ROOT) => {
  const folder = join(root, 'data/voice-comparison/transit-01'); await mkdir(folder, {recursive: true});
  const path = join(folder, 'baseline-preservation.json');
  const prior = await readJsonFile(path).catch((error: NodeJS.ErrnoException) => {if (error.code === 'ENOENT') return null; throw error;}) as {files: {path: string; sha256: string}[]} | null;
  if (prior) {
    for (const entry of prior.files) if (sha256(await readFile(join(root, entry.path))) !== entry.sha256) throw new Error(`Preserved baseline changed: ${entry.path}`);
    return prior;
  }
  const manifest = preparedNarrationSchema.parse(await readJsonFile(join(root, 'public/audio/public-transit-02/manifest.json')));
  const paths = ['out/public-transit-02-automated.mp4', 'public/audio/public-transit-02/manifest.json',
    'drafts/public-transit-02-candidate/draft.json', 'drafts/public-transit-02-candidate/answer-key.json',
    ...manifest.clips.map((clip) => `public/${clip.file}`)];
  const record = {version: 1, recordedAt: new Date().toISOString(), files: await Promise.all(paths.map(async (file) => ({path: file, sha256: sha256(await readFile(join(root, file)))})))};
  await atomicJson(path, record); return record;
};

export const loadMusic = async (enabled: boolean, root = PROJECT_ROOT) => {
  if (!enabled) return null;
  const raw = await readJsonFile(join(root, 'public/audio/music/manifest.json')).catch(() => {throw new Error('Missing music manifest: run npm run music:prepare, or set backgroundAudio to false.');});
  const data = z.object({file: z.literal('audio/music/subtle-bass-loop.wav'), sha256: z.string(), durationSeconds: z.number().positive(), license: z.literal('CC0-1.0')}).parse(raw);
  const file = await realpath(join(root, 'public', data.file)).catch(() => {throw new Error('Missing prepared music WAV: run npm run music:prepare, or disable backgroundAudio.');});
  requireWithin(join(root, 'public'), file);
  if (sha256(await readFile(file)) !== data.sha256) throw new Error('Music checksum mismatch: restore the documented asset or rerun music:prepare.');
  return {file: data.file, sha256: data.sha256, durationSeconds: data.durationSeconds};
};
export const estimateComparison = async (input: Awaited<ReturnType<typeof loadComparison>>, root = PROJECT_ROOT) => {
  const results = [];
  for (const profile of input.profiles) {
    const missing = [];
    for (const segment of input.segments) {
      const key = audioCacheKey(segment, profile.profile), location = getClipCacheLocation(root, key);
      const exists = await access(join(location.directory, 'clip.json')).then(() => true, () => false);
      if (!exists) missing.push({id: segment.id, cacheKey: key, characters: [...segment.text].length, requestBoundUSD: requestBound(segment.text, profile.profile)});
    }
    results.push({id: profile.id, cached: 6 - missing.length, missing,
      maximumIncludingOneRetryUSD: missing.reduce((n, clip) => n + clip.requestBoundUSD * 2, 0)});
  }
  return {sourceContentHash: input.bundle.contentHash, planHash: input.planHash, profiles: results,
    maximumIncludingOneRetryUSD: results.reduce((n, p) => n + p.maximumIncludingOneRetryUSD, 0)};
};

type Attempt = {cacheKey: string; profileId: string; model: string; characters: number; reservedUSD: number; chargedEstimateUSD: number; status: string};
type Ledger = {planHash: string; state?: string; attempts: Attempt[]; scopeRevisions?: unknown[]};
export const applyFallbackAmendment = (ledger: Ledger, raw: unknown, newPlanHash: string, contentHash: string) => {
  const amendment = z.object({kind: z.literal('user-authorized-chirp-fallback'), source: z.string().min(1),
    fromPlanHash: z.literal(ledger.planHash), toPlanHash: z.literal(newPlanHash), contentHash: z.literal(contentHash), capUSD: z.literal(2.04)}).parse(raw);
  const previous = ledger.attempts.filter((a) => a.model === 'gemini-2.5-flash-tts');
  if (previous.length !== 1 || previous[0].profileId !== 'c-achird' || ledger.planHash === newPlanHash) throw new Error('Fallback amendment does not match the single rejected Gemini attempt');
  previous[0].status = 'permission-rejected-reservation-retained';
  ledger.scopeRevisions = [...ledger.scopeRevisions ?? [], amendment]; ledger.planHash = newPlanHash; ledger.state = 'ready';
};
export const reserveAttempt = (attempts: Attempt[], attempt: Attempt, cap: number) => {
  if (attempts.filter((a) => a.cacheKey === attempt.cacheKey).length >= 2) throw new Error('Audition request limit exhausted for this exact clip; no extra synthesis request');
  if (attempts.reduce((n, a) => n + a.chargedEstimateUSD, 0) + attempt.reservedUSD > cap + 1e-9) throw new Error('Audition spending cap would be exceeded; no request made');
  attempts.push(attempt);
};

export const prepareComparison = async (input: Awaited<ReturnType<typeof loadComparison>>, synthesize: boolean, root = PROJECT_ROOT) => {
  await verifyBaseline(root);
  const folder = join(root, 'data/voice-comparison/transit-01');
  const auth = z.object({capUSD: z.literal(2.04), contentHash: z.literal(input.bundle.contentHash), fullEpisodeSynthesisAuthorized: z.literal(false)}).parse(await readJsonFile(join(folder, 'authorization.json')));
  const ledgerFile = join(folder, 'synthesis-ledger.json');
  const saved = await readJsonFile(ledgerFile).catch((e: NodeJS.ErrnoException) => {if (e.code === 'ENOENT') return null; throw e;}) as Ledger | null;
  const ledger = saved ?? {planHash: input.planHash, state: 'ready', attempts: [] as Attempt[]};
  if (ledger.planHash !== input.planHash) {
    const fallback = input.profiles.find((p) => p.id === 'c-achird')?.profile;
    if (fallback?.model !== 'chirp3-hd' || fallback.voices['en-US'] !== 'en-US-Chirp3-HD-Achird' || fallback.voices['ko-KR'] !== 'ko-KR-Chirp3-HD-Achird') throw new Error('Audition plan differs from its recorded budget scope; no escalation or implicit new approval.');
    applyFallbackAmendment(ledger, await readJsonFile(join(folder, 'fallback-amendment.json')), input.planHash, input.bundle.contentHash);
  }
  if (synthesize && (ledger.state === 'blocked' || ledger.attempts.some((a) => a.status === 'reserved-before-request'))) throw new Error('Prior audition preparation failed or was interrupted; inspect saved audio and reservations before any paid retry. Cache-only recovery remains available.');
  if (synthesize && new Date().toISOString().slice(0, 10) >= '2026-11-12') throw new Error('Reverify Google TTS pricing before additional paid requests.');
  const save = () => {const tmp = `${ledgerFile}.tmp`; writeFileSync(tmp, JSON.stringify(ledger, null, 2)); renameSync(tmp, ledgerFile);};
  const {open, unlink} = await import('node:fs/promises');
  const lockPath = join(folder, '.preparing.lock');
  const lock = await open(lockPath, 'wx').catch(() => {throw new Error('Audition preparation locked: inspect the running/interrupted preparation before retrying');});
  const reports = [];
  try {
    save();
    const estimate = await estimateComparison(input, root);
    if (synthesize && estimate.maximumIncludingOneRetryUSD > auth.capUSD + 1e-9) throw new Error('Audition worst-case estimate exceeds the scoped approval');
    for (const profile of input.profiles) {
      const usage = {cacheHits: 0, newSynthesisRequests: 0, newSynthesisCharacters: 0, recoveredOriginals: 0};
      const clips: PreparedClip[] = [];
      for (const segment of input.segments) {
        const key = audioCacheKey(segment, profile.profile);
        const clip = await prepareClip(segment, profile.profile, {root, synthesize,
          onEvent: (kind) => {
            if (kind === 'cache-hit') usage.cacheHits++;
            if (kind === 'recovered-original') usage.recoveredOriginals++;
            if (kind === 'synthesis-request') {
              const reservedUSD = requestBound(segment.text, profile.profile);
              reserveAttempt(ledger.attempts, {cacheKey: key, profileId: profile.id, model: profile.profile.model,
                characters: [...segment.text].length, reservedUSD, chargedEstimateUSD: reservedUSD, status: 'reserved-before-request'}, auth.capUSD);
              save(); // Durable reservation before provider client sends the request.
              usage.newSynthesisRequests++; usage.newSynthesisCharacters += [...segment.text].length;
            }
          }});
        const pending = ledger.attempts.filter((a) => a.cacheKey === key && a.status === 'reserved-before-request').at(-1);
        if (pending) {
          pending.status = 'prepared-local-audio';
          // Google Cloud TTS returns no token-usage accounting. Retain the full
          // input ceiling plus measured audio-token estimate for a conservative cost.
          pending.chargedEstimateUSD = profile.profile.model === 'chirp3-hd' ? pending.reservedUSD
            : 8192 * 0.5 / 1e6 + Math.ceil(clip.durationSeconds * 25) * 10 / 1e6;
          save();
        }
        clips.push(clip);
      }
      const narration = preparedNarrationSchema.parse({version: 1, profile: profile.profile, processing: AUDIO_PROCESSING,
        quizFingerprint: quizSpeechFingerprint(input.bundle.quiz), clips});
      const output = join(root, 'public/audio/voice-comparison/transit-01', `${profile.id}.json`);
      await atomicJson(output, {sourceContentHash: input.bundle.contentHash, planHash: input.planHash, narration});
      const estimatedCostUSD = ledger.attempts.filter((a) => a.profileId === profile.id).reduce((n, a) => n + a.chargedEstimateUSD, 0);
      reports.push({id: profile.id, profile: profile.profile, ...usage, estimatedCostUSD,
        durationSeconds: getComparisonTimeline(input.bundle.quiz, input.questionIndex, narration).durationInFrames / 30});
      console.log(JSON.stringify(reports.at(-1)));
    }
    const result = {sourceContentHash: input.bundle.contentHash, planHash: input.planHash, profiles: reports,
      cumulativeConservativeEstimatedCostUSD: ledger.attempts.reduce((n, a) => n + a.chargedEstimateUSD, 0),
      capUSD: auth.capUSD, tokenUsageReturnedByGoogle: false};
    await atomicJson(join(root, 'out/phase5c', synthesize ? 'preparation.json' : 'cache-rerun.json'), result);
    await verifyBaseline(root); return result;
  } catch (error) {ledger.state = 'blocked'; save(); throw error;}
  finally {await lock.close(); await unlink(lockPath);}
};

export const renderComparison = async (input: Awaited<ReturnType<typeof loadComparison>>, id: string, overwrite: boolean, root = PROJECT_ROOT) => {
  await verifyBaseline(root);
  const profile = input.profiles.find((p) => p.id === id); if (!profile) throw new Error('Unknown audition profile');
  const prepared = z.object({sourceContentHash: z.string(), planHash: z.string(), narration: preparedNarrationSchema}).parse(
    await readJsonFile(join(root, 'public/audio/voice-comparison/transit-01', `${id}.json`)).catch(() => {throw new Error(`Missing ${id} narration: run voice:compare prepare first.`);}));
  if (prepared.sourceContentHash !== input.bundle.contentHash || prepared.planHash !== input.planHash
    || canonical(prepared.narration.profile) !== canonical(profile.profile)) throw new Error('Stale comparison audio/profile: rerun its scoped preparation.');
  if (canonical(prepared.narration.clips.map(({id, contentId, role, language, text}) => ({id, contentId, role, language, text})))
    !== canonical(input.segments.map(({id, contentId, role, language, text}) => ({id, contentId, role, language, text})))) throw new Error('Audition text differs from the accepted source');
  // Reuse the existing checksum/identity/FFprobe/decode checks on all six clips.
  const publicRoot = await realpath(join(root, 'public'));
  for (const clip of prepared.narration.clips) {
    const key = audioCacheKey(clip, profile.profile);
    if (key !== clip.cacheKey || clip.file !== `audio/cache/${key}.wav`) throw new Error(`${clip.id}: stale voice cache identity`);
    const file = await realpath(join(publicRoot, clip.file)).catch(() => {throw new Error(`${clip.id}: local voice WAV missing; rerun voice:compare prepare without --synthesize first.`);});
    requireWithin(publicRoot, file);
    if (sha256(await readFile(file)) !== clip.sha256) throw new Error(`${clip.id}: corrupt voice WAV/checksum mismatch; restore its accepted cached file.`);
    const {validateAudioFile, wavPeakDbFS} = await import('./narrationFiles.ts');
    if (Math.abs(await validateAudioFile(file) - clip.durationSeconds) > 1 / 24000) throw new Error(`${clip.id}: measured duration changed`);
    wavPeakDbFS(await readFile(file));
  }
  const music = await loadMusic(input.config.presentation.backgroundAudio, root);
  const props = comparisonPropsSchema.parse({quiz: input.bundle.quiz, questionIndex: input.questionIndex,
    narration: prepared.narration, presentation: input.config.presentation, music});
  const t = getComparisonTimeline(props.quiz, props.questionIndex, props.narration);
  const output = join(root, 'out/phase5c', `${id}.mp4`); await mkdir(join(root, 'out/phase5c'), {recursive: true});
  await checkOutput(output, overwrite);
  const {mkdtemp, rm} = await import('node:fs/promises');
  const temporary = await mkdtemp(join(root, 'out/phase5c/.render-'));
  try {
    const propsFile = join(temporary, 'props.json'), env = join(temporary, 'empty.env'), video = join(temporary, 'video.mp4');
    await atomicJson(propsFile, props); await writeFile(env, '');
    await runRemotion(['render', join(root, 'src/index.ts'), 'VoiceComparisonExcerpt', video, `--props=${propsFile}`, `--env-file=${env}`,
      '--codec=h264', '--pixel-format=yuv420p', '--color-space=bt709', '--crf=18', '--concurrency=2', '--audio-codec=aac', '--audio-bitrate=192k']);
    const before = await measureAudio(video), m = before.raw;
    const normalized = join(temporary, 'mixed-normalized.mp4');
    await runRemotion(['ffmpeg', '-v', 'error', '-xerror', '-i', video, '-map', '0:v:0', '-map', '0:a:0', '-c:v', 'copy',
      '-af', `loudnorm=I=-16:TP=-2:LRA=11:measured_I=${m.input_i}:measured_TP=${m.input_tp}:measured_LRA=${m.input_lra}:measured_thresh=${m.input_thresh}:offset=${m.target_offset}:linear=true`,
      '-c:a', 'aac', '-b:a', '192k', '-ar', '48000', '-t', String(t.durationInFrames / 30), normalized], true, 60000);
    const after = await measureAudio(normalized);
    if (after.truePeakDbTP >= 0 || Math.abs(after.integratedLUFS + 16) > 0.5) throw new Error('Mixed track fails clipping/loudness check; output not promoted');
    const metadata = await inspectNarratedVideo(normalized, t.durationInFrames, t.speechEnd);
    await runRemotion(['ffmpeg', '-v', 'error', '-xerror', '-i', normalized, '-c:v', 'rawvideo', '-f', 'null', '-'], true, 60000);
    await promoteOutput(normalized, output, overwrite);
    await atomicJson(join(root, 'out/phase5c', `${id}.timeline.json`), t);
    await atomicJson(join(root, 'out/phase5c', `${id}.props.json`), props);
    await atomicJson(join(root, 'out/phase5c', `${id}.render-check.json`), {metadata, fullDecode: 'PASS', sourceContentHash: input.bundle.contentHash,
      sourcePlanHash: input.planHash, zeroProviderCallsDuringRender: true, presentation: props.presentation, profile: props.narration.profile,
      rawMixedAudio: before, finalMixedAudio: after, mixProcessing:'identical two-pass loudnorm I=-16 TP=-2 LRA=11; H.264 copied; AAC 192k/48k; no time stretching'});
    await verifyBaseline(root); console.log(`Saved ${output}; ${t.durationInFrames / 30}s; local assets only.`);
  } finally {
    requireWithin(join(root, 'out/phase5c'), temporary); await rm(temporary, {recursive: true, force: true});
  }
};
