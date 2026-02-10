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
import { Download, Calendar, Loader2, RefreshCw, CalendarRange } from "lucide-react";
import { DateRangeExportDialog } from "./DateRangeExportDialog";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import * as XLSX from "xlsx";
import { formatLocalISODate } from "@/lib/dateUtils";
import { formatNumber, roundTo2 } from "@/lib/formatUtils";

interface SaleReportItem {
  sNo: number;
  medicineName: string;
  category: string;
  openingStock: number;
  currentStock: number;
  saleQty: number;
  rate: number;
  value: number;
  stockReceived: number;
  closingStock: number;
  discrepancy: number;
  isFromSnapshot: boolean;
}

export default function SaleReport() {
  const [reportDate, setReportDate] = useState(() => formatLocalISODate());
  const [loading, setLoading] = useState(false);
  const [reportItems, setReportItems] = useState<SaleReportItem[]>([]);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [showDateRangeExport, setShowDateRangeExport] = useState(false);

  // Check if report date is today
  const isToday = reportDate === formatLocalISODate();

  const loadReportData = useCallback(async () => {
    setLoading(true);
    try {
      // 1. Get current stock items (for current stock and rates)
      const { data: stockItems, error: stockError } = await supabase
        .from('stock_items')
        .select('item_id, name, category, current_stock, unit_price, mrp')
        .order('name');

      if (stockError) throw stockError;

      // Aggregate stock items by medicine NAME (combine all batches)
      const aggregatedByName: Record<string, {
        name: string;
        category: string;
        totalCurrentStock: number;
        avgRate: number;
        itemIds: number[];
      }> = {};

      (stockItems || []).forEach(item => {
        const key = item.name.toLowerCase();
        if (!aggregatedByName[key]) {
          aggregatedByName[key] = {
            name: item.name,
            category: item.category,
            totalCurrentStock: 0,
            avgRate: item.mrp || item.unit_price || 0,
            itemIds: [],
          };
        }
        aggregatedByName[key].totalCurrentStock += item.current_stock;
        aggregatedByName[key].itemIds.push(item.item_id);
        // Use the highest MRP/rate among batches
        const rate = item.mrp || item.unit_price || 0;
        if (rate > aggregatedByName[key].avgRate) {
          aggregatedByName[key].avgRate = rate;
        }
      });

      // 2. Get day report's stock_snapshot for opening stock at 00:00 IST
      const { data: dayReportData } = await supabase
        .from('day_reports')
        .select('stock_snapshot')
        .eq('report_date', reportDate)
        .maybeSingle();

      const stockSnapshot: Record<string, { opening?: number }> = 
        (dayReportData?.stock_snapshot as Record<string, { opening?: number }>) || {};

      // 3. Get invoice items for sales on selected date
      const { data: invoiceData } = await supabase
        .from('invoices')
        .select('id, invoice_date')
        .gte('invoice_date', `${reportDate}T00:00:00`)
        .lt('invoice_date', `${reportDate}T23:59:59.999`);

      const invoiceIds = invoiceData?.map(inv => inv.id) || [];

      // Aggregate sold quantities by medicine NAME (not ID)
      let soldQuantitiesByName: Record<string, number> = {};

      if (invoiceIds.length > 0) {
        const { data: invoiceItems } = await supabase
          .from('invoice_items')
          .select('medicine_id, medicine_name, quantity')
          .in('invoice_id', invoiceIds);

        (invoiceItems || []).forEach((it) => {
          // Aggregate by medicine name (case-insensitive)
          const key = (it.medicine_name || '').toLowerCase();
          soldQuantitiesByName[key] = (soldQuantitiesByName[key] || 0) + it.quantity;
        });
      }

      // 4. Get stock received from processed GRN (aggregate by medicine name)
      const { data: grnOrders } = await supabase
        .from('purchase_orders')
        .select('id')
        .gte('grn_date', `${reportDate}T00:00:00`)
        .lt('grn_date', `${reportDate}T23:59:59.999`)
        .eq('status', 'Received');

      const grnOrderIds = grnOrders?.map(po => po.id) || [];

      let receivedQuantitiesByName: Record<string, number> = {};

      if (grnOrderIds.length > 0) {
        const { data: poItems } = await supabase
          .from('purchase_order_items')
          .select('stock_item_id, stock_item_name, qty_in_tabs, quantity')
          .in('purchase_order_id', grnOrderIds);

        (poItems || []).forEach((it) => {
          // Use qty_in_tabs as primary (tab-based calculations), fallback to quantity
          const tabQty = it.qty_in_tabs || it.quantity || 0;
          // Aggregate by medicine name (case-insensitive)
          const key = (it.stock_item_name || '').toLowerCase();
          receivedQuantitiesByName[key] = (receivedQuantitiesByName[key] || 0) + tabQty;
        });
      }

      // 5. Build report data - one row per unique medicine name
      const items: SaleReportItem[] = Object.values(aggregatedByName).map((agg, index) => {
        const key = agg.name.toLowerCase();
        const snapshotData = stockSnapshot[agg.name];
        const isFromSnapshot = snapshotData?.opening !== undefined;
        
        // Opening stock: from snapshot (00:01 IST) or fallback to current total
        const openingStock = isFromSnapshot ? snapshotData.opening! : agg.totalCurrentStock;
        const currentStock = agg.totalCurrentStock;
        
        // Sales quantity from invoices (aggregated by name)
        const saleQty = soldQuantitiesByName[key] ?? 0;
        
        // Rate from aggregated data
        const rate = agg.avgRate;
        
        // Value = saleQty * rate
        const value = saleQty * rate;
        
        // Stock received from GRN (aggregated by name)
        const stockReceived = receivedQuantitiesByName[key] ?? 0;
        
        // Closing stock = opening + received - sold
        const closingStock = openingStock + stockReceived - saleQty;
        
        // Discrepancy = Closing - Current (positive means missing stock, negative means extra)
        const discrepancy = closingStock - currentStock;

        return {
          sNo: index + 1,
          medicineName: agg.name,
          category: agg.category,
          openingStock,
          currentStock,
          saleQty,
          rate,
          value,
          stockReceived,
          closingStock,
          discrepancy,
          isFromSnapshot,
        };
      });

      // Filter out zero-stock items with no activity - only show items that have stock or transactions
      const filteredItems = items.filter(
        item => item.currentStock > 0 || item.openingStock > 0 || item.saleQty > 0 || item.stockReceived > 0
      );

      // Re-number after filtering
      const numberedItems = filteredItems.map((item, idx) => ({
        ...item,
        sNo: idx + 1,
      }));

      setReportItems(numberedItems);
      setLastUpdated(new Date());
    } catch (error: any) {
      console.error('Error loading sale report:', error);
      toast.error('Failed to load report: ' + error.message);
    } finally {
      setLoading(false);
    }
  }, [reportDate]);

  useEffect(() => {
    loadReportData();
  }, [loadReportData]);

  // Real-time subscriptions
  useEffect(() => {
    const channel = supabase
      .channel('sale-report-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'invoices' }, () => loadReportData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'invoice_items' }, () => loadReportData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'purchase_orders' }, () => loadReportData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'purchase_order_items' }, () => loadReportData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'stock_items' }, () => loadReportData())
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadReportData]);

  // Category-wise filtering
  const bnxItems = reportItems.filter(item => item.category === 'BNX');
  const tpnItems = reportItems.filter(item => item.category === 'TPN');
  const pshyItems = reportItems.filter(item => item.category === 'PSHY');

  // Totals
  const bnxTotalQty = bnxItems.reduce((sum, item) => sum + item.saleQty, 0);
  const bnxTotalValue = bnxItems.reduce((sum, item) => sum + item.value, 0);

  const tpnTotalQty = tpnItems.reduce((sum, item) => sum + item.saleQty, 0);
  const tpnTotalValue = tpnItems.reduce((sum, item) => sum + item.value, 0);

  const pshyTotalQty = pshyItems.reduce((sum, item) => sum + item.saleQty, 0);
  const pshyTotalValue = pshyItems.reduce((sum, item) => sum + item.value, 0);

  const grandTotalValue = bnxTotalValue + tpnTotalValue + pshyTotalValue;

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: '2-digit' });
  };

  const exportToExcel = () => {
    const workbook = XLSX.utils.book_new();

    // Prepare all items sorted by category
    const allSorted = [...bnxItems, ...tpnItems, ...pshyItems];
    let sNo = 1;

    const data: any[][] = [
      [`Sale Report - ${formatDate(reportDate)}`],
      [],
      ['S. No.', 'Medicine Name', 'Medicine Category', 'Opening Stock', 'Current Stock', 'Sale Qty', 'Rate/Tab', 'Value', 'Stock Received', 'Closing Stock', 'Discrepancy'],
    ];

    allSorted.forEach(item => {
      data.push([
        sNo++,
        item.medicineName,
        item.category,
        item.openingStock,
        item.currentStock,
        item.saleQty,
        roundTo2(item.rate),
        roundTo2(item.value),
        item.stockReceived,
        item.closingStock,
        item.discrepancy,
      ]);
    });

    // Add totals
    data.push([]);
    data.push(['TOTAL SALE (BNX)', '', 'BNX', '', '', bnxTotalQty, '', roundTo2(bnxTotalValue), '', '', '']);
    data.push(['TOTAL SALE (TPN)', '', 'TPN', '', '', tpnTotalQty, '', roundTo2(tpnTotalValue), '', '', '']);
    data.push(['TOTAL SALE (PSHY)', '', 'PSHY', '', '', pshyTotalQty, '', roundTo2(pshyTotalValue), '', '', '']);
    data.push(['GRAND TOTAL', '', 'BNX+TPN+PSHY', '', '', '', '', roundTo2(grandTotalValue), '', '', '']);

    const worksheet = XLSX.utils.aoa_to_sheet(data);
    
    // Set column widths
    worksheet['!cols'] = [
      { wch: 8 },   // S.No
      { wch: 25 },  // Medicine Name
      { wch: 18 },  // Category
      { wch: 14 },  // Opening
      { wch: 14 },  // Current
      { wch: 10 },  // Sale Qty
      { wch: 8 },   // Rate
      { wch: 12 },  // Value
      { wch: 14 },  // Stock Received
      { wch: 14 },  // Closing
      { wch: 12 },  // Discrepancy
    ];

    XLSX.utils.book_append_sheet(workbook, worksheet, 'Sale Report');
    XLSX.writeFile(workbook, `sale-report-${reportDate}.xlsx`);
    toast.success('Report exported successfully');
  };

  const exportDateRangeToExcel = async (startDate: Date, endDate: Date) => {
    const startDateStr = format(startDate, 'yyyy-MM-dd');
    const endDateStr = format(endDate, 'yyyy-MM-dd');

    // Get stock items
    const { data: stockItems, error: stockError } = await supabase
      .from('stock_items')
      .select('item_id, name, category, unit_price, mrp')
      .order('name');

    if (stockError) throw stockError;

    // Get invoices in date range
    const { data: invoiceData } = await supabase
      .from('invoices')
      .select('id, invoice_date')
      .gte('invoice_date', startDateStr)
      .lte('invoice_date', endDateStr);

    const invoiceIds = invoiceData?.map(inv => inv.id) || [];

    let soldQuantitiesById: Record<number, number> = {};
    let soldAmountsById: Record<number, number> = {};

    if (invoiceIds.length > 0) {
      const { data: invoiceItems } = await supabase
        .from('invoice_items')
        .select('medicine_id, quantity, mrp, unit_price')
        .in('invoice_id', invoiceIds);

      (invoiceItems || []).forEach((it) => {
        soldQuantitiesById[it.medicine_id] = (soldQuantitiesById[it.medicine_id] || 0) + it.quantity;
        const price = it.mrp || it.unit_price || 0;
        soldAmountsById[it.medicine_id] = (soldAmountsById[it.medicine_id] || 0) + (it.quantity * price);
      });
    }

    // Get stock received in date range
    const { data: grnOrders } = await supabase
      .from('purchase_orders')
      .select('id')
      .gte('grn_date', startDateStr)
      .lte('grn_date', endDateStr)
      .eq('status', 'Received');

    const grnOrderIds = grnOrders?.map(po => po.id) || [];
    let receivedQuantitiesById: Record<number, number> = {};

    if (grnOrderIds.length > 0) {
      const { data: poItems } = await supabase
        .from('purchase_order_items')
        .select('stock_item_id, qty_in_tabs, quantity')
        .in('purchase_order_id', grnOrderIds);

      (poItems || []).forEach((it) => {
        const tabQty = it.qty_in_tabs || it.quantity || 0;
        receivedQuantitiesById[it.stock_item_id] = (receivedQuantitiesById[it.stock_item_id] || 0) + tabQty;
      });
    }

    // Build report data
    const items = (stockItems || []).map((item, index) => {
      const saleQty = soldQuantitiesById[item.item_id] || 0;
      const rate = item.mrp || item.unit_price || 0;
      const value = soldAmountsById[item.item_id] || (saleQty * rate);
      const stockReceived = receivedQuantitiesById[item.item_id] || 0;

      return {
        sNo: index + 1,
        medicineName: item.name,
        category: item.category,
        saleQty,
        rate,
        value,
        stockReceived,
      };
    }).filter(item => item.saleQty > 0 || item.stockReceived > 0);

    // Group by category
    const bnx = items.filter(i => i.category === 'BNX');
    const tpn = items.filter(i => i.category === 'TPN');
    const pshy = items.filter(i => i.category === 'PSHY');

    const workbook = XLSX.utils.book_new();
    const data: any[][] = [
      [`Sale Report - ${format(startDate, 'dd MMM yyyy')} to ${format(endDate, 'dd MMM yyyy')}`],
      [],
      ['S. No.', 'Medicine Name', 'Category', 'Sale Qty', 'Rate/Tab', 'Value', 'Stock Received'],
    ];

    let sNo = 1;
    [...bnx, ...tpn, ...pshy].forEach(item => {
      data.push([sNo++, item.medicineName, item.category, item.saleQty, roundTo2(item.rate), roundTo2(item.value), item.stockReceived]);
    });

    data.push([]);
    data.push(['TOTAL BNX', '', 'BNX', bnx.reduce((s, i) => s + i.saleQty, 0), '', roundTo2(bnx.reduce((s, i) => s + i.value, 0)), '']);
    data.push(['TOTAL TPN', '', 'TPN', tpn.reduce((s, i) => s + i.saleQty, 0), '', roundTo2(tpn.reduce((s, i) => s + i.value, 0)), '']);
    data.push(['TOTAL PSHY', '', 'PSHY', pshy.reduce((s, i) => s + i.saleQty, 0), '', roundTo2(pshy.reduce((s, i) => s + i.value, 0)), '']);
    data.push(['GRAND TOTAL', '', '', items.reduce((s, i) => s + i.saleQty, 0), '', roundTo2(items.reduce((s, i) => s + i.value, 0)), '']);

    const worksheet = XLSX.utils.aoa_to_sheet(data);
    worksheet['!cols'] = [{ wch: 8 }, { wch: 25 }, { wch: 12 }, { wch: 10 }, { wch: 10 }, { wch: 12 }, { wch: 14 }];
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Sale Report');
    XLSX.writeFile(workbook, `sale-report-${startDateStr}-to-${endDateStr}.xlsx`);
    toast.success('Report exported successfully');
  };

  const renderCategoryTable = (items: SaleReportItem[], categoryLabel: string, totalQty: number, totalValue: number) => (
    <div className="space-y-2">
      <h3 className="font-semibold text-lg text-foreground">{categoryLabel}</h3>
      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead className="w-16 font-bold">S. No.</TableHead>
              <TableHead className="font-bold">Medicine Name</TableHead>
              <TableHead className="text-right font-bold">Opening Stock</TableHead>
              <TableHead className="text-right font-bold">Current Stock</TableHead>
              <TableHead className="text-right font-bold">Sale Qty</TableHead>
              <TableHead className="text-right font-bold">Rate/Tab</TableHead>
              <TableHead className="text-right font-bold">Value</TableHead>
              <TableHead className="text-right font-bold">Stock Received</TableHead>
              <TableHead className="text-right font-bold">Closing</TableHead>
              <TableHead className="text-right font-bold">Discrepancy</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={10} className="text-center text-muted-foreground py-4">
                  No data for this category
                </TableCell>
              </TableRow>
            ) : (
              items.map((item, idx) => (
                <TableRow key={item.medicineName} className={idx % 2 === 0 ? 'bg-background' : 'bg-muted/30'}>
                  <TableCell className="py-1">{idx + 1}</TableCell>
                  <TableCell className="py-1 font-medium">{item.medicineName}</TableCell>
                  <TableCell className="text-right py-1">
                    <span className="flex items-center justify-end gap-1">
                      {item.openingStock}
                      {!item.isFromSnapshot && (
                        <span 
                          className="inline-block w-2 h-2 rounded-full bg-amber-500"
                          title="No snapshot available - showing current stock as opening"
                        />
                      )}
                    </span>
                  </TableCell>
                  <TableCell className="text-right py-1">{item.currentStock}</TableCell>
                  <TableCell className="text-right py-1">{item.saleQty}</TableCell>
                  <TableCell className="text-right py-1">₹{formatNumber(item.rate)}</TableCell>
                  <TableCell className="text-right py-1 font-medium">₹{formatNumber(item.value)}</TableCell>
                  <TableCell className="text-right py-1">{item.stockReceived}</TableCell>
                  <TableCell className="text-right py-1">{item.closingStock}</TableCell>
                  <TableCell className={`text-right py-1 font-medium ${
                    item.discrepancy !== 0 
                      ? item.discrepancy > 0 
                        ? 'text-amber-600 dark:text-amber-400' 
                        : 'text-red-600 dark:text-red-400'
                      : 'text-green-600 dark:text-green-400'
                  }`}>
                    {item.discrepancy !== 0 ? (item.discrepancy > 0 ? '+' : '') + item.discrepancy : '✓'}
                  </TableCell>
                </TableRow>
              ))
            )}
            <TableRow className="bg-primary/10 font-bold">
              <TableCell colSpan={4} className="py-2">TOTAL ({categoryLabel})</TableCell>
              <TableCell className="text-right py-2">{totalQty}</TableCell>
              <TableCell></TableCell>
              <TableCell className="text-right py-2">₹{formatNumber(totalValue)}</TableCell>
              <TableCell colSpan={3}></TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>
    </div>
  );

  return (
    <Card className="w-full">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <div>
          <CardTitle className="text-2xl font-bold">Sale Report</CardTitle>
          <p className="text-sm text-muted-foreground mt-1">
            Opening Stock from 00:01 IST snapshot | Closing = Opening + Received - Sold
          </p>
        </div>
        <div className="flex items-center gap-3">
          {lastUpdated && (
            <span className="text-xs text-muted-foreground">
              Updated: {lastUpdated.toLocaleTimeString()}
            </span>
          )}
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <Input
              type="date"
              value={reportDate}
              onChange={(e) => setReportDate(e.target.value)}
              className="w-40"
            />
          </div>
          <Button variant="outline" size="icon" onClick={loadReportData} disabled={loading}>
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
          <Button onClick={exportToExcel} disabled={loading}>
            <Download className="h-4 w-4 mr-2" />
            Export Excel
          </Button>
          <Button variant="outline" onClick={() => setShowDateRangeExport(true)} disabled={loading}>
            <CalendarRange className="h-4 w-4 mr-2" />
            Date Range Export
          </Button>
        </div>
      </CardHeader>
      
      <DateRangeExportDialog
        open={showDateRangeExport}
        onOpenChange={setShowDateRangeExport}
        onExport={exportDateRangeToExcel}
        title="Export Sale Report"
        description="Select date range to export sales data"
      />
      <CardContent className="space-y-6">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <span className="ml-2 text-muted-foreground">Loading report...</span>
          </div>
        ) : (
          <>
            {/* BNX Section */}
            {renderCategoryTable(bnxItems, 'BNX', bnxTotalQty, bnxTotalValue)}

            {/* TPN (Tapentadol) Section */}
            {renderCategoryTable(tpnItems, 'TPN (Tapentadol)', tpnTotalQty, tpnTotalValue)}

            {/* PSHY (Psychiatry) Section */}
            {renderCategoryTable(pshyItems, 'PSHY (Psychiatry)', pshyTotalQty, pshyTotalValue)}

            {/* Grand Total */}
            <div className="border rounded-lg p-4 bg-primary/5">
              <div className="flex justify-between items-center">
                <span className="text-lg font-bold">GRAND TOTAL (BNX + TPN + PSHY)</span>
                <span className="text-2xl font-bold text-primary">₹{formatNumber(grandTotalValue)}</span>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
