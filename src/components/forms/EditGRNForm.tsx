import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, AlertCircle, Loader2, Plus, Trash2, Upload, FileText, X } from "lucide-react";
import { StockItem } from "@/hooks/useStockStore";
import { PurchaseOrder } from "@/hooks/usePurchaseOrderStore";
import { formatPrecision } from "@/lib/formatUtils";
import { supabase } from "@/integrations/supabase/client";
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
  isAdditionalBatch?: boolean;
  parentIndex?: number;
}

interface EditGRNFormProps {
  purchaseOrder: PurchaseOrder;
  stockItems: StockItem[];
  onClose: () => void;
  onSubmit: (updatedPO: PurchaseOrder) => void;
}

export function EditGRNForm({ purchaseOrder, stockItems, onClose, onSubmit }: EditGRNFormProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [grnNumber, setGrnNumber] = useState(purchaseOrder.grnNumber || "");
  const [invoiceNumber, setInvoiceNumber] = useState(purchaseOrder.invoiceNumber || "");
  const [invoiceDate, setInvoiceDate] = useState(purchaseOrder.invoiceDate || "");
  const [grnDate, setGrnDate] = useState(purchaseOrder.grnDate || new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState(purchaseOrder.notes || "");
  const [invoiceFile, setInvoiceFile] = useState<File | null>(null);
  const [existingInvoiceUrl, setExistingInvoiceUrl] = useState(purchaseOrder.invoiceUrl || "");
  const [uploading, setUploading] = useState(false);

  // Initialize GRN items from purchase order items
  const [grnItems, setGRNItems] = useState<GRNItem[]>(
    purchaseOrder.items.map(item => {
      // Find matching stock item to get current batch info
      const stockItem = stockItems.find(s => s.id === item.stockItemId);
      return {
        stockItemId: item.stockItemId,
        orderedQuantity: item.qtyInTabs || item.quantity, // Use tabs as primary quantity
        receivedQuantity: item.qtyInTabs || item.quantity, // Assume all received
        batchNo: stockItem?.batchNo || "",
        expiryDate: stockItem?.expiryDate || "",
        costPrice: stockItem?.unitPrice || item.unitPrice || 0, // Cost price from Item Master
        mrp: stockItem?.mrp || 0,
        remarks: ""
      };
    })
  );

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
      orderedQuantity: 0,
      receivedQuantity: 0,
      batchNo: "",
      expiryDate: "",
      costPrice: stockItem?.unitPrice || 0,
      mrp: stockItem?.mrp || 0,
      remarks: "",
      isAdditionalBatch: true,
      parentIndex
    };
    
    let insertIndex = parentIndex + 1;
    while (insertIndex < grnItems.length && 
           grnItems[insertIndex].isAdditionalBatch &&
           grnItems[insertIndex].parentIndex === parentIndex) {
      insertIndex++;
    }
    
    const newItems = [...grnItems];
    newItems.splice(insertIndex, 0, newBatchItem);
    setGRNItems(newItems);
  };

  const removeBatchRow = (index: number) => {
    const newItems = [...grnItems];
    newItems.splice(index, 1);
    setGRNItems(newItems);
  };

  // NOTE: compute totals/status per *PO line item* (not per stockItemId) to avoid
  // incorrect "double" totals when the same stockItemId appears multiple times in the PO.
  const getTotalReceivedForLine = (lineIndex: number) => {
    return grnItems.reduce((sum, item, idx) => {
      const belongsToLine =
        (!item.isAdditionalBatch && idx === lineIndex) ||
        (item.isAdditionalBatch && item.parentIndex === lineIndex);
      return belongsToLine ? sum + item.receivedQuantity : sum;
    }, 0);
  };

  const getOrderedQuantityForLine = (lineIndex: number) => {
    return grnItems[lineIndex]?.orderedQuantity || 0;
  };

  const getItemStatus = (lineIndex: number) => {
    const ordered = getOrderedQuantityForLine(lineIndex);
    const received = getTotalReceivedForLine(lineIndex);
    if (received === 0) return { label: "Not Received", variant: "destructive" as const, icon: AlertCircle };
    if (received < ordered) return { label: "Partial", variant: "secondary" as const, icon: AlertCircle };
    if (received === ordered) return { label: "Complete", variant: "default" as const, icon: CheckCircle };
    return { label: "Excess", variant: "outline" as const, icon: AlertCircle };
  };

  const getStockItemName = (stockItemId: number) => {
    const item = stockItems.find(s => s.id === stockItemId);
    return item ? item.name : 'Unknown Item';
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
      setExistingInvoiceUrl(""); // Clear existing when new file selected
    }
  };

  const removeInvoiceFile = () => {
    setInvoiceFile(null);
  };

  const removeExistingInvoice = () => {
    setExistingInvoiceUrl("");
  };

  const uploadInvoice = async (): Promise<string | null> => {
    if (!invoiceFile) return existingInvoiceUrl || null;
    
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

  const getSignedInvoiceUrl = async (filePath: string): Promise<string | null> => {
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
    
    setIsSubmitting(true);
    try {
      let invoiceUrl: string | undefined = existingInvoiceUrl || undefined;
      
      if (invoiceFile) {
        const uploadedPath = await uploadInvoice();
        if (uploadedPath) {
          invoiceUrl = uploadedPath;
        }
      }

      const updatedPO: PurchaseOrder = {
        ...purchaseOrder,
        grnNumber,
        grnDate,
        invoiceNumber,
        invoiceDate,
        notes,
        invoiceUrl
      };

      onSubmit(updatedPO);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit GRN - {purchaseOrder.grnNumber || purchaseOrder.poNumber}</DialogTitle>
          <p className="text-sm text-muted-foreground">Update GRN details</p>
        </DialogHeader>

        <div className="mb-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Purchase Order Details</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
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
              ) : existingInvoiceUrl ? (
                <div className="flex items-center gap-2 p-3 border rounded-md bg-muted/50">
                  <FileText className="h-5 w-5 text-muted-foreground" />
                  <span className="flex-1 text-sm truncate">Invoice uploaded</span>
                  <Button
                    type="button"
                    variant="link"
                    size="sm"
                    className="text-sm text-primary hover:underline p-0 h-auto"
                    onClick={async () => {
                      const url = await getSignedInvoiceUrl(existingInvoiceUrl);
                      if (url) {
                        window.open(url, '_blank', 'noopener,noreferrer');
                      } else {
                        toast({
                          title: "Error",
                          description: "Could not access invoice. Please try again.",
                          variant: "destructive"
                        });
                      }
                    }}
                  >
                    View
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={removeExistingInvoice}
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
              <CardTitle>Received Items</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-9 gap-3 p-3 bg-gray-50 dark:bg-gray-800 font-medium text-sm rounded-lg">
                  <div>Item</div>
                  <div className="text-center">Ordered</div>
                  <div className="text-center">Received</div>
                  <div>Batch No</div>
                  <div>Expiry</div>
                  <div>Cost/Tab</div>
                  <div>MRP/Tab</div>
                  <div className="text-center">Status</div>
                  <div className="text-center">Batch</div>
                </div>

                {grnItems.map((grnItem, index) => {
                  const lineIndex = grnItem.isAdditionalBatch ? (grnItem.parentIndex ?? index) : index;

                  const status = getItemStatus(lineIndex);
                  const StatusIcon = status.icon;
                  const stockItem = stockItems.find(s => s.id === grnItem.stockItemId);
                  const masterCostPrice = stockItem?.unitPrice || 0;
                  const hasCostVariance = grnItem.costPrice !== undefined && 
                    grnItem.costPrice > 0 && 
                    masterCostPrice > 0 && 
                    Math.abs(grnItem.costPrice - masterCostPrice) > 0.00001;
                  const isAdditional = grnItem.isAdditionalBatch;
                  const totalReceived = getTotalReceivedForLine(lineIndex);
                  
                  return (
                    <div 
                      key={index} 
                      className={`grid grid-cols-9 gap-3 p-3 border rounded-lg items-center ${isAdditional ? 'ml-4 border-dashed bg-muted/30' : ''}`}
                    >
                      <div className="font-medium text-sm">
                        {isAdditional ? (
                          <span className="text-muted-foreground italic">↳ Batch #{
                            2 + grnItems.slice(0, index).filter(i => i.isAdditionalBatch && i.parentIndex === (grnItem.parentIndex ?? -1)).length
                          }</span>
                        ) : (
                          getStockItemName(grnItem.stockItemId)
                        )}
                      </div>
                      
                      <div className="text-center">
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
                          placeholder="Batch"
                          className="w-full text-sm"
                        />
                      </div>
                      
                      <div>
                        <Input
                          type="date"
                          value={grnItem.expiryDate || ""}
                          onChange={(e) => updateExpiryDate(index, e.target.value)}
                          className="w-full text-sm"
                        />
                      </div>
                      
                      <div className="space-y-1">
                        <Input
                          type="number"
                          step="0.00001"
                          value={grnItem.costPrice || ""}
                          onChange={(e) => updateCostPrice(index, e.target.value)}
                          placeholder="0"
                          min="0"
                          className={`w-full text-sm ${hasCostVariance ? 'border-orange-500 bg-orange-50 dark:bg-orange-950/30' : ''}`}
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
                          placeholder="0"
                          min="0"
                          className="w-full text-sm"
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
                      
                      <div className="flex items-center justify-center">
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

          <div className="flex justify-end space-x-4">
            <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save Changes"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
