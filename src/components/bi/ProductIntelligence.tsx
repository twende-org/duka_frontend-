import { Package, AlertTriangle, TrendingUp, TrendingDown } from "lucide-react";
import { formatTZS } from "@/data/mockData";
import { useI18n } from "@/lib/i18n";

interface Props {
  data: {
    bestSellers: { id: string; name: string; revenue: number; quantity: number }[];
    slowMovers: { id: string; name: string; quantitySold: number }[];
    lowStockCount: number;
    inventoryValue: number;
  };
}

export function ProductIntelligence({ data }: Props) {
  const { t } = useI18n();

  return (
    <div className="bg-card rounded-xl border border-border shadow-sm p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-bold">Product Intelligence</h3>
          <p className="text-sm text-muted-foreground">Inventory value and performance</p>
        </div>
        <div className="text-right">
          <p className="text-sm font-medium text-muted-foreground">Total Inventory Value</p>
          <p className="text-xl font-bold text-primary">{formatTZS(data.inventoryValue)}</p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Best Sellers */}
        <div>
          <h4 className="flex items-center gap-2 text-sm font-semibold mb-4">
            <TrendingUp className="h-4 w-4 text-accent" />
            Top Performing Products
          </h4>
          <div className="space-y-3">
            {data.bestSellers.length === 0 && <p className="text-xs text-muted-foreground">No data available.</p>}
            {data.bestSellers.map((product) => (
              <div key={product.id} className="flex items-center justify-between text-sm p-2 rounded-lg bg-muted/50">
                <span className="font-medium">{product.name}</span>
                <span className="font-bold text-accent">{formatTZS(product.revenue)}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Slow Movers */}
        <div>
          <h4 className="flex items-center gap-2 text-sm font-semibold mb-4">
            <TrendingDown className="h-4 w-4 text-warning" />
            Slow Moving Products
          </h4>
          <div className="space-y-3">
            {data.slowMovers.length === 0 && <p className="text-xs text-muted-foreground">No data available.</p>}
            {data.slowMovers.map((product) => (
              <div key={product.id} className="flex items-center justify-between text-sm p-2 rounded-lg bg-muted/50">
                <span className="font-medium">{product.name}</span>
                <span className="text-muted-foreground">Sold: {product.quantitySold}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {data.lowStockCount > 0 && (
        <div className="mt-6 flex items-start gap-3 p-4 rounded-lg bg-warning/10 border border-warning/20 text-warning-foreground">
          <AlertTriangle className="h-5 w-5 text-warning shrink-0" />
          <div>
            <p className="font-semibold text-sm">Low Stock Alert</p>
            <p className="text-xs mt-1">You have {data.lowStockCount} products that are running low on stock. Please restock soon.</p>
          </div>
        </div>
      )}
    </div>
  );
}
