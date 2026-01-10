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
import { formatPrecision } from "@/lib/formatUtils";

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
    unitPrice: "",
    packSize: "",
    qtyInStrips: "",
    qtyInTabs: ""
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
    if (!currentItem.stockItemId || !currentItem.qtyInTabs) return;

    const stockItem = stockItems.find(item => item.id === parseInt(currentItem.stockItemId));
    if (!stockItem) return;

    const qtyInStrips = parseInt(currentItem.qtyInStrips) || 0;
    const qtyInTabs = parseInt(currentItem.qtyInTabs) || 0;
    const unitPrice = parseFloat(currentItem.unitPrice) || 0;
    const packSize = currentItem.packSize || stockItem.packing || "";

    const newItem: PurchaseOrderItem = {
      stockItemId: stockItem.id,
      stockItemName: stockItem.name,
      quantity: qtyInTabs, // Primary quantity is now tabs
      unitPrice,
      totalPrice: qtyInTabs * unitPrice, // Calculate based on tabs
      packSize,
      qtyInStrips,
      qtyInTabs
    };

    setItems([...items, newItem]);
    setCurrentItem({ stockItemId: "", quantity: "", unitPrice: "", packSize: "", qtyInStrips: "", qtyInTabs: "" });
  };

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const updateItemField = (index: number, field: keyof PurchaseOrderItem, value: string | number) => {
    const newItems = [...items];
    if (field === 'qtyInTabs') {
      const qtyInTabs = parseInt(value as string) || 0;
      newItems[index].qtyInTabs = qtyInTabs;
      newItems[index].quantity = qtyInTabs; // Primary quantity is tabs
      newItems[index].totalPrice = qtyInTabs * newItems[index].unitPrice;
    } else if (field === 'qtyInStrips') {
      newItems[index].qtyInStrips = parseInt(value as string) || 0;
    } else if (field === 'packSize') {
      newItems[index].packSize = value as string;
    } else if (field === 'unitPrice') {
      const unitPrice = parseFloat(value as string) || 0;
      newItems[index].unitPrice = unitPrice;
      newItems[index].totalPrice = (newItems[index].qtyInTabs || newItems[index].quantity) * unitPrice;
    }
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
                  <div className="border rounded-lg overflow-x-auto">
                    <div className="grid grid-cols-7 gap-3 p-3 bg-muted/50 font-medium text-sm min-w-[700px]">
                      <div>Item</div>
                      <div>Pack Size</div>
                      <div>Qty (Strips)</div>
                      <div>Qty (Tabs)</div>
                      <div>Cost/Tab</div>
                      <div>Total</div>
                      <div>Action</div>
                    </div>
                    {items.map((item, index) => (
                      <div key={index} className="grid grid-cols-7 gap-3 p-3 border-t items-center min-w-[700px]">
                        <div className="font-medium text-sm">{item.stockItemName}</div>
                        <div>
                          <Input
                            value={item.packSize || ''}
                            onChange={(e) => updateItemField(index, 'packSize', e.target.value)}
                            className="w-20"
                            placeholder="10×10"
                          />
                        </div>
                        <div>
                          <Input
                            type="number"
                            value={item.qtyInStrips || item.quantity}
                            onChange={(e) => updateItemField(index, 'qtyInStrips', e.target.value)}
                            min="0"
                            className="w-20"
                          />
                        </div>
                        <div>
                          <Input
                            type="number"
                            value={item.qtyInTabs || ''}
                            onChange={(e) => updateItemField(index, 'qtyInTabs', e.target.value)}
                            min="0"
                            className="w-20"
                          />
                        </div>
                        <div>
                          <Input
                            type="number"
                            step="0.01"
                            value={item.unitPrice}
                            onChange={(e) => updateItemField(index, 'unitPrice', e.target.value)}
                            min="0"
                            className="w-20"
                          />
                        </div>
                        <div className="text-sm">₹{formatPrecision(item.totalPrice)}</div>
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
                        <span>₹{formatPrecision(totalAmount)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Add New Item */}
              <div className="grid grid-cols-1 md:grid-cols-6 gap-4 pt-4 border-t">
                <div className="space-y-2 md:col-span-2">
                  <Label>Add Stock Item</Label>
                  <Select value={currentItem.stockItemId} onValueChange={(value) => {
                    const selectedItem = stockItems.find(item => item.id.toString() === value);
                    setCurrentItem({ 
                      ...currentItem, 
                      stockItemId: value,
                      unitPrice: selectedItem ? selectedItem.unitPrice.toString() : '',
                      packSize: selectedItem?.packing || ''
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
                  <Label>Pack Size</Label>
                  <Input
                    value={currentItem.packSize}
                    onChange={(e) => setCurrentItem({ ...currentItem, packSize: e.target.value })}
                    placeholder="e.g., 10×10"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Qty (Strips)</Label>
                  <Input
                    type="number"
                    value={currentItem.qtyInStrips}
                    onChange={(e) => setCurrentItem({ ...currentItem, qtyInStrips: e.target.value })}
                    placeholder="0"
                    min="0"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Qty (Tabs)</Label>
                  <Input
                    type="number"
                    value={currentItem.qtyInTabs}
                    onChange={(e) => setCurrentItem({ ...currentItem, qtyInTabs: e.target.value })}
                    placeholder="0"
                    min="0"
                  />
                </div>

                <div className="flex items-end">
                  <Button type="button" onClick={addItem} className="w-full">
                    <Plus className="h-4 w-4 mr-2" />
                    Add
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
