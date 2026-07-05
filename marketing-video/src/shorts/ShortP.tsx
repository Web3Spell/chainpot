import React from 'react';
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { TransitionSeries, linearTiming, springTiming } from '@remotion/transitions';
import { fade } from '@remotion/transitions/fade';
import { slide } from '@remotion/transitions/slide';

import { loadFonts } from '../fonts';
import { COLORS, FONT, SAFE } from '../theme';
import { Background, Eyebrow, GlassCard, fadeIn } from '../ui';
import { Counter } from '../infographics';
import { TopMark, LogoReveal, EndCard } from '../shortsKit';
import { ShortAudio } from '../audioKit';

loadFonts();
const G = COLORS.green;
const T = 12;
const fadeT = () => linearTiming({ durationInFrames: T });
const slideT = () => springTiming({ config: { damping: 200 }, durationInFrames: T });

const Hook: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill>
      <Background intensity={0.9} cy={44} glow={'rgba(25,251,155,0.28)'} />
      <TopMark />
      <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center', textAlign: 'center', padding: `0 ${SAFE.side}px` }}>
        <div style={{ opacity: fadeIn(frame, 6, 12) }}><Eyebrow color={G}>The math</Eyebrow></div>
        <div style={{ fontFamily: FONT.display, fontSize: 110, color: COLORS.white, marginTop: 22, opacity: fadeIn(frame, 14, 12), lineHeight: 1.0, whiteSpace: 'pre-line' }}>
          12 friends.{'\n'}$100 a month.
        </div>
        <div style={{ fontFamily: FONT.display, fontSize: 54, color: G, opacity: fadeIn(frame, 46, 14), marginTop: 36 }}>
          Here’s exactly what you get.
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

const Setup: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill>
      <Background intensity={0.8} cy={40} glow={'rgba(25,251,155,0.25)'} />
      <AbsoluteFill style={{ padding: `${SAFE.top}px ${SAFE.side}px ${SAFE.bottom}px`, justifyContent: 'center', alignItems: 'center', textAlign: 'center' }}>
        <div style={{ opacity: fadeIn(frame, 4, 12), alignSelf: 'flex-start' }}><Eyebrow color={G}>The pot</Eyebrow></div>
        <GlassCard style={{ padding: '26px 40px', marginTop: 40, opacity: fadeIn(frame, 12, 12) }}>
          <span style={{ fontFamily: FONT.mono, fontSize: 36, color: COLORS.white80, letterSpacing: 1 }}>12 members · $100 / cycle</span>
        </GlassCard>
        <div style={{ fontFamily: FONT.display, fontSize: 200, color: G, marginTop: 40, opacity: fadeIn(frame, 18, 12), textShadow: `0 0 70px ${G}66` }}>
          <Counter to={1200} prefix="$" delay={20} dur={36} />
        </div>
        <div style={{ fontFamily: FONT.sans, fontWeight: 300, fontSize: 46, color: COLORS.white, opacity: fadeIn(frame, 40, 14) }}>
          per-cycle pool
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

