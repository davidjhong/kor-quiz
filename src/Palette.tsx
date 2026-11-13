import {createContext,useContext,type ReactNode} from 'react';
import {ILLUSTRATED_THEME} from './illustratedTheme';
import {PALETTES,type PALETTE_IDS} from './variety';
const Context=createContext(PALETTES['cream-navy']);
export const Palette=({id,children}:{id:typeof PALETTE_IDS[number];children:ReactNode})=><Context.Provider value={PALETTES[id]}>{children}</Context.Provider>;
export const useIllustratedTheme=()=>({...ILLUSTRATED_THEME,colors:useContext(Context)});
