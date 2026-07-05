#!/bin/zsh
set -e
cd /Users/rythme/developer/blockchain/chainpot/marketing-video

typeset -A NAMES
NAMES[ShortU]=21-vanishing-organizer
NAMES[ShortV]=22-spot-the-fake
NAMES[ShortW]=23-older-than-banks
NAMES[ShortX]=24-stokvels
NAMES[ShortY]=25-resilience
NAMES[ShortZ]=26-loud-budgeting
NAMES[ShortAA]=27-built-on-a-circle
NAMES[ShortBB]=28-stablecoin-rails
NAMES[ShortCC]=29-not-gambling
NAMES[ShortDD]=30-not-your-keys

for S in ShortU ShortV ShortW ShortX ShortY ShortZ ShortAA ShortBB ShortCC ShortDD; do
  echo "=== RENDER $S -> chainpot-${NAMES[$S]} ==="
  npx remotion render $S out/_raw_$S.mp4 --crf 18 --color-space bt709 --concurrency 6 --timeout 120000
  ffmpeg -y -i out/_raw_$S.mp4 -c:v copy -af "alimiter=level_in=1:limit=0.89:attack=5:release=60" -c:a aac -b:a 256k out/chainpot-${NAMES[$S]}.mp4
  rm -f out/_raw_$S.mp4
  echo "=== DONE chainpot-${NAMES[$S]}.mp4 ==="
done
echo "ALL 10 RENDERS COMPLETE"
