import { useEffect, useState } from "react";
import { Briefcase, CheckCircle, XCircle, Search, Store } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getAllUsers, updateUserBusinessStatus } from "@/lib/subscription";
import { toast } from "sonner";
import { useI18n } from "@/lib/i18n";
import type { BusinessProfile } from "@/types";
import { Loader } from "@/components/common/Loader";

interface UserWithWholesale {
  id: string;
  email: string;
  displayName: string;
  businessProfile?: BusinessProfile;
}

export default function AdminWholesale() {
  const { t } = useI18n();
  const [users, setUsers] = useState<UserWithWholesale[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("PENDING");

  async function loadData() {
    setLoading(true);
    try {
      const allUsers = await getAllUsers();
      // Filter only users who have a businessProfile
      const wholesaleUsers = allUsers.filter(u => !!u.businessProfile) as UserWithWholesale[];
      setUsers(wholesaleUsers);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load wholesale applications");
    }
    setLoading(false);
  }

  useEffect(() => { loadData(); }, []);

  const filtered = users.filter((u) => {
    const matchSearch = u.email.toLowerCase().includes(search.toLowerCase()) || 
                       (u.displayName || "").toLowerCase().includes(search.toLowerCase()) ||
                       (u.businessProfile?.companyName || "").toLowerCase().includes(search.toLowerCase());
    const status = u.businessProfile?.status || "PENDING";
    const matchStatus = filterStatus === "ALL" || status === filterStatus;
    return matchSearch && matchStatus;
  });

  async function handleUpdateStatus(userId: string, companyName: string, status: "APPROVED" | "REJECTED" | "PENDING") {
    try {
      await updateUserBusinessStatus(userId, status);
      toast.success(`${companyName} has been ${status.toLowerCase()}`);
      loadData();
    } catch (err: unknown) { 
      const error = err as Error;
      toast.error(error.message); 
    }
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500 max-w-6xl mx-auto pb-12">
      {/* Header section with gradient flair */}
      <div className="relative overflow-hidden rounded-3xl bg-card border border-border/50 p-8 sm:p-10 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-primary/10 blur-3xl rounded-full pointer-events-none" />
        
        <div className="relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 text-primary font-bold text-xs mb-4">
            <Briefcase className="h-3.5 w-3.5" />
            <span>Twende Duka Admin</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-black text-foreground tracking-tight">
            B2B Approvals
          </h1>
          <p className="text-muted-foreground mt-2 font-medium max-w-xl">
            Review and manage Wholesale, Reseller, and Corporate applications.
          </p>
        </div>
        
        {/* Compact, non-full-width Filter Toolbar */}
        <div className="relative z-10 flex flex-col sm:flex-row items-center gap-3 bg-background/80 backdrop-blur-sm p-2 rounded-2xl border border-border shadow-sm w-full md:w-auto">
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search applications..."
              className="pl-9 h-10 rounded-xl bg-muted/50 border-transparent focus:bg-background focus:border-primary text-sm font-medium w-full transition-all"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="h-6 w-px bg-border/50 hidden sm:block" />
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-full sm:w-[160px] h-10 rounded-xl font-bold bg-muted/50 border-transparent text-sm">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent className="rounded-xl">
              <SelectItem value="ALL">All Statuses</SelectItem>
              <SelectItem value="PENDING">Pending</SelectItem>
              <SelectItem value="APPROVED">Approved</SelectItem>
              <SelectItem value="REJECTED">Rejected</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="bg-card/50 border border-border/40 rounded-3xl p-4 sm:p-6 shadow-sm">
        {/* List */}
        {loading ? (
          <div className="flex justify-center p-12">
            <Loader size={14} />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 px-4 bg-muted/20 rounded-3xl border border-dashed">
            <Store className="h-12 w-12 text-muted-foreground mx-auto mb-3 opacity-50" />
            <p className="font-bold text-lg text-foreground">No applications found</p>
            <p className="text-sm text-muted-foreground mt-1">Change your filters or wait for new applications.</p>
          </div>
        ) : (
          <div className="grid gap-4">
            {filtered.map((user) => {
              const bp = user.businessProfile!;
              return (
                <div key={user.id} className="group flex flex-col xl:flex-row items-start xl:items-center justify-between gap-5 p-5 rounded-2xl border border-border/40 bg-background shadow-sm hover:shadow-md hover:border-primary/40 transition-all duration-300 relative overflow-hidden">
                  
                  {/* Subtle status indicator bar on the left */}
                  <div className={`absolute left-0 top-0 bottom-0 w-1 ${
                        bp.status === "APPROVED" ? "bg-emerald-500" :
                        bp.status === "REJECTED" ? "bg-destructive" :
                        "bg-amber-500"
                  }`} />
                  
                  <div className="flex-1 pl-2">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-bold text-foreground text-lg group-hover:text-primary transition-colors">{bp.companyName}</h3>
                      <span className={`text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full border ${
                        bp.status === "APPROVED" ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" :
                        bp.status === "REJECTED" ? "bg-destructive/10 text-destructive border-destructive/20" :
                        "bg-amber-500/10 text-amber-600 border-amber-500/20"
                      }`}>
                        {bp.status}
                      </span>
                      {bp.category && (
                        <span className="text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full bg-primary/10 text-primary border border-primary/20 ml-2">
                          {bp.category}
                        </span>
                      )}
                    </div>
                    
                    <div className="flex flex-wrap items-center gap-x-8 gap-y-3 mt-3 p-3 rounded-xl bg-muted/30 border border-border/30">
                      <div>
                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-0.5">Customer / Rep</p>
                        <p className="text-sm font-semibold text-foreground flex items-center gap-2">
                          <span className="h-6 w-6 rounded-full bg-primary/20 flex items-center justify-center text-[10px] text-primary">{user.displayName.charAt(0) || "U"}</span>
                          {user.displayName} <span className="text-muted-foreground font-normal">({user.email})</span>
                        </p>
                      </div>
                      <div className="w-px h-8 bg-border/50 hidden sm:block" />
                      <div>
                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-0.5">TIN Number</p>
                        <p className="text-sm font-semibold text-foreground font-mono">{bp.tin || "Not Provided"}</p>
                      </div>
                      <div className="w-px h-8 bg-border/50 hidden sm:block" />
                      <div>
                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-0.5">VRN Number</p>
                        <p className="text-sm font-semibold text-foreground font-mono">{bp.vrn || "Not Provided"}</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2 w-full xl:w-auto xl:pl-4 xl:border-l border-border/50 shrink-0">
                    {bp.status !== "APPROVED" && (
                      <Button 
                        onClick={() => handleUpdateStatus(user.id, bp.companyName, "APPROVED")}
                        className="flex-1 xl:flex-none rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold h-11 transition-transform active:scale-95 shadow-sm"
                      >
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Approve
                      </Button>
                    )}
                    {bp.status !== "REJECTED" && (
                      <Button 
                        onClick={() => handleUpdateStatus(user.id, bp.companyName, "REJECTED")}
                        variant="destructive"
                        className="flex-1 xl:flex-none rounded-xl font-bold h-11 transition-transform active:scale-95 shadow-sm"
                      >
                        <XCircle className="h-4 w-4 mr-2" />
                        Reject
                      </Button>
                    )}
                    {bp.status !== "PENDING" && (
                      <Button 
                        onClick={() => handleUpdateStatus(user.id, bp.companyName, "PENDING")}
                        variant="outline"
                        className="flex-1 xl:flex-none rounded-xl font-bold h-11 transition-transform active:scale-95"
                      >
                        Set to Pending
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
