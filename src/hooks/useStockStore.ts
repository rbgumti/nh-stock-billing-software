import { useState } from "react";

export interface StockItem {
  id: number;
  name: string;
  category: string;
  currentStock: number;
  minimumStock: number;
  unitPrice: number;
  supplier: string;
  expiryDate: string;
  batchNo: string;
  status?: string;
}

const initialStockItems: StockItem[] = [
  {
    id: 1,
    name: "Paracetamol 500mg",
    category: "Medication",
    currentStock: 120,
    minimumStock: 50,
    unitPrice: 0.25,
    supplier: "MedSupply Co.",
    expiryDate: "2024-12-15",
    batchNo: "PAR001",
    status: "In Stock"
  },
  {
    id: 2,
    name: "Amoxicillin 250mg",
    category: "Medication",  
    currentStock: 85,
    minimumStock: 30,
    unitPrice: 0.75,
    supplier: "PharmaCorp",
    expiryDate: "2025-03-20",
    batchNo: "AMX002",
    status: "In Stock"
  },
  {
    id: 3,
    name: "Ibuprofen 400mg",
    category: "Medication",
    currentStock: 95,
    minimumStock: 40,
    unitPrice: 0.50,
    supplier: "MedSupply Co.",
    expiryDate: "2024-11-30",
    batchNo: "IBU003",
    status: "In Stock"
  },
  {
    id: 4,
    name: "Cough Syrup 100ml",
    category: "Medication",
    currentStock: 45,
    minimumStock: 20,
    unitPrice: 3.50,
    supplier: "Healthcare Plus",
    expiryDate: "2025-01-15",
    batchNo: "CSY004",
    status: "In Stock"
  },
  {
    id: 5,
    name: "Insulin Pen",
    category: "Medication",
    currentStock: 25,
    minimumStock: 20,
    unitPrice: 12.00,
    supplier: "PharmaCorp",
    expiryDate: "2024-08-10",
    batchNo: "INS005",
    status: "In Stock"
  },
  {
    id: 6,
    name: "Disposable Syringes (10ml)",
    category: "Medical Supplies",
    currentStock: 200,
    minimumStock: 100,
    unitPrice: 0.15,
    supplier: "Healthcare Plus",
    expiryDate: "2025-06-30",
    batchNo: "SYR006",
    status: "In Stock"
  }
];

let stockStore: StockItem[] = [...initialStockItems];
let listeners: (() => void)[] = [];

export function useStockStore() {
  const [stockItems, setStockItems] = useState<StockItem[]>(stockStore);

  const addStockItem = (item: StockItem) => {
    stockStore = [...stockStore, item];
    notifyListeners();
  };

  const updateStockItem = (id: number, updatedItem: StockItem) => {
    stockStore = stockStore.map(item => 
      item.id === id ? updatedItem : item
    );
    notifyListeners();
  };

  const reduceStock = (id: number, quantity: number) => {
    stockStore = stockStore.map(item => 
      item.id === id 
        ? { ...item, currentStock: Math.max(0, item.currentStock - quantity) }
        : item
    );
    notifyListeners();
  };

  const getMedicines = () => {
    return stockStore.filter(item => item.category === "Medication");
  };

  const getStockItem = (id: number) => {
    return stockStore.find(item => item.id === id);
  };

  const notifyListeners = () => {
    listeners.forEach(listener => listener());
    setStockItems([...stockStore]);
  };

  const subscribe = (listener: () => void) => {
    listeners.push(listener);
    return () => {
      listeners = listeners.filter(l => l !== listener);
    };
  };

  return {
    stockItems,
    addStockItem,
    updateStockItem,
    reduceStock,
    getMedicines,
    getStockItem,
    subscribe
  };
}