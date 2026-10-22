import {link, lstat, rename, unlink} from 'node:fs/promises';

export const checkOutput = async (outputPath: string, overwrite: boolean) => {
  try {
    const info = await lstat(outputPath);
    if (!info.isFile() && !info.isSymbolicLink()) throw new Error(`Output path is not a file: ${outputPath}`);
    if (!overwrite) throw new Error(`Output already exists: ${outputPath}. Use --overwrite to replace it.`);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
  }
};

export const promoteOutput = async (temporaryPath: string, outputPath: string, overwrite: boolean) => {
  if (overwrite) {
    // Same-filesystem rename: never delete the existing good output before rendering.
    await rename(temporaryPath, outputPath);
  } else {
    // Atomic create-if-absent, including a destination created while rendering.
    // NTFS supports hard links. Unsupported filesystems fail safely instead of overwriting.
    await link(temporaryPath, outputPath);
    await unlink(temporaryPath);
  }
};
