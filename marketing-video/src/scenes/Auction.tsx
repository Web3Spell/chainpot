import React from 'react';
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { Gavel, Check } from 'lucide-react';
import { Background, Eyebrow, GlassCard, fadeIn } from '../ui';
import { COLORS, FONT, SAFE } from '../theme';

const BIDS = [
  { who: 'Maria', amt: 9200, win: false },
  { who: 'Hassan', amt: 8800, win: false },
  { who: 'Asha', amt: 8500, win: true },
];

export const Auction: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const eyebrowO = fadeIn(frame, 4, 12);
  const titleO = fadeIn(frame, 14, 12);
  const poolO = fadeIn(frame, 26, 12);

  const splitO = fadeIn(frame, 110, 14);

  return (
    <AbsoluteFill>
      <Background intensity={0.9} cy={36} />
      <AbsoluteFill style={{ padding: `${SAFE.top}px ${SAFE.side}px ${SAFE.bottom}px` }}>
        <div style={{ opacity: eyebrowO }}>
          <Eyebrow>Mode 01 · Lowest-Bid Auction</Eyebrow>
        </div>

        <div
          style={{
            fontFamily: FONT.display,
            fontSize: 80,
            lineHeight: 1.0,
            color: COLORS.white,
            marginTop: 22,
            opacity: titleO,
            whiteSpace: 'pre-line',
          }}
        >
          Bid low.{'\n'}
          <span style={{ color: COLORS.violetBright }}>Win the pot early.</span>
        </div>

        {/* pool */}
        <GlassCard
          style={{
            marginTop: 44,
            padding: '26px 36px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            opacity: poolO,
          }}
        >
          <span style={{ fontFamily: FONT.mono, fontSize: 30, color: COLORS.white60, letterSpacing: 2 }}>
            CYCLE POOL
          </span>
          <span style={{ fontFamily: FONT.display, fontSize: 64, color: COLORS.white }}>$10,000</span>
        </GlassCard>

        {/* bids */}
        <div style={{ marginTop: 28, display: 'flex', flexDirection: 'column', gap: 18 }}>
          {BIDS.map((b, i) => {
            const at = 40 + i * 16;
            const sp = spring({ frame: frame - at, fps, config: { damping: 16 } });
            const o = fadeIn(frame, at, 10);
            const x = interpolate(sp, [0, 1], [60, 0]);
            const winReveal = b.win ? fadeIn(frame, 92, 10) : 0;
            const highlight = b.win ? winReveal : 0;
            return (
              <div
                key={i}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '24px 32px',
                  borderRadius: 22,
                  opacity: o,
                  transform: `translateX(${x}px)`,
                  background: `rgba(139,92,246,${0.04 + highlight * 0.16})`,
                  border: `1px solid ${b.win ? `rgba(139,92,246,${0.3 + highlight * 0.6})` : COLORS.glassBorder}`,
                  boxShadow: b.win ? `0 20px 60px -20px rgba(139,92,246,${highlight * 0.8})` : 'none',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
                  <Gavel size={34} color={b.win ? COLORS.violetBright : COLORS.white40} />
                  <span style={{ fontFamily: FONT.sans, fontWeight: 500, fontSize: 42, color: COLORS.white }}>
                    {b.who}
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
                  <span
                    style={{
                      fontFamily: FONT.mono,
                      fontSize: 46,
                      color: b.win ? COLORS.violetBright : COLORS.white80,
                      fontWeight: 600,
                    }}
                  >
                    ${b.amt.toLocaleString()}
                  </span>
                  {b.win && (
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                        padding: '8px 16px',
                        borderRadius: 999,
                        background: COLORS.violet,
                        opacity: winReveal,
                        transform: `scale(${interpolate(winReveal, [0, 1], [0.5, 1])})`,
                      }}
                    >
                      <Check size={22} color="#fff" strokeWidth={3} />
                      <span style={{ fontFamily: FONT.mono, fontSize: 22, color: '#fff', letterSpacing: 1 }}>
                        WINS
                      </span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* the payoff line */}
        <div style={{ marginTop: 'auto', opacity: splitO }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 16,
              padding: '28px 34px',
              borderRadius: 24,
              background: 'rgba(25,251,155,0.08)',
              border: '1px solid rgba(25,251,155,0.3)',
            }}
          >
            <span style={{ fontFamily: FONT.display, fontSize: 58, color: COLORS.green }}>+$166</span>
            <span style={{ fontFamily: FONT.sans, fontWeight: 400, fontSize: 40, color: COLORS.white, lineHeight: 1.1, whiteSpace: 'pre-line' }}>
              the <b>discount</b> is split back{'\n'}to everyone else.
            </span>
          </div>
          <div
            style={{
              fontFamily: FONT.mono,
              fontSize: 30,
              color: COLORS.white60,
              marginTop: 22,
              textAlign: 'center',
              letterSpacing: 1,
            }}
          >
            lower bids = bigger payouts for your circle
          </div>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
