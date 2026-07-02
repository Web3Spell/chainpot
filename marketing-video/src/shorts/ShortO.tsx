import React from 'react';
import { AbsoluteFill, useCurrentFrame } from 'remotion';
import { TransitionSeries, linearTiming, springTiming } from '@remotion/transitions';
import { fade } from '@remotion/transitions/fade';
import { slide } from '@remotion/transitions/slide';

import { loadFonts } from '../fonts';
import { COLORS, FONT, SAFE } from '../theme';
import { Background, Eyebrow, fadeIn } from '../ui';
import { CompareRows } from '../infographics';
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
      <Background intensity={0.9} cy={44} glow={'rgba(0,82,255,0.3)'} />
      <TopMark />
      <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center', textAlign: 'center', padding: `0 ${SAFE.side}px` }}>
        <div style={{ opacity: fadeIn(frame, 6, 12) }}><Eyebrow color={B}>Open books</Eyebrow></div>
        <div style={{ fontFamily: FONT.display, fontSize: 84, color: COLORS.white, marginTop: 28, opacity: fadeIn(frame, 14, 12), lineHeight: 1.05, whiteSpace: 'pre-line', maxWidth: 920 }}>
          The old chit kept the math{'\n'}in one person’s head.
        </div>
        <div style={{ fontFamily: FONT.display, fontSize: 58, color: B, opacity: fadeIn(frame, 46, 14), marginTop: 36 }}>
          ChainPot keeps it on-chain.
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

const EVENTS = [
  { name: 'MemberPaidForCycle', hash: '0x7a3f…2ca7' },
  { name: 'BidPlaced', hash: '0x9042…455B' },
  { name: 'WinnerDeclared', hash: '0x17c4…0A0c' },
  { name: 'RemainderDistributed', hash: '0xcCfb…5B0a' },
  { name: 'InterestHarvested', hash: '0x47a9…2ca7' },
];

const EventLog: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill>
      <Background intensity={0.8} cy={36} glow={'rgba(0,82,255,0.25)'} />
      <AbsoluteFill style={{ padding: `${SAFE.top}px ${SAFE.side}px ${SAFE.bottom}px`, justifyContent: 'center' }}>
        <div style={{ opacity: fadeIn(frame, 4, 12) }}><Eyebrow color={B}>Every move, on the record</Eyebrow></div>
        <div style={{ marginTop: 40, display: 'flex', flexDirection: 'column', gap: 16 }}>
          {EVENTS.map((e, i) => {
            const at = 16 + i * 12;
            const o = fadeIn(frame, at, 10);
            return (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 18, padding: '24px 30px', borderRadius: 18, background: 'rgba(255,255,255,0.04)', border: `1px solid ${COLORS.glassBorder}`, opacity: o }}>
                <span style={{ fontFamily: FONT.mono, fontSize: 32, color: COLORS.white, flex: 1 }}>{e.name}</span>
                <span style={{ fontFamily: FONT.mono, fontSize: 26, color: COLORS.white40 }}>{e.hash}</span>
                <span style={{ fontFamily: FONT.mono, fontSize: 30, color: COLORS.green }}>✓</span>
              </div>
            );
          })}
        </div>
        <div style={{ fontFamily: FONT.mono, fontSize: 28, color: COLORS.white60, marginTop: 44, textAlign: 'center', letterSpacing: 1 }}>
          public · timestamped · permanent
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

const Compare: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill>
      <Background intensity={0.85} cy={34} glow={'rgba(0,82,255,0.22)'} />
      <AbsoluteFill style={{ padding: `${SAFE.top}px ${SAFE.side}px ${SAFE.bottom}px`, justifyContent: 'center' }}>
        <div style={{ opacity: fadeIn(frame, 4, 12) }}><Eyebrow color={B}>Cash chit vs ChainPot</Eyebrow></div>
        <div style={{ fontFamily: FONT.display, fontSize: 72, color: COLORS.white, marginTop: 18, marginBottom: 44, opacity: fadeIn(frame, 12, 12) }}>
          The receipts <span style={{ color: B }}>speak for themselves.</span>
        </div>
        <CompareRows
          delay={20}
          badLabel="Cash chit"
          goodLabel="ChainPot"
          items={[
            { label: 'Who keeps score', bad: 'a notebook', good: 'the contract' },
            { label: 'Disputes', bad: 'he-said', good: 'the ledger' },
            { label: 'Proof', bad: '“trust me”', good: 'Basescan' },
          ]}
        />
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

