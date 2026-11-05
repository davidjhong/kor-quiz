/** Local silent layout preflight only; no acceptance, TTS or production video. */
import {mkdir, writeFile} from 'node:fs/promises';
import {join, resolve} from 'node:path';
import {namedArguments} from './audioArguments.ts';
import {atomicJson, readDraft} from './draftWorkflow.ts';
import {requireWithin} from './narrationFiles.ts';
import {PROJECT_ROOT, runRemotion} from './remotionCommand.ts';
import {EPISODE_TIMING, getIllustratedEpisodeTimeline} from '../src/quizTimeline.ts';

const args = namedArguments(process.argv.slice(2), ['--draft', '--out'], []);
const bundle = await readDraft(resolve(args.required('--draft')));
const folder = resolve(args.required('--out'));
requireWithin(join(PROJECT_ROOT, 'out'), folder);
await mkdir(folder, {recursive: true});
const props = join(folder, 'props.json'), environment = join(folder, 'empty.env');
await writeFile(props, JSON.stringify({quiz: bundle.quiz, illustrated: true}), 'utf8');
await writeFile(environment, '', 'utf8');
const timeline = getIllustratedEpisodeTimeline(bundle.quiz);
const frames = [{name: 'opening', frame: 30}, ...timeline.questionStarts.flatMap((start, index) => [
  {name: `q${index + 1}-reading`, frame: start + 45},
  {name: `q${index + 1}-reveal-or-comment`, frame: start + EPISODE_TIMING.question.revealStart + 15},
])];
const results = [];
for (const item of frames) {
  const output = join(folder, `${item.name}.png`);
  await runRemotion(['still', join(PROJECT_ROOT, 'src/index.ts'), 'CafeIllustratedQuiz', output,
    `--frame=${item.frame}`, `--props=${props}`, `--env-file=${environment}`, '--log=error'], true, 90000);
  results.push({...item, output, fits: true});
  console.log(`Layout fits: ${item.name}`);
}
await atomicJson(join(folder, 'layout-report.json'), {kind: 'silent-layout-preflight',
  contentHash: bundle.contentHash, productionNarrationTiming: false,
  note: 'Checks real text slots and the selected background. Final measured audio/CTA timing is verified on the narrated render.', results});
