import React from "react";

export default function Card({
  children,
  className = "",
}: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={[
        // uniform surface card (dark, no white)
        "bg-surface text-highlight rounded-2xl p-4 border border-secondary/60 shadow-soft",
        className,
      ].join(" ")}
    >
      {children}
    </div>
  );
}
