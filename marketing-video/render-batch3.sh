#!/bin/zsh
set -e
cd /Users/rythme/developer/blockchain/chainpot/marketing-video

typeset -A NAMES
NAMES[ShortK]=11-why-base
NAMES[ShortL]=12-bidding-game
NAMES[ShortM]=13-provably-fair
NAMES[ShortN]=14-never-stuck
NAMES[ShortO]=15-open-books
NAMES[ShortP]=16-cycle-math
NAMES[ShortQ]=17-vs-alternatives
NAMES[ShortR]=18-for-women
NAMES[ShortS]=19-defaults
NAMES[ShortT]=20-roadmap

for S in ShortK ShortL ShortM ShortN ShortO ShortP ShortQ ShortR ShortS ShortT; do
  echo "=== RENDER $S -> chainpot-${NAMES[$S]} ==="
  npx remotion render $S out/_raw_$S.mp4 --crf 18 --color-space bt709 --concurrency 8
  ffmpeg -y -i out/_raw_$S.mp4 -c:v copy -af "alimiter=level_in=1:limit=0.89:attack=5:release=60" -c:a aac -b:a 256k out/chainpot-${NAMES[$S]}.mp4
  rm -f out/_raw_$S.mp4
  echo "=== DONE chainpot-${NAMES[$S]}.mp4 ==="
done
echo "ALL 10 RENDERS COMPLETE"
