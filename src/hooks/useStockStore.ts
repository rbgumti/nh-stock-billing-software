import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

export interface StockItem {
  id: number;
  name: string;
  category: string;
  currentStock: number;
  minimumStock: number;
  unitPrice: number;
  mrp?: number;
  supplier: string;
  expiryDate: string;
  batchNo: string;
  status?: string;
  composition?: string;
  packing?: string;
}

export function useStockStore() {
  const [stockItems, setStockItems] = useState<StockItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStockItems();
    
    // Subscribe to real-time changes
    const channel = supabase
      .channel('stock-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'stock_items'
        },
        () => {
          loadStockItems();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const loadStockItems = async () => {
    try {
      const { data, error } = await supabase
        .from('stock_items')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      const formattedItems: StockItem[] = (data || []).map(item => ({
        id: item.item_id,
        name: item.name,
        category: item.category,
        currentStock: item.current_stock,
        minimumStock: item.minimum_stock,
        unitPrice: item.unit_price,
        mrp: item.mrp || undefined,
        supplier: item.supplier,
        expiryDate: item.expiry_date,
        batchNo: item.batch_no,
        status: item.status || undefined,
        composition: item.composition || undefined,
        packing: item.packing || undefined
      }));

      setStockItems(formattedItems);
    } catch (error) {
      console.error('Error loading stock items:', error);
      toast({
        title: "Error",
        description: "Failed to load stock items",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const addStockItem = async (item: StockItem) => {
    try {
      const { error } = await supabase
        .from('stock_items')
        .insert({
          name: item.name,
          category: item.category,
          current_stock: item.currentStock,
          minimum_stock: item.minimumStock,
          unit_price: item.unitPrice,
          mrp: item.mrp || null,
          supplier: item.supplier,
          expiry_date: item.expiryDate,
          batch_no: item.batchNo,
          status: item.status || null,
          composition: item.composition || null,
          packing: item.packing || null
        });

      if (error) throw error;
    } catch (error) {
      console.error('Error adding stock item:', error);
      toast({
        title: "Error",
        description: "Failed to add stock item",
        variant: "destructive"
      });
      throw error;
    }
  };

  const updateStockItem = async (id: number, updatedItem: StockItem) => {
    try {
      const { error } = await supabase
        .from('stock_items')
        .update({
          name: updatedItem.name,
          category: updatedItem.category,
          current_stock: updatedItem.currentStock,
          minimum_stock: updatedItem.minimumStock,
          unit_price: updatedItem.unitPrice,
          mrp: updatedItem.mrp || null,
          supplier: updatedItem.supplier,
          expiry_date: updatedItem.expiryDate,
          batch_no: updatedItem.batchNo,
          status: updatedItem.status || null,
          composition: updatedItem.composition || null,
          packing: updatedItem.packing || null
        })
        .eq('item_id', id);

      if (error) throw error;
    } catch (error) {
      console.error('Error updating stock item:', error);
      toast({
        title: "Error",
        description: "Failed to update stock item",
        variant: "destructive"
      });
      throw error;
    }
  };

  const reduceStock = async (id: number, quantity: number) => {
    try {
      const item = stockItems.find(item => item.id === id);
      if (!item) return;

      const newStock = Math.max(0, item.currentStock - quantity);
      
      const { error } = await supabase
        .from('stock_items')
        .update({ current_stock: newStock })
        .eq('item_id', id);

      if (error) throw error;
    } catch (error) {
      console.error('Error reducing stock:', error);
      toast({
        title: "Error",
        description: "Failed to reduce stock",
        variant: "destructive"
      });
      throw error;
    }
  };

  const increaseStock = async (id: number, quantity: number) => {
    try {
      const item = stockItems.find(item => item.id === id);
      if (!item) return;

      const newStock = item.currentStock + quantity;
      
      const { error } = await supabase
        .from('stock_items')
        .update({ current_stock: newStock })
        .eq('item_id', id);

      if (error) throw error;
    } catch (error) {
      console.error('Error increasing stock:', error);
      toast({
        title: "Error",
        description: "Failed to increase stock",
        variant: "destructive"
      });
      throw error;
    }
  };

  const getMedicines = () => {
    // Return all stock items as medicines (categories are BNX, TPN, PSHY, etc.)
    return stockItems;
  };

  const getStockItem = (id: number) => {
    return stockItems.find(item => item.id === id);
  };

  const subscribe = (listener: () => void) => {
    // Legacy compatibility - not needed with real-time subscriptions
    return () => {};
  };

  return {
    stockItems,
    loading,
    addStockItem,
    updateStockItem,
    reduceStock,
    increaseStock,
    getMedicines,
    getStockItem,
    subscribe
  };
}
