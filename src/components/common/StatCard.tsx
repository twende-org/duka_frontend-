import React from "react";
import { ArrowUpRight, ArrowDownRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface StatCardProps {
  title: string;
  value: React.ReactNode;
  icon: React.ComponentType<any>;
  iconBgColor?: string;
  iconColor?: string;
  trend?: {
    value: number | string;
    isPositive: boolean;
    label?: string;
  };
  onClick?: () => void;
  className?: string;
}

export default function StatCard({
  title,
  value,
  icon: Icon,
  iconBgColor = "bg-primary/10",
  iconColor = "text-primary",
  trend,
  onClick,
  className,
}: StatCardProps) {
  const isInteractive = onClick !== undefined;
  
  return (
    <div
      onClick={onClick}
      className={cn(
        "bg-card rounded-2xl p-4 sm:p-5 border border-border/80 shadow-2xs transition-all flex flex-col justify-between group text-left",
        isInteractive && "cursor-pointer hover:border-primary/40 active:scale-98",
        className
      )}
    >
      <div className="flex items-start justify-between mb-3 gap-2">
        <div className="min-w-0">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1 truncate">
            {title}
          </p>
          <p className="text-xl sm:text-2xl font-black text-foreground tracking-tight truncate">
            {value}
          </p>
        </div>
        <div className={cn("rounded-xl p-2.5 shrink-0 transition-transform group-hover:scale-105", iconBgColor, iconColor)}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
      {trend && (
        <div className="flex items-center text-xs font-medium">
          <div className={cn("flex items-center gap-1 font-bold", trend.isPositive ? "text-success" : "text-destructive")}>
            {trend.isPositive ? <ArrowUpRight className="h-4 w-4" /> : <ArrowDownRight className="h-4 w-4" />}
            <span>{trend.value}</span>
          </div>
          {trend.label && (
            <span className="text-muted-foreground ml-1.5 truncate">{trend.label}</span>
          )}
        </div>
      )}
    </div>
  );
}
