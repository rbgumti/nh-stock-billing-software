import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, Plus, Package, AlertTriangle, FileText, Truck, Download, ChevronDown, Users, Pencil, Trash2, CreditCard, Calendar, DollarSign, ExternalLink, Pill, Droplets, Brain, BookOpen, FileSpreadsheet, Wrench, CalendarIcon, Loader2, BookOpenCheck, Clock, ArrowUpDown, ArrowUp, ArrowDown, SortAsc, SortDesc, Eye } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { AddStockItemForm } from "@/components/forms/AddStockItemForm";
import { PurchaseOrderForm } from "@/components/forms/PurchaseOrderForm";
import { EditPurchaseOrderForm } from "@/components/forms/EditPurchaseOrderForm";
import { GRNForm } from "@/components/forms/GRNForm";
import { EditGRNForm } from "@/components/forms/EditGRNForm";
import { ServicePOForm } from "@/components/forms/ServicePOForm";
import { EditServicePOForm } from "@/components/forms/EditServicePOForm";
import { ServiceGRNForm } from "@/components/forms/ServiceGRNForm";
import { SupplierForm } from "@/components/forms/SupplierForm";
import { SupplierPaymentForm } from "@/components/forms/SupplierPaymentForm";
import { StockLedger } from "@/components/StockLedger";
import { SupplierLedger } from "@/components/SupplierLedger";
import { SupplierAgingReport } from "@/components/SupplierAgingReport";
import { ParbPharmaPO } from "@/components/forms/ParbPharmaPO";
import { RusanPharmaPO } from "@/components/forms/RusanPharmaPO";
import { NeuroglamPO } from "@/components/forms/NeuroglamPO";
import { VyadoHealthcarePO } from "@/components/forms/VyadoHealthcarePO";
import { VeeEssPharmaPO } from "@/components/forms/VeeEssPharmaPO";
import { PurchaseOrder } from "@/hooks/usePurchaseOrderStore";
import { toast } from "@/hooks/use-toast";
import { useStockStore } from "@/hooks/useStockStore";
import { usePurchaseOrderStore } from "@/hooks/usePurchaseOrderStore";
import { useSupplierStore, Supplier } from "@/hooks/useSupplierStore";
import { useSupplierPaymentStore, SupplierPayment } from "@/hooks/useSupplierPaymentStore";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import { createRoot } from "react-dom/client";
import * as XLSX from "xlsx";
import { FloatingOrbs } from "@/components/ui/floating-orbs";
import { formatLocalISODate } from "@/lib/dateUtils";
import { GRNDocument, type GRNItem } from "@/components/forms/GRNDocument";
import { AppSettingsProvider } from "@/hooks/usePerformanceMode";
import { BatchGroupedTable } from "@/components/BatchGroupedTable";
import { StockItemCard } from "@/components/StockItemCard";
import { supabase } from "@/integrations/supabase/client";
import { useUserRole } from "@/hooks/useUserRole";