const Verify: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill>
      <Background intensity={0.9} cy={42} glow={'rgba(0,82,255,0.28)'} />
      <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center', textAlign: 'center', padding: `0 ${SAFE.side}px` }}>
        <div style={{ fontFamily: FONT.display, fontSize: 100, color: COLORS.white, opacity: fadeIn(frame, 6, 12), lineHeight: 1.02 }}>
          Don’t trust.<br /><span style={{ color: B }}>Verify.</span>
        </div>
        <div style={{ marginTop: 44, opacity: fadeIn(frame, 28, 12), display: 'inline-flex', alignItems: 'center', gap: 14, padding: '18px 30px', borderRadius: 999, background: 'rgba(0,82,255,0.12)', border: `1px solid ${B}` }}>
          <span style={{ color: B }}>●</span>
          <span style={{ fontFamily: FONT.mono, fontSize: 30, color: COLORS.white, letterSpacing: 0.5 }}>AuctionEngineV3 · 0x9042…455B</span>
        </div>
        <div style={{ fontFamily: FONT.sans, fontWeight: 300, fontSize: 40, color: COLORS.white60, marginTop: 36, opacity: fadeIn(frame, 44, 14) }}>
          every pot, every payout — open on Basescan.
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

export const ShortO: React.FC = () => {
  const durations = [150, 170, 170, 150, 150, 170];
  return (
    <AbsoluteFill style={{ backgroundColor: COLORS.black }}>
      <TransitionSeries>
        <TransitionSeries.Sequence durationInFrames={durations[0]}><Hook /></TransitionSeries.Sequence>
        <TransitionSeries.Transition presentation={fade()} timing={fadeT()} />
        <TransitionSeries.Sequence durationInFrames={durations[1]}><EventLog /></TransitionSeries.Sequence>
        <TransitionSeries.Transition presentation={slide({ direction: 'from-right' })} timing={slideT()} />
        <TransitionSeries.Sequence durationInFrames={durations[2]}><Compare /></TransitionSeries.Sequence>
        <TransitionSeries.Transition presentation={fade()} timing={fadeT()} />
        <TransitionSeries.Sequence durationInFrames={durations[3]}><Verify /></TransitionSeries.Sequence>
        <TransitionSeries.Transition presentation={fade()} timing={fadeT()} />
        <TransitionSeries.Sequence durationInFrames={durations[4]}><LogoReveal headline={'Trust, but verify —\non-chain.'} sub="open by default" accent={B} /></TransitionSeries.Sequence>
        <TransitionSeries.Transition presentation={fade()} timing={fadeT()} />
        <TransitionSeries.Sequence durationInFrames={durations[5]}><EndCard tagline={'Open books,\nby default.'} accent={B} /></TransitionSeries.Sequence>
      </TransitionSeries>
      <ShortAudio music="music_o.wav" durations={durations} cues={[
        { s: 0, at: 14, src: 'impact.wav', v: 0.5 }, { s: 0, at: 46, src: 'bell.wav', v: 0.38 },
        { s: 1, at: 16, src: 'pop.wav', v: 0.34 }, { s: 1, at: 28, src: 'pop.wav', v: 0.34 }, { s: 1, at: 40, src: 'pop.wav', v: 0.34 }, { s: 1, at: 52, src: 'pop.wav', v: 0.34 }, { s: 1, at: 64, src: 'bell.wav', v: 0.4 },
        { s: 2, at: 12, src: 'uplift.wav', v: 0.35 }, { s: 2, at: 30, src: 'pop.wav', v: 0.3 }, { s: 2, at: 44, src: 'bell.wav', v: 0.4 },
        { s: 3, at: 6, src: 'impact.wav', v: 0.45 }, { s: 3, at: 28, src: 'bell.wav', v: 0.4 },
        { s: 4, at: -6, src: 'riser.wav', v: 0.4 }, { s: 4, at: 6, src: 'impact.wav', v: 0.55 }, { s: 4, at: 24, src: 'bell.wav', v: 0.42 },
        { s: 5, at: 6, src: 'impact.wav', v: 0.5 }, { s: 5, at: 20, src: 'bell.wav', v: 0.42 }, { s: 5, at: 58, src: 'shimmer.wav', v: 0.5 },
      ]} />
    </AbsoluteFill>
  );
};
