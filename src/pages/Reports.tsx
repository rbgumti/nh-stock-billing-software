import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line
} from "recharts";
import { 
  Download, 
  FileText, 
  TrendingUp, 
  Users, 
  Package, 
  Receipt,
  Calendar,
  DollarSign,
  Activity,
  AlertTriangle,
  Clock,
  ShoppingCart,
  CalendarIcon,
  Truck,
  BookOpen,
  ClipboardList,
  ArrowRight,
  Pill,
  UserCheck
} from "lucide-react";
import { useStockStore } from "@/hooks/useStockStore";
import { createWorkbook, addJsonSheet, writeFile as writeExcelFile } from "@/lib/excelUtils";
import DailyStockReport from "@/components/DailyStockReport";
import StockLedgerReport from "@/components/StockLedgerReport";
import DayReport from "@/components/DayReport";
import SaleReport from "@/components/SaleReport";
import { BnxMonthlySalesAnalytics } from "@/components/BnxMonthlySalesAnalytics";
import FollowUpReport from "@/components/FollowUpReport";
import { FloatingOrbs } from "@/components/ui/floating-orbs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { formatNumber, roundTo2 } from "@/lib/formatUtils";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

export default function Reports() {
  const { stockItems } = useStockStore();
  const [patients, setPatients] = useState<any[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [dateRange, setDateRange] = useState({ from: "", to: "" });
  const [activeTab, setActiveTab] = useState("overview");
  
  // Overview stats from DB
  const [overviewStats, setOverviewStats] = useState({
    totalPatients: 0,
    totalInvoices: 0,
    totalRevenue: 0,
    lowStockCount: 0,
    todayInvoices: 0,
    todayRevenue: 0,
    monthInvoices: 0,
    monthRevenue: 0,
    pendingFollowUps: 0,
    expiringItems: 0,
  });
  
  // Export dialog state
  const [showExportDialog, setShowExportDialog] = useState(false);
  const [exportStartDate, setExportStartDate] = useState<Date | undefined>(undefined);
  const [exportEndDate, setExportEndDate] = useState<Date | undefined>(undefined);
  const [exportType, setExportType] = useState<'patients' | 'stock' | 'invoices'>('invoices');
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    // Load data from localStorage
    const savedPatients = JSON.parse(localStorage.getItem("patients") || "[]");
    const savedInvoices = JSON.parse(localStorage.getItem("invoices") || "[]");
    
    setPatients(savedPatients);
    setInvoices(savedInvoices);
    
    // Set default date range (last 30 days)
    const today = new Date();
    const thirtyDaysAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
    setDateRange({
      from: thirtyDaysAgo.toISOString().split('T')[0],
      to: today.toISOString().split('T')[0]
    });

    // Fetch overview stats from Supabase
    const fetchOverviewStats = async () => {
      try {
        const todayStr = format(new Date(), 'yyyy-MM-dd');
        const monthStart = format(new Date(new Date().getFullYear(), new Date().getMonth(), 1), 'yyyy-MM-dd');
        const threeMonthsLater = format(new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd');

        const [patientsRes, invoicesRes, todayInvRes, monthInvRes, followUpRes] = await Promise.all([
          supabase.from('patients').select('id', { count: 'exact', head: true }),
          supabase.from('invoices').select('id, total', { count: 'exact' }),
          supabase.from('invoices').select('id, total').eq('invoice_date', todayStr),
          supabase.from('invoices').select('id, total').gte('invoice_date', monthStart).lte('invoice_date', todayStr),
          supabase.from('invoices').select('id').gte('follow_up_date', todayStr).not('follow_up_date', 'is', null),
        ]);

        const totalRevenue = (invoicesRes.data || []).reduce((s, i) => s + (i.total || 0), 0);
        const todayRevenue = (todayInvRes.data || []).reduce((s, i) => s + (i.total || 0), 0);
        const monthRevenue = (monthInvRes.data || []).reduce((s, i) => s + (i.total || 0), 0);

        setOverviewStats({
          totalPatients: patientsRes.count || 0,
          totalInvoices: invoicesRes.count || 0,
          totalRevenue,
          lowStockCount: stockItems.filter(i => i.currentStock <= i.minimumStock).length,
          todayInvoices: todayInvRes.data?.length || 0,
          todayRevenue,
          monthInvoices: monthInvRes.data?.length || 0,
          monthRevenue,
          pendingFollowUps: followUpRes.data?.length || 0,
          expiringItems: stockItems.filter(i => {
            if (!i.expiryDate || i.expiryDate === 'N/A') return false;
            return new Date(i.expiryDate) <= new Date(threeMonthsLater);
          }).length,
        });
      } catch (err) {
        console.error('Failed to fetch overview stats:', err);
      }
    };
    fetchOverviewStats();
  }, [stockItems]);

  // Patient Reports Data
  const patientStats = {
    total: patients.length,
    newThisMonth: patients.filter(p => {
      const createdDate = new Date(p.createdAt || Date.now());
      const monthAgo = new Date();
      monthAgo.setMonth(monthAgo.getMonth() - 1);
      return createdDate >= monthAgo;
    }).length,
    byGender: patients.reduce((acc: any, patient: any) => {
      const gender = patient.personalInfo?.gender || 'Other';
      acc[gender] = (acc[gender] || 0) + 1;
      return acc;
    }, {}),
    byAgeGroup: patients.reduce((acc: any, patient: any) => {
      if (!patient.personalInfo?.dateOfBirth) return acc;
      
      const age = new Date().getFullYear() - new Date(patient.personalInfo.dateOfBirth).getFullYear();
      let ageGroup;
      if (age < 18) ageGroup = 'Under 18';
      else if (age < 35) ageGroup = '18-34';
      else if (age < 50) ageGroup = '35-49';
      else if (age < 65) ageGroup = '50-64';
      else ageGroup = '65+';
      
      acc[ageGroup] = (acc[ageGroup] || 0) + 1;
      return acc;
    }, {})
  };

  // Stock Reports Data
  const stockStats = {
    totalItems: stockItems.length,
    lowStock: stockItems.filter(item => item.currentStock <= item.minimumStock).length,
    totalValue: stockItems.reduce((sum, item) => sum + (item.currentStock * item.unitPrice), 0),
    expiringItems: stockItems.filter(item => {
      const expiryDate = new Date(item.expiryDate);
      const warningDate = new Date();
      warningDate.setMonth(warningDate.getMonth() + 3);
      return expiryDate <= warningDate;
    }).length,
    byCategory: stockItems.reduce((acc: any, item: any) => {
      acc[item.category] = (acc[item.category] || 0) + 1;
      return acc;
    }, {})
  };

  // Invoice Reports Data
  const invoiceStats = {
    total: invoices.length,
    totalRevenue: invoices.reduce((sum: number, inv: any) => sum + (inv.total || 0), 0),
    paid: invoices.filter((inv: any) => inv.status === 'Paid').length,
    pending: invoices.filter((inv: any) => inv.status === 'Pending').length,
    overdue: invoices.filter((inv: any) => inv.status === 'Overdue').length,
    monthlyRevenue: invoices.reduce((acc: any, inv: any) => {
      const month = new Date(inv.invoiceDate || Date.now()).toLocaleString('default', { month: 'short' });
      acc[month] = (acc[month] || 0) + (inv.total || 0);
      return acc;
    }, {})
  };

  const pieColors = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6'];

  const formatPieData = (data: any) => {
    return Object.entries(data).map(([key, value], index) => ({
      name: key,
      value: value as number,
      fill: pieColors[index % pieColors.length]
    }));
  };

  const formatBarData = (data: any) => {
    return Object.entries(data).map(([key, value]) => ({
      name: key,
      value: value as number
    }));
  };

  const exportReport = async (reportType: string) => {
    let data: any[] = [];
    let filename = "";

    console.log(`Exporting ${reportType} report`);
    console.log(`Available patients:`, patients.length);
    console.log(`Sample patient:`, patients[0]);

    switch (reportType) {
      case 'patients':
        if (patients.length === 0) {
          alert('No patient data available to export');
          return;
        }
        
        data = patients.map((patient, index) => {
          const firstName = patient.personalInfo?.firstName ?? patient.firstName ?? '';
          const lastName = patient.personalInfo?.lastName ?? patient.lastName ?? '';
          const newGovt = patient.personalInfo?.newGovtId ?? patient.govtIdNew ?? '';
          const oldGovt = patient.personalInfo?.oldGovtId ?? patient.govtIdOld ?? '';
          const aadhar = patient.personalInfo?.aadhar ?? patient.aadhar ?? '';
          const phone = patient.personalInfo?.phone ?? patient.phone ?? '';
          const address = patient.personalInfo?.address ?? patient.address ?? '';
          const regDate = patient.createdAt || patient.registrationDate || '';

          return {
            'S.no.': index + 1,
            'patient id': patient.patientId || patient.personalInfo?.patientId || '',
            'Patient name': `${firstName} ${lastName}`.trim(),
            'New govt id': newGovt,
            'Old govt id': oldGovt,
            'Aadhaar no.': aadhar,
            'Phone No.': phone,
            'Address': address,
            'registeration date': regDate ? new Date(regDate).toLocaleDateString() : ''
          };
        });
        filename = "patients-report.xlsx";
        break;
      case 'stock':
        if (stockItems.length === 0) {
          alert('No stock data available to export');
          return;
        }
        
        data = stockItems.map(item => ({
          'Item Name': item.name,
          'Category': item.category,
          'Current Stock': item.currentStock,
          'Minimum Stock': item.minimumStock,
          'Unit Price': item.unitPrice,
          'Supplier': item.supplier,
          'Expiry Date': item.expiryDate
        }));
        filename = "stock-report.xlsx";
        break;
      case 'invoices':
        if (invoices.length === 0) {
          alert('No invoice data available to export');
          return;
        }
        
        data = [];
        invoices.forEach(invoice => {
          const patientName = invoice.patientDetails 
            ? `${invoice.patientDetails.firstName || ''} ${invoice.patientDetails.lastName || ''}`.trim()
            : invoice.patient || 'Unknown';
          const patientId = invoice.patientDetails?.patientId || invoice.patientId || '';
          
          if (invoice.items && invoice.items.length > 0) {
            // Create a row for each medicine/item in the invoice
            invoice.items.forEach((item: any) => {
              data.push({
                'INVOICE NO': invoice.invoiceNumber || invoice.id || '',
                'DATE': invoice.invoiceDate || '',
                'PATIENT ID': patientId,
                'PATIENT NAME': patientName,
                'MEDICINE NAME': item.name || item.medicine || '',
                'QTY OF MEDICINE': item.quantity || '',
                'RATE': item.price || item.rate || 0,
                'AMOUNT': (item.quantity || 0) * (item.price || item.rate || 0)
              });
            });
          } else {
            // Fallback for invoices without items
            data.push({
              'INVOICE NO': invoice.invoiceNumber || invoice.id || '',
              'DATE': invoice.invoiceDate || '',
              'PATIENT ID': patientId,
              'PATIENT NAME': patientName,
              'MEDICINE NAME': 'N/A',
              'QTY OF MEDICINE': 'N/A',
              'RATE': 0,
              'AMOUNT': invoice.total || 0
            });
          }
        });
        filename = "invoices-report.xlsx";
        break;
    }

    console.log(`Data to export:`, data);

    if (data.length === 0) {
      alert('No data available to export');
      return;
    }

    const workbook = createWorkbook();
    addJsonSheet(workbook, data, reportType.charAt(0).toUpperCase() + reportType.slice(1));
    await writeExcelFile(workbook, filename);
  };

  const openExportDialog = (type: 'patients' | 'stock' | 'invoices') => {
    setExportType(type);
    // Default to last 30 days
    const today = new Date();
    const thirtyDaysAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
    setExportStartDate(thirtyDaysAgo);
    setExportEndDate(today);
    setShowExportDialog(true);
  };

  const exportWithDateRange = async () => {
    if (!exportStartDate || !exportEndDate) {
      toast({
        title: "Please select date range",
        description: "Both start and end dates are required",
        variant: "destructive"
      });
      return;
    }

    setExporting(true);
    const startDateStr = format(exportStartDate, 'yyyy-MM-dd');
    const endDateStr = format(exportEndDate, 'yyyy-MM-dd');

    try {
      let data: any[] = [];
      let filename = "";

      switch (exportType) {
        case 'patients':
          // Fetch patients from Supabase within date range
          const { data: patientsData, error: patientsError } = await supabase
            .from('patients')
            .select('*')
            .order('id', { ascending: true });

          if (patientsError) throw patientsError;

          if (!patientsData || patientsData.length === 0) {
            toast({
              title: "No data found",
              description: "No patients found",
              variant: "destructive"
            });
            setExporting(false);
            return;
          }

          data = patientsData.map((patient, index) => ({
            'S.No': index + 1,
            'Patient ID': patient.id,
            'S.No (File)': patient.s_no || '',
            'File No': patient.file_no || '',
            'Patient Name': patient.patient_name || '',
            'Father Name': patient.father_name || '',
            'Age': patient.age || '',
            'Phone': patient.phone || '',
            'Address': patient.address || '',
            'Govt ID': patient.govt_id || '',
            'New Govt ID': patient.new_govt_id || '',
            'Aadhar Card': patient.aadhar_card || '',
            'Category': patient.category || ''
          }));
          filename = `patients-report-${startDateStr}.xlsx`;
          break;

        case 'stock':
          // Fetch stock items from Supabase
          const { data: stockData, error: stockError } = await supabase
            .from('stock_items')
            .select('*')
            .order('name', { ascending: true });

          if (stockError) throw stockError;

          if (!stockData || stockData.length === 0) {
            toast({
              title: "No data found",
              description: "No stock items found",
              variant: "destructive"
            });
            setExporting(false);
            return;
          }

          data = stockData.map((item, index) => ({
            'S.No': index + 1,
            'Item ID': item.item_id,
            'Medicine Name': item.name || '',
            'Category': item.category || '',
            'Batch No': item.batch_no || '',
            'Packing': item.packing || '',
            'Composition': item.composition || '',
            'Current Stock': item.current_stock || 0,
            'Minimum Stock': item.minimum_stock || 0,
            'Unit Price': item.unit_price || 0,
            'MRP': item.mrp || 0,
            'Supplier': item.supplier || '',
            'Expiry Date': item.expiry_date || '',
            'Status': item.status || ''
          }));
          filename = `stock-report-${startDateStr}.xlsx`;
          break;

        case 'invoices':
          // Fetch invoices from Supabase within date range
          const { data: invoicesData, error: invoicesError } = await supabase
            .from('invoices')
            .select(`
              *,
              invoice_items (*)
            `)
            .gte('invoice_date', startDateStr)
            .lte('invoice_date', endDateStr)
            .order('invoice_date', { ascending: true });

          if (invoicesError) throw invoicesError;

          if (!invoicesData || invoicesData.length === 0) {
            toast({
              title: "No data found",
              description: "No invoices found for the selected date range",
              variant: "destructive"
            });
            setExporting(false);
            return;
          }

          // Flatten invoice items
          invoicesData.forEach(invoice => {
            if (invoice.invoice_items && invoice.invoice_items.length > 0) {
              invoice.invoice_items.forEach((item: any) => {
                data.push({
                  'Invoice No': invoice.invoice_number || '',
                  'Date': invoice.invoice_date || '',
                  'Patient ID': invoice.patient_id || '',
                  'Patient Name': invoice.patient_name || '',
                  'Patient Phone': invoice.patient_phone || '',
                  'Medicine Name': item.medicine_name || '',
                  'Quantity': item.quantity || 0,
                  'Unit Price': item.unit_price || 0,
                  'MRP': item.mrp || 0,
                  'Total': item.total || 0,
                  'Batch No': item.batch_no || '',
                  'Expiry Date': item.expiry_date || '',
                  'Frequency': item.frequency || '',
                  'Duration (Days)': item.duration_days || '',
                  'Invoice Total': invoice.total || 0,
                  'Status': invoice.status || '',
                  'Follow-Up Date': invoice.follow_up_date || ''
                });
              });
            } else {
              data.push({
                'Invoice No': invoice.invoice_number || '',
                'Date': invoice.invoice_date || '',
                'Patient ID': invoice.patient_id || '',
                'Patient Name': invoice.patient_name || '',
                'Patient Phone': invoice.patient_phone || '',
                'Medicine Name': 'N/A',
                'Quantity': 0,
                'Unit Price': 0,
                'MRP': 0,
                'Total': 0,
                'Batch No': '',
                'Expiry Date': '',
                'Frequency': '',
                'Duration (Days)': '',
                'Invoice Total': invoice.total || 0,
                'Status': invoice.status || '',
                'Follow-Up Date': invoice.follow_up_date || ''
              });
            }
          });
          filename = `invoices-report-${startDateStr}-to-${endDateStr}.xlsx`;
          break;
      }

      if (data.length === 0) {
        toast({
          title: "No data found",
          description: "No data available for export",
          variant: "destructive"
        });
        setExporting(false);
        return;
      }

      // Create workbook and export
          const workbook = createWorkbook();
          addJsonSheet(workbook, data, exportType.charAt(0).toUpperCase() + exportType.slice(1));
          await writeExcelFile(workbook, filename);

      toast({
        title: "Export successful",
        description: `Exported ${data.length} records to ${filename}`
      });

      setShowExportDialog(false);
    } catch (error: any) {
      console.error('Export error:', error);
      toast({
        title: "Export failed",
        description: error.message || "Failed to export data",
        variant: "destructive"
      });
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="p-6 space-y-6 relative">
      <FloatingOrbs />
      
      {/* Ambient liquid blobs */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden -z-10">
        <div className="absolute top-1/4 -left-20 w-96 h-96 bg-gradient-radial from-purple/20 via-purple/5 to-transparent rounded-full blur-3xl liquid-blob" />
        <div className="absolute top-1/3 -right-20 w-80 h-80 bg-gradient-radial from-cyan/20 via-cyan/5 to-transparent rounded-full blur-3xl liquid-blob" style={{ animationDelay: '-5s' }} />
        <div className="absolute -bottom-20 left-1/3 w-72 h-72 bg-gradient-radial from-gold/15 via-gold/5 to-transparent rounded-full blur-3xl liquid-blob" style={{ animationDelay: '-10s' }} />
      </div>

      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-purple via-cyan to-pink bg-clip-text text-transparent drop-shadow-sm">
            Reports
          </h1>
          <p className="text-muted-foreground mt-1">Comprehensive reports and analytics</p>
        </div>
        <div className="flex gap-2">
          <Input
            type="date"
            value={dateRange.from}
            onChange={(e) => setDateRange(prev => ({ ...prev, from: e.target.value }))}
            className="w-auto glass-subtle border-purple/20"
          />
          <Input
            type="date"
            value={dateRange.to}
            onChange={(e) => setDateRange(prev => ({ ...prev, to: e.target.value }))}
            className="w-auto glass-subtle border-purple/20"
          />
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="glass-strong border-0 p-1 grid w-full grid-cols-9">
          <TabsTrigger value="overview" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple data-[state=active]:to-cyan data-[state=active]:text-white">Overview</TabsTrigger>
          <TabsTrigger value="salereport" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-cyan data-[state=active]:to-teal data-[state=active]:text-white">Sale Report</TabsTrigger>
          <TabsTrigger value="dayreport" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-gold data-[state=active]:to-orange data-[state=active]:text-white">Day's Report</TabsTrigger>
          <TabsTrigger value="patients" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-pink data-[state=active]:to-purple data-[state=active]:text-white">Patient Reports</TabsTrigger>
          <TabsTrigger value="stock" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-emerald data-[state=active]:to-teal data-[state=active]:text-white">Stock Reports</TabsTrigger>
          <TabsTrigger value="invoices" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple data-[state=active]:to-pink data-[state=active]:text-white">Invoice Reports</TabsTrigger>
          <TabsTrigger value="stockledger" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-cyan data-[state=active]:to-purple data-[state=active]:text-white">Stock Ledger</TabsTrigger>
          <TabsTrigger value="dailystock" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-teal data-[state=active]:to-emerald data-[state=active]:text-white">Daily Stock</TabsTrigger>
          <TabsTrigger value="followup" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-orange data-[state=active]:to-gold data-[state=active]:text-white">Follow-Up</TabsTrigger>
        </TabsList>

        <TabsContent value="salereport" className="space-y-6">
          <BnxMonthlySalesAnalytics />
          <SaleReport />
        </TabsContent>

        <TabsContent value="dayreport" className="space-y-6">
          <DayReport />
        </TabsContent>

        <TabsContent value="overview" className="space-y-6">
          {/* Summary Stats Row */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card className="glass-strong border-0 overflow-hidden relative group hover:shadow-glow transition-all duration-300">
              <div className="absolute inset-0 bg-gradient-to-br from-cyan/10 via-transparent to-purple/10 opacity-50 group-hover:opacity-100 transition-opacity" />
              <CardContent className="pt-6 relative">
                <div className="flex items-center">
                  <div className="p-3 rounded-xl bg-gradient-to-br from-cyan to-purple shadow-lg">
                    <Users className="h-6 w-6 text-white" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-muted-foreground">Total Patients</p>
                    <p className="text-2xl font-bold">{overviewStats.totalPatients}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="glass-strong border-0 overflow-hidden relative group hover:shadow-glow transition-all duration-300">
              <div className="absolute inset-0 bg-gradient-to-br from-emerald/10 via-transparent to-teal/10 opacity-50 group-hover:opacity-100 transition-opacity" />
              <CardContent className="pt-6 relative">
                <div className="flex items-center">
                  <div className="p-3 rounded-xl bg-gradient-to-br from-emerald to-teal shadow-lg">
                    <Package className="h-6 w-6 text-white" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-muted-foreground">Stock Items</p>
                    <p className="text-2xl font-bold">{stockStats.totalItems}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="glass-strong border-0 overflow-hidden relative group hover:shadow-glow transition-all duration-300">
              <div className="absolute inset-0 bg-gradient-to-br from-gold/10 via-transparent to-orange/10 opacity-50 group-hover:opacity-100 transition-opacity" />
              <CardContent className="pt-6 relative">
                <div className="flex items-center">
                  <div className="p-3 rounded-xl bg-gradient-to-br from-gold to-orange shadow-lg">
                    <DollarSign className="h-6 w-6 text-white" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-muted-foreground">Today's Revenue</p>
                    <p className="text-2xl font-bold">₹{formatNumber(overviewStats.todayRevenue)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="glass-strong border-0 overflow-hidden relative group hover:shadow-glow transition-all duration-300">
              <div className="absolute inset-0 bg-gradient-to-br from-purple/10 via-transparent to-pink/10 opacity-50 group-hover:opacity-100 transition-opacity" />
              <CardContent className="pt-6 relative">
                <div className="flex items-center">
                  <div className="p-3 rounded-xl bg-gradient-to-br from-purple to-pink shadow-lg">
                    <TrendingUp className="h-6 w-6 text-white" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-muted-foreground">This Month Revenue</p>
                    <p className="text-2xl font-bold">₹{formatNumber(overviewStats.monthRevenue)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Report Dashboard Cards */}
          <h2 className="text-xl font-bold text-foreground mt-2">Quick Access Reports</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5">
            {/* Sale Report */}
            <Card 
              className="glass-strong border-0 overflow-hidden relative group hover:shadow-glow-lg hover:-translate-y-1 transition-all duration-300 cursor-pointer"
              onClick={() => setActiveTab("salereport")}
            >
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-cyan to-teal rounded-t-2xl" />
              <div className="absolute inset-0 bg-gradient-to-br from-cyan/8 via-transparent to-teal/8 opacity-60 group-hover:opacity-100 transition-opacity" />
              <CardContent className="pt-6 pb-5 relative">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-3 rounded-xl bg-gradient-to-br from-cyan/20 to-teal/20 shadow-inner">
                    <ShoppingCart className="h-6 w-6 text-cyan" />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg">Sale Report</h3>
                    <p className="text-xs text-muted-foreground">Medicine sales & analytics</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="p-2 rounded-lg bg-muted/30 border border-border/30">
                    <p className="text-xs text-muted-foreground">Today Sales</p>
                    <p className="font-semibold text-sm">{overviewStats.todayInvoices}</p>
                  </div>
                  <div className="p-2 rounded-lg bg-muted/30 border border-border/30">
                    <p className="text-xs text-muted-foreground">Month Sales</p>
                    <p className="font-semibold text-sm">{overviewStats.monthInvoices}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1 mt-3 text-xs text-cyan font-medium group-hover:gap-2 transition-all">
                  View Report <ArrowRight className="h-3 w-3" />
                </div>
              </CardContent>
            </Card>

            {/* Day's Report */}
            <Card 
              className="glass-strong border-0 overflow-hidden relative group hover:shadow-glow-lg hover:-translate-y-1 transition-all duration-300 cursor-pointer"
              onClick={() => setActiveTab("dayreport")}
            >
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-gold to-orange rounded-t-2xl" />
              <div className="absolute inset-0 bg-gradient-to-br from-gold/8 via-transparent to-orange/8 opacity-60 group-hover:opacity-100 transition-opacity" />
              <CardContent className="pt-6 pb-5 relative">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-3 rounded-xl bg-gradient-to-br from-gold/20 to-orange/20 shadow-inner">
                    <CalendarIcon className="h-6 w-6 text-gold" />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg">Day's Report</h3>
                    <p className="text-xs text-muted-foreground">Daily cash & collection</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="p-2 rounded-lg bg-muted/30 border border-border/30">
                    <p className="text-xs text-muted-foreground">Today Revenue</p>
                    <p className="font-semibold text-sm">₹{formatNumber(overviewStats.todayRevenue)}</p>
                  </div>
                  <div className="p-2 rounded-lg bg-muted/30 border border-border/30">
                    <p className="text-xs text-muted-foreground">Invoices</p>
                    <p className="font-semibold text-sm">{overviewStats.todayInvoices}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1 mt-3 text-xs text-gold font-medium group-hover:gap-2 transition-all">
                  View Report <ArrowRight className="h-3 w-3" />
                </div>
              </CardContent>
            </Card>

            {/* Patient Reports */}
            <Card 
              className="glass-strong border-0 overflow-hidden relative group hover:shadow-glow-lg hover:-translate-y-1 transition-all duration-300 cursor-pointer"
              onClick={() => setActiveTab("patients")}
            >
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-pink to-purple rounded-t-2xl" />
              <div className="absolute inset-0 bg-gradient-to-br from-pink/8 via-transparent to-purple/8 opacity-60 group-hover:opacity-100 transition-opacity" />
              <CardContent className="pt-6 pb-5 relative">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-3 rounded-xl bg-gradient-to-br from-pink/20 to-purple/20 shadow-inner">
                    <Users className="h-6 w-6 text-pink" />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg">Patient Reports</h3>
                    <p className="text-xs text-muted-foreground">Demographics & analytics</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="p-2 rounded-lg bg-muted/30 border border-border/30">
                    <p className="text-xs text-muted-foreground">Total</p>
                    <p className="font-semibold text-sm">{overviewStats.totalPatients}</p>
                  </div>
                  <div className="p-2 rounded-lg bg-muted/30 border border-border/30">
                    <p className="text-xs text-muted-foreground">Follow-Ups</p>
                    <p className="font-semibold text-sm">{overviewStats.pendingFollowUps}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1 mt-3 text-xs text-pink font-medium group-hover:gap-2 transition-all">
                  View Report <ArrowRight className="h-3 w-3" />
                </div>
              </CardContent>
            </Card>

            {/* Stock Reports */}
            <Card 
              className="glass-strong border-0 overflow-hidden relative group hover:shadow-glow-lg hover:-translate-y-1 transition-all duration-300 cursor-pointer"
              onClick={() => setActiveTab("stock")}
            >
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald to-teal rounded-t-2xl" />
              <div className="absolute inset-0 bg-gradient-to-br from-emerald/8 via-transparent to-teal/8 opacity-60 group-hover:opacity-100 transition-opacity" />
              <CardContent className="pt-6 pb-5 relative">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-3 rounded-xl bg-gradient-to-br from-emerald/20 to-teal/20 shadow-inner">
                    <Package className="h-6 w-6 text-emerald" />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg">Stock Reports</h3>
                    <p className="text-xs text-muted-foreground">Inventory & valuation</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="p-2 rounded-lg bg-muted/30 border border-border/30">
                    <p className="text-xs text-muted-foreground">Low Stock</p>
                    <p className="font-semibold text-sm text-destructive">{overviewStats.lowStockCount}</p>
                  </div>
                  <div className="p-2 rounded-lg bg-muted/30 border border-border/30">
                    <p className="text-xs text-muted-foreground">Expiring</p>
                    <p className="font-semibold text-sm text-orange">{overviewStats.expiringItems}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1 mt-3 text-xs text-emerald font-medium group-hover:gap-2 transition-all">
                  View Report <ArrowRight className="h-3 w-3" />
                </div>
              </CardContent>
            </Card>

            {/* Invoice Reports */}
            <Card 
              className="glass-strong border-0 overflow-hidden relative group hover:shadow-glow-lg hover:-translate-y-1 transition-all duration-300 cursor-pointer"
              onClick={() => setActiveTab("invoices")}
            >
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-purple to-pink rounded-t-2xl" />
              <div className="absolute inset-0 bg-gradient-to-br from-purple/8 via-transparent to-pink/8 opacity-60 group-hover:opacity-100 transition-opacity" />
              <CardContent className="pt-6 pb-5 relative">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-3 rounded-xl bg-gradient-to-br from-purple/20 to-pink/20 shadow-inner">
                    <Receipt className="h-6 w-6 text-purple" />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg">Invoice Reports</h3>
                    <p className="text-xs text-muted-foreground">Billing & revenue</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="p-2 rounded-lg bg-muted/30 border border-border/30">
                    <p className="text-xs text-muted-foreground">Total</p>
                    <p className="font-semibold text-sm">{overviewStats.totalInvoices}</p>
                  </div>
                  <div className="p-2 rounded-lg bg-muted/30 border border-border/30">
                    <p className="text-xs text-muted-foreground">Revenue</p>
                    <p className="font-semibold text-sm">₹{formatNumber(overviewStats.totalRevenue)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1 mt-3 text-xs text-purple font-medium group-hover:gap-2 transition-all">
                  View Report <ArrowRight className="h-3 w-3" />
                </div>
              </CardContent>
            </Card>

            {/* Stock Ledger */}
            <Card 
              className="glass-strong border-0 overflow-hidden relative group hover:shadow-glow-lg hover:-translate-y-1 transition-all duration-300 cursor-pointer"
              onClick={() => setActiveTab("stockledger")}
            >
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-cyan to-purple rounded-t-2xl" />
              <div className="absolute inset-0 bg-gradient-to-br from-cyan/8 via-transparent to-purple/8 opacity-60 group-hover:opacity-100 transition-opacity" />
              <CardContent className="pt-6 pb-5 relative">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-3 rounded-xl bg-gradient-to-br from-cyan/20 to-purple/20 shadow-inner">
                    <BookOpen className="h-6 w-6 text-cyan" />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg">Stock Ledger</h3>
                    <p className="text-xs text-muted-foreground">Movement tracking</p>
                  </div>
                </div>
                <div className="p-2 rounded-lg bg-muted/30 border border-border/30">
                  <p className="text-xs text-muted-foreground">Total Stock Value</p>
                  <p className="font-semibold text-sm">₹{formatNumber(stockStats.totalValue)}</p>
                </div>
                <div className="flex items-center gap-1 mt-3 text-xs text-cyan font-medium group-hover:gap-2 transition-all">
                  View Ledger <ArrowRight className="h-3 w-3" />
                </div>
              </CardContent>
            </Card>

            {/* Daily Stock Report */}
            <Card 
              className="glass-strong border-0 overflow-hidden relative group hover:shadow-glow-lg hover:-translate-y-1 transition-all duration-300 cursor-pointer"
              onClick={() => setActiveTab("dailystock")}
            >
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-teal to-emerald rounded-t-2xl" />
              <div className="absolute inset-0 bg-gradient-to-br from-teal/8 via-transparent to-emerald/8 opacity-60 group-hover:opacity-100 transition-opacity" />
              <CardContent className="pt-6 pb-5 relative">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-3 rounded-xl bg-gradient-to-br from-teal/20 to-emerald/20 shadow-inner">
                    <ClipboardList className="h-6 w-6 text-teal" />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg">Daily Stock</h3>
                    <p className="text-xs text-muted-foreground">Opening & closing stock</p>
                  </div>
                </div>
                <div className="p-2 rounded-lg bg-muted/30 border border-border/30">
                  <p className="text-xs text-muted-foreground">Total Items</p>
                  <p className="font-semibold text-sm">{stockStats.totalItems}</p>
                </div>
                <div className="flex items-center gap-1 mt-3 text-xs text-teal font-medium group-hover:gap-2 transition-all">
                  View Report <ArrowRight className="h-3 w-3" />
                </div>
              </CardContent>
            </Card>

            {/* Follow-Up Report */}
            <Card 
              className="glass-strong border-0 overflow-hidden relative group hover:shadow-glow-lg hover:-translate-y-1 transition-all duration-300 cursor-pointer"
              onClick={() => setActiveTab("followup")}
            >
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-orange to-gold rounded-t-2xl" />
              <div className="absolute inset-0 bg-gradient-to-br from-orange/8 via-transparent to-gold/8 opacity-60 group-hover:opacity-100 transition-opacity" />
              <CardContent className="pt-6 pb-5 relative">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-3 rounded-xl bg-gradient-to-br from-orange/20 to-gold/20 shadow-inner">
                    <UserCheck className="h-6 w-6 text-orange" />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg">Follow-Up</h3>
                    <p className="text-xs text-muted-foreground">Patient follow-ups</p>
                  </div>
                </div>
                <div className="p-2 rounded-lg bg-muted/30 border border-border/30">
                  <p className="text-xs text-muted-foreground">Pending</p>
                  <p className="font-semibold text-sm">{overviewStats.pendingFollowUps}</p>
                </div>
                <div className="flex items-center gap-1 mt-3 text-xs text-orange font-medium group-hover:gap-2 transition-all">
                  View Report <ArrowRight className="h-3 w-3" />
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="patients" className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold bg-gradient-to-r from-pink to-purple bg-clip-text text-transparent">Patient Reports</h2>
            <Button onClick={() => openExportDialog('patients')} className="bg-gradient-to-r from-pink to-purple hover:shadow-glow text-white">
              <Download className="h-4 w-4 mr-2" />
              Export Excel
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="glass-strong border-0 overflow-hidden relative">
              <div className="absolute inset-0 bg-gradient-to-br from-pink/5 via-transparent to-purple/5" />
              <CardHeader className="relative">
                <CardTitle className="text-lg">Patients by Gender</CardTitle>
              </CardHeader>
              <CardContent className="relative">
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={formatPieData(patientStats.byGender)}
                      cx="50%"
                      cy="50%"
                      outerRadius={100}
                      dataKey="value"
                      label={({ name, value }) => `${name}: ${value}`}
                    >
                      {formatPieData(patientStats.byGender).map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card className="glass-strong border-0 overflow-hidden relative">
              <div className="absolute inset-0 bg-gradient-to-br from-cyan/5 via-transparent to-purple/5" />
              <CardHeader className="relative">
                <CardTitle className="text-lg">Patients by Age Group</CardTitle>
              </CardHeader>
              <CardContent className="relative">
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={formatBarData(patientStats.byAgeGroup)}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--muted))" />
                    <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" />
                    <YAxis stroke="hsl(var(--muted-foreground))" />
                    <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }} />
                    <Bar dataKey="value" fill="hsl(var(--purple))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="glass-strong border-0 overflow-hidden relative group hover:shadow-glow transition-all">
              <div className="absolute inset-0 bg-gradient-to-br from-cyan/10 to-purple/10 opacity-50 group-hover:opacity-100 transition-opacity" />
              <CardContent className="pt-6 relative">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Patients</p>
                  <p className="text-2xl font-bold">{patientStats.total}</p>
                </div>
              </CardContent>
            </Card>
            
            <Card className="glass-strong border-0 overflow-hidden relative group hover:shadow-glow transition-all">
              <div className="absolute inset-0 bg-gradient-to-br from-emerald/10 to-teal/10 opacity-50 group-hover:opacity-100 transition-opacity" />
              <CardContent className="pt-6 relative">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">New This Month</p>
                  <p className="text-2xl font-bold text-emerald">{patientStats.newThisMonth}</p>
                </div>
              </CardContent>
            </Card>

            <Card className="glass-strong border-0 overflow-hidden relative group hover:shadow-glow transition-all">
              <div className="absolute inset-0 bg-gradient-to-br from-purple/10 to-cyan/10 opacity-50 group-hover:opacity-100 transition-opacity" />
              <CardContent className="pt-6 relative">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Growth Rate</p>
                  <p className="text-2xl font-bold text-cyan">
                    {patientStats.total > 0 ? ((patientStats.newThisMonth / patientStats.total) * 100).toFixed(1) : 0}%
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Detailed Patient List */}
          <Card className="glass-strong border-0 overflow-hidden relative">
            <div className="absolute inset-0 bg-gradient-to-br from-pink/5 via-transparent to-purple/5" />
            <CardHeader className="relative">
              <CardTitle className="text-lg">Detailed Patient Information</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4 max-h-80 overflow-y-auto">
                {patients.map((patient: any) => (
                  <div key={patient.patientId} className="border rounded-lg p-4 space-y-2">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-semibold">
                          {patient.personalInfo?.firstName} {patient.personalInfo?.lastName}
                        </h4>
                        <p className="text-sm text-gray-600">ID: {patient.patientId}</p>
                        <p className="text-sm text-gray-600">
                          Age: {patient.personalInfo?.dateOfBirth 
                            ? new Date().getFullYear() - new Date(patient.personalInfo.dateOfBirth).getFullYear()
                            : 'N/A'} | Gender: {patient.personalInfo?.gender || 'N/A'}
                        </p>
                        <p className="text-sm text-gray-600">
                          <strong>Address:</strong> {patient.personalInfo?.address || 'N/A'}
                        </p>
                        <div className="space-y-1">
                          <p className="text-sm text-gray-600">
                            <strong>Aadhar:</strong> {patient.personalInfo?.aadhar || 'N/A'}
                          </p>
                          <p className="text-sm text-gray-600">
                            <strong>Old Govt ID:</strong> {patient.personalInfo?.oldGovtId || 'N/A'}
                          </p>
                          <p className="text-sm text-gray-600">
                            <strong>New Govt ID:</strong> {patient.personalInfo?.newGovtId || 'N/A'}
                          </p>
                        </div>
                      </div>
                      <div className="text-right space-y-1">
                        <p className="text-sm text-gray-600">Contact</p>
                        <p className="text-sm">{patient.personalInfo?.phone || 'N/A'}</p>
                        <p className="text-xs text-gray-500">{patient.personalInfo?.email || 'N/A'}</p>
                        {patient.emergencyContact && (
                          <div className="pt-2">
                            <p className="text-xs text-gray-600"><strong>Emergency Contact:</strong></p>
                            <p className="text-xs">{patient.emergencyContact.name || 'N/A'}</p>
                            <p className="text-xs">{patient.emergencyContact.phone || 'N/A'}</p>
                          </div>
                        )}
                      </div>
                    </div>
                    {patient.medicalInfo && (
                      <div className="pt-2 border-t">
                        <p className="text-xs text-gray-600">
                          <strong>Medical Info:</strong> {patient.medicalInfo.allergies || 'No allergies'} | 
                          Conditions: {patient.medicalInfo.chronicConditions || 'None'} |
                          Blood Group: {patient.medicalInfo.bloodGroup || 'Unknown'}
                        </p>
                      </div>
                    )}
                  </div>
                ))}
                {!patients.length && (
                  <p className="text-gray-500 text-center py-8">No patients found</p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="stock" className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold bg-gradient-to-r from-emerald to-teal bg-clip-text text-transparent">Stock Reports</h2>
            <Button onClick={() => openExportDialog('stock')} className="bg-gradient-to-r from-emerald to-teal hover:shadow-glow text-white">
              <Download className="h-4 w-4 mr-2" />
              Export Excel
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card className="glass-strong border-0 overflow-hidden relative group hover:shadow-glow transition-all">
              <div className="absolute inset-0 bg-gradient-to-br from-emerald/10 to-teal/10 opacity-50 group-hover:opacity-100 transition-opacity" />
              <CardContent className="pt-6 relative">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Items</p>
                  <p className="text-2xl font-bold">{stockStats.totalItems}</p>
                </div>
              </CardContent>
            </Card>
            
            <Card className="glass-strong border-0 overflow-hidden relative group hover:shadow-glow transition-all">
              <div className="absolute inset-0 bg-gradient-to-br from-destructive/10 to-pink/10 opacity-50 group-hover:opacity-100 transition-opacity" />
              <CardContent className="pt-6 relative">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Low Stock Items</p>
                  <p className="text-2xl font-bold text-destructive">{stockStats.lowStock}</p>
                </div>
              </CardContent>
            </Card>

            <Card className="glass-strong border-0 overflow-hidden relative group hover:shadow-glow transition-all">
              <div className="absolute inset-0 bg-gradient-to-br from-emerald/10 to-cyan/10 opacity-50 group-hover:opacity-100 transition-opacity" />
              <CardContent className="pt-6 relative">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Value</p>
                  <p className="text-2xl font-bold text-emerald">₹{formatNumber(stockStats.totalValue)}</p>
                </div>
              </CardContent>
            </Card>

            <Card className="glass-strong border-0 overflow-hidden relative group hover:shadow-glow transition-all">
              <div className="absolute inset-0 bg-gradient-to-br from-orange/10 to-gold/10 opacity-50 group-hover:opacity-100 transition-opacity" />
              <CardContent className="pt-6 relative">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Expiring Soon</p>
                  <p className="text-2xl font-bold text-orange">{stockStats.expiringItems}</p>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="glass-strong border-0 overflow-hidden relative">
              <div className="absolute inset-0 bg-gradient-to-br from-emerald/5 via-transparent to-teal/5" />
              <CardHeader className="relative">
                <CardTitle className="text-lg">Stock by Category</CardTitle>
              </CardHeader>
              <CardContent className="relative">
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={formatBarData(stockStats.byCategory)}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--muted))" />
                    <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" />
                    <YAxis stroke="hsl(var(--muted-foreground))" />
                    <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }} />
                    <Bar dataKey="value" fill="hsl(var(--emerald))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card className="glass-strong border-0 overflow-hidden relative">
              <div className="absolute inset-0 bg-gradient-to-br from-cyan/5 via-transparent to-emerald/5" />
              <CardHeader className="relative">
                <CardTitle className="text-lg">Stock Status Overview</CardTitle>
              </CardHeader>
              <CardContent className="relative">
                <div className="space-y-4 max-h-80 overflow-y-auto">
                  {stockItems.map((item) => {
                    const isLowStock = item.currentStock <= item.minimumStock;
                    const expiryDate = new Date(item.expiryDate);
                    const warningDate = new Date();
                    warningDate.setMonth(warningDate.getMonth() + 3);
                    const isExpiringSoon = expiryDate <= warningDate;
                    
                    return (
                      <div key={item.id} className="border rounded-lg p-4 space-y-2">
                        <div className="flex justify-between items-start">
                          <div>
                            <h4 className="font-semibold">{item.name}</h4>
                            <p className="text-sm text-gray-600">Category: {item.category}</p>
                            <p className="text-sm text-gray-600">Supplier: {item.supplier}</p>
                            <p className="text-sm text-gray-600">Batch: {item.batchNo}</p>
                          </div>
                          <div className="text-right space-y-1">
                            <p className="text-sm font-medium">Stock: {item.currentStock}/{item.minimumStock}</p>
                            <p className="text-sm text-gray-600">₹{formatNumber(item.unitPrice)} per unit</p>
                            <p className="text-xs text-gray-500">Value: ₹{formatNumber(item.currentStock * item.unitPrice)}</p>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          {isLowStock && (
                            <Badge variant="destructive" className="text-xs">
                              <AlertTriangle className="h-3 w-3 mr-1" />
                              Low Stock
                            </Badge>
                          )}
                          {isExpiringSoon && (
                            <Badge variant="secondary" className="text-xs">
                              <Clock className="h-3 w-3 mr-1" />
                              Expires: {expiryDate.toLocaleDateString()}
                            </Badge>
                          )}
                          {!isLowStock && !isExpiringSoon && (
                            <Badge variant="default" className="text-xs">
                              <Activity className="h-3 w-3 mr-1" />
                              Good Stock
                            </Badge>
                          )}
                        </div>
                      </div>
                    );
                  })}
                  {!stockItems.length && (
                    <p className="text-gray-500 text-center py-8">No stock items found</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="invoices" className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold bg-gradient-to-r from-purple to-pink bg-clip-text text-transparent">Invoice Reports</h2>
            <Button onClick={() => openExportDialog('invoices')} className="bg-gradient-to-r from-purple to-pink hover:shadow-glow text-white">
              <Download className="h-4 w-4 mr-2" />
              Export Excel
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card className="glass-strong border-0 overflow-hidden relative group hover:shadow-glow transition-all">
              <div className="absolute inset-0 bg-gradient-to-br from-purple/10 to-pink/10 opacity-50 group-hover:opacity-100 transition-opacity" />
              <CardContent className="pt-6 relative">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Invoices</p>
                  <p className="text-2xl font-bold">{invoiceStats.total}</p>
                </div>
              </CardContent>
            </Card>
            
            <Card className="glass-strong border-0 overflow-hidden relative group hover:shadow-glow transition-all">
              <div className="absolute inset-0 bg-gradient-to-br from-emerald/10 to-teal/10 opacity-50 group-hover:opacity-100 transition-opacity" />
              <CardContent className="pt-6 relative">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Paid Invoices</p>
                  <p className="text-2xl font-bold text-emerald">{invoiceStats.paid}</p>
                </div>
              </CardContent>
            </Card>

            <Card className="glass-strong border-0 overflow-hidden relative group hover:shadow-glow transition-all">
              <div className="absolute inset-0 bg-gradient-to-br from-orange/10 to-gold/10 opacity-50 group-hover:opacity-100 transition-opacity" />
              <CardContent className="pt-6 relative">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Pending Invoices</p>
                  <p className="text-2xl font-bold text-orange">{invoiceStats.pending}</p>
                </div>
              </CardContent>
            </Card>

            <Card className="glass-strong border-0 overflow-hidden relative group hover:shadow-glow transition-all">
              <div className="absolute inset-0 bg-gradient-to-br from-cyan/10 to-purple/10 opacity-50 group-hover:opacity-100 transition-opacity" />
              <CardContent className="pt-6 relative">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Revenue</p>
                  <p className="text-2xl font-bold text-cyan">₹{formatNumber(invoiceStats.totalRevenue)}</p>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="glass-strong border-0 overflow-hidden relative">
              <div className="absolute inset-0 bg-gradient-to-br from-purple/5 via-transparent to-pink/5" />
              <CardHeader className="relative">
                <CardTitle className="text-lg">Monthly Revenue</CardTitle>
              </CardHeader>
              <CardContent className="relative">
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={formatBarData(invoiceStats.monthlyRevenue)}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--muted))" />
                    <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" />
                    <YAxis stroke="hsl(var(--muted-foreground))" />
                    <Tooltip formatter={(value) => [`₹${value}`, 'Revenue']} contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }} />
                    <Line type="monotone" dataKey="value" stroke="hsl(var(--purple))" strokeWidth={3} />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card className="glass-strong border-0 overflow-hidden relative">
              <div className="absolute inset-0 bg-gradient-to-br from-cyan/5 via-transparent to-purple/5" />
              <CardHeader className="relative">
                <CardTitle className="text-lg">Detailed Invoice Report</CardTitle>
              </CardHeader>
              <CardContent className="relative">
                <div className="space-y-4 max-h-80 overflow-y-auto">
                  {invoices.map((invoice: any) => (
                    <div key={invoice.id} className="border rounded-lg p-4 space-y-3">
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="font-semibold">Invoice #{invoice.id}</h4>
                          <p className="text-sm text-gray-600">
                            Patient: {invoice.patientDetails?.firstName || invoice.patient} 
                            {invoice.patientDetails?.lastName ? ` ${invoice.patientDetails.lastName}` : ''}
                          </p>
                          <p className="text-xs text-gray-500">
                            ID: {invoice.patientDetails?.patientId || 'N/A'} | 
                            Date: {new Date(invoice.invoiceDate || Date.now()).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="text-right">
                          <Badge variant={invoice.status === 'Paid' ? 'default' : invoice.status === 'Pending' ? 'secondary' : 'destructive'}>
                            {invoice.status || 'Pending'}
                          </Badge>
                          <p className="font-semibold mt-1">₹{formatNumber(invoice.total || 0)}</p>
                        </div>
                      </div>
                      
                      {invoice.items && invoice.items.length > 0 && (
                        <div className="space-y-2">
                          <p className="text-sm font-medium text-gray-700">Medicines:</p>
                          {invoice.items.map((item: any, index: number) => (
                            <div key={index} className="flex justify-between text-sm bg-gray-50 p-2 rounded">
                              <span>{item.medicineName || item.name}</span>
                              <span>Qty: {item.quantity} | ₹{formatNumber((item.unitPrice || 0) * (item.quantity || 0))}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                  {!invoices.length && (
                    <p className="text-gray-500 text-center py-8">No invoices found</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="stockledger" className="space-y-6">
          <StockLedgerReport />
        </TabsContent>

        <TabsContent value="dailystock" className="space-y-6">
          <DailyStockReport />
        </TabsContent>

        <TabsContent value="followup" className="space-y-6">
          <FollowUpReport />
        </TabsContent>
      </Tabs>

      {/* Date Range Export Dialog */}
      <Dialog open={showExportDialog} onOpenChange={setShowExportDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Download className="h-5 w-5" />
              Export {exportType.charAt(0).toUpperCase() + exportType.slice(1)} Report
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Start Date</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !exportStartDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {exportStartDate ? format(exportStartDate, "PPP") : "Select start date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <CalendarComponent
                    mode="single"
                    selected={exportStartDate}
                    onSelect={setExportStartDate}
                    initialFocus
                    className="p-3 pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">End Date</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !exportEndDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {exportEndDate ? format(exportEndDate, "PPP") : "Select end date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <CalendarComponent
                    mode="single"
                    selected={exportEndDate}
                    onSelect={setExportEndDate}
                    initialFocus
                    className="p-3 pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>
            {exportType === 'invoices' && (
              <p className="text-sm text-muted-foreground">
                Invoices will be filtered by invoice date within the selected range.
              </p>
            )}
            {exportType === 'patients' && (
              <p className="text-sm text-muted-foreground">
                All patients will be exported (date range shown in filename).
              </p>
            )}
            {exportType === 'stock' && (
              <p className="text-sm text-muted-foreground">
                Current stock snapshot will be exported.
              </p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowExportDialog(false)}>
              Cancel
            </Button>
            <Button 
              onClick={exportWithDateRange} 
              disabled={exporting}
              className="bg-gradient-to-r from-purple to-pink text-white"
            >
              {exporting ? "Exporting..." : "Export"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}