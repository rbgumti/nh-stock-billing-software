
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, Plus, Package, AlertTriangle } from "lucide-react";
import { AddStockItemForm } from "@/components/forms/AddStockItemForm";
import { toast } from "@/hooks/use-toast";
import { useStockStore } from "@/hooks/useStockStore";

export default function Stock() {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterCategory, setFilterCategory] = useState("all");
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const { stockItems, addStockItem, updateStockItem, subscribe } = useStockStore();

  // Force re-render when stock items are updated
  useEffect(() => {
    const unsubscribe = subscribe(() => {
      // This will trigger a re-render
    });
    return unsubscribe;
  }, [subscribe]);

  const categories = ["all", "Medication", "Medical Supplies", "Equipment"];

  const filteredItems = stockItems.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.supplier.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesCategory = filterCategory === "all" || item.category === filterCategory;
    
    return matchesSearch && matchesCategory;
  });

  const handleAddStockItem = (newItem: any) => {
    addStockItem(newItem);
    toast({
      title: "Success",
      description: "Stock item has been added successfully!"
    });
  };

  const handleEditStockItem = (updatedItem: any) => {
    updateStockItem(updatedItem.id, updatedItem);
    setEditingItem(null);
    toast({
      title: "Success",
      description: "Stock item has been updated successfully!"
    });
  };

  const getStockStatus = (current: number, minimum: number) => {
    if (current <= minimum * 0.5) return { label: "Critical", variant: "destructive" as const };
    if (current <= minimum) return { label: "Low Stock", variant: "secondary" as const };
    return { label: "In Stock", variant: "default" as const };
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Stock Management</h1>
          <p className="text-gray-600 mt-2">Monitor and manage your inventory</p>
        </div>
        <Button onClick={() => setShowAddForm(true)}>
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
                      onClick={() => setEditingItem(item)}
                    >
                      Edit
                    </Button>
                    <Button variant="outline" size="sm" className="flex-1">
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
            <Button onClick={() => setShowAddForm(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Stock Item
            </Button>
          </CardContent>
        </Card>
      )}

      {showAddForm && (
        <AddStockItemForm
          onClose={() => setShowAddForm(false)}
          onSubmit={handleAddStockItem}
        />
      )}

      {editingItem && (
        <AddStockItemForm
          onClose={() => setEditingItem(null)}
          onSubmit={handleEditStockItem}
          initialData={editingItem}
          isEditing={true}
        />
      )}
    </div>
  );
}
