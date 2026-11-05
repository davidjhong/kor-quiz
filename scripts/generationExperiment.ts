import {z} from 'zod';
import {zodTextFormat} from 'openai/helpers/zod';
import {readFile, stat} from 'node:fs/promises';
import {join, resolve, relative, sep} from 'node:path';
import {briefSchema} from '../src/draftSchema.ts';
import {atomicJson} from './draftWorkflow.ts';
import {canonical, readJsonFile, requireWithin, sha256} from './narrationFiles.ts';
import {episodeIdSchema, generationOutputSchema, generationPrompt, GENERATION_SYSTEM_PROMPT,
  PROMPT_VERSION, SCHEMA_VERSION} from './generationContent.ts';
import {generationCostBound, MAX_REQUEST_BYTES, modelProfile, REQUEST_TOKEN_OVERHEAD} from './generationModels.ts';
import {PROJECT_ROOT} from './remotionCommand.ts';

const path = z.string().min(1).max(240);
export const experimentSpecSchema = z.strictObject({version: z.literal(1), experimentId: episodeIdSchema,
  budgetId: episodeIdSchema, model: z.string(), maxOutputTokens: z.number().int(), maxCostUSD: z.number().positive(),
  scenarios: z.array(z.strictObject({episodeId: episodeIdSchema, briefFile: path, output: path, baseline: path})).length(3)});
const promptSchema = z.strictObject({system: z.string(), user: z.string(), exampleCount: z.number().int(), historyCount: z.number().int()});
const payloadSchema = z.strictObject({spec: experimentSpecSchema, contract: z.record(z.string(), z.unknown()),
  scenarios: z.array(z.strictObject({episodeId: episodeIdSchema, briefHash: z.string(), brief: briefSchema, prompt: promptSchema})).length(3)});
const frozenSchema = z.strictObject({version: z.literal(1), kind: z.literal('frozen-generation-experiment'),
  frozenAt: z.string().datetime(), hash: z.string().regex(/^[a-f0-9]{64}$/u), payload: payloadSchema,
  authorization: z.literal('Separate explicit spending approval required; this file is not authorization.')});

