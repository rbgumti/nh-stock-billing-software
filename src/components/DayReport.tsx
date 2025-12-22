import { useState, useEffect, useCallback, useRef } from "react";
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
import { Download, Calendar, Loader2, Check, RefreshCw } from "lucide-react";
import { useStockStore } from "@/hooks/useStockStore";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import * as XLSX from "xlsx";

interface MedicineReportItem {
  brand: string;
  qtySold: number;
  rate: number;
  amount: number;
  opening: number;
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
  const [reportDate, setReportDate] = useState(new Date().toISOString().split('T')[0]);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);
  const [reportId, setReportId] = useState<string | null>(null);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [medicineDataUpdated, setMedicineDataUpdated] = useState<Date | null>(null);
  const [isRefreshingMedicine, setIsRefreshingMedicine] = useState(false);
  const autoSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isInitialLoadRef = useRef(true);
  
  // Patient counts
  const [newPatients, setNewPatients] = useState(0);
  const [followUpPatients, setFollowUpPatients] = useState(0);
  
  // Medicine data by category
  const [bnxMedicines, setBnxMedicines] = useState<MedicineReportItem[]>([]);
  const [tapentadolMedicines, setTapentadolMedicines] = useState<MedicineReportItem[]>([]);
  const [psychiatryMedicines, setPsychiatryMedicines] = useState<MedicineReportItem[]>([]);
  const [otherMedicines, setOtherMedicines] = useState<MedicineReportItem[]>([]);
  
  // Cash management
  const [cashPreviousDay, setCashPreviousDay] = useState(0);
  const [looseBalance, setLooseBalance] = useState(5000);
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
        setLooseBalance(Number(data.loose_balance) || 5000);
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
        setCashPreviousDay(0);
        setLooseBalance(5000);
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
        loose_balance: looseBalance,
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
      }
      setLastSaved(new Date());
    } catch (error: any) {
      console.error('Error saving report:', error);
      toast.error('Failed to save report: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  // Auto-save with debounce
  const triggerAutoSave = useCallback(() => {
    if (isInitialLoadRef.current || loading) return;
    
    if (autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current);
    }
    
    autoSaveTimeoutRef.current = setTimeout(() => {
      saveReport();
    }, 1500);
  }, [reportDate, newPatients, followUpPatients, cashPreviousDay, looseBalance, depositInBank, 
      paytmGpay, cashHandoverAmarjeet, cashHandoverMandeep, cashHandoverSir, adjustments,
      tapentadolPatients, psychiatryPatients, fees, labCollection, psychiatryCollection,
      cashDetails, expenses]);

  // Watch for changes and trigger auto-save
  useEffect(() => {
    triggerAutoSave();
    return () => {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }
    };
  }, [newPatients, followUpPatients, cashPreviousDay, looseBalance, depositInBank,
      paytmGpay, cashHandoverAmarjeet, cashHandoverMandeep, cashHandoverSir, adjustments,
      tapentadolPatients, psychiatryPatients, fees, labCollection, psychiatryCollection,
      cashDetails, expenses]);

  useEffect(() => {
    isInitialLoadRef.current = true;
    loadSavedReport().then(() => {
      setTimeout(() => {
        isInitialLoadRef.current = false;
      }, 100);
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

      let soldQuantities: Record<string, number> = {};
      
      if (invoiceIds.length > 0) {
        const { data: invoiceItems } = await supabase
          .from('invoice_items')
          .select('medicine_name, quantity')
          .in('invoice_id', invoiceIds);

        soldQuantities = (invoiceItems || []).reduce((acc: Record<string, number>, item) => {
          acc[item.medicine_name] = (acc[item.medicine_name] || 0) + item.quantity;
          return acc;
        }, {});
      }

      // Get stock received from GRN
      const { data: grnOrders } = await supabase
        .from('purchase_orders')
        .select('id')
        .like('grn_date', `${reportDate}%`)
        .eq('status', 'Received');

      const grnOrderIds = grnOrders?.map(po => po.id) || [];
      
      let receivedQuantities: Record<string, number> = {};
      
      if (grnOrderIds.length > 0) {
        const { data: poItems } = await supabase
          .from('purchase_order_items')
          .select('stock_item_name, quantity')
          .in('purchase_order_id', grnOrderIds);

        receivedQuantities = (poItems || []).reduce((acc: Record<string, number>, item) => {
          acc[item.stock_item_name] = (acc[item.stock_item_name] || 0) + item.quantity;
          return acc;
        }, {});
      }

      // Categorize medicines
      const bnxKeywords = ['addnok', 'buset', 'boquit', 'ari-rok'];
      const tapentadolKeywords = ['tapyad', 'tapentadol', 'winam', 'wilcid', 'laxwin', 'quetianpine', 'emega'];
      const psychiatryKeywords = ['aftin', 'amitri', 'divshor', 'donakem', 'esctolpram', 'ewin', 'heprox', 'lithtash', 'clonidine', 'nepz', 'ojopine', 'pilo', 'pregabalin', 'proxy', 'santrol', 'depwin', 'winforce', 'ispro', 'quit'];

      const categorizeItem = (name: string): string => {
        const lowerName = name.toLowerCase();
        if (bnxKeywords.some(k => lowerName.includes(k))) return 'bnx';
        if (tapentadolKeywords.some(k => lowerName.includes(k))) return 'tapentadol';
        if (psychiatryKeywords.some(k => lowerName.includes(k))) return 'psychiatry';
        return 'other';
      };

      const createMedicineData = (items: typeof stockItems): MedicineReportItem[] => {
        return items
          .map(item => {
            const sold = soldQuantities[item.name] || 0;
            const received = receivedQuantities[item.name] || 0;
            
            // Use opening from stock_snapshot (captured at 00:00 IST), fallback to current stock
            const snapshotData = stockSnapshot[item.name];
            const isFromSnapshot = snapshotData?.opening !== undefined;
            const opening = snapshotData?.opening ?? item.currentStock;
            const closing = opening - sold + received;

            return {
              brand: item.name,
              qtySold: sold,
              rate: item.mrp || item.unitPrice,
              amount: sold * (item.mrp || item.unitPrice),
              opening,
              stockReceived: received,
              closing,
              isFromSnapshot,
            };
          })
          .filter(item => item.qtySold > 0 || item.stockReceived > 0);
      };

      const allMedicineData = createMedicineData(stockItems);
      
      setBnxMedicines(allMedicineData.filter(m => categorizeItem(m.brand) === 'bnx'));
      setTapentadolMedicines(allMedicineData.filter(m => categorizeItem(m.brand) === 'tapentadol'));
      setPsychiatryMedicines(allMedicineData.filter(m => categorizeItem(m.brand) === 'psychiatry'));
      setOtherMedicines(allMedicineData.filter(m => categorizeItem(m.brand) === 'other'));
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
  const tapentadolTotal = tapentadolMedicines.reduce((sum, item) => sum + item.amount, 0);
  const psychiatryTotal = psychiatryMedicines.reduce((sum, item) => sum + item.amount, 0);
  const otherTotal = otherMedicines.reduce((sum, item) => sum + item.amount, 0);
  
  const totalExpenses = expenses.reduce((sum, item) => sum + item.amount, 0);
  const totalCash = cashDetails.reduce((sum, item) => sum + item.amount, 0);
  
  const totalSale = bnxTotal + tapentadolTotal + psychiatryTotal + otherTotal + fees + labCollection;
  const todaysCollection = totalSale;
  const cashLeftInHand = cashPreviousDay + todaysCollection + looseBalance - totalExpenses - depositInBank - paytmGpay - cashHandoverAmarjeet - cashHandoverMandeep - cashHandoverSir + adjustments;
  
  const totalAsPerSheet = totalSale;
  const difference = totalAsPerSheet - totalCash - paytmGpay;

  const totalPatients = newPatients + followUpPatients;
  const totalCollection = fees + labCollection + psychiatryCollection;

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: '2-digit' });
  };

  const exportToExcel = () => {
    const workbook = XLSX.utils.book_new();

    const reportData: any[][] = [
      [formatDate(reportDate)],
      [],
      ['BNX Details:', '', '', '', '', '', '', '', 'Pharmacy Sale:'],
      ['New Patients', newPatients, '', '', '', '', '', 'Tapentadol Patients', tapentadolPatients],
      ['Follow up Patients', followUpPatients, '', '', '', '', '', 'Psychiatry Patients', psychiatryPatients],
      ['Total Patients', totalPatients, '', '', '', '', '', 'Fees', fees],
      ['Brand', 'Qty sold', 'Rate', 'Amount', 'Opening', 'Stock Received', 'Closing', 'Lab Collection', labCollection],
    ];

    bnxMedicines.forEach(m => {
      reportData.push([m.brand, m.qtySold, m.rate, m.amount, m.opening, m.stockReceived, m.closing]);
    });
    reportData.push(['BNX Total', '', '', bnxTotal]);
    reportData.push([]);

    reportData.push(['Cash Management']);
    reportData.push(['Cash in Hand (Previous Day)', cashPreviousDay]);
    reportData.push(["Today's Collection", todaysCollection]);
    reportData.push(['Loose Balance', looseBalance]);
    reportData.push(['Expenses', totalExpenses]);
    reportData.push(['Deposit in Bank', depositInBank]);
    reportData.push(['Paytm/GPay', paytmGpay]);
    reportData.push(['Cash H/O to Amarjeet Sir', cashHandoverAmarjeet]);
    reportData.push(['Cash H/O to Mandeep Sir', cashHandoverMandeep]);
    reportData.push(['Cash H/O to Sir', cashHandoverSir]);
    reportData.push(['Adjustments', adjustments]);
    reportData.push(['Cash left in hand (Today)', cashLeftInHand]);
    reportData.push([]);

    if (tapentadolMedicines.length > 0) {
      reportData.push(['Tapentadol Medicines']);
      reportData.push(['Brand', 'Qty sold', 'Rate', 'Amount', 'Opening', 'Stock Received', 'Closing']);
      tapentadolMedicines.forEach(m => {
        reportData.push([m.brand, m.qtySold, m.rate, m.amount, m.opening, m.stockReceived, m.closing]);
      });
      reportData.push(['Total', '', '', tapentadolTotal]);
      reportData.push([]);
    }

    if (psychiatryMedicines.length > 0) {
      reportData.push(['Psychiatry Medicines']);
      reportData.push(['Brand', 'Qty sold', 'Rate', 'Amount', 'Opening', 'Stock Received', 'Closing']);
      psychiatryMedicines.forEach(m => {
        reportData.push([m.brand, m.qtySold, m.rate, m.amount, m.opening, m.stockReceived, m.closing]);
      });
      reportData.push(['Total', '', '', psychiatryTotal]);
      reportData.push([]);
    }

    reportData.push(['Summary']);
    reportData.push(['BNX Collection', bnxTotal]);
    reportData.push(['Tapentadol Collection', tapentadolTotal]);
    reportData.push(['Psychiatry Collection', psychiatryTotal]);
    reportData.push(['Fees', fees]);
    reportData.push(['Lab Collection', labCollection]);
    reportData.push(['Total Sale', totalSale]);
    reportData.push([]);

    reportData.push(['CASH DETAILS']);
    reportData.push(['Denomination', 'Count', 'Amount']);
    cashDetails.forEach(c => {
      reportData.push([c.denomination, c.count, c.amount]);
    });
    reportData.push(['TOTAL', '', totalCash]);
    reportData.push(['TOTAL AS PER SHEET', '', totalAsPerSheet]);
    reportData.push(['PAYTM', '', paytmGpay]);
    reportData.push(['DIFFERENCE', '', difference]);

    const sheet = XLSX.utils.aoa_to_sheet(reportData);
    XLSX.utils.book_append_sheet(workbook, sheet, 'Day Report');

    XLSX.writeFile(workbook, `Day_Report_${reportDate}.xlsx`);
  };

  const MedicineTable = ({ data, title, total }: { data: MedicineReportItem[], title: string, total: number }) => (
    <Card className="mb-4">
      <CardHeader className="bg-navy text-white py-2 rounded-t-lg">
        <CardTitle className="text-sm">{title}</CardTitle>
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
                <span className="flex items-center justify-end gap-1">
                  Opening
                  <span className="text-[10px] font-normal text-muted-foreground">(
                    <span className="inline-block w-2 h-2 rounded-full bg-green-500 align-middle" /> snapshot
                    <span className="inline-block w-2 h-2 rounded-full bg-amber-500 align-middle ml-1" /> live
                  )</span>
                </span>
              </TableHead>
              <TableHead className="font-bold text-navy text-right">Stock Received</TableHead>
              <TableHead className="font-bold text-navy text-right">Closing</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-4 text-muted-foreground text-sm">
                  No data
                </TableCell>
              </TableRow>
            ) : (
              <>
                {data.map((item, index) => (
                  <TableRow key={index} className="text-xs">
                    <TableCell className="font-medium py-1">{item.brand}</TableCell>
                    <TableCell className="text-right py-1">{item.qtySold}</TableCell>
                    <TableCell className="text-right py-1">₹{item.rate}</TableCell>
                    <TableCell className="text-right py-1 font-semibold">₹{item.amount}</TableCell>
                    <TableCell className="text-right py-1">
                      <span className="flex items-center justify-end gap-1">
                        {item.opening}
                        <span 
                          className={`inline-block w-2 h-2 rounded-full ${item.isFromSnapshot ? 'bg-green-500' : 'bg-amber-500'}`}
                          title={item.isFromSnapshot ? 'From 00:00 IST snapshot' : 'Fallback to current stock'}
                        />
                      </span>
                    </TableCell>
                    <TableCell className="text-right py-1 text-green-600">{item.stockReceived}</TableCell>
                    <TableCell className="text-right py-1">{item.closing}</TableCell>
                  </TableRow>
                ))}
                <TableRow className="bg-gold/20 font-bold text-xs">
                  <TableCell>Total</TableCell>
                  <TableCell className="text-right">{data.reduce((s, i) => s + i.qtySold, 0)}</TableCell>
                  <TableCell></TableCell>
                  <TableCell className="text-right">₹{total}</TableCell>
                  <TableCell colSpan={3}></TableCell>
                </TableRow>
              </>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );

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
            {saving ? (
              <span className="text-muted-foreground flex items-center gap-1">
                <Loader2 className="h-3 w-3 animate-spin" /> Saving...
              </span>
            ) : lastSaved ? (
              <span className="text-green-600 flex items-center gap-1">
                <Check className="h-3 w-3" /> Auto-saved
              </span>
            ) : null}
            {medicineDataUpdated && (
              <span className="text-muted-foreground flex items-center gap-1 bg-muted px-2 py-0.5 rounded-full">
                <RefreshCw className="h-3 w-3" />
                Data updated {medicineDataUpdated.toLocaleTimeString()}
              </span>
            )}
          </div>
        </div>
        <div className="flex gap-2 items-center">
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
          <Button onClick={exportToExcel} size="sm" className="bg-gold hover:bg-gold/90 text-navy">
            <Download className="h-4 w-4 mr-1" />
            Export
          </Button>
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

          {/* Tapentadol Medicines */}
          <MedicineTable data={tapentadolMedicines} title="Tapentadol Medicines" total={tapentadolTotal} />

          {/* Psychiatry Medicines */}
          <MedicineTable data={psychiatryMedicines} title="Psychiatry Medicines" total={psychiatryTotal} />

          {/* Other Medicines */}
          {otherMedicines.length > 0 && (
            <MedicineTable data={otherMedicines} title="Other Medicines" total={otherTotal} />
          )}
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
              <div className="flex justify-between items-center">
                <span className="text-xs">Cash in Hand (Previous Day)</span>
                <Input
                  type="number"
                  value={cashPreviousDay || ''}
                  onChange={(e) => setCashPreviousDay(parseFloat(e.target.value) || 0)}
                  className="w-24 h-7 text-right"
                />
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs">Today's Collection</span>
                <span className="font-semibold">₹{todaysCollection.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs">Loose Balance</span>
                <Input
                  type="number"
                  value={looseBalance || ''}
                  onChange={(e) => setLooseBalance(parseFloat(e.target.value) || 0)}
                  className="w-24 h-7 text-right"
                />
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
            <p className="text-xs text-muted-foreground">Tapentadol Collection</p>
            <p className="text-lg font-bold text-navy">₹{tapentadolTotal}</p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-purple-500">
          <CardContent className="pt-4 pb-3">
            <p className="text-xs text-muted-foreground">Psychiatry Collection</p>
            <p className="text-lg font-bold text-navy">₹{psychiatryTotal}</p>
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
