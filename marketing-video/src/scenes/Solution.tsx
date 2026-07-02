import React from 'react';
import { AbsoluteFill, Img, interpolate, staticFile, useCurrentFrame } from 'remotion';
import { Background, useEnter, fadeIn } from '../ui';
import { COLORS, FONT, SAFE } from '../theme';

export const Solution: React.FC = () => {
  const frame = useCurrentFrame();

  const logoSpring = useEnter(6, { damping: 12, mass: 1.2 });
  const logoScale = interpolate(logoSpring, [0, 1], [0.4, 1]);
  const logoO = fadeIn(frame, 6, 12);
  const glowPulse = 0.5 + Math.sin(frame / 12) * 0.5;

  const wordO = fadeIn(frame, 26, 12);
  const tagO = fadeIn(frame, 44, 14);
  const subO = fadeIn(frame, 60, 14);

  // animated gradient sweep on the wordmark (mirrors the site's hero wordmark)
  const gradPos = interpolate(frame, [0, 120], [0, 200]);

  return (
    <AbsoluteFill>
      <Background intensity={1} cy={44} />
      <AbsoluteFill
        style={{
          justifyContent: 'center',
          alignItems: 'center',
          padding: `0 ${SAFE.side}px`,
          textAlign: 'center',
        }}
      >
        <div style={{ position: 'relative', opacity: logoO }}>
          <div
            style={{
              position: 'absolute',
              inset: -60,
              borderRadius: '50%',
              background: `radial-gradient(circle, ${COLORS.violetGlow} 0%, rgba(0,0,0,0) 70%)`,
              opacity: glowPulse,
              filter: 'blur(8px)',
            }}
          />
          <Img
            src={staticFile('logo.svg')}
            style={{ width: 260, height: 280, transform: `scale(${logoScale})`, position: 'relative' }}
          />
        </div>

        <div
          style={{
            fontFamily: FONT.display,
            fontSize: 150,
            marginTop: 24,
            opacity: wordO,
            backgroundImage: `linear-gradient(90deg, ${COLORS.white}, ${COLORS.violetLight}, ${COLORS.white})`,
            backgroundSize: '200% auto',
            backgroundPosition: `${gradPos}% 50%`,
            WebkitBackgroundClip: 'text',
            backgroundClip: 'text',
            color: 'transparent',
            letterSpacing: -2,
          }}
        >
          ChainPot
        </div>

        <div
          style={{
            fontFamily: FONT.sans,
            fontWeight: 300,
            fontSize: 56,
            color: COLORS.white,
            opacity: tagO,
            marginTop: 8,
            lineHeight: 1.15,
            maxWidth: 880,
          }}
        >
          The savings circle, inside a <span style={{ fontWeight: 600 }}>smart contract.</span>
        </div>

        <div
          style={{
            fontFamily: FONT.mono,
            fontSize: 30,
            letterSpacing: 1,
            color: COLORS.white60,
            opacity: subO,
            marginTop: 40,
            display: 'flex',
            gap: 18,
            alignItems: 'center',
          }}
        >
          <span style={{ color: COLORS.base }}>● On Base</span>
          <span>·</span>
          <span>No organizer</span>
          <span>·</span>
          <span>No trust required</span>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
