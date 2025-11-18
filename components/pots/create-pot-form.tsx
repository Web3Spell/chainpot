'use client';

import { useState, useEffect, memo } from 'react';
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

// -------------------------
// Form Input Component (moved outside to prevent re-creation)
// -------------------------
interface FormInputProps {
  label: string;
  name: keyof FormData;
  type?: string;
  placeholder?: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void;
  error?: string;
  isDarkMode: boolean;
}

const FormInput = memo(({
  label,
  name,
  type = 'text',
  placeholder,
  value,
  onChange,
  error,
  isDarkMode,
}: FormInputProps) => (
  <div className="flex flex-col gap-2">
    <label className={`text-sm font-bold ${isDarkMode ? 'text-white' : 'text-black'}`}>
      {label}
    </label>
    <input
      type={type}
      name={name}
      value={value}
      onChange={onChange}
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
));

FormInput.displayName = 'FormInput';

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
    error: writeError,                   // Error from wallet interaction/simulation
    hash: writeHash                      // Transaction hash from writeContract
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
  // 🧭 Effect to Handle Transaction Hash from writeContract 🧭
  // ------------------------------------------------------------------
  useEffect(() => {
    // When writeContract succeeds, it sets the hash in the hook's data
    if (writeHash) {
      setTxHash(writeHash);
    }
  }, [writeHash]);

  // ------------------------------------------------------------------
  // 🧭 Effect to Handle Transaction Status, Errors, and Redirection 🧭
  // ------------------------------------------------------------------
  useEffect(() => {
    // 1. Transaction Successfully Confirmed (Success)
    if (isConfirmed && txHash) {
      setIsSubmitting(false);
      
      // Refetch and redirect to the new pot page
      refetchPotCount().then((potCountResult) => {
        const newCount = potCountResult?.data ?? currentPotCount;
        // The new pot ID is assumed to be the total count *after* creation
        const potId = (typeof newCount === 'bigint' || typeof newCount === 'number')
            ? String(newCount)
            : '';

        if (potId) {
            router.push(`/pots/${String(BigInt(potId) + BigInt(1))}`);
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
        
        // Reset states first to update UI immediately
        setTxHash(undefined);
        setIsSubmitting(false);
        
        // Alert user about the failure
        alert(`Transaction Failed: ${errorMessage.substring(0, 100)}...`);
        
        // Don't redirect automatically - let user stay on form to retry
    }
  }, [isConfirmed, writeError, confirmationError, router, refetchPotCount, currentPotCount, txHash]);

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

  // Convert amount string to token units (e.g., "1000" USDC with 6 decimals = 1000000000)
  // Uses Viem's parseUnits which handles decimal conversion correctly
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

    // Start the submission process - clear previous state
    setTxHash(undefined);
    setIsSubmitting(true);
    // Clear any previous errors by resetting form errors
    setErrors({});

    try {
      // Prepare arguments
      const name = formData.name.trim();
      
      // Convert amount to USDC with 6 decimals
      const amountPerCycle = toTokenUnits(formData.amountPerCycle, decimals); 
      
      // Convert cycle duration from days to seconds (days * 24 * 60 * 60 = 86400)
      const cycleDurationDays = parseFloat(formData.cycleDuration);
      const cycleDuration = BigInt(Math.floor(cycleDurationDays * 86400)); 
      
      const cycleCount = BigInt(parseInt(formData.cycleCount, 10)); 
      const frequency = frequencyToIndex(formData.frequency); 
      
      // Convert bid deposit deadline from days to seconds (days * 24 * 60 * 60 = 86400)
      const bidDeadlineDays = parseFloat(formData.bidDepositDeadline);
      const bidDepositDeadline = BigInt(Math.floor(bidDeadlineDays * 86400)); 
      
      const minMembers = BigInt(parseInt(formData.minMembers, 10)); 
      const maxMembers = BigInt(parseInt(formData.maxMembers, 10)); 

      // Call writeContract - it returns a promise that resolves to the transaction hash
      // The hash will also be available in the hook's 'hash' property via useEffect
      await sendCreatePotTransaction(
        name,
        amountPerCycle,
        cycleDuration,
        cycleCount,
        frequency,
        bidDepositDeadline,
        minMembers,
        maxMembers
      );
      
      // Note: The transaction hash will be set via useEffect when writeHash updates
      // No need to manually set it here

    } catch (err: any) {
      // Catch errors during the hook call/wallet interaction setup
      console.error('Transaction initiation failed:', err);
      const errorMsg = err?.message || 'Transaction initiation failed';
      
      // Reset states immediately to update UI
      setIsSubmitting(false);
      setTxHash(undefined);
      
      // Show error to user
      alert(`Transaction Failed: ${errorMsg.substring(0, 100)}...`);
      
      // Don't redirect - let user stay on form to retry
    }
  };
  
  // Aggregate submission state for UI
  const isCurrentlySubmitting = isSubmitting || isConfirming;

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
              isDarkMode={isDarkMode}
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
              isDarkMode={isDarkMode}
            />
            <FormInput
              label="Bid Deposit Deadline (days)"
              name="bidDepositDeadline"
              type="number"
              placeholder="e.g., 5"
              value={formData.bidDepositDeadline}
              onChange={handleChange}
              error={errors.bidDepositDeadline}
              isDarkMode={isDarkMode}
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
              isDarkMode={isDarkMode}
            />
            <FormInput
              label="Total Cycles"
              name="cycleCount"
              type="number"
              placeholder="e.g., 12"
              value={formData.cycleCount}
              onChange={handleChange}
              error={errors.cycleCount}
              isDarkMode={isDarkMode}
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
              isDarkMode={isDarkMode}
            />
            <FormInput
              label="Maximum Members"
              name="maxMembers"
              type="number"
              placeholder="e.g., 20"
              value={formData.maxMembers}
              onChange={handleChange}
              error={errors.maxMembers}
              isDarkMode={isDarkMode}
            />
          </div>
        </div>

        {/* Error Display */}
        {(writeError || confirmationError) && (
          <div className="mb-4 p-4 rounded-lg bg-red-500/10 border-2 border-red-500/50">
            <p className="text-sm font-bold text-red-500 mb-1">Transaction Error</p>
            <p className="text-xs text-red-400">
              {(writeError || confirmationError)?.message || 'Transaction failed or was rejected.'}
            </p>
          </div>
        )}

        {/* Footer: show tx hash + submitting spinner */}
        {txHash && (
          <div className={`mb-4 text-sm ${isDarkMode ? 'text-white/80' : 'text-gray-700'}`}>
            {isConfirming ? 'Confirming transaction' : 'Transaction sent'}: 
            <a 
              className="underline ml-1 hover:opacity-80" 
              target="_blank" 
              rel="noopener noreferrer"
              href={`https://etherscan.io/tx/${txHash}`}
            >
              {txHash.slice(0, 10)}...{txHash.slice(-8)}
            </a>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-4 pt-8 border-t border-white/10">
          <button
            type="submit"
            disabled={isCurrentlySubmitting || isWritePending} 
            className={`flex-1 px-8 py-3 rounded-full font-bold text-lg transition-all duration-300 ${
              isCurrentlySubmitting || isWritePending
                ? 'opacity-50 cursor-not-allowed'
                : isDarkMode
                ? 'bg-white text-black hover:bg-white/90'
                : 'bg-black text-white hover:bg-black/90'
            }`}
          >
            {isWritePending ? (
              <div className="flex items-center justify-center gap-2">
                <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                Waiting for Wallet...
              </div>
            ) : isConfirming ? (
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