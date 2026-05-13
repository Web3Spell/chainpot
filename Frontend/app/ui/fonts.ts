// app/ui/fonts.ts
import localFont from 'next/font/local';
import { Urbanist } from 'next/font/google';

export const urbanist = Urbanist({
  subsets: ['latin'],
  display: 'swap', // 'swap' is recommended to avoid layout shift
  variable: '--font-urbanist', // Optional CSS variable name
  weight: ['100', '200', '300', '400', '500', '600', '700', '800', '900'], // Specify all desired weights
});

export const clashDisplaySemibold = localFont({
  src: '../../public/fonts/ClashDisplay-Semibold.woff2',
  weight: '600',
  style: 'normal',
});

export const clashDisplayVariable = '--font-clash-display';