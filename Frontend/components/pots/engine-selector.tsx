"use client";

import type { Engine } from "@/lib/pot";

interface EngineSelectorProps {
  onSelect: (engine: Engine) => void;
  selected: Engine;
}

const OPTIONS: { value: Engine; icon: string; title: string; body: string; example: string }[] = [
  {
    value: "circle",
    icon: "🎲",
    title: "Take turns (fair draw)",
    body: "Each round a verifiably random draw picks who receives the pot. Everyone receives once. Best for family, friends and kitty parties.",
    example: "Everyone pays $50 → one person gets $500",
  },
  {
    value: "auction",
    icon: "🏦",
    title: "Bid for early payout",
    body: "Need money sooner? Bid to receive less than the full pot. The lowest bid wins and the difference is shared by everyone else.",
    example: "Take $450 now → the other members share $50",
  },
];

export default function EngineSelector({ onSelect, selected }: EngineSelectorProps) {
  return (
    <div role="radiogroup" aria-label="How the receiver is chosen" className="grid grid-cols-1 md:grid-cols-2 gap-3">
      {OPTIONS.map((o) => {
        const on = selected === o.value;
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={on}
            onClick={() => onSelect(o.value)}
            className={`p-5 rounded-2xl border-2 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cp-accent ${
              on ? "border-cp-ink bg-cp-accent-soft" : "border-cp-line-soft hover:border-cp-line"
            }`}
          >
            <span className="text-3xl" aria-hidden="true">{o.icon}</span>
            <span className="block text-lg font-bold mt-2">{o.title}</span>
            <span className="block text-sm text-cp-muted mt-1">{o.body}</span>
            <span className="block text-xs font-bold text-cp-accent mt-3">{o.example}</span>
          </button>
        );
      })}
    </div>
  );
}
