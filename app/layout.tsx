import type { Metadata } from 'next'
import './globals.css'
import { urbanist } from './ui/fonts'
import { Providers } from '@/providers/WalletProviders'
import { ThemeProvider } from '@/providers/theme-provider'

export const metadata: Metadata = {
  title: 'ChainPot - Blockchain Savings & Credit',
  description: 'Revolutionary rotating savings and credit associations powered by blockchain. Pool funds, earn yield, and access capital through transparent Dutch auctions.',
  generator: 'v0.app',
  icons: {
    icon: [
      {
        url: '/icon-light-32x32.png',
        media: '(prefers-color-scheme: light)',
      },
      {
        url: '/icon-dark-32x32.png',
        media: '(prefers-color-scheme: dark)',
      },
      {
        url: '/icon.svg',
        type: 'image/svg+xml',
      },
    ],
    apple: '/apple-icon.png',
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
