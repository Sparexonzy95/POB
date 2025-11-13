import React from "react";
import { motion } from "framer-motion";

type State = "idle" | "selected" | "correct" | "wrong";

export default function OptionButton({
  text,
  state = "idle",
  onClick,
}: { text: string; state?: State; onClick: () => void }) {
  const base =
    "w-full text-left px-4 py-3 rounded-2xl transition-all ease-lux border";

  // Theme mapping (no white backgrounds)
  const map: Record<State, string> = {
    idle: "bg-transparent border-secondary/60 text-highlight hover:bg-secondary/60 hover:border-primary",
    selected: "bg-primary text-background border-transparent shadow-lux-glow",
    correct: "bg-primary text-background border-transparent shadow-lux-glow",
    wrong: "bg-error text-background border-transparent",
  };

  return (
    <motion.button
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className={[base, map[state]].join(" ")}
    >
      {text}
    </motion.button>
  );
}
