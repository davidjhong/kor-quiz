import {mkdir, mkdtemp, rm, writeFile} from 'node:fs/promises';
import {basename, dirname, extname, join, resolve} from 'node:path';
import {namedArguments} from './audioArguments.ts';
import {loadQuizFile} from './input.ts';
import {loadPreparedNarration} from './narrationFiles.ts';
import {checkOutput, promoteOutput} from './output.ts';
import {PROJECT_ROOT, runRemotion} from './remotionCommand.ts';
import {inspectNarratedVideo, validateMinimumDuration} from './mediaInspection.ts';
import {createBonusAnswerKey} from './answerKey.ts';
import {assertNarratedCheckpoint} from '../src/narration.ts';
import {getNarratedTimeline} from '../src/narrationTiming.ts';
import {assertLegacyDemo, loadProductionDraft, parseReviewMode, speechHash} from './draftWorkflow.ts';
import type {NarrationScript} from '../src/narration.ts';

const main = async () => {
  const args = namedArguments(process.argv.slice(2), ['--input', '--draft', '--audio-manifest', '--output', '--review-mode'], ['--overwrite', '--dry-run']);
  const draftPath = args.values.get('--draft');
  const reviewMode = parseReviewMode(args.values.get('--review-mode'));
  if (reviewMode === 'automated' && !draftPath) throw new Error('Automated mode requires --draft');
  if (draftPath && args.values.has('--input')) throw new Error('Choose --draft or legacy --input');
  const draft = draftPath ? await loadProductionDraft(resolve(draftPath), true, PROJECT_ROOT, reviewMode) : undefined;
  const quiz = draft?.quiz ?? await loadQuizFile(resolve(args.required('--input')));
  if (!draft) await assertLegacyDemo(quiz);
  assertNarratedCheckpoint(quiz);
  const narration = await loadPreparedNarration(resolve(args.required('--audio-manifest')), quiz);
  const preparedScript: NarrationScript = {version: 1, profile: narration.profile, segments: narration.clips};
  if (draft && speechHash(preparedScript) !== speechHash(draft.script)) throw new Error('Prepared narration text/profile does not match the accepted draft; rerun audio:prepare');
  if (!draft) await assertLegacyDemo(quiz, preparedScript);
  const timeline = getNarratedTimeline(narration, quiz);
  validateMinimumDuration(timeline.durationInFrames / 30, quiz.minimumDurationSeconds);
  if (args.flags.has('--dry-run')) {console.log(`Dry run: ${timeline.durationInFrames} frames; local audio validated. No render or paid requests.`); return;}
  const output = resolve(args.required('--output'));
  if (extname(output).toLowerCase() !== '.mp4') throw new Error('--output must end in .mp4');
  await checkOutput(output, args.flags.has('--overwrite'));
  const answerKey = draft?.answerKey ?? createBonusAnswerKey(quiz);
  const answerKeyPath = output.replace(/\.mp4$/iu, '.answer-key.txt');
  if (answerKey) await checkOutput(answerKeyPath, args.flags.has('--overwrite'));
  const timelinePath = output.replace(/\.mp4$/iu, '.timeline.json');
  await checkOutput(timelinePath, args.flags.has('--overwrite'));
  await mkdir(dirname(output), {recursive: true});
  const temporary = await mkdtemp(join(dirname(output), '.narrated-render-'));
  try {
    const props = join(temporary, 'props.json');
    const video = join(temporary, 'video.mp4');
    await writeFile(props, JSON.stringify({quiz, narration}), 'utf8');
    const emptyEnvironment = join(temporary, 'empty.env');
    await writeFile(emptyEnvironment, '', 'utf8');
    console.log(`Validated ${narration.clips.length} local audio clips. ${timeline.durationInFrames} frames / ${timeline.durationInFrames / 30}s. No TTS calls during render.`);
    console.log(JSON.stringify({questions: timeline.questions.map((question) => ({number: question.questionIndex + 1,
      bonus: question.bonus, start: question.start / 30, countdown: question.countdownStart / 30,
      revealOrComment: question.revealStart / 30, end: question.end / 30})),
      audio: timeline.audio.map((clip) => ({id: clip.id, start: clip.start / 30, end: clip.end / 30}))}, null, 2));
    const composition = quiz.questions.length === 1 ? 'CafeNarratedPreview' : 'CafeNarratedQuiz';
    await runRemotion(['render', join(PROJECT_ROOT, 'src/index.ts'), composition, video, '--props', props,
      `--env-file=${emptyEnvironment}`,
      '--codec=h264', '--pixel-format=yuv420p', '--color-space=bt709', '--crf=18', '--concurrency=2', '--audio-codec=aac', '--audio-bitrate=192k']);
    await inspectNarratedVideo(video, timeline.durationInFrames, timeline.speechEnd, quiz.minimumDurationSeconds);
    await runRemotion(['ffmpeg', '-v', 'error', '-xerror', '-i', video, '-c:v', 'rawvideo', '-f', 'null', '-'], true, 60000);
    if (answerKey) {
      const temporaryKey = join(temporary, 'answer-key.txt');
      await writeFile(temporaryKey, answerKey, 'utf8');
      await promoteOutput(temporaryKey, answerKeyPath, args.flags.has('--overwrite'));
    }
    const temporaryTimeline = join(temporary, 'timeline.json');
    await writeFile(temporaryTimeline, JSON.stringify({version: 1, fps: 30, durationInFrames: timeline.durationInFrames,
      questions: timeline.questions, segments: timeline.audio}, null, 2), 'utf8');
    await promoteOutput(temporaryTimeline, timelinePath, args.flags.has('--overwrite'));
    await promoteOutput(video, output, args.flags.has('--overwrite'));
    console.log(`Verified H.264/AAC, 1080x1920, 30 FPS, ${timeline.durationInFrames / 30}s. Saved ${output}`);
    if (answerKey) console.log(`Saved separate bonus answer key: ${answerKeyPath}`);
  } finally {
    if (dirname(temporary) !== dirname(output) || !basename(temporary).startsWith('.narrated-render-')) throw new Error('Unsafe narrated temporary cleanup path');
    await rm(temporary, {recursive: true, force: true});
  }
};
main().catch((error: unknown) => { console.error(error instanceof Error ? error.message : String(error)); process.exitCode = 1; });
