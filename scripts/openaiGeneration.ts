import OpenAI from 'openai';
import {zodTextFormat} from 'openai/helpers/zod';
import type {Response, ResponseCreateParamsNonStreaming} from 'openai/resources/responses/responses';
import {z} from 'zod';
import {mkdir, open, readFile, unlink, writeFile} from 'node:fs/promises';
import {join, relative, resolve, sep} from 'node:path';
import {briefSchema, tokenUsageSchema, type Draft} from '../src/draftSchema.ts';
import {assembleGeneratedDraft, episodeIdSchema, generationOutputSchema, generationPrompt,
  PROMPT_VERSION, SCHEMA_VERSION} from './generationContent.ts';
import {atomicJson, contentHash, inspectDraft, writeReview} from './draftWorkflow.ts';
import {canonical, readJsonFile, requireWithin, sha256} from './narrationFiles.ts';
import {PROJECT_ROOT} from './remotionCommand.ts';
import {generationCostBound, LEGACY_DRAFT_MODEL, MAX_REQUEST_BYTES, modelChargeUnits, modelProfile,
  REQUEST_TOKEN_OVERHEAD, QUALITY_DRAFT_MODEL} from './generationModels.ts';
import {checkGenerationExperiment, loadGenerationExperiment} from './generationExperiment.ts';
export {generationCostBound} from './generationModels.ts';

export const DEFAULT_DRAFT_MODEL = LEGACY_DRAFT_MODEL;
export const GENERATION_PRICING = modelProfile(DEFAULT_DRAFT_MODEL);
const usage = tokenUsageSchema.nullable();
const attemptSchema = z.object({number: z.number().int().min(1).max(2), state: z.enum([
  'pending', 'received', 'valid', 'invalid', 'incomplete', 'refused', 'rate-limit', 'terminal', 'uncertain']),
  reservedUnits: z.number().int().nonnegative(), chargedUnits: z.number().int().nonnegative(), startedAt: z.string(),
  usage, requestId: z.string().nullable(), returnedModel: z.string().nullable(), errors: z.array(z.string())});
const scenarioSchema = z.object({intentHash: z.string(), directory: z.string(), attempts: z.array(attemptSchema).max(2)});
const ledgerSchema = z.object({version: z.literal(1), budgetId: z.string(), capUnits: z.number().int().positive(),
  createdAt: z.string(), pricing: z.enum(['gpt-5-nano-2026-11-04', 'gpt-6-luna-2026-11-04']),
  contractHash: z.string().optional(), scenarios: z.record(z.string(), scenarioSchema)});
type Ledger = z.infer<typeof ledgerSchema>;
type Attempt = z.infer<typeof attemptSchema>;
type Snapshot = Pick<Response, 'id' | 'model' | 'status' | 'output' | 'usage' | 'incomplete_details'> & {_request_id?: string | null};
export type GenerationClient = {create: (body: ResponseCreateParamsNonStreaming) => Promise<Snapshot>};
export type GenerateOptions = {brief: unknown; episodeId: string; output: string; model?: string; maxOutputTokens?: number;
  allowPaid?: boolean; maxCostUSD?: number; budgetId?: string; dryRun?: boolean; regenerate?: boolean; root?: string;
  experiment?: string; client?: GenerationClient; prompt?: {system: string; user: string; exampleCount: number; historyCount: number};
  pause?: (ms: number) => Promise<void>; now?: Date; afterResponseSaved?: () => Promise<void>};
