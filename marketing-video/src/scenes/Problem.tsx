import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame } from 'remotion';
import { AlertTriangle, EyeOff, TrendingDown } from 'lucide-react';
import { Background, fadeIn } from '../ui';
import { COLORS, FONT, SAFE } from '../theme';

const PAINS = [
  { icon: AlertTriangle, text: 'Organizers vanish with the pot' },
  { icon: EyeOff, text: 'Discount math gets hidden' },
  { icon: TrendingDown, text: 'Idle money earns nothing' },
];

export const Problem: React.FC = () => {
  const frame = useCurrentFrame();
  const titleO = fadeIn(frame, 6, 12);

  return (
    <AbsoluteFill>
      <Background glow={'rgba(255,77,109,0.35)'} intensity={0.85} cy={40} />
      <AbsoluteFill
        style={{
          justifyContent: 'center',
          padding: `0 ${SAFE.side}px`,
        }}
      >
        <div
          style={{
            fontFamily: FONT.display,
            fontSize: 86,
            lineHeight: 1.02,
            color: COLORS.white,
            opacity: titleO,
            whiteSpace: 'pre-line',
            transform: `translateY(${interpolate(titleO, [0, 1], [30, 0])}px)`,
          }}
        >
          But trust at scale{'\n'}
          <span style={{ color: COLORS.danger }}>breaks.</span>
        </div>

        <div style={{ marginTop: 64, display: 'flex', flexDirection: 'column', gap: 26 }}>
          {PAINS.map((p, i) => {
            const at = 26 + i * 16;
            const o = fadeIn(frame, at, 12);
            const x = interpolate(o, [0, 1], [-40, 0]);
            const Icon = p.icon;
            return (
              <div
                key={i}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 24,
                  opacity: o,
                  transform: `translateX(${x}px)`,
                }}
              >
                <div
                  style={{
                    width: 84,
                    height: 84,
                    borderRadius: 22,
                    background: COLORS.dangerSoft,
                    border: `1px solid rgba(255,77,109,0.35)`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  <Icon size={42} color={COLORS.danger} strokeWidth={2} />
                </div>
                <span
                  style={{
                    fontFamily: FONT.sans,
                    fontWeight: 400,
                    fontSize: 44,
                    color: COLORS.white80,
                  }}
                >
                  {p.text}
                </span>
              </div>
            );
          })}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