const Worked: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const rows = [
    { label: 'Your bid', value: '$1,020', color: COLORS.violetBright },
    { label: 'You receive now', value: '$1,020', color: COLORS.violetBright },
  ];
  return (
    <AbsoluteFill>
      <Background intensity={0.85} cy={34} glow={'rgba(25,251,155,0.22)'} />
      <AbsoluteFill style={{ padding: `${SAFE.top}px ${SAFE.side}px ${SAFE.bottom}px`, justifyContent: 'center' }}>
        <div style={{ opacity: fadeIn(frame, 4, 12) }}><Eyebrow color={G}>Say you win cycle 6</Eyebrow></div>
        <div style={{ marginTop: 36, display: 'flex', flexDirection: 'column', gap: 18 }}>
          {rows.map((r, i) => {
            const at = 14 + i * 12;
            const o = fadeIn(frame, at, 12);
            const y = interpolate(spring({ frame: frame - at, fps, config: { damping: 18 } }), [0, 1], [40, 0]);
            return (
              <GlassCard key={i} style={{ padding: '26px 36px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', opacity: o, transform: `translateY(${y}px)` }}>
                <span style={{ fontFamily: FONT.sans, fontWeight: 500, fontSize: 42, color: COLORS.white }}>{r.label}</span>
                <span style={{ fontFamily: FONT.mono, fontSize: 56, color: r.color, fontWeight: 600 }}>{r.value}</span>
              </GlassCard>
            );
          })}
        </div>
        <div style={{ marginTop: 24, padding: '30px 36px', borderRadius: 24, background: 'rgba(25,251,155,0.08)', border: '1px solid rgba(25,251,155,0.3)', opacity: fadeIn(frame, 44, 12) }}>
          <div style={{ fontFamily: FONT.display, fontSize: 52, color: G }}>The other 11 split $180 + yield</div>
          <div style={{ fontFamily: FONT.sans, fontWeight: 400, fontSize: 40, color: COLORS.white, marginTop: 6 }}>≈ <b>+$17 each</b></div>
        </div>
        <div style={{ fontFamily: FONT.mono, fontSize: 28, color: COLORS.white60, marginTop: 'auto', textAlign: 'center', letterSpacing: 1 }}>
          you paid $180 for an interest-free advance
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

const Either: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const cards = [
    { title: 'Take it early', sub: 'A small cost for cash when you need it.', color: COLORS.violetBright },
    { title: 'Wait it out', sub: 'Collect discounts + yield — come out ahead.', color: G },
  ];
  return (
    <AbsoluteFill>
      <Background intensity={0.85} cy={36} glow={'rgba(25,251,155,0.2)'} />
      <AbsoluteFill style={{ padding: `${SAFE.top}px ${SAFE.side}px ${SAFE.bottom}px`, justifyContent: 'center' }}>
        <div style={{ opacity: fadeIn(frame, 4, 12) }}><Eyebrow color={G}>Either way</Eyebrow></div>
        <div style={{ fontFamily: FONT.display, fontSize: 74, color: COLORS.white, marginTop: 18, marginBottom: 44, opacity: fadeIn(frame, 12, 12) }}>
          The math <span style={{ color: G }}>works for you.</span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {cards.map((c, i) => {
            const at = 22 + i * 16;
            const o = fadeIn(frame, at, 12);
            const yy = interpolate(spring({ frame: frame - at, fps, config: { damping: 18 } }), [0, 1], [50, 0]);
            return (
              <GlassCard key={i} glow accent={c.color} style={{ padding: '34px 36px', opacity: o, transform: `translateY(${yy}px)` }}>
                <div style={{ fontFamily: FONT.display, fontSize: 54, color: c.color }}>{c.title}</div>
                <div style={{ fontFamily: FONT.sans, fontWeight: 300, fontSize: 34, color: COLORS.white80, marginTop: 6 }}>{c.sub}</div>
              </GlassCard>
            );
          })}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

export const ShortP: React.FC = () => {
  const durations = [150, 175, 175, 150, 150, 160];
  return (
    <AbsoluteFill style={{ backgroundColor: COLORS.black }}>
      <TransitionSeries>
        <TransitionSeries.Sequence durationInFrames={durations[0]}><Hook /></TransitionSeries.Sequence>
        <TransitionSeries.Transition presentation={fade()} timing={fadeT()} />
        <TransitionSeries.Sequence durationInFrames={durations[1]}><Setup /></TransitionSeries.Sequence>
        <TransitionSeries.Transition presentation={slide({ direction: 'from-right' })} timing={slideT()} />
        <TransitionSeries.Sequence durationInFrames={durations[2]}><Worked /></TransitionSeries.Sequence>
        <TransitionSeries.Transition presentation={fade()} timing={fadeT()} />
        <TransitionSeries.Sequence durationInFrames={durations[3]}><Either /></TransitionSeries.Sequence>
        <TransitionSeries.Transition presentation={fade()} timing={fadeT()} />
        <TransitionSeries.Sequence durationInFrames={durations[4]}><LogoReveal headline={'Real money.\nReal math.'} sub="all on-chain" accent={G} /></TransitionSeries.Sequence>
        <TransitionSeries.Transition presentation={fade()} timing={fadeT()} />
        <TransitionSeries.Sequence durationInFrames={durations[5]}><EndCard tagline={'Do the math.\nThen join.'} accent={G} /></TransitionSeries.Sequence>
      </TransitionSeries>
      <ShortAudio music="music_p.wav" durations={durations} cues={[
        { s: 0, at: 14, src: 'impact.wav', v: 0.5 }, { s: 0, at: 46, src: 'bell.wav', v: 0.38 },
        { s: 1, at: 20, src: 'uplift.wav', v: 0.4 }, { s: 1, at: 40, src: 'shimmer.wav', v: 0.4 },
        { s: 2, at: 14, src: 'pop.wav', v: 0.4 }, { s: 2, at: 26, src: 'pop.wav', v: 0.4 }, { s: 2, at: 44, src: 'bell.wav', v: 0.42 },
        { s: 3, at: 22, src: 'pop.wav', v: 0.38 }, { s: 3, at: 38, src: 'bell.wav', v: 0.4 },
        { s: 4, at: -6, src: 'riser.wav', v: 0.4 }, { s: 4, at: 6, src: 'impact.wav', v: 0.55 }, { s: 4, at: 24, src: 'bell.wav', v: 0.42 },
        { s: 5, at: 6, src: 'impact.wav', v: 0.5 }, { s: 5, at: 20, src: 'bell.wav', v: 0.42 }, { s: 5, at: 58, src: 'shimmer.wav', v: 0.5 },
      ]} />
    </AbsoluteFill>
  );
};