const maybeJson = async (path: string) => readJsonFile(path).catch((e: NodeJS.ErrnoException) => {if (e.code === 'ENOENT') return null; throw e;});
const dollars = (units: number) => units / 1e9;
export const normalizedUsage = (raw: Snapshot['usage']) => {
  if (!raw) return null;
  const result = tokenUsageSchema.parse({inputTokens: raw.input_tokens, outputTokens: raw.output_tokens, totalTokens: raw.total_tokens,
    reasoningTokens: raw.output_tokens_details?.reasoning_tokens ?? 0, cachedInputTokens: raw.input_tokens_details?.cached_tokens ?? 0});
  if (result.totalTokens !== result.inputTokens + result.outputTokens || result.reasoningTokens > result.outputTokens
    || result.cachedInputTokens > result.inputTokens) throw new Error('Invalid token usage accounting from API');
  return result;
};
export const classifyGenerationError = (error: unknown) => {
  const data = (error && typeof error === 'object' ? error : {}) as {status?: number; code?: string; request_id?: string};
  const requestId = typeof data.request_id === 'string' && /^[a-zA-Z0-9_-]{1,160}$/u.test(data.request_id) ? data.request_id : null;
  if (data.status === 429 && data.code === 'rate_limit_exceeded') return {state: 'rate-limit' as const, requestId, message: 'OpenAI rate limit rejected the request; at most one bounded retry is permitted.'};
  if ([400, 401, 403, 404, 422, 429].includes(data.status ?? 0)) return {state: 'terminal' as const, requestId,
    message: `OpenAI rejected generation (HTTP ${data.status}); check credentials locally, permissions, credits, model support or request format. No automatic retry.`};
  return {state: 'uncertain' as const, requestId, message: 'OpenAI request outcome/billing is uncertain (timeout, connection or server failure). Reserved cost retained; no automatic retry. Inspect saved accounting and provider usage before further calls.'};
};
export const makeGenerationClient = (): GenerationClient => {
  if (!process.env.OPENAI_API_KEY) throw new Error('Configure OPENAI_API_KEY in the ignored local .env; never paste it into chat. No request made.');
  const sdk = new OpenAI({apiKey: process.env.OPENAI_API_KEY, baseURL: 'https://api.openai.com/v1',
    maxRetries: 0, timeout: 90000, logLevel: 'off'});
  return {create: async (body) => {
    const {data, request_id} = await sdk.responses.create(body, {maxRetries: 0, timeout: 90000}).withResponse();
    return {...data, _request_id: request_id};
  }};
};
const totalUnits = (ledger: Ledger) => Object.values(ledger.scenarios).flatMap((s) => s.attempts).reduce((n, a) => n + a.chargedUnits, 0);
const responseText = (response: Snapshot) => response.output.flatMap((item) => item.type === 'message'
  ? item.content.filter((c) => c.type === 'output_text').map((c) => c.text) : []).join('');
const refusal = (response: Snapshot) => response.output.some((item) => item.type === 'message' && item.content.some((c) => c.type === 'refusal'));
const redactSnapshot = (r: Snapshot): Snapshot => ({id: r.id, model: r.model, status: r.status, output: r.output,
  usage: r.usage, incomplete_details: r.incomplete_details, _request_id: r._request_id ?? null});
const saveFailure = async (directory: string, errors: string[]) => {
  await atomicJson(join(directory, 'generation-error.json'), {valid: false, errors});
  if (await maybeJson(join(directory, 'draft.json'))) return; // Retain the last complete candidate and its review.
  await atomicJson(join(directory, 'validation.json'), {valid: false, linguisticReviewRequired: true,
    renderReady: false, errors, contentHash: null, reason: 'No complete validated draft was assembled.'});
  await writeFile(join(directory, 'review.md'), ['# PRIVATE generation failure — unapproved', '',
    'No complete reviewable draft was assembled. Raw responses and attempts are in generation/.',
    'No linguistic approval, audio preparation or production render has occurred.', '',
    ...errors.map((error) => `- ${error.replace(/[\r\n]/gu, ' ')}`), ''].join('\n'), 'utf8');
};
export const recordGenerationEdits = async (directory: string) => {
  const generation = await maybeJson(join(directory, 'generation.json')) as {initialContentHash?: string} | null;
  if (!generation?.initialContentHash) return;
  const draft = await maybeJson(join(directory, 'draft.json')), key = await maybeJson(join(directory, 'answer-key.json'));
  if (!draft || !key) return;
  const currentHash = contentHash(draft, key);
  if (currentHash !== generation.initialContentHash) {
    const edits = await maybeJson(join(directory, 'generation/edits.json')) as Array<{contentHash: string}> | null;
    if (!edits?.some((e) => e.contentHash === currentHash)) await atomicJson(join(directory, 'generation/edits.json'),
      [...edits ?? [], {observedAt: new Date().toISOString(), initialContentHash: generation.initialContentHash, contentHash: currentHash}]);
  }
};

