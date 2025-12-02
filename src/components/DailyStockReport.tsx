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
import { Download, Calendar } from "lucide-react";
import { useStockStore } from "@/hooks/useStockStore";
import { supabase } from "@/integrations/supabase/client";
import * as XLSX from "xlsx";

interface StockReportItem {
  brand: string;
  mainStockOpening: number;
  subStockOpening: number;
  subStockClosing: number;
  issuedToPatients: number;
  stockReceived: number;
  mainStockClosing: number;
  rate: number;
  amount: number;
}

interface CashDenomination {
  denomination: number;
  count: number;
  amount: number;
}

export default function DailyStockReport() {
  const { stockItems } = useStockStore();
  const [reportDate, setReportDate] = useState(new Date().toISOString().split('T')[0]);
  const [reportData, setReportData] = useState<StockReportItem[]>([]);
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
  const [paytmAmount, setPaytmAmount] = useState(0);

  useEffect(() => {
    loadReportData();
  }, [stockItems, reportDate]);

  const loadReportData = async () => {
    // Get invoice items for the selected date to calculate issued quantities
    const { data: invoiceData } = await supabase
      .from('invoices')
      .select('id, invoice_date')
      .eq('invoice_date', reportDate);

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

    // Calculate report data for each stock item
    const data: StockReportItem[] = stockItems
      .filter(item => item.category === "Medication")
      .map(item => {
        const issued = issuedQuantities[item.name] || 0;
        // For demo purposes, sub stock is assumed to be a portion of current stock
        const subStockOpening = Math.min(Math.ceil(item.currentStock * 0.3), item.currentStock);
        const subStockClosing = Math.max(0, subStockOpening - issued);
        const mainStockOpening = item.currentStock;
        const mainStockClosing = mainStockOpening - issued;

        return {
          brand: item.name,
          mainStockOpening,
          subStockOpening,
          subStockClosing,
          issuedToPatients: issued,
          stockReceived: 0, // Would come from purchase orders/GRN
          mainStockClosing,
          rate: item.mrp || item.unitPrice,
          amount: issued * (item.mrp || item.unitPrice),
        };
      })
      .filter(item => item.mainStockOpening > 0 || item.issuedToPatients > 0);

    setReportData(data);
  };

  const updateCashCount = (index: number, count: number) => {
    const updated = [...cashDetails];
    updated[index].count = count;
    updated[index].amount = count * updated[index].denomination;
    setCashDetails(updated);
  };

  const totalSale = reportData.reduce((sum, item) => sum + item.amount, 0);
  const totalCash = cashDetails.reduce((sum, item) => sum + item.amount, 0);
  const totalAsPerSheet = totalSale;
  const difference = totalAsPerSheet - totalCash - paytmAmount;

  const exportToExcel = () => {
    // Create main stock report data
    const mainReportData = reportData.map(item => ({
      'Brand': item.brand,
      'Main Stock Opening': item.mainStockOpening,
      'Sub Stock Opening': item.subStockOpening,
      'Sub Stock Closing': item.subStockClosing,
      'Issued to Patients': item.issuedToPatients,
      'Stock Received': item.stockReceived,
      'Main Stock Closing': item.mainStockClosing,
      'Rate': item.rate,
      'Amount': item.amount,
    }));

    // Add grand total row
    mainReportData.push({
      'Brand': 'Grand Total',
      'Main Stock Opening': reportData.reduce((sum, item) => sum + item.mainStockOpening, 0),
      'Sub Stock Opening': reportData.reduce((sum, item) => sum + item.subStockOpening, 0),
      'Sub Stock Closing': reportData.reduce((sum, item) => sum + item.subStockClosing, 0),
      'Issued to Patients': reportData.reduce((sum, item) => sum + item.issuedToPatients, 0),
      'Stock Received': reportData.reduce((sum, item) => sum + item.stockReceived, 0),
      'Main Stock Closing': reportData.reduce((sum, item) => sum + item.mainStockClosing, 0),
      'Rate': 0,
      'Amount': totalSale,
    });

    // Create cash details data
    const cashData = cashDetails.map(item => ({
      'Denomination': item.denomination,
      'Count': item.count,
      'Amount': item.amount,
    }));
    
    cashData.push({ 'Denomination': 'TOTAL' as any, 'Count': '' as any, 'Amount': totalCash });
    cashData.push({ 'Denomination': 'TOTAL AS PER SHEET' as any, 'Count': '' as any, 'Amount': totalAsPerSheet });
    cashData.push({ 'Denomination': 'PAYTM' as any, 'Count': '' as any, 'Amount': paytmAmount });
    cashData.push({ 'Denomination': 'DIFFERENCE' as any, 'Count': '' as any, 'Amount': difference });

    const workbook = XLSX.utils.book_new();
    
    // Add main report sheet
    const mainSheet = XLSX.utils.json_to_sheet(mainReportData);
    XLSX.utils.book_append_sheet(workbook, mainSheet, 'Stock Report');
    
    // Add cash details sheet
    const cashSheet = XLSX.utils.json_to_sheet(cashData);
    XLSX.utils.book_append_sheet(workbook, cashSheet, 'Cash Details');

    XLSX.writeFile(workbook, `Daily_Stock_Report_${reportDate}.xlsx`);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-navy">Daily Stock Report</h2>
        <div className="flex gap-4 items-center">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-navy" />
            <Input
              type="date"
              value={reportDate}
              onChange={(e) => setReportDate(e.target.value)}
              className="w-auto"
            />
          </div>
          <Button onClick={exportToExcel} className="bg-gold hover:bg-gold/90 text-navy">
            <Download className="h-4 w-4 mr-2" />
            Export Excel
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Stock Report Table */}
        <Card className="lg:col-span-2">
          <CardHeader className="bg-navy text-white rounded-t-lg">
            <CardTitle>Stock Movement</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-navy/10">
                    <TableHead className="font-bold text-navy">Brand</TableHead>
                    <TableHead className="font-bold text-navy text-right">Main Stock Opening</TableHead>
                    <TableHead className="font-bold text-navy text-right">Sub Stock Opening</TableHead>
                    <TableHead className="font-bold text-navy text-right">Sub Stock Closing</TableHead>
                    <TableHead className="font-bold text-navy text-right">Issued to Patients</TableHead>
                    <TableHead className="font-bold text-navy text-right">Stock Received</TableHead>
                    <TableHead className="font-bold text-navy text-right">Main Stock Closing</TableHead>
                    <TableHead className="font-bold text-navy text-right">Rate</TableHead>
                    <TableHead className="font-bold text-navy text-right">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reportData.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                        No stock data available for this date
                      </TableCell>
                    </TableRow>
                  ) : (
                    <>
                      {reportData.map((item, index) => (
                        <TableRow key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                          <TableCell className="font-medium">{item.brand}</TableCell>
                          <TableCell className="text-right">{item.mainStockOpening}</TableCell>
                          <TableCell className="text-right">{item.subStockOpening}</TableCell>
                          <TableCell className="text-right">{item.subStockClosing}</TableCell>
                          <TableCell className="text-right font-semibold text-gold">{item.issuedToPatients}</TableCell>
                          <TableCell className="text-right">{item.stockReceived}</TableCell>
                          <TableCell className="text-right">{item.mainStockClosing}</TableCell>
                          <TableCell className="text-right">₹{item.rate.toFixed(2)}</TableCell>
                          <TableCell className="text-right font-semibold">₹{item.amount.toFixed(2)}</TableCell>
                        </TableRow>
                      ))}
                      <TableRow className="bg-navy text-white font-bold">
                        <TableCell>Grand Total</TableCell>
                        <TableCell className="text-right">{reportData.reduce((sum, item) => sum + item.mainStockOpening, 0)}</TableCell>
                        <TableCell className="text-right">{reportData.reduce((sum, item) => sum + item.subStockOpening, 0)}</TableCell>
                        <TableCell className="text-right">{reportData.reduce((sum, item) => sum + item.subStockClosing, 0)}</TableCell>
                        <TableCell className="text-right">{reportData.reduce((sum, item) => sum + item.issuedToPatients, 0)}</TableCell>
                        <TableCell className="text-right">{reportData.reduce((sum, item) => sum + item.stockReceived, 0)}</TableCell>
                        <TableCell className="text-right">{reportData.reduce((sum, item) => sum + item.mainStockClosing, 0)}</TableCell>
                        <TableCell className="text-right">-</TableCell>
                        <TableCell className="text-right">₹{totalSale.toFixed(2)}</TableCell>
                      </TableRow>
                    </>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* Cash Details Section */}
        <Card>
          <CardHeader className="bg-gold text-navy rounded-t-lg">
            <CardTitle>Cash Details</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="bg-gold/20">
                  <TableHead className="font-bold text-navy">Denomination</TableHead>
                  <TableHead className="font-bold text-navy text-center">Count</TableHead>
                  <TableHead className="font-bold text-navy text-right">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {cashDetails.map((item, index) => (
                  <TableRow key={index}>
                    <TableCell className="font-medium">₹{item.denomination}</TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        min="0"
                        value={item.count || ''}
                        onChange={(e) => updateCashCount(index, parseInt(e.target.value) || 0)}
                        className="w-20 text-center mx-auto"
                      />
                    </TableCell>
                    <TableCell className="text-right">₹{item.amount.toFixed(2)}</TableCell>
                  </TableRow>
                ))}
                <TableRow className="bg-navy/10 font-bold">
                  <TableCell colSpan={2}>TOTAL</TableCell>
                  <TableCell className="text-right">₹{totalCash.toFixed(2)}</TableCell>
                </TableRow>
                <TableRow className="bg-gold/30 font-bold">
                  <TableCell colSpan={2}>TOTAL AS PER SHEET</TableCell>
                  <TableCell className="text-right">₹{totalAsPerSheet.toFixed(2)}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium">PAYTM</TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      min="0"
                      value={paytmAmount || ''}
                      onChange={(e) => setPaytmAmount(parseFloat(e.target.value) || 0)}
                      className="w-20 text-center mx-auto"
                    />
                  </TableCell>
                  <TableCell className="text-right">₹{paytmAmount.toFixed(2)}</TableCell>
                </TableRow>
                <TableRow className={`font-bold ${difference === 0 ? 'bg-green-100' : difference > 0 ? 'bg-red-100' : 'bg-yellow-100'}`}>
                  <TableCell colSpan={2}>DIFFERENCE</TableCell>
                  <TableCell className="text-right">₹{difference.toFixed(2)}</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border-l-4 border-l-gold">
          <CardContent className="pt-6">
            <p className="text-sm font-medium text-muted-foreground">Total Sale Amount</p>
            <p className="text-2xl font-bold text-navy">₹{totalSale.toFixed(2)}</p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-navy">
          <CardContent className="pt-6">
            <p className="text-sm font-medium text-muted-foreground">Total Cash Collected</p>
            <p className="text-2xl font-bold text-navy">₹{totalCash.toFixed(2)}</p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-blue-500">
          <CardContent className="pt-6">
            <p className="text-sm font-medium text-muted-foreground">Paytm Collection</p>
            <p className="text-2xl font-bold text-navy">₹{paytmAmount.toFixed(2)}</p>
          </CardContent>
        </Card>
        <Card className={`border-l-4 ${difference === 0 ? 'border-l-green-500' : 'border-l-red-500'}`}>
          <CardContent className="pt-6">
            <p className="text-sm font-medium text-muted-foreground">Difference</p>
            <p className={`text-2xl font-bold ${difference === 0 ? 'text-green-600' : 'text-red-600'}`}>
              ₹{difference.toFixed(2)}
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
