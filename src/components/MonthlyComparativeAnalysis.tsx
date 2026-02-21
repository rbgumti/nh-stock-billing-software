import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend, ComposedChart, Line } from "recharts";
import { TrendingUp, TrendingDown, Minus, DollarSign, Wallet, Building, Users, Pill, Brain, Droplets, CreditCard, Download, Trophy, AlertTriangle, ArrowUp, ArrowDown, ChevronDown, ChevronUp, Layers, BarChart3 } from "lucide-react";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
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

interface BrandQtySold {
  brandName: string;
  category: 'BNX' | 'TPN';
  monthlyQty: Record<string, number>; // monthKey -> qty
  totalQty: number;
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
  const [brandBreakdown, setBrandBreakdown] = useState<BrandQtySold[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMonths, setSelectedMonths] = useState<number>(6);
  const [exporting, setExporting] = useState(false);
  const [showBrandBreakdown, setShowBrandBreakdown] = useState(false);
  const [viewMode, setViewMode] = useState<'monthly' | 'cumulative'>('monthly');

  // Compute cumulative metrics from month-by-month data
  const cumulativeMetrics: MonthlyMetrics[] = metrics.map((m, idx) => {
    if (idx === 0) return { ...m };
    const cumulative = { ...m };
    for (let i = 0; i < idx; i++) {
      cumulative.revenue += metrics[i].revenue;
      cumulative.expenses += metrics[i].expenses;
      cumulative.bankDeposit += metrics[i].bankDeposit;
      cumulative.paytmGpay += metrics[i].paytmGpay;
      cumulative.bnxRevenue += metrics[i].bnxRevenue;
      cumulative.tpnRevenue += metrics[i].tpnRevenue;
      cumulative.pshyRevenue += metrics[i].pshyRevenue;
      cumulative.fees += metrics[i].fees;
      cumulative.labCollection += metrics[i].labCollection;
      cumulative.newPatientsBnx += metrics[i].newPatientsBnx;
      cumulative.followUpPatientsBnx += metrics[i].followUpPatientsBnx;
      cumulative.tpnPatients += metrics[i].tpnPatients;
      cumulative.pshyPatients += metrics[i].pshyPatients;
      cumulative.bnxQtySold += metrics[i].bnxQtySold;
      cumulative.tpnQtySold += metrics[i].tpnQtySold;
    }
    return cumulative;
  });

  // Use appropriate data based on view mode
  const displayMetrics = viewMode === 'cumulative' ? cumulativeMetrics : metrics;

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
      
      // Brand-wise quantity tracking: brandName -> { monthKey -> qty }
      const brandQtyMap = new Map<string, { category: 'BNX' | 'TPN'; monthlyQty: Map<string, number> }>();

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
            const qty = Number(item.quantity) || 0;
            
