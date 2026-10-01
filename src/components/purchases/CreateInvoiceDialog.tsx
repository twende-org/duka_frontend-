import React, { useState, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useForm } from "react-hook-form";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, CheckCircle2 } from "lucide-react";
import { B2BPurchaseOrder, GRN } from "@/types";
import { useCreateSupplierInvoice } from "@/hooks/useB2BFinance";
import { useToast } from "@/hooks/use-toast";

interface Props {
  po: B2BPurchaseOrder;
  grns: GRN[];
  onClose: () => void;
}

interface InvoiceFormData {
  invoiceNumber: string;
  invoiceDate: string;
  dueDate: string;
  subtotal: number;
  taxAmount: number;
  discountAmount: number;
  totalAmount: number;
}

export default function CreateInvoiceDialog({ po, grns, onClose }: Props) {
  const { register, handleSubmit, watch, formState: { errors } } = useForm<InvoiceFormData>({
    defaultValues: {
      subtotal: 0,
      taxAmount: 0,
      discountAmount: 0,
      totalAmount: 0,
    }
  });

  const { mutateAsync: createInvoice, isPending } = useCreateSupplierInvoice();
  const { toast } = useToast();

  const watchedSubtotal = watch("subtotal") || 0;
  const watchedTax = watch("taxAmount") || 0;
  const watchedDiscount = watch("discountAmount") || 0;
  const watchedTotal = watch("totalAmount") || 0;

  // 3-Way Match Calculation
  const matchStatus = useMemo(() => {
    // 1. PO Expected Total
    const poExpectedTotal = po.totalAmount || po.items.reduce((acc, item) => acc + (item.expectedQty * item.buyingPrice), 0);
    
    // 2. GRN Received Total
    const grnReceivedTotal = grns.reduce((acc, grn) => {
      return acc + grn.items.reduce((itemAcc, item) => itemAcc + (item.acceptedQty * item.unitCost), 0);
    }, 0);

    // 3. Invoice Total
    const invoiceTotal = Number(watchedTotal);
    const invoiceCalculatedTotal = Number(watchedSubtotal) + Number(watchedTax) - Number(watchedDiscount);

    const isMatch = Math.abs(grnReceivedTotal - invoiceTotal) < 0.01;
    const isMathValid = Math.abs(invoiceCalculatedTotal - invoiceTotal) < 0.01;

    return {
      poExpectedTotal,
      grnReceivedTotal,
      invoiceTotal,
      isMatch,
      isMathValid,
    };
  }, [po, grns, watchedSubtotal, watchedTax, watchedDiscount, watchedTotal]);

  const onSubmit = async (data: InvoiceFormData) => {
    if (!matchStatus.isMathValid) {
      toast({ title: "Math Error", description: "Subtotal + Tax - Discount must equal Total", variant: "destructive" });
      return;
    }
    
    try {
      await createInvoice({
        supplierShopId: po.supplierShopId,
        buyerShopId: po.buyerShopId,
        purchaseOrderId: po.id,
        grnIds: grns.map(g => g.id),
        invoiceNumber: data.invoiceNumber,
        invoiceDate: data.invoiceDate,
        dueDate: data.dueDate,
        currency: po.currency || "TZS",
        subtotal: Number(data.subtotal),
        taxAmount: Number(data.taxAmount),
        discountAmount: Number(data.discountAmount),
        totalAmount: Number(data.totalAmount),
        status: matchStatus.isMatch ? "approved" : "under_review",
      });
      
      toast({ 
        title: "Invoice Recorded", 
        description: matchStatus.isMatch ? "Invoice matched GRN and was approved." : "Invoice submitted for review due to mismatch." 
      });
      onClose();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Record Supplier Invoice (3-Way Match)</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="p-4 bg-muted rounded-lg">
            <p className="text-sm text-muted-foreground">PO Expected Total</p>
            <p className="text-xl font-bold">{matchStatus.poExpectedTotal.toLocaleString()}</p>
          </div>
          <div className="p-4 bg-muted rounded-lg">
            <p className="text-sm text-muted-foreground">GRN Received Total</p>
            <p className="text-xl font-bold text-primary">{matchStatus.grnReceivedTotal.toLocaleString()}</p>
          </div>
        </div>

        {matchStatus.invoiceTotal > 0 && (
          <Alert variant={matchStatus.isMatch ? "default" : "destructive"}>
            {matchStatus.isMatch ? <CheckCircle2 className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
            <AlertTitle>{matchStatus.isMatch ? "3-Way Match Successful" : "Mismatch Detected"}</AlertTitle>
            <AlertDescription>
              {matchStatus.isMatch 
                ? "The invoice amount matches the physically received goods value." 
                : `The invoice total (${matchStatus.invoiceTotal.toLocaleString()}) does not match the GRN value (${matchStatus.grnReceivedTotal.toLocaleString()}). Invoice will require manual approval.`}
            </AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Invoice Number</Label>
              <Input {...register("invoiceNumber", { required: true })} />
            </div>
            <div className="space-y-2">
              <Label>Invoice Date</Label>
              <Input type="date" {...register("invoiceDate", { required: true })} />
            </div>
            <div className="space-y-2">
              <Label>Due Date</Label>
              <Input type="date" {...register("dueDate", { required: true })} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Subtotal</Label>
              <Input type="number" step="0.01" {...register("subtotal", { required: true })} />
            </div>
            <div className="space-y-2">
              <Label>Tax Amount</Label>
              <Input type="number" step="0.01" {...register("taxAmount")} />
            </div>
            <div className="space-y-2">
              <Label>Discount Amount</Label>
              <Input type="number" step="0.01" {...register("discountAmount")} />
            </div>
            <div className="space-y-2">
              <Label>Total Amount</Label>
              <Input type="number" step="0.01" {...register("totalAmount", { required: true })} />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" type="button" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Recording..." : "Record Invoice"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
