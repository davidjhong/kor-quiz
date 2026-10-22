import {stat} from 'node:fs/promises';
import {z} from 'zod';
import {QUIZ_FPS} from '../src/questionTiming.ts';
import {runRemotion} from './remotionCommand.ts';

// Allow one frame plus 1 ms for MP4 timebase/decimal timestamp rounding.
export const DURATION_TOLERANCE_SECONDS = 1 / QUIZ_FPS + 0.001;

const probeSchema = z.object({
  streams: z.array(z.object({
    codec_name: z.literal('h264'),
    width: z.literal(1080),
    height: z.literal(1920),
    pix_fmt: z.literal('yuv420p'),
    avg_frame_rate: z.string(),
    nb_frames: z.string().regex(/^\d+$/u),
  })).length(1),
  format: z.object({duration: z.string()}),
});

export const validateMinimumDuration = (duration: number, minimumDurationSeconds?: number) => {
  if (minimumDurationSeconds === undefined) return;
  if (!Number.isFinite(minimumDurationSeconds) || minimumDurationSeconds <= 0) {
    throw new Error('Minimum duration must be a finite positive number of seconds');
  }
  if (!Number.isFinite(duration) || duration < minimumDurationSeconds) {
    throw new Error(`Minimum duration is ${minimumDurationSeconds}s; got ${duration}s`);
  }
};

export const validateProbeMetadata = (input: unknown, expectedFrames: number, minimumDurationSeconds?: number) => {
  const parsed = probeSchema.safeParse(input);
  if (!parsed.success) {
    throw new Error(`Invalid output metadata: ${parsed.error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`).join('; ')}`);
  }
  const video = parsed.data.streams[0];
  const rate = /^(\d+)\/(\d+)$/u.exec(video.avg_frame_rate);
  if (!rate || Number(rate[2]) === 0 || Number(rate[1]) / Number(rate[2]) !== QUIZ_FPS) {
    throw new Error(`Expected ${QUIZ_FPS} FPS, got ${video.avg_frame_rate}`);
  }
  if (Number(video.nb_frames) !== expectedFrames) {
    throw new Error(`Expected ${expectedFrames} frames, got ${video.nb_frames}`);
  }
  const duration = Number(parsed.data.format.duration);
  const expectedSeconds = expectedFrames / QUIZ_FPS;
  if (!Number.isFinite(duration) || duration <= 0
    || Math.abs(duration - expectedSeconds) > DURATION_TOLERANCE_SECONDS) {
    throw new Error(`Expected ${expectedSeconds}s ± ${DURATION_TOLERANCE_SECONDS.toFixed(6)}s, got ${parsed.data.format.duration}s`);
  }
  validateMinimumDuration(duration, minimumDurationSeconds);
  return {frames: Number(video.nb_frames), duration, width: video.width, height: video.height, fps: QUIZ_FPS};
};

export const inspectVideo = async (outputPath: string, expectedFrames: number, minimumDurationSeconds?: number) => {
  const info = await stat(outputPath);
  if (!info.isFile() || info.size === 0) throw new Error(`Output is missing, empty, or not a regular file: ${outputPath}`);
  const result = await runRemotion([
    'ffprobe', '-v', 'error', '-select_streams', 'v:0',
    '-show_entries', 'stream=codec_name,width,height,pix_fmt,avg_frame_rate,nb_frames:format=duration',
    '-of', 'json', outputPath,
  ], true);
  let metadata: unknown;
  try { metadata = JSON.parse(result); }
  catch { throw new Error(`FFprobe returned invalid JSON for ${outputPath}`); }
  return validateProbeMetadata(metadata, expectedFrames, minimumDurationSeconds);
};
