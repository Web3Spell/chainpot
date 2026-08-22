'use client';

import { useState, useEffect, memo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCreateCirclePot } from '@/hooks/useCircleEngine';
import { useCreateAuctionPot } from '@/hooks/useAuctionEngine';
import { usePotCounter } from '@/hooks/useRoscaEngine';
import { useUSDCDecimals } from '@/hooks/useUsdc';
import EngineSelector from './engine-selector';
import { generateMerkleTree } from '@/utils/merkle';
import { parseUnits } from 'viem';

interface CreatePotFormProps {
  isDarkMode: boolean;
}

interface FormData {
  amountPerCycle: string;
  cycleDuration: string;
  paymentWindow: string;
  biddingWindow: string;
  memberAddresses: string;
}

const FormInput = memo(({ label, name, type = 'text', placeholder, value, onChange, error, isDarkMode }: any) => (
  <div className="flex flex-col gap-2">
    <label className={`text-sm font-bold ${isDarkMode ? 'text-white' : 'text-black'}`}>{label}</label>
    {type === 'textarea' ? (
      <textarea
        name={name}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        rows={4}
        className={`px-4 py-3 rounded-lg border-2 transition-colors duration-300 ${
          error ? (isDarkMode ? 'border-red-500/50 bg-red-500/10' : 'border-red-500 bg-red-50')
                : (isDarkMode ? ' text-white bg-white/5' : 'bg-white border-black text-black hover:bg-black/5')
        } focus:outline-none`}
      />
    ) : (
      <input
        type={type}
        name={name}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className={`px-4 py-3 rounded-lg border-2 transition-colors duration-300 ${
          error ? (isDarkMode ? 'border-red-500/50 bg-red-500/10' : 'border-red-500 bg-red-50')
                : (isDarkMode ? ' text-white bg-white/5' : 'bg-white border-black text-black hover:bg-black/5')
        } focus:outline-none`}
      />
    )}
    {error && <p className="text-xs text-red-500 font-medium">{error}</p>}
  </div>
));
FormInput.displayName = 'FormInput';

