'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion, useReducedMotion, type Variants } from 'framer-motion';
import { Navbar } from '@/components/dashboard/navbar';
import { useTheme } from '@/providers/theme-provider';
import { useChainPotAccount } from '@/lib/aa/account';
import { clashDisplaySemibold } from '../ui/fonts';
import { Faq } from '@/components/about/faq';

/* ------------------------------------------------------------------ data */

const MEMBERS = [
  { name: 'Priya', initial: 'P' },
  { name: 'Rahul', initial: 'R' },
  { name: 'Aman', initial: 'A' },
  { name: 'Sneha', initial: 'S' },
  { name: 'Meera', initial: 'M' },
];
const CONTRIBUTION = 50;
const POT = CONTRIBUTION * MEMBERS.length;
// Who receives the pot in each round of the worked example.
const PAYOUT_ORDER = [1, 3, 0, 2, 4];

// Chapter starts (seconds) in the walkthrough video.
const CHAPTERS = [
  { t: 0, label: 'What is ChainPot' },
  { t: 11.46, label: 'Sign in, no wallet' },
  { t: 26.62, label: 'Start a circle' },
  { t: 40.9, label: 'Invite your people' },
  { t: 53.02, label: 'Join & start' },
  { t: 64.88, label: 'Pay each round' },
  { t: 76.66, label: 'The fair draw' },
  { t: 88.02, label: 'Bidding circles' },
  { t: 98.62, label: 'Receive the pot' },
  { t: 109.94, label: 'Reminders & autopay' },
  { t: 122.7, label: 'Why you can trust it' },
  { t: 134.78, label: 'Try it' },
];

const STEPS = [
  {
    title: 'Sign in',
    body: 'Phone, email, Google or a passkey. ChainPot creates a smart account for you. No wallet app, no seed phrase.',
  },
  {
    title: 'Start a circle',
    body: 'Name it, set how much everyone puts in and how often, and pick how the receiver is chosen: a fair draw or bidding.',
  },
  {
    title: 'Invite your people',
    body: 'You get one link. Drop it in your WhatsApp or Telegram group. Friends open it, sign in and take a seat.',
  },
  {
    title: 'Everyone pays each round',
    body: 'When a round opens you see the exact amount and due date. One tap, one confirmation. We cover the network fee.',
  },
  {
    title: 'One person gets the pot',
    body: 'Chainlink VRF draws the receiver, or the lowest bid wins in a bidding circle. Every result is on-chain.',
  },
  {
    title: 'Repeat until everyone has had a turn',
    body: 'The circle ends when every member has received the pot once. Money waiting in the vault earns interest meanwhile.',
  },
];

const FEATURES = [
  { icon: '🔑', title: 'No seed phrase', body: 'Sign in like any app. Your account is a smart wallet secured by Privy, with passkey support.' },
  { icon: '⛽', title: 'No gas fees', body: 'Every action is sponsored. You never need ETH, and you never see a network fee.' },
  { icon: '🌍', title: 'Your own currency', body: 'Every amount shows in your local money first, with exact dollars beside it.' },
  { icon: '⏰', title: 'Reminders that work', body: 'We nudge you 2 days, 1 day and 2 hours before every due date, so nobody loses their place.' },
  { icon: '🔁', title: 'Autopay', body: 'Switch it on and your payment goes through on time, locked on-chain to that one circle only.' },
  { icon: '📈', title: 'Interest while you wait', body: 'Money sitting in the vault between rounds is supplied to Compound and earns interest for the circle.' },
];

const TRUST = [
  {
    title: 'Audited by Certora',
    body: 'Every rule of the circle lives in smart contracts that were formally verified and audited by Certora. The app only uses the audited code.',
  },
  {
    title: 'A vault no one can drain',
    body: 'Money sits in a pull-only vault. No organiser, no member and not even the ChainPot team can move it outside the rules.',
  },
  {
    title: 'A draw nobody can rig',
    body: 'Receivers are picked with Chainlink VRF: a random number with a proof anyone can verify on-chain.',
  },
  {
    title: 'Open on Base',
    body: 'Built on Base, a low-cost Ethereum network. Every payment, draw and payout is public and can be checked by anyone.',
  },
];

