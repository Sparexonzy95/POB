// src/components/LearnPanel.tsx
import { useState, useEffect } from 'react';
import { BookOpen, ArrowRight, Clock, Calendar, Tag, ArrowLeft } from 'lucide-react';
import { motion } from 'framer-motion';

// Sample articles data - would come from your backend in production
const sampleArticles = [
  {
    id: 1,
    title: "Understanding Celo Stablecoins",
    summary: "Learn about the different stablecoins in the Celo ecosystem and how they work.",
    image: "/images/learn/stablecoins.jpg",
    category: "Basics",
    readTime: 5,
    date: "2025-10-20",
    content: "Celo stablecoins are digital assets designed to maintain a stable value relative to a specific currency or asset. The Celo ecosystem features several stablecoins, with the most prominent being cUSD (Celo Dollar), which is pegged to the US Dollar.\n\nThese stablecoins are fully backed by a diversified portfolio of cryptocurrencies in the Celo reserve, which helps maintain the peg. The reserve is automatically managed by the Celo protocol using algorithms that respond to market conditions.\n\nCelo's approach to stablecoins is unique because it combines the stability of traditional fiat currencies with the transparency, speed, and low fees of blockchain technology. This makes them particularly useful for remittances, micropayments, and day-to-day transactions in regions where traditional banking infrastructure is limited.\n\nIn addition to cUSD, the Celo ecosystem includes cEUR (pegged to the Euro) and cREAL (pegged to the Brazilian Real), providing stable currency options for different regional needs. This multi-currency approach helps reduce foreign exchange costs for users around the world."
  },
  {
    id: 2,
    title: "How Quiz Games Work on Celo",
    summary: "Understand the mechanics behind on-chain quiz games and tournaments.",
    image: "/images/learn/quiz.jpg",
    category: "Games",
    readTime: 3,
    date: "2025-10-25",
    content: "Blockchain-based quiz games on Celo operate through smart contracts that handle game logic, player interactions, and prize distributions. In a typical implementation, the quiz contract stores questions, manages player entries, and automatically distributes rewards based on performance.\n\nWhen a player enters a quiz, they typically pay a small entry fee in cUSD which goes into the prize pool. The smart contract then randomly selects questions from a database and presents them to the player. After answering, the contract verifies the responses against the correct answers stored securely on-chain.\n\nFor successful players who meet the winning criteria (like answering all questions correctly within a time limit), the smart contract automatically transfers the appropriate reward from the prize pool to the player's wallet address. This entire process happens without intermediaries, ensuring transparency and immediate payouts.\n\nTournaments add another layer by tracking performance across multiple players over a set period. Leaderboards are maintained on-chain, with final prizes distributed to top performers when the tournament concludes. The decentralized nature of these games ensures that rules cannot be changed mid-game and that prize distribution follows the predetermined logic coded in the smart contract."
  },
  {
    id: 3,
    title: "Blockchain Security for Beginners",
    summary: "Essential security tips for managing your crypto assets safely.",
    image: "/images/learn/security.jpg",
    category: "Security",
    readTime: 7,
    date: "2025-10-30",
    content: "Securing your blockchain assets starts with proper wallet management. Always store your private keys or seed phrases offline in a secure location—never digitally. Consider using hardware wallets for significant holdings, as they keep your keys isolated from internet-connected devices.\n\nWhen interacting with blockchain applications, always verify website URLs and app sources. Legitimate projects have official domains and verified social media accounts. Be extremely cautious of links shared via direct messages or emails, as phishing attempts are common.\n\nUse strong, unique passwords for exchange accounts and enable two-factor authentication (2FA) using an authenticator app rather than SMS. SMS-based 2FA can be compromised through SIM swapping attacks.\n\nBefore approving transactions, double-check all details including recipient addresses, transaction amounts, and gas fees. Small errors can result in irreversible loss of funds. For high-value transactions, consider sending a small test amount first.\n\nRegularly update your devices and wallet software to protect against security vulnerabilities. Be aware of common scams like fake giveaways, investment schemes promising unrealistic returns, and imposters claiming to be customer support.\n\nFinally, diversify your storage approach for significant assets. Consider distributing your holdings across multiple secure wallets rather than keeping everything in one place, creating a more resilient security setup."
  },

  // --- NEW ARTICLES ---
  {
    id: 4,
    title: "Reading On-Chain Transactions",
    summary: "A practical guide to inspecting transactions on Celo block explorers.",
    image: "/images/learn/transactions.jpg",
    category: "Tools",
    readTime: 4,
    date: "2025-11-01",
    content: "Block explorers let you inspect transactions, contracts, and token transfers on Celo. Start by pasting a wallet address into the explorer search bar to see incoming and outgoing transactions, token balances, and contract interactions.\n\nWhen you open a transaction detail page, look for the 'from' and 'to' fields, the value transferred, the token used (cUSD, cEUR, or native CELO), gas fees, and any event logs emitted by a smart contract. Event logs are crucial — they reveal which functions were called and the data those calls emitted.\n\nIf you're debugging a failed payout or an unexpected transfer, check the receipt status (success/failure) and the gas used. For interactions with tokens, use the 'ERC-20 transfer' logs to confirm recipient addresses and amounts. Finally, cross-reference the timestamp with your local logs to correlate on-chain events with backend processing."
  },
  {
    id: 5,
    title: "Building a Simple dApp: Frontend to Contract",
    summary: "Step-by-step walkthrough for connecting a React UI to a Celo smart contract.",
    image: "/images/learn/dapp.jpg",
    category: "Development",
    readTime: 8,
    date: "2025-11-03",
    content: "Building a dApp involves three main layers: the smart contract, a JSON-RPC provider (wallet), and the frontend UI. Start by writing and deploying a simple contract that exposes read/write functions for a small state (e.g., a greeting or counter).\n\nOn the frontend, install a web3 provider library compatible with Celo (like @celo/contractkit or ethers.js). Detect the user's wallet (e.g., Valora or MetaMask) and request permission to connect. Once connected, build a lightweight service that creates a contract instance using the contract ABI and address.\n\nFor write operations, prepare transactions (function calls) and have users sign them via their wallet. For reads, call view functions via the provider to fetch on-chain state. Remember to handle user rejection, show pending states, and re-fetch state after confirmed transactions. Finally, test thoroughly on a Celo testnet before mainnet deployment."
  },
  {
    id: 6,
    title: "Designing Fair On-Chain Randomness",
    summary: "How to produce unbiased randomness for games and lotteries on-chain.",
    image: "/images/learn/randomness.jpg",
    category: "Research",
    readTime: 6,
    date: "2025-11-05",
    content: "Generating secure randomness on-chain is hard because blockchain data is deterministic and can be influenced by miners/validators. Common patterns include using commit-reveal schemes, VRF (Verifiable Random Functions), or on-chain randomness oracles.\n\nA commit-reveal scheme requires players (or the house) to first commit a hash of a secret, then reveal the secret later; combining multiple commits reduces manipulation risk. VRFs provide cryptographic proofs that a value was derived fairly from an input and cannot be predicted beforehand.\n\nFor high-value games, prefer audited oracle-based randomness (e.g., Chainlink VRF where available) or hybrid approaches combining off-chain and on-chain entropy sources. Always design fallback and dispute mechanisms so users can verify or challenge the fairness of a drawn result."
  }
];

export default function LearnPanel() {
  const [articles, setArticles] = useState(sampleArticles);
  const [selectedArticle, setSelectedArticle] = useState<number | null>(null);
  
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };
  
  return (
    <div className="space-y-5">
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.3 }}
        className="rounded-2xl p-6 shadow-lg border border-secondary/60 relative overflow-hidden"
        style={{ background: "linear-gradient(145deg, #587E28, #94C751)" }}
      >
        <div className="absolute top-0 left-0 right-0 bottom-0 opacity-10 pointer-events-none">
          <div className="absolute top-0 left-0 w-32 h-32 rounded-full bg-white transform -translate-x-1/2 -translate-y-1/2"></div>
          <div className="absolute bottom-0 right-0 w-40 h-40 rounded-full bg-white transform translate-x-1/2 translate-y-1/2"></div>
        </div>
        
        <h1 className="text-2xl font-extrabold text-background drop-shadow-sm">Learn & Explore</h1>
        <p className="mt-2 text-base/6 text-background/90">
          Discover articles, guides, and resources about Celo, blockchain, and more
        </p>
      </motion.div>

      {selectedArticle === null ? (
        <div className="space-y-4">
          {articles.map(article => (
            <motion.div
              key={article.id}
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.3, delay: 0.1 }}
              className="rounded-2xl overflow-hidden border border-secondary/60 shadow-soft bg-surface"
            >
              <div className="h-32 bg-[#2D4014] relative overflow-hidden">
                <div className="absolute inset-0 flex items-center justify-center bg-[#2D4014]/70">
                  <BookOpen className="w-12 h-12 text-[#94C751]/50" />
                </div>
              </div>
              <div className="p-4">
                <div className="flex justify-between items-start mb-2">
                  <span className="text-xs px-2 py-0.5 bg-[#2D4014] text-[#94C751] rounded-full">
                    {article.category}
                  </span>
                  <div className="flex items-center text-xs text-highlight/60">
                    <Clock className="w-3 h-3 mr-1" />
                    <span>{article.readTime} min read</span>
                  </div>
                </div>
                <h3 className="text-lg font-bold text-[#C9E3A8] mb-2">{article.title}</h3>
                <p className="text-sm text-highlight/80 mb-3">{article.summary}</p>
                <div className="flex items-center justify-between">
                  <div className="flex items-center text-xs text-highlight/60">
                    <Calendar className="w-3 h-3 mr-1" />
                    <span>{formatDate(article.date)}</span>
                  </div>
                  <button 
                    onClick={() => setSelectedArticle(article.id)}
                    className="flex items-center text-[#94C751] hover:text-[#C9E3A8] text-sm"
                  >
                    Read more 
                    <ArrowRight className="w-4 h-4 ml-1" />
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      ) : (
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.3 }}
          className="rounded-2xl overflow-hidden border border-secondary/60 shadow-soft bg-surface p-5"
        >
          <button 
            onClick={() => setSelectedArticle(null)}
            className="flex items-center text-[#94C751] mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-1" />
            Back to articles
          </button>
          
          <div className="mb-4">
            <span className="text-xs px-2 py-0.5 bg-[#2D4014] text-[#94C751] rounded-full">
              {articles.find(a => a.id === selectedArticle)?.category}
            </span>
          </div>
          
          <h2 className="text-2xl font-bold text-[#C9E3A8] mb-3">
            {articles.find(a => a.id === selectedArticle)?.title}
          </h2>
          
          <div className="flex items-center gap-4 mb-6 text-xs text-highlight/60">
            <div className="flex items-center">
              <Calendar className="w-3 h-3 mr-1" />
              <span>{formatDate(articles.find(a => a.id === selectedArticle)?.date || "")}</span>
            </div>
            <div className="flex items-center">
              <Clock className="w-3 h-3 mr-1" />
              <span>{articles.find(a => a.id === selectedArticle)?.readTime} min read</span>
            </div>
          </div>
          
          <div className="text-highlight/90 space-y-4">
            {/* Format article content with paragraphs */}
            {articles.find(a => a.id === selectedArticle)?.content.split('\n\n').map((paragraph, index) => (
              <p key={index} className="text-sm leading-relaxed">
                {paragraph}
              </p>
            ))}
          </div>
        </motion.div>
      )}
    </div>
  );
}
