import { useState, useEffect } from 'react';

interface SequentialNumbers {
  purchaseOrder: number;
  invoice: number;
  goodsReceipt: number;
}

const STORAGE_KEY = 'sequential_numbers';

const getInitialNumbers = (): SequentialNumbers => {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored) {
    return JSON.parse(stored);
  }
  return {
    purchaseOrder: 1,
    invoice: 1,
    goodsReceipt: 1
  };
};

let sequentialStore = getInitialNumbers();

export const useSequentialNumbers = () => {
  const [numbers, setNumbers] = useState<SequentialNumbers>(sequentialStore);

  useEffect(() => {
    // Sync with localStorage whenever numbers change
    localStorage.setItem(STORAGE_KEY, JSON.stringify(numbers));
    sequentialStore = numbers;
  }, [numbers]);

  const getNextPurchaseOrderNumber = (): string => {
    const currentYear = new Date().getFullYear();
    const paddedNumber = sequentialStore.purchaseOrder.toString().padStart(4, '0');
    const poNumber = `PO${currentYear}${paddedNumber}`;
    
    // Increment for next use
    const newNumbers = {
      ...sequentialStore,
      purchaseOrder: sequentialStore.purchaseOrder + 1
    };
    setNumbers(newNumbers);
    
    return poNumber;
  };

  const getNextInvoiceNumber = (): string => {
    const currentYear = new Date().getFullYear();
    const paddedNumber = sequentialStore.invoice.toString().padStart(4, '0');
    const invoiceNumber = `INV${currentYear}${paddedNumber}`;
    
    // Increment for next use
    const newNumbers = {
      ...sequentialStore,
      invoice: sequentialStore.invoice + 1
    };
    setNumbers(newNumbers);
    
    return invoiceNumber;
  };

  const getNextGoodsReceiptNumber = (): string => {
    const currentYear = new Date().getFullYear();
    const paddedNumber = sequentialStore.goodsReceipt.toString().padStart(4, '0');
    const grnNumber = `GRN${currentYear}${paddedNumber}`;
    
    // Increment for next use
    const newNumbers = {
      ...sequentialStore,
      goodsReceipt: sequentialStore.goodsReceipt + 1
    };
    setNumbers(newNumbers);
    
    return grnNumber;
  };

  const resetCounters = () => {
    const resetNumbers = {
      purchaseOrder: 1,
      invoice: 1,
      goodsReceipt: 1
    };
    setNumbers(resetNumbers);
  };

  return {
    numbers,
    getNextPurchaseOrderNumber,
    getNextInvoiceNumber,
    getNextGoodsReceiptNumber,
    resetCounters
  };
};