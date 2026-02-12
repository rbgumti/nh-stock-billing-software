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
          <h1 className="text-4xl font-bold bg-gradient-to-r from-primary via-primary/80 to-primary/60 bg-clip-text text-transparent">
            Dashboard
          </h1>
          <p className="text-muted-foreground mt-1">Real-time business insights and analytics</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/50 px-4 py-2 rounded-full">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
            </span>
            Live
          </div>
          <div className="text-sm text-muted-foreground bg-muted/50 px-4 py-2 rounded-full">
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
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Plus className="h-5 w-5 text-primary" />
            Quick Actions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <button className="group h-auto py-5 flex flex-col items-center gap-3 rounded-xl border border-border/50 bg-card hover:bg-accent hover:border-primary/30 transition-all duration-200" onClick={() => navigate('/invoices/new')}>
              <div className="p-3 rounded-xl bg-emerald-500/10 text-emerald-600 group-hover:bg-emerald-500 group-hover:text-white transition-colors">
                <FileText className="h-5 w-5" />
              </div>
              <span className="font-medium text-sm">New Invoice</span>
            </button>
            <button className="group h-auto py-5 flex flex-col items-center gap-3 rounded-xl border border-border/50 bg-card hover:bg-accent hover:border-primary/30 transition-all duration-200" onClick={() => navigate('/patients/new')}>
              <div className="p-3 rounded-xl bg-blue-500/10 text-blue-600 group-hover:bg-blue-500 group-hover:text-white transition-colors">
                <UserPlus className="h-5 w-5" />
              </div>
              <span className="font-medium text-sm">New Patient</span>
            </button>
            <button className="group h-auto py-5 flex flex-col items-center gap-3 rounded-xl border border-border/50 bg-card hover:bg-accent hover:border-primary/30 transition-all duration-200" onClick={() => navigate('/prescriptions/new')}>
              <div className="p-3 rounded-xl bg-purple-500/10 text-purple-600 group-hover:bg-purple-500 group-hover:text-white transition-colors">
                <Stethoscope className="h-5 w-5" />
              </div>
              <span className="font-medium text-sm">New Prescription</span>
            </button>
            <button className="group h-auto py-5 flex flex-col items-center gap-3 rounded-xl border border-border/50 bg-card hover:bg-accent hover:border-primary/30 transition-all duration-200" onClick={() => navigate('/stock')}>
              <div className="p-3 rounded-xl bg-amber-500/10 text-amber-600 group-hover:bg-amber-500 group-hover:text-white transition-colors">
                <Package className="h-5 w-5" />
              </div>
              <span className="font-medium text-sm">Manage Stock</span>
            </button>
          </div>
        </CardContent>
      </Card>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card className="border-0 shadow-sm">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-muted-foreground">Today's Revenue</span>
              <div className="p-2 rounded-lg bg-emerald-500/10"><ArrowUpRight className="h-4 w-4 text-emerald-600" /></div>
            </div>
            <div className="text-2xl font-bold text-foreground">Rs.{todayRevenue.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground mt-1">{todayInvoices.length} invoices today</p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-muted-foreground">Total Revenue</span>
              <div className="p-2 rounded-lg bg-amber-500/10"><DollarSign className="h-4 w-4 text-amber-600" /></div>
            </div>
            <div className="text-2xl font-bold text-foreground">Rs.{totalRevenue.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground mt-1">Last 6 months</p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-muted-foreground">Total Patients</span>
              <div className="p-2 rounded-lg bg-blue-500/10"><Users className="h-4 w-4 text-blue-600" /></div>
            </div>
            <div className="text-2xl font-bold text-foreground">{patientCount}</div>
            <p className="text-xs text-muted-foreground mt-1">Registered patients</p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-muted-foreground">Stock Items</span>
              <div className="p-2 rounded-lg bg-purple-500/10"><Package className="h-4 w-4 text-purple-600" /></div>
            </div>
            <div className="text-2xl font-bold text-foreground">{stockItems.length}</div>
            <p className="text-xs text-muted-foreground mt-1">In inventory</p>
          </CardContent>
        </Card>

        <Card className={`border-0 shadow-sm ${lowStockItems.length > 0 ? 'border-l-4 border-l-destructive' : ''}`}>
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-muted-foreground">Low Stock</span>
              <div className={`p-2 rounded-lg ${lowStockItems.length > 0 ? 'bg-destructive/10' : 'bg-emerald-500/10'}`}>
                <AlertCircle className={`h-4 w-4 ${lowStockItems.length > 0 ? 'text-destructive' : 'text-emerald-600'}`} />
              </div>
            </div>
            <div className={`text-2xl font-bold ${lowStockItems.length > 0 ? 'text-destructive' : 'text-foreground'}`}>{lowStockItems.length}</div>
            <p className="text-xs text-muted-foreground mt-1">{lowStockItems.length > 0 ? 'Need reorder' : 'All stocked'}</p>
          </CardContent>
        </Card>
      </div>

      {/* Activity Feed & Payment Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Live Activity Feed */}
        <Card className="border-0 shadow-sm lg:col-span-1">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <Activity className="h-4 w-4 text-primary" />
                Live Activity
              </CardTitle>
              <Badge variant="secondary" className="text-xs">{realtimeUpdates.length}</Badge>
            </div>
          </CardHeader>
          <CardContent className="max-h-[300px] overflow-y-auto">
            {realtimeUpdates.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Activity className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">Waiting for activity...</p>
              </div>
            ) : (
              <div className="space-y-2">
                {realtimeUpdates.map((update, index) => (
                  <div key={update.id} className={`flex items-start gap-3 p-3 rounded-lg ${index === 0 ? 'bg-primary/5 border border-primary/10' : 'bg-muted/30'}`}>
                    <div className="p-1.5 rounded-md bg-background">{getUpdateIcon(update.type)}</div>
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
        <Card className="border-0 shadow-sm lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-xl">Payment Overview</CardTitle>
            <p className="text-sm text-muted-foreground">Revenue breakdown and pending amounts</p>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="p-4 rounded-xl bg-emerald-500/5 border border-emerald-500/10">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp className="h-4 w-4 text-emerald-600" />
                  <span className="font-semibold text-emerald-600 text-sm">Paid</span>
                </div>
                <p className="text-2xl font-bold text-foreground">Rs.{paidAmount.toLocaleString()}</p>
                <p className="text-sm text-muted-foreground mt-1">{paidInvoices.length} invoices</p>
              </div>
              <div className="p-4 rounded-xl bg-amber-500/5 border border-amber-500/10">
                <div className="flex items-center gap-2 mb-2">
                  <Clock className="h-4 w-4 text-amber-600" />
                  <span className="font-semibold text-amber-600 text-sm">Pending</span>
                </div>
                <p className="text-2xl font-bold text-foreground">Rs.{pendingAmount.toLocaleString()}</p>
                <p className="text-sm text-muted-foreground mt-1">{pendingInvoices.length} invoices</p>
              </div>
              <div className="p-4 rounded-xl bg-blue-500/5 border border-blue-500/10">
                <div className="flex items-center gap-2 mb-2">
                  <Receipt className="h-4 w-4 text-blue-600" />
                  <span className="font-semibold text-blue-600 text-sm">Total</span>
                </div>
                <p className="text-2xl font-bold text-foreground">Rs.{totalRevenue.toLocaleString()}</p>
                <p className="text-sm text-muted-foreground mt-1">{invoices.length} invoices</p>
              </div>
            </div>
            <div className="rounded-xl bg-muted/30 p-4">
              <ChartContainer config={chartConfig} className="h-[200px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={monthlyData}>
                    <defs>
                      <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.5} />
                    <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                    <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Area type="monotone" dataKey="revenue" stroke="hsl(var(--primary))" fillOpacity={1} fill="url(#colorRevenue)" strokeWidth={2} />
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
        <Card className="border-destructive/30 bg-destructive/5">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2 text-destructive">
              <AlertCircle className="h-5 w-5" />
              Low Stock Alerts ({lowStockItems.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {lowStockItems.slice(0, 6).map((item) => (
                <div key={item.item_id} className="flex items-center justify-between p-3 rounded-lg bg-background border border-destructive/20">
                  <div>
                    <p className="font-medium text-sm">{item.name}</p>
                    <p className="text-xs text-muted-foreground">{item.category}</p>
                  </div>
                  <Badge variant="destructive">{item.current_stock} left</Badge>
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
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle>Revenue Trend</CardTitle>
            <p className="text-sm text-muted-foreground">Monthly revenue over the last 6 months</p>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Legend />
                  <Line type="monotone" dataKey="revenue" stroke="hsl(var(--primary))" strokeWidth={2} name="Revenue (Rs.)" dot={{ fill: 'hsl(var(--primary))', strokeWidth: 2 }} />
                </LineChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle>Stock by Category</CardTitle>
            <p className="text-sm text-muted-foreground">Distribution of inventory items</p>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={categoryData} cx="50%" cy="50%" labelLine={false} label={({ name, value, percent }) => `${name}: ${value} (${(percent * 100).toFixed(0)}%)`} outerRadius={80} dataKey="value">
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
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle>Monthly Comparison</CardTitle>
          <p className="text-sm text-muted-foreground">Invoice count and revenue comparison</p>
        </CardHeader>
        <CardContent>
          <ChartContainer config={chartConfig} className="h-[350px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <YAxis yAxisId="left" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <YAxis yAxisId="right" orientation="right" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Legend />
                <Bar yAxisId="left" dataKey="revenue" fill="hsl(var(--primary))" name="Revenue (Rs.)" radius={[4, 4, 0, 0]} />
                <Bar yAxisId="right" dataKey="invoices" fill="hsl(var(--muted-foreground))" name="Invoice Count" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartContainer>
        </CardContent>
      </Card>

      {/* Recent Invoices */}
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Recent Invoices</CardTitle>
            <Badge variant="secondary">{invoices.length} total</Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {invoices.slice(0, 5).map((invoice) => (
              <div key={invoice.id} className="flex items-center justify-between border-b border-border/50 pb-3 last:border-b-0 hover:bg-muted/30 p-2 rounded-lg transition-colors">
                <div>
                  <p className="font-medium text-foreground">{invoice.invoice_number}</p>
                  <p className="text-sm text-muted-foreground">{invoice.patient_name}</p>
                </div>
                <div className="text-right">
                  <p className="font-medium">Rs.{Number(invoice.total).toLocaleString()}</p>
                  <Badge variant={invoice.status === 'Paid' ? 'default' : 'secondary'} className={invoice.status === 'Paid' ? 'bg-emerald-500 hover:bg-emerald-600' : ''}>
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
