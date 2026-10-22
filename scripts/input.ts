import {readFile, stat} from 'node:fs/promises';
import {parseQuizInput} from '../src/quizSchema.ts';
import {validateBackgroundAsset} from './assets.ts';

const MAX_INPUT_BYTES = 64 * 1024;

export const loadQuizFile = async (inputPath: string, publicDirectory?: string) => {
  const info = await stat(inputPath);
  if (!info.isFile() || info.size > MAX_INPUT_BYTES) {
    throw new Error(`Input must be a JSON file no larger than ${MAX_INPUT_BYTES} bytes: ${inputPath}`);
  }
  const source = await readFile(inputPath, 'utf8');
  if (Buffer.byteLength(source, 'utf8') > MAX_INPUT_BYTES) throw new Error('Input exceeds the 64 KiB limit');
  let input: unknown;
  try {
    input = JSON.parse(source.replace(/^\uFEFF/u, ''));
  } catch (error) {
    throw new Error(`Invalid JSON in ${inputPath}: ${error instanceof Error ? error.message : String(error)}`);
  }
  const quiz = parseQuizInput(input);
  await validateBackgroundAsset(quiz, publicDirectory);
  return quiz;
};
