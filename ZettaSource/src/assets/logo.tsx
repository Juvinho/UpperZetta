import React from "react";

export function ZettaLogo({ compact = false }: { compact?: boolean }): React.ReactElement {
  return (
    <div className={compact ? "zetta-logo compact" : "zetta-logo"} aria-hidden="true">
      <svg viewBox="0 0 48 48" role="img">
        <defs>
          <linearGradient id="zettaGradient" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#00bcd4" />
            <stop offset="100%" stopColor="#2ef5b9" />
          </linearGradient>
        </defs>
        <rect x="2" y="2" width="44" height="44" rx="10" fill="url(#zettaGradient)" />
        <path
          d="M12 14h24v5L19 29h17v5H12v-5l17-10H12z"
          fill="#041018"
          stroke="#041018"
          strokeWidth="0.5"
        />
      </svg>
    </div>
  );
}
