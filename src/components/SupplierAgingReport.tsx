import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { 
  Download, 
  FileText, 
  Clock, 
  TrendingUp,
  Building2,
  ChevronDown,
  ChevronRight
} from 'lucide-react';
import { Supplier } from '@/hooks/useSupplierStore';
import { SupplierPayment } from '@/hooks/useSupplierPaymentStore';
import { PurchaseOrder } from '@/hooks/usePurchaseOrderStore';
import { format, differenceInDays } from 'date-fns';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';

interface SupplierAgingReportProps {
  suppliers: Supplier[];
  payments: SupplierPayment[];
  purchaseOrders: PurchaseOrder[];
  onClose: () => void;
}

interface AgingBucket {
  current: number;
  days1to30: number;
  days31to60: number;
  days61to90: number;
  days91to120: number;
  days120plus: number;
  total: number;
}

interface SupplierAging {
  supplier: Supplier;
  buckets: AgingBucket;
  unpaidPOs: Array<PurchaseOrder & { daysOverdue: number; agingBucket: string }>;
}

const AGING_BUCKETS = [
  { key: 'current', label: 'Current', color: 'emerald', range: 'Not Due' },
  { key: 'days1to30', label: '1-30 Days', color: 'cyan', range: '1-30' },
  { key: 'days31to60', label: '31-60 Days', color: 'gold', range: '31-60' },
  { key: 'days61to90', label: '61-90 Days', color: 'orange', range: '61-90' },
  { key: 'days91to120', label: '91-120 Days', color: 'pink', range: '91-120' },
  { key: 'days120plus', label: '120+ Days', color: 'destructive', range: '120+' },
] as const;

