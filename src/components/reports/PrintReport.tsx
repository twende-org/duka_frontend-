import React from "react";
import { formatTZS } from "@/data/mockData";

interface PrintReportProps {
  type: "sales" | "products" | "summary";
  shop: any;
  data: any;
  dateRange?: string;
  userName?: string;
}

export const PrintReport: React.FC<PrintReportProps> = ({ 
  type, 
  shop, 
  data, 
  dateRange, 
  userName = "Meneja wa Duka" 
}) => {
  const dateStr = new Date().toLocaleDateString();

  return (
    <div className="print-only font-sans text-slate-800 bg-[#fffcf2] min-h-screen p-10">
      {/* ELITE HEADER */}
      <div className="flex justify-between items-start border-b border-[#f59e0b] pb-6 mb-8 bg-[#2d2d2d] -mx-10 -mt-10 p-10 text-white gap-6">
        <div className="flex items-start gap-4 text-white flex-1 min-w-0">
          {shop?.imageUrl && (
            <img src={shop.imageUrl} alt="Logo" className="w-14 h-14 rounded-lg object-cover border-2 border-white/20 shrink-0" />
          )}
          <div className="min-w-0">
            <h1 className="text-lg font-bold tracking-tight truncate">{shop?.name || "Twende Duka"}</h1>
            {shop?.phone && <p className="text-xs opacity-70">Mob: {shop.phone}</p>}
          </div>
        </div>
        
        <div className="text-right flex-1 shrink-0">
          <h2 className="text-base font-bold text-[#f59e0b] tracking-wider uppercase leading-tight">
            {type === "sales" ? "RIPOTI YA MAUZO" : 
             type === "products" ? "RIPOTI YA BIDHAA" : 
             "MUHTASARI WA BIASHARA"}
          </h2>
          <div className="text-xs mt-1 opacity-90">
             <p>TAREHE: {dateStr}</p>
             {dateRange && <p className="font-semibold text-[#f59e0b]">{dateRange}</p>}
          </div>
        </div>
      </div>

      {/* SUMMARY CARDS (If applicable) */}
      {type === "summary" && (
        <div className="mb-10">
          <h3 className="text-lg font-bold mb-4 uppercase border-l-4 border-[#f59e0b] pl-3">Muhtasari wa Utendaji</h3>
          <div className="grid grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
              <p className="text-[10px] uppercase text-slate-500 font-bold mb-1">Idadi ya Mauzo</p>
              <p className="text-xl font-bold">{data.totalSalesCount}</p>
            </div>
            <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
              <p className="text-[10px] uppercase text-slate-500 font-bold mb-1">Jumla ya Mapato</p>
              <p className="text-xl font-bold text-[#f59e0b]">{data.totalRevenueFormatted}</p>
            </div>
            <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
              <p className="text-[10px] uppercase text-slate-500 font-bold mb-1">Jumla ya Faida</p>
              <p className="text-xl font-bold text-emerald-600">{data.totalProfitFormatted}</p>
            </div>
            <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
              <p className="text-[10px] uppercase text-slate-500 font-bold mb-1">Bidhaa Chache</p>
              <p className={`text-xl font-bold ${data.lowStockCount > 0 ? 'text-red-500' : ''}`}>{data.lowStockCount}</p>
            </div>
          </div>
        </div>
      )}

      {/* DATA TABLE */}
      <div className="mb-10">
        <h3 className="text-lg font-bold mb-4 uppercase border-l-4 border-[#f59e0b] pl-3">
          {type === "sales" ? "Orodha ya Mauzo" : 
           type === "products" ? "Orodha ya Bidhaa & Stoo" : 
           "Maelezo ya Ziada"}
        </h3>
        <table className="w-full text-sm border-collapse bg-white rounded-lg overflow-hidden shadow-sm border border-slate-200">
          <thead className="bg-[#2d2d2d] text-white">
            <tr>
              {type === "sales" ? (
                <>
                  <th className="p-3 text-left">Bidhaa</th>
                  <th className="p-3 text-center">Idadi</th>
                  <th className="p-3 text-right">Jumla</th>
                  <th className="p-3 text-center">Malipo</th>
                  <th className="p-3 text-right">Tarehe</th>
                </>
              ) : (
                <>
                  <th className="p-3 text-left">Jina la Bidhaa</th>
                  <th className="p-3 text-left">Aina</th>
                  <th className="p-3 text-right">Bei ya Kuuza</th>
                  <th className="p-3 text-center">Idadi Ilivyo</th>
                </>
              )}
            </tr>
          </thead>
          <tbody>
            {(type === "sales" ? data.sales : data.products)?.map((item: any, i: number) => (
              <tr key={i} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                {type === "sales" ? (
                  <>
                    <td className="p-3 font-medium">{item.productName}</td>
                    <td className="p-3 text-center">{item.quantity}</td>
                    <td className="p-3 text-right font-bold text-[#f59e0b]">{item.totalPriceFormatted}</td>
                    <td className="p-3 text-center text-xs">{item.paymentMethod}</td>
                    <td className="p-3 text-right text-xs text-slate-500">{item.date}</td>
                  </>
                ) : (
                  <>
                    <td className="p-3 font-medium">{item.name}</td>
                    <td className="p-3 text-slate-600">{item.category}</td>
                    <td className="p-3 text-right font-bold">{item.sellingPriceFormatted}</td>
                    <td className="p-3 text-center font-bold">{item.stock}</td>
                  </>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>


      {/* FOOTER */}
      <div className="fixed bottom-10 left-10 right-10 border-t border-slate-200 pt-4 text-center">
        <p className="text-[10px] text-slate-400 uppercase font-bold tracking-widest leading-loose">
          Mfumo wa Kisasa wa Kusimamia Biashara • Powered by Twende Duka Cloud
        </p>
      </div>
    </div>
  );
};
