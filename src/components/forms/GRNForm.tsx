import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, AlertCircle } from "lucide-react";
import { StockItem } from "@/hooks/useStockStore";
import { PurchaseOrder } from "@/hooks/usePurchaseOrderStore";

interface GRNItem {
  stockItemId: number;
  orderedQuantity: number;
  receivedQuantity: number;
  remarks?: string;
}

interface GRNFormProps {
  onClose: () => void;
  onSubmit: (grnData: { purchaseOrderId: number; items: GRNItem[]; notes?: string }) => void;
  purchaseOrder: PurchaseOrder;
  stockItems: StockItem[];
}

export function GRNForm({ onClose, onSubmit, purchaseOrder, stockItems }: GRNFormProps) {
  const [grnItems, setGRNItems] = useState<GRNItem[]>(
    purchaseOrder.items.map(item => ({
      stockItemId: item.stockItemId,
      orderedQuantity: item.quantity,
      receivedQuantity: item.quantity, // Default to ordered quantity
      remarks: ""
    }))
  );

  const [notes, setNotes] = useState("");

  const updateReceivedQuantity = (index: number, quantity: string) => {
    const newItems = [...grnItems];
    newItems[index].receivedQuantity = parseInt(quantity) || 0;
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
      purchaseOrderId: purchaseOrder.id,
      items: grnItems,
      notes
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
        </DialogHeader>

        <div className="mb-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Purchase Order Details</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <p className="text-gray-500">Supplier</p>
                  <p className="font-medium">{purchaseOrder.supplier}</p>
                </div>
                <div>
                  <p className="text-gray-500">Order Date</p>
                  <p className="font-medium">{purchaseOrder.orderDate}</p>
                </div>
                <div>
                  <p className="text-gray-500">Expected Delivery</p>
                  <p className="font-medium">{purchaseOrder.expectedDelivery}</p>
                </div>
                <div>
                  <p className="text-gray-500">Total Amount</p>
                  <p className="font-medium">₹{purchaseOrder.totalAmount.toFixed(2)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Goods Receipt</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-6 gap-4 p-3 bg-gray-50 font-medium text-sm rounded-lg">
                  <div>Item</div>
                  <div>Ordered Qty</div>
                  <div>Received Qty</div>
                  <div>Status</div>
                  <div>Remarks</div>
                  <div></div>
                </div>

                {grnItems.map((grnItem, index) => {
                  const status = getItemStatus(grnItem.orderedQuantity, grnItem.receivedQuantity);
                  const StatusIcon = status.icon;
                  
                  return (
                    <div key={index} className="grid grid-cols-6 gap-4 p-3 border rounded-lg">
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
                      
                      <div></div>
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
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit">
              Process GRN & Update Stock
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}