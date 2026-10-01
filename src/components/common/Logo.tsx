import React from "react";

/**
 * Twende Duka monogram — geometric "TD" ligature.
 * Drawn entirely with strokes so the same geometry can be
 * re-used by the logo-draw loader (see components/common/Loader.tsx).
 */

/** Shared geometry (viewBox 0 0 120 120) */
export const LOGO_PATHS = {
  /** T — crossbar then stem */
  tBar: "M20 34 H62",
  tStem: "M41 34 V88",
  /** D — stem then bowl */
  dStem: "M63 34 V88",
  dBowl: "M63 34 H74 C92 34 100 44 100 61 C100 78 92 88 74 88 H63",
  /** upward growth accent */
  accent: "M20 100 H100",
} as const;

interface LogoProps extends React.SVGProps<SVGSVGElement> {
  size?: number | string;
}

export default function Logo({ size = 36, className, ...props }: LogoProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 120 120"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`text-primary flex-shrink-0 ${className || ""}`}
      aria-hidden="true"
      {...props}
    >
      <g
        stroke="currentColor"
        strokeWidth={11}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      >
        <path d={LOGO_PATHS.tBar} />
        <path d={LOGO_PATHS.tStem} />
        <path d={LOGO_PATHS.dStem} />
        <path d={LOGO_PATHS.dBowl} />
      </g>
      {/* baseline accent — the "growth" line */}
      <path
        d={LOGO_PATHS.accent}
        stroke="currentColor"
        strokeWidth={7}
        strokeLinecap="round"
        opacity={0.35}
      />
    </svg>
  );
}
