import React from 'react';
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { TransitionSeries, linearTiming, springTiming } from '@remotion/transitions';
import { fade } from '@remotion/transitions/fade';
import { slide } from '@remotion/transitions/slide';
import { BadgeCheck, Wallet, ArrowUpRight, AlertTriangle } from 'lucide-react';

import { loadFonts } from '../fonts';
import { COLORS, FONT, SAFE } from '../theme';
import { Background, Eyebrow, GlassCard, fadeIn } from '../ui';
import { Donut } from '../infographics';
import { TopMark, LogoReveal, EndCard } from '../shortsKit';
import { ShortAudio } from '../audioKit';

loadFonts();
const AMBER = '#F5B544';
const T = 12;
const fadeT = () => linearTiming({ durationInFrames: T });
const slideT = () => springTiming({ config: { damping: 200 }, durationInFrames: T });

const Hook: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill>
      <Background intensity={0.9} cy={44} glow={'rgba(245,181,68,0.28)'} />
      <TopMark />
      <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center', textAlign: 'center', padding: `0 ${SAFE.side}px` }}>
        <div style={{ opacity: fadeIn(frame, 6, 12) }}><Eyebrow color={AMBER}>Reputation</Eyebrow></div>
        <div style={{ fontFamily: FONT.display, fontSize: 92, color: COLORS.white, marginTop: 28, opacity: fadeIn(frame, 14, 12), lineHeight: 1.05, maxWidth: 900 }}>
          The bank wants three years of payslips.
        </div>
        <div style={{ fontFamily: FONT.display, fontSize: 60, color: AMBER, opacity: fadeIn(frame, 46, 14), marginTop: 36 }}>
          Your wallet keeps the receipts.
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

