import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame } from 'remotion';
import { TransitionSeries, linearTiming, springTiming } from '@remotion/transitions';
import { fade } from '@remotion/transitions/fade';
import { slide } from '@remotion/transitions/slide';
import { ShieldCheck } from 'lucide-react';

import { loadFonts } from '../fonts';
import { COLORS, FONT, SAFE } from '../theme';
import { Background, Eyebrow, GlassCard, fadeIn } from '../ui';
import { TopMark, LogoReveal, EndCard } from '../shortsKit';
import { ShortAudio } from '../audioKit';

loadFonts();
const B = COLORS.base;
const T = 12;
const fadeT = () => linearTiming({ durationInFrames: T });
const slideT = () => springTiming({ config: { damping: 200 }, durationInFrames: T });

const Hook: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill>
      <Background intensity={0.9} cy={44} glow={'rgba(0,82,255,0.32)'} />
      <TopMark />
      <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center', textAlign: 'center', padding: `0 ${SAFE.side}px` }}>
        <div style={{ opacity: fadeIn(frame, 6, 12) }}><Eyebrow color={B}>No bids? No problem</Eyebrow></div>
        <div style={{ fontFamily: FONT.display, fontSize: 96, color: COLORS.white, marginTop: 28, opacity: fadeIn(frame, 14, 12), lineHeight: 1.04, whiteSpace: 'pre-line' }}>
          When no one bids,{'\n'}who wins?
        </div>
        <div style={{ fontFamily: FONT.display, fontSize: 56, color: B, opacity: fadeIn(frame, 46, 14), marginTop: 38 }}>
          Nobody decides. Math does.
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

const MEMBERS = ['A', 'H', 'M', 'D', 'P', 'R'];
const WINNER = 2;

const Reveal: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill>
      <Background intensity={0.85} cy={36} glow={'rgba(0,82,255,0.28)'} />
      <AbsoluteFill style={{ padding: `${SAFE.top}px ${SAFE.side}px ${SAFE.bottom}px` }}>
        <div style={{ opacity: fadeIn(frame, 4, 12) }}><Eyebrow color={B}>Provably random</Eyebrow></div>
        <div style={{ fontFamily: FONT.display, fontSize: 76, color: COLORS.white, marginTop: 18, opacity: fadeIn(frame, 12, 12), lineHeight: 1.02 }}>
          The draw picks a <span style={{ color: B }}>winner.</span>
        </div>
        <div style={{ marginTop: 56, display: 'flex', flexWrap: 'wrap', gap: 16, justifyContent: 'center' }}>
          {MEMBERS.map((m, i) => {
            const win = i === WINNER;
            const lit = win && frame > 55;
            const o = fadeIn(frame, 22 + i * 6, 10);
            const pulse = lit ? 0.6 + Math.sin((frame - 55) / 7) * 0.4 : 0;
            return (
              <div key={i} style={{ opacity: o, width: 96, height: 96, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: FONT.display, fontSize: 46, color: lit ? '#fff' : COLORS.white60, background: lit ? `radial-gradient(circle, ${B} 0%, rgba(0,0,0,0.4) 100%)` : 'rgba(255,255,255,0.05)', border: `2px solid ${lit ? B : COLORS.glassBorder}`, boxShadow: lit ? `0 0 ${24 + pulse * 30}px ${B}` : 'none' }}>
                {m}
              </div>
            );
          })}
        </div>
        <GlassCard glow accent={B} style={{ marginTop: 50, padding: '30px 36px', opacity: fadeIn(frame, 64, 12) }}>
          <div style={{ fontFamily: FONT.mono, fontSize: 30, color: COLORS.white60, letterSpacing: 1 }}>VRF seed&nbsp;&nbsp;0x9e13…bf71</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginTop: 16 }}>
            <span style={{ fontFamily: FONT.mono, fontSize: 38, color: COLORS.white }}>→ winner&nbsp;&nbsp;</span>
            <span style={{ fontFamily: FONT.display, fontSize: 48, color: B }}>Maria</span>
            <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 10 }}>
              <ShieldCheck size={36} color={B} />
              <span style={{ fontFamily: FONT.mono, fontSize: 26, color: B, letterSpacing: 1 }}>verified on-chain</span>
            </div>
          </div>
        </GlassCard>
        <div style={{ fontFamily: FONT.mono, fontSize: 28, color: COLORS.white60, marginTop: 'auto', textAlign: 'center', letterSpacing: 1 }}>
          a winner no human chose
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

