import { useEffect, useState } from "react";

export default function useMiniPay() {
  const [isMiniPayBrowser, setIsMiniPayBrowser] = useState(false);

  useEffect(() => {
    const detectMiniPay = typeof window !== "undefined" &&
      window.navigator.userAgent.includes("MiniPay");
    setIsMiniPayBrowser(detectMiniPay);

    if (!detectMiniPay) return;

    document.body.classList.add("minipay-mode");

    // Patch fetch to bust cache for /api/* calls
    const originalFetch = window.fetch;
    window.fetch = function (input: RequestInfo | URL, init?: RequestInit) {
      let modified = input as string;

      if (typeof input === "string" && input.includes("/api/")) {
        const url = new URL(input, window.location.origin);
        url.searchParams.append("_t", Date.now().toString());
        modified = url.toString();
      }

      const newInit: RequestInit = {
        ...init,
        headers: {
          ...(init?.headers || {}),
          "Cache-Control": "no-cache, no-store, must-revalidate",
          Pragma: "no-cache",
        },
        cache: "no-store",
      };

      return originalFetch(modified, newInit);
    };

    // Dev badge in development
    if (import.meta.env?.MODE === "development") {
      const indicator = document.createElement("div");
      indicator.className = "minipay-indicator";
      indicator.textContent = "MiniPay";
      document.body.appendChild(indicator);

      return () => {
        indicator.parentNode?.removeChild(indicator);
      };
    }
  }, []);

  return isMiniPayBrowser;
}