const CONTRACTS = [
  { name: 'CircleEngine', address: '0x8EA7cdD4Ae50FC8BF99a76eD182F0665710D81Db' },
  { name: 'AuctionEngine', address: '0x347B063538219961a747192d0656c1b4e382Da2e' },
  { name: 'Vault', address: '0x3D5dd83A9977BBEA876F9380cfd56A6B9E064C95' },
  { name: 'VRF provider', address: '0x02C179C8ddD881Ae61C50D06440a849EFCBEf504' },
];


/* ------------------------------------------------------------- helpers */

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.55, ease: [0.22, 1, 0.36, 1] } },
};

const stagger: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08 } },
};

function Reveal({
  children,
  className = '',
  onMount = false,
}: {
  children: React.ReactNode;
  className?: string;
  onMount?: boolean;
}) {
  return (
    <motion.div
      variants={stagger}
      initial="hidden"
      {...(onMount ? { animate: 'visible' } : { whileInView: 'visible' })}
      viewport={{ once: true, margin: '-80px' }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <motion.p variants={fadeUp} className="text-xs font-bold uppercase tracking-[0.2em] text-cp-accent">
      {children}
    </motion.p>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <motion.h2
      variants={fadeUp}
      className={`mt-3 text-4xl sm:text-5xl md:text-6xl leading-[1.02] tracking-tight text-cp-ink ${clashDisplaySemibold.className}`}
    >
      {children}
    </motion.h2>
  );
}

const card = 'rounded-3xl border-3 border-cp-line bg-cp-surface';

function fmtTime(s: number) {
  const m = Math.floor(s / 60);
  return `${m}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
}

/* ------------------------------------------------------ circle visual */

function CircleVisual() {
  const reduce = useReducedMotion();
  const [round, setRound] = useState(0);

  useEffect(() => {
    if (reduce) return;
    const id = setInterval(() => setRound((r) => (r + 1) % MEMBERS.length), 2400);
    return () => clearInterval(id);
  }, [reduce]);

  const receiver = PAYOUT_ORDER[round];
  const R = 128;

  return (
    <div className="relative mx-auto aspect-square w-full max-w-[380px]" aria-hidden>
      <svg viewBox="-190 -190 380 380" className="absolute inset-0 h-full w-full">
        <circle r={R} fill="none" stroke="var(--cp-line-soft)" strokeWidth="2" strokeDasharray="4 8" />
        <motion.circle
          r={R}
          fill="none"
          stroke="var(--cp-accent)"
          strokeWidth="3"
          strokeLinecap="round"
          pathLength={1}
          strokeDasharray="0.12 0.88"
          animate={reduce ? undefined : { rotate: 360 }}
          transition={{ duration: 12, repeat: Infinity, ease: 'linear' }}
        />
        {MEMBERS.map((_, i) => {
          const a = (i / MEMBERS.length) * Math.PI * 2 - Math.PI / 2;
          const x = Math.cos(a) * R;
          const y = Math.sin(a) * R;
          const isReceiver = i === receiver;
          return (
            <motion.line
              key={i}
              x1={x * 0.72}
              y1={y * 0.72}
              x2={x * 0.36}
              y2={y * 0.36}
              stroke={isReceiver ? 'var(--cp-success)' : 'var(--cp-accent)'}
              strokeWidth="2.5"
              strokeLinecap="round"
              initial={false}
              animate={{ opacity: isReceiver ? 0 : 0.55 }}
            />
          );
        })}
      </svg>

      {/* pot */}
      <div className="absolute left-1/2 top-1/2 flex h-32 w-32 -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center rounded-full border-3 border-cp-line bg-cp-ink text-cp-ink-inverse shadow-xl">
        <span className="text-[11px] font-semibold uppercase tracking-widest opacity-70">Round {round + 1}</span>
        <span className={`text-3xl ${clashDisplaySemibold.className}`}>${POT}</span>
        <span className="text-[11px] font-semibold opacity-70">the pot</span>
      </div>

      {MEMBERS.map((m, i) => {
        const a = (i / MEMBERS.length) * Math.PI * 2 - Math.PI / 2;
        const left = 50 + (Math.cos(a) * R * 100) / 380;
        const top = 50 + (Math.sin(a) * R * 100) / 380;
        const isReceiver = i === receiver;
        return (
          <div
            key={m.name}
            className="absolute flex -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-1"
            style={{ left: `${left}%`, top: `${top}%` }}
          >
            <motion.div
              animate={{ scale: isReceiver ? 1.15 : 1 }}
              transition={{ type: 'spring', stiffness: 300, damping: 18 }}
              className={`flex h-14 w-14 items-center justify-center rounded-full border-3 text-lg font-black transition-colors ${
                isReceiver
                  ? 'border-cp-success bg-cp-success text-white'
                  : 'border-cp-line bg-cp-surface text-cp-ink'
              }`}
            >
              {m.initial}
            </motion.div>
            <span className="whitespace-nowrap rounded-full bg-cp-surface px-2 py-0.5 text-xs font-bold text-cp-ink">
              {isReceiver ? `${m.name} +$${POT}` : `${m.name} −$${CONTRIBUTION}`}
            </span>
          </div>
        );
      })}
    </div>
  );
}

/* ------------------------------------------------------ round explorer */

function RoundExplorer() {
  const [round, setRound] = useState(0);

  return (
    <motion.div variants={fadeUp} className={`${card} p-5 sm:p-7`}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm font-bold text-cp-ink">5 friends · ${CONTRIBUTION} each · monthly</p>
        <div role="tablist" aria-label="Round" className="flex gap-1.5">
          {MEMBERS.map((_, i) => (
            <button
              key={i}
              role="tab"
              aria-selected={round === i}
              onClick={() => setRound(i)}
              className={`h-9 min-w-9 rounded-full px-3 text-sm font-bold transition-colors ${
                round === i ? 'bg-cp-ink text-cp-ink-inverse' : 'bg-cp-surface-muted text-cp-ink hover:bg-cp-accent-soft'
              }`}
            >
              {i + 1}
            </button>
          ))}
        </div>
      </div>

      <ul className="mt-5 divide-y divide-cp-line-soft">
        {MEMBERS.map((m, i) => {
          const receivedAt = PAYOUT_ORDER.indexOf(i);
          const isNow = receivedAt === round;
          const done = receivedAt < round;
          return (
            <li key={m.name} className="flex items-center gap-3 py-2.5">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-cp-surface-muted text-sm font-black text-cp-ink">
                {m.initial}
              </span>
              <span className="flex-1 font-semibold text-cp-ink">{m.name}</span>
              <span className="text-sm text-cp-muted">paid ${CONTRIBUTION}</span>
              <span
                className={`w-28 rounded-full px-2.5 py-1 text-center text-xs font-bold ${
                  isNow
                    ? 'bg-cp-success text-white'
                    : done
                      ? 'bg-cp-success-soft text-cp-success'
                      : 'bg-cp-surface-muted text-cp-muted'
                }`}
              >
                {isNow ? `gets $${POT}` : done ? `got it in R${receivedAt + 1}` : 'waiting'}
              </span>
            </li>
          );
        })}
      </ul>

      <p className="mt-4 text-sm text-cp-muted">
        Over 5 rounds everyone puts in ${CONTRIBUTION * 5} and takes out ${POT} once. Early receivers get a
        zero-interest loan from friends; late receivers get forced savings plus the interest the vault earned.
      </p>
    </motion.div>
  );
}

/* --------------------------------------------------------- demo video */

function DemoVideo() {
  const ref = useRef<HTMLVideoElement>(null);
  const [now, setNow] = useState(0);

  const active = CHAPTERS.reduce((acc, c, i) => (now >= c.t ? i : acc), 0);

  const seek = (t: number) => {
    const v = ref.current;
    if (!v) return;
    v.currentTime = t + 0.05;
    void v.play().catch(() => {});
  };

  return (
    <div className="grid items-start gap-5 lg:grid-cols-[1fr_280px]">
      <motion.div variants={fadeUp} className={`${card} overflow-hidden bg-black p-0`}>
        <video
          ref={ref}
          className="block aspect-video w-full bg-black"
          controls
          playsInline
          preload="metadata"
          poster="/videos/chainpot-walkthrough-poster.jpg"
          onTimeUpdate={(e) => setNow(e.currentTarget.currentTime)}
        >
          <source src="/videos/chainpot-walkthrough.mp4" type="video/mp4" />
        </video>
      </motion.div>

      <motion.ol
        variants={fadeUp}
        className={`${card} flex gap-2 overflow-x-auto p-3 [scrollbar-width:none] lg:[scrollbar-width:thin] lg:h-0 lg:min-h-full lg:flex-col lg:overflow-y-auto`}
        aria-label="Chapters"
      >
        {CHAPTERS.map((c, i) => (
          <li key={c.t} className="shrink-0">
            <button
              onClick={() => seek(c.t)}
              aria-current={i === active ? 'true' : undefined}
              className={`flex w-full items-center gap-3 rounded-2xl px-3 py-2 text-left text-sm transition-colors ${
                i === active ? 'bg-cp-ink text-cp-ink-inverse' : 'text-cp-ink hover:bg-cp-accent-soft'
              }`}
            >
              <span className={`tabular-nums text-xs font-bold ${i === active ? 'opacity-70' : 'text-cp-muted'}`}>
                {fmtTime(c.t)}
              </span>
              <span className="whitespace-nowrap font-semibold">{c.label}</span>
            </button>
          </li>
        ))}
      </motion.ol>
    </div>
  );
}

/* ---------------------------------------------------------------- page */

export default function AboutPage() {
  const { isDarkMode } = useTheme();
  const router = useRouter();
  const account = useChainPotAccount();
  const [wantsDashboard, setWantsDashboard] = useState(false);

  useEffect(() => {
    if (wantsDashboard && account.isConnected) router.push('/dashboard');
  }, [wantsDashboard, account.isConnected, router]);

  const start = () => {
    setWantsDashboard(true);
    if (!account.isConnected) account.login();
  };

  return (
    <main
      className={`min-h-screen overflow-x-hidden bg-cp-page text-cp-ink transition-colors duration-300 ${
        isDarkMode ? '' : 'bg-gradient-to-br from-purple-100 via-purple-50 to-purple-200'
      }`}
    >
      <Navbar isDarkMode={isDarkMode} />

      {/* ---------------------------------------------------------- hero */}
      <section className="relative">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-60 [background-image:radial-gradient(var(--cp-line-soft)_1px,transparent_1px)] [background-size:22px_22px] [mask-image:radial-gradient(ellipse_at_center,black_40%,transparent_75%)]"
        />
        <div className="relative mx-auto grid max-w-6xl items-center gap-12 px-4 pb-16 pt-10 sm:px-6 md:grid-cols-[1.15fr_1fr] md:px-12 md:pb-24 md:pt-16">
          <Reveal onMount>
            <Eyebrow>About ChainPot</Eyebrow>
            <motion.h1
              variants={fadeUp}
              className={`mt-4 text-5xl leading-[0.95] tracking-tight text-cp-ink sm:text-6xl lg:text-7xl ${clashDisplaySemibold.className}`}
            >
              Save together.
              <br />
              <span className="text-cp-accent">Trust the code.</span>
            </motion.h1>
            <motion.p variants={fadeUp} className="mt-6 max-w-xl text-lg leading-relaxed text-cp-muted">
              ChainPot is the savings circle your family already knows (chit fund, committee, kitty) running on
              audited smart contracts. Everyone chips in each round, one person takes the pot, and nobody has to
              hold the money or chase payments.
            </motion.p>
            <motion.div variants={fadeUp} className="mt-8 flex flex-col gap-3 sm:flex-row">
              <button
                onClick={start}
                className="rounded-full bg-cp-ink px-8 py-3.5 text-base font-bold text-cp-ink-inverse shadow-lg transition-transform hover:-translate-y-0.5 active:translate-y-0"
              >
                Start a circle
              </button>
              <a
                href="#demo"
                className="rounded-full border-3 border-cp-line px-8 py-3 text-center text-base font-bold text-cp-ink transition-colors hover:bg-cp-accent-soft"
              >
                ▶ Watch the 2-min demo
              </a>
            </motion.div>
            <motion.ul variants={fadeUp} className="mt-8 flex flex-wrap gap-2">
              {['Audited by Certora', 'Built on Base', 'No gas fees', 'No seed phrase', 'Chainlink fair draw'].map(
                (chip) => (
                  <li
                    key={chip}
                    className="rounded-full border border-cp-line-soft bg-cp-surface px-3 py-1.5 text-xs font-bold text-cp-ink"
                  >
                    {chip}
                  </li>
                ),
              )}
            </motion.ul>
          </Reveal>

          <motion.div
            initial={{ opacity: 0, scale: 0.92 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1], delay: 0.15 }}
          >
            <CircleVisual />
          </motion.div>
        </div>
      </section>

      {/* ---------------------------------------------------------- stats */}
      <section className="border-y-3 border-cp-line bg-cp-ink text-cp-ink-inverse">
        <div className="mx-auto grid max-w-6xl grid-cols-2 gap-px px-4 sm:px-6 md:grid-cols-4 md:px-12">
          {[
            ['$0', 'gas you ever pay'],
            ['1 tap', 'to pay a round'],
            ['100%', 'of the rules on-chain'],
            ['0', 'people who can take the money'],
          ].map(([big, small]) => (
            <div key={small} className="py-8 text-center md:py-10">
              <p className={`text-4xl md:text-5xl ${clashDisplaySemibold.className}`}>{big}</p>
              <p className="mt-1 text-sm font-semibold opacity-70">{small}</p>
            </div>
          ))}
        </div>
      </section>

      <div className="mx-auto max-w-6xl space-y-28 px-4 py-24 sm:px-6 md:px-12">
        {/* ------------------------------------------------------- demo */}
        <section id="demo" className="scroll-mt-24">
          <Reveal>
            <Eyebrow>See it in action</Eyebrow>
            <SectionTitle>A whole circle, start to finish.</SectionTitle>
            <motion.p variants={fadeUp} className="mb-8 mt-4 max-w-2xl text-lg text-cp-muted">
              Five friends, one circle, real transactions on Base. Jump to any chapter.
            </motion.p>
            <DemoVideo />
          </Reveal>
        </section>

        {/* ------------------------------------------------- the idea */}
        <section>
          <div className="grid items-start gap-10 md:grid-cols-2">
            <Reveal>
              <Eyebrow>The idea</Eyebrow>
              <SectionTitle>An old idea that works. Now without the trust problem.</SectionTitle>
              <motion.p variants={fadeUp} className="mt-5 text-lg leading-relaxed text-cp-muted">
                Hundreds of millions of people save in rotating circles. A group agrees on an amount, everyone pays
                in each round, and one member takes the whole pot. It builds discipline and gives people a lump
                sum without a bank loan.
              </motion.p>
              <motion.p variants={fadeUp} className="mt-4 text-lg leading-relaxed text-cp-muted">
                The weak spot has always been people: an organiser who holds the cash, a draw someone can fix, a
                notebook only one person can see. ChainPot replaces all of that with code anyone can check.
              </motion.p>
              <motion.div variants={fadeUp} className="mt-6 grid grid-cols-2 gap-3">
                {[
                  ['Before', 'Organiser holds the cash'],
                  ['ChainPot', 'Audited vault holds it'],
                  ['Before', 'Draw in someone’s living room'],
                  ['ChainPot', 'Verifiable Chainlink draw'],
                ].map(([tag, text], i) => (
                  <div
                    key={i}
                    className={`rounded-2xl p-4 ${
                      tag === 'Before' ? 'bg-cp-danger-soft' : 'bg-cp-success-soft'
                    }`}
                  >
                    <p
                      className={`text-[11px] font-bold uppercase tracking-widest ${
                        tag === 'Before' ? 'text-cp-danger' : 'text-cp-success'
                      }`}
                    >
                      {tag}
                    </p>
                    <p className="mt-1 text-sm font-semibold text-cp-ink">{text}</p>
                  </div>
                ))}
              </motion.div>
            </Reveal>
            <Reveal>
              <RoundExplorer />
            </Reveal>
          </div>
        </section>

        {/* -------------------------------------------------- steps */}
        <section>
          <Reveal>
            <Eyebrow>How it works</Eyebrow>
            <SectionTitle>Six steps. Every one is a single tap.</SectionTitle>
            <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {STEPS.map((s, i) => (
                <motion.div
                  key={s.title}
                  variants={fadeUp}
                  whileHover={{ y: -4 }}
                  className={`${card} group relative overflow-hidden p-6`}
                >
                  <span
                    className={`absolute -right-2 -top-6 text-[120px] leading-none text-cp-accent-soft transition-colors group-hover:text-cp-accent/25 ${clashDisplaySemibold.className}`}
                    aria-hidden
                  >
                    {i + 1}
                  </span>
                  <span className="relative flex h-10 w-10 items-center justify-center rounded-full bg-cp-ink text-sm font-black text-cp-ink-inverse">
                    {i + 1}
                  </span>
                  <h3 className="relative mt-5 text-xl font-black text-cp-ink">{s.title}</h3>
                  <p className="relative mt-2 text-sm leading-relaxed text-cp-muted">{s.body}</p>
                </motion.div>
              ))}
            </div>
          </Reveal>
        </section>

        {/* ----------------------------------------------- draw vs bid */}
        <section>
          <Reveal>
            <Eyebrow>Two kinds of circle</Eyebrow>
            <SectionTitle>Leave it to chance, or bid for it.</SectionTitle>
            <div className="mt-10 grid gap-4 md:grid-cols-2">
              <motion.div variants={fadeUp} className={`${card} p-7`}>
                <p className="text-4xl" aria-hidden>🎲</p>
                <h3 className="mt-4 text-2xl font-black text-cp-ink">Fair draw</h3>
                <p className="mt-2 text-cp-muted">
                  When payments close, Chainlink VRF picks the round’s receiver from members who have not had the
                  pot yet. The random number comes with a proof, so anyone can check nobody rigged it, not even the
                  organiser.
                </p>
                <p className="mt-5 rounded-2xl bg-cp-surface-muted p-4 text-sm font-semibold text-cp-ink">
                  Best for families and friends who just want to save.
                </p>
              </motion.div>
              <motion.div variants={fadeUp} className={`${card} p-7`}>
                <p className="text-4xl" aria-hidden>🔨</p>
                <h3 className="mt-4 text-2xl font-black text-cp-ink">Bidding</h3>
                <p className="mt-2 text-cp-muted">
                  Need money early? Bid the amount you’d accept. The lowest bid wins the pot, and the difference is
                  shared with everyone else.
                </p>
                <div className="mt-5 rounded-2xl bg-cp-surface-muted p-4 text-sm text-cp-ink">
                  <p className="font-semibold">Example: pot of ${POT}</p>
                  <p className="mt-1 text-cp-muted">
                    Rahul bids $230 and wins. He takes $230 now; the other four split the $20 difference: $5 each.
                  </p>
                </div>
              </motion.div>
            </div>
          </Reveal>
        </section>

        {/* -------------------------------------------------- features */}
        <section>
          <Reveal>
            <Eyebrow>Made for real people</Eyebrow>
            <SectionTitle>Feels like a normal app. Because it should.</SectionTitle>
            <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {FEATURES.map((f) => (
                <motion.div key={f.title} variants={fadeUp} className={`${card} p-6`}>
                  <span
                    className="flex h-12 w-12 items-center justify-center rounded-2xl bg-cp-accent-soft text-2xl"
                    aria-hidden
                  >
                    {f.icon}
                  </span>
                  <h3 className="mt-4 text-lg font-black text-cp-ink">{f.title}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-cp-muted">{f.body}</p>
                </motion.div>
              ))}
            </div>
          </Reveal>
        </section>

        {/* ----------------------------------------------------- trust */}
        <section>
          <Reveal>
            <motion.div variants={fadeUp} className="overflow-hidden rounded-[2rem] bg-cp-ink p-7 text-cp-ink-inverse sm:p-10 md:p-14">
              <p className="text-xs font-bold uppercase tracking-[0.2em] opacity-60">Security</p>
              <h2 className={`mt-3 max-w-3xl text-4xl leading-[1.02] sm:text-5xl ${clashDisplaySemibold.className}`}>
                Your money follows rules, not people.
              </h2>
              <div className="mt-10 grid gap-x-10 gap-y-8 md:grid-cols-2">
                {TRUST.map((t, i) => (
                  <div key={t.title} className="flex gap-4">
                    <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 border-current text-xs font-black opacity-80">
                      {String(i + 1).padStart(2, '0')}
                    </span>
                    <div>
                      <h3 className="text-lg font-black">{t.title}</h3>
                      <p className="mt-1 text-sm leading-relaxed opacity-70">{t.body}</p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-10 rounded-2xl border border-current/20 p-5">
                <p className="text-xs font-bold uppercase tracking-widest opacity-60">Check the contracts yourself · Base Sepolia</p>
                <ul className="mt-3 grid gap-2 sm:grid-cols-2">
                  {CONTRACTS.map((c) => (
                    <li key={c.address} className="min-w-0">
                      <a
                        href={`https://sepolia.basescan.org/address/${c.address}`}
                        target="_blank"
                        rel="noreferrer"
                        className="group flex items-baseline gap-2 text-sm"
                      >
                        <span className="font-bold">{c.name}</span>
                        <span className="truncate font-mono text-xs opacity-60 group-hover:opacity-100 group-hover:underline">
                          {c.address.slice(0, 10)}…{c.address.slice(-6)} ↗
                        </span>
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            </motion.div>
          </Reveal>
        </section>

        {/* ------------------------------------------------------- FAQ */}
        <section id="faq" className="grid scroll-mt-24 gap-10 md:grid-cols-[1fr_2fr]">
          <Reveal>
            <Eyebrow>Questions</Eyebrow>
            <SectionTitle>Good to know.</SectionTitle>
            <motion.p variants={fadeUp} className="mt-4 text-cp-muted">
              Every question we’ve been asked, answered straight. Still unsure? Ask us on{' '}
              <a href="https://x.com/_chainpot" target="_blank" rel="noreferrer" className="font-bold text-cp-accent underline-offset-4 hover:underline">
                X @_chainpot
              </a>
              .
            </motion.p>
          </Reveal>
          <Reveal>
            <motion.div variants={fadeUp}>
              <Faq cardClass={card} />
            </motion.div>
          </Reveal>
        </section>

        {/* ------------------------------------------------------- CTA */}
        <section>
          <Reveal>
            <motion.div variants={fadeUp} className={`${card} relative overflow-hidden px-6 py-14 text-center sm:px-12`}>
              <div
                aria-hidden
                className="pointer-events-none absolute -left-24 -top-24 h-72 w-72 rounded-full bg-cp-accent-soft blur-3xl"
              />
              <div
                aria-hidden
                className="pointer-events-none absolute -bottom-24 -right-24 h-72 w-72 rounded-full bg-cp-success-soft blur-3xl"
              />
              <h2 className={`relative text-4xl sm:text-6xl text-cp-ink ${clashDisplaySemibold.className}`}>
                Grab your group.
              </h2>
              <p className="relative mx-auto mt-4 max-w-xl text-lg text-cp-muted">
                ChainPot is live on testnet. Start a circle with your people, try every step with test money, and
                tell us what you think.
              </p>
              <div className="relative mt-8 flex flex-col justify-center gap-3 sm:flex-row">
                <button
                  onClick={start}
                  className="rounded-full bg-cp-ink px-8 py-3.5 font-bold text-cp-ink-inverse shadow-lg transition-transform hover:-translate-y-0.5"
                >
                  Start a circle
                </button>
                <Link
                  href="/pots"
                  className="rounded-full border-3 border-cp-line px-8 py-3 font-bold text-cp-ink transition-colors hover:bg-cp-accent-soft"
                >
                  Browse open pots
                </Link>
              </div>
            </motion.div>
          </Reveal>
        </section>
      </div>

      <footer className="border-t border-cp-line-soft">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-4 py-8 text-sm text-cp-muted sm:flex-row sm:px-6 md:px-12">
          <p>
            <span className={`text-cp-ink ${clashDisplaySemibold.className}`}>ChainPot</span> · Save together. Trust the
            code.
          </p>
          <div className="flex flex-wrap justify-center gap-x-5 gap-y-2">
            <Link href="/" className="hover:text-cp-ink">Home</Link>
            <Link href="/pots" className="hover:text-cp-ink">Pots</Link>
            <Link href="/terms" className="hover:text-cp-ink">Terms</Link>
            <Link href="/risk" className="hover:text-cp-ink">Risks</Link>
            <Link href="/privacy" className="hover:text-cp-ink">Privacy</Link>
            <a href="https://x.com/_chainpot" target="_blank" rel="noreferrer" className="hover:text-cp-ink">X</a>
          </div>
        </div>
      </footer>
    </main>
  );
}
