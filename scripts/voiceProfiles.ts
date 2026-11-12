/** Point at the exact auditioned profiles; appearance is never consulted. */
export const NAMED_VOICE_PROFILES={achird:'content/voice-profiles/c-achird.json',kore:'content/voice-profiles/a-baseline.json'} as const;
export const resolveVoiceProfileFile=(value:string)=>Object.hasOwn(NAMED_VOICE_PROFILES,value)
  ?NAMED_VOICE_PROFILES[value as keyof typeof NAMED_VOICE_PROFILES]:value;
