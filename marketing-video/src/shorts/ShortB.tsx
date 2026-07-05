import React from 'react';
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { TransitionSeries, linearTiming, springTiming } from '@remotion/transitions';
import { fade } from '@remotion/transitions/fade';
import { slide } from '@remotion/transitions/slide';
import { Store, Wallet, FileCheck, TrendingUp } from 'lucide-react';

import { loadFonts } from '../fonts';
import { COLORS, FONT, SAFE } from '../theme';
import { Background, Eyebrow, GlassCard, fadeIn } from '../ui';
import { Counter, CompareRows } from '../infographics';
import { TopMark, LogoReveal, EndCard } from '../shortsKit';
import { ShortAudio } from '../audioKit';

loadFonts();
const G = COLORS.green;
const T = 12;
const fadeT = () => linearTiming({ durationInFrames: T });
const slideT = () => springTiming({ config: { damping: 200 }, durationInFrames: T });

/* 1 — HOOK: SME credit gap */
const Hook: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill>
      <Background intensity={0.9} cy={42} glow={'rgba(25,251,155,0.3)'} />
      <TopMark />
      <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center', textAlign: 'center', padding: `0 ${SAFE.side}px` }}>
        <div style={{ opacity: fadeIn(frame, 6, 12) }}><Eyebrow color={G}>ChainPot for business</Eyebrow></div>
        <div style={{ fontFamily: FONT.display, fontSize: 250, color: COLORS.white, marginTop: 10, opacity: fadeIn(frame, 12, 10), textShadow: `0 0 80px rgba(25,251,155,0.4)` }}>
          <Counter to={5.2} decimals={1} delay={14} dur={42} prefix="$" suffix="T" />
        </div>
        <div style={{ fontFamily: FONT.sans, fontWeight: 300, fontSize: 52, color: COLORS.white, opacity: fadeIn(frame, 32, 12), marginTop: 2 }}>
          the credit gap banks <span style={{ fontWeight: 600 }}>won't touch</span>
        </div>
        <div style={{ fontFamily: FONT.display, fontSize: 46, color: G, opacity: fadeIn(frame, 52, 14), marginTop: 40 }}>
          7 in 10 small businesses can't get financed.
        </div>
        <div style={{ fontFamily: FONT.mono, fontSize: 24, color: COLORS.white40, opacity: fadeIn(frame, 64, 14), marginTop: 22, letterSpacing: 1 }}>
          IFC · MSME Finance Gap
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

/* 2 — USE CASE: a business circle */
const BizCircle: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const members = ['Asha Textiles', 'Lagos Cycles', 'Bina Spices', 'Reyes Cafe', 'Okoro Prints', 'Devi Hardware'];
  const winner = 2;
  return (
    <AbsoluteFill>
      <Background intensity={0.8} cy={36} glow={'rgba(25,251,155,0.25)'} />
      <AbsoluteFill style={{ padding: `${SAFE.top}px ${SAFE.side}px ${SAFE.bottom}px` }}>
        <div style={{ opacity: fadeIn(frame, 4, 12) }}><Eyebrow color={G}>So circles became working capital</Eyebrow></div>
        <div style={{ fontFamily: FONT.display, fontSize: 76, color: COLORS.white, marginTop: 18, opacity: fadeIn(frame, 12, 12), lineHeight: 1.0, whiteSpace: 'pre-line' }}>
          Six shops. One pot.{'\n'}<span style={{ color: G }}>Each funded in turn.</span>
        </div>
        <GlassCard glow accent={G} style={{ marginTop: 44, padding: '30px 36px', opacity: fadeIn(frame, 30, 12) }}>
          <div style={{ fontFamily: FONT.mono, fontSize: 26, color: COLORS.white60, letterSpacing: 2 }}>CYCLE 3 · PAYOUT</div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
              <Store size={48} color={G} />
              <span style={{ fontFamily: FONT.display, fontSize: 56, color: COLORS.white }}>Bina Spices</span>
            </div>
            <span style={{ fontFamily: FONT.display, fontSize: 72, color: G }}>
              <Counter to={50000} delay={40} dur={36} prefix="$" />
            </span>
          </div>
        </GlassCard>
        <div style={{ marginTop: 36, display: 'flex', flexWrap: 'wrap', gap: 14 }}>
          {members.map((m, i) => {
            const at = 48 + i * 6;
            const o = fadeIn(frame, at, 10);
            const sp = spring({ frame: frame - at, fps, config: { damping: 200 } });
            const win = i === winner;
            return (
              <div key={i} style={{ opacity: o, transform: `scale(${interpolate(sp, [0, 1], [0.8, 1])})`, display: 'flex', alignItems: 'center', gap: 10, padding: '14px 22px', borderRadius: 999, background: win ? `${G}22` : 'rgba(255,255,255,0.05)', border: `1px solid ${win ? G : COLORS.glassBorder}` }}>
                <Store size={26} color={win ? G : COLORS.white60} />
                <span style={{ fontFamily: FONT.sans, fontWeight: 500, fontSize: 28, color: win ? COLORS.white : COLORS.white80 }}>{m}</span>
              </div>
            );
          })}
        </div>
        <div style={{ fontFamily: FONT.mono, fontSize: 28, color: COLORS.white60, marginTop: 'auto', textAlign: 'center', letterSpacing: 1 }}>
          no loan officer · no collateral · no waiting
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

/* 3 — COMPARE */
const Compare: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill>
      <Background intensity={0.85} cy={34} glow={'rgba(25,251,155,0.22)'} />
      <AbsoluteFill style={{ padding: `${SAFE.top}px ${SAFE.side}px ${SAFE.bottom}px`, justifyContent: 'center' }}>
        <div style={{ opacity: fadeIn(frame, 4, 12) }}><Eyebrow color={G}>Skip the bank</Eyebrow></div>
        <div style={{ fontFamily: FONT.display, fontSize: 72, color: COLORS.white, marginTop: 18, marginBottom: 44, opacity: fadeIn(frame, 12, 12) }}>
          Same capital. <span style={{ color: G }}>None of the gatekeeping.</span>
        </div>
        <CompareRows
          delay={20}
          items={[
            { label: 'Approval', bad: 'weeks', good: 'same day' },
            { label: 'Paperwork', bad: 'stacks', good: 'a wallet' },
            { label: 'Interest', bad: '18–40% APR', good: 'you set it' },
            { label: 'Collateral', bad: 'required', good: 'none' },
          ]}
        />
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

/* 4 — BENEFITS */
const Benefits: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const feats = [
    { icon: Wallet, title: 'Working capital on demand', sub: 'Your lump sum, when your turn comes.' },
    { icon: FileCheck, title: 'Transparent books, zero disputes', sub: 'Every contribution and payout is on-chain.' },
    { icon: TrendingUp, title: 'Idle treasury earns yield', sub: 'Pooled funds supply Compound until payout.' },
  ];
  return (
    <AbsoluteFill>
      <Background intensity={0.85} cy={34} glow={'rgba(25,251,155,0.25)'} />
      <AbsoluteFill style={{ padding: `${SAFE.top}px ${SAFE.side}px ${SAFE.bottom}px`, justifyContent: 'center' }}>
        <div style={{ opacity: fadeIn(frame, 4, 12) }}><Eyebrow color={G}>Why businesses stay</Eyebrow></div>
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
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

export const ShortB: React.FC = () => {
  const durations = [150, 165, 175, 160, 150, 160];
  return (
    <AbsoluteFill style={{ backgroundColor: COLORS.black }}>
      <TransitionSeries>
        <TransitionSeries.Sequence durationInFrames={durations[0]}><Hook /></TransitionSeries.Sequence>
        <TransitionSeries.Transition presentation={fade()} timing={fadeT()} />
        <TransitionSeries.Sequence durationInFrames={durations[1]}><BizCircle /></TransitionSeries.Sequence>
        <TransitionSeries.Transition presentation={slide({ direction: 'from-right' })} timing={slideT()} />
        <TransitionSeries.Sequence durationInFrames={durations[2]}><Compare /></TransitionSeries.Sequence>
        <TransitionSeries.Transition presentation={fade()} timing={fadeT()} />
        <TransitionSeries.Sequence durationInFrames={durations[3]}><Benefits /></TransitionSeries.Sequence>
        <TransitionSeries.Transition presentation={fade()} timing={fadeT()} />
        <TransitionSeries.Sequence durationInFrames={durations[4]}><LogoReveal headline={'The treasury your circle controls.'} sub="working capital · on-chain · yours" accent={G} /></TransitionSeries.Sequence>
        <TransitionSeries.Transition presentation={fade()} timing={fadeT()} />
        <TransitionSeries.Sequence durationInFrames={durations[5]}><EndCard tagline={'Credit, without the bank.\nRun by your circle.'} accent={G} /></TransitionSeries.Sequence>
      </TransitionSeries>

      <ShortAudio
        music="music_b.wav"
        durations={durations}
        cues={[
          { s: 0, at: 14, src: 'impact.wav', v: 0.55 }, { s: 0, at: 52, src: 'bell.wav', v: 0.32 },
          { s: 1, at: 30, src: 'uplift.wav', v: 0.4 }, { s: 1, at: 40, src: 'shimmer.wav', v: 0.4 }, { s: 1, at: 54, src: 'pop.wav', v: 0.3 }, { s: 1, at: 66, src: 'pop.wav', v: 0.3 },
          { s: 2, at: 12, src: 'uplift.wav', v: 0.35 }, { s: 2, at: 30, src: 'pop.wav', v: 0.3 }, { s: 2, at: 40, src: 'pop.wav', v: 0.3 }, { s: 2, at: 50, src: 'pop.wav', v: 0.3 },
          { s: 3, at: 16, src: 'pop.wav', v: 0.4 }, { s: 3, at: 30, src: 'pop.wav', v: 0.4 }, { s: 3, at: 44, src: 'bell.wav', v: 0.4 },
          { s: 4, at: -6, src: 'riser.wav', v: 0.4 }, { s: 4, at: 6, src: 'impact.wav', v: 0.55 }, { s: 4, at: 24, src: 'bell.wav', v: 0.42 },
          { s: 5, at: 6, src: 'impact.wav', v: 0.5 }, { s: 5, at: 20, src: 'bell.wav', v: 0.42 }, { s: 5, at: 58, src: 'shimmer.wav', v: 0.5 },
        ]}
      />
    </AbsoluteFill>
  );
};
