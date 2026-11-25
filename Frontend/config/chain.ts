import { base, baseSepolia, type Chain } from 'viem/chains';
import { NETWORK } from './network';

/** The viem/wagmi chain object for the selected network (see config/network.ts). Widened to `Chain`
 *  so wagmi types transports by the one chain in use, not both. */
export const CHAIN: Chain = NETWORK.chainId === base.id ? base : baseSepolia;
