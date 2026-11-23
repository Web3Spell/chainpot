'use client';

import { Plus } from 'lucide-react';
import { ButtonLink } from '@/components/ui/button';

export function PotsHero({}: { isDarkMode?: boolean }) {
  return (
    <section className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4 text-cp-ink">
      <div>
        <h1 className="text-4xl md:text-5xl font-black">Explore circles</h1>
        <p className="text-cp-muted mt-2 max-w-xl">
          Circles are invite-only. Got an invite link from a friend? Open it to join. Or start your own and invite the people you trust.
        </p>
      </div>
      <ButtonLink href="/pots/create" size="lg"><Plus className="h-5 w-5" aria-hidden="true" /> Start a circle</ButtonLink>
    </section>
  );
}
