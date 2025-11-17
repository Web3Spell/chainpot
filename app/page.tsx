'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAccount } from 'wagmi';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { clashDisplaySemibold } from './ui/fonts';

import { useIsRegistered, useRegisterMember } from '@/hooks/useMemberManagerAccount';

export default function Home() {
  const router = useRouter();
  const { address, isConnected } = useAccount();

  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [checkingStatus, setCheckingStatus] = useState(false);

  // Call the hook only when address exists
  const {
    data: isRegistered,
    isLoading: isCheckingRegistration,
    isFetched: isRegistrationFetched,
    refetch: refetchRegistration,
  } = useIsRegistered(address as `0x${string}`);

  const { registerMember, isPending: isRegistering } = useRegisterMember();

  // NAV
  const [activeNav, setActiveNav] = useState('home');

  const navItems = [
    { id: 'home', label: 'Home', href: '#' },
    { id: 'pots', label: 'Pots', href: '#' },
    { id: 'about', label: 'About', href: '#' },
  ];

  // Helper that ensures we have the latest registration state
  const ensureRegistrationState = async () => {
    if (!address) return null;
    if (!isRegistrationFetched) {
      setCheckingStatus(true);
      try {
        await refetchRegistration?.();
      } catch (e) {
        // ignore; caller will handle
        // console.error(e);
      } finally {
        setCheckingStatus(false);
      }
    }
    return isRegistered;
  };

  // Handler for Get Started button
  const handleGetStarted = async () => {
    if (!isConnected || !address) {
      alert('Please connect your wallet first.');
      return;
    }

    // If the hook is actively fetching, show spinner
    if (isCheckingRegistration) {
      setCheckingStatus(true);
      return;
    }

    // Ensure we have fresh data
    await ensureRegistrationState();

    // After ensuring, evaluate the value
    if (isRegistered === true) {
      router.push('/dashboard');
      return;
    }

    // If explicitly false -> show modal to register
    if (isRegistered === false) {
      setShowRegisterModal(true);
      return;
    }

    // Fallback: if still undefined or unknown, try refetch and decide
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

  // Trigger on-chain register
  const handleRegister = async () => {
    if (!address) return alert('Wallet not connected');

    try {
      // call write hook - it should return a promise from writeContract
      const tx: any = await registerMember(address as `0x${string}`);
      // In many wagmi flows writeContract returns a hash or promise — attempt to await .wait if present
      if (tx && typeof tx.wait === 'function') {
      
        await tx.wait();
        if(tx.success){
          console.log("txn has suceeded");
          setCheckingStatus(true);
          await refetchRegistration?.();
          setShowRegisterModal(false);
          router.push('/dashboard');
        } else{
          console.log("tx failed maybe", tx)
          router.push('/')
        }
       
      } else {
        // give small delay to let chain process before refetch
        await new Promise((r) => setTimeout(r, 2000));
        setCheckingStatus(true);
      }

      // refresh registration state from chain
     
    } catch (err: any) {
      console.error('Registration error', err);
      alert(err?.message || 'Registration failed. See console for details.');
    } finally {
      setCheckingStatus(false);
    }
  };

  return (
    <main className="relative w-full min-h-screen overflow-hidden bg-black">
      {/* Background Video */}
      <video
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
      </video>

      {/* Overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-purple-900/30 to-black/50" />

      {/* Content */}
      <div className="relative z-10 flex flex-col h-full">
        <header className="flex items-center justify-between px-6 md:px-12 py-6 md:py-8">
          <div className="flex items-center gap-3 group cursor-pointer hover:opacity-80 transition-opacity">
            <div className="w-10 h-10 rounded-full bg-white/10 border border-white/20 flex items-center justify-center">
              <span className="text-white font-bold text-lg">⛓</span>
            </div>
            <span className={`text-white text-2xl tracking-tight ${clashDisplaySemibold.className}`}>
              ChainPot
            </span>
          </div>

          <nav className="hidden md:flex items-center gap-8 px-8 py-3 rounded-full bg-white/5 border border-white/20 backdrop-blur-md">
            {navItems.map((item) => (
              <Link
                key={item.id}
                href={item.href}
                onClick={() => setActiveNav(item.id)}
                className={`text-sm font-medium transition-colors duration-300 ${
                  activeNav === item.id ? 'text-white border-b-2 border-white pb-1' : 'text-white/70 hover:text-white'
                }`}
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <ConnectButton />
        </header>

        {/* Main Section */}
        <div className="flex-1 flex flex-col items-center justify-center px-6 md:px-12 pb-16 md:pb-24">
          <div className="h-8 md:h-12" />

          {/* Heading */}
          <div className="text-center space-y-6 max-w-6xl flex-1 flex flex-col justify-center">
            <h1 className="text-7xl sm:text-8xl md:text-9xl lg:text-[221px] text-white font-bold">
              <span className={`text-transparent bg-clip-text bg-gradient-to-r from-white via-white to-white/80 ${clashDisplaySemibold.className}`}>
                ChainPot
              </span>
            </h1>

            <p className="text-lg md:text-xl text-white/80 leading-relaxed font-light max-w-3xl mx-auto">
              Revolutionary rotating savings and credit associations powered by blockchain.
            </p>

            <div className="flex flex-col md:flex-row items-center justify-center gap-4 pt-8">
              {/* Removed outer anchor: navigation is handled programmatically */}
              <button
                onClick={handleGetStarted}
                className="px-10 py-3 rounded-full bg-white text-black font-semibold text-base hover:bg-white/90 transition-colors duration-300 shadow-lg hover:shadow-xl"
              >
                Get Started
              </button>

              <button className="px-10 py-3 rounded-full bg-white/10 text-white font-semibold text-base border border-white/30 hover:bg-white/20 transition-colors duration-300 backdrop-blur-sm">
                Learn More
              </button>
            </div>
          </div>
        </div>

        <footer className="text-center py-6 text-white/40 text-sm">
          © 2025 ChainPot. All rights reserved.
        </footer>
      </div>

      {/* REGISTER MODAL + LOADING */}
      {(showRegisterModal || checkingStatus) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md animate-fadeIn">
          <div className=" rounded-2xl p-8 w-[90%] max-w-md text-center shadow-xl backdrop-blur-lg">
            {/* Spinner while checking */}
            {checkingStatus ? (
              <div className="flex flex-col items-center justify-center py-6">
                <div className="w-12 h-12 border-4 border-white/30 border-t-white rounded-full animate-spin" />
                <p className="text-white/80 mt-4">Please wait...</p>
              </div>
            ) : (
              <>
                <h2 className="text-white text-2xl font-semibold mb-4">Complete Registration</h2>

                <p className="text-white/70 mb-6">
                  You are not registered yet.
                  <br />
                  Press the button below to register your account on-chain.
                </p>

                <button
                  onClick={handleRegister}
                  disabled={isRegistering}
                  className="w-full mr-2 ml-[4px] py-3 rounded-full text-sm font-semibold transition-colors 
                       bg-white text-black hover:bg-white/90"
                     
                  >
                  {isRegistering ? (
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-black/40 border-t-black rounded-full animate-spin" />
                      Registering...
                    </div>
                  ) : (
                    'Register'
                  )}
                </button>

                <button
                  onClick={() => setShowRegisterModal(false)}
                  className="flex-1 mt-4 w-full px-8 py-1 rounded-full transition-all duration-300 text-center border-3 
                       border-white/30 text-white hover:bg-white/10
                      border-black text-black hover:bg-black/10 "
                >
                  Cancel
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </main>
  );
}
