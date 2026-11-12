/** Integer nano-USD, matching the existing reservation ledger. No binary rounding of user input. */
export const moneyUnits=(value:string|number)=>{
  const text=String(value),match=/^(\d+)(?:\.(\d{1,9}))?$/u.exec(text);
  if(!match)throw new Error(`Invalid USD cap ${text}; use a positive decimal with at most 9 places`);
  const units=BigInt(match[1])*1_000_000_000n+BigInt((match[2]??'').padEnd(9,'0'));
  if(units>BigInt(Number.MAX_SAFE_INTEGER))throw new Error('USD cap exceeds the supported ledger range');return Number(units);
};
export const boundUnits=(dollars:number)=>{if(!Number.isFinite(dollars)||dollars<0)throw new Error('Invalid plan bound');return Math.round(dollars*1e9);};
export const suggestedCap=(bound:number)=>Number(((BigInt(boundUnits(bound))+9_999_999n)/10_000_000n+1n)*10_000_000n)/1e9;
export const validateAuthorizationCap=(cap:number,bound:number,stored?:number)=>{
  const units=moneyUnits(cap);if(units<=0)throw new Error('USD cap must be positive');
  if(stored!==undefined&&units!==moneyUnits(stored))throw new Error(`Stored total cap $${stored}; requested $${cap}. Existing authorization cannot be changed.`);
  if(units<boundUnits(bound))throw new Error(`Requested total cap $${cap} is below conservative bound $${bound}; budget exhausted before requests. Job remains unauthorised.`);
};
