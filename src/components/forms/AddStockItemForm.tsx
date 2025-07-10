
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { X } from "lucide-react";

interface AddStockItemFormProps {
  onClose: () => void;
  onSave: (item: any) => void;
}

export function AddStockItemForm({ onClose, onSave }: AddStockItemFormProps) {
  const [formData, setFormData] = useState({
    name: "",
    category: "",
    currentStock: "",
    minimumStock: "",
    unitPrice: "",
    supplier: "",
    expiryDate: ""
  });

  const categories = ["Medication", "Medical Supplies", "Equipment"];
  const suppliers = ["MedSupply Co.", "Healthcare Plus", "MedTech Solutions", "PharmaCorp"];

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const newItem = {
      id: Date.now(), // Simple ID generation
      name: formData.name,
      category: formData.category,
      currentStock: parseInt(formData.currentStock) || 0,
      minimumStock: parseInt(formData.minimumStock) || 0,
      unitPrice: parseFloat(formData.unitPrice) || 0,
      supplier: formData.supplier,
      expiryDate: formData.expiryDate || "N/A",
      status: parseInt(formData.currentStock) <= parseInt(formData.minimumStock) ? "Low Stock" : "In Stock"
    };

    onSave(newItem);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>Add New Stock Item</CardTitle>
            <Button variant="ghost" size="icon" onClick={onClose}>
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

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="currentStock">Current Stock *</Label>
                <Input
                  id="currentStock"
                  type="number"
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
                  value={formData.minimumStock}
                  onChange={(e) => handleInputChange("minimumStock", e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="unitPrice">Unit Price (₹) *</Label>
                <Input
                  id="unitPrice"
                  type="number"
                  step="0.01"
                  value={formData.unitPrice}
                  onChange={(e) => handleInputChange("unitPrice", e.target.value)}
                  required
                />
              </div>
              <div>
                <Label htmlFor="supplier">Supplier *</Label>
                <Select value={formData.supplier} onValueChange={(value) => handleInputChange("supplier", value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select supplier" />
                  </SelectTrigger>
                  <SelectContent>
                    {suppliers.map((supplier) => (
                      <SelectItem key={supplier} value={supplier}>
                        {supplier}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
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

            <div className="flex space-x-2 pt-4">
              <Button type="submit" className="flex-1">
                Add Item
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
