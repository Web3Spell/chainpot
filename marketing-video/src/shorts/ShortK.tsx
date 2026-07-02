import React from 'react';
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { TransitionSeries, linearTiming, springTiming } from '@remotion/transitions';
import { fade } from '@remotion/transitions/fade';
import { slide } from '@remotion/transitions/slide';
import { Zap, Timer, Clock } from 'lucide-react';

import { loadFonts } from '../fonts';
import { COLORS, FONT, SAFE } from '../theme';
import { Background, Eyebrow, GlassCard, fadeIn } from '../ui';
import { TopMark, LogoReveal, EndCard } from '../shortsKit';
import { ShortAudio } from '../audioKit';

loadFonts();
const B = COLORS.base;
const T = 12;
const fadeT = () => linearTiming({ durationInFrames: T });
const slideT = () => springTiming({ config: { damping: 200 }, durationInFrames: T });

const Hook: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill>
      <Background intensity={0.9} cy={44} glow={'rgba(0,82,255,0.4)'} />
      <TopMark />
      <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center', textAlign: 'center', padding: `0 ${SAFE.side}px` }}>
        <div style={{ opacity: fadeIn(frame, 6, 12) }}><Eyebrow color={B}>Why Base</Eyebrow></div>
        <div style={{ fontFamily: FONT.display, fontSize: 240, color: COLORS.white, marginTop: 10, opacity: fadeIn(frame, 12, 10), lineHeight: 0.95, textShadow: '0 0 80px rgba(0,82,255,0.5)' }}>
          $0.01
        </div>
        <div style={{ fontFamily: FONT.sans, fontWeight: 300, fontSize: 50, color: COLORS.white, opacity: fadeIn(frame, 32, 12), marginTop: 4 }}>
          to move money on Base — <span style={{ fontWeight: 600 }}>not $8</span> at the counter.
        </div>
        <div style={{ fontFamily: FONT.display, fontSize: 50, color: B, opacity: fadeIn(frame, 52, 14), marginTop: 40 }}>
          Cents to move. Seconds to settle.
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

const Stats: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const stats = [
    { icon: Zap, big: '≈ $0.01', label: 'per transaction in fees' },
    { icon: Timer, big: '~ 2s', label: 'to final settlement' },
    { icon: Clock, big: '24 / 7', label: 'no bank hours, no holidays' },
  ];
  return (
    <AbsoluteFill>
      <Background intensity={0.85} cy={34} glow={'rgba(0,82,255,0.28)'} />
      <AbsoluteFill style={{ padding: `${SAFE.top}px ${SAFE.side}px ${SAFE.bottom}px`, justifyContent: 'center' }}>
        <div style={{ opacity: fadeIn(frame, 4, 12) }}><Eyebrow color={B}>Built for real money</Eyebrow></div>
        <div style={{ marginTop: 40, display: 'flex', flexDirection: 'column', gap: 24 }}>
          {stats.map((s, i) => {
            const at = 14 + i * 14;
            const o = fadeIn(frame, at, 12);
            const y = interpolate(spring({ frame: frame - at, fps, config: { damping: 18 } }), [0, 1], [50, 0]);
            const Icon = s.icon;
            return (
              <GlassCard key={i} style={{ padding: '30px 36px', display: 'flex', alignItems: 'center', gap: 28, opacity: o, transform: `translateY(${y}px)` }}>
                <div style={{ width: 92, height: 92, borderRadius: 24, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: `${B}1f`, border: `1px solid ${B}66` }}>
                  <Icon size={48} color={B} strokeWidth={2} />
                </div>
                <div>
                  <div style={{ fontFamily: FONT.display, fontSize: 70, color: COLORS.white, lineHeight: 1 }}>{s.big}</div>
                  <div style={{ fontFamily: FONT.sans, fontWeight: 300, fontSize: 30, color: COLORS.white60, marginTop: 4 }}>{s.label}</div>
                </div>
              </GlassCard>
            );
          })}
        </div>
        <div style={{ fontFamily: FONT.mono, fontSize: 28, color: COLORS.white60, marginTop: 'auto', textAlign: 'center', letterSpacing: 1 }}>
          fast, final, and basically free
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

const Chip: React.FC<{ children: React.ReactNode; at: number; color?: string }> = ({ children, at, color = B }) => {
  const frame = useCurrentFrame();
  return (
    <div style={{ opacity: fadeIn(frame, at, 10), fontFamily: FONT.mono, fontSize: 30, color: COLORS.white, padding: '16px 28px', borderRadius: 999, background: `${color}14`, border: `1px solid ${color}55`, letterSpacing: 0.5 }}>
      {children}
    </div>
  );
};

const Stable: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill>
      <Background intensity={0.85} cy={40} glow={'rgba(0,82,255,0.26)'} />
      <AbsoluteFill style={{ padding: `0 ${SAFE.side}px`, justifyContent: 'center', alignItems: 'center', textAlign: 'center' }}>
        <div style={{ opacity: fadeIn(frame, 4, 12) }}><Eyebrow color={B}>Settled in dollars</Eyebrow></div>
        <div style={{ fontFamily: FONT.display, fontSize: 86, color: COLORS.white, marginTop: 24, opacity: fadeIn(frame, 12, 12), lineHeight: 1.04 }}>
          USDC — <span style={{ color: B }}>not a melting note.</span>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 16, marginTop: 50, maxWidth: 860 }}>
          <Chip at={26}>Dollar-stable</Chip>
          <Chip at={34}>Globally liquid</Chip>
          <Chip at={42}>Backed 1:1</Chip>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

