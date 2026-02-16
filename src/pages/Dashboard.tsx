import { preloadPatients } from "@/hooks/usePatientCache";
import { preloadStockItems } from "@/hooks/useStockStore";

// Preload caches eagerly on Dashboard so Invoices/Stock pages load instantly
preloadPatients();
preloadStockItems();

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, Package, Receipt, TrendingUp, DollarSign, Clock, RefreshCw, Activity, AlertCircle, Bell, ArrowUpRight, Plus, FileText, UserPlus, Stethoscope } from "lucide-react";
import { useEffect, useState, useCallback, lazy, Suspense } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Legend, ResponsiveContainer, AreaChart, Area } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { toast } from "sonner";

// Lazy load heavy widgets so initial render is fast
const PaymentReminders = lazy(() => import("@/components/PaymentReminders").then(m => ({ default: m.PaymentReminders })));
const MonthlyComparativeAnalysis = lazy(() => import("@/components/MonthlyComparativeAnalysis").then(m => ({ default: m.MonthlyComparativeAnalysis })));
const AgingSummaryWidget = lazy(() => import("@/components/AgingSummaryWidget").then(m => ({ default: m.AgingSummaryWidget })));
const ExpiryAlertsWidget = lazy(() => import("@/components/ExpiryAlertsWidget").then(m => ({ default: m.ExpiryAlertsWidget })));

const WidgetFallback = () => (
  <Card className="border-0 overflow-hidden">
    <CardContent className="flex items-center justify-center h-40">
      <div className="animate-pulse text-muted-foreground text-sm">Loading...</div>
    </CardContent>
  </Card>
);

interface Invoice {
  id: string;
  invoice_number: string;
  patient_name: string;
  total: number;
  status: string;
  invoice_date: string;
  created_at: string;
}

interface StockItem {
  item_id: number;
  name: string;
  current_stock: number;
  minimum_stock: number;
  category: string;
}

interface MonthlyData {
  month: string;
  revenue: number;
  invoices: number;
}

interface RealtimeUpdate {
  id: string;
  type: 'invoice' | 'stock' | 'patient' | 'prescription';
  message: string;
  timestamp: Date;
}

