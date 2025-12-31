import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, Plus, Package, AlertTriangle, FileText, Truck, Download, ChevronDown, Users, Pencil, Trash2, CreditCard, Calendar, DollarSign, ExternalLink, Pill, Droplets, Brain, BookOpen } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { AddStockItemForm } from "@/components/forms/AddStockItemForm";
import { PurchaseOrderForm } from "@/components/forms/PurchaseOrderForm";
import { EditPurchaseOrderForm } from "@/components/forms/EditPurchaseOrderForm";
import { GRNForm } from "@/components/forms/GRNForm";
import { EditGRNForm } from "@/components/forms/EditGRNForm";
import { SupplierForm } from "@/components/forms/SupplierForm";
import { SupplierPaymentForm } from "@/components/forms/SupplierPaymentForm";
import { StockLedger } from "@/components/StockLedger";
import { ParbPharmaPO } from "@/components/forms/ParbPharmaPO";
import { PurchaseOrder } from "@/hooks/usePurchaseOrderStore";
import { toast } from "@/hooks/use-toast";
import { useStockStore } from "@/hooks/useStockStore";
import { usePurchaseOrderStore } from "@/hooks/usePurchaseOrderStore";
import { useSupplierStore, Supplier } from "@/hooks/useSupplierStore";
import { useSupplierPaymentStore, SupplierPayment } from "@/hooks/useSupplierPaymentStore";
import jsPDF from "jspdf";
import { FloatingOrbs } from "@/components/ui/floating-orbs";
import { formatLocalISODate } from "@/lib/dateUtils";

