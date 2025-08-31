import { useState } from "react";

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
}

const initialPurchaseOrders: PurchaseOrder[] = [];

let purchaseOrderStore: PurchaseOrder[] = [...initialPurchaseOrders];
let listeners: (() => void)[] = [];

export function usePurchaseOrderStore() {
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>(purchaseOrderStore);

  const addPurchaseOrder = (po: PurchaseOrder) => {
    purchaseOrderStore = [...purchaseOrderStore, po];
    notifyListeners();
  };

  const updatePurchaseOrder = (id: number, updatedPO: PurchaseOrder) => {
    purchaseOrderStore = purchaseOrderStore.map(po => 
      po.id === id ? updatedPO : po
    );
    notifyListeners();
  };

  const getPurchaseOrder = (id: number) => {
    return purchaseOrderStore.find(po => po.id === id);
  };

  const notifyListeners = () => {
    listeners.forEach(listener => listener());
    setPurchaseOrders([...purchaseOrderStore]);
  };

  const subscribe = (listener: () => void) => {
    listeners.push(listener);
    return () => {
      listeners = listeners.filter(l => l !== listener);
    };
  };

  return {
    purchaseOrders,
    addPurchaseOrder,
    updatePurchaseOrder,
    getPurchaseOrder,
    subscribe
  };
}