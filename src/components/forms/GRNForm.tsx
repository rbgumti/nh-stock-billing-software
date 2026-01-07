import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, AlertCircle, Printer } from "lucide-react";
import { StockItem } from "@/hooks/useStockStore";
import { PurchaseOrder } from "@/hooks/usePurchaseOrderStore";
import { supabase } from "@/integrations/supabase/client";
import { PrintableGRN } from "./PrintableGRN";

interface GRNItem {
  stockItemId: number;
  orderedQuantity: number;
  receivedQuantity: number;
  batchNo?: string;
  expiryDate?: string;
  mrp?: number;
  remarks?: string;
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
  }) => void;
  purchaseOrder: PurchaseOrder;
  stockItems: StockItem[];
}

export function GRNForm({ onClose, onSubmit, purchaseOrder, stockItems }: GRNFormProps) {
  const [grnNumber, setGrnNumber] = useState("");
  const [grnDate, setGrnDate] = useState(new Date().toISOString().split('T')[0]);
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().split('T')[0]);
  const [showPrintPreview, setShowPrintPreview] = useState(false);
  
  const [grnItems, setGRNItems] = useState<GRNItem[]>(
    purchaseOrder.items.map(item => ({
      stockItemId: item.stockItemId,
      orderedQuantity: item.quantity,
      receivedQuantity: item.quantity,
      batchNo: "",
      expiryDate: "",
      mrp: 0,
      remarks: ""
    }))
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

  const getItemStatus = (ordered: number, received: number) => {
    if (received === 0) return { label: "Not Received", variant: "destructive" as const, icon: AlertCircle };
    if (received < ordered) return { label: "Partial", variant: "secondary" as const, icon: AlertCircle };
    if (received === ordered) return { label: "Complete", variant: "default" as const, icon: CheckCircle };
    return { label: "Excess", variant: "outline" as const, icon: AlertCircle };
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    onSubmit({
      grnNumber,
      purchaseOrderId: purchaseOrder.id,
      items: grnItems,
      notes,
      invoiceNumber,
      invoiceDate
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
                  <p className="font-medium">₹{purchaseOrder.totalAmount.toFixed(2)}</p>
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
          </CardContent>
        </Card>

        <form onSubmit={handleSubmit} className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Goods Receipt</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-8 gap-4 p-3 bg-gray-50 font-medium text-sm rounded-lg">
                  <div>Item</div>
                  <div>Ordered Qty</div>
                  <div>Received Qty</div>
                  <div>Batch No</div>
                  <div>Expiry Date</div>
                  <div>MRP/Tab (₹)</div>
                  <div>Status</div>
                  <div>Remarks</div>
                </div>

                {grnItems.map((grnItem, index) => {
                  const status = getItemStatus(grnItem.orderedQuantity, grnItem.receivedQuantity);
                  const StatusIcon = status.icon;
                  
                  return (
                    <div key={index} className="grid grid-cols-8 gap-4 p-3 border rounded-lg">
                      <div className="font-medium">
                        {getStockItemName(grnItem.stockItemId)}
                      </div>
                      
                      <div className="text-center">
                        {grnItem.orderedQuantity}
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
                      
                      <div>
                        <Input
                          type="number"
                          step="0.01"
                          value={grnItem.mrp || ""}
                          onChange={(e) => updateMRP(index, e.target.value)}
                          placeholder="0.00"
                          min="0"
                          className="w-full"
                        />
                      </div>
                      
                      <div>
                        <Badge variant={status.variant} className="flex items-center gap-1">
                          <StatusIcon className="h-3 w-3" />
                          {status.label}
                        </Badge>
                      </div>
                      
                      <div>
                        <Input
                          value={grnItem.remarks || ""}
                          onChange={(e) => updateRemarks(index, e.target.value)}
                          placeholder="Remarks"
                          className="w-full"
                        />
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