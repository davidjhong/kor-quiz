// Geometry stays fixed through reading, countdown, and reveal. All values are pixels
// on the 1080 × 1920 canvas, not universal platform safe-zone guarantees.
export const ILLUSTRATED_THEME = {
  colors: {
    panel: '#FFF7E8', text: '#172B3A', answer: '#FFFFFF', accent: '#E66B57',
    correct: '#DDF3E8', teal: '#146B60', secondary: '#526574',
    subdued: '#F6F4EF', track: '#E5DCCD', background: '#E9DECC',
  },
  panel: {left: 70, top: 180, width: 880, height: 1010, padding: 48, radius: 28},
  slots: {header: 44, prompt: 98, context: 266, answers: 326, feedback: 800},
  answers: {height: 136, gap: 14, hangulSize: 52, romanizationSize: 31},
  // Fixed crop places this illustration's face below the panel; no ongoing zoom.
  background: {scale: 1.12, origin: '50% 0%'},
} as const;
