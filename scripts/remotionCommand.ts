import {spawn} from 'node:child_process';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {dirname, join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {checkCancellation,ownWorker} from './cancellation.ts';

export const PROJECT_ROOT = fileURLToPath(new URL('../', import.meta.url));

// Read the package's declared public CLI entry; do not use renderer internals or .cmd shells.
const require = createRequire(import.meta.url);
const manifestPath = require.resolve('@remotion/cli/package.json');
const manifest = JSON.parse(readFileSync(manifestPath, 'utf8')) as {bin: {remotion: string}};
const cli = join(dirname(manifestPath), manifest.bin.remotion);

export const runRemotion = (args: string[], capture = false, timeoutMs = 0, captureStderr = false): Promise<string> => new Promise((resolve, reject) => {
  checkCancellation();
  const child = spawn(process.execPath, [cli, ...args], {
    cwd: PROJECT_ROOT,
    shell: false,
    windowsHide: true,
    stdio: ['ignore', capture ? 'pipe' : 'inherit', 'pipe'],
  });
  ownWorker(child);
  let output = '';
  let errors = '';
  const timeout = timeoutMs > 0 ? setTimeout(() => {
    child.kill();
    reject(new Error(`Remotion ${args[0]} exceeded ${timeoutMs}ms`));
  }, timeoutMs) : undefined;
  child.stdout?.on('data', (chunk: Buffer) => {
    output += chunk.toString();
    if (output.length > 2 * 1024 * 1024) {
      child.kill();
      reject(new Error('Subprocess output exceeded 2 MiB'));
    }
  });
  child.stderr?.on('data', (chunk: Buffer) => {
    errors = (errors + chunk.toString()).slice(-8192);
    if (!capture) process.stderr.write(chunk);
  });
  child.on('error', (error) => { clearTimeout(timeout); reject(error); });
  child.on('close', (code, signal) => {
    clearTimeout(timeout);
    if (code !== 0) reject(new Error(`Remotion ${args[0]} failed (${signal ?? `exit ${code}`}): ${errors.trim()}`));
    else resolve(captureStderr ? errors : output);
  });
});
