import type { Metadata } from 'next'
import './globals.css'
import { urbanist } from './ui/fonts'
import { Providers } from '@/providers/WalletProviders'
import { ThemeProvider } from '@/providers/theme-provider'

export const metadata: Metadata = {
  title: 'ChainPot — Rotating savings with friends',
  description: 'Save together in a rotating pot: everyone contributes each round, one member receives the pot, and waiting money earns interest.',
  icons: {
    icon: [
      {
        url: '/images/logo-white.svg',
        media: '(prefers-color-scheme: light)',
      },
      {
        url: '/images/logo-black.svg',
        media: '(prefers-color-scheme: dark)',
      }
    ],

  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className={`${urbanist.className}`}>
        <ThemeProvider>
        <Providers>
        {children}
        </Providers>
        </ThemeProvider>
       </body>
    </html>
  )
}
