'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import { Users, Gift, ShieldCheck, type LucideIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { clashDisplaySemibold } from '@/app/ui/fonts';

interface Slide {
  icon: LucideIcon;
  title: string;
  body: string;
}

const SLIDES: Slide[] = [
  {
    icon: Users,
    title: 'Save together',
    body: 'A circle is a small group who trust each other. Everyone puts in the same amount each round — like a savings club.',
  },
  {
    icon: Gift,
    title: 'Everyone gets a turn',
    body: 'Each round, one member receives the whole pot. The order is a fair draw or a bid — and everyone receives exactly once.',
  },
  {
    icon: ShieldCheck,
    title: 'No crypto hassle',
    body: "No wallet, no gas, no seed phrase. Pay in your own currency and we'll remind you before every due date.",
  },
];

/**
 * One-time welcome shown to a newly signed-in person. Explains the savings-circle idea in plain
 * language before dropping them on an empty dashboard. Dismissing is always available (Skip / Escape).
 */
export function WelcomeOnboarding({ onDone }: { onDone: () => void }) {
  const router = useRouter();
  const [i, setI] = useState(0);
  const cardRef = useRef<HTMLDivElement>(null);
  const last = i === SLIDES.length - 1;

  useEffect(() => {
    cardRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onDone();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onDone]);

  const next = () => (last ? finish('/pots/create') : setI((n) => n + 1));
  const finish = (href?: string) => {
    onDone();
    if (href) router.push(href);
  };

  const slide = SLIDES[i];
  const Icon = slide.icon;

  return createPortal(
    <div
      className="fixed inset-0 z-[95] flex items-end md:items-center justify-center bg-black/60 backdrop-blur-sm p-0 md:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="welcome-title"
    >
      <div
        ref={cardRef}
        tabIndex={-1}
        className="w-full md:max-w-md bg-cp-surface text-cp-ink rounded-t-3xl md:rounded-3xl border-3 border-cp-line p-6 md:p-8 shadow-2xl focus:outline-none"
      >
        <div className="flex items-center justify-between mb-6">
          <span className="text-xs font-bold text-cp-muted">Welcome to ChainPot</span>
          <button
            type="button"
            onClick={() => finish()}
            className="h-11 px-3 -mr-2 inline-flex items-center rounded-full text-sm font-bold text-cp-muted hover:bg-cp-line-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cp-accent"
          >
            Skip
          </button>
        </div>

        <div key={i} className="motion-safe:animate-[fadeIn_200ms_ease-out]">
          <div className="h-16 w-16 rounded-2xl bg-cp-accent/15 text-cp-accent grid place-items-center mb-5">
            <Icon className="h-8 w-8" aria-hidden="true" />
          </div>
          <h2 id="welcome-title" className={`text-3xl mb-2 ${clashDisplaySemibold.className}`}>
            {slide.title}
          </h2>
          <p className="text-cp-muted text-base leading-relaxed">{slide.body}</p>
        </div>

        <div className="flex items-center gap-2 mt-8" aria-hidden="true">
          {SLIDES.map((_, n) => (
            <span
              key={n}
              className={`h-1.5 rounded-full transition-all duration-200 ${n === i ? 'w-6 bg-cp-ink' : 'w-1.5 bg-cp-line-soft'}`}
            />
          ))}
        </div>

        <div className="flex gap-3 mt-6">
          {i > 0 && (
            <Button variant="secondary" onClick={() => setI((n) => n - 1)} aria-label="Previous">
              Back
            </Button>
          )}
          <Button onClick={next} size="lg" className="flex-1">
            {last ? 'Start a circle' : 'Next'}
          </Button>
        </div>
        {last && (
          <button
            type="button"
            onClick={() => finish()}
            className="w-full mt-3 min-h-11 text-sm font-bold text-cp-muted hover:text-cp-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cp-accent rounded-full"
          >
            I&apos;ll look around first
          </button>
        )}
      </div>
    </div>,
    document.body,
  );
}