export const currentGenerationContract = async (model: string, maxOutputTokens: number) => {
  const sources = ['generationContent.ts', '../src/draftSchema.ts', '../src/quizSchema.ts'];
  const codeHashes = await Promise.all(sources.map(async (file) => ({file,
    sha256: sha256(await readFile(new URL(file, import.meta.url)))})));
  return {model, reasoningEffort: modelProfile(model).reasoning, maxOutputTokens,
    pricing: modelProfile(model),
    promptVersion: PROMPT_VERSION, schemaVersion: SCHEMA_VERSION,
    system: GENERATION_SYSTEM_PROMPT,
    format: JSON.parse(JSON.stringify(zodTextFormat(generationOutputSchema, 'korean_quiz_education'))),
    serviceTier: 'default', maximumAttemptsPerScenario: 2, sdkRetries: 0,
    maximumRequestBytes: MAX_REQUEST_BYTES, tokenFramingAllowance: REQUEST_TOKEN_OVERHEAD, codeHashes};
};
const privatePath = (root: string, file: string) => {
  const full = resolve(root, file); requireWithin(root, full);
  if (relative(root, full).split(sep)[0] === 'public') throw new Error('Experiment/draft data must stay outside public assets');
  return full;
};
export const loadGenerationExperiment = async (file: string) => {
  const frozen = frozenSchema.parse(await readJsonFile(file));
  if (sha256(canonical(frozen.payload)) !== frozen.hash) throw new Error('Frozen experiment hash mismatch; preserve this file and create a separately named experiment.');
  return frozen;
};
export const freezeGenerationExperiment = async (raw: unknown, output: string,
  options: {root?: string; now?: Date; getPrompt?: typeof generationPrompt} = {}) => {
  const root = resolve(options.root ?? PROJECT_ROOT), spec = experimentSpecSchema.parse(raw);
  const file = privatePath(root, output);
  const prior = await stat(file).catch((e: NodeJS.ErrnoException) => {if (e.code === 'ENOENT') return null; throw e;});
  if (new Set(spec.scenarios.map((s) => s.episodeId)).size !== 3 || new Set(spec.scenarios.map((s) => s.output)).size !== 3) {
    throw new Error('The experiment must contain three distinct scenario IDs and output directories');
  }
  const bound = generationCostBound(spec.maxOutputTokens, spec.model, options.now);
  if (Math.ceil(spec.maxCostUSD * 1e9) < bound * 6) throw new Error('Proposed cap does not cover the conservative six-request bound');
  const contract = await currentGenerationContract(spec.model, spec.maxOutputTokens);
  const scenarios = [];
  for (const item of spec.scenarios) {
    const brief = briefSchema.parse(await readJsonFile(privatePath(root, item.briefFile)));
    privatePath(root, item.output); privatePath(root, item.baseline);
    if (resolve(root, item.output) === resolve(root, item.baseline)) throw new Error('New results must not overwrite the baseline directory');
    if (!prior && await stat(join(root, item.output, 'draft.json')).then(() => true, (e: NodeJS.ErrnoException) => {
      if (e.code === 'ENOENT') return false; throw e;
    })) throw new Error('A new experiment requires new output directories; existing drafts cannot be relabeled as new generation');
    const prompt = await (options.getPrompt ?? generationPrompt)(brief, root);
    if (prompt.system !== GENERATION_SYSTEM_PROMPT) throw new Error('All scenarios must use the same frozen system contract');
    scenarios.push({episodeId: item.episodeId, briefHash: sha256(canonical(brief)), brief, prompt});
  }
  const payload = {spec, contract, scenarios}, hash = sha256(canonical(payload));
  if (prior) {
    const existing = await loadGenerationExperiment(file);
    if (existing.hash !== hash) throw new Error('This experiment is already frozen with different content. Use a new experiment ID/file and label it separately.');
    return {reused: true, file, hash, maximumRequests: 6, estimatedMaximumUSD: bound * 6 / 1e9,
      proposedCapUSD: spec.maxCostUSD, paidCalls: 0};
  }
  await atomicJson(file, {version: 1, kind: 'frozen-generation-experiment', frozenAt: new Date().toISOString(),
    hash, payload, authorization: 'Separate explicit spending approval required; this file is not authorization.'});
  return {reused: false, file, hash, maximumRequests: 6, estimatedMaximumUSD: bound * 6 / 1e9,
    proposedCapUSD: spec.maxCostUSD, paidCalls: 0};
};

export const checkGenerationExperiment = async (file: string, options: {root: string; brief: unknown;
  episodeId: string; output: string; model: string; maxOutput: number; budgetId?: string; maxCostUSD?: number}) => {
  const frozen = await loadGenerationExperiment(privatePath(options.root, file)), {spec, contract, scenarios} = frozen.payload;
  const expected = await currentGenerationContract(options.model, options.maxOutput);
  if (canonical(contract) !== canonical(expected)) throw new Error('Frozen generation contract changed. Do not mix configurations; propose a separately named experiment.');
  const scope = spec.scenarios.find((s) => s.episodeId === options.episodeId);
  const data = scenarios.find((s) => s.episodeId === options.episodeId);
  if (!scope || !data || privatePath(options.root, scope.output) !== options.output
    || spec.model !== options.model || spec.maxOutputTokens !== options.maxOutput
    || spec.budgetId !== options.budgetId || spec.maxCostUSD !== options.maxCostUSD) {
    throw new Error('Generation options do not match the frozen experiment scope, output or budget');
  }
  const currentBrief = briefSchema.parse(await readJsonFile(privatePath(options.root, scope.briefFile)));
  if (sha256(canonical(options.brief)) !== data.briefHash || sha256(canonical(currentBrief)) !== data.briefHash) {
    throw new Error('Scenario brief changed after freezing; preserve this experiment and label any new configuration separately');
  }
  return {hash: frozen.hash, prompt: data.prompt};
};
