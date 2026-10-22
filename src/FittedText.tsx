import {useLayoutEffect, useRef} from 'react';
import {useDelayRender} from 'remotion';

type FittedTextProps = {
  text: string;
  label: string;
  height: number;
  fontSize: number;
  minFontSize: number;
  lineHeight: number;
  fontWeight?: number;
  letterSpacing?: number;
  center?: boolean;
  lang?: string;
  balance?: boolean;
};

/** Fit local-font text within a fixed slot, or fail instead of clipping it. */
export const FittedText = ({text, label, height, fontSize, minFontSize, lineHeight,
  fontWeight = 400, letterSpacing = 0, center = false, lang, balance = false}: FittedTextProps) => {
  const ref = useRef<HTMLDivElement>(null);
  const {delayRender, continueRender, cancelRender} = useDelayRender();

  useLayoutEffect(() => {
    const handle = delayRender(`Fitting ${label}`);
    let active = true;
    let pending = true;
    const finish = () => {
      if (pending) {
        pending = false;
        continueRender(handle);
      }
    };
    // Wait for the bundled font before measuring. No wall-clock animation state.
    document.fonts.load(`${fontWeight} ${fontSize}px "Noto Sans KR"`, text).then(() => {
      if (!active || !ref.current) return;
      const element = ref.current;
      let size = fontSize;
      element.style.fontSize = `${size}px`;
      while ((element.scrollHeight > height || element.scrollWidth > element.clientWidth)
        && size > minFontSize) {
        size -= 1;
        element.style.fontSize = `${size}px`;
      }
      if (element.scrollHeight > height || element.scrollWidth > element.clientWidth) {
        throw new Error(`${label}: text does not fit at ${minFontSize}px; shorten this field`);
      }
      finish();
    }).catch((error: unknown) => {
      if (active) cancelRender(error instanceof Error ? error : new Error(String(error)));
    });
    return () => { active = false; finish(); };
  }, [text, label, height, fontSize, minFontSize, fontWeight, lineHeight, letterSpacing,
    balance, delayRender, continueRender, cancelRender]);

  return <div style={{height, width: '100%', minWidth: 0, display: 'flex', alignItems: center ? 'center' : 'flex-start'}}>
    <div ref={ref} lang={lang} style={{width: '100%', fontSize, fontWeight, lineHeight,
      letterSpacing, overflowWrap: 'anywhere', wordBreak: lang === 'ko' ? 'keep-all' : 'normal', textWrap: balance ? 'balance' : 'wrap'}}>
      {text}
    </div>
  </div>;
};
