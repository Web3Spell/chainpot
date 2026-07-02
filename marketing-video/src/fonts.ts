import { continueRender, delayRender, staticFile } from 'remotion';

// Load the brand display face (Clash Display Semibold) from the live site's woff2.
// Body/mono fall back to Geist/system fonts which render crisply without a network fetch.
let loaded = false;

export const loadFonts = () => {
  if (loaded || typeof document === 'undefined') return;
  loaded = true;

  const handle = delayRender('Loading Clash Display');

  const style = document.createElement('style');
  style.textContent = `
    @font-face {
      font-family: 'Clash Display';
      src: url('${staticFile('fonts/ClashDisplay-Semibold.woff2')}') format('woff2');
      font-weight: 600;
      font-style: normal;
      font-display: block;
    }
  `;
  document.head.appendChild(style);

  // Force the face to actually load before we let the frame render.
  const fontFace = new FontFace(
    'Clash Display',
    `url('${staticFile('fonts/ClashDisplay-Semibold.woff2')}') format('woff2')`,
    { weight: '600' }
  );
  fontFace
    .load()
    .then((f) => {
      (document as any).fonts.add(f);
      continueRender(handle);
    })
    .catch(() => continueRender(handle));
};
