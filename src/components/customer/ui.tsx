import React from "react";
import { Link } from "react-router-dom";
import { motion, type Variants } from "framer-motion";
import { cn } from "@/lib/utils";
import { PageLoader } from "@/components/common/Loader";
import { ArrowRight } from "lucide-react";

/* ────────────────────────────────────────────────────────────
   Shared design primitives for the customer portal.
   Tokens only — no hardcoded colors, dark-mode safe.
   ──────────────────────────────────────────────────────────── */

export const EASE = [0.22, 1, 0.36, 1] as const;

export const stagger: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06, delayChildren: 0.04 } },
};

export const riseItem: Variants = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0, transition: { duration: 0.42, ease: EASE } },
};

/** Convenience wrapper: a section that rises into place. */
export function Rise({
  children,
  className,
  delay = 0,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.42, ease: EASE, delay }}
    >
      {children}
    </motion.div>
  );
}

/* ── Status palette ─────────────────────────────────────── */

export type StatusTone = "pending" | "progress" | "success" | "danger" | "neutral";

export const toneChip: Record<StatusTone, string> = {
  pending: "bg-warning/12 text-warning border-warning/25",
  progress: "bg-info/12 text-info border-info/25",
  success: "bg-success/12 text-success border-success/25",
  danger: "bg-destructive/12 text-destructive border-destructive/25",
  neutral: "bg-muted text-muted-foreground border-border",
};

export const toneBar: Record<StatusTone, string> = {
  pending: "bg-warning",
  progress: "bg-info",
  success: "bg-success",
  danger: "bg-destructive",
  neutral: "bg-muted-foreground/40",
};

/* ── Page header ────────────────────────────────────────── */

interface CustomerPageHeaderProps {
  icon?: React.ComponentType<{ className?: string }>;
  title: string;
  subtitle?: React.ReactNode;
  count?: number | null;
  countLabel?: string;
  actions?: React.ReactNode;
  className?: string;
}

