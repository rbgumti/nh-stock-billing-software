import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend, ComposedChart, Line } from "recharts";
import { TrendingUp, TrendingDown, Minus, DollarSign, Wallet, Building, Users, Pill, Brain, Droplets, CreditCard, Download } from "lucide-react";
import { motion } from "framer-motion";
import { formatNumber, roundTo2 } from "@/lib/formatUtils";
import { Json } from "@/integrations/supabase/types";
import * as XLSX from "xlsx";
import { toast } from "sonner";

interface MonthlyMetrics {
  month: string;
  monthKey: string;
  // Revenue & Financial
  revenue: number;
  expenses: number;
  bankDeposit: number;
  paytmGpay: number;
  // Revenue Breakup
  bnxRevenue: number;
  tpnRevenue: number;
  pshyRevenue: number;
  fees: number;
  labCollection: number;
  // Patients
  newPatientsBnx: number;
  followUpPatientsBnx: number;
  tpnPatients: number;
  pshyPatients: number;
  // Qty Sold
  bnxQtySold: number;
  tpnQtySold: number;
}

interface DayReportRow {
  report_date: string;
  fees: number | null;
  lab_collection: number | null;
  paytm_gpay: number | null;
  deposit_in_bank: number | null;
  new_patients: number | null;
  follow_up_patients: number | null;
  tapentadol_patients: number | null;
  psychiatry_patients: number | null;
  psychiatry_collection: number | null;
  expenses: Json | null;
}

interface Expense {
  amount: number;
  description: string;
}

