import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, Package, Receipt, TrendingUp, DollarSign, Clock, RefreshCw, Activity, AlertCircle, Bell, ArrowUpRight, ArrowDownRight } from "lucide-react";
import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, AreaChart, Area } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { FloatingOrbs } from "@/components/ui/floating-orbs";
import { PaymentReminders } from "@/components/PaymentReminders";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

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

interface Patient {
  id: number;
  patient_name: string;
  created_at?: string;
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
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [stockItems, setStockItems] = useState<StockItem[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
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
      const [invoiceRes, stockRes, patientRes] = await Promise.all([
        supabase.from('invoices').select('*').order('created_at', { ascending: false }),
        supabase.from('stock_items').select('*').order('name'),
        supabase.from('patients').select('*').order('id', { ascending: false }).limit(100)
      ]);

      if (invoiceRes.data) setInvoices(invoiceRes.data);
      if (stockRes.data) setStockItems(stockRes.data);
      if (patientRes.data) setPatients(patientRes.data);
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

    // Set up real-time subscriptions
    const invoiceChannel = supabase
      .channel('dashboard-invoices')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'invoices' }, (payload) => {
        console.log('Invoice change:', payload);
        if (payload.eventType === 'INSERT') {
          const newInvoice = payload.new as Invoice;
          setInvoices(prev => [newInvoice, ...prev]);
          addRealtimeUpdate({
            type: 'invoice',
            message: `New invoice ${newInvoice.invoice_number} for ${newInvoice.patient_name}`
          });
          toast.success(`New Invoice: ${newInvoice.invoice_number}`, {
            description: `Rs.${Number(newInvoice.total).toLocaleString()} - ${newInvoice.patient_name}`
          });
        } else if (payload.eventType === 'UPDATE') {
          const updatedInvoice = payload.new as Invoice;
          setInvoices(prev => prev.map(inv => inv.id === updatedInvoice.id ? updatedInvoice : inv));
          addRealtimeUpdate({
            type: 'invoice',
            message: `Invoice ${updatedInvoice.invoice_number} updated`
          });
        } else if (payload.eventType === 'DELETE') {
          const deletedInvoice = payload.old as Invoice;
          setInvoices(prev => prev.filter(inv => inv.id !== deletedInvoice.id));
        }
      })
      .subscribe();

    const stockChannel = supabase
      .channel('dashboard-stock')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'stock_items' }, (payload) => {
        console.log('Stock change:', payload);
        if (payload.eventType === 'INSERT') {
          const newItem = payload.new as StockItem;
          setStockItems(prev => [...prev, newItem]);
          addRealtimeUpdate({
            type: 'stock',
            message: `New stock item added: ${newItem.name}`
          });
        } else if (payload.eventType === 'UPDATE') {
          const updatedItem = payload.new as StockItem;
          setStockItems(prev => prev.map(item => item.item_id === updatedItem.item_id ? updatedItem : item));
          if (updatedItem.current_stock <= updatedItem.minimum_stock) {
            addRealtimeUpdate({
              type: 'stock',
              message: `Low stock alert: ${updatedItem.name} (${updatedItem.current_stock} remaining)`
            });
            toast.warning(`Low Stock: ${updatedItem.name}`, {
              description: `Only ${updatedItem.current_stock} units remaining`
            });
          }
        }
      })
      .subscribe();

    const patientChannel = supabase
      .channel('dashboard-patients')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'patients' }, (payload) => {
        console.log('Patient change:', payload);
        const newPatient = payload.new as Patient;
        setPatients(prev => [newPatient, ...prev].slice(0, 100));
        addRealtimeUpdate({
          type: 'patient',
          message: `New patient registered: ${newPatient.patient_name}`
        });
        toast.success(`New Patient: ${newPatient.patient_name}`);
      })
      .subscribe();

    const prescriptionChannel = supabase
      .channel('dashboard-prescriptions')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'prescriptions' }, (payload) => {
        console.log('Prescription change:', payload);
        const newPrescription = payload.new as any;
        addRealtimeUpdate({
          type: 'prescription',
          message: `New prescription for ${newPrescription.patient_name}`
        });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(invoiceChannel);
      supabase.removeChannel(stockChannel);
      supabase.removeChannel(patientChannel);
      supabase.removeChannel(prescriptionChannel);
    };
  }, [loadAllData, addRealtimeUpdate]);

  // Calculate statistics
  const totalRevenue = invoices.reduce((sum, inv) => sum + Number(inv.total), 0);
  const paidInvoices = invoices.filter(inv => inv.status === 'Paid');
  const pendingInvoices = invoices.filter(inv => inv.status === 'Pending');
  const paidAmount = paidInvoices.reduce((sum, inv) => sum + Number(inv.total), 0);
  const pendingAmount = pendingInvoices.reduce((sum, inv) => sum + Number(inv.total), 0);

  // Today's stats
  const today = new Date().toISOString().split('T')[0];
  const todayInvoices = invoices.filter(inv => inv.invoice_date?.startsWith(today) || inv.created_at?.startsWith(today));
  const todayRevenue = todayInvoices.reduce((sum, inv) => sum + Number(inv.total), 0);

  // Low stock items
  const lowStockItems = stockItems.filter(item => item.current_stock <= item.minimum_stock);

  // Payment status breakdown
  const paymentStatusData = [
    { name: 'Paid', value: paidInvoices.length, amount: paidAmount },
    { name: 'Pending', value: pendingInvoices.length, amount: pendingAmount },
  ];

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
    revenue: {
      label: "Revenue",
      color: "hsl(var(--gold))",
    },
    invoices: {
      label: "Invoices",
      color: "hsl(var(--navy))",
    },
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
      <FloatingOrbs />
      
      {/* Header with Real-time indicator */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-navy">Dashboard</h1>
          <p className="text-muted-foreground mt-1">Real-time business insights and analytics</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
            </span>
            Live updates
          </div>
          <div className="text-sm text-muted-foreground">
            Last updated: {lastUpdated.toLocaleTimeString()}
          </div>
          <button
            onClick={handleManualRefresh}
            disabled={isRefreshing}
            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-primary/10 hover:bg-primary/20 transition-colors text-primary text-sm font-medium disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Quick Stats - Today */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <Card className="border-l-4 border-l-green-500 hover:shadow-lg transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Today's Revenue</CardTitle>
              <ArrowUpRight className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-navy">Rs.{todayRevenue.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground mt-1">{todayInvoices.length} invoices today</p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
        >
          <Card className="border-l-4 border-l-gold hover:shadow-lg transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
              <DollarSign className="h-4 w-4 text-gold" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-navy">Rs.{totalRevenue.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground mt-1">All time</p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.2 }}
        >
          <Card className="border-l-4 border-l-blue-500 hover:shadow-lg transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Patients</CardTitle>
              <Users className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-navy">{patients.length}</div>
              <p className="text-xs text-muted-foreground mt-1">Registered</p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.3 }}
        >
          <Card className="border-l-4 border-l-purple-500 hover:shadow-lg transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Stock Items</CardTitle>
              <Package className="h-4 w-4 text-purple-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-navy">{stockItems.length}</div>
              <p className="text-xs text-muted-foreground mt-1">In inventory</p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.4 }}
        >
          <Card className={`border-l-4 hover:shadow-lg transition-shadow ${lowStockItems.length > 0 ? 'border-l-red-500 bg-red-50/50 dark:bg-red-900/10' : 'border-l-green-500'}`}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Low Stock Alerts</CardTitle>
              <AlertCircle className={`h-4 w-4 ${lowStockItems.length > 0 ? 'text-red-500' : 'text-green-500'}`} />
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${lowStockItems.length > 0 ? 'text-red-600' : 'text-green-600'}`}>
                {lowStockItems.length}
              </div>
              <p className="text-xs text-muted-foreground mt-1">Items need reorder</p>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Real-time Activity Feed & Payment Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Live Activity Feed */}
        <Card className="lg:col-span-1">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <Activity className="h-5 w-5 text-primary" />
                Live Activity
              </CardTitle>
              <Badge variant="outline" className="text-xs">
                {realtimeUpdates.length} updates
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="max-h-[300px] overflow-y-auto">
            <AnimatePresence>
              {realtimeUpdates.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Activity className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">Waiting for activity...</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {realtimeUpdates.map((update, index) => (
                    <motion.div
                      key={update.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20 }}
                      transition={{ duration: 0.2 }}
                      className={`flex items-start gap-3 p-3 rounded-lg ${index === 0 ? 'bg-primary/5 border border-primary/20' : 'bg-muted/50'}`}
                    >
                      {getUpdateIcon(update.type)}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{update.message}</p>
                        <p className="text-xs text-muted-foreground">
                          {update.timestamp.toLocaleTimeString()}
                        </p>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </AnimatePresence>
          </CardContent>
        </Card>

        {/* Payment Summary */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Payment Overview</CardTitle>
            <p className="text-sm text-muted-foreground">Revenue breakdown and pending amounts</p>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="p-4 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp className="h-5 w-5 text-green-600" />
                  <span className="font-medium text-green-700 dark:text-green-400">Paid</span>
                </div>
                <p className="text-2xl font-bold text-green-600">Rs.{paidAmount.toLocaleString()}</p>
                <p className="text-sm text-green-600/70">{paidInvoices.length} invoices</p>
              </div>
              <div className="p-4 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
                <div className="flex items-center gap-2 mb-2">
                  <Clock className="h-5 w-5 text-amber-600" />
                  <span className="font-medium text-amber-700 dark:text-amber-400">Pending</span>
                </div>
                <p className="text-2xl font-bold text-amber-600">Rs.{pendingAmount.toLocaleString()}</p>
                <p className="text-sm text-amber-600/70">{pendingInvoices.length} invoices</p>
              </div>
              <div className="p-4 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
                <div className="flex items-center gap-2 mb-2">
                  <Receipt className="h-5 w-5 text-blue-600" />
                  <span className="font-medium text-blue-700 dark:text-blue-400">Total</span>
                </div>
                <p className="text-2xl font-bold text-blue-600">Rs.{totalRevenue.toLocaleString()}</p>
                <p className="text-sm text-blue-600/70">{invoices.length} invoices</p>
              </div>
            </div>
            <ChartContainer config={chartConfig} className="h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={monthlyData}>
                  <defs>
                    <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--gold))" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="hsl(var(--gold))" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Area 
                    type="monotone" 
                    dataKey="revenue" 
                    stroke="hsl(var(--gold))" 
                    fillOpacity={1} 
                    fill="url(#colorRevenue)"
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>

      {/* Payment Reminders Widget */}
      <PaymentReminders />

      {/* Low Stock Alerts */}
      {lowStockItems.length > 0 && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3 }}
        >
          <Card className="border-red-200 dark:border-red-800 bg-red-50/50 dark:bg-red-900/10">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2 text-red-700 dark:text-red-400">
                <AlertCircle className="h-5 w-5" />
                Low Stock Alerts ({lowStockItems.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {lowStockItems.slice(0, 6).map((item) => (
                  <div 
                    key={item.item_id} 
                    className="flex items-center justify-between p-3 rounded-lg bg-white dark:bg-background border border-red-200 dark:border-red-800"
                  >
                    <div>
                      <p className="font-medium text-sm">{item.name}</p>
                      <p className="text-xs text-muted-foreground">{item.category}</p>
                    </div>
                    <Badge variant="destructive">{item.current_stock} left</Badge>
                  </div>
                ))}
              </div>
              {lowStockItems.length > 6 && (
                <p className="text-sm text-muted-foreground mt-3 text-center">
                  And {lowStockItems.length - 6} more items...
                </p>
              )}
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue Trend Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Revenue Trend</CardTitle>
            <p className="text-sm text-muted-foreground">Monthly revenue over the last 6 months</p>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis 
                    dataKey="month" 
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={12}
                  />
                  <YAxis 
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={12}
                  />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Legend />
                  <Line 
                    type="monotone" 
                    dataKey="revenue" 
                    stroke="hsl(var(--gold))" 
                    strokeWidth={2}
                    name="Revenue (Rs.)"
                    dot={{ fill: 'hsl(var(--gold))', strokeWidth: 2 }}
                    activeDot={{ r: 8 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* Stock Category Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle>Stock by Category</CardTitle>
            <p className="text-sm text-muted-foreground">Distribution of inventory items</p>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={categoryData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, value, percent }) => `${name}: ${value} (${(percent * 100).toFixed(0)}%)`}
                    outerRadius={80}
                    dataKey="value"
                  >
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
      <Card>
        <CardHeader>
          <CardTitle>Monthly Comparison</CardTitle>
          <p className="text-sm text-muted-foreground">Invoice count and revenue comparison</p>
        </CardHeader>
        <CardContent>
          <ChartContainer config={chartConfig} className="h-[350px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis 
                  dataKey="month" 
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={12}
                />
                <YAxis 
                  yAxisId="left"
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={12}
                />
                <YAxis 
                  yAxisId="right"
                  orientation="right"
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={12}
                />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Legend />
                <Bar 
                  yAxisId="left"
                  dataKey="revenue" 
                  fill="hsl(var(--gold))" 
                  name="Revenue (Rs.)"
                  radius={[8, 8, 0, 0]}
                />
                <Bar 
                  yAxisId="right"
                  dataKey="invoices" 
                  fill="hsl(var(--navy))" 
                  name="Invoice Count"
                  radius={[8, 8, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </ChartContainer>
        </CardContent>
      </Card>

      {/* Recent Invoices Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Recent Invoices</CardTitle>
            <Badge variant="outline">{invoices.length} total</Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <AnimatePresence>
              {invoices.slice(0, 5).map((invoice, index) => (
                <motion.div 
                  key={invoice.id} 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="flex items-center justify-between border-b border-border pb-3 last:border-b-0 hover:bg-muted/50 p-2 rounded-lg transition-colors"
                >
                  <div>
                    <p className="font-medium text-foreground">{invoice.invoice_number}</p>
                    <p className="text-sm text-muted-foreground">{invoice.patient_name}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium text-navy">Rs.{Number(invoice.total).toLocaleString()}</p>
                    <Badge variant={invoice.status === 'Paid' ? 'default' : 'secondary'} className={
                      invoice.status === 'Paid' 
                        ? 'bg-green-500 hover:bg-green-600' 
                        : ''
                    }>
                      {invoice.status}
                    </Badge>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
            {invoices.length === 0 && (
              <p className="text-center text-muted-foreground py-8">No invoices found</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
