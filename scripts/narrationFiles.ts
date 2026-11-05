import {createHash} from 'node:crypto';
import {access, copyFile, mkdir, mkdtemp, open, readFile, realpath, rename, rm, stat, unlink, writeFile} from 'node:fs/promises';
import {basename, dirname, isAbsolute, join, relative, resolve, sep} from 'node:path';
import {validatePreparedNarrationPlan, preparedNarrationSchema, type NarrationScript, type NarrationSegment,
  type PreparedClip, type PreparedNarration} from '../src/narration.ts';
import type {QuizInput} from '../src/quizSchema.ts';
import {PROJECT_ROOT, runRemotion} from './remotionCommand.ts';
import {UncertainSynthesisError, synthesizeGoogle} from './googleTts.ts';
import {promoteOutput} from './output.ts';

export const AUDIO_PROCESSING = 'loudnorm-I-16-TP-1.5-LRA-11-mono-24000-v1' as const;
export const sha256 = (bytes: string | Buffer) => createHash('sha256').update(bytes).digest('hex');
export const canonical = (value: unknown): string => {
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  if (value && typeof value === 'object') return `{${Object.entries(value).sort(([a], [b]) => a.localeCompare(b))
    .map(([key, entry]) => `${JSON.stringify(key)}:${canonical(entry)}`).join(',')}}`;
  return JSON.stringify(value) ?? 'null';
};
export const quizSpeechFingerprint = (quiz: QuizInput) => sha256(canonical({videoId: quiz.videoId, title: quiz.episodeTitle,
  endingMode: quiz.endingMode ?? 'standard', questions: quiz.questions.map((question) => ({id: question.id,
    prompt: question.prompt, context: question.context, choices: question.choices.map((choice) => typeof choice === 'string' ? choice : choice.hangul),
    correctAnswerIndex: question.correctAnswerIndex, explanation: question.explanation, reveal: question.reveal}))}));
export const synthesisIdentity = (segment: NarrationSegment, profile: NarrationScript['profile'], localChecksum?: string) => ({
  text: segment.text, language: segment.language, provider: localChecksum ? 'local-recording' : profile.provider,
  model: localChecksum ? 'recording' : profile.model, voiceId: localChecksum ? segment.recordingId ?? 'local-recording' : profile.voices[segment.language],
  settings: {speakingRate: profile.speakingRate}, outputFormat: profile.outputFormat, sampleRateHertz: profile.sampleRateHertz,
  ...(localChecksum ? {localChecksum} : {}), processing: AUDIO_PROCESSING,
});
export const audioCacheKey = (segment: NarrationSegment, profile: NarrationScript['profile'], localChecksum?: string) =>
  sha256(canonical(synthesisIdentity(segment, profile, localChecksum)));
export const readJsonFile = async (file: string) => {
  const info = await stat(file);
  if (!info.isFile() || info.size > 256 * 1024) throw new Error(`Expected JSON file no larger than 256 KiB: ${file}`);
  return JSON.parse((await readFile(file, 'utf8')).replace(/^\uFEFF/u, '')) as unknown;
};
const exists = async (file: string) => { try { await access(file); return true; } catch { return false; } };
export const requireWithin = (root: string, file: string) => {
  const path = relative(resolve(root), resolve(file));
  if (isAbsolute(path) || path === '..' || path.startsWith(`..${sep}`)) throw new Error(`Path escapes approved directory: ${file}`);
};

