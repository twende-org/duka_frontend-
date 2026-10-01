/**
 * Centralized Design System Theme & Color Tokens for Twende Duka
 * Standardizes status, metric, and action colors across all components.
 */

export const THEME_COLORS = {
  // Core Brand Tokens
  primary: {
    bg: "bg-primary/10",
    text: "text-primary",
    border: "border-primary/20",
    fill: "bg-primary text-primary-foreground",
    hoverBg: "hover:bg-primary/20",
  },
  // Success / Growth / Profit
  success: {
    bg: "bg-success/10",
    text: "text-success",
    border: "border-success/20",
    fill: "bg-success text-white",
    hoverBg: "hover:bg-success/20",
  },
  // Warning / Attention Needed / Low Stock
  warning: {
    bg: "bg-warning/10",
    text: "text-warning",
    border: "border-warning/20",
    fill: "bg-warning text-foreground",
    hoverBg: "hover:bg-warning/20",
  },
  // Danger / Critical / Out of Stock
  danger: {
    bg: "bg-destructive/10",
    text: "text-destructive",
    border: "border-destructive/20",
    fill: "bg-destructive text-destructive-foreground",
    hoverBg: "hover:bg-destructive/20",
  },
  // Info / Analytics / Operations
  info: {
    bg: "bg-info/10",
    text: "text-info",
    border: "border-info/20",
    fill: "bg-info text-white",
    hoverBg: "hover:bg-info/20",
  },
  // Accent / Secondary Status / Marketing
  accent: {
    bg: "bg-accent/10",
    text: "text-accent",
    border: "border-accent/20",
    fill: "bg-accent text-accent-foreground",
    hoverBg: "hover:bg-accent/20",
  },
  // Muted / Neutral
  muted: {
    bg: "bg-muted/40",
    text: "text-muted-foreground",
    border: "border-border/60",
    fill: "bg-muted text-foreground",
    hoverBg: "hover:bg-muted/60",
  },
} as const;

export type ThemeVariant = keyof typeof THEME_COLORS;

/**
 * Returns pre-composed card & badge class combinations for consistent UI styling
 */
export function getVariantStyles(variant: ThemeVariant) {
  return THEME_COLORS[variant] || THEME_COLORS.muted;
}
