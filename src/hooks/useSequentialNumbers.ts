import { useState, useEffect } from 'react';

interface SequentialNumbers {
  purchaseOrder: number;
  invoice: number;
  goodsReceipt: number;
  prescription: number;
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
    goodsReceipt: 1,
    prescription: 1
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
    const now = new Date();
    const year = now.getFullYear();
    const month = (now.getMonth() + 1).toString().padStart(2, '0');
    const day = now.getDate().toString().padStart(2, '0');
    const paddedNumber = sequentialStore.purchaseOrder.toString().padStart(3, '0');
    const poNumber = `PO${year}${month}${day}${paddedNumber}`;
    
    // Increment for next use
    const newNumbers = {
      ...sequentialStore,
      purchaseOrder: sequentialStore.purchaseOrder + 1
    };
    setNumbers(newNumbers);
    
    return poNumber;
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

  const generatePrescriptionNumber = (): string => {
    const now = new Date();
    const year = now.getFullYear();
    const month = (now.getMonth() + 1).toString().padStart(2, '0');
    const day = now.getDate().toString().padStart(2, '0');
    const paddedNumber = sequentialStore.prescription.toString().padStart(3, '0');
    const rxNumber = `RX${year}${month}${day}${paddedNumber}`;
    
    // Increment for next use
    const newNumbers = {
      ...sequentialStore,
      prescription: sequentialStore.prescription + 1
    };
    setNumbers(newNumbers);
    
    return rxNumber;
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