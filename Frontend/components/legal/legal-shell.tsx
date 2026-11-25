'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Navbar } from '@/components/dashboard/navbar';
import { useTheme } from '@/providers/theme-provider';
import { TERMS_UPDATED, TERMS_VERSION } from '@/lib/legal';
import { clashDisplaySemibold } from '@/app/ui/fonts';

const DOCS = [
  { href: '/terms', label: 'Terms of Service' },
  { href: '/risk', label: 'Risk Disclosure' },
  { href: '/privacy', label: 'Privacy Policy' },
];

export interface LegalSection {
  id: string;
  title: string;
  body: React.ReactNode;
}

/** Shared layout for /terms, /privacy and /risk: title, table of contents, numbered sections. */
export function LegalShell({ title, intro, sections }: { title: string; intro: React.ReactNode; sections: LegalSection[] }) {
  const { isDarkMode } = useTheme();
  const pathname = usePathname();

  return (
    <main className={`min-h-screen bg-cp-page text-cp-ink ${isDarkMode ? '' : 'bg-gradient-to-br from-purple-100 via-purple-50 to-purple-200'}`}>
      <Navbar isDarkMode={isDarkMode} />
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 md:px-12 md:py-16">
        <nav aria-label="Legal documents" className="flex gap-2 overflow-x-auto [scrollbar-width:none]">
          {DOCS.map((d) => (
            <Link
              key={d.href}
              href={d.href}
              aria-current={pathname === d.href ? 'page' : undefined}
              className={`shrink-0 whitespace-nowrap rounded-full px-4 py-2 text-sm font-bold transition-colors ${
                pathname === d.href ? 'bg-cp-ink text-cp-ink-inverse' : 'border border-cp-line-soft bg-cp-surface hover:bg-cp-accent-soft'
              }`}
            >
              {d.label}
            </Link>
          ))}
        </nav>

        <h1 className={`mt-8 text-4xl leading-tight sm:text-6xl ${clashDisplaySemibold.className}`}>{title}</h1>
        <p className="mt-2 text-sm font-semibold text-cp-muted">
          Last updated {TERMS_UPDATED} · version {TERMS_VERSION}
        </p>
        <div className="mt-6 max-w-3xl space-y-3 text-base leading-relaxed text-cp-muted">{intro}</div>

        <div className="mt-10 grid gap-10 lg:grid-cols-[240px_1fr]">
          <aside className="hidden lg:block">
            <ol className="sticky top-24 space-y-1 text-sm">
              {sections.map((s, i) => (
                <li key={s.id}>
                  <a href={`#${s.id}`} className="block rounded-xl px-3 py-1.5 text-cp-muted hover:bg-cp-accent-soft hover:text-cp-ink">
                    {i + 1}. {s.title}
                  </a>
                </li>
              ))}
            </ol>
          </aside>
          <div className="min-w-0 space-y-4">
            {sections.map((s, i) => (
              <section key={s.id} id={s.id} className="scroll-mt-24 rounded-3xl border-3 border-cp-line bg-cp-surface p-6 sm:p-8">
                <h2 className="text-xl font-black">
                  <span className="text-cp-accent">{i + 1}.</span> {s.title}
                </h2>
                <div className="legal-body mt-3 space-y-3 text-sm leading-relaxed text-cp-muted [&_li]:ml-5 [&_li]:list-disc [&_li]:pl-1 [&_strong]:text-cp-ink [&_ul]:space-y-1.5 [&_a]:font-semibold [&_a]:text-cp-accent [&_a]:underline-offset-4 hover:[&_a]:underline">
                  {s.body}
                </div>
              </section>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
