import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Activity, Calendar, TrendingUp } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { BarChart, Bar, PieChart, Pie, Cell, LineChart, Line, XAxis, YAxis, CartesianGrid, Legend, ResponsiveContainer } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";

import { motion } from "framer-motion";

interface Patient {
  id: string;
  patient_name: string;
  age: string;
  phone: string;
  address: string;
  father_name: string;
  category?: string;
}

interface Invoice {
  id: string;
  patient_id: string;
  patient_name: string;
  invoice_date: string;
  created_at: string;
}

export default function PatientAnalytics() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [patientsRes, invoicesRes] = await Promise.all([
        supabase.from('patients').select('*'),
        supabase.from('invoices').select('*')
      ]);

      if (patientsRes.error) throw patientsRes.error;
      if (invoicesRes.error) throw invoicesRes.error;

      setPatients(patientsRes.data || []);
      setInvoices(invoicesRes.data || []);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Age distribution
  const getAgeDistribution = () => {
    const ageGroups = {
      '0-18': 0,
      '19-35': 0,
      '36-50': 0,
      '51-65': 0,
      '65+': 0,
    };

    patients.forEach(patient => {
      const age = parseInt(patient.age);
      if (isNaN(age)) return;

      if (age <= 18) ageGroups['0-18']++;
      else if (age <= 35) ageGroups['19-35']++;
      else if (age <= 50) ageGroups['36-50']++;
      else if (age <= 65) ageGroups['51-65']++;
      else ageGroups['65+']++;
    });

    return Object.entries(ageGroups).map(([name, value]) => ({ name, value }));
  };

  // Visit trends by month
  const getVisitTrends = () => {
    const monthlyVisits = new Map<string, { visits: number; uniquePatients: Set<string> }>();

    invoices.forEach(invoice => {
      const date = new Date(invoice.invoice_date || invoice.created_at);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      
      const existing = monthlyVisits.get(monthKey) || { visits: 0, uniquePatients: new Set() };
      existing.visits++;
      existing.uniquePatients.add(invoice.patient_id);
      monthlyVisits.set(monthKey, existing);
    });

    return Array.from(monthlyVisits.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-6)
      .map(([key, data]) => {
        const [year, month] = key.split('-');
        const date = new Date(parseInt(year), parseInt(month) - 1);
        return {
          month: date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
          visits: data.visits,
          patients: data.uniquePatients.size
        };
      });
  };

  // Location distribution
  const getLocationDistribution = () => {
    const locationMap = new Map<string, number>();

    patients.forEach(patient => {
      const location = patient.address?.trim() || 'Unknown';
      locationMap.set(location, (locationMap.get(location) || 0) + 1);
    });

    return Array.from(locationMap.entries())
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([name, value]) => ({ name: name.substring(0, 20), value }));
  };

  const ageDistribution = getAgeDistribution();
  const visitTrends = getVisitTrends();
  const locationDistribution = getLocationDistribution();

  const COLORS = [
    'hsl(var(--gold))',
    'hsl(var(--cyan))',
    'hsl(280 70% 60%)',
    'hsl(var(--emerald))',
    'hsl(340 75% 55%)',
  ];

  const chartConfig = {
    visits: {
      label: "Visits",
      color: "hsl(var(--gold))",
    },
    patients: {
      label: "Unique Patients",
      color: "hsl(var(--cyan))",
    },
  };

  const getCategoryColor = (category?: string) => {
    switch (category) {
      case 'BNX': return 'text-blue-400';
      case 'TPN': return 'text-amber-400';
      case 'PSHY': return 'text-purple-400';
      case 'BNX + PSHY': return 'text-indigo-400';
      case 'TPN + PSHY': return 'text-pink-400';
      default: return 'text-muted-foreground';
    }
  };

  if (loading) {
    return (
      <div className="p-6 min-h-screen">
        <div className="text-center text-muted-foreground">Loading patient analytics...</div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 relative min-h-screen">



      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative z-10"
      >
        <h1 className="text-3xl font-bold bg-gradient-to-r from-gold via-amber-400 to-gold bg-clip-text text-transparent">Patient Analytics</h1>
        <p className="text-muted-foreground mt-2">Insights into patient demographics and visit patterns.</p>
      </motion.div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <Card className="glass-strong border border-white/10 hover:border-gold/30 transition-all duration-300 group overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-gold/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
              <CardTitle className="text-sm font-medium">Total Patients</CardTitle>
              <Users className="h-4 w-4 text-gold" />
            </CardHeader>
            <CardContent className="relative z-10">
              <div className="text-2xl font-bold bg-gradient-to-r from-gold to-amber-400 bg-clip-text text-transparent">{patients.length}</div>
              <p className="text-xs text-muted-foreground mt-1">Registered patients</p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <Card className="glass-strong border border-white/10 hover:border-cyan/30 transition-all duration-300 group overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-cyan/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
              <CardTitle className="text-sm font-medium">Total Visits</CardTitle>
              <Activity className="h-4 w-4 text-cyan-400" />
            </CardHeader>
            <CardContent className="relative z-10">
              <div className="text-2xl font-bold bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">{invoices.length}</div>
              <p className="text-xs text-muted-foreground mt-1">All time visits</p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
        >
          <Card className="glass-strong border border-white/10 hover:border-purple/30 transition-all duration-300 group overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-purple/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
              <CardTitle className="text-sm font-medium">Avg Age</CardTitle>
              <Calendar className="h-4 w-4 text-purple-400" />
            </CardHeader>
            <CardContent className="relative z-10">
              <div className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                {patients.length > 0
                  ? Math.round(
                      patients.reduce((sum, p) => {
                        const age = parseInt(p.age);
                        return sum + (isNaN(age) ? 0 : age);
                      }, 0) / patients.filter(p => !isNaN(parseInt(p.age))).length
                    )
                  : 0}
              </div>
              <p className="text-xs text-muted-foreground mt-1">Years</p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
        >
          <Card className="glass-strong border border-white/10 hover:border-emerald-500/30 transition-all duration-300 group overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
              <CardTitle className="text-sm font-medium">Visit Rate</CardTitle>
              <TrendingUp className="h-4 w-4 text-emerald-400" />
            </CardHeader>
            <CardContent className="relative z-10">
              <div className="text-2xl font-bold bg-gradient-to-r from-emerald-400 to-teal-400 bg-clip-text text-transparent">
                {patients.length > 0 ? (invoices.length / patients.length).toFixed(1) : 0}
              </div>
              <p className="text-xs text-muted-foreground mt-1">Visits per patient</p>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 relative z-10">
        {/* Age Distribution */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.5 }}
        >
          <Card className="glass-strong border border-white/10 hover:border-gold/20 transition-all duration-300">
            <CardHeader>
              <CardTitle className="bg-gradient-to-r from-gold to-amber-400 bg-clip-text text-transparent">Age Distribution</CardTitle>
              <p className="text-sm text-muted-foreground">Patients by age group</p>
            </CardHeader>
            <CardContent>
              <ChartContainer config={chartConfig} className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={ageDistribution}>
                    <defs>
                      <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="hsl(var(--gold))" stopOpacity={1} />
                        <stop offset="100%" stopColor="hsl(var(--gold))" stopOpacity={0.6} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                    <XAxis 
                      dataKey="name" 
                      stroke="hsl(var(--muted-foreground))"
                      fontSize={12}
                    />
                    <YAxis 
                      stroke="hsl(var(--muted-foreground))"
                      fontSize={12}
                    />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Bar 
                      dataKey="value" 
                      fill="url(#barGradient)" 
                      name="Patients"
                      radius={[8, 8, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </ChartContainer>
            </CardContent>
          </Card>
        </motion.div>

        {/* Location Distribution */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.6 }}
        >
          <Card className="glass-strong border border-white/10 hover:border-cyan/20 transition-all duration-300">
            <CardHeader>
              <CardTitle className="bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">Top Locations</CardTitle>
              <p className="text-sm text-muted-foreground">Patients by location (Top 5)</p>
            </CardHeader>
            <CardContent>
              <ChartContainer config={chartConfig} className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={locationDistribution}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="hsl(var(--gold))"
                      dataKey="value"
                    >
                      {locationDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <ChartTooltip content={<ChartTooltipContent />} />
                  </PieChart>
                </ResponsiveContainer>
              </ChartContainer>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Visit Trends */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.7 }}
        className="relative z-10"
      >
        <Card className="glass-strong border border-white/10 hover:border-purple/20 transition-all duration-300">
          <CardHeader>
            <CardTitle className="bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">Visit Trends</CardTitle>
            <p className="text-sm text-muted-foreground">Monthly visits and unique patients over the last 6 months</p>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="h-[350px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={visitTrends}>
                  <defs>
                    <linearGradient id="lineGold" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor="hsl(var(--gold))" />
                      <stop offset="100%" stopColor="hsl(45 93% 60%)" />
                    </linearGradient>
                    <linearGradient id="lineCyan" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor="hsl(var(--cyan))" />
                      <stop offset="100%" stopColor="hsl(200 80% 60%)" />
                    </linearGradient>
                  </defs>
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
                    dataKey="visits" 
                    stroke="url(#lineGold)" 
                    strokeWidth={3}
                    name="Total Visits"
                    dot={{ fill: 'hsl(var(--gold))', strokeWidth: 2 }}
                    activeDot={{ r: 6, fill: 'hsl(var(--gold))' }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="patients" 
                    stroke="url(#lineCyan)" 
                    strokeWidth={3}
                    name="Unique Patients"
                    dot={{ fill: 'hsl(var(--cyan))', strokeWidth: 2 }}
                    activeDot={{ r: 6, fill: 'hsl(var(--cyan))' }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>
      </motion.div>

      {/* Patient Details Table */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.8 }}
        className="relative z-10"
      >
        <Card className="glass-strong border border-white/10 hover:border-emerald-500/20 transition-all duration-300">
          <CardHeader>
            <CardTitle className="bg-gradient-to-r from-emerald-400 to-teal-400 bg-clip-text text-transparent">Recent Patients</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {patients.slice(0, 10).map((patient, index) => (
                <motion.div 
                  key={patient.id} 
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3, delay: 0.1 * index }}
                  className="flex items-center justify-between p-3 glass-strong border border-white/10 rounded-lg hover:border-gold/30 transition-all duration-300"
                >
                  <div>
                    <p className="font-medium text-foreground">{patient.patient_name}</p>
                    <p className="text-sm text-muted-foreground">{patient.phone}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-foreground">Age: {patient.age}</p>
                    <p className={`text-xs ${getCategoryColor(patient.category)}`}>
                      {patient.category || patient.address?.substring(0, 30)}
                    </p>
                  </div>
                </motion.div>
              ))}
              {patients.length === 0 && (
                <p className="text-center text-muted-foreground py-8">No patients found</p>
              )}
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
