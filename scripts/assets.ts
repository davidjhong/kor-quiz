import {realpath, stat} from 'node:fs/promises';
import {isAbsolute, join, relative, resolve, sep} from 'node:path';
import {getBackgroundAsset} from '../src/assets/backgrounds.ts';
import type {QuizInput} from '../src/quizSchema.ts';
import {PROJECT_ROOT} from './remotionCommand.ts';

export const validateBackgroundAsset = async (quiz: QuizInput, publicDirectory = join(PROJECT_ROOT, 'public')) => {
  const asset = getBackgroundAsset(quiz.backgroundAssetId);
  if (!asset) return;
  try {
    const root = await realpath(resolve(publicDirectory));
    const file = await realpath(join(root, asset.file));
    const within = relative(root, file);
    if (isAbsolute(within) || within === '..' || within.startsWith(`..${sep}`)) {
      throw new Error('Referenced file resolves outside the approved public asset directory');
    }
    const info = await stat(file);
    if (!info.isFile() || info.size === 0) throw new Error('Referenced file must be a nonempty regular file');
  } catch (error) {
    throw new Error(`Background asset ${JSON.stringify(quiz.backgroundAssetId)} (${asset.file}) is missing or invalid: ${error instanceof Error ? error.message : String(error)}`);
  }
};
