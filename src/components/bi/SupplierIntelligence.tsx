import { Truck, ShieldAlert } from "lucide-react";
import { formatTZS } from "@/data/mockData";
import { useI18n } from "@/lib/i18n";

interface Props {
  data: {
    totalDebt: number;
  };
}

export function SupplierIntelligence({ data }: Props) {
  const { t } = useI18n();

  return (
    <div className="bg-card rounded-xl border border-border shadow-sm p-6 h-full flex flex-col">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-bold">Supplier Intelligence</h3>
          <p className="text-sm text-muted-foreground">Vendor relations and payables</p>
        </div>
      </div>

      <div className="flex-1 flex flex-col justify-center items-center text-center p-6 border-2 border-dashed border-border/50 rounded-xl bg-muted/10">
        <div className="h-12 w-12 rounded-full bg-destructive/10 flex items-center justify-center text-destructive mb-4">
          <ShieldAlert className="h-6 w-6" />
        </div>
        <p className="text-sm font-medium text-muted-foreground mb-1">Total Outstanding Payables</p>
        <p className="text-3xl font-extrabold text-foreground">{formatTZS(data.totalDebt)}</p>
        <p className="text-xs text-muted-foreground mt-4 max-w-[200px]">
          Settle your supplier debts to maintain a healthy supply chain credit score.
        </p>
      </div>
    </div>
  );
}
