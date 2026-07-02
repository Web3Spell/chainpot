import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame } from 'remotion';
import { TransitionSeries, linearTiming, springTiming } from '@remotion/transitions';
import { fade } from '@remotion/transitions/fade';
import { slide } from '@remotion/transitions/slide';

import { loadFonts } from '../fonts';
import { COLORS, FONT, SAFE } from '../theme';
import { Background, Eyebrow, fadeIn } from '../ui';
import { Counter, NodeMap, Donut, GeoNode } from '../infographics';
import { TopMark, LogoReveal, EndCard } from '../shortsKit';
import { ShortAudio } from '../audioKit';

loadFonts();
const T = 12;
const fadeT = () => linearTiming({ durationInFrames: T });
const slideT = () => springTiming({ config: { damping: 200 }, durationInFrames: T });

/* 1 — HOOK: global unbanked stat */
const Hook: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill>
      <Background intensity={0.9} cy={42} glow={'rgba(0,82,255,0.4)'} />
      <TopMark />
      <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center', textAlign: 'center', padding: `0 ${SAFE.side}px` }}>
        <div style={{ opacity: fadeIn(frame, 6, 12) }}>
          <Eyebrow color={COLORS.base}>The world's oldest bank</Eyebrow>
        </div>
        <div style={{ fontFamily: FONT.display, fontSize: 230, color: COLORS.white, marginTop: 18, opacity: fadeIn(frame, 12, 10), textShadow: `0 0 80px rgba(0,82,255,0.5)` }}>
          <Counter to={1.4} decimals={1} delay={14} dur={40} suffix="B" />
        </div>
        <div style={{ fontFamily: FONT.sans, fontWeight: 300, fontSize: 56, color: COLORS.white, opacity: fadeIn(frame, 30, 12), marginTop: 4 }}>
          adults are still <span style={{ fontWeight: 600 }}>unbanked</span>
        </div>
        <div style={{ fontFamily: FONT.display, fontSize: 50, color: COLORS.violetLight, opacity: fadeIn(frame, 52, 14), marginTop: 40 }}>
          so they save together — in circles.
        </div>
        <div style={{ fontFamily: FONT.mono, fontSize: 24, color: COLORS.white40, opacity: fadeIn(frame, 64, 14), marginTop: 24, letterSpacing: 1 }}>
          World Bank · Global Findex 2021
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

/* 2 — MAP: one idea, many names */
const NODES: GeoNode[] = [
  { x: 0.14, y: 0.40, label: 'Mexico', sub: 'Tanda', color: COLORS.violetBright },
  { x: 0.25, y: 0.50, label: 'Caribbean', sub: 'Partner', color: COLORS.violetBright },
  { x: 0.46, y: 0.56, label: 'Nigeria', sub: 'Esusu', color: COLORS.base },
  { x: 0.56, y: 0.66, label: 'Kenya', sub: 'Chama', color: COLORS.base },
  { x: 0.67, y: 0.48, label: 'India', sub: 'Chit fund', color: COLORS.violetBright },
  { x: 0.78, y: 0.40, label: 'China', sub: 'Hui', color: COLORS.violetBright },
  { x: 0.87, y: 0.36, label: 'Korea', sub: 'Kye', color: COLORS.base },
  { x: 0.85, y: 0.56, label: 'Philippines', sub: 'Paluwagan', color: COLORS.base },
  { x: 0.80, y: 0.70, label: 'Indonesia', sub: 'Arisan', color: COLORS.violetBright },
];
const MapScene: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill>
      <Background intensity={0.7} cy={50} />
      <AbsoluteFill style={{ padding: `${SAFE.top}px ${SAFE.side}px ${SAFE.bottom}px` }}>
        <div style={{ opacity: fadeIn(frame, 4, 12) }}>
          <Eyebrow>Same idea · every continent</Eyebrow>
        </div>
        <div style={{ fontFamily: FONT.display, fontSize: 78, color: COLORS.white, marginTop: 18, opacity: fadeIn(frame, 12, 12), lineHeight: 1.0 }}>
          One idea.{'\n'}<span style={{ color: COLORS.violetBright }}>A hundred names.</span>
        </div>
        <div style={{ position: 'absolute', top: 470, left: '50%', transform: 'translateX(-50%)' }}>
          <NodeMap nodes={NODES} delay={20} width={900} height={620} />
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

