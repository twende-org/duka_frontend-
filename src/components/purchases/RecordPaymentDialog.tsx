import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { useProcessSupplierPayment } from "@/hooks/useB2BFinance";
import { useToast } from "@/hooks/use-toast";
import { B2BSupplierBalance } from "@/types";

interface Props {
  balance: B2BSupplierBalance;
  buyerShopId: string;
  onClose: () => void;
}

interface PaymentFormData {
  amount: number;
  method: "Cash" | "Bank" | "Mobile Money";
  reference: string;
  notes: string;
  allowOverpayment: boolean;
}

export default function RecordPaymentDialog({ balance, buyerShopId, onClose }: Props) {
  const { register, handleSubmit, setValue, formState: { errors } } = useForm<PaymentFormData>({
    defaultValues: {
      amount: balance.outstandingBalance > 0 ? balance.outstandingBalance : 0,
      method: "Bank",
    }
  });

  const { mutateAsync: processPayment, isPending } = useProcessSupplierPayment();
  const { toast } = useToast();

  const onSubmit = async (data: PaymentFormData) => {
    try {
      await processPayment({
        paymentData: {
          supplierShopId: balance.supplierShopId,
          buyerShopId,
          amount: Number(data.amount),
          method: data.method,
          reference: data.reference,
          notes: data.notes,
          date: new Date().toISOString(),
        },
        allowOverpayment: data.allowOverpayment
      });
      toast({ title: "Payment Recorded", description: "The supplier balance has been updated successfully." });
      onClose();
    } catch (err: unknown) {
      const error = err as Error;
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Record Supplier Payment</DialogTitle>
          <DialogDescription>
            Record a payment to <strong>{balance.supplierShopId}</strong>. Current outstanding balance: <strong>{balance.outstandingBalance?.toLocaleString()}</strong>
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label>Payment Amount</Label>
            <Input type="number" step="0.01" {...register("amount", { required: true, min: 0.01 })} />
            {errors.amount && <span className="text-xs text-red-500">Amount is required</span>}
            
            <div className="flex items-center gap-2 mt-2">
              <input type="checkbox" id="allowOverpayment" {...register("allowOverpayment")} />
              <Label htmlFor="allowOverpayment" className="text-xs font-normal">Allow overpayment (Amount exceeds outstanding balance)</Label>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Payment Method</Label>
            <Select onValueChange={(val: any) => setValue("method", val)} defaultValue="Bank">
              <SelectTrigger>
                <SelectValue placeholder="Select Method" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Bank">Bank Transfer</SelectItem>
                <SelectItem value="Mobile Money">Mobile Money</SelectItem>
                <SelectItem value="Cash">Cash</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Reference Number</Label>
            <Input placeholder="Txn ID or Cheque No." {...register("reference")} />
          </div>

          <div className="space-y-2">
            <Label>Notes (Optional)</Label>
            <Input placeholder="Any additional notes..." {...register("notes")} />
          </div>

          <DialogFooter>
            <Button variant="outline" type="button" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Recording..." : "Record Payment"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
