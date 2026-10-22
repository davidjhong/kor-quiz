import {mkdir, mkdtemp, rm, writeFile} from 'node:fs/promises';
import {basename, dirname, extname, join, resolve} from 'node:path';
import {parseRenderArguments, RENDER_USAGE} from './arguments.ts';
import {loadQuizFile} from './input.ts';
import {inspectVideo, validateMinimumDuration} from './mediaInspection.ts';
import {checkOutput, promoteOutput} from './output.ts';
import {PROJECT_ROOT, runRemotion} from './remotionCommand.ts';
import {getIllustratedEpisodeTimeline} from '../src/quizTimeline.ts';
import {createBonusAnswerKey} from './answerKey.ts';
import {PREVIEW_QUESTION_TIMELINE, QUIZ_FPS} from '../src/questionTiming.ts';

const main = async () => {
  const args = parseRenderArguments(process.argv.slice(2));
  if (!args) { console.log(RENDER_USAGE); return; }
  const inputPath = resolve(args.input);
  const outputPath = resolve(args.output);
  if (extname(inputPath).toLowerCase() !== '.json') throw new Error('--input must be a .json file');
  if (extname(outputPath).toLowerCase() !== '.mp4') throw new Error('--output must be an .mp4 file');
  if (inputPath.toLowerCase() === outputPath.toLowerCase()) throw new Error('Input and output paths must differ');

  // Complete input validation and overwrite checks before starting Remotion or creating artifacts.
  const quiz = await loadQuizFile(inputPath);
  const isPreview = args.preview || args.illustratedPreview;
  if (isPreview && quiz.endingMode === 'comment-challenge') {
    throw new Error('Comment-challenge mode requires a full episode; use render:cafe or render without preview flags');
  }
  // All full JSON renders use the approved episode/ending policy. Comparison
  // compositions remain available in Studio and the dedicated sample scripts.
  const illustrated = !isPreview;
  const timeline = isPreview ? PREVIEW_QUESTION_TIMELINE
    : getIllustratedEpisodeTimeline(quiz);
  validateMinimumDuration(timeline.durationInFrames / QUIZ_FPS, quiz.minimumDurationSeconds);
  const composition = illustrated ? 'CafeIllustratedQuiz'
    : args.illustratedPreview ? 'CafeIllustratedPreview' : args.preview ? 'CafePolishPreview' : 'KoreanQuiz';
  await checkOutput(outputPath, args.overwrite);
  const answerKey = createBonusAnswerKey(quiz);
  const answerKeyPath = outputPath.replace(/\.mp4$/iu, '.answer-key.txt');
  if (answerKey) await checkOutput(answerKeyPath, args.overwrite);
  await mkdir(dirname(outputPath), {recursive: true});
  const temporaryDirectory = await mkdtemp(join(dirname(outputPath), '.quiz-render-'));
  try {
    const temporaryVideo = join(temporaryDirectory, 'video.mp4');
    const propsPath = join(temporaryDirectory, 'props.json');
    await writeFile(propsPath, JSON.stringify({quiz, ...(illustrated ? {illustrated: true} : {})}), 'utf8');
    const scope = isPreview ? `first-question preview (1 / ${quiz.questions.length})` : `${quiz.questions.length} questions`;
    console.log(`Validated ${JSON.stringify(quiz.videoId)}: ${scope}, ${timeline.durationInFrames} frames, ${timeline.durationInFrames / QUIZ_FPS}s.`);
    console.log('Starting Remotion render...');
    await runRemotion([
      'render', join(PROJECT_ROOT, 'src/index.ts'), composition, temporaryVideo,
      '--props', propsPath,
      '--codec=h264', '--pixel-format=yuv420p', '--color-space=bt709', '--crf=18', '--concurrency=2',
    ]);
    const metadata = await inspectVideo(temporaryVideo, timeline.durationInFrames, quiz.minimumDurationSeconds);
    if (answerKey) {
      const temporaryKey = join(temporaryDirectory, 'answer-key.txt');
      await writeFile(temporaryKey, answerKey, 'utf8');
      await promoteOutput(temporaryKey, answerKeyPath, args.overwrite);
    }
    await promoteOutput(temporaryVideo, outputPath, args.overwrite);
    console.log(`Verified ${metadata.width}x${metadata.height}, ${metadata.fps} FPS, H.264/yuv420p, ${metadata.duration}s.`);
    console.log(`Saved ${outputPath}`);
    if (answerKey) console.log(`Saved private bonus answer key: ${answerKeyPath}`);
  } finally {
    // Only remove this invocation's generated directory inside the requested output folder.
    if (dirname(temporaryDirectory) !== dirname(outputPath) || !basename(temporaryDirectory).startsWith('.quiz-render-')) {
      throw new Error(`Refusing to clean an unexpected temporary path: ${temporaryDirectory}`);
    }
    await rm(temporaryDirectory, {recursive: true, force: true});
  }
};

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
