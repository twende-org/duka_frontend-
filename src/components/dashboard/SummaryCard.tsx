import { ReactNode } from "react";
import { Card } from "@/components/ui/card";

export interface SummaryCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: ReactNode;
}

export function SummaryCard({ title, value, subtitle, icon }: SummaryCardProps) {
  return (
    <Card className="p-4 sm:p-6 glass-card border-primary/5 hover:border-primary/20 transition-all flex items-start justify-between">
      <div>
        <p className="text-sm font-medium text-muted-foreground mb-1">{title}</p>
        <h3 className="text-2xl font-bold text-foreground">{value}</h3>
        {subtitle && <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>}
      </div>
      {icon && (
        <div className="bg-primary/10 p-3 rounded-xl text-primary">
          {icon}
        </div>
      )}
    </Card>
  );
}
