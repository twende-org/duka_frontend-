import { Users, DollarSign, Award } from "lucide-react";
import { formatTZS } from "@/data/mockData";
import { useI18n } from "@/lib/i18n";

interface Props {
  data: {
    topCustomers: { id: string; name: string; totalSpent: number }[];
    totalDebt: number;
  };
}

export function CustomerIntelligence({ data }: Props) {
  const { t } = useI18n();

  return (
    <div className="bg-card rounded-xl border border-border shadow-sm p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-bold">Customer Intelligence</h3>
          <p className="text-sm text-muted-foreground">Top spenders and outstanding balances</p>
        </div>
        <div className="text-right">
          <p className="text-sm font-medium text-muted-foreground">Outstanding Debt</p>
          <p className="text-xl font-bold text-destructive">{formatTZS(data.totalDebt)}</p>
        </div>
      </div>

      <div>
        <h4 className="flex items-center gap-2 text-sm font-semibold mb-4">
          <Award className="h-4 w-4 text-accent" />
          Top Customers by Lifetime Value
        </h4>
        <div className="space-y-3">
          {data.topCustomers.length === 0 && <p className="text-xs text-muted-foreground">No customer data available yet.</p>}
          {data.topCustomers.map((customer, i) => (
            <div key={customer.id} className="flex items-center justify-between p-3 rounded-lg border border-border/50 bg-muted/20">
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs">
                  {i + 1}
                </div>
                <span className="font-medium text-sm">{customer.name}</span>
              </div>
              <span className="font-bold text-sm text-accent">{formatTZS(customer.totalSpent)}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
