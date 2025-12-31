import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Users, Package, Receipt, TrendingUp, DollarSign, Clock, RefreshCw, Activity, AlertCircle, Bell, ArrowUpRight, ArrowDownRight, Plus, FileText, UserPlus, ClipboardPlus, Stethoscope, Sparkles } from "lucide-react";
import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
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
  const navigate = useNavigate();
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

  const COLORS = ['hsl(var(--lime))', 'hsl(var(--muted))', 'hsl(var(--primary))', 'hsl(var(--secondary))'];
  const CATEGORY_COLORS = ['#14b8a6', '#22d3d1', '#84cc16', '#10b981', '#0d9488'];

  const chartConfig = {
    revenue: {
      label: "Revenue",
      color: "hsl(var(--lime))",
    },
    invoices: {
      label: "Invoices",
      color: "hsl(var(--teal))",
    },
  };

  const getUpdateIcon = (type: string) => {
    switch (type) {
      case 'invoice': return <Receipt className="h-4 w-4 text-emerald" />;
      case 'stock': return <Package className="h-4 w-4 text-lime" />;
      case 'patient': return <Users className="h-4 w-4 text-teal" />;
      case 'prescription': return <Activity className="h-4 w-4 text-cyan" />;
      default: return <Bell className="h-4 w-4" />;
    }
  };

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <div className="absolute inset-0 rounded-full bg-gradient-to-r from-teal to-lime blur-xl opacity-50 animate-pulse" />
            <div className="relative animate-spin rounded-full h-12 w-12 border-2 border-transparent border-t-teal border-r-lime"></div>
          </div>
          <p className="text-muted-foreground bg-gradient-to-r from-teal to-lime bg-clip-text text-transparent font-medium">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 relative">
      <FloatingOrbs />
      
      {/* Ambient liquid blobs */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden -z-10">
        <div className="absolute top-1/4 -left-20 w-96 h-96 bg-gradient-to-br from-teal/15 via-teal/5 to-transparent rounded-full blur-3xl animate-liquid-float" />
        <div className="absolute top-1/3 -right-20 w-80 h-80 bg-gradient-to-br from-cyan/15 via-cyan/5 to-transparent rounded-full blur-3xl animate-liquid-float" style={{ animationDelay: '-5s' }} />
        <div className="absolute -bottom-20 left-1/3 w-72 h-72 bg-gradient-to-br from-lime/10 via-lime/5 to-transparent rounded-full blur-3xl animate-liquid-float" style={{ animationDelay: '-10s' }} />
      </div>
      
      {/* Header with Real-time indicator */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="flex flex-col md:flex-row md:items-center justify-between gap-4"
      >
        <div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-teal via-cyan to-lime bg-clip-text text-transparent drop-shadow-sm flex items-center gap-3">
            Dashboard
            <Sparkles className="h-6 w-6 text-lime animate-pulse" />
          </h1>
          <p className="text-muted-foreground mt-1">Real-time business insights and analytics</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-sm text-muted-foreground glass px-4 py-2 rounded-full">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald shadow-lg shadow-emerald/50"></span>
            </span>
            Live updates
          </div>
          <div className="text-sm text-muted-foreground glass px-4 py-2 rounded-full">
            <Clock className="h-3.5 w-3.5 inline-block mr-1.5 opacity-60" />
            {lastUpdated.toLocaleTimeString()}
          </div>
          <Button
            onClick={handleManualRefresh}
            disabled={isRefreshing}
            className="group rounded-full bg-gradient-to-r from-teal to-lime text-white shadow-liquid hover:shadow-glow hover:scale-105 transition-all duration-300 border-0"
          >
            <RefreshCw className={`h-4 w-4 mr-2 transition-transform duration-500 ${isRefreshing ? 'animate-spin' : 'group-hover:rotate-180'}`} />
            Refresh
          </Button>
        </div>
      </motion.div>

      {/* Quick Actions Panel */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
      >
        <Card variant="liquid-teal" className="overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-teal/5 via-cyan/5 to-lime/5" />
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-teal/40 to-transparent" />
          <CardHeader className="pb-3 relative">
            <CardTitle className="text-lg flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-gradient-to-br from-teal to-lime shadow-liquid">
                <Plus className="h-5 w-5 text-white" />
              </div>
              <span className="bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text">Quick Actions</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="relative">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <button
                className="group relative h-auto py-6 flex flex-col items-center gap-4 rounded-2xl glass-strong hover:shadow-glow transition-all duration-500 overflow-hidden"
                onClick={() => navigate('/invoices/new')}
              >
                <div className="absolute inset-0 bg-gradient-to-br from-emerald/10 to-teal/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700">
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
                </div>
                <div className="relative p-4 rounded-2xl bg-gradient-to-br from-emerald to-teal shadow-liquid group-hover:scale-110 group-hover:shadow-glow transition-all duration-500">
                  <FileText className="h-6 w-6 text-white" />
                </div>
                <span className="relative font-semibold text-sm group-hover:text-emerald transition-colors">New Invoice</span>
              </button>

              <button
                className="group relative h-auto py-6 flex flex-col items-center gap-4 rounded-2xl glass-strong hover:shadow-glow transition-all duration-500 overflow-hidden"
                onClick={() => navigate('/patients/new')}
              >
                <div className="absolute inset-0 bg-gradient-to-br from-cyan/10 to-teal/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700">
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
                </div>
                <div className="relative p-4 rounded-2xl bg-gradient-to-br from-cyan to-teal shadow-liquid group-hover:scale-110 group-hover:shadow-glow transition-all duration-500">
                  <UserPlus className="h-6 w-6 text-white" />
                </div>
                <span className="relative font-semibold text-sm group-hover:text-cyan transition-colors">New Patient</span>
              </button>

              <button
                className="group relative h-auto py-6 flex flex-col items-center gap-4 rounded-2xl glass-strong hover:shadow-glow transition-all duration-500 overflow-hidden"
                onClick={() => navigate('/prescriptions/new')}
              >
                <div className="absolute inset-0 bg-gradient-to-br from-lime/10 to-emerald/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700">
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
                </div>
                <div className="relative p-4 rounded-2xl bg-gradient-to-br from-lime to-emerald shadow-liquid group-hover:scale-110 group-hover:shadow-glow transition-all duration-500">
                  <Stethoscope className="h-6 w-6 text-white" />
                </div>
                <span className="relative font-semibold text-sm group-hover:text-lime transition-colors">New Prescription</span>
              </button>

              <button
                className="group relative h-auto py-6 flex flex-col items-center gap-4 rounded-2xl glass-strong hover:shadow-glow transition-all duration-500 overflow-hidden"
                onClick={() => navigate('/stock')}
              >
                <div className="absolute inset-0 bg-gradient-to-br from-teal/10 to-cyan/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700">
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
                </div>
                <div className="relative p-4 rounded-2xl bg-gradient-to-br from-teal to-cyan shadow-liquid group-hover:scale-110 group-hover:shadow-glow transition-all duration-500">
                  <Package className="h-6 w-6 text-white" />
                </div>
                <span className="relative font-semibold text-sm group-hover:text-teal transition-colors">Manage Stock</span>
              </button>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Quick Stats - Today */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-5">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.15 }}
        >
          <Card variant="liquid-emerald" className="group p-5 overflow-hidden">
            <div className="absolute -top-10 -right-10 w-32 h-32 bg-gradient-to-br from-emerald/30 to-transparent rounded-full blur-2xl opacity-60 group-hover:opacity-100 transition-opacity" />
            <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-emerald/50 to-transparent" />
            
            <div className="flex items-center justify-between mb-3 relative">
              <span className="text-sm font-medium text-foreground/80">Today's Revenue</span>
              <div className="p-2.5 rounded-xl bg-gradient-to-br from-emerald to-teal shadow-liquid group-hover:scale-110 group-hover:shadow-glow transition-all duration-500">
                <ArrowUpRight className="h-4 w-4 text-white" />
              </div>
            </div>
            <div className="relative">
              <div className="text-3xl font-bold bg-gradient-to-r from-emerald to-teal bg-clip-text text-transparent">
                Rs.{todayRevenue.toLocaleString()}
              </div>
              <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                <TrendingUp className="h-3 w-3 text-emerald" />
                {todayInvoices.length} invoices today
              </p>
            </div>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.2 }}
        >
          <Card variant="liquid-lime" className="group p-5 overflow-hidden">
            <div className="absolute -top-10 -right-10 w-32 h-32 bg-gradient-to-br from-lime/30 to-transparent rounded-full blur-2xl opacity-60 group-hover:opacity-100 transition-opacity" />
            <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-lime/50 to-transparent" />
            
            <div className="flex items-center justify-between mb-3 relative">
              <span className="text-sm font-medium text-foreground/80">Total Revenue</span>
              <div className="p-2.5 rounded-xl bg-gradient-to-br from-lime to-emerald shadow-liquid group-hover:scale-110 group-hover:shadow-glow transition-all duration-500">
                <DollarSign className="h-4 w-4 text-white" />
              </div>
            </div>
            <div className="relative">
              <div className="text-3xl font-bold bg-gradient-to-r from-lime to-emerald bg-clip-text text-transparent">
                Rs.{totalRevenue.toLocaleString()}
              </div>
              <p className="text-xs text-muted-foreground mt-2">All time earnings</p>
            </div>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.25 }}
        >
          <Card variant="liquid-cyan" className="group p-5 overflow-hidden">
            <div className="absolute -top-10 -right-10 w-32 h-32 bg-gradient-to-br from-cyan/30 to-transparent rounded-full blur-2xl opacity-60 group-hover:opacity-100 transition-opacity" />
            <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-cyan/50 to-transparent" />
            
            <div className="flex items-center justify-between mb-3 relative">
              <span className="text-sm font-medium text-foreground/80">Total Patients</span>
              <div className="p-2.5 rounded-xl bg-gradient-to-br from-cyan to-teal shadow-liquid group-hover:scale-110 group-hover:shadow-glow transition-all duration-500">
                <Users className="h-4 w-4 text-white" />
              </div>
            </div>
            <div className="relative">
              <div className="text-3xl font-bold bg-gradient-to-r from-cyan to-teal bg-clip-text text-transparent">
                {patients.length}
              </div>
              <p className="text-xs text-muted-foreground mt-2">Registered patients</p>
            </div>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.3 }}
        >
          <Card variant="liquid-teal" className="group p-5 overflow-hidden">
            <div className="absolute -top-10 -right-10 w-32 h-32 bg-gradient-to-br from-teal/30 to-transparent rounded-full blur-2xl opacity-60 group-hover:opacity-100 transition-opacity" />
            <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-teal/50 to-transparent" />
            
            <div className="flex items-center justify-between mb-3 relative">
              <span className="text-sm font-medium text-foreground/80">Stock Items</span>
              <div className="p-2.5 rounded-xl bg-gradient-to-br from-teal to-cyan shadow-liquid group-hover:scale-110 group-hover:shadow-glow transition-all duration-500">
                <Package className="h-4 w-4 text-white" />
              </div>
            </div>
            <div className="relative">
              <div className="text-3xl font-bold bg-gradient-to-r from-teal to-cyan bg-clip-text text-transparent">
                {stockItems.length}
              </div>
              <p className="text-xs text-muted-foreground mt-2">In inventory</p>
            </div>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.35 }}
        >
          <Card variant={lowStockItems.length > 0 ? "glass" : "liquid-emerald"} className="group p-5 overflow-hidden">
            <div className={`absolute -top-10 -right-10 w-32 h-32 bg-gradient-to-br ${lowStockItems.length > 0 ? 'from-pink/30' : 'from-emerald/30'} to-transparent rounded-full blur-2xl opacity-60 group-hover:opacity-100 transition-opacity`} />
            <div className={`absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent ${lowStockItems.length > 0 ? 'via-pink/50' : 'via-emerald/50'} to-transparent`} />
            
            <div className="flex items-center justify-between mb-3 relative">
              <span className="text-sm font-medium text-foreground/80">Low Stock Alerts</span>
              <div className={`p-2.5 rounded-xl shadow-liquid group-hover:scale-110 transition-all duration-500 ${lowStockItems.length > 0 ? 'bg-gradient-to-br from-pink to-destructive' : 'bg-gradient-to-br from-emerald to-teal'}`}>
                <AlertCircle className="h-4 w-4 text-white" />
              </div>
            </div>
            <div className="relative">
              <div className={`text-3xl font-bold bg-clip-text text-transparent ${lowStockItems.length > 0 ? 'bg-gradient-to-r from-pink to-destructive' : 'bg-gradient-to-r from-emerald to-teal'}`}>
                {lowStockItems.length}
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                {lowStockItems.length > 0 ? 'Items need reorder' : 'All stocked up'}
              </p>
            </div>
          </Card>
        </motion.div>
      </div>

      {/* Real-time Activity Feed & Payment Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Live Activity Feed */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="lg:col-span-1"
        >
          <Card variant="liquid-teal" className="h-full overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-b from-teal/5 via-transparent to-lime/5" />
            <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-teal/40 to-transparent" />
            
            <CardHeader className="pb-3 relative">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-gradient-to-br from-teal to-lime shadow-liquid">
                    <Activity className="h-4 w-4 text-white" />
                  </div>
                  <span>Live Activity</span>
                </CardTitle>
                <Badge className="px-3 py-1 text-xs bg-gradient-to-r from-teal to-lime text-white border-0 shadow-liquid">
                  {realtimeUpdates.length} updates
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="max-h-[300px] overflow-y-auto custom-scrollbar">
              <AnimatePresence>
                {realtimeUpdates.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <div className="p-4 rounded-full glass w-fit mx-auto mb-3">
                      <Activity className="h-8 w-8 opacity-50" />
                    </div>
                    <p className="text-sm">Waiting for activity...</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {realtimeUpdates.map((update, index) => (
                      <motion.div
                        key={update.id}
                        initial={{ opacity: 0, x: -20, scale: 0.95 }}
                        animate={{ opacity: 1, x: 0, scale: 1 }}
                        exit={{ opacity: 0, x: 20, scale: 0.95 }}
                        transition={{ duration: 0.25 }}
                        className={`flex items-start gap-3 p-3 rounded-xl transition-all duration-300 ${
                          index === 0 
                            ? 'glass-strong border border-teal/20' 
                            : 'glass hover:glass-strong'
                        }`}
                      >
                        <div className={`p-2 rounded-lg ${index === 0 ? 'bg-gradient-to-br from-teal/20 to-lime/10' : 'glass'}`}>
                          {getUpdateIcon(update.type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{update.message}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">
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
        </motion.div>

        {/* Payment Summary */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.35 }}
          className="lg:col-span-2"
        >
          <Card variant="liquid-lime" className="overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-lime/5 via-transparent to-cyan/5" />
            <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-lime/40 to-transparent" />
            
            <CardHeader className="relative">
              <CardTitle className="text-xl bg-gradient-to-r from-lime to-emerald bg-clip-text text-transparent">Payment Overview</CardTitle>
              <p className="text-sm text-muted-foreground">Revenue breakdown and pending amounts</p>
            </CardHeader>
            <CardContent className="relative">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <Card variant="liquid-emerald" className="p-4 group">
                  <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-emerald/30 to-transparent" />
                  <div className="relative">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="p-2 rounded-xl bg-gradient-to-br from-emerald to-teal shadow-liquid group-hover:scale-110 transition-transform duration-300">
                        <TrendingUp className="h-4 w-4 text-white" />
                      </div>
                      <span className="font-semibold text-emerald">Paid</span>
                    </div>
                    <p className="text-2xl font-bold bg-gradient-to-r from-emerald to-teal bg-clip-text text-transparent">Rs.{paidAmount.toLocaleString()}</p>
                    <p className="text-sm text-muted-foreground mt-1">{paidInvoices.length} invoices</p>
                  </div>
                </Card>
                <Card variant="liquid-lime" className="p-4 group">
                  <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-lime/30 to-transparent" />
                  <div className="relative">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="p-2 rounded-xl bg-gradient-to-br from-lime to-orange shadow-liquid group-hover:scale-110 transition-transform duration-300">
                        <Clock className="h-4 w-4 text-white" />
                      </div>
                      <span className="font-semibold text-lime">Pending</span>
                    </div>
                    <p className="text-2xl font-bold bg-gradient-to-r from-lime to-orange bg-clip-text text-transparent">Rs.{pendingAmount.toLocaleString()}</p>
                    <p className="text-sm text-muted-foreground mt-1">{pendingInvoices.length} invoices</p>
                  </div>
                </Card>
                <Card variant="liquid-cyan" className="p-4 group">
                  <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-cyan/30 to-transparent" />
                  <div className="relative">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="p-2 rounded-xl bg-gradient-to-br from-cyan to-teal shadow-liquid group-hover:scale-110 transition-transform duration-300">
                        <Receipt className="h-4 w-4 text-white" />
                      </div>
                      <span className="font-semibold text-cyan">Total</span>
                    </div>
                    <p className="text-2xl font-bold bg-gradient-to-r from-cyan to-teal bg-clip-text text-transparent">Rs.{totalRevenue.toLocaleString()}</p>
                    <p className="text-sm text-muted-foreground mt-1">{invoices.length} invoices</p>
                  </div>
                </Card>
              </div>
              <div className="rounded-xl glass p-4">
                <ChartContainer config={chartConfig} className="h-[200px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={monthlyData}>
                      <defs>
                        <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="hsl(var(--lime))" stopOpacity={0.4}/>
                          <stop offset="95%" stopColor="hsl(var(--lime))" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                      <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                      <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Area 
                        type="monotone" 
                        dataKey="revenue" 
                        stroke="hsl(var(--lime))" 
                        fillOpacity={1} 
                        fill="url(#colorRevenue)"
                        strokeWidth={3}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </ChartContainer>
              </div>
            </CardContent>
          </Card>
        </motion.div>
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
          <Card variant="glass" className="border-pink/20 overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-pink/10 via-transparent to-destructive/5" />
            <CardHeader className="pb-3 relative">
              <CardTitle className="text-lg flex items-center gap-2 text-pink">
                <AlertCircle className="h-5 w-5" />
                Low Stock Alerts ({lowStockItems.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="relative">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {lowStockItems.slice(0, 6).map((item) => (
                  <div 
                    key={item.item_id} 
                    className="flex items-center justify-between p-3 rounded-xl glass border border-pink/20 hover:border-pink/40 transition-colors"
                  >
                    <div>
                      <p className="font-medium text-sm">{item.name}</p>
                      <p className="text-xs text-muted-foreground">{item.category}</p>
                    </div>
                    <Badge className="bg-gradient-to-r from-pink to-destructive text-white border-0">{item.current_stock} left</Badge>
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
        <Card variant="liquid-lime" className="overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-lime/5 to-emerald/5" />
          <CardHeader className="relative">
            <CardTitle className="bg-gradient-to-r from-lime to-emerald bg-clip-text text-transparent">Revenue Trend</CardTitle>
            <p className="text-sm text-muted-foreground">Monthly revenue over the last 6 months</p>
          </CardHeader>
          <CardContent className="relative">
            <ChartContainer config={chartConfig} className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
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
                    stroke="hsl(var(--lime))" 
                    strokeWidth={3}
                    name="Revenue (Rs.)"
                    dot={{ fill: 'hsl(var(--lime))', strokeWidth: 2, r: 4 }}
                    activeDot={{ r: 8, fill: 'hsl(var(--lime))', stroke: 'white', strokeWidth: 2 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* Stock Category Breakdown */}
        <Card variant="liquid-teal" className="overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-teal/5 to-cyan/5" />
          <CardHeader className="relative">
            <CardTitle className="bg-gradient-to-r from-teal to-cyan bg-clip-text text-transparent">Stock by Category</CardTitle>
            <p className="text-sm text-muted-foreground">Distribution of inventory items</p>
          </CardHeader>
          <CardContent className="relative">
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
      <Card variant="liquid-cyan" className="overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-cyan/5 via-transparent to-teal/5" />
        <CardHeader className="relative">
          <CardTitle className="bg-gradient-to-r from-cyan to-teal bg-clip-text text-transparent">Monthly Comparison</CardTitle>
          <p className="text-sm text-muted-foreground">Invoice count and revenue comparison</p>
        </CardHeader>
        <CardContent className="relative">
          <ChartContainer config={chartConfig} className="h-[350px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
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
                  fill="hsl(var(--lime))" 
                  name="Revenue (Rs.)"
                  radius={[8, 8, 0, 0]}
                />
                <Bar 
                  yAxisId="right"
                  dataKey="invoices" 
                  fill="hsl(var(--teal))" 
                  name="Invoice Count"
                  radius={[8, 8, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </ChartContainer>
        </CardContent>
      </Card>

      {/* Recent Invoices Table */}
      <Card variant="liquid-emerald" className="overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-emerald/5 to-teal/5" />
        <CardHeader className="relative">
          <div className="flex items-center justify-between">
            <CardTitle className="bg-gradient-to-r from-emerald to-teal bg-clip-text text-transparent">Recent Invoices</CardTitle>
            <Badge className="bg-gradient-to-r from-emerald to-teal text-white border-0 shadow-liquid">{invoices.length} total</Badge>
          </div>
        </CardHeader>
        <CardContent className="relative">
          <div className="space-y-4">
            <AnimatePresence>
              {invoices.slice(0, 5).map((invoice, index) => (
                <motion.div 
                  key={invoice.id} 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="flex items-center justify-between p-3 rounded-xl glass hover:glass-strong transition-all duration-300 border-b border-border/50 last:border-b-0"
                >
                  <div>
                    <p className="font-medium text-foreground">{invoice.invoice_number}</p>
                    <p className="text-sm text-muted-foreground">{invoice.patient_name}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium bg-gradient-to-r from-teal to-emerald bg-clip-text text-transparent">Rs.{Number(invoice.total).toLocaleString()}</p>
                    <Badge className={
                      invoice.status === 'Paid' 
                        ? 'bg-gradient-to-r from-emerald to-teal text-white border-0' 
                        : 'bg-gradient-to-r from-lime/20 to-orange/20 text-lime border-0'
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
