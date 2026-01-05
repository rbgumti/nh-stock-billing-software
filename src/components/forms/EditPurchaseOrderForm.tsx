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
import { useSupplierStore, Supplier } from "@/hooks/useSupplierStore";

interface EditPurchaseOrderFormProps {
  purchaseOrder: PurchaseOrder;
  onClose: () => void;
  onSubmit: (po: PurchaseOrder) => void;
  stockItems: StockItem[];
}

export function EditPurchaseOrderForm({ purchaseOrder, onClose, onSubmit, stockItems }: EditPurchaseOrderFormProps) {
  const { suppliers } = useSupplierStore();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);
  
  const [formData, setFormData] = useState({
    supplierId: "",
    supplier: purchaseOrder.supplier,
    poDate: purchaseOrder.orderDate,
    poNumber: purchaseOrder.poNumber,
    expectedDelivery: purchaseOrder.expectedDelivery,
    notes: purchaseOrder.notes || ""
  });

  const [items, setItems] = useState<PurchaseOrderItem[]>(purchaseOrder.items);
  const [currentItem, setCurrentItem] = useState({
    stockItemId: "",
    quantity: "",
    unitPrice: ""
  });

  // Find supplier ID from name on load
  useEffect(() => {
    const supplier = suppliers.find(s => s.name === purchaseOrder.supplier);
    if (supplier) {
      setFormData(prev => ({ ...prev, supplierId: supplier.id.toString() }));
      setSelectedSupplier(supplier);
    }
  }, [suppliers, purchaseOrder.supplier]);

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

  const updateItemQuantity = (index: number, quantity: string) => {
    const newItems = [...items];
    const qty = parseInt(quantity) || 0;
    newItems[index].quantity = qty;
    newItems[index].totalPrice = qty * newItems[index].unitPrice;
    setItems(newItems);
  };

  const updateItemUnitPrice = (index: number, price: string) => {
    const newItems = [...items];
    const unitPrice = parseFloat(price) || 0;
    newItems[index].unitPrice = unitPrice;
    newItems[index].totalPrice = newItems[index].quantity * unitPrice;
    setItems(newItems);
  };

  const totalAmount = items.reduce((sum, item) => sum + item.totalPrice, 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.supplier || items.length === 0) {
      return;
    }

    setIsSubmitting(true);
    try {
      const updatedPO: PurchaseOrder = {
        ...purchaseOrder,
        poNumber: formData.poNumber,
        supplier: formData.supplier,
        orderDate: formData.poDate,
        expectedDelivery: formData.poDate, // Use order date as default
        items,
        totalAmount,
        notes: formData.notes
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
          <DialogTitle>Edit Purchase Order - {purchaseOrder.poNumber}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label htmlFor="poNumber">PO Number *</Label>
              <Input
                id="poNumber"
                value={formData.poNumber}
                onChange={(e) => setFormData({ ...formData, poNumber: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="poDate">PO Date *</Label>
              <Input
                id="poDate"
                type="date"
                value={formData.poDate}
                onChange={(e) => setFormData({ ...formData, poDate: e.target.value })}
                required
              />
            </div>

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
              <CardTitle>Order Items</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Existing Items */}
              {items.length > 0 && (
                <div className="space-y-2">
                  <div className="border rounded-lg">
                    <div className="grid grid-cols-5 gap-4 p-3 bg-muted/50 font-medium text-sm">
                      <div>Item</div>
                      <div>Quantity</div>
                      <div>Unit Price</div>
                      <div>Total</div>
                      <div>Action</div>
                    </div>
                    {items.map((item, index) => (
                      <div key={index} className="grid grid-cols-5 gap-4 p-3 border-t items-center">
                        <div className="font-medium">{item.stockItemName}</div>
                        <div>
                          <Input
                            type="number"
                            value={item.quantity}
                            onChange={(e) => updateItemQuantity(index, e.target.value)}
                            min="1"
                            className="w-24"
                          />
                        </div>
                        <div>
                          <Input
                            type="number"
                            step="0.01"
                            value={item.unitPrice}
                            onChange={(e) => updateItemUnitPrice(index, e.target.value)}
                            min="0"
                            className="w-24"
                          />
                        </div>
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

              {/* Add New Item */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pt-4 border-t">
                <div className="space-y-2">
                  <Label>Add Stock Item</Label>
                  <Select value={currentItem.stockItemId} onValueChange={(value) => {
                    const selectedItem = stockItems.find(item => item.id.toString() === value);
                    setCurrentItem({ 
                      ...currentItem, 
                      stockItemId: value,
                      unitPrice: selectedItem ? selectedItem.unitPrice.toString() : ''
                    });
                  }}>
                    <SelectTrigger>
                      <SelectValue placeholder={formData.supplier ? "Select item" : "Select supplier first"} />
                    </SelectTrigger>
                    <SelectContent>
                      {stockItems
                        .filter(item => !formData.supplier || item.supplier === formData.supplier)
                        .map((item) => (
                          <SelectItem key={item.id} value={item.id.toString()}>
                            {item.name} - {item.category}
                          </SelectItem>
                        ))}
                      {formData.supplier && stockItems.filter(item => item.supplier === formData.supplier).length === 0 && (
                        <SelectItem value="no-items" disabled>
                          No items found for this supplier
                        </SelectItem>
                      )}
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
                  <Label>Cost Price (₹)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={currentItem.unitPrice}
                    onChange={(e) => setCurrentItem({ ...currentItem, unitPrice: e.target.value })}
                    placeholder="Auto-loaded from item"
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
            </CardContent>
          </Card>

          <div className="flex justify-end space-x-4">
            <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={items.length === 0 || isSubmitting || (!formData.supplier && !formData.supplierId) || !formData.poNumber}>
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
