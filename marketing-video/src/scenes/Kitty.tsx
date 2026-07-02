import React from 'react';
import { AbsoluteFill, Easing, interpolate, useCurrentFrame } from 'remotion';
import { Dices, ShieldCheck } from 'lucide-react';
import { Background, Eyebrow, fadeIn } from '../ui';
import { COLORS, FONT, SAFE } from '../theme';

const MEMBERS = ['A', 'H', 'M', 'D', 'P', 'R'];
const WINNER = 2; // Maria
const RADIUS = 260;
const CENTER = { x: 540, y: 980 };

export const Kitty: React.FC = () => {
  const frame = useCurrentFrame();

  const eyebrowO = fadeIn(frame, 4, 12);
  const titleO = fadeIn(frame, 14, 12);
  const ringO = fadeIn(frame, 28, 14);

  // spin: rapid rotation decelerating onto the winner index
  const totalSteps = MEMBERS.length * 3 + WINNER; // 3 full loops then land on WINNER
  const LAND = 86;
  const progress = interpolate(frame, [30, LAND], [0, totalSteps], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const active = Math.round(progress) % MEMBERS.length;
  const landed = frame > LAND - 2;
  const winPulse = landed ? 0.5 + Math.sin((frame - LAND) / 6) * 0.5 : 0;

  const vrfO = fadeIn(frame, LAND + 6, 12);
  const footO = fadeIn(frame, LAND + 16, 12);

  return (
    <AbsoluteFill>
      <Background intensity={0.95} cy={50} />
      <AbsoluteFill style={{ padding: `${SAFE.top}px ${SAFE.side}px ${SAFE.bottom}px` }}>
        <div style={{ opacity: eyebrowO }}>
          <Eyebrow color={COLORS.base}>Mode 02 · Kitty Lottery</Eyebrow>
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
          No bids?{'\n'}
          <span style={{ color: COLORS.base }}>A fair random winner.</span>
        </div>

        {/* ring */}
        <div style={{ position: 'absolute', inset: 0, opacity: ringO }}>
          {/* orbit guide */}
          <div
            style={{
              position: 'absolute',
              left: CENTER.x - RADIUS,
              top: CENTER.y - RADIUS,
              width: RADIUS * 2,
              height: RADIUS * 2,
              borderRadius: '50%',
              border: `1px dashed ${COLORS.glassBorder}`,
            }}
          />
          {/* center label */}
          <div
            style={{
              position: 'absolute',
              left: CENTER.x,
              top: CENTER.y,
              transform: 'translate(-50%, -50%)',
              textAlign: 'center',
            }}
          >
            <Dices size={70} color={COLORS.white60} />
            <div style={{ fontFamily: FONT.mono, fontSize: 24, color: COLORS.white40, marginTop: 8, letterSpacing: 2 }}>
              DRAW
            </div>
          </div>

          {MEMBERS.map((m, i) => {
            const angle = (i / MEMBERS.length) * Math.PI * 2 - Math.PI / 2;
            const x = CENTER.x + Math.cos(angle) * RADIUS;
            const y = CENTER.y + Math.sin(angle) * RADIUS;
            const isActive = i === active && !landed;
            const isWinner = landed && i === WINNER;
            const glow = isWinner ? winPulse : isActive ? 1 : 0;
            const scale = isWinner ? 1 + winPulse * 0.12 : isActive ? 1.08 : 1;
            return (
              <div
                key={i}
                style={{
                  position: 'absolute',
                  left: x,
                  top: y,
                  transform: `translate(-50%, -50%) scale(${scale})`,
                  width: 116,
                  height: 116,
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontFamily: FONT.display,
                  fontSize: 50,
                  color: glow > 0.3 ? '#fff' : COLORS.white60,
                  background:
                    glow > 0.3
                      ? `radial-gradient(circle, ${isWinner ? COLORS.base : COLORS.violet} 0%, rgba(0,0,0,0.4) 100%)`
                      : 'rgba(255,255,255,0.05)',
                  border: `2px solid ${
                    isWinner ? COLORS.base : isActive ? COLORS.violetBright : COLORS.glassBorder
                  }`,
                  boxShadow: glow > 0.3 ? `0 0 ${40 + glow * 40}px ${isWinner ? COLORS.base : COLORS.violetGlow}` : 'none',
                }}
              >
                {m}
                {isWinner && (
                  <div
                    style={{
                      position: 'absolute',
                      bottom: -44,
                      fontFamily: FONT.mono,
                      fontSize: 24,
                      letterSpacing: 1,
                      color: COLORS.base,
                      whiteSpace: 'nowrap',
                    }}
                  >
                    WINNER
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* VRF tag */}
        <div
          style={{
            position: 'absolute',
            bottom: SAFE.bottom + 96,
            left: SAFE.side,
            right: SAFE.side,
            display: 'flex',
            justifyContent: 'center',
            opacity: vrfO,
          }}
        >
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 14,
              padding: '16px 28px',
              borderRadius: 999,
              background: 'rgba(0,82,255,0.12)',
              border: '1px solid rgba(0,82,255,0.4)',
            }}
          >
            <ShieldCheck size={34} color={COLORS.base} />
            <span style={{ fontFamily: FONT.mono, fontSize: 28, color: COLORS.white, letterSpacing: 1 }}>
              Chainlink VRF · verifiable randomness
            </span>
          </div>
        </div>

        <div
          style={{
            position: 'absolute',
            bottom: SAFE.bottom + 24,
            left: SAFE.side,
            right: SAFE.side,
            textAlign: 'center',
            fontFamily: FONT.mono,
            fontSize: 30,
            color: COLORS.white60,
            letterSpacing: 1,
            opacity: footO,
          }}
        >
          the classic rotating kitty — provably fair
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
