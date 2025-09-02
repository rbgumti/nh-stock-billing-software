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
          return {
            'S.No.': index + 1,
            'Patient ID': patient.patientId || '',
            'Patient Name': `${patient.personalInfo?.firstName || ''} ${patient.personalInfo?.lastName || ''}`.trim(),
            'New Govt ID': patient.personalInfo?.newGovtId || '',
            'Old Govt ID': patient.personalInfo?.oldGovtId || '',
            'Aadhaar No.': patient.personalInfo?.aadhar || '',
            'Phone No.': patient.personalInfo?.phone || '',
            'Address': patient.personalInfo?.address || '',
            'Registration Date': patient.createdAt ? new Date(patient.createdAt).toLocaleDateString() : ''
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
        
        data = invoices.map(invoice => {
          const patientName = invoice.patientDetails 
            ? `${invoice.patientDetails.firstName || ''} ${invoice.patientDetails.lastName || ''}`.trim()
            : invoice.patient || 'Unknown';
          return {
            'Invoice ID': invoice.id || '',
            'Patient': patientName,
            'Date': invoice.invoiceDate || '',
            'Amount': invoice.total || 0,
            'Status': invoice.status || 'Pending'
          };
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
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="patients">Patient Reports</TabsTrigger>
          <TabsTrigger value="stock">Stock Reports</TabsTrigger>
          <TabsTrigger value="invoices">Invoice Reports</TabsTrigger>
          <TabsTrigger value="stockledger">Stock Ledger</TabsTrigger>
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
              Export Excel
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

          {/* Detailed Patient List */}
          <Card>
            <CardHeader>
              <CardTitle>Detailed Patient Information</CardTitle>
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
            <h2 className="text-2xl font-bold">Stock Reports</h2>
            <Button onClick={() => exportReport('stock')}>
              <Download className="h-4 w-4 mr-2" />
              Export Excel
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

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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

            <Card>
              <CardHeader>
                <CardTitle>Stock Status Overview</CardTitle>
              </CardHeader>
              <CardContent>
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
                            <p className="text-sm text-gray-600">₹{item.unitPrice} per unit</p>
                            <p className="text-xs text-gray-500">Value: ₹{(item.currentStock * item.unitPrice).toFixed(2)}</p>
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
            <h2 className="text-2xl font-bold">Invoice Reports</h2>
            <Button onClick={() => exportReport('invoices')}>
              <Download className="h-4 w-4 mr-2" />
              Export Excel
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

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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

            <Card>
              <CardHeader>
                <CardTitle>Detailed Invoice Report</CardTitle>
              </CardHeader>
              <CardContent>
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
                          <p className="font-semibold mt-1">₹{(invoice.total || 0).toFixed(2)}</p>
                        </div>
                      </div>
                      
                      {invoice.items && invoice.items.length > 0 && (
                        <div className="space-y-2">
                          <p className="text-sm font-medium text-gray-700">Medicines:</p>
                          {invoice.items.map((item: any, index: number) => (
                            <div key={index} className="flex justify-between text-sm bg-gray-50 p-2 rounded">
                              <span>{item.medicineName || item.name}</span>
                              <span>Qty: {item.quantity} | ₹{((item.unitPrice || 0) * (item.quantity || 0)).toFixed(2)}</span>
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
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold">Stock Ledger</h2>
            <Button onClick={() => exportReport('stock')}>
              <Download className="h-4 w-4 mr-2" />
              Export Excel
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center">
                  <ShoppingCart className="h-8 w-8 text-blue-600" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Total Transactions</p>
                    <p className="text-2xl font-bold">
                      {invoices.reduce((sum, inv) => sum + (inv.items?.length || 0), 0)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center">
                  <Package className="h-8 w-8 text-green-600" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Items Dispensed</p>
                    <p className="text-2xl font-bold">
                      {invoices.reduce((sum, inv) => sum + (inv.items?.reduce((itemSum: number, item: any) => itemSum + (item.quantity || 0), 0) || 0), 0)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center">
                  <DollarSign className="h-8 w-8 text-purple-600" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Total Sales Value</p>
                    <p className="text-2xl font-bold">
                      ₹{invoices.reduce((sum, inv) => sum + (inv.total || 0), 0).toFixed(2)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center">
                  <Users className="h-8 w-8 text-orange-600" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Unique Patients</p>
                    <p className="text-2xl font-bold">
                      {new Set(invoices.map(inv => inv.patientDetails?.patientId || inv.patient)).size}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Detailed Stock Movement Ledger</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4 max-h-96 overflow-y-auto">
                {invoices.flatMap(invoice => 
                  invoice.items?.map((item: any, index: number) => {
                    const stockItem = stockItems.find(s => s.name === item.medicineName || s.name === item.name);
                    return (
                      <div key={`${invoice.id}-${index}`} className="border rounded-lg p-4 space-y-3">
                        <div className="flex justify-between items-start">
                          <div className="space-y-1">
                            <h4 className="font-semibold text-lg">{item.medicineName || item.name}</h4>
                            <p className="text-sm text-gray-600">
                              <strong>Patient:</strong> {invoice.patientDetails?.firstName || invoice.patient} 
                              {invoice.patientDetails?.lastName ? ` ${invoice.patientDetails.lastName}` : ''}
                            </p>
                            <p className="text-sm text-gray-600">
                              <strong>Patient ID:</strong> {invoice.patientDetails?.patientId || 'N/A'}
                            </p>
                            <p className="text-sm text-gray-600">
                              <strong>Transaction Date:</strong> {new Date(invoice.invoiceDate || Date.now()).toLocaleDateString()}
                            </p>
                          </div>
                          <div className="text-right space-y-1">
                            <p className="text-lg font-bold">Qty: {item.quantity}</p>
                            <p className="text-sm text-gray-600">Unit Price: ₹{(item.unitPrice || 0).toFixed(2)}</p>
                            <p className="text-lg font-semibold text-green-600">
                              Total: ₹{((item.unitPrice || 0) * (item.quantity || 0)).toFixed(2)}
                            </p>
                          </div>
                        </div>
                        
                        {stockItem && (
                          <div className="pt-3 border-t bg-gray-50 rounded p-3">
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                              <div>
                                <p className="text-gray-600">Category</p>
                                <p className="font-medium">{stockItem.category}</p>
                              </div>
                              <div>
                                <p className="text-gray-600">Current Stock</p>
                                <p className="font-medium">{stockItem.currentStock}</p>
                              </div>
                              <div>
                                <p className="text-gray-600">Supplier</p>
                                <p className="font-medium">{stockItem.supplier}</p>
                              </div>
                              <div>
                                <p className="text-gray-600">Batch No</p>
                                <p className="font-medium">{stockItem.batchNo}</p>
                              </div>
                            </div>
                          </div>
                        )}

                        <div className="flex justify-between items-center pt-2">
                          <Badge variant={invoice.status === 'Paid' ? 'default' : invoice.status === 'Pending' ? 'secondary' : 'destructive'}>
                            {invoice.status || 'Pending'}
                          </Badge>
                          <p className="text-sm text-gray-500">Invoice #{invoice.id}</p>
                        </div>
                      </div>
                    );
                  }) || []
                )}
                {(!invoices.length || !invoices.some(inv => inv.items?.length)) && (
                  <div className="text-center py-12">
                    <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500 text-lg">No stock movements recorded</p>
                    <p className="text-gray-400 text-sm">Stock transactions will appear here when invoices are created</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}