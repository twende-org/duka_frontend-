import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { useProcessCustomerPayment } from "@/hooks/useCustomerAR";
import { toast } from "sonner";
import type { CustomerBalance } from "@/types";

interface Props {
  balance: CustomerBalance;
  shopId: string;
  onClose: () => void;
}

interface PaymentFormData {
  amount: number;
  method: "Cash" | "Bank" | "Mobile Money";
  reference: string;
  notes: string;
}

export default function RecordCustomerPaymentDialog({ balance, shopId, onClose }: Props) {
  const { register, handleSubmit, setValue, formState: { errors } } = useForm<PaymentFormData>({
    defaultValues: {
      amount: balance.outstandingBalance > 0 ? balance.outstandingBalance : 0,
      method: "Cash",
    }
  });

  const { mutateAsync: processPayment, isPending } = useProcessCustomerPayment(shopId);

  const onSubmit = async (data: PaymentFormData) => {
    if (data.amount > (balance.outstandingBalance || 0)) {
      toast.error("Payment amount cannot exceed outstanding balance.");
      return;
    }

    try {
      await processPayment({
        customerId: balance.customerId,
        amount: Number(data.amount),
        method: data.method,
        date: new Date().toISOString().split("T")[0],
        reference: data.reference,
        notes: data.notes,
      });
      toast.success("Payment recorded successfully.");
      onClose();
    } catch (err: any) {
      toast.error(err.message || "Failed to record payment.");
    }
  };

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Record Customer Payment</DialogTitle>
          <DialogDescription>
            Record a payment for customer <strong>{balance.customerId}</strong>. Current outstanding balance: <strong>{balance.outstandingBalance?.toLocaleString()}</strong>
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label>Payment Amount</Label>
            <Input type="number" step="0.01" max={balance.outstandingBalance} {...register("amount", { required: true, min: 0.01 })} />
            {errors.amount && <span className="text-xs text-red-500">Amount is required and cannot exceed balance</span>}
          </div>

          <div className="space-y-2">
            <Label>Payment Method</Label>
            <Select onValueChange={(val: any) => setValue("method", val)} defaultValue="Cash">
              <SelectTrigger>
                <SelectValue placeholder="Select Method" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Cash">Cash</SelectItem>
                <SelectItem value="Mobile Money">Mobile Money</SelectItem>
                <SelectItem value="Bank">Bank Transfer</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Reference Number</Label>
            <Input placeholder="Txn ID or Cheque No." {...register("reference")} />
          </div>

          <div className="space-y-2">
            <Label>Notes (Optional)</Label>
            <Input placeholder="Any additional details" {...register("notes")} />
          </div>

          <DialogFooter>
            <Button variant="outline" type="button" onClick={onClose} disabled={isPending}>Cancel</Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Recording..." : "Record Payment"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
