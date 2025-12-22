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
import { Download, Calendar, Loader2, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import * as XLSX from "xlsx";

interface SaleReportItem {
  sNo: number;
  medicineName: string;
  category: string;
  openingStock: number;
  saleQty: number;
  rate: number;
  value: number;
  stockReceived: number;
  closingStock: number;
  isFromSnapshot: boolean;
}

export default function SaleReport() {
  const [reportDate, setReportDate] = useState(new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(false);
  const [reportItems, setReportItems] = useState<SaleReportItem[]>([]);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const loadReportData = useCallback(async () => {
    setLoading(true);
    try {
      // 1. Get current stock items (for current stock and rates)
      const { data: stockItems, error: stockError } = await supabase
        .from('stock_items')
        .select('item_id, name, category, current_stock, unit_price, mrp')
        .order('name');

      if (stockError) throw stockError;

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

      // 4. Get stock received from processed GRN
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

      // 5. Build report data
      const items: SaleReportItem[] = (stockItems || []).map((item, index) => {
        const snapshotData = stockSnapshot[item.name];
        const isFromSnapshot = snapshotData?.opening !== undefined;
        
        // Opening stock: from snapshot (00:00 IST) or fallback to current
        const openingStock = isFromSnapshot ? snapshotData.opening! : item.current_stock;
        
        // Sales quantity from invoices
        const saleQty = soldQuantities[item.name] || 0;
        
        // Rate from stock
        const rate = item.mrp || item.unit_price || 0;
        
        // Value = saleQty * rate
        const value = saleQty * rate;
        
        // Stock received from GRN
        const stockReceived = receivedQuantities[item.name] || 0;
        
        // Closing stock = opening - sold + received
        const closingStock = openingStock - saleQty + stockReceived;

        return {
          sNo: index + 1,
          medicineName: item.name,
          category: item.category,
          openingStock,
          saleQty,
          rate,
          value,
          stockReceived,
          closingStock,
          isFromSnapshot,
        };
      });

      // Filter to show only items with activity or from snapshot
      const filteredItems = items.filter(
        item => item.saleQty > 0 || item.stockReceived > 0 || item.isFromSnapshot
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
      ['S. No.', 'Medicine Name', 'Medicine Category', 'Stock Opening', 'Sale Qty', 'Rate', 'Value', 'Stock Received', 'Closing Stock'],
    ];

    allSorted.forEach(item => {
      data.push([
        sNo++,
        item.medicineName,
        item.category,
        item.openingStock,
        item.saleQty,
        item.rate,
        item.value,
        item.stockReceived,
        item.closingStock,
      ]);
    });

    // Add totals
    data.push([]);
    data.push(['TOTAL SALE (BNX)', '', 'BNX', '', bnxTotalQty, '', bnxTotalValue, '', '']);
    data.push(['TOTAL SALE (TPN)', '', 'TPN', '', tpnTotalQty, '', tpnTotalValue, '', '']);
    data.push(['TOTAL SALE (PSHY)', '', 'PSHY', '', pshyTotalQty, '', pshyTotalValue, '', '']);
    data.push(['GRAND TOTAL', '', 'BNX+TPN+PSHY', '', '', '', grandTotalValue, '', '']);

    const worksheet = XLSX.utils.aoa_to_sheet(data);
    
    // Set column widths
    worksheet['!cols'] = [
      { wch: 8 },   // S.No
      { wch: 25 },  // Medicine Name
      { wch: 18 },  // Category
      { wch: 14 },  // Opening
      { wch: 10 },  // Sale Qty
      { wch: 8 },   // Rate
      { wch: 12 },  // Value
      { wch: 14 },  // Stock Received
      { wch: 14 },  // Closing
    ];

    XLSX.utils.book_append_sheet(workbook, worksheet, 'Sale Report');
    XLSX.writeFile(workbook, `sale-report-${reportDate}.xlsx`);
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
              <TableHead className="text-right font-bold">
                <span className="flex items-center justify-end gap-1">
                  Opening
                  <span className="text-[10px] font-normal text-muted-foreground">(
                    <span className="inline-block w-2 h-2 rounded-full bg-green-500 align-middle" /> snapshot
                    <span className="inline-block w-2 h-2 rounded-full bg-amber-500 align-middle ml-1" /> live
                  )</span>
                </span>
              </TableHead>
              <TableHead className="text-right font-bold">Sale Qty</TableHead>
              <TableHead className="text-right font-bold">Rate</TableHead>
              <TableHead className="text-right font-bold">Value</TableHead>
              <TableHead className="text-right font-bold">Stock Received</TableHead>
              <TableHead className="text-right font-bold">Closing</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center text-muted-foreground py-4">
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
                      <span 
                        className={`inline-block w-2 h-2 rounded-full ${item.isFromSnapshot ? 'bg-green-500' : 'bg-amber-500'}`}
                        title={item.isFromSnapshot ? 'From 00:00 IST snapshot' : 'Fallback to current stock'}
                      />
                    </span>
                  </TableCell>
                  <TableCell className="text-right py-1">{item.saleQty}</TableCell>
                  <TableCell className="text-right py-1">₹{item.rate.toFixed(2)}</TableCell>
                  <TableCell className="text-right py-1 font-medium">₹{item.value.toFixed(2)}</TableCell>
                  <TableCell className="text-right py-1">{item.stockReceived}</TableCell>
                  <TableCell className="text-right py-1">{item.closingStock}</TableCell>
                </TableRow>
              ))
            )}
            <TableRow className="bg-primary/10 font-bold">
              <TableCell colSpan={3} className="py-2">TOTAL ({categoryLabel})</TableCell>
              <TableCell className="text-right py-2">{totalQty}</TableCell>
              <TableCell></TableCell>
              <TableCell className="text-right py-2">₹{totalValue.toFixed(2)}</TableCell>
              <TableCell colSpan={2}></TableCell>
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
            Opening from 00:00 IST snapshot • Current stock in real-time
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
        </div>
      </CardHeader>
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
                <span className="text-2xl font-bold text-primary">₹{grandTotalValue.toFixed(2)}</span>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
