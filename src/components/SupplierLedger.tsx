import { useState, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { 
  FileText, 
  CreditCard, 
  Download, 
  Calendar as CalendarIcon, 
  Building2, 
  TrendingUp, 
  TrendingDown,
  ArrowUpRight,
  ArrowDownLeft,
  Clock,
  CheckCircle2,
  AlertCircle,
  X
} from 'lucide-react';
import { Supplier } from '@/hooks/useSupplierStore';
import { SupplierPayment } from '@/hooks/useSupplierPaymentStore';
import { PurchaseOrder } from '@/hooks/usePurchaseOrderStore';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';

interface SupplierLedgerProps {
  suppliers: Supplier[];
  payments: SupplierPayment[];
  purchaseOrders: PurchaseOrder[];
  onClose: () => void;
  initialSupplierId?: number;
}

interface LedgerEntry {
  id: string;
  date: string;
  type: 'debit' | 'credit';
  description: string;
  reference: string;
  amount: number;
  status: string;
  balance: number;
  source: 'po' | 'grn' | 'payment';
  sourceId: string;
}

export function SupplierLedger({ 
  suppliers, 
  payments, 
  purchaseOrders, 
  onClose,
  initialSupplierId 
}: SupplierLedgerProps) {
  const [selectedSupplierId, setSelectedSupplierId] = useState<string | null>(initialSupplierId || null);
  const [dateFrom, setDateFrom] = useState<Date | undefined>(undefined);
  const [dateTo, setDateTo] = useState<Date | undefined>(undefined);
  const [activeTab, setActiveTab] = useState('ledger');

  const selectedSupplier = useMemo(() => {
    return suppliers.find(s => s.id === selectedSupplierId);
  }, [suppliers, selectedSupplierId]);

  // Get supplier's POs and payments
  const supplierPOs = useMemo(() => {
    if (!selectedSupplier) return [];
    return purchaseOrders.filter(po => 
      po.supplier.toLowerCase() === selectedSupplier.name.toLowerCase()
    );
  }, [purchaseOrders, selectedSupplier]);

  const supplierPayments = useMemo(() => {
    if (!selectedSupplierId) return [];
    return payments.filter(p => p.supplier_id === selectedSupplierId);
  }, [payments, selectedSupplierId]);

  // Build ledger entries
  const ledgerEntries = useMemo((): LedgerEntry[] => {
    if (!selectedSupplier) return [];

    const entries: LedgerEntry[] = [];

    // Add PO entries as debits (what we owe)
    supplierPOs.forEach(po => {
      // Add PO/GRN entry
      entries.push({
        id: `po-${po.id}`,
        date: po.grnDate || po.orderDate,
        type: 'debit',
        description: po.poType === 'Service' 
          ? `Service PO: ${po.serviceDescription || 'Service Order'}`
          : `Purchase Order - ${po.items?.length || 0} items`,
        reference: po.grnNumber ? `GRN: ${po.grnNumber}` : `PO: ${po.poNumber}`,
        amount: po.totalAmount,
        status: po.status === 'Received' ? 'Received' : po.status,
        balance: 0, // Will be calculated
        source: po.grnNumber ? 'grn' : 'po',
        sourceId: po.id
      });
    });

    // Add payment entries as credits (what we paid)
    supplierPayments.forEach(payment => {
      entries.push({
        id: `payment-${payment.id}`,
        date: payment.payment_date,
        type: 'credit',
        description: payment.notes || `Payment via ${payment.payment_method || 'Cash'}`,
        reference: payment.utr_number 
          ? `UTR: ${payment.utr_number}` 
          : payment.reference_number 
            ? `Ref: ${payment.reference_number}`
            : `Payment #${payment.id}`,
        amount: payment.amount,
        status: payment.status || 'Completed',
        balance: 0,
        source: 'payment',
        sourceId: payment.id
      });
    });

    // Sort by date
    entries.sort((a, b) => {
      const dateA = a.date ? new Date(a.date).getTime() : 0;
      const dateB = b.date ? new Date(b.date).getTime() : 0;
      return dateA - dateB;
    });

    // Filter by date range
    const filteredEntries = entries.filter(entry => {
      if (!entry.date) return true;
      const entryDate = new Date(entry.date);
      if (dateFrom && entryDate < dateFrom) return false;
      if (dateTo && entryDate > dateTo) return false;
      return true;
    });

    // Calculate running balance
    let runningBalance = 0;
    filteredEntries.forEach(entry => {
      if (entry.type === 'debit') {
        runningBalance += entry.amount;
      } else {
        runningBalance -= entry.amount;
      }
      entry.balance = runningBalance;
    });

    return filteredEntries;
  }, [selectedSupplier, supplierPOs, supplierPayments, dateFrom, dateTo]);

  // Calculate summary stats
  const summary = useMemo(() => {
    const totalDebits = ledgerEntries
      .filter(e => e.type === 'debit')
      .reduce((sum, e) => sum + e.amount, 0);
    
    const totalCredits = ledgerEntries
      .filter(e => e.type === 'credit')
      .reduce((sum, e) => sum + e.amount, 0);

    const pendingPOs = supplierPOs.filter(po => 
      po.paymentStatus !== 'Paid' && po.status === 'Received'
    );

    const pendingAmount = pendingPOs.reduce((sum, po) => {
      const paidAmount = supplierPayments
        .filter(p => p.purchase_order_id === po.id && p.status === 'Completed')
        .reduce((s, p) => s + p.amount, 0);
      return sum + (po.totalAmount - paidAmount);
    }, 0);

    return {
      totalDebits,
      totalCredits,
      balance: totalDebits - totalCredits,
      pendingPOs: pendingPOs.length,
      pendingAmount,
      totalPOs: supplierPOs.length,
      totalPayments: supplierPayments.length
    };
  }, [ledgerEntries, supplierPOs, supplierPayments]);

  // Pending bills breakdown
  const pendingBills = useMemo(() => {
    if (!selectedSupplier) return [];
    
    return supplierPOs
      .filter(po => po.paymentStatus !== 'Paid' && po.status === 'Received')
      .map(po => {
        const paidAmount = supplierPayments
          .filter(p => p.purchase_order_id === po.id && p.status === 'Completed')
          .reduce((sum, p) => sum + p.amount, 0);
        
        return {
          ...po,
          paidAmount,
          pendingAmount: po.totalAmount - paidAmount
        };
      });
  }, [selectedSupplier, supplierPOs, supplierPayments]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2
    }).format(amount);
  };

  const exportToExcel = () => {
    if (!selectedSupplier || ledgerEntries.length === 0) return;

    const data = ledgerEntries.map(entry => ({
      'Date': entry.date,
      'Description': entry.description,
      'Reference': entry.reference,
      'Debit (Bill)': entry.type === 'debit' ? entry.amount : '',
      'Credit (Payment)': entry.type === 'credit' ? entry.amount : '',
      'Balance': entry.balance,
      'Status': entry.status
    }));

    // Add summary row
    data.push({
      'Date': '',
      'Description': 'TOTAL',
      'Reference': '',
      'Debit (Bill)': summary.totalDebits,
      'Credit (Payment)': summary.totalCredits,
      'Balance': summary.balance,
      'Status': ''
    });

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Account Statement');
    XLSX.writeFile(wb, `${selectedSupplier.name}_Ledger_${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
  };

  const exportToPDF = () => {
    if (!selectedSupplier || ledgerEntries.length === 0) return;

    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    
    // Header
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text('ACCOUNT STATEMENT', pageWidth / 2, 20, { align: 'center' });
    
    doc.setFontSize(12);
    doc.text(selectedSupplier.name, pageWidth / 2, 30, { align: 'center' });
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Generated: ${format(new Date(), 'dd/MM/yyyy')}`, pageWidth / 2, 38, { align: 'center' });

    // Summary Box
    doc.setFillColor(240, 240, 240);
    doc.rect(14, 45, pageWidth - 28, 25, 'F');
    doc.setFontSize(10);
    doc.text(`Total Bills: ${formatCurrency(summary.totalDebits)}`, 20, 55);
    doc.text(`Total Paid: ${formatCurrency(summary.totalCredits)}`, 80, 55);
    doc.text(`Balance Due: ${formatCurrency(summary.balance)}`, 140, 55);

    // Table headers
    let y = 80;
    doc.setFillColor(33, 37, 41);
    doc.setTextColor(255, 255, 255);
    doc.rect(14, y - 5, pageWidth - 28, 8, 'F');
    doc.setFontSize(9);
    doc.text('Date', 16, y);
    doc.text('Description', 40, y);
    doc.text('Reference', 95, y);
    doc.text('Debit', 130, y);
    doc.text('Credit', 155, y);
    doc.text('Balance', 180, y);

    // Table rows
    doc.setTextColor(0, 0, 0);
    y += 10;
    
    ledgerEntries.forEach((entry, index) => {
      if (y > 270) {
        doc.addPage();
        y = 20;
      }
      
      if (index % 2 === 0) {
        doc.setFillColor(248, 249, 250);
        doc.rect(14, y - 4, pageWidth - 28, 7, 'F');
      }
      
      doc.setFontSize(8);
      doc.text(entry.date || '-', 16, y);
      doc.text(entry.description.substring(0, 30), 40, y);
      doc.text(entry.reference.substring(0, 20), 95, y);
      doc.text(entry.type === 'debit' ? formatCurrency(entry.amount) : '-', 130, y);
      doc.text(entry.type === 'credit' ? formatCurrency(entry.amount) : '-', 155, y);
      doc.text(formatCurrency(entry.balance), 180, y);
      
      y += 7;
    });

    doc.save(`${selectedSupplier.name}_Statement_${format(new Date(), 'yyyy-MM-dd')}.pdf`);
  };

  return (
    <Dialog open onOpenChange={() => onClose()}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-cyan" />
            <span className="bg-gradient-to-r from-cyan to-purple bg-clip-text text-transparent">
              Supplier A/C Ledger & Account Statement
            </span>
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-4">
          {/* Supplier Selection & Filters */}
          <div className="flex flex-wrap gap-4 items-end">
            <div className="flex-1 min-w-[200px]">
              <label className="text-sm font-medium mb-1.5 block text-muted-foreground">Select Supplier</label>
              <Select
                value={selectedSupplierId?.toString() || ''}
                onValueChange={(val) => setSelectedSupplierId(Number(val))}
              >
                <SelectTrigger className="glass-subtle">
                  <SelectValue placeholder="Choose a supplier..." />
                </SelectTrigger>
                <SelectContent>
                  {suppliers.map(supplier => (
                    <SelectItem key={supplier.id} value={supplier.id.toString()}>
                      {supplier.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-1.5 block text-muted-foreground">From Date</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className={cn("w-[140px] justify-start text-left font-normal glass-subtle", !dateFrom && "text-muted-foreground")}>
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dateFrom ? format(dateFrom, "dd/MM/yy") : "Start"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar mode="single" selected={dateFrom} onSelect={setDateFrom} />
                </PopoverContent>
              </Popover>
            </div>

            <div>
              <label className="text-sm font-medium mb-1.5 block text-muted-foreground">To Date</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className={cn("w-[140px] justify-start text-left font-normal glass-subtle", !dateTo && "text-muted-foreground")}>
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dateTo ? format(dateTo, "dd/MM/yy") : "End"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar mode="single" selected={dateTo} onSelect={setDateTo} />
                </PopoverContent>
              </Popover>
            </div>

            {(dateFrom || dateTo) && (
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => { setDateFrom(undefined); setDateTo(undefined); }}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4 mr-1" />
                Clear
              </Button>
            )}

            {selectedSupplier && (
              <div className="flex gap-2 ml-auto">
                <Button variant="outline" onClick={exportToExcel} className="glass-subtle">
                  <Download className="h-4 w-4 mr-2" />
                  Excel
                </Button>
                <Button variant="outline" onClick={exportToPDF} className="glass-subtle">
                  <FileText className="h-4 w-4 mr-2" />
                  PDF
                </Button>
              </div>
            )}
          </div>

          {selectedSupplier ? (
            <>
              {/* Summary Cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card className="glass-strong border-0">
                  <CardContent className="pt-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-gradient-to-r from-pink/20 to-destructive/20">
                        <TrendingUp className="h-4 w-4 text-pink" />
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Total Bills</p>
                        <p className="text-lg font-bold text-pink">{formatCurrency(summary.totalDebits)}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="glass-strong border-0">
                  <CardContent className="pt-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-gradient-to-r from-emerald/20 to-teal/20">
                        <TrendingDown className="h-4 w-4 text-emerald" />
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Total Paid</p>
                        <p className="text-lg font-bold text-emerald">{formatCurrency(summary.totalCredits)}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="glass-strong border-0">
                  <CardContent className="pt-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-gradient-to-r from-gold/20 to-orange/20">
                        <CreditCard className="h-4 w-4 text-gold" />
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Balance Due</p>
                        <p className="text-lg font-bold text-gold">{formatCurrency(summary.balance)}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="glass-strong border-0">
                  <CardContent className="pt-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-gradient-to-r from-cyan/20 to-purple/20">
                        <Clock className="h-4 w-4 text-cyan" />
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Pending Bills</p>
                        <p className="text-lg font-bold text-cyan">{summary.pendingPOs}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Tabs for Ledger and Pending Bills */}
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="glass-subtle">
                  <TabsTrigger value="ledger">Account Statement</TabsTrigger>
                  <TabsTrigger value="pending">Pending Bills ({pendingBills.length})</TabsTrigger>
                  <TabsTrigger value="payments">Payment History ({supplierPayments.length})</TabsTrigger>
                </TabsList>

                <TabsContent value="ledger" className="mt-4">
                  <Card className="glass-strong border-0">
                    <CardContent className="p-0">
                      {ledgerEntries.length > 0 ? (
                        <div className="overflow-x-auto">
                          <Table>
                            <TableHeader>
                              <TableRow className="border-border/50">
                                <TableHead className="w-[100px]">Date</TableHead>
                                <TableHead>Description</TableHead>
                                <TableHead>Reference</TableHead>
                                <TableHead className="text-right">Debit (Bill)</TableHead>
                                <TableHead className="text-right">Credit (Paid)</TableHead>
                                <TableHead className="text-right">Balance</TableHead>
                                <TableHead className="w-[100px]">Status</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {ledgerEntries.map((entry) => (
                                <TableRow key={entry.id} className="border-border/30">
                                  <TableCell className="font-medium text-sm">{entry.date || '-'}</TableCell>
                                  <TableCell>
                                    <div className="flex items-center gap-2">
                                      {entry.type === 'debit' ? (
                                        <ArrowUpRight className="h-4 w-4 text-pink" />
                                      ) : (
                                        <ArrowDownLeft className="h-4 w-4 text-emerald" />
                                      )}
                                      <span className="text-sm">{entry.description}</span>
                                    </div>
                                  </TableCell>
                                  <TableCell className="text-sm text-muted-foreground">{entry.reference}</TableCell>
                                  <TableCell className="text-right font-medium text-pink">
                                    {entry.type === 'debit' ? formatCurrency(entry.amount) : '-'}
                                  </TableCell>
                                  <TableCell className="text-right font-medium text-emerald">
                                    {entry.type === 'credit' ? formatCurrency(entry.amount) : '-'}
                                  </TableCell>
                                  <TableCell className={cn(
                                    "text-right font-bold",
                                    entry.balance > 0 ? "text-gold" : "text-emerald"
                                  )}>
                                    {formatCurrency(entry.balance)}
                                  </TableCell>
                                  <TableCell>
                                    <Badge variant="outline" className={cn(
                                      "text-xs",
                                      entry.status === 'Completed' || entry.status === 'Received' 
                                        ? "border-emerald/50 text-emerald" 
                                        : entry.status === 'Pending'
                                          ? "border-gold/50 text-gold"
                                          : "border-muted-foreground/50"
                                    )}>
                                      {entry.status}
                                    </Badge>
                                  </TableCell>
                                </TableRow>
                              ))}
                              {/* Totals Row */}
                              <TableRow className="bg-muted/30 font-bold border-t-2 border-border">
                                <TableCell colSpan={3} className="text-right">TOTALS</TableCell>
                                <TableCell className="text-right text-pink">{formatCurrency(summary.totalDebits)}</TableCell>
                                <TableCell className="text-right text-emerald">{formatCurrency(summary.totalCredits)}</TableCell>
                                <TableCell className="text-right text-gold">{formatCurrency(summary.balance)}</TableCell>
                                <TableCell></TableCell>
                              </TableRow>
                            </TableBody>
                          </Table>
                        </div>
                      ) : (
                        <div className="py-12 text-center text-muted-foreground">
                          <FileText className="h-12 w-12 mx-auto mb-4 opacity-30" />
                          <p>No transactions found for this supplier</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="pending" className="mt-4">
                  <Card className="glass-strong border-0">
                    <CardContent className="p-0">
                      {pendingBills.length > 0 ? (
                        <div className="overflow-x-auto">
                          <Table>
                            <TableHeader>
                              <TableRow className="border-border/50">
                                <TableHead>PO/GRN Number</TableHead>
                                <TableHead>Date</TableHead>
                                <TableHead>Type</TableHead>
                                <TableHead className="text-right">Bill Amount</TableHead>
                                <TableHead className="text-right">Paid</TableHead>
                                <TableHead className="text-right">Pending</TableHead>
                                <TableHead>Due Date</TableHead>
                                <TableHead>Status</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {pendingBills.map((bill) => {
                                const isOverdue = bill.paymentDueDate && new Date(bill.paymentDueDate) < new Date();
                                return (
                                  <TableRow key={bill.id} className="border-border/30">
                                    <TableCell className="font-medium">
                                      <div>
                                        <span className="text-sm">PO: {bill.poNumber}</span>
                                        {bill.grnNumber && (
                                          <span className="block text-xs text-muted-foreground">GRN: {bill.grnNumber}</span>
                                        )}
                                      </div>
                                    </TableCell>
                                    <TableCell className="text-sm">{bill.grnDate || bill.orderDate}</TableCell>
                                    <TableCell>
                                      <Badge variant="outline" className="text-xs">
                                        {bill.poType}
                                      </Badge>
                                    </TableCell>
                                    <TableCell className="text-right font-medium">{formatCurrency(bill.totalAmount)}</TableCell>
                                    <TableCell className="text-right text-emerald">{formatCurrency(bill.paidAmount)}</TableCell>
                                    <TableCell className="text-right font-bold text-gold">{formatCurrency(bill.pendingAmount)}</TableCell>
                                    <TableCell>
                                      {bill.paymentDueDate ? (
                                        <span className={cn("text-sm", isOverdue && "text-destructive font-medium")}>
                                          {bill.paymentDueDate}
                                          {isOverdue && <AlertCircle className="h-3 w-3 inline ml-1" />}
                                        </span>
                                      ) : '-'}
                                    </TableCell>
                                    <TableCell>
                                      <Badge className={cn(
                                        "text-xs",
                                        bill.paymentStatus === 'Paid' 
                                          ? "bg-emerald/20 text-emerald border-emerald/30" 
                                          : bill.paymentStatus === 'Partial'
                                            ? "bg-cyan/20 text-cyan border-cyan/30"
                                            : bill.paymentStatus === 'Overdue' || isOverdue
                                              ? "bg-destructive/20 text-destructive border-destructive/30"
                                              : "bg-gold/20 text-gold border-gold/30"
                                      )}>
                                        {isOverdue && bill.paymentStatus !== 'Overdue' ? 'Overdue' : bill.paymentStatus}
                                      </Badge>
                                    </TableCell>
                                  </TableRow>
                                );
                              })}
                            </TableBody>
                          </Table>
                        </div>
                      ) : (
                        <div className="py-12 text-center text-muted-foreground">
                          <CheckCircle2 className="h-12 w-12 mx-auto mb-4 text-emerald opacity-50" />
                          <p>All bills are paid!</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="payments" className="mt-4">
                  <Card className="glass-strong border-0">
                    <CardContent className="p-0">
                      {supplierPayments.length > 0 ? (
                        <div className="overflow-x-auto">
                          <Table>
                            <TableHeader>
                              <TableRow className="border-border/50">
                                <TableHead>Date</TableHead>
                                <TableHead>Amount</TableHead>
                                <TableHead>Method</TableHead>
                                <TableHead>Reference</TableHead>
                                <TableHead>Linked PO</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Notes</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {supplierPayments.map((payment) => (
                                <TableRow key={payment.id} className="border-border/30">
                                  <TableCell className="font-medium">{payment.payment_date}</TableCell>
                                  <TableCell className="font-bold text-emerald">{formatCurrency(payment.amount)}</TableCell>
                                  <TableCell>{payment.payment_method || '-'}</TableCell>
                                  <TableCell className="text-sm text-muted-foreground">
                                    {payment.utr_number && <div>UTR: {payment.utr_number}</div>}
                                    {payment.reference_number && <div>Ref: {payment.reference_number}</div>}
                                    {payment.bank_reference && <div>Bank: {payment.bank_reference}</div>}
                                  </TableCell>
                                  <TableCell>
                                    {payment.po_number ? (
                                      <Badge variant="outline" className="text-xs">
                                        PO #{payment.po_number}
                                      </Badge>
                                    ) : '-'}
                                  </TableCell>
                                  <TableCell>
                                    <Badge className={cn(
                                      "text-xs",
                                      payment.status === 'Completed' 
                                        ? "bg-emerald/20 text-emerald border-emerald/30" 
                                        : "bg-gold/20 text-gold border-gold/30"
                                    )}>
                                      {payment.status}
                                    </Badge>
                                  </TableCell>
                                  <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">
                                    {payment.notes || '-'}
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      ) : (
                        <div className="py-12 text-center text-muted-foreground">
                          <CreditCard className="h-12 w-12 mx-auto mb-4 opacity-30" />
                          <p>No payment records found</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            </>
          ) : (
            <Card className="glass-strong border-0">
              <CardContent className="py-16 text-center">
                <Building2 className="h-16 w-16 mx-auto mb-4 text-muted-foreground/30" />
                <h3 className="text-lg font-medium mb-2">Select a Supplier</h3>
                <p className="text-muted-foreground">Choose a supplier from the dropdown above to view their account ledger and statement</p>
              </CardContent>
            </Card>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
