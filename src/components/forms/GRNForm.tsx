import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, AlertCircle, Printer, Plus, Trash2, Upload, FileText, X, Loader2 } from "lucide-react";
import { StockItem } from "@/hooks/useStockStore";
import { PurchaseOrder } from "@/hooks/usePurchaseOrderStore";
import { supabase } from "@/integrations/supabase/client";
import { PrintableGRN } from "./PrintableGRN";
import { formatPrecision } from "@/lib/formatUtils";
import { useToast } from "@/hooks/use-toast";

interface GRNItem {
  stockItemId: number;
  orderedQuantity: number;
  receivedQuantity: number;
  batchNo?: string;
  expiryDate?: string;
  costPrice?: number;
  mrp?: number;
  remarks?: string;
  isAdditionalBatch?: boolean; // Flag for additional batch rows
  parentIndex?: number; // Reference to parent item for additional batches
}

interface GRNFormProps {
  onClose: () => void;
  onSubmit: (grnData: { 
    grnNumber: string; 
    purchaseOrderId: number; 
    items: GRNItem[]; 
    notes?: string;
    invoiceNumber?: string;
    invoiceDate?: string;
    invoiceUrl?: string;
  }) => void;
  purchaseOrder: PurchaseOrder;
  stockItems: StockItem[];
}

// Helper to check if expiry date is valid (not N/A, empty, or invalid format)
const isValidExpiryDate = (date?: string): boolean => {
  if (!date || date === 'N/A' || date.trim() === '') return false;
  const parsed = new Date(date);
  return !isNaN(parsed.getTime());
};

// Clean expiry date - return empty string for invalid dates (for date input compatibility)
const cleanExpiryDate = (date?: string): string => {
  if (!date || date === 'N/A' || date.trim() === '') return '';
  const parsed = new Date(date);
  if (isNaN(parsed.getTime())) return '';
  return date;
};

