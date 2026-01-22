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

  /**
   * Finds an existing batch by name + batch number, or creates a new stock item if batch doesn't exist.
   * Used during GRN processing for batch-wise stock tracking.
   * @returns The stock item ID (existing or newly created)
   */
  const findOrCreateBatch = async (
    itemName: string,
    batchNo: string,
    grnItemData: {
      expiryDate?: string;
      costPrice?: number;
      mrp?: number;
      receivedQuantity: number;
    }
  ): Promise<{ stockItemId: number; isNew: boolean }> => {
    // Find existing item with same name and batch number
    const existingBatch = stockItems.find(
      item => item.name.toLowerCase() === itemName.toLowerCase() && 
              item.batchNo.toLowerCase() === batchNo.toLowerCase()
    );

    if (existingBatch) {
      return { stockItemId: existingBatch.id, isNew: false };
    }

    // Find any existing item with same name to copy base data
    const templateItem = stockItems.find(
      item => item.name.toLowerCase() === itemName.toLowerCase()
    );

    if (!templateItem) {
      throw new Error(`No template item found for: ${itemName}`);
    }

    // Create new stock item for this batch
    const { data, error } = await supabase
      .from('stock_items')
      .insert({
        name: templateItem.name,
        category: templateItem.category,
        current_stock: 0, // Will be updated by GRN processing
        minimum_stock: templateItem.minimumStock,
        unit_price: grnItemData.costPrice || templateItem.unitPrice,
        mrp: grnItemData.mrp || templateItem.mrp || null,
        supplier: templateItem.supplier,
        expiry_date: grnItemData.expiryDate || templateItem.expiryDate,
        batch_no: batchNo,
        status: templateItem.status || null,
        composition: templateItem.composition || null,
        packing: templateItem.packing || null
      })
      .select('item_id')
      .single();

    if (error) throw error;

    return { stockItemId: data.item_id, isNew: true };
  };

  /**
   * Groups stock items by medicine name for batch-wise display
   */
  const getGroupedByMedicine = () => {
    const groups: Record<string, StockItem[]> = {};
    
    stockItems.forEach(item => {
      const key = item.name.toLowerCase();
      if (!groups[key]) {
        groups[key] = [];
      }
      groups[key].push(item);
    });

    // Sort batches within each group by expiry date (FIFO)
    Object.keys(groups).forEach(key => {
      groups[key].sort((a, b) => {
        if (!a.expiryDate && !b.expiryDate) return 0;
        if (!a.expiryDate) return 1;
        if (!b.expiryDate) return -1;
        return new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime();
      });
    });

    return groups;
  };

  /**
   * Gets unique medicine names (for Item Master grouped view)
   */
  const getUniqueMedicines = () => {
    const seen = new Set<string>();
    const unique: StockItem[] = [];
    
    stockItems.forEach(item => {
      const key = item.name.toLowerCase();
      if (!seen.has(key)) {
        seen.add(key);
        unique.push(item);
      }
    });
    
    return unique.sort((a, b) => a.name.localeCompare(b.name));
  };

  /**
   * Gets all batches for a specific medicine name
   */
  const getBatchesForMedicine = (medicineName: string) => {
    return stockItems
      .filter(item => item.name.toLowerCase() === medicineName.toLowerCase())
      .sort((a, b) => {
        if (!a.expiryDate && !b.expiryDate) return 0;
        if (!a.expiryDate) return 1;
        if (!b.expiryDate) return -1;
        return new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime();
      });
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
    findOrCreateBatch,
    getGroupedByMedicine,
    getUniqueMedicines,
    getBatchesForMedicine,
    getMedicines,
    getStockItem,
    subscribe
  };
}