            if (category === 'BNX' || category === 'TPN') {
              // Track aggregate
              if (category === 'BNX') {
                existing.bnxRevenue += Number(item.total) || 0;
                existing.bnxQtySold += qty;
              } else {
                existing.tpnRevenue += Number(item.total) || 0;
                existing.tpnQtySold += qty;
              }
              
              // Track brand-wise breakdown
              if (!brandQtyMap.has(item.medicine_name)) {
                brandQtyMap.set(item.medicine_name, { 
                  category: category as 'BNX' | 'TPN', 
                  monthlyQty: new Map() 
                });
              }
              const brandData = brandQtyMap.get(item.medicine_name)!;
              const currentQty = brandData.monthlyQty.get(monthKey) || 0;
              brandData.monthlyQty.set(monthKey, currentQty + qty);
            } else if (category === 'PSHY') {
              // PSHY revenue already tracked via psychiatry_collection in day reports
            }
          });
        }
      });

      // Convert to array and sort
      const sortedMetrics = Array.from(monthlyMap.values())
        .sort((a, b) => a.monthKey.localeCompare(b.monthKey));

      // Convert brand breakdown to array
      const brandBreakdownArray: BrandQtySold[] = Array.from(brandQtyMap.entries())
        .map(([brandName, data]) => {
          const monthlyQtyObj: Record<string, number> = {};
          let totalQty = 0;
          data.monthlyQty.forEach((qty, monthKey) => {
            monthlyQtyObj[monthKey] = qty;
            totalQty += qty;
          });
          return {
            brandName,
            category: data.category,
            monthlyQty: monthlyQtyObj,
            totalQty,
          };
        })
        .sort((a, b) => b.totalQty - a.totalQty); // Sort by total quantity descending

      setMetrics(sortedMetrics);
      setBrandBreakdown(brandBreakdownArray);
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

      // Growth Analysis sheet
      const growthData = metrics.map((m, idx) => {
        const prev = idx > 0 ? metrics[idx - 1] : null;
        const revenueGrowth = prev && prev.revenue > 0 ? ((m.revenue - prev.revenue) / prev.revenue) * 100 : 0;
        const prevPatients = prev ? prev.newPatientsBnx + prev.followUpPatientsBnx + prev.tpnPatients + prev.pshyPatients : 0;
        const currPatients = m.newPatientsBnx + m.followUpPatientsBnx + m.tpnPatients + m.pshyPatients;
        const patientsGrowth = prevPatients > 0 ? ((currPatients - prevPatients) / prevPatients) * 100 : 0;
        const prevQty = prev ? prev.bnxQtySold + prev.tpnQtySold : 0;
        const currQty = m.bnxQtySold + m.tpnQtySold;
        const qtyGrowth = prevQty > 0 ? ((currQty - prevQty) / prevQty) * 100 : 0;
        
        return {
          'Month': m.month,
          'Revenue (₹)': roundTo2(m.revenue),
          'Revenue Growth (%)': idx === 0 ? 'N/A' : roundTo2(revenueGrowth),
          'Total Patients': currPatients,
          'Patients Growth (%)': idx === 0 ? 'N/A' : roundTo2(patientsGrowth),
          'Total Qty Sold': currQty,
          'Qty Growth (%)': idx === 0 ? 'N/A' : roundTo2(qtyGrowth),
        };
      });
      const wsGrowth = XLSX.utils.json_to_sheet(growthData);
      wsGrowth['!cols'] = [{ wch: 12 }, { wch: 14 }, { wch: 18 }, { wch: 14 }, { wch: 18 }, { wch: 14 }, { wch: 14 }];
      XLSX.utils.book_append_sheet(wb, wsGrowth, 'Growth Analysis');

      // Brand-wise BNX Breakdown sheet
      const bnxBrands = brandBreakdown.filter(b => b.category === 'BNX');
      if (bnxBrands.length > 0) {
        const bnxBrandData = bnxBrands.map(brand => {
          const row: Record<string, string | number> = { 'Medicine Name': brand.brandName };
          metrics.forEach(m => {
            row[m.month] = brand.monthlyQty[m.monthKey] || 0;
          });
          row['Total'] = brand.totalQty;
          return row;
        });
        const wsBnxBrands = XLSX.utils.json_to_sheet(bnxBrandData);
        const colWidths = [{ wch: 30 }, ...metrics.map(() => ({ wch: 12 })), { wch: 12 }];
        wsBnxBrands['!cols'] = colWidths;
        XLSX.utils.book_append_sheet(wb, wsBnxBrands, 'BNX Brand Breakdown');
      }

      // Brand-wise TPN Breakdown sheet
      const tpnBrands = brandBreakdown.filter(b => b.category === 'TPN');
      if (tpnBrands.length > 0) {
        const tpnBrandData = tpnBrands.map(brand => {
          const row: Record<string, string | number> = { 'Medicine Name': brand.brandName };
          metrics.forEach(m => {
            row[m.month] = brand.monthlyQty[m.monthKey] || 0;
          });
          row['Total'] = brand.totalQty;
          return row;
        });
        const wsTpnBrands = XLSX.utils.json_to_sheet(tpnBrandData);
        const colWidths = [{ wch: 30 }, ...metrics.map(() => ({ wch: 12 })), { wch: 12 }];
        wsTpnBrands['!cols'] = colWidths;
        XLSX.utils.book_append_sheet(wb, wsTpnBrands, 'TPN Brand Breakdown');
      }

      // Generate filename with date range
      const startMonth = metrics[0]?.month || 'Start';
      const endMonth = metrics[metrics.length - 1]?.month || 'End';
      const filename = `Monthly_Analysis_${startMonth}_to_${endMonth}.xlsx`.replace(/\s/g, '_');

      XLSX.writeFile(wb, filename);
      toast.success('Excel exported successfully!', {
        description: `${metrics.length} months of data exported with brand breakdown`
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

  // Calculate best and worst performing months
  const getBestWorstMonths = () => {
    if (metrics.length < 2) return null;

    const revenueMax = metrics.reduce((max, m) => m.revenue >= max.revenue ? m : max, metrics[0]);
    const revenueMin = metrics.reduce((min, m) => m.revenue < min.revenue ? m : min, metrics[0]);
    
    const patientsMax = metrics.reduce((max, m) => {
      const total = m.newPatientsBnx + m.followUpPatientsBnx + m.tpnPatients + m.pshyPatients;
      const maxTotal = max.newPatientsBnx + max.followUpPatientsBnx + max.tpnPatients + max.pshyPatients;
      return total >= maxTotal ? m : max;
    }, metrics[0]);

    const qtyMax = metrics.reduce((max, m) => {
      const total = m.bnxQtySold + m.tpnQtySold;
      const maxTotal = max.bnxQtySold + max.tpnQtySold;
      return total >= maxTotal ? m : max;
    }, metrics[0]);

    return { revenueMax, revenueMin, patientsMax, qtyMax };
  };

  // Calculate month-over-month growth for each metric
  const getMonthlyGrowth = () => {
    return metrics.map((m, idx) => {
      if (idx === 0) {
        return { ...m, revenueGrowth: 0, patientsGrowth: 0, qtyGrowth: 0 };
      }
      const prev = metrics[idx - 1];
      const revenueGrowth = prev.revenue > 0 ? ((m.revenue - prev.revenue) / prev.revenue) * 100 : 0;
      const prevPatients = prev.newPatientsBnx + prev.followUpPatientsBnx + prev.tpnPatients + prev.pshyPatients;
      const currPatients = m.newPatientsBnx + m.followUpPatientsBnx + m.tpnPatients + m.pshyPatients;
      const patientsGrowth = prevPatients > 0 ? ((currPatients - prevPatients) / prevPatients) * 100 : 0;
      const prevQty = prev.bnxQtySold + prev.tpnQtySold;
      const currQty = m.bnxQtySold + m.tpnQtySold;
      const qtyGrowth = prevQty > 0 ? ((currQty - prevQty) / prevQty) * 100 : 0;
      return { ...m, revenueGrowth, patientsGrowth, qtyGrowth };
    });
  };

  const bestWorst = getBestWorstMonths();
  const metricsWithGrowth = getMonthlyGrowth();

  // Average growth calculation
  const avgRevenueGrowth = metricsWithGrowth.length > 1 
    ? metricsWithGrowth.slice(1).reduce((sum, m) => sum + m.revenueGrowth, 0) / (metricsWithGrowth.length - 1) 
    : 0;

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
              <p className="text-sm text-muted-foreground">
                {viewMode === 'cumulative' 
                  ? 'Cumulative running totals across selected period' 
                  : 'Individual month-by-month metrics (non-cumulative)'}
              </p>
            </div>
            <div className="flex items-center gap-3 flex-wrap">
              {/* View Mode Toggle */}
              <ToggleGroup 
                type="single" 
                value={viewMode} 
                onValueChange={(v) => v && setViewMode(v as 'monthly' | 'cumulative')}
                className="bg-muted rounded-lg p-1"
              >
                <ToggleGroupItem value="monthly" className="text-xs px-3 py-1.5 data-[state=on]:bg-background data-[state=on]:shadow-sm">
                  <BarChart3 className="h-3.5 w-3.5 mr-1.5" />
                  Monthly
                </ToggleGroupItem>
                <ToggleGroupItem value="cumulative" className="text-xs px-3 py-1.5 data-[state=on]:bg-background data-[state=on]:shadow-sm">
                  <Layers className="h-3.5 w-3.5 mr-1.5" />
                  Cumulative
                </ToggleGroupItem>
              </ToggleGroup>

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

      {/* Best/Worst Performance Highlights */}
      {bestWorst && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Best Revenue Month */}
          <Card className="glass-strong border-0 overflow-hidden relative bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-950/30 dark:to-teal-950/30">
            <div className="absolute top-2 right-2">
              <Trophy className="h-5 w-5 text-amber-500" />
            </div>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <Badge className="bg-emerald-500 text-white text-[10px]">BEST</Badge>
                <span className="text-xs text-muted-foreground">Revenue Month</span>
              </div>
              <p className="text-lg font-bold text-emerald-700 dark:text-emerald-400">{bestWorst.revenueMax.month}</p>
              <p className="text-sm font-semibold">₹{formatNumber(bestWorst.revenueMax.revenue)}</p>
            </CardContent>
          </Card>

          {/* Lowest Revenue Month */}
          <Card className="glass-strong border-0 overflow-hidden relative bg-gradient-to-br from-red-50 to-orange-50 dark:from-red-950/30 dark:to-orange-950/30">
            <div className="absolute top-2 right-2">
              <AlertTriangle className="h-5 w-5 text-red-500" />
            </div>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <Badge variant="destructive" className="text-[10px]">LOW</Badge>
                <span className="text-xs text-muted-foreground">Revenue Month</span>
              </div>
              <p className="text-lg font-bold text-red-700 dark:text-red-400">{bestWorst.revenueMin.month}</p>
              <p className="text-sm font-semibold">₹{formatNumber(bestWorst.revenueMin.revenue)}</p>
            </CardContent>
          </Card>

          {/* Best Patient Month */}
          <Card className="glass-strong border-0 overflow-hidden relative bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30">
            <div className="absolute top-2 right-2">
              <Users className="h-5 w-5 text-blue-500" />
            </div>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <Badge className="bg-blue-500 text-white text-[10px]">BEST</Badge>
                <span className="text-xs text-muted-foreground">Patient Month</span>
              </div>
              <p className="text-lg font-bold text-blue-700 dark:text-blue-400">{bestWorst.patientsMax.month}</p>
              <p className="text-sm font-semibold">
                {bestWorst.patientsMax.newPatientsBnx + bestWorst.patientsMax.followUpPatientsBnx + 
                 bestWorst.patientsMax.tpnPatients + bestWorst.patientsMax.pshyPatients} patients
              </p>
            </CardContent>
          </Card>

          {/* Best Qty Sold Month */}
          <Card className="glass-strong border-0 overflow-hidden relative bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/30">
            <div className="absolute top-2 right-2">
              <Pill className="h-5 w-5 text-amber-500" />
            </div>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <Badge className="bg-amber-500 text-white text-[10px]">BEST</Badge>
                <span className="text-xs text-muted-foreground">Sales Month</span>
              </div>
              <p className="text-lg font-bold text-amber-700 dark:text-amber-400">{bestWorst.qtyMax.month}</p>
              <p className="text-sm font-semibold">
                {formatNumber(bestWorst.qtyMax.bnxQtySold + bestWorst.qtyMax.tpnQtySold)} units sold
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Average Growth Summary */}
      <Card className="glass-strong border-0 overflow-hidden relative">
        <div className="absolute inset-0 bg-gradient-to-br from-gold/5 to-amber/5" />
        <CardHeader className="relative pb-2">
          <CardTitle className="text-lg flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Growth Trend Summary
          </CardTitle>
        </CardHeader>
        <CardContent className="relative">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-3 rounded-lg bg-background/50">
              <p className="text-xs text-muted-foreground mb-1">Avg Monthly Revenue Growth</p>
              <p className={`text-xl font-bold ${avgRevenueGrowth >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                {avgRevenueGrowth >= 0 ? '+' : ''}{avgRevenueGrowth.toFixed(1)}%
              </p>
            </div>
            <div className="text-center p-3 rounded-lg bg-background/50">
              <p className="text-xs text-muted-foreground mb-1">Current Month vs Previous</p>
              <p className={`text-xl font-bold flex items-center justify-center gap-1 ${
                getPercentChange(currentMonth?.revenue || 0, previousMonth?.revenue || 0) >= 0 
                  ? 'text-emerald-600' : 'text-red-600'
              }`}>
                {getPercentChange(currentMonth?.revenue || 0, previousMonth?.revenue || 0) >= 0 
                  ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />}
                {Math.abs(getPercentChange(currentMonth?.revenue || 0, previousMonth?.revenue || 0)).toFixed(1)}%
              </p>
            </div>
            <div className="text-center p-3 rounded-lg bg-background/50">
              <p className="text-xs text-muted-foreground mb-1">{currentMonth?.month} Revenue</p>
              <p className="text-xl font-bold text-foreground">
                ₹{formatNumber(currentMonth?.revenue || 0)}
              </p>
              <p className="text-[10px] text-muted-foreground">This month only</p>
            </div>
            <div className="text-center p-3 rounded-lg bg-background/50">
              <p className="text-xs text-muted-foreground mb-1">{currentMonth?.month} Patients</p>
              <p className="text-xl font-bold text-foreground">
                {formatNumber((currentMonth?.newPatientsBnx || 0) + (currentMonth?.followUpPatientsBnx || 0) + (currentMonth?.tpnPatients || 0) + (currentMonth?.pshyPatients || 0))}
              </p>
              <p className="text-[10px] text-muted-foreground">This month only</p>
            </div>
          </div>
        </CardContent>
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
              <ComposedChart data={displayMetrics}>
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
                <BarChart data={displayMetrics} layout="horizontal">
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
                <BarChart data={displayMetrics}>
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
              <BarChart data={displayMetrics}>
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
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <Pill className="h-5 w-5" />
              Quantity Sold (BNX & TPN)
            </CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowBrandBreakdown(!showBrandBreakdown)}
              className="text-xs"
            >
              {showBrandBreakdown ? <ChevronUp className="h-4 w-4 mr-1" /> : <ChevronDown className="h-4 w-4 mr-1" />}
              {showBrandBreakdown ? 'Hide' : 'Show'} Brand Breakdown
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <ChartContainer config={chartConfig} className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={displayMetrics}>
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

      {/* Brand-wise Breakdown Tables */}
      {showBrandBreakdown && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* BNX Brand Breakdown */}
          <Card className="glass-strong border-0 overflow-hidden relative">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-indigo-500/5" />
            <CardHeader className="relative pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <Badge className="bg-blue-500 text-white">BNX</Badge>
                Brand-wise Quantity Sold
              </CardTitle>
            </CardHeader>
            <CardContent className="relative">
              <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-background">
                    <tr className="border-b">
                      <th className="text-left p-2 font-semibold">Medicine</th>
                      {metrics.slice(-4).map(m => (
                        <th key={m.monthKey} className="text-right p-2 font-semibold text-xs">{m.month}</th>
                      ))}
                      <th className="text-right p-2 font-semibold bg-blue-50 dark:bg-blue-900/20">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {brandBreakdown
                      .filter(b => b.category === 'BNX')
                      .slice(0, 20)
                      .map((brand, idx) => (
                        <tr key={brand.brandName} className={`border-b hover:bg-muted/50 ${idx % 2 === 0 ? 'bg-blue-50/30 dark:bg-blue-900/10' : ''}`}>
                          <td className="p-2 font-medium text-xs truncate max-w-[150px]" title={brand.brandName}>
                            {brand.brandName}
                          </td>
                          {metrics.slice(-4).map(m => (
                            <td key={m.monthKey} className="text-right p-2 text-xs">
                              {formatNumber(brand.monthlyQty[m.monthKey] || 0)}
                            </td>
                          ))}
                          <td className="text-right p-2 font-semibold text-xs bg-blue-50 dark:bg-blue-900/20">
                            {formatNumber(brand.totalQty)}
                          </td>
                        </tr>
                      ))}
                    {brandBreakdown.filter(b => b.category === 'BNX').length === 0 && (
                      <tr>
                        <td colSpan={6} className="p-4 text-center text-muted-foreground">No BNX data available</td>
                      </tr>
                    )}
                    {brandBreakdown.filter(b => b.category === 'BNX').length > 20 && (
                      <tr className="bg-muted/30">
                        <td colSpan={6} className="p-2 text-center text-xs text-muted-foreground">
                          + {brandBreakdown.filter(b => b.category === 'BNX').length - 20} more brands (see Excel export for full list)
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* TPN Brand Breakdown */}
          <Card className="glass-strong border-0 overflow-hidden relative">
            <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 to-orange-500/5" />
            <CardHeader className="relative pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <Badge className="bg-amber-500 text-white">TPN</Badge>
                Brand-wise Quantity Sold
              </CardTitle>
            </CardHeader>
            <CardContent className="relative">
              <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-background">
                    <tr className="border-b">
                      <th className="text-left p-2 font-semibold">Medicine</th>
                      {metrics.slice(-4).map(m => (
                        <th key={m.monthKey} className="text-right p-2 font-semibold text-xs">{m.month}</th>
                      ))}
                      <th className="text-right p-2 font-semibold bg-amber-50 dark:bg-amber-900/20">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {brandBreakdown
                      .filter(b => b.category === 'TPN')
                      .slice(0, 20)
                      .map((brand, idx) => (
                        <tr key={brand.brandName} className={`border-b hover:bg-muted/50 ${idx % 2 === 0 ? 'bg-amber-50/30 dark:bg-amber-900/10' : ''}`}>
                          <td className="p-2 font-medium text-xs truncate max-w-[150px]" title={brand.brandName}>
                            {brand.brandName}
                          </td>
                          {metrics.slice(-4).map(m => (
                            <td key={m.monthKey} className="text-right p-2 text-xs">
                              {formatNumber(brand.monthlyQty[m.monthKey] || 0)}
                            </td>
                          ))}
                          <td className="text-right p-2 font-semibold text-xs bg-amber-50 dark:bg-amber-900/20">
                            {formatNumber(brand.totalQty)}
                          </td>
                        </tr>
                      ))}
                    {brandBreakdown.filter(b => b.category === 'TPN').length === 0 && (
                      <tr>
                        <td colSpan={6} className="p-4 text-center text-muted-foreground">No TPN data available</td>
                      </tr>
                    )}
                    {brandBreakdown.filter(b => b.category === 'TPN').length > 20 && (
                      <tr className="bg-muted/30">
                        <td colSpan={6} className="p-2 text-center text-xs text-muted-foreground">
                          + {brandBreakdown.filter(b => b.category === 'TPN').length - 20} more brands (see Excel export for full list)
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Detailed Data Table */}
      <Card className="glass-strong border-0 overflow-hidden relative">
        <div className="absolute inset-0 bg-gradient-to-br from-gray/5 to-slate/5" />
        <CardHeader className="relative">
          <CardTitle className="text-lg flex items-center gap-2">
            Detailed {viewMode === 'cumulative' ? 'Cumulative' : 'Monthly'} Comparison
            {viewMode === 'cumulative' && (
              <Badge variant="outline" className="text-[10px]">Running Totals</Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-2 font-semibold">Metric</th>
                  {displayMetrics.slice(-4).map(m => (
                    <th key={m.monthKey} className="text-right p-2 font-semibold">
                      {m.month}
                      {viewMode === 'cumulative' && (
                        <div className="text-[9px] font-normal text-muted-foreground">cumulative</div>
                      )}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr className="border-b hover:bg-muted/50">
                  <td className="p-2 font-medium">Revenue</td>
                  {displayMetrics.slice(-4).map((m, idx) => {
                    // For growth calculation in cumulative mode, still use original metrics
                    const originalM = metrics[metrics.findIndex(om => om.monthKey === m.monthKey)];
                    const prevIdx = metrics.findIndex(om => om.monthKey === m.monthKey) - 1;
                    const prev = prevIdx >= 0 ? metrics[prevIdx] : null;
                    const growth = viewMode === 'monthly' && prev && prev.revenue > 0 
                      ? ((originalM.revenue - prev.revenue) / prev.revenue) * 100 
                      : null;
                    const isBest = viewMode === 'monthly' && bestWorst?.revenueMax.monthKey === m.monthKey;
                    const isWorst = viewMode === 'monthly' && bestWorst?.revenueMin.monthKey === m.monthKey;
                    return (
                      <td key={m.monthKey} className={`text-right p-2 ${isBest ? 'bg-emerald-100 dark:bg-emerald-900/30' : ''} ${isWorst ? 'bg-red-100 dark:bg-red-900/30' : ''}`}>
                        <div>₹{formatNumber(m.revenue)}</div>
                        {growth !== null && (
                          <span className={`text-[10px] ${growth >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                            {growth >= 0 ? '↑' : '↓'}{Math.abs(growth).toFixed(1)}%
                          </span>
                        )}
                        {isBest && <Badge className="ml-1 text-[8px] py-0 px-1 bg-emerald-500">BEST</Badge>}
                        {isWorst && <Badge variant="destructive" className="ml-1 text-[8px] py-0 px-1">LOW</Badge>}
                      </td>
                    );
                  })}
                </tr>
                <tr className="border-b hover:bg-muted/50">
                  <td className="p-2 font-medium">Expenses</td>
                  {displayMetrics.slice(-4).map(m => (
                    <td key={m.monthKey} className="text-right p-2 text-red-600">₹{formatNumber(m.expenses)}</td>
                  ))}
                </tr>
                <tr className="border-b hover:bg-muted/50 bg-emerald-50/30 dark:bg-emerald-900/10">
                  <td className="p-2 font-medium text-emerald-700 dark:text-emerald-400">Net Profit</td>
                  {displayMetrics.slice(-4).map(m => (
                    <td key={m.monthKey} className={`text-right p-2 font-semibold ${(m.revenue - m.expenses) >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                      ₹{formatNumber(m.revenue - m.expenses)}
                    </td>
                  ))}
                </tr>
                <tr className="border-b hover:bg-muted/50">
                  <td className="p-2 font-medium">Bank Deposit</td>
                  {displayMetrics.slice(-4).map(m => (
                    <td key={m.monthKey} className="text-right p-2 text-cyan-600">₹{formatNumber(m.bankDeposit)}</td>
                  ))}
                </tr>
                <tr className="border-b hover:bg-muted/50">
                  <td className="p-2 font-medium">Paytm/GPay</td>
                  {displayMetrics.slice(-4).map(m => (
                    <td key={m.monthKey} className="text-right p-2 text-purple-600">₹{formatNumber(m.paytmGpay)}</td>
                  ))}
                </tr>
                <tr className="border-b hover:bg-muted/50 bg-blue-50/50 dark:bg-blue-900/10">
                  <td className="p-2 font-medium text-blue-700 dark:text-blue-400">BNX Revenue</td>
                  {displayMetrics.slice(-4).map(m => (
                    <td key={m.monthKey} className="text-right p-2">₹{formatNumber(m.bnxRevenue)}</td>
                  ))}
                </tr>
                <tr className="border-b hover:bg-muted/50 bg-amber-50/50 dark:bg-amber-900/10">
                  <td className="p-2 font-medium text-amber-700 dark:text-amber-400">TPN Revenue</td>
                  {displayMetrics.slice(-4).map(m => (
                    <td key={m.monthKey} className="text-right p-2">₹{formatNumber(m.tpnRevenue)}</td>
                  ))}
                </tr>
                <tr className="border-b hover:bg-muted/50 bg-purple-50/50 dark:bg-purple-900/10">
                  <td className="p-2 font-medium text-purple-700 dark:text-purple-400">PSHY Revenue</td>
                  {displayMetrics.slice(-4).map(m => (
                    <td key={m.monthKey} className="text-right p-2">₹{formatNumber(m.pshyRevenue)}</td>
                  ))}
                </tr>
                <tr className="border-b hover:bg-muted/50">
                  <td className="p-2 font-medium">Fees</td>
                  {displayMetrics.slice(-4).map(m => (
                    <td key={m.monthKey} className="text-right p-2">₹{formatNumber(m.fees)}</td>
                  ))}
                </tr>
                <tr className="border-b hover:bg-muted/50">
                  <td className="p-2 font-medium">Lab Collection</td>
                  {displayMetrics.slice(-4).map(m => (
                    <td key={m.monthKey} className="text-right p-2">₹{formatNumber(m.labCollection)}</td>
                  ))}
                </tr>
                <tr className="border-b hover:bg-muted/50 bg-blue-50/50 dark:bg-blue-900/10">
                  <td className="p-2 font-medium">New Patients (BNX)</td>
                  {displayMetrics.slice(-4).map(m => {
                    const isBest = viewMode === 'monthly' && bestWorst?.patientsMax.monthKey === m.monthKey;
                    return (
                      <td key={m.monthKey} className={`text-right p-2 ${isBest ? 'bg-blue-100 dark:bg-blue-900/40' : ''}`}>
                        {m.newPatientsBnx}
                        {isBest && <Badge className="ml-1 text-[8px] py-0 px-1 bg-blue-500">BEST</Badge>}
                      </td>
                    );
                  })}
                </tr>
                <tr className="border-b hover:bg-muted/50 bg-blue-50/50 dark:bg-blue-900/10">
                  <td className="p-2 font-medium">Follow-up (BNX)</td>
                  {displayMetrics.slice(-4).map(m => (
                    <td key={m.monthKey} className="text-right p-2">{m.followUpPatientsBnx}</td>
                  ))}
                </tr>
                <tr className="border-b hover:bg-muted/50 bg-amber-50/50 dark:bg-amber-900/10">
                  <td className="p-2 font-medium">TPN Patients</td>
                  {displayMetrics.slice(-4).map(m => (
                    <td key={m.monthKey} className="text-right p-2">{m.tpnPatients}</td>
                  ))}
                </tr>
                <tr className="border-b hover:bg-muted/50 bg-purple-50/50 dark:bg-purple-900/10">
                  <td className="p-2 font-medium">PSHY Patients</td>
                  {displayMetrics.slice(-4).map(m => (
                    <td key={m.monthKey} className="text-right p-2">{m.pshyPatients}</td>
                  ))}
                </tr>
                <tr className="border-b hover:bg-muted/50 bg-blue-50/50 dark:bg-blue-900/10">
                  <td className="p-2 font-medium">BNX Qty Sold</td>
                  {displayMetrics.slice(-4).map(m => {
                    const isBest = viewMode === 'monthly' && bestWorst?.qtyMax.monthKey === m.monthKey;
                    return (
                      <td key={m.monthKey} className={`text-right p-2 ${isBest ? 'bg-amber-100 dark:bg-amber-900/40' : ''}`}>
                        {formatNumber(m.bnxQtySold)}
                        {isBest && <Badge className="ml-1 text-[8px] py-0 px-1 bg-amber-500">BEST</Badge>}
                      </td>
                    );
                  })}
                </tr>
                <tr className="hover:bg-muted/50 bg-amber-50/50 dark:bg-amber-900/10">
                  <td className="p-2 font-medium">TPN Qty Sold</td>
                  {displayMetrics.slice(-4).map(m => (
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