export default function Stock() {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterCategory, setFilterCategory] = useState("all");
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [showPOForm, setShowPOForm] = useState(false);
  const [showGRNForm, setShowGRNForm] = useState(false);
  const [selectedPO, setSelectedPO] = useState<any>(null);
  const [editingPO, setEditingPO] = useState<PurchaseOrder | null>(null);
  const [editingGRN, setEditingGRN] = useState<PurchaseOrder | null>(null);
  const [showSupplierForm, setShowSupplierForm] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [supplierSearchTerm, setSupplierSearchTerm] = useState("");
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [editingPayment, setEditingPayment] = useState<SupplierPayment | null>(null);
  const [showLedgerItem, setShowLedgerItem] = useState<any>(null);
  const [showParbPharmaPO, setShowParbPharmaPO] = useState<PurchaseOrder | null>(null);
  const { stockItems, addStockItem, updateStockItem, subscribe } = useStockStore();
  const { purchaseOrders, addPurchaseOrder, updatePurchaseOrder, subscribe: subscribePO } = usePurchaseOrderStore();
  const { suppliers, addSupplier, updateSupplier, deleteSupplier, getSupplierByName } = useSupplierStore();
  const { payments, addPayment, updatePayment, deletePayment, getOutstandingPayments, getUpcomingPayments } = useSupplierPaymentStore();

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

  // Show payment reminder notifications on page load
  useEffect(() => {
    const today = new Date().toISOString().split('T')[0];
    
    // Check for overdue payments
    const overduePayments = payments.filter(p => 
      p.status !== 'Completed' && p.due_date && p.due_date < today
    );
    
    const overduePOs = purchaseOrders.filter(po => 
      po.paymentStatus !== 'Paid' && po.paymentDueDate && po.paymentDueDate < today
    );
    
    const totalOverdueCount = overduePayments.length + overduePOs.length;
    const totalOverdueAmount = overduePayments.reduce((sum, p) => sum + p.amount, 0) +
      overduePOs.reduce((sum, po) => sum + po.totalAmount, 0);

    // Check for upcoming payments (next 3 days)
    const threeDaysFromNow = new Date();
    threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);
    const upcomingDate = threeDaysFromNow.toISOString().split('T')[0];
    
    const upcomingPayments = payments.filter(p => 
      p.status !== 'Completed' && p.due_date && p.due_date >= today && p.due_date <= upcomingDate
    );
    
    const upcomingPOs = purchaseOrders.filter(po =>
      po.paymentStatus !== 'Paid' && po.paymentDueDate && 
      po.paymentDueDate >= today && po.paymentDueDate <= upcomingDate
    );
    
    const totalUpcomingCount = upcomingPayments.length + upcomingPOs.length;

    // Show notifications
    if (totalOverdueCount > 0) {
      toast({
        title: "⚠️ Overdue Payments",
        description: `You have ${totalOverdueCount} overdue payment(s) totaling ₹${totalOverdueAmount.toFixed(2)}`,
        variant: "destructive",
      });
    }
    
    if (totalUpcomingCount > 0) {
      toast({
        title: "📅 Upcoming Payments",
        description: `${totalUpcomingCount} payment(s) due in the next 3 days`,
      });
    }
  }, [payments.length, purchaseOrders.length]); // Only run when data loads

  const categories = ["all", "BNX", "TPN", "PSHY"];

  // Category color coding with icons
  const getCategoryStyle = (category: string) => {
    switch (category.toUpperCase()) {
      case 'BNX':
        return {
          bg: 'bg-blue-100 dark:bg-blue-900/30',
          text: 'text-blue-700 dark:text-blue-300',
          border: 'border-l-blue-500',
          badge: 'bg-blue-500 text-white',
          iconBg: 'bg-blue-500',
          Icon: Pill
        };
      case 'TPN':
        return {
          bg: 'bg-amber-100 dark:bg-amber-900/30',
          text: 'text-amber-700 dark:text-amber-300',
          border: 'border-l-amber-500',
          badge: 'bg-amber-500 text-white',
          iconBg: 'bg-amber-500',
          Icon: Droplets
        };
      case 'PSHY':
        return {
          bg: 'bg-purple-100 dark:bg-purple-900/30',
          text: 'text-purple-700 dark:text-purple-300',
          border: 'border-l-purple-500',
          badge: 'bg-purple-500 text-white',
          iconBg: 'bg-purple-500',
          Icon: Brain
        };
      default:
        return {
          bg: 'bg-gray-100 dark:bg-gray-800',
          text: 'text-gray-700 dark:text-gray-300',
          border: 'border-l-gray-500',
          badge: 'bg-gray-500 text-white',
          iconBg: 'bg-gray-500',
          Icon: Package
        };
    }
  };
  
  const filteredSuppliers = suppliers.filter(supplier =>
    supplier.name.toLowerCase().includes(supplierSearchTerm.toLowerCase()) ||
    supplier.phone?.toLowerCase().includes(supplierSearchTerm.toLowerCase()) ||
    supplier.email?.toLowerCase().includes(supplierSearchTerm.toLowerCase())
  );

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

  const handleGRN = (grnData: { grnNumber: string; purchaseOrderId: number; items: any[]; notes?: string; invoiceNumber?: string; invoiceDate?: string }) => {
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

      // Update PO status with GRN number, invoice number and date
      updatePurchaseOrder(po.id, {
        ...po,
        status: 'Received',
        grnDate: formatLocalISODate(),
        grnNumber: grnData.grnNumber,
        invoiceNumber: grnData.invoiceNumber,
        invoiceDate: grnData.invoiceDate
      });
    }
    
    setShowGRNForm(false);
    setSelectedPO(null);
    toast({
      title: "Success",
      description: `GRN ${grnData.grnNumber} has been processed successfully! Stock levels updated.`
    });
  };

  const handleEditPO = async (updatedPO: PurchaseOrder) => {
    try {
      await updatePurchaseOrder(updatedPO.id, updatedPO);
      setEditingPO(null);
      toast({
        title: "Success",
        description: "Purchase order has been updated successfully!"
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update purchase order",
        variant: "destructive"
      });
    }
  };

  const handleEditGRN = async (updatedPO: PurchaseOrder) => {
    try {
      await updatePurchaseOrder(updatedPO.id, updatedPO);
      setEditingGRN(null);
      toast({
        title: "Success",
        description: "GRN has been updated successfully!"
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update GRN",
        variant: "destructive"
      });
    }
  };

  const handleAddSupplier = async (supplierData: Omit<Supplier, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      await addSupplier(supplierData);
      toast({
        title: "Success",
        description: "Supplier has been added successfully!"
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to add supplier",
        variant: "destructive"
      });
      throw error;
    }
  };

  const handleEditSupplier = async (supplierData: Omit<Supplier, 'id' | 'created_at' | 'updated_at'>) => {
    if (!editingSupplier) return;
    try {
      await updateSupplier(editingSupplier.id, supplierData);
      setEditingSupplier(null);
      toast({
        title: "Success",
        description: "Supplier has been updated successfully!"
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update supplier",
        variant: "destructive"
      });
      throw error;
    }
  };

  const handleDeleteSupplier = async (id: number) => {
    if (!confirm("Are you sure you want to delete this supplier?")) return;
    try {
      await deleteSupplier(id);
      toast({
        title: "Success",
        description: "Supplier has been deleted successfully!"
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete supplier",
        variant: "destructive"
      });
    }
  };

  const handleAddPayment = async (paymentData: Omit<SupplierPayment, 'id' | 'created_at' | 'updated_at' | 'supplier_name' | 'po_number'>) => {
    try {
      await addPayment(paymentData);
      toast({
        title: "Success",
        description: "Payment has been recorded successfully!"
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to record payment",
        variant: "destructive"
      });
      throw error;
    }
  };

  const handleEditPayment = async (paymentData: Omit<SupplierPayment, 'id' | 'created_at' | 'updated_at' | 'supplier_name' | 'po_number'>) => {
    if (!editingPayment) return;
    try {
      await updatePayment(editingPayment.id, paymentData);
      setEditingPayment(null);
      toast({
        title: "Success",
        description: "Payment has been updated successfully!"
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update payment",
        variant: "destructive"
      });
      throw error;
    }
  };

  const handleDeletePayment = async (id: number) => {
    if (!confirm("Are you sure you want to delete this payment record?")) return;
    try {
      await deletePayment(id);
      toast({
        title: "Success",
        description: "Payment has been deleted successfully!"
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete payment",
        variant: "destructive"
      });
    }
  };

  const handleUpdatePOPayment = async (poId: number, paymentStatus: string) => {
    const po = purchaseOrders.find(p => p.id === poId);
    if (!po) return;
    
    try {
      await updatePurchaseOrder(poId, {
        ...po,
        paymentStatus: paymentStatus as 'Pending' | 'Partial' | 'Paid' | 'Overdue',
        paymentDate: paymentStatus === 'Paid' ? new Date().toISOString().split('T')[0] : po.paymentDate
      });
      toast({
        title: "Success",
        description: "Payment status updated!"
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update payment status",
        variant: "destructive"
      });
    }
  };

  const getPaymentStatusBadge = (status?: string) => {
    switch (status) {
      case 'Paid':
        return <Badge variant="default" className="bg-green-600">Paid</Badge>;
      case 'Partial':
        return <Badge variant="secondary" className="bg-yellow-500 text-white">Partial</Badge>;
      case 'Overdue':
        return <Badge variant="destructive">Overdue</Badge>;
      default:
        return <Badge variant="outline">Pending</Badge>;
    }
  };

  const outstandingPayments = getOutstandingPayments();
  const upcomingPayments = getUpcomingPayments();
  const totalOutstanding = payments.filter(p => p.status !== 'Completed').reduce((sum, p) => sum + p.amount, 0);
  const unpaidPOs = purchaseOrders.filter(po => po.paymentStatus !== 'Paid');

  const downloadPurchaseOrder = (po: any) => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 20;
    
    // Get supplier details
    const supplier = getSupplierByName(po.supplier);
    
    // Hospital Logo and Header
    const img = new Image();
    img.src = "/NH_LOGO.png";
    
    // Add logo placeholder (centered)
    try {
      doc.addImage(img, "PNG", pageWidth / 2 - 15, 10, 30, 30);
    } catch (e) {
      // Logo not available, continue without it
    }
    
    // Hospital Name
    doc.setTextColor(0, 51, 102); // Navy color
    doc.setFontSize(18);
    doc.setFont("helvetica", "bold");
    doc.text("NAVJEEVAN HOSPITAL", pageWidth / 2, 48, { align: "center" });
    
    // Tagline
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text("De-Addiction & Rehabilitation Centre", pageWidth / 2, 55, { align: "center" });
    
    // Address
    doc.setFontSize(9);
    doc.text("Near Bus Stand, Main Road, Mansa, Punjab - 151505", pageWidth / 2, 61, { align: "center" });
    doc.text("Phone: +91-9876543210 | Email: info@navjeevanhospital.com", pageWidth / 2, 67, { align: "center" });
    
    // Gold divider line
    doc.setDrawColor(212, 175, 55); // Gold color
    doc.setLineWidth(0.5);
    doc.line(margin, 72, pageWidth - margin, 72);
    
    // Purchase Order Title
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.text("PURCHASE ORDER", pageWidth / 2, 82, { align: "center" });
    
    // PO Details
    doc.setFontSize(11);
    doc.setFont("helvetica", "normal");
    doc.text(`PO Number: ${po.poNumber}`, margin, 95);
    doc.text(`Date: ${po.orderDate}`, pageWidth - margin, 95, { align: "right" });
    doc.text(`Supplier: ${po.supplier}`, margin, 103);
    doc.text(`Expected Delivery: ${po.expectedDelivery}`, pageWidth - margin, 103, { align: "right" });
    doc.text(`Status: ${po.status}`, margin, 111);
    
    // Items Table Header
    let yPos = 125;
    doc.setFillColor(240, 240, 240);
    doc.rect(margin, yPos - 5, pageWidth - (margin * 2), 8, 'F');
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text("Item Name", margin + 2, yPos);
    doc.text("Quantity", 100, yPos);
    doc.text("Unit Price", 130, yPos);
    doc.text("Total", 165, yPos);
    doc.rect(margin, yPos - 5, pageWidth - (margin * 2), 8);
    yPos += 8;
    
    // Items
    doc.setFont("helvetica", "normal");
    po.items.forEach((item: any, index: number) => {
      if (yPos > 200) {
        doc.addPage();
        yPos = 20;
      }
      doc.rect(margin, yPos - 5, pageWidth - (margin * 2), 8);
      doc.text(item.stockItemName.length > 35 ? item.stockItemName.substring(0, 33) + ".." : item.stockItemName, margin + 2, yPos);
      doc.text(item.quantity.toString(), 100, yPos);
      doc.text(`₹${item.unitPrice.toFixed(2)}`, 130, yPos);
      doc.text(`₹${item.totalPrice.toFixed(2)}`, 165, yPos);
      yPos += 8;
    });
    
    // Total
    yPos += 5;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text(`Total Amount: ₹${po.totalAmount.toFixed(2)}`, pageWidth - margin, yPos, { align: "right" });
    
    // Notes
    if (po.notes) {
      yPos += 15;
      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.text("Notes:", margin, yPos);
      doc.setFont("helvetica", "normal");
      yPos += 7;
      const splitNotes = doc.splitTextToSize(po.notes, pageWidth - (margin * 2));
      doc.text(splitNotes, margin, yPos);
      yPos += splitNotes.length * 5;
    }
    
    // Payment Terms & Bank Details Section
    if (supplier && (supplier.payment_terms || supplier.bank_name)) {
      yPos += 15;
      
      // Check if we need a new page
      if (yPos > 230) {
        doc.addPage();
        yPos = 20;
      }
      
      // Section title
      doc.setDrawColor(212, 175, 55);
      doc.setLineWidth(0.3);
      doc.line(margin, yPos, pageWidth - margin, yPos);
      yPos += 8;
      
      doc.setFontSize(11);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(0, 51, 102);
      doc.text("PAYMENT TERMS & BANK DETAILS", margin, yPos);
      yPos += 10;
      
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(9);
      
      // Two column layout
      const leftCol = margin;
      const rightCol = pageWidth / 2 + 10;
      
      // Payment Terms (left column)
      if (supplier.payment_terms) {
        doc.setFont("helvetica", "bold");
        doc.text("Payment Terms:", leftCol, yPos);
        doc.setFont("helvetica", "normal");
        yPos += 5;
        const splitTerms = doc.splitTextToSize(supplier.payment_terms, (pageWidth / 2) - margin - 10);
        doc.text(splitTerms, leftCol, yPos);
      }
      
      // Bank Details (right column)
      let bankY = yPos - 5;
      if (supplier.bank_name || supplier.account_number || supplier.ifsc_code || supplier.upi_id) {
        doc.setFont("helvetica", "bold");
        doc.text("Bank Details:", rightCol, bankY);
        doc.setFont("helvetica", "normal");
        bankY += 5;
        
        if (supplier.bank_name) {
          doc.text(`Bank: ${supplier.bank_name}`, rightCol, bankY);
          bankY += 4;
        }
        if (supplier.account_name) {
          doc.text(`Account Name: ${supplier.account_name}`, rightCol, bankY);
          bankY += 4;
        }
        if (supplier.account_number) {
          doc.text(`Account No: ${supplier.account_number}`, rightCol, bankY);
          bankY += 4;
        }
        if (supplier.ifsc_code) {
          doc.text(`IFSC: ${supplier.ifsc_code}`, rightCol, bankY);
          bankY += 4;
        }
        if (supplier.upi_id) {
          doc.text(`UPI: ${supplier.upi_id}`, rightCol, bankY);
        }
      }
    }
    
    // Footer
    const footerY = doc.internal.pageSize.getHeight() - 15;
    doc.setDrawColor(212, 175, 55);
    doc.setLineWidth(0.5);
    doc.line(margin, footerY - 5, pageWidth - margin, footerY - 5);
    doc.setFontSize(8);
    doc.setTextColor(0, 51, 102);
    doc.setFont("helvetica", "bold");
    doc.text("NAVJEEVAN HOSPITAL", pageWidth / 2, footerY, { align: "center" });
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100, 100, 100);
    doc.text("Thank you for your business", pageWidth / 2, footerY + 5, { align: "center" });
    
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
    <div className="p-6 space-y-6 relative">
      <FloatingOrbs />
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-purple via-cyan to-pink bg-clip-text text-transparent">
            Stock Management
          </h1>
          <p className="text-muted-foreground mt-2">Monitor and manage your inventory, purchase orders, and goods receipt</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setShowAddForm(true)} className="bg-gradient-to-r from-gold to-orange hover:shadow-glow-gold text-white font-semibold">
            <Plus className="h-4 w-4 mr-2" />
            Add Stock Item
          </Button>
          <Button onClick={() => setShowPOForm(true)} variant="outline" className="glass-subtle border-purple/20 hover:border-purple/40">
            <FileText className="h-4 w-4 mr-2" />
            Create PO
          </Button>
        </div>
      </div>

      {/* Tabs for different sections */}
      <Tabs defaultValue="stock" className="w-full">
        <TabsList className="grid w-full grid-cols-5 glass-strong border-0 p-1">
          <TabsTrigger value="stock" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple data-[state=active]:to-cyan data-[state=active]:text-white">Stock Items</TabsTrigger>
          <TabsTrigger value="purchase-orders" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-cyan data-[state=active]:to-teal data-[state=active]:text-white">Purchase Orders</TabsTrigger>
          <TabsTrigger value="grn" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-teal data-[state=active]:to-emerald data-[state=active]:text-white">Goods Receipt</TabsTrigger>
          <TabsTrigger value="payments" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-gold data-[state=active]:to-orange data-[state=active]:text-white">Payments</TabsTrigger>
          <TabsTrigger value="suppliers" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-pink data-[state=active]:to-purple data-[state=active]:text-white">Suppliers</TabsTrigger>
        </TabsList>

        <TabsContent value="stock" className="space-y-6">
          {/* Quick Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card className="glass-strong border-0 overflow-hidden relative group hover:shadow-glow transition-all duration-300">
              <div className="absolute inset-0 bg-gradient-to-br from-purple/10 via-transparent to-cyan/10 opacity-50 group-hover:opacity-100 transition-opacity" />
              <CardContent className="pt-6 relative">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Total Items</p>
                    <p className="text-2xl font-bold bg-gradient-to-r from-purple to-cyan bg-clip-text text-transparent">{stockItems.length}</p>
                  </div>
                  <div className="p-3 rounded-xl bg-gradient-to-r from-purple to-cyan">
                    <Package className="h-5 w-5 text-white" />
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card className="glass-strong border-0 overflow-hidden relative group hover:shadow-glow transition-all duration-300">
              <div className="absolute inset-0 bg-gradient-to-br from-orange/10 via-transparent to-pink/10 opacity-50 group-hover:opacity-100 transition-opacity" />
              <CardContent className="pt-6 relative">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Low Stock Items</p>
                    <p className="text-2xl font-bold bg-gradient-to-r from-orange to-pink bg-clip-text text-transparent">
                      {stockItems.filter(item => item.currentStock <= item.minimumStock).length}
                    </p>
                  </div>
                  <div className="p-3 rounded-xl bg-gradient-to-r from-orange to-pink">
                    <AlertTriangle className="h-5 w-5 text-white" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="glass-strong border-0 overflow-hidden relative group hover:shadow-glow transition-all duration-300">
              <div className="absolute inset-0 bg-gradient-to-br from-gold/10 via-transparent to-orange/10 opacity-50 group-hover:opacity-100 transition-opacity" />
              <CardContent className="pt-6 relative">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Total Value</p>
                    <p className="text-2xl font-bold bg-gradient-to-r from-gold to-orange bg-clip-text text-transparent">
                      ₹{stockItems.reduce((total, item) => total + (item.currentStock * item.unitPrice), 0).toFixed(2)}
                    </p>
                  </div>
                  <div className="p-3 rounded-xl bg-gradient-to-r from-gold to-orange">
                    <DollarSign className="h-5 w-5 text-white" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="glass-strong border-0 overflow-hidden relative group hover:shadow-glow transition-all duration-300">
              <div className="absolute inset-0 bg-gradient-to-br from-emerald/10 via-transparent to-teal/10 opacity-50 group-hover:opacity-100 transition-opacity" />
              <CardContent className="pt-6 relative">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Categories</p>
                    <p className="text-2xl font-bold bg-gradient-to-r from-emerald to-teal bg-clip-text text-transparent">{categories.length - 1}</p>
                  </div>
                  <div className="p-3 rounded-xl bg-gradient-to-r from-emerald to-teal">
                    <Package className="h-5 w-5 text-white" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Search and Filter */}
          <Card className="glass-strong border-0 overflow-hidden relative">
            <div className="absolute inset-0 bg-gradient-to-r from-purple/5 via-transparent to-cyan/5" />
            <CardContent className="pt-6 relative">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by name, category, or supplier..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 glass-subtle border-purple/20"
                  />
                </div>
                <div className="flex gap-2">
                  {categories.map((category) => (
                    <Button
                      key={category}
                      variant={filterCategory === category ? "default" : "outline"}
                      size="sm"
                      onClick={() => setFilterCategory(category)}
                      className={filterCategory === category 
                        ? "bg-gradient-to-r from-purple to-cyan text-white" 
                        : "glass-subtle border-purple/20 hover:border-purple/40"
                      }
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
        {filteredItems.map((item, index) => {
          const stockStatus = getStockStatus(item.currentStock, item.minimumStock);
          const categoryStyle = getCategoryStyle(item.category);
          const CategoryIcon = categoryStyle.Icon;
          
          return (
            <Card key={item.id} className={`glass-strong border-0 overflow-hidden relative group hover:shadow-glow transition-all duration-300 border-l-4 ${categoryStyle.border}`}>
              <div className={`absolute inset-0 bg-gradient-to-br ${
                index % 4 === 0 ? 'from-purple/5 via-transparent to-cyan/5' :
                index % 4 === 1 ? 'from-cyan/5 via-transparent to-teal/5' :
                index % 4 === 2 ? 'from-gold/5 via-transparent to-orange/5' :
                'from-pink/5 via-transparent to-purple/5'
              } opacity-50 group-hover:opacity-100 transition-opacity`} />
              <CardHeader className="relative">
                <div className="flex justify-between items-start">
                  <div className="flex items-start gap-3">
                    <div className={`p-2 rounded-lg bg-gradient-to-r ${
                      item.category === 'BNX' ? 'from-blue-500 to-cyan' :
                      item.category === 'TPN' ? 'from-amber-500 to-orange' :
                      item.category === 'PSHY' ? 'from-purple to-pink' :
                      'from-gray-500 to-gray-600'
                    }`}>
                      <CategoryIcon className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">{item.name}</CardTitle>
                      <Badge className={`${
                        item.category === 'BNX' ? 'bg-gradient-to-r from-blue-500 to-cyan text-white border-0' :
                        item.category === 'TPN' ? 'bg-gradient-to-r from-amber-500 to-orange text-white border-0' :
                        item.category === 'PSHY' ? 'bg-gradient-to-r from-purple to-pink text-white border-0' :
                        'bg-gray-500 text-white border-0'
                      }`}>
                        {item.category}
                      </Badge>
                    </div>
                  </div>
                  <Badge className={`${
                    stockStatus.label === 'Critical' ? 'bg-gradient-to-r from-destructive to-pink text-white border-0' :
                    stockStatus.label === 'Low Stock' ? 'bg-gradient-to-r from-orange to-gold text-white border-0' :
                    'bg-gradient-to-r from-emerald to-teal text-white border-0'
                  }`}>
                    {stockStatus.label}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="pt-4 relative">
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Current Stock</p>
                      <p className="font-semibold">{item.currentStock}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Minimum Stock</p>
                      <p className="font-semibold">{item.minimumStock}</p>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Unit Price</p>
                      <p className="font-semibold">₹{item.unitPrice.toFixed(2)}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Total Value</p>
                      <p className="font-semibold bg-gradient-to-r from-gold to-orange bg-clip-text text-transparent">₹{(item.currentStock * item.unitPrice).toFixed(2)}</p>
                    </div>
                  </div>

                  <div className="text-sm">
                    <p className="text-muted-foreground">Supplier</p>
                    <p className="font-medium">{item.supplier}</p>
                  </div>

                  {item.expiryDate !== "N/A" && (
                    <div className="text-sm">
                      <p className="text-muted-foreground">Expiry Date</p>
                      <p className="font-medium">{item.expiryDate}</p>
                    </div>
                  )}

                  <div className="flex flex-col gap-2 pt-2">
                    <Button 
                      size="sm" 
                      className="w-full bg-gradient-to-r from-purple to-cyan hover:shadow-glow text-white"
                      onClick={() => setShowLedgerItem(item)}
                    >
                      <BookOpen className="h-4 w-4 mr-2" />
                      Stock Ledger
                    </Button>
                    <div className="flex space-x-2">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="flex-1 glass-subtle border-cyan/20 hover:border-cyan/40"
                        onClick={() => setEditingItem(item)}
                      >
                        Edit
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="flex-1 glass-subtle border-gold/20 hover:border-gold/40"
                        onClick={() => setShowPOForm(true)}
                      >
                        Reorder
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
            })}
          </div>

          {filteredItems.length === 0 && (
            <Card className="glass-strong border-0 overflow-hidden relative">
              <div className="absolute inset-0 bg-gradient-to-br from-purple/5 via-transparent to-cyan/5" />
              <CardContent className="text-center py-12 relative">
                <div className="p-4 rounded-full bg-gradient-to-r from-purple/10 to-cyan/10 w-fit mx-auto mb-4">
                  <Package className="h-12 w-12 text-purple" />
                </div>
                <h3 className="text-lg font-medium mb-2">No items found</h3>
                <p className="text-muted-foreground mb-4">
                  {searchTerm || filterCategory !== "all" 
                    ? "Try adjusting your search or filter criteria" 
                    : "Get started by adding your first stock item"
                  }
                </p>
                <Button onClick={() => setShowAddForm(true)} className="bg-gradient-to-r from-purple to-cyan hover:shadow-glow text-white">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Stock Item
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="purchase-orders" className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold bg-gradient-to-r from-cyan to-teal bg-clip-text text-transparent">Purchase Orders</h2>
            <Button onClick={() => setShowPOForm(true)} className="bg-gradient-to-r from-cyan to-teal hover:shadow-glow text-white">
              <Plus className="h-4 w-4 mr-2" />
              Create Purchase Order
            </Button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
            {purchaseOrders.map((po, index) => (
              <Card key={po.id} className="glass-strong border-0 overflow-hidden relative group hover:shadow-glow transition-all duration-300">
                <div className={`absolute inset-0 bg-gradient-to-br ${
                  index % 4 === 0 ? 'from-cyan/5 via-transparent to-teal/5' :
                  index % 4 === 1 ? 'from-purple/5 via-transparent to-cyan/5' :
                  index % 4 === 2 ? 'from-gold/5 via-transparent to-orange/5' :
                  'from-pink/5 via-transparent to-purple/5'
                } opacity-50 group-hover:opacity-100 transition-opacity`} />
                <CardHeader className="relative">
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-lg bg-gradient-to-r from-cyan to-teal bg-clip-text text-transparent">PO #{po.poNumber}</CardTitle>
                      <p className="text-sm text-muted-foreground">{po.supplier}</p>
                    </div>
                    <Badge className={`${
                      po.status === 'Pending' ? 'bg-gradient-to-r from-orange to-gold text-white border-0' :
                      po.status === 'Received' ? 'bg-gradient-to-r from-emerald to-teal text-white border-0' :
                      'glass-subtle border-purple/20'
                    }`}>
                      {po.status}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="relative">
                  <div className="space-y-3">
                    <div className="text-sm">
                      <p className="text-muted-foreground">Order Date</p>
                      <p className="font-medium">{po.orderDate}</p>
                    </div>
                    <div className="text-sm">
                      <p className="text-muted-foreground">Expected Delivery</p>
                      <p className="font-medium">{po.expectedDelivery}</p>
                    </div>
                    <div className="text-sm">
                      <p className="text-muted-foreground">Total Amount</p>
                      <p className="font-semibold text-lg bg-gradient-to-r from-gold to-orange bg-clip-text text-transparent">₹{po.totalAmount.toFixed(2)}</p>
                    </div>
                    <div className="text-sm">
                      <p className="text-muted-foreground">Items</p>
                      <p className="font-medium">{po.items.length} item(s)</p>
                    </div>
                    <div className="flex gap-2 mt-4">
                      {po.status === 'Pending' && (
                        <>
                          <Button 
                            variant="outline"
                            size="sm"
                            className="glass-subtle border-purple/20 hover:border-purple/40"
                            onClick={() => setEditingPO(po)}
                          >
                            <Pencil className="h-4 w-4 mr-1 text-purple" />
                            Edit
                          </Button>
                          <Button 
                            className="flex-1 bg-gradient-to-r from-emerald to-teal hover:shadow-glow text-white" 
                            onClick={() => {
                              setSelectedPO(po);
                              setShowGRNForm(true);
                            }}
                          >
                            <Truck className="h-4 w-4 mr-2" />
                            Process GRN
                          </Button>
                        </>
                      )}
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="outline" className="glass-subtle border-purple/20 hover:border-purple/40">
                            <Download className="h-4 w-4 mr-1" />
                            <ChevronDown className="h-3 w-3" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="glass-strong border-0">
                          <DropdownMenuItem onClick={() => downloadPurchaseOrder(po)}>
                            <FileText className="h-4 w-4 mr-2" />
                            Standard PO
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => setShowParbPharmaPO(po)}>
                            <FileText className="h-4 w-4 mr-2" />
                            Parb Pharma Format
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {purchaseOrders.length === 0 && (
            <Card className="glass-strong border-0 overflow-hidden relative">
              <div className="absolute inset-0 bg-gradient-to-br from-cyan/5 via-transparent to-teal/5" />
              <CardContent className="text-center py-12 relative">
                <div className="p-4 rounded-full bg-gradient-to-r from-cyan/10 to-teal/10 w-fit mx-auto mb-4">
                  <FileText className="h-12 w-12 text-cyan" />
                </div>
                <h3 className="text-lg font-medium mb-2">No purchase orders</h3>
                <p className="text-muted-foreground mb-4">Create your first purchase order to start tracking orders</p>
                <Button onClick={() => setShowPOForm(true)} className="bg-gradient-to-r from-cyan to-teal hover:shadow-glow text-white">
                  <Plus className="h-4 w-4 mr-2" />
                  Create Purchase Order
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="grn" className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold bg-gradient-to-r from-teal to-emerald bg-clip-text text-transparent">Goods Receipt Notes</h2>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
            {purchaseOrders.filter(po => po.status === 'Received').map((po, index) => (
              <Card key={po.id} className="glass-strong border-0 overflow-hidden relative group hover:shadow-glow transition-all duration-300">
                <div className={`absolute inset-0 bg-gradient-to-br ${
                  index % 3 === 0 ? 'from-teal/5 via-transparent to-emerald/5' :
                  index % 3 === 1 ? 'from-emerald/5 via-transparent to-cyan/5' :
                  'from-cyan/5 via-transparent to-teal/5'
                } opacity-50 group-hover:opacity-100 transition-opacity`} />
                <CardHeader className="relative">
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-lg bg-gradient-to-r from-teal to-emerald bg-clip-text text-transparent">GRN - PO #{po.poNumber}</CardTitle>
                      <p className="text-sm text-muted-foreground">{po.supplier}</p>
                    </div>
                    <Badge className="bg-gradient-to-r from-emerald to-teal text-white border-0">Received</Badge>
                  </div>
                </CardHeader>
                <CardContent className="relative">
                  <div className="space-y-3">
                    <div className="text-sm">
                      <p className="text-muted-foreground">Order Date</p>
                      <p className="font-medium">{po.orderDate}</p>
                    </div>
                    <div className="text-sm">
                      <p className="text-muted-foreground">GRN Date</p>
                      <p className="font-medium">{po.grnDate}</p>
                    </div>
                    <div className="text-sm">
                      <p className="text-muted-foreground">Total Amount</p>
                      <p className="font-semibold text-lg bg-gradient-to-r from-gold to-orange bg-clip-text text-transparent">₹{po.totalAmount.toFixed(2)}</p>
                    </div>
                    <div className="text-sm">
                      <p className="text-muted-foreground">Items Received</p>
                      <p className="font-medium">{po.items.length} item(s)</p>
                    </div>
                    <div className="flex gap-2 mt-4">
                      <Button 
                        variant="outline" 
                        size="sm"
                        className="glass-subtle border-purple/20 hover:border-purple/40"
                        onClick={() => setEditingGRN(po)}
                      >
                        <Pencil className="h-4 w-4 mr-1 text-purple" />
                        Edit
                      </Button>
                      <Button 
                        variant="outline" 
                        className="flex-1 glass-subtle border-teal/20 hover:border-teal/40"
                        onClick={() => downloadGRN(po)}
                      >
                        <Download className="h-4 w-4 mr-2 text-teal" />
                        Download GRN
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {purchaseOrders.filter(po => po.status === 'Received').length === 0 && (
            <Card className="glass-strong border-0 overflow-hidden relative">
              <div className="absolute inset-0 bg-gradient-to-br from-teal/5 via-transparent to-emerald/5" />
              <CardContent className="text-center py-12 relative">
                <div className="p-4 rounded-full bg-gradient-to-r from-teal/10 to-emerald/10 w-fit mx-auto mb-4">
                  <Truck className="h-12 w-12 text-teal" />
                </div>
                <h3 className="text-lg font-medium mb-2">No goods receipts</h3>
                <p className="text-muted-foreground mb-4">Process GRN against purchase orders to see them here</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="payments" className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold bg-gradient-to-r from-gold to-orange bg-clip-text text-transparent">Supplier Payments</h2>
            <Button onClick={() => setShowPaymentForm(true)} className="bg-gradient-to-r from-gold to-orange hover:shadow-glow-gold text-white">
              <Plus className="h-4 w-4 mr-2" />
              Record Payment
            </Button>
          </div>

          {/* Payment Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card className="glass-strong border-0 overflow-hidden relative group hover:shadow-glow transition-all duration-300">
              <div className="absolute inset-0 bg-gradient-to-br from-pink/10 via-transparent to-destructive/10 opacity-50 group-hover:opacity-100 transition-opacity" />
              <CardContent className="pt-6 relative">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Total Outstanding</p>
                    <p className="text-2xl font-bold bg-gradient-to-r from-pink to-destructive bg-clip-text text-transparent">₹{totalOutstanding.toFixed(2)}</p>
                  </div>
                  <div className="p-3 rounded-xl bg-gradient-to-r from-pink to-destructive">
                    <DollarSign className="h-5 w-5 text-white" />
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card className="glass-strong border-0 overflow-hidden relative group hover:shadow-glow transition-all duration-300">
              <div className="absolute inset-0 bg-gradient-to-br from-orange/10 via-transparent to-gold/10 opacity-50 group-hover:opacity-100 transition-opacity" />
              <CardContent className="pt-6 relative">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Overdue Payments</p>
                    <p className="text-2xl font-bold bg-gradient-to-r from-orange to-gold bg-clip-text text-transparent">{outstandingPayments.length}</p>
                  </div>
                  <div className="p-3 rounded-xl bg-gradient-to-r from-orange to-gold">
                    <AlertTriangle className="h-5 w-5 text-white" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="glass-strong border-0 overflow-hidden relative group hover:shadow-glow transition-all duration-300">
              <div className="absolute inset-0 bg-gradient-to-br from-cyan/10 via-transparent to-purple/10 opacity-50 group-hover:opacity-100 transition-opacity" />
              <CardContent className="pt-6 relative">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Upcoming Payments</p>
                    <p className="text-2xl font-bold bg-gradient-to-r from-cyan to-purple bg-clip-text text-transparent">{upcomingPayments.length}</p>
                  </div>
                  <div className="p-3 rounded-xl bg-gradient-to-r from-cyan to-purple">
                    <Calendar className="h-5 w-5 text-white" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="glass-strong border-0 overflow-hidden relative group hover:shadow-glow transition-all duration-300">
              <div className="absolute inset-0 bg-gradient-to-br from-purple/10 via-transparent to-pink/10 opacity-50 group-hover:opacity-100 transition-opacity" />
              <CardContent className="pt-6 relative">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Unpaid POs</p>
                    <p className="text-2xl font-bold bg-gradient-to-r from-purple to-pink bg-clip-text text-transparent">{unpaidPOs.length}</p>
                  </div>
                  <div className="p-3 rounded-xl bg-gradient-to-r from-purple to-pink">
                    <FileText className="h-5 w-5 text-white" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Unpaid Purchase Orders */}
          <Card className="glass-strong border-0 overflow-hidden relative">
            <div className="absolute inset-0 bg-gradient-to-r from-gold/5 via-transparent to-orange/5" />
            <CardHeader className="relative">
              <CardTitle className="text-lg flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-gradient-to-r from-gold to-orange">
                  <CreditCard className="h-4 w-4 text-white" />
                </div>
                <span className="bg-gradient-to-r from-gold to-orange bg-clip-text text-transparent">Purchase Order Payment Status</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="relative">
              {unpaidPOs.length > 0 ? (
                <div className="space-y-3">
                  {unpaidPOs.map((po) => (
                    <div key={po.id} className="flex items-center justify-between p-3 glass-subtle rounded-lg">
                      <div className="flex-1">
                        <div className="flex items-center gap-3">
                          <span className="font-medium">PO #{po.poNumber}</span>
                          {getPaymentStatusBadge(po.paymentStatus)}
                        </div>
                        <p className="text-sm text-muted-foreground">{po.supplier}</p>
                      </div>
                      <div className="text-right mr-4">
                        <p className="font-semibold bg-gradient-to-r from-gold to-orange bg-clip-text text-transparent">₹{po.totalAmount.toFixed(2)}</p>
                        {po.paymentDueDate && (
                          <p className="text-xs text-muted-foreground">Due: {po.paymentDueDate}</p>
                        )}
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="outline" size="sm" className="glass-subtle border-gold/20 hover:border-gold/40">
                            Update Status
                            <ChevronDown className="h-3 w-3 ml-1" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="glass-strong border-0">
                          <DropdownMenuItem onClick={() => handleUpdatePOPayment(po.id, 'Pending')}>
                            Mark as Pending
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleUpdatePOPayment(po.id, 'Partial')}>
                            Mark as Partial
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleUpdatePOPayment(po.id, 'Paid')}>
                            Mark as Paid
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleUpdatePOPayment(po.id, 'Overdue')}>
                            Mark as Overdue
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-muted-foreground py-4">All purchase orders are paid</p>
              )}
            </CardContent>
          </Card>

          {/* Payment Records */}
          <Card className="glass-strong border-0 overflow-hidden relative">
            <div className="absolute inset-0 bg-gradient-to-r from-purple/5 via-transparent to-pink/5" />
            <CardHeader className="relative">
              <CardTitle className="text-lg bg-gradient-to-r from-purple to-pink bg-clip-text text-transparent">Payment Records</CardTitle>
            </CardHeader>
            <CardContent className="relative">
              {payments.length > 0 ? (
                <div className="space-y-3">
                  {payments.map((payment) => (
                    <div key={payment.id} className="p-4 glass-subtle rounded-lg">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-1">
                            <span className="font-medium">{payment.supplier_name}</span>
                            <Badge className={`${
                              payment.status === 'Completed' ? 'bg-gradient-to-r from-emerald to-teal text-white border-0' :
                              payment.status === 'Overdue' ? 'bg-gradient-to-r from-pink to-destructive text-white border-0' :
                              'glass-subtle border-purple/20'
                            }`}>
                              {payment.status}
                            </Badge>
                          </div>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm text-muted-foreground mt-2">
                            <div>
                              <span className="text-muted-foreground/60">Date:</span> {payment.payment_date}
                            </div>
                            {payment.payment_method && (
                              <div>
                                <span className="text-muted-foreground/60">Method:</span> {payment.payment_method}
                              </div>
                            )}
                            {payment.utr_number && (
                              <div>
                                <span className="text-muted-foreground/60">UTR:</span> {payment.utr_number}
                              </div>
                            )}
                            {payment.reference_number && (
                              <div>
                                <span className="text-muted-foreground/60">Ref:</span> {payment.reference_number}
                              </div>
                            )}
                            {payment.bank_reference && (
                              <div>
                                <span className="text-muted-foreground/60">Bank Ref:</span> {payment.bank_reference}
                              </div>
                            )}
                            {payment.po_number && (
                              <div>
                                <span className="text-muted-foreground/60">PO:</span> #{payment.po_number}
                              </div>
                            )}
                            {payment.due_date && (
                              <div>
                                <span className="text-muted-foreground/60">Due:</span> {payment.due_date}
                              </div>
                            )}
                          </div>
                          {payment.notes && (
                            <p className="text-xs text-muted-foreground mt-2 italic">{payment.notes}</p>
                          )}
                        </div>
                        <div className="text-right ml-4">
                          <p className="font-semibold text-lg bg-gradient-to-r from-gold to-orange bg-clip-text text-transparent">₹{payment.amount.toFixed(2)}</p>
                          <div className="flex items-center gap-1 mt-2">
                            {payment.receipt_url && (
                              <a 
                                href={payment.receipt_url} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 text-xs text-cyan hover:underline"
                              >
                                <ExternalLink className="h-3 w-3" />
                                Receipt
                              </a>
                            )}
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setEditingPayment(payment)}
                              className="hover:bg-purple/10"
                            >
                              <Pencil className="h-4 w-4 text-purple" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeletePayment(payment.id)}
                              className="hover:bg-destructive/10"
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <div className="p-4 rounded-full bg-gradient-to-r from-purple/10 to-pink/10 w-fit mx-auto mb-4">
                    <CreditCard className="h-12 w-12 text-purple" />
                  </div>
                  <h3 className="text-lg font-medium mb-2">No payment records</h3>
                  <p className="text-muted-foreground mb-4">Start tracking supplier payments</p>
                  <Button onClick={() => setShowPaymentForm(true)} className="bg-gradient-to-r from-purple to-pink hover:shadow-glow text-white">
                    <Plus className="h-4 w-4 mr-2" />
                    Record Payment
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="suppliers" className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold bg-gradient-to-r from-pink to-purple bg-clip-text text-transparent">Suppliers</h2>
            <Button onClick={() => setShowSupplierForm(true)} className="bg-gradient-to-r from-pink to-purple hover:shadow-glow text-white">
              <Plus className="h-4 w-4 mr-2" />
              Add Supplier
            </Button>
          </div>

          {/* Search */}
          <Card className="glass-strong border-0 overflow-hidden relative">
            <div className="absolute inset-0 bg-gradient-to-r from-pink/5 via-transparent to-purple/5" />
            <CardContent className="pt-6 relative">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search suppliers by name, phone, or email..."
                  value={supplierSearchTerm}
                  onChange={(e) => setSupplierSearchTerm(e.target.value)}
                  className="pl-10 glass-subtle border-pink/20"
                />
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
            {filteredSuppliers.map((supplier, index) => (
              <Card key={supplier.id} className="glass-strong border-0 overflow-hidden relative group hover:shadow-glow transition-all duration-300">
                <div className={`absolute inset-0 bg-gradient-to-br ${
                  index % 4 === 0 ? 'from-pink/5 via-transparent to-purple/5' :
                  index % 4 === 1 ? 'from-purple/5 via-transparent to-cyan/5' :
                  index % 4 === 2 ? 'from-cyan/5 via-transparent to-teal/5' :
                  'from-teal/5 via-transparent to-pink/5'
                } opacity-50 group-hover:opacity-100 transition-opacity`} />
                <CardHeader className="relative">
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-lg bg-gradient-to-r from-pink to-purple bg-clip-text text-transparent">{supplier.name}</CardTitle>
                      {supplier.phone && <p className="text-sm text-muted-foreground">{supplier.phone}</p>}
                    </div>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setEditingSupplier(supplier)}
                        className="hover:bg-purple/10"
                      >
                        <Pencil className="h-4 w-4 text-purple" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteSupplier(supplier.id)}
                        className="hover:bg-destructive/10"
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="relative">
                  <div className="space-y-3 text-sm">
                    {supplier.email && (
                      <div>
                        <p className="text-muted-foreground">Email</p>
                        <p className="font-medium">{supplier.email}</p>
                      </div>
                    )}
                    {supplier.address && (
                      <div>
                        <p className="text-muted-foreground">Address</p>
                        <p className="font-medium">{supplier.address}</p>
                      </div>
                    )}
                    {supplier.payment_terms && (
                      <div>
                        <p className="text-muted-foreground">Payment Terms</p>
                        <p className="font-medium">{supplier.payment_terms}</p>
                      </div>
                    )}
                    {supplier.bank_name && (
                      <div>
                        <p className="text-muted-foreground">Bank Details</p>
                        <p className="font-medium">
                          {supplier.bank_name}
                          {supplier.account_number && ` - ${supplier.account_number}`}
                        </p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {filteredSuppliers.length === 0 && (
            <Card className="glass-strong border-0 overflow-hidden relative">
              <div className="absolute inset-0 bg-gradient-to-br from-pink/5 via-transparent to-purple/5" />
              <CardContent className="text-center py-12 relative">
                <div className="p-4 rounded-full bg-gradient-to-r from-pink/10 to-purple/10 w-fit mx-auto mb-4">
                  <Users className="h-12 w-12 text-pink" />
                </div>
                <h3 className="text-lg font-medium mb-2">No suppliers found</h3>
                <p className="text-muted-foreground mb-4">
                  {supplierSearchTerm 
                    ? "Try adjusting your search criteria" 
                    : "Get started by adding your first supplier"
                  }
                </p>
                <Button onClick={() => setShowSupplierForm(true)} className="bg-gradient-to-r from-pink to-purple hover:shadow-glow text-white">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Supplier
                </Button>
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

      {editingPO && (
        <EditPurchaseOrderForm
          purchaseOrder={editingPO}
          onClose={() => setEditingPO(null)}
          onSubmit={handleEditPO}
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

      {editingGRN && (
        <EditGRNForm
          purchaseOrder={editingGRN}
          stockItems={stockItems}
          onClose={() => setEditingGRN(null)}
          onSubmit={handleEditGRN}
        />
      )}

      {showSupplierForm && (
        <SupplierForm
          onClose={() => setShowSupplierForm(false)}
          onSubmit={handleAddSupplier}
        />
      )}

      {editingSupplier && (
        <SupplierForm
          onClose={() => setEditingSupplier(null)}
          onSubmit={handleEditSupplier}
          initialData={editingSupplier}
        />
      )}

      {showPaymentForm && (
        <SupplierPaymentForm
          onClose={() => setShowPaymentForm(false)}
          onSubmit={handleAddPayment}
          suppliers={suppliers}
          purchaseOrders={purchaseOrders}
        />
      )}

      {editingPayment && (
        <SupplierPaymentForm
          onClose={() => setEditingPayment(null)}
          onSubmit={handleEditPayment}
          suppliers={suppliers}
          purchaseOrders={purchaseOrders}
          initialData={editingPayment}
        />
      )}

      {showLedgerItem && (
        <StockLedger
          stockItem={showLedgerItem}
          onClose={() => setShowLedgerItem(null)}
        />
      )}

      {showParbPharmaPO && (
        <ParbPharmaPO
          poNumber={showParbPharmaPO.poNumber}
          poDate={showParbPharmaPO.orderDate}
          items={showParbPharmaPO.items}
          stockItems={stockItems}
          onClose={() => setShowParbPharmaPO(null)}
        />
      )}
    </div>
  );
}
