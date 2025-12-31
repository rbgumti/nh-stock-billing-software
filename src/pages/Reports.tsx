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
  ShoppingCart
} from "lucide-react";
import { useStockStore } from "@/hooks/useStockStore";
import * as XLSX from "xlsx";
import DailyStockReport from "@/components/DailyStockReport";
import DayReport from "@/components/DayReport";
import SaleReport from "@/components/SaleReport";
import FollowUpReport from "@/components/FollowUpReport";

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

  const pieColors = ['hsl(var(--teal))', 'hsl(var(--cyan))', 'hsl(var(--lime))', 'hsl(var(--emerald))', 'hsl(var(--orange))'];

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

    // Create workbook and worksheet
    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.json_to_sheet(data);
    
    // Add worksheet to workbook
    XLSX.utils.book_append_sheet(workbook, worksheet, reportType.charAt(0).toUpperCase() + reportType.slice(1));
    
    // Save file
    XLSX.writeFile(workbook, filename);
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-teal via-cyan to-lime bg-clip-text text-transparent">Reports</h1>
          <p className="text-muted-foreground mt-1">Comprehensive reports and analytics</p>
        </div>
        <div className="flex gap-2">
          <Input
            type="date"
            value={dateRange.from}
            onChange={(e) => setDateRange(prev => ({ ...prev, from: e.target.value }))}
            className="w-auto border-teal/30 focus:border-teal focus:ring-teal/20"
          />
          <Input
            type="date"
            value={dateRange.to}
            onChange={(e) => setDateRange(prev => ({ ...prev, to: e.target.value }))}
            className="w-auto border-teal/30 focus:border-teal focus:ring-teal/20"
          />
        </div>
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-9 bg-gradient-to-r from-teal/10 via-cyan/10 to-lime/10 p-1">
          <TabsTrigger value="overview" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-teal data-[state=active]:to-cyan data-[state=active]:text-white">Overview</TabsTrigger>
          <TabsTrigger value="salereport" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-teal data-[state=active]:to-cyan data-[state=active]:text-white">Sale Report</TabsTrigger>
          <TabsTrigger value="dayreport" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-teal data-[state=active]:to-cyan data-[state=active]:text-white">Day's Report</TabsTrigger>
          <TabsTrigger value="patients" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-teal data-[state=active]:to-cyan data-[state=active]:text-white">Patient Reports</TabsTrigger>
          <TabsTrigger value="stock" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-teal data-[state=active]:to-cyan data-[state=active]:text-white">Stock Reports</TabsTrigger>
          <TabsTrigger value="invoices" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-teal data-[state=active]:to-cyan data-[state=active]:text-white">Invoice Reports</TabsTrigger>
          <TabsTrigger value="stockledger" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-teal data-[state=active]:to-cyan data-[state=active]:text-white">Stock Ledger</TabsTrigger>
          <TabsTrigger value="dailystock" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-teal data-[state=active]:to-cyan data-[state=active]:text-white">Daily Stock</TabsTrigger>
          <TabsTrigger value="followup" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-teal data-[state=active]:to-cyan data-[state=active]:text-white">Follow-Up</TabsTrigger>
        </TabsList>

        <TabsContent value="salereport" className="space-y-6">
          <SaleReport />
        </TabsContent>

        <TabsContent value="dayreport" className="space-y-6">
          <DayReport />
        </TabsContent>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card className="group relative overflow-hidden border-teal/20 bg-white/80 backdrop-blur-sm hover:shadow-xl transition-all duration-300">
              <div className="absolute inset-0 bg-gradient-to-br from-teal/10 via-transparent to-cyan/10 opacity-50 group-hover:opacity-100 transition-opacity" />
              <CardContent className="pt-6 relative">
                <div className="flex items-center">
                  <div className="p-3 rounded-xl bg-gradient-to-br from-teal to-cyan shadow-lg">
                    <Users className="h-6 w-6 text-white" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-muted-foreground">Total Patients</p>
                    <p className="text-2xl font-bold bg-gradient-to-r from-teal to-cyan bg-clip-text text-transparent">{patientStats.total}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card className="group relative overflow-hidden border-cyan/20 bg-white/80 backdrop-blur-sm hover:shadow-xl transition-all duration-300">
              <div className="absolute inset-0 bg-gradient-to-br from-cyan/10 via-transparent to-lime/10 opacity-50 group-hover:opacity-100 transition-opacity" />
              <CardContent className="pt-6 relative">
                <div className="flex items-center">
                  <div className="p-3 rounded-xl bg-gradient-to-br from-cyan to-lime shadow-lg">
                    <Package className="h-6 w-6 text-white" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-muted-foreground">Stock Items</p>
                    <p className="text-2xl font-bold bg-gradient-to-r from-cyan to-lime bg-clip-text text-transparent">{stockStats.totalItems}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="group relative overflow-hidden border-lime/20 bg-white/80 backdrop-blur-sm hover:shadow-xl transition-all duration-300">
              <div className="absolute inset-0 bg-gradient-to-br from-lime/10 via-transparent to-emerald/10 opacity-50 group-hover:opacity-100 transition-opacity" />
              <CardContent className="pt-6 relative">
                <div className="flex items-center">
                  <div className="p-3 rounded-xl bg-gradient-to-br from-lime to-emerald shadow-lg">
                    <Receipt className="h-6 w-6 text-white" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-muted-foreground">Total Invoices</p>
                    <p className="text-2xl font-bold bg-gradient-to-r from-lime to-emerald bg-clip-text text-transparent">{invoiceStats.total}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="group relative overflow-hidden border-emerald/20 bg-white/80 backdrop-blur-sm hover:shadow-xl transition-all duration-300">
              <div className="absolute inset-0 bg-gradient-to-br from-emerald/10 via-transparent to-teal/10 opacity-50 group-hover:opacity-100 transition-opacity" />
              <CardContent className="pt-6 relative">
                <div className="flex items-center">
                  <div className="p-3 rounded-xl bg-gradient-to-br from-emerald to-teal shadow-lg">
                    <DollarSign className="h-6 w-6 text-white" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-muted-foreground">Total Revenue</p>
                    <p className="text-2xl font-bold bg-gradient-to-r from-emerald to-teal bg-clip-text text-transparent">₹{invoiceStats.totalRevenue.toFixed(2)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="patients" className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold bg-gradient-to-r from-teal to-cyan bg-clip-text text-transparent">Patient Reports</h2>
            <Button onClick={() => exportReport('patients')} className="bg-gradient-to-r from-teal to-cyan hover:from-teal/90 hover:to-cyan/90 text-white shadow-lg hover:shadow-teal/25">
              <Download className="h-4 w-4 mr-2" />
              Export Excel
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="border-teal/20 bg-white/80 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-teal">Patients by Gender</CardTitle>
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
                    <Tooltip contentStyle={{ backgroundColor: 'rgba(255,255,255,0.95)', borderColor: 'hsl(var(--teal))' }} />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card className="border-cyan/20 bg-white/80 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-cyan">Patients by Age Group</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={formatBarData(patientStats.byAgeGroup)}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--teal) / 0.2)" />
                    <XAxis dataKey="name" stroke="hsl(var(--teal))" />
                    <YAxis stroke="hsl(var(--teal))" />
                    <Tooltip contentStyle={{ backgroundColor: 'rgba(255,255,255,0.95)', borderColor: 'hsl(var(--cyan))' }} />
                    <Bar dataKey="value" fill="hsl(var(--teal))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="border-teal/20 bg-white/80 backdrop-blur-sm">
              <CardContent className="pt-6">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Patients</p>
                  <p className="text-2xl font-bold bg-gradient-to-r from-teal to-cyan bg-clip-text text-transparent">{patientStats.total}</p>
                </div>
              </CardContent>
            </Card>
            
            <Card className="border-lime/20 bg-white/80 backdrop-blur-sm">
              <CardContent className="pt-6">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">New This Month</p>
                  <p className="text-2xl font-bold text-lime">{patientStats.newThisMonth}</p>
                </div>
              </CardContent>
            </Card>

            <Card className="border-cyan/20 bg-white/80 backdrop-blur-sm">
              <CardContent className="pt-6">
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
          <Card className="border-teal/20 bg-white/80 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="bg-gradient-to-r from-teal to-cyan bg-clip-text text-transparent">Detailed Patient Information</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4 max-h-80 overflow-y-auto">
                {patients.map((patient: any, index: number) => (
                  <div key={patient.patientId} className={`border border-teal/20 rounded-lg p-4 space-y-2 bg-gradient-to-br ${
                    index % 3 === 0 ? 'from-teal/5 to-cyan/5' :
                    index % 3 === 1 ? 'from-cyan/5 to-lime/5' :
                    'from-lime/5 to-emerald/5'
                  }`}>
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-semibold text-teal">
                          {patient.personalInfo?.firstName} {patient.personalInfo?.lastName}
                        </h4>
                        <p className="text-sm text-muted-foreground">ID: {patient.patientId}</p>
                        <p className="text-sm text-muted-foreground">
                          Age: {patient.personalInfo?.dateOfBirth 
                            ? new Date().getFullYear() - new Date(patient.personalInfo.dateOfBirth).getFullYear()
                            : 'N/A'} | Gender: {patient.personalInfo?.gender || 'N/A'}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          <strong>Address:</strong> {patient.personalInfo?.address || 'N/A'}
                        </p>
                        <div className="space-y-1">
                          <p className="text-sm text-muted-foreground">
                            <strong>Aadhar:</strong> {patient.personalInfo?.aadhar || 'N/A'}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            <strong>Old Govt ID:</strong> {patient.personalInfo?.oldGovtId || 'N/A'}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            <strong>New Govt ID:</strong> {patient.personalInfo?.newGovtId || 'N/A'}
                          </p>
                        </div>
                      </div>
                      <div className="text-right space-y-1">
                        <p className="text-sm text-muted-foreground">Contact</p>
                        <p className="text-sm">{patient.personalInfo?.phone || 'N/A'}</p>
                        <p className="text-xs text-muted-foreground">{patient.personalInfo?.email || 'N/A'}</p>
                        {patient.emergencyContact && (
                          <div className="pt-2">
                            <p className="text-xs text-muted-foreground"><strong>Emergency Contact:</strong></p>
                            <p className="text-xs">{patient.emergencyContact.name || 'N/A'}</p>
                            <p className="text-xs">{patient.emergencyContact.phone || 'N/A'}</p>
                          </div>
                        )}
                      </div>
                    </div>
                    {patient.medicalInfo && (
                      <div className="pt-2 border-t border-teal/20">
                        <p className="text-xs text-muted-foreground">
                          <strong>Medical Info:</strong> {patient.medicalInfo.allergies || 'No allergies'} | 
                          Conditions: {patient.medicalInfo.chronicConditions || 'None'} |
                          Blood Group: {patient.medicalInfo.bloodGroup || 'Unknown'}
                        </p>
                      </div>
                    )}
                  </div>
                ))}
                {!patients.length && (
                  <p className="text-muted-foreground text-center py-8">No patients found</p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="stock" className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold bg-gradient-to-r from-cyan to-lime bg-clip-text text-transparent">Stock Reports</h2>
            <Button onClick={() => exportReport('stock')} className="bg-gradient-to-r from-cyan to-lime hover:from-cyan/90 hover:to-lime/90 text-white shadow-lg hover:shadow-cyan/25">
              <Download className="h-4 w-4 mr-2" />
              Export Excel
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card className="border-teal/20 bg-white/80 backdrop-blur-sm">
              <CardContent className="pt-6">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Items</p>
                  <p className="text-2xl font-bold bg-gradient-to-r from-teal to-cyan bg-clip-text text-transparent">{stockStats.totalItems}</p>
                </div>
              </CardContent>
            </Card>
            
            <Card className="border-destructive/20 bg-white/80 backdrop-blur-sm">
              <CardContent className="pt-6">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Low Stock Items</p>
                  <p className="text-2xl font-bold text-destructive">{stockStats.lowStock}</p>
                </div>
              </CardContent>
            </Card>

            <Card className="border-lime/20 bg-white/80 backdrop-blur-sm">
              <CardContent className="pt-6">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Value</p>
                  <p className="text-2xl font-bold text-lime">₹{stockStats.totalValue.toFixed(2)}</p>
                </div>
              </CardContent>
            </Card>

            <Card className="border-orange/20 bg-white/80 backdrop-blur-sm">
              <CardContent className="pt-6">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Expiring Soon</p>
                  <p className="text-2xl font-bold text-orange">{stockStats.expiringItems}</p>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="border-teal/20 bg-white/80 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-teal">Stock by Category</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={formatBarData(stockStats.byCategory)}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--teal) / 0.2)" />
                    <XAxis dataKey="name" stroke="hsl(var(--teal))" />
                    <YAxis stroke="hsl(var(--teal))" />
                    <Tooltip contentStyle={{ backgroundColor: 'rgba(255,255,255,0.95)', borderColor: 'hsl(var(--teal))' }} />
                    <Bar dataKey="value" fill="hsl(var(--lime))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card className="border-cyan/20 bg-white/80 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-cyan">Stock Status Overview</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4 max-h-80 overflow-y-auto">
                  {stockItems.map((item, index) => {
                    const isLowStock = item.currentStock <= item.minimumStock;
                    const expiryDate = new Date(item.expiryDate);
                    const warningDate = new Date();
                    warningDate.setMonth(warningDate.getMonth() + 3);
                    const isExpiringSoon = expiryDate <= warningDate;
                    
                    return (
                      <div key={item.id} className={`border border-teal/20 rounded-lg p-4 space-y-2 bg-gradient-to-br ${
                        index % 3 === 0 ? 'from-teal/5 to-cyan/5' :
                        index % 3 === 1 ? 'from-cyan/5 to-lime/5' :
                        'from-lime/5 to-emerald/5'
                      }`}>
                        <div className="flex justify-between items-start">
                          <div>
                            <h4 className="font-semibold text-teal">{item.name}</h4>
                            <p className="text-sm text-muted-foreground">Category: {item.category}</p>
                            <p className="text-sm text-muted-foreground">Supplier: {item.supplier}</p>
                            <p className="text-sm text-muted-foreground">Batch: {item.batchNo}</p>
                          </div>
                          <div className="text-right space-y-1">
                            <p className="text-sm font-medium">Stock: {item.currentStock}/{item.minimumStock}</p>
                            <p className="text-sm text-muted-foreground">₹{item.unitPrice} per unit</p>
                            <p className="text-xs text-muted-foreground">Value: ₹{(item.currentStock * item.unitPrice).toFixed(2)}</p>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          {isLowStock && (
                            <Badge className="text-xs bg-gradient-to-r from-destructive to-orange text-white border-0">
                              <AlertTriangle className="h-3 w-3 mr-1" />
                              Low Stock
                            </Badge>
                          )}
                          {isExpiringSoon && (
                            <Badge className="text-xs bg-gradient-to-r from-yellow-500 to-orange text-white border-0">
                              <Clock className="h-3 w-3 mr-1" />
                              Expires: {expiryDate.toLocaleDateString()}
                            </Badge>
                          )}
                          {!isLowStock && !isExpiringSoon && (
                            <Badge className="text-xs bg-gradient-to-r from-emerald to-teal text-white border-0">
                              <Activity className="h-3 w-3 mr-1" />
                              Good Stock
                            </Badge>
                          )}
                        </div>
                      </div>
                    );
                  })}
                  {!stockItems.length && (
                    <p className="text-muted-foreground text-center py-8">No stock items found</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="invoices" className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold bg-gradient-to-r from-lime to-emerald bg-clip-text text-transparent">Invoice Reports</h2>
            <Button onClick={() => exportReport('invoices')} className="bg-gradient-to-r from-lime to-emerald hover:from-lime/90 hover:to-emerald/90 text-white shadow-lg hover:shadow-lime/25">
              <Download className="h-4 w-4 mr-2" />
              Export Excel
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card className="border-teal/20 bg-white/80 backdrop-blur-sm">
              <CardContent className="pt-6">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Invoices</p>
                  <p className="text-2xl font-bold bg-gradient-to-r from-teal to-cyan bg-clip-text text-transparent">{invoiceStats.total}</p>
                </div>
              </CardContent>
            </Card>
            
            <Card className="border-lime/20 bg-white/80 backdrop-blur-sm">
              <CardContent className="pt-6">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Paid Invoices</p>
                  <p className="text-2xl font-bold text-lime">{invoiceStats.paid}</p>
                </div>
              </CardContent>
            </Card>

            <Card className="border-orange/20 bg-white/80 backdrop-blur-sm">
              <CardContent className="pt-6">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Pending Invoices</p>
                  <p className="text-2xl font-bold text-orange">{invoiceStats.pending}</p>
                </div>
              </CardContent>
            </Card>

            <Card className="border-cyan/20 bg-white/80 backdrop-blur-sm">
              <CardContent className="pt-6">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Revenue</p>
                  <p className="text-2xl font-bold text-cyan">₹{invoiceStats.totalRevenue.toFixed(2)}</p>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="border-teal/20 bg-white/80 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-teal">Monthly Revenue</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={formatBarData(invoiceStats.monthlyRevenue)}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--teal) / 0.2)" />
                    <XAxis dataKey="name" stroke="hsl(var(--teal))" />
                    <YAxis stroke="hsl(var(--teal))" />
                    <Tooltip contentStyle={{ backgroundColor: 'rgba(255,255,255,0.95)', borderColor: 'hsl(var(--cyan))' }} formatter={(value) => [`₹${value}`, 'Revenue']} />
                    <Line type="monotone" dataKey="value" stroke="hsl(var(--lime))" strokeWidth={3} dot={{ fill: 'hsl(var(--teal))' }} />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card className="border-cyan/20 bg-white/80 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-cyan">Detailed Invoice Report</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4 max-h-80 overflow-y-auto">
                  {invoices.map((invoice: any, index: number) => (
                    <div key={invoice.id} className={`border border-teal/20 rounded-lg p-4 space-y-3 bg-gradient-to-br ${
                      index % 3 === 0 ? 'from-teal/5 to-cyan/5' :
                      index % 3 === 1 ? 'from-cyan/5 to-lime/5' :
                      'from-lime/5 to-emerald/5'
                    }`}>
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="font-semibold text-teal">Invoice #{invoice.id}</h4>
                          <p className="text-sm text-muted-foreground">
                            Patient: {invoice.patientDetails?.firstName || invoice.patient} 
                            {invoice.patientDetails?.lastName ? ` ${invoice.patientDetails.lastName}` : ''}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            ID: {invoice.patientDetails?.patientId || 'N/A'} | 
                            Date: {new Date(invoice.invoiceDate || Date.now()).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="text-right">
                          <Badge className={`${
                            invoice.status === 'Paid' ? 'bg-gradient-to-r from-emerald to-teal text-white border-0' :
                            invoice.status === 'Pending' ? 'bg-gradient-to-r from-yellow-500 to-orange text-white border-0' :
                            'bg-gradient-to-r from-destructive to-orange text-white border-0'
                          }`}>
                            {invoice.status || 'Pending'}
                          </Badge>
                          <p className="font-semibold mt-1 text-teal">₹{(invoice.total || 0).toFixed(2)}</p>
                        </div>
                      </div>
                      
                      {invoice.items && invoice.items.length > 0 && (
                        <div className="space-y-2">
                          <p className="text-sm font-medium text-cyan">Medicines:</p>
                          {invoice.items.map((item: any, idx: number) => (
                            <div key={idx} className="flex justify-between text-sm bg-teal/5 p-2 rounded">
                              <span>{item.medicineName || item.name}</span>
                              <span className="text-muted-foreground">Qty: {item.quantity} | ₹{((item.unitPrice || 0) * (item.quantity || 0)).toFixed(2)}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                  {!invoices.length && (
                    <p className="text-muted-foreground text-center py-8">No invoices found</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="stockledger" className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold bg-gradient-to-r from-emerald to-teal bg-clip-text text-transparent">Stock Ledger</h2>
            <Button onClick={() => exportReport('stock')} className="bg-gradient-to-r from-emerald to-teal hover:from-emerald/90 hover:to-teal/90 text-white shadow-lg hover:shadow-emerald/25">
              <Download className="h-4 w-4 mr-2" />
              Export Excel
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card className="group relative overflow-hidden border-teal/20 bg-white/80 backdrop-blur-sm hover:shadow-xl transition-all duration-300">
              <div className="absolute inset-0 bg-gradient-to-br from-teal/10 via-transparent to-cyan/10 opacity-50 group-hover:opacity-100 transition-opacity" />
              <CardContent className="pt-6 relative">
                <div className="flex items-center">
                  <div className="p-3 rounded-xl bg-gradient-to-br from-teal to-cyan shadow-lg">
                    <ShoppingCart className="h-6 w-6 text-white" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-muted-foreground">Total Transactions</p>
                    <p className="text-2xl font-bold bg-gradient-to-r from-teal to-cyan bg-clip-text text-transparent">
                      {invoices.reduce((sum, inv) => sum + (inv.items?.length || 0), 0)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card className="group relative overflow-hidden border-cyan/20 bg-white/80 backdrop-blur-sm hover:shadow-xl transition-all duration-300">
              <div className="absolute inset-0 bg-gradient-to-br from-cyan/10 via-transparent to-lime/10 opacity-50 group-hover:opacity-100 transition-opacity" />
              <CardContent className="pt-6 relative">
                <div className="flex items-center">
                  <div className="p-3 rounded-xl bg-gradient-to-br from-cyan to-lime shadow-lg">
                    <Package className="h-6 w-6 text-white" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-muted-foreground">Items Dispensed</p>
                    <p className="text-2xl font-bold bg-gradient-to-r from-cyan to-lime bg-clip-text text-transparent">
                      {invoices.reduce((sum, inv) => sum + (inv.items?.reduce((itemSum: number, item: any) => itemSum + (item.quantity || 0), 0) || 0), 0)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="group relative overflow-hidden border-lime/20 bg-white/80 backdrop-blur-sm hover:shadow-xl transition-all duration-300">
              <div className="absolute inset-0 bg-gradient-to-br from-lime/10 via-transparent to-emerald/10 opacity-50 group-hover:opacity-100 transition-opacity" />
              <CardContent className="pt-6 relative">
                <div className="flex items-center">
                  <div className="p-3 rounded-xl bg-gradient-to-br from-lime to-emerald shadow-lg">
                    <DollarSign className="h-6 w-6 text-white" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-muted-foreground">Total Sales Value</p>
                    <p className="text-2xl font-bold bg-gradient-to-r from-lime to-emerald bg-clip-text text-transparent">
                      ₹{invoices.reduce((sum, inv) => sum + (inv.total || 0), 0).toFixed(2)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="group relative overflow-hidden border-emerald/20 bg-white/80 backdrop-blur-sm hover:shadow-xl transition-all duration-300">
              <div className="absolute inset-0 bg-gradient-to-br from-emerald/10 via-transparent to-teal/10 opacity-50 group-hover:opacity-100 transition-opacity" />
              <CardContent className="pt-6 relative">
                <div className="flex items-center">
                  <div className="p-3 rounded-xl bg-gradient-to-br from-emerald to-teal shadow-lg">
                    <Users className="h-6 w-6 text-white" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-muted-foreground">Unique Patients</p>
                    <p className="text-2xl font-bold bg-gradient-to-r from-emerald to-teal bg-clip-text text-transparent">
                      {new Set(invoices.map(inv => inv.patientDetails?.patientId || inv.patient)).size}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card className="border-teal/20 bg-white/80 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="bg-gradient-to-r from-teal to-cyan bg-clip-text text-transparent">Detailed Stock Movement Ledger</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4 max-h-96 overflow-y-auto">
                {invoices.flatMap(invoice => 
                  invoice.items?.map((item: any, index: number) => {
                    const stockItem = stockItems.find(s => s.name === item.medicineName || s.name === item.name);
                    return (
                      <div key={`${invoice.id}-${index}`} className={`border border-teal/20 rounded-lg p-4 space-y-3 bg-gradient-to-br ${
                        index % 3 === 0 ? 'from-teal/5 to-cyan/5' :
                        index % 3 === 1 ? 'from-cyan/5 to-lime/5' :
                        'from-lime/5 to-emerald/5'
                      }`}>
                        <div className="flex justify-between items-start">
                          <div className="space-y-1">
                            <h4 className="font-semibold text-lg text-teal">{item.medicineName || item.name}</h4>
                            <p className="text-sm text-muted-foreground">
                              <strong>Patient:</strong> {invoice.patientDetails?.firstName || invoice.patient} 
                              {invoice.patientDetails?.lastName ? ` ${invoice.patientDetails.lastName}` : ''}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              <strong>Patient ID:</strong> {invoice.patientDetails?.patientId || 'N/A'}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              <strong>Transaction Date:</strong> {new Date(invoice.invoiceDate || Date.now()).toLocaleDateString()}
                            </p>
                          </div>
                          <div className="text-right space-y-1">
                            <p className="text-lg font-bold text-teal">Qty: {item.quantity}</p>
                            <p className="text-sm text-muted-foreground">Unit Price: ₹{(item.unitPrice || 0).toFixed(2)}</p>
                            <p className="text-sm font-medium text-cyan">Total: ₹{((item.unitPrice || 0) * (item.quantity || 0)).toFixed(2)}</p>
                            {stockItem && (
                              <p className="text-xs text-muted-foreground">
                                Current Stock: {stockItem.currentStock}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Badge className="text-xs bg-gradient-to-r from-teal to-cyan text-white border-0">
                            Invoice #{invoice.id}
                          </Badge>
                          {stockItem && stockItem.currentStock <= stockItem.minimumStock && (
                            <Badge className="text-xs bg-gradient-to-r from-destructive to-orange text-white border-0">
                              <AlertTriangle className="h-3 w-3 mr-1" />
                              Low Stock
                            </Badge>
                          )}
                        </div>
                      </div>
                    );
                  }) || []
                )}
                {invoices.length === 0 && (
                  <p className="text-muted-foreground text-center py-8">No stock movements found</p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="dailystock" className="space-y-6">
          <DailyStockReport />
        </TabsContent>

        <TabsContent value="followup" className="space-y-6">
          <FollowUpReport />
        </TabsContent>
      </Tabs>
    </div>
  );
}