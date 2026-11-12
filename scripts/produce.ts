import {namedArguments} from './audioArguments.ts';
import {produce} from './productionPipeline.ts';
import {produceQuestionPreview} from './questionPreviewPipeline.ts';
import {backgroundOptionsSchema} from './backgroundImages.ts';
import {readJsonFile} from './narrationFiles.ts';
import {join} from 'node:path';
const main=async()=>{
  const a=namedArguments(process.argv.slice(2),['--draft','--brief','--scenario','--preview-question','--background','--image-model','--image-quality','--background-reuse-limit','--background-character','--output','--resume','--job-id','--review-mode','--voice','--presentation','--model','--max-output-tokens','--max-cost-usd'],
    ['--dry-run','--allow-paid','--no-music','--overwrite','--recover-lock']);
  const review=a.values.get('--review-mode');if(review&&!['automated','manual'].includes(review))throw new Error('--review-mode must be automated or manual');
  const bg=a.values.get('--background'),hasBackground=['--background','--image-model','--image-quality','--background-reuse-limit','--background-character'].some(k=>a.values.has(k));
  const backgroundOptions=hasBackground?backgroundOptionsSchema.parse({mode:bg==='new'?'new':'auto',assetId:bg&&!['new','auto'].includes(bg)?bg:undefined,
    model:a.values.get('--image-model'),quality:a.values.get('--image-quality'),reuseLimit:a.values.has('--background-reuse-limit')?Number(a.values.get('--background-reuse-limit')):undefined,
    character:a.values.get('--background-character')}):undefined;
  const resume=a.values.get('--resume');if(resume&&!/^[a-z0-9][a-z0-9-]{0,31}$/u.test(resume))throw new Error('Invalid job ID');
  const isPreview=!!a.values.get('--preview-question')||!!(resume&&await readJsonFile(join('data/production-jobs',resume,'job.json')).then((j:any)=>j.kind==='question-preview'));
  if(isPreview&&backgroundOptions&&!a.values.has('--background-character'))backgroundOptions.character='adult woman';
  if(isPreview&&['--draft','--brief','--scenario','--review-mode','--max-output-tokens'].some(k=>a.values.has(k)))throw new Error('Question preview is a separate supplied-content mode; do not combine production source/review options');
  const run=isPreview?produceQuestionPreview:produce;
  const result=await run({previewQuestion:a.values.get('--preview-question'),backgroundOptions,draft:a.values.get('--draft'),brief:a.values.get('--brief'),scenario:a.values.get('--scenario'),output:a.values.get('--output'),resume,jobId:a.values.get('--job-id'),
    reviewMode:review as 'automated'|'manual'|undefined,voiceFile:a.values.get('--voice'),presentationFile:a.values.get('--presentation'),
    noMusic:a.flags.has('--no-music')?true:undefined,model:a.values.get('--model'),maxOutputTokens:a.values.has('--max-output-tokens')?Number(a.values.get('--max-output-tokens')):undefined,
    dryRun:a.flags.has('--dry-run'),allowPaid:a.flags.has('--allow-paid'),maxCostUSD:a.values.has('--max-cost-usd')?Number(a.values.get('--max-cost-usd')):undefined,
    overwrite:a.flags.has('--overwrite'),recoverLock:a.flags.has('--recover-lock')});
  console.log(JSON.stringify(result,null,2));
};
main().catch((e:unknown)=>{console.error(e instanceof Error?e.message:'Production failed');process.exitCode=1;});
