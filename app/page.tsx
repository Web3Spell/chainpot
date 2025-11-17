'use client';

import { useCallback, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { clashDisplaySemibold } from './ui/fonts';
import { ConnectButton } from '@rainbow-me/rainbowkit';

export default function Home() {
  const [activeNav, setActiveNav] = useState('home');

  const navItems = [
    { id: 'home', label: 'Home', href: '#' },
    { id: 'pots', label: 'Pots', href: '#' },
    { id: 'about', label: 'About', href: '#' },
  ];

  return (
    <main className="relative w-full min-h-screen overflow-hidden bg-black">
      {/* Video Background */}
      <video
        className="fixed inset-0 w-full h-full object-cover  "
        autoPlay
        muted
        loop
        playsInline
      >
        <source
          src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/WhatsApp%20Video%202025-11-16%20at%2015.51.25-7Q0zg7TL8uPMESczkUAWRQfKkR1fMm.mp4"
          type="video/mp4"
        />
      </video>

      {/* Dark Gradient Overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-purple-900/30 to-black/50" />

      {/* Content */}
      <div className="relative z-10 flex flex-col h-full">
        {/* Header */}
        <header className="flex items-center justify-between px-6 md:px-12 py-6 md:py-8">
          {/* Logo */}
          <div className="flex items-center gap-3 group cursor-pointer hover:opacity-80 transition-opacity">
            <div className="relative w-10 h-10 flex items-center justify-center">
              <div className="w-full h-full rounded-full bg-white/10 border border-white/20 flex items-center justify-center">
                <span className="text-white font-bold text-lg">⛓</span>
              </div>
            </div>
            <span className={`text-white text-2xl tracking-tight ${clashDisplaySemibold.className}`}>ChainPot</span>
          </div>

          {/* Navigation */}
          <nav className="hidden md:flex items-center gap-8 px-8 py-3 rounded-full bg-white/5 border border-white/20 backdrop-blur-md">
            {navItems.map((item) => (
              <Link
                key={item.id}
                href={item.href}
                onClick={() => setActiveNav(item.id)}
                className={`text-sm font-medium transition-colors duration-300 ${
                  activeNav === item.id
                    ? 'text-white border-b-2 border-white pb-1'
                    : 'text-white/70 hover:text-white'
                }`}
              >
                {item.label}
              </Link>
            ))}
          </nav>

          {/* Connect Wallet Button */}
            <ConnectButton/>
        </header>

        {/* Main Content */}
        <div className="flex-1 flex flex-col items-center justify-center mt-18 md:mt-54 px-6 md:px-12 pb-16 md:pb-24 " >
          <div className="h-8 md:h-12" />

          {/* Main Heading */}
          <div className="text-center space-y-6 max-w-6xl flex-1 flex flex-col justify-center">
            <h1 className="text-7xl sm:text-8xl md:text-9xl lg:text-[221px] font-bold text-white leading-none tracking-tight">
              <span className={`text-transparent bg-clip-text bg-gradient-to-r from-white via-white to-white/80 ${clashDisplaySemibold.className}`}>
                ChainPot
              </span>
            </h1>

            {/* Tagline */}
            <p className="text-lg md:text-xl text-white/80 leading-relaxed font-light max-w-3xl mx-auto">
              Revolutionary rotating savings and credit associations powered by blockchain. Pool funds, earn yield, and access capital through transparent Dutch auctions.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col md:flex-row items-center justify-center gap-4 pt-8">
              <a href='/dashboard'>
              <button className="px-10 py-3 rounded-full bg-white text-black font-semibold text-base hover:bg-white/90 transition-colors duration-300 shadow-lg hover:shadow-xl">
                Get Started
              </button>
              </a>
              <button className="px-10 py-3 rounded-full bg-white/10 text-white font-semibold text-base border border-white/30 hover:bg-white/20 transition-colors duration-300 backdrop-blur-sm">
                Learn More
              </button>
              
            </div>
            
          </div>

        </div>

        {/* Footer hint */}
        <footer className="text-center py-6 text-white/40 text-sm">
          © 2025 ChainPot. All rights reserved.
        </footer>
      </div>
    </main>
  );
}
