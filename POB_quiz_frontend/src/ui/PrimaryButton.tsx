import React from "react";

type Props = React.ButtonHTMLAttributes<HTMLButtonElement> & { glow?: boolean };

export default function PrimaryButton({ glow = true, className = "", ...props }: Props) {
  return (
    <button
      {...props}
      className={[
        // green theme primary pill (no white), great contrast on dark bg
        "rounded-2xl px-4 py-3 w-full font-semibold transition-all active:scale-95 disabled:opacity-50",
        glow ? "shadow-lux-glow" : "",
        "bg-primary text-background hover:bg-highlight",
        className,
      ].join(" ")}
    />
  );
}
