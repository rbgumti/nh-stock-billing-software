import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

export interface PurchaseOrderItem {
  stockItemId: number;
  stockItemName: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

export interface PurchaseOrder {
  id: number;
  poNumber: string;
  supplier: string;
  orderDate: string;
  expectedDelivery: string;
  status: 'Pending' | 'Received' | 'Cancelled';
  items: PurchaseOrderItem[];
  totalAmount: number;
  grnDate?: string;
  notes?: string;
  // Payment tracking fields
  paymentStatus?: 'Pending' | 'Partial' | 'Paid' | 'Overdue';
  paymentDueDate?: string;
  paymentDate?: string;
  paymentAmount?: number;
  paymentNotes?: string;
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
            stockItemName: item.stock_item_name,
            quantity: item.quantity,
            unitPrice: Number(item.unit_price),
            totalPrice: Number(item.total_price)
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
          notes: po.notes || undefined,
          paymentStatus: (po.payment_status as 'Pending' | 'Partial' | 'Paid' | 'Overdue') || 'Pending',
          paymentDueDate: po.payment_due_date || undefined,
          paymentDate: po.payment_date || undefined,
          paymentAmount: po.payment_amount ? Number(po.payment_amount) : undefined,
          paymentNotes: po.payment_notes || undefined
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
          notes: po.notes || null,
          payment_status: po.paymentStatus || 'Pending',
          payment_due_date: po.paymentDueDate || null,
          payment_date: po.paymentDate || null,
          payment_amount: po.paymentAmount || null,
          payment_notes: po.paymentNotes || null
        })
        .select()
        .single();

      if (poError) throw poError;

      // Insert items
      const itemsToInsert = po.items.map(item => ({
        purchase_order_id: poData.id,
        stock_item_id: item.stockItemId,
        stock_item_name: item.stockItemName,
        quantity: item.quantity,
        unit_price: item.unitPrice,
        total_price: item.totalPrice
      }));

      const { error: itemsError } = await supabase
        .from('purchase_order_items')
        .insert(itemsToInsert);

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

  const updatePurchaseOrder = async (id: number, updatedPO: PurchaseOrder) => {
    try {
      const { error: updateError } = await supabase
        .from('purchase_orders')
        .update({
          po_number: updatedPO.poNumber,
          supplier: updatedPO.supplier,
          order_date: updatedPO.orderDate,
          expected_delivery: updatedPO.expectedDelivery,
          status: updatedPO.status,
          total_amount: updatedPO.totalAmount,
          grn_date: updatedPO.grnDate || null,
          notes: updatedPO.notes || null,
          payment_status: updatedPO.paymentStatus || 'Pending',
          payment_due_date: updatedPO.paymentDueDate || null,
          payment_date: updatedPO.paymentDate || null,
          payment_amount: updatedPO.paymentAmount || null,
          payment_notes: updatedPO.paymentNotes || null
        })
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
        quantity: item.quantity,
        unit_price: item.unitPrice,
        total_price: item.totalPrice
      }));

      const { error: itemsError } = await supabase
        .from('purchase_order_items')
        .insert(itemsToInsert);

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

  const getPurchaseOrder = (id: number) => {
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
