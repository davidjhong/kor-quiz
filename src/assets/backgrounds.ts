export const BACKGROUND_ASSET_IDS = ['korean-cafe-v1', 'korean-cafe-illustrated-v1'] as const;
export type BackgroundAssetId = typeof BACKGROUND_ASSET_IDS[number];

// Only reviewed local assets belong here. JSON selects an ID, never a URL or path.
export const BACKGROUND_ASSETS: Record<BackgroundAssetId, {file: string; scenarioLabel: string}> = {
  'korean-cafe-illustrated-v1': {
    file: 'backgrounds/korean-cafe-illustrated-v1.png',
    scenarioLabel: 'AT A KOREAN CAFÉ',
  },
  'korean-cafe-v1': {
    file: 'backgrounds/korean-cafe-v1.png',
    scenarioLabel: 'KOREAN CAFÉ',
  },
};

export const getBackgroundAsset = (id: string | undefined) => {
  if (id === undefined) return undefined;
  if (!Object.hasOwn(BACKGROUND_ASSETS, id)) throw new Error(`Unknown background asset ID: ${id}`);
  return BACKGROUND_ASSETS[id as BackgroundAssetId];
};
