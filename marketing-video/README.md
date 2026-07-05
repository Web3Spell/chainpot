# ChainPot — 30s marketing reel (Remotion)

A code-driven, brand-matched 30-second vertical reel for ChainPot. Dark theme pulled
directly from the live site (`Frontend/app/globals.css`): pure-black canvas, white type,
violet glow, Clash Display headlines, glassmorphism. Showcases the two ROSCA winner
modes, the core features, and the target audience.

## Output (`out/`)
- `chainpot-reel.mp4` — the flagship brand reel (1080×1920 · 30s · AAC)
- **Weekly X shorts** (30 angles, each its own music track + infographics):
  - `chainpot-01-world-usage.mp4` — world map of ROSCA names + World Bank/IFC data
  - `chainpot-02-for-business.mp4` — B2B working-capital + bank comparison
  - `chainpot-03-for-community.mp4` — relationships / remittances
  - `chainpot-04-how-it-works.mp4` — 4-step explainer
  - `chainpot-05-trust-security.mp4` — non-custodial / no organizer can run away
  - `chainpot-06-yield.mp4` — Compound III yield, DeFi-native (area chart)
  - `chainpot-07-beat-inflation.mp4` — stablecoin circles vs inflation (decline chart)
  - `chainpot-08-reputation.mp4` — portable on-chain reputation (score gauge)
  - `chainpot-09-who-its-for.mp4` — the five personas
  - `chainpot-10-no-token.mp4` — no token / aligned incentives (pump-vs-payout chart)
  - `chainpot-11-why-base.mp4` — why Base: cheap, fast, proven rails
  - `chainpot-12-bidding-game.mp4` — lowest-bid auction, walked through
  - `chainpot-13-provably-fair.mp4` — Chainlink VRF kitty, provably fair
  - `chainpot-14-never-stuck.mp4` — recovery paths, no single point of freeze
  - `chainpot-15-open-books.mp4` — every event public + timestamped (Basescan log)
  - `chainpot-16-cycle-math.mp4` — a full cycle's economics, real numbers
  - `chainpot-17-vs-alternatives.mp4` — ChainPot vs bank/loan app/susu (matrix)
  - `chainpot-18-for-women.mp4` — built with women in mind (arisan 85–92%)
  - `chainpot-19-defaults.mp4` — what happens on default (rep slash, v4 collateral)
  - `chainpot-20-roadmap.mp4` — v3 → v4 → mainnet roadmap (timeline)
  - `chainpot-21-vanishing-organizer.mp4` — Hyderabad 2025 scam → custody is the contract
  - `chainpot-22-spot-the-fake.mp4` — "Blessing Loom" 800% pyramid vs a real circle (matrix)
  - `chainpot-23-older-than-banks.mp4` — 2,200-year history: China → Japan mujin → Base (timeline)
  - `chainpot-24-stokvels.mp4` — South Africa's R50bn/yr stokvels (stat cards)
  - `chainpot-25-resilience.mp4` — savings circles as a disaster shock-absorber
  - `chainpot-26-loud-budgeting.mp4` — Gen-Z "loud budgeting" with a payout
  - `chainpot-27-built-on-a-circle.mp4` — Koreatown built on a kye (step flow)
  - `chainpot-28-stablecoin-rails.mp4` — stablecoins moved ~$46T, ~3× Visa (bar chart)
  - `chainpot-29-not-gambling.mp4` — 47% use stablecoins to save, not trade (donut)
  - `chainpot-30-not-your-keys.mp4` — FTX vs non-custodial; keep your keys (compare rows)
- `chainpot-reel.srt` — captions for the flagship reel
- `../POST_COPY.md` — captions for the flagship reel
- `../SHORTS_COPY.md` — ready-to-paste tweets + posting schedule for the 4 shorts

## Compositions (Remotion Studio / render targets)
`ChainPotReel` (flagship) · `ShortA`–`ShortDD` (the 30 weekly shorts).
Reusable parts: `src/infographics.tsx` (Counter, BarChart, Donut, NodeMap, StepFlow,
CompareRows, AreaChart, ComparisonMatrix, Timeline), `src/shortsKit.tsx` (TopMark,
LogoReveal, EndCard), `src/audioKit.tsx` (ShortAudio cue system). Data figures are
sourced from World Bank Global Findex 2021, IFC MSME Finance Gap, and World Bank
remittance data.

### Render the shorts
```bash
for S in ShortA ShortB ShortC ShortD; do
  npx remotion render $S out/_raw_$S.mp4 --crf 18 --color-space bt709
  ffmpeg -y -i out/_raw_$S.mp4 -c:v copy -af "alimiter=limit=0.89" -c:a aac -b:a 256k out/chainpot-$S.mp4
  rm out/_raw_$S.mp4
done
```
(Batches 2–3 use `render-batch3.sh` with the friendly-name map.)

## Audio
- **Continuous music bed** (`public/sfx/music.wav`) — an original 30s **hyperpop** track
  synthesized in numpy/scipy: 160 BPM, detuned 7-voice **supersaw** chords (i–VI–III–VII in
  A minor), a **distorted gliding 808**, a fast bright 16th arp, punchy kick + layered
  clap/snare + trap hats with snare-roll fills and crashes, hard **sidechain pump**, and
  tanh saturation glue. Front-loaded energy with an outro drop so the CTA lands clean.
- **Tonal SFX kit** (`impact`, `pop`, `bell`, `shimmer`, `swish`, `riser`) — all musical,
  no broadband noise (the old pink-noise "whoosh" was removed).
- Mastered with a true-peak limiter on export. Synth source: `scripts/synth.py`.
  Cue map: `src/AudioTrack.tsx` (`CUES`).

## Storyboard
| # | Scene | Beat |
|---|-------|------|
| 1 | Hook | "2B people save in circles — older than banks" |
| 2 | Problem | trust breaks: organizers vanish, math hidden, idle money earns nothing |
| 3 | Solution | ChainPot logo reveal — "the savings circle, inside a smart contract" |
| 4 | **Mode 01 — Lowest-Bid Auction** | bid low → win the pot → discount splits back to the circle |
| 5 | **Mode 02 — Kitty Lottery** | no bids → verifiable random winner via Chainlink VRF |
| 6 | Features / proof | yield · no organizer · reputation · audited · live on Base |
| 7 | Audience + CTA | "built for 2B savers" (Chennai…Berlin) → Get Started |

## Develop / re-render
```bash
npm install
npm run dev          # Remotion Studio — live preview & scrub
npm run render       # production MP4 → out/chainpot-reel.mp4
npm run render:draft # fast draft
```
All copy/timing lives in `src/scenes/*`; brand tokens in `src/theme.ts`.

## Notes
- A 16:9 landscape cut can be added as a second `<Composition>` reusing the same scenes.