const Score: React.FC = () => {
  const frame = useCurrentFrame();
  const cycles = ['Cycle 1', 'Cycle 2', 'Cycle 3'];
  return (
    <AbsoluteFill>
      <Background intensity={0.8} cy={40} glow={'rgba(245,181,68,0.25)'} />
      <AbsoluteFill style={{ padding: `${SAFE.top}px ${SAFE.side}px ${SAFE.bottom}px`, alignItems: 'center' }}>
        <div style={{ opacity: fadeIn(frame, 4, 12), alignSelf: 'flex-start' }}><Eyebrow color={AMBER}>Built one cycle at a time</Eyebrow></div>
        <div style={{ marginTop: 44, opacity: fadeIn(frame, 10, 12) }}>
          <Donut pct={92} delay={18} size={380} color={AMBER} centerTop="92" centerSub="rep score" />
        </div>
        <div style={{ fontFamily: FONT.sans, fontWeight: 300, fontSize: 46, color: COLORS.white, textAlign: 'center', marginTop: 30, opacity: fadeIn(frame, 32, 12), maxWidth: 820, lineHeight: 1.2 }}>
          Every cycle you complete, your <span style={{ fontWeight: 600, color: AMBER }}>on-chain reputation</span> grows.
        </div>
        <div style={{ display: 'flex', gap: 16, marginTop: 44 }}>
          {cycles.map((c, i) => (
            <div key={i} style={{ opacity: fadeIn(frame, 52 + i * 8, 10), display: 'flex', alignItems: 'center', gap: 10, padding: '14px 26px', borderRadius: 999, background: `${AMBER}1a`, border: `1px solid ${AMBER}66` }}>
              <BadgeCheck size={28} color={AMBER} />
              <span style={{ fontFamily: FONT.mono, fontSize: 28, color: COLORS.white }}>{c}</span>
            </div>
          ))}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

const Portable: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const pots = [
    { name: 'Family pot', state: 'completed', color: AMBER },
    { name: 'Vendor pot', state: 'completed', color: AMBER },
    { name: 'High-stake pot', state: 'invited', color: COLORS.green },
  ];
  return (
    <AbsoluteFill>
      <Background intensity={0.85} cy={40} glow={'rgba(245,181,68,0.22)'} />
      <AbsoluteFill style={{ padding: `${SAFE.top}px ${SAFE.side}px ${SAFE.bottom}px`, justifyContent: 'center' }}>
        <div style={{ opacity: fadeIn(frame, 4, 12) }}><Eyebrow color={AMBER}>It moves with you</Eyebrow></div>
        <div style={{ fontFamily: FONT.display, fontSize: 76, color: COLORS.white, marginTop: 18, marginBottom: 40, opacity: fadeIn(frame, 12, 12), lineHeight: 1.0, whiteSpace: 'pre-line' }}>
          One wallet.{'\n'}<span style={{ color: AMBER }}>Every circle.</span>
        </div>
        <GlassCard style={{ padding: '28px 34px', display: 'flex', alignItems: 'center', gap: 22, opacity: fadeIn(frame, 22, 12), marginBottom: 26 }}>
          <Wallet size={46} color={AMBER} />
          <span style={{ fontFamily: FONT.mono, fontSize: 32, color: COLORS.white }}>0xAsha…9De3</span>
          <span style={{ marginLeft: 'auto', fontFamily: FONT.display, fontSize: 44, color: AMBER }}>92</span>
        </GlassCard>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {pots.map((p, i) => {
            const at = 32 + i * 12;
            const o = fadeIn(frame, at, 12);
            const x = interpolate(spring({ frame: frame - at, fps, config: { damping: 18 } }), [0, 1], [40, 0]);
            return (
              <div key={i} style={{ opacity: o, transform: `translateX(${x}px)`, display: 'flex', alignItems: 'center', gap: 18, padding: '22px 30px', borderRadius: 20, background: 'rgba(255,255,255,0.05)', border: `1px solid ${p.state === 'invited' ? COLORS.green + '66' : COLORS.glassBorder}` }}>
                {p.state === 'invited' ? <ArrowUpRight size={34} color={COLORS.green} /> : <BadgeCheck size={34} color={AMBER} />}
                <span style={{ fontFamily: FONT.sans, fontWeight: 500, fontSize: 40, color: COLORS.white }}>{p.name}</span>
                <span style={{ marginLeft: 'auto', fontFamily: FONT.mono, fontSize: 28, color: p.state === 'invited' ? COLORS.green : COLORS.white60, textTransform: 'uppercase', letterSpacing: 1 }}>
                  {p.state === 'invited' ? 'invited ↑' : 'completed'}
                </span>
              </div>
            );
          })}
        </div>
        <div style={{ fontFamily: FONT.mono, fontSize: 26, color: COLORS.white60, marginTop: 'auto', textAlign: 'center', letterSpacing: 1 }}>
          good history → bigger circles · defaults stay visible
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

export const ShortH: React.FC = () => {
  const durations = [180, 195, 200, 175, 198];
  return (
    <AbsoluteFill style={{ backgroundColor: COLORS.black }}>
      <TransitionSeries>
        <TransitionSeries.Sequence durationInFrames={durations[0]}><Hook /></TransitionSeries.Sequence>
        <TransitionSeries.Transition presentation={fade()} timing={fadeT()} />
        <TransitionSeries.Sequence durationInFrames={durations[1]}><Score /></TransitionSeries.Sequence>
        <TransitionSeries.Transition presentation={slide({ direction: 'from-right' })} timing={slideT()} />
        <TransitionSeries.Sequence durationInFrames={durations[2]}><Portable /></TransitionSeries.Sequence>
        <TransitionSeries.Transition presentation={fade()} timing={fadeT()} />
        <TransitionSeries.Sequence durationInFrames={durations[3]}><LogoReveal headline={'Your reputation,\nfinally yours.'} sub="portable · on-chain · permissionless" accent={AMBER} /></TransitionSeries.Sequence>
        <TransitionSeries.Transition presentation={fade()} timing={fadeT()} />
        <TransitionSeries.Sequence durationInFrames={durations[4]}><EndCard tagline={'Show up. Build trust.\nCarry it everywhere.'} accent={AMBER} /></TransitionSeries.Sequence>
      </TransitionSeries>
      <ShortAudio music="music_h.wav" durations={durations} cues={[
        { s: 0, at: 14, src: 'impact.wav', v: 0.5 }, { s: 0, at: 46, src: 'bell.wav', v: 0.4 },
        { s: 1, at: 18, src: 'uplift.wav', v: 0.42 }, { s: 1, at: 52, src: 'pop.wav', v: 0.34 }, { s: 1, at: 60, src: 'pop.wav', v: 0.34 }, { s: 1, at: 68, src: 'bell.wav', v: 0.4 },
        { s: 2, at: 22, src: 'pop.wav', v: 0.38 }, { s: 2, at: 44, src: 'pop.wav', v: 0.38 }, { s: 2, at: 56, src: 'bell.wav', v: 0.42 },
        { s: 3, at: -6, src: 'riser.wav', v: 0.4 }, { s: 3, at: 6, src: 'impact.wav', v: 0.55 }, { s: 3, at: 24, src: 'bell.wav', v: 0.42 },
        { s: 4, at: 6, src: 'impact.wav', v: 0.5 }, { s: 4, at: 20, src: 'bell.wav', v: 0.42 }, { s: 4, at: 58, src: 'shimmer.wav', v: 0.5 },
      ]} />
    </AbsoluteFill>
  );
};
