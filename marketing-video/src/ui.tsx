import React from 'react';
import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
  random,
} from 'remotion';
import { COLORS, FONT } from './theme';

/* ----------------------------- animation helpers ----------------------------- */

export const useEnter = (delay = 0, config: { damping?: number; mass?: number } = {}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return spring({
    frame: frame - delay,
    fps,
    config: { damping: 200, mass: 1, ...config },
  });
};

// fade a value in over a window with clamped easing
export const fadeIn = (frame: number, start: number, dur = 12) =>
  interpolate(frame, [start, start + dur], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

// enter-hold-exit envelope for a whole element
export const lifecycle = (frame: number, inAt: number, outAt: number, dur = 12) =>
  interpolate(
    frame,
    [inAt, inAt + dur, outAt - dur, outAt],
    [0, 1, 1, 0],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  );

/* --------------------------------- background -------------------------------- */

// Subtle drifting violet radial glow + grain + vignette. Keeps the canvas alive
// instead of flat black — matches the site's via-purple-900/30 overlay.
export const Background: React.FC<{
  glow?: string;
  intensity?: number;
  cx?: number;
  cy?: number;
}> = ({ glow = COLORS.violetGlow, intensity = 1, cx = 50, cy = 38 }) => {
  const frame = useCurrentFrame();
  const drift = Math.sin(frame / 70) * 4;
  const pulse = 0.85 + Math.sin(frame / 45) * 0.15;

  return (
    <AbsoluteFill style={{ backgroundColor: COLORS.black }}>
      <AbsoluteFill
        style={{
          background: `radial-gradient(60% 45% at ${cx + drift}% ${cy}%, ${glow} 0%, rgba(0,0,0,0) 70%)`,
          opacity: intensity * pulse,
        }}
      />
      <AbsoluteFill
        style={{
          background: `radial-gradient(40% 30% at 80% 90%, rgba(0,82,255,0.10) 0%, rgba(0,0,0,0) 70%)`,
          opacity: intensity,
        }}
      />
      <Grain />
      {/* vignette */}
      <AbsoluteFill
        style={{
          background:
            'radial-gradient(120% 90% at 50% 45%, rgba(0,0,0,0) 55%, rgba(0,0,0,0.85) 100%)',
        }}
      />
    </AbsoluteFill>
  );
};

const Grain: React.FC = () => {
  const frame = useCurrentFrame();
  // cheap animated film grain using a handful of seeded dots refreshed over time
  const dots = React.useMemo(() => {
    const seedBase = Math.floor(frame / 2);
    return new Array(60).fill(0).map((_, i) => {
      const r = random(`g${seedBase}-${i}`);
      const r2 = random(`g2${seedBase}-${i}`);
      return { x: r * 100, y: r2 * 100, o: 0.02 + random(`o${seedBase}-${i}`) * 0.05 };
    });
  }, [frame]);
  return (
    <AbsoluteFill style={{ mixBlendMode: 'overlay', opacity: 0.5 }}>
      {dots.map((d, i) => (
        <div
          key={i}
          style={{
            position: 'absolute',
            left: `${d.x}%`,
            top: `${d.y}%`,
            width: 2,
            height: 2,
            borderRadius: 1,
            background: `rgba(255,255,255,${d.o})`,
          }}
        />
      ))}
    </AbsoluteFill>
  );
};

/* --------------------------------- glass card -------------------------------- */

export const GlassCard: React.FC<{
  children: React.ReactNode;
  style?: React.CSSProperties;
  glow?: boolean;
  accent?: string;
}> = ({ children, style, glow, accent = COLORS.violet }) => (
  <div
    style={{
      background: COLORS.glass,
      border: `1px solid ${COLORS.glassBorder}`,
      borderRadius: 28,
      backdropFilter: 'blur(18px)',
      WebkitBackdropFilter: 'blur(18px)',
      boxShadow: glow
        ? `0 0 0 1px rgba(255,255,255,0.04), 0 30px 80px -20px ${accent}55`
        : '0 24px 60px -30px rgba(0,0,0,0.8)',
      ...style,
    }}
  >
    {children}
  </div>
);

/* ------------------------------------ chip ----------------------------------- */

export const Chip: React.FC<{
  children: React.ReactNode;
  accent?: string;
  style?: React.CSSProperties;
}> = ({ children, accent = COLORS.white, style }) => (
  <div
    style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: 12,
      padding: '14px 26px',
      borderRadius: 999,
      background: 'rgba(255,255,255,0.06)',
      border: `1px solid ${COLORS.glassBorderStrong}`,
      backdropFilter: 'blur(12px)',
      WebkitBackdropFilter: 'blur(12px)',
      color: accent,
      fontFamily: FONT.mono,
      fontSize: 26,
      letterSpacing: 2,
      textTransform: 'uppercase',
      ...style,
    }}
  >
    {children}
  </div>
);

/* ------------------------------- section eyebrow ----------------------------- */

export const Eyebrow: React.FC<{ children: React.ReactNode; color?: string }> = ({
  children,
  color = COLORS.violetBright,
}) => (
  <div
    style={{
      fontFamily: FONT.mono,
      fontSize: 26,
      letterSpacing: 6,
      textTransform: 'uppercase',
      color,
      display: 'flex',
      alignItems: 'center',
      gap: 16,
    }}
  >
    <span style={{ width: 40, height: 2, background: color, display: 'inline-block' }} />
    {children}
  </div>
);
