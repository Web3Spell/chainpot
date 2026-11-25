'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useChainPotAccount } from '@/lib/aa/account';
import { AccountButton } from '@/components/aa/account-button';
import { motion, type Variants } from 'framer-motion';
import { clashDisplaySemibold } from './ui/fonts';

import Image from 'next/image';

export default function Home() {
  const router = useRouter();
  const account = useChainPotAccount();
  const [wantsDashboard, setWantsDashboard] = useState(false);

  // Registration is folded into the first join/create, so "Get started" only needs a signed-in account.
  useEffect(() => {
    if (wantsDashboard && account.isConnected) router.push('/dashboard');
  }, [wantsDashboard, account.isConnected, router]);

  const [activeNav, setActiveNav] = useState('home');

  const navItems = [
    { id: 'home', label: 'Home', href: '/' },
    { id: 'pots', label: 'Pots', href: '/pots' },
    { id: 'about', label: 'About', href: '/about' },
  ];

  const handleGetStarted = () => {
    setWantsDashboard(true);
    if (!account.isConnected) account.login();
  };

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.15,
        delayChildren: 0.3,
      },
    },
  };

  const itemVariants: Variants = {
    hidden: { y: 30, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: {
        duration: 0.8,
        ease: [0.6, 0.05, 0.01, 0.9],
      },
    },
  };

  const headerVariants: Variants = {
    hidden: { y: -100, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: {
        duration: 0.8,
        ease: [0.6, 0.05, 0.01, 0.9],
      },
    },
  };

  const titleVariants: Variants = {
    hidden: { scale: 0.8, opacity: 0 },
    visible: {
      scale: 1,
      opacity: 1,
      transition: {
        duration: 1.2,
        ease: [0.6, 0.05, 0.01, 0.9],
      },
    },
  };

  const buttonVariants: Variants = {
    hidden: { scale: 0.8, opacity: 0 },
    visible: {
      scale: 1,
      opacity: 1,
      transition: {
        type: 'spring',
        stiffness: 100,
        damping: 15,
      },
    },
    hover: {
      scale: 1.05,
      transition: {
        type: 'spring',
        stiffness: 400,
        damping: 10,
      },
    },
    tap: { scale: 0.95 },
  };

  return (
    <main className="relative w-full min-h-screen overflow-hidden bg-black">
      {/* Background Video */}
      <motion.video
        initial={{ scale: 1.1, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 1.5, ease: 'easeOut' }}
        className="fixed inset-0 w-full h-full object-cover"
        autoPlay
        muted
        loop
        playsInline
      >
        <source
          src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/WhatsApp%20Video%202025-11-16%20at%2015.51.25-7Q0zg7TL8uPMESczkUAWRQfKkR1fMm.mp4"
          type="video/mp4"
        />
      </motion.video>

      {/* Animated Overlay */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1.5 }}
        className="absolute inset-0 bg-gradient-to-b from-transparent via-purple-900/30 to-black/50"
      />

      {/* Content */}
      <div className="relative z-10 flex flex-col h-full">
        {/* Animated Header */}
        <motion.header
          variants={headerVariants}
          initial="hidden"
          animate="visible"
          className="flex items-center justify-between px-6 md:px-12 py-6 md:py-8"
        >
          <motion.div
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="flex items-center gap-3 group cursor-pointer"
          >
            <motion.div
              className=" flex items-center justify-center"
            >
              <span className="text-white font-bold text-lg"><Image src="/images/logo-white.svg" alt="ChainPot" width={30} height={30} /></span>
            </motion.div>
            <span className={`text-white text-2xl tracking-tight ${clashDisplaySemibold.className}`}>
              ChainPot
            </span>
          </motion.div>

          <motion.nav
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.6 }}
            className="hidden md:flex items-center gap-8 px-8 py-3 rounded-full bg-white/5 border border-white/20 backdrop-blur-md"
          >
            {navItems.map((item, index) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 + index * 0.1 }}
              >
                <Link
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
              </motion.div>
            ))}
          </motion.nav>

          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.7, duration: 0.5 }}
          >
            <AccountButton isDarkMode />
          </motion.div>
        </motion.header>

        {/* Main Section */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="flex-1 flex flex-col items-center justify-center px-6 md:px-12 pb-2 md:pb-4 mt-32 md:mt-48"
        >
          {/* Heading */}
          <div className="text-center space-y-4 max-w-6xl flex-1 flex flex-col justify-center">
            <motion.h1
              variants={titleVariants}
              className="text-7xl sm:text-8xl md:text-9xl lg:text-[200px] xl:text-[240px] 2xl:text-[280px] text-white font-bold tracking-tight"
            >
              <motion.span
                animate={{
                  backgroundPosition: ['0% 50%', '100% 50%', '0% 50%'],
                }}
                transition={{
                  duration: 5,
                  repeat: Infinity,
                  ease: 'linear',
                }}
                className={`text-transparent bg-clip-text bg-gradient-to-r from-white via-purple-200 to-white bg-[length:200%_auto] ${clashDisplaySemibold.className}`}
              >
                ChainPot
              </motion.span>
            </motion.h1>

            <motion.p
              variants={itemVariants}
              className="text-lg md:text-xl text-white/80 leading-relaxed font-light max-w-3xl mx-auto"
            >
              Save together with people you trust. Everyone chips in each round, one person gets the pot, and waiting money earns interest.
            </motion.p>

            <motion.div
              variants={itemVariants}
              className="flex flex-col md:flex-row items-center justify-center gap-4 pt-2"
            >
              <motion.button
                variants={buttonVariants}
                whileHover="hover"
                whileTap="tap"
                onClick={handleGetStarted}
                className="px-10 py-3 rounded-full bg-white text-black font-semibold text-base shadow-lg hover:shadow-2xl transition-shadow duration-300"
              >
                Get Started
              </motion.button>

              <motion.button
                variants={buttonVariants}
                whileHover="hover"
                whileTap="tap"
                onClick={() => router.push('/about')}
                className="px-10 py-3 rounded-full bg-white/10 text-white font-semibold text-base border border-white/30 backdrop-blur-sm"
              >
                Learn More
              </motion.button>
            </motion.div>
          </div>
        </motion.div>

        <motion.footer
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.5 }}
          className="text-center py-2 text-white/40 text-sm"
        >
          © 2025 ChainPot. All rights reserved.
        </motion.footer>
      </div>

    </main>
  );
}