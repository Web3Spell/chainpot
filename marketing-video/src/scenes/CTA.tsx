import React from 'react';
import { AbsoluteFill, Img, interpolate, staticFile, useCurrentFrame } from 'remotion';
import { Background, useEnter, fadeIn } from '../ui';
import { COLORS, FONT, SAFE } from '../theme';

const CITIES = ['Chennai', 'Lagos', 'Manila', 'Bengaluru', 'Berlin'];

export const CTA: React.FC = () => {
  const frame = useCurrentFrame();

  const audienceO = fadeIn(frame, 4, 12);
  const logoSp = useEnter(28, { damping: 14 });
  const logoO = fadeIn(frame, 28, 12);
  const wordO = fadeIn(frame, 40, 12);
  const tagO = fadeIn(frame, 52, 12);
  const ctaSp = useEnter(64, { damping: 12 });
  const ctaO = fadeIn(frame, 64, 12);

  const gradPos = interpolate(frame, [0, 120], [0, 200]);

  return (
    <AbsoluteFill>
      <Background intensity={1} cy={46} />
      <AbsoluteFill
        style={{
          justifyContent: 'center',
          alignItems: 'center',
          padding: `${SAFE.top}px ${SAFE.side}px ${SAFE.bottom}px`,
          textAlign: 'center',
        }}
      >
        {/* audience */}
        <div style={{ opacity: audienceO }}>
          <div style={{ fontFamily: FONT.sans, fontWeight: 300, fontSize: 42, color: COLORS.white80 }}>
            Built for <b style={{ fontWeight: 600 }}>2 billion</b> savers
          </div>
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              justifyContent: 'center',
              gap: 12,
              marginTop: 22,
              maxWidth: 760,
            }}
          >
            {CITIES.map((c, i) => (
              <span
                key={c}
                style={{
                  fontFamily: FONT.mono,
                  fontSize: 28,
                  color: COLORS.violetLight,
                  padding: '10px 22px',
                  borderRadius: 999,
                  border: `1px solid ${COLORS.glassBorder}`,
                  background: 'rgba(255,255,255,0.03)',
                  opacity: fadeIn(frame, 8 + i * 5, 10),
                }}
              >
                {c}
              </span>
            ))}
          </div>
        </div>

        {/* logo lockup */}
        <div style={{ marginTop: 80, opacity: logoO, position: 'relative' }}>
          <div
            style={{
              position: 'absolute',
              inset: -50,
              borderRadius: '50%',
              background: `radial-gradient(circle, ${COLORS.violetGlow} 0%, rgba(0,0,0,0) 70%)`,
              opacity: 0.7,
            }}
          />
          <Img
            src={staticFile('logo.svg')}
            style={{
              width: 180,
              height: 194,
              position: 'relative',
              transform: `scale(${interpolate(logoSp, [0, 1], [0.5, 1])})`,
            }}
          />
        </div>
        <div
          style={{
            fontFamily: FONT.display,
            fontSize: 130,
            marginTop: 18,
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
            fontSize: 50,
            color: COLORS.white,
            opacity: tagO,
            marginTop: 4,
          }}
        >
          The chit fund, <span style={{ fontWeight: 600 }}>on-chain.</span>
        </div>

        {/* CTA pill */}
        <div
          style={{
            marginTop: 56,
            opacity: ctaO,
            transform: `scale(${interpolate(ctaSp, [0, 1], [0.8, 1])})`,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 22,
          }}
        >
          {/* invite-only badge */}
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 12,
              padding: '12px 26px',
              borderRadius: 999,
              background: 'rgba(139,92,246,0.14)',
              border: `1px solid ${COLORS.violet}`,
              fontFamily: FONT.mono,
              fontSize: 26,
              letterSpacing: 2,
              color: COLORS.violetLight,
              textTransform: 'uppercase',
            }}
          >
            ✦ Invite only — early access
          </div>
          <div
            style={{
              padding: '26px 64px',
              borderRadius: 999,
              background: COLORS.white,
              color: COLORS.black,
              fontFamily: FONT.sans,
              fontWeight: 600,
              fontSize: 46,
              boxShadow: `0 24px 70px -18px ${COLORS.violetGlow}`,
            }}
          >
            Request Access
          </div>
          <div style={{ fontFamily: FONT.mono, fontSize: 28, color: COLORS.white60, letterSpacing: 1 }}>
            <span style={{ color: COLORS.base }}>●</span> live on Base testnet
          </div>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
