import type {ReactNode} from 'react';
import {AbsoluteFill, Img, staticFile, useCurrentFrame} from 'remotion';
import {getBackgroundAsset} from './assets/backgrounds';
import {FittedText} from './FittedText';
import {useIllustratedTheme} from './Palette';
import {PREVIEW_QUESTION_TIMELINE} from './questionTiming';
import type {QuizInput} from './quizSchema';
import type {RenderBackground} from './assets/backgroundSchema';

/** Mounted once outside question Sequences; the approved static crop never resets. */
export const IllustratedBackground = ({assetId,motion,assetOverride}: {assetId: QuizInput['backgroundAssetId'];assetOverride?:RenderBackground;
  motion?: {extraScale:number;x:number;y:number}}) => {
  const asset = assetOverride??getBackgroundAsset(assetId);
  const {background, colors} = useIllustratedTheme();
  const framing = asset?.framing ?? background;
  return <AbsoluteFill style={{background: colors.background}}>
    {asset ? <Img src={staticFile(asset.file)} style={{width: '100%', height: '100%', objectFit: 'cover',
      transform: motion ? `translate(${motion.x}px,${motion.y}px) scale(${framing.scale*motion.extraScale})`
        : `scale(${framing.scale})`, transformOrigin: framing.origin}} /> : null}
  </AbsoluteFill>;
};

export const IllustratedPanel = ({children, opacity = 1, translateY = 0, height}: {
  children: ReactNode; opacity?: number; translateY?: number; height?: number;
}) => {
  const {panel, colors} = useIllustratedTheme();
  return <div style={{position: 'absolute', left: panel.left, top: panel.top, width: panel.width,
    height: height ?? panel.height, background: colors.panel, borderRadius: panel.radius,
    color: colors.text, fontFamily: '"Noto Sans KR", sans-serif',
    boxShadow: '0 8px 28px rgba(23,43,58,0.13)', opacity, transform: `translateY(${translateY}px)`}}>
    {children}
  </div>;
};

export const IllustratedBookend = ({title, questionCount, subtitle, embedded = false, contentOpacity = 1}: {
  title: string; questionCount?: number; subtitle?: string; embedded?: boolean; contentOpacity?: number;
}) => {
  const frame = useCurrentFrame();
  const progress = Math.min(1, frame / PREVIEW_QUESTION_TIMELINE.entranceFrames);
  const {panel} = useIllustratedTheme();
  const content = <>
    <div style={{position: 'absolute', left: panel.padding, right: panel.padding, top: 310}}>
      <FittedText text={title} label="episode bookend" height={240} fontSize={64} minFontSize={48}
        lineHeight={1.2} fontWeight={700} balance center />
      {subtitle ? <FittedText text={subtitle} label="opening subtitle" height={96} fontSize={32}
        minFontSize={28} lineHeight={1.4} /> : null}
      {questionCount !== undefined ? <div style={{fontSize: 80, fontWeight: 700,
        fontVariantNumeric: 'tabular-nums', marginTop: 12}}>/{questionCount}</div> : null}
    </div>
  </>;
  if (embedded) return <div style={{position: 'absolute', inset: 0, opacity: contentOpacity}}>{content}</div>;
  return <IllustratedPanel opacity={progress} translateY={(1 - progress) * 12}>{content}</IllustratedPanel>;
};