const Rails: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill>
      <Background intensity={0.85} cy={40} glow={'rgba(0,82,255,0.26)'} />
      <AbsoluteFill style={{ padding: `0 ${SAFE.side}px`, justifyContent: 'center', alignItems: 'center', textAlign: 'center' }}>
        <div style={{ opacity: fadeIn(frame, 4, 12) }}><Eyebrow color={B}>Battle-tested rails</Eyebrow></div>
        <div style={{ fontFamily: FONT.display, fontSize: 76, color: COLORS.white, marginTop: 24, opacity: fadeIn(frame, 12, 12), lineHeight: 1.04 }}>
          Standing on <span style={{ color: B }}>proven infrastructure.</span>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 16, marginTop: 50, maxWidth: 860 }}>
          <Chip at={26}>Compound III</Chip>
          <Chip at={33}>Chainlink VRF</Chip>
          <Chip at={40}>USDC</Chip>
          <Chip at={47}>Open on Basescan</Chip>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

export const ShortK: React.FC = () => {
  const durations = [150, 170, 170, 150, 150, 170];
  return (
    <AbsoluteFill style={{ backgroundColor: COLORS.black }}>
      <TransitionSeries>
        <TransitionSeries.Sequence durationInFrames={durations[0]}><Hook /></TransitionSeries.Sequence>
        <TransitionSeries.Transition presentation={fade()} timing={fadeT()} />
        <TransitionSeries.Sequence durationInFrames={durations[1]}><Stats /></TransitionSeries.Sequence>
        <TransitionSeries.Transition presentation={slide({ direction: 'from-right' })} timing={slideT()} />
        <TransitionSeries.Sequence durationInFrames={durations[2]}><Stable /></TransitionSeries.Sequence>
        <TransitionSeries.Transition presentation={fade()} timing={fadeT()} />
        <TransitionSeries.Sequence durationInFrames={durations[3]}><Rails /></TransitionSeries.Sequence>
        <TransitionSeries.Transition presentation={fade()} timing={fadeT()} />
        <TransitionSeries.Sequence durationInFrames={durations[4]}><LogoReveal headline={'Money that moves\nat internet speed.'} sub="on Base" accent={B} /></TransitionSeries.Sequence>
        <TransitionSeries.Transition presentation={fade()} timing={fadeT()} />
        <TransitionSeries.Sequence durationInFrames={durations[5]}><EndCard tagline={'Your circle,\non Base.'} accent={B} /></TransitionSeries.Sequence>
      </TransitionSeries>
      <ShortAudio music="music_k.wav" durations={durations} cues={[
        { s: 0, at: 14, src: 'impact.wav', v: 0.5 }, { s: 0, at: 52, src: 'bell.wav', v: 0.38 },
        { s: 1, at: 16, src: 'pop.wav', v: 0.4 }, { s: 1, at: 30, src: 'pop.wav', v: 0.4 }, { s: 1, at: 44, src: 'bell.wav', v: 0.4 },
        { s: 2, at: 12, src: 'uplift.wav', v: 0.4 }, { s: 2, at: 26, src: 'pop.wav', v: 0.34 }, { s: 2, at: 34, src: 'pop.wav', v: 0.34 }, { s: 2, at: 42, src: 'pop.wav', v: 0.34 },
        { s: 3, at: 12, src: 'uplift.wav', v: 0.36 }, { s: 3, at: 26, src: 'pop.wav', v: 0.32 }, { s: 3, at: 33, src: 'pop.wav', v: 0.32 }, { s: 3, at: 40, src: 'pop.wav', v: 0.32 }, { s: 3, at: 47, src: 'bell.wav', v: 0.38 },
        { s: 4, at: -6, src: 'riser.wav', v: 0.4 }, { s: 4, at: 6, src: 'impact.wav', v: 0.55 }, { s: 4, at: 24, src: 'bell.wav', v: 0.42 },
        { s: 5, at: 6, src: 'impact.wav', v: 0.5 }, { s: 5, at: 20, src: 'bell.wav', v: 0.42 }, { s: 5, at: 58, src: 'shimmer.wav', v: 0.5 },
      ]} />
    </AbsoluteFill>
  );
};
