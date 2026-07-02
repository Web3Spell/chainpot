import React from 'react';
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { TransitionSeries, linearTiming, springTiming } from '@remotion/transitions';
import { fade } from '@remotion/transitions/fade';
import { slide } from '@remotion/transitions/slide';
import { HandCoins, PiggyBank } from 'lucide-react';

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
      <Background intensity={0.9} cy={44} glow={'rgba(25,251,155,0.3)'} />
      <TopMark />
      <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center', textAlign: 'center', padding: `0 ${SAFE.side}px` }}>
        <div style={{ opacity: fadeIn(frame, 6, 12) }}><Eyebrow color={G}>Your money shouldn't sleep</Eyebrow></div>
        <div style={{ fontFamily: FONT.display, fontSize: 280, color: COLORS.white, marginTop: 10, opacity: fadeIn(frame, 12, 10), lineHeight: 0.9 }}>0%</div>
        <div style={{ fontFamily: FONT.sans, fontWeight: 300, fontSize: 52, color: COLORS.white, opacity: fadeIn(frame, 32, 12), marginTop: 8 }}>
          what most savings circles pay you<br />while you <span style={{ fontWeight: 600 }}>wait your turn.</span>
        </div>
        <div style={{ fontFamily: FONT.display, fontSize: 52, color: G, opacity: fadeIn(frame, 56, 14), marginTop: 40 }}>
          ChainPot doesn't.
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

const Chart: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill>
      <Background intensity={0.8} cy={36} glow={'rgba(25,251,155,0.25)'} />
      <AbsoluteFill style={{ padding: `${SAFE.top}px ${SAFE.side}px ${SAFE.bottom}px` }}>
        <div style={{ opacity: fadeIn(frame, 4, 12) }}><Eyebrow color={G}>Idle funds, working</Eyebrow></div>
        <div style={{ fontFamily: FONT.display, fontSize: 76, color: COLORS.white, marginTop: 18, opacity: fadeIn(frame, 12, 12), lineHeight: 1.0, whiteSpace: 'pre-line' }}>
          Every deposit supplies{'\n'}<span style={{ color: G }}>Compound III.</span>
        </div>
        <div style={{ marginTop: 56, alignSelf: 'center' }}>
          <AreaChart
            delay={24}
            width={900}
            height={480}
            labels={['cycle 1', '', '', '', '', 'cycle 6']}
            series={[
              { name: 'ChainPot (earning)', color: G, pts: [0.28, 0.4, 0.52, 0.66, 0.8, 0.95] },
              { name: 'cash circle', color: COLORS.white40, pts: [0.28, 0.28, 0.28, 0.28, 0.28, 0.28] },
            ]}
          />
        </div>
        <div style={{ fontFamily: FONT.sans, fontWeight: 300, fontSize: 40, color: COLORS.white, marginTop: 24, textAlign: 'center', opacity: fadeIn(frame, 70, 14) }}>
          The pot earns yield the whole cycle — split to whoever waits.
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

