import React from "react";
import { cn } from "@/lib/utils";

interface EmptyStateProps {
  icon: React.ComponentType<any>;
  title: string;
  description: string;
  action?: React.ReactNode;
  className?: string;
}

export default function EmptyState({ icon: Icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div className={cn("glass-card rounded-3xl p-16 text-center border-primary/5 fade-in-up max-w-5xl mx-auto flex flex-col items-center justify-center", className)}>
      <div className="relative mx-auto mb-8 w-24 h-24">
        <div className="absolute inset-0 rounded-3xl bg-primary/10 animate-pulse" />
        <div className="relative h-full rounded-3xl bg-primary/5 flex items-center justify-center">
          <Icon className="h-10 w-10 text-primary/60" />
        </div>
      </div>
      <h3 className="text-xl font-black text-foreground mb-2">{title}</h3>
      <p className="text-muted-foreground text-sm mb-6 max-w-md">
        {description}
      </p>
      {action && (
        <div className="flex justify-center">
          {action}
        </div>
      )}
    </div>
  );
}
