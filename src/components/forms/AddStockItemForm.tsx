import { useState, useEffect } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { X } from "lucide-react";

interface AddStockItemFormProps {
  onClose: () => void;
  onSubmit: (stockItem: any) => void;
  initialData?: any;
  isEditing?: boolean;
}

export function AddStockItemForm({ onClose, onSubmit, initialData, isEditing = false }: AddStockItemFormProps) {
  const [formData, setFormData] = useState({
    name: "",
    category: "",
    currentStock: "",
    minimumStock: "",
    unitPrice: "",
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
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>{isEditing ? "Edit Stock Item" : "Add New Stock Item"}</CardTitle>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="name">Item Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => handleInputChange("name", e.target.value)}
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

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="currentStock">Current Stock *</Label>
                <Input
                  id="currentStock"
                  type="number"
                  min="0"
                  value={formData.currentStock}
                  onChange={(e) => handleInputChange("currentStock", e.target.value)}
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
                  required
                />
              </div>
              <div>
                <Label htmlFor="unitPrice">Unit Price *</Label>
                <Input
                  id="unitPrice"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.unitPrice}
                  onChange={(e) => handleInputChange("unitPrice", e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="supplier">Supplier</Label>
                <Input
                  id="supplier"
                  value={formData.supplier}
                  onChange={(e) => handleInputChange("supplier", e.target.value)}
                />
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
              <Label htmlFor="packing">Packing</Label>
              <Input
                id="packing"
                value={formData.packing}
                onChange={(e) => handleInputChange("packing", e.target.value)}
                placeholder="e.g., 10x10, 30 Tabs"
              />
            </div>

            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => handleInputChange("description", e.target.value)}
                placeholder="Optional description..."
              />
            </div>

            <div className="flex space-x-4 pt-4">
              <Button type="submit" className="flex-1">
                {isEditing ? "Update Stock Item" : "Add Stock Item"}
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