export const validateAudioFile = async (file: string) => {
  const info = await stat(file);
  if (!info.isFile() || info.size === 0 || info.size > 20 * 1024 * 1024) throw new Error(`Audio must be a nonempty file no larger than 20 MiB: ${file}`);
  const output = await runRemotion(['ffprobe', '-v', 'error', '-show_entries', 'stream=codec_type:format=duration', '-of', 'json', file], true, 30000);
  const data = JSON.parse(output) as {streams: {codec_type: string}[]; format: {duration: string}};
  const durationSeconds = Number(data.format?.duration);
  if (data.streams.length !== 1 || data.streams[0].codec_type !== 'audio' || !Number.isFinite(durationSeconds)
    || durationSeconds <= 0 || durationSeconds > 60) throw new Error(`Invalid audio stream/duration: ${file}`);
  await runRemotion(['ffmpeg', '-v', 'error', '-xerror', '-i', file, '-f', 'null', '-'], true, 30000);
  return durationSeconds;
};
export const wavPeakDbFS = (buffer: Buffer) => {
  if (buffer.toString('ascii', 0, 4) !== 'RIFF' || buffer.toString('ascii', 8, 12) !== 'WAVE') throw new Error('Expected PCM WAV');
  let validFormat = false;
  for (let offset = 12; offset + 8 <= buffer.length;) {
    const size = buffer.readUInt32LE(offset + 4);
    const start = offset + 8;
    if (start + size > buffer.length) throw new Error('Incomplete WAV chunk');
    const id = buffer.toString('ascii', offset, offset + 4);
    if (id === 'fmt ') validFormat = size >= 16 && buffer.readUInt16LE(start) === 1
      && buffer.readUInt16LE(start + 2) === 1 && buffer.readUInt32LE(start + 4) === 24000 && buffer.readUInt16LE(start + 14) === 16;
    if (id === 'data') {
      if (!validFormat || size === 0 || size % 2) throw new Error('Expected mono 24 kHz signed 16-bit PCM');
      let peak = 0;
      for (let index = start; index < start + size; index += 2) peak = Math.max(peak, Math.abs(buffer.readInt16LE(index)) / 32768);
      if (peak === 0) throw new Error('Audio is entirely silent');
      const peakDbFS = 20 * Math.log10(peak);
      if (peakDbFS > -1) throw new Error('Processed audio lacks clipping headroom');
      return peakDbFS;
    }
    offset = start + size + size % 2;
  }
  throw new Error('WAV has no samples');
};

type ClipMedia = Pick<PreparedClip, 'cacheKey' | 'file' | 'sha256' | 'durationSeconds' | 'sourceKind' | 'sourceChecksum' | 'peakDbFS'>;
export const getClipCacheLocation = (root: string, key: string) => ({directory: join(root, '.audio-cache', key),
  file: join(root, 'public', 'audio', 'cache', `${key}.wav`)});
export const prepareClip = async (segment: NarrationSegment, profile: NarrationScript['profile'], options: {
  root?: string; synthesize?: boolean; retryUncertain?: boolean;
  generator?: typeof synthesizeGoogle;
  onEvent?: (kind: 'cache-hit' | 'recovered-original' | 'local-prepared' | 'synthesis-request', segment: NarrationSegment) => void;
}) => {
  const root = resolve(options.root ?? PROJECT_ROOT);
  const {localFile: _localFile, ...definition} = segment;
  let localChecksum: string | undefined;
  let localFile: string | undefined;
  if (segment.localFile) {
    if (/^https?:/iu.test(segment.localFile)) throw new Error('Local recordings must be local filesystem files');
    localFile = await realpath(resolve(root, segment.localFile));
    requireWithin(root, localFile);
    const localInfo = await stat(localFile);
    if (!localInfo.isFile() || localInfo.size === 0 || localInfo.size > 20 * 1024 * 1024) throw new Error('Local recording must be a nonempty file no larger than 20 MiB');
    localChecksum = sha256(await readFile(localFile));
  }
  const key = audioCacheKey(segment, profile, localChecksum);
  const location = getClipCacheLocation(root, key);
  await mkdir(location.directory, {recursive: true});
  await mkdir(dirname(location.file), {recursive: true});
  const metadataFile = join(location.directory, 'clip.json');
  const pending = join(location.directory, 'pending-request.json');
  const lockPath = join(location.directory, '.lock');
  const lock = await open(lockPath, 'wx').catch(() => { throw new Error(`${segment.id}: cache locked; review .audio-cache before retrying`); });
  let temporary: string | undefined;
  try {
    if (await exists(metadataFile)) {
      const cached = await readJsonFile(metadataFile) as {media: ClipMedia; synthesisInput: unknown};
      if (canonical(cached.synthesisInput) !== canonical(synthesisIdentity(segment, profile, localChecksum))) throw new Error('Cache identity mismatch');
      if (cached.media.cacheKey !== key || cached.media.file !== `audio/cache/${key}.wav`) throw new Error('Cache location mismatch');
      const bytes = await readFile(location.file);
      if (sha256(bytes) !== cached.media.sha256) throw new Error(`${segment.id}: cached audio checksum mismatch; preserve it for review`);
      const measuredDuration = await validateAudioFile(location.file);
      if (Math.abs(measuredDuration - cached.media.durationSeconds) > 1 / 24000) throw new Error('Cached duration mismatch');
      wavPeakDbFS(bytes);
      options.onEvent?.('cache-hit', segment);
      return {...definition, ...cached.media};
    }
    temporary = await mkdtemp(join(location.directory, 'tmp-'));
    const original = join(location.directory, 'original.bin');
    if (!(await exists(original))) {
      const incoming = join(temporary, 'incoming.bin');
      if (localFile) { await copyFile(localFile, incoming); options.onEvent?.('local-prepared', segment); }
      else {
        if (!options.synthesize) throw new Error(`${segment.id}: no cached clip. Provide localFile/recordingId, or obtain approval and run --synthesize with --max-cost-usd`);
        if (await exists(pending) && !options.retryUncertain) throw new Error(`${segment.id}: earlier request outcome uncertain; --retry-uncertain acknowledges possible duplicate charges`);
        const configuration = {project: process.env.GOOGLE_CLOUD_PROJECT ?? '',
          onRequest: () => options.onEvent?.('synthesis-request', segment)};
        if (!configuration.project) throw new Error('Configure GOOGLE_CLOUD_PROJECT locally and authenticate ADC; Google synthesis has not started');
        await writeFile(pending, JSON.stringify({cacheKey: key, segmentId: segment.id, possibleCharge: true}), 'utf8');
        try {
          const bytes = await (options.generator ?? synthesizeGoogle)(segment, profile, configuration);
          await writeFile(incoming, bytes);
        } catch (error) {
          if (!(error instanceof UncertainSynthesisError)) await unlink(pending);
          throw error;
        }
      }
      await validateAudioFile(incoming);
      await rename(incoming, original);
      if (await exists(pending)) await unlink(pending);
    } else options.onEvent?.('recovered-original', segment);
    const processed = join(temporary, 'processed.wav');
    await runRemotion(['ffmpeg', '-v', 'error', '-xerror', '-i', original, '-vn', '-af', 'loudnorm=I=-16:TP=-1.5:LRA=11',
      '-ac', '1', '-ar', '24000', '-c:a', 'pcm_s16le', processed], true, 30000);
    const durationSeconds = await validateAudioFile(processed);
    const bytes = await readFile(processed);
    const media: ClipMedia = {cacheKey: key, file: `audio/cache/${key}.wav`, sha256: sha256(bytes), durationSeconds,
      sourceKind: localFile ? 'local' : 'google-cloud-tts', sourceChecksum: sha256(await readFile(original)), peakDbFS: wavPeakDbFS(bytes)};
    await promoteOutput(processed, location.file, false);
    const temporaryMetadata = join(temporary, 'clip.json');
    await writeFile(temporaryMetadata, JSON.stringify({synthesisInput: synthesisIdentity(segment, profile, localChecksum), media}, null, 2));
    await rename(temporaryMetadata, metadataFile);
    if (await exists(pending)) await unlink(pending);
    return {...definition, ...media};
  } finally {
    await lock.close();
    await unlink(lockPath);
    if (temporary) {
      if (dirname(temporary) !== location.directory || !basename(temporary).startsWith('tmp-')) throw new Error('Unsafe audio temporary cleanup path');
      await rm(temporary, {recursive: true, force: true});
    }
  }
};

export const loadPreparedNarration = async (file: string, quiz: QuizInput, root = PROJECT_ROOT): Promise<PreparedNarration> => {
  const narration = preparedNarrationSchema.parse(await readJsonFile(file));
  if (narration.quizFingerprint !== quizSpeechFingerprint(quiz)) throw new Error('Narration is stale for this content; rerun audio:prepare (unchanged clips are reused)');
  validatePreparedNarrationPlan(quiz, narration);
  const publicRoot = await realpath(join(root, 'public'));
  for (const clip of narration.clips) {
    const expectedKey = audioCacheKey(clip, narration.profile, clip.sourceKind === 'local' ? clip.sourceChecksum : undefined);
    if (clip.cacheKey !== expectedKey || clip.file !== `audio/cache/${expectedKey}.wav`) {
      throw new Error(`${clip.id}: stale audio identity (text, language, voice, settings or format changed); rerun audio:prepare`);
    }
    const path = await realpath(join(publicRoot, clip.file)).catch(() => {
      throw new Error(`${clip.id}: prepared audio missing: ${clip.file}; restore the accepted file or rerun audio:prepare from the original cache/local recording`);
    });
    requireWithin(publicRoot, path);
    const bytes = await readFile(path);
    if (sha256(bytes) !== clip.sha256) throw new Error(`${clip.id}: checksum mismatch before render; restore the accepted WAV or review .audio-cache before repair`);
    const duration = await validateAudioFile(path);
    if (Math.abs(duration - clip.durationSeconds) > 1 / 24000) throw new Error(`${clip.id}: measured audio duration mismatch`);
    wavPeakDbFS(bytes);
  }
  return narration;
};
