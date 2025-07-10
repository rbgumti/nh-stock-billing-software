import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, Plus, Package, AlertTriangle } from "lucide-react";
import { AddStockItemForm } from "@/components/forms/AddStockItemForm";
import { toast } from "@/hooks/use-toast";

export default function Stock() {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterCategory, setFilterCategory] = useState("all");
  const [showAddForm, setShowAddForm] = useState(false);

  // Mock stock data
  const [stockItems, setStockItems] = useState([
    {
      id: 1,
      name: "Paracetamol 500mg",
      category: "Medication",
      currentStock: 12,
      minimumStock: 50,
      unitPrice: 15.50,
      supplier: "MedSupply Co.",
      expiryDate: "2024-12-15",
      status: "Low Stock"
    },
    {
      id: 2,
      name: "Disposable Syringes (10ml)",
      category: "Medical Supplies",
      currentStock: 8,
      minimumStock: 100,
      unitPrice: 8.25,
      supplier: "Healthcare Plus",
      expiryDate: "2025-06-30",
      status: "Low Stock"
    },
    {
      id: 3,
      name: "Blood Pressure Monitor",
      category: "Equipment",
      currentStock: 3,
      minimumStock: 5,
      unitPrice: 4250.00,
      supplier: "MedTech Solutions",
      expiryDate: "N/A",
      status: "In Stock"
    },
    {
      id: 4,
      name: "Bandages (Various Sizes)",
      category: "Medical Supplies",
      currentStock: 45,
      minimumStock: 30,
      unitPrice: 125.50,
      supplier: "MedSupply Co.",
      expiryDate: "2025-03-20",
      status: "In Stock"
    },
    {
      id: 5,
      name: "Insulin Pen",
      category: "Medication",
      currentStock: 25,
      minimumStock: 20,
      unitPrice: 600.00,
      supplier: "PharmaCorp",
      expiryDate: "2024-08-10",
      status: "In Stock"
    },
    {
      id: 6,
      name: "Digital Thermometer",
      category: "Equipment",
      currentStock: 15,
      minimumStock: 10,
      unitPrice: 350.00,
      supplier: "MedTech Solutions",
      expiryDate: "N/A",
      status: "In Stock"
    },
    {
      id: 7,
      name: "Antiseptic Solution (500ml)",
      category: "Medical Supplies",
      currentStock: 8,
      minimumStock: 25,
      unitPrice: 85.00,
      supplier: "Healthcare Plus",
      expiryDate: "2025-01-15",
      status: "Low Stock"
    },
    {
      id: 8,
      name: "Amoxicillin 250mg",
      category: "Medication",
      currentStock: 35,
      minimumStock: 40,
      unitPrice: 120.00,
      supplier: "PharmaCorp",
      expiryDate: "2024-11-30",
      status: "Low Stock"
    },
    {
      id: 9,
      name: "Surgical Gloves (Latex)",
      category: "Medical Supplies",
      currentStock: 150,
      minimumStock: 100,
      unitPrice: 12.50,
      supplier: "MedSupply Co.",
      expiryDate: "2026-05-20",
      status: "In Stock"
    },
    {
      id: 10,
      name: "Pulse Oximeter",
      category: "Equipment",
      currentStock: 6,
      minimumStock: 8,
      unitPrice: 2850.00,
      supplier: "MedTech Solutions",
      expiryDate: "N/A",
      status: "Low Stock"
    },
    {
      id: 11,
      name: "Ibuprofen 400mg",
      category: "Medication",
      currentStock: 60,
      minimumStock: 50,
      unitPrice: 22.00,
      supplier: "PharmaCorp",
      expiryDate: "2025-02-28",
      status: "In Stock"
    },
    {
      id: 12,
      name: "Cotton Swabs",
      category: "Medical Supplies",
      currentStock: 80,
      minimumStock: 60,
      unitPrice: 45.00,
      supplier: "Healthcare Plus",
      expiryDate: "2025-12-31",
      status: "In Stock"
    },
    {
      id: 13,
      name: "Stethoscope",
      category: "Equipment",
      currentStock: 4,
      minimumStock: 6,
      unitPrice: 1850.00,
      supplier: "MedTech Solutions",
      expiryDate: "N/A",
      status: "Low Stock"
    },
    {
      id: 14,
      name: "Aspirin 75mg",
      category: "Medication",
      currentStock: 2,
      minimumStock: 30,
      unitPrice: 18.00,
      supplier: "PharmaCorp",
      expiryDate: "2024-09-15",
      status: "Critical"
    },
    {
      id: 15,
      name: "Medical Masks (N95)",
      category: "Medical Supplies",
      currentStock: 25,
      minimumStock: 100,
      unitPrice: 35.00,
      supplier: "Healthcare Plus",
      expiryDate: "2025-08-10",
      status: "Low Stock"
    },
    {
      id: 16,
      name: "Glucose Test Strips",
      category: "Medical Supplies",
      currentStock: 40,
      minimumStock: 50,
      unitPrice: 450.00,
      supplier: "MedSupply Co.",
      expiryDate: "2024-10-30",
      status: "Low Stock"
    },
    {
      id: 17,
      name: "Wheelchair",
      category: "Equipment",
      currentStock: 2,
      minimumStock: 3,
      unitPrice: 8500.00,
      supplier: "MedTech Solutions",
      expiryDate: "N/A",
      status: "Low Stock"
    },
    {
      id: 18,
      name: "Cough Syrup (200ml)",
      category: "Medication",
      currentStock: 18,
      minimumStock: 25,
      unitPrice: 95.00,
      supplier: "PharmaCorp",
      expiryDate: "2024-12-20",
      status: "Low Stock"
    }
  ]);

  const categories = ["all", "Medication", "Medical Supplies", "Equipment"];

  const filteredItems = stockItems.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.supplier.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesCategory = filterCategory === "all" || item.category === filterCategory;
    
    return matchesSearch && matchesCategory;
  });

  const getStockStatus = (current: number, minimum: number) => {
    if (current <= minimum * 0.5) return { label: "Critical", variant: "destructive" as const };
    if (current <= minimum) return { label: "Low Stock", variant: "secondary" as const };
    return { label: "In Stock", variant: "default" as const };
  };

  const handleAddStock = () => {
    setShowAddForm(true);
  };

  const handleSaveStockItem = (newItem: any) => {
    setStockItems(prev => [...prev, newItem]);
    toast({
      title: "Success",
      description: `${newItem.name} has been added to stock successfully!`
    });
  };

  const handleEdit = (itemId: number) => {
    console.log('Edit item:', itemId);
    // Add edit functionality
  };

  const handleReorder = (itemId: number) => {
    console.log('Reorder item:', itemId);
    // Add reorder functionality
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Stock Management</h1>
          <p className="text-gray-600 mt-2">Monitor and manage your inventory</p>
        </div>
        <Button onClick={handleAddStock}>
          <Plus className="h-4 w-4 mr-2" />
          Add Stock Item
        </Button>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Items</p>
                <p className="text-2xl font-bold">{stockItems.length}</p>
              </div>
              <Package className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Low Stock Items</p>
                <p className="text-2xl font-bold text-red-600">
                  {stockItems.filter(item => item.currentStock <= item.minimumStock).length}
                </p>
              </div>
              <AlertTriangle className="h-8 w-8 text-red-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Value</p>
              <p className="text-2xl font-bold">
                ₹{stockItems.reduce((total, item) => total + (item.currentStock * item.unitPrice), 0).toFixed(2)}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div>
              <p className="text-sm font-medium text-gray-600">Categories</p>
              <p className="text-2xl font-bold">{categories.length - 1}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filter */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search by name, category, or supplier..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex gap-2">
              {categories.map((category) => (
                <Button
                  key={category}
                  variant={filterCategory === category ? "default" : "outline"}
                  size="sm"
                  onClick={() => setFilterCategory(category)}
                >
                  {category === "all" ? "All Categories" : category}
                </Button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stock Items */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {filteredItems.map((item) => {
          const stockStatus = getStockStatus(item.currentStock, item.minimumStock);
          
          return (
            <Card key={item.id} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-lg">{item.name}</CardTitle>
                    <p className="text-sm text-gray-500">{item.category}</p>
                  </div>
                  <Badge variant={stockStatus.variant}>
                    {stockStatus.label}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-gray-500">Current Stock</p>
                      <p className="font-semibold">{item.currentStock}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Minimum Stock</p>
                      <p className="font-semibold">{item.minimumStock}</p>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-gray-500">Unit Price</p>
                      <p className="font-semibold">₹{item.unitPrice.toFixed(2)}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Total Value</p>
                      <p className="font-semibold">₹{(item.currentStock * item.unitPrice).toFixed(2)}</p>
                    </div>
                  </div>

                  <div className="text-sm">
                    <p className="text-gray-500">Supplier</p>
                    <p className="font-medium">{item.supplier}</p>
                  </div>

                  {item.expiryDate !== "N/A" && (
                    <div className="text-sm">
                      <p className="text-gray-500">Expiry Date</p>
                      <p className="font-medium">{item.expiryDate}</p>
                    </div>
                  )}

                  <div className="flex space-x-2 pt-2">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="flex-1"
                      onClick={() => handleEdit(item.id)}
                    >
                      Edit
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="flex-1"
                      onClick={() => handleReorder(item.id)}
                    >
                      Reorder
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {filteredItems.length === 0 && (
        <Card>
          <CardContent className="text-center py-12">
            <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No items found</h3>
            <p className="text-gray-500 mb-4">
              {searchTerm || filterCategory !== "all" 
                ? "Try adjusting your search or filter criteria" 
                : "Get started by adding your first stock item"
              }
            </p>
            <Button onClick={handleAddStock}>
              <Plus className="h-4 w-4 mr-2" />
              Add Stock Item
            </Button>
          </CardContent>
        </Card>
      )}

      {showAddForm && (
        <AddStockItemForm
          onClose={() => setShowAddForm(false)}
          onSave={handleSaveStockItem}
        />
      )}
    </div>
  );
}
