import { useEffect, useState } from "react";
import { MessageCircle, CheckCircle, Clock, Search, RefreshCw, Bug, HelpCircle, Lightbulb, AlertTriangle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  fetchSupportTickets,
  setSupportTicketResolved,
  type SupportTicket,
} from "@/lib/api/domains/support";
import { toast } from "sonner";
import { cn, toSafeDate } from "@/lib/utils";
import { Loader } from "@/components/common/Loader";

const categoryIcons: Record<string, any> = {
  Bug: Bug,
  Confusion: HelpCircle,
  "Feature Request": Lightbulb,
  Other: MessageCircle,
};

export default function AdminSupport() {
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");

  async function loadData() {
    setLoading(true);
    try {
      setTickets(await fetchSupportTickets());
    } catch (err: any) { toast.error(err.message); }
    setLoading(false);
  }

  useEffect(() => { loadData(); }, []);

  async function handleResolve(id: string, resolved: boolean) {
    try {
      await setSupportTicketResolved(id, !resolved);
      setTickets((prev) => prev.map((t) => t.id === id ? { ...t, resolved: !resolved } : t));
      toast.success(resolved ? "Imewekwa kama haijamalika" : "Imewekwa kama imetatuliwa ✅");
    } catch (err: any) { toast.error(err.message); }
  }

  const filtered = tickets.filter((t) => {
    const matchStatus = filterStatus === "all" || (filterStatus === "open" ? !t.resolved : t.resolved);
    const matchSearch = search === "" ||
      (t.message || "").toLowerCase().includes(search.toLowerCase()) ||
      (t.userEmail || "").toLowerCase().includes(search.toLowerCase()) ||
      (t.category || "").toLowerCase().includes(search.toLowerCase());
    return matchStatus && matchSearch;
  });

  const formatTime = (ts: any) => {
    if (!ts) return "—";
    const d = toSafeDate(ts);
    return d ? d.toLocaleString() : "—";
  };

  const openCount = tickets.filter((t) => !t.resolved).length;

  return (
    <div className="space-y-6">
      <div className="page-header">
        <h1 className="page-title flex items-center gap-2">
          <MessageCircle className="h-6 w-6 text-primary" />
          Support Tickets
          {openCount > 0 && (
            <span className="ml-2 inline-flex items-center justify-center h-6 w-6 rounded-full bg-destructive text-destructive-foreground text-xs font-bold">
              {openCount}
            </span>
          )}
        </h1>
        <p className="page-description">Maombi ya msaada kutoka kwa watumiaji — yatatulie na ufuatilie</p>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="stat-card text-center">
          <p className="text-2xl font-black text-foreground">{tickets.length}</p>
          <p className="text-xs text-muted-foreground">Total Tickets</p>
        </div>
        <div className="stat-card text-center">
          <p className="text-2xl font-black text-destructive">{openCount}</p>
          <p className="text-xs text-muted-foreground">Open</p>
        </div>
        <div className="stat-card text-center">
          <p className="text-2xl font-black text-success">{tickets.length - openCount}</p>
          <p className="text-xs text-muted-foreground">Resolved</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search by user, message, category..." className="pl-10" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="open">Open</SelectItem>
            <SelectItem value="resolved">Resolved</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="outline" onClick={loadData} disabled={loading} className="gap-2">
          <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
          Refresh
        </Button>
      </div>

      {/* Tickets list */}
      {loading ? (
        <div className="flex justify-center py-12">
          <Loader size={14} />
        </div>
      ) : filtered.length === 0 ? (
        <div className="stat-card text-center py-16">
          <MessageCircle className="mx-auto h-12 w-12 text-muted-foreground/30 mb-3" />
          <p className="text-muted-foreground font-medium">Hakuna tickets za msaada</p>
          <p className="text-xs text-muted-foreground mt-1">Watumiaji wanaweza kutuma ombi la msaada kutoka ndani ya app</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((ticket) => {
            const Icon = categoryIcons[ticket.category] || MessageCircle;
            return (
              <div
                key={ticket.id}
                className={cn("stat-card flex items-start gap-4 transition-all", ticket.resolved && "opacity-60 bg-muted/20")}
              >
                <div className={cn("flex h-10 w-10 items-center justify-center rounded-full shrink-0", ticket.resolved ? "bg-success/10 text-success" : "bg-primary/10 text-primary")}>
                  <Icon className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className="text-xs font-bold text-foreground">{ticket.userName || "Unknown"}</span>
                    <span className="text-[10px] text-muted-foreground">{ticket.userEmail}</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground font-medium">{ticket.category}</span>
                    {ticket.resolved ? (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-success/10 text-success font-bold flex items-center gap-0.5">
                        <CheckCircle className="h-3 w-3" /> Resolved
                      </span>
                    ) : (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-warning/10 text-warning font-bold flex items-center gap-0.5">
                        <Clock className="h-3 w-3" /> Open
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-foreground leading-relaxed">{ticket.message}</p>
                  <div className="flex gap-4 mt-2">
                    {ticket.route && <p className="text-[10px] text-muted-foreground font-mono">Route: {ticket.route}</p>}
                    <p className="text-[10px] text-muted-foreground">{formatTime(ticket.createdAt)}</p>
                  </div>
                </div>
                <Button
                  size="sm"
                  variant={ticket.resolved ? "outline" : "default"}
                  className={cn("shrink-0 gap-1.5", !ticket.resolved && "bg-success hover:bg-success/90 text-success-foreground")}
                  onClick={() => handleResolve(ticket.id, ticket.resolved)}
                >
                  {ticket.resolved ? (
                    <><Clock className="h-3.5 w-3.5" /> Reopen</>
                  ) : (
                    <><CheckCircle className="h-3.5 w-3.5" /> Mark Resolved</>
                  )}
                </Button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
