import {namedArguments} from './audioArguments.ts';
import {atomicJson} from './draftWorkflow.ts';
import {loadComparison, estimateComparison, prepareComparison, renderComparison, verifyBaseline} from './comparisonWorkflow.ts';
import {loadEnvFile} from 'node:process';
const main = async () => {
  const [command, ...rest] = process.argv.slice(2);
  const args = namedArguments(rest, ['--config', '--profile'], ['--synthesize', '--overwrite']);
  if (command === 'prepare' && args.flags.has('--synthesize')) {
    try {loadEnvFile('.env');} catch (error) {if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;}
  }
  const input = await loadComparison(args.values.get('--config'));
  await verifyBaseline();
  if (command === 'estimate') {
    const report = await estimateComparison(input); await atomicJson('out/phase5c/estimate.json', report);
    console.log(JSON.stringify(report, null, 2));
  } else if (command === 'prepare') await prepareComparison(input, args.flags.has('--synthesize'));
  else if (command === 'render') {
    const selected = args.values.get('--profile');
    for (const profile of input.profiles.filter((p) => !selected || selected === p.id)) await renderComparison(input, profile.id, args.flags.has('--overwrite'));
    if (selected && !input.profiles.some((p) => p.id === selected)) throw new Error('Unknown --profile');
  } else throw new Error('Use voice:compare -- estimate | prepare [--synthesize] | render [--profile a-baseline|b-puck|c-achird]');
};
main().catch((error: unknown) => {console.error(error instanceof Error ? error.message : 'Comparison failed'); process.exitCode = 1;});
