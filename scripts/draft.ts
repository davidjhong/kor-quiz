import {resolve, join} from 'node:path';
import {namedArguments} from './audioArguments.ts';
import {readJsonFile} from './narrationFiles.ts';
import {approveDraft, importDraft, inspectDraft, parseReviewMode, writeReview} from './draftWorkflow.ts';
import {runAutomatedReview} from './automatedReview.ts';
import {DEFAULT_DRAFT_MODEL, generateDraft} from './openaiGeneration.ts';
import {freezeGenerationExperiment, loadGenerationExperiment} from './generationExperiment.ts';

const main = async () => {
  const [command, ...remaining] = process.argv.slice(2);
  if (!['freeze', 'generate', 'import', 'validate', 'review', 'approve', 'auto-review'].includes(command)) {
    throw new Error('Use: npm run draft -- generate --brief <brief.json> --id <episode-id> --out <folder> [--dry-run | --allow-paid --max-cost-usd <cap> --budget-id <test-id>]; or import --source <local.json> --brief <brief.json> --out <folder>; or validate/review/approve --draft <folder>; or auto-review --draft <folder> [--dry-run | --allow-paid --budget-id <id> --max-cost-usd <cap>]');
  }
  const args = namedArguments(remaining, ['--source', '--brief', '--out', '--draft', '--reviewer', '--confirm-hash',
    '--id', '--model', '--max-output-tokens', '--max-cost-usd', '--budget-id', '--experiment', '--review-mode'],
    ['--dry-run', '--replace', '--confirm-review', '--allow-paid', '--regenerate']);
  let report;
  if (command === 'auto-review') {
    const directory = resolve(args.required('--draft'));
    const result = await runAutomatedReview({directory, model: args.values.get('--model'), budgetId: args.values.get('--budget-id'),
      maxCostUSD: Number(args.values.get('--max-cost-usd')), allowPaid: args.flags.has('--allow-paid'), dryRun: args.flags.has('--dry-run')});
    console.log(JSON.stringify(result, null, 2));
    if (result.status === 'needs-revision') {await writeReview(directory, undefined, 'automated'); process.exitCode = 1;}
    return;
  }
  if (command === 'freeze') {
    console.log(JSON.stringify(await freezeGenerationExperiment(await readJsonFile(resolve(args.required('--experiment'))),
      resolve(args.required('--out'))), null, 2));
    console.log('Frozen local experiment only. Separate spending approval and --allow-paid are required; no API calls made.');
    return;
  }
  if (command === 'generate') {
    const experiment = args.values.get('--experiment');
    const spec = experiment ? (await loadGenerationExperiment(resolve(experiment))).payload.spec : undefined;
    const episodeId = args.required('--id'), scope = spec?.scenarios.find((s) => s.episodeId === episodeId);
    if (spec && !scope) throw new Error('Question ID is outside this frozen experiment');
    const result = await generateDraft({brief: await readJsonFile(resolve(args.values.get('--brief') ?? scope?.briefFile ?? args.required('--brief'))),
      episodeId, output: resolve(args.values.get('--out') ?? scope?.output ?? args.required('--out')),
      model: args.values.get('--model') ?? spec?.model ?? process.env.OPENAI_DRAFT_MODEL ?? DEFAULT_DRAFT_MODEL,
      maxOutputTokens: Number(args.values.get('--max-output-tokens') ?? spec?.maxOutputTokens ?? 12000),
      maxCostUSD: Number(args.values.get('--max-cost-usd') ?? spec?.maxCostUSD), budgetId: args.values.get('--budget-id') ?? spec?.budgetId,
      experiment,
      allowPaid: args.flags.has('--allow-paid'), dryRun: args.flags.has('--dry-run'), regenerate: args.flags.has('--regenerate')});
    console.log(JSON.stringify(result, null, 2));
    if (result.report && !result.report.valid) process.exitCode = 1;
    console.log('Choose manual linguistic review or draft auto-review before audio/render. No content acceptance, TTS or production render performed.');
    return;
  } else if (command === 'import') {
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
    report = command === 'review' && !args.flags.has('--dry-run') ? await writeReview(directory, undefined, parseReviewMode(args.values.get('--review-mode')))
      : await inspectDraft(await readJsonFile(join(directory, 'draft.json')), await readJsonFile(join(directory, 'answer-key.json')));
  }
  console.log(JSON.stringify(report, null, 2));
  if (!report.valid) process.exitCode = 1;
  console.log(parseReviewMode(args.values.get('--review-mode')) === 'automated'
    ? 'Automated development mode uses a separate hash-bound acceptance. No human approval is required; no LLM/TTS requests made by this command.'
    : 'Manual mode requires human linguistic review and explicit approval. Automated development review is available with draft auto-review. No LLM/TTS requests made.');
};
main().catch((error: unknown) => {console.error(error instanceof Error ? error.message : String(error)); process.exitCode = 1;});
