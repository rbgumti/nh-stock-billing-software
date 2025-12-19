import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SupplierPayment } from "@/hooks/useSupplierPaymentStore";
import { Supplier } from "@/hooks/useSupplierStore";
import { PurchaseOrder } from "@/hooks/usePurchaseOrderStore";

interface SupplierPaymentFormProps {
  onClose: () => void;
  onSubmit: (payment: Omit<SupplierPayment, 'id' | 'created_at' | 'updated_at' | 'supplier_name' | 'po_number'>) => void;
  suppliers: Supplier[];
  purchaseOrders: PurchaseOrder[];
  initialData?: SupplierPayment;
}

export function SupplierPaymentForm({ onClose, onSubmit, suppliers, purchaseOrders, initialData }: SupplierPaymentFormProps) {
  const [formData, setFormData] = useState({
    supplier_id: initialData?.supplier_id?.toString() || "",
    purchase_order_id: initialData?.purchase_order_id?.toString() || "",
    amount: initialData?.amount?.toString() || "",
    payment_date: initialData?.payment_date || new Date().toISOString().split('T')[0],
    due_date: initialData?.due_date || "",
    payment_method: initialData?.payment_method || "",
    reference_number: initialData?.reference_number || "",
    status: initialData?.status || "Pending",
    notes: initialData?.notes || ""
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.supplier_id || !formData.amount || !formData.payment_date) {
      return;
    }

    onSubmit({
      supplier_id: parseInt(formData.supplier_id),
      purchase_order_id: formData.purchase_order_id ? parseInt(formData.purchase_order_id) : undefined,
      amount: parseFloat(formData.amount),
      payment_date: formData.payment_date,
      due_date: formData.due_date || undefined,
      payment_method: formData.payment_method || undefined,
      reference_number: formData.reference_number || undefined,
      status: formData.status,
      notes: formData.notes || undefined
    });
    onClose();
  };

  const filteredPOs = formData.supplier_id 
    ? purchaseOrders.filter(po => {
        const supplier = suppliers.find(s => s.id.toString() === formData.supplier_id);
        return supplier && po.supplier === supplier.name;
      })
    : [];

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{initialData ? 'Edit Payment' : 'Record Payment'}</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="supplier">Supplier *</Label>
            <Select
              value={formData.supplier_id}
              onValueChange={(value) => setFormData({ ...formData, supplier_id: value, purchase_order_id: "" })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select supplier" />
              </SelectTrigger>
              <SelectContent>
                {suppliers.map((supplier) => (
                  <SelectItem key={supplier.id} value={supplier.id.toString()}>
                    {supplier.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="purchase_order">Link to Purchase Order (Optional)</Label>
            <Select
              value={formData.purchase_order_id}
              onValueChange={(value) => setFormData({ ...formData, purchase_order_id: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select PO (optional)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">None</SelectItem>
                {filteredPOs.map((po) => (
                  <SelectItem key={po.id} value={po.id.toString()}>
                    PO #{po.poNumber} - ₹{po.totalAmount.toFixed(2)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="amount">Amount *</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                required
              />
            </div>
            <div>
              <Label htmlFor="status">Status</Label>
              <Select
                value={formData.status}
                onValueChange={(value) => setFormData({ ...formData, status: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Pending">Pending</SelectItem>
                  <SelectItem value="Completed">Completed</SelectItem>
                  <SelectItem value="Partial">Partial</SelectItem>
                  <SelectItem value="Overdue">Overdue</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="payment_date">Payment Date *</Label>
              <Input
                id="payment_date"
                type="date"
                value={formData.payment_date}
                onChange={(e) => setFormData({ ...formData, payment_date: e.target.value })}
                required
              />
            </div>
            <div>
              <Label htmlFor="due_date">Due Date</Label>
              <Input
                id="due_date"
                type="date"
                value={formData.due_date}
                onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="payment_method">Payment Method</Label>
              <Select
                value={formData.payment_method}
                onValueChange={(value) => setFormData({ ...formData, payment_method: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select method" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Cash">Cash</SelectItem>
                  <SelectItem value="Cheque">Cheque</SelectItem>
                  <SelectItem value="Bank Transfer">Bank Transfer</SelectItem>
                  <SelectItem value="UPI">UPI</SelectItem>
                  <SelectItem value="Credit">Credit</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="reference_number">Reference No.</Label>
              <Input
                id="reference_number"
                value={formData.reference_number}
                onChange={(e) => setFormData({ ...formData, reference_number: e.target.value })}
                placeholder="Cheque/Transaction No."
              />
            </div>
          </div>

          <div>
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={2}
            />
          </div>

          <div className="flex gap-2 justify-end">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit">
              {initialData ? 'Update' : 'Record'} Payment
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
