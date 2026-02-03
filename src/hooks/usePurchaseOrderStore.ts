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
            stockItemId: (item as any).stock_item_id || 0,
            stockItemName: (item as any).stock_item_name || item.item_name || '',
            quantity: item.quantity,
            unitPrice: Number(item.unit_price),
            totalPrice: Number((item as any).total_price) || Number(item.total),
            packSize: (item as any).pack_size || undefined,
            qtyInStrips: (item as any).qty_in_strips || undefined,
            qtyInTabs: (item as any).qty_in_tabs || undefined
          }));

        return {
          id: po.id,
          poNumber: po.po_number || '',
          supplier: (po as any).supplier || po.supplier_name || '',
          orderDate: po.order_date,
          expectedDelivery: (po as any).expected_delivery || po.expected_delivery_date || '',
          status: po.status as 'Pending' | 'Received' | 'Cancelled',
          items: poItems,
          totalAmount: Number((po as any).total_amount) || Number(po.total) || 0,
          grnDate: po.grn_date || undefined,
          grnNumber: po.grn_number || undefined,
          invoiceNumber: po.invoice_number || undefined,
          invoiceDate: po.invoice_date || undefined,
          invoiceUrl: (po as any).invoice_url || undefined,
          notes: po.notes || undefined,
          paymentStatus: (po.payment_status as 'Pending' | 'Partial' | 'Paid' | 'Overdue') || 'Pending',
          paymentDueDate: po.payment_due_date || undefined,
          paymentDate: po.payment_date || undefined,
          paymentAmount: po.payment_amount ? Number(po.payment_amount) : undefined,
          paymentNotes: po.payment_notes || undefined,
          poType: ((po as any).po_type as 'Stock' | 'Service') || 'Stock',
          serviceDescription: (po as any).service_description || undefined,
          serviceAmount: (po as any).service_amount ? Number((po as any).service_amount) : undefined
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
    try {
      const { data: poData, error: poError } = await supabase
        .from('purchase_orders')
        .insert({
          po_number: po.poNumber,
          supplier: po.supplier,
          order_date: po.orderDate,
          expected_delivery: po.expectedDelivery,
          status: po.status,
          total_amount: po.totalAmount,
          grn_date: po.grnDate || null,
          grn_number: po.grnNumber || null,
          invoice_number: po.invoiceNumber || null,
          invoice_date: po.invoiceDate || null,
          invoice_url: po.invoiceUrl || null,
          notes: po.notes || null,
          payment_status: po.paymentStatus || 'Pending',
          payment_due_date: po.paymentDueDate || null,
          payment_date: po.paymentDate || null,
          payment_amount: po.paymentAmount || null,
          payment_notes: po.paymentNotes || null,
          po_type: po.poType || 'Stock',
          service_description: po.serviceDescription || null,
          service_amount: po.serviceAmount || null
        })
        .select()
        .single();

      if (poError) throw poError;

      // Insert items
      const itemsToInsert = po.items.map(item => ({
        purchase_order_id: poData.id,
        stock_item_id: item.stockItemId,
        stock_item_name: item.stockItemName,
        item_name: item.stockItemName,
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
        .insert(itemsToInsert as any);

      if (itemsError) throw itemsError;
    } catch (error) {
      console.error('Error adding purchase order:', error);
      toast({
        title: "Error",
        description: "Failed to add purchase order",
        variant: "destructive"
      });
      throw error;
    }
  };

  const updatePurchaseOrder = async (id: string, updatedPO: PurchaseOrder) => {
    try {
      const { error: updateError } = await supabase
        .from('purchase_orders')
        .update({
          po_number: updatedPO.poNumber,
          supplier: updatedPO.supplier,
          supplier_name: updatedPO.supplier,
          order_date: updatedPO.orderDate,
          expected_delivery: updatedPO.expectedDelivery,
          expected_delivery_date: updatedPO.expectedDelivery,
          status: updatedPO.status,
          total_amount: updatedPO.totalAmount,
          total: updatedPO.totalAmount,
          grn_date: updatedPO.grnDate || null,
          grn_number: updatedPO.grnNumber || null,
          invoice_number: updatedPO.invoiceNumber || null,
          invoice_date: updatedPO.invoiceDate || null,
          invoice_url: updatedPO.invoiceUrl || null,
          notes: updatedPO.notes || null,
          payment_status: updatedPO.paymentStatus || 'Pending',
          payment_due_date: updatedPO.paymentDueDate || null,
          payment_date: updatedPO.paymentDate || null,
          payment_amount: updatedPO.paymentAmount || null,
          payment_notes: updatedPO.paymentNotes || null,
          po_type: updatedPO.poType || 'Stock',
          service_description: updatedPO.serviceDescription || null,
          service_amount: updatedPO.serviceAmount || null
        } as any)
        .eq('id', id);

      if (updateError) throw updateError;

      // Delete existing items
      const { error: deleteError } = await supabase
        .from('purchase_order_items')
        .delete()
        .eq('purchase_order_id', id);

      if (deleteError) throw deleteError;

      // Insert updated items
      const itemsToInsert = updatedPO.items.map(item => ({
        purchase_order_id: id,
        stock_item_id: item.stockItemId,
        stock_item_name: item.stockItemName,
        item_name: item.stockItemName,
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
        .insert(itemsToInsert as any);

      if (itemsError) throw itemsError;
    } catch (error) {
      console.error('Error updating purchase order:', error);
      toast({
        title: "Error",
        description: "Failed to update purchase order",
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
