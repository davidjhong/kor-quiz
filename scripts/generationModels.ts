// Verified profiles only. Selecting a profile never selects a fallback model.
export const LEGACY_DRAFT_MODEL = 'gpt-5-nano-2025-08-07';
export const QUALITY_DRAFT_MODEL = 'gpt-6-luna';
export const MAX_REQUEST_BYTES = 96 * 1024;
export const REQUEST_TOKEN_OVERHEAD = 4096;
const checked = '2026-11-04';
export const MODEL_PROFILES = {
  [LEGACY_DRAFT_MODEL]: {id: 'gpt-5-nano-2026-11-04', model: LEGACY_DRAFT_MODEL,
    aliases: [LEGACY_DRAFT_MODEL, 'gpt-5-nano'], returnedModels: [LEGACY_DRAFT_MODEL], reasoning: 'low' as const,
    inputUSDPerMillion: 0.05, reservedInputUSDPerMillion: 0.05, outputUSDPerMillion: 0.40,
    source: 'https://developers.openai.com/api/docs/models/gpt-5-nano', checked,
    verifyAgainBy: '2026-11-11', shutdown: '2026-12-11', contextTokens: 400000, reservedInputTokens: 400000},
  [QUALITY_DRAFT_MODEL]: {id: 'gpt-6-luna-2026-11-04', model: QUALITY_DRAFT_MODEL,
    aliases: [QUALITY_DRAFT_MODEL], returnedModels: [QUALITY_DRAFT_MODEL], reasoning: 'medium' as const,
    inputUSDPerMillion: 0.10, reservedInputUSDPerMillion: 0.125, outputUSDPerMillion: 0.50,
    source: 'https://developers.openai.com/api/docs/models/gpt-6-luna', checked:'2026-11-10',
    verifyAgainBy: '2026-11-17', shutdown: null, contextTokens: 1050000,
    // Full bounded request bytes + generous framing overhead; below the 272K long-input threshold.
    reservedInputTokens: MAX_REQUEST_BYTES + REQUEST_TOKEN_OVERHEAD},
} as const;
export const modelProfile = (model: string) => {
  const profile = Object.values(MODEL_PROFILES).find((p) => (p.aliases as readonly string[]).includes(model));
  if (!profile) throw new Error('No verified pricing/support profile for this model. No fallback was selected.');
  return profile;
};
export const modelChargeUnits = (model: string, input: number, output: number) => {
  const p = modelProfile(model);
  // Integer nano-USD. Luna input uses the cache-write upper rate conservatively, not a claimed invoice.
  return input * (p.reservedInputUSDPerMillion * 1000) + output * (p.outputUSDPerMillion * 1000);
};
export const generationCostBound = (maxOutputTokens = 12000, model = LEGACY_DRAFT_MODEL, now = new Date()) => {
  const p = modelProfile(model);
  if (now.toISOString().slice(0, 10) >= p.verifyAgainBy) throw new Error(`OpenAI ${p.model} generation/review pricing/availability expired; must be reverified before paid calls: ${p.source}; scripts/generationModels.ts MODEL_PROFILES[${p.model}].verifyAgainBy=${p.verifyAgainBy}. Do not just extend the date.`);
  if (!Number.isInteger(maxOutputTokens) || maxOutputTokens < 2048 || maxOutputTokens > 16000) throw new Error('--max-output-tokens must be an integer from 2048 to 16000');
  return modelChargeUnits(model, p.reservedInputTokens, maxOutputTokens);
};
