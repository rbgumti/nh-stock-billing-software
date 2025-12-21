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
import { supabase } from "@/integrations/supabase/client";
import { Upload, X, FileText } from "lucide-react";
import { toast } from "@/hooks/use-toast";

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
    utr_number: initialData?.utr_number || "",
    bank_reference: initialData?.bank_reference || "",
    receipt_url: initialData?.receipt_url || "",
    status: initialData?.status || "Pending",
    notes: initialData?.notes || ""
  });
  
  const [uploading, setUploading] = useState(false);
  const [receiptFile, setReceiptFile] = useState<File | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: "File too large",
          description: "Please select a file smaller than 5MB",
          variant: "destructive"
        });
        return;
      }
      setReceiptFile(file);
    }
  };

  const uploadReceipt = async (): Promise<string | null> => {
    if (!receiptFile) return formData.receipt_url || null;
    
    setUploading(true);
    try {
      const fileExt = receiptFile.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `receipts/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('payment-receipts')
        .upload(filePath, receiptFile);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('payment-receipts')
        .getPublicUrl(filePath);

      return publicUrl;
    } catch (error) {
      console.error('Error uploading receipt:', error);
      toast({
        title: "Upload failed",
        description: "Failed to upload receipt. Please try again.",
        variant: "destructive"
      });
      return null;
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.supplier_id || !formData.amount || !formData.payment_date) {
      return;
    }

    let receiptUrl = formData.receipt_url;
    if (receiptFile) {
      const uploadedUrl = await uploadReceipt();
      if (uploadedUrl) {
        receiptUrl = uploadedUrl;
      }
    }

    onSubmit({
      supplier_id: parseInt(formData.supplier_id),
      purchase_order_id: formData.purchase_order_id ? parseInt(formData.purchase_order_id) : undefined,
      amount: parseFloat(formData.amount),
      payment_date: formData.payment_date,
      due_date: formData.due_date || undefined,
      payment_method: formData.payment_method || undefined,
      reference_number: formData.reference_number || undefined,
      utr_number: formData.utr_number || undefined,
      bank_reference: formData.bank_reference || undefined,
      receipt_url: receiptUrl || undefined,
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

  const removeReceipt = () => {
    setReceiptFile(null);
    setFormData({ ...formData, receipt_url: "" });
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
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
              onValueChange={(value) => setFormData({ ...formData, purchase_order_id: value === "none" ? "" : value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select PO (optional)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
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
                  <SelectItem value="NEFT">NEFT</SelectItem>
                  <SelectItem value="RTGS">RTGS</SelectItem>
                  <SelectItem value="IMPS">IMPS</SelectItem>
                  <SelectItem value="UPI">UPI</SelectItem>
                  <SelectItem value="Credit">Credit</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="reference_number">Reference/Cheque No.</Label>
              <Input
                id="reference_number"
                value={formData.reference_number}
                onChange={(e) => setFormData({ ...formData, reference_number: e.target.value })}
                placeholder="Cheque/Transaction No."
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="utr_number">UTR Number</Label>
              <Input
                id="utr_number"
                value={formData.utr_number}
                onChange={(e) => setFormData({ ...formData, utr_number: e.target.value })}
                placeholder="UTR/Transaction ID"
              />
            </div>
            <div>
              <Label htmlFor="bank_reference">Bank Reference</Label>
              <Input
                id="bank_reference"
                value={formData.bank_reference}
                onChange={(e) => setFormData({ ...formData, bank_reference: e.target.value })}
                placeholder="Bank ref. number"
              />
            </div>
          </div>

          {/* Receipt Upload */}
          <div>
            <Label>Payment Receipt</Label>
            {(receiptFile || formData.receipt_url) ? (
              <div className="flex items-center gap-2 p-3 border rounded-md bg-muted/50">
                <FileText className="h-5 w-5 text-muted-foreground" />
                <span className="flex-1 text-sm truncate">
                  {receiptFile ? receiptFile.name : 'Receipt uploaded'}
                </span>
                {formData.receipt_url && !receiptFile && (
                  <a 
                    href={formData.receipt_url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-sm text-primary hover:underline"
                  >
                    View
                  </a>
                )}
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={removeReceipt}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <div className="mt-1">
                <label className="flex items-center justify-center gap-2 p-4 border-2 border-dashed rounded-md cursor-pointer hover:border-primary/50 transition-colors">
                  <Upload className="h-5 w-5 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Click to upload receipt (PDF, Image - max 5MB)</span>
                  <input
                    type="file"
                    className="hidden"
                    accept=".pdf,.jpg,.jpeg,.png,.webp"
                    onChange={handleFileChange}
                  />
                </label>
              </div>
            )}
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
            <Button type="submit" disabled={uploading}>
              {uploading ? 'Uploading...' : (initialData ? 'Update' : 'Record')} Payment
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
