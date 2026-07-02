import React from 'react';
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { TransitionSeries, linearTiming, springTiming } from '@remotion/transitions';
import { fade } from '@remotion/transitions/fade';
import { slide } from '@remotion/transitions/slide';

import { loadFonts } from '../fonts';
import { COLORS, FONT, SAFE } from '../theme';
import { Background, Eyebrow, fadeIn } from '../ui';
import { Donut } from '../infographics';
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
      <Background intensity={0.9} cy={44} glow={'rgba(25,251,155,0.20)'} />
      <TopMark />
      <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center', textAlign: 'center', padding: `0 ${SAFE.side}px` }}>
        <div style={{ opacity: fadeIn(frame, 6, 12) }}><Eyebrow color={G}>What the data shows</Eyebrow></div>
        <div style={{ fontFamily: FONT.display, fontSize: 94, color: COLORS.white, marginTop: 28, opacity: fadeIn(frame, 14, 12), lineHeight: 1.04, whiteSpace: 'pre-line' }}>
          Most people using{'\n'}stablecoins aren’t{'\n'}gambling.
        </div>
        <div style={{ fontFamily: FONT.display, fontSize: 64, color: G, marginTop: 34, opacity: fadeIn(frame, 42, 14), lineHeight: 1.05, whiteSpace: 'pre-line' }}>
          They just want{'\n'}a dollar.
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

const Data: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const cards = [
    { v: '69%', l: 'converted local\ncurrency to stablecoins' },
    { v: '72%', l: 'expect to use even\nmore next year' },
  ];
  return (
    <AbsoluteFill>
      <Background intensity={0.8} cy={38} glow={'rgba(25,251,155,0.16)'} />
      <AbsoluteFill style={{ padding: `${SAFE.top}px ${SAFE.side}px ${SAFE.bottom}px`, justifyContent: 'center', alignItems: 'center' }}>
        <div style={{ opacity: fadeIn(frame, 4, 12) }}><Eyebrow color={G}>Why they hold</Eyebrow></div>
        <div style={{ marginTop: 28, opacity: fadeIn(frame, 12, 12) }}>
          <Donut pct={47} delay={20} color={G} centerTop="47%" centerSub="save in USD" size={360} stroke={34} />
        </div>
        <div style={{ display: 'flex', gap: 22, marginTop: 46, width: '100%' }}>
          {cards.map((c, i) => {
            const at = 46 + i * 12;
            const sp = spring({ frame: frame - at, fps, config: { damping: 200 } });
            return (
              <div key={i} style={{ flex: 1, opacity: fadeIn(frame, at, 12), transform: `scale(${interpolate(sp, [0, 1], [0.9, 1])})`, background: 'rgba(255,255,255,0.04)', border: `1px solid ${G}44`, borderRadius: 24, padding: '26px 22px', textAlign: 'center' }}>
                <div style={{ fontFamily: FONT.display, fontSize: 66, color: COLORS.white, lineHeight: 1 }}>{c.v}</div>
                <div style={{ fontFamily: FONT.sans, fontWeight: 300, fontSize: 26, color: COLORS.white60, marginTop: 12, lineHeight: 1.2, whiteSpace: 'pre-line' }}>{c.l}</div>
              </div>
            );
          })}
        </div>
        <div style={{ fontFamily: FONT.mono, fontSize: 22, color: COLORS.white40, marginTop: 40, opacity: fadeIn(frame, 72, 14), textAlign: 'center', maxWidth: 840, letterSpacing: 0.5 }}>
          Survey of 2,541 emerging-market users · Castle Island / Visa, Sep 2024
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

const Payoff: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill>
      <Background intensity={0.95} cy={42} glow={'rgba(25,251,155,0.2)'} />
      <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center', textAlign: 'center', padding: `0 ${SAFE.side}px` }}>
        <div style={{ fontFamily: FONT.display, fontSize: 100, color: COLORS.white, opacity: fadeIn(frame, 6, 12), lineHeight: 1.02, whiteSpace: 'pre-line' }}>
          ChainPot is for{'\n'}<span style={{ color: G }}>the savers.</span>
        </div>
        <div style={{ fontFamily: FONT.sans, fontWeight: 300, fontSize: 42, color: COLORS.white80, marginTop: 34, opacity: fadeIn(frame, 30, 14), maxWidth: 880, lineHeight: 1.3, whiteSpace: 'pre-line' }}>
          Save in dollars, together — earning yield while{'\n'}your turn comes around. A circle, not a casino.
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

export const ShortCC: React.FC = () => {
  const durations = [180, 195, 195, 170, 208];
  return (
    <AbsoluteFill style={{ backgroundColor: COLORS.black }}>
      <TransitionSeries>
        <TransitionSeries.Sequence durationInFrames={durations[0]}><Hook /></TransitionSeries.Sequence>
        <TransitionSeries.Transition presentation={fade()} timing={fadeT()} />
        <TransitionSeries.Sequence durationInFrames={durations[1]}><Data /></TransitionSeries.Sequence>
        <TransitionSeries.Transition presentation={slide({ direction: 'from-right' })} timing={slideT()} />
        <TransitionSeries.Sequence durationInFrames={durations[2]}><Payoff /></TransitionSeries.Sequence>
        <TransitionSeries.Transition presentation={fade()} timing={fadeT()} />
        <TransitionSeries.Sequence durationInFrames={durations[3]}><LogoReveal headline={'Stablecoins,\nfor saving.'} sub="a circle, not a casino" accent={G} /></TransitionSeries.Sequence>
        <TransitionSeries.Transition presentation={fade()} timing={fadeT()} />
        <TransitionSeries.Sequence durationInFrames={durations[4]}><EndCard tagline={'Save in dollars,\ntogether.'} accent={G} /></TransitionSeries.Sequence>
      </TransitionSeries>
      <ShortAudio music="music_cc.wav" durations={durations} cues={[
        { s: 0, at: 14, src: 'impact.wav', v: 0.5 }, { s: 0, at: 42, src: 'bell.wav', v: 0.4 },
        { s: 1, at: 20, src: 'uplift.wav', v: 0.42 }, { s: 1, at: 46, src: 'pop.wav', v: 0.34 }, { s: 1, at: 58, src: 'pop.wav', v: 0.34 },
        { s: 2, at: 6, src: 'impact.wav', v: 0.45 }, { s: 2, at: 30, src: 'bell.wav', v: 0.4 },
        { s: 3, at: -6, src: 'riser.wav', v: 0.4 }, { s: 3, at: 6, src: 'impact.wav', v: 0.5 }, { s: 3, at: 24, src: 'bell.wav', v: 0.42 },
        { s: 4, at: 6, src: 'impact.wav', v: 0.5 }, { s: 4, at: 20, src: 'bell.wav', v: 0.42 }, { s: 4, at: 58, src: 'shimmer.wav', v: 0.5 },
      ]} />
    </AbsoluteFill>
  );
};
