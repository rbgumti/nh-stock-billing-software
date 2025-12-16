import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Activity, Calendar, TrendingUp } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { BarChart, Bar, PieChart, Pie, Cell, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";

interface Patient {
  id: number;
  patient_name: string;
  age: string;
  phone: string;
  address: string;
  father_name: string;
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
    'hsl(var(--primary))',
    'hsl(var(--accent))',
    'hsl(var(--muted))',
    'hsl(var(--secondary))',
    'hsl(var(--destructive))',
  ];

  const chartConfig = {
    visits: {
      label: "Visits",
      color: "hsl(var(--primary))",
    },
    patients: {
      label: "Unique Patients",
      color: "hsl(var(--accent))",
    },
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="text-center text-muted-foreground">Loading patient analytics...</div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Patient Analytics</h1>
        <p className="text-muted-foreground mt-2">Insights into patient demographics and visit patterns.</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Patients</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{patients.length}</div>
            <p className="text-xs text-muted-foreground mt-1">Registered patients</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Visits</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{invoices.length}</div>
            <p className="text-xs text-muted-foreground mt-1">All time visits</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Age</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
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

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Visit Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {patients.length > 0 ? (invoices.length / patients.length).toFixed(1) : 0}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Visits per patient</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Age Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Age Distribution</CardTitle>
            <p className="text-sm text-muted-foreground">Patients by age group</p>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={ageDistribution}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
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
                    fill="hsl(var(--primary))" 
                    name="Patients"
                    radius={[8, 8, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* Location Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Top Locations</CardTitle>
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
                    fill="hsl(var(--primary))"
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
      </div>

      {/* Visit Trends */}
      <Card>
        <CardHeader>
          <CardTitle>Visit Trends</CardTitle>
          <p className="text-sm text-muted-foreground">Monthly visits and unique patients over the last 6 months</p>
        </CardHeader>
        <CardContent>
          <ChartContainer config={chartConfig} className="h-[350px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={visitTrends}>
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
                  dataKey="visits" 
                  stroke="hsl(var(--primary))" 
                  strokeWidth={2}
                  name="Total Visits"
                />
                <Line 
                  type="monotone" 
                  dataKey="patients" 
                  stroke="hsl(var(--accent))" 
                  strokeWidth={2}
                  name="Unique Patients"
                />
              </LineChart>
            </ResponsiveContainer>
          </ChartContainer>
        </CardContent>
      </Card>

      {/* Patient Details Table */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Patients</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {patients.slice(0, 10).map((patient) => (
              <div key={patient.id} className="flex items-center justify-between border-b border-border pb-3 last:border-b-0">
                <div>
                  <p className="font-medium text-foreground">{patient.patient_name}</p>
                  <p className="text-sm text-muted-foreground">{patient.phone}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-foreground">Age: {patient.age}</p>
                  <p className="text-xs text-muted-foreground">{patient.address?.substring(0, 30)}</p>
                </div>
              </div>
            ))}
            {patients.length === 0 && (
              <p className="text-center text-muted-foreground py-8">No patients found</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