export function GRNForm({ onClose, onSubmit, purchaseOrder, stockItems }: GRNFormProps) {
  const { toast } = useToast();
  const [grnNumber, setGrnNumber] = useState("");
  const [grnDate, setGrnDate] = useState(new Date().toISOString().split('T')[0]);
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().split('T')[0]);
  const [showPrintPreview, setShowPrintPreview] = useState(false);
  const [invoiceFile, setInvoiceFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  
  const [grnItems, setGRNItems] = useState<GRNItem[]>(
    purchaseOrder.items.map(item => {
      // Get stock item to auto-populate batch, expiry, and cost price from Item Master
      const stockItem = stockItems.find(s => s.id === item.stockItemId);
      // Clean batch number - remove auto-generated BATCH prefix if present
      const cleanBatchNo = stockItem?.batchNo?.startsWith('BATCH') ? '' : (stockItem?.batchNo || '');
      return {
        stockItemId: item.stockItemId,
        orderedQuantity: item.qtyInTabs || item.quantity, // Use tabs as primary quantity
        receivedQuantity: item.qtyInTabs || item.quantity,
        batchNo: cleanBatchNo,
        expiryDate: cleanExpiryDate(stockItem?.expiryDate), // Clean N/A and invalid dates
        costPrice: stockItem?.unitPrice || item.unitPrice || 0, // Cost price from Item Master
        mrp: stockItem?.mrp || 0,
        remarks: ""
      };
    })
  );

  const [notes, setNotes] = useState("");

  // Generate sequential GRN number on load with NH/GRN- prefix
  useEffect(() => {
    const generateGRNNumber = async () => {
      const prefix = 'NH/GRN-';
      
      // Query database for highest GRN number with this prefix
      const { data, error } = await supabase
        .from('purchase_orders')
        .select('grn_number')
        .like('grn_number', `${prefix}%`)
        .not('grn_number', 'is', null)
        .order('grn_number', { ascending: false })
        .limit(1);
      
      let nextNum = 1;
      if (!error && data && data.length > 0 && data[0].grn_number) {
        const lastNumber = data[0].grn_number;
        const suffix = lastNumber.replace(prefix, '');
        const parsed = parseInt(suffix, 10);
        if (!isNaN(parsed)) {
          nextNum = parsed + 1;
        }
      }
      
      const paddedNumber = nextNum.toString().padStart(4, '0');
      setGrnNumber(`${prefix}${paddedNumber}`);
    };

    generateGRNNumber();
  }, []);

  const updateReceivedQuantity = (index: number, quantity: string) => {
    const newItems = [...grnItems];
    newItems[index].receivedQuantity = parseInt(quantity) || 0;
    setGRNItems(newItems);
  };

  const updateBatchNo = (index: number, batchNo: string) => {
    const newItems = [...grnItems];
    newItems[index].batchNo = batchNo;
    setGRNItems(newItems);
  };

  const updateExpiryDate = (index: number, expiryDate: string) => {
    const newItems = [...grnItems];
    newItems[index].expiryDate = expiryDate;
    setGRNItems(newItems);
  };

  const updateCostPrice = (index: number, costPrice: string) => {
    const newItems = [...grnItems];
    newItems[index].costPrice = parseFloat(costPrice) || 0;
    setGRNItems(newItems);
  };

  const updateMRP = (index: number, mrp: string) => {
    const newItems = [...grnItems];
    newItems[index].mrp = parseFloat(mrp) || 0;
    setGRNItems(newItems);
  };

  const updateRemarks = (index: number, remarks: string) => {
    const newItems = [...grnItems];
    newItems[index].remarks = remarks;
    setGRNItems(newItems);
  };

  // Add a new batch row for an item
  const addBatchRow = (stockItemId: number, parentIndex: number) => {
    const stockItem = stockItems.find(s => s.id === stockItemId);
    const newBatchItem: GRNItem = {
      stockItemId,
      orderedQuantity: 0, // Additional batches don't have ordered qty
      receivedQuantity: 0,
      batchNo: "",
      expiryDate: "",
      costPrice: stockItem?.unitPrice || 0,
      mrp: stockItem?.mrp || 0,
      remarks: "",
      isAdditionalBatch: true,
      parentIndex
    };
    
    // Find the last batch row for this item and insert after it
    let insertIndex = parentIndex + 1;
    while (insertIndex < grnItems.length && 
           grnItems[insertIndex].isAdditionalBatch && 
           grnItems[insertIndex].stockItemId === stockItemId) {
      insertIndex++;
    }
    
    const newItems = [...grnItems];
    newItems.splice(insertIndex, 0, newBatchItem);
    setGRNItems(newItems);
  };

  // Remove an additional batch row
  const removeBatchRow = (index: number) => {
    const newItems = [...grnItems];
    newItems.splice(index, 1);
    setGRNItems(newItems);
  };

  // Get total received quantity for an item (including all batches)
  const getTotalReceivedForItem = (stockItemId: number) => {
    return grnItems
      .filter(item => item.stockItemId === stockItemId)
      .reduce((sum, item) => sum + item.receivedQuantity, 0);
  };

  // Get the original ordered quantity for an item
  const getOrderedQuantityForItem = (stockItemId: number) => {
    const originalItem = grnItems.find(item => item.stockItemId === stockItemId && !item.isAdditionalBatch);
    return originalItem?.orderedQuantity || 0;
  };

  const getItemStatus = (stockItemId: number) => {
    const ordered = getOrderedQuantityForItem(stockItemId);
    const received = getTotalReceivedForItem(stockItemId);
    if (received === 0) return { label: "Not Received", variant: "destructive" as const, icon: AlertCircle };
    if (received < ordered) return { label: "Partial", variant: "secondary" as const, icon: AlertCircle };
    if (received === ordered) return { label: "Complete", variant: "default" as const, icon: CheckCircle };
    return { label: "Excess", variant: "outline" as const, icon: AlertCircle };
  };

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
      items: grnItems,
      notes,
      invoiceNumber,
      invoiceDate,
      invoiceUrl
    });
  };

  const getStockItemName = (stockItemId: number) => {
    const item = stockItems.find(s => s.id === stockItemId);
    return item ? item.name : 'Unknown Item';
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Goods Receipt Note - PO #{purchaseOrder.poNumber}</DialogTitle>
          <p className="text-sm text-muted-foreground">Generate GRN for received goods</p>
        </DialogHeader>

        <div className="mb-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Purchase Order Details</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Supplier</p>
                  <p className="font-medium">{purchaseOrder.supplier}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Order Date</p>
                  <p className="font-medium">{purchaseOrder.orderDate}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Total Amount</p>
                  <p className="font-medium">₹{formatPrecision(purchaseOrder.totalAmount)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* GRN Details Section */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg">GRN Details</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
            <div className="mt-4 space-y-2">
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
          </CardContent>
        </Card>

        <form onSubmit={handleSubmit} className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Goods Receipt</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-10 gap-3 p-3 bg-gray-50 dark:bg-gray-800 font-medium text-sm rounded-lg">
                  <div>Item</div>
                  <div className="text-center">Ordered</div>
                  <div className="text-center">Received</div>
                  <div>Batch No</div>
                  <div>Expiry Date</div>
                  <div>Cost/Tab (₹)</div>
                  <div>MRP/Tab (₹)</div>
                  <div className="text-center">Status</div>
                  <div>Remarks</div>
                  <div className="text-center">Batch</div>
                </div>

                {grnItems.map((grnItem, index) => {
                  const status = getItemStatus(grnItem.stockItemId);
                  const StatusIcon = status.icon;
                  const stockItem = stockItems.find(s => s.id === grnItem.stockItemId);
                  const masterCostPrice = stockItem?.unitPrice || 0;
                  const hasCostVariance = grnItem.costPrice !== undefined && 
                    grnItem.costPrice > 0 && 
                    masterCostPrice > 0 && 
                    Math.abs(grnItem.costPrice - masterCostPrice) > 0.00001;
                  const isAdditional = grnItem.isAdditionalBatch;
                  const totalReceived = getTotalReceivedForItem(grnItem.stockItemId);
                  
                  return (
                    <div 
                      key={index} 
                      className={`grid grid-cols-10 gap-3 p-3 border rounded-lg ${isAdditional ? 'ml-4 border-dashed bg-muted/30' : ''}`}
                    >
                      <div className="font-medium flex items-center">
                        {isAdditional ? (
                          <span className="text-muted-foreground text-sm italic">↳ Batch #{
                            grnItems.slice(0, index).filter(i => i.stockItemId === grnItem.stockItemId).length + 1
                          }</span>
                        ) : (
                          getStockItemName(grnItem.stockItemId)
                        )}
                      </div>
                      
                      <div className="text-center flex items-center justify-center">
                        {isAdditional ? (
                          <span className="text-muted-foreground">-</span>
                        ) : (
                          <div>
                            <span>{grnItem.orderedQuantity}</span>
                            {totalReceived !== grnItem.orderedQuantity && (
                              <p className="text-[10px] text-muted-foreground">
                                Total: {totalReceived}
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                      
                      <div>
                        <Input
                          type="number"
                          value={grnItem.receivedQuantity}
                          onChange={(e) => updateReceivedQuantity(index, e.target.value)}
                          min="0"
                          className="w-full"
                        />
                      </div>
                      
                      <div>
                        <Input
                          value={grnItem.batchNo || ""}
                          onChange={(e) => updateBatchNo(index, e.target.value)}
                          placeholder="Batch No"
                          className="w-full"
                        />
                      </div>
                      
                      <div>
                        <Input
                          type="date"
                          value={grnItem.expiryDate || ""}
                          onChange={(e) => updateExpiryDate(index, e.target.value)}
                          className="w-full"
                        />
                      </div>
                      
                      <div className="space-y-1">
                        <Input
                          type="number"
                          step="0.00001"
                          value={grnItem.costPrice || ""}
                          onChange={(e) => updateCostPrice(index, e.target.value)}
                          placeholder="0.00"
                          min="0"
                          className={`w-full ${hasCostVariance ? 'border-orange-500 bg-orange-50 dark:bg-orange-950/30' : ''}`}
                        />
                        {hasCostVariance && (
                          <p className="text-[10px] text-orange-600 dark:text-orange-400">
                            Master: ₹{formatPrecision(masterCostPrice)}
                          </p>
                        )}
                      </div>
                      
                      <div>
                        <Input
                          type="number"
                          step="0.00001"
                          value={grnItem.mrp || ""}
                          onChange={(e) => updateMRP(index, e.target.value)}
                          placeholder="0.00"
                          min="0"
                          className="w-full"
                        />
                      </div>
                      
                      <div className="flex items-center justify-center">
                        {!isAdditional && (
                          <Badge variant={status.variant} className="flex items-center gap-1 text-xs">
                            <StatusIcon className="h-3 w-3" />
                            {status.label}
                          </Badge>
                        )}
                      </div>
                      
                      <div>
                        <Input
                          value={grnItem.remarks || ""}
                          onChange={(e) => updateRemarks(index, e.target.value)}
                          placeholder="Remarks"
                          className="w-full"
                        />
                      </div>
                      
                      <div className="flex items-center justify-center gap-1">
                        {!isAdditional ? (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => addBatchRow(grnItem.stockItemId, index)}
                            className="h-8 px-2"
                            title="Add another batch"
                          >
                            <Plus className="h-4 w-4" />
                          </Button>
                        ) : (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeBatchRow(index)}
                            className="h-8 px-2 text-destructive hover:text-destructive"
                            title="Remove batch"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          <div className="space-y-2">
            <Label htmlFor="grnNotes">GRN Notes</Label>
            <Textarea
              id="grnNotes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Additional notes about the goods receipt"
              rows={3}
            />
          </div>

          <div className="flex justify-between">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => setShowPrintPreview(true)}
              className="flex items-center gap-2"
              disabled={!grnNumber}
            >
              <Printer className="h-4 w-4" />
              Preview GRN
            </Button>
            <div className="flex space-x-4">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit">
                Process GRN & Update Stock
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>

      {/* Printable GRN Preview */}
      {showPrintPreview && (
        <PrintableGRN
          grnNumber={grnNumber}
          grnDate={grnDate}
          invoiceNumber={invoiceNumber}
          invoiceDate={invoiceDate}
          purchaseOrder={purchaseOrder}
          grnItems={grnItems}
          stockItems={stockItems}
          notes={notes}
          onClose={() => setShowPrintPreview(false)}
        />
      )}
    </Dialog>
  );
}