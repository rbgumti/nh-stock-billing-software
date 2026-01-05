import { useState, useEffect } from "react";
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
import { Download, Calendar, Filter, RefreshCw, Pill, Droplets, Brain } from "lucide-react";
import { useStockStore } from "@/hooks/useStockStore";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import * as XLSX from "xlsx";

interface StockReportItem {
  name: string;
  category: string;
  stockOpening: number;
  issuedToPatients: number;
  stockReceived: number;
  stockClosing: number;
}

export default function DailyStockReport() {
  const { stockItems } = useStockStore();
  const [reportDate, setReportDate] = useState(new Date().toISOString().split('T')[0]);
  const [reportData, setReportData] = useState<StockReportItem[]>([]);
  const [showOnlyActive, setShowOnlyActive] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    loadReportData();
  }, [stockItems, reportDate, showOnlyActive]);

  // Real-time subscriptions for invoices and purchase orders
  useEffect(() => {
    const channel = supabase
      .channel('daily-stock-report-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'invoices' }, () => {
        loadReportData();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'invoice_items' }, () => {
        loadReportData();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'purchase_orders' }, () => {
        loadReportData();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'purchase_order_items' }, () => {
        loadReportData();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [reportDate, showOnlyActive, stockItems]);

  const loadReportData = async () => {
    setIsRefreshing(true);
    try {
      // Get invoice items for the selected date to calculate issued quantities
      const { data: invoiceData } = await supabase
        .from('invoices')
        .select('id, invoice_date')
        .like('invoice_date', `${reportDate}%`);

      const invoiceIds = invoiceData?.map(inv => inv.id) || [];

      let issuedQuantities: Record<string, number> = {};
      
      if (invoiceIds.length > 0) {
        const { data: invoiceItems } = await supabase
          .from('invoice_items')
          .select('medicine_name, quantity')
          .in('invoice_id', invoiceIds);

        issuedQuantities = (invoiceItems || []).reduce((acc: Record<string, number>, item) => {
          acc[item.medicine_name] = (acc[item.medicine_name] || 0) + item.quantity;
          return acc;
        }, {});
      }

      // Get stock received from GRN (purchase orders with grn_date matching report date)
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

      // Calculate report data for each stock item (medicines)
      const data: StockReportItem[] = stockItems
        .map(item => {
          const issued = issuedQuantities[item.name] || 0;
          const received = receivedQuantities[item.name] || 0;
          const stockOpening = item.currentStock;
          const stockClosing = stockOpening - issued + received;

          return {
            name: item.name,
            category: item.category || 'BNX',
            stockOpening,
            issuedToPatients: issued,
            stockReceived: received,
            stockClosing,
          };
        })
        .filter(item => !showOnlyActive || item.issuedToPatients > 0 || item.stockReceived > 0);

      setReportData(data);
      setLastUpdated(new Date());
    } finally {
      setIsRefreshing(false);
    }
  };

  // Filter data by category
  const bnxItems = reportData.filter(item => item.category === 'BNX');
  const tpnItems = reportData.filter(item => item.category === 'TPN');
  const pshyItems = reportData.filter(item => item.category === 'PSHY');

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'BNX': return <Pill className="h-4 w-4" />;
      case 'TPN': return <Droplets className="h-4 w-4" />;
      case 'PSHY': return <Brain className="h-4 w-4" />;
      default: return <Pill className="h-4 w-4" />;
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'BNX': return 'bg-blue-600';
      case 'TPN': return 'bg-amber-600';
      case 'PSHY': return 'bg-purple-600';
      default: return 'bg-gray-600';
    }
  };

  const getCategoryBorderColor = (category: string) => {
    switch (category) {
      case 'BNX': return 'border-l-blue-600';
      case 'TPN': return 'border-l-amber-600';
      case 'PSHY': return 'border-l-purple-600';
      default: return 'border-l-gray-600';
    }
  };

  const renderCategoryTable = (items: StockReportItem[], category: string, categoryLabel: string) => {
    const totalOpening = items.reduce((sum, item) => sum + item.stockOpening, 0);
    const totalIssued = items.reduce((sum, item) => sum + item.issuedToPatients, 0);
    const totalReceived = items.reduce((sum, item) => sum + item.stockReceived, 0);
    const totalClosing = items.reduce((sum, item) => sum + item.stockClosing, 0);

    return (
      <Card className={`border-l-4 ${getCategoryBorderColor(category)}`}>
        <CardHeader className={`${getCategoryColor(category)} text-white rounded-t-lg`}>
          <CardTitle className="flex items-center gap-2">
            {getCategoryIcon(category)}
            {categoryLabel} Stock
            <Badge variant="secondary" className="ml-auto bg-white/20 text-white">
              {items.length} items
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="font-bold">Medicine Name</TableHead>
                  <TableHead className="font-bold text-right">Opening</TableHead>
                  <TableHead className="font-bold text-right">Issued</TableHead>
                  <TableHead className="font-bold text-right">Received</TableHead>
                  <TableHead className="font-bold text-right">Closing</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                      No {categoryLabel} stock data for this date
                    </TableCell>
                  </TableRow>
                ) : (
                  <>
                    {items.map((item, index) => (
                      <TableRow key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-muted/30'}>
                        <TableCell className="font-medium">{item.name}</TableCell>
                        <TableCell className="text-right">{item.stockOpening}</TableCell>
                        <TableCell className="text-right font-semibold text-amber-600">{item.issuedToPatients}</TableCell>
                        <TableCell className="text-right text-green-600">{item.stockReceived}</TableCell>
                        <TableCell className="text-right font-semibold">{item.stockClosing}</TableCell>
                      </TableRow>
                    ))}
                    <TableRow className={`${getCategoryColor(category)} text-white font-bold`}>
                      <TableCell>Total</TableCell>
                      <TableCell className="text-right">{totalOpening}</TableCell>
                      <TableCell className="text-right">{totalIssued}</TableCell>
                      <TableCell className="text-right">{totalReceived}</TableCell>
                      <TableCell className="text-right">{totalClosing}</TableCell>
                    </TableRow>
                  </>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    );
  };

  const exportToExcel = () => {
    const workbook = XLSX.utils.book_new();
    
    // BNX Sheet
    const bnxData = bnxItems.map(item => ({
      'Medicine Name': item.name,
      'Stock Opening': item.stockOpening,
      'Issued to Patients': item.issuedToPatients,
      'Stock Received': item.stockReceived,
      'Stock Closing': item.stockClosing,
    }));
    bnxData.push({
      'Medicine Name': 'TOTAL',
      'Stock Opening': bnxItems.reduce((sum, item) => sum + item.stockOpening, 0),
      'Issued to Patients': bnxItems.reduce((sum, item) => sum + item.issuedToPatients, 0),
      'Stock Received': bnxItems.reduce((sum, item) => sum + item.stockReceived, 0),
      'Stock Closing': bnxItems.reduce((sum, item) => sum + item.stockClosing, 0),
    });
    const bnxSheet = XLSX.utils.json_to_sheet(bnxData);
    XLSX.utils.book_append_sheet(workbook, bnxSheet, 'BNX Stock');
    
    // TPN Sheet
    const tpnData = tpnItems.map(item => ({
      'Medicine Name': item.name,
      'Stock Opening': item.stockOpening,
      'Issued to Patients': item.issuedToPatients,
      'Stock Received': item.stockReceived,
      'Stock Closing': item.stockClosing,
    }));
    tpnData.push({
      'Medicine Name': 'TOTAL',
      'Stock Opening': tpnItems.reduce((sum, item) => sum + item.stockOpening, 0),
      'Issued to Patients': tpnItems.reduce((sum, item) => sum + item.issuedToPatients, 0),
      'Stock Received': tpnItems.reduce((sum, item) => sum + item.stockReceived, 0),
      'Stock Closing': tpnItems.reduce((sum, item) => sum + item.stockClosing, 0),
    });
    const tpnSheet = XLSX.utils.json_to_sheet(tpnData);
    XLSX.utils.book_append_sheet(workbook, tpnSheet, 'TPN Stock');
    
    // PSHY Sheet
    const pshyData = pshyItems.map(item => ({
      'Medicine Name': item.name,
      'Stock Opening': item.stockOpening,
      'Issued to Patients': item.issuedToPatients,
      'Stock Received': item.stockReceived,
      'Stock Closing': item.stockClosing,
    }));
    pshyData.push({
      'Medicine Name': 'TOTAL',
      'Stock Opening': pshyItems.reduce((sum, item) => sum + item.stockOpening, 0),
      'Issued to Patients': pshyItems.reduce((sum, item) => sum + item.issuedToPatients, 0),
      'Stock Received': pshyItems.reduce((sum, item) => sum + item.stockReceived, 0),
      'Stock Closing': pshyItems.reduce((sum, item) => sum + item.stockClosing, 0),
    });
    const pshySheet = XLSX.utils.json_to_sheet(pshyData);
    XLSX.utils.book_append_sheet(workbook, pshySheet, 'PSHY Stock');

    XLSX.writeFile(workbook, `Daily_Stock_Report_${reportDate}.xlsx`);
  };

  // Calculate grand totals
  const grandTotalOpening = reportData.reduce((sum, item) => sum + item.stockOpening, 0);
  const grandTotalIssued = reportData.reduce((sum, item) => sum + item.issuedToPatients, 0);
  const grandTotalReceived = reportData.reduce((sum, item) => sum + item.stockReceived, 0);
  const grandTotalClosing = reportData.reduce((sum, item) => sum + item.stockClosing, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <h2 className="text-2xl font-bold text-navy">Daily Stock Report</h2>
          {lastUpdated && (
            <span className="text-xs text-muted-foreground flex items-center gap-1 bg-muted px-2 py-1 rounded-full">
              <RefreshCw className="h-3 w-3" />
              Updated {lastUpdated.toLocaleTimeString()}
            </span>
          )}
        </div>
        <div className="flex gap-4 items-center flex-wrap">
          <div className="flex items-center gap-2">
            <Switch
              id="activity-filter"
              checked={showOnlyActive}
              onCheckedChange={setShowOnlyActive}
            />
            <Label htmlFor="activity-filter" className="text-sm cursor-pointer">
              <Filter className="h-4 w-4 inline mr-1" />
              Only with activity
            </Label>
          </div>
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-navy" />
            <Input
              type="date"
              value={reportDate}
              onChange={(e) => setReportDate(e.target.value)}
              className="w-auto"
            />
            <Button
              variant="outline"
              size="icon"
              onClick={() => loadReportData()}
              disabled={isRefreshing}
              title="Refresh data"
            >
              <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            </Button>
          </div>
          <Button onClick={exportToExcel} className="bg-gold hover:bg-gold/90 text-navy">
            <Download className="h-4 w-4 mr-2" />
            Export Excel
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border-l-4 border-l-blue-600">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 mb-1">
              <Pill className="h-4 w-4 text-blue-600" />
              <p className="text-sm font-medium text-muted-foreground">BNX Items</p>
            </div>
            <p className="text-2xl font-bold text-blue-600">{bnxItems.length}</p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-amber-600">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 mb-1">
              <Droplets className="h-4 w-4 text-amber-600" />
              <p className="text-sm font-medium text-muted-foreground">TPN Items</p>
            </div>
            <p className="text-2xl font-bold text-amber-600">{tpnItems.length}</p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-purple-600">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 mb-1">
              <Brain className="h-4 w-4 text-purple-600" />
              <p className="text-sm font-medium text-muted-foreground">PSHY Items</p>
            </div>
            <p className="text-2xl font-bold text-purple-600">{pshyItems.length}</p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-navy">
          <CardContent className="pt-4">
            <p className="text-sm font-medium text-muted-foreground mb-1">Total Issued</p>
            <p className="text-2xl font-bold text-navy">{grandTotalIssued}</p>
          </CardContent>
        </Card>
      </div>

      {/* Category Tables - 3 Separate Sections */}
      <div className="space-y-6">
        {renderCategoryTable(bnxItems, 'BNX', 'BNX')}
        {renderCategoryTable(tpnItems, 'TPN', 'TPN')}
        {renderCategoryTable(pshyItems, 'PSHY', 'PSHY')}
      </div>

      {/* Grand Total Card */}
      <Card className="bg-navy text-white">
        <CardHeader>
          <CardTitle>Grand Total - All Categories</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-sm text-white/70">Opening Stock</p>
              <p className="text-2xl font-bold">{grandTotalOpening}</p>
            </div>
            <div>
              <p className="text-sm text-white/70">Total Issued</p>
              <p className="text-2xl font-bold text-amber-400">{grandTotalIssued}</p>
            </div>
            <div>
              <p className="text-sm text-white/70">Stock Received</p>
              <p className="text-2xl font-bold text-green-400">{grandTotalReceived}</p>
            </div>
            <div>
              <p className="text-sm text-white/70">Closing Stock</p>
              <p className="text-2xl font-bold">{grandTotalClosing}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