export function SupplierAgingReport({ 
  suppliers, 
  payments, 
  purchaseOrders, 
  onClose 
}: SupplierAgingReportProps) {
  const [expandedSuppliers, setExpandedSuppliers] = useState<Set<string>>(new Set());
  const [activeTab, setActiveTab] = useState('summary');

  const today = new Date();

  // Calculate aging data for all suppliers
  const agingData = useMemo((): SupplierAging[] => {
    return suppliers.map(supplier => {
      // Get unpaid POs for this supplier
      const supplierPOs = purchaseOrders.filter(po => 
        po.supplier === supplier.name && 
        po.status === 'Received' &&
        po.paymentStatus !== 'Paid'
      );

      // Get payments made for this supplier's POs
      const supplierPayments = payments.filter(p => p.supplier_id === supplier.id);

      const buckets: AgingBucket = {
        current: 0,
        days1to30: 0,
        days31to60: 0,
        days61to90: 0,
        days91to120: 0,
        days120plus: 0,
        total: 0
      };

      const unpaidPOs = supplierPOs.map(po => {
        // Calculate amount paid towards this PO
        const paidAmount = supplierPayments
          .filter(p => p.purchase_order_id === po.id && p.status === 'Completed')
          .reduce((sum, p) => sum + p.amount, 0);
        
        const pendingAmount = po.totalAmount - paidAmount;
        if (pendingAmount <= 0) return null;

        // Calculate days overdue based on due date or GRN/order date
        const dueDate = po.paymentDueDate 
          ? new Date(po.paymentDueDate)
          : po.grnDate 
            ? new Date(po.grnDate)
            : po.orderDate 
              ? new Date(po.orderDate) 
              : today;
        
        const daysOverdue = differenceInDays(today, dueDate);
        let agingBucket = 'current';

        if (daysOverdue <= 0) {
          buckets.current += pendingAmount;
          agingBucket = 'current';
        } else if (daysOverdue <= 30) {
          buckets.days1to30 += pendingAmount;
          agingBucket = '1-30 days';
        } else if (daysOverdue <= 60) {
          buckets.days31to60 += pendingAmount;
          agingBucket = '31-60 days';
        } else if (daysOverdue <= 90) {
          buckets.days61to90 += pendingAmount;
          agingBucket = '61-90 days';
        } else if (daysOverdue <= 120) {
          buckets.days91to120 += pendingAmount;
          agingBucket = '91-120 days';
        } else {
          buckets.days120plus += pendingAmount;
          agingBucket = '120+ days';
        }

        buckets.total += pendingAmount;

        return {
          ...po,
          totalAmount: pendingAmount, // Use pending amount
          daysOverdue: Math.max(0, daysOverdue),
          agingBucket
        };
      }).filter(Boolean) as Array<PurchaseOrder & { daysOverdue: number; agingBucket: string }>;

      return {
        supplier,
        buckets,
        unpaidPOs
      };
    }).filter(data => data.buckets.total > 0); // Only show suppliers with outstanding amounts
  }, [suppliers, purchaseOrders, payments, today]);

  // Calculate totals across all suppliers
  const totals = useMemo((): AgingBucket => {
    return agingData.reduce((acc, data) => ({
      current: acc.current + data.buckets.current,
      days1to30: acc.days1to30 + data.buckets.days1to30,
      days31to60: acc.days31to60 + data.buckets.days31to60,
      days61to90: acc.days61to90 + data.buckets.days61to90,
      days91to120: acc.days91to120 + data.buckets.days91to120,
      days120plus: acc.days120plus + data.buckets.days120plus,
      total: acc.total + data.buckets.total
    }), {
      current: 0,
      days1to30: 0,
      days31to60: 0,
      days61to90: 0,
      days91to120: 0,
      days120plus: 0,
      total: 0
    });
  }, [agingData]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2
    }).format(amount);
  };

  const toggleSupplier = (supplierId: string) => {
    const newExpanded = new Set(expandedSuppliers);
    if (newExpanded.has(supplierId)) {
      newExpanded.delete(supplierId);
    } else {
      newExpanded.add(supplierId);
    }
    setExpandedSuppliers(newExpanded);
  };

  const getPercentage = (amount: number) => {
    if (totals.total === 0) return 0;
    return (amount / totals.total) * 100;
  };


  const exportToExcel = () => {
    // Summary sheet
    const summaryData = agingData.map(data => ({
      'Supplier': data.supplier.name,
      'Current': data.buckets.current,
      '1-30 Days': data.buckets.days1to30,
      '31-60 Days': data.buckets.days31to60,
      '61-90 Days': data.buckets.days61to90,
      '91-120 Days': data.buckets.days91to120,
      '120+ Days': data.buckets.days120plus,
      'Total Outstanding': data.buckets.total
    }));

    // Add totals row
    summaryData.push({
      'Supplier': 'TOTAL',
      'Current': totals.current,
      '1-30 Days': totals.days1to30,
      '31-60 Days': totals.days31to60,
      '61-90 Days': totals.days61to90,
      '91-120 Days': totals.days91to120,
      '120+ Days': totals.days120plus,
      'Total Outstanding': totals.total
    });

    // Details sheet
    const detailsData = agingData.flatMap(data => 
      data.unpaidPOs.map(po => ({
        'Supplier': data.supplier.name,
        'PO Number': po.poNumber,
        'GRN Number': po.grnNumber || '-',
        'Invoice Number': po.invoiceNumber || '-',
        'Invoice Date': po.invoiceDate || '-',
        'PO Date': po.orderDate,
        'GRN Date': po.grnDate || '-',
        'Due Date': po.paymentDueDate || '-',
        'Days Overdue': po.daysOverdue,
        'Aging Bucket': po.agingBucket,
        'Amount Outstanding': po.totalAmount
      }))
    );

    const wb = XLSX.utils.book_new();
    
    const summaryWs = XLSX.utils.json_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(wb, summaryWs, 'Aging Summary');
    
    const detailsWs = XLSX.utils.json_to_sheet(detailsData);
    XLSX.utils.book_append_sheet(wb, detailsWs, 'Aging Details');
    
    XLSX.writeFile(wb, `Supplier_Aging_Report_${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
  };

  const exportToPDF = () => {
    const doc = new jsPDF('landscape');
    const pageWidth = doc.internal.pageSize.getWidth();
    
    // Header
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text('SUPPLIER PAYMENT AGING REPORT', pageWidth / 2, 20, { align: 'center' });
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`As of: ${format(new Date(), 'dd/MM/yyyy')}`, pageWidth / 2, 28, { align: 'center' });

    // Summary totals
    doc.setFillColor(240, 240, 240);
    doc.rect(14, 35, pageWidth - 28, 20, 'F');
    
    doc.setFontSize(9);
    const summaryY = 45;
    doc.text(`Current: ${formatCurrency(totals.current)}`, 20, summaryY);
    doc.text(`1-30 Days: ${formatCurrency(totals.days1to30)}`, 65, summaryY);
    doc.text(`31-60 Days: ${formatCurrency(totals.days31to60)}`, 110, summaryY);
    doc.text(`61-90 Days: ${formatCurrency(totals.days61to90)}`, 155, summaryY);
    doc.text(`91-120 Days: ${formatCurrency(totals.days91to120)}`, 200, summaryY);
    doc.text(`120+ Days: ${formatCurrency(totals.days120plus)}`, 245, summaryY);

    doc.setFont('helvetica', 'bold');
    doc.text(`TOTAL: ${formatCurrency(totals.total)}`, pageWidth - 60, summaryY);

    // Table
    let y = 65;
    doc.setFillColor(33, 37, 41);
    doc.setTextColor(255, 255, 255);
    doc.rect(14, y - 5, pageWidth - 28, 8, 'F');
    doc.setFontSize(8);
    doc.text('Supplier', 16, y);
    doc.text('Current', 80, y);
    doc.text('1-30 Days', 110, y);
    doc.text('31-60 Days', 140, y);
    doc.text('61-90 Days', 170, y);
    doc.text('91-120 Days', 200, y);
    doc.text('120+ Days', 230, y);
    doc.text('Total', 260, y);

    doc.setTextColor(0, 0, 0);
    doc.setFont('helvetica', 'normal');
    y += 10;

    agingData.forEach((data, index) => {
      if (y > 190) {
        doc.addPage();
        y = 20;
      }
      
      if (index % 2 === 0) {
        doc.setFillColor(248, 249, 250);
        doc.rect(14, y - 4, pageWidth - 28, 7, 'F');
      }
      
      doc.text(data.supplier.name.substring(0, 30), 16, y);
      doc.text(formatCurrency(data.buckets.current), 80, y);
      doc.text(formatCurrency(data.buckets.days1to30), 110, y);
      doc.text(formatCurrency(data.buckets.days31to60), 140, y);
      doc.text(formatCurrency(data.buckets.days61to90), 170, y);
      doc.text(formatCurrency(data.buckets.days91to120), 200, y);
      doc.text(formatCurrency(data.buckets.days120plus), 230, y);
      doc.setFont('helvetica', 'bold');
      doc.text(formatCurrency(data.buckets.total), 260, y);
      doc.setFont('helvetica', 'normal');
      
      y += 7;
    });

    // Totals row
    y += 3;
    doc.setFillColor(33, 37, 41);
    doc.setTextColor(255, 255, 255);
    doc.rect(14, y - 4, pageWidth - 28, 8, 'F');
    doc.setFont('helvetica', 'bold');
    doc.text('TOTAL', 16, y);
    doc.text(formatCurrency(totals.current), 80, y);
    doc.text(formatCurrency(totals.days1to30), 110, y);
    doc.text(formatCurrency(totals.days31to60), 140, y);
    doc.text(formatCurrency(totals.days61to90), 170, y);
    doc.text(formatCurrency(totals.days91to120), 200, y);
    doc.text(formatCurrency(totals.days120plus), 230, y);
    doc.text(formatCurrency(totals.total), 260, y);

    doc.save(`Supplier_Aging_Report_${format(new Date(), 'yyyy-MM-dd')}.pdf`);
  };

  return (
    <Dialog open onOpenChange={() => onClose()}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-gold" />
            <span className="bg-gradient-to-r from-gold to-orange bg-clip-text text-transparent">
              Supplier Payment Aging Report
            </span>
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-4">
          {/* Export Buttons */}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={exportToExcel} className="glass-subtle">
              <Download className="h-4 w-4 mr-2" />
              Excel
            </Button>
            <Button variant="outline" onClick={exportToPDF} className="glass-subtle">
              <FileText className="h-4 w-4 mr-2" />
              PDF
            </Button>
          </div>

          {/* Aging Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
            {AGING_BUCKETS.map((bucket) => {
              const amount = totals[bucket.key as keyof AgingBucket];
              const percentage = getPercentage(amount);
              
              return (
                <Card key={bucket.key} className="glass-strong border-0">
                  <CardContent className="p-3">
                    <div className="text-xs text-muted-foreground mb-1">{bucket.label}</div>
                    <div className={`text-lg font-bold text-${bucket.color}`}>
                      {formatCurrency(amount)}
                    </div>
                    <div className="mt-2">
                      <Progress 
                        value={percentage} 
                        className="h-1.5"
                      />
                      <div className="text-xs text-muted-foreground mt-1">
                        {percentage.toFixed(1)}%
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
            
            {/* Total Card */}
            <Card className="glass-strong border-0 bg-gradient-to-br from-purple/10 to-pink/10">
              <CardContent className="p-3">
                <div className="text-xs text-muted-foreground mb-1">Total Outstanding</div>
                <div className="text-lg font-bold bg-gradient-to-r from-purple to-pink bg-clip-text text-transparent">
                  {formatCurrency(totals.total)}
                </div>
                <div className="text-xs text-muted-foreground mt-3">
                  {agingData.length} supplier{agingData.length !== 1 ? 's' : ''}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Visual Aging Distribution */}
          <Card className="glass-strong border-0">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Aging Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-6 rounded-full overflow-hidden flex">
                {AGING_BUCKETS.map((bucket) => {
                  const percentage = getPercentage(totals[bucket.key as keyof AgingBucket]);
                  if (percentage === 0) return null;
                  
                  return (
                    <div
                      key={bucket.key}
                      className={`bg-${bucket.color} transition-all`}
                      style={{ width: `${percentage}%` }}
                      title={`${bucket.label}: ${formatCurrency(totals[bucket.key as keyof AgingBucket])} (${percentage.toFixed(1)}%)`}
                    />
                  );
                })}
              </div>
              <div className="flex flex-wrap gap-3 mt-3">
                {AGING_BUCKETS.map((bucket) => (
                  <div key={bucket.key} className="flex items-center gap-1.5 text-xs">
                    <div className={`w-3 h-3 rounded-sm bg-${bucket.color}`} />
                    <span className="text-muted-foreground">{bucket.label}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Tabs for Summary and Details */}
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="glass-subtle">
              <TabsTrigger value="summary">By Supplier</TabsTrigger>
              <TabsTrigger value="details">All Outstanding Bills</TabsTrigger>
            </TabsList>

            <TabsContent value="summary" className="mt-4">
              <Card className="glass-strong border-0">
                <CardContent className="p-0">
                  {agingData.length > 0 ? (
                    <Table>
                      <TableHeader>
                        <TableRow className="border-border/50">
                          <TableHead className="w-[200px]">Supplier</TableHead>
                          <TableHead className="text-right">Current</TableHead>
                          <TableHead className="text-right">1-30 Days</TableHead>
                          <TableHead className="text-right">31-60 Days</TableHead>
                          <TableHead className="text-right">61-90 Days</TableHead>
                          <TableHead className="text-right">91-120 Days</TableHead>
                          <TableHead className="text-right">120+ Days</TableHead>
                          <TableHead className="text-right">Total</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {agingData.map((data) => {
                          const isExpanded = expandedSuppliers.has(data.supplier.id);
                          
                          return (
                            <>
                              <TableRow 
                                key={data.supplier.id} 
                                className="border-border/30 cursor-pointer hover:bg-muted/50"
                                onClick={() => toggleSupplier(data.supplier.id)}
                              >
                                <TableCell className="font-medium">
                                  <div className="flex items-center gap-2">
                                    {isExpanded ? (
                                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                                    ) : (
                                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                                    )}
                                    <Building2 className="h-4 w-4 text-muted-foreground" />
                                    {data.supplier.name}
                                  </div>
                                </TableCell>
                                <TableCell className="text-right text-emerald">
                                  {data.buckets.current > 0 ? formatCurrency(data.buckets.current) : '-'}
                                </TableCell>
                                <TableCell className="text-right text-cyan">
                                  {data.buckets.days1to30 > 0 ? formatCurrency(data.buckets.days1to30) : '-'}
                                </TableCell>
                                <TableCell className="text-right text-gold">
                                  {data.buckets.days31to60 > 0 ? formatCurrency(data.buckets.days31to60) : '-'}
                                </TableCell>
                                <TableCell className="text-right text-orange">
                                  {data.buckets.days61to90 > 0 ? formatCurrency(data.buckets.days61to90) : '-'}
                                </TableCell>
                                <TableCell className="text-right text-pink">
                                  {data.buckets.days91to120 > 0 ? formatCurrency(data.buckets.days91to120) : '-'}
                                </TableCell>
                                <TableCell className="text-right text-destructive font-medium">
                                  {data.buckets.days120plus > 0 ? formatCurrency(data.buckets.days120plus) : '-'}
                                </TableCell>
                                <TableCell className="text-right font-bold">
                                  {formatCurrency(data.buckets.total)}
                                </TableCell>
                              </TableRow>
                              
                              {/* Expanded PO details */}
                              {isExpanded && data.unpaidPOs.map((po) => (
                                <TableRow key={`${data.supplier.id}-${po.id}`} className="bg-muted/30 border-border/20">
                                  <TableCell className="pl-12">
                                    <div className="text-sm">
                                      <span className="font-medium">PO #{po.poNumber}</span>
                                      {po.grnNumber && (
                                        <span className="text-muted-foreground ml-2">GRN: {po.grnNumber}</span>
                                      )}
                                    </div>
                                    <div className="text-xs text-muted-foreground">
                                      {po.paymentDueDate ? `Due: ${po.paymentDueDate}` : po.grnDate || po.orderDate}
                                    </div>
                                  </TableCell>
                                  <TableCell colSpan={5} className="text-center">
                                    <Badge variant="outline" className={`text-xs ${
                                      po.daysOverdue === 0 ? 'border-emerald/50 text-emerald' :
                                      po.daysOverdue <= 30 ? 'border-cyan/50 text-cyan' :
                                      po.daysOverdue <= 60 ? 'border-gold/50 text-gold' :
                                      po.daysOverdue <= 90 ? 'border-orange/50 text-orange' :
                                      po.daysOverdue <= 120 ? 'border-pink/50 text-pink' :
                                      'border-destructive/50 text-destructive'
                                    }`}>
                                      {po.daysOverdue === 0 ? 'Current' : `${po.daysOverdue} days overdue`}
                                    </Badge>
                                  </TableCell>
                                  <TableCell></TableCell>
                                  <TableCell className="text-right font-medium">
                                    {formatCurrency(po.totalAmount)}
                                  </TableCell>
                                </TableRow>
                              ))}
                            </>
                          );
                        })}
                        
                        {/* Totals Row */}
                        <TableRow className="bg-muted/50 font-bold border-t-2 border-border">
                          <TableCell>TOTAL</TableCell>
                          <TableCell className="text-right text-emerald">{formatCurrency(totals.current)}</TableCell>
                          <TableCell className="text-right text-cyan">{formatCurrency(totals.days1to30)}</TableCell>
                          <TableCell className="text-right text-gold">{formatCurrency(totals.days31to60)}</TableCell>
                          <TableCell className="text-right text-orange">{formatCurrency(totals.days61to90)}</TableCell>
                          <TableCell className="text-right text-pink">{formatCurrency(totals.days91to120)}</TableCell>
                          <TableCell className="text-right text-destructive">{formatCurrency(totals.days120plus)}</TableCell>
                          <TableCell className="text-right">{formatCurrency(totals.total)}</TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  ) : (
                    <div className="py-12 text-center text-muted-foreground">
                      <TrendingUp className="h-12 w-12 mx-auto mb-4 text-emerald opacity-50" />
                      <p>No outstanding payments!</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="details" className="mt-4">
              <Card className="glass-strong border-0">
                <CardContent className="p-0">
                  {agingData.flatMap(d => d.unpaidPOs).length > 0 ? (
                    <Table>
                      <TableHeader>
                        <TableRow className="border-border/50">
                          <TableHead>Supplier</TableHead>
                          <TableHead>PO / GRN</TableHead>
                          <TableHead>Date</TableHead>
                          <TableHead>Due Date</TableHead>
                          <TableHead className="text-center">Days Overdue</TableHead>
                          <TableHead className="text-center">Aging</TableHead>
                          <TableHead className="text-right">Amount</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {agingData.flatMap(data => 
                          data.unpaidPOs.map(po => (
                            <TableRow key={`${data.supplier.id}-${po.id}`} className="border-border/30">
                              <TableCell className="font-medium">{data.supplier.name}</TableCell>
                              <TableCell>
                                <div className="text-sm">PO #{po.poNumber}</div>
                                {po.grnNumber && (
                                  <div className="text-xs text-muted-foreground">GRN: {po.grnNumber}</div>
                                )}
                              </TableCell>
                              <TableCell className="text-sm">{po.grnDate || po.orderDate}</TableCell>
                              <TableCell className="text-sm">
                                {po.paymentDueDate || '-'}
                              </TableCell>
                              <TableCell className="text-center">
                                {po.daysOverdue > 0 ? (
                                  <span className={`font-medium ${
                                    po.daysOverdue <= 30 ? 'text-cyan' :
                                    po.daysOverdue <= 60 ? 'text-gold' :
                                    po.daysOverdue <= 90 ? 'text-orange' :
                                    po.daysOverdue <= 120 ? 'text-pink' :
                                    'text-destructive'
                                  }`}>
                                    {po.daysOverdue}
                                  </span>
                                ) : (
                                  <span className="text-emerald">Current</span>
                                )}
                              </TableCell>
                              <TableCell className="text-center">
                                <Badge variant="outline" className={`text-xs ${
                                  po.daysOverdue === 0 ? 'border-emerald/50 text-emerald bg-emerald/10' :
                                  po.daysOverdue <= 30 ? 'border-cyan/50 text-cyan bg-cyan/10' :
                                  po.daysOverdue <= 60 ? 'border-gold/50 text-gold bg-gold/10' :
                                  po.daysOverdue <= 90 ? 'border-orange/50 text-orange bg-orange/10' :
                                  po.daysOverdue <= 120 ? 'border-pink/50 text-pink bg-pink/10' :
                                  'border-destructive/50 text-destructive bg-destructive/10'
                                }`}>
                                  {po.agingBucket}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-right font-semibold">
                                {formatCurrency(po.totalAmount)}
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  ) : (
                    <div className="py-12 text-center text-muted-foreground">
                      <TrendingUp className="h-12 w-12 mx-auto mb-4 text-emerald opacity-50" />
                      <p>No outstanding bills!</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
}
