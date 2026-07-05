import React from 'react';
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { TransitionSeries, linearTiming, springTiming } from '@remotion/transitions';
import { fade } from '@remotion/transitions/fade';
import { slide } from '@remotion/transitions/slide';
import { TrendingDown, Coins, Scissors } from 'lucide-react';

import { loadFonts } from '../fonts';
import { COLORS, FONT, SAFE } from '../theme';
import { Background, Eyebrow, GlassCard, fadeIn } from '../ui';
import { TopMark, LogoReveal, EndCard } from '../shortsKit';
import { ShortAudio } from '../audioKit';

loadFonts();
const V = COLORS.violet;
const T = 12;
const fadeT = () => linearTiming({ durationInFrames: T });
const slideT = () => springTiming({ config: { damping: 200 }, durationInFrames: T });

const Hook: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill>
      <Background intensity={0.9} cy={44} glow={'rgba(139,92,246,0.32)'} />
      <TopMark />
      <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center', textAlign: 'center', padding: `0 ${SAFE.side}px` }}>
        <div style={{ opacity: fadeIn(frame, 6, 12) }}><Eyebrow color={V}>The hard question</Eyebrow></div>
        <div style={{ fontFamily: FONT.display, fontSize: 92, color: COLORS.white, marginTop: 28, opacity: fadeIn(frame, 14, 12), lineHeight: 1.04, whiteSpace: 'pre-line' }}>
          What if someone{'\n'}just… <span style={{ color: V }}>doesn’t pay?</span>
        </div>
        <div style={{ fontFamily: FONT.display, fontSize: 56, color: COLORS.violetLight, opacity: fadeIn(frame, 46, 14), marginTop: 38 }}>
          It costs them. Not you.
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

