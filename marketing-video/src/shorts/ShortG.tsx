import React from 'react';
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { TransitionSeries, linearTiming, springTiming } from '@remotion/transitions';
import { fade } from '@remotion/transitions/fade';
import { slide } from '@remotion/transitions/slide';
import { Coins, ShieldCheck, TrendingUp } from 'lucide-react';

import { loadFonts } from '../fonts';
import { COLORS, FONT, SAFE } from '../theme';
import { Background, Eyebrow, GlassCard, fadeIn } from '../ui';
import { AreaChart, Counter } from '../infographics';
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
      <Background intensity={0.9} cy={44} glow={'rgba(255,77,109,0.32)'} />
      <TopMark />
      <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center', textAlign: 'center', padding: `0 ${SAFE.side}px` }}>
        <div style={{ opacity: fadeIn(frame, 6, 12) }}><Eyebrow color={COLORS.danger}>The saver's tax</Eyebrow></div>
        <div style={{ fontFamily: FONT.display, fontSize: 230, color: COLORS.danger, marginTop: 14, opacity: fadeIn(frame, 12, 10), textShadow: '0 0 70px rgba(255,77,109,0.5)' }}>
          <Counter to={100} delay={14} dur={40} suffix="%+" />
        </div>
        <div style={{ fontFamily: FONT.sans, fontWeight: 300, fontSize: 50, color: COLORS.white, opacity: fadeIn(frame, 32, 12), marginTop: 4 }}>
          inflation in Argentina, 2023.
        </div>
        <div style={{ fontFamily: FONT.display, fontSize: 50, color: COLORS.white, opacity: fadeIn(frame, 52, 14), marginTop: 40 }}>
          Saving in cash is a <span style={{ color: COLORS.danger }}>leaking bucket.</span>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

const Chart: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill>
      <Background intensity={0.8} cy={36} glow={'rgba(0,82,255,0.25)'} />
      <AbsoluteFill style={{ padding: `${SAFE.top}px ${SAFE.side}px ${SAFE.bottom}px` }}>
        <div style={{ opacity: fadeIn(frame, 4, 12) }}><Eyebrow color={G}>Same savings · different money</Eyebrow></div>
        <div style={{ fontFamily: FONT.display, fontSize: 74, color: COLORS.white, marginTop: 18, opacity: fadeIn(frame, 12, 12), lineHeight: 1.0, whiteSpace: 'pre-line' }}>
          What your circle saves —{'\n'}<span style={{ color: G }}>five years later.</span>
        </div>
        <div style={{ marginTop: 60, alignSelf: 'center' }}>
          <AreaChart
            delay={24}
            width={900}
            height={490}
            labels={['yr 1', '', '', '', 'yr 5']}
            series={[
              { name: 'ChainPot · USDC', color: G, pts: [0.7, 0.74, 0.78, 0.83, 0.9] },
              { name: 'local cash', color: COLORS.danger, pts: [0.7, 0.55, 0.42, 0.3, 0.2] },
            ]}
          />
        </div>
        <div style={{ fontFamily: FONT.sans, fontWeight: 300, fontSize: 40, color: COLORS.white, marginTop: 22, textAlign: 'center', opacity: fadeIn(frame, 72, 14) }}>
          A ChainPot circle saves in <span style={{ fontWeight: 600 }}>stablecoins</span> — and earns on top.
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

