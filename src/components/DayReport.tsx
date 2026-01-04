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
import { Download, Calendar, Loader2, Check, RefreshCw, ToggleLeft, ToggleRight, Save, FileSpreadsheet, FileText, ChevronDown } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useStockStore } from "@/hooks/useStockStore";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import { formatLocalISODate } from "@/lib/dateUtils";

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

export default function DayReport() {
  const { stockItems } = useStockStore();
  const [reportDate, setReportDate] = useState(() => formatLocalISODate());
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);
  const [reportId, setReportId] = useState<string | null>(null);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [medicineDataUpdated, setMedicineDataUpdated] = useState<Date | null>(null);
  const [isRefreshingMedicine, setIsRefreshingMedicine] = useState(false);
  const [isRefreshingPrevCash, setIsRefreshingPrevCash] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  
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
      cashDetails, expenses]);

  useEffect(() => {
    loadSavedReport().then(() => {
      setHasUnsavedChanges(false);
    });
  }, [loadSavedReport]);

  useEffect(() => {
    loadMedicineData();
  }, [stockItems, reportDate]);

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

      // Get invoice items for the selected date
      const { data: invoiceData } = await supabase
        .from('invoices')
        .select('id, invoice_date')
        .like('invoice_date', `${reportDate}%`);

      const invoiceIds = invoiceData?.map(inv => inv.id) || [];

      let soldQuantitiesByName: Record<string, number> = {};
      let soldQuantitiesById: Record<number, number> = {};

      if (invoiceIds.length > 0) {
        const { data: invoiceItems } = await supabase
          .from('invoice_items')
          .select('medicine_id, medicine_name, quantity')
          .in('invoice_id', invoiceIds);

        (invoiceItems || []).forEach((it) => {
          soldQuantitiesByName[it.medicine_name] = (soldQuantitiesByName[it.medicine_name] || 0) + it.quantity;
          soldQuantitiesById[it.medicine_id] = (soldQuantitiesById[it.medicine_id] || 0) + it.quantity;
        });
      }

      // Get stock received from GRN
      const { data: grnOrders } = await supabase
        .from('purchase_orders')
        .select('id')
        .like('grn_date', `${reportDate}%`)
        .eq('status', 'Received');

      const grnOrderIds = grnOrders?.map(po => po.id) || [];

      let receivedQuantitiesByName: Record<string, number> = {};
      let receivedQuantitiesById: Record<number, number> = {};

      if (grnOrderIds.length > 0) {
        const { data: poItems } = await supabase
          .from('purchase_order_items')
          .select('stock_item_id, stock_item_name, quantity')
          .in('purchase_order_id', grnOrderIds);

        (poItems || []).forEach((it) => {
          receivedQuantitiesByName[it.stock_item_name] = (receivedQuantitiesByName[it.stock_item_name] || 0) + it.quantity;
          receivedQuantitiesById[it.stock_item_id] = (receivedQuantitiesById[it.stock_item_id] || 0) + it.quantity;
        });
      }

      // Create medicine data with category from stock item
      const createMedicineData = (items: typeof stockItems): MedicineReportItem[] => {
        return items
          .map(item => {
            const sold = soldQuantitiesById[item.id] ?? soldQuantitiesByName[item.name] ?? 0;
            const received = receivedQuantitiesById[item.id] ?? receivedQuantitiesByName[item.name] ?? 0;
            // Use opening from stock_snapshot (captured at 00:01 IST), fallback to current stock
            const snapshotData = stockSnapshot[item.name];
            const isFromSnapshot = snapshotData?.opening !== undefined;
            const opening = isFromSnapshot ? snapshotData.opening : item.currentStock;
            const liveStock = item.currentStock;
            const closing = opening - sold + received;

            return {
              brand: item.name,
              qtySold: sold,
              rate: item.mrp || item.unitPrice,
              amount: sold * (item.mrp || item.unitPrice),
              opening,
              liveStock,
              stockReceived: received,
              closing,
              isFromSnapshot,
              category: item.category.toUpperCase(),
            };
          })
          .filter(item => item.opening > 0 || item.qtySold > 0 || item.stockReceived > 0 || item.isFromSnapshot);
      };

      const allMedicineData = createMedicineData(stockItems);
      
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

  // Calculations
  const bnxTotal = bnxMedicines.reduce((sum, item) => sum + item.amount, 0);
  const tpnTotal = tpnMedicines.reduce((sum, item) => sum + item.amount, 0);
  const pshyTotal = pshyMedicines.reduce((sum, item) => sum + item.amount, 0);
  
  const totalExpenses = expenses.reduce((sum, item) => sum + item.amount, 0);
  const totalCash = cashDetails.reduce((sum, item) => sum + item.amount, 0);
  
  const totalSale = bnxTotal + tpnTotal + pshyTotal + fees + labCollection;
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

  const exportToPDF = () => {
    const pdf = new jsPDF('p', 'mm', 'a4');
    const pageWidth = pdf.internal.pageSize.getWidth();
    const margin = 15;
    let y = 20;

    // Helper to format numbers to 2 decimal places
    const fmt = (n: number) => n.toFixed(2);

    // ========== PAGE 1: BNX Details, Pharmacy Sale, Summary, Cash Management ==========
    
    // Header
    pdf.setFillColor(0, 51, 102); // Navy
    pdf.rect(0, 0, pageWidth, 35, 'F');
    
    pdf.setTextColor(255, 255, 255);
    pdf.setFontSize(18);
    pdf.setFont('helvetica', 'bold');
    pdf.text('NAVJEEVAN HOSPITAL', pageWidth / 2, 15, { align: 'center' });
    
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'normal');
    pdf.text('De-Addiction & Rehabilitation Centre', pageWidth / 2, 22, { align: 'center' });
    
    pdf.setFontSize(14);
    pdf.setFont('helvetica', 'bold');
    pdf.text(`Day's Report - ${formatDate(reportDate)}`, pageWidth / 2, 30, { align: 'center' });

    y = 45;

    // BNX Details Section
    pdf.setTextColor(0, 51, 102);
    pdf.setFontSize(12);
    pdf.setFont('helvetica', 'bold');
    pdf.text('BNX Details', margin, y);
    
    pdf.setFillColor(240, 240, 240);
    pdf.rect(margin, y + 2, 80, 25, 'F');
    
    pdf.setTextColor(0, 0, 0);
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'normal');
    pdf.text(`New Patients: ${newPatients}`, margin + 5, y + 10);
    pdf.text(`Follow-up Patients: ${followUpPatients}`, margin + 5, y + 17);
    pdf.text(`Total Patients: ${totalPatients}`, margin + 5, y + 24);

    // Pharmacy Sale section
    pdf.setTextColor(0, 51, 102);
    pdf.setFont('helvetica', 'bold');
    pdf.text('Pharmacy Sale', pageWidth - margin - 60, y);
    
    pdf.setFillColor(240, 240, 240);
    pdf.rect(pageWidth - margin - 65, y + 2, 65, 25, 'F');
    
    pdf.setTextColor(0, 0, 0);
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'normal');
    pdf.text(`Tapentadol Patients: ${tapentadolPatients}`, pageWidth - margin - 60, y + 10);
    pdf.text(`Psychiatry Patients: ${psychiatryPatients}`, pageWidth - margin - 60, y + 17);
    pdf.text(`Fees: ₹${fmt(fees)}`, pageWidth - margin - 60, y + 24);

    y += 40;

    // Summary Section on Page 1
    pdf.setFillColor(212, 175, 55); // Gold
    pdf.rect(margin, y, 85, 8, 'F');
    pdf.setTextColor(0, 0, 0);
    pdf.setFontSize(11);
    pdf.setFont('helvetica', 'bold');
    pdf.text('Summary', margin + 3, y + 5.5);
    y += 12;

    const summaryItems = [
      ['BNX Collection', `₹${fmt(bnxTotal)}`, [59, 130, 246]],
      ['TPN Collection', `₹${fmt(tpnTotal)}`, [245, 158, 11]],
      ['PSHY Collection', `₹${fmt(pshyTotal)}`, [139, 92, 246]],
      ['Fees', `₹${fmt(fees)}`, [100, 100, 100]],
      ['Lab Collection', `₹${fmt(labCollection)}`, [100, 100, 100]],
    ];

    pdf.setFontSize(9);
    summaryItems.forEach((item) => {
      pdf.setFillColor(item[2][0] as number, item[2][1] as number, item[2][2] as number);
      pdf.rect(margin, y, 3, 6, 'F');
      pdf.setTextColor(0, 0, 0);
      pdf.setFont('helvetica', 'normal');
      pdf.text(item[0] as string, margin + 5, y + 4);
      pdf.text(item[1] as string, margin + 80, y + 4, { align: 'right' });
      y += 7;
    });

    // Total Sale
    pdf.setFillColor(0, 51, 102);
    pdf.rect(margin, y, 85, 8, 'F');
    pdf.setTextColor(255, 255, 255);
    pdf.setFont('helvetica', 'bold');
    pdf.text('Total Sale', margin + 3, y + 5.5);
    pdf.text(`₹${fmt(totalSale)}`, margin + 82, y + 5.5, { align: 'right' });
    y += 18;

    // Cash Management Section on Page 1
    pdf.setFillColor(0, 51, 102);
    pdf.rect(margin, y, 85, 8, 'F');
    pdf.setTextColor(255, 255, 255);
    pdf.setFontSize(11);
    pdf.setFont('helvetica', 'bold');
    pdf.text('Cash Management', margin + 3, y + 5.5);
    y += 12;

    const cashItems = [
      ['Cash Previous Day', `₹${fmt(cashPreviousDay)}`],
      ["Today's Collection", `₹${fmt(todaysCollection)}`],
      ['Expenses', `₹${fmt(totalExpenses)}`],
      ['Deposit in Bank', `₹${fmt(depositInBank)}`],
      ['Paytm/GPay', `₹${fmt(paytmGpay)}`],
      ['Cash H/O Amarjeet', `₹${fmt(cashHandoverAmarjeet)}`],
      ['Cash H/O Mandeep', `₹${fmt(cashHandoverMandeep)}`],
      ['Cash H/O Sir', `₹${fmt(cashHandoverSir)}`],
      ['Adjustments', `₹${fmt(adjustments)}`],
    ];

    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(0, 0, 0);
    
    cashItems.forEach((item, idx) => {
      if (idx % 2 === 0) {
        pdf.setFillColor(245, 245, 245);
        pdf.rect(margin, y - 1, 85, 6, 'F');
      }
      pdf.text(item[0], margin + 3, y + 3);
      pdf.text(item[1], margin + 82, y + 3, { align: 'right' });
      y += 6;
    });

    // Cash left in hand (highlighted)
    pdf.setFillColor(0, 150, 0);
    pdf.rect(margin, y, 85, 8, 'F');
    pdf.setTextColor(255, 255, 255);
    pdf.setFont('helvetica', 'bold');
    pdf.text('Cash Left in Hand', margin + 3, y + 5.5);
    pdf.text(`₹${fmt(cashLeftInHand)}`, margin + 82, y + 5.5, { align: 'right' });

    // ========== PAGE 2: Medicine Tables ==========
    pdf.addPage();
    y = 20;

    // Page 2 Header
    pdf.setFillColor(0, 51, 102);
    pdf.rect(0, 0, pageWidth, 20, 'F');
    pdf.setTextColor(255, 255, 255);
    pdf.setFontSize(12);
    pdf.setFont('helvetica', 'bold');
    pdf.text(`Medicine Details - ${formatDate(reportDate)}`, pageWidth / 2, 13, { align: 'center' });
    y = 28;

    // Medicine tables helper
    const drawMedicineTable = (medicines: MedicineReportItem[], title: string, headerColor: [number, number, number], total: number) => {
      if (medicines.length === 0) return;
      
      // Check if we need a new page
      if (y > 250) {
        pdf.addPage();
        y = 20;
      }

      pdf.setFillColor(...headerColor);
      pdf.rect(margin, y, pageWidth - 2 * margin, 8, 'F');
      pdf.setTextColor(255, 255, 255);
      pdf.setFontSize(11);
      pdf.setFont('helvetica', 'bold');
      pdf.text(title, margin + 3, y + 5.5);
      y += 10;

      // Table header
      pdf.setFillColor(230, 230, 230);
      pdf.rect(margin, y, pageWidth - 2 * margin, 7, 'F');
      pdf.setTextColor(0, 0, 0);
      pdf.setFontSize(8);
      pdf.setFont('helvetica', 'bold');
      
      const cols = [margin + 3, margin + 55, margin + 75, margin + 95, margin + 115, margin + 140, margin + 160];
      pdf.text('Brand', cols[0], y + 5);
      pdf.text('Qty', cols[1], y + 5);
      pdf.text('Rate', cols[2], y + 5);
      pdf.text('Amount', cols[3], y + 5);
      pdf.text('Opening', cols[4], y + 5);
      pdf.text('Received', cols[5], y + 5);
      pdf.text('Closing', cols[6], y + 5);
      y += 8;

      // Table rows
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(8);
      medicines.forEach((m, idx) => {
        if (y > 275) {
          pdf.addPage();
          y = 20;
        }
        
        if (idx % 2 === 0) {
          pdf.setFillColor(250, 250, 250);
          pdf.rect(margin, y - 1, pageWidth - 2 * margin, 6, 'F');
        }
        
        pdf.setTextColor(0, 0, 0);
        pdf.text(m.brand.substring(0, 30), cols[0], y + 3);
        pdf.text(String(m.qtySold), cols[1], y + 3);
        pdf.text(`₹${fmt(m.rate)}`, cols[2], y + 3);
        pdf.text(`₹${fmt(m.amount)}`, cols[3], y + 3);
        pdf.text(String(m.opening), cols[4], y + 3);
        pdf.setTextColor(0, 150, 0);
        pdf.text(String(m.stockReceived), cols[5], y + 3);
        pdf.setTextColor(0, 0, 0);
        pdf.text(String(m.closing), cols[6], y + 3);
        y += 6;
      });

      // Total row
      pdf.setFillColor(212, 175, 55); // Gold
      pdf.rect(margin, y, pageWidth - 2 * margin, 7, 'F');
      pdf.setTextColor(0, 0, 0);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Total', cols[0], y + 5);
      pdf.text(`₹${fmt(total)}`, cols[3], y + 5);
      y += 12;
    };

    // Draw medicine tables on Page 2
    drawMedicineTable(bnxMedicines, 'BNX Medicines', [59, 130, 246], bnxTotal); // Blue
    drawMedicineTable(tpnMedicines, 'TPN Medicines', [245, 158, 11], tpnTotal); // Amber
    drawMedicineTable(pshyMedicines, 'PSHY Medicines', [139, 92, 246], pshyTotal); // Purple

    pdf.save(`Day_Report_${reportDate}.pdf`);
    toast.success('PDF exported with colors');
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
                    <TableCell className="text-right py-1">₹{item.rate}</TableCell>
                    <TableCell className="text-right py-1 font-semibold">₹{item.amount}</TableCell>
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
                  <TableCell className="text-right">₹{filteredTotal}</TableCell>
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
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

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
                <span>₹{totalCollection}</span>
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
                <span className="font-semibold">₹{todaysCollection.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs">Expenses</span>
                <span className="text-red-600">₹{totalExpenses}</span>
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
                <span className="text-green-700">₹{cashLeftInHand.toFixed(2)}</span>
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
                <span className="text-red-600">₹{totalExpenses}</span>
              </div>
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
                      <TableCell className="text-right py-1">₹{item.amount}</TableCell>
                    </TableRow>
                  ))}
                  <TableRow className="bg-navy/10 font-bold text-xs">
                    <TableCell colSpan={2} className="py-1">TOTAL</TableCell>
                    <TableCell className="text-right py-1">₹{totalCash}</TableCell>
                  </TableRow>
                  <TableRow className="bg-gold/30 font-bold text-xs">
                    <TableCell colSpan={2} className="py-1">TOTAL AS PER SHEET</TableCell>
                    <TableCell className="text-right py-1">₹{totalAsPerSheet.toFixed(2)}</TableCell>
                  </TableRow>
                  <TableRow className="text-xs">
                    <TableCell colSpan={2} className="py-1">PAYTM</TableCell>
                    <TableCell className="text-right py-1">₹{paytmGpay}</TableCell>
                  </TableRow>
                  <TableRow className={`font-bold text-xs ${difference === 0 ? 'bg-green-100' : difference > 0 ? 'bg-red-100' : 'bg-yellow-100'}`}>
                    <TableCell colSpan={2} className="py-1">DIFFERENCE</TableCell>
                    <TableCell className="text-right py-1">₹{difference.toFixed(2)}</TableCell>
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
            <p className="text-lg font-bold text-navy">₹{bnxTotal}</p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-blue-500">
          <CardContent className="pt-4 pb-3">
            <p className="text-xs text-muted-foreground">TPN Collection</p>
            <p className="text-lg font-bold text-navy">₹{tpnTotal}</p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-purple-500">
          <CardContent className="pt-4 pb-3">
            <p className="text-xs text-muted-foreground">PSHY Collection</p>
            <p className="text-lg font-bold text-navy">₹{pshyTotal}</p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-green-500">
          <CardContent className="pt-4 pb-3">
            <p className="text-xs text-muted-foreground">Total Sale</p>
            <p className="text-lg font-bold text-navy">₹{totalSale.toFixed(2)}</p>
          </CardContent>
        </Card>
        <Card className={`border-l-4 ${difference === 0 ? 'border-l-green-500' : 'border-l-red-500'}`}>
          <CardContent className="pt-4 pb-3">
            <p className="text-xs text-muted-foreground">Difference</p>
            <p className={`text-lg font-bold ${difference === 0 ? 'text-green-600' : 'text-red-600'}`}>
              ₹{difference.toFixed(2)}
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
