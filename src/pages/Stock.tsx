
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, Plus, Package, AlertTriangle, FileText, Truck, Download } from "lucide-react";
import { AddStockItemForm } from "@/components/forms/AddStockItemForm";
import { PurchaseOrderForm } from "@/components/forms/PurchaseOrderForm";
import { GRNForm } from "@/components/forms/GRNForm";
import { toast } from "@/hooks/use-toast";
import { useStockStore } from "@/hooks/useStockStore";
import { usePurchaseOrderStore } from "@/hooks/usePurchaseOrderStore";
import jsPDF from "jspdf";

export default function Stock() {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterCategory, setFilterCategory] = useState("all");
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [showPOForm, setShowPOForm] = useState(false);
  const [showGRNForm, setShowGRNForm] = useState(false);
  const [selectedPO, setSelectedPO] = useState<any>(null);
  const { stockItems, addStockItem, updateStockItem, subscribe } = useStockStore();
  const { purchaseOrders, addPurchaseOrder, updatePurchaseOrder, subscribe: subscribePO } = usePurchaseOrderStore();

  // Force re-render when stock items and purchase orders are updated
  useEffect(() => {
    const unsubscribeStock = subscribe(() => {
      // This will trigger a re-render
    });
    const unsubscribePO = subscribePO(() => {
      // This will trigger a re-render
    });
    return () => {
      unsubscribeStock();
      unsubscribePO();
    };
  }, [subscribe, subscribePO]);

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

  const handleAddPurchaseOrder = (poData: any) => {
    addPurchaseOrder(poData);
    setShowPOForm(false);
    toast({
      title: "Success",
      description: "Purchase order has been created successfully!"
    });
  };

  const handleGRN = (grnData: { grnNumber: string; purchaseOrderId: number; items: any[]; notes?: string }) => {
    const po = purchaseOrders.find(p => p.id === grnData.purchaseOrderId);
    if (po) {
      // Update stock levels based on GRN
      grnData.items.forEach((grnItem: any) => {
        const stockItem = stockItems.find(s => s.id === grnItem.stockItemId);
        if (stockItem) {
          updateStockItem(stockItem.id, {
            ...stockItem,
            currentStock: stockItem.currentStock + grnItem.receivedQuantity
          });
        }
      });

      // Update PO status
      updatePurchaseOrder(po.id, {
        ...po,
        status: 'Received',
        grnDate: new Date().toISOString().split('T')[0]
      });
    }
    
    setShowGRNForm(false);
    setSelectedPO(null);
    toast({
      title: "Success",
      description: `GRN ${grnData.grnNumber} has been processed successfully! Stock levels updated.`
    });
  };

  const downloadPurchaseOrder = (po: any) => {
    const doc = new jsPDF();
    
    // Header
    doc.setFontSize(20);
    doc.text("PURCHASE ORDER", 105, 20, { align: "center" });
    
    // PO Details
    doc.setFontSize(12);
    doc.text(`PO Number: ${po.poNumber}`, 20, 40);
    doc.text(`Date: ${po.orderDate}`, 20, 50);
    doc.text(`Supplier: ${po.supplier}`, 20, 60);
    doc.text(`Expected Delivery: ${po.expectedDelivery}`, 20, 70);
    doc.text(`Status: ${po.status}`, 20, 80);
    
    // Items Table Header
    doc.setFontSize(10);
    doc.text("Item Name", 20, 95);
    doc.text("Quantity", 100, 95);
    doc.text("Unit Price", 130, 95);
    doc.text("Total", 165, 95);
    doc.line(20, 97, 190, 97);
    
    // Items
    let yPos = 105;
    po.items.forEach((item: any, index: number) => {
      if (yPos > 270) {
        doc.addPage();
        yPos = 20;
      }
      doc.text(item.stockItemName, 20, yPos);
      doc.text(item.quantity.toString(), 100, yPos);
      doc.text(`₹${item.unitPrice.toFixed(2)}`, 130, yPos);
      doc.text(`₹${item.totalPrice.toFixed(2)}`, 165, yPos);
      yPos += 10;
    });
    
    // Total
    doc.line(20, yPos, 190, yPos);
    yPos += 10;
    doc.setFontSize(12);
    doc.text(`Total Amount: ₹${po.totalAmount.toFixed(2)}`, 20, yPos);
    
    // Notes
    if (po.notes) {
      yPos += 15;
      doc.setFontSize(10);
      doc.text("Notes:", 20, yPos);
      yPos += 7;
      doc.text(po.notes, 20, yPos);
    }
    
    doc.save(`PO-${po.poNumber}.pdf`);
    toast({
      title: "Downloaded",
      description: `Purchase Order ${po.poNumber} has been downloaded.`
    });
  };

  const downloadGRN = (po: any) => {
    const doc = new jsPDF();
    
    // Header
    doc.setFontSize(20);
    doc.text("GOODS RECEIPT NOTE", 105, 20, { align: "center" });
    
    // GRN Details
    doc.setFontSize(12);
    doc.text(`PO Number: ${po.poNumber}`, 20, 40);
    doc.text(`Order Date: ${po.orderDate}`, 20, 50);
    doc.text(`GRN Date: ${po.grnDate}`, 20, 60);
    doc.text(`Supplier: ${po.supplier}`, 20, 70);
    
    // Items Table Header
    doc.setFontSize(10);
    doc.text("Item Name", 20, 85);
    doc.text("Quantity", 100, 85);
    doc.text("Unit Price", 130, 85);
    doc.text("Total", 165, 85);
    doc.line(20, 87, 190, 87);
    
    // Items
    let yPos = 95;
    po.items.forEach((item: any) => {
      if (yPos > 270) {
        doc.addPage();
        yPos = 20;
      }
      doc.text(item.stockItemName, 20, yPos);
      doc.text(item.quantity.toString(), 100, yPos);
      doc.text(`₹${item.unitPrice.toFixed(2)}`, 130, yPos);
      doc.text(`₹${item.totalPrice.toFixed(2)}`, 165, yPos);
      yPos += 10;
    });
    
    // Total
    doc.line(20, yPos, 190, yPos);
    yPos += 10;
    doc.setFontSize(12);
    doc.text(`Total Amount: ₹${po.totalAmount.toFixed(2)}`, 20, yPos);
    
    // Notes
    if (po.notes) {
      yPos += 15;
      doc.setFontSize(10);
      doc.text("Notes:", 20, yPos);
      yPos += 7;
      doc.text(po.notes, 20, yPos);
    }
    
    doc.save(`GRN-${po.poNumber}.pdf`);
    toast({
      title: "Downloaded",
      description: `GRN for PO ${po.poNumber} has been downloaded.`
    });
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-navy">Stock Management</h1>
          <p className="text-muted-foreground mt-2">Monitor and manage your inventory, purchase orders, and goods receipt</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setShowAddForm(true)} className="bg-gold hover:bg-gold/90 text-navy">
            <Plus className="h-4 w-4 mr-2" />
            Add Stock Item
          </Button>
          <Button onClick={() => setShowPOForm(true)} variant="outline">
            <FileText className="h-4 w-4 mr-2" />
            Create PO
          </Button>
        </div>
      </div>

      {/* Tabs for different sections */}
      <Tabs defaultValue="stock" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="stock">Stock Items</TabsTrigger>
          <TabsTrigger value="purchase-orders">Purchase Orders</TabsTrigger>
          <TabsTrigger value="grn">Goods Receipt</TabsTrigger>
        </TabsList>

        <TabsContent value="stock" className="space-y-6">
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
        </TabsContent>

        <TabsContent value="purchase-orders" className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold">Purchase Orders</h2>
            <Button onClick={() => setShowPOForm(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create Purchase Order
            </Button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
            {purchaseOrders.map((po) => (
              <Card key={po.id} className="hover:shadow-md transition-shadow">
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-lg">PO #{po.poNumber}</CardTitle>
                      <p className="text-sm text-gray-500">{po.supplier}</p>
                    </div>
                    <Badge variant={po.status === 'Pending' ? 'secondary' : po.status === 'Received' ? 'default' : 'outline'}>
                      {po.status}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="text-sm">
                      <p className="text-gray-500">Order Date</p>
                      <p className="font-medium">{po.orderDate}</p>
                    </div>
                    <div className="text-sm">
                      <p className="text-gray-500">Expected Delivery</p>
                      <p className="font-medium">{po.expectedDelivery}</p>
                    </div>
                    <div className="text-sm">
                      <p className="text-gray-500">Total Amount</p>
                      <p className="font-semibold text-lg">₹{po.totalAmount.toFixed(2)}</p>
                    </div>
                    <div className="text-sm">
                      <p className="text-gray-500">Items</p>
                      <p className="font-medium">{po.items.length} item(s)</p>
                    </div>
                    <div className="flex gap-2 mt-4">
                      {po.status === 'Pending' && (
                        <Button 
                          className="flex-1" 
                          onClick={() => {
                            setSelectedPO(po);
                            setShowGRNForm(true);
                          }}
                        >
                          <Truck className="h-4 w-4 mr-2" />
                          Process GRN
                        </Button>
                      )}
                      <Button 
                        variant="outline" 
                        onClick={() => downloadPurchaseOrder(po)}
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {purchaseOrders.length === 0 && (
            <Card>
              <CardContent className="text-center py-12">
                <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No purchase orders</h3>
                <p className="text-gray-500 mb-4">Create your first purchase order to start tracking orders</p>
                <Button onClick={() => setShowPOForm(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Purchase Order
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="grn" className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold">Goods Receipt Notes</h2>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
            {purchaseOrders.filter(po => po.status === 'Received').map((po) => (
              <Card key={po.id} className="hover:shadow-md transition-shadow">
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-lg">GRN - PO #{po.poNumber}</CardTitle>
                      <p className="text-sm text-gray-500">{po.supplier}</p>
                    </div>
                    <Badge variant="default">Received</Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="text-sm">
                      <p className="text-gray-500">Order Date</p>
                      <p className="font-medium">{po.orderDate}</p>
                    </div>
                    <div className="text-sm">
                      <p className="text-gray-500">GRN Date</p>
                      <p className="font-medium">{po.grnDate}</p>
                    </div>
                    <div className="text-sm">
                      <p className="text-gray-500">Total Amount</p>
                      <p className="font-semibold text-lg">₹{po.totalAmount.toFixed(2)}</p>
                    </div>
                    <div className="text-sm">
                      <p className="text-gray-500">Items Received</p>
                      <p className="font-medium">{po.items.length} item(s)</p>
                    </div>
                    <Button 
                      variant="outline" 
                      className="w-full mt-4"
                      onClick={() => downloadGRN(po)}
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Download GRN
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {purchaseOrders.filter(po => po.status === 'Received').length === 0 && (
            <Card>
              <CardContent className="text-center py-12">
                <Truck className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No goods receipts</h3>
                <p className="text-gray-500 mb-4">Process GRN against purchase orders to see them here</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

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

      {showPOForm && (
        <PurchaseOrderForm
          onClose={() => setShowPOForm(false)}
          onSubmit={handleAddPurchaseOrder}
          stockItems={stockItems}
        />
      )}

      {showGRNForm && selectedPO && (
        <GRNForm
          onClose={() => {
            setShowGRNForm(false);
            setSelectedPO(null);
          }}
          onSubmit={handleGRN}
          purchaseOrder={selectedPO}
          stockItems={stockItems}
        />
      )}
    </div>
  );
}