export default function Stock() {
  const [searchTerm, setSearchTerm] = useState("");
  const [poTypeFilter, setPoTypeFilter] = useState<"all" | "Stock" | "Service">("all");
  const [filterCategory, setFilterCategory] = useState("all");
  const [sortBy, setSortBy] = useState<"name" | "expiry" | "stock" | "value">("name");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [showPOForm, setShowPOForm] = useState(false);
  const [showServicePOForm, setShowServicePOForm] = useState(false);
  const [showGRNForm, setShowGRNForm] = useState(false);
  const [showServiceGRNForm, setShowServiceGRNForm] = useState(false);
  const [selectedPO, setSelectedPO] = useState<any>(null);
  const [editingPO, setEditingPO] = useState<PurchaseOrder | null>(null);
  const [editingServicePO, setEditingServicePO] = useState<PurchaseOrder | null>(null);
  const [editingGRN, setEditingGRN] = useState<PurchaseOrder | null>(null);
  const [showSupplierForm, setShowSupplierForm] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [supplierSearchTerm, setSupplierSearchTerm] = useState("");
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [editingPayment, setEditingPayment] = useState<SupplierPayment | null>(null);
  const [showLedgerItem, setShowLedgerItem] = useState<any>(null);
  const [showSupplierLedger, setShowSupplierLedger] = useState(false);
  const [supplierLedgerId, setSupplierLedgerId] = useState<string | undefined>(undefined);
  const [showAgingReport, setShowAgingReport] = useState(false);
  const [showParbPharmaPO, setShowParbPharmaPO] = useState<PurchaseOrder | null>(null);
  const [showNeuroglamPO, setShowNeuroglamPO] = useState<PurchaseOrder | null>(null);
  const [showVyadoHealthcarePO, setShowVyadoHealthcarePO] = useState<PurchaseOrder | null>(null);
  const [showVeeEssPharmaPO, setShowVeeEssPharmaPO] = useState<PurchaseOrder | null>(null);
  const [showRusanPharmaPO, setShowRusanPharmaPO] = useState<PurchaseOrder | null>(null);
  const [showExportDialog, setShowExportDialog] = useState(false);
  const [exportStartDate, setExportStartDate] = useState<Date | undefined>(undefined);
  const [exportEndDate, setExportEndDate] = useState<Date | undefined>(undefined);
  const [downloadingGrnId, setDownloadingGrnId] = useState<string | null>(null);
  const { stockItems, addStockItem, updateStockItem, subscribe, findOrCreateBatch, getBatchesForMedicine, invalidateCache, forceRefresh } = useStockStore();
  const { purchaseOrders, addPurchaseOrder, updatePurchaseOrder, subscribe: subscribePO, refreshPurchaseOrders } = usePurchaseOrderStore();
  const { suppliers, addSupplier, updateSupplier, deleteSupplier, getSupplierByName } = useSupplierStore();
  const { payments, addPayment, updatePayment, deletePayment, getOutstandingPayments, getUpcomingPayments } = useSupplierPaymentStore();
  const { isAdmin } = useUserRole();

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

  const filteredItems = stockItems
    .filter(item => {
      const search = searchTerm.toLowerCase();
      const matchesSearch = item.name.toLowerCase().includes(search) ||
                           item.category.toLowerCase().includes(search) ||
                           (item.supplier || '').toLowerCase().includes(search) ||
                           (item.batchNo || '').toLowerCase().includes(search);
      
      const matchesCategory = filterCategory === "all" || item.category === filterCategory;
      
      return matchesSearch && matchesCategory;
    })
    .sort((a, b) => {
      let comparison = 0;
      
      switch (sortBy) {
        case "name":
          comparison = a.name.localeCompare(b.name);
          break;
        case "expiry":
          // Invalid dates go to the end
          const aValid = a.expiryDate && a.expiryDate !== 'N/A' && !isNaN(new Date(a.expiryDate).getTime());
          const bValid = b.expiryDate && b.expiryDate !== 'N/A' && !isNaN(new Date(b.expiryDate).getTime());
          if (!aValid && !bValid) comparison = 0;
          else if (!aValid) comparison = 1;
          else if (!bValid) comparison = -1;
          else comparison = new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime();
          break;
        case "stock":
          comparison = a.currentStock - b.currentStock;
          break;
        case "value":
          comparison = (a.currentStock * a.unitPrice) - (b.currentStock * b.unitPrice);
          break;
      }
      
      return sortOrder === "asc" ? comparison : -comparison;
    });

  const handleSortChange = (newSortBy: typeof sortBy) => {
    if (sortBy === newSortBy) {
      setSortOrder(prev => prev === "asc" ? "desc" : "asc");
    } else {
      setSortBy(newSortBy);
      setSortOrder("asc");
    }
  };

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

  const handleAddPurchaseOrder = async (poData: any) => {
    try {
      await addPurchaseOrder(poData);
      setShowPOForm(false);
      setShowServicePOForm(false);
      toast({
        title: "Success",
        description: "Purchase order has been created successfully!"
      });
    } catch (error) {
      console.error('Failed to save purchase order:', error);
      // Error toast is already shown by the store
    }
  };

  // Helper to check if expiry date is valid (not N/A, empty, or invalid format)
  const isValidExpiryDate = (date?: string): boolean => {
    if (!date || date === 'N/A' || date.trim() === '') return false;
    const parsed = new Date(date);
    return !isNaN(parsed.getTime());
  };

  const handleGRN = async (grnData: { grnNumber: string; purchaseOrderId: string; items: any[]; notes?: string; invoiceNumber?: string; invoiceDate?: string; invoiceUrl?: string }) => {
    const po = purchaseOrders.find(p => p.id === grnData.purchaseOrderId);
    if (!po) {
      toast({
        title: "Error",
        description: "Purchase order not found",
        variant: "destructive"
      });
      return;
    }
    
    // Guard: Prevent re-processing if already received
    if (po.status === 'Received') {
      toast({
        title: "Already Processed",
        description: "This GRN has already been processed. Stock was not updated again.",
        variant: "destructive"
      });
      setShowGRNForm(false);
      setSelectedPO(null);
      return;
    }

    try {
      // Update stock levels based on GRN - with batch-wise tracking
      for (const grnItem of grnData.items) {
        if (grnItem.receivedQuantity <= 0) continue;

        const stockItem = stockItems.find(s => s.id === grnItem.stockItemId);
        if (!stockItem) continue;

        // Use GRN values, only fallback to stock item if GRN values are meaningful
        const batchNo = grnItem.batchNo && grnItem.batchNo.trim() !== '' 
          ? grnItem.batchNo 
          : stockItem.batchNo;
        
        // Only use expiry from GRN if it's a valid date, otherwise keep existing (even if N/A)
        const newExpiryDate = isValidExpiryDate(grnItem.expiryDate) 
          ? grnItem.expiryDate 
          : (isValidExpiryDate(stockItem.expiryDate) ? stockItem.expiryDate : grnItem.expiryDate || stockItem.expiryDate);
        
        const newCostPrice = grnItem.costPrice && grnItem.costPrice > 0 
          ? grnItem.costPrice 
          : stockItem.unitPrice;
        const newMrp = grnItem.mrp && grnItem.mrp > 0 
          ? grnItem.mrp 
          : stockItem.mrp;

        try {
          // Find existing batch or create new one
          const { stockItemId, isNew } = await findOrCreateBatch(
            stockItem.name,
            batchNo,
            {
              expiryDate: newExpiryDate,
              costPrice: newCostPrice,
              mrp: newMrp,
              receivedQuantity: grnItem.receivedQuantity,
            }
          );

          // Fetch current stock from database to avoid stale data
          const { data: currentData } = await supabase
            .from('stock_items')
            .select('current_stock')
            .eq('item_id', stockItemId)
            .single();

          const currentStock = currentData?.current_stock || 0;
          
          // Update stock with new batch/expiry data and increased quantity
          const { error: updateError } = await supabase
            .from('stock_items')
            .update({
              current_stock: currentStock + grnItem.receivedQuantity,
              batch_no: batchNo,
              expiry_date: newExpiryDate,
              unit_price: newCostPrice,
              mrp: newMrp || null,
            })
            .eq('item_id', stockItemId);

          if (updateError) throw updateError;

          if (isNew) {
            console.log(`Created new batch for ${stockItem.name}: ${batchNo}`);
          } else {
            console.log(`Updated batch ${batchNo} for ${stockItem.name}: +${grnItem.receivedQuantity}, Expiry: ${newExpiryDate}`);
          }
        } catch (error) {
          console.error('Error processing GRN item:', error);
          // Fallback: update original stock item with basic stock increase
          const { data: freshData } = await supabase
            .from('stock_items')
            .select('current_stock')
            .eq('item_id', stockItem.id)
            .single();
          
          const freshStock = freshData?.current_stock || stockItem.currentStock;

          const { error: fallbackError } = await supabase
            .from('stock_items')
            .update({
              current_stock: freshStock + grnItem.receivedQuantity,
              batch_no: batchNo,
              expiry_date: newExpiryDate,
              unit_price: newCostPrice,
              mrp: newMrp || null,
            })
            .eq('item_id', stockItem.id);

          if (fallbackError) {
            console.error('Fallback update also failed:', fallbackError);
          }
        }
      }

      // Save GRN item details to purchase_order_items table
      const { data: existingPoItems } = await supabase
        .from('purchase_order_items')
        .select('*')
        .eq('purchase_order_id', po.id);

      if (existingPoItems) {
        for (let i = 0; i < grnData.items.length; i++) {
          const grnItem = grnData.items[i];
          if (grnItem.isAdditionalBatch) continue;
          
          const poItem = existingPoItems[i];
          if (!poItem) continue;
          
          const totalReceived = grnData.items.reduce((sum: number, item: any, idx: number) => {
            const belongsToLine =
              (!item.isAdditionalBatch && idx === i) ||
              (item.isAdditionalBatch && item.parentIndex === i);
            return belongsToLine ? sum + (item.receivedQuantity || 0) : sum;
          }, 0);
          
          await supabase
            .from('purchase_order_items')
            .update({
              received_quantity: totalReceived,
              batch_no: grnItem.batchNo || null,
              expiry_date: grnItem.expiryDate || null,
              unit_price: grnItem.costPrice || poItem.unit_price,
              mrp: grnItem.mrp || poItem.mrp
            })
            .eq('id', poItem.id);
        }
      }

      // Update PO status directly (NOT via updatePurchaseOrder which destructively re-inserts items)
      const { error: poUpdateError } = await supabase
        .from('purchase_orders')
        .update({
          status: 'Received',
          grn_date: new Date().toISOString(),
          grn_number: grnData.grnNumber,
          invoice_number: grnData.invoiceNumber || null,
          invoice_date: grnData.invoiceDate || null,
          invoice_url: grnData.invoiceUrl || null
        })
        .eq('id', po.id);

      if (poUpdateError) {
        console.error('Error updating PO status:', poUpdateError);
        throw poUpdateError;
      }

      // Invalidate stock cache to reflect changes
      invalidateCache();
      
      // Immediately refetch POs so UI updates without page refresh
      await refreshPurchaseOrders();
      
      setShowGRNForm(false);
      setSelectedPO(null);
      toast({
        title: "Success",
        description: `GRN ${grnData.grnNumber} has been processed successfully! Stock levels updated.`
      });
    } catch (error: any) {
      console.error('GRN processing error:', error);
      toast({
        title: "GRN Processing Failed",
        description: error?.message || "An error occurred while processing the GRN. Please try again.",
        variant: "destructive"
      });
    }
  };

  const handleServiceGRN = (grnData: { grnNumber: string; purchaseOrderId: string; notes?: string; invoiceNumber?: string; invoiceDate?: string; invoiceUrl?: string }) => {
    const po = purchaseOrders.find(p => p.id === grnData.purchaseOrderId);
    if (po) {
      // Update PO status with GRN number, invoice number and date (no stock update for service)
      updatePurchaseOrder(po.id, {
        ...po,
        status: 'Received',
        grnDate: formatLocalISODate(),
        grnNumber: grnData.grnNumber,
        invoiceNumber: grnData.invoiceNumber,
        invoiceDate: grnData.invoiceDate,
        invoiceUrl: grnData.invoiceUrl
      });
    }
    
    setShowServiceGRNForm(false);
    setSelectedPO(null);
    toast({
      title: "Success",
      description: `Service GRN ${grnData.grnNumber} has been processed successfully!`
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
    } catch (error: any) {
      toast({
        title: "Error",
        description: error?.message || "Failed to update purchase order",
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

  const viewInvoice = async (invoiceUrl: string) => {
    try {
      const { data, error } = await supabase.storage
        .from('payment-receipts')
        .createSignedUrl(invoiceUrl, 3600); // 1 hour expiry

      if (error) throw error;
      if (data?.signedUrl) {
        window.open(data.signedUrl, '_blank');
      }
    } catch (error) {
      console.error('Error viewing invoice:', error);
      toast({
        title: "Error",
        description: "Failed to load invoice document",
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

  const handleDeleteSupplier = async (id: string) => {
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

  const handleAddPayment = async (
    paymentData: Omit<SupplierPayment, 'id' | 'created_at' | 'updated_at' | 'supplier_name' | 'po_number'>,
    linkedPOIds: string[] = []
  ) => {
    try {
      await addPayment(paymentData);
      
      // Auto-update payment status for linked POs
      if (linkedPOIds.length > 0 && paymentData.status === 'Completed') {
        const paymentAmount = paymentData.amount;
        const totalPOAmount = linkedPOIds.reduce((sum, poId) => {
          const po = purchaseOrders.find(p => p.id === poId);
          return sum + (po?.totalAmount || 0);
        }, 0);
        
        // Determine if this is a full or partial payment
        const isFullPayment = paymentAmount >= totalPOAmount;
        const newStatus = isFullPayment ? 'Paid' : 'Partial';
        
        // Update each linked PO's payment status
        for (const poId of linkedPOIds) {
          const po = purchaseOrders.find(p => p.id === poId);
          if (po) {
            await updatePurchaseOrder(poId, {
              ...po,
              paymentStatus: newStatus as 'Pending' | 'Partial' | 'Paid' | 'Overdue',
              paymentDate: paymentData.payment_date,
              paymentAmount: (po.paymentAmount || 0) + (paymentAmount / linkedPOIds.length)
            });
          }
        }
        
        toast({
          title: "Success",
          description: `Payment recorded and ${linkedPOIds.length} PO${linkedPOIds.length > 1 ? 's' : ''} marked as ${newStatus}!`
        });
      } else {
        toast({
          title: "Success",
          description: "Payment has been recorded successfully!"
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to record payment",
        variant: "destructive"
      });
      throw error;
    }
  };

  const handleEditPayment = async (
    paymentData: Omit<SupplierPayment, 'id' | 'created_at' | 'updated_at' | 'supplier_name' | 'po_number'>,
    linkedPOIds: string[] = []
  ) => {
    if (!editingPayment) return;
    try {
      await updatePayment(editingPayment.id, paymentData);
      
      // Update linked POs if any
      if (linkedPOIds.length > 0 && paymentData.status === 'Completed') {
        const paymentAmount = paymentData.amount;
        const totalPOAmount = linkedPOIds.reduce((sum, poId) => {
          const po = purchaseOrders.find(p => p.id === poId);
          return sum + (po?.totalAmount || 0);
        }, 0);
        
        const isFullPayment = paymentAmount >= totalPOAmount;
        const newStatus = isFullPayment ? 'Paid' : 'Partial';
        
        for (const poId of linkedPOIds) {
          const po = purchaseOrders.find(p => p.id === poId);
          if (po) {
            await updatePurchaseOrder(poId, {
              ...po,
              paymentStatus: newStatus as 'Pending' | 'Partial' | 'Paid' | 'Overdue',
              paymentDate: paymentData.payment_date
            });
          }
        }
      }
      
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

  const handleDeletePayment = async (id: string) => {
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

  const handleUpdatePOPayment = async (poId: string, paymentStatus: string) => {
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

  const exportPOsToExcel = () => {
    if (!exportStartDate || !exportEndDate) {
      toast({
        title: "Error",
        description: "Please select both start and end dates",
        variant: "destructive"
      });
      return;
    }

    const startDateStr = format(exportStartDate, 'yyyy-MM-dd');
    const endDateStr = format(exportEndDate, 'yyyy-MM-dd');

    // Filter POs based on date range and current type filter
    const filteredPOs = purchaseOrders.filter(po => {
      const poDate = po.orderDate;
      const matchesDateRange = poDate >= startDateStr && poDate <= endDateStr;
      const matchesTypeFilter = poTypeFilter === "all" || (po.poType || "Stock") === poTypeFilter;
      return matchesDateRange && matchesTypeFilter;
    });

    if (filteredPOs.length === 0) {
      toast({
        title: "No Data",
        description: "No purchase orders found in the selected date range",
        variant: "destructive"
      });
      return;
    }

    // Prepare data for Excel
    const exportData = filteredPOs.map(po => ({
      'PO Number': po.poNumber,
      'Type': po.poType || 'Stock',
      'Supplier': po.supplier,
      'Order Date': po.orderDate,
      'Expected Delivery': po.expectedDelivery,
      'Status': po.status,
      'Total Amount': po.totalAmount,
      'Payment Status': po.paymentStatus || 'Pending',
      'Payment Due Date': po.paymentDueDate || '-',
      'GRN Number': po.grnNumber || '-',
      'GRN Date': po.grnDate || '-',
      'Invoice Number': po.invoiceNumber || '-',
      'Invoice Date': po.invoiceDate || '-',
      'Items Count': po.poType === 'Service' ? '-' : po.items.length,
      'Service Description': po.poType === 'Service' ? (po.serviceDescription || '-') : '-',
      'Notes': po.notes || '-'
    }));

    // Create workbook
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(exportData);

    // Set column widths
    ws['!cols'] = [
      { wch: 15 }, // PO Number
      { wch: 10 }, // Type
      { wch: 20 }, // Supplier
      { wch: 12 }, // Order Date
      { wch: 15 }, // Expected Delivery
      { wch: 10 }, // Status
      { wch: 12 }, // Total Amount
      { wch: 12 }, // Payment Status
      { wch: 15 }, // Payment Due Date
      { wch: 15 }, // GRN Number
      { wch: 12 }, // GRN Date
      { wch: 15 }, // Invoice Number
      { wch: 12 }, // Invoice Date
      { wch: 10 }, // Items Count
      { wch: 30 }, // Service Description
      { wch: 25 }  // Notes
    ];

    XLSX.utils.book_append_sheet(wb, ws, 'Purchase Orders');

    // Generate filename with date range
    const filename = `PurchaseOrders_${startDateStr}_to_${endDateStr}.xlsx`;
    XLSX.writeFile(wb, filename);

    toast({
      title: "Success",
      description: `Exported ${filteredPOs.length} purchase order(s) to Excel`
    });

    setShowExportDialog(false);
    setExportStartDate(undefined);
    setExportEndDate(undefined);
  };

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

  const downloadGRN = async (po: PurchaseOrder) => {
    // Prevent double-clicks
    if (downloadingGrnId === po.id) return;
    setDownloadingGrnId(po.id);

    // Render the same GRN HTML used in the Preview, then capture it with html2canvas.
    // Then trigger a direct file download (no new tab).
    const grnNumber = po.grnNumber || `GRN-${po.poNumber}`;
    const safeGrnNumberForFile = grnNumber.replace(/[\\/?:%*|"<>]/g, "-");

    const mount = document.createElement("div");
    mount.style.position = "fixed";
    mount.style.left = "-10000px";
    mount.style.top = "0";
    mount.style.width = "794px"; // A4 width-ish in px for consistent layout
    mount.style.background = "white";
    mount.style.zIndex = "-1";

    document.body.appendChild(mount);

    const root = createRoot(mount);

    try {
      // Fetch the saved GRN data from purchase_order_items
      const { data: savedPoItems } = await supabase
        .from('purchase_order_items')
        .select('*')
        .eq('purchase_order_id', po.id);

      const grnItems: GRNItem[] = (savedPoItems || po.items || []).map((item: any) => {
        const stockItem = stockItems.find((s) => s.id === (item.stock_item_id || item.stockItemId));
        const orderedQty = item.qty_in_tabs || item.qtyInTabs || item.quantity;
        // Use saved received_quantity if available, otherwise fall back to ordered qty
        const receivedQty = item.received_quantity !== null && item.received_quantity !== undefined 
          ? item.received_quantity 
          : orderedQty;

        return {
          stockItemId: item.stock_item_id || item.stockItemId,
          orderedQuantity: orderedQty,
          receivedQuantity: receivedQty,
          batchNo: item.batch_no || stockItem?.batchNo || "",
          expiryDate: item.expiry_date || stockItem?.expiryDate || "",
          costPrice: item.unit_price || item.unitPrice || stockItem?.unitPrice || 0,
          mrp: item.mrp || stockItem?.mrp || 0,
          remarks: "",
        };
      });

      root.render(
        <AppSettingsProvider>
          <GRNDocument
            grnNumber={grnNumber}
            grnDate={po.grnDate}
            invoiceNumber={po.invoiceNumber}
            invoiceDate={po.invoiceDate}
            purchaseOrder={po}
            grnItems={grnItems}
            stockItems={stockItems}
            notes={po.notes}
          />
        </AppSettingsProvider>
      );

      // Let React commit & ensure images are loaded before capture
      // Give React more time to fully render
      await new Promise<void>((resolve) => setTimeout(() => resolve(), 100));
      await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
      await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));

      // Wait for all images to load
      const imgs = Array.from(mount.querySelectorAll("img")) as HTMLImageElement[];
      await Promise.all(
        imgs.map(
          (img) =>
            img.complete && img.naturalWidth > 0
              ? Promise.resolve()
              : new Promise<void>((resolve) => {
                  const timeout = setTimeout(() => resolve(), 2000); // Max 2s per image
                  img.onload = () => { clearTimeout(timeout); resolve(); };
                  img.onerror = () => { clearTimeout(timeout); resolve(); };
                })
        )
      );

      // Additional delay to ensure DOM is fully painted
      await new Promise<void>((resolve) => setTimeout(() => resolve(), 200));

      // Find the actual GRN document div (the one with white background and specific styling)
      const target = mount.querySelector('div[style*="font-family"]') as HTMLElement || mount.firstElementChild as HTMLElement | null;
      if (!target) throw new Error("Failed to render GRN document");

      const canvas = await html2canvas(target, {
        scale: 3, // Higher scale for better quality - matches PrintableGRN
        useCORS: true,
        allowTaint: true,
        backgroundColor: "#ffffff",
        logging: false,
        windowWidth: target.scrollWidth,
        windowHeight: target.scrollHeight,
      });

      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
      });

      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();

      const imgWidth = canvas.width;
      const imgHeight = canvas.height;
      const ratio = Math.min(pdfWidth / imgWidth, pdfHeight / imgHeight);

      const imgX = (pdfWidth - imgWidth * ratio) / 2;
      const imgY = 0;

      pdf.addImage(imgData, "PNG", imgX, imgY, imgWidth * ratio, imgHeight * ratio);

      const blob = pdf.output("blob");
      const blobUrl = URL.createObjectURL(blob);

      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = `GRN-${safeGrnNumberForFile}.pdf`;
      link.style.display = "none";
      document.body.appendChild(link);
      link.click();
      link.remove();

      window.setTimeout(() => URL.revokeObjectURL(blobUrl), 60_000);

      toast({
        title: "Downloaded",
        description: `GRN ${grnNumber} has been downloaded (same as Preview).`,
      });
    } catch (error) {
      console.error("Error generating GRN PDF:", error);
      toast({
        title: "Error",
        description: "Failed to download GRN PDF",
        variant: "destructive",
      });
    } finally {
      root.unmount();
      mount.remove();
      setDownloadingGrnId(null);
    }
  };

  // Stock Export Functions
  const exportStockToExcel = () => {
    const workbook = XLSX.utils.book_new();
    
    const reportData: any[][] = [
      ['STOCK INVENTORY REPORT'],
      [`Generated: ${new Date().toLocaleDateString('en-GB')} at ${new Date().toLocaleTimeString()}`],
      [],
      ['Item Name', 'Category', 'Current Stock', 'Minimum Stock', 'Unit Price', 'MRP', 'Total Value', 'Supplier', 'Batch No', 'Expiry Date', 'Status'],
    ];

    stockItems.forEach(item => {
      const status = item.currentStock <= item.minimumStock * 0.5 ? 'Critical' : 
                     item.currentStock <= item.minimumStock ? 'Low Stock' : 'In Stock';
      reportData.push([
        item.name,
        item.category,
        item.currentStock,
        item.minimumStock,
        item.unitPrice,
        item.mrp || item.unitPrice,
        (item.currentStock * item.unitPrice).toFixed(2),
        item.supplier,
        item.batchNo,
        item.expiryDate,
        status
      ]);
    });

    // Add summary
    reportData.push([]);
    reportData.push(['SUMMARY']);
    reportData.push(['Total Items', stockItems.length]);
    reportData.push(['Low Stock Items', stockItems.filter(i => i.currentStock <= i.minimumStock).length]);
    reportData.push(['Total Inventory Value', `₹${stockItems.reduce((t, i) => t + (i.currentStock * i.unitPrice), 0).toFixed(2)}`]);

    // Category breakdown
    reportData.push([]);
    reportData.push(['CATEGORY BREAKDOWN']);
    ['BNX', 'TPN', 'PSHY'].forEach(cat => {
      const catItems = stockItems.filter(i => i.category === cat);
      const catValue = catItems.reduce((t, i) => t + (i.currentStock * i.unitPrice), 0);
      reportData.push([cat, `${catItems.length} items`, `₹${catValue.toFixed(2)}`]);
    });

    const sheet = XLSX.utils.aoa_to_sheet(reportData);
    sheet['!cols'] = [
      { wch: 30 }, { wch: 10 }, { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 10 }, { wch: 14 }, { wch: 20 }, { wch: 15 }, { wch: 12 }, { wch: 10 }
    ];
    
    XLSX.utils.book_append_sheet(workbook, sheet, 'Stock Report');
    XLSX.writeFile(workbook, `Stock_Report_${formatLocalISODate()}.xlsx`);
    toast({ title: "Exported", description: "Stock report exported to Excel" });
  };

  const exportStockToPDF = () => {
    const pdf = new jsPDF('l', 'mm', 'a4'); // Landscape for more columns
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const margin = 15;
    let y = 20;

    // Header
    pdf.setFillColor(0, 51, 102); // Navy
    pdf.rect(0, 0, pageWidth, 30, 'F');
    
    pdf.setTextColor(255, 255, 255);
    pdf.setFontSize(18);
    pdf.setFont('helvetica', 'bold');
    pdf.text('NAVJEEVAN HOSPITAL', pageWidth / 2, 12, { align: 'center' });
    
    pdf.setFontSize(14);
    pdf.text('Stock Inventory Report', pageWidth / 2, 22, { align: 'center' });

    y = 40;

    // Date
    pdf.setTextColor(100, 100, 100);
    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'normal');
    pdf.text(`Generated: ${new Date().toLocaleDateString('en-GB')} at ${new Date().toLocaleTimeString()}`, margin, y);
    y += 8;

    // Summary Cards
    const totalValue = stockItems.reduce((t, i) => t + (i.currentStock * i.unitPrice), 0);
    const lowStockCount = stockItems.filter(i => i.currentStock <= i.minimumStock).length;
    
    // Summary boxes
    const boxWidth = 60;
    const boxHeight = 20;
    const boxes = [
      { label: 'Total Items', value: String(stockItems.length), color: [59, 130, 246] }, // Blue
      { label: 'Low Stock', value: String(lowStockCount), color: [245, 158, 11] }, // Amber
      { label: 'Total Value', value: `₹${totalValue.toFixed(0)}`, color: [16, 185, 129] }, // Green
      { label: 'Categories', value: '3', color: [139, 92, 246] }, // Purple
    ];

    boxes.forEach((box, idx) => {
      const x = margin + idx * (boxWidth + 10);
      pdf.setFillColor(box.color[0], box.color[1], box.color[2]);
      pdf.roundedRect(x, y, boxWidth, boxHeight, 3, 3, 'F');
      pdf.setTextColor(255, 255, 255);
      pdf.setFontSize(8);
      pdf.text(box.label, x + 5, y + 8);
      pdf.setFontSize(12);
      pdf.setFont('helvetica', 'bold');
      pdf.text(box.value, x + 5, y + 16);
    });
    
    y += boxHeight + 10;

    // Category sections
    const categories = [
      { name: 'BNX', color: [59, 130, 246] as [number, number, number] },
      { name: 'TPN', color: [245, 158, 11] as [number, number, number] },
      { name: 'PSHY', color: [139, 92, 246] as [number, number, number] }
    ];

    categories.forEach(cat => {
      const items = stockItems.filter(i => i.category === cat.name);
      if (items.length === 0) return;

      // Check page break
      if (y > pageHeight - 50) {
        pdf.addPage();
        y = 20;
      }

      // Category header
      pdf.setFillColor(cat.color[0], cat.color[1], cat.color[2]);
      pdf.rect(margin, y, pageWidth - 2 * margin, 8, 'F');
      pdf.setTextColor(255, 255, 255);
      pdf.setFontSize(11);
      pdf.setFont('helvetica', 'bold');
      pdf.text(`${cat.name} (${items.length} items)`, margin + 5, y + 5.5);
      y += 10;

      // Table header
      pdf.setFillColor(240, 240, 240);
      pdf.rect(margin, y, pageWidth - 2 * margin, 7, 'F');
      pdf.setTextColor(0, 0, 0);
      pdf.setFontSize(8);
      pdf.setFont('helvetica', 'bold');
      
      const cols = [margin + 3, margin + 70, margin + 95, margin + 120, margin + 145, margin + 175, margin + 210, margin + 240];
      pdf.text('Item Name', cols[0], y + 5);
      pdf.text('Stock', cols[1], y + 5);
      pdf.text('Min', cols[2], y + 5);
      pdf.text('Price', cols[3], y + 5);
      pdf.text('Value', cols[4], y + 5);
      pdf.text('Supplier', cols[5], y + 5);
      pdf.text('Expiry', cols[6], y + 5);
      pdf.text('Status', cols[7], y + 5);
      y += 8;

      // Table rows
      pdf.setFont('helvetica', 'normal');
      items.forEach((item, idx) => {
        if (y > pageHeight - 20) {
          pdf.addPage();
          y = 20;
        }

        if (idx % 2 === 0) {
          pdf.setFillColor(250, 250, 250);
          pdf.rect(margin, y - 1, pageWidth - 2 * margin, 6, 'F');
        }

        const status = item.currentStock <= item.minimumStock * 0.5 ? 'Critical' : 
                       item.currentStock <= item.minimumStock ? 'Low' : 'OK';
        const statusColor = status === 'Critical' ? [220, 38, 38] : status === 'Low' ? [245, 158, 11] : [16, 185, 129];

        pdf.setTextColor(0, 0, 0);
        pdf.text(item.name.substring(0, 35), cols[0], y + 3);
        pdf.text(String(item.currentStock), cols[1], y + 3);
        pdf.text(String(item.minimumStock), cols[2], y + 3);
        pdf.text(`₹${item.unitPrice}`, cols[3], y + 3);
        pdf.text(`₹${(item.currentStock * item.unitPrice).toFixed(0)}`, cols[4], y + 3);
        pdf.text(item.supplier.substring(0, 15), cols[5], y + 3);
        pdf.text(item.expiryDate !== 'N/A' ? item.expiryDate : '-', cols[6], y + 3);
        
        pdf.setTextColor(statusColor[0], statusColor[1], statusColor[2]);
        pdf.setFont('helvetica', 'bold');
        pdf.text(status, cols[7], y + 3);
        pdf.setFont('helvetica', 'normal');
        
        y += 6;
      });

      y += 8;
    });

    pdf.save(`Stock_Report_${formatLocalISODate()}.pdf`);
    toast({ title: "Exported", description: "Stock report exported to PDF with colors" });
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
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="glass-subtle border-emerald/20 hover:border-emerald/40">
                <Download className="h-4 w-4 mr-2" />
                Export
                <ChevronDown className="h-3 w-3 ml-1" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={exportStockToPDF}>
                <FileText className="h-4 w-4 mr-2 text-red-500" />
                PDF (with Colors)
              </DropdownMenuItem>
              <DropdownMenuItem onClick={exportStockToExcel}>
                <FileSpreadsheet className="h-4 w-4 mr-2 text-green-600" />
                Excel
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button onClick={() => setShowAddForm(true)} className="bg-gradient-to-r from-gold to-orange hover:shadow-glow-gold text-white font-semibold">
            <Plus className="h-4 w-4 mr-2" />
            Add Item Master
          </Button>
          <Button onClick={() => setShowPOForm(true)} variant="outline" className="glass-subtle border-purple/20 hover:border-purple/40">
            <FileText className="h-4 w-4 mr-2" />
            Create PO
          </Button>
        </div>
      </div>

      {/* Tabs for different sections */}
      <Tabs defaultValue="item-master" className="w-full">
        <TabsList className="grid w-full grid-cols-6 glass-strong border-0 p-1">
          <TabsTrigger value="item-master" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple data-[state=active]:to-cyan data-[state=active]:text-white">Item Master</TabsTrigger>
          <TabsTrigger value="stock" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-cyan data-[state=active]:to-teal data-[state=active]:text-white">Stock Items</TabsTrigger>
          <TabsTrigger value="purchase-orders" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-teal data-[state=active]:to-emerald data-[state=active]:text-white">Purchase Orders</TabsTrigger>
          <TabsTrigger value="grn" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-emerald data-[state=active]:to-green data-[state=active]:text-white">Goods Receipt</TabsTrigger>
          <TabsTrigger value="payments" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-gold data-[state=active]:to-orange data-[state=active]:text-white">Payments</TabsTrigger>
          <TabsTrigger value="suppliers" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-pink data-[state=active]:to-purple data-[state=active]:text-white">Suppliers</TabsTrigger>
        </TabsList>

        {/* Item Master Tab */}
        <TabsContent value="item-master" className="space-y-6">
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
              <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 via-transparent to-orange-500/10 opacity-50 group-hover:opacity-100 transition-opacity" />
              <CardContent className="pt-6 relative">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">BNX Items</p>
                    <p className="text-2xl font-bold bg-gradient-to-r from-blue-500 to-orange-500 bg-clip-text text-transparent">
                      {stockItems.filter(item => item.category === 'BNX').length}
                    </p>
                  </div>
                  <div className="p-3 rounded-xl bg-gradient-to-r from-blue-500 to-orange-500">
                    <Pill className="h-5 w-5 text-white" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="glass-strong border-0 overflow-hidden relative group hover:shadow-glow transition-all duration-300">
              <div className="absolute inset-0 bg-gradient-to-br from-amber-500/10 via-transparent to-yellow-500/10 opacity-50 group-hover:opacity-100 transition-opacity" />
              <CardContent className="pt-6 relative">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">TPN Items</p>
                    <p className="text-2xl font-bold bg-gradient-to-r from-amber-500 to-yellow-500 bg-clip-text text-transparent">
                      {stockItems.filter(item => item.category === 'TPN').length}
                    </p>
                  </div>
                  <div className="p-3 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500">
                    <Droplets className="h-5 w-5 text-white" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="glass-strong border-0 overflow-hidden relative group hover:shadow-glow transition-all duration-300">
              <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 via-transparent to-pink-500/10 opacity-50 group-hover:opacity-100 transition-opacity" />
              <CardContent className="pt-6 relative">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">PSHY Items</p>
                    <p className="text-2xl font-bold bg-gradient-to-r from-purple-500 to-pink-500 bg-clip-text text-transparent">
                      {stockItems.filter(item => item.category === 'PSHY').length}
                    </p>
                  </div>
                  <div className="p-3 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500">
                    <Brain className="h-5 w-5 text-white" />
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
                    placeholder="Search items by name, category, or vendor..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9 glass-subtle border-0"
                  />
                </div>
                <div className="flex gap-2">
                  {categories.map((category) => {
                    const style = getCategoryStyle(category);
                    return (
                      <Button
                        key={category}
                        variant={filterCategory === category ? "default" : "outline"}
                        size="sm"
                        onClick={() => setFilterCategory(category)}
                        className={filterCategory === category ? style.badge : "glass-subtle border-0"}
                      >
                        {category === 'all' ? 'All' : category}
                      </Button>
                    );
                  })}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Item Master Table - Batch Grouped */}
          <Card className="glass-strong border-0 overflow-hidden">
            <CardHeader className="bg-gradient-to-r from-purple/10 to-cyan/10 border-b">
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="h-5 w-5" />
                Item Master List
                <Badge variant="outline" className="ml-2 text-xs">
                  Batch-wise tracking enabled
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <BatchGroupedTable
                stockItems={stockItems}
                filteredItems={filteredItems}
                getBatchesForMedicine={getBatchesForMedicine}
                getCategoryStyle={getCategoryStyle}
                onEditItem={(item) => setEditingItem(item)}
                onViewLedger={(item) => setShowLedgerItem(item)}
              />
            </CardContent>
          </Card>
        </TabsContent>

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

          {/* Search, Filter and Sort */}
          <Card className="glass-strong border-0 overflow-hidden relative">
            <div className="absolute inset-0 bg-gradient-to-r from-purple/5 via-transparent to-cyan/5" />
            <CardContent className="pt-6 relative">
              <div className="flex flex-col gap-4">
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
                  <div className="flex gap-2 flex-wrap">
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
                
                {/* Sorting Options */}
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm text-muted-foreground flex items-center gap-1">
                    <ArrowUpDown className="h-3.5 w-3.5" />
                    Sort by:
                  </span>
                  <Button
                    variant={sortBy === "name" ? "default" : "outline"}
                    size="sm"
                    onClick={() => handleSortChange("name")}
                    className={sortBy === "name" 
                      ? "bg-gradient-to-r from-emerald to-teal text-white" 
                      : "glass-subtle border-emerald/20 hover:border-emerald/40"
                    }
                  >
                    Name
                    {sortBy === "name" && (
                      sortOrder === "asc" ? <ArrowUp className="h-3 w-3 ml-1" /> : <ArrowDown className="h-3 w-3 ml-1" />
                    )}
                  </Button>
                  <Button
                    variant={sortBy === "expiry" ? "default" : "outline"}
                    size="sm"
                    onClick={() => handleSortChange("expiry")}
                    className={sortBy === "expiry" 
                      ? "bg-gradient-to-r from-orange to-amber-500 text-white" 
                      : "glass-subtle border-orange/20 hover:border-orange/40"
                    }
                  >
                    <Clock className="h-3 w-3 mr-1" />
                    Expiry
                    {sortBy === "expiry" && (
                      sortOrder === "asc" ? <ArrowUp className="h-3 w-3 ml-1" /> : <ArrowDown className="h-3 w-3 ml-1" />
                    )}
                  </Button>
                  <Button
                    variant={sortBy === "stock" ? "default" : "outline"}
                    size="sm"
                    onClick={() => handleSortChange("stock")}
                    className={sortBy === "stock" 
                      ? "bg-gradient-to-r from-cyan to-blue-500 text-white" 
                      : "glass-subtle border-cyan/20 hover:border-cyan/40"
                    }
                  >
                    <Package className="h-3 w-3 mr-1" />
                    Stock Level
                    {sortBy === "stock" && (
                      sortOrder === "asc" ? <ArrowUp className="h-3 w-3 ml-1" /> : <ArrowDown className="h-3 w-3 ml-1" />
                    )}
                  </Button>
                  <Button
                    variant={sortBy === "value" ? "default" : "outline"}
                    size="sm"
                    onClick={() => handleSortChange("value")}
                    className={sortBy === "value" 
                      ? "bg-gradient-to-r from-gold to-orange text-white" 
                      : "glass-subtle border-gold/20 hover:border-gold/40"
                    }
                  >
                    <DollarSign className="h-3 w-3 mr-1" />
                    Value
                    {sortBy === "value" && (
                      sortOrder === "asc" ? <ArrowUp className="h-3 w-3 ml-1" /> : <ArrowDown className="h-3 w-3 ml-1" />
                    )}
                  </Button>
                  <span className="text-xs text-muted-foreground ml-2">
                    ({filteredItems.length} items)
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Stock Items - Grouped by Medicine Name */}
          <div className="grid grid-cols-1 gap-4">
            {(() => {
              // Get unique medicine names from filtered items
              const seen = new Set<string>();
              const uniqueMedicines: string[] = [];
              filteredItems.forEach(item => {
                const key = item.name.toLowerCase();
                if (!seen.has(key)) {
                  seen.add(key);
                  uniqueMedicines.push(item.name);
                }
              });
              
              return uniqueMedicines.map((medicineName, index) => {
                const allBatches = getBatchesForMedicine(medicineName);
                // Filter out zero-stock batches for display
                const batches = allBatches.filter(b => b.currentStock > 0);
                // Calculate total stock
                const totalStock = allBatches.reduce((sum, b) => sum + b.currentStock, 0);
                
                // Skip medicines with zero total stock
                if (totalStock === 0) return null;
                
                const primaryItem = allBatches[0]; // Use first batch for item details
                if (!primaryItem) return null;
                
                return (
                  <StockItemCard
                    key={`medicine-${medicineName}`}
                    item={primaryItem}
                    batches={batches.length > 0 ? batches : [primaryItem]} // Show at least the primary
                    index={index}
                    getCategoryStyle={getCategoryStyle}
                    getStockStatus={getStockStatus}
                    onViewLedger={setShowLedgerItem}
                    onEdit={setEditingItem}
                    onReorder={() => setShowPOForm(true)}
                    isAdmin={isAdmin}
                    onStockUpdated={forceRefresh}
                  />
                );
              });
            })()}
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
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <h2 className="text-2xl font-bold bg-gradient-to-r from-cyan to-teal bg-clip-text text-transparent">Purchase Orders</h2>
            <div className="flex gap-3 items-center">
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Filter:</span>
                <div className="flex gap-1">
                  <Button
                    variant={poTypeFilter === "all" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setPoTypeFilter("all")}
                    className={poTypeFilter === "all" ? "bg-gradient-to-r from-cyan to-teal text-white" : "glass-subtle border-cyan/20 hover:border-cyan/40"}
                  >
                    All
                  </Button>
                  <Button
                    variant={poTypeFilter === "Stock" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setPoTypeFilter("Stock")}
                    className={poTypeFilter === "Stock" ? "bg-gradient-to-r from-cyan to-teal text-white" : "glass-subtle border-cyan/20 hover:border-cyan/40"}
                  >
                    <Package className="h-3 w-3 mr-1" />
                    Stock
                  </Button>
                  <Button
                    variant={poTypeFilter === "Service" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setPoTypeFilter("Service")}
                    className={poTypeFilter === "Service" ? "bg-gradient-to-r from-purple to-cyan text-white" : "glass-subtle border-purple/20 hover:border-purple/40"}
                  >
                    <Wrench className="h-3 w-3 mr-1" />
                    Service
                  </Button>
                </div>
              </div>
              <Button 
                variant="outline" 
                onClick={() => setShowExportDialog(true)}
                className="glass-subtle border-emerald/20 hover:border-emerald/40"
              >
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button className="bg-gradient-to-r from-cyan to-teal hover:shadow-glow text-white">
                    <Plus className="h-4 w-4 mr-2" />
                    Create Purchase Order
                    <ChevronDown className="h-4 w-4 ml-2" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="glass-strong border-0">
                  <DropdownMenuItem onClick={() => setShowPOForm(true)}>
                    <Package className="h-4 w-4 mr-2" />
                    Stock PO (Medicines)
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setShowServicePOForm(true)}>
                    <Wrench className="h-4 w-4 mr-2" />
                    Service PO
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
            {purchaseOrders
              .filter(po => poTypeFilter === "all" || (po.poType || "Stock") === poTypeFilter)
              .map((po, index) => (
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
                      <div className="flex items-center gap-2">
                        <CardTitle className="text-lg bg-gradient-to-r from-cyan to-teal bg-clip-text text-transparent">PO #{po.poNumber}</CardTitle>
                        {po.poType === 'Service' && (
                          <Badge variant="outline" className="text-xs border-purple/40 text-purple">
                            <Wrench className="h-3 w-3 mr-1" />
                            Service
                          </Badge>
                        )}
                      </div>
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
                      <p className="text-muted-foreground">Total Amount</p>
                      <p className="font-semibold text-lg bg-gradient-to-r from-gold to-orange bg-clip-text text-transparent">₹{po.totalAmount.toFixed(2)}</p>
                    </div>
                    {po.poType === 'Service' ? (
                      <div className="text-sm">
                        <p className="text-muted-foreground">Service Description</p>
                        <p className="font-medium line-clamp-2">{po.serviceDescription || 'N/A'}</p>
                      </div>
                    ) : (
                      <div className="text-sm">
                        <p className="text-muted-foreground">Items</p>
                        <p className="font-medium">{po.items.length} item(s)</p>
                      </div>
                    )}
                    <div className="flex gap-2 mt-4">
                      {po.status === 'Pending' && (
                        <>
                          {po.poType === 'Service' ? (
                            <Button 
                              variant="outline"
                              size="sm"
                              className="glass-subtle border-purple/20 hover:border-purple/40"
                              onClick={() => setEditingServicePO(po)}
                            >
                              <Pencil className="h-4 w-4 mr-1 text-purple" />
                              Edit
                            </Button>
                          ) : (
                            <Button 
                              variant="outline"
                              size="sm"
                              className="glass-subtle border-purple/20 hover:border-purple/40"
                              onClick={() => setEditingPO(po)}
                            >
                              <Pencil className="h-4 w-4 mr-1 text-purple" />
                              Edit
                            </Button>
                          )}
                          <Button 
                            className="flex-1 bg-gradient-to-r from-emerald to-teal hover:shadow-glow text-white" 
                            onClick={() => {
                              setSelectedPO(po);
                              if (po.poType === 'Service') {
                                setShowServiceGRNForm(true);
                              } else {
                                setShowGRNForm(true);
                              }
                            }}
                          >
                            <Truck className="h-4 w-4 mr-2" />
                            Process GRN
                          </Button>
                        </>
                      )}
                      {po.invoiceUrl && (
                        <Button 
                          variant="outline"
                          size="sm"
                          className="glass-subtle border-blue-500/20 hover:border-blue-500/40"
                          onClick={() => viewInvoice(po.invoiceUrl!)}
                        >
                          <Eye className="h-4 w-4 mr-1 text-blue-500" />
                          Invoice
                        </Button>
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
                          <DropdownMenuItem onClick={() => setShowNeuroglamPO(po)}>
                            <FileText className="h-4 w-4 mr-2" />
                            Neuroglam Format
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => setShowParbPharmaPO(po)}>
                            <FileText className="h-4 w-4 mr-2" />
                            Parb Pharma Format
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => setShowRusanPharmaPO(po)}>
                            <FileText className="h-4 w-4 mr-2" />
                            Rusan Pharma Format
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => setShowVeeEssPharmaPO(po)}>
                            <FileText className="h-4 w-4 mr-2" />
                            VEE ESS Pharma Format
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => setShowVyadoHealthcarePO(po)}>
                            <FileText className="h-4 w-4 mr-2" />
                            VYADO Healthcare Format
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
                    <div className="flex gap-2 mt-4 flex-wrap">
                      <Button 
                        variant="outline" 
                        size="sm"
                        className="glass-subtle border-purple/20 hover:border-purple/40"
                        onClick={() => setEditingGRN(po)}
                      >
                        <Pencil className="h-4 w-4 mr-1 text-purple" />
                        Edit GRN
                      </Button>
                      {po.poType === 'Service' ? (
                        <Button 
                          variant="outline" 
                          size="sm"
                          className="glass-subtle border-orange/20 hover:border-orange/40"
                          onClick={() => setEditingServicePO(po)}
                        >
                          <Pencil className="h-4 w-4 mr-1 text-orange" />
                          Edit PO
                        </Button>
                      ) : (
                        <Button 
                          variant="outline" 
                          size="sm"
                          className="glass-subtle border-orange/20 hover:border-orange/40"
                          onClick={() => setEditingPO(po)}
                        >
                          <Pencil className="h-4 w-4 mr-1 text-orange" />
                          Edit PO
                        </Button>
                      )}
                      {po.invoiceUrl && (
                        <Button 
                          variant="outline"
                          size="sm"
                          className="glass-subtle border-blue-500/20 hover:border-blue-500/40"
                          onClick={() => viewInvoice(po.invoiceUrl!)}
                        >
                          <Eye className="h-4 w-4 mr-1 text-blue-500" />
                          Invoice
                        </Button>
                      )}
                      <Button 
                        variant="outline" 
                        className="flex-1 glass-subtle border-teal/20 hover:border-teal/40"
                        onClick={() => downloadGRN(po)}
                        disabled={downloadingGrnId === po.id}
                      >
                        {downloadingGrnId === po.id ? (
                          <Loader2 className="h-4 w-4 mr-2 text-teal animate-spin" />
                        ) : (
                          <Download className="h-4 w-4 mr-2 text-teal" />
                        )}
                        {downloadingGrnId === po.id ? "Generating…" : "Download GRN"}
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
            <div className="flex gap-2">
              <Button 
                onClick={() => setShowAgingReport(true)} 
                variant="outline"
                className="glass-subtle border-orange/30 hover:border-orange/50"
              >
                <Clock className="h-4 w-4 mr-2 text-orange" />
                Aging Report
              </Button>
              <Button 
                onClick={() => { setSupplierLedgerId(undefined); setShowSupplierLedger(true); }} 
                variant="outline"
                className="glass-subtle border-cyan/30 hover:border-cyan/50"
              >
                <FileText className="h-4 w-4 mr-2 text-cyan" />
                A/C Ledger
              </Button>
              <Button onClick={() => setShowPaymentForm(true)} className="bg-gradient-to-r from-gold to-orange hover:shadow-glow-gold text-white">
                <Plus className="h-4 w-4 mr-2" />
                Record Payment
              </Button>
            </div>
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
                        onClick={() => { setSupplierLedgerId(supplier.id); setShowSupplierLedger(true); }}
                        className="hover:bg-cyan/10"
                        title="View A/C Ledger"
                      >
                        <BookOpenCheck className="h-4 w-4 text-cyan" />
                      </Button>
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

      {showNeuroglamPO && (
        <NeuroglamPO
          poNumber={showNeuroglamPO.poNumber}
          poDate={showNeuroglamPO.orderDate}
          items={showNeuroglamPO.items}
          stockItems={stockItems}
          onClose={() => setShowNeuroglamPO(null)}
        />
      )}

      {showVyadoHealthcarePO && (
        <VyadoHealthcarePO
          poNumber={showVyadoHealthcarePO.poNumber}
          poDate={showVyadoHealthcarePO.orderDate}
          items={showVyadoHealthcarePO.items}
          stockItems={stockItems}
          onClose={() => setShowVyadoHealthcarePO(null)}
        />
      )}

      {showVeeEssPharmaPO && (
        <VeeEssPharmaPO
          poNumber={showVeeEssPharmaPO.poNumber}
          poDate={showVeeEssPharmaPO.orderDate}
          items={showVeeEssPharmaPO.items}
          stockItems={stockItems}
          onClose={() => setShowVeeEssPharmaPO(null)}
        />
      )}

      {showRusanPharmaPO && (
        <RusanPharmaPO
          poNumber={showRusanPharmaPO.poNumber}
          poDate={showRusanPharmaPO.orderDate}
          items={showRusanPharmaPO.items}
          stockItems={stockItems}
          onClose={() => setShowRusanPharmaPO(null)}
        />
      )}

      {showServicePOForm && (
        <ServicePOForm
          onClose={() => setShowServicePOForm(false)}
          onSubmit={handleAddPurchaseOrder}
        />
      )}

      {showServiceGRNForm && selectedPO && (
        <ServiceGRNForm
          onClose={() => {
            setShowServiceGRNForm(false);
            setSelectedPO(null);
          }}
          onSubmit={handleServiceGRN}
          purchaseOrder={selectedPO}
        />
      )}

      {editingServicePO && (
        <EditServicePOForm
          purchaseOrder={editingServicePO}
          onClose={() => setEditingServicePO(null)}
          onSubmit={async (updatedPO) => {
            try {
              await updatePurchaseOrder(updatedPO.id, updatedPO);
              setEditingServicePO(null);
              toast({
                title: "Success",
                description: "Service PO has been updated successfully!"
              });
            } catch (error) {
              toast({
                title: "Error",
                description: "Failed to update service PO",
                variant: "destructive"
              });
            }
          }}
        />
      )}

      {/* Export POs Dialog */}
      <Dialog open={showExportDialog} onOpenChange={setShowExportDialog}>
        <DialogContent className="glass-strong border-0 sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl bg-gradient-to-r from-cyan to-teal bg-clip-text text-transparent">
              Export Purchase Orders
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Start Date</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal glass-subtle border-purple/20",
                      !exportStartDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {exportStartDate ? format(exportStartDate, "PPP") : <span>Select start date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <CalendarComponent
                    mode="single"
                    selected={exportStartDate}
                    onSelect={setExportStartDate}
                    initialFocus
                    className={cn("p-3 pointer-events-auto")}
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">End Date</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal glass-subtle border-purple/20",
                      !exportEndDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {exportEndDate ? format(exportEndDate, "PPP") : <span>Select end date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <CalendarComponent
                    mode="single"
                    selected={exportEndDate}
                    onSelect={setExportEndDate}
                    initialFocus
                    className={cn("p-3 pointer-events-auto")}
                  />
                </PopoverContent>
              </Popover>
            </div>
            {poTypeFilter !== "all" && (
              <p className="text-sm text-muted-foreground">
                Exporting only <strong>{poTypeFilter}</strong> POs based on current filter.
              </p>
            )}
          </div>
          <DialogFooter className="gap-2">
            <Button 
              variant="outline" 
              onClick={() => {
                setShowExportDialog(false);
                setExportStartDate(undefined);
                setExportEndDate(undefined);
              }}
              className="glass-subtle border-purple/20"
            >
              Cancel
            </Button>
            <Button 
              onClick={exportPOsToExcel}
              disabled={!exportStartDate || !exportEndDate}
              className="bg-gradient-to-r from-emerald to-teal hover:shadow-glow text-white"
            >
              <FileSpreadsheet className="h-4 w-4 mr-2" />
              Export to Excel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Supplier A/C Ledger */}
      {showSupplierLedger && (
        <SupplierLedger
          suppliers={suppliers}
          payments={payments}
          purchaseOrders={purchaseOrders}
          onClose={() => setShowSupplierLedger(false)}
          initialSupplierId={supplierLedgerId}
        />
      )}

      {/* Supplier Aging Report */}
      {showAgingReport && (
        <SupplierAgingReport
          suppliers={suppliers}
          payments={payments}
          purchaseOrders={purchaseOrders}
          onClose={() => setShowAgingReport(false)}
        />
      )}
    </div>
  );
}
