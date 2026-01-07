import { useState, useEffect } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { X, Package, Unlock } from "lucide-react";
import { useSupplierStore } from "@/hooks/useSupplierStore";

interface AddStockItemFormProps {
  onClose: () => void;
  onSubmit: (stockItem: any) => void;
  initialData?: any;
  isEditing?: boolean;
}

export function AddStockItemForm({ onClose, onSubmit, initialData, isEditing = false }: AddStockItemFormProps) {
  const { suppliers } = useSupplierStore();
  const [vendorUnlocked, setVendorUnlocked] = useState(false);
  
  const [formData, setFormData] = useState({
    name: "",
    category: "",
    currentStock: "",
    minimumStock: "",
    unitPrice: "",
    mrp: "",
    supplier: "",
    expiryDate: "",
    batchNo: "",
    description: "",
    composition: "",
    packing: ""
  });

  // Populate form when editing
  useEffect(() => {
    if (isEditing && initialData) {
      setFormData({
        name: initialData.name || "",
        category: initialData.category || "",
        currentStock: initialData.currentStock?.toString() || "",
        minimumStock: initialData.minimumStock?.toString() || "",
        unitPrice: initialData.unitPrice?.toString() || "",
        mrp: initialData.mrp?.toString() || "",
        supplier: initialData.supplier || "",
        expiryDate: initialData.expiryDate === "N/A" ? "" : initialData.expiryDate || "",
        batchNo: initialData.batchNo || "",
        description: initialData.description || "",
        composition: initialData.composition || "",
        packing: initialData.packing || ""
      });
    }
  }, [isEditing, initialData]);

  const categories = ["BNX", "TPN", "PSHY", "BNX + PSHY", "TPN + PSHY"];

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const stockItem = {
      id: isEditing ? initialData.id : Date.now(),
      name: formData.name,
      category: formData.category,
      currentStock: parseInt(formData.currentStock) || 0,
      minimumStock: parseInt(formData.minimumStock) || 0,
      unitPrice: parseFloat(formData.unitPrice) || 0,
      mrp: parseFloat(formData.mrp) || undefined,
      supplier: formData.supplier,
      expiryDate: formData.expiryDate || "N/A",
      batchNo: formData.batchNo || `BATCH${Date.now()}`,
      status: "In Stock",
      composition: formData.composition || undefined,
      packing: formData.packing || undefined
    };

    onSubmit(stockItem);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <CardHeader className="bg-gradient-to-r from-purple/10 to-cyan/10 border-b">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-gradient-to-r from-purple to-cyan">
                <Package className="h-5 w-5 text-white" />
              </div>
              <CardTitle>{isEditing ? "Edit Item Master" : "Add New Item Master"}</CardTitle>
            </div>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="pt-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Item Details Section */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider border-b pb-2">
                Item Details
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="name">Item Name *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => handleInputChange("name", e.target.value)}
                    placeholder="Enter item name"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="category">Category *</Label>
                  <Select value={formData.category} onValueChange={(value) => handleInputChange("category", value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((category) => (
                        <SelectItem key={category} value={category}>
                          {category}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="composition">Composition</Label>
                  <Input
                    id="composition"
                    value={formData.composition}
                    onChange={(e) => handleInputChange("composition", e.target.value)}
                    placeholder="e.g., Paracetamol 500mg + Caffeine 65mg"
                  />
                </div>
                <div>
                  <Label htmlFor="packing">Packing Size</Label>
                  <Input
                    id="packing"
                    value={formData.packing}
                    onChange={(e) => handleInputChange("packing", e.target.value)}
                    placeholder="e.g., 10x10, 30 Tabs"
                  />
                </div>
              </div>
            </div>

            {/* Vendor & Pricing Section */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider border-b pb-2">
                Vendor & Pricing
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="supplier">Vendor/Supplier *</Label>
                  {isEditing && initialData?.supplier && !vendorUnlocked ? (
                    <>
                      <div className="flex gap-2">
                        <Input
                          id="supplier"
                          value={formData.supplier}
                          disabled
                          className="bg-muted flex-1"
                        />
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button type="button" variant="outline" size="icon" className="shrink-0">
                              <Unlock className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Change Vendor?</AlertDialogTitle>
                              <AlertDialogDescription>
                                This action requires admin confirmation. Changing the vendor for an item may affect existing purchase orders and stock records. Are you sure you want to proceed?
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction onClick={() => setVendorUnlocked(true)}>
                                Confirm & Unlock
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        Click unlock to change vendor (requires confirmation)
                      </p>
                    </>
                  ) : (
                    <>
                      <Select value={formData.supplier} onValueChange={(value) => handleInputChange("supplier", value)}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select vendor" />
                        </SelectTrigger>
                        <SelectContent>
                          {suppliers.length > 0 ? (
                            suppliers.map((supplier) => (
                              <SelectItem key={supplier.id} value={supplier.name}>
                                {supplier.name}
                              </SelectItem>
                            ))
                          ) : (
                            <SelectItem value="no-suppliers" disabled>
                              No suppliers found - Add suppliers first
                            </SelectItem>
                          )}
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-muted-foreground mt-1">
                        {vendorUnlocked ? "Vendor unlocked - select new vendor" : "Add suppliers in the Suppliers tab first"}
                      </p>
                    </>
                  )}
                </div>
                <div>
                  <Label htmlFor="batchNo">Batch Number</Label>
                  <Input
                    id="batchNo"
                    value={formData.batchNo}
                    onChange={(e) => handleInputChange("batchNo", e.target.value)}
                    placeholder="e.g., BATCH001"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="unitPrice">Rate/Tab - Cost Price (₹) *</Label>
                  <Input
                    id="unitPrice"
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.unitPrice}
                    onChange={(e) => handleInputChange("unitPrice", e.target.value)}
                    placeholder="Cost price per tablet"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="mrp">MRP/Tab - Selling Price (₹)</Label>
                  <Input
                    id="mrp"
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.mrp}
                    onChange={(e) => handleInputChange("mrp", e.target.value)}
                    placeholder="Selling price per tablet"
                  />
                </div>
              </div>
            </div>

            {/* Stock & Expiry Section */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider border-b pb-2">
                Stock & Expiry
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="currentStock">Current Stock *</Label>
                  <Input
                    id="currentStock"
                    type="number"
                    min="0"
                    value={formData.currentStock}
                    onChange={(e) => handleInputChange("currentStock", e.target.value)}
                    placeholder="0"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="minimumStock">Minimum Stock *</Label>
                  <Input
                    id="minimumStock"
                    type="number"
                    min="0"
                    value={formData.minimumStock}
                    onChange={(e) => handleInputChange("minimumStock", e.target.value)}
                    placeholder="0"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="expiryDate">Expiry Date</Label>
                  <Input
                    id="expiryDate"
                    type="date"
                    value={formData.expiryDate}
                    onChange={(e) => handleInputChange("expiryDate", e.target.value)}
                  />
                </div>
              </div>
            </div>

            {/* Description Section */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider border-b pb-2">
                Additional Information
              </h3>
              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => handleInputChange("description", e.target.value)}
                  placeholder="Optional description or notes..."
                  rows={3}
                />
              </div>
            </div>

            <div className="flex space-x-4 pt-4 border-t">
              <Button type="submit" className="flex-1 bg-gradient-to-r from-purple to-cyan hover:opacity-90">
                {isEditing ? "Update Item" : "Add Item"}
              </Button>
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
