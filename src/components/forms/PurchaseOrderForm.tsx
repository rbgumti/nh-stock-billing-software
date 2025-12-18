import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Trash2, Loader2 } from "lucide-react";
import { StockItem } from "@/hooks/useStockStore";
import { PurchaseOrder, PurchaseOrderItem } from "@/hooks/usePurchaseOrderStore";
import { useSequentialNumbers } from "@/hooks/useSequentialNumbers";
import { useSupplierStore, Supplier } from "@/hooks/useSupplierStore";

interface PurchaseOrderFormProps {
  onClose: () => void;
  onSubmit: (po: PurchaseOrder) => void;
  stockItems: StockItem[];
}

export function PurchaseOrderForm({ onClose, onSubmit, stockItems }: PurchaseOrderFormProps) {
  const { getNextPurchaseOrderNumber } = useSequentialNumbers();
  const { suppliers, loading: suppliersLoading } = useSupplierStore();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);
  
  const [formData, setFormData] = useState({
    supplierId: "",
    supplier: "",
    expectedDelivery: "",
    notes: ""
  });

  const [items, setItems] = useState<PurchaseOrderItem[]>([]);
  const [currentItem, setCurrentItem] = useState({
    stockItemId: "",
    quantity: "",
    unitPrice: ""
  });

  // Update selected supplier when supplierId changes
  useEffect(() => {
    if (formData.supplierId) {
      const supplier = suppliers.find(s => s.id.toString() === formData.supplierId);
      setSelectedSupplier(supplier || null);
      if (supplier) {
        setFormData(prev => ({ ...prev, supplier: supplier.name }));
      }
    } else {
      setSelectedSupplier(null);
    }
  }, [formData.supplierId, suppliers]);

  const addItem = () => {
    if (!currentItem.stockItemId || !currentItem.quantity || !currentItem.unitPrice) return;

    const stockItem = stockItems.find(item => item.id === parseInt(currentItem.stockItemId));
    if (!stockItem) return;

    const quantity = parseInt(currentItem.quantity);
    const unitPrice = parseFloat(currentItem.unitPrice);

    const newItem: PurchaseOrderItem = {
      stockItemId: stockItem.id,
      stockItemName: stockItem.name,
      quantity,
      unitPrice,
      totalPrice: quantity * unitPrice
    };

    setItems([...items, newItem]);
    setCurrentItem({ stockItemId: "", quantity: "", unitPrice: "" });
  };

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const totalAmount = items.reduce((sum, item) => sum + item.totalPrice, 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.supplier || !formData.expectedDelivery || items.length === 0) {
      return;
    }

    setIsSubmitting(true);
    try {
      const poNumber = await getNextPurchaseOrderNumber();

      const purchaseOrder: PurchaseOrder = {
        id: Date.now(),
        poNumber,
        supplier: formData.supplier,
        orderDate: new Date().toISOString().split('T')[0],
        expectedDelivery: formData.expectedDelivery,
        status: 'Pending',
        items,
        totalAmount,
        notes: formData.notes
      };

      onSubmit(purchaseOrder);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Purchase Order</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="supplier">Supplier *</Label>
              {suppliers.length > 0 ? (
                <Select 
                  value={formData.supplierId} 
                  onValueChange={(value) => setFormData({ ...formData, supplierId: value })}
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
              ) : (
                <Input
                  id="supplier"
                  value={formData.supplier}
                  onChange={(e) => setFormData({ ...formData, supplier: e.target.value })}
                  placeholder="Enter supplier name"
                  required
                />
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="expectedDelivery">Expected Delivery Date *</Label>
              <Input
                id="expectedDelivery"
                type="date"
                value={formData.expectedDelivery}
                onChange={(e) => setFormData({ ...formData, expectedDelivery: e.target.value })}
                required
              />
            </div>
          </div>

          {/* Show supplier details if selected */}
          {selectedSupplier && (selectedSupplier.payment_terms || selectedSupplier.bank_name) && (
            <Card className="bg-muted/50">
              <CardContent className="pt-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  {selectedSupplier.payment_terms && (
                    <div>
                      <span className="font-medium text-muted-foreground">Payment Terms:</span>
                      <p className="mt-1">{selectedSupplier.payment_terms}</p>
                    </div>
                  )}
                  {selectedSupplier.bank_name && (
                    <div>
                      <span className="font-medium text-muted-foreground">Bank Details:</span>
                      <p className="mt-1">
                        {selectedSupplier.bank_name}
                        {selectedSupplier.account_number && ` - A/C: ${selectedSupplier.account_number}`}
                        {selectedSupplier.ifsc_code && ` (${selectedSupplier.ifsc_code})`}
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Additional notes or instructions"
              rows={3}
            />
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Add Items</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Label>Stock Item</Label>
                  <Select value={currentItem.stockItemId} onValueChange={(value) => 
                    setCurrentItem({ ...currentItem, stockItemId: value })
                  }>
                    <SelectTrigger>
                      <SelectValue placeholder="Select item" />
                    </SelectTrigger>
                    <SelectContent>
                      {stockItems.map((item) => (
                        <SelectItem key={item.id} value={item.id.toString()}>
                          {item.name} - {item.category}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Quantity</Label>
                  <Input
                    type="number"
                    value={currentItem.quantity}
                    onChange={(e) => setCurrentItem({ ...currentItem, quantity: e.target.value })}
                    placeholder="0"
                    min="1"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Unit Price (₹)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={currentItem.unitPrice}
                    onChange={(e) => setCurrentItem({ ...currentItem, unitPrice: e.target.value })}
                    placeholder="0.00"
                    min="0"
                  />
                </div>

                <div className="flex items-end">
                  <Button type="button" onClick={addItem} className="w-full">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Item
                  </Button>
                </div>
              </div>

              {items.length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-medium">Order Items</h4>
                  <div className="border rounded-lg">
                    <div className="grid grid-cols-5 gap-4 p-3 bg-muted/50 font-medium text-sm">
                      <div>Item</div>
                      <div>Quantity</div>
                      <div>Unit Price</div>
                      <div>Total</div>
                      <div>Action</div>
                    </div>
                    {items.map((item, index) => (
                      <div key={index} className="grid grid-cols-5 gap-4 p-3 border-t">
                        <div className="font-medium">{item.stockItemName}</div>
                        <div>{item.quantity}</div>
                        <div>₹{item.unitPrice.toFixed(2)}</div>
                        <div>₹{item.totalPrice.toFixed(2)}</div>
                        <div>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => removeItem(index)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                    <div className="p-3 border-t bg-muted/50">
                      <div className="flex justify-between font-bold">
                        <span>Total Amount:</span>
                        <span>₹{totalAmount.toFixed(2)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <div className="flex justify-end space-x-4">
            <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={items.length === 0 || isSubmitting || (!formData.supplier && !formData.supplierId)}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                "Create Purchase Order"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
