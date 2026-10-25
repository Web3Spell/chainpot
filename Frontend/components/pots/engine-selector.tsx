"use client";

import { motion } from "framer-motion";

interface EngineSelectorProps {
  onSelect: (engine: "circle" | "auction") => void;
  selected: "circle" | "auction";
}

export default function EngineSelector({ onSelect, selected }: EngineSelectorProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
      <motion.button
        type="button"
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        onClick={() => onSelect("circle")}
        className={`p-6 rounded-xl border-2 text-left transition-colors ${
          selected === "circle" 
            ? "border-[var(--primary)] bg-[var(--primary)]/10" 
            : "border-gray-200 dark:border-gray-800 hover:border-[var(--primary)]/50"
        }`}
      >
        <div className="text-3xl mb-3">🎲</div>
        <h3 className="text-xl font-bold mb-2">Community Circle</h3>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Take turns: each round a verifiably random draw (Chainlink VRF) picks who receives the pot. Everyone receives once. Best for friends, family and kitty parties.
        </p>
      </motion.button>

      <motion.button
        type="button"
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        onClick={() => onSelect("auction")}
        className={`p-6 rounded-xl border-2 text-left transition-colors ${
          selected === "auction" 
            ? "border-[var(--primary)] bg-[var(--primary)]/10" 
            : "border-gray-200 dark:border-gray-800 hover:border-[var(--primary)]/50"
        }`}
      >
        <div className="text-3xl mb-3">🏦</div>
        <h3 className="text-xl font-bold mb-2">Business ROSCA</h3>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Bid for early payout: members who need money sooner bid to receive less than the full pot. The lowest bid wins and the difference is shared by everyone else.
        </p>
      </motion.button>
    </div>
  );
}
