// src/components/Connect.tsx - Updated with icon
import { useEffect, useState } from 'react'
import { Wallet } from 'lucide-react';
import { motion } from 'framer-motion';

export default function Connect({ onAddress }: { onAddress: (addr: `0x${string}`) => void }) {
  const [addr, setAddr] = useState<`0x${string}` | null>(null)
  const [chainId, setChainId] = useState<string | null>(null)
  const [isMiniPay, setIsMiniPay] = useState<boolean>(false)
  const [networkError, setNetworkError] = useState<string | null>(null)
  const [isConnecting, setIsConnecting] = useState<boolean>(false)

  // Detect if running in MiniPay browser
  useEffect(() => {
    const isMiniPayBrowser = window.navigator.userAgent.includes('MiniPay');
    setIsMiniPay(isMiniPayBrowser);
    
    if (isMiniPayBrowser) {
      console.log("Running in MiniPay browser");
    }
  }, []);

  useEffect(() => {
    (async () => {
      const eth = (window as any).ethereum
      if (!eth) return
      try {
        const [cid, accs] = await Promise.all([
          eth.request({ method: 'eth_chainId' }),
          eth.request({ method: 'eth_accounts' }),
        ])
        console.log(`Connected to chain: ${cid}, accounts:`, accs);
        setChainId(cid)
        if (accs?.[0]) { setAddr(accs[0]); onAddress(accs[0]) }
        eth.on?.('chainChanged', (c: string) => {
          console.log(`Chain changed to: ${c}`);
          setChainId(c);
          setNetworkError(null); // Clear error when network changes
        })
        eth.on?.('accountsChanged', (accs: string[]) => {
          console.log(`Accounts changed:`, accs);
          const a = (accs?.[0] || null) as any
          setAddr(a); if (a) onAddress(a)
        })
      } catch (err) {
        console.error("Wallet connection error:", err);
      }
    })()
  }, [onAddress])

  async function connect() {
    setIsConnecting(true);
    setNetworkError(null); // Clear previous errors
    try {
      const eth = (window as any).ethereum
      if (!eth) {
        if (isMiniPay) {
          alert('Please use the built-in wallet in MiniPay.');
        } else {
          alert('Install a Celo-compatible wallet (MiniPay, Valora via WalletConnect, or MetaMask on Celo).');
        }
        return;
      }
      
      console.log("Requesting accounts...");
      const accs = await eth.request({ method: 'eth_requestAccounts' });
      console.log("Accounts received:", accs);
      
      setAddr(accs[0]); 
      onAddress(accs[0]);
      
      // Check if on correct network - Celo Mainnet or Sepolia
      const chainId = await eth.request({ method: 'eth_chainId' });
      console.log("Current chain ID:", chainId);
      
      setChainId(chainId);
      
      if (!isCorrectNetwork(chainId)) {
        promptSwitchNetwork();
      }
    } catch (err) {
      console.error("Connection request error:", err);
      alert("Failed to connect wallet. Please try again.");
    } finally {
      setIsConnecting(false);
    }
  }

  // Helper to check if on Celo Sepolia Testnet (11142220 or 0xAA044C)
  const isCorrectNetwork = (chain: string | null) => {
    if (!chain) return false;
    const normalized = typeof chain === 'string' ? chain.toLowerCase() : chain;
    return normalized === '0xaa044c' || // Celo Sepolia in hex (case-insensitive)
           chain === '11142220' ||  // Celo Sepolia Testnet in decimal
           parseInt(chain, 16) === 11142220; // Parse and compare as decimal
  };
  
  // Helper to prompt switching to correct network
  const promptSwitchNetwork = async () => {
    try {
      const eth = (window as any).ethereum;
      
      // Check if we're in MiniPay
      const isMiniPayBrowser = window.navigator.userAgent.includes('MiniPay');
      
      if (isMiniPayBrowser) {
        // For MiniPay, provide clear instructions on how to switch networks
        setNetworkError(
          'Please switch to Celo Sepolia Testnet in MiniPay: Tap the network name at the top of the MiniPay app and select "Celo Sepolia Testnet"'
        );
        return;
      }
      
      // For other wallets, try to switch programmatically
      try {
        await eth.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: '0xAA044C' }], // Celo Sepolia Testnet
        });
      } catch (switchError: any) {
        // If this error code is 4902, the chain hasn't been added to wallet
        if (switchError.code === 4902) {
          try {
            await eth.request({
              method: 'wallet_addEthereumChain',
              params: [
                {
                  chainId: '0xAA044C', // Celo Mainnet
                  chainName: 'Celo Sepolia Testnet',
                  nativeCurrency: {
                    name: 'CELO',
                    symbol: 'CELO',
                    decimals: 18,
                  },
                  rpcUrls: ['https://forno.celo-sepolia.celo-testnet.org'],
                  blockExplorerUrls: ['https://sepolia.celoscan.io'],
                },
              ],
            });
          } catch (addError) {
            console.error("Failed to add Celo network:", addError);
            setNetworkError('Please manually switch to Celo Sepolia Testnet in your wallet settings.');
          }
        } else {
          console.error("Switch chain error:", switchError);
          setNetworkError('Please manually switch to Celo Sepolia Testnet in your wallet settings.');
        }
      }
    } catch (error) {
      console.error("Network switching error:", error);
      setNetworkError('Please manually switch to Celo Sepolia Testnet in your wallet.');
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={connect}
        disabled={isConnecting}
        className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-primary/20 hover:bg-primary/30 text-primary transition-colors"
      >
        <Wallet className="w-4 h-4" />
        {isConnecting ? (
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-full border-2 border-primary border-t-transparent animate-spin"></div>
            <span>Connecting...</span>
          </div>
        ) : (
          <span>Connect Wallet</span>
        )}
      </motion.button>
      
      {/* Network error message */}
      {networkError && (
        <div className="text-xs text-error bg-error/10 p-2 rounded border border-error/30">
          {networkError}
        </div>
      )}
      
      {/* MiniPay specific warning if connected but not on Celo */}
      {isMiniPay && addr && !isCorrectNetwork(chainId) && (
        <div className="text-xs text-orange-400 bg-orange-400/10 p-2 rounded border border-orange-400/30 mt-1">
          <strong>MiniPay:</strong> You must be on Celo network! Tap the network name at top of MiniPay app to switch.
        </div>
      )}
    </div>
  );
}