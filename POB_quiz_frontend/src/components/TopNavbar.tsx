// src/components/TopNavbar.tsx - Bigger PoB logo, icon-only "How" button, wallet menu
import { useEffect, useRef, useState } from "react";
import Connect from "./Connect";
import { Wallet, LogOut, User, ChevronDown, Info } from "lucide-react";
import pobIcon from "../assets/PoB icon.png"; // ensure the file is in src/assets

type TopNavbarProps = {
  address?: `0x${string}` | null;
  onAddress: (addr: `0x${string}` | null) => void; // allow null for disconnect
  onNavigate: (tab: string) => void;
  currentTab: string;
};

export default function TopNavbar({
  address,
  onAddress,
  onNavigate,
  currentTab,
}: TopNavbarProps) {
  const [walletMenuOpen, setWalletMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  const handleNavigation = (tab: string) => {
    onNavigate(tab);
    setWalletMenuOpen(false);
  };

  // close wallet menu on outside click
  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!walletMenuOpen) return;
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setWalletMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [walletMenuOpen]);

  const howBtnClass =
    currentTab === "how"
      ? "bg-[#94C751]/20 text-[#94C751]"
      : "text-highlight/70 hover:text-highlight";

  return (
    <header className="sticky top-0 z-50 bg-background/95 backdrop-blur border-b border-secondary/60">
      <div className="max-w-md mx-auto px-4 py-3 flex items-center justify-between">
        {/* Left: Logo + brand */}
        <button
          onClick={() => handleNavigation("home")}
          className="font-semibold text-primary text-lg flex items-center gap-2 hover:text-[#C9E3A8] transition-colors"
          aria-label="Go to Home"
        >
          <img
            src={pobIcon}
            alt="PoB"
            className="w-8 h-8 md:w-9 md:h-9 rounded-sm object-contain"
            loading="eager"
            decoding="async"
          />
          Proof of Brain
        </button>

        {/* Middle: icon-only How (desktop) */}
        <div className="hidden md:flex items-center">
          <button
            onClick={() => handleNavigation("how")}
            className={`flex items-center justify-center w-8 h-8 rounded-lg ${howBtnClass}`}
            aria-label="How It Works"
            title="How It Works"
          >
            <Info className="w-4 h-4" />
          </button>
        </div>

        {/* Right: How (mobile) + Wallet */}
        <div className="flex items-center gap-3">
          {/* icon-only How (mobile) */}
          <button
            onClick={() => handleNavigation("how")}
            className={`md:hidden flex items-center justify-center w-8 h-8 rounded-lg ${howBtnClass}`}
            aria-label="How It Works"
            title="How It Works"
          >
            <Info className="w-4 h-4" />
          </button>

          {/* Wallet / Connect */}
          {address ? (
            <div className="relative" ref={menuRef}>
              <button
                onClick={() => setWalletMenuOpen((s) => !s)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-primary/20 hover:bg-primary/30 text-primary transition-colors"
                aria-haspopup="menu"
                aria-expanded={walletMenuOpen}
                aria-label="Open wallet menu"
              >
                <Wallet className="w-4 h-4" />
                <span className="text-sm hidden sm:inline">
                  {`${address.slice(0, 5)}...${address.slice(-4)}`}
                </span>
                <ChevronDown className="w-3 h-3" />
              </button>

              {walletMenuOpen && (
                <div
                  role="menu"
                  className="absolute right-0 mt-2 w-56 bg-surface border border-secondary/60 rounded-xl shadow-lg py-1 z-50"
                >
                  <div className="px-4 py-2 text-xs text-highlight/70 border-b border-secondary/30">
                    Connected Wallet
                  </div>
                  <div className="px-4 py-2 text-xs font-mono truncate text-highlight/90">
                    {address}
                  </div>
                  <button
                    role="menuitem"
                    onClick={() => handleNavigation("profile")}
                    className="w-full text-left px-4 py-2 text-sm text-highlight/90 hover:bg-secondary/30 flex items-center gap-2"
                  >
                    <User className="w-4 h-4" />
                    Profile
                  </button>
                  <button
                    role="menuitem"
                    onClick={() => {
                      setWalletMenuOpen(false);
                      onAddress(null);
                    }}
                    className="w-full text-left px-4 py-2 text-sm text-red-400/80 hover:bg-secondary/30 flex items-center gap-2"
                  >
                    <LogOut className="w-4 h-4" />
                    Disconnect
                  </button>
                </div>
              )}
            </div>
          ) : (
            <Connect onAddress={onAddress} />
          )}
        </div>
      </div>
    </header>
  );
}
