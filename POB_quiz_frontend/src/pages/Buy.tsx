// src/pages/Buy.tsx
import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Minus, Plus, RefreshCcw, Wallet, Info, CheckCircle2 } from "lucide-react";
import { useAppState } from "../context/AppStateProvider";
import PayEntryCard from "../components/RegularPayEntryCard";
import MiniPayEntryCard from "../components/MiniPayEntryCard";

const PRICE_PER_CREDIT = 0.01; // cUSD per credit

export function Buy() {
  const { credits, isLoading, refreshAll, address, isMiniPayBrowser } = useAppState();
  const [qty, setQty] = useState<number>(1);
  const [justPurchased, setJustPurchased] = useState<boolean>(false);

  const totalCost = useMemo(() => +(qty * PRICE_PER_CREDIT).toFixed(6), [qty]);

  const dec = () => setQty((q) => Math.max(1, q - 1));
  const inc = () => setQty((q) => Math.min(10, q + 1)); // Match component limit of 10

  const onPaid = async () => {
    setJustPurchased(true);
    await refreshAll();
    setTimeout(() => setJustPurchased(false), 2500);
  };

  return (
    <div className="space-y-5">
      {/* Wallet / status */}
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.25 }}
        className="rounded-2xl p-4 bg-surface border border-secondary/60 shadow-soft"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm">
            <Wallet className="w-4 h-4 text-[#94C751]" />
            <span className="opacity-80">{address ? "Wallet connected" : "Connect your wallet to buy"}</span>
          </div>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.96 }}
            onClick={refreshAll}
            className="px-3 py-1.5 rounded-lg border border-secondary/60 hover:bg-secondary/30 text-sm inline-flex items-center gap-2"
          >
            {isLoading ? (
              <span className="w-4 h-4 rounded-full border-2 border-[#94C751] border-t-transparent animate-spin" />
            ) : (
              <RefreshCcw className="w-4 h-4" />
            )}
            Refresh
          </motion.button>
        </div>

        <div className="mt-3 text-sm">
          <div className="opacity-70">Your credits</div>
          <div className="text-2xl font-semibold text-primary">{credits}</div>
        </div>
      </motion.div>

      {/* Quantity selector + total */}
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.25, delay: 0.05 }}
        className="rounded-2xl p-4 bg-surface border border-secondary/60 shadow-soft"
      >
        <div className="text-sm opacity-80 mb-3">Choose how many credits you want</div>

        <div className="flex items-center gap-3">
          <button
            className="p-2 rounded-lg border border-secondary/60 hover:bg-secondary/30 disabled:opacity-40"
            onClick={dec}
            disabled={qty <= 1}
            aria-label="Decrease quantity"
          >
            <Minus className="w-4 h-4" />
          </button>

          <input
            type="number"
            min={1}
            max={10}
            step={1}
            value={qty}
            onChange={(e) => {
              const v = Math.max(1, Math.min(10, Number(e.target.value) || 1));
              setQty(v);
            }}
            className="w-28 text-center px-3 py-2 rounded-xl bg-background/60 border border-secondary/60 outline-none"
          />

          <button
            className="p-2 rounded-lg border border-secondary/60 hover:bg-secondary/30 disabled:opacity-40"
            onClick={inc}
            disabled={qty >= 10}
            aria-label="Increase quantity"
          >
            <Plus className="w-4 h-4" />
          </button>

          <div className="ml-auto text-right">
            <div className="text-xs opacity-70">Price per credit</div>
            <div className="text-sm font-medium">{PRICE_PER_CREDIT} cUSD</div>
          </div>
        </div>

        <div className="mt-4 flex items-center justify-between bg-[#1c2a0c]/50 border border-[#3A5019] rounded-xl p-3">
          <div className="text-sm">
            <div className="opacity-70">Total</div>
            <div className="text-lg font-semibold text-[#EAF9D5]">{totalCost} cUSD</div>
          </div>
          {justPurchased ? (
            <div className="text-xs inline-flex items-center gap-1 text-[#94C751]">
              <CheckCircle2 className="w-4 h-4" /> Purchase complete
            </div>
          ) : (
            <div className="text-xs opacity-70 inline-flex items-center gap-1">
              <Info className="w-4 h-4" />
              You'll receive {qty} credit{qty !== 1 ? "s" : ""}.
            </div>
          )}
        </div>

        {/* Info box for multiple credits */}
        {qty > 1 && (
          <div className="mt-3 text-xs bg-blue-400/10 border border-orange-400/30 rounded-lg p-2 text-black-400">
            <div className="font-bold mb-1">Multiple Credits Purchase:</div>
            <ul className="list-disc list-inside space-y-0.5">
              <li>You'll approve once, then confirm {qty} payment transactions</li>
              <li>MetaMask: ~{qty * 2} seconds total</li>
              <li>MiniPay: ~{qty * 8} seconds total</li>
              <li>Don't close your browser during the process</li>
            </ul>
          </div>
        )}
      </motion.div>

      {/* Payment widget */}
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.25, delay: 0.1 }}
        className="rounded-2xl p-4 bg-surface border border-secondary/60 shadow-soft"
      >
        <div className="text-sm opacity-80 mb-2">Pay & receive credits</div>

        {/* Pass quantity to payment components - they now support it! */}
        {isMiniPayBrowser ? (
          <MiniPayEntryCard
            address={address}
            onPaid={onPaid}
            quantity={qty}
          />
        ) : (
          <PayEntryCard
            address={address}
            onPaid={onPaid}
            quantity={qty}
          />
        )}

        {!address && (
          <div className="mt-3 text-xs text-[#ffd166] bg-[#ffd166]/10 rounded-lg p-2 border border-[#ffd166]/30">
            Connect your wallet to continue.
          </div>
        )}
      </motion.div>
    </div>
  );
}
