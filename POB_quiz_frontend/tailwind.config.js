/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx,js,jsx}"],
  theme: {
    extend: {
      /* ===== New Green Luxury palette ===== */
      colors: {
        primary: "#94C751",     // Fresh green (buttons, highlights)
        secondary: "#587E28",   // Deep green (borders/hover)
        background: "#101707",  // Page bg
        surface: "#263711",     // Card bg
        highlight: "#C9E3A8",   // Soft pale green text/accents

        /* ===== Keep old palette for compatibility (do not remove yet) ===== */
        prosperity: "#FCFF52",
        fig: "#1E002B",
        wood: "#655947",
        sand: "#E7E3D4",
        snow: "#FFFFFF",
        gypsum: "#FCF6F1",
        citrus: "#FF9A51",
        jade: "#56DF7C",
        lavander: "#B490FF",
        error: "#E70532",
        disabled: "#9B9B9B",
        lotus: "#FFA3EB",
      },

      /* Optional glows/shadows tuned to the new palette */
      boxShadow: {
        "lux-glow": "0 0 20px rgba(148, 199, 81, 0.35)",   // primary glow
        "lux-soft": "0 12px 30px rgba(0,0,0,0.35)",
      },

      borderRadius: {
        xl2: "1rem",
      },

      backgroundImage: {
        "lux-gradient": "linear-gradient(145deg, #101707, #263711)",
        "cta-gradient": "linear-gradient(135deg, #587E28, #94C751)",
      },

      fontFamily: {
        inter: ["Inter", "ui-sans-serif", "system-ui", "sans-serif"],
        playfair: ["Playfair Display", "serif"],
        poppins: ["Poppins", "Inter", "ui-sans-serif", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
}
