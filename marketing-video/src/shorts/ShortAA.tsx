import React from 'react';
import { AbsoluteFill, useCurrentFrame } from 'remotion';
import { TransitionSeries, linearTiming, springTiming } from '@remotion/transitions';
import { fade } from '@remotion/transitions/fade';
import { slide } from '@remotion/transitions/slide';

import { loadFonts } from '../fonts';
import { COLORS, FONT, SAFE } from '../theme';
import { Background, Eyebrow, fadeIn } from '../ui';
import { StepFlow } from '../infographics';
import { TopMark, LogoReveal, EndCard } from '../shortsKit';
import { ShortAudio } from '../audioKit';

loadFonts();
const A = COLORS.violetBright; // violet-light #A78BFA
const T = 12;
const fadeT = () => linearTiming({ durationInFrames: T });
const slideT = () => springTiming({ config: { damping: 200 }, durationInFrames: T });

const Hook: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill>
      <Background intensity={0.9} cy={44} glow={'rgba(167,139,250,0.30)'} />
      <TopMark />
      <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center', textAlign: 'center', padding: `0 ${SAFE.side}px` }}>
        <div style={{ opacity: fadeIn(frame, 6, 12) }}><Eyebrow color={A}>1980s · Los Angeles</Eyebrow></div>
        <div style={{ fontFamily: FONT.display, fontSize: 100, color: COLORS.white, marginTop: 28, opacity: fadeIn(frame, 14, 12), lineHeight: 1.04, whiteSpace: 'pre-line' }}>
          Koreatown wasn’t{'\n'}built by banks.
        </div>
        <div style={{ fontFamily: FONT.display, fontSize: 72, color: A, marginTop: 34, opacity: fadeIn(frame, 40, 14), lineHeight: 1.06, whiteSpace: 'pre-line' }}>
          It was built by a{'\n'}savings circle.
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

const Context: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill>
      <Background intensity={0.8} cy={34} glow={'rgba(167,139,250,0.26)'} />
      <AbsoluteFill style={{ padding: `${SAFE.top}px ${SAFE.side}px ${SAFE.bottom}px`, justifyContent: 'center' }}>
        <div style={{ opacity: fadeIn(frame, 4, 12) }}><Eyebrow color={A}>Korean “kye”</Eyebrow></div>
        <div style={{ fontFamily: FONT.sans, fontWeight: 300, fontSize: 40, color: COLORS.white80, marginTop: 20, marginBottom: 46, lineHeight: 1.32, opacity: fadeIn(frame, 12, 14), maxWidth: 920 }}>
          Shut out of US bank credit, Korean immigrants pooled money in a <span style={{ color: A, fontWeight: 500 }}>kye</span> over dinners — funding the shops and restaurants that became Koreatown.
        </div>
        <StepFlow
          delay={26}
          activeColor={A}
          steps={[
            { n: '①', title: 'Everyone pays in', sub: 'a fixed amount, every month', color: A },
            { n: '②', title: 'One pot, one member', sub: 'takes the whole pot in turn', color: A },
            { n: '③', title: 'A business is born', sub: 'a storefront, a down payment, a start', color: A },
          ]}
        />
        <div style={{ fontFamily: FONT.mono, fontSize: 24, color: COLORS.white60, marginTop: 40, opacity: fadeIn(frame, 70, 14), letterSpacing: 1 }}>
          the kye traces back to 16th-c. villagers locked out of the ruling class’s loans
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

const Payoff: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill>
      <Background intensity={0.95} cy={42} glow={'rgba(167,139,250,0.3)'} />
      <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center', textAlign: 'center', padding: `0 ${SAFE.side}px` }}>
        <div style={{ fontFamily: FONT.display, fontSize: 84, color: COLORS.white, opacity: fadeIn(frame, 6, 12), lineHeight: 1.06, whiteSpace: 'pre-line' }}>
          The circle gave them{'\n'}what banks wouldn’t:{'\n'}<span style={{ color: A }}>a yes.</span>
        </div>
        <div style={{ fontFamily: FONT.sans, fontWeight: 300, fontSize: 38, color: COLORS.white80, marginTop: 40, opacity: fadeIn(frame, 38, 14), maxWidth: 880, lineHeight: 1.3 }}>
          ChainPot gives anyone that yes — no credit check, no gatekeeper. Complete a circle and your on-chain reputation grows, and travels with you.
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

export const ShortAA: React.FC = () => {
  const durations = [180, 195, 195, 170, 208];
  return (
    <AbsoluteFill style={{ backgroundColor: COLORS.black }}>
      <TransitionSeries>
        <TransitionSeries.Sequence durationInFrames={durations[0]}><Hook /></TransitionSeries.Sequence>
        <TransitionSeries.Transition presentation={fade()} timing={fadeT()} />
        <TransitionSeries.Sequence durationInFrames={durations[1]}><Context /></TransitionSeries.Sequence>
        <TransitionSeries.Transition presentation={slide({ direction: 'from-right' })} timing={slideT()} />
        <TransitionSeries.Sequence durationInFrames={durations[2]}><Payoff /></TransitionSeries.Sequence>
        <TransitionSeries.Transition presentation={fade()} timing={fadeT()} />
        <TransitionSeries.Sequence durationInFrames={durations[3]}><LogoReveal headline={'Credit your\ncommunity creates.'} sub="no bank required" accent={A} /></TransitionSeries.Sequence>
        <TransitionSeries.Transition presentation={fade()} timing={fadeT()} />
        <TransitionSeries.Sequence durationInFrames={durations[4]}><EndCard tagline={'Start your\ncircle.'} accent={A} /></TransitionSeries.Sequence>
      </TransitionSeries>
      <ShortAudio music="music_aa.wav" durations={durations} cues={[
        { s: 0, at: 14, src: 'impact.wav', v: 0.5 }, { s: 0, at: 40, src: 'bell.wav', v: 0.4 },
        { s: 1, at: 12, src: 'uplift.wav', v: 0.4 }, { s: 1, at: 26, src: 'pop.wav', v: 0.34 }, { s: 1, at: 40, src: 'pop.wav', v: 0.34 }, { s: 1, at: 54, src: 'pop.wav', v: 0.34 },
        { s: 2, at: 6, src: 'impact.wav', v: 0.46 }, { s: 2, at: 38, src: 'bell.wav', v: 0.4 },
        { s: 3, at: -6, src: 'riser.wav', v: 0.4 }, { s: 3, at: 6, src: 'impact.wav', v: 0.55 }, { s: 3, at: 24, src: 'bell.wav', v: 0.42 },
        { s: 4, at: 6, src: 'impact.wav', v: 0.5 }, { s: 4, at: 20, src: 'bell.wav', v: 0.42 }, { s: 4, at: 58, src: 'shimmer.wav', v: 0.5 },
      ]} />
    </AbsoluteFill>
  );
};