export function CreatePotForm({ isDarkMode }: CreatePotFormProps) {
  const router = useRouter();

  const [engine, setEngine] = useState<"circle" | "auction">("circle");
  const [formData, setFormData] = useState<FormData>({
    amountPerCycle: '',
    cycleDuration: '7',
    paymentWindow: '2',
    biddingWindow: '2',
    memberAddresses: '',
  });
  const [errors, setErrors] = useState<Partial<FormData>>({});
  
  const { createPot: createCircle, isPending: isCirclePending, isConfirming: isCircleConfirming, isConfirmed: isCircleConfirmed, error: circleError, hash: circleHash } = useCreateCirclePot();
  const { createPot: createAuction, isPending: isAuctionPending, isConfirming: isAuctionConfirming, isConfirmed: isAuctionConfirmed, error: auctionError, hash: auctionHash } = useCreateAuctionPot();
  const { data: potCount, refetch } = usePotCounter(engine);
  const { data: usdcDecimals } = useUSDCDecimals();

  const isPending = isCirclePending || isAuctionPending;
  const isConfirming = isCircleConfirming || isAuctionConfirming;
  const isConfirmed = isCircleConfirmed || isAuctionConfirmed;
  const writeError = circleError || auctionError;
  const txHash = circleHash || auctionHash;

  useEffect(() => {
    if (isConfirmed && txHash) {
      refetch().then((res) => {
        const newCount = res?.data ?? potCount;
        if (newCount !== undefined) {
          router.push(`/pots/${String(newCount)}`);
        } else {
          router.push('/pots');
        }
      });
    }
  }, [isConfirmed, txHash, router, refetch, potCount]);

  const handleChange = (e: any) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name as keyof FormData]) setErrors((prev) => ({ ...prev, [name]: undefined }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isPending || isConfirming) return;

    const newErrors: Partial<FormData> = {};
    if (!formData.amountPerCycle) newErrors.amountPerCycle = 'Required';
    if (!formData.cycleDuration) newErrors.cycleDuration = 'Required';
    if (!formData.paymentWindow) newErrors.paymentWindow = 'Required';
    if (engine === 'auction' && !formData.biddingWindow) newErrors.biddingWindow = 'Required';
    
    let addresses: string[] = [];
    try {
      addresses = formData.memberAddresses.split(/[\n,]+/).map(a => a.trim()).filter(a => a);
      if (addresses.length < 2) newErrors.memberAddresses = 'At least 2 members required';
    } catch {
      newErrors.memberAddresses = 'Invalid address format';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    try {
      const tree = generateMerkleTree(addresses);
      
      // Save proofs to local storage keyed by root temporarily (we can link them to potId later)
      const proofs = tree.addresses.map(addr => ({
        address: addr,
        proof: tree.tree.getProof(Array.from(tree.tree.entries()).find((v) => v[1][0] === addr)![0])
      }));
      localStorage.setItem(`merkle_${tree.root}`, JSON.stringify(proofs));

      const amount = parseUnits(formData.amountPerCycle, usdcDecimals ?? 6);
      const duration = Number(formData.cycleDuration) * 86400;
      const paymentWin = Number(formData.paymentWindow) * 86400;

      if (engine === 'circle') {
        createCircle(tree.root, addresses.length, amount, duration, paymentWin);
      } else {
        const biddingWin = Number(formData.biddingWindow) * 86400;
        createAuction(tree.root, addresses.length, amount, duration, paymentWin, biddingWin);
      }
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    }
  };

  return (
    <div className="mb-12">
      <div className="mb-8">
        <h1 className="text-5xl md:text-6xl font-black mb-4">
          <span className="block underline decoration-2 underline-offset-4">Create Your Pot</span>
        </h1>
        <p className={`text-lg ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
          Launch a new rotating savings pool using ChainPot V4
        </p>
      </div>

      <form onSubmit={handleSubmit} className={`p-8 rounded-2xl border-3 border-black transition-colors duration-300 ${isDarkMode ? ' text-white bg-white/5' : 'bg-white border-black text-black'}`}>
        <div className="mb-8">
          <h2 className="text-2xl font-bold mb-6">1. Choose Engine</h2>
          <EngineSelector selected={engine} onSelect={setEngine} />
        </div>

        <div className="mb-8">
          <h2 className="text-2xl font-bold mb-6">2. Invite List (Merkle Gate)</h2>
          <FormInput
            label="Member Wallet Addresses (one per line, comma or newline separated)"
            name="memberAddresses"
            type="textarea"
            placeholder="0x123...&#10;0x456..."
            value={formData.memberAddresses}
            onChange={handleChange}
            error={errors.memberAddresses}
            isDarkMode={isDarkMode}
          />
          <p className="text-sm text-gray-500 mt-2">These addresses will be cryptographically whitelisted via Merkle Root. No one else can join.</p>
        </div>

        <div className="mb-8">
          <h2 className="text-2xl font-bold mb-6">3. Financial Parameters</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <FormInput label="Amount Per Cycle (USDC)" name="amountPerCycle" type="number" placeholder="5000" value={formData.amountPerCycle} onChange={handleChange} error={errors.amountPerCycle} isDarkMode={isDarkMode} />
            <FormInput label="Cycle Duration (days)" name="cycleDuration" type="number" placeholder="7" value={formData.cycleDuration} onChange={handleChange} error={errors.cycleDuration} isDarkMode={isDarkMode} />
            <FormInput label="Payment Window (days)" name="paymentWindow" type="number" placeholder="2" value={formData.paymentWindow} onChange={handleChange} error={errors.paymentWindow} isDarkMode={isDarkMode} />
            {engine === 'auction' && (
              <FormInput label="Bidding Window (days)" name="biddingWindow" type="number" placeholder="2" value={formData.biddingWindow} onChange={handleChange} error={errors.biddingWindow} isDarkMode={isDarkMode} />
            )}
          </div>
        </div>

        {writeError && (
          <div className="mb-4 p-4 rounded-lg bg-red-500/10 border-2 border-red-500/50">
            <p className="text-sm font-bold text-red-500 mb-1">Transaction Error</p>
            <p className="text-xs text-red-400">{writeError.message}</p>
          </div>
        )}

        <div className="flex gap-4 pt-8 border-t border-white/10">
          <button type="submit" disabled={isPending || isConfirming} className={`flex-1 px-8 py-3 rounded-full font-bold text-lg transition-all duration-300 ${isPending || isConfirming ? 'opacity-50' : isDarkMode ? 'bg-white text-black' : 'bg-black text-white'}`}>
            {isPending ? 'Waiting for Wallet...' : isConfirming ? 'Confirming...' : 'Create Pot'}
          </button>
          <Link href="/pots" className={`flex-1 px-8 py-3 rounded-full font-bold text-lg transition-all text-center border-3 ${isDarkMode ? 'border-white/30 text-white' : 'border-black text-black'}`}>Cancel</Link>
        </div>
      </form>
    </div>
  );
}