import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Download, Calendar, Loader2, Check, RefreshCw, ToggleLeft, ToggleRight, Save, FileSpreadsheet, FileText, ChevronDown, CalendarRange, Trash2, Plus, Wallet } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DateRangeExportDialog } from "./DateRangeExportDialog";
import { format as formatDateFns } from "date-fns";
import { useStockStore } from "@/hooks/useStockStore";
import { useSalaryStore } from "@/hooks/useSalaryStore";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import { formatLocalISODate } from "@/lib/dateUtils";
import { formatNumber, roundTo2 } from "@/lib/formatUtils";

interface MedicineReportItem {
  brand: string;
  category: string;
  qtySold: number;
  rate: number;
  amount: number;
  opening: number;
  liveStock: number;
  stockReceived: number;
  closing: number;
  isFromSnapshot: boolean;
}

interface CashDenomination {
  denomination: number;
  count: number;
  amount: number;
}

interface ExpenseItem {
  description: string;
  amount: number;
}

interface AdvanceItem {
  employeeId: string;
  employeeName: string;
  amount: number;
}

export default function DayReport() {
  const { stockItems } = useStockStore();
  const { employees } = useSalaryStore();
  const [reportDate, setReportDate] = useState(() => formatLocalISODate());
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);
  const [reportId, setReportId] = useState<string | null>(null);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [medicineDataUpdated, setMedicineDataUpdated] = useState<Date | null>(null);
  const [isRefreshingMedicine, setIsRefreshingMedicine] = useState(false);
  const [isRefreshingPrevCash, setIsRefreshingPrevCash] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [showDateRangeExport, setShowDateRangeExport] = useState(false);
  
  // Patient counts
  const [newPatients, setNewPatients] = useState(0);
  const [followUpPatients, setFollowUpPatients] = useState(0);
  
  // Medicine data by category (BNX, TPN, PSHY)
  const [bnxMedicines, setBnxMedicines] = useState<MedicineReportItem[]>([]);
  const [tpnMedicines, setTpnMedicines] = useState<MedicineReportItem[]>([]);
  const [pshyMedicines, setPshyMedicines] = useState<MedicineReportItem[]>([]);
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const [showLiveStock, setShowLiveStock] = useState(false);
  
  // Cash management
  const [cashPreviousDay, setCashPreviousDay] = useState(0);
  // looseBalance removed per user request
  const [depositInBank, setDepositInBank] = useState(0);
  const [paytmGpay, setPaytmGpay] = useState(0);
  const [cashHandoverAmarjeet, setCashHandoverAmarjeet] = useState(0);
  const [cashHandoverMandeep, setCashHandoverMandeep] = useState(0);
  const [cashHandoverSir, setCashHandoverSir] = useState(0);
  const [adjustments, setAdjustments] = useState(0);
  
  // Pharmacy sale section
  const [tapentadolPatients, setTapentadolPatients] = useState(0);
  const [psychiatryPatients, setPsychiatryPatients] = useState(0);
  const [fees, setFees] = useState(0);
  const [labCollection, setLabCollection] = useState(0);
  const [psychiatryCollection, setPsychiatryCollection] = useState(0);
  
  // Expenses
  const [expenses, setExpenses] = useState<ExpenseItem[]>([
    { description: "", amount: 0 }
  ]);
  
  // Employee Advances
  const [advances, setAdvances] = useState<AdvanceItem[]>([]);
  
  // Cash denominations
  const [cashDetails, setCashDetails] = useState<CashDenomination[]>([
    { denomination: 500, count: 0, amount: 0 },
    { denomination: 200, count: 0, amount: 0 },
    { denomination: 100, count: 0, amount: 0 },
    { denomination: 50, count: 0, amount: 0 },
    { denomination: 20, count: 0, amount: 0 },
    { denomination: 10, count: 0, amount: 0 },
    { denomination: 5, count: 0, amount: 0 },
    { denomination: 2, count: 0, amount: 0 },
    { denomination: 1, count: 0, amount: 0 },
  ]);

  // Helper function to calculate cash left in hand for a given report
  const calculateCashLeftInHand = (report: any, bnxAmt: number, tpnAmt: number, pshyAmt: number) => {
    const prevDayCash = Number(report.cash_previous_day) || 0;
    const depositBank = Number(report.deposit_in_bank) || 0;
    const paytm = Number(report.paytm_gpay) || 0;
    const handoverA = Number(report.cash_handover_amarjeet) || 0;
    const handoverM = Number(report.cash_handover_mandeep) || 0;
    const handoverS = Number(report.cash_handover_sir) || 0;
    const adj = Number(report.adjustments) || 0;
    const feesAmt = Number(report.fees) || 0;
    const labAmt = Number(report.lab_collection) || 0;
    const expensesArr = (report.expenses as ExpenseItem[]) || [];
    const totalExp = expensesArr.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
    
    const totalSaleAmt = bnxAmt + tpnAmt + pshyAmt + feesAmt + labAmt;
    const todaysColl = totalSaleAmt;
    
    return prevDayCash + todaysColl - totalExp - depositBank - paytm - handoverA - handoverM - handoverS + adj;
  };

  const fetchPreviousDayCashLeftInHand = async (currentDate: string): Promise<number> => {
    try {
      // Calculate previous day date
      const current = new Date(currentDate);
      current.setDate(current.getDate() - 1);
      const previousDate = formatLocalISODate(current);

      // Fetch previous day's report
      const { data: prevReport, error } = await supabase
        .from('day_reports')
        .select('*')
        .eq('report_date', previousDate)
        .maybeSingle();

      if (error || !prevReport) return 0;

      // We need to calculate the medicine totals for the previous day
      // Get invoice items for the previous date
      const { data: invoiceData } = await supabase
        .from('invoices')
        .select('id, invoice_date')
        .like('invoice_date', `${previousDate}%`);

      const invoiceIds = invoiceData?.map(inv => inv.id) || [];

      let soldAmountsByCategory: Record<string, number> = { BNX: 0, TPN: 0, PSHY: 0 };

      if (invoiceIds.length > 0) {
        const { data: invoiceItems } = await supabase
          .from('invoice_items')
          .select('medicine_id, medicine_name, quantity, mrp, unit_price')
          .in('invoice_id', invoiceIds);

        // Get stock items to map medicine categories
        const medicineIds = [...new Set((invoiceItems || []).map(it => it.medicine_id))];
        
        if (medicineIds.length > 0) {
          const { data: stockItemsData } = await supabase
            .from('stock_items')
            .select('item_id, category, mrp, unit_price')
            .in('item_id', medicineIds);

          const stockItemMap = new Map((stockItemsData || []).map(s => [s.item_id, s]));

          (invoiceItems || []).forEach((it) => {
            const stockItem = stockItemMap.get(it.medicine_id);
            const category = stockItem?.category?.toUpperCase() || 'BNX';
            const price = it.mrp || it.unit_price || stockItem?.mrp || stockItem?.unit_price || 0;
            const amount = it.quantity * price;
            
            if (category === 'BNX' || category === 'TPN' || category === 'PSHY') {
              soldAmountsByCategory[category] += amount;
            } else {
              soldAmountsByCategory['BNX'] += amount; // Default to BNX
            }
          });
        }
      }

      return calculateCashLeftInHand(
        prevReport, 
        soldAmountsByCategory['BNX'], 
        soldAmountsByCategory['TPN'], 
        soldAmountsByCategory['PSHY']
      );
    } catch (error) {
      console.error('Error fetching previous day cash:', error);
      return 0;
    }
  };

  const loadSavedReport = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('day_reports')
        .select('*')
        .eq('report_date', reportDate)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setReportId(data.id);
        setNewPatients(data.new_patients || 0);
        setFollowUpPatients(data.follow_up_patients || 0);
        setCashPreviousDay(Number(data.cash_previous_day) || 0);
        // looseBalance removed
        setDepositInBank(Number(data.deposit_in_bank) || 0);
        setPaytmGpay(Number(data.paytm_gpay) || 0);
        setCashHandoverAmarjeet(Number(data.cash_handover_amarjeet) || 0);
        setCashHandoverMandeep(Number(data.cash_handover_mandeep) || 0);
        setCashHandoverSir(Number(data.cash_handover_sir) || 0);
        setAdjustments(Number(data.adjustments) || 0);
        setTapentadolPatients(data.tapentadol_patients || 0);
        setPsychiatryPatients(data.psychiatry_patients || 0);
        setFees(Number(data.fees) || 0);
        setLabCollection(Number(data.lab_collection) || 0);
        setPsychiatryCollection(Number(data.psychiatry_collection) || 0);
        
        if (data.cash_denominations) {
          setCashDetails(data.cash_denominations as unknown as CashDenomination[]);
        }
        if (data.expenses && Array.isArray(data.expenses) && data.expenses.length > 0) {
          setExpenses(data.expenses as unknown as ExpenseItem[]);
        } else {
          setExpenses([{ description: "", amount: 0 }]);
        }
        // Load advances from the report
        if ((data as any).advances && Array.isArray((data as any).advances)) {
          setAdvances((data as any).advances as AdvanceItem[]);
        } else {
          setAdvances([]);
        }
      } else {
        // Reset to defaults for new date
        setReportId(null);
        setNewPatients(0);
        setFollowUpPatients(0);
        
        // Fetch previous day's cash left in hand for the new report
        const previousDayCash = await fetchPreviousDayCashLeftInHand(reportDate);
        setCashPreviousDay(previousDayCash);
        
        // looseBalance removed
        setDepositInBank(0);
        setPaytmGpay(0);
        setCashHandoverAmarjeet(0);
        setCashHandoverMandeep(0);
        setCashHandoverSir(0);
        setAdjustments(0);
        setTapentadolPatients(0);
        setPsychiatryPatients(0);
        setFees(0);
        setLabCollection(0);
        setPsychiatryCollection(0);
        setCashDetails([
          { denomination: 500, count: 0, amount: 0 },
          { denomination: 200, count: 0, amount: 0 },
          { denomination: 100, count: 0, amount: 0 },
          { denomination: 50, count: 0, amount: 0 },
          { denomination: 20, count: 0, amount: 0 },
          { denomination: 10, count: 0, amount: 0 },
          { denomination: 5, count: 0, amount: 0 },
          { denomination: 2, count: 0, amount: 0 },
          { denomination: 1, count: 0, amount: 0 },
        ]);
        setExpenses([{ description: "", amount: 0 }]);
        setAdvances([]);
      }
    } catch (error) {
      console.error('Error loading report:', error);
    } finally {
      setLoading(false);
    }
  }, [reportDate]);

  const saveReport = async () => {
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const reportData = {
        report_date: reportDate,
        new_patients: newPatients,
        follow_up_patients: followUpPatients,
        cash_previous_day: cashPreviousDay,
        loose_balance: 0, // kept for DB compatibility but not used
        deposit_in_bank: depositInBank,
        paytm_gpay: paytmGpay,
        cash_handover_amarjeet: cashHandoverAmarjeet,
        cash_handover_mandeep: cashHandoverMandeep,
        cash_handover_sir: cashHandoverSir,
        adjustments: adjustments,
        tapentadol_patients: tapentadolPatients,
        psychiatry_patients: psychiatryPatients,
        fees: fees,
        lab_collection: labCollection,
        psychiatry_collection: psychiatryCollection,
        cash_denominations: JSON.parse(JSON.stringify(cashDetails)),
        expenses: JSON.parse(JSON.stringify(expenses.filter(e => e.description || e.amount > 0))),
        advances: JSON.parse(JSON.stringify(advances.filter(a => a.employeeId && a.amount > 0))),
        created_by: user?.id,
      };

      if (reportId) {
        const { error } = await supabase
          .from('day_reports')
          .update(reportData)
          .eq('id', reportId);
        if (error) throw error;
        toast.success('Report updated successfully');
      } else {
        const { data, error } = await supabase
          .from('day_reports')
          .insert(reportData)
          .select()
          .single();
      if (error) throw error;
        setReportId(data.id);
        toast.success('Report saved successfully');
      }
      setLastSaved(new Date());
      setHasUnsavedChanges(false);
    } catch (error: any) {
      console.error('Error saving report:', error);
      toast.error('Failed to save report: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  // Track unsaved changes
  useEffect(() => {
    setHasUnsavedChanges(true);
  }, [newPatients, followUpPatients, cashPreviousDay, depositInBank,
      paytmGpay, cashHandoverAmarjeet, cashHandoverMandeep, cashHandoverSir, adjustments,
      tapentadolPatients, psychiatryPatients, fees, labCollection, psychiatryCollection,
      cashDetails, expenses, advances]);

  useEffect(() => {
    loadSavedReport().then(() => {
      setHasUnsavedChanges(false);
    });
  }, [loadSavedReport]);

  useEffect(() => {
    loadMedicineData();
  }, [stockItems, reportDate]);

  // Normalize medicine names so batches with minor naming differences (extra spaces, NBSP)
  // don’t create duplicate rows in reports.
  const normalizeMedicineName = (name: string) =>
    (name || "")
      .replace(/\u00A0/g, " ")
      .replace(/\s+/g, " ")
      .trim();

  // Real-time subscriptions for invoices and purchase orders
  useEffect(() => {
    const channel = supabase
      .channel('day-report-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'invoices' }, () => {
        loadMedicineData();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'invoice_items' }, () => {
        loadMedicineData();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'purchase_orders' }, () => {
        loadMedicineData();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'purchase_order_items' }, () => {
        loadMedicineData();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [reportDate, stockItems]);

  const loadMedicineData = async () => {
    setIsRefreshingMedicine(true);
    try {
      // Get the day report's stock_snapshot for opening stock at 00:00 IST
      const { data: dayReportData } = await supabase
        .from('day_reports')
        .select('stock_snapshot')
        .eq('report_date', reportDate)
        .maybeSingle();

      const stockSnapshot: Record<string, { opening?: number; sold?: number; closing?: number }> = 
        (dayReportData?.stock_snapshot as Record<string, { opening?: number; sold?: number; closing?: number }>) || {};

      // Snapshot keys are stored by medicine name. Normalize once so lookups match even if
      // the current stock item names have extra spaces.
      const normalizedSnapshot: Record<string, { opening?: number; sold?: number; closing?: number }> = {};
      Object.entries(stockSnapshot).forEach(([name, val]) => {
        normalizedSnapshot[normalizeMedicineName(name).toLowerCase()] = val;
      });

      // Get invoice items for the selected date
      const { data: invoiceData } = await supabase
        .from('invoices')
        .select('id, invoice_date')
        .like('invoice_date', `${reportDate}%`);

      const invoiceIds = invoiceData?.map(inv => inv.id) || [];

      // Aggregate sold quantities by medicine NAME only (not by batch ID)
      // This prevents double-counting when a medicine has multiple batches
      let soldQuantitiesByName: Record<string, number> = {};

      if (invoiceIds.length > 0) {
        const { data: invoiceItems } = await supabase
          .from('invoice_items')
          .select('medicine_id, medicine_name, quantity')
          .in('invoice_id', invoiceIds);

        (invoiceItems || []).forEach((it) => {
          // Always aggregate by medicine name to avoid batch-level duplication
          const key = normalizeMedicineName(it.medicine_name).toLowerCase();
          soldQuantitiesByName[key] = (soldQuantitiesByName[key] || 0) + it.quantity;
        });
      }

      // Get stock received from GRN - also aggregate by name
      const { data: grnOrders } = await supabase
        .from('purchase_orders')
        .select('id')
        .like('grn_date', `${reportDate}%`)
        .eq('status', 'Received');

      const grnOrderIds = grnOrders?.map(po => po.id) || [];

      let receivedQuantitiesByName: Record<string, number> = {};

      if (grnOrderIds.length > 0) {
        const { data: poItems } = await supabase
          .from('purchase_order_items')
          .select('stock_item_id, stock_item_name, quantity')
          .in('purchase_order_id', grnOrderIds);

        (poItems || []).forEach((it) => {
          const key = normalizeMedicineName(it.stock_item_name).toLowerCase();
          receivedQuantitiesByName[key] = (receivedQuantitiesByName[key] || 0) + it.quantity;
        });
      }

      // Group stock items by medicine name to avoid duplicate entries for multiple batches
      const medicineGroups: Record<string, { 
        name: string; 
        category: string; 
        totalStock: number; 
        mrp: number; 
        unitPrice: number;
      }> = {};

      stockItems.forEach(item => {
        const normalizedName = normalizeMedicineName(item.name);
        const key = normalizedName.toLowerCase();
        if (!medicineGroups[key]) {
          medicineGroups[key] = {
            name: normalizedName,
            category: item.category.toUpperCase(),
            totalStock: 0,
            mrp: item.mrp || item.unitPrice,
            unitPrice: item.unitPrice,
          };
        }
        // Sum stock across all batches
        medicineGroups[key].totalStock += item.currentStock;
        // Use highest MRP if different batches have different prices
        if (item.mrp && item.mrp > medicineGroups[key].mrp) {
          medicineGroups[key].mrp = item.mrp;
        }
      });

      // Create medicine data grouped by medicine name (not by batch)
      const createMedicineData = (): MedicineReportItem[] => {
        return Object.values(medicineGroups)
          .map(medicine => {
            const lookupKey = normalizeMedicineName(medicine.name).toLowerCase();
            const sold = soldQuantitiesByName[lookupKey] ?? 0;
            const received = receivedQuantitiesByName[lookupKey] ?? 0;
            // Use opening from stock_snapshot (captured at 00:01 IST), fallback to current total stock
            const snapshotData = normalizedSnapshot[lookupKey];
            const isFromSnapshot = snapshotData?.opening !== undefined;
            const opening = isFromSnapshot ? snapshotData.opening : medicine.totalStock;
            const liveStock = medicine.totalStock;
            const closing = opening - sold + received;
            const rate = medicine.mrp || medicine.unitPrice;

            return {
              brand: medicine.name,
              qtySold: sold,
              rate,
              amount: sold * rate,
              opening,
              liveStock,
              stockReceived: received,
              closing,
              isFromSnapshot,
              category: medicine.category,
            };
          })
          .filter(item => item.opening > 0 || item.qtySold > 0 || item.stockReceived > 0 || item.isFromSnapshot);
      };

      const allMedicineData = createMedicineData();
      
      // Categorize by actual category field (BNX, TPN, PSHY)
      setBnxMedicines(allMedicineData.filter(m => m.category === 'BNX'));
      setTpnMedicines(allMedicineData.filter(m => m.category === 'TPN'));
      setPshyMedicines(allMedicineData.filter(m => m.category === 'PSHY'));
      setMedicineDataUpdated(new Date());
    } finally {
      setIsRefreshingMedicine(false);
    }
  };

  const updateCashCount = (index: number, count: number) => {
    const updated = [...cashDetails];
    updated[index].count = count;
    updated[index].amount = count * updated[index].denomination;
    setCashDetails(updated);
  };

  const addExpense = () => {
    setExpenses([...expenses, { description: "", amount: 0 }]);
  };

  const updateExpense = (index: number, field: 'description' | 'amount', value: string | number) => {
    const updated = [...expenses];
    updated[index] = { ...updated[index], [field]: value };
    setExpenses(updated);
  };

  // Advance helpers
  const addAdvance = () => {
    setAdvances([...advances, { employeeId: "", employeeName: "", amount: 0 }]);
  };

  const updateAdvance = (index: number, field: 'employeeId' | 'amount', value: string | number) => {
    const updated = [...advances];
    if (field === 'employeeId') {
      const selectedEmployee = employees.find(e => e.id === value);
      updated[index] = { 
        ...updated[index], 
        employeeId: value as string,
        employeeName: selectedEmployee?.name || ""
      };
    } else {
      updated[index] = { ...updated[index], amount: value as number };
    }
    setAdvances(updated);
  };

  const removeAdvance = (index: number) => {
    setAdvances(advances.filter((_, i) => i !== index));
  };

  // Calculations
  const bnxTotal = bnxMedicines.reduce((sum, item) => sum + item.amount, 0);
  const tpnTotal = tpnMedicines.reduce((sum, item) => sum + item.amount, 0);
  const pshyTotal = pshyMedicines.reduce((sum, item) => sum + item.amount, 0);
  
  const totalExpenses = expenses.reduce((sum, item) => sum + item.amount, 0);
  const totalAdvances = advances.reduce((sum, item) => sum + item.amount, 0);
  const totalCash = cashDetails.reduce((sum, item) => sum + item.amount, 0);
  
  const totalSale = bnxTotal + tpnTotal + pshyTotal + fees + labCollection + psychiatryCollection;
  const todaysCollection = totalSale;
  const cashLeftInHand = cashPreviousDay + todaysCollection - totalExpenses - depositInBank - paytmGpay - cashHandoverAmarjeet - cashHandoverMandeep - cashHandoverSir + adjustments;
  
  const totalAsPerSheet = totalSale;
  const difference = totalAsPerSheet - totalCash - paytmGpay;

  const totalPatients = newPatients + followUpPatients;
  const totalCollection = fees + labCollection + psychiatryCollection;

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: '2-digit' });
  };

  const exportToExcel = (withColors: boolean = false) => {
    const workbook = XLSX.utils.book_new();
    
    // Helper to format numbers to 2 decimal places
    const fmt = (n: number) => Number(n.toFixed(2));

    const reportData: any[][] = [
      [formatDate(reportDate)],
      [],
      ['BNX Details:', '', '', '', '', '', '', '', 'Pharmacy Sale:'],
      ['New Patients', newPatients, '', '', '', '', '', 'Tapentadol Patients', tapentadolPatients],
      ['Follow up Patients', followUpPatients, '', '', '', '', '', 'Psychiatry Patients', psychiatryPatients],
      ['Total Patients', totalPatients, '', '', '', '', '', 'Fees', fmt(fees)],
      ['Brand', 'Qty sold', 'Rate', 'Amount', 'Opening', 'Stock Received', 'Closing', 'Lab Collection', fmt(labCollection)],
    ];

    bnxMedicines.forEach(m => {
      reportData.push([m.brand, m.qtySold, fmt(m.rate), fmt(m.amount), m.opening, m.stockReceived, m.closing]);
    });
    reportData.push(['BNX Total', '', '', fmt(bnxTotal)]);
    reportData.push([]);

    reportData.push(['Cash Management']);
    reportData.push(['Cash in Hand (Previous Day)', fmt(cashPreviousDay)]);
    reportData.push(["Today's Collection", fmt(todaysCollection)]);
    reportData.push(['Expenses', fmt(totalExpenses)]);
    reportData.push(['Deposit in Bank', fmt(depositInBank)]);
    reportData.push(['Paytm/GPay', fmt(paytmGpay)]);
    reportData.push(['Cash H/O to Amarjeet Sir', fmt(cashHandoverAmarjeet)]);
    reportData.push(['Cash H/O to Mandeep Sir', fmt(cashHandoverMandeep)]);
    reportData.push(['Cash H/O to Sir', fmt(cashHandoverSir)]);
    reportData.push(['Adjustments', fmt(adjustments)]);
    reportData.push(['Cash left in hand (Today)', fmt(cashLeftInHand)]);
    reportData.push([]);

    if (tpnMedicines.length > 0) {
      reportData.push(['TPN Medicines']);
      reportData.push(['Brand', 'Qty sold', 'Rate', 'Amount', 'Opening', 'Stock Received', 'Closing']);
      tpnMedicines.forEach(m => {
        reportData.push([m.brand, m.qtySold, fmt(m.rate), fmt(m.amount), m.opening, m.stockReceived, m.closing]);
      });
      reportData.push(['Total', '', '', fmt(tpnTotal)]);
      reportData.push([]);
    }

    if (pshyMedicines.length > 0) {
      reportData.push(['PSHY Medicines']);
      reportData.push(['Brand', 'Qty sold', 'Rate', 'Amount', 'Opening', 'Stock Received', 'Closing']);
      pshyMedicines.forEach(m => {
        reportData.push([m.brand, m.qtySold, fmt(m.rate), fmt(m.amount), m.opening, m.stockReceived, m.closing]);
      });
      reportData.push(['Total', '', '', fmt(pshyTotal)]);
      reportData.push([]);
    }

    reportData.push(['Summary']);
    reportData.push(['BNX Collection', fmt(bnxTotal)]);
    reportData.push(['TPN Collection', fmt(tpnTotal)]);
    reportData.push(['PSHY Collection', fmt(pshyTotal)]);
    reportData.push(['Fees', fmt(fees)]);
    reportData.push(['Lab Collection', fmt(labCollection)]);
    reportData.push(['Total Sale', fmt(totalSale)]);
    reportData.push([]);

    reportData.push(['CASH DETAILS']);
    reportData.push(['Denomination', 'Count', 'Amount']);
    cashDetails.forEach(c => {
      reportData.push([c.denomination, c.count, fmt(c.amount)]);
    });
    reportData.push(['TOTAL', '', fmt(totalCash)]);
    reportData.push(['TOTAL AS PER SHEET', '', fmt(totalAsPerSheet)]);
    reportData.push(['PAYTM', '', fmt(paytmGpay)]);
    reportData.push(['DIFFERENCE', '', fmt(difference)]);

    const sheet = XLSX.utils.aoa_to_sheet(reportData);
    
    // Apply colors if requested
    if (withColors) {
      // Set column widths
      sheet['!cols'] = [
        { wch: 25 }, { wch: 12 }, { wch: 10 }, { wch: 12 }, { wch: 12 }, { wch: 14 }, { wch: 12 }, { wch: 18 }, { wch: 15 }
      ];
    }
    
    XLSX.utils.book_append_sheet(workbook, sheet, 'Day Report');
    XLSX.writeFile(workbook, `Day_Report_${reportDate}${withColors ? '_Color' : ''}.xlsx`);
    toast.success(`Excel exported ${withColors ? 'with colors' : 'successfully'}`);
  };

  const exportDateRangeToExcel = async (startDate: Date, endDate: Date) => {
    const startDateStr = formatDateFns(startDate, 'yyyy-MM-dd');
    const endDateStr = formatDateFns(endDate, 'yyyy-MM-dd');
    const fmt = (n: number) => Number(n.toFixed(2));

    // Fetch day reports in date range
    const { data: dayReports, error } = await supabase
      .from('day_reports')
      .select('*')
      .gte('report_date', startDateStr)
      .lte('report_date', endDateStr)
      .order('report_date', { ascending: true });

    if (error) throw error;

    if (!dayReports || dayReports.length === 0) {
      toast.error('No day reports found for the selected date range');
      return;
    }

    // Get invoices in date range for medicine data
    const { data: invoiceData } = await supabase
      .from('invoices')
      .select('id, invoice_date')
      .gte('invoice_date', startDateStr)
      .lte('invoice_date', endDateStr);

    const invoiceIds = invoiceData?.map(inv => inv.id) || [];

    // Get stock items for category mapping
    const { data: allStockItems } = await supabase
      .from('stock_items')
      .select('item_id, name, category, mrp, unit_price');

    const stockItemMap = new Map((allStockItems || []).map(s => [s.item_id, s]));

    let salesByCategory: Record<string, number> = { BNX: 0, TPN: 0, PSHY: 0 };

    if (invoiceIds.length > 0) {
      const { data: invoiceItems } = await supabase
        .from('invoice_items')
        .select('medicine_id, quantity, mrp, unit_price')
        .in('invoice_id', invoiceIds);

      (invoiceItems || []).forEach((it) => {
        const stockItem = stockItemMap.get(it.medicine_id);
        const category = stockItem?.category?.toUpperCase() || 'BNX';
        const price = it.mrp || it.unit_price || stockItem?.mrp || stockItem?.unit_price || 0;
        const amount = it.quantity * price;
        if (category === 'BNX' || category === 'TPN' || category === 'PSHY') {
          salesByCategory[category] += amount;
        } else {
          salesByCategory['BNX'] += amount;
        }
      });
    }

    const workbook = XLSX.utils.book_new();

    // Summary sheet with all day reports
    const summaryData: any[][] = [
      [`Day's Report Summary - ${formatDateFns(startDate, 'dd MMM yyyy')} to ${formatDateFns(endDate, 'dd MMM yyyy')}`],
      [],
      ['Date', 'New Patients', 'Follow-Up', 'Total Patients', 'Fees', 'Lab Collection', 'Cash Previous', 'Bank Deposit', 'Paytm/GPay', 'Adjustments', 'Total Expenses', 'Handover Amarjeet', 'Handover Mandeep', 'Handover Sir', 'Loose Balance'],
    ];

    let totalNewPatients = 0;
    let totalFollowUp = 0;
    let totalFees = 0;
    let totalLab = 0;
    let totalDeposit = 0;
    let totalPaytm = 0;
    let totalExpenses = 0;
    let totalHandoverAmarjeet = 0;
    let totalHandoverMandeep = 0;
    let totalHandoverSir = 0;
    let totalLooseBalance = 0;

    // Expense details for separate sheet
    const expenseDetails: any[][] = [
      [`Expense Details - ${formatDateFns(startDate, 'dd MMM yyyy')} to ${formatDateFns(endDate, 'dd MMM yyyy')}`],
      [],
      ['Date', 'Description', 'Amount'],
    ];

    dayReports.forEach(report => {
      const dateStr = new Date(report.report_date).toLocaleDateString('en-IN');
      const newP = report.new_patients || 0;
      const followP = report.follow_up_patients || 0;
      const handoverAmarjeet = Number(report.cash_handover_amarjeet) || 0;
      const handoverMandeep = Number(report.cash_handover_mandeep) || 0;
      const handoverSir = Number(report.cash_handover_sir) || 0;
      const looseBalance = Number(report.loose_balance) || 0;

      // Calculate total expenses for this day
      const expenses = (report.expenses as any[]) || [];
      const dayExpenseTotal = expenses.reduce((sum: number, exp: any) => sum + (Number(exp.amount) || 0), 0);

      // Add individual expenses to expense details sheet
      expenses.forEach((exp: any) => {
        if (exp.description && exp.amount) {
          expenseDetails.push([dateStr, exp.description, fmt(Number(exp.amount) || 0)]);
        }
      });

      totalNewPatients += newP;
      totalFollowUp += followP;
      totalFees += Number(report.fees) || 0;
      totalLab += Number(report.lab_collection) || 0;
      totalDeposit += Number(report.deposit_in_bank) || 0;
      totalPaytm += Number(report.paytm_gpay) || 0;
      totalExpenses += dayExpenseTotal;
      totalHandoverAmarjeet += handoverAmarjeet;
      totalHandoverMandeep += handoverMandeep;
      totalHandoverSir += handoverSir;
      totalLooseBalance += looseBalance;

      summaryData.push([
        dateStr,
        newP,
        followP,
        newP + followP,
        fmt(Number(report.fees) || 0),
        fmt(Number(report.lab_collection) || 0),
        fmt(Number(report.cash_previous_day) || 0),
        fmt(Number(report.deposit_in_bank) || 0),
        fmt(Number(report.paytm_gpay) || 0),
        fmt(Number(report.adjustments) || 0),
        fmt(dayExpenseTotal),
        fmt(handoverAmarjeet),
        fmt(handoverMandeep),
        fmt(handoverSir),
        fmt(looseBalance),
      ]);
    });

    summaryData.push([]);
    summaryData.push([
      'TOTAL',
      totalNewPatients,
      totalFollowUp,
      totalNewPatients + totalFollowUp,
      fmt(totalFees),
      fmt(totalLab),
      '',
      fmt(totalDeposit),
      fmt(totalPaytm),
      '',
      fmt(totalExpenses),
      fmt(totalHandoverAmarjeet),
      fmt(totalHandoverMandeep),
      fmt(totalHandoverSir),
      fmt(totalLooseBalance),
    ]);

    summaryData.push([]);
    summaryData.push(['Medicine Sales Summary']);
    summaryData.push(['Category', 'Total Sales']);
    summaryData.push(['BNX', fmt(salesByCategory['BNX'])]);
    summaryData.push(['TPN', fmt(salesByCategory['TPN'])]);
    summaryData.push(['PSHY', fmt(salesByCategory['PSHY'])]);
    summaryData.push(['GRAND TOTAL', fmt(salesByCategory['BNX'] + salesByCategory['TPN'] + salesByCategory['PSHY'])]);

    const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
    summarySheet['!cols'] = [
      { wch: 12 }, { wch: 14 }, { wch: 12 }, { wch: 14 }, { wch: 10 }, { wch: 14 }, { wch: 14 }, { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 14 }, { wch: 18 }, { wch: 18 }, { wch: 14 }, { wch: 14 }
    ];
    XLSX.utils.book_append_sheet(workbook, summarySheet, 'Summary');

    // Add expense details sheet if there are expenses
    if (expenseDetails.length > 3) {
      expenseDetails.push([]);
      expenseDetails.push(['TOTAL', '', fmt(totalExpenses)]);
      const expenseSheet = XLSX.utils.aoa_to_sheet(expenseDetails);
      expenseSheet['!cols'] = [{ wch: 12 }, { wch: 40 }, { wch: 12 }];
      XLSX.utils.book_append_sheet(workbook, expenseSheet, 'Expenses');
    }

    XLSX.writeFile(workbook, `Day_Reports_${startDateStr}_to_${endDateStr}.xlsx`);
    toast.success('Day reports exported successfully');
  };

  const exportToPDF = () => {
    try {
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 12;
      let y = 0;
      let pageNum = 1;
      const totalPages = 2;

      // Helper to format numbers to 2 decimal places
      const fmt = (n: number) => (n || 0).toFixed(2);

    // Helper to add page footer
    const addFooter = () => {
      pdf.setFillColor(248, 248, 248);
      pdf.rect(0, pageHeight - 12, pageWidth, 12, 'F');
      pdf.setDrawColor(212, 175, 55);
      pdf.setLineWidth(0.5);
      pdf.line(margin, pageHeight - 12, pageWidth - margin, pageHeight - 12);
      pdf.setTextColor(100, 100, 100);
      pdf.setFontSize(7);
      pdf.setFont('helvetica', 'normal');
      pdf.text('NAVJEEVAN HOSPITAL | De-Addiction & Rehabilitation Centre', margin, pageHeight - 5);
      pdf.text(`Page ${pageNum} of ${totalPages}`, pageWidth - margin, pageHeight - 5, { align: 'right' });
    };

    // Helper to draw rounded rect (simulated with filled rect)
    const drawCard = (x: number, yPos: number, w: number, h: number, bgColor: [number, number, number] = [255, 255, 255]) => {
      // Shadow effect
      pdf.setFillColor(230, 230, 230);
      pdf.rect(x + 1, yPos + 1, w, h, 'F');
      // Main card
      pdf.setFillColor(...bgColor);
      pdf.rect(x, yPos, w, h, 'F');
      // Border
      pdf.setDrawColor(220, 220, 220);
      pdf.setLineWidth(0.3);
      pdf.rect(x, yPos, w, h, 'S');
    };

    // ========== PAGE 1: BNX Details, Pharmacy Sale, Summary, Cash Management ==========
    
    // Gradient Header (simulated with multiple rects)
    pdf.setFillColor(0, 40, 80);
    pdf.rect(0, 0, pageWidth, 38, 'F');
    pdf.setFillColor(0, 51, 102);
    pdf.rect(0, 0, pageWidth, 32, 'F');
    
    // Gold accent line
    pdf.setFillColor(212, 175, 55);
    pdf.rect(0, 32, pageWidth, 2, 'F');
    
    // Header text
    pdf.setTextColor(255, 255, 255);
    pdf.setFontSize(20);
    pdf.setFont('helvetica', 'bold');
    pdf.text('NAVJEEVAN HOSPITAL', pageWidth / 2, 14, { align: 'center' });
    
    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(212, 175, 55);
    pdf.text('De-Addiction & Rehabilitation Centre', pageWidth / 2, 21, { align: 'center' });
    
    pdf.setTextColor(255, 255, 255);
    pdf.setFontSize(11);
    pdf.setFont('helvetica', 'bold');
    pdf.text(`Daily Report  •  ${formatDate(reportDate)}`, pageWidth / 2, 29, { align: 'center' });

    y = 46;

    // ===== Patient Statistics Section =====
    const cardWidth = (pageWidth - 2 * margin - 8) / 2;
    
    // BNX Details Card
    drawCard(margin, y, cardWidth, 38, [250, 252, 255]);
    
    // Card header with icon indicator
    pdf.setFillColor(59, 130, 246);
    pdf.rect(margin, y, cardWidth, 9, 'F');
    pdf.setTextColor(255, 255, 255);
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'bold');
    pdf.text('BNX PATIENT COUNT', margin + 4, y + 6.5);
    
    // Patient stats
    const bnxStatsY = y + 14;
    pdf.setTextColor(80, 80, 80);
    pdf.setFontSize(8);
    pdf.setFont('helvetica', 'normal');
    
    // New Patients
    pdf.setFillColor(220, 252, 231);
    pdf.rect(margin + 4, bnxStatsY, 36, 10, 'F');
    pdf.setTextColor(22, 163, 74);
    pdf.setFontSize(14);
    pdf.setFont('helvetica', 'bold');
    pdf.text(String(newPatients), margin + 22, bnxStatsY + 7, { align: 'center' });
    pdf.setFontSize(6);
    pdf.setFont('helvetica', 'normal');
    pdf.text('NEW', margin + 22, bnxStatsY + 12, { align: 'center' });
    
    // Follow-up Patients
    pdf.setFillColor(254, 243, 199);
    pdf.rect(margin + 44, bnxStatsY, 36, 10, 'F');
    pdf.setTextColor(180, 83, 9);
    pdf.setFontSize(14);
    pdf.setFont('helvetica', 'bold');
    pdf.text(String(followUpPatients), margin + 62, bnxStatsY + 7, { align: 'center' });
    pdf.setFontSize(6);
    pdf.setFont('helvetica', 'normal');
    pdf.text('FOLLOW-UP', margin + 62, bnxStatsY + 12, { align: 'center' });
    
    // Total
    pdf.setTextColor(0, 51, 102);
    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'bold');
    pdf.text(`Total: ${totalPatients} patients`, margin + 4, y + 35);

    // Pharmacy Sale Card
    const rightCardX = margin + cardWidth + 8;
    drawCard(rightCardX, y, cardWidth, 38, [255, 251, 250]);
    
    pdf.setFillColor(139, 92, 246);
    pdf.rect(rightCardX, y, cardWidth, 9, 'F');
    pdf.setTextColor(255, 255, 255);
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'bold');
    pdf.text('PHARMACY STATISTICS', rightCardX + 4, y + 6.5);
    
    // Pharmacy stats
    const pharmStatsY = y + 14;
    
    // Tapentadol
    pdf.setFillColor(254, 226, 226);
    pdf.rect(rightCardX + 4, pharmStatsY, 28, 10, 'F');
    pdf.setTextColor(220, 38, 38);
    pdf.setFontSize(12);
    pdf.setFont('helvetica', 'bold');
    pdf.text(String(tapentadolPatients), rightCardX + 18, pharmStatsY + 7, { align: 'center' });
    pdf.setFontSize(5);
    pdf.setFont('helvetica', 'normal');
    pdf.text('TAPENTADOL', rightCardX + 18, pharmStatsY + 12, { align: 'center' });
    
    // Psychiatry
    pdf.setFillColor(233, 213, 255);
    pdf.rect(rightCardX + 36, pharmStatsY, 28, 10, 'F');
    pdf.setTextColor(126, 34, 206);
    pdf.setFontSize(12);
    pdf.setFont('helvetica', 'bold');
    pdf.text(String(psychiatryPatients), rightCardX + 50, pharmStatsY + 7, { align: 'center' });
    pdf.setFontSize(5);
    pdf.setFont('helvetica', 'normal');
    pdf.text('PSYCHIATRY', rightCardX + 50, pharmStatsY + 12, { align: 'center' });
    
    // Fees
    pdf.setTextColor(0, 51, 102);
    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'bold');
    pdf.text(`Fees Collected: Rs.${fmt(fees)}`, rightCardX + 4, y + 35);

    y += 46;

    // ===== Revenue Summary Section =====
    drawCard(margin, y, pageWidth - 2 * margin, 58, [255, 255, 255]);
    
    // Section header
    pdf.setFillColor(212, 175, 55);
    pdf.rect(margin, y, pageWidth - 2 * margin, 9, 'F');
    pdf.setTextColor(0, 0, 0);
    pdf.setFontSize(11);
    pdf.setFont('helvetica', 'bold');
    pdf.text('REVENUE SUMMARY', margin + 4, y + 6.5);
    
    const summaryY = y + 14;
    const colWidth = (pageWidth - 2 * margin - 20) / 5;
    
    // Revenue cards
    const revenues = [
      { label: 'BNX', value: bnxTotal, color: [59, 130, 246] as [number, number, number], bg: [239, 246, 255] as [number, number, number] },
      { label: 'TPN', value: tpnTotal, color: [245, 158, 11] as [number, number, number], bg: [255, 251, 235] as [number, number, number] },
      { label: 'PSHY', value: pshyTotal, color: [139, 92, 246] as [number, number, number], bg: [245, 243, 255] as [number, number, number] },
      { label: 'Fees', value: fees, color: [22, 163, 74] as [number, number, number], bg: [240, 253, 244] as [number, number, number] },
      { label: 'Lab', value: labCollection, color: [100, 116, 139] as [number, number, number], bg: [248, 250, 252] as [number, number, number] },
    ];
    
    revenues.forEach((rev, idx) => {
      const cardX = margin + 4 + idx * (colWidth + 3);
      pdf.setFillColor(...rev.bg);
      pdf.rect(cardX, summaryY, colWidth, 24, 'F');
      
      // Color indicator bar
      pdf.setFillColor(...rev.color);
      pdf.rect(cardX, summaryY, colWidth, 3, 'F');
      
      // Label
      pdf.setTextColor(100, 100, 100);
      pdf.setFontSize(7);
      pdf.setFont('helvetica', 'bold');
      pdf.text(rev.label, cardX + colWidth / 2, summaryY + 10, { align: 'center' });
      
      // Value
      pdf.setTextColor(...rev.color);
      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'bold');
      pdf.text(`Rs.${fmt(rev.value)}`, cardX + colWidth / 2, summaryY + 18, { align: 'center' });
    });
    
    // Total Sale - highlighted bar
    const totalSaleY = summaryY + 30;
    pdf.setFillColor(0, 51, 102);
    pdf.rect(margin + 4, totalSaleY, pageWidth - 2 * margin - 8, 12, 'F');
    pdf.setTextColor(255, 255, 255);
    pdf.setFontSize(12);
    pdf.setFont('helvetica', 'bold');
    pdf.text('TOTAL SALE', margin + 10, totalSaleY + 8);
    pdf.setFontSize(14);
    pdf.text(`Rs.${fmt(totalSale)}`, pageWidth - margin - 10, totalSaleY + 8, { align: 'right' });

    y += 66;

    // ===== Cash Management Section =====
    const cashCardHeight = 82;
    drawCard(margin, y, (pageWidth - 2 * margin - 8) * 0.55, cashCardHeight, [255, 255, 255]);
    
    // Cash header
    pdf.setFillColor(0, 51, 102);
    pdf.rect(margin, y, (pageWidth - 2 * margin - 8) * 0.55, 9, 'F');
    pdf.setTextColor(255, 255, 255);
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'bold');
    pdf.text('CASH MANAGEMENT', margin + 4, y + 6.5);
    
    const cashY = y + 12;
    const cashItems = [
      { label: 'Cash Previous Day', value: cashPreviousDay, highlight: false },
      { label: "Today's Collection", value: todaysCollection, highlight: false },
      { label: 'Less: Expenses', value: -totalExpenses, highlight: false, negative: true },
      { label: 'Less: Bank Deposit', value: -depositInBank, highlight: false, negative: true },
      { label: 'Less: Paytm/GPay', value: -paytmGpay, highlight: false, negative: true },
      { label: 'H/O Amarjeet', value: -cashHandoverAmarjeet, highlight: false, negative: true },
      { label: 'H/O Mandeep', value: -cashHandoverMandeep, highlight: false, negative: true },
      { label: 'H/O Sir', value: -cashHandoverSir, highlight: false, negative: true },
      { label: 'Adjustments', value: adjustments, highlight: false },
    ];
    
    pdf.setFontSize(8);
    let cashRowY = cashY;
    cashItems.forEach((item, idx) => {
      if (idx % 2 === 0) {
        pdf.setFillColor(250, 250, 250);
        pdf.rect(margin + 2, cashRowY, (pageWidth - 2 * margin - 8) * 0.55 - 4, 6, 'F');
      }
      pdf.setTextColor(80, 80, 80);
      pdf.setFont('helvetica', 'normal');
      pdf.text(item.label, margin + 4, cashRowY + 4.5);
      
      const displayValue = Math.abs(item.value);
      const prefix = item.negative ? '- Rs.' : 'Rs.';
      pdf.setTextColor(item.negative ? 180 : 0, item.negative ? 0 : 100, item.negative ? 0 : 0);
      pdf.text(`${prefix}${fmt(displayValue)}`, margin + (pageWidth - 2 * margin - 8) * 0.55 - 6, cashRowY + 4.5, { align: 'right' });
      cashRowY += 6;
    });
    
    // Cash left in hand - final highlight
    cashRowY += 2;
    pdf.setFillColor(22, 163, 74);
    pdf.rect(margin + 2, cashRowY, (pageWidth - 2 * margin - 8) * 0.55 - 4, 10, 'F');
    pdf.setTextColor(255, 255, 255);
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'bold');
    pdf.text('Cash Left in Hand', margin + 6, cashRowY + 7);
    pdf.text(`Rs.${fmt(cashLeftInHand)}`, margin + (pageWidth - 2 * margin - 8) * 0.55 - 8, cashRowY + 7, { align: 'right' });

    // ===== Expenses & Cash Denominations Section =====
    const rightSectionX = margin + (pageWidth - 2 * margin - 8) * 0.55 + 8;
    const rightSectionWidth = (pageWidth - 2 * margin - 8) * 0.45;
    
    // Expenses card
    drawCard(rightSectionX, y, rightSectionWidth, 38, [255, 250, 250]);
    pdf.setFillColor(220, 38, 38);
    pdf.rect(rightSectionX, y, rightSectionWidth, 9, 'F');
    pdf.setTextColor(255, 255, 255);
    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'bold');
    pdf.text('EXPENSES', rightSectionX + 4, y + 6.5);
    
    let expenseY = y + 12;
    pdf.setFontSize(7);
    pdf.setFont('helvetica', 'normal');
    const displayExpenses = expenses.slice(0, 4);
    displayExpenses.forEach((exp) => {
      if (exp.description && exp.amount > 0) {
        pdf.setTextColor(80, 80, 80);
        pdf.text(exp.description.substring(0, 20), rightSectionX + 4, expenseY + 3);
        pdf.setTextColor(220, 38, 38);
        pdf.text(`Rs.${fmt(exp.amount)}`, rightSectionX + rightSectionWidth - 4, expenseY + 3, { align: 'right' });
        expenseY += 5;
      }
    });
    
    pdf.setFillColor(254, 226, 226);
    pdf.rect(rightSectionX + 2, y + 30, rightSectionWidth - 4, 6, 'F');
    pdf.setTextColor(180, 0, 0);
    pdf.setFontSize(8);
    pdf.setFont('helvetica', 'bold');
    pdf.text('Total Expenses', rightSectionX + 4, y + 34.5);
    pdf.text(`Rs.${fmt(totalExpenses)}`, rightSectionX + rightSectionWidth - 4, y + 34.5, { align: 'right' });
    
    // Cash Denominations Card
    const denomY = y + 42;
    drawCard(rightSectionX, denomY, rightSectionWidth, 40, [250, 252, 255]);
    pdf.setFillColor(59, 130, 246);
    pdf.rect(rightSectionX, denomY, rightSectionWidth, 8, 'F');
    pdf.setTextColor(255, 255, 255);
    pdf.setFontSize(8);
    pdf.setFont('helvetica', 'bold');
    pdf.text('CASH COUNT', rightSectionX + 4, denomY + 5.5);
    
    let denomRowY = denomY + 10;
    pdf.setFontSize(6);
    const denomCols = [rightSectionX + 4, rightSectionX + 22, rightSectionX + 40, rightSectionX + 58];
    
    cashDetails.filter(d => d.count > 0).slice(0, 8).forEach((denom, idx) => {
      const col = idx % 4;
      const row = Math.floor(idx / 4);
      const dx = denomCols[col];
      const dy = denomRowY + row * 10;
      
      pdf.setFillColor(240, 240, 240);
      pdf.rect(dx - 1, dy, 16, 8, 'F');
      pdf.setTextColor(60, 60, 60);
      pdf.setFont('helvetica', 'bold');
      pdf.text(`Rs.${denom.denomination}`, dx, dy + 3);
      pdf.setFont('helvetica', 'normal');
      pdf.text(`×${denom.count}`, dx, dy + 6.5);
    });
    
    // Sheet total at bottom
    pdf.setFillColor(59, 130, 246);
    pdf.rect(rightSectionX + 2, denomY + 32, rightSectionWidth - 4, 6, 'F');
    pdf.setTextColor(255, 255, 255);
    pdf.setFontSize(7);
    pdf.setFont('helvetica', 'bold');
    pdf.text('Sheet Total', rightSectionX + 4, denomY + 36);
    pdf.text(`Rs.${fmt(totalCash)}`, rightSectionX + rightSectionWidth - 4, denomY + 36, { align: 'right' });

    // Add footer to page 1
    addFooter();

    // ========== PAGE 2: Medicine Tables ==========
    pdf.addPage();
    pageNum = 2;
    y = 0;

    // Page 2 Header
    pdf.setFillColor(0, 40, 80);
    pdf.rect(0, 0, pageWidth, 22, 'F');
    pdf.setFillColor(0, 51, 102);
    pdf.rect(0, 0, pageWidth, 18, 'F');
    pdf.setFillColor(212, 175, 55);
    pdf.rect(0, 18, pageWidth, 2, 'F');
    
    pdf.setTextColor(255, 255, 255);
    pdf.setFontSize(14);
    pdf.setFont('helvetica', 'bold');
    pdf.text('MEDICINE DETAILS', pageWidth / 2, 12, { align: 'center' });
    
    y = 28;

    // Medicine tables helper with enhanced styling
    const drawMedicineTable = (medicines: MedicineReportItem[], title: string, headerColor: [number, number, number], lightBg: [number, number, number], total: number) => {
      if (medicines.length === 0) return;
      
      // Check if we need a new page
      if (y > 245) {
        addFooter();
        pdf.addPage();
        pageNum++;
        y = 15;
      }

      // Table title with colored bar
      pdf.setFillColor(...headerColor);
      pdf.rect(margin, y, pageWidth - 2 * margin, 8, 'F');
      pdf.setTextColor(255, 255, 255);
      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'bold');
      pdf.text(title.toUpperCase(), margin + 4, y + 5.5);
      
      // Item count badge
      pdf.setFillColor(255, 255, 255);
      pdf.rect(pageWidth - margin - 20, y + 1.5, 18, 5, 'F');
      pdf.setTextColor(...headerColor);
      pdf.setFontSize(7);
      pdf.text(`${medicines.length} items`, pageWidth - margin - 11, y + 5, { align: 'center' });
      
      y += 10;

      // Table header
      pdf.setFillColor(245, 245, 245);
      pdf.rect(margin, y, pageWidth - 2 * margin, 7, 'F');
      pdf.setDrawColor(200, 200, 200);
      pdf.setLineWidth(0.2);
      pdf.line(margin, y + 7, pageWidth - margin, y + 7);
      
      pdf.setTextColor(60, 60, 60);
      pdf.setFontSize(7);
      pdf.setFont('helvetica', 'bold');
      
      const cols = [margin + 3, margin + 58, margin + 76, margin + 96, margin + 118, margin + 142, margin + 164];
      pdf.text('MEDICINE NAME', cols[0], y + 5);
      pdf.text('QTY', cols[1], y + 5);
      pdf.text('RATE', cols[2], y + 5);
      pdf.text('AMOUNT', cols[3], y + 5);
      pdf.text('OPENING', cols[4], y + 5);
      pdf.text('RECEIVED', cols[5], y + 5);
      pdf.text('CLOSING', cols[6], y + 5);
      y += 8;

      // Table rows
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(7);
      medicines.forEach((m, idx) => {
        if (y > 270) {
          addFooter();
          pdf.addPage();
          pageNum++;
          y = 15;
        }
        
        if (idx % 2 === 0) {
          pdf.setFillColor(...lightBg);
          pdf.rect(margin, y - 0.5, pageWidth - 2 * margin, 5.5, 'F');
        }
        
        pdf.setTextColor(40, 40, 40);
        pdf.text(m.brand.substring(0, 32), cols[0], y + 3.5);
        
        pdf.setTextColor(0, 0, 0);
        pdf.setFont('helvetica', 'bold');
        pdf.text(String(m.qtySold), cols[1], y + 3.5);
        pdf.setFont('helvetica', 'normal');
        
        pdf.text(`Rs.${fmt(m.rate)}`, cols[2], y + 3.5);
        
        pdf.setTextColor(...headerColor);
        pdf.setFont('helvetica', 'bold');
        pdf.text(`Rs.${fmt(m.amount)}`, cols[3], y + 3.5);
        pdf.setFont('helvetica', 'normal');
        
        pdf.setTextColor(100, 100, 100);
        pdf.text(String(m.opening), cols[4], y + 3.5);
        
        pdf.setTextColor(22, 163, 74);
        pdf.setFont('helvetica', 'bold');
        pdf.text(m.stockReceived > 0 ? `+${m.stockReceived}` : '0', cols[5], y + 3.5);
        pdf.setFont('helvetica', 'normal');
        
        pdf.setTextColor(0, 51, 102);
        pdf.setFont('helvetica', 'bold');
        pdf.text(String(m.closing), cols[6], y + 3.5);
        pdf.setFont('helvetica', 'normal');
        
        y += 5.5;
      });

      // Total row
      pdf.setFillColor(...headerColor);
      pdf.rect(margin, y, pageWidth - 2 * margin, 7, 'F');
      pdf.setTextColor(255, 255, 255);
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(8);
      pdf.text('CATEGORY TOTAL', cols[0], y + 5);
      pdf.text(`Rs.${fmt(total)}`, cols[3], y + 5);
      y += 12;
    };

    // Draw medicine tables on Page 2 with category colors
    drawMedicineTable(bnxMedicines, 'BNX Medicines', [59, 130, 246], [239, 246, 255], bnxTotal);
    drawMedicineTable(tpnMedicines, 'TPN Medicines', [245, 158, 11], [255, 251, 235], tpnTotal);
    drawMedicineTable(pshyMedicines, 'PSHY Medicines', [139, 92, 246], [245, 243, 255], pshyTotal);

    // Grand total at end
    if (y < 260) {
      y += 4;
      pdf.setFillColor(0, 51, 102);
      pdf.rect(margin, y, pageWidth - 2 * margin, 10, 'F');
      pdf.setTextColor(212, 175, 55);
      pdf.setFontSize(11);
      pdf.setFont('helvetica', 'bold');
      pdf.text('GRAND TOTAL', margin + 6, y + 7);
      pdf.setTextColor(255, 255, 255);
      pdf.text(`Rs.${fmt(bnxTotal + tpnTotal + pshyTotal)}`, pageWidth - margin - 6, y + 7, { align: 'right' });
    }

    // Add footer to last page
    addFooter();

    pdf.save(`Day_Report_${reportDate}.pdf`);
    toast.success('PDF exported successfully');
    } catch (error) {
      console.error('PDF Export Error:', error);
      toast.error('Failed to export PDF. Please try again.');
    }
  };

  const MedicineTable = ({ data, title, total }: { data: MedicineReportItem[], title: string, total: number }) => {
    const filteredData = categoryFilter ? data.filter(item => item.category === categoryFilter) : data;
    const filteredTotal = filteredData.reduce((sum, item) => sum + item.amount, 0);
    
    return (
    <Card className="mb-4">
      <CardHeader className="bg-navy text-white py-2 rounded-t-lg flex flex-row items-center justify-between">
        <CardTitle className="text-sm">{title}</CardTitle>
        {categoryFilter && (
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => setCategoryFilter(null)}
            className="text-white hover:text-white hover:bg-white/20 h-6 px-2 text-xs"
          >
            Clear Filter
          </Button>
        )}
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow className="bg-navy/10 text-xs">
              <TableHead className="font-bold text-navy">Brand</TableHead>
              <TableHead className="font-bold text-navy text-right">Qty sold</TableHead>
              <TableHead className="font-bold text-navy text-right">Rate</TableHead>
              <TableHead className="font-bold text-navy text-right">Amount</TableHead>
              <TableHead className="font-bold text-navy text-right">
                {showLiveStock ? 'Live Stock' : 'Opening (00:01)'}
              </TableHead>
              <TableHead className="font-bold text-navy text-right">Stock Received</TableHead>
              <TableHead className="font-bold text-navy text-right">Closing</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredData.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-4 text-muted-foreground text-sm">
                  {categoryFilter ? `No ${categoryFilter} medicines` : 'No data'}
                </TableCell>
              </TableRow>
            ) : (
              <>
                {filteredData.map((item, index) => (
                  <TableRow key={index} className="text-xs">
                    <TableCell className="font-medium py-1">
                      <span className="flex items-center gap-2">
                        {item.brand}
                        <button
                          onClick={() => setCategoryFilter(categoryFilter === item.category ? null : item.category)}
                          className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold cursor-pointer transition-all hover:scale-105 ${
                            item.category === 'BNX' 
                              ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400 hover:bg-orange-200' 
                              : item.category === 'TPN' 
                                ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 hover:bg-blue-200'
                                : 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400 hover:bg-purple-200'
                          } ${categoryFilter === item.category ? 'ring-2 ring-offset-1 ring-current' : ''}`}
                        >
                          {item.category}
                        </button>
                      </span>
                    </TableCell>
                    <TableCell className="text-right py-1">{item.qtySold}</TableCell>
                    <TableCell className="text-right py-1">₹{formatNumber(item.rate)}</TableCell>
                    <TableCell className="text-right py-1 font-semibold">₹{formatNumber(item.amount)}</TableCell>
                    <TableCell className="text-right py-1">
                      <span className="flex items-center justify-end gap-1">
                        {showLiveStock ? item.liveStock : item.opening}
                        {!showLiveStock && !item.isFromSnapshot && (
                          <span 
                            className="inline-block w-2 h-2 rounded-full bg-accent"
                            title="No snapshot available - showing current stock"
                          />
                        )}
                      </span>
                    </TableCell>
                    <TableCell className="text-right py-1 text-green-600">{item.stockReceived}</TableCell>
                    <TableCell className="text-right py-1">{showLiveStock ? item.liveStock : item.closing}</TableCell>
                  </TableRow>
                ))}
                <TableRow className="bg-gold/20 font-bold text-xs">
                  <TableCell>Total {categoryFilter && `(${categoryFilter})`}</TableCell>
                  <TableCell className="text-right">{filteredData.reduce((s, i) => s + i.qtySold, 0)}</TableCell>
                  <TableCell></TableCell>
                  <TableCell className="text-right">₹{formatNumber(filteredTotal)}</TableCell>
                  <TableCell colSpan={3}></TableCell>
                </TableRow>
              </>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-navy" />
        <span className="ml-2">Loading report...</span>
      </div>
    );
  }

  return (
    <div className="space-y-4 text-sm">
      {/* Header */}
      <div className="flex justify-between items-center flex-wrap gap-2">
        <div>
          <h2 className="text-xl font-bold text-navy">Day's Report - {formatDate(reportDate)}</h2>
          <div className="flex items-center gap-3 text-xs">
            {hasUnsavedChanges && !saving && (
              <span className="text-amber-600 flex items-center gap-1">
                Unsaved changes
              </span>
            )}
            {lastSaved && !hasUnsavedChanges && (
              <span className="text-green-600 flex items-center gap-1">
                <Check className="h-3 w-3" /> Saved
              </span>
            )}
            {medicineDataUpdated && (
              <span className="text-muted-foreground flex items-center gap-1 bg-muted px-2 py-0.5 rounded-full">
                <RefreshCw className="h-3 w-3" />
                Data updated {medicineDataUpdated.toLocaleTimeString()}
              </span>
            )}
          </div>
        </div>
        <div className="flex gap-2 items-center flex-wrap">
          {/* Toggle for Opening vs Live Stock */}
          <Button
            variant={showLiveStock ? "default" : "outline"}
            size="sm"
            onClick={() => setShowLiveStock(!showLiveStock)}
            className="flex items-center gap-2 h-8"
          >
            {showLiveStock ? <ToggleRight className="h-4 w-4" /> : <ToggleLeft className="h-4 w-4" />}
            {showLiveStock ? 'Live' : 'Opening'}
          </Button>
          <Calendar className="h-4 w-4 text-navy" />
          <Input
            type="date"
            value={reportDate}
            onChange={(e) => setReportDate(e.target.value)}
            className="w-auto h-8"
          />
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={() => loadMedicineData()}
            disabled={isRefreshingMedicine}
            title="Refresh data"
          >
            <RefreshCw className={`h-4 w-4 ${isRefreshingMedicine ? 'animate-spin' : ''}`} />
          </Button>
          <Button 
            onClick={saveReport} 
            size="sm" 
            className="bg-green-600 hover:bg-green-700 text-white"
            disabled={saving || !hasUnsavedChanges}
          >
            {saving ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Save className="h-4 w-4 mr-1" />}
            {saving ? 'Saving...' : 'Save'}
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="sm" className="bg-gold hover:bg-gold/90 text-navy">
                <Download className="h-4 w-4 mr-1" />
                Export
                <ChevronDown className="h-3 w-3 ml-1" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => exportToPDF()}>
                <FileText className="h-4 w-4 mr-2 text-red-500" />
                PDF (with Colors)
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => exportToExcel(true)}>
                <FileSpreadsheet className="h-4 w-4 mr-2 text-green-600" />
                Excel (with Colors)
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => exportToExcel(false)}>
                <FileSpreadsheet className="h-4 w-4 mr-2" />
                Excel (Plain)
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setShowDateRangeExport(true)}>
                <CalendarRange className="h-4 w-4 mr-2 text-blue-500" />
                Date Range Export
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <DateRangeExportDialog
        open={showDateRangeExport}
        onOpenChange={setShowDateRangeExport}
        onExport={exportDateRangeToExcel}
        title="Export Day's Report"
        description="Select date range to export Day's Report data"
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Left Column - BNX Details & Medicines */}
        <div className="lg:col-span-2 space-y-4">
          {/* Patient Counts */}
          <Card>
            <CardHeader className="bg-navy text-white py-2 rounded-t-lg">
              <CardTitle className="text-sm">BNX Details</CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="text-xs text-muted-foreground">New Patients</label>
                  <Input
                    type="number"
                    value={newPatients || ''}
                    onChange={(e) => setNewPatients(parseInt(e.target.value) || 0)}
                    className="h-8"
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Follow up Patients</label>
                  <Input
                    type="number"
                    value={followUpPatients || ''}
                    onChange={(e) => setFollowUpPatients(parseInt(e.target.value) || 0)}
                    className="h-8"
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Total Patients</label>
                  <Input value={totalPatients} readOnly className="h-8 bg-muted" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* BNX Medicines */}
          <MedicineTable data={bnxMedicines} title="BNX Medicines" total={bnxTotal} />

          {/* TPN Medicines */}
          <MedicineTable data={tpnMedicines} title="TPN Medicines" total={tpnTotal} />

          {/* PSHY Medicines */}
          <MedicineTable data={pshyMedicines} title="PSHY Medicines" total={pshyTotal} />
        </div>

        {/* Right Column - Cash & Expenses */}
        <div className="space-y-4">
          {/* Pharmacy Sale */}
          <Card>
            <CardHeader className="bg-gold text-navy py-2 rounded-t-lg">
              <CardTitle className="text-sm">Pharmacy Sale</CardTitle>
            </CardHeader>
            <CardContent className="p-3 space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-xs">Tapentadol Patients</span>
                <Input
                  type="number"
                  value={tapentadolPatients || ''}
                  onChange={(e) => setTapentadolPatients(parseInt(e.target.value) || 0)}
                  className="w-20 h-7 text-right"
                />
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs">Psychiatry Patients</span>
                <Input
                  type="number"
                  value={psychiatryPatients || ''}
                  onChange={(e) => setPsychiatryPatients(parseInt(e.target.value) || 0)}
                  className="w-20 h-7 text-right"
                />
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs">Fees</span>
                <Input
                  type="number"
                  value={fees || ''}
                  onChange={(e) => setFees(parseFloat(e.target.value) || 0)}
                  className="w-20 h-7 text-right"
                />
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs">Lab Collection</span>
                <Input
                  type="number"
                  value={labCollection || ''}
                  onChange={(e) => setLabCollection(parseFloat(e.target.value) || 0)}
                  className="w-20 h-7 text-right"
                />
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs">Psychiatry Collection</span>
                <Input
                  type="number"
                  value={psychiatryCollection || ''}
                  onChange={(e) => setPsychiatryCollection(parseFloat(e.target.value) || 0)}
                  className="w-20 h-7 text-right"
                />
              </div>
              <div className="flex justify-between items-center font-bold border-t pt-2">
                <span className="text-xs">Total Collection</span>
                <span>₹{formatNumber(totalCollection)}</span>
              </div>
            </CardContent>
          </Card>

          {/* Cash Management */}
          <Card>
            <CardHeader className="bg-navy text-white py-2 rounded-t-lg">
              <CardTitle className="text-sm">Cash Management</CardTitle>
            </CardHeader>
            <CardContent className="p-3 space-y-2">
              <div className="flex justify-between items-center gap-2">
                <span className="text-xs">Cash in Hand (Previous Day)</span>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={async () => {
                      setIsRefreshingPrevCash(true);
                      try {
                        const prevCash = await fetchPreviousDayCashLeftInHand(reportDate);
                        setCashPreviousDay(prevCash);
                        toast.success('Previous day cash updated');
                      } catch (error) {
                        toast.error('Failed to fetch previous day cash');
                      } finally {
                        setIsRefreshingPrevCash(false);
                      }
                    }}
                    disabled={isRefreshingPrevCash}
                    className="h-7 w-7 p-0"
                    title="Refresh from previous day's closing"
                  >
                    <RefreshCw className={`h-3.5 w-3.5 ${isRefreshingPrevCash ? 'animate-spin' : ''}`} />
                  </Button>
                  <Input
                    type="number"
                    value={cashPreviousDay || ''}
                    onChange={(e) => setCashPreviousDay(parseFloat(e.target.value) || 0)}
                    className="w-24 h-7 text-right"
                  />
                </div>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs">Today's Collection</span>
                <span className="font-semibold">₹{formatNumber(todaysCollection)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs">Expenses</span>
                <span className="text-red-600">₹{formatNumber(totalExpenses)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs">Deposit in Bank A/c</span>
                <Input
                  type="number"
                  value={depositInBank || ''}
                  onChange={(e) => setDepositInBank(parseFloat(e.target.value) || 0)}
                  className="w-24 h-7 text-right"
                />
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs">Paytm/GPay</span>
                <Input
                  type="number"
                  value={paytmGpay || ''}
                  onChange={(e) => setPaytmGpay(parseFloat(e.target.value) || 0)}
                  className="w-24 h-7 text-right"
                />
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs">Cash H/O to Amarjeet Sir</span>
                <Input
                  type="number"
                  value={cashHandoverAmarjeet || ''}
                  onChange={(e) => setCashHandoverAmarjeet(parseFloat(e.target.value) || 0)}
                  className="w-24 h-7 text-right"
                />
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs">Cash H/O to Mandeep Sir</span>
                <Input
                  type="number"
                  value={cashHandoverMandeep || ''}
                  onChange={(e) => setCashHandoverMandeep(parseFloat(e.target.value) || 0)}
                  className="w-24 h-7 text-right"
                />
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs">Cash H/O to Sir</span>
                <Input
                  type="number"
                  value={cashHandoverSir || ''}
                  onChange={(e) => setCashHandoverSir(parseFloat(e.target.value) || 0)}
                  className="w-24 h-7 text-right"
                />
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs">Adjustments</span>
                <Input
                  type="number"
                  value={adjustments || ''}
                  onChange={(e) => setAdjustments(parseFloat(e.target.value) || 0)}
                  className="w-24 h-7 text-right"
                />
              </div>
              <div className="flex justify-between items-center font-bold border-t pt-2 bg-green-50 -mx-3 px-3 py-1">
                <span className="text-xs">Cash left in hand (Today)</span>
                <span className="text-green-700">₹{formatNumber(cashLeftInHand)}</span>
              </div>
            </CardContent>
          </Card>

          {/* Expenses */}
          <Card>
            <CardHeader className="bg-red-600 text-white py-2 rounded-t-lg">
              <CardTitle className="text-sm">Expenses</CardTitle>
            </CardHeader>
            <CardContent className="p-3 space-y-2">
              {expenses.map((exp, index) => (
                <div key={index} className="flex gap-2">
                  <Input
                    placeholder="Description"
                    value={exp.description}
                    onChange={(e) => updateExpense(index, 'description', e.target.value)}
                    className="flex-1 h-7 text-xs"
                  />
                  <Input
                    type="number"
                    placeholder="Amt"
                    value={exp.amount || ''}
                    onChange={(e) => updateExpense(index, 'amount', parseFloat(e.target.value) || 0)}
                    className="w-20 h-7 text-right"
                  />
                </div>
              ))}
              <Button onClick={addExpense} variant="outline" size="sm" className="w-full h-7 text-xs">
                + Add Expense
              </Button>
              <div className="flex justify-between font-bold border-t pt-2">
                <span>Total</span>
                <span className="text-red-600">₹{formatNumber(totalExpenses)}</span>
              </div>
            </CardContent>
          </Card>

          {/* Employee Advances */}
          <Card>
            <CardHeader className="bg-amber-600 text-white py-2 rounded-t-lg">
              <CardTitle className="text-sm flex items-center gap-2">
                <Wallet className="w-4 h-4" />
                Employee Advances
              </CardTitle>
            </CardHeader>
            <CardContent className="p-3 space-y-2">
              {employees.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-2">
                  No employees found. Add employees in Salary Management first.
                </p>
              ) : (
                <>
                  {advances.map((adv, index) => (
                    <div key={index} className="flex gap-2 items-center">
                      <Select
                        value={adv.employeeId}
                        onValueChange={(value) => updateAdvance(index, 'employeeId', value)}
                      >
                        <SelectTrigger className="flex-1 h-7 text-xs">
                          <SelectValue placeholder="Select Employee" />
                        </SelectTrigger>
                        <SelectContent>
                          {employees.map((emp) => (
                            <SelectItem key={emp.id} value={emp.id} className="text-xs">
                              {emp.name} ({emp.designation})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Input
                        type="number"
                        placeholder="Amount"
                        value={adv.amount || ''}
                        onChange={(e) => updateAdvance(index, 'amount', parseFloat(e.target.value) || 0)}
                        className="w-24 h-7 text-right"
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-red-500 hover:text-red-700 hover:bg-red-50"
                        onClick={() => removeAdvance(index)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                  <Button onClick={addAdvance} variant="outline" size="sm" className="w-full h-7 text-xs gap-1">
                    <Plus className="w-3 h-3" />
                    Add Advance
                  </Button>
                  {advances.length > 0 && (
                    <div className="flex justify-between font-bold border-t pt-2">
                      <span>Total Advances</span>
                      <span className="text-amber-600">₹{formatNumber(totalAdvances)}</span>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>

          {/* Cash Details */}
          <Card>
            <CardHeader className="bg-gold text-navy py-2 rounded-t-lg">
              <CardTitle className="text-sm">Cash Details</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gold/20 text-xs">
                    <TableHead className="font-bold text-navy py-1">Denomination</TableHead>
                    <TableHead className="font-bold text-navy text-center py-1">Count</TableHead>
                    <TableHead className="font-bold text-navy text-right py-1">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {cashDetails.map((item, index) => (
                    <TableRow key={index} className="text-xs">
                      <TableCell className="py-1">₹{item.denomination}</TableCell>
                      <TableCell className="py-1">
                        <Input
                          type="number"
                          min="0"
                          value={item.count || ''}
                          onChange={(e) => updateCashCount(index, parseInt(e.target.value) || 0)}
                          className="w-16 h-6 text-center mx-auto"
                        />
                      </TableCell>
                      <TableCell className="text-right py-1">₹{formatNumber(item.amount)}</TableCell>
                    </TableRow>
                  ))}
                  <TableRow className="bg-navy/10 font-bold text-xs">
                    <TableCell colSpan={2} className="py-1">TOTAL</TableCell>
                    <TableCell className="text-right py-1">₹{formatNumber(totalCash)}</TableCell>
                  </TableRow>
                  <TableRow className="bg-gold/30 font-bold text-xs">
                    <TableCell colSpan={2} className="py-1">TOTAL AS PER SHEET</TableCell>
                    <TableCell className="text-right py-1">₹{formatNumber(totalAsPerSheet)}</TableCell>
                  </TableRow>
                  <TableRow className="text-xs">
                    <TableCell colSpan={2} className="py-1">PAYTM</TableCell>
                    <TableCell className="text-right py-1">₹{formatNumber(paytmGpay)}</TableCell>
                  </TableRow>
                  <TableRow className={`font-bold text-xs ${difference === 0 ? 'bg-green-100' : difference > 0 ? 'bg-red-100' : 'bg-yellow-100'}`}>
                    <TableCell colSpan={2} className="py-1">DIFFERENCE</TableCell>
                    <TableCell className="text-right py-1">₹{formatNumber(difference)}</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Card className="border-l-4 border-l-gold">
          <CardContent className="pt-4 pb-3">
            <p className="text-xs text-muted-foreground">BNX Collection</p>
            <p className="text-lg font-bold text-navy">₹{formatNumber(bnxTotal)}</p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-blue-500">
          <CardContent className="pt-4 pb-3">
            <p className="text-xs text-muted-foreground">TPN Collection</p>
            <p className="text-lg font-bold text-navy">₹{formatNumber(tpnTotal)}</p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-purple-500">
          <CardContent className="pt-4 pb-3">
            <p className="text-xs text-muted-foreground">PSHY Collection</p>
            <p className="text-lg font-bold text-navy">₹{formatNumber(pshyTotal)}</p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-green-500">
          <CardContent className="pt-4 pb-3">
            <p className="text-xs text-muted-foreground">Total Sale</p>
            <p className="text-lg font-bold text-navy">₹{formatNumber(totalSale)}</p>
          </CardContent>
        </Card>
        <Card className={`border-l-4 ${difference === 0 ? 'border-l-green-500' : 'border-l-red-500'}`}>
          <CardContent className="pt-4 pb-3">
            <p className="text-xs text-muted-foreground">Difference</p>
            <p className={`text-lg font-bold ${difference === 0 ? 'text-green-600' : 'text-red-600'}`}>
              ₹{formatNumber(difference)}
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
