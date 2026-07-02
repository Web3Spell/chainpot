import React from 'react';
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { TransitionSeries, linearTiming, springTiming } from '@remotion/transitions';
import { fade } from '@remotion/transitions/fade';
import { slide } from '@remotion/transitions/slide';
import { Gavel, Check, HandCoins, PiggyBank } from 'lucide-react';

import { loadFonts } from '../fonts';
import { COLORS, FONT, SAFE } from '../theme';
import { Background, Eyebrow, GlassCard, fadeIn } from '../ui';
import { TopMark, LogoReveal, EndCard } from '../shortsKit';
import { ShortAudio } from '../audioKit';

loadFonts();
const V = COLORS.violetBright;
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
        <div style={{ opacity: fadeIn(frame, 6, 12) }}><Eyebrow color={V}>The bid</Eyebrow></div>
        <div style={{ fontFamily: FONT.display, fontSize: 92, color: COLORS.white, marginTop: 28, opacity: fadeIn(frame, 14, 12), lineHeight: 1.04, whiteSpace: 'pre-line' }}>
          It's an auction —{'\n'}the <span style={{ color: V }}>lowest</span> bid wins.
        </div>
        <div style={{ fontFamily: FONT.display, fontSize: 56, color: COLORS.white60, opacity: fadeIn(frame, 46, 14), marginTop: 36 }}>
          Sounds backwards. <span style={{ color: V }}>It's genius.</span>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

const BIDS = [
  { who: 'Maria', amt: 9200, win: false },
  { who: 'Hassan', amt: 8800, win: false },
  { who: 'Asha', amt: 8500, win: true },
];
const BidRows: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return (
    <AbsoluteFill>
      <Background intensity={0.85} cy={36} />
      <AbsoluteFill style={{ padding: `${SAFE.top}px ${SAFE.side}px ${SAFE.bottom}px` }}>
        <div style={{ opacity: fadeIn(frame, 4, 12) }}><Eyebrow color={V}>Lowest bid takes the pot</Eyebrow></div>
        <GlassCard style={{ marginTop: 30, padding: '26px 36px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', opacity: fadeIn(frame, 12, 12) }}>
          <span style={{ fontFamily: FONT.mono, fontSize: 30, color: COLORS.white60, letterSpacing: 2 }}>CYCLE POOL</span>
          <span style={{ fontFamily: FONT.display, fontSize: 64, color: COLORS.white }}>$10,000</span>
        </GlassCard>
        <div style={{ marginTop: 26, display: 'flex', flexDirection: 'column', gap: 18 }}>
          {BIDS.map((b, i) => {
            const at = 28 + i * 16;
            const sp = spring({ frame: frame - at, fps, config: { damping: 16 } });
            const o = fadeIn(frame, at, 10);
            const x = interpolate(sp, [0, 1], [60, 0]);
            const winReveal = b.win ? fadeIn(frame, 70, 10) : 0;
            return (
              <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '24px 32px', borderRadius: 22, opacity: o, transform: `translateX(${x}px)`, background: `rgba(167,139,250,${0.04 + winReveal * 0.16})`, border: `1px solid ${b.win ? `rgba(167,139,250,${0.3 + winReveal * 0.6})` : COLORS.glassBorder}`, boxShadow: b.win ? `0 20px 60px -20px rgba(167,139,250,${winReveal * 0.8})` : 'none' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
                  <Gavel size={34} color={b.win ? V : COLORS.white40} />
                  <span style={{ fontFamily: FONT.sans, fontWeight: 500, fontSize: 42, color: COLORS.white }}>{b.who}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
                  <span style={{ fontFamily: FONT.mono, fontSize: 46, fontWeight: 600, color: b.win ? V : COLORS.white80 }}>${b.amt.toLocaleString()}</span>
                  {b.win && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 999, background: COLORS.violet, opacity: winReveal, transform: `scale(${interpolate(winReveal, [0, 1], [0.5, 1])})` }}>
                      <Check size={22} color="#fff" strokeWidth={3} />
                      <span style={{ fontFamily: FONT.mono, fontSize: 22, color: '#fff', letterSpacing: 1 }}>WINS</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
        <div style={{ fontFamily: FONT.mono, fontSize: 28, color: COLORS.white60, marginTop: 'auto', textAlign: 'center', letterSpacing: 1 }}>
          win the pot early — at a small discount
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

const Twist: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill>
      <Background intensity={0.9} cy={40} glow={'rgba(25,251,155,0.25)'} />
      <AbsoluteFill style={{ padding: `${SAFE.top}px ${SAFE.side}px ${SAFE.bottom}px`, justifyContent: 'center' }}>
        <div style={{ opacity: fadeIn(frame, 4, 12) }}><Eyebrow color={V}>Here's the genius part</Eyebrow></div>
        <div style={{ fontFamily: FONT.display, fontSize: 84, color: COLORS.white, marginTop: 18, marginBottom: 44, opacity: fadeIn(frame, 12, 12), lineHeight: 1.02 }}>
          Your discount is a <span style={{ color: COLORS.green }}>gift.</span>
        </div>
        <div style={{ padding: '34px 38px', borderRadius: 26, background: 'rgba(25,251,155,0.08)', border: '1px solid rgba(25,251,155,0.3)', display: 'flex', alignItems: 'center', gap: 24, opacity: fadeIn(frame, 24, 12) }}>
          <span style={{ fontFamily: FONT.display, fontSize: 86, color: COLORS.green }}>+$166</span>
          <span style={{ fontFamily: FONT.sans, fontWeight: 400, fontSize: 42, color: COLORS.white, lineHeight: 1.1 }}>to <b>each of 9 others</b></span>
        </div>
        <div style={{ fontFamily: FONT.sans, fontWeight: 300, fontSize: 40, color: COLORS.white80, marginTop: 36, opacity: fadeIn(frame, 44, 14), lineHeight: 1.25 }}>
          The <span style={{ color: COLORS.white, fontWeight: 600 }}>$1,500</span> you skipped is split to your circle — and they return the favour on your cycle.
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

const Strategy: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const cards = [
    { icon: HandCoins, color: V, title: 'Need cash now?', sub: 'Bid aggressively — take the pot early.' },
    { icon: PiggyBank, color: COLORS.green, title: 'Can you wait?', sub: 'Hold — collect everyone’s discounts + yield.' },
  ];
  return (
    <AbsoluteFill>
      <Background intensity={0.85} cy={36} />
      <AbsoluteFill style={{ padding: `${SAFE.top}px ${SAFE.side}px ${SAFE.bottom}px`, justifyContent: 'center' }}>
        <div style={{ opacity: fadeIn(frame, 4, 12) }}><Eyebrow color={V}>When to bid</Eyebrow></div>
        <div style={{ marginTop: 40, display: 'flex', flexDirection: 'column', gap: 24 }}>
          {cards.map((c, i) => {
            const at = 16 + i * 16;
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

export const ShortL: React.FC = () => {
  const durations = [150, 175, 170, 150, 150, 165];
  return (
    <AbsoluteFill style={{ backgroundColor: COLORS.black }}>
      <TransitionSeries>
        <TransitionSeries.Sequence durationInFrames={durations[0]}><Hook /></TransitionSeries.Sequence>
        <TransitionSeries.Transition presentation={fade()} timing={fadeT()} />
        <TransitionSeries.Sequence durationInFrames={durations[1]}><BidRows /></TransitionSeries.Sequence>
        <TransitionSeries.Transition presentation={slide({ direction: 'from-right' })} timing={slideT()} />
        <TransitionSeries.Sequence durationInFrames={durations[2]}><Twist /></TransitionSeries.Sequence>
        <TransitionSeries.Transition presentation={fade()} timing={fadeT()} />
        <TransitionSeries.Sequence durationInFrames={durations[3]}><Strategy /></TransitionSeries.Sequence>
        <TransitionSeries.Transition presentation={fade()} timing={fadeT()} />
        <TransitionSeries.Sequence durationInFrames={durations[4]}><LogoReveal headline={'Lower your bid.\nLift your circle.'} sub="lowest-bid ROSCA, on-chain" accent={COLORS.violet} /></TransitionSeries.Sequence>
        <TransitionSeries.Transition presentation={fade()} timing={fadeT()} />
        <TransitionSeries.Sequence durationInFrames={durations[5]}><EndCard tagline={'A bidding war\nwhere everyone wins.'} accent={COLORS.violet} /></TransitionSeries.Sequence>
      </TransitionSeries>
      <ShortAudio music="music_l.wav" durations={durations} cues={[
        { s: 0, at: 14, src: 'impact.wav', v: 0.5 }, { s: 0, at: 46, src: 'bell.wav', v: 0.38 },
        { s: 1, at: 28, src: 'pop.wav', v: 0.4 }, { s: 1, at: 44, src: 'pop.wav', v: 0.4 }, { s: 1, at: 60, src: 'pop.wav', v: 0.4 }, { s: 1, at: 70, src: 'bell.wav', v: 0.5 },
        { s: 2, at: 12, src: 'uplift.wav', v: 0.4 }, { s: 2, at: 24, src: 'shimmer.wav', v: 0.5 }, { s: 2, at: 44, src: 'bell.wav', v: 0.4 },
        { s: 3, at: 16, src: 'pop.wav', v: 0.4 }, { s: 3, at: 32, src: 'bell.wav', v: 0.4 },
        { s: 4, at: -6, src: 'riser.wav', v: 0.4 }, { s: 4, at: 6, src: 'impact.wav', v: 0.55 }, { s: 4, at: 24, src: 'bell.wav', v: 0.42 },
        { s: 5, at: 6, src: 'impact.wav', v: 0.5 }, { s: 5, at: 20, src: 'bell.wav', v: 0.42 }, { s: 5, at: 58, src: 'shimmer.wav', v: 0.5 },
      ]} />
    </AbsoluteFill>
  );
};