/* 3 — STAT: how deep it runs */
const StatScene: React.FC = () => {
  const frame = useCurrentFrame();
  const chips = [
    { v: '$685B', l: 'sent home a year', s: 6 },
    { v: '$5.2T', l: 'credit gap banks leave', s: 6 },
  ];
  return (
    <AbsoluteFill>
      <Background intensity={0.85} cy={36} glow={'rgba(0,82,255,0.35)'} />
      <AbsoluteFill style={{ padding: `${SAFE.top}px ${SAFE.side}px ${SAFE.bottom}px`, alignItems: 'center' }}>
        <div style={{ opacity: fadeIn(frame, 4, 12), alignSelf: 'flex-start' }}>
          <Eyebrow color={COLORS.base}>This is not a fringe habit</Eyebrow>
        </div>
        <div style={{ marginTop: 48, opacity: fadeIn(frame, 10, 12) }}>
          <Donut pct={48} delay={16} size={360} color={COLORS.base} centerTop="48%" centerSub="of savers" />
        </div>
        <div style={{ fontFamily: FONT.sans, fontWeight: 300, fontSize: 46, color: COLORS.white, textAlign: 'center', marginTop: 28, opacity: fadeIn(frame, 30, 12), maxWidth: 820, lineHeight: 1.2 }}>
          In Sub-Saharan Africa, nearly <span style={{ fontWeight: 600 }}>1 in 2 savers</span> save through a community circle.
        </div>
        <div style={{ display: 'flex', gap: 22, marginTop: 44 }}>
          {chips.map((c, i) => (
            <div key={i} style={{ opacity: fadeIn(frame, 56 + i * 8, 12), textAlign: 'center', padding: '24px 36px', borderRadius: 24, background: 'rgba(255,255,255,0.05)', border: `1px solid ${COLORS.glassBorder}` }}>
              <div style={{ fontFamily: FONT.display, fontSize: 64, color: COLORS.violetBright }}>{c.v}</div>
              <div style={{ fontFamily: FONT.sans, fontWeight: 300, fontSize: 28, color: COLORS.white60, marginTop: 4 }}>{c.l}</div>
            </div>
          ))}
        </div>
        <div style={{ fontFamily: FONT.mono, fontSize: 22, color: COLORS.white40, marginTop: 'auto', letterSpacing: 1 }}>
          World Bank · IFC MSME Finance Gap
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

/* 4 — PROBLEM */
const Problem: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill>
      <Background glow={'rgba(255,77,109,0.35)'} intensity={0.85} cy={42} />
      <AbsoluteFill style={{ justifyContent: 'center', padding: `0 ${SAFE.side}px` }}>
        <div style={{ fontFamily: FONT.display, fontSize: 88, color: COLORS.white, opacity: fadeIn(frame, 6, 12), lineHeight: 1.02, whiteSpace: 'pre-line', transform: `translateY(${interpolate(fadeIn(frame, 6, 12), [0, 1], [30, 0])}px)` }}>
          But every circle{'\n'}runs on one fragile thing:{'\n'}<span style={{ color: COLORS.danger }}>trust.</span>
        </div>
        <div style={{ fontFamily: FONT.sans, fontWeight: 300, fontSize: 44, color: COLORS.white60, marginTop: 40, opacity: fadeIn(frame, 40, 14) }}>
          Organizers vanish. Books get cooked. Idle money earns nothing.
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

export const ShortA: React.FC = () => {
  const durations = [150, 175, 170, 150, 160, 155];
  return (
    <AbsoluteFill style={{ backgroundColor: COLORS.black }}>
      <TransitionSeries>
        <TransitionSeries.Sequence durationInFrames={durations[0]}><Hook /></TransitionSeries.Sequence>
        <TransitionSeries.Transition presentation={fade()} timing={fadeT()} />
        <TransitionSeries.Sequence durationInFrames={durations[1]}><MapScene /></TransitionSeries.Sequence>
        <TransitionSeries.Transition presentation={slide({ direction: 'from-right' })} timing={slideT()} />
        <TransitionSeries.Sequence durationInFrames={durations[2]}><StatScene /></TransitionSeries.Sequence>
        <TransitionSeries.Transition presentation={fade()} timing={fadeT()} />
        <TransitionSeries.Sequence durationInFrames={durations[3]}><Problem /></TransitionSeries.Sequence>
        <TransitionSeries.Transition presentation={fade()} timing={fadeT()} />
        <TransitionSeries.Sequence durationInFrames={durations[4]}><LogoReveal headline={'The circle, now on-chain.'} sub="trustless · yield-bearing · auditable" /></TransitionSeries.Sequence>
        <TransitionSeries.Transition presentation={fade()} timing={fadeT()} />
        <TransitionSeries.Sequence durationInFrames={durations[5]}><EndCard tagline={"The world's oldest savings habit,\nfinally unbreakable."} accent={COLORS.base} /></TransitionSeries.Sequence>
      </TransitionSeries>

      <ShortAudio
        music="music_a.wav"
        durations={durations}
        cues={[
          { s: 0, at: 14, src: 'impact.wav', v: 0.55 }, { s: 0, at: 40, src: 'bell.wav', v: 0.32 },
          { s: 1, at: 16, src: 'uplift.wav', v: 0.4 }, { s: 1, at: 28, src: 'pop.wav', v: 0.3 }, { s: 1, at: 40, src: 'pop.wav', v: 0.3 }, { s: 1, at: 52, src: 'pop.wav', v: 0.3 }, { s: 1, at: 64, src: 'pop.wav', v: 0.3 },
          { s: 2, at: 12, src: 'uplift.wav', v: 0.4 }, { s: 2, at: 56, src: 'pop.wav', v: 0.35 }, { s: 2, at: 64, src: 'pop.wav', v: 0.35 },
          { s: 3, at: 6, src: 'impact.wav', v: 0.34 }, { s: 3, at: 40, src: 'impact.wav', v: 0.28 },
          { s: 4, at: -6, src: 'riser.wav', v: 0.4 }, { s: 4, at: 6, src: 'impact.wav', v: 0.55 }, { s: 4, at: 24, src: 'bell.wav', v: 0.42 },
          { s: 5, at: 6, src: 'impact.wav', v: 0.5 }, { s: 5, at: 20, src: 'bell.wav', v: 0.42 }, { s: 5, at: 58, src: 'shimmer.wav', v: 0.5 },
        ]}
      />
    </AbsoluteFill>
  );
};
