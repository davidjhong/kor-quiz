import {resolve, join} from 'node:path';
import {namedArguments} from './audioArguments.ts';
import {readJsonFile} from './narrationFiles.ts';
import {approveDraft, importDraft, inspectDraft, writeReview} from './draftWorkflow.ts';

const main = async () => {
  const [command, ...remaining] = process.argv.slice(2);
  if (!['import', 'validate', 'review', 'approve'].includes(command)) {
    throw new Error('Use: npm run draft -- import --source <local.json> --brief <brief.json> --out <draft-folder> [--dry-run | --replace]; or validate/review/approve --draft <folder>');
  }
  const args = namedArguments(remaining, ['--source', '--brief', '--out', '--draft', '--reviewer', '--confirm-hash'],
    ['--dry-run', '--replace', '--confirm-review']);
  let report;
  if (command === 'import') {
    report = await importDraft(await readJsonFile(resolve(args.required('--source'))),
      await readJsonFile(resolve(args.required('--brief'))), resolve(args.required('--out')),
      {dryRun: args.flags.has('--dry-run'), replace: args.flags.has('--replace')});
  } else if (command === 'approve') {
    const approval = await approveDraft(resolve(args.required('--draft')), args.required('--reviewer'),
      args.required('--confirm-hash'), args.flags.has('--confirm-review'), {dryRun: args.flags.has('--dry-run')});
    console.log(`${args.flags.has('--dry-run') ? 'Dry run; no approval stored' : 'Human approval stored separately'}: ${approval.contentHash}`);
    return;
  } else {
    const directory = resolve(args.required('--draft'));
    report = command === 'review' && !args.flags.has('--dry-run') ? await writeReview(directory)
      : await inspectDraft(await readJsonFile(join(directory, 'draft.json')), await readJsonFile(join(directory, 'answer-key.json')));
  }
  console.log(JSON.stringify(report, null, 2));
  if (!report.valid) process.exitCode = 1;
  console.log('Human linguistic review and explicit approval are still required. No LLM/TTS requests made.');
};
main().catch((error: unknown) => {console.error(error instanceof Error ? error.message : String(error)); process.exitCode = 1;});