export default function Dashboard() {
  const navigate = useNavigate();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [stockItems, setStockItems] = useState<StockItem[]>([]);
  const [patientCount, setPatientCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [realtimeUpdates, setRealtimeUpdates] = useState<RealtimeUpdate[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const addRealtimeUpdate = useCallback((update: Omit<RealtimeUpdate, 'id' | 'timestamp'>) => {
    const newUpdate: RealtimeUpdate = {
      ...update,
      id: crypto.randomUUID(),
      timestamp: new Date()
    };
    setRealtimeUpdates(prev => [newUpdate, ...prev].slice(0, 10));
    setLastUpdated(new Date());
  }, []);

  const loadAllData = useCallback(async () => {
    try {
      const currentDate = new Date().toISOString().split('T')[0];
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
      
      const [invoiceRes, stockRes, patientCountRes, todayInvoiceRes] = await Promise.all([
        supabase.from('invoices').select('id, invoice_number, patient_name, total, status, invoice_date, created_at')
          .gte('invoice_date', sixMonthsAgo.toISOString().split('T')[0])
          .order('created_at', { ascending: false })
          .limit(500),
        supabase.from('stock_items').select('item_id, name, current_stock, minimum_stock, category').order('name'),
        supabase.from('patients').select('id', { count: 'exact', head: true }),
        supabase.from('invoices').select('id, invoice_number, patient_name, total, status, invoice_date, created_at')
          .gte('invoice_date', currentDate)
          .order('created_at', { ascending: false }),
      ]);

      if (invoiceRes.data) setInvoices(invoiceRes.data);
      if (stockRes.data) setStockItems(stockRes.data);
      if (patientCountRes.count !== null) setPatientCount(patientCountRes.count);
      
      // Populate initial activity from recent data
      const todayDate = new Date().toISOString().split('T')[0];
      const initialUpdates: RealtimeUpdate[] = [];
      
      invoiceRes.data?.slice(0, 3).forEach(inv => {
        if (inv.created_at?.startsWith(todayDate)) {
          initialUpdates.push({
            id: `inv-${inv.id}`,
            type: 'invoice',
            message: `Invoice ${inv.invoice_number} for ${inv.patient_name}`,
            timestamp: new Date(inv.created_at)
          });
        }
      });
      
      initialUpdates.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
      if (initialUpdates.length > 0) {
        setRealtimeUpdates(initialUpdates.slice(0, 10));
      }
      
      setLastUpdated(new Date());
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    await loadAllData();
    toast.success("Dashboard refreshed");
  };

  useEffect(() => {
    loadAllData();

    // Single consolidated realtime channel instead of 4 separate ones
    const channel = supabase
      .channel('dashboard-all')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'invoices' }, (payload) => {
        if (payload.eventType === 'INSERT') {
          const newInvoice = payload.new as Invoice;
          setInvoices(prev => [newInvoice, ...prev]);
          addRealtimeUpdate({ type: 'invoice', message: `New invoice ${newInvoice.invoice_number} for ${newInvoice.patient_name}` });
        } else if (payload.eventType === 'UPDATE') {
          const updatedInvoice = payload.new as Invoice;
          setInvoices(prev => prev.map(inv => inv.id === updatedInvoice.id ? updatedInvoice : inv));
        } else if (payload.eventType === 'DELETE') {
          const deletedInvoice = payload.old as Invoice;
          setInvoices(prev => prev.filter(inv => inv.id !== deletedInvoice.id));
        }
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'stock_items' }, (payload) => {
        const updatedItem = payload.new as StockItem;
        setStockItems(prev => prev.map(item => item.item_id === updatedItem.item_id ? updatedItem : item));
        if (updatedItem.current_stock <= updatedItem.minimum_stock) {
          addRealtimeUpdate({ type: 'stock', message: `Low stock: ${updatedItem.name} (${updatedItem.current_stock} left)` });
        }
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'patients' }, (payload) => {
        const newPatient = payload.new as any;
        setPatientCount(prev => prev + 1);
        addRealtimeUpdate({ type: 'patient', message: `New patient: ${newPatient.patient_name}` });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadAllData, addRealtimeUpdate]);

  // Calculate statistics
  const totalRevenue = invoices.reduce((sum, inv) => sum + Number(inv.total), 0);
  const paidInvoices = invoices.filter(inv => inv.status === 'Paid');
  const pendingInvoices = invoices.filter(inv => inv.status === 'Pending');
  const paidAmount = paidInvoices.reduce((sum, inv) => sum + Number(inv.total), 0);
  const pendingAmount = pendingInvoices.reduce((sum, inv) => sum + Number(inv.total), 0);

  // Today's stats
  const todayStr = new Date().toISOString().split('T')[0];
  const todayInvoices = invoices.filter(inv => inv.invoice_date?.startsWith(todayStr) || inv.created_at?.startsWith(todayStr));
  const todayRevenue = todayInvoices.reduce((sum, inv) => sum + Number(inv.total), 0);

  // Low stock items
  const lowStockItems = stockItems.filter(item => item.current_stock <= item.minimum_stock);

  // Category breakdown for stock
  const categoryBreakdown = stockItems.reduce((acc, item) => {
    const cat = item.category || 'Other';
    acc[cat] = (acc[cat] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const categoryData = Object.entries(categoryBreakdown).map(([name, value]) => ({ name, value }));

  // Monthly revenue data
  const getMonthlyData = (): MonthlyData[] => {
    const monthlyMap = new Map<string, { revenue: number; count: number }>();
    
    invoices.forEach(invoice => {
      const date = new Date(invoice.invoice_date || invoice.created_at);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      
      const existing = monthlyMap.get(monthKey) || { revenue: 0, count: 0 };
      monthlyMap.set(monthKey, {
        revenue: existing.revenue + Number(invoice.total),
        count: existing.count + 1
      });
    });

    return Array.from(monthlyMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-6)
      .map(([key, data]) => {
        const [year, month] = key.split('-');
        const date = new Date(parseInt(year), parseInt(month) - 1);
        return {
          month: date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
          revenue: data.revenue,
          invoices: data.count
        };
      });
  };

  const monthlyData = getMonthlyData();

  const COLORS = ['hsl(var(--gold))', 'hsl(var(--muted))', 'hsl(var(--primary))', 'hsl(var(--secondary))'];
  const CATEGORY_COLORS = ['#3b82f6', '#f59e0b', '#8b5cf6', '#10b981', '#ef4444'];

  const chartConfig = {
    revenue: { label: "Revenue", color: "hsl(var(--gold))" },
    invoices: { label: "Invoices", color: "hsl(var(--navy))" },
  };

  const getUpdateIcon = (type: string) => {
    switch (type) {
      case 'invoice': return <Receipt className="h-4 w-4 text-green-500" />;
      case 'stock': return <Package className="h-4 w-4 text-amber-500" />;
      case 'patient': return <Users className="h-4 w-4 text-blue-500" />;
      case 'prescription': return <Activity className="h-4 w-4 text-purple-500" />;
      default: return <Bell className="h-4 w-4" />;
    }
  };

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          <p className="text-muted-foreground">Loading dashboard data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 relative">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-primary via-accent to-secondary bg-clip-text text-transparent animate-pulse-subtle">
            Dashboard
          </h1>
          <p className="text-muted-foreground mt-1">Real-time business insights and analytics</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/50 px-4 py-2 rounded-full border border-border/50">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
            </span>
            Live
          </div>
          <div className="text-sm text-muted-foreground bg-muted/50 px-4 py-2 rounded-full border border-border/50">
            <Clock className="h-3.5 w-3.5 inline-block mr-1.5 opacity-60" />
            {lastUpdated.toLocaleTimeString()}
          </div>
          <button
            onClick={handleManualRefresh}
            disabled={isRefreshing}
            className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-primary text-primary-foreground shadow-md hover:shadow-lg hover:scale-105 transition-all duration-200 text-sm font-medium disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Quick Actions */}
      <Card className="border-0 shadow-sm overflow-hidden relative">
        <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-transparent to-accent/5 pointer-events-none" />
        <CardHeader className="pb-3 relative">
          <CardTitle className="text-lg flex items-center gap-2">
            <Plus className="h-5 w-5 text-primary" />
            Quick Actions
          </CardTitle>
        </CardHeader>
        <CardContent className="relative">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <button className="group h-auto py-5 flex flex-col items-center gap-3 rounded-xl border border-border/50 bg-card hover:bg-emerald-500/10 hover:border-emerald-500/40 hover:shadow-lg hover:shadow-emerald-500/10 hover:-translate-y-1 transition-all duration-300" onClick={() => navigate('/invoices/new')}>
              <div className="p-3 rounded-xl bg-gradient-to-br from-emerald-400 to-emerald-600 text-white shadow-lg shadow-emerald-500/25 group-hover:scale-110 transition-transform duration-300">
                <FileText className="h-5 w-5" />
              </div>
              <span className="font-medium text-sm">New Invoice</span>
            </button>
            <button className="group h-auto py-5 flex flex-col items-center gap-3 rounded-xl border border-border/50 bg-card hover:bg-blue-500/10 hover:border-blue-500/40 hover:shadow-lg hover:shadow-blue-500/10 hover:-translate-y-1 transition-all duration-300" onClick={() => navigate('/patients/new')}>
              <div className="p-3 rounded-xl bg-gradient-to-br from-blue-400 to-blue-600 text-white shadow-lg shadow-blue-500/25 group-hover:scale-110 transition-transform duration-300">
                <UserPlus className="h-5 w-5" />
              </div>
              <span className="font-medium text-sm">New Patient</span>
            </button>
            <button className="group h-auto py-5 flex flex-col items-center gap-3 rounded-xl border border-border/50 bg-card hover:bg-purple-500/10 hover:border-purple-500/40 hover:shadow-lg hover:shadow-purple-500/10 hover:-translate-y-1 transition-all duration-300" onClick={() => navigate('/prescriptions/new')}>
              <div className="p-3 rounded-xl bg-gradient-to-br from-purple-400 to-purple-600 text-white shadow-lg shadow-purple-500/25 group-hover:scale-110 transition-transform duration-300">
                <Stethoscope className="h-5 w-5" />
              </div>
              <span className="font-medium text-sm">New Prescription</span>
            </button>
            <button className="group h-auto py-5 flex flex-col items-center gap-3 rounded-xl border border-border/50 bg-card hover:bg-amber-500/10 hover:border-amber-500/40 hover:shadow-lg hover:shadow-amber-500/10 hover:-translate-y-1 transition-all duration-300" onClick={() => navigate('/stock')}>
              <div className="p-3 rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 text-white shadow-lg shadow-amber-500/25 group-hover:scale-110 transition-transform duration-300">
                <Package className="h-5 w-5" />
              </div>
              <span className="font-medium text-sm">Manage Stock</span>
            </button>
          </div>
        </CardContent>
      </Card>

      {/* Quick Stats - Vibrant Gradient Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card className="border-0 shadow-md overflow-hidden relative group hover:shadow-xl hover:-translate-y-1 transition-all duration-300 cursor-pointer" onClick={() => navigate('/invoices')}>
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/15 to-emerald-600/5 group-hover:from-emerald-500/25 group-hover:to-emerald-600/10 transition-colors duration-300" />
          <div className="absolute top-0 right-0 w-20 h-20 bg-emerald-500/10 rounded-full -translate-y-1/2 translate-x-1/2 group-hover:scale-150 transition-transform duration-500" />
          <CardContent className="p-5 relative">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-muted-foreground">Today's Revenue</span>
              <div className="p-2 rounded-xl bg-gradient-to-br from-emerald-400 to-emerald-600 text-white shadow-md shadow-emerald-500/25">
                <ArrowUpRight className="h-4 w-4" />
              </div>
            </div>
            <div className="text-2xl font-bold text-foreground">Rs.{todayRevenue.toLocaleString()}</div>
            <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-1 font-medium">{todayInvoices.length} invoices today</p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-md overflow-hidden relative group hover:shadow-xl hover:-translate-y-1 transition-all duration-300 cursor-pointer" onClick={() => navigate('/invoices')}>
          <div className="absolute inset-0 bg-gradient-to-br from-amber-500/15 to-orange-600/5 group-hover:from-amber-500/25 group-hover:to-orange-600/10 transition-colors duration-300" />
          <div className="absolute top-0 right-0 w-20 h-20 bg-amber-500/10 rounded-full -translate-y-1/2 translate-x-1/2 group-hover:scale-150 transition-transform duration-500" />
          <CardContent className="p-5 relative">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-muted-foreground">Total Revenue</span>
              <div className="p-2 rounded-xl bg-gradient-to-br from-amber-400 to-orange-600 text-white shadow-md shadow-amber-500/25">
                <DollarSign className="h-4 w-4" />
              </div>
            </div>
            <div className="text-2xl font-bold text-foreground">Rs.{totalRevenue.toLocaleString()}</div>
            <p className="text-xs text-amber-600 dark:text-amber-400 mt-1 font-medium">Last 6 months</p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-md overflow-hidden relative group hover:shadow-xl hover:-translate-y-1 transition-all duration-300 cursor-pointer" onClick={() => navigate('/patients')}>
          <div className="absolute inset-0 bg-gradient-to-br from-blue-500/15 to-indigo-600/5 group-hover:from-blue-500/25 group-hover:to-indigo-600/10 transition-colors duration-300" />
          <div className="absolute top-0 right-0 w-20 h-20 bg-blue-500/10 rounded-full -translate-y-1/2 translate-x-1/2 group-hover:scale-150 transition-transform duration-500" />
          <CardContent className="p-5 relative">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-muted-foreground">Total Patients</span>
              <div className="p-2 rounded-xl bg-gradient-to-br from-blue-400 to-indigo-600 text-white shadow-md shadow-blue-500/25">
                <Users className="h-4 w-4" />
              </div>
            </div>
            <div className="text-2xl font-bold text-foreground">{patientCount}</div>
            <p className="text-xs text-blue-600 dark:text-blue-400 mt-1 font-medium">Registered patients</p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-md overflow-hidden relative group hover:shadow-xl hover:-translate-y-1 transition-all duration-300 cursor-pointer" onClick={() => navigate('/stock')}>
          <div className="absolute inset-0 bg-gradient-to-br from-purple-500/15 to-violet-600/5 group-hover:from-purple-500/25 group-hover:to-violet-600/10 transition-colors duration-300" />
          <div className="absolute top-0 right-0 w-20 h-20 bg-purple-500/10 rounded-full -translate-y-1/2 translate-x-1/2 group-hover:scale-150 transition-transform duration-500" />
          <CardContent className="p-5 relative">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-muted-foreground">Stock Items</span>
              <div className="p-2 rounded-xl bg-gradient-to-br from-purple-400 to-violet-600 text-white shadow-md shadow-purple-500/25">
                <Package className="h-4 w-4" />
              </div>
            </div>
            <div className="text-2xl font-bold text-foreground">{stockItems.length}</div>
            <p className="text-xs text-purple-600 dark:text-purple-400 mt-1 font-medium">In inventory</p>
          </CardContent>
        </Card>

        <Card className={`border-0 shadow-md overflow-hidden relative group hover:shadow-xl hover:-translate-y-1 transition-all duration-300 cursor-pointer ${lowStockItems.length > 0 ? 'ring-2 ring-destructive/30' : ''}`} onClick={() => navigate('/stock')}>
          <div className={`absolute inset-0 ${lowStockItems.length > 0 ? 'bg-gradient-to-br from-red-500/15 to-rose-600/5 group-hover:from-red-500/25 group-hover:to-rose-600/10' : 'bg-gradient-to-br from-teal-500/15 to-cyan-600/5 group-hover:from-teal-500/25 group-hover:to-cyan-600/10'} transition-colors duration-300`} />
          <div className={`absolute top-0 right-0 w-20 h-20 ${lowStockItems.length > 0 ? 'bg-red-500/10' : 'bg-teal-500/10'} rounded-full -translate-y-1/2 translate-x-1/2 group-hover:scale-150 transition-transform duration-500`} />
          <CardContent className="p-5 relative">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-muted-foreground">Low Stock</span>
              <div className={`p-2 rounded-xl ${lowStockItems.length > 0 ? 'bg-gradient-to-br from-red-400 to-rose-600' : 'bg-gradient-to-br from-teal-400 to-cyan-600'} text-white shadow-md`}>
                <AlertCircle className="h-4 w-4" />
              </div>
            </div>
            <div className={`text-2xl font-bold ${lowStockItems.length > 0 ? 'text-destructive' : 'text-foreground'}`}>{lowStockItems.length}</div>
            <p className={`text-xs mt-1 font-medium ${lowStockItems.length > 0 ? 'text-red-600 dark:text-red-400' : 'text-teal-600 dark:text-teal-400'}`}>{lowStockItems.length > 0 ? 'Need reorder' : 'All stocked'}</p>
          </CardContent>
        </Card>
      </div>

      {/* Activity Feed & Payment Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Live Activity Feed */}
        <Card className="border-0 shadow-md lg:col-span-1 overflow-hidden relative">
          <div className="absolute inset-0 bg-gradient-to-b from-primary/5 to-transparent pointer-events-none" />
          <CardHeader className="pb-3 relative">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-gradient-to-br from-primary to-accent text-white">
                  <Activity className="h-3.5 w-3.5" />
                </div>
                Live Activity
              </CardTitle>
              <Badge className="bg-primary/10 text-primary border-primary/20 hover:bg-primary/20">{realtimeUpdates.length}</Badge>
            </div>
          </CardHeader>
          <CardContent className="max-h-[300px] overflow-y-auto relative">
            {realtimeUpdates.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Activity className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">Waiting for activity...</p>
              </div>
            ) : (
              <div className="space-y-2">
                {realtimeUpdates.map((update, index) => (
                  <div key={update.id} className={`flex items-start gap-3 p-3 rounded-xl transition-all duration-200 hover:scale-[1.02] ${index === 0 ? 'bg-gradient-to-r from-primary/10 to-accent/5 border border-primary/15 shadow-sm' : 'bg-muted/30 hover:bg-muted/50'}`}>
                    <div className="p-1.5 rounded-lg bg-background shadow-sm">{getUpdateIcon(update.type)}</div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{update.message}</p>
                      <p className="text-xs text-muted-foreground">{update.timestamp.toLocaleTimeString()}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Payment Summary */}
        <Card className="border-0 shadow-md lg:col-span-2 overflow-hidden relative">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/3 via-transparent to-accent/3 pointer-events-none" />
          <CardHeader className="relative">
            <CardTitle className="text-xl">Payment Overview</CardTitle>
            <p className="text-sm text-muted-foreground">Revenue breakdown and pending amounts</p>
          </CardHeader>
          <CardContent className="relative">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="p-4 rounded-xl bg-gradient-to-br from-emerald-500/10 to-emerald-600/5 border border-emerald-500/20 hover:shadow-lg hover:shadow-emerald-500/10 hover:-translate-y-0.5 transition-all duration-300 cursor-pointer">
                <div className="flex items-center gap-2 mb-2">
                  <div className="p-1.5 rounded-lg bg-gradient-to-br from-emerald-400 to-emerald-600 text-white">
                    <TrendingUp className="h-3.5 w-3.5" />
                  </div>
                  <span className="font-semibold text-emerald-600 dark:text-emerald-400 text-sm">Paid</span>
                </div>
                <p className="text-2xl font-bold text-foreground">Rs.{paidAmount.toLocaleString()}</p>
                <p className="text-sm text-muted-foreground mt-1">{paidInvoices.length} invoices</p>
              </div>
              <div className="p-4 rounded-xl bg-gradient-to-br from-amber-500/10 to-amber-600/5 border border-amber-500/20 hover:shadow-lg hover:shadow-amber-500/10 hover:-translate-y-0.5 transition-all duration-300 cursor-pointer">
                <div className="flex items-center gap-2 mb-2">
                  <div className="p-1.5 rounded-lg bg-gradient-to-br from-amber-400 to-amber-600 text-white">
                    <Clock className="h-3.5 w-3.5" />
                  </div>
                  <span className="font-semibold text-amber-600 dark:text-amber-400 text-sm">Pending</span>
                </div>
                <p className="text-2xl font-bold text-foreground">Rs.{pendingAmount.toLocaleString()}</p>
                <p className="text-sm text-muted-foreground mt-1">{pendingInvoices.length} invoices</p>
              </div>
              <div className="p-4 rounded-xl bg-gradient-to-br from-blue-500/10 to-blue-600/5 border border-blue-500/20 hover:shadow-lg hover:shadow-blue-500/10 hover:-translate-y-0.5 transition-all duration-300 cursor-pointer">
                <div className="flex items-center gap-2 mb-2">
                  <div className="p-1.5 rounded-lg bg-gradient-to-br from-blue-400 to-blue-600 text-white">
                    <Receipt className="h-3.5 w-3.5" />
                  </div>
                  <span className="font-semibold text-blue-600 dark:text-blue-400 text-sm">Total</span>
                </div>
                <p className="text-2xl font-bold text-foreground">Rs.{totalRevenue.toLocaleString()}</p>
                <p className="text-sm text-muted-foreground mt-1">{invoices.length} invoices</p>
              </div>
            </div>
            <div className="rounded-xl bg-gradient-to-br from-muted/40 to-muted/20 p-4 border border-border/50">
              <ChartContainer config={chartConfig} className="h-[200px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={monthlyData}>
                    <defs>
                      <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.4}/>
                        <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                    <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                    <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Area type="monotone" dataKey="revenue" stroke="hsl(var(--primary))" fillOpacity={1} fill="url(#colorRevenue)" strokeWidth={2.5} />
                  </AreaChart>
                </ResponsiveContainer>
              </ChartContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Monthly Comparative Analysis - lazy loaded */}
      <Suspense fallback={<WidgetFallback />}>
        <MonthlyComparativeAnalysis />
      </Suspense>

      {/* Payment Reminders & Aging Summary - lazy loaded */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Suspense fallback={<WidgetFallback />}>
          <PaymentReminders />
        </Suspense>
        <Suspense fallback={<WidgetFallback />}>
          <AgingSummaryWidget />
        </Suspense>
        <Suspense fallback={<WidgetFallback />}>
          <ExpiryAlertsWidget />
        </Suspense>
      </div>

      {/* Low Stock Alerts */}
      {lowStockItems.length > 0 && (
        <Card className="border-0 shadow-md overflow-hidden relative ring-1 ring-destructive/20">
          <div className="absolute inset-0 bg-gradient-to-br from-red-500/8 via-transparent to-rose-500/5 pointer-events-none" />
          <CardHeader className="pb-3 relative">
            <CardTitle className="text-lg flex items-center gap-2 text-destructive">
              <div className="p-1.5 rounded-lg bg-gradient-to-br from-red-400 to-rose-600 text-white animate-pulse">
                <AlertCircle className="h-4 w-4" />
              </div>
              Low Stock Alerts ({lowStockItems.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="relative">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {lowStockItems.slice(0, 6).map((item) => (
                <div key={item.item_id} className="flex items-center justify-between p-3 rounded-xl bg-background border border-destructive/20 hover:border-destructive/40 hover:shadow-md hover:shadow-red-500/10 transition-all duration-200 cursor-pointer" onClick={() => navigate('/stock')}>
                  <div>
                    <p className="font-medium text-sm">{item.name}</p>
                    <p className="text-xs text-muted-foreground">{item.category}</p>
                  </div>
                  <Badge variant="destructive" className="shadow-sm shadow-red-500/20">{item.current_stock} left</Badge>
                </div>
              ))}
            </div>
            {lowStockItems.length > 6 && (
              <p className="text-sm text-muted-foreground mt-3 text-center">And {lowStockItems.length - 6} more...</p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border-0 shadow-md overflow-hidden relative group">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-secondary/5 pointer-events-none" />
          <CardHeader className="relative">
            <CardTitle className="flex items-center gap-2">
              <div className="h-3 w-3 rounded-full bg-gradient-to-br from-primary to-secondary" />
              Revenue Trend
            </CardTitle>
            <p className="text-sm text-muted-foreground">Monthly revenue over the last 6 months</p>
          </CardHeader>
          <CardContent className="relative">
            <ChartContainer config={chartConfig} className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={monthlyData}>
                  <defs>
                    <linearGradient id="lineGradient" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor="hsl(var(--primary))" />
                      <stop offset="100%" stopColor="hsl(var(--accent))" />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                  <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Legend />
                  <Line type="monotone" dataKey="revenue" stroke="url(#lineGradient)" strokeWidth={3} name="Revenue (Rs.)" dot={{ fill: 'hsl(var(--primary))', strokeWidth: 2, r: 5 }} activeDot={{ r: 7, fill: 'hsl(var(--accent))' }} />
                </LineChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-md overflow-hidden relative">
          <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-pink-500/5 pointer-events-none" />
          <CardHeader className="relative">
            <CardTitle className="flex items-center gap-2">
              <div className="h-3 w-3 rounded-full bg-gradient-to-br from-purple-500 to-pink-500" />
              Stock by Category
            </CardTitle>
            <p className="text-sm text-muted-foreground">Distribution of inventory items</p>
          </CardHeader>
          <CardContent className="relative">
            <ChartContainer config={chartConfig} className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={categoryData} cx="50%" cy="50%" labelLine={false} label={({ name, value, percent }) => `${name}: ${value} (${(percent * 100).toFixed(0)}%)`} outerRadius={80} dataKey="value" strokeWidth={2} stroke="hsl(var(--background))">
                    {categoryData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={CATEGORY_COLORS[index % CATEGORY_COLORS.length]} />
                    ))}
                  </Pie>
                  <ChartTooltip content={<ChartTooltipContent />} />
                </PieChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>

      {/* Monthly Comparison Chart */}
      <Card className="border-0 shadow-md overflow-hidden relative">
        <div className="absolute inset-0 bg-gradient-to-r from-primary/3 via-transparent to-secondary/3 pointer-events-none" />
        <CardHeader className="relative">
          <CardTitle className="flex items-center gap-2">
            <div className="h-3 w-3 rounded-full bg-gradient-to-br from-primary to-secondary" />
            Monthly Comparison
          </CardTitle>
          <p className="text-sm text-muted-foreground">Invoice count and revenue comparison</p>
        </CardHeader>
        <CardContent className="relative">
          <ChartContainer config={chartConfig} className="h-[350px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyData}>
                <defs>
                  <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.9} />
                    <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0.5} />
                  </linearGradient>
                  <linearGradient id="barGradient2" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(var(--secondary))" stopOpacity={0.9} />
                    <stop offset="100%" stopColor="hsl(var(--secondary))" stopOpacity={0.5} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <YAxis yAxisId="left" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <YAxis yAxisId="right" orientation="right" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Legend />
                <Bar yAxisId="left" dataKey="revenue" fill="url(#barGradient)" name="Revenue (Rs.)" radius={[6, 6, 0, 0]} />
                <Bar yAxisId="right" dataKey="invoices" fill="url(#barGradient2)" name="Invoice Count" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartContainer>
        </CardContent>
      </Card>

      {/* Recent Invoices */}
      <Card className="border-0 shadow-md overflow-hidden relative">
        <div className="absolute inset-0 bg-gradient-to-b from-primary/3 to-transparent pointer-events-none" />
        <CardHeader className="relative">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <div className="h-3 w-3 rounded-full bg-gradient-to-br from-emerald-400 to-blue-500" />
              Recent Invoices
            </CardTitle>
            <Badge className="bg-primary/10 text-primary border-primary/20">{invoices.length} total</Badge>
          </div>
        </CardHeader>
        <CardContent className="relative">
          <div className="space-y-2">
            {invoices.slice(0, 5).map((invoice, index) => (
              <div key={invoice.id} className="flex items-center justify-between p-3 rounded-xl hover:bg-gradient-to-r hover:from-primary/5 hover:to-accent/5 hover:shadow-sm transition-all duration-200 cursor-pointer group border border-transparent hover:border-border/50" onClick={() => navigate(`/invoices/edit/${invoice.id}`)}>
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold text-white bg-gradient-to-br ${
                    index === 0 ? 'from-emerald-400 to-emerald-600' :
                    index === 1 ? 'from-blue-400 to-blue-600' :
                    index === 2 ? 'from-purple-400 to-purple-600' :
                    index === 3 ? 'from-amber-400 to-amber-600' :
                    'from-pink-400 to-pink-600'
                  }`}>
                    {index + 1}
                  </div>
                  <div>
                    <p className="font-medium text-foreground group-hover:text-primary transition-colors">{invoice.invoice_number}</p>
                    <p className="text-sm text-muted-foreground">{invoice.patient_name}</p>
                  </div>
                </div>
                <div className="text-right flex items-center gap-3">
                  <p className="font-semibold">Rs.{Number(invoice.total).toLocaleString()}</p>
                  <Badge className={`shadow-sm ${invoice.status === 'Paid' ? 'bg-gradient-to-r from-emerald-500 to-emerald-600 text-white border-0 shadow-emerald-500/20' : 'bg-gradient-to-r from-amber-500 to-orange-500 text-white border-0 shadow-amber-500/20'}`}>
                    {invoice.status}
                  </Badge>
                </div>
              </div>
            ))}
            {invoices.length === 0 && (
              <p className="text-center text-muted-foreground py-8">No invoices found</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
