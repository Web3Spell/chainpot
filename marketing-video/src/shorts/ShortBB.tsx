import React from 'react';
import { AbsoluteFill, useCurrentFrame } from 'remotion';
import { TransitionSeries, linearTiming, springTiming } from '@remotion/transitions';
import { fade } from '@remotion/transitions/fade';
import { slide } from '@remotion/transitions/slide';

import { loadFonts } from '../fonts';
import { COLORS, FONT, SAFE } from '../theme';
import { Background, Eyebrow, fadeIn } from '../ui';
import { Counter, BarChart } from '../infographics';
import { TopMark, LogoReveal, EndCard } from '../shortsKit';
import { ShortAudio } from '../audioKit';

loadFonts();
const A = COLORS.base; // Base blue #0052FF
const T = 12;
const fadeT = () => linearTiming({ durationInFrames: T });
const slideT = () => springTiming({ config: { damping: 200 }, durationInFrames: T });

const Hook: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill>
      <Background intensity={0.9} cy={44} glow={'rgba(0,82,255,0.30)'} />
      <TopMark />
      <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center', textAlign: 'center', padding: `0 ${SAFE.side}px` }}>
        <div style={{ opacity: fadeIn(frame, 6, 12) }}><Eyebrow color={A}>The new money plumbing</Eyebrow></div>
        <div style={{ fontFamily: FONT.display, fontSize: 280, color: COLORS.white, marginTop: 16, opacity: fadeIn(frame, 14, 10), lineHeight: 1 }}>
          <span style={{ color: A }}>$</span><Counter to={46} delay={16} dur={42} /><span style={{ color: A }}>T</span>
        </div>
        <div style={{ fontFamily: FONT.display, fontSize: 70, color: COLORS.white, marginTop: 18, opacity: fadeIn(frame, 46, 14), lineHeight: 1.06, whiteSpace: 'pre-line' }}>
          moved in digital dollars{'\n'}last year.
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

const Data: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill>
      <Background intensity={0.8} cy={32} glow={'rgba(0,82,255,0.24)'} />
      <AbsoluteFill style={{ padding: `${SAFE.top}px ${SAFE.side}px ${SAFE.bottom}px`, justifyContent: 'center' }}>
        <div style={{ opacity: fadeIn(frame, 4, 12) }}><Eyebrow color={A}>Yearly settlement volume</Eyebrow></div>
        <div style={{ fontFamily: FONT.display, fontSize: 64, color: COLORS.white, marginTop: 18, marginBottom: 52, opacity: fadeIn(frame, 12, 12) }}>
          Stablecoins beat <span style={{ color: A }}>Visa</span>.
        </div>
        <BarChart
          delay={24}
          labelW={300}
          barHeight={88}
          gap={30}
          data={[
            { label: 'Stablecoins', value: 46, valueLabel: '~$46T', color: A },
            { label: 'Visa', value: 15, valueLabel: '~$15T', color: 'rgba(255,255,255,0.40)' },
          ]}
          max={46}
        />
        <div style={{ fontFamily: FONT.mono, fontSize: 24, color: COLORS.white60, marginTop: 46, opacity: fadeIn(frame, 64, 14), letterSpacing: 1, lineHeight: 1.4 }}>
          ~3× Visa · issuers now hold &gt;$150B US Treasuries — the 17th-largest holder
          <br />a16z, State of Crypto 2025
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

const Payoff: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill>
      <Background intensity={0.95} cy={42} glow={'rgba(0,82,255,0.3)'} />
      <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center', textAlign: 'center', padding: `0 ${SAFE.side}px` }}>
        <div style={{ fontFamily: FONT.display, fontSize: 104, color: COLORS.white, opacity: fadeIn(frame, 6, 12), lineHeight: 1.04, whiteSpace: 'pre-line' }}>
          ChainPot runs on{'\n'}<span style={{ color: A }}>those rails.</span>
        </div>
        <div style={{ fontFamily: FONT.sans, fontWeight: 300, fontSize: 38, color: COLORS.white80, marginTop: 40, opacity: fadeIn(frame, 38, 14), maxWidth: 880, lineHeight: 1.3 }}>
          USDC on Base — settled in seconds, for a fraction of a cent, earning Compound yield while it waits its turn. Your savings circle, on the rails moving trillions.
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

export const ShortBB: React.FC = () => {
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
        <TransitionSeries.Sequence durationInFrames={durations[3]}><LogoReveal headline={'Built on the\nnew dollar rails.'} sub="USDC · Base · Compound" accent={A} /></TransitionSeries.Sequence>
        <TransitionSeries.Transition presentation={fade()} timing={fadeT()} />
        <TransitionSeries.Sequence durationInFrames={durations[4]}><EndCard tagline={'Save on the\nrails of the future.'} accent={A} /></TransitionSeries.Sequence>
      </TransitionSeries>
      <ShortAudio music="music_bb.wav" durations={durations} cues={[
        { s: 0, at: 16, src: 'impact.wav', v: 0.55 }, { s: 0, at: 46, src: 'bell.wav', v: 0.4 },
        { s: 1, at: 22, src: 'pop.wav', v: 0.36 }, { s: 1, at: 32, src: 'pop.wav', v: 0.36 }, { s: 1, at: 64, src: 'uplift.wav', v: 0.42 },
        { s: 2, at: 6, src: 'impact.wav', v: 0.5 }, { s: 2, at: 38, src: 'bell.wav', v: 0.4 },
        { s: 3, at: -6, src: 'riser.wav', v: 0.4 }, { s: 3, at: 6, src: 'impact.wav', v: 0.55 }, { s: 3, at: 24, src: 'bell.wav', v: 0.42 },
        { s: 4, at: 6, src: 'impact.wav', v: 0.5 }, { s: 4, at: 20, src: 'bell.wav', v: 0.42 }, { s: 4, at: 58, src: 'shimmer.wav', v: 0.5 },
      ]} />
    </AbsoluteFill>
  );
};
