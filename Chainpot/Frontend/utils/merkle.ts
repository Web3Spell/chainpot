import { StandardMerkleTree } from "@openzeppelin/merkle-tree";
import { isAddress } from "viem";

export function generateMerkleTree(addresses: string[]) {
  const validAddresses = addresses
    .map(a => a.trim())
    .filter(a => isAddress(a));

  if (validAddresses.length === 0) {
    throw new Error("No valid addresses provided");
  }

  // Create tree with single address type
  const tree = StandardMerkleTree.of(
    validAddresses.map(addr => [addr]),
    ["address"]
  );

  return {
    root: tree.root as `0x${string}`,
    tree: tree,
    addresses: validAddresses
  };
}

export function getProofForAddress(tree: StandardMerkleTree<any[]>, address: string) {
  for (const [i, v] of tree.entries()) {
    if (v[0].toLowerCase() === address.toLowerCase()) {
      return tree.getProof(i) as `0x${string}`[];
    }
  }
  return [];
}
