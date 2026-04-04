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

  // Get financial year suffix like "26-27" based on current date
  const getFinancialYearSuffix = (): string => {
    const now = new Date();
    const month = now.getMonth(); // 0-indexed (0=Jan, 3=Apr)
    const year = now.getFullYear() % 100; // last 2 digits
    if (month >= 3) {
      // April onwards: current year - next year
      return `${year}-${(year + 1).toString().padStart(2, '0')}`;
    } else {
      // Jan-Mar: previous year - current year
      return `${(year - 1).toString().padStart(2, '0')}-${year}`;
    }
  };

  const getNextPurchaseOrderNumber = async (): Promise<string> => {
    const fySuffix = getFinancialYearSuffix();
    const prefix = `NH/PO-${fySuffix}-`;
    
    // Query database for highest PO number with this FY prefix
    const { data, error } = await supabase
      .from('purchase_orders')
      .select('po_number')
      .like('po_number', `${prefix}%`)
      .order('po_number', { ascending: false })
      .limit(1);
    
    let nextNum = 1;
    if (!error && data && data.length > 0) {
      const lastNumber = data[0].po_number;
      const suffix = lastNumber.replace(prefix, '');
      const parsed = parseInt(suffix, 10);
      if (!isNaN(parsed)) {
        nextNum = parsed + 1;
      }
    }
    
    const paddedNumber = nextNum.toString().padStart(4, '0');
    return `${prefix}${paddedNumber}`;
  };

  const getNextGoodsReceiptNumber = async (): Promise<string> => {
    const fySuffix = getFinancialYearSuffix();
    const prefix = `NH/GRN-${fySuffix}-`;
    
    // Query database for highest GRN number with this FY prefix
    const { data, error } = await supabase
      .from('purchase_orders')
      .select('grn_number')
      .like('grn_number', `${prefix}%`)
      .not('grn_number', 'is', null)
      .order('grn_number', { ascending: false })
      .limit(1);
    
    let nextNum = 1;
    if (!error && data && data.length > 0 && data[0].grn_number) {
      const lastNumber = data[0].grn_number;
      const suffix = lastNumber.replace(prefix, '');
      const parsed = parseInt(suffix, 10);
      if (!isNaN(parsed)) {
        nextNum = parsed + 1;
      }
    }
    
    const paddedNumber = nextNum.toString().padStart(4, '0');
    return `${prefix}${paddedNumber}`;
  };

  const getNextInvoiceNumber = async (): Promise<string> => {
    const fySuffix = getFinancialYearSuffix();
    const prefix = `NH/INV-${fySuffix}-`;
    
    // Query database for highest invoice number with this FY prefix
    const { data, error } = await supabase
      .from('invoices')
      .select('invoice_number')
      .like('invoice_number', `${prefix}%`)
      .order('invoice_number', { ascending: false })
      .limit(1);
    
    let nextNum = 1;
    if (!error && data && data.length > 0 && data[0].invoice_number) {
      const suffix = data[0].invoice_number.replace(prefix, '');
      const parsed = parseInt(suffix, 10);
      if (!isNaN(parsed)) {
        nextNum = parsed + 1;
      }
    }
    
    const paddedNumber = nextNum.toString().padStart(4, '0');
    return `${prefix}${paddedNumber}`;
  };

  // Legacy function - kept for backward compatibility
  const getNextGoodsReceiptNumberLegacy = (): string => {
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