import { useEffect, useRef, useState } from "react"
import { Contract, JsonRpcProvider, isAddress, formatUnits } from "ethers"

// --- Minimal ERC20 ABI ---
const ERC20_ABI = [
  "function balanceOf(address owner) view returns (uint256)",
  "function decimals() view returns (uint8)",
  "function symbol() view returns (string)",
]

// --- cUSD on Celo Sepolia Testnet ---
// Default to Sepolia testnet cUSD address
const CUSD_SEPOLIA_FALLBACK = "0x88eeC49252c8cbc039DCdB394c0c2BA2f1637EA0"
const CUSD = (import.meta.env?.VITE_CUSD_ADDRESS as string) || CUSD_SEPOLIA_FALLBACK

// --- Celo Sepolia Testnet RPCs ---
const CELO_RPCS = [
  import.meta.env?.VITE_CELO_RPC as string | undefined,
  "https://forno.celo-sepolia.celo-testnet.org",
  "https://alfajores-forno.celo-testnet.org", // backup RPC
].filter(Boolean) as string[]

// Celo Sepolia Testnet Chain ID
const CELO_SEPOLIA_CHAIN_ID = 11142220

// Format helper: keep tiny balances readable
function formatNice(n: bigint | string | number, decimals: number): string {
  const asStr = typeof n === "bigint" ? n.toString() : String(n)
  const num = Number(typeof n === "bigint" ? formatUnits(n, decimals) : n)
  if (!isFinite(num)) return "0.000000"
  // 6 decimals below 0.01; 4 decimals otherwise
  const out = num < 0.01 ? num.toFixed(6) : num.toFixed(4)
  // strip trailing zeros but keep at least 2 decimals
  const trimmed = out.replace(/(\.\d*?[1-9])0+$/,"$1").replace(/\.0$/,".00")
  return trimmed
}

export default function useCusdBalance(address?: `0x${string}` | null) {
  const [balance, setBalance] = useState<string>("0.000000")
  const [symbol, setSymbol] = useState<string>("cUSD")
  const [loading, setLoading] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)
  const timerRef = useRef<number | null>(null)

  async function fetchOnce(addr: `0x${string}`) {
    if (!isAddress(addr)) {
      setError("Invalid address"); 
      setBalance("0.000000")
      return
    }
    if (!isAddress(CUSD)) {
      setError("Invalid cUSD address (env)"); 
      setBalance("0.000000")
      return
    }

    let lastErr: any = null
    for (const url of CELO_RPCS) {
      try {
        // ✅ FIXED: Use Celo Sepolia Testnet chain ID
        const provider = new JsonRpcProvider(url, { 
          name: "celo-sepolia", 
          chainId: CELO_SEPOLIA_CHAIN_ID 
        })
        const erc20 = new Contract(CUSD, ERC20_ABI, provider)

        const [raw, dec, sym] = await Promise.all([
          erc20.balanceOf(addr),
          erc20.decimals().catch(() => 18),
          erc20.symbol().catch(() => "cUSD"),
        ])

        const pretty = formatNice(raw, dec || 18)
        setSymbol(sym || "cUSD")
        setBalance(pretty)
        setError(null)
        // useful debug
        console.debug("[useCusdBalance] RPC OK:", url, "raw:", raw.toString(), "dec:", dec, "fmt:", pretty)
        return
      } catch (e) {
        lastErr = e
        console.warn("[useCusdBalance] RPC failed:", url, e)
        // try next RPC
      }
    }

    // If all RPCs failed:
    setError("All RPCs failed")
    setBalance("0.000000")
    console.error("[useCusdBalance] All RPCs failed. Last error:", lastErr)
  }

  useEffect(() => {
    // clear previous poller
    if (timerRef.current) {
      window.clearInterval(timerRef.current)
      timerRef.current = null
    }

    if (!address) {
      setBalance("0.000000")
      setError(null)
      return
    }

    setLoading(true)
    fetchOnce(address as `0x${string}`).finally(() => setLoading(false))

    // poll every 10s to keep fresh
    timerRef.current = window.setInterval(() => {
      fetchOnce(address as `0x${string}`)
    }, 10000) as unknown as number

    return () => {
      if (timerRef.current) {
        window.clearInterval(timerRef.current)
        timerRef.current = null
      }
    }
  }, [address])

  return { balance, symbol, loading, error }
}