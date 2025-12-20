import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, Plus, Package, AlertTriangle, FileText, Truck, Download, ChevronDown, Users, Pencil, Trash2, CreditCard, Calendar, DollarSign } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { AddStockItemForm } from "@/components/forms/AddStockItemForm";
import { PurchaseOrderForm } from "@/components/forms/PurchaseOrderForm";
import { GRNForm } from "@/components/forms/GRNForm";
import { SupplierForm } from "@/components/forms/SupplierForm";
import { SupplierPaymentForm } from "@/components/forms/SupplierPaymentForm";
import { toast } from "@/hooks/use-toast";
import { useStockStore } from "@/hooks/useStockStore";
import { usePurchaseOrderStore } from "@/hooks/usePurchaseOrderStore";
import { useSupplierStore, Supplier } from "@/hooks/useSupplierStore";
import { useSupplierPaymentStore, SupplierPayment } from "@/hooks/useSupplierPaymentStore";
import jsPDF from "jspdf";
import { FloatingOrbs } from "@/components/ui/floating-orbs";

export default function Stock() {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterCategory, setFilterCategory] = useState("all");
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [showPOForm, setShowPOForm] = useState(false);
  const [showGRNForm, setShowGRNForm] = useState(false);
  const [selectedPO, setSelectedPO] = useState<any>(null);
  const [showSupplierForm, setShowSupplierForm] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [supplierSearchTerm, setSupplierSearchTerm] = useState("");
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [editingPayment, setEditingPayment] = useState<SupplierPayment | null>(null);
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

  const categories = ["all", "Medication", "Medical Supplies", "Equipment"];
  
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

  const downloadParbPharmaPO = (po: any) => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 20;
    
    // Format date as DD-MM-YYYY
    const formatDate = (dateStr: string) => {
      const date = new Date(dateStr);
      return `${date.getDate().toString().padStart(2, '0')}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getFullYear()}`;
    };
    
    // Hospital Logo and Header
    const img = new Image();
    img.src = "/NH_LOGO.png";
    
    // Add logo placeholder (centered)
    try {
      doc.addImage(img, "PNG", pageWidth / 2 - 15, 8, 30, 30);
    } catch (e) {
      // Logo not available, continue without it
    }
    
    // Hospital Name
    doc.setTextColor(0, 51, 102); // Navy color
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.text("NAVJEEVAN HOSPITAL", pageWidth / 2, 45, { align: "center" });
    
    // Tagline
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.text("De-Addiction & Rehabilitation Centre", pageWidth / 2, 51, { align: "center" });
    
    // Address
    doc.setFontSize(8);
    doc.text("Near Bus Stand, Main Road, Mansa, Punjab - 151505", pageWidth / 2, 56, { align: "center" });
    doc.text("Phone: +91-9876543210 | Email: info@navjeevanhospital.com", pageWidth / 2, 61, { align: "center" });
    
    // Gold divider line
    doc.setDrawColor(212, 175, 55); // Gold color
    doc.setLineWidth(0.5);
    doc.line(margin, 65, pageWidth - margin, 65);
    
    // Reset text color
    doc.setTextColor(0, 0, 0);
    
    // Header - PO No and Date
    let y = 75;
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.text(`P.O. NO. ${po.poNumber}`, margin, y);
    doc.text(`Date- ${formatDate(po.orderDate)}`, pageWidth - margin, y, { align: "right" });
    
    // Supplier Address
    y += 12;
    doc.setFont("helvetica", "normal");
    doc.text("To", margin, y);
    y += 7;
    doc.setFont("helvetica", "bold");
    doc.text("PARB PHARMACEUTICALS (P).LTD.", margin, y);
    y += 6;
    doc.setFont("helvetica", "normal");
    doc.text("307 GIDC, POR", margin, y);
    y += 6;
    doc.text("DISTT. VADODARA 391243", margin, y);
    
    // Subject
    y += 12;
    doc.setFont("helvetica", "bold");
    doc.text("Subject: Purchase order.", margin, y);
    
    // Dear sir paragraph
    y += 10;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    const introText = "We hereby placing a purchase order, Terms and conditions will remain same as our discussion on phonically. Payment of product shall be done through cheque to your bank account. The name and composition of product given below, Please do the supply earlier as possible.";
    const splitIntro = doc.splitTextToSize(introText, pageWidth - (margin * 2));
    doc.text("Dear sir,", margin, y);
    y += 7;
    doc.text(splitIntro, margin, y);
    y += splitIntro.length * 5 + 8;
    
    // Table Header
    const colWidths = [15, 45, 45, 25, 25, 20];
    const headers = ["S. NO.", "Product Name", "Composition", "Box. Qty.", "Rate/Box", "Packing"];
    
    doc.setFillColor(240, 240, 240);
    doc.rect(margin, y, pageWidth - (margin * 2), 8, 'F');
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    
    let xPos = margin + 2;
    headers.forEach((header, idx) => {
      doc.text(header, xPos, y + 5.5);
      xPos += colWidths[idx];
    });
    
    // Table border
    doc.setDrawColor(0);
    doc.rect(margin, y, pageWidth - (margin * 2), 8);
    y += 8;
    
    // Table Rows
    doc.setFont("helvetica", "normal");
    po.items.forEach((item: any, index: number) => {
      if (y > 200) {
        doc.addPage();
        y = 20;
      }
      
      const stockItem = stockItems.find(s => s.id === item.stockItemId);
      const rowHeight = 8;
      
      doc.rect(margin, y, pageWidth - (margin * 2), rowHeight);
      
      xPos = margin + 2;
      doc.text((index + 1).toString(), xPos, y + 5.5);
      xPos += colWidths[0];
      
      // Product Name (truncate if too long)
      const productName = item.stockItemName.length > 20 ? item.stockItemName.substring(0, 18) + ".." : item.stockItemName;
      doc.text(productName, xPos, y + 5.5);
      xPos += colWidths[1];
      
      // Composition - use actual composition field
      const composition = stockItem?.composition || "-";
      const compText = composition.length > 20 ? composition.substring(0, 18) + ".." : composition;
      doc.text(compText, xPos, y + 5.5);
      xPos += colWidths[2];
      
      // Box Qty
      doc.text(item.quantity.toString(), xPos, y + 5.5);
      xPos += colWidths[3];
      
      // Rate/Box
      doc.text(`₹${item.unitPrice.toFixed(2)}`, xPos, y + 5.5);
      xPos += colWidths[4];
      
      // Packing - use packing field
      const packing = stockItem?.packing || "-";
      doc.text(packing.length > 8 ? packing.substring(0, 6) + ".." : packing, xPos, y + 5.5);
      
      y += rowHeight;
    });
    
    // Empty row for additional entries
    doc.rect(margin, y, pageWidth - (margin * 2), 8);
    y += 15;
    
    // UNDERTAKING Section
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.text("UNDERTAKING", pageWidth / 2, y, { align: "center" });
    y += 8;
    
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    
    const undertakingText1 = `We hereby confirm that the Products which we intend to buy from PARB PHARMACEUTICALS (P).LTD. 307 GIDC, POR DISTT. VADODARA 391243 GUJARAT INDIA. Against Our P.O. NO ${po.poNumber} date ${formatDate(po.orderDate)}`;
    const splitUndertaking1 = doc.splitTextToSize(undertakingText1, pageWidth - (margin * 2));
    doc.text(splitUndertaking1, margin, y);
    y += splitUndertaking1.length * 4 + 5;
    
    const undertakingText2 = "These products purchased by us will be exclusively sold by psychiatric clinic and hospital in addition to the designated de-addiction centers and hospital with de addiction facilities only, on our License. NO. ..............................";
    const splitUndertaking2 = doc.splitTextToSize(undertakingText2, pageWidth - (margin * 2));
    doc.text(splitUndertaking2, margin, y);
    y += splitUndertaking2.length * 4 + 5;
    
    const undertakingText3 = "We are fully aware these products containing controlled substance as per Narcotic Drugs & Psychotropic substances Act 1985, and we will keep the relevant records of sale and purchase to us. Also, we assure our acknowledgement in form 6 (consignment note) for the receipt of above purchase item to supplier immediately on receipt of above controlled substances.";
    const splitUndertaking3 = doc.splitTextToSize(undertakingText3, pageWidth - (margin * 2));
    doc.text(splitUndertaking3, margin, y);
    y += splitUndertaking3.length * 4 + 5;
    
    const undertakingText4 = "Further we undertake that we are taking the Products for sale of below mentioned formulation & for its sale within India only & not meant for export.";
    const splitUndertaking4 = doc.splitTextToSize(undertakingText4, pageWidth - (margin * 2));
    doc.text(splitUndertaking4, margin, y);
    y += splitUndertaking4.length * 4 + 15;
    
    // Signature area
    doc.text(`Date :- ${formatDate(po.orderDate)}`, margin, y);
    doc.text("FOR NAVJEEVAN HOSPITAL", pageWidth - margin - 50, y);
    
    doc.save(`PO-ParbPharma-${po.poNumber}.pdf`);
    toast({
      title: "Downloaded",
      description: `Parb Pharma PO ${po.poNumber} has been downloaded.`
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
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="stock">Stock Items</TabsTrigger>
          <TabsTrigger value="purchase-orders">Purchase Orders</TabsTrigger>
          <TabsTrigger value="grn">Goods Receipt</TabsTrigger>
          <TabsTrigger value="payments">Payments</TabsTrigger>
          <TabsTrigger value="suppliers">Suppliers</TabsTrigger>
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
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="outline">
                            <Download className="h-4 w-4 mr-1" />
                            <ChevronDown className="h-3 w-3" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => downloadPurchaseOrder(po)}>
                            <FileText className="h-4 w-4 mr-2" />
                            Standard PO
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => downloadParbPharmaPO(po)}>
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

        <TabsContent value="payments" className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold">Supplier Payments</h2>
            <Button onClick={() => setShowPaymentForm(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Record Payment
            </Button>
          </div>

          {/* Payment Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Total Outstanding</p>
                    <p className="text-2xl font-bold text-red-600">₹{totalOutstanding.toFixed(2)}</p>
                  </div>
                  <DollarSign className="h-8 w-8 text-red-600" />
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Overdue Payments</p>
                    <p className="text-2xl font-bold text-orange-600">{outstandingPayments.length}</p>
                  </div>
                  <AlertTriangle className="h-8 w-8 text-orange-600" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Upcoming Payments</p>
                    <p className="text-2xl font-bold text-blue-600">{upcomingPayments.length}</p>
                  </div>
                  <Calendar className="h-8 w-8 text-blue-600" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Unpaid POs</p>
                    <p className="text-2xl font-bold">{unpaidPOs.length}</p>
                  </div>
                  <FileText className="h-8 w-8 text-gray-600" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Unpaid Purchase Orders */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Purchase Order Payment Status
              </CardTitle>
            </CardHeader>
            <CardContent>
              {unpaidPOs.length > 0 ? (
                <div className="space-y-3">
                  {unpaidPOs.map((po) => (
                    <div key={po.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex-1">
                        <div className="flex items-center gap-3">
                          <span className="font-medium">PO #{po.poNumber}</span>
                          {getPaymentStatusBadge(po.paymentStatus)}
                        </div>
                        <p className="text-sm text-gray-500">{po.supplier}</p>
                      </div>
                      <div className="text-right mr-4">
                        <p className="font-semibold">₹{po.totalAmount.toFixed(2)}</p>
                        {po.paymentDueDate && (
                          <p className="text-xs text-gray-500">Due: {po.paymentDueDate}</p>
                        )}
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="outline" size="sm">
                            Update Status
                            <ChevronDown className="h-3 w-3 ml-1" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
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
                <p className="text-center text-gray-500 py-4">All purchase orders are paid</p>
              )}
            </CardContent>
          </Card>

          {/* Payment Records */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Payment Records</CardTitle>
            </CardHeader>
            <CardContent>
              {payments.length > 0 ? (
                <div className="space-y-3">
                  {payments.map((payment) => (
                    <div key={payment.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex-1">
                        <div className="flex items-center gap-3">
                          <span className="font-medium">{payment.supplier_name}</span>
                          <Badge variant={payment.status === 'Completed' ? 'default' : payment.status === 'Overdue' ? 'destructive' : 'outline'}>
                            {payment.status}
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-500">
                          {payment.payment_method && `${payment.payment_method} • `}
                          {payment.po_number && `PO #${payment.po_number} • `}
                          {payment.reference_number && `Ref: ${payment.reference_number}`}
                        </p>
                      </div>
                      <div className="text-right mr-4">
                        <p className="font-semibold">₹{payment.amount.toFixed(2)}</p>
                        <p className="text-xs text-gray-500">
                          {payment.payment_date}
                          {payment.due_date && ` (Due: ${payment.due_date})`}
                        </p>
                      </div>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setEditingPayment(payment)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeletePayment(payment.id)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <CreditCard className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No payment records</h3>
                  <p className="text-gray-500 mb-4">Start tracking supplier payments</p>
                  <Button onClick={() => setShowPaymentForm(true)}>
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
            <h2 className="text-2xl font-bold">Suppliers</h2>
            <Button onClick={() => setShowSupplierForm(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Supplier
            </Button>
          </div>

          {/* Search */}
          <Card>
            <CardContent className="pt-6">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search suppliers by name, phone, or email..."
                  value={supplierSearchTerm}
                  onChange={(e) => setSupplierSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
            {filteredSuppliers.map((supplier) => (
              <Card key={supplier.id} className="hover:shadow-md transition-shadow">
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-lg">{supplier.name}</CardTitle>
                      {supplier.phone && <p className="text-sm text-gray-500">{supplier.phone}</p>}
                    </div>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setEditingSupplier(supplier)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteSupplier(supplier.id)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3 text-sm">
                    {supplier.email && (
                      <div>
                        <p className="text-gray-500">Email</p>
                        <p className="font-medium">{supplier.email}</p>
                      </div>
                    )}
                    {supplier.address && (
                      <div>
                        <p className="text-gray-500">Address</p>
                        <p className="font-medium">{supplier.address}</p>
                      </div>
                    )}
                    {supplier.payment_terms && (
                      <div>
                        <p className="text-gray-500">Payment Terms</p>
                        <p className="font-medium">{supplier.payment_terms}</p>
                      </div>
                    )}
                    {supplier.bank_name && (
                      <div>
                        <p className="text-gray-500">Bank Details</p>
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
            <Card>
              <CardContent className="text-center py-12">
                <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No suppliers found</h3>
                <p className="text-gray-500 mb-4">
                  {supplierSearchTerm 
                    ? "Try adjusting your search criteria" 
                    : "Get started by adding your first supplier"
                  }
                </p>
                <Button onClick={() => setShowSupplierForm(true)}>
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
    </div>
  );
}
