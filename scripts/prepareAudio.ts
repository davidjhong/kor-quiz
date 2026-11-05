import {access, mkdir, readFile, rename, writeFile} from 'node:fs/promises';
import {dirname, join, resolve} from 'node:path';
import {namedArguments} from './audioArguments.ts';
import {loadQuizFile} from './input.ts';
import {PROJECT_ROOT} from './remotionCommand.ts';
import {assertNarratedCheckpoint, buildNarrationPlan, narrationScriptSchema, preparedNarrationSchema} from '../src/narration.ts';
import {AUDIO_PROCESSING, audioCacheKey, getClipCacheLocation, prepareClip, quizSpeechFingerprint, readJsonFile, requireWithin} from './narrationFiles.ts';
import {assertLegacyDemo, loadProductionDraft} from './draftWorkflow.ts';

const main = async () => {
  const args = namedArguments(process.argv.slice(2), ['--input', '--script', '--draft', '--output', '--max-cost-usd'],
    ['--synthesize', '--retry-uncertain', '--estimate', '--dry-run']);
  const dryRun = args.flags.has('--estimate') || args.flags.has('--dry-run');
  const draftPath = args.values.get('--draft');
  if (draftPath && (args.values.has('--input') || args.values.has('--script'))) throw new Error('Choose --draft or the legacy --input/--script pair');
  const draft = draftPath ? await loadProductionDraft(resolve(draftPath), !dryRun) : undefined;
  const quiz = draft?.quiz ?? await loadQuizFile(resolve(args.required('--input')));
  assertNarratedCheckpoint(quiz);
  const script = draft?.script ?? narrationScriptSchema.parse(await readJsonFile(resolve(args.required('--script'))));
  const plan = buildNarrationPlan(quiz, script);
  if (!draft && !dryRun) await assertLegacyDemo(quiz, script);
  const output = resolve(args.required('--output'));
  requireWithin(join(PROJECT_ROOT, 'public', 'audio'), output);
  if (!output.endsWith('.json')) throw new Error('--output must be a JSON manifest under public/audio');
  let missingCharacters = 0;
  const missing: string[] = [];
  for (const segment of plan) {
    if (segment.localFile) continue;
    const location = getClipCacheLocation(PROJECT_ROOT, audioCacheKey(segment, script.profile));
    const available = await Promise.all([join(location.directory, 'clip.json'), join(location.directory, 'original.bin')]
      .map((file) => access(file).then(() => true, () => false)));
    if (!available.some(Boolean)) { missingCharacters += [...segment.text].length; missing.push(segment.id); }
  }
  const estimate = missingCharacters * 0.00003;
  const maximumWithOneRetry = estimate * 2;
  if (dryRun) {
    console.log(JSON.stringify({segments: plan.length, reusable: plan.length - missing.length,
      uncachedSegments: missing, uncachedCharacters: missingCharacters, estimatedSynthesisCostUSD: estimate,
      estimatedMaximumWithOneRetryUSD: maximumWithOneRetry, approvalRequired: Boolean(draft)}, null, 2));
    return;
  }
  if (missing.length && !args.flags.has('--synthesize')) {
    throw new Error(`No accepted audio for: ${missing.join(', ')}. Add localFile and recordingId to a copy of the script, or obtain synthesis approval and configure Google credentials. No TTS request made.`);
  }
  const maximum = args.flags.has('--synthesize') ? Number(args.required('--max-cost-usd')) : 0;
  if (args.flags.has('--synthesize') && (!Number.isFinite(maximum) || maximum <= 0)) throw new Error('--max-cost-usd must be finite and positive');
  if (missing.length) {
    if (!Number.isFinite(maximum) || maximum <= 0 || maximumWithOneRetry > maximum) throw new Error(`Uncached usage including one retry per segment is estimated at $${maximumWithOneRetry.toFixed(6)}, exceeding the explicit budget`);
    if (!process.env.GOOGLE_CLOUD_PROJECT) {
      throw new Error('Configure GOOGLE_CLOUD_PROJECT in the environment or .env and authenticate local ADC; no Google TTS request made');
    }
    console.log(`Uncached synthesis: ${missingCharacters} characters; estimated $${estimate.toFixed(6)} before any eligible free allowance. Actual billing is determined by Google.`);
    if (args.flags.has('--retry-uncertain')) console.log('Explicit uncertain retry: an earlier request may already have been billed; this estimate excludes those possible prior charges.');
  }
  const usage = {cacheHits: 0, recoveredOriginals: 0, localPrepared: 0, newSynthesisRequests: 0,
    newSynthesisCharacters: 0, estimatedSynthesisCostUSD: 0};
  const clips = [];
  for (const segment of plan) {
    console.log(`Preparing ${segment.id} (${segment.language}; ${segment.localFile ? 'local recording' : 'Google/cache'})`);
    clips.push(await prepareClip(segment, script.profile, {synthesize: args.flags.has('--synthesize'), retryUncertain: args.flags.has('--retry-uncertain'),
      onEvent: (kind, requested) => {
        if (kind === 'cache-hit') usage.cacheHits++;
        if (kind === 'recovered-original') usage.recoveredOriginals++;
        if (kind === 'local-prepared') usage.localPrepared++;
        if (kind === 'synthesis-request') {
          const characters = [...requested.text].length;
          const cost = (usage.newSynthesisCharacters + characters) * 0.00003;
          if (cost > maximum + Number.EPSILON) throw new Error('Explicit synthesis budget would be exceeded; no further request made');
          usage.newSynthesisRequests++;
          usage.newSynthesisCharacters += characters;
          usage.estimatedSynthesisCostUSD = cost;
        }
      }}));
  }
  const manifest = preparedNarrationSchema.parse({version: 1, quizFingerprint: quizSpeechFingerprint(quiz),
    profile: script.profile, processing: AUDIO_PROCESSING, clips});
  await mkdir(dirname(output), {recursive: true});
  // Only finalized manifest references accepted clips. Partial preparations are never renderable.
  const temporary = `${output}.tmp`;
  await writeFile(temporary, JSON.stringify(manifest, null, 2), 'utf8');
  await rename(temporary, output);
  console.log(`Saved validated audio manifest: ${output}`);
  console.log(`Audio preparation summary: ${JSON.stringify(usage)}`);
};
main().catch((error: unknown) => { console.error(error instanceof Error ? error.message : String(error)); process.exitCode = 1; });