const Today: React.FC = () => {
  const frame = useCurrentFrame();
  const dropO = fadeIn(frame, 34, 14);
  return (
    <AbsoluteFill>
      <Background intensity={0.85} cy={40} glow={'rgba(255,77,109,0.22)'} />
      <AbsoluteFill style={{ padding: `${SAFE.top}px ${SAFE.side}px ${SAFE.bottom}px`, justifyContent: 'center' }}>
        <div style={{ opacity: fadeIn(frame, 4, 12) }}><Eyebrow color={V}>In v3, today</Eyebrow></div>
        <div style={{ fontFamily: FONT.display, fontSize: 80, color: COLORS.white, marginTop: 18, marginBottom: 56, opacity: fadeIn(frame, 12, 12) }}>
          Defaults are <span style={{ color: V }}>public.</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 30 }}>
          <div style={{ opacity: fadeIn(frame, 18, 12), display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, padding: '28px 44px', borderRadius: 24, background: 'rgba(255,255,255,0.05)', border: `1px solid ${COLORS.glassBorder}` }}>
            <span style={{ fontFamily: FONT.mono, fontSize: 26, color: COLORS.white60, letterSpacing: 2 }}>REP</span>
            <span style={{ fontFamily: FONT.display, fontSize: 96, color: COLORS.white }}>92</span>
          </div>
          <span style={{ fontFamily: FONT.display, fontSize: 70, color: COLORS.white40, opacity: dropO }}>→</span>
          <div style={{ opacity: dropO, transform: `translateY(${interpolate(dropO, [0, 1], [-20, 0])}px)`, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, padding: '28px 44px', borderRadius: 24, background: 'rgba(255,77,109,0.12)', border: `1px solid ${COLORS.danger}` }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <TrendingDown size={30} color={COLORS.danger} />
              <span style={{ fontFamily: FONT.mono, fontSize: 26, color: COLORS.danger, letterSpacing: 2 }}>REP</span>
            </div>
            <span style={{ fontFamily: FONT.display, fontSize: 96, color: COLORS.danger }}>61</span>
          </div>
        </div>
        <div style={{ fontFamily: FONT.sans, fontWeight: 300, fontSize: 40, color: COLORS.white80, marginTop: 56, textAlign: 'center', opacity: fadeIn(frame, 54, 14), maxWidth: 880, alignSelf: 'center', lineHeight: 1.25 }}>
          <span style={{ fontFamily: FONT.mono, color: V }}>markAsDefaulter</span> cuts their score — visible in every future circle.
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

const ComingV4: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const cards = [
    { icon: Coins, title: 'Collateral on join', sub: 'Stake to enter a pot.' },
    { icon: Scissors, title: 'Slashing', sub: 'Ghost the circle, lose your stake.' },
  ];
  return (
    <AbsoluteFill>
      <Background intensity={0.85} cy={36} glow={'rgba(25,251,155,0.2)'} />
      <AbsoluteFill style={{ padding: `${SAFE.top}px ${SAFE.side}px ${SAFE.bottom}px`, justifyContent: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 18, opacity: fadeIn(frame, 4, 12) }}>
          <Eyebrow color={COLORS.green}>Coming in v4</Eyebrow>
          <span style={{ fontFamily: FONT.mono, fontSize: 22, color: COLORS.white40, padding: '6px 14px', borderRadius: 999, border: `1px solid ${COLORS.glassBorder}`, letterSpacing: 1 }}>v4 · roadmap</span>
        </div>
        <div style={{ fontFamily: FONT.display, fontSize: 80, color: COLORS.white, marginTop: 18, marginBottom: 44, opacity: fadeIn(frame, 12, 12) }}>
          Skin in the <span style={{ color: COLORS.green }}>game.</span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {cards.map((c, i) => {
            const at = 22 + i * 16;
            const o = fadeIn(frame, at, 12);
            const y = interpolate(spring({ frame: frame - at, fps, config: { damping: 18 } }), [0, 1], [50, 0]);
            const Icon = c.icon;
            return (
              <GlassCard key={i} style={{ padding: '34px 36px', display: 'flex', alignItems: 'center', gap: 28, opacity: o, transform: `translateY(${y}px)` }}>
                <div style={{ width: 96, height: 96, borderRadius: 24, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: `${COLORS.green}1f`, border: `1px solid ${COLORS.green}66` }}>
                  <Icon size={50} color={COLORS.green} strokeWidth={2} />
                </div>
                <div>
                  <div style={{ fontFamily: FONT.display, fontSize: 50, color: COLORS.white }}>{c.title}</div>
                  <div style={{ fontFamily: FONT.sans, fontWeight: 300, fontSize: 32, color: COLORS.white60, marginTop: 4 }}>{c.sub}</div>
                </div>
              </GlassCard>
            );
          })}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

const Why: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill>
      <Background intensity={0.9} cy={42} glow={'rgba(139,92,246,0.3)'} />
      <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center', textAlign: 'center', padding: `0 ${SAFE.side}px` }}>
        <div style={{ fontFamily: FONT.display, fontSize: 84, color: COLORS.white, opacity: fadeIn(frame, 6, 12), lineHeight: 1.05, whiteSpace: 'pre-line' }}>
          Social pressure +{'\n'}<span style={{ color: V }}>on-chain consequences.</span>
        </div>
        <div style={{ fontFamily: FONT.sans, fontWeight: 300, fontSize: 50, color: COLORS.white60, marginTop: 36, opacity: fadeIn(frame, 30, 14) }}>
          = circles that actually finish.
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

export const ShortS: React.FC = () => {
  const durations = [150, 170, 170, 150, 150, 170];
  return (
    <AbsoluteFill style={{ backgroundColor: COLORS.black }}>
      <TransitionSeries>
        <TransitionSeries.Sequence durationInFrames={durations[0]}><Hook /></TransitionSeries.Sequence>
        <TransitionSeries.Transition presentation={fade()} timing={fadeT()} />
        <TransitionSeries.Sequence durationInFrames={durations[1]}><Today /></TransitionSeries.Sequence>
        <TransitionSeries.Transition presentation={slide({ direction: 'from-right' })} timing={slideT()} />
        <TransitionSeries.Sequence durationInFrames={durations[2]}><ComingV4 /></TransitionSeries.Sequence>
        <TransitionSeries.Transition presentation={fade()} timing={fadeT()} />
        <TransitionSeries.Sequence durationInFrames={durations[3]}><Why /></TransitionSeries.Sequence>
        <TransitionSeries.Transition presentation={fade()} timing={fadeT()} />
        <TransitionSeries.Sequence durationInFrames={durations[4]}><LogoReveal headline={'Accountability,\nencoded.'} sub="v3 reputation · v4 collateral" accent={V} /></TransitionSeries.Sequence>
        <TransitionSeries.Transition presentation={fade()} timing={fadeT()} />
        <TransitionSeries.Sequence durationInFrames={durations[5]}><EndCard tagline={'Show up —\nor it follows you.'} accent={V} /></TransitionSeries.Sequence>
      </TransitionSeries>
      <ShortAudio music="music_s.wav" durations={durations} cues={[
        { s: 0, at: 14, src: 'impact.wav', v: 0.5 }, { s: 0, at: 46, src: 'bell.wav', v: 0.36 },
        { s: 1, at: 18, src: 'pop.wav', v: 0.4 }, { s: 1, at: 34, src: 'impact.wav', v: 0.42 }, { s: 1, at: 54, src: 'bell.wav', v: 0.36 },
        { s: 2, at: 22, src: 'pop.wav', v: 0.38 }, { s: 2, at: 38, src: 'pop.wav', v: 0.38 }, { s: 2, at: 50, src: 'bell.wav', v: 0.4 },
        { s: 3, at: 8, src: 'uplift.wav', v: 0.4 }, { s: 3, at: 30, src: 'bell.wav', v: 0.38 },
        { s: 4, at: -6, src: 'riser.wav', v: 0.4 }, { s: 4, at: 6, src: 'impact.wav', v: 0.55 }, { s: 4, at: 24, src: 'bell.wav', v: 0.42 },
        { s: 5, at: 6, src: 'impact.wav', v: 0.5 }, { s: 5, at: 20, src: 'bell.wav', v: 0.42 }, { s: 5, at: 58, src: 'shimmer.wav', v: 0.5 },
      ]} />
    </AbsoluteFill>
  );
};
