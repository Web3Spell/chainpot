'use client';

import { useCallback } from 'react';
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import type { Address } from 'viem';
import { CONTRACT_CONFIG } from '../config/hooksConf';

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

export function useUSDCAllowance(
  owner?: `0x${string}` | null,
  spender?: `0x${string}` | null
) {
  const { address: connected } = useAccount();
  const token = CONTRACT_CONFIG.addresses.usdc as `0x${string}`;
  const spend = spender ?? (CONTRACT_CONFIG.addresses.vault as `0x${string}`);
  const ownerAddress = owner ?? connected ?? '';

  const enabled = Boolean(ownerAddress && spend && token);

  const { data, isLoading, isError, refetch } = useReadContract({
    address: token,
    abi: USDC_ABI,
    functionName: 'allowance',
    args: ownerAddress && spend ? [ownerAddress, spend] : undefined,
    query: { enabled },
  });

  return {
    data: data as bigint | undefined,
    isLoading,
    isError,
    refetch,
  };
}

export function useUSDCDecimals() {
  const token = CONTRACT_CONFIG.addresses.usdc as `0x${string}`;

  const { data, isLoading, isError, refetch } = useReadContract({
    address: token,
    abi: USDC_ABI,
    functionName: 'decimals',
    query: { enabled: Boolean(token) },
  });

  return {
    data: data as number | undefined,
    isLoading,
    isError,
    refetch,
  };
}

export function useUSDCApprove(spender?: `0x${string}` | null) {
  const spend = spender ?? (CONTRACT_CONFIG.addresses.vault as `0x${string}`);
  const token = CONTRACT_CONFIG.addresses.usdc as `0x${string}`;

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
  } = useWaitForTransactionReceipt({ hash });

  const approve = useCallback(
    async (amount: bigint) => {
      try {
        const txHash = await writeContractAsync({
          address: token,
          abi: USDC_ABI,
          functionName: 'approve',
          args: [spend, amount],
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
    approve,
    hash,
    isPending,
    isConfirming,
    isConfirmed,
    error: writeError ?? confirmError,
  };
}