const TwoWays: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const cards = [
    { icon: HandCoins, color: COLORS.violetBright, title: 'Need cash now?', sub: 'Bid and take the pot early — at a small discount.' },
    { icon: PiggyBank, color: G, title: 'Happy to wait?', sub: 'Never bid — collect everyone’s discount + all the yield.' },
  ];
  return (
    <AbsoluteFill>
      <Background intensity={0.85} cy={36} />
      <AbsoluteFill style={{ padding: `${SAFE.top}px ${SAFE.side}px ${SAFE.bottom}px`, justifyContent: 'center' }}>
        <div style={{ opacity: fadeIn(frame, 4, 12) }}><Eyebrow color={G}>Two ways to win</Eyebrow></div>
        <div style={{ fontFamily: FONT.display, fontSize: 74, color: COLORS.white, marginTop: 18, marginBottom: 44, opacity: fadeIn(frame, 12, 12) }}>
          Borrower <span style={{ color: COLORS.white40 }}>or</span> <span style={{ color: G }}>saver.</span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {cards.map((c, i) => {
            const at = 22 + i * 16;
            const o = fadeIn(frame, at, 12);
            const y = interpolate(spring({ frame: frame - at, fps, config: { damping: 18 } }), [0, 1], [50, 0]);
            const Icon = c.icon;
            return (
              <GlassCard key={i} glow accent={c.color} style={{ padding: '34px 36px', display: 'flex', alignItems: 'center', gap: 28, opacity: o, transform: `translateY(${y}px)` }}>
                <div style={{ width: 96, height: 96, borderRadius: 24, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: `${c.color}1f`, border: `1px solid ${c.color}66` }}>
                  <Icon size={50} color={c.color} strokeWidth={2} />
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

const Defi: React.FC = () => {
  const frame = useCurrentFrame();
  const chips = ['ERC-4626 share accounting', 'Interest never leaks across cycles', 'Direct Compound III integration', 'Withdraw when your cycle ends'];
  return (
    <AbsoluteFill>
      <Background intensity={0.85} cy={40} glow={'rgba(25,251,155,0.28)'} />
      <AbsoluteFill style={{ padding: `0 ${SAFE.side}px`, justifyContent: 'center', alignItems: 'center', textAlign: 'center' }}>
        <div style={{ fontFamily: FONT.display, fontSize: 76, color: COLORS.white, opacity: fadeIn(frame, 6, 12) }}>
          Accounting a <span style={{ color: G }}>DeFi native</span> can verify.
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 16, marginTop: 50, maxWidth: 900 }}>
          {chips.map((c, i) => (
            <div key={c} style={{ opacity: fadeIn(frame, 24 + i * 8, 10), fontFamily: FONT.mono, fontSize: 28, color: COLORS.white, padding: '16px 26px', borderRadius: 999, background: 'rgba(25,251,155,0.09)', border: '1px solid rgba(25,251,155,0.32)', letterSpacing: 0.5 }}>
              ✓ {c}
            </div>
          ))}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

export const ShortF: React.FC = () => {
  const durations = [150, 175, 165, 150, 155, 165];
  return (
    <AbsoluteFill style={{ backgroundColor: COLORS.black }}>
      <TransitionSeries>
        <TransitionSeries.Sequence durationInFrames={durations[0]}><Hook /></TransitionSeries.Sequence>
        <TransitionSeries.Transition presentation={fade()} timing={fadeT()} />
        <TransitionSeries.Sequence durationInFrames={durations[1]}><Chart /></TransitionSeries.Sequence>
        <TransitionSeries.Transition presentation={slide({ direction: 'from-right' })} timing={slideT()} />
        <TransitionSeries.Sequence durationInFrames={durations[2]}><TwoWays /></TransitionSeries.Sequence>
        <TransitionSeries.Transition presentation={fade()} timing={fadeT()} />
        <TransitionSeries.Sequence durationInFrames={durations[3]}><Defi /></TransitionSeries.Sequence>
        <TransitionSeries.Transition presentation={fade()} timing={fadeT()} />
        <TransitionSeries.Sequence durationInFrames={durations[4]}><LogoReveal headline={'A savings circle\nthat earns its keep.'} sub="yield by Compound III" accent={G} /></TransitionSeries.Sequence>
        <TransitionSeries.Transition presentation={fade()} timing={fadeT()} />
        <TransitionSeries.Sequence durationInFrames={durations[5]}><EndCard tagline={'Save in a circle.\nEarn like DeFi.'} accent={G} /></TransitionSeries.Sequence>
      </TransitionSeries>
      <ShortAudio music="music_f.wav" durations={durations} cues={[
        { s: 0, at: 14, src: 'impact.wav', v: 0.5 }, { s: 0, at: 56, src: 'bell.wav', v: 0.38 },
        { s: 1, at: 24, src: 'uplift.wav', v: 0.42 }, { s: 1, at: 70, src: 'shimmer.wav', v: 0.42 },
        { s: 2, at: 22, src: 'pop.wav', v: 0.4 }, { s: 2, at: 38, src: 'pop.wav', v: 0.4 }, { s: 2, at: 52, src: 'bell.wav', v: 0.4 },
        { s: 3, at: 6, src: 'impact.wav', v: 0.4 }, { s: 3, at: 24, src: 'pop.wav', v: 0.3 }, { s: 3, at: 40, src: 'pop.wav', v: 0.3 }, { s: 3, at: 56, src: 'pop.wav', v: 0.3 },
        { s: 4, at: -6, src: 'riser.wav', v: 0.4 }, { s: 4, at: 6, src: 'impact.wav', v: 0.55 }, { s: 4, at: 24, src: 'bell.wav', v: 0.42 },
        { s: 5, at: 6, src: 'impact.wav', v: 0.5 }, { s: 5, at: 20, src: 'bell.wav', v: 0.42 }, { s: 5, at: 58, src: 'shimmer.wav', v: 0.5 },
      ]} />
    </AbsoluteFill>
  );
};
