import React, { useState, useEffect } from "react";
import { addCorporateDepartment, getCorporateDepartments } from "@/lib/api/domains/corporate";
import { Building, Plus, X, Check } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { useAppSelector } from "@/store/hooks";
import { PageLoader } from "@/components/common/Loader";


interface Department {
  id: string;
  name: string;
  budget: number;
  spent: number;
}

export default function CorporateDepartments() {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [adding, setAdding] = useState(false);

  const user = useAppSelector((s) => s.auth.user);
  const companyId = user?.corporateProfile?.companyId;
  const isAdmin = user?.corporateProfile?.role === "admin";

  const [newDept, setNewDept] = useState({
    name: "",
    budget: 500000,
  });

  useEffect(() => {
    if (!companyId) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    getCorporateDepartments()
      .then((depts) => {
        if (!cancelled) setDepartments(depts);
      })
      .catch((e) => console.error("Error loading departments:", e))
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [companyId]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyId || !newDept.name.trim()) return;

    setAdding(true);
    try {
      const created = await addCorporateDepartment({
        name: newDept.name,
        budget: Number(newDept.budget),
      });
      setDepartments(prev => [...prev, created]);
      setShowAddForm(false);
      setNewDept({ name: "", budget: 500000 });
      toast.success("Idara mpya imeundwa kikamilifu!");
    } catch (e) {
      console.error("Error adding department:", e);
      toast.error("Imeshindwa kuongeza idara.");
    } finally {
      setAdding(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black text-foreground tracking-tight uppercase">Idara Zetu</h1>
          <p className="text-xs text-muted-foreground font-bold tracking-wider uppercase">Udhibiti wa bajeti na mgawanyo wa idara</p>
        </div>

        {isAdmin && !showAddForm && (
          <Button 
            onClick={() => setShowAddForm(true)}
            className="rounded-2xl h-11 px-6 font-bold flex items-center justify-center gap-2"
          >
            <Plus className="h-4 w-4" />
            Unda Idara (Create Department)
          </Button>
        )}
      </div>

      {showAddForm && (
        <Card className="p-6 rounded-[2rem] border-primary/10 shadow-lg bg-card/80 backdrop-blur-md max-w-xl animate-in fade-in slide-in-from-top-4 duration-200">
          <div className="flex justify-between items-center pb-4 mb-4 border-b border-border">
            <h3 className="text-sm font-black text-foreground uppercase tracking-wide">Unda Idara Mpya</h3>
            <Button
              onClick={() => setShowAddForm(false)}
              variant="ghost"
              size="icon"
              className="h-8 w-8 rounded-xl hover:bg-muted"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          <form onSubmit={handleCreate} className="space-y-4">
            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-muted-foreground">Jina la Idara</label>
                <Input
                  value={newDept.name}
                  onChange={(e) => setNewDept({ ...newDept, name: e.target.value })}
                  placeholder="Mf. Idara ya Teknolojia (IT)"
                  className="rounded-xl h-11 border-primary/5 bg-background/50 font-semibold"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-muted-foreground">Bajeti ya Mwezi (TZS)</label>
                <Input
                  type="number"
                  value={newDept.budget}
                  onChange={(e) => setNewDept({ ...newDept, budget: Number(e.target.value) })}
                  className="rounded-xl h-11 border-primary/5 bg-background/50 font-semibold"
                  required
                />
              </div>
            </div>

            <Button
              type="submit"
              disabled={adding}
              className="w-full rounded-2xl h-11 font-bold flex items-center justify-center gap-2"
            >
              {adding ? "Inahifadhi..." : (
                <>
                  <Check className="h-4 w-4" />
                  Hifadhi Idara
                </>
              )}
            </Button>
          </form>
        </Card>
      )}

      {loading ? (
        <div className="flex flex-col items-center justify-center p-12 space-y-4">
          <PageLoader />
          <p className="text-xs text-muted-foreground font-bold uppercase tracking-wider">Inapakia idara...</p>
        </div>
      ) : departments.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2">
          {departments.map((dept) => (
            <Card key={dept.id} className="p-5 sm:p-6 rounded-[2rem] border border-primary/5 shadow-xs bg-card/60 backdrop-blur-md flex flex-col justify-between space-y-4">
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-2">
                  <span className="h-8 w-8 rounded-xl bg-primary/10 flex items-center justify-center text-primary shadow-xs shrink-0">
                    <Building className="h-4 w-4" />
                  </span>
                  <h3 className="text-sm font-black text-foreground uppercase tracking-wide truncate">{dept.name}</h3>
                </div>
              </div>

              <div className="space-y-3 pt-3 border-t border-border text-xs font-semibold">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Bajeti ya Mwezi (Budget):</span>
                  <span className="text-foreground font-bold">{(dept.budget || 0).toLocaleString()} TZS</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Zilizotumika (Spent):</span>
                  <span className="text-foreground font-black text-primary">{(dept.spent || 0).toLocaleString()} TZS</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Zilizobaki (Remaining):</span>
                  <span className="text-foreground font-black text-success">{Math.max(0, dept.budget - (dept.spent || 0)).toLocaleString()} TZS</span>
                </div>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <div className="glass-card rounded-[2rem] border-primary/5 p-12 text-center space-y-4 bg-card/40">
          <div className="h-12 w-12 rounded-2xl bg-muted flex items-center justify-center text-muted-foreground mx-auto">
            <Building className="h-6 w-6" />
          </div>
          <div className="space-y-1">
            <h3 className="font-bold text-foreground text-sm">Hakuna Idara Zilizoundwa</h3>
            <p className="text-xs text-muted-foreground font-medium">Bofya "Unda Idara" ili kuongeza kitengo kipya cha bajeti.</p>
          </div>
        </div>
      )}
    </div>
  );
}
