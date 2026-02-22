import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Legend, ResponsiveContainer, AreaChart, Area } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";

interface MonthlyData {
  month: string;
  revenue: number;
  invoices: number;
}

interface CategoryData {
  name: string;
  value: number;
}

interface DashboardChartsProps {
  monthlyData: MonthlyData[];
  categoryData: CategoryData[];
}

const CATEGORY_COLORS = ['#3b82f6', '#f59e0b', '#8b5cf6', '#10b981', '#ef4444'];

const chartConfig = {
  revenue: { label: "Revenue", color: "hsl(var(--gold))" },
  invoices: { label: "Invoices", color: "hsl(var(--navy))" },
};

export default function DashboardCharts({ monthlyData, categoryData }: DashboardChartsProps) {
  return (
    <>
      {/* Revenue Area Chart in Payment Overview */}
      <Card className="border-0 shadow-md overflow-hidden relative">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/3 via-transparent to-accent/3 pointer-events-none" />
        <CardHeader className="relative">
          <CardTitle className="text-lg">Revenue Trend (Area)</CardTitle>
        </CardHeader>
        <CardContent className="relative">
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

      {/* Charts Grid */}
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
    </>
  );
}
