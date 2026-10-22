import {spawn} from 'node:child_process';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {dirname, join} from 'node:path';
import {fileURLToPath} from 'node:url';

export const PROJECT_ROOT = fileURLToPath(new URL('../', import.meta.url));

// Read the package's declared public CLI entry; do not use renderer internals or .cmd shells.
const require = createRequire(import.meta.url);
const manifestPath = require.resolve('@remotion/cli/package.json');
const manifest = JSON.parse(readFileSync(manifestPath, 'utf8')) as {bin: {remotion: string}};
const cli = join(dirname(manifestPath), manifest.bin.remotion);

export const runRemotion = (args: string[], capture = false): Promise<string> => new Promise((resolve, reject) => {
  const child = spawn(process.execPath, [cli, ...args], {
    cwd: PROJECT_ROOT,
    shell: false,
    windowsHide: true,
    stdio: ['ignore', capture ? 'pipe' : 'inherit', 'pipe'],
  });
  let output = '';
  let errors = '';
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
  child.on('error', reject);
  child.on('close', (code, signal) => {
    if (code !== 0) reject(new Error(`Remotion ${args[0]} failed (${signal ?? `exit ${code}`}): ${errors.trim()}`));
    else resolve(output);
  });
});
