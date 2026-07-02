import React from 'react';
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { TransitionSeries, linearTiming, springTiming } from '@remotion/transitions';
import { fade } from '@remotion/transitions/fade';
import { slide } from '@remotion/transitions/slide';

import { loadFonts } from '../fonts';
import { COLORS, FONT, SAFE } from '../theme';
import { Background, Eyebrow, GlassCard, fadeIn } from '../ui';
import { TopMark, LogoReveal, EndCard } from '../shortsKit';
import { ShortAudio } from '../audioKit';

loadFonts();
const ROSE = '#FF6FB5', AMBER = '#F5B544';
const T = 12;
const fadeT = () => linearTiming({ durationInFrames: T });
const slideT = () => springTiming({ config: { damping: 200 }, durationInFrames: T });

const PEOPLE = [
  { i: 'A', name: 'Asha', role: 'Chit chairwoman · Chennai', want: 'keep her family circle honest', color: COLORS.violetBright },
  { i: 'H', name: 'Hassan', role: 'Gig worker · Lagos', want: 'credit without organizer risk', color: COLORS.green },
  { i: 'M', name: 'Maria', role: 'Overseas worker · Dubai → Manila', want: 'send home & save in one tap', color: ROSE },
  { i: 'D', name: 'Dmitri', role: 'DeFi native · Berlin', want: 'verifiable, non-correlated yield', color: COLORS.base },
  { i: 'P', name: 'Priya', role: 'Product manager · Bengaluru', want: 'forced savings she can trust', color: AMBER },
];

const Hook: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill>
      <Background intensity={0.9} cy={44} />
      <TopMark />
      <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center', textAlign: 'center', padding: `0 ${SAFE.side}px` }}>
        <div style={{ opacity: fadeIn(frame, 6, 12) }}><Eyebrow>Who it's for</Eyebrow></div>
        <div style={{ fontFamily: FONT.display, fontSize: 96, color: COLORS.white, marginTop: 28, opacity: fadeIn(frame, 14, 12), lineHeight: 1.04, maxWidth: 900 }}>
          Everyone the bank <span style={{ color: COLORS.violetBright }}>forgot</span>—
        </div>
        <div style={{ fontFamily: FONT.display, fontSize: 60, color: COLORS.white60, opacity: fadeIn(frame, 46, 14), marginTop: 30 }}>
          and a few who weren't.
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

const Avatar: React.FC<{ i: string; color: string; size?: number }> = ({ i, color, size = 76 }) => (
  <div style={{ width: size, height: size, borderRadius: '50%', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: FONT.display, fontSize: size * 0.5, color: '#fff', background: `radial-gradient(circle at 35% 30%, ${color}, ${color}66)`, border: `2px solid ${color}`, boxShadow: `0 0 24px -6px ${color}` }}>
    {i}
  </div>
);

const People: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return (
    <AbsoluteFill>
      <Background intensity={0.7} cy={40} />
      <AbsoluteFill style={{ padding: `${SAFE.top}px ${SAFE.side}px ${SAFE.bottom}px`, justifyContent: 'center' }}>
        <div style={{ opacity: fadeIn(frame, 4, 12) }}><Eyebrow>Five lives · one circle</Eyebrow></div>
        <div style={{ marginTop: 30, display: 'flex', flexDirection: 'column', gap: 16 }}>
          {PEOPLE.map((p, idx) => {
            const at = 16 + idx * 11;
            const o = fadeIn(frame, at, 12);
            const x = interpolate(spring({ frame: frame - at, fps, config: { damping: 18 } }), [0, 1], [50, 0]);
            return (
              <GlassCard key={idx} style={{ padding: '22px 28px', display: 'flex', alignItems: 'center', gap: 22, opacity: o, transform: `translateX(${x}px)` }} accent={p.color}>
                <Avatar i={p.i} color={p.color} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontFamily: FONT.display, fontSize: 44, color: COLORS.white, lineHeight: 1 }}>{p.name}</div>
                  <div style={{ fontFamily: FONT.mono, fontSize: 23, color: COLORS.white60, marginTop: 4 }}>{p.role}</div>
                </div>
                <div style={{ width: 300, textAlign: 'right', fontFamily: FONT.sans, fontWeight: 300, fontStyle: 'italic', fontSize: 28, color: p.color, lineHeight: 1.15 }}>
                  “{p.want}”
                </div>
              </GlassCard>
            );
          })}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

