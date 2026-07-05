// ChainPot brand system — pulled directly from the live site (Frontend/app/globals.css)
// Pure-black canvas, white type, violet glow, glassmorphism. Clash Display headlines.

export const COLORS = {
  black: '#000000',
  bg: '#000000',
  bgSoft: '#0a0a0f',
  white: '#ffffff',
  // muted / secondary text (site uses white/70, white/40)
  white80: 'rgba(255,255,255,0.82)',
  white60: 'rgba(255,255,255,0.60)',
  white40: 'rgba(255,255,255,0.40)',
  // violet accent — oklch(0.5 0.2 280) ≈ violet, plus the site's purple-200/900 gradient stops
  violet: '#8B5CF6',
  violetBright: '#A78BFA',
  violetLight: '#E9D5FF', // purple-200, used in the gradient wordmark
  violetDeep: '#4C1D95',
  violetGlow: 'rgba(139,92,246,0.55)',
  // network + token accents
  base: '#0052FF', // Base network blue
  green: '#19FB9B', // yield / success (Compound)
  // problem scene
  danger: '#FF4D6D',
  dangerSoft: 'rgba(255,77,109,0.14)',
  // glass surfaces (site: bg-white/5, border-white/15-20, backdrop-blur)
  glass: 'rgba(255,255,255,0.05)',
  glassBorder: 'rgba(255,255,255,0.14)',
  glassBorderStrong: 'rgba(255,255,255,0.22)',
};

export const FONT = {
  display: '"Clash Display", "Geist", system-ui, sans-serif',
  sans: '"Geist", "Inter", system-ui, -apple-system, sans-serif',
  mono: '"Geist Mono", "SF Mono", ui-monospace, monospace',
};

export const SAFE = {
  top: 150,
  bottom: 180,
  side: 90,
};

export const VIDEO = {
  width: 1080,
  height: 1920,
  fps: 30,
  durationInFrames: 900, // 30s
};
