# Brand — ChainPot

_Status: active (documents the existing look, 2026-10-26)_

## Personality
Warm, trustworthy, community-first. A savings circle with friends, not a trading terminal. Plain
language over crypto vocabulary (see the vocabulary map in `docs/FRONTEND_UX_AA_PLAN.md`).

## Palette (tokens in `Frontend/app/globals.css`, Tailwind classes `*-cp-*`)
| Token | Light | Dark | Use |
|---|---|---|---|
| `cp-page` | soft lavender | black | page background |
| `cp-surface` | white 92% | white 5% | cards |
| `cp-surface-muted` | lavender 97% | white 8% | inset panels |
| `cp-ink` | near-black | near-white | text, primary buttons, signature borders |
| `cp-muted` | violet-gray (≥4.5:1) | light gray | secondary text |
| `cp-line` | near-black | white 25% | thick card borders (border-3) |
| `cp-accent` | ChainPot violet | lighter violet | highlights, progress, links |
| `cp-success` / `cp-warn` / `cp-danger` (+ `-soft`) | | | paid / due soon / missed |

## Shape
Thick 3px `cp-line` borders on cards, `rounded-2xl`/`rounded-3xl` cards, fully rounded (pill)
buttons. Primary button = `cp-ink` fill with `cp-ink-inverse` text; secondary = 3px outline.

## Typography
Urbanist (UI, all weights) via `next/font`; ClashDisplay Semibold for the wordmark and hero headings.
Big, bold headings (`font-black`), body `text-sm`/`text-base`.

## Voice
Short, active, specific: "Pay $50 by Friday", "You received the pot 🎉", "Bidding opens Friday 6 PM".
Amounts: local currency estimate first with exact dollars beside it.
