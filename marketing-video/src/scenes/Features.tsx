import React from 'react';
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { TrendingUp, ShieldCheck, BadgeCheck } from 'lucide-react';
import { Background, Eyebrow, GlassCard, fadeIn } from '../ui';
import { COLORS, FONT, SAFE } from '../theme';

const FEATURES = [
  {
    icon: TrendingUp,
    color: COLORS.green,
    title: 'Idle funds earn yield',
    sub: 'Waiting deposits supply Compound III the whole cycle.',
  },
  {
    icon: ShieldCheck,
    color: COLORS.violetBright,
    title: 'No organizer can run away',
    sub: 'Custody is the contract. No human signer can drain it.',
  },
  {
    icon: BadgeCheck,
    color: COLORS.base,
    title: 'Reputation follows your wallet',
    sub: 'Complete cycles, build on-chain trust across circles.',
  },
];

const PROOF = ['34 / 34 tests', '4 Critical fixed', 'Live on Base testnet'];

export const Features: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const eyebrowO = fadeIn(frame, 4, 12);

  return (
    <AbsoluteFill>
      <Background intensity={0.85} cy={34} />
      <AbsoluteFill style={{ padding: `${SAFE.top}px ${SAFE.side}px ${SAFE.bottom}px`, justifyContent: 'center' }}>
        <div style={{ opacity: eyebrowO }}>
          <Eyebrow>Why it holds up</Eyebrow>
        </div>

        <div style={{ marginTop: 40, display: 'flex', flexDirection: 'column', gap: 24 }}>
          {FEATURES.map((f, i) => {
            const at = 16 + i * 14;
            const sp = spring({ frame: frame - at, fps, config: { damping: 18 } });
            const o = fadeIn(frame, at, 12);
            const y = interpolate(sp, [0, 1], [50, 0]);
            const Icon = f.icon;
            return (
              <GlassCard
                key={i}
                style={{
                  padding: '34px 36px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 28,
                  opacity: o,
                  transform: `translateY(${y}px)`,
                }}
              >
                <div
                  style={{
                    width: 96,
                    height: 96,
                    borderRadius: 24,
                    flexShrink: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: `${f.color}1f`,
                    border: `1px solid ${f.color}66`,
                  }}
                >
                  <Icon size={50} color={f.color} strokeWidth={2} />
                </div>
                <div>
                  <div style={{ fontFamily: FONT.display, fontSize: 50, color: COLORS.white, lineHeight: 1.05 }}>
                    {f.title}
                  </div>
                  <div style={{ fontFamily: FONT.sans, fontWeight: 300, fontSize: 32, color: COLORS.white60, marginTop: 6 }}>
                    {f.sub}
                  </div>
                </div>
              </GlassCard>
            );
          })}
        </div>

        {/* proof bar */}
        <div
          style={{
            marginTop: 48,
            display: 'flex',
            flexWrap: 'wrap',
            gap: 16,
            justifyContent: 'center',
          }}
        >
          {PROOF.map((p, i) => {
            const o = fadeIn(frame, 70 + i * 8, 10);
            return (
              <div
                key={p}
                style={{
                  opacity: o,
                  fontFamily: FONT.mono,
                  fontSize: 30,
                  color: COLORS.white,
                  padding: '16px 28px',
                  borderRadius: 999,
                  background: 'rgba(25,251,155,0.08)',
                  border: '1px solid rgba(25,251,155,0.3)',
                  letterSpacing: 1,
                }}
              >
                ✓ {p}
              </div>
            );
          })}
        </div>

        {/* partner credit */}
        <div
          style={{
            marginTop: 34,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 14,
            opacity: fadeIn(frame, 96, 14),
          }}
        >
          <span style={{ fontFamily: FONT.mono, fontSize: 24, letterSpacing: 3, color: COLORS.white40, textTransform: 'uppercase' }}>
            Supported by
          </span>
          <span style={{ fontFamily: FONT.display, fontSize: 38, color: COLORS.green }}>
            Compound Protocol
          </span>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