export const generateDraft = async (options: GenerateOptions) => {
  const root = resolve(options.root ?? PROJECT_ROOT), directory = resolve(options.output), brief = briefSchema.parse(options.brief);
  if (!brief.scenarioType) throw new Error('Generated briefs require scenarioType: cafe, convenience-store or public-transit, so background matching can be checked.');
  episodeIdSchema.parse(options.episodeId);
  requireWithin(root, directory);
  if (relative(root, directory).split(sep)[0] === 'public') throw new Error('Private generated drafts must stay outside public assets');
  const model = options.model ?? DEFAULT_DRAFT_MODEL, maxOutput = options.maxOutputTokens ?? 12000;
  const inputs = {brief, episodeId: options.episodeId, model, maxOutput};
  const inputsHash = sha256(canonical(inputs));
  let intentHash = sha256(canonical({...inputs, PROMPT_VERSION, SCHEMA_VERSION}));
  const existing = await maybeJson(join(directory, 'generation.json')) as {intentHash: string; inputsHash?: string; initialContentHash?: string; experimentHash?: string} | null;
  if (existing) {
    if (options.experiment && existing.experimentHash !== (await loadGenerationExperiment(resolve(root, options.experiment))).hash) {
      throw new Error('Saved result belongs to a different experiment. Preserve it and use the new experiment output directory.');
    }
    // A code/prompt upgrade must not turn a normal rerun into a paid regeneration.
    const savedDraft = await readJsonFile(join(directory, 'draft.json')) as {provenance?: {promptVersion?: string; schemaVersion?: string}};
    const originalIntent = sha256(canonical({...inputs, PROMPT_VERSION: savedDraft.provenance?.promptVersion,
      SCHEMA_VERSION: savedDraft.provenance?.schemaVersion}));
    if (existing.inputsHash !== inputsHash && existing.intentHash !== originalIntent) throw new Error('Generation inputs changed; choose a new output directory. Existing drafts/edits are preserved.');
    intentHash = existing.intentHash;
    if (!options.dryRun) await recordGenerationEdits(directory);
    if (!options.regenerate && !options.dryRun) return {reused: true, report: await writeReview(directory, root), calls: 0};
    if (options.regenerate && existing.initialContentHash && contentHash(await readJsonFile(join(directory, 'draft.json')), await readJsonFile(join(directory, 'answer-key.json'))) !== existing.initialContentHash) {
      throw new Error('Human edits detected; regeneration must use a new output directory. No draft was overwritten.');
    }
  } else if (await maybeJson(join(directory, 'draft.json'))) throw new Error('Output already contains a draft; choose a new directory rather than overwrite it');
  const reservedUnits = generationCostBound(maxOutput, model, options.now);
  const pricing = modelProfile(model);
  const experiment = options.experiment ? await checkGenerationExperiment(options.experiment, {
    root, brief, episodeId: options.episodeId, output: directory, model, maxOutput,
    budgetId: options.budgetId, maxCostUSD: options.maxCostUSD}) : undefined;
  if (pricing.model === QUALITY_DRAFT_MODEL && !experiment && !options.dryRun) throw new Error('The upgrade model requires a frozen experiment. Run draft freeze, then pass --experiment; a new budget ID is not approval.');
  const prompt = experiment?.prompt ?? options.prompt ?? await generationPrompt(brief, root);
  const baseRequest: ResponseCreateParamsNonStreaming = {model, store: false, service_tier: 'default', reasoning: {effort: pricing.reasoning},
    max_output_tokens: maxOutput, input: [{role: 'system', content: prompt.system}, {role: 'user', content: prompt.user}],
    text: {format: zodTextFormat(generationOutputSchema, 'korean_quiz_education')}};
  const estimatedInputTokens = Buffer.byteLength(JSON.stringify(baseRequest), 'utf8') + REQUEST_TOKEN_OVERHEAD;
  const dryReport = {model, scenario: brief.scenario, audience: brief.audience, level: brief.level,
    backgroundAssetId: brief.backgroundAssetId, examples: prompt.exampleCount, priorQuestions: prompt.historyCount,
    estimatedInputTokens, reservedInputTokenCeiling: pricing.reservedInputTokens, maxOutputTokens: maxOutput,
    reasoningEffort: pricing.reasoning, promptVersion: PROMPT_VERSION, schemaVersion: SCHEMA_VERSION,
    experimentHash: experiment?.hash, reasoningIncludedInOutputLimit: true, maximumAttempts: 2, sdkRetries: 0, pricing,
    estimatedMaximumPerRequestUSD: dollars(reservedUnits), estimatedMaximumScenarioUSD: dollars(reservedUnits * 2),
    authorizationRequired: true};
  if (options.dryRun) return {reused: Boolean(existing), dryRun: dryReport, calls: 0};
  if (!options.allowPaid) throw new Error('Paid generation requires explicit --allow-paid, --max-cost-usd and --budget-id. Use --dry-run first.');
  const budgetId = episodeIdSchema.parse(options.budgetId);
  if (!Number.isFinite(options.maxCostUSD) || options.maxCostUSD! <= 0) throw new Error('--max-cost-usd must be finite and positive');
  const capUnits = Math.floor(options.maxCostUSD! * 1e9);
  const folder = join(root, 'data/generation-budgets');
  await mkdir(folder, {recursive: true});
  const ledgerFile = join(folder, `${budgetId}.json`), lockFile = join(folder, `${budgetId}.lock`);
  const lock = await open(lockFile, 'wx').catch(() => {throw new Error('Generation budget is locked. Check for an active process or an interrupted/uncertain request before retrying.');});
  let calls = 0;
  try {
    const saved = await maybeJson(ledgerFile);
    const ledger: Ledger = saved ? ledgerSchema.parse(saved) : {version: 1, budgetId, capUnits,
      createdAt: new Date().toISOString(), pricing: pricing.id, ...(experiment ? {contractHash: experiment.hash} : {}), scenarios: {}};
    if (ledger.capUnits !== capUnits || ledger.budgetId !== budgetId) throw new Error('Existing test-budget cap cannot be reset or increased by rerunning the command. Use the same cap; new spending needs separate authorization.');
    if (ledger.pricing !== pricing.id || ledger.contractHash !== experiment?.hash) throw new Error('This budget is bound to a different model or frozen contract. Preserve it and propose a separately authorized experiment.');
    if (Object.values(ledger.scenarios).some((s) => s.attempts.some((a) => a.state === 'uncertain'))) {
      throw new Error('This budget has a billing-uncertain request. Inspect saved accounting and provider usage before further calls.');
    }
    let scenario = Object.hasOwn(ledger.scenarios, options.episodeId) ? ledger.scenarios[options.episodeId] : undefined;
    if (!scenario) scenario = ledger.scenarios[options.episodeId] = {intentHash, directory, attempts: []};
    if (scenario.intentHash !== intentHash) throw new Error('This scenario already has different inputs/model in the test ledger; no silent reset or fallback is allowed');
    if (scenario.directory !== directory) throw new Error('This scenario is already recorded in another output directory. Reuse its original directory; saved responses and attempt limits cannot be relocated implicitly.');
    const completed = scenario.attempts.at(-1);
    if (completed && ['terminal', 'uncertain', 'refused'].includes(completed.state)) throw new Error('Earlier request is terminal or billing-uncertain; no automatic retry. Inspect saved attempts before authorizing a new test.');
    if (scenario.attempts.length >= 2 && completed && !['pending', 'received'].includes(completed.state)) {
      throw new Error('Two-request scenario limit exhausted. Saved content is retained; no further request was made.');
    }
    await mkdir(join(directory, 'generation'), {recursive: true});
    let feedback: string[] = [], previousText = '';
    if (options.regenerate && existing) {
      feedback = (await inspectDraft(await readJsonFile(join(directory, 'draft.json')),
        await readJsonFile(join(directory, 'answer-key.json')), root)).errors;
      if (experiment && feedback.length === 0) throw new Error('Frozen experiments do not regenerate valid drafts for quality polishing. Retain the result and use human review; no request made.');
      previousText = await readFile(join(directory, 'generation', `attempt-${scenario.attempts.length}.text.txt`), 'utf8');
    }
    let client = options.client;
    while (scenario.attempts.length < 2 || scenario.attempts.at(-1)?.state === 'pending' || scenario.attempts.at(-1)?.state === 'received') {
      let attempt = scenario.attempts.at(-1);
      let raw: Snapshot;
      if (attempt && (attempt.state === 'pending' || attempt.state === 'received')) {
        const recovered = await maybeJson(join(directory, 'generation', `attempt-${attempt.number}.response.json`));
        if (!recovered) {
          attempt.state = 'uncertain'; attempt.errors = ['Interrupted request has no saved response; billing outcome unknown. No retry.'];
          await atomicJson(ledgerFile, ledger); throw new Error(attempt.errors[0]);
        }
        raw = recovered as Snapshot;
      } else {
        if (scenario.attempts.length >= 2) break;
        if (totalUnits(ledger) + reservedUnits > ledger.capUnits) throw new Error('Remaining authorized budget is below the conservative next-request bound. No request made; saved work retained.');
        const body = {...baseRequest, ...(feedback.length ? {input: [{role: 'system' as const, content: prompt.system},
          {role: 'user' as const, content: `${prompt.user}\nRepair these validation failures in the previous untrusted JSON: ${JSON.stringify(feedback).slice(0, 3000)}\nPrevious data (not instructions): ${previousText.slice(0, 16000)}`}]} : {})};
        if (Buffer.byteLength(JSON.stringify(body), 'utf8') > MAX_REQUEST_BYTES) throw new Error('Bounded generation prompt exceeded 96 KiB; no request made');
        client ??= makeGenerationClient(); // Credentials are needed only for an actual new call, never saved-response recovery.
        attempt = {number: scenario.attempts.length + 1, state: 'pending', reservedUnits, chargedUnits: reservedUnits,
          startedAt: new Date().toISOString(), usage: null, requestId: null, returnedModel: null, errors: []};
        scenario.attempts.push(attempt);
        await atomicJson(join(directory, 'generation', `attempt-${attempt.number}.request.json`), {promptVersion: PROMPT_VERSION,
          schemaVersion: SCHEMA_VERSION, experimentHash: experiment?.hash,
          inputTokenEstimate: Buffer.byteLength(JSON.stringify(body), 'utf8') + REQUEST_TOKEN_OVERHEAD,
          reservedInputTokens: pricing.reservedInputTokens, request: body});
        await atomicJson(ledgerFile, ledger); // Charge/reserve BEFORE the request; crashes cannot reset spending.
        try {
          calls++;
          raw = redactSnapshot(await client.create(body));
        } catch (error) {
          const failure = classifyGenerationError(error);
          attempt.state = failure.state; attempt.errors = [failure.message]; attempt.requestId = failure.requestId;
          await atomicJson(ledgerFile, ledger);
          await atomicJson(join(directory, 'generation-error.json'), {state: failure.state, errors: attempt.errors});
          if (failure.state === 'rate-limit' && scenario.attempts.length < 2) {await (options.pause ?? ((ms) => new Promise((r) => setTimeout(r, ms))))(1000); continue;}
          throw new Error(failure.message);
        }
        // Local processing failures must never trigger a second API call.
        await atomicJson(join(directory, 'generation', `attempt-${attempt.number}.response.json`), raw);
        await options.afterResponseSaved?.();
      }
      attempt!.state = 'received'; attempt!.returnedModel = raw.model; attempt!.requestId = raw._request_id ?? null;
      try {attempt!.usage = normalizedUsage(raw.usage);}
      catch {attempt!.state = 'uncertain'; await atomicJson(ledgerFile, ledger); throw new Error('Invalid/missing trustworthy usage; reserved cost retained, no automatic retry');}
      if (attempt!.usage) attempt!.chargedUnits = modelChargeUnits(model, attempt!.usage.inputTokens, attempt!.usage.outputTokens);
      if (attempt!.chargedUnits > attempt!.reservedUnits || (attempt!.usage?.inputTokens ?? 0) > pricing.reservedInputTokens
        || !(pricing.returnedModels as readonly string[]).includes(raw.model)) {
        attempt!.chargedUnits = Math.max(attempt!.chargedUnits, attempt!.reservedUnits);
        attempt!.state = 'uncertain'; await atomicJson(ledgerFile, ledger); throw new Error('Returned model/usage exceeded verified assumptions; no fallback or further request');
      }
      await atomicJson(ledgerFile, ledger);
      previousText = responseText(raw);
      await writeFile(join(directory, 'generation', `attempt-${attempt!.number}.text.txt`), previousText, 'utf8');
      feedback = [];
      if (refusal(raw)) {attempt!.state = 'refused'; feedback = ['Model refused the request; no automatic retry.'];}
      else if (raw.status !== 'completed') {attempt!.state = 'incomplete'; feedback = [`Response is ${raw.status ?? 'unknown'}; do not use truncated content.`];}
      else {
        try {
          const education = generationOutputSchema.parse(JSON.parse(previousText));
          const provenance: Draft['provenance'] = {method: 'openai-responses', provider: 'openai', model: raw.model,
            requestedModel: model, returnedModel: raw.model, promptVersion: PROMPT_VERSION, schemaVersion: SCHEMA_VERSION,
            generatedAt: attempt!.startedAt, sourceHash: sha256(canonical(education)), requestId: attempt!.requestId,
            responseId: raw.id, reportedUsage: attempt!.usage, estimatedCostUSD: dollars(scenario.attempts.reduce((n, a) => n + a.chargedUnits, 0)),
            attempts: scenario.attempts.length, pricingSource: pricing.source, pricingDate: pricing.checked, generationId: budgetId};
          const candidate = assembleGeneratedDraft(education, brief, options.episodeId, provenance);
          await atomicJson(join(directory, 'generation', `attempt-${attempt!.number}.candidate.json`), candidate);
          const report = await inspectDraft(candidate.draft, candidate.key, root);
          feedback = report.errors;
          const prior = await maybeJson(join(directory, 'generation.json')) as {initialContentHash?: string} | null;
          if (await maybeJson(join(directory, 'draft.json'))) {
            if (!prior?.initialContentHash || contentHash(await readJsonFile(join(directory, 'draft.json')), await readJsonFile(join(directory, 'answer-key.json'))) !== prior.initialContentHash) {
              const protectedError = new Error('Human edits appeared during generation; candidate saved separately and edits preserved');
              protectedError.name = 'LocalGenerationError'; throw protectedError;
            }
          }
          await atomicJson(join(directory, 'answer-key.json'), candidate.key);
          await atomicJson(join(directory, 'draft.json'), candidate.draft);
          await atomicJson(join(directory, 'generation.json'), {version: 1, intentHash, inputsHash, budgetId, episodeId: options.episodeId,
            experimentHash: experiment?.hash, promptVersion: PROMPT_VERSION, schemaVersion: SCHEMA_VERSION,
            initialContentHash: contentHash(candidate.draft, candidate.key), status: feedback.length ? 'invalid' : 'valid',
            requestedModel: model, returnedModel: raw.model, attempts: scenario.attempts.length});
          await writeReview(directory, root);
          attempt!.state = feedback.length ? 'invalid' : 'valid';
        } catch (error) {
          if ((error as NodeJS.ErrnoException).code || (error as Error).name === 'LocalGenerationError') throw error;
          feedback = error instanceof z.ZodError ? error.issues.map((i) => `${i.path.join('.')}: ${i.message}`)
            : [error instanceof SyntaxError ? 'Model output is not complete valid JSON' : error instanceof Error ? error.message : 'Validation failed'];
          attempt!.state = 'invalid';
        }
      }
      attempt!.errors = feedback;
      await atomicJson(join(directory, 'generation', `attempt-${attempt!.number}.validation.json`), {valid: attempt!.state === 'valid', errors: feedback});
      await atomicJson(ledgerFile, ledger);
      if (attempt!.state === 'valid') return {reused: false, calls, report: await writeReview(directory, root),
        scenarioEstimatedCostUSD: dollars(scenario.attempts.reduce((n, a) => n + a.chargedUnits, 0)), budgetEstimatedSpentUSD: dollars(totalUnits(ledger))};
      if (attempt!.state === 'refused') break;
    }
    await atomicJson(join(directory, 'generation-error.json'), {errors: feedback, attempts: scenario.attempts.length,
      estimatedCostUSD: dollars(scenario.attempts.reduce((n, a) => n + a.chargedUnits, 0))});
    throw new Error(`Generation did not validate within the two-request limit. Inspect ${join(directory, 'generation')} and generation-error.json. No draft approved.`);
  } catch (error) {
    await saveFailure(directory, [error instanceof Error ? error.message : 'Generation failed']);
    throw error;
  } finally {await lock.close(); await unlink(lockFile);}
};
