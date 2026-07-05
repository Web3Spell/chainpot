import React from 'react';
import { AbsoluteFill } from 'remotion';
import { TransitionSeries, springTiming, linearTiming } from '@remotion/transitions';
import { fade } from '@remotion/transitions/fade';
import { slide } from '@remotion/transitions/slide';

import { loadFonts } from './fonts';
import { AudioTrack } from './AudioTrack';
import { COLORS } from './theme';
import { Hook } from './scenes/Hook';
import { Problem } from './scenes/Problem';
import { Solution } from './scenes/Solution';
import { Auction } from './scenes/Auction';
import { Kitty } from './scenes/Kitty';
import { Features } from './scenes/Features';
import { CTA } from './scenes/CTA';

loadFonts();

const T = 12; // transition length (frames)
const fadeT = () => linearTiming({ durationInFrames: T });
const slideT = () => springTiming({ config: { damping: 200 }, durationInFrames: T });

export const ChainPotReel: React.FC = () => {
  return (
    <AbsoluteFill style={{ backgroundColor: COLORS.black }}>
      <TransitionSeries>
        <TransitionSeries.Sequence durationInFrames={130}>
          <Hook />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition presentation={fade()} timing={fadeT()} />

        <TransitionSeries.Sequence durationInFrames={120}>
          <Problem />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition presentation={fade()} timing={fadeT()} />

        <TransitionSeries.Sequence durationInFrames={120}>
          <Solution />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition presentation={slide({ direction: 'from-bottom' })} timing={slideT()} />

        <TransitionSeries.Sequence durationInFrames={175}>
          <Auction />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition presentation={slide({ direction: 'from-right' })} timing={slideT()} />

        <TransitionSeries.Sequence durationInFrames={150}>
          <Kitty />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition presentation={fade()} timing={fadeT()} />

        <TransitionSeries.Sequence durationInFrames={150}>
          <Features />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition presentation={fade()} timing={fadeT()} />

        <TransitionSeries.Sequence durationInFrames={127}>
          <CTA />
        </TransitionSeries.Sequence>
      </TransitionSeries>

      <AudioTrack />
    </AbsoluteFill>
  );
};