const Shared: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill>
      <Background intensity={0.9} cy={42} />
      <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center', textAlign: 'center', padding: `0 ${SAFE.side}px` }}>
        <div style={{ display: 'flex', gap: -10, marginBottom: 50 }}>
          {PEOPLE.map((p, i) => (
            <div key={i} style={{ marginLeft: i === 0 ? 0 : -18, opacity: fadeIn(frame, 8 + i * 5, 10), transform: `translateY(${interpolate(fadeIn(frame, 8 + i * 5, 10), [0, 1], [20, 0])}px)` }}>
              <Avatar i={p.i} color={p.color} size={96} />
            </div>
          ))}
        </div>
        <div style={{ fontFamily: FONT.display, fontSize: 78, color: COLORS.white, opacity: fadeIn(frame, 36, 12), lineHeight: 1.05, maxWidth: 920 }}>
          Different lives.<br />The <span style={{ color: COLORS.violetBright }}>same</span> need:
        </div>
        <div style={{ fontFamily: FONT.sans, fontWeight: 300, fontSize: 48, color: COLORS.white80, opacity: fadeIn(frame, 56, 14), marginTop: 28 }}>
          a circle they can actually trust.
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

export const ShortI: React.FC = () => {
  const durations = [185, 210, 185, 168, 200];
  return (
    <AbsoluteFill style={{ backgroundColor: COLORS.black }}>
      <TransitionSeries>
        <TransitionSeries.Sequence durationInFrames={durations[0]}><Hook /></TransitionSeries.Sequence>
        <TransitionSeries.Transition presentation={fade()} timing={fadeT()} />
        <TransitionSeries.Sequence durationInFrames={durations[1]}><People /></TransitionSeries.Sequence>
        <TransitionSeries.Transition presentation={slide({ direction: 'from-right' })} timing={slideT()} />
        <TransitionSeries.Sequence durationInFrames={durations[2]}><Shared /></TransitionSeries.Sequence>
        <TransitionSeries.Transition presentation={fade()} timing={fadeT()} />
        <TransitionSeries.Sequence durationInFrames={durations[3]}><LogoReveal headline={'Built for\nall of them.'} sub="from the unbanked to the DeFi native" /></TransitionSeries.Sequence>
        <TransitionSeries.Transition presentation={fade()} timing={fadeT()} />
        <TransitionSeries.Sequence durationInFrames={durations[4]}><EndCard tagline={'Whoever you are,\nthere’s a seat in the circle.'} /></TransitionSeries.Sequence>
      </TransitionSeries>
      <ShortAudio music="music_i.wav" durations={durations} cues={[
        { s: 0, at: 14, src: 'impact.wav', v: 0.5 }, { s: 0, at: 46, src: 'bell.wav', v: 0.38 },
        { s: 1, at: 16, src: 'pop.wav', v: 0.32 }, { s: 1, at: 27, src: 'pop.wav', v: 0.32 }, { s: 1, at: 38, src: 'pop.wav', v: 0.32 }, { s: 1, at: 49, src: 'pop.wav', v: 0.32 }, { s: 1, at: 60, src: 'pop.wav', v: 0.32 },
        { s: 2, at: 8, src: 'pop.wav', v: 0.28 }, { s: 2, at: 36, src: 'uplift.wav', v: 0.4 }, { s: 2, at: 56, src: 'bell.wav', v: 0.4 },
        { s: 3, at: -6, src: 'riser.wav', v: 0.4 }, { s: 3, at: 6, src: 'impact.wav', v: 0.55 }, { s: 3, at: 24, src: 'bell.wav', v: 0.42 },
        { s: 4, at: 6, src: 'impact.wav', v: 0.5 }, { s: 4, at: 20, src: 'bell.wav', v: 0.42 }, { s: 4, at: 58, src: 'shimmer.wav', v: 0.5 },
      ]} />
    </AbsoluteFill>
  );
};
