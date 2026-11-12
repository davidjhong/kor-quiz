export const BACKGROUND_ASSET_IDS = ['korean-cafe-v1', 'korean-cafe-illustrated-v1', 'korean-transit-illustrated-dev-v1', 'korean-hotel-illustrated-v1'] as const;
export type BackgroundAssetId = typeof BACKGROUND_ASSET_IDS[number];
export const SCENARIO_TYPES = ['cafe', 'convenience-store', 'public-transit', 'hotel', 'restaurant'] as const;

// Registered local assets only. Development selection is distinct from human aesthetic approval.
export const BACKGROUND_ASSETS: Record<BackgroundAssetId, {file: string; scenarioLabel: string; scenarioType: typeof SCENARIO_TYPES[number];
  selection: 'human-approved' | 'developer-selected'; framing?: {scale: number; origin: string}; sha256?: string;
  provenance?: string}> = {
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
  'korean-hotel-illustrated-v1': {
    file: 'backgrounds/korean-hotel-illustrated-v1.png',
    scenarioLabel: 'AT A KOREAN HOTEL',
    scenarioType: 'hotel',
    selection: 'developer-selected',
    framing: {scale: 1.02, origin: '50% 0%'},
    sha256: '8b58c68bb61b3480461764b1ba403069723300e087c725b3da7809cf04d0d9f8',
    provenance: 'docs/hotel-background-provenance.json',
  },
};

type RegisteredBackground=typeof BACKGROUND_ASSETS[BackgroundAssetId];
const generatedAssets=new Map<string,RegisteredBackground>();
/** Node catalog loader supplies validated public projections; browser renders use explicit props. */
export const registerCatalogBackgrounds=(assets:{id:string;asset:RegisteredBackground}[])=>{
  generatedAssets.clear();for(const {id,asset} of assets)generatedAssets.set(id,asset);
};
export const getBackgroundAsset = (id: string | undefined) => {
  if (id === undefined) return undefined;
  if(generatedAssets.has(id))return generatedAssets.get(id);
  if (!Object.hasOwn(BACKGROUND_ASSETS, id)) throw new Error(`Unknown background asset ID: ${id}`);
  return BACKGROUND_ASSETS[id as BackgroundAssetId];
};
