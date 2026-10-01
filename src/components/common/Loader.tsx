import React from "react";
import { cn } from "@/lib/utils";
import { LOGO_PATHS } from "@/components/common/Logo";

/**
 * Global logo-draw loader.
 * The Twende Duka "TD" monogram draws itself stroke by stroke, then erases and
 * repeats — themed strictly with app color tokens.
 * Use <Loader /> inline, <PageLoader /> for sections, <FullPageLoader /> for routes.
 */

const LOADER_CSS = `
.tdl {
  --tdl-duration: 2200ms;
  display: block;
  color: hsl(var(--primary));
}
.tdl .tdl-track {
  stroke: hsl(var(--primary) / 0.14);
}
.tdl .tdl-draw {
  stroke: currentColor;
  stroke-dasharray: 1;
  stroke-dashoffset: 1;
  animation: tdl-draw var(--tdl-duration) cubic-bezier(0.65, 0, 0.35, 1) infinite;
}
.tdl .tdl-draw:nth-of-type(1) { animation-delay: 0ms; }
.tdl .tdl-draw:nth-of-type(2) { animation-delay: 120ms; }
.tdl .tdl-draw:nth-of-type(3) { animation-delay: 240ms; }
.tdl .tdl-draw:nth-of-type(4) { animation-delay: 360ms; }
.tdl .tdl-accent {
  stroke: currentColor;
  stroke-dasharray: 1;
  stroke-dashoffset: 1;
  opacity: 0.45;
  animation: tdl-draw var(--tdl-duration) cubic-bezier(0.65, 0, 0.35, 1) infinite;
  animation-delay: 480ms;
}
.tdl .tdl-ring {
  stroke: hsl(var(--primary) / 0.35);
  stroke-dasharray: 42 300;
  stroke-linecap: round;
  transform-origin: 50% 50%;
  animation: tdl-spin calc(var(--tdl-duration) / 1.6) linear infinite;
}

@keyframes tdl-draw {
  0%   { stroke-dashoffset: 1; }
  38%  { stroke-dashoffset: 0; }
  70%  { stroke-dashoffset: 0; }
  100% { stroke-dashoffset: -1; }
}
@keyframes tdl-spin {
  to { transform: rotate(360deg); }
}
@media (prefers-reduced-motion: reduce) {
  .tdl .tdl-draw, .tdl .tdl-accent { animation: none; stroke-dashoffset: 0; }
  .tdl .tdl-ring { animation-duration: 4s; }
}
`;

let injected = false;
function useLoaderStyles() {
  React.useEffect(() => {
    if (injected || typeof document === "undefined") return;
    const el = document.createElement("style");
    el.setAttribute("data-logo-loader", "true");
    el.textContent = LOADER_CSS;
    document.head.appendChild(el);
    injected = true;
  }, []);
}

export interface LoaderProps {
  /** Rendered size in px */
  size?: number;
  label?: React.ReactNode;
  className?: string;
}

export function Loader({ size = 56, label, className }: LoaderProps) {
  useLoaderStyles();
  // Legacy call sites passed a small cube-edge size (7-20). Scale those up.
  const px = size < 30 ? Math.round(size * 3.2) : size;
  const strokes = [LOGO_PATHS.tBar, LOGO_PATHS.tStem, LOGO_PATHS.dStem, LOGO_PATHS.dBowl];

  return (
    <div
      className={cn("flex flex-col items-center justify-center gap-3", className)}
      role="status"
      aria-live="polite"
    >
      <svg
        className="tdl"
        width={px}
        height={px}
        viewBox="0 0 120 120"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <circle
          className="tdl-ring"
          cx="60"
          cy="60"
          r="55"
          strokeWidth="3"
          fill="none"
          pathLength="300"
        />
        <g strokeWidth="11" strokeLinecap="round" strokeLinejoin="round" fill="none">
          {/* faint guide of the finished mark */}
          {strokes.map((d, i) => (
            <path key={`t${i}`} className="tdl-track" d={d} pathLength={1} />
          ))}
          {strokes.map((d, i) => (
            <path key={`d${i}`} className="tdl-draw" d={d} pathLength={1} />
          ))}
        </g>
        <path
          className="tdl-accent"
          d={LOGO_PATHS.accent}
          strokeWidth="7"
          strokeLinecap="round"
          fill="none"
          pathLength={1}
        />
      </svg>
      {/* {label && (
        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">{label}</p>
      )} */}
      <span className="sr-only">Loading…</span>
    </div>
  );
}

/** Section-level loader (fills the content area) */
export function PageLoader({ label, size = 56, className }: LoaderProps) {
  return (
    <div className={cn("flex min-h-[240px] w-full items-center justify-center py-12", className)}>
      <Loader size={size} label={label} />
    </div>
  );
}

/** Route/app-level loader */
export function FullPageLoader({ label, size = 76, className }: LoaderProps) {
  return (
    <div className={cn("flex min-h-screen w-full items-center justify-center bg-background", className)}>
      <Loader size={size} label={label} />
    </div>
  );
}

export default Loader;
