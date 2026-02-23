import { useState, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { SupplierPayment } from "@/hooks/useSupplierPaymentStore";
import { Supplier } from "@/hooks/useSupplierStore";
import { PurchaseOrder } from "@/hooks/usePurchaseOrderStore";
import { supabase } from "@/integrations/supabase/client";
import { Upload, X, FileText, AlertCircle, CheckCircle2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface SupplierPaymentFormProps {
  onClose: () => void;
  onSubmit: (
    payment: Omit<SupplierPayment, 'id' | 'created_at' | 'updated_at' | 'supplier_name' | 'po_number'>,
    linkedPOIds: string[]
  ) => void;
  suppliers: Supplier[];
  purchaseOrders: PurchaseOrder[];
  initialData?: SupplierPayment;
}

export function SupplierPaymentForm({ onClose, onSubmit, suppliers, purchaseOrders, initialData }: SupplierPaymentFormProps) {
  const [formData, setFormData] = useState({
    supplier_id: initialData?.supplier_id?.toString() || "",
    amount: initialData?.amount?.toString() || "",
    payment_date: initialData?.payment_date || new Date().toISOString().split('T')[0],
    due_date: initialData?.due_date || "",
    payment_method: initialData?.payment_method || "",
    reference_number: initialData?.reference_number || "",
    utr_number: initialData?.utr_number || "",
    bank_reference: initialData?.bank_reference || "",
    receipt_url: initialData?.receipt_url || "",
    status: initialData?.status || "Completed",
    notes: initialData?.notes || ""
  });
  
  // Multi-select PO IDs
  const [selectedPOIds, setSelectedPOIds] = useState<string[]>(
    initialData?.purchase_order_id ? [initialData.purchase_order_id] : []
  );
  
  const [uploading, setUploading] = useState(false);
  const [receiptFile, setReceiptFile] = useState<File | null>(null);

  // Filter POs for selected supplier - only show unpaid/partial ones
  const filteredPOs = useMemo(() => {
    if (!formData.supplier_id) return [];
    const supplier = suppliers.find(s => s.id.toString() === formData.supplier_id);
    if (!supplier) return [];
    
    return purchaseOrders.filter(po => 
      po.supplier === supplier.name && 
      (po.status === 'Received' || po.status === 'Pending') &&
      po.paymentStatus !== 'Paid'
    );
  }, [formData.supplier_id, suppliers, purchaseOrders]);

  // Calculate total outstanding for selected POs
  const selectedPOsTotal = useMemo(() => {
    return filteredPOs
      .filter(po => selectedPOIds.includes(po.id))
      .reduce((sum, po) => sum + po.totalAmount, 0);
  }, [filteredPOs, selectedPOIds]);

  const handlePOToggle = (poId: string, checked: boolean) => {
    if (checked) {
      setSelectedPOIds(prev => [...prev, poId]);
    } else {
      setSelectedPOIds(prev => prev.filter(id => id !== poId));
    }
  };

  const selectAllPOs = () => {
    setSelectedPOIds(filteredPOs.map(po => po.id));
  };

  const clearAllPOs = () => {
    setSelectedPOIds([]);
  };

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
      const fileExt = receiptFile.name.split('.').pop()?.toLowerCase();
      
      const allowedTypes = ['pdf', 'jpg', 'jpeg', 'png', 'webp'];
      if (!fileExt || !allowedTypes.includes(fileExt)) {
        toast({
          title: "Invalid file type",
          description: "Please upload a PDF or image file (JPG, PNG, WebP)",
          variant: "destructive"
        });
        return null;
      }

      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `receipts/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('payment-receipts')
        .upload(filePath, receiptFile);

      if (uploadError) throw uploadError;

      return filePath;
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

  const getSignedReceiptUrl = async (filePath: string): Promise<string | null> => {
    try {
      if (filePath.startsWith('http')) {
        return filePath;
      }
      
      const { data, error } = await supabase.storage
        .from('payment-receipts')
        .createSignedUrl(filePath, 3600);
      
      if (error) throw error;
      return data.signedUrl;
    } catch (error) {
      console.error('Error getting signed URL:', error);
      return null;
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

    // For the payment record, link to the first PO if multiple selected
    // The linked_po_ids will be used to update all PO statuses
    const primaryPOId = selectedPOIds.length > 0 ? selectedPOIds[0] : undefined;

    onSubmit({
      supplier_id: formData.supplier_id,
      purchase_order_id: primaryPOId,
      amount: parseFloat(formData.amount),
      payment_date: formData.payment_date,
      due_date: formData.due_date || undefined,
      payment_method: formData.payment_method || undefined,
      reference_number: formData.reference_number || undefined,
      utr_number: formData.utr_number || undefined,
      bank_reference: formData.bank_reference || undefined,
      receipt_url: receiptUrl || undefined,
      status: formData.status,
      notes: formData.notes || (selectedPOIds.length > 1 ? `Payment for POs: ${selectedPOIds.map(id => {
        const po = purchaseOrders.find(p => p.id === id);
        return po ? `#${po.poNumber}` : `#${id}`;
      }).join(', ')}` : undefined)
    }, selectedPOIds);
    
    onClose();
  };

  const removeReceipt = () => {
    setReceiptFile(null);
    setFormData({ ...formData, receipt_url: "" });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2
    }).format(amount);
  };

  const getPaymentStatusBadge = (status: string) => {
    switch (status) {
      case 'Paid':
        return <Badge className="bg-emerald/20 text-emerald border-emerald/30 text-xs">Paid</Badge>;
      case 'Partial':
        return <Badge className="bg-cyan/20 text-cyan border-cyan/30 text-xs">Partial</Badge>;
      case 'Overdue':
        return <Badge className="bg-destructive/20 text-destructive border-destructive/30 text-xs">Overdue</Badge>;
      default:
        return <Badge className="bg-gold/20 text-gold border-gold/30 text-xs">Pending</Badge>;
    }
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{initialData ? 'Edit Payment' : 'Record Payment'}</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="supplier">Supplier *</Label>
            <Select
              value={formData.supplier_id}
              onValueChange={(value) => {
                setFormData({ ...formData, supplier_id: value });
                setSelectedPOIds([]); // Clear selected POs when supplier changes
              }}
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

          {/* Multi-select POs */}
          {formData.supplier_id && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label>Link to Purchase Orders</Label>
                {filteredPOs.length > 0 && (
                  <div className="flex gap-2">
                    <Button type="button" variant="ghost" size="sm" onClick={selectAllPOs} className="text-xs h-7">
                      Select All
                    </Button>
                    <Button type="button" variant="ghost" size="sm" onClick={clearAllPOs} className="text-xs h-7">
                      Clear
                    </Button>
                  </div>
                )}
              </div>
              
              {filteredPOs.length > 0 ? (
                <Card className="border">
                  <ScrollArea className="h-[180px]">
                    <CardContent className="p-2 space-y-1">
                      {filteredPOs.map((po) => {
                        const isSelected = selectedPOIds.includes(po.id);
                        const isOverdue = po.paymentDueDate && new Date(po.paymentDueDate) < new Date();
                        
                        return (
                          <div
                            key={po.id}
                            className={`flex items-center gap-3 p-2 rounded-md transition-colors cursor-pointer ${
                              isSelected ? 'bg-primary/10 border border-primary/30' : 'hover:bg-muted/50'
                            }`}
                            onClick={() => handlePOToggle(po.id, !isSelected)}
                          >
                            <Checkbox
                              checked={isSelected}
                              onCheckedChange={(checked) => handlePOToggle(po.id, checked as boolean)}
                              onClick={(e) => e.stopPropagation()}
                            />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="font-medium text-sm">PO #{po.poNumber}</span>
                                {getPaymentStatusBadge(po.paymentStatus || 'Pending')}
                                {isOverdue && (
                                  <AlertCircle className="h-3.5 w-3.5 text-destructive" />
                                )}
                              </div>
                              <div className="text-xs text-muted-foreground flex gap-2">
                                <span>{po.grnDate || po.orderDate}</span>
                                {po.grnNumber && <span>• GRN: {po.grnNumber}</span>}
                              </div>
                            </div>
                            <div className="text-right">
                              <span className="font-semibold text-sm">{formatCurrency(po.totalAmount)}</span>
                              {po.paymentDueDate && (
                                <div className={`text-xs ${isOverdue ? 'text-destructive' : 'text-muted-foreground'}`}>
                                  Due: {po.paymentDueDate}
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </CardContent>
                  </ScrollArea>
                </Card>
              ) : (
                <Card className="border">
                  <CardContent className="py-6 text-center text-muted-foreground">
                    <CheckCircle2 className="h-8 w-8 mx-auto mb-2 text-emerald/50" />
                    <p className="text-sm">No unpaid POs for this supplier</p>
                  </CardContent>
                </Card>
              )}
              
              {selectedPOIds.length > 0 && (
                <div className="mt-2 p-2 bg-muted/50 rounded-md flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">
                    {selectedPOIds.length} PO{selectedPOIds.length > 1 ? 's' : ''} selected
                  </span>
                  <span className="font-semibold text-sm">
                    Total: {formatCurrency(selectedPOsTotal)}
                  </span>
                </div>
              )}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="amount">Amount *</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                placeholder={selectedPOsTotal > 0 ? `Suggested: ${selectedPOsTotal.toFixed(2)}` : ''}
                required
              />
              {selectedPOsTotal > 0 && !formData.amount && (
                <Button 
                  type="button" 
                  variant="link" 
                  size="sm" 
                  className="text-xs p-0 h-auto mt-1"
                  onClick={() => setFormData({ ...formData, amount: selectedPOsTotal.toFixed(2) })}
                >
                  Use total: {formatCurrency(selectedPOsTotal)}
                </Button>
              )}
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
                  <SelectItem value="Completed">Completed</SelectItem>
                  <SelectItem value="Pending">Pending</SelectItem>
                  <SelectItem value="Partial">Partial</SelectItem>
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
                  <Button
                    type="button"
                    variant="link"
                    size="sm"
                    className="text-sm text-primary hover:underline p-0 h-auto"
                    onClick={async () => {
                      const url = await getSignedReceiptUrl(formData.receipt_url);
                      if (url) {
                        window.open(url, '_blank', 'noopener,noreferrer');
                      } else {
                        toast({
                          title: "Error",
                          description: "Could not access receipt. Please try again.",
                          variant: "destructive"
                        });
                      }
                    }}
                  >
                    View
                  </Button>
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
              {selectedPOIds.length > 0 && ` (${selectedPOIds.length} PO${selectedPOIds.length > 1 ? 's' : ''})`}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
