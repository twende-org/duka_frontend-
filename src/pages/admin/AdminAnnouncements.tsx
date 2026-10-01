import { useEffect, useState } from "react";
import { Megaphone, Plus, Trash2, ToggleLeft, ToggleRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import {
  createAnnouncement,
  deleteAnnouncement,
  fetchAnnouncements,
  setAnnouncementActive,
  type Announcement,
} from "@/lib/api/domains/announcements";
import { toast } from "sonner";
import { cn, toSafeDate } from "@/lib/utils";
import { Loader } from "@/components/common/Loader";

const typeConfig = {
  info: { label: "Info", color: "bg-blue-500/10 text-blue-500 border-blue-500/30" },
  warning: { label: "Warning", color: "bg-warning/10 text-warning border-warning/30" },
  success: { label: "Success", color: "bg-success/10 text-success border-success/30" },
  error: { label: "Alert", color: "bg-destructive/10 text-destructive border-destructive/30" },
};

export default function AdminAnnouncements() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({ title: "", message: "", type: "info" as Announcement["type"] });

  async function loadData() {
    setLoading(true);
    try {
      setAnnouncements(await fetchAnnouncements());
    } catch (err: any) { toast.error(err.message); }
    setLoading(false);
  }

  useEffect(() => { loadData(); }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title || !form.message) return;
    setSubmitting(true);
    try {
      await createAnnouncement({ title: form.title, message: form.message, type: form.type });
      toast.success("Tangazo limeundwa na linafanya kazi!");
      setDialogOpen(false);
      setForm({ title: "", message: "", type: "info" });
      loadData();
    } catch (err: any) { toast.error(err.message); }
    setSubmitting(false);
  }

  async function handleToggle(id: string, current: boolean) {
    try {
      await setAnnouncementActive(id, !current);
      setAnnouncements((prev) => prev.map((a) => a.id === id ? { ...a, active: !current } : a));
      toast.success(current ? "Tangazo limezimwa" : "Tangazo limewashwa");
    } catch (err: any) { toast.error(err.message); }
  }

  async function handleDelete(id: string) {
    if (!confirm("Una uhakika kutaka kufuta tangazo hili?")) return;
    try {
      await deleteAnnouncement(id);
      setAnnouncements((prev) => prev.filter((a) => a.id !== id));
      toast.success("Tangazo limefutwa");
    } catch (err: any) { toast.error(err.message); }
  }

  const formatTime = (ts: any) => {
    if (!ts) return "—";
    const d = toSafeDate(ts);
    return d ? d.toLocaleString() : "—";
  };

  return (
    <div className="space-y-6">
      <div className="page-header flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="page-title flex items-center gap-2">
            <Megaphone className="h-6 w-6 text-primary" />
            Matangazo ya Mfumo
          </h1>
          <p className="page-description">Tuma matangazo kwa watumiaji wote ndani ya app</p>
        </div>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Tangazo Jipya
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Megaphone className="h-5 w-5 text-primary" />
                Unda Tangazo Jipya
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreate} className="space-y-4 mt-2">
              <div>
                <label className="text-sm font-medium mb-1.5 block">Kichwa cha Tangazo *</label>
                <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Mfano: Uboreshaji wa Mfumo" required />
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block">Ujumbe *</label>
                <Textarea value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} placeholder="Andika ujumbe wako hapa..." rows={3} required />
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block">Aina</label>
                <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v as Announcement["type"] })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="info">ℹ️ Info</SelectItem>
                    <SelectItem value="warning">⚠️ Warning</SelectItem>
                    <SelectItem value="success">✅ Success</SelectItem>
                    <SelectItem value="error">🚨 Alert</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button type="submit" className="w-full" disabled={submitting}>
                {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Megaphone className="h-4 w-4 mr-2" />}
                {submitting ? "Inasambaza..." : "Sambaza kwa Watumiaji Wote"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader size={14} />
        </div>
      ) : announcements.length === 0 ? (
        <div className="stat-card text-center py-16">
          <Megaphone className="mx-auto h-12 w-12 text-muted-foreground/30 mb-3" />
          <p className="text-muted-foreground">Hakuna matangazo bado</p>
          <p className="text-xs text-muted-foreground mt-1">Unda tangazo jipya ili watumiaji waone ndani ya app</p>
        </div>
      ) : (
        <div className="space-y-3">
          {announcements.map((a) => {
            const cfg = typeConfig[a.type] || typeConfig.info;
            return (
              <div key={a.id} className={cn("stat-card flex items-start gap-4 transition-all", !a.active && "opacity-60")}>
                <div className={cn("flex h-10 w-10 items-center justify-center rounded-full shrink-0 border", cfg.color)}>
                  <Megaphone className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <h3 className="font-bold text-foreground">{a.title}</h3>
                    <span className={cn("text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border", cfg.color)}>
                      {cfg.label}
                    </span>
                    <span className={cn("text-[10px] font-bold uppercase px-2 py-0.5 rounded-full", a.active ? "bg-success/10 text-success" : "bg-muted text-muted-foreground")}>
                      {a.active ? "● Live" : "○ Inactive"}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground">{a.message}</p>
                  <p className="text-[10px] text-muted-foreground mt-2">Created: {formatTime(a.createdAt)}</p>
                </div>
                <div className="flex gap-2 shrink-0">
                  <Button size="sm" variant="ghost" onClick={() => handleToggle(a.id, a.active)} title={a.active ? "Zima" : "Washa"}>
                    {a.active ? <ToggleRight className="h-5 w-5 text-success" /> : <ToggleLeft className="h-5 w-5 text-muted-foreground" />}
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => handleDelete(a.id)} className="text-destructive hover:bg-destructive/10">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
