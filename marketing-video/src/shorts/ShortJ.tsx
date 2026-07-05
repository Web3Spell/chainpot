import React from 'react';
import { AbsoluteFill, useCurrentFrame } from 'remotion';
import { TransitionSeries, linearTiming, springTiming } from '@remotion/transitions';
import { fade } from '@remotion/transitions/fade';
import { slide } from '@remotion/transitions/slide';

import { loadFonts } from '../fonts';
import { COLORS, FONT, SAFE } from '../theme';
import { Background, Eyebrow, fadeIn } from '../ui';
import { AreaChart } from '../infographics';
import { TopMark, LogoReveal, EndCard } from '../shortsKit';
import { ShortAudio } from '../audioKit';

loadFonts();
const T = 12;
const fadeT = () => linearTiming({ durationInFrames: T });
const slideT = () => springTiming({ config: { damping: 200 }, durationInFrames: T });

const Hook: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill>
      <Background intensity={0.9} cy={44} />
      <TopMark />
      <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center', textAlign: 'center', padding: `0 ${SAFE.side}px` }}>
        <div style={{ opacity: fadeIn(frame, 6, 12) }}><Eyebrow>No token · no rug</Eyebrow></div>
        <div style={{ fontFamily: FONT.display, fontSize: 104, color: COLORS.white, marginTop: 26, opacity: fadeIn(frame, 14, 12), lineHeight: 1.02 }}>
          We didn't<br />launch a <span style={{ color: COLORS.violetBright }}>token.</span>
        </div>
        <div style={{ fontFamily: FONT.sans, fontWeight: 300, fontSize: 48, color: COLORS.white60, opacity: fadeIn(frame, 46, 14), marginTop: 36 }}>
          That's the whole point.
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

const NoToken: React.FC = () => {
  const frame = useCurrentFrame();
  const nos = ['No token', 'No pre-sale', 'No emissions', 'No insider unlocks', 'No "community round"'];
  return (
    <AbsoluteFill>
      <Background intensity={0.85} cy={40} />
      <AbsoluteFill style={{ padding: `0 ${SAFE.side}px`, justifyContent: 'center', alignItems: 'center', textAlign: 'center' }}>
        <div style={{ fontFamily: FONT.display, fontSize: 80, color: COLORS.white, opacity: fadeIn(frame, 6, 12) }}>
          Nothing here to <span style={{ color: COLORS.danger }}>dump.</span>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 16, marginTop: 50, maxWidth: 880 }}>
          {nos.map((c, i) => (
            <div key={c} style={{ opacity: fadeIn(frame, 22 + i * 8, 10), fontFamily: FONT.mono, fontSize: 30, color: COLORS.white, padding: '16px 28px', borderRadius: 999, background: 'rgba(255,77,109,0.08)', border: '1px solid rgba(255,77,109,0.3)', letterSpacing: 0.5 }}>
              ✗ {c.replace('No ', '').replace('no ', '')}
            </div>
          ))}
        </div>
        <div style={{ fontFamily: FONT.sans, fontWeight: 300, fontSize: 42, color: COLORS.white60, marginTop: 52, opacity: fadeIn(frame, 70, 14) }}>
          The product <span style={{ color: COLORS.white, fontWeight: 600 }}>is</span> the point.
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

const Align: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill>
      <Background intensity={0.8} cy={36} />
      <AbsoluteFill style={{ padding: `${SAFE.top}px ${SAFE.side}px ${SAFE.bottom}px` }}>
        <div style={{ opacity: fadeIn(frame, 4, 12) }}><Eyebrow>Two very different charts</Eyebrow></div>
        <div style={{ fontFamily: FONT.display, fontSize: 74, color: COLORS.white, marginTop: 18, opacity: fadeIn(frame, 12, 12), lineHeight: 1.0, whiteSpace: 'pre-line' }}>
          One you watch in fear.{'\n'}<span style={{ color: COLORS.green }}>One just pays you.</span>
        </div>
        <div style={{ marginTop: 60, alignSelf: 'center' }}>
          <AreaChart
            delay={24}
            width={900}
            height={480}
            labels={['launch', '', '', '', 'now']}
            series={[
              { name: 'a memecoin', color: COLORS.danger, pts: [0.3, 0.65, 0.92, 0.45, 0.18] },
              { name: 'your ChainPot payout', color: COLORS.green, pts: [0.3, 0.4, 0.5, 0.62, 0.74] },
            ]}
          />
        </div>
        <div style={{ fontFamily: FONT.sans, fontWeight: 300, fontSize: 40, color: COLORS.white, marginTop: 22, textAlign: 'center', opacity: fadeIn(frame, 72, 14) }}>
          Your reward is the <span style={{ fontWeight: 600 }}>discount + yield</span> — paid in USDC.
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

const Honest: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill>
      <Background intensity={0.9} cy={42} />
      <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center', textAlign: 'center', padding: `0 ${SAFE.side}px` }}>
        <div style={{ fontFamily: FONT.display, fontSize: 88, color: COLORS.white, opacity: fadeIn(frame, 6, 12), lineHeight: 1.05 }}>
          Aligned by design,<br />not by <span style={{ color: COLORS.violetBright }}>airdrop.</span>
        </div>
        <div style={{ fontFamily: FONT.sans, fontWeight: 300, fontSize: 46, color: COLORS.white60, marginTop: 36, opacity: fadeIn(frame, 30, 14), maxWidth: 860, lineHeight: 1.25 }}>
          No farmers. No mercenary liquidity. Just members who show up for each other — cycle after cycle.
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

export const ShortJ: React.FC = () => {
  const durations = [150, 170, 170, 150, 150, 170];
  return (
    <AbsoluteFill style={{ backgroundColor: COLORS.black }}>
      <TransitionSeries>
        <TransitionSeries.Sequence durationInFrames={durations[0]}><Hook /></TransitionSeries.Sequence>
        <TransitionSeries.Transition presentation={fade()} timing={fadeT()} />
        <TransitionSeries.Sequence durationInFrames={durations[1]}><NoToken /></TransitionSeries.Sequence>
        <TransitionSeries.Transition presentation={slide({ direction: 'from-right' })} timing={slideT()} />
        <TransitionSeries.Sequence durationInFrames={durations[2]}><Align /></TransitionSeries.Sequence>
        <TransitionSeries.Transition presentation={fade()} timing={fadeT()} />
        <TransitionSeries.Sequence durationInFrames={durations[3]}><Honest /></TransitionSeries.Sequence>
        <TransitionSeries.Transition presentation={fade()} timing={fadeT()} />
        <TransitionSeries.Sequence durationInFrames={durations[4]}><LogoReveal headline={'A protocol,\nnot a casino.'} sub="no token · no rug · ever" /></TransitionSeries.Sequence>
        <TransitionSeries.Transition presentation={fade()} timing={fadeT()} />
        <TransitionSeries.Sequence durationInFrames={durations[5]}><EndCard tagline={'No token.\nJust your circle.'} /></TransitionSeries.Sequence>
      </TransitionSeries>
      <ShortAudio music="music_j.wav" durations={durations} cues={[
        { s: 0, at: 14, src: 'impact.wav', v: 0.55 }, { s: 0, at: 46, src: 'bell.wav', v: 0.36 },
        { s: 1, at: 22, src: 'pop.wav', v: 0.32 }, { s: 1, at: 30, src: 'pop.wav', v: 0.32 }, { s: 1, at: 38, src: 'pop.wav', v: 0.32 }, { s: 1, at: 46, src: 'pop.wav', v: 0.32 }, { s: 1, at: 54, src: 'pop.wav', v: 0.32 },
        { s: 2, at: 24, src: 'uplift.wav', v: 0.4 }, { s: 2, at: 72, src: 'bell.wav', v: 0.4 },
        { s: 3, at: 6, src: 'impact.wav', v: 0.45 }, { s: 3, at: 30, src: 'bell.wav', v: 0.38 },
        { s: 4, at: -6, src: 'riser.wav', v: 0.4 }, { s: 4, at: 6, src: 'impact.wav', v: 0.55 }, { s: 4, at: 24, src: 'bell.wav', v: 0.42 },
        { s: 5, at: 6, src: 'impact.wav', v: 0.5 }, { s: 5, at: 20, src: 'bell.wav', v: 0.42 }, { s: 5, at: 58, src: 'shimmer.wav', v: 0.5 },
      ]} />
    </AbsoluteFill>
  );
};
