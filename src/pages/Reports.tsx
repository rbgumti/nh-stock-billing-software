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
  DollarSign
} from "lucide-react";
import { useStockStore } from "@/hooks/useStockStore";

export default function Reports() {
  const { stockItems } = useStockStore();
  const [patients, setPatients] = useState<any[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [dateRange, setDateRange] = useState({ from: "", to: "" });

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
  }, []);

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

  const exportReport = (reportType: string) => {
    // Simple CSV export functionality
    let csvContent = "";
    let filename = "";

    switch (reportType) {
      case 'patients':
        csvContent = "Patient ID,Name,Gender,Age,Phone,Email\n";
        patients.forEach(patient => {
          const age = patient.personalInfo?.dateOfBirth 
            ? new Date().getFullYear() - new Date(patient.personalInfo.dateOfBirth).getFullYear()
            : 'N/A';
          csvContent += `${patient.patientId || ''},${patient.personalInfo?.firstName || ''} ${patient.personalInfo?.lastName || ''},${patient.personalInfo?.gender || ''},${age},${patient.personalInfo?.phone || ''},${patient.personalInfo?.email || ''}\n`;
        });
        filename = "patients-report.csv";
        break;
      case 'stock':
        csvContent = "Item Name,Category,Current Stock,Minimum Stock,Unit Price,Supplier,Expiry Date\n";
        stockItems.forEach(item => {
          csvContent += `${item.name},${item.category},${item.currentStock},${item.minimumStock},${item.unitPrice},${item.supplier},${item.expiryDate}\n`;
        });
        filename = "stock-report.csv";
        break;
      case 'invoices':
        csvContent = "Invoice ID,Patient,Date,Amount,Status\n";
        invoices.forEach(invoice => {
          const patientName = invoice.patientDetails 
            ? `${invoice.patientDetails.firstName || ''} ${invoice.patientDetails.lastName || ''}`.trim()
            : invoice.patient || 'Unknown';
          csvContent += `${invoice.id || ''},${patientName},${invoice.invoiceDate || ''},${invoice.total || 0},${invoice.status || 'Pending'}\n`;
        });
        filename = "invoices-report.csv";
        break;
    }

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Reports</h1>
          <p className="text-gray-600 mt-2">Comprehensive reports and analytics</p>
        </div>
        <div className="flex gap-2">
          <Input
            type="date"
            value={dateRange.from}
            onChange={(e) => setDateRange(prev => ({ ...prev, from: e.target.value }))}
            className="w-auto"
          />
          <Input
            type="date"
            value={dateRange.to}
            onChange={(e) => setDateRange(prev => ({ ...prev, to: e.target.value }))}
            className="w-auto"
          />
        </div>
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="patients">Patient Reports</TabsTrigger>
          <TabsTrigger value="stock">Stock Reports</TabsTrigger>
          <TabsTrigger value="invoices">Invoice Reports</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center">
                  <Users className="h-8 w-8 text-blue-600" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Total Patients</p>
                    <p className="text-2xl font-bold">{patientStats.total}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center">
                  <Package className="h-8 w-8 text-green-600" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Stock Items</p>
                    <p className="text-2xl font-bold">{stockStats.totalItems}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center">
                  <Receipt className="h-8 w-8 text-purple-600" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Total Invoices</p>
                    <p className="text-2xl font-bold">{invoiceStats.total}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center">
                  <DollarSign className="h-8 w-8 text-orange-600" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Total Revenue</p>
                    <p className="text-2xl font-bold">₹{invoiceStats.totalRevenue.toFixed(2)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="patients" className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold">Patient Reports</h2>
            <Button onClick={() => exportReport('patients')}>
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Patients by Gender</CardTitle>
              </CardHeader>
              <CardContent>
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

            <Card>
              <CardHeader>
                <CardTitle>Patients by Age Group</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={formatBarData(patientStats.byAgeGroup)}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="value" fill="#3b82f6" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Patients</p>
                  <p className="text-2xl font-bold">{patientStats.total}</p>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="pt-6">
                <div>
                  <p className="text-sm font-medium text-gray-600">New This Month</p>
                  <p className="text-2xl font-bold text-green-600">{patientStats.newThisMonth}</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div>
                  <p className="text-sm font-medium text-gray-600">Growth Rate</p>
                  <p className="text-2xl font-bold text-blue-600">
                    {patientStats.total > 0 ? ((patientStats.newThisMonth / patientStats.total) * 100).toFixed(1) : 0}%
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="stock" className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold">Stock Reports</h2>
            <Button onClick={() => exportReport('stock')}>
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Items</p>
                  <p className="text-2xl font-bold">{stockStats.totalItems}</p>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="pt-6">
                <div>
                  <p className="text-sm font-medium text-gray-600">Low Stock Items</p>
                  <p className="text-2xl font-bold text-red-600">{stockStats.lowStock}</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Value</p>
                  <p className="text-2xl font-bold text-green-600">₹{stockStats.totalValue.toFixed(2)}</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div>
                  <p className="text-sm font-medium text-gray-600">Expiring Soon</p>
                  <p className="text-2xl font-bold text-orange-600">{stockStats.expiringItems}</p>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Stock by Category</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={formatBarData(stockStats.byCategory)}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="value" fill="#10b981" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="invoices" className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold">Invoice Reports</h2>
            <Button onClick={() => exportReport('invoices')}>
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Invoices</p>
                  <p className="text-2xl font-bold">{invoiceStats.total}</p>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="pt-6">
                <div>
                  <p className="text-sm font-medium text-gray-600">Paid Invoices</p>
                  <p className="text-2xl font-bold text-green-600">{invoiceStats.paid}</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div>
                  <p className="text-sm font-medium text-gray-600">Pending Invoices</p>
                  <p className="text-2xl font-bold text-orange-600">{invoiceStats.pending}</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Revenue</p>
                  <p className="text-2xl font-bold text-blue-600">₹{invoiceStats.totalRevenue.toFixed(2)}</p>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Monthly Revenue</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={formatBarData(invoiceStats.monthlyRevenue)}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip formatter={(value) => [`₹${value}`, 'Revenue']} />
                  <Line type="monotone" dataKey="value" stroke="#8b5cf6" strokeWidth={3} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}