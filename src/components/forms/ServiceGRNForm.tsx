import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Upload, FileText, X } from "lucide-react";
import { PurchaseOrder } from "@/hooks/usePurchaseOrderStore";
import { supabase } from "@/integrations/supabase/client";
import { formatPrecision } from "@/lib/formatUtils";
import { useToast } from "@/hooks/use-toast";

interface ServiceGRNFormProps {
  onClose: () => void;
  onSubmit: (grnData: { grnNumber: string; purchaseOrderId: number; notes?: string; invoiceNumber?: string; invoiceDate?: string; invoiceUrl?: string }) => void;
  purchaseOrder: PurchaseOrder;
}

export function ServiceGRNForm({ onClose, onSubmit, purchaseOrder }: ServiceGRNFormProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [grnNumber, setGrnNumber] = useState("");
  const [grnDate, setGrnDate] = useState(new Date().toISOString().split('T')[0]);
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [invoiceDate, setInvoiceDate] = useState("");
  const [notes, setNotes] = useState("");
  const [invoiceFile, setInvoiceFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  // Auto-generate GRN number
  useEffect(() => {
    const generateGRNNumber = async () => {
      const { data } = await supabase
        .from('purchase_orders')
        .select('grn_number')
        .not('grn_number', 'is', null)
        .order('grn_number', { ascending: false })
        .limit(1);

      if (data && data.length > 0 && data[0].grn_number) {
        const lastNumber = parseInt(data[0].grn_number.replace('NH/GRN-', '')) || 0;
        setGrnNumber(`NH/GRN-${String(lastNumber + 1).padStart(4, '0')}`);
      } else {
        setGrnNumber('NH/GRN-0001');
      }
    };
    generateGRNNumber();
  }, []);

  const handleInvoiceFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const maxSize = 5 * 1024 * 1024; // 5MB
      if (file.size > maxSize) {
        toast({
          title: "File too large",
          description: "Please upload a file smaller than 5MB",
          variant: "destructive"
        });
        return;
      }
      setInvoiceFile(file);
    }
  };

  const removeInvoiceFile = () => {
    setInvoiceFile(null);
  };

  const uploadInvoice = async (): Promise<string | null> => {
    if (!invoiceFile) return null;
    
    setUploading(true);
    try {
      const fileExt = invoiceFile.name.split('.').pop()?.toLowerCase();
      
      const allowedTypes = ['pdf', 'jpg', 'jpeg', 'png', 'webp'];
      if (!fileExt || !allowedTypes.includes(fileExt)) {
        toast({
          title: "Invalid file type",
          description: "Please upload a PDF or image file (JPG, PNG, WebP)",
          variant: "destructive"
        });
        return null;
      }

      const fileName = `grn-invoices/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('payment-receipts')
        .upload(fileName, invoiceFile);

      if (uploadError) throw uploadError;

      return fileName;
    } catch (error) {
      console.error('Error uploading invoice:', error);
      toast({
        title: "Upload failed",
        description: "Failed to upload invoice. Please try again.",
        variant: "destructive"
      });
      return null;
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      let invoiceUrl: string | undefined;
      if (invoiceFile) {
        const uploadedPath = await uploadInvoice();
        if (uploadedPath) {
          invoiceUrl = uploadedPath;
        }
      }

      onSubmit({
        grnNumber,
        purchaseOrderId: purchaseOrder.id,
        notes,
        invoiceNumber,
        invoiceDate,
        invoiceUrl
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Process Service GRN</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* PO Details Card */}
          <Card className="bg-muted/50">
            <CardHeader>
              <CardTitle className="text-lg">Service PO Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">PO Number</p>
                  <p className="font-medium">{purchaseOrder.poNumber}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Supplier</p>
                  <p className="font-medium">{purchaseOrder.supplier}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Order Date</p>
                  <p className="font-medium">{purchaseOrder.orderDate}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Amount</p>
                  <p className="font-semibold text-lg">₹{formatPrecision(purchaseOrder.totalAmount)}</p>
                </div>
              </div>
              {purchaseOrder.serviceDescription && (
                <div className="text-sm">
                  <p className="text-muted-foreground">Service Description</p>
                  <p className="font-medium">{purchaseOrder.serviceDescription}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* GRN Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="grnNumber">GRN Number *</Label>
              <Input
                id="grnNumber"
                value={grnNumber}
                onChange={(e) => setGrnNumber(e.target.value)}
                placeholder="Auto-generated"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="grnDate">GRN Date</Label>
              <Input
                id="grnDate"
                type="date"
                value={grnDate}
                onChange={(e) => setGrnDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="invoiceNumber">Invoice Number</Label>
              <Input
                id="invoiceNumber"
                value={invoiceNumber}
                onChange={(e) => setInvoiceNumber(e.target.value)}
                placeholder="Enter supplier invoice no."
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="invoiceDate">Invoice Date</Label>
              <Input
                id="invoiceDate"
                type="date"
                value={invoiceDate}
                onChange={(e) => setInvoiceDate(e.target.value)}
              />
            </div>
          </div>

          {/* Invoice Upload */}
          <div className="space-y-2">
            <Label>Upload Invoice</Label>
            {invoiceFile ? (
              <div className="flex items-center gap-2 p-3 border rounded-md bg-muted/50">
                <FileText className="h-5 w-5 text-muted-foreground" />
                <span className="flex-1 text-sm truncate">{invoiceFile.name}</span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={removeInvoiceFile}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <label className="flex items-center justify-center gap-2 p-4 border-2 border-dashed rounded-md cursor-pointer hover:border-primary/50 transition-colors">
                <Upload className="h-5 w-5 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Click to upload invoice (PDF, Image - max 5MB)</span>
                <input
                  type="file"
                  className="hidden"
                  accept=".pdf,.jpg,.jpeg,.png,.webp"
                  onChange={handleInvoiceFileChange}
                />
              </label>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">GRN Notes</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Any notes about service completion, remarks, etc."
              rows={4}
            />
          </div>

          <div className="flex justify-end space-x-4">
            <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting || !grnNumber}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                "Complete Service GRN"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
