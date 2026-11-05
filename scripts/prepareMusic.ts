import {readFile, stat, writeFile} from 'node:fs/promises';
import {join} from 'node:path';
import {PROJECT_ROOT, runRemotion} from './remotionCommand.ts';
import {sha256} from './narrationFiles.ts';
import {atomicJson} from './draftWorkflow.ts';

/** Short linear crossfade of the tail into the head, then wrap at adjacent samples. */
export const crossfadeLoop = (wav: Buffer, seconds = 0.25) => {
  let data = -1, size = 0, channels = 0, rate = 0;
  for (let offset = 12; offset + 8 < wav.length;) {
    const bytes = wav.readUInt32LE(offset + 4), kind = wav.toString('ascii', offset, offset + 4);
    if (kind === 'fmt ') {channels = wav.readUInt16LE(offset + 10); rate = wav.readUInt32LE(offset + 12);}
    if (kind === 'data') {data = offset + 8; size = bytes; break;}
    offset += 8 + bytes + bytes % 2;
  }
  if (data < 0 || channels !== 2 || rate !== 48000 || data + size > wav.length) throw new Error('Music preparation expects stereo 48 kHz PCM WAV');
  const total = size / (channels * 2), overlap = Math.round(seconds * rate), outputFrames = total - overlap;
  if (total < overlap * 4) throw new Error('Music source is too short for a smooth loop');
  const out = Buffer.alloc(data + outputFrames * channels * 2); wav.copy(out, 0, 0, data);
  for (let frame = 0; frame < outputFrames; frame++) for (let channel = 0; channel < channels; channel++) {
    let value;
    if (frame < total - 2 * overlap) value = wav.readInt16LE(data + ((frame + overlap) * channels + channel) * 2);
    else {
      const i = frame - (total - 2 * overlap), mix = i / (overlap - 1);
      value = Math.round(wav.readInt16LE(data + ((total - overlap + i) * channels + channel) * 2) * (1 - mix)
        + wav.readInt16LE(data + (i * channels + channel) * 2) * mix);
    }
    out.writeInt16LE(value, data + (frame * channels + channel) * 2);
  }
  out.writeUInt32LE(out.length - 8, 4); out.writeUInt32LE(outputFrames * channels * 2, data - 4);
  return {bytes: out, durationSeconds: outputFrames / rate};
};

if (process.argv[1]?.replace(/\\/g, '/').endsWith('/prepareMusic.ts')) {
  const folder = join(PROJECT_ROOT, 'public/audio/music'), original = join(folder, 'subtle-bass-original.ogg');
  await stat(original).catch(() => {throw new Error('Missing music source: download the CC0 bassy_tune.ogg documented in docs/audio/subtle-bass-license.md, or disable backgroundAudio.');});
  const normalized = join(folder, 'subtle-bass-normalized.wav');
  await runRemotion(['ffmpeg', '-v', 'error', '-xerror', '-i', original, '-vn', '-af', 'loudnorm=I=-20:TP=-3:LRA=11',
    '-ac', '2', '-ar', '48000', '-c:a', 'pcm_s16le', '-y', normalized], true, 30000);
  const loop = crossfadeLoop(await readFile(normalized));
  const output = join(folder, 'subtle-bass-loop.wav'); await writeFile(output, loop.bytes);
  await runRemotion(['ffmpeg', '-v', 'error', '-xerror', '-i', output, '-f', 'null', '-'], true, 30000);
  await atomicJson(join(folder, 'manifest.json'), {file: 'audio/music/subtle-bass-loop.wav', sha256: sha256(loop.bytes),
    durationSeconds: loop.durationSeconds, title: 'Subtle Bass', creator: 'TinyWorlds', license: 'CC0-1.0',
    sourceURL: 'https://opengameart.org/content/subtle-bass', downloadURL: 'https://opengameart.org/sites/default/files/bassy_tune.ogg',
    licenseURL: 'https://creativecommons.org/publicdomain/zero/1.0/', attributionRequired: false,
    suggestedCredit: 'Subtle Bass by TinyWorlds (CC0), via OpenGameArt.org', originalSha256: sha256(await readFile(original)),
    processing: 'loudnorm-I-20-TP-3-LRA-11-stereo-48000; 250ms linear loop crossfade', preparedAt: new Date().toISOString()});
  console.log(`Prepared licensed music loop: ${loop.durationSeconds}s; no paid services.`);
}
