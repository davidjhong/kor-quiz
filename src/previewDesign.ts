// Design assumptions for this preview, not universal platform-safe guarantees.
export const PREVIEW_LAYOUT = {
  margins: {top: 140, left: 88, right: 180, bottom: 300},
  episodeTop: 216,
  promptTop: 294,
  contextTop: 490,
  cardsTop: 560,
  cardHeight: 138,
  cardGap: 18,
  feedbackTop: 1060,
  background: {objectPosition: '50% 65%', startScale: 1, endScale: 1.012},
} as const;
