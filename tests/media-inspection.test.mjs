import assert from 'node:assert/strict';
import {mkdtemp, rm, writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import test from 'node:test';
import {DURATION_TOLERANCE_SECONDS, inspectVideo, validateProbeMetadata} from '../scripts/mediaInspection.ts';

const metadata = () => ({
  streams: [{codec_name: 'h264', width: 1080, height: 1920, pix_fmt: 'yuv420p', avg_frame_rate: '30/1', nb_frames: '780'}],
  format: {duration: '26.000000'},
});

test('accepts the expected silent-video metadata without requiring an audio stream', () => {
  assert.equal(validateProbeMetadata(metadata(), 780).duration, 26);
});

test('rejects the wrong codec, dimensions, pixel format, FPS, or frame count', () => {
  for (const [field, value] of [['codec_name', 'vp9'], ['width', 1920], ['height', 1080],
    ['pix_fmt', 'yuvj420p'], ['avg_frame_rate', '30000/1001'], ['avg_frame_rate', '30/0'], ['nb_frames', '779']]) {
    const probe = metadata();
    probe.streams[0][field] = value;
    assert.throws(() => validateProbeMetadata(probe, 780));
  }
  assert.throws(() => validateProbeMetadata({streams: [], format: {duration: '26'}}, 780));
});

test('enforces the explicit MP4 duration tolerance and rejects invalid timestamps', () => {
  const probe = metadata();
  probe.format.duration = String(26 + DURATION_TOLERANCE_SECONDS / 2);
  assert.doesNotThrow(() => validateProbeMetadata(probe, 780));
  for (const duration of [26 + DURATION_TOLERANCE_SECONDS + 0.001, 0, -1, 'N/A', 'Infinity']) {
    probe.format.duration = String(duration);
    assert.throws(() => validateProbeMetadata(probe, 780), /Expected 26s/u);
  }
});

test('rejects missing and empty outputs before invoking FFprobe', async (context) => {
  const directory = await mkdtemp(join(tmpdir(), 'korean-media-test-'));
  context.after(() => rm(directory, {recursive: true, force: true}));
  await assert.rejects(inspectVideo(join(directory, 'missing.mp4'), 780), /ENOENT/u);
  const empty = join(directory, 'empty.mp4');
  await writeFile(empty, '');
  await assert.rejects(inspectVideo(empty, 780), /empty/u);
});