export function MonthlyComparativeAnalysis() {
  const [metrics, setMetrics] = useState<MonthlyMetrics[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMonths, setSelectedMonths] = useState<number>(6);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    loadMonthlyData();
  }, [selectedMonths]);

  const loadMonthlyData = async () => {
    setLoading(true);
    try {
      // Get date range for selected months
      const endDate = new Date();
      const startDate = new Date();
      startDate.setMonth(startDate.getMonth() - selectedMonths);

      // Fetch day_reports for financial data
      const { data: dayReports, error: dayError } = await supabase
        .from('day_reports')
        .select('report_date, fees, lab_collection, paytm_gpay, deposit_in_bank, new_patients, follow_up_patients, tapentadol_patients, psychiatry_patients, psychiatry_collection, expenses')
        .gte('report_date', startDate.toISOString().split('T')[0])
        .order('report_date', { ascending: true });

      if (dayError) throw dayError;

      // Fetch invoices for revenue calculation
      const { data: invoices, error: invError } = await supabase
        .from('invoices')
        .select('id, invoice_date, total')
        .gte('invoice_date', startDate.toISOString().split('T')[0]);

      if (invError) throw invError;

      // Fetch invoice_items with category info for qty sold
      const { data: invoiceItems, error: itemsError } = await supabase
        .from('invoice_items')
        .select(`
          invoice_id,
          medicine_name,
          quantity,
          total,
          created_at
        `)
        .gte('created_at', startDate.toISOString());

      if (itemsError) throw itemsError;

      // Fetch stock items for category mapping
      const { data: stockItems } = await supabase
        .from('stock_items')
        .select('name, category');

      const categoryMap = new Map(stockItems?.map(s => [s.name, s.category]) || []);

      // Group data by month
      const monthlyMap = new Map<string, MonthlyMetrics>();

      // Initialize months
      for (let i = 0; i < selectedMonths; i++) {
        const date = new Date();
        date.setMonth(date.getMonth() - i);
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        const monthLabel = date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
        
        monthlyMap.set(monthKey, {
          month: monthLabel,
          monthKey,
          revenue: 0,
          expenses: 0,
          bankDeposit: 0,
          paytmGpay: 0,
          bnxRevenue: 0,
          tpnRevenue: 0,
          pshyRevenue: 0,
          fees: 0,
          labCollection: 0,
          newPatientsBnx: 0,
          followUpPatientsBnx: 0,
          tpnPatients: 0,
          pshyPatients: 0,
          bnxQtySold: 0,
          tpnQtySold: 0,
        });
      }

      // Process day reports
      (dayReports as DayReportRow[] || []).forEach((report) => {
        const date = new Date(report.report_date);
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        const existing = monthlyMap.get(monthKey);
        
        if (existing) {
          // Calculate total expenses from JSON array
          let expenseTotal = 0;
          if (report.expenses && Array.isArray(report.expenses)) {
            expenseTotal = (report.expenses as unknown as Expense[]).reduce((sum: number, e: Expense) => sum + (e.amount || 0), 0);
          }

          existing.expenses += expenseTotal;
          existing.bankDeposit += report.deposit_in_bank || 0;
          existing.paytmGpay += report.paytm_gpay || 0;
          existing.fees += report.fees || 0;
          existing.labCollection += report.lab_collection || 0;
          existing.newPatientsBnx += report.new_patients || 0;
          existing.followUpPatientsBnx += report.follow_up_patients || 0;
          existing.tpnPatients += report.tapentadol_patients || 0;
          existing.pshyPatients += report.psychiatry_patients || 0;
          existing.pshyRevenue += report.psychiatry_collection || 0;
        }
      });

      // Create invoice to items mapping
      const invoiceItemsMap = new Map<string, typeof invoiceItems>();
      invoiceItems?.forEach(item => {
        if (!invoiceItemsMap.has(item.invoice_id)) {
          invoiceItemsMap.set(item.invoice_id, []);
        }
        invoiceItemsMap.get(item.invoice_id)?.push(item);
      });

      // Process invoices for revenue
      invoices?.forEach(invoice => {
        const date = new Date(invoice.invoice_date);
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        const existing = monthlyMap.get(monthKey);
        
        if (existing) {
          existing.revenue += Number(invoice.total) || 0;
          
          // Calculate category-wise revenue from invoice items
          const items = invoiceItemsMap.get(invoice.id) || [];
          items.forEach((item: { medicine_name: string; quantity: number; total: number }) => {
            const category = categoryMap.get(item.medicine_name);
            if (category === 'BNX') {
              existing.bnxRevenue += Number(item.total) || 0;
              existing.bnxQtySold += Number(item.quantity) || 0;
            } else if (category === 'TPN') {
              existing.tpnRevenue += Number(item.total) || 0;
              existing.tpnQtySold += Number(item.quantity) || 0;
            } else if (category === 'PSHY') {
              // PSHY revenue already tracked via psychiatry_collection in day reports
            }
          });
        }
      });

      // Convert to array and sort
      const sortedMetrics = Array.from(monthlyMap.values())
        .sort((a, b) => a.monthKey.localeCompare(b.monthKey));

      setMetrics(sortedMetrics);
    } catch (error) {
      console.error('Error loading monthly data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getPercentChange = (current: number, previous: number) => {
    if (previous === 0) return current > 0 ? 100 : 0;
    return ((current - previous) / previous) * 100;
  };

  const renderTrend = (current: number, previous: number) => {
    const change = getPercentChange(current, previous);
    if (change > 0) {
      return (
        <span className="flex items-center text-emerald-600 text-xs">
          <TrendingUp className="h-3 w-3 mr-0.5" />
          +{change.toFixed(1)}%
        </span>
      );
    } else if (change < 0) {
      return (
        <span className="flex items-center text-red-600 text-xs">
          <TrendingDown className="h-3 w-3 mr-0.5" />
          {change.toFixed(1)}%
        </span>
      );
    }
    return (
      <span className="flex items-center text-muted-foreground text-xs">
        <Minus className="h-3 w-3 mr-0.5" />
        0%
      </span>
    );
  };

  const exportToExcel = () => {
    setExporting(true);
    try {
      // Prepare data for Excel
      const exportData = metrics.map(m => ({
        'Month': m.month,
        'Revenue (₹)': roundTo2(m.revenue),
        'Expenses (₹)': roundTo2(m.expenses),
        'Net Profit (₹)': roundTo2(m.revenue - m.expenses),
        'Bank Deposit (₹)': roundTo2(m.bankDeposit),
        'Paytm/GPay (₹)': roundTo2(m.paytmGpay),
        'BNX Revenue (₹)': roundTo2(m.bnxRevenue),
        'TPN Revenue (₹)': roundTo2(m.tpnRevenue),
        'PSHY Revenue (₹)': roundTo2(m.pshyRevenue),
        'Fees (₹)': roundTo2(m.fees),
        'Lab Collection (₹)': roundTo2(m.labCollection),
        'New Patients (BNX)': m.newPatientsBnx,
        'Follow-up (BNX)': m.followUpPatientsBnx,
        'TPN Patients': m.tpnPatients,
        'PSHY Patients': m.pshyPatients,
        'BNX Qty Sold': m.bnxQtySold,
        'TPN Qty Sold': m.tpnQtySold,
      }));

      // Create workbook with multiple sheets
      const wb = XLSX.utils.book_new();

      // Main summary sheet
      const ws = XLSX.utils.json_to_sheet(exportData);
      
      // Set column widths
      ws['!cols'] = [
        { wch: 12 }, // Month
        { wch: 14 }, // Revenue
        { wch: 14 }, // Expenses
        { wch: 14 }, // Net Profit
        { wch: 14 }, // Bank Deposit
        { wch: 14 }, // Paytm/GPay
        { wch: 14 }, // BNX Revenue
        { wch: 14 }, // TPN Revenue
        { wch: 14 }, // PSHY Revenue
        { wch: 12 }, // Fees
        { wch: 14 }, // Lab Collection
        { wch: 16 }, // New Patients
        { wch: 14 }, // Follow-up
        { wch: 12 }, // TPN Patients
        { wch: 12 }, // PSHY Patients
        { wch: 14 }, // BNX Qty
        { wch: 14 }, // TPN Qty
      ];

      XLSX.utils.book_append_sheet(wb, ws, 'Monthly Summary');

      // Revenue Breakup sheet
      const revenueData = metrics.map(m => ({
        'Month': m.month,
        'BNX Revenue (₹)': roundTo2(m.bnxRevenue),
        'TPN Revenue (₹)': roundTo2(m.tpnRevenue),
        'PSHY Revenue (₹)': roundTo2(m.pshyRevenue),
        'Fees (₹)': roundTo2(m.fees),
        'Lab Collection (₹)': roundTo2(m.labCollection),
        'Total Revenue (₹)': roundTo2(m.revenue),
      }));
      const wsRevenue = XLSX.utils.json_to_sheet(revenueData);
      wsRevenue['!cols'] = [{ wch: 12 }, { wch: 14 }, { wch: 14 }, { wch: 14 }, { wch: 12 }, { wch: 14 }, { wch: 14 }];
      XLSX.utils.book_append_sheet(wb, wsRevenue, 'Revenue Breakup');

      // Patient Statistics sheet
      const patientData = metrics.map(m => ({
        'Month': m.month,
        'New Patients (BNX)': m.newPatientsBnx,
        'Follow-up (BNX)': m.followUpPatientsBnx,
        'Total BNX': m.newPatientsBnx + m.followUpPatientsBnx,
        'TPN Patients': m.tpnPatients,
        'PSHY Patients': m.pshyPatients,
        'Total Patients': m.newPatientsBnx + m.followUpPatientsBnx + m.tpnPatients + m.pshyPatients,
      }));
      const wsPatients = XLSX.utils.json_to_sheet(patientData);
      wsPatients['!cols'] = [{ wch: 12 }, { wch: 18 }, { wch: 14 }, { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 14 }];
      XLSX.utils.book_append_sheet(wb, wsPatients, 'Patient Statistics');

      // Quantity Sold sheet
      const qtyData = metrics.map(m => ({
        'Month': m.month,
        'BNX Qty Sold': m.bnxQtySold,
        'TPN Qty Sold': m.tpnQtySold,
        'Total Qty Sold': m.bnxQtySold + m.tpnQtySold,
      }));
      const wsQty = XLSX.utils.json_to_sheet(qtyData);
      wsQty['!cols'] = [{ wch: 12 }, { wch: 14 }, { wch: 14 }, { wch: 14 }];
      XLSX.utils.book_append_sheet(wb, wsQty, 'Quantity Sold');

      // Financial Summary sheet
      const financialData = metrics.map(m => ({
        'Month': m.month,
        'Revenue (₹)': roundTo2(m.revenue),
        'Expenses (₹)': roundTo2(m.expenses),
        'Net Profit (₹)': roundTo2(m.revenue - m.expenses),
        'Bank Deposit (₹)': roundTo2(m.bankDeposit),
        'Paytm/GPay (₹)': roundTo2(m.paytmGpay),
        'Cash Revenue (₹)': roundTo2(m.revenue - m.paytmGpay),
      }));
      const wsFinancial = XLSX.utils.json_to_sheet(financialData);
      wsFinancial['!cols'] = [{ wch: 12 }, { wch: 14 }, { wch: 14 }, { wch: 14 }, { wch: 14 }, { wch: 14 }, { wch: 14 }];
      XLSX.utils.book_append_sheet(wb, wsFinancial, 'Financial Summary');

      // Generate filename with date range
      const startMonth = metrics[0]?.month || 'Start';
      const endMonth = metrics[metrics.length - 1]?.month || 'End';
      const filename = `Monthly_Analysis_${startMonth}_to_${endMonth}.xlsx`.replace(/\s/g, '_');

      XLSX.writeFile(wb, filename);
      toast.success('Excel exported successfully!', {
        description: `${metrics.length} months of data exported`
      });
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Failed to export Excel');
    } finally {
      setExporting(false);
    }
  };

  const chartConfig = {
    revenue: { label: "Revenue", color: "hsl(var(--gold))" },
    expenses: { label: "Expenses", color: "hsl(var(--destructive))" },
    bankDeposit: { label: "Bank Deposit", color: "hsl(var(--cyan))" },
    bnx: { label: "BNX", color: "#3b82f6" },
    tpn: { label: "TPN", color: "#f59e0b" },
    pshy: { label: "PSHY", color: "#8b5cf6" },
  };

  if (loading) {
    return (
      <Card className="glass-strong border-0">
        <CardContent className="p-8 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="text-muted-foreground mt-2">Loading comparative analysis...</p>
        </CardContent>
      </Card>
    );
  }

  const currentMonth = metrics[metrics.length - 1];
  const previousMonth = metrics[metrics.length - 2];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="space-y-6"
    >
      {/* Header */}
      <Card className="glass-strong border-0 overflow-hidden relative">
        <div className="absolute inset-0 bg-gradient-to-br from-purple/8 via-transparent to-cyan/8" />
        <CardHeader className="relative">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <CardTitle className="text-xl bg-gradient-to-r from-purple to-cyan bg-clip-text text-transparent">
                Monthly Comparative Analysis
              </CardTitle>
              <p className="text-sm text-muted-foreground">Comprehensive month-over-month metrics</p>
            </div>
            <div className="flex items-center gap-3">
              <Select value={String(selectedMonths)} onValueChange={(v) => setSelectedMonths(Number(v))}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="3">Last 3 Months</SelectItem>
                  <SelectItem value="6">Last 6 Months</SelectItem>
                  <SelectItem value="12">Last 12 Months</SelectItem>
                </SelectContent>
              </Select>
              <Button 
                onClick={exportToExcel} 
                disabled={exporting || metrics.length === 0}
                className="bg-gradient-to-r from-emerald to-teal text-white hover:opacity-90"
              >
                <Download className="h-4 w-4 mr-2" />
                {exporting ? 'Exporting...' : 'Export Excel'}
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Key Metrics Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        {/* Revenue */}
        <Card className="glass-strong border-0 p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="p-1.5 rounded-lg bg-gradient-to-br from-emerald to-teal">
              <DollarSign className="h-3.5 w-3.5 text-white" />
            </div>
            <span className="text-xs text-muted-foreground">Revenue</span>
          </div>
          <p className="text-lg font-bold">₹{formatNumber(currentMonth?.revenue || 0)}</p>
          {previousMonth && renderTrend(currentMonth?.revenue || 0, previousMonth.revenue)}
        </Card>

        {/* Expenses */}
        <Card className="glass-strong border-0 p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="p-1.5 rounded-lg bg-gradient-to-br from-red-500 to-orange-500">
              <Wallet className="h-3.5 w-3.5 text-white" />
            </div>
            <span className="text-xs text-muted-foreground">Expenses</span>
          </div>
          <p className="text-lg font-bold">₹{formatNumber(currentMonth?.expenses || 0)}</p>
          {previousMonth && renderTrend(currentMonth?.expenses || 0, previousMonth.expenses)}
        </Card>

        {/* Bank Deposit */}
        <Card className="glass-strong border-0 p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="p-1.5 rounded-lg bg-gradient-to-br from-cyan to-blue-500">
              <Building className="h-3.5 w-3.5 text-white" />
            </div>
            <span className="text-xs text-muted-foreground">Bank Deposit</span>
          </div>
          <p className="text-lg font-bold">₹{formatNumber(currentMonth?.bankDeposit || 0)}</p>
          {previousMonth && renderTrend(currentMonth?.bankDeposit || 0, previousMonth.bankDeposit)}
        </Card>

        {/* Paytm/GPay */}
        <Card className="glass-strong border-0 p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="p-1.5 rounded-lg bg-gradient-to-br from-purple to-pink">
              <CreditCard className="h-3.5 w-3.5 text-white" />
            </div>
            <span className="text-xs text-muted-foreground">Paytm/GPay</span>
          </div>
          <p className="text-lg font-bold">₹{formatNumber(currentMonth?.paytmGpay || 0)}</p>
          {previousMonth && renderTrend(currentMonth?.paytmGpay || 0, previousMonth.paytmGpay)}
        </Card>

        {/* New Patients BNX */}
        <Card className="glass-strong border-0 p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="p-1.5 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-500">
              <Users className="h-3.5 w-3.5 text-white" />
            </div>
            <span className="text-xs text-muted-foreground">New (BNX)</span>
          </div>
          <p className="text-lg font-bold">{currentMonth?.newPatientsBnx || 0}</p>
          {previousMonth && renderTrend(currentMonth?.newPatientsBnx || 0, previousMonth.newPatientsBnx)}
        </Card>

        {/* Follow Up BNX */}
        <Card className="glass-strong border-0 p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="p-1.5 rounded-lg bg-gradient-to-br from-amber-500 to-orange-500">
              <Users className="h-3.5 w-3.5 text-white" />
            </div>
            <span className="text-xs text-muted-foreground">Follow-up (BNX)</span>
          </div>
          <p className="text-lg font-bold">{currentMonth?.followUpPatientsBnx || 0}</p>
          {previousMonth && renderTrend(currentMonth?.followUpPatientsBnx || 0, previousMonth.followUpPatientsBnx)}
        </Card>
      </div>

      {/* Revenue & Expenses Chart */}
      <Card className="glass-strong border-0 overflow-hidden relative">
        <div className="absolute inset-0 bg-gradient-to-br from-gold/5 to-orange/5" />
        <CardHeader className="relative">
          <CardTitle className="text-lg">Revenue vs Expenses vs Bank Deposit</CardTitle>
        </CardHeader>
        <CardContent>
          <ChartContainer config={chartConfig} className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={metrics}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Legend />
                <Bar dataKey="revenue" fill="hsl(var(--gold))" name="Revenue" radius={[4, 4, 0, 0]} />
                <Bar dataKey="expenses" fill="hsl(var(--destructive))" name="Expenses" radius={[4, 4, 0, 0]} />
                <Line type="monotone" dataKey="bankDeposit" stroke="hsl(var(--cyan))" strokeWidth={3} name="Bank Deposit" dot={{ r: 4 }} />
              </ComposedChart>
            </ResponsiveContainer>
          </ChartContainer>
        </CardContent>
      </Card>

      {/* Revenue Breakup & Digital Payments */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue Breakup */}
        <Card className="glass-strong border-0 overflow-hidden relative">
          <div className="absolute inset-0 bg-gradient-to-br from-purple/5 to-pink/5" />
          <CardHeader className="relative">
            <CardTitle className="text-lg flex items-center gap-2">
              Revenue Breakup
              <Badge variant="outline" className="text-xs">BNX | TPN | PSHY | Fees | Lab</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={metrics} layout="horizontal">
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" fontSize={11} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Legend />
                  <Bar dataKey="bnxRevenue" stackId="a" fill="#3b82f6" name="BNX" />
                  <Bar dataKey="tpnRevenue" stackId="a" fill="#f59e0b" name="TPN" />
                  <Bar dataKey="pshyRevenue" stackId="a" fill="#8b5cf6" name="PSHY" />
                  <Bar dataKey="fees" stackId="a" fill="#10b981" name="Fees" />
                  <Bar dataKey="labCollection" stackId="a" fill="#ec4899" name="Lab" />
                </BarChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* Digital Payments */}
        <Card className="glass-strong border-0 overflow-hidden relative">
          <div className="absolute inset-0 bg-gradient-to-br from-cyan/5 to-blue/5" />
          <CardHeader className="relative">
            <CardTitle className="text-lg flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Digital Payments (Paytm/GPay)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={metrics}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" fontSize={11} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="paytmGpay" fill="hsl(var(--purple))" name="Paytm/GPay" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>

      {/* Patient Statistics */}
      <Card className="glass-strong border-0 overflow-hidden relative">
        <div className="absolute inset-0 bg-gradient-to-br from-blue/5 to-indigo/5" />
        <CardHeader className="relative">
          <CardTitle className="text-lg flex items-center gap-2">
            <Users className="h-5 w-5" />
            Patient Statistics
            <Badge variant="outline" className="text-xs">New BNX | Follow-up BNX | TPN | PSHY</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ChartContainer config={chartConfig} className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={metrics}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Legend />
                <Bar dataKey="newPatientsBnx" fill="#3b82f6" name="New Patients (BNX)" radius={[4, 4, 0, 0]} />
                <Bar dataKey="followUpPatientsBnx" fill="#60a5fa" name="Follow-up (BNX)" radius={[4, 4, 0, 0]} />
                <Bar dataKey="tpnPatients" fill="#f59e0b" name="TPN Patients" radius={[4, 4, 0, 0]} />
                <Bar dataKey="pshyPatients" fill="#8b5cf6" name="PSHY Patients" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartContainer>
        </CardContent>
      </Card>

      {/* Quantity Sold */}
      <Card className="glass-strong border-0 overflow-hidden relative">
        <div className="absolute inset-0 bg-gradient-to-br from-amber/5 to-orange/5" />
        <CardHeader className="relative">
          <CardTitle className="text-lg flex items-center gap-2">
            <Pill className="h-5 w-5" />
            Quantity Sold (BNX & TPN)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ChartContainer config={chartConfig} className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={metrics}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Legend />
                <Bar dataKey="bnxQtySold" fill="#3b82f6" name="BNX Qty Sold" radius={[4, 4, 0, 0]} />
                <Bar dataKey="tpnQtySold" fill="#f59e0b" name="TPN Qty Sold" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartContainer>
        </CardContent>
      </Card>

      {/* Detailed Data Table */}
      <Card className="glass-strong border-0 overflow-hidden relative">
        <div className="absolute inset-0 bg-gradient-to-br from-gray/5 to-slate/5" />
        <CardHeader className="relative">
          <CardTitle className="text-lg">Detailed Monthly Comparison</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-2 font-semibold">Metric</th>
                  {metrics.slice(-4).map(m => (
                    <th key={m.monthKey} className="text-right p-2 font-semibold">{m.month}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr className="border-b hover:bg-muted/50">
                  <td className="p-2 font-medium">Revenue</td>
                  {metrics.slice(-4).map(m => (
                    <td key={m.monthKey} className="text-right p-2">₹{formatNumber(m.revenue)}</td>
                  ))}
                </tr>
                <tr className="border-b hover:bg-muted/50">
                  <td className="p-2 font-medium">Expenses</td>
                  {metrics.slice(-4).map(m => (
                    <td key={m.monthKey} className="text-right p-2 text-red-600">₹{formatNumber(m.expenses)}</td>
                  ))}
                </tr>
                <tr className="border-b hover:bg-muted/50">
                  <td className="p-2 font-medium">Bank Deposit</td>
                  {metrics.slice(-4).map(m => (
                    <td key={m.monthKey} className="text-right p-2 text-cyan-600">₹{formatNumber(m.bankDeposit)}</td>
                  ))}
                </tr>
                <tr className="border-b hover:bg-muted/50">
                  <td className="p-2 font-medium">Paytm/GPay</td>
                  {metrics.slice(-4).map(m => (
                    <td key={m.monthKey} className="text-right p-2 text-purple-600">₹{formatNumber(m.paytmGpay)}</td>
                  ))}
                </tr>
                <tr className="border-b hover:bg-muted/50 bg-blue-50/50 dark:bg-blue-900/10">
                  <td className="p-2 font-medium text-blue-700 dark:text-blue-400">BNX Revenue</td>
                  {metrics.slice(-4).map(m => (
                    <td key={m.monthKey} className="text-right p-2">₹{formatNumber(m.bnxRevenue)}</td>
                  ))}
                </tr>
                <tr className="border-b hover:bg-muted/50 bg-amber-50/50 dark:bg-amber-900/10">
                  <td className="p-2 font-medium text-amber-700 dark:text-amber-400">TPN Revenue</td>
                  {metrics.slice(-4).map(m => (
                    <td key={m.monthKey} className="text-right p-2">₹{formatNumber(m.tpnRevenue)}</td>
                  ))}
                </tr>
                <tr className="border-b hover:bg-muted/50 bg-purple-50/50 dark:bg-purple-900/10">
                  <td className="p-2 font-medium text-purple-700 dark:text-purple-400">PSHY Revenue</td>
                  {metrics.slice(-4).map(m => (
                    <td key={m.monthKey} className="text-right p-2">₹{formatNumber(m.pshyRevenue)}</td>
                  ))}
                </tr>
                <tr className="border-b hover:bg-muted/50">
                  <td className="p-2 font-medium">Fees</td>
                  {metrics.slice(-4).map(m => (
                    <td key={m.monthKey} className="text-right p-2">₹{formatNumber(m.fees)}</td>
                  ))}
                </tr>
                <tr className="border-b hover:bg-muted/50">
                  <td className="p-2 font-medium">Lab Collection</td>
                  {metrics.slice(-4).map(m => (
                    <td key={m.monthKey} className="text-right p-2">₹{formatNumber(m.labCollection)}</td>
                  ))}
                </tr>
                <tr className="border-b hover:bg-muted/50 bg-blue-50/50 dark:bg-blue-900/10">
                  <td className="p-2 font-medium">New Patients (BNX)</td>
                  {metrics.slice(-4).map(m => (
                    <td key={m.monthKey} className="text-right p-2">{m.newPatientsBnx}</td>
                  ))}
                </tr>
                <tr className="border-b hover:bg-muted/50 bg-blue-50/50 dark:bg-blue-900/10">
                  <td className="p-2 font-medium">Follow-up (BNX)</td>
                  {metrics.slice(-4).map(m => (
                    <td key={m.monthKey} className="text-right p-2">{m.followUpPatientsBnx}</td>
                  ))}
                </tr>
                <tr className="border-b hover:bg-muted/50 bg-amber-50/50 dark:bg-amber-900/10">
                  <td className="p-2 font-medium">TPN Patients</td>
                  {metrics.slice(-4).map(m => (
                    <td key={m.monthKey} className="text-right p-2">{m.tpnPatients}</td>
                  ))}
                </tr>
                <tr className="border-b hover:bg-muted/50 bg-purple-50/50 dark:bg-purple-900/10">
                  <td className="p-2 font-medium">PSHY Patients</td>
                  {metrics.slice(-4).map(m => (
                    <td key={m.monthKey} className="text-right p-2">{m.pshyPatients}</td>
                  ))}
                </tr>
                <tr className="border-b hover:bg-muted/50 bg-blue-50/50 dark:bg-blue-900/10">
                  <td className="p-2 font-medium">BNX Qty Sold</td>
                  {metrics.slice(-4).map(m => (
                    <td key={m.monthKey} className="text-right p-2">{formatNumber(m.bnxQtySold)}</td>
                  ))}
                </tr>
                <tr className="hover:bg-muted/50 bg-amber-50/50 dark:bg-amber-900/10">
                  <td className="p-2 font-medium">TPN Qty Sold</td>
                  {metrics.slice(-4).map(m => (
                    <td key={m.monthKey} className="text-right p-2">{formatNumber(m.tpnQtySold)}</td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