const Why: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const feats = [
    { icon: Coins, title: 'Contribute in USDC', sub: 'Dollar-stable, not a melting local note.' },
    { icon: ShieldCheck, title: 'Value holds its ground', sub: 'Your turn is worth what you put in.' },
    { icon: TrendingUp, title: 'Yield on top', sub: 'Idle funds still earn in Compound III.' },
  ];
  return (
    <AbsoluteFill>
      <Background intensity={0.85} cy={34} glow={'rgba(25,251,155,0.22)'} />
      <AbsoluteFill style={{ padding: `${SAFE.top}px ${SAFE.side}px ${SAFE.bottom}px`, justifyContent: 'center' }}>
        <div style={{ opacity: fadeIn(frame, 4, 12) }}><Eyebrow color={G}>Why it works where banks fail</Eyebrow></div>
        <div style={{ marginTop: 40, display: 'flex', flexDirection: 'column', gap: 24 }}>
          {feats.map((f, i) => {
            const at = 14 + i * 14;
            const o = fadeIn(frame, at, 12);
            const y = interpolate(spring({ frame: frame - at, fps, config: { damping: 18 } }), [0, 1], [50, 0]);
            const Icon = f.icon;
            return (
              <GlassCard key={i} style={{ padding: '32px 34px', display: 'flex', alignItems: 'center', gap: 26, opacity: o, transform: `translateY(${y}px)` }}>
                <div style={{ width: 92, height: 92, borderRadius: 24, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: `${G}1f`, border: `1px solid ${G}66` }}>
                  <Icon size={48} color={G} strokeWidth={2} />
                </div>
                <div>
                  <div style={{ fontFamily: FONT.display, fontSize: 46, color: COLORS.white, lineHeight: 1.05 }}>{f.title}</div>
                  <div style={{ fontFamily: FONT.sans, fontWeight: 300, fontSize: 30, color: COLORS.white60, marginTop: 4 }}>{f.sub}</div>
                </div>
              </GlassCard>
            );
          })}
        </div>
        <div style={{ fontFamily: FONT.mono, fontSize: 26, color: COLORS.white60, marginTop: 44, textAlign: 'center', letterSpacing: 1 }}>
          Lagos · Buenos Aires · Istanbul · Cairo
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

export const ShortG: React.FC = () => {
  const durations = [180, 195, 190, 175, 208];
  return (
    <AbsoluteFill style={{ backgroundColor: COLORS.black }}>
      <TransitionSeries>
        <TransitionSeries.Sequence durationInFrames={durations[0]}><Hook /></TransitionSeries.Sequence>
        <TransitionSeries.Transition presentation={fade()} timing={fadeT()} />
        <TransitionSeries.Sequence durationInFrames={durations[1]}><Chart /></TransitionSeries.Sequence>
        <TransitionSeries.Transition presentation={slide({ direction: 'from-right' })} timing={slideT()} />
        <TransitionSeries.Sequence durationInFrames={durations[2]}><Why /></TransitionSeries.Sequence>
        <TransitionSeries.Transition presentation={fade()} timing={fadeT()} />
        <TransitionSeries.Sequence durationInFrames={durations[3]}><LogoReveal headline={'Save in money\nthat holds.'} sub="USDC circles on Base" accent={G} /></TransitionSeries.Sequence>
        <TransitionSeries.Transition presentation={fade()} timing={fadeT()} />
        <TransitionSeries.Sequence durationInFrames={durations[4]}><EndCard tagline={'Beat inflation,\ntogether.'} accent={G} /></TransitionSeries.Sequence>
      </TransitionSeries>
      <ShortAudio music="music_g.wav" durations={durations} cues={[
        { s: 0, at: 14, src: 'impact.wav', v: 0.5 }, { s: 0, at: 52, src: 'impact.wav', v: 0.4 },
        { s: 1, at: 24, src: 'uplift.wav', v: 0.4 }, { s: 1, at: 72, src: 'bell.wav', v: 0.38 },
        { s: 2, at: 16, src: 'pop.wav', v: 0.38 }, { s: 2, at: 30, src: 'pop.wav', v: 0.38 }, { s: 2, at: 44, src: 'bell.wav', v: 0.4 },
        { s: 3, at: -6, src: 'riser.wav', v: 0.4 }, { s: 3, at: 6, src: 'impact.wav', v: 0.55 }, { s: 3, at: 24, src: 'bell.wav', v: 0.42 },
        { s: 4, at: 6, src: 'impact.wav', v: 0.5 }, { s: 4, at: 20, src: 'bell.wav', v: 0.42 }, { s: 4, at: 58, src: 'shimmer.wav', v: 0.5 },
      ]} />
    </AbsoluteFill>
  );
};
