import { useState, useEffect, useCallback } from "react";
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
  isActive?: boolean;
}

// Global cache - persists across component mounts
let globalStockCache: StockItem[] = [];
let stockCacheTimestamp: number = 0;
let isStockLoading = false;
let stockLoadPromise: Promise<StockItem[]> | null = null;

const STOCK_CACHE_DURATION = 2 * 60 * 1000; // 2 minutes (shorter since stock changes more frequently)

async function fetchAllStockItems(): Promise<StockItem[]> {
  const { data, error } = await supabase
    .from('stock_items')
    .select('*')
    .order('name', { ascending: true });

  if (error) throw error;

  return (data || []).map(item => ({
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
    packing: item.packing || undefined,
    isActive: item.is_active !== false
  }));
}

// Preload function - call early to warm cache
export function preloadStockItems() {
  if (globalStockCache.length === 0 && !isStockLoading) {
    isStockLoading = true;
    stockLoadPromise = fetchAllStockItems().then(data => {
      globalStockCache = data;
      stockCacheTimestamp = Date.now();
      isStockLoading = false;
      stockLoadPromise = null;
      return data;
    }).catch(err => {
      isStockLoading = false;
      stockLoadPromise = null;
      throw err;
    });
  }
  return stockLoadPromise;
}

export function useStockStore() {
  const [stockItems, setStockItems] = useState<StockItem[]>(globalStockCache);
  const [loading, setLoading] = useState(globalStockCache.length === 0);

  const loadStockItems = useCallback(async (force = false) => {
    const now = Date.now();
    const cacheValid = globalStockCache.length > 0 && (now - stockCacheTimestamp) < STOCK_CACHE_DURATION;

    // Return cached data if valid and not forcing refresh
    if (cacheValid && !force) {
      setStockItems(globalStockCache);
      setLoading(false);
      return globalStockCache;
    }

    // If already loading, wait for existing promise
    if (isStockLoading && stockLoadPromise) {
      try {
        const data = await stockLoadPromise;
        setStockItems(data);
        setLoading(false);
        return data;
      } catch {
        setLoading(false);
        return globalStockCache;
      }
    }

    // Start new load
    isStockLoading = true;
    setLoading(true);

    try {
      const data = await fetchAllStockItems();
      globalStockCache = data;
      stockCacheTimestamp = Date.now();
      setStockItems(data);
      return data;
    } catch (error) {
      console.error('Error loading stock items:', error);
      toast({
        title: "Error",
        description: "Failed to load stock items",
        variant: "destructive"
      });
      return globalStockCache;
    } finally {
      isStockLoading = false;
      stockLoadPromise = null;
      setLoading(false);
    }
  }, []);

  // Load on mount - immediate if no cache
  useEffect(() => {
    // If we have cached data, use it immediately
    if (globalStockCache.length > 0) {
      setStockItems(globalStockCache);
      setLoading(false);
      
      // Refresh in background if cache is stale
      const now = Date.now();
      if ((now - stockCacheTimestamp) >= STOCK_CACHE_DURATION) {
        loadStockItems(true);
      }
    } else {
      // No cache - load immediately (not deferred)
      loadStockItems();
    }
    
    // Subscribe to real-time changes for cache invalidation
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
          // Invalidate cache and reload
          globalStockCache = [];
          stockCacheTimestamp = 0;
          loadStockItems(true);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadStockItems]);

  const invalidateCache = useCallback(() => {
    globalStockCache = [];
    stockCacheTimestamp = 0;
  }, []);

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
          packing: item.packing || null,
          is_active: item.isActive !== false
        });

      if (error) throw error;
      invalidateCache();
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
          packing: updatedItem.packing || null,
          is_active: updatedItem.isActive !== false
        })
        .eq('item_id', id);

      if (error) throw error;
      invalidateCache();
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
      
      // Update local cache optimistically
      globalStockCache = globalStockCache.map(i => 
        i.id === id ? { ...i, currentStock: newStock } : i
      );
      setStockItems(globalStockCache);
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
      
      // Update local cache optimistically
      globalStockCache = globalStockCache.map(i => 
        i.id === id ? { ...i, currentStock: newStock } : i
      );
      setStockItems(globalStockCache);
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
    const existingBatch = stockItems.find(
      item => item.name.toLowerCase() === itemName.toLowerCase() && 
              item.batchNo.toLowerCase() === batchNo.toLowerCase()
    );

    if (existingBatch) {
      return { stockItemId: existingBatch.id, isNew: false };
    }

    const templateItem = stockItems.find(
      item => item.name.toLowerCase() === itemName.toLowerCase()
    );

    if (!templateItem) {
      throw new Error(`No template item found for: ${itemName}`);
    }

    const { data, error } = await supabase
      .from('stock_items')
      .insert({
        name: templateItem.name,
        category: templateItem.category,
        current_stock: 0,
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
    invalidateCache();

    return { stockItemId: data.item_id, isNew: true };
  };

  const isValidExpiryDate = (date?: string): boolean => {
    if (!date || date === 'N/A' || date.trim() === '') return false;
    const parsed = new Date(date);
    return !isNaN(parsed.getTime());
  };

  const getGroupedByMedicine = () => {
    const groups: Record<string, StockItem[]> = {};
    
    stockItems.forEach(item => {
      const key = item.name.toLowerCase();
      if (!groups[key]) {
        groups[key] = [];
      }
      groups[key].push(item);
    });

    Object.keys(groups).forEach(key => {
      groups[key].sort((a, b) => {
        const aValid = isValidExpiryDate(a.expiryDate);
        const bValid = isValidExpiryDate(b.expiryDate);
        if (!aValid && !bValid) return 0;
        if (!aValid) return 1;
        if (!bValid) return -1;
        return new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime();
      });
    });

    return groups;
  };

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

  const getBatchesForMedicine = (medicineName: string) => {
    return stockItems
      .filter(item => item.name.toLowerCase() === medicineName.toLowerCase())
      .sort((a, b) => {
        const aValid = isValidExpiryDate(a.expiryDate);
        const bValid = isValidExpiryDate(b.expiryDate);
        if (!aValid && !bValid) return 0;
        if (!aValid) return 1;
        if (!bValid) return -1;
        return new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime();
      });
  };

  const getMedicines = () => stockItems;

  const getStockItem = (id: number) => stockItems.find(item => item.id === id);

  const subscribe = (listener: () => void) => () => {};

  const forceRefresh = useCallback(() => {
    globalStockCache = [];
    stockCacheTimestamp = 0;
    loadStockItems(true);
  }, [loadStockItems]);

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
    subscribe,
    invalidateCache,
    forceRefresh
  };
}