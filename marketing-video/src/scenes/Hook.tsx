import React from 'react';
import { AbsoluteFill, Img, interpolate, staticFile, useCurrentFrame } from 'remotion';
import { Background, useEnter, fadeIn } from '../ui';
import { COLORS, FONT, SAFE } from '../theme';

const ROSCA_NAMES = ['Chit funds', 'Susus', 'Tandas', 'Paluwagans', 'Kyes'];

export const Hook: React.FC = () => {
  const frame = useCurrentFrame();

  const markO = fadeIn(frame, 4, 14);
  const big = useEnter(12, { damping: 14, mass: 1.1 }); // a touch of life on the headline
  const bigO = fadeIn(frame, 12, 10);
  const line1O = fadeIn(frame, 30, 12);
  const namesO = fadeIn(frame, 46, 12);
  const line2O = fadeIn(frame, 64, 14);

  const bigScale = interpolate(big, [0, 1], [0.7, 1]);

  return (
    <AbsoluteFill>
      <Background intensity={0.9} cy={42} />
      {/* top wordmark */}
      <div
        style={{
          position: 'absolute',
          top: SAFE.top,
          width: '100%',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          gap: 16,
          opacity: markO,
        }}
      >
        <Img src={staticFile('logo-white.svg')} style={{ width: 44, height: 47 }} />
        <span style={{ fontFamily: FONT.display, fontSize: 40, color: COLORS.white, letterSpacing: -0.5 }}>
          ChainPot
        </span>
      </div>

      {/* center */}
      <AbsoluteFill
        style={{
          justifyContent: 'center',
          alignItems: 'center',
          padding: `0 ${SAFE.side}px`,
          textAlign: 'center',
        }}
      >
        <div
          style={{
            fontFamily: FONT.display,
            fontSize: 300,
            lineHeight: 0.92,
            color: COLORS.white,
            opacity: bigO,
            transform: `scale(${bigScale})`,
            textShadow: `0 0 90px ${COLORS.violetGlow}`,
          }}
        >
          2<span style={{ color: COLORS.violetBright }}>B</span>
        </div>
        <div
          style={{
            fontFamily: FONT.sans,
            fontWeight: 300,
            fontSize: 60,
            color: COLORS.white,
            opacity: line1O,
            marginTop: 8,
          }}
        >
          people save in <span style={{ fontWeight: 600 }}>circles</span>
        </div>

        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            justifyContent: 'center',
            gap: 14,
            marginTop: 44,
            opacity: namesO,
            maxWidth: 760,
          }}
        >
          {ROSCA_NAMES.map((n, i) => (
            <span
              key={n}
              style={{
                fontFamily: FONT.mono,
                fontSize: 28,
                color: COLORS.white60,
                padding: '10px 20px',
                borderRadius: 999,
                border: `1px solid ${COLORS.glassBorder}`,
                background: 'rgba(255,255,255,0.03)',
                opacity: fadeIn(frame, 50 + i * 5, 10),
              }}
            >
              {n}
            </span>
          ))}
        </div>

        <div
          style={{
            fontFamily: FONT.display,
            fontSize: 54,
            color: COLORS.violetLight,
            opacity: line2O,
            marginTop: 56,
          }}
        >
          older than banks.
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
