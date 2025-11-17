'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
// Assume the following imports from your custom hooks file:
import { 
  useCreatePot, 
  useGetCurrentPotCount, 
  useUSDCDecimals 
} from '@/hooks/useAuctionEngine'; 
import { useWaitForTransactionReceipt } from 'wagmi';
import { parseUnits } from 'viem'; 

// --- Interface and Type Definitions ---
interface CreatePotFormProps {
  isDarkMode: boolean;
}

type CycleFrequency = 'weekly' | 'biweekly' | 'monthly';

interface FormData {
  name: string;
  amountPerCycle: string;
  cycleDuration: string;
  cycleCount: string;
  frequency: CycleFrequency;
  bidDepositDeadline: string;
  minMembers: string;
  maxMembers: string;
}

export function CreatePotForm({ isDarkMode }: CreatePotFormProps) {
  const router = useRouter();

  const [formData, setFormData] = useState<FormData>({
    name: '',
    amountPerCycle: '',
    cycleDuration: '',
    cycleCount: '',
    frequency: 'weekly',
    bidDepositDeadline: '',
    minMembers: '',
    maxMembers: '',
  });

  const [errors, setErrors] = useState<Partial<FormData>>({});
  
  // State to hold the transaction hash after the wallet interaction
  const [txHash, setTxHash] = useState<`0x${string}` | undefined>(undefined);
  // State for overall form submission/confirmation process (UI control)
  const [isSubmitting, setIsSubmitting] = useState(false); 

  // ---- Wagmi Hooks ----
  const { 
    createPot: sendCreatePotTransaction, // The function that triggers the write
    isPending: isWritePending,           // True while waiting for wallet confirmation
    error: writeError                    // Error from wallet interaction/simulation
  } = useCreatePot();
  
  const { data: currentPotCount, refetch: refetchPotCount } = useGetCurrentPotCount();
  const { data: usdcDecimals } = useUSDCDecimals();

  const decimals = typeof usdcDecimals === 'number' ? usdcDecimals : 6;

  // Wagmi V2: Hook to wait for transaction confirmation
  const { 
    isLoading: isConfirming, 
    isSuccess: isConfirmed, 
    error: confirmationError // Error from transaction being reverted/failed to mine
  } = useWaitForTransactionReceipt({
    hash: txHash,
  });

  // ------------------------------------------------------------------
  // 🧭 Effect to Handle Transaction Status, Errors, and Redirection 🧭
  // ------------------------------------------------------------------
  useEffect(() => {
    // 1. Transaction Successfully Confirmed (Success)
    if (isConfirmed) {
      setIsSubmitting(false);
      
      // Refetch and redirect to the new pot page
      refetchPotCount().then((potCountResult) => {
        const newCount = potCountResult?.data ?? currentPotCount;
        // The new pot ID is assumed to be the total count *after* creation
        const potId = (typeof newCount === 'bigint' || typeof newCount === 'number')
            ? String(newCount)
            : '';

        if (potId) {
            router.push(`/pots/${potId}`);
            return;
        }
        router.push('/pots'); // Fallback
      });
    }

    // 2. Error Handling (Wallet Rejection or Reverted Transaction)
    if (writeError || confirmationError) {
        const error = writeError || confirmationError;
        const errorMessage = error?.message || 'Transaction failed or was rejected.';
        console.error('Pot creation error:', error);
        
        // Alert user about the failure
        alert(`Transaction Failed: ${errorMessage.substring(0, 100)}...`);
        
        // Reset states
        setTxHash(undefined);
        setIsSubmitting(false);
        
        // Redirect to home page
        router.push('/');
    }
  }, [isConfirmed, writeError, confirmationError, router, refetchPotCount, currentPotCount]);

  // -------------------------
  // Helpers & Validation
  // -------------------------
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name as keyof FormData]) {
      setErrors((prev) => ({ ...prev, [name]: undefined }));
    }
  };

  const validateForm = () => {
    const newErrors: Partial<FormData> = {};
    if (!formData.name.trim()) newErrors.name = 'Pot name is required';
    if (!formData.amountPerCycle || parseFloat(formData.amountPerCycle) <= 0)
      newErrors.amountPerCycle = 'Amount must be greater than 0';
    if (!formData.cycleDuration || parseFloat(formData.cycleDuration) <= 0)
      newErrors.cycleDuration = 'Duration must be greater than 0';
    if (!formData.cycleCount || parseInt(formData.cycleCount) <= 0)
      newErrors.cycleCount = 'Must have at least 1 cycle';
    if (!formData.bidDepositDeadline || parseFloat(formData.bidDepositDeadline) <= 0)
      newErrors.bidDepositDeadline = 'Deadline must be greater than 0';
    if (!formData.minMembers || parseInt(formData.minMembers) <= 0)
      newErrors.minMembers = 'Minimum members required';
    if (!formData.maxMembers || parseInt(formData.maxMembers) <= 0)
      newErrors.maxMembers = 'Maximum members required';
    if (parseInt(formData.minMembers) > parseInt(formData.maxMembers)) {
      newErrors.maxMembers = 'Max members must be greater than min members';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const frequencyToIndex = (f: CycleFrequency): number => {
    switch (f) {
      case 'weekly': return 0;
      case 'biweekly': return 1;
      case 'monthly': return 2;
      default: return 0;
    }
  };

  // Use Viem's parseUnits
  const toTokenUnits = (amountStr: string, decimals: number): bigint => {
    try {
      if (!amountStr || parseFloat(amountStr) <= 0) return BigInt(0);
      return parseUnits(amountStr as `${number}`, decimals); 
    } catch {
      return BigInt(0);
    }
  };

  // -------------------------
  // 🔨 Submit Handler 🔨
  // -------------------------
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm() || isSubmitting || isWritePending) return;

    // Start the submission process
    setTxHash(undefined);
    setIsSubmitting(true);

    try {
      // Prepare arguments
      const name = formData.name.trim();
      const amountPerCycle = toTokenUnits(formData.amountPerCycle, decimals); 
      const cycleDuration = BigInt(Math.floor(parseFloat(formData.cycleDuration))); 
      const cycleCount = BigInt(parseInt(formData.cycleCount, 10)); 
      const frequency = frequencyToIndex(formData.frequency); 
      const bidDepositDeadline = BigInt(Math.floor(parseFloat(formData.bidDepositDeadline))); 
      const minMembers = BigInt(parseInt(formData.minMembers, 10)); 
      const maxMembers = BigInt(parseInt(formData.maxMembers, 10)); 

      // Call your imperative write function. It must return a response object 
      // containing the transaction hash for the useEffect hook to track confirmation.
      const txResponse: any = await sendCreatePotTransaction(
        name,
        amountPerCycle,
        cycleDuration,
        cycleCount,
        frequency,
        bidDepositDeadline,
        minMembers,
        maxMembers
      );
      
      // Assuming your hook's write function returns an object with the hash property
      if (txResponse && txResponse.hash) {
          setTxHash(txResponse.hash as `0x${string}`);
      } else {
          // If the wallet signs successfully but doesn't immediately return hash,
          // the writeError in useEffect will eventually catch any failure.
          // We rely on isWritePending state here.
      }

    } catch (err: any) {
      // Catch errors during the hook call/wallet interaction setup
      console.error('Transaction initiation failed:', err);
      const errorMsg = err?.message || 'Transaction initiation failed';
      alert(`Transaction Failed: ${errorMsg.substring(0, 100)}...`);
      setIsSubmitting(false);
      router.push('/');
    }
    // isSubmitting state is now controlled by the useEffect hook watching wagmi states.
  };
  
  // Aggregate submission state for UI
  const isCurrentlySubmitting = isSubmitting || isConfirming;


  // -------------------------
  // Form Input Component
  // -------------------------
  const FormInput = ({
    label,
    name,
    type = 'text',
    placeholder,
    value,
    onChange,
    error,
  }: {
    label: string;
    name: keyof FormData;
    type?: string;
    placeholder?: string;
    value: string;
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void | ((e: React.ChangeEvent<HTMLSelectElement>) => void);
    error?: string;
  }) => (
    <div className="flex flex-col gap-2">
      <label className={`text-sm font-bold ${isDarkMode ? 'text-white' : 'text-black'}`}>
        {label}
      </label>
      <input
        type={type}
        name={name}
        value={value}
        onChange={onChange as any}
        placeholder={placeholder}
        className={`px-4 py-3 rounded-lg border-2 transition-colors duration-300 ${
          error
            ? isDarkMode
              ? 'border-red-500/50 bg-red-500/10'
              : 'border-red-500 bg-red-50'
            : isDarkMode
            ? ' text-white bg-white/5'
            : 'bg-white border-black text-black hover:bg-black/5'
        } focus:outline-none`}
      />
      {error && <p className="text-xs text-red-500 font-medium">{error}</p>}
    </div>
  );

  // -------------------------
  // 🎨 Render JSX 🎨
  // -------------------------
  return (
    <div className="mb-12">
      <div className="mb-8">
        <h1 className="text-5xl md:text-6xl font-black mb-4">
          <span className="block underline decoration-2 underline-offset-4">Create Your Pot</span>
        </h1>
        <p className={`text-lg ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
          Launch a new ROSCA pool and start building community wealth
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className={`p-8 rounded-2xl border-3 border-black transition-colors duration-300 ${
          isDarkMode ? ' text-white bg-white/5' : 'bg-white border-black text-black hover:bg-black/5'
        }`}
      >
        {/* Basic Information */}
        <div className="mb-8">
          <h2 className={`text-2xl font-bold mb-6 ${isDarkMode ? 'text-white' : 'text-black'}`}>
            Basic Information
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <FormInput
              label="Pot Name"
              name="name"
              placeholder="e.g., Tech Startup Fund"
              value={formData.name}
              onChange={handleChange}
              error={errors.name}
            />
          </div>
        </div>

        {/* Financial Parameters */}
        <div className="mb-8">
          <h2 className={`text-2xl font-bold mb-6 ${isDarkMode ? 'text-white' : 'text-black'}`}>
            Financial Parameters
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <FormInput
              label={`Amount Per Cycle (USDC)`}
              name="amountPerCycle"
              type="number"
              placeholder="e.g., 5000"
              value={formData.amountPerCycle}
              onChange={handleChange}
              error={errors.amountPerCycle}
            />
            <FormInput
              label="Bid Deposit Deadline (days)"
              name="bidDepositDeadline"
              type="number"
              placeholder="e.g., 5"
              value={formData.bidDepositDeadline}
              onChange={handleChange}
              error={errors.bidDepositDeadline}
            />
          </div>
        </div>

        {/* Cycle Configuration */}
        <div className="mb-8">
          <h2 className={`text-2xl font-bold mb-6 ${isDarkMode ? 'text-white' : 'text-black'}`}>
            Cycle Configuration
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <FormInput
              label="Cycle Duration (days)"
              name="cycleDuration"
              type="number"
              placeholder="e.g., 7"
              value={formData.cycleDuration}
              onChange={handleChange}
              error={errors.cycleDuration}
            />
            <FormInput
              label="Total Cycles"
              name="cycleCount"
              type="number"
              placeholder="e.g., 12"
              value={formData.cycleCount}
              onChange={handleChange}
              error={errors.cycleCount}
            />
            <div className="flex flex-col gap-2">
              <label className={`text-sm font-bold ${isDarkMode ? 'text-white' : 'text-black'}`}>
                Frequency
              </label>
              <select
                name="frequency"
                value={formData.frequency}
                onChange={handleChange}
                className={`px-4 py-3 rounded-lg border-2 border-black transition-colors duration-300 ${
                  isDarkMode ? ' text-white bg-white/5' : 'bg-white border-black text-black hover:bg-black/5'
                } focus:outline-none focus:border-white/50`}
              >
                <option value="weekly">Weekly</option>
                <option value="biweekly">Biweekly</option>
                <option value="monthly">Monthly</option>
              </select>
            </div>
          </div>
        </div>

        {/* Member Limits */}
        <div className="mb-8">
          <h2 className={`text-2xl font-bold mb-6 ${isDarkMode ? 'text-white' : 'text-black'}`}>
            Member Requirements
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <FormInput
              label="Minimum Members"
              name="minMembers"
              type="number"
              placeholder="e.g., 5"
              value={formData.minMembers}
              onChange={handleChange}
              error={errors.minMembers}
            />
            <FormInput
              label="Maximum Members"
              name="maxMembers"
              type="number"
              placeholder="e.g., 20"
              value={formData.maxMembers}
              onChange={handleChange}
              error={errors.maxMembers}
            />
          </div>
        </div>

        {/* Footer: show tx hash + submitting spinner */}
        {txHash && (
          <div className="mb-4 text-sm text-white/80">
            {isConfirming ? 'Confirming transaction' : 'Transaction sent'}: 
            <a className="underline ml-1" target="_blank" href={`https://etherscan.io/tx/${txHash}`}>
              {txHash}
            </a>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-4 pt-8 border-t border-white/10">
          <button
            type="submit"
            disabled={isCurrentlySubmitting || isWritePending} 
            className={`flex-1 px-8 py-3 rounded-full font-bold text-lg transition-all duration-300 ${
              isDarkMode
                ? 'bg-white text-black hover:bg-white/90'
                : 'bg-black text-white hover:bg-black/90'
            }`}
          >
            {isWritePending ? 'Waiting for Wallet...' : isConfirming ? (
                <div className="flex items-center justify-center gap-2">
                    <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                    Confirming...
                </div>
            ) : (
              'Create Pot'
            )}
          </button>
          <Link
            href="/pots"
            className={`flex-1 px-8 py-3 rounded-full font-bold text-lg transition-all duration-300 text-center border-3 ${
              isDarkMode
                ? 'border-white/30 text-white hover:bg-white/10'
                : 'border-black text-black hover:bg-black/10'
            }`}
          >
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}