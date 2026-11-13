import {z} from 'zod';
export const LOCAL_MUSIC_IDS=['soft-lofi-keys','warm-pluck-groove','airy-pad-drift'] as const;
export const AMBIENCE_IDS=['soft-room-tone','gentle-rain'] as const;
export const MUSIC_IDS=['subtle-bass',...LOCAL_MUSIC_IDS] as const;
/** Legacy projections omit trim/version, so their serialized props stay unchanged. */
export const renderMusicSchema=z.strictObject({file:z.string().regex(/^audio\/music\/[a-z0-9-]+\.wav$/u),sha256:z.string().regex(/^[a-f0-9]{64}$/u),durationSeconds:z.number().positive(),
  mixTrimDb:z.number().min(-30).max(0).optional(),mixVersion:z.literal('local-bed-trim-v1').optional()});
export type RenderMusic=z.infer<typeof renderMusicSchema>;
export const AMBIENCE_MIX={version:'ambience-mix-v1',idle:.12,thinking:.08,speech:.045} as const;
export const renderAmbienceSchema=z.strictObject({asset:renderMusicSchema,gain:z.number().min(0).max(1),mixVersion:z.literal('ambience-mix-v1')});
