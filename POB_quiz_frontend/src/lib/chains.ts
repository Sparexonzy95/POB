import { defineChain } from 'viem'

// Celo Sepolia Testnet configuration
export const celo = defineChain({
  id: 11142220,
  name: 'Celo Sepolia Testnet',
  nativeCurrency: { name: 'CELO', symbol: 'CELO', decimals: 18 },
  rpcUrls: { 
    default: { 
      http: [import.meta.env.VITE_CELO_RPC || 'https://forno.celo-sepolia.celo-testnet.org'] 
    } 
  },
  blockExplorers: { 
    default: { 
      name: 'Celo Sepolia Explorer', 
      url: 'https://celo-sepolia.blockscout.com' 
    } 
  },
  testnet: true,
})

// Optional: Export both if you want to switch between them easily
export const celoMainnet = defineChain({
  id: 42220,
  name: 'Celo Mainnet',
  nativeCurrency: { name: 'CELO', symbol: 'CELO', decimals: 18 },
  rpcUrls: { 
    default: { 
      http: [import.meta.env.VITE_CELO_RPC || 'https://forno.celo.org'] 
    } 
  },
  blockExplorers: { 
    default: { 
      name: 'Celoscan', 
      url: 'https://celoscan.io' 
    } 
  },
})

export const celoSepolia = defineChain({
  id: 11142220,
  name: 'Celo Sepolia Testnet',
  nativeCurrency: { name: 'CELO', symbol: 'CELO', decimals: 18 },
  rpcUrls: { 
    default: { 
      http: ['https://forno.celo-sepolia.celo-testnet.org'] 
    } 
  },
  blockExplorers: { 
    default: { 
      name: 'Celo Sepolia Explorer', 
      url: 'https://celo-sepolia.blockscout.com' 
    } 
  },
  testnet: true,
})