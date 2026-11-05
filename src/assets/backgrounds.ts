export const BACKGROUND_ASSET_IDS = ['korean-cafe-v1', 'korean-cafe-illustrated-v1', 'korean-transit-illustrated-dev-v1'] as const;
export type BackgroundAssetId = typeof BACKGROUND_ASSET_IDS[number];
export const SCENARIO_TYPES = ['cafe', 'convenience-store', 'public-transit'] as const;

// Registered local assets only. Development selection is distinct from human aesthetic approval.
export const BACKGROUND_ASSETS: Record<BackgroundAssetId, {file: string; scenarioLabel: string; scenarioType: typeof SCENARIO_TYPES[number];
  selection: 'human-approved' | 'developer-selected'; framing?: {scale: number; origin: string}; sha256?: string}> = {
  'korean-cafe-illustrated-v1': {
    file: 'backgrounds/korean-cafe-illustrated-v1.png',
    scenarioLabel: 'AT A KOREAN CAFÉ',
    scenarioType: 'cafe',
    selection: 'human-approved',
  },
  'korean-cafe-v1': {
    file: 'backgrounds/korean-cafe-v1.png',
    scenarioLabel: 'KOREAN CAFÉ',
    scenarioType: 'cafe',
    selection: 'human-approved',
  },
  'korean-transit-illustrated-dev-v1': {
    file: 'backgrounds/korean-transit-illustrated-dev-v1.png',
    scenarioLabel: 'AT A KOREAN SUBWAY STATION',
    scenarioType: 'public-transit',
    selection: 'developer-selected',
    framing: {scale: 1.02, origin: '50% 0%'},
    sha256: '3051c21c2dac0a5821849d27a16e1e717d6fd7e8e6790da526565f0f239adea7',
  },
};

export const getBackgroundAsset = (id: string | undefined) => {
  if (id === undefined) return undefined;
  if (!Object.hasOwn(BACKGROUND_ASSETS, id)) throw new Error(`Unknown background asset ID: ${id}`);
  return BACKGROUND_ASSETS[id as BackgroundAssetId];
};
