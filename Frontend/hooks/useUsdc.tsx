'use client';

import { useAccount, useReadContract } from 'wagmi';
import { useContractAction } from './useContractAction';
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
    name: 'balanceOf',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'account', type: 'address' }],
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

export function useUSDCBalance(owner?: `0x${string}`) {
  const { data, isLoading, refetch } = useReadContract({
    address: CONTRACT_CONFIG.addresses.usdc as `0x${string}`,
    abi: USDC_ABI,
    functionName: 'balanceOf',
    args: owner ? [owner] : undefined,
    query: { enabled: !!owner },
  });
  return { data: data as bigint | undefined, isLoading, refetch };
}

/** Exact-amount approval of USDC to `spender` (defaults to the Vault). */
export function useUSDCApprove(spender?: `0x${string}` | null) {
  const spend = spender ?? (CONTRACT_CONFIG.addresses.vault as `0x${string}`);
  const action = useContractAction();
  const approve = (amount: bigint) =>
    action.write({
      address: CONTRACT_CONFIG.addresses.usdc as `0x${string}`,
      abi: USDC_ABI,
      functionName: 'approve',
      args: [spend, amount],
    });
  return { ...action, approve };
}