const Why: React.FC = () => {
  const frame = useCurrentFrame();
  const chips = ['verifiable on-chain', 'no organizer’s lucky cousin', 're-checkable by anyone'];
  return (
    <AbsoluteFill>
      <Background intensity={0.85} cy={40} glow={'rgba(0,82,255,0.28)'} />
      <AbsoluteFill style={{ padding: `0 ${SAFE.side}px`, justifyContent: 'center', alignItems: 'center', textAlign: 'center' }}>
        <div style={{ opacity: fadeIn(frame, 4, 12) }}><Eyebrow color={B}>No rigged pots</Eyebrow></div>
        <div style={{ fontFamily: FONT.display, fontSize: 80, color: COLORS.white, marginTop: 24, opacity: fadeIn(frame, 12, 12) }}>
          Every draw ships<br />with <span style={{ color: B }}>proof.</span>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 16, marginTop: 50, maxWidth: 880 }}>
          {chips.map((c, i) => (
            <div key={c} style={{ opacity: fadeIn(frame, 28 + i * 8, 10), fontFamily: FONT.mono, fontSize: 30, color: COLORS.white, padding: '16px 28px', borderRadius: 999, background: 'rgba(0,82,255,0.1)', border: '1px solid rgba(0,82,255,0.4)', letterSpacing: 0.5 }}>
              ✓ {c}
            </div>
          ))}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

const Safety: React.FC = () => {
  const frame = useCurrentFrame();
  const chips = ['winner must be a real member', 'requests are allowlisted', 'randomness can’t be drained'];
  return (
    <AbsoluteFill>
      <Background intensity={0.85} cy={40} />
      <AbsoluteFill style={{ padding: `0 ${SAFE.side}px`, justifyContent: 'center', alignItems: 'center', textAlign: 'center' }}>
        <div style={{ opacity: fadeIn(frame, 4, 12) }}><Eyebrow color={B}>Hardened</Eyebrow></div>
        <div style={{ fontFamily: FONT.display, fontSize: 78, color: COLORS.white, marginTop: 24, opacity: fadeIn(frame, 12, 12) }}>
          Even the fallback<br />is <span style={{ color: B }}>tamper-proof.</span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginTop: 50, maxWidth: 760 }}>
          {chips.map((c, i) => (
            <div key={c} style={{ opacity: fadeIn(frame, 28 + i * 9, 10), fontFamily: FONT.mono, fontSize: 30, color: COLORS.white, padding: '18px 30px', borderRadius: 18, background: 'rgba(0,82,255,0.08)', border: '1px solid rgba(0,82,255,0.32)', letterSpacing: 0.5 }}>
              ✓ {c}
            </div>
          ))}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

export const ShortM: React.FC = () => {
  const durations = [150, 170, 170, 150, 150, 170];
  return (
    <AbsoluteFill style={{ backgroundColor: COLORS.black }}>
      <TransitionSeries>
        <TransitionSeries.Sequence durationInFrames={durations[0]}><Hook /></TransitionSeries.Sequence>
        <TransitionSeries.Transition presentation={fade()} timing={fadeT()} />
        <TransitionSeries.Sequence durationInFrames={durations[1]}><Reveal /></TransitionSeries.Sequence>
        <TransitionSeries.Transition presentation={slide({ direction: 'from-right' })} timing={slideT()} />
        <TransitionSeries.Sequence durationInFrames={durations[2]}><Why /></TransitionSeries.Sequence>
        <TransitionSeries.Transition presentation={fade()} timing={fadeT()} />
        <TransitionSeries.Sequence durationInFrames={durations[3]}><Safety /></TransitionSeries.Sequence>
        <TransitionSeries.Transition presentation={fade()} timing={fadeT()} />
        <TransitionSeries.Sequence durationInFrames={durations[4]}><LogoReveal headline={'Fairness you\ncan verify.'} sub="Chainlink VRF" accent={B} /></TransitionSeries.Sequence>
        <TransitionSeries.Transition presentation={fade()} timing={fadeT()} />
        <TransitionSeries.Sequence durationInFrames={durations[5]}><EndCard tagline={'The kitty,\nprovably fair.'} accent={B} /></TransitionSeries.Sequence>
      </TransitionSeries>
      <ShortAudio music="music_m.wav" durations={durations} cues={[
        { s: 0, at: 14, src: 'impact.wav', v: 0.5 }, { s: 0, at: 46, src: 'bell.wav', v: 0.38 },
        { s: 1, at: 22, src: 'pop.wav', v: 0.32 }, { s: 1, at: 40, src: 'pop.wav', v: 0.32 }, { s: 1, at: 56, src: 'bell.wav', v: 0.45 }, { s: 1, at: 66, src: 'uplift.wav', v: 0.4 },
        { s: 2, at: 12, src: 'uplift.wav', v: 0.38 }, { s: 2, at: 28, src: 'pop.wav', v: 0.34 }, { s: 2, at: 44, src: 'bell.wav', v: 0.4 },
        { s: 3, at: 12, src: 'pop.wav', v: 0.34 }, { s: 3, at: 30, src: 'pop.wav', v: 0.34 }, { s: 3, at: 46, src: 'bell.wav', v: 0.4 },
        { s: 4, at: -6, src: 'riser.wav', v: 0.4 }, { s: 4, at: 6, src: 'impact.wav', v: 0.55 }, { s: 4, at: 24, src: 'bell.wav', v: 0.42 },
        { s: 5, at: 6, src: 'impact.wav', v: 0.5 }, { s: 5, at: 20, src: 'bell.wav', v: 0.42 }, { s: 5, at: 58, src: 'shimmer.wav', v: 0.5 },
      ]} />
    </AbsoluteFill>
  );
};
