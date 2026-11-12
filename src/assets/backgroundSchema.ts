import {z} from 'zod';
import {BACKGROUND_ASSET_IDS,SCENARIO_TYPES} from './backgrounds.ts';
export const backgroundIdSchema=z.string().refine(id=>(BACKGROUND_ASSET_IDS as readonly string[]).includes(id)||/^generated-[a-z0-9-]+-[a-f0-9]{16}$/u.test(id),
  'Unknown background asset ID; select a registered local manifest/catalog ID');
/** Only this small public projection enters Remotion props. No prompts or receipts. */
export const renderBackgroundSchema=z.strictObject({id:backgroundIdSchema,
  file:z.string().regex(/^backgrounds\/[a-z0-9-]+\.png$/u),sha256:z.string().regex(/^[a-f0-9]{64}$/u),
  scenarioType:z.enum(SCENARIO_TYPES),selection:z.enum(['human-approved','developer-selected']),
  scenarioLabel:z.string().min(1).max(80),framing:z.strictObject({scale:z.number().min(1.02).max(1.2),origin:z.literal('50% 0%')})});
export type RenderBackground=z.infer<typeof renderBackgroundSchema>;