export function CustomerPageHeader({
  icon: Icon,
  title,
  subtitle,
  count,
  countLabel,
  actions,
  className,
}: CustomerPageHeaderProps) {
  return (
    <Rise className={cn("flex flex-wrap items-start justify-between gap-3", className)}>
      <div className="flex items-start gap-3 min-w-0">
        {Icon && (
          <div className="h-10 w-10 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
            <Icon className="h-5 w-5" />
          </div>
        )}
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-foreground">{title}</h1>
            {count != null && (
              <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[11px] font-black tabular-nums">
                {count}
                {countLabel ? ` ${countLabel}` : ""}
              </span>
            )}
          </div>
          {subtitle && <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">{subtitle}</p>}
        </div>
      </div>
      {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
    </Rise>
  );
}

/* ── Section card ───────────────────────────────────────── */

export function SectionCard({
  title,
  description,
  icon: Icon,
  actions,
  children,
  className,
  bodyClassName,
}: {
  title?: React.ReactNode;
  description?: React.ReactNode;
  icon?: React.ComponentType<{ className?: string }>;
  actions?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  bodyClassName?: string;
}) {
  return (
    <div className={cn("bg-card rounded-2xl border border-border/60 overflow-hidden", className)}>
      {(title || actions) && (
        <div className="px-4 sm:px-5 py-3.5 border-b border-border/50 bg-muted/20 flex items-center gap-3">
          {Icon && (
            <div className="h-8 w-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <Icon className="h-4 w-4" />
            </div>
          )}
          <div className="min-w-0 flex-1">
            {title && <p className="text-sm font-bold text-foreground truncate">{title}</p>}
            {description && <p className="text-[11px] text-muted-foreground truncate">{description}</p>}
          </div>
          {actions}
        </div>
      )}
      <div className={cn("p-4 sm:p-5", bodyClassName)}>{children}</div>
    </div>
  );
}

/* ── Stat tile ──────────────────────────────────────────── */

export function StatTile({
  icon: Icon,
  label,
  sub,
  value,
  to,
  tone = "primary",
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  sub?: string;
  value: React.ReactNode;
  to?: string;
  tone?: "primary" | StatusTone;
}) {
  const accent =
    tone === "primary" ? "bg-primary" : toneBar[tone as StatusTone] ?? "bg-primary";
  const iconTone =
    tone === "primary"
      ? "bg-primary/10 text-primary"
      : toneChip[tone as StatusTone] ?? "bg-primary/10 text-primary";

  const body = (
    <div className="relative h-full bg-card rounded-2xl border border-border/60 p-3.5 sm:p-4 overflow-hidden transition-all hover:border-primary/30 hover:shadow-md">
      <div className={cn("absolute top-0 inset-x-0 h-[3px]", accent)} />
      <div className="flex items-start justify-between mt-1 mb-2.5">
        <div className={cn("h-9 w-9 sm:h-10 sm:w-10 rounded-xl flex items-center justify-center shrink-0 border-0", iconTone)}>
          <Icon className="h-4 w-4 sm:h-5 sm:w-5" />
        </div>
        {to && <ArrowRight className="h-3.5 w-3.5 text-muted-foreground/40" />}
      </div>
      <p className="text-2xl sm:text-3xl font-black text-foreground leading-none tabular-nums">{value}</p>
      <p className="text-[11px] sm:text-xs font-bold text-foreground mt-1 leading-tight">{label}</p>
      {sub && <p className="text-[10px] text-muted-foreground leading-tight mt-0.5 hidden sm:block">{sub}</p>}
    </div>
  );

  return (
    <motion.div variants={riseItem} whileTap={{ scale: 0.975 }} className="h-full">
      {to ? (
        <Link to={to} className="block h-full">
          {body}
        </Link>
      ) : (
        body
      )}
    </motion.div>
  );
}

/* ── Filter pills with animated indicator ───────────────── */

export interface PillOption {
  key: string;
  label: string;
  count?: number;
}

export function FilterPills({
  options,
  value,
  onChange,
  layoutId = "customer-pill",
  className,
}: {
  options: PillOption[];
  value: string;
  onChange: (key: string) => void;
  layoutId?: string;
  className?: string;
}) {
  return (
    <div className={cn("flex gap-1.5 overflow-x-auto no-scrollbar -mx-1 px-1 pb-1", className)}>
      {options.map((o) => {
        const active = o.key === value;
        return (
          <button
            key={o.key}
            type="button"
            onClick={() => onChange(o.key)}
            className={cn(
              "relative flex items-center gap-1.5 px-3.5 py-2 rounded-2xl text-xs font-bold whitespace-nowrap shrink-0 transition-colors",
              active ? "text-primary-foreground" : "text-muted-foreground hover:text-foreground"
            )}
          >
            {active && (
              <motion.span
                layoutId={layoutId}
                className="absolute inset-0 rounded-2xl bg-primary"
                transition={{ type: "spring", stiffness: 420, damping: 34 }}
              />
            )}
            {!active && <span className="absolute inset-0 rounded-2xl bg-muted/60" />}
            <span className="relative z-10">{o.label}</span>
            {o.count != null && o.count > 0 && (
              <span
                className={cn(
                  "relative z-10 h-4 min-w-4 px-1 rounded-full text-[9px] font-black flex items-center justify-center tabular-nums",
                  active ? "bg-primary-foreground/25 text-primary-foreground" : "bg-muted-foreground/20 text-muted-foreground"
                )}
              >
                {o.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

/* ── Empty state ────────────────────────────────────────── */

export function CustomerEmpty({
  icon: Icon,
  title,
  description,
  action,
  className,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: EASE }}
      className={cn(
        "flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-border bg-card/50 py-12 px-6 text-center",
        className
      )}
    >
      <div className="h-14 w-14 rounded-3xl bg-primary/10 text-primary flex items-center justify-center">
        <Icon className="h-6 w-6" />
      </div>
      <div>
        <p className="text-sm font-bold text-foreground">{title}</p>
        {description && <p className="text-xs text-muted-foreground mt-1 max-w-[260px] mx-auto">{description}</p>}
      </div>
      {action}
    </motion.div>
  );
}

/* ── Section loader (TD monogram) ───────────────────────── */

export function CustomerLoading({ label }: { label?: string }) {
  return (
    <div className="py-16">
      <PageLoader label={label} size={64} />
    </div>
  );
}

/* ── Buttons ────────────────────────────────────────────── */

export const primaryBtn =
  "inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-xs font-bold shadow-sm hover:bg-primary/90 active:scale-[0.98] transition-all disabled:opacity-60";

export const ghostBtn =
  "inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-border bg-card text-foreground text-xs font-bold hover:bg-muted/60 active:scale-[0.98] transition-all disabled:opacity-60";

export function formatTZS(n: number) {
  return `${Math.round(n || 0).toLocaleString()} TZS`;
}
