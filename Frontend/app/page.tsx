'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAccount } from 'wagmi';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { motion, useAnimation } from 'framer-motion';
import { clashDisplaySemibold } from './ui/fonts';

import { useIsRegistered, useRegisterMember } from '@/hooks/useMemberManagerAccount';
import Image from 'next/image';

export default function Home() {
  const router = useRouter();
  const { address, isConnected } = useAccount();

  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [checkingStatus, setCheckingStatus] = useState(false);

  const {
    data: isRegistered,
    isLoading: isCheckingRegistration,
    isFetched: isRegistrationFetched,
    refetch: refetchRegistration,
  } = useIsRegistered(address as `0x${string}`);

  const { registerMember, isPending: isRegistering } = useRegisterMember();

  const [activeNav, setActiveNav] = useState('home');

  const navItems = [
    { id: 'home', label: 'Home', href: '/' },
    { id: 'pots', label: 'Pots', href: '/pots' },
    { id: 'about', label: 'About', href: '/' },
  ];

  const ensureRegistrationState = async () => {
    if (!address) return null;
    if (!isRegistrationFetched) {
      setCheckingStatus(true);
      try {
        await refetchRegistration?.();
      } catch (e) {
        // ignore
      } finally {
        setCheckingStatus(false);
      }
    }
    return isRegistered;
  };

  const handleGetStarted = async () => {
    if (!isConnected || !address) {
      alert('Please connect your wallet first.');
      return;
    }

    if (isCheckingRegistration) {
      setCheckingStatus(true);
      return;
    }

    await ensureRegistrationState();

    if (isRegistered === true) {
      router.push('/dashboard');
      return;
    }

    if (isRegistered === false) {
      setShowRegisterModal(true);
      return;
    }

    setCheckingStatus(true);
    try {
      await refetchRegistration?.();
      if (isRegistered === true) {
        router.push('/dashboard');
      } else {
        setShowRegisterModal(true);
      }
    } catch (err) {
      console.error('Error checking registration:', err);
      alert('Could not verify registration. Try again.');
    } finally {
      setCheckingStatus(false);
    }
  };

  const handleRegister = async () => {
    if (!address) return alert('Wallet not connected');

    try {
      const tx: any = await registerMember(address as `0x${string}`);
      if (tx && typeof tx.wait === 'function') {
        await tx.wait();
        if (tx.success) {
          console.log("txn has succeeded");
          setCheckingStatus(true);
          await refetchRegistration?.();
          setShowRegisterModal(false);
          router.push('/dashboard');
        } else {
          console.log("tx failed maybe", tx);
          router.push('/');
        }
      } else {
        await new Promise((r) => setTimeout(r, 2000));
        setCheckingStatus(true);
      }
    } catch (err: any) {
      console.error('Registration error', err);
      alert(err?.message || 'Registration failed. See console for details.');
    } finally {
      setCheckingStatus(false);
    }
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

  const itemVariants: any = {
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

  const headerVariants: any = {
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

  const titleVariants: any = {
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

  const buttonVariants: any= {
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

  const modalVariants: any = {
    hidden: { opacity: 0, scale: 0.8, y: 50 },
    visible: {
      opacity: 1,
      scale: 1,
      y: 0,
      transition: {
        duration: 0.4,
        ease: [0.6, 0.05, 0.01, 0.9],
      },
    },
    exit: {
      opacity: 0,
      scale: 0.8,
      y: 50,
      transition: {
        duration: 0.3,
      },
    },
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
            <ConnectButton />
          </motion.div>
        </motion.header>

        {/* Main Section */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="flex-1 flex flex-col items-center justify-center px-6 md:px-12 pb-16 md:pb-24 mt-48"
        >
          <div className="h-8 md:h-12" />

          {/* Heading */}
          <div className="text-center space-y-6 max-w-6xl flex-1 flex flex-col justify-center">
            <motion.h1
              variants={titleVariants}
              className="text-7xl sm:text-8xl md:text-9xl lg:text-[251px] text-white font-bold"
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
              Revolutionary rotating savings and credit associations powered by blockchain.
            </motion.p>

            <motion.div
              variants={itemVariants}
              className="flex flex-col md:flex-row items-center justify-center gap-4 pt-8"
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
          className="text-center py-6 text-white/40 text-sm"
        >
          © 2025 ChainPot. All rights reserved.
        </motion.footer>
      </div>

      {/* REGISTER MODAL + LOADING */}
      {(showRegisterModal || checkingStatus) && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md"
        >
          <motion.div
            variants={modalVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="rounded-2xl p-8 w-[90%] max-w-md text-center shadow-xl backdrop-blur-lg bg-white/5 border border-white/20"
          >
            {checkingStatus ? (
              <div className="flex flex-col items-center justify-center py-6">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                  className="w-12 h-12 border-4 border-white/30 border-t-white rounded-full"
                />
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.2 }}
                  className="text-white/80 mt-4"
                >
                  Please wait...
                </motion.p>
              </div>
            ) : (
              <>
                <motion.h2
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-white text-2xl font-semibold mb-4"
                >
                  Complete Registration
                </motion.h2>

                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.1 }}
                  className="text-white/70 mb-6"
                >
                  You are not registered yet.
                  <br />
                  Press the button below to register your account on-chain.
                </motion.p>

                <motion.button
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleRegister}
                  disabled={isRegistering}
                  className="w-full py-3 rounded-full text-sm font-semibold transition-all bg-white text-black hover:bg-white/90"
                >
                  {isRegistering ? (
                    <div className="flex items-center justify-center gap-2">
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                        className="w-4 h-4 border-2 border-black/40 border-t-black rounded-full"
                      />
                      Registering...
                    </div>
                  ) : (
                    'Register'
                  )}
                </motion.button>

                <motion.button
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  whileHover={{ scale: 1.02, backgroundColor: 'rgba(255, 255, 255, 0.1)' }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setShowRegisterModal(false)}
                  className="w-full mt-4 py-3 rounded-full transition-all border border-white/30 text-white"
                >
                  Cancel
                </motion.button>
              </>
            )}
          </motion.div>
        </motion.div>
      )}
    </main>
  );
}