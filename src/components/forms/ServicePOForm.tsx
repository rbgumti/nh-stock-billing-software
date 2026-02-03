import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Loader2 } from "lucide-react";
import { PurchaseOrder } from "@/hooks/usePurchaseOrderStore";
import { useSequentialNumbers } from "@/hooks/useSequentialNumbers";
import { useSupplierStore } from "@/hooks/useSupplierStore";

interface ServicePOFormProps {
  onClose: () => void;
  onSubmit: (po: PurchaseOrder) => void;
}

export function ServicePOForm({ onClose, onSubmit }: ServicePOFormProps) {
  const { getNextPurchaseOrderNumber } = useSequentialNumbers();
  const { suppliers } = useSupplierStore();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    supplierId: "",
    supplier: "",
    poDate: new Date().toISOString().split('T')[0],
    poNumber: "",
    serviceDescription: "",
    serviceAmount: "",
    notes: ""
  });

  // Auto-generate PO number on load
  useEffect(() => {
    const generatePONumber = async () => {
      const poNumber = await getNextPurchaseOrderNumber();
      setFormData(prev => ({ ...prev, poNumber }));
    };
    generatePONumber();
  }, []);

  // Update supplier name when supplierId changes
  useEffect(() => {
    if (formData.supplierId) {
      const supplier = suppliers.find(s => s.id.toString() === formData.supplierId);
      if (supplier) {
        setFormData(prev => ({ ...prev, supplier: supplier.name }));
      }
    }
  }, [formData.supplierId, suppliers]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.supplier || !formData.serviceDescription || !formData.serviceAmount) {
      return;
    }

    setIsSubmitting(true);
    try {
      const purchaseOrder: PurchaseOrder = {
        id: crypto.randomUUID(),
        poNumber: formData.poNumber,
        supplier: formData.supplier,
        orderDate: formData.poDate,
        expectedDelivery: formData.poDate,
        status: 'Pending',
        items: [], // No items for service PO
        totalAmount: parseFloat(formData.serviceAmount) || 0,
        notes: formData.notes,
        poType: 'Service',
        serviceDescription: formData.serviceDescription,
        serviceAmount: parseFloat(formData.serviceAmount) || 0
      };

      onSubmit(purchaseOrder);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Service Purchase Order</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="poNumber">PO Number *</Label>
              <Input
                id="poNumber"
                value={formData.poNumber}
                onChange={(e) => setFormData({ ...formData, poNumber: e.target.value })}
                placeholder="Auto-generated"
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

            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="supplier">Supplier / Vendor *</Label>
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
                  placeholder="Enter supplier/vendor name"
                  required
                />
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="serviceDescription">Service Description *</Label>
            <Textarea
              id="serviceDescription"
              value={formData.serviceDescription}
              onChange={(e) => setFormData({ ...formData, serviceDescription: e.target.value })}
              placeholder="Describe the service (e.g., Equipment maintenance, AMC renewal, Lab testing services...)"
              rows={4}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="serviceAmount">Service Amount (₹) *</Label>
            <Input
              id="serviceAmount"
              type="number"
              step="0.01"
              min="0"
              value={formData.serviceAmount}
              onChange={(e) => setFormData({ ...formData, serviceAmount: e.target.value })}
              placeholder="Enter total service amount"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Additional Notes</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Any additional notes or instructions"
              rows={3}
            />
          </div>

          <div className="flex justify-end space-x-4">
            <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || !formData.supplier || !formData.serviceDescription || !formData.serviceAmount}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                "Create Service PO"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
