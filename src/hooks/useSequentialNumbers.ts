import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface SequentialNumbers {
  purchaseOrder: number;
  invoice: number;
  goodsReceipt: number;
  prescription: number;
}

const STORAGE_KEY = 'sequential_numbers';

const getInitialNumbers = (): SequentialNumbers => {
  const defaults = {
    purchaseOrder: 1,
    invoice: 1,
    goodsReceipt: 1,
    prescription: 1
  };
  
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored) {
    try {
      const parsed = JSON.parse(stored);
      // Merge with defaults to ensure all fields exist
      return {
        ...defaults,
        ...parsed
      };
    } catch {
      return defaults;
    }
  }
  return defaults;
};

let sequentialStore = getInitialNumbers();

export const useSequentialNumbers = () => {
  const [numbers, setNumbers] = useState<SequentialNumbers>(sequentialStore);

  useEffect(() => {
    // Sync with localStorage whenever numbers change
    localStorage.setItem(STORAGE_KEY, JSON.stringify(numbers));
    sequentialStore = numbers;
  }, [numbers]);

  const getNextPurchaseOrderNumber = async (): Promise<string> => {
    const now = new Date();
    const year = now.getFullYear();
    const month = (now.getMonth() + 1).toString().padStart(2, '0');
    const day = now.getDate().toString().padStart(2, '0');
    const datePrefix = `PO${year}${month}${day}`;
    
    // Query database for highest PO number with today's date prefix
    const { data, error } = await supabase
      .from('purchase_orders')
      .select('po_number')
      .like('po_number', `${datePrefix}%`)
      .order('po_number', { ascending: false })
      .limit(1);
    
    let nextNum = 1;
    if (!error && data && data.length > 0) {
      const lastNumber = data[0].po_number;
      const suffix = lastNumber.replace(datePrefix, '');
      const parsed = parseInt(suffix, 10);
      if (!isNaN(parsed)) {
        nextNum = parsed + 1;
      }
    }
    
    const paddedNumber = nextNum.toString().padStart(3, '0');
    return `${datePrefix}${paddedNumber}`;
  };

  const getNextInvoiceNumber = (): string => {
    const now = new Date();
    const year = now.getFullYear();
    const month = (now.getMonth() + 1).toString().padStart(2, '0');
    const day = now.getDate().toString().padStart(2, '0');
    const paddedNumber = sequentialStore.invoice.toString().padStart(3, '0');
    const invoiceNumber = `INV${year}${month}${day}${paddedNumber}`;
    
    // Increment for next use
    const newNumbers = {
      ...sequentialStore,
      invoice: sequentialStore.invoice + 1
    };
    setNumbers(newNumbers);
    
    return invoiceNumber;
  };

  const getNextGoodsReceiptNumber = (): string => {
    const now = new Date();
    const year = now.getFullYear();
    const month = (now.getMonth() + 1).toString().padStart(2, '0');
    const day = now.getDate().toString().padStart(2, '0');
    const paddedNumber = sequentialStore.goodsReceipt.toString().padStart(3, '0');
    const grnNumber = `GRN${year}${month}${day}${paddedNumber}`;
    
    // Increment for next use
    const newNumbers = {
      ...sequentialStore,
      goodsReceipt: sequentialStore.goodsReceipt + 1
    };
    setNumbers(newNumbers);
    
    return grnNumber;
  };

  const generatePrescriptionNumber = async (): Promise<string> => {
    const now = new Date();
    const year = now.getFullYear();
    const month = (now.getMonth() + 1).toString().padStart(2, '0');
    const day = now.getDate().toString().padStart(2, '0');
    const datePrefix = `RX${year}${month}${day}`;
    
    // Query database for highest prescription number with today's date prefix
    const { data, error } = await supabase
      .from('prescriptions')
      .select('prescription_number')
      .like('prescription_number', `${datePrefix}%`)
      .order('prescription_number', { ascending: false })
      .limit(1);
    
    let nextNum = 1;
    if (!error && data && data.length > 0) {
      // Extract the numeric suffix from the last prescription number
      const lastNumber = data[0].prescription_number;
      const suffix = lastNumber.replace(datePrefix, '');
      const parsed = parseInt(suffix, 10);
      if (!isNaN(parsed)) {
        nextNum = parsed + 1;
      }
    }
    
    const paddedNumber = nextNum.toString().padStart(3, '0');
    return `${datePrefix}${paddedNumber}`;
  };

  const resetCounters = () => {
    const resetNumbers = {
      purchaseOrder: 1,
      invoice: 1,
      goodsReceipt: 1,
      prescription: 1
    };
    setNumbers(resetNumbers);
  };

  return {
    numbers,
    getNextPurchaseOrderNumber,
    getNextInvoiceNumber,
    getNextGoodsReceiptNumber,
    generatePrescriptionNumber,
    resetCounters
  };
};