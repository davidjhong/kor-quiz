import {FittedText} from './FittedText';
import {ILLUSTRATED_THEME} from './illustratedTheme';

/** A dedicated speech slot; replaces written notes while narration is playing. */
export const NarrationCaption = ({text, height, lang}: {text: string; height: number; lang?: string}) => {
  const {colors} = ILLUSTRATED_THEME;
  return <div data-narration-caption={text} style={{boxSizing: 'border-box', height, padding: '12px 16px',
    borderLeft: `4px solid ${colors.teal}`, borderRadius: 12, background: colors.answer, color: colors.text}}>
    <FittedText text={text} label="exact narration caption" height={height - 24}
      fontSize={36} minFontSize={32} lineHeight={1.3} lang={lang} />
  </div>;
};
