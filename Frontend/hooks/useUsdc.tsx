// src/hooks/useUsdc.ts
'use client';

import { useCallback } from 'react';
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import type { Address } from 'viem';

// Minimal ERC-20 ABI slices we need
const USDC_ABI = [
  {
    name: 'approve',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'spender', type: 'address' },
      { name: 'amount', type: 'uint256' }
    ],
    outputs: [{ name: '', type: 'bool' }]
  },
  {
    name: 'allowance',
    type: 'function',
    stateMutability: 'view',
    inputs: [
      { name: 'owner', type: 'address' },
      { name: 'spender', type: 'address' }
    ],
    outputs: [{ name: '', type: 'uint256' }]
  },
  {
    name: 'decimals',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint8' }]
  }
] as const;

/**
 * Helper to get default addresses from env
 */
function getDefaults() {
  const token = (process.env.NEXT_PUBLIC_USDC_ADDRESS ?? '').trim() as Address | '';
  const defaultSpender = (process.env.NEXT_PUBLIC_AUCTION_ENGINE_ADDRESS ?? '').trim() as Address | '';
  return { token, defaultSpender };
}

/**
 * useUSDCAllowance
 * - owner: address to check allowance for (defaults to connected address)
 * - spender: contract address allowed to spend (defaults to NEXT_PUBLIC_AUCTION_ENGINE_ADDRESS)
 * - tokenAddress: ERC20 token address (defaults to NEXT_PUBLIC_USDC_ADDRESS)
 *
 * Returns wagmi-style result.data (a bigint), plus isLoading/isError/refetch if you need them
 */
export function useUSDCAllowance(
  owner?: `0x${string}` | null,
  spender?: `0x${string}` | null,
  tokenAddress?: `0x${string}` | null
) {
  const { address: connected } = useAccount();
  const { token: envToken, defaultSpender } = getDefaults();

  const token = (tokenAddress ?? envToken) as `0x${string}` | '';
  const spend = (spender ?? defaultSpender) as `0x${string}` | '';

  const ownerAddress = owner ?? connected ?? '';

  const enabled = Boolean(ownerAddress && spend && token);

  const { data, isLoading, isError, refetch } = useReadContract({
    address: token as Address,
    abi: USDC_ABI,
    functionName: 'allowance',
    args: ownerAddress && spend ? [ownerAddress as Address, spend as Address] : undefined,
    query: {
      enabled,
    },
  });

  return {
    data: data as bigint | undefined,
    isLoading,
    isError,
    refetch,
  };
}

/**
 * useUSDCDecimals
 * - tokenAddress (optional) fallback to NEXT_PUBLIC_USDC_ADDRESS
 * returns decimals as number
 */
export function useUSDCDecimals(tokenAddress?: `0x${string}` | null) {
  const { token: envToken } = getDefaults();
  const token = (tokenAddress ?? envToken) as `0x${string}` | '';

  const { data, isLoading, isError, refetch } = useReadContract({
    address: token as Address,
    abi: USDC_ABI,
    functionName: 'decimals',
    query: {
      enabled: Boolean(token),
    },
  });

  return {
    data: data as number | undefined,
    isLoading,
    isError,
    refetch,
  };
}

/**
 * useUSDCApprove
 *
 * returns:
 * - approve(amount: bigint) -> submits the approve transaction and returns tx hash
 * - isPending (wallet signing)
 * - isConfirming (transaction being mined)
 * - isConfirmed (transaction confirmed)
 * - error (any errors from write or confirmation)
 * - hash (transaction hash)
 *
 * Important: amount must be in the token's smallest units (e.g. USDC -> 6 decimals) as bigint.
 *
 * Optional params:
 * - spender: address to approve (defaults to NEXT_PUBLIC_AUCTION_ENGINE_ADDRESS)
 * - tokenAddress: ERC20 address (defaults to NEXT_PUBLIC_USDC_ADDRESS)
 */
export function useUSDCApprove(spender?: `0x${string}` | null, tokenAddress?: `0x${string}` | null) {
  const { defaultSpender, token: envToken } = getDefaults();
  const spend = (spender ?? defaultSpender) as `0x${string}` | '';
  const token = (tokenAddress ?? envToken) as `0x${string}` | '';

  const { 
    writeContractAsync, 
    data: hash, 
    isPending, 
    error: writeError 
  } = useWriteContract();

  const { 
    isLoading: isConfirming, 
    isSuccess: isConfirmed,
    error: confirmError
  } = useWaitForTransactionReceipt({
    hash,
  });

  // approve function wrapper: pass amount (bigint)
  const approve = useCallback(
    async (amount: bigint) => {
      if (!token || !spend) {
        throw new Error('Token or spender address not configured. Check environment variables.');
      }
      
      try {
        const txHash = await writeContractAsync({
          address: token as Address,
          abi: USDC_ABI,
          functionName: 'approve',
          args: [spend as Address, amount],
        });
        
        return { hash: txHash };
      } catch (error) {
        console.error('Approve transaction failed:', error);
        throw error;
      }
    },
    [writeContractAsync, token, spend]
  );

  return {
    approve, // async function(amount: bigint) => Promise<{ hash: string }>
    hash,
    isPending, // Waiting for wallet confirmation
    isConfirming, // Transaction is being mined
    isConfirmed, // Transaction confirmed on chain
    error: writeError ?? confirmError,
  };
}

/**
 * Notes
 * - These hooks expect that you set NEXT_PUBLIC_USDC_ADDRESS and NEXT_PUBLIC_AUCTION_ENGINE_ADDRESS
 *   in your environment (.env.local). If not provided, the hooks will be disabled.
 *
 * Usage examples:
 *
 * // Read allowance for connected account
 * const { data: allowance, isLoading } = useUSDCAllowance();
 *
 * // Approve tokens
 * const { approve, hash, isPending, isConfirming, isConfirmed } = useUSDCApprove();
 * 
 * const handleApprove = async () => {
 *   try {
 *     const result = await approve(BigInt(5000 * 10**6)); // approve 5000 USDC
 *     console.log('Transaction hash:', result.hash);
 *   } catch (error) {
 *     console.error('Approval failed:', error);
 *   }
 * };
 *
 * // Get decimals
 * const { data: decimals } = useUSDCDecimals();
 */