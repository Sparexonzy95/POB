// src/pages/Profile.tsx
import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  User,
  Wallet,
  Coins,
  Copy as CopyIcon, // ✅ clearer icon
  Trophy,
  Ticket,
  Zap,
  RefreshCcw,
  MessageSquare,
  Twitter,
  Github,
  Info,
  CheckCircle2,
} from "lucide-react";
import GameStats from "../components/GameStats";
import { useAppState } from "../context/AppStateProvider";

type Props = { goBuy: () => void };

/** Robust clipboard copy with fallback for older / insecure contexts */
async function copyText(text: string) {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // fall through to manual
  }
  try {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    document.execCommand("copy");
    document.body.removeChild(ta);
    return true;
  } catch {
    return false;
  }
}

export function Profile({ goBuy }: Props) {
  const {
    address,
    balance,
    symbol,
    balanceLoading,
    credits,
    tournamentPasses,
    tournamentPassesLoading,
    tournamentsWithPasses,
    isLoading,
    refreshAll,
  } = useAppState();

  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    if (!address) return;
    const ok = await copyText(address);
    if (ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    }
  }, [address]);

  return (
    <div className="space-y-6">
      {/* Header / Wallet card */}
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.3 }}
        className="rounded-2xl overflow-hidden bg-surface border border-secondary/60 shadow-soft"
      >
        <div className="p-4 bg-[#2D4014] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-full bg-[#94C751]/20 border border-[#94C751]/40 flex items-center justify-center">
              <User className="w-5 h-5 text-[#94C751]" />
            </div>
            <div>
              <h2 className="font-semibold text-[#EAF9D5]">My Profile</h2>
              <div className="text-xs text-[#EAF9D5]/60 flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-[#94C751] animate-pulse" />
                Connected to Celo Sepolia 
              </div>
            </div>
          </div>

          <button
            onClick={refreshAll}
            className="px-3 py-1 rounded-lg bg-[#94C751]/20 text-[#94C751] text-xs hover:bg-[#94C751]/30 inline-flex items-center gap-1"
          >
            {isLoading ? (
              <span className="w-3 h-3 rounded-full border-2 border-[#94C751] border-t-transparent animate-spin" />
            ) : (
              <RefreshCcw className="w-3 h-3" />
            )}
            Refresh
          </button>
        </div>

        {/* Address row (responsive + accessible copy) */}
        <div className="p-4 border-b border-secondary/30">
          <div className="text-sm opacity-70 mb-2">Wallet Address</div>

          <div className="bg-[#1c2a0c]/60 rounded-lg p-2 flex items-center justify-between gap-2">
            <div
              className="text-xs font-mono text-[#EAF9D5] truncate truncate-address"
              title={address || "Not connected"}
            >
              {address
                ? (
                  <>
                    <span className="hidden md:inline">{address}</span>
                    <span className="md:hidden">
                      {address.slice(0, 10)}…{address.slice(-10)}
                    </span>
                  </>
                  )
                : "Not connected"}
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleCopy}
                disabled={!address}
                aria-label="Copy wallet address"
                className="p-2 rounded-md hover:bg-[#3A5019] disabled:opacity-40 disabled:cursor-not-allowed text-[#94C751] inline-flex items-center justify-center"
              >
                <CopyIcon className="w-4 h-4" />
              </button>

              <AnimatePresence>
                {copied && (
                  <motion.span
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    transition={{ duration: 0.18 }}
                    className="hidden sm:inline-flex items-center gap-1 text-xs text-[#94C751]"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Copied!
                  </motion.span>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Mobile-only tiny copied badge */}
          <AnimatePresence>
            {copied && (
              <motion.div
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.18 }}
                className="sm:hidden mt-2 text-[11px] inline-flex items-center gap-1 text-[#94C751]"
              >
                <CheckCircle2 className="w-3.5 h-3.5" /> Copied to clipboard
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Balance */}
        <div className="p-4">
          <div className="flex items-center gap-1 text-sm mb-3 text-[#C9E3A8]">
            <Wallet className="w-4 h-4 text-[#94C751]" />
            <span className="font-semibold">Balance</span>
          </div>

          <div className="flex justify-between items-center p-3 bg-[#1c2a0c]/60 rounded-xl border border-[#3A5019] mb-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full flex items-center justify-center bg-[#94C751]/30">
                <Coins className="w-4 h-4 text-[#94C751]" />
              </div>
              <div>
                <div className="text-xs opacity-70">cUSD Balance</div>
                <div className="text-base font-semibold text-[#EAF9D5]">
                  {address ? (
                    balanceLoading ? (
                      <span className="w-4 h-4 inline-block rounded-full border-2 border-[#94C751] border-t-transparent animate-spin" />
                    ) : (
                      `${balance} ${symbol}`
                    )
                  ) : (
                    "—"
                  )}
                </div>
              </div>
            </div>
            <button className="px-3 py-1 rounded-lg border border-[#94C751]/60 text-[#94C751] hover:bg-[#94C751]/10 text-xs">
              Get cUSD
            </button>
          </div>
        </div>
      </motion.div>

      {/* Game Assets (Credits + Passes) */}
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.3, delay: 0.05 }}
        className="rounded-2xl overflow-hidden bg-surface border border-secondary/60 shadow-soft"
      >
        <div className="p-4 bg-[#2D4014] flex items-center">
          <Trophy className="w-5 h-5 text-[#94C751] mr-2" />
          <div className="font-semibold text-[#EAF9D5]">Game Assets</div>
        </div>

        <div className="p-4">
          {/* Credits */}
          <div className="flex justify-between items-center p-3 bg-[#1c2a0c]/60 rounded-xl border border-[#3A5019] mb-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full flex items-center justify-center bg-[#94C751]/30">
                <Zap className="w-4 h-4 text-[#94C751]" />
              </div>
              <div>
                <div className="text-xs opacity-70">Quiz Credits</div>
                <div className="text-base font-semibold text-[#EAF9D5]">{credits}</div>
              </div>
            </div>
            <button
              onClick={goBuy}
              className="px-3 py-1 rounded-lg border border-[#94C751]/60 text-[#94C751] hover:bg-[#94C751]/10 text-xs"
            >
              Buy Credits
            </button>
          </div>

          {/* Passes */}
          <div className="flex justify-between items-center p-3 bg-[#1c2a0c]/60 rounded-xl border border-[#3A5019]">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full flex items-center justify-center bg-[#94C751]/30">
                <Ticket className="w-4 h-4 text-[#94C751]" />
              </div>
              <div>
                <div className="text-xs opacity-70">Tournament Passes</div>
                <div className="flex items-center">
                  <div className="text-base font-semibold text-[#EAF9D5]">
                    {address ? (
                      tournamentPassesLoading ? (
                        <span className="w-4 h-4 inline-block rounded-full border-2 border-[#94C751] border-t-transparent animate-spin" />
                      ) : (
                        tournamentPasses ?? "0"
                      )
                    ) : (
                      "—"
                    )}
                  </div>
                  {tournamentsWithPasses.length > 0 && (
                    <span className="ml-2 text-xs opacity-60">
                      (across {tournamentsWithPasses.length} tournaments)
                    </span>
                  )}
                </div>
              </div>
            </div>
            <button className="px-3 py-1 rounded-lg border border-[#94C751]/60 text-[#94C751] hover:bg-[#94C751]/10 text-xs">
              Get Passes
            </button>
          </div>
        </div>
      </motion.div>

      {/* Stats */}
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.3, delay: 0.1 }}
      >
        <GameStats address={address} />
      </motion.div>

      {/* About / Links */}
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.3, delay: 0.2 }}
        className="rounded-2xl p-4 bg-surface border border-secondary/60 shadow-soft"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Info className="w-4 h-4 text-[#94C751]" />
            <div className="text-sm font-semibold text-[#C9E3A8]">About</div>
          </div>
          <div className="flex items-center gap-2">
            <a href="#" className="text-[#94C751] hover:text-[#C9E3A8]" title="Discord">
              <MessageSquare className="w-4 h-4" />
            </a>
            <a href="#" className="text-[#94C751] hover:text-[#C9E3A8]" title="Twitter / X">
              <Twitter className="w-4 h-4" />
            </a>
            <a href="#" className="text-[#94C751] hover:text-[#C9E3A8]" title="GitHub">
              <Github className="w-4 h-4" />
            </a>
          </div>
        </div>
        <div className="text-xs opacity-70 mt-2">
          <p>Built on Celo Mainnet  fair, fast and friendly.</p>
          <p className="mt-1">Version 1.0.0 • © 2025 Proof Of Brain</p>
        </div>
      </motion.div>
    </div>
  );
}
