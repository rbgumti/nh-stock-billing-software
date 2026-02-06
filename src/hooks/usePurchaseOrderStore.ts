import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

export interface PurchaseOrderItem {
  stockItemId: number;
  stockItemName: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  packSize?: string;
  qtyInStrips?: number;
  qtyInTabs?: number;
}

export interface PurchaseOrder {
  id: string;
  poNumber: string;
  supplier: string;
  orderDate: string;
  expectedDelivery: string;
  status: 'Pending' | 'Received' | 'Cancelled';
  items: PurchaseOrderItem[];
  totalAmount: number;
  grnDate?: string;
  grnNumber?: string;
  invoiceNumber?: string;
  invoiceDate?: string;
  invoiceUrl?: string;
  notes?: string;
  // Payment tracking fields
  paymentStatus?: 'Pending' | 'Partial' | 'Paid' | 'Overdue';
  paymentDueDate?: string;
  paymentDate?: string;
  paymentAmount?: number;
  paymentNotes?: string;
  // PO Type: Stock (default) or Service
  poType?: 'Stock' | 'Service';
  serviceDescription?: string;
  serviceAmount?: number;
}

export function usePurchaseOrderStore() {
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPurchaseOrders();
    
    // Subscribe to real-time changes
    const channel = supabase
      .channel('po-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'purchase_orders'
        },
        () => {
          loadPurchaseOrders();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const loadPurchaseOrders = async () => {
    try {
      const { data: orders, error: ordersError } = await supabase
        .from('purchase_orders')
        .select('*')
        .order('created_at', { ascending: false });

      if (ordersError) throw ordersError;

      const { data: allItems, error: itemsError } = await supabase
        .from('purchase_order_items')
        .select('*');

      if (itemsError) throw itemsError;

      const formattedOrders: PurchaseOrder[] = (orders || []).map(po => {
        const poItems = (allItems || [])
          .filter(item => item.purchase_order_id === po.id)
          .map(item => ({
            stockItemId: item.stock_item_id,
            stockItemName: item.stock_item_name || item.item_name || '',
            quantity: item.quantity,
            unitPrice: Number(item.unit_price),
            totalPrice: Number(item.total_price),
            packSize: item.pack_size || undefined,
            qtyInStrips: item.qty_in_strips || undefined,
            qtyInTabs: item.qty_in_tabs || undefined
          }));

        return {
          id: po.id,
          poNumber: po.po_number,
          supplier: po.supplier,
          orderDate: po.order_date,
          expectedDelivery: po.expected_delivery,
          status: po.status as 'Pending' | 'Received' | 'Cancelled',
          items: poItems,
          totalAmount: Number(po.total_amount),
          grnDate: po.grn_date || undefined,
          grnNumber: po.grn_number || undefined,
          invoiceNumber: po.invoice_number || undefined,
          invoiceDate: po.invoice_date || undefined,
          invoiceUrl: po.invoice_url || undefined,
          notes: po.notes || undefined,
          paymentStatus: (po.payment_status as 'Pending' | 'Partial' | 'Paid' | 'Overdue') || 'Pending',
          paymentDueDate: po.payment_due_date || undefined,
          paymentDate: po.payment_date || undefined,
          paymentAmount: po.payment_amount ? Number(po.payment_amount) : undefined,
          paymentNotes: po.payment_notes || undefined,
          poType: (po.po_type as 'Stock' | 'Service') || 'Stock',
          serviceDescription: po.service_description || undefined,
          serviceAmount: po.service_amount ? Number(po.service_amount) : undefined
        };
      });

      setPurchaseOrders(formattedOrders);
    } catch (error) {
      console.error('Error loading purchase orders:', error);
      toast({
        title: "Error",
        description: "Failed to load purchase orders",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const addPurchaseOrder = async (po: PurchaseOrder) => {
    const toDbDate = (label: string, value?: string, required = false) => {
      const v = value?.trim() || "";
      if (!v) {
        if (required) throw new Error(`${label} is required`);
        return null;
      }
      // Accept YYYY-MM-DD or any string parsable by Date
      if (/^\d{4}-\d{2}-\d{2}$/.test(v)) return v;
      const d = new Date(v);
      if (Number.isNaN(d.getTime())) throw new Error(`Invalid ${label}: ${value}`);
      return d.toISOString().slice(0, 10);
    };

    const toDbTimestamp = (label: string, value?: string) => {
      const v = value?.trim() || "";
      if (!v) return null;
      const d = new Date(v);
      if (Number.isNaN(d.getTime())) throw new Error(`Invalid ${label}: ${value}`);
      return d.toISOString();
    };

    try {
      const poType = po.poType || "Stock";
      if (poType === "Stock" && (!po.items || po.items.length === 0)) {
        throw new Error("Cannot create a Stock PO with 0 items");
      }

      const orderDate = toDbDate("PO Date", po.orderDate, true);
      const expectedDelivery = toDbDate("Expected Delivery", po.expectedDelivery, false);

      const { data: poData, error: poError } = await supabase
        .from('purchase_orders')
        .insert({
          po_number: po.poNumber,
          supplier: po.supplier,
          order_date: orderDate,
          expected_delivery: expectedDelivery,
          status: po.status,
          total_amount: po.totalAmount,
          grn_date: toDbTimestamp("GRN Date", po.grnDate),
          grn_number: po.grnNumber || null,
          invoice_number: po.invoiceNumber || null,
          invoice_date: po.invoiceDate || null,
          invoice_url: po.invoiceUrl || null,
          notes: po.notes || null,
          payment_status: po.paymentStatus || 'Pending',
          payment_due_date: toDbDate("Payment Due Date", po.paymentDueDate),
          payment_date: toDbDate("Payment Date", po.paymentDate),
          payment_amount: po.paymentAmount || null,
          payment_notes: po.paymentNotes || null,
          po_type: poType,
          service_description: po.serviceDescription || null,
          service_amount: po.serviceAmount || null
        })
        .select()
        .single();

      if (poError) throw poError;

      // Insert items (Stock POs only)
      if (poType === "Stock") {
        const itemsToInsert = po.items.map(item => ({
          purchase_order_id: poData.id,
          item_name: item.stockItemName,
          stock_item_id: item.stockItemId,
          stock_item_name: item.stockItemName,
          quantity: item.quantity,
          unit_price: item.unitPrice,
          total_price: item.totalPrice,
          total: item.totalPrice,
          pack_size: item.packSize || null,
          qty_in_strips: item.qtyInStrips || null,
          qty_in_tabs: item.qtyInTabs || null
        }));

        const { error: itemsError } = await supabase
          .from('purchase_order_items')
          .insert(itemsToInsert);

        if (itemsError) {
          // Roll back header insert to avoid creating an empty PO
          await supabase.from('purchase_orders').delete().eq('id', poData.id);
          throw itemsError;
        }
      }
    } catch (error: any) {
      console.error('Error adding purchase order:', error);
      toast({
        title: "Error",
        description: error?.message || "Failed to add purchase order",
        variant: "destructive"
      });
      throw error;
    }
  };

  const updatePurchaseOrder = async (id: string, updatedPO: PurchaseOrder) => {
    const toDbDate = (label: string, value?: string, required = false) => {
      const v = value?.trim() || "";
      if (!v) {
        if (required) throw new Error(`${label} is required`);
        return null;
      }
      if (/^\d{4}-\d{2}-\d{2}$/.test(v)) return v;
      const d = new Date(v);
      if (Number.isNaN(d.getTime())) throw new Error(`Invalid ${label}: ${value}`);
      return d.toISOString().slice(0, 10);
    };

    const toDbTimestamp = (label: string, value?: string) => {
      const v = value?.trim() || "";
      if (!v) return null;
      const d = new Date(v);
      if (Number.isNaN(d.getTime())) throw new Error(`Invalid ${label}: ${value}`);
      return d.toISOString();
    };

    try {
      const poType = updatedPO.poType || 'Stock';
      if (poType === 'Stock' && (!updatedPO.items || updatedPO.items.length === 0)) {
        // Critical guard to avoid accidentally wiping items
        throw new Error('Cannot update a Stock PO with 0 items');
      }

      // Fetch fresh state (authoritative) to reduce race-condition issues
      const { data: freshPo, error: freshPoError } = await supabase
        .from('purchase_orders')
        .select('id')
        .eq('id', id)
        .maybeSingle();

      if (freshPoError) throw freshPoError;
      if (!freshPo) throw new Error('Purchase order not found');

      // Backup existing items so we can restore if the insert fails
      const { data: existingItems, error: existingItemsError } = await supabase
        .from('purchase_order_items')
        .select('*')
        .eq('purchase_order_id', id);

      if (existingItemsError) throw existingItemsError;

      const { error: updateError } = await supabase
        .from('purchase_orders')
        .update({
          po_number: updatedPO.poNumber,
          supplier: updatedPO.supplier,
          order_date: toDbDate('PO Date', updatedPO.orderDate, true),
          expected_delivery: toDbDate('Expected Delivery', updatedPO.expectedDelivery, false),
          status: updatedPO.status,
          total_amount: updatedPO.totalAmount,
          grn_date: toDbTimestamp('GRN Date', updatedPO.grnDate),
          grn_number: updatedPO.grnNumber || null,
          invoice_number: updatedPO.invoiceNumber || null,
          invoice_date: updatedPO.invoiceDate || null,
          invoice_url: updatedPO.invoiceUrl || null,
          notes: updatedPO.notes || null,
          payment_status: updatedPO.paymentStatus || 'Pending',
          payment_due_date: toDbDate('Payment Due Date', updatedPO.paymentDueDate),
          payment_date: toDbDate('Payment Date', updatedPO.paymentDate),
          payment_amount: updatedPO.paymentAmount || null,
          payment_notes: updatedPO.paymentNotes || null,
          po_type: poType,
          service_description: updatedPO.serviceDescription || null,
          service_amount: updatedPO.serviceAmount || null
        })
        .eq('id', id);

      if (updateError) throw updateError;

      // Replace items (Stock POs only)
      if (poType === 'Stock') {
        const { error: deleteError } = await supabase
          .from('purchase_order_items')
          .delete()
          .eq('purchase_order_id', id);

        if (deleteError) throw deleteError;

        const itemsToInsert = updatedPO.items.map(item => ({
          purchase_order_id: id,
          item_name: item.stockItemName,
          stock_item_id: item.stockItemId,
          stock_item_name: item.stockItemName,
          quantity: item.quantity,
          unit_price: item.unitPrice,
          total_price: item.totalPrice,
          total: item.totalPrice,
          pack_size: item.packSize || null,
          qty_in_strips: item.qtyInStrips || null,
          qty_in_tabs: item.qtyInTabs || null
        }));

        const { error: itemsError } = await supabase
          .from('purchase_order_items')
          .insert(itemsToInsert);

        if (itemsError) {
          // Restore previous items so the PO doesn't end up empty
          if (existingItems && existingItems.length > 0) {
            await supabase.from('purchase_order_items').insert(existingItems);
          }
          throw itemsError;
        }
      }
    } catch (error: any) {
      console.error('Error updating purchase order:', error);
      toast({
        title: "Error",
        description: error?.message || "Failed to update purchase order",
        variant: "destructive"
      });
      throw error;
    }
  };

  const getPurchaseOrder = (id: string) => {
    return purchaseOrders.find(po => po.id === id);
  };

  const subscribe = (listener: () => void) => {
    // Legacy compatibility - not needed with real-time subscriptions
    return () => {};
  };

  return {
    purchaseOrders,
    loading,
    addPurchaseOrder,
    updatePurchaseOrder,
    getPurchaseOrder,
    subscribe
  };
}
