import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Box, CheckCircle } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import type { Order, FulfillmentDetails } from "@/types";

interface PackingDialogProps {
  order: Order | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (data: Partial<FulfillmentDetails>) => void;
}

export default function PackingDialog({ order, open, onOpenChange, onConfirm }: PackingDialogProps) {
  const { lang } = useI18n();
  const sw = lang === "sw";
  
  const [packedBy, setPackedBy] = useState("");
  const [packNotes, setPackNotes] = useState("");

  const handleConfirm = () => {
    onConfirm({ packedBy, packNotes });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Box className="h-5 w-5 text-primary" />
            {sw ? "Kufungasha Oda (Packing)" : "Pack Order"}
          </DialogTitle>
        </DialogHeader>

        {order && (
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>{sw ? "Imefungashwa na (Jina)" : "Packed By"}</Label>
              <Input 
                placeholder={sw ? "Weka jina la mfanyakazi" : "Enter employee name"}
                value={packedBy}
                onChange={(e) => setPackedBy(e.target.value)}
              />
            </div>
            
            <div className="space-y-2">
              <Label>{sw ? "Maelezo ya Kufungasha (Si lazima)" : "Packing Notes (Optional)"}</Label>
              <Textarea 
                placeholder={sw ? "Maelezo kuhusu kifurushi..." : "Notes about the package..."}
                value={packNotes}
                onChange={(e) => setPackNotes(e.target.value)}
              />
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {sw ? "Ghairi" : "Cancel"}
          </Button>
          <Button onClick={handleConfirm} disabled={!packedBy} className="gap-2">
            <CheckCircle className="h-4 w-4" />
            {sw ? "Thibitisha Kufungashwa" : "Mark as Packed"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
