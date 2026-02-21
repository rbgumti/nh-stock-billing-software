import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { 
  ArrowDownCircle, 
  ArrowUpCircle, 
  Package, 
  User, 
  Calendar, 
  FileText,
  TrendingUp,
  TrendingDown,
  Download,
  Filter
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { createWorkbook, addJsonSheet, writeFile } from "@/lib/excelUtils";
import { StockItem } from "@/hooks/useStockStore";

interface StockLedgerProps {
  stockItem: StockItem;
  onClose: () => void;
}

interface LedgerEntry {
  id: string;
  date: string;
  type: 'IN' | 'OUT';
  quantity: number;
  balance: number;
  reference: string;
  referenceType: 'GRN' | 'Invoice' | 'Adjustment' | 'Opening';
  details: {
    patientName?: string;
    patientPhone?: string;
    supplier?: string;
    poNumber?: string;
    grnNumber?: string;
    invoiceNumber?: string;
    batchNo?: string;
  };
}

export function StockLedger({ stockItem, onClose }: StockLedgerProps) {
  const [ledgerEntries, setLedgerEntries] = useState<LedgerEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateFrom, setDateFrom] = useState(() => {
    const d = new Date();
    d.setMonth(d.getMonth() - 1);
    return d.toISOString().split('T')[0];
  });
  const [dateTo, setDateTo] = useState(() => new Date().toISOString().split('T')[0]);
  const [filterType, setFilterType] = useState<'all' | 'IN' | 'OUT'>('all');

  useEffect(() => {
    loadLedgerData();
  }, [stockItem.id, dateFrom, dateTo]);

  const loadLedgerData = async () => {
    setLoading(true);
    try {
      const entries: LedgerEntry[] = [];

      // 1. Get stock issued to patients (from invoice_items)
      const { data: invoiceItems, error: invoiceError } = await supabase
        .from('invoice_items')
        .select(`
          id,
          quantity,
          batch_no,
          created_at,
          invoice_id,
          invoices (
            invoice_number,
            invoice_date,
            patient_name,
            patient_phone
          )
        `)
        .eq('medicine_id', stockItem.id)
        .gte('created_at', `${dateFrom}T00:00:00`)
        .lte('created_at', `${dateTo}T23:59:59`)
        .order('created_at', { ascending: true });

      if (!invoiceError && invoiceItems) {
        invoiceItems.forEach((item: any) => {
          const invoice = item.invoices;
          entries.push({
            id: item.id,
            date: invoice?.invoice_date || item.created_at?.split('T')[0] || '',
            type: 'OUT',
            quantity: item.quantity,
            balance: 0, // Will calculate later
            reference: invoice?.invoice_number || item.invoice_id,
            referenceType: 'Invoice',
            details: {
              patientName: invoice?.patient_name,
              patientPhone: invoice?.patient_phone,
              invoiceNumber: invoice?.invoice_number,
              batchNo: item.batch_no
            }
          });
        });
      }

      // 2. Get stock received (from purchase_order_items where PO is received)
      const { data: poItems, error: poError } = await supabase
        .from('purchase_order_items')
        .select(`
          id,
          qty_in_tabs,
          quantity,
          created_at,
          purchase_orders (
            id,
            po_number,
            grn_number,
            grn_date,
            supplier,
            status,
            order_date
          )
        `)
        .eq('stock_item_id', stockItem.id)
        .order('created_at', { ascending: true });

      if (!poError && poItems) {
        poItems.forEach((item: any) => {
          const po = item.purchase_orders;
          // Only include if PO is received (has GRN)
          if (po?.status === 'Received' && po?.grn_date) {
            const grnDate = po.grn_date;
            // Check if within date range
            if (grnDate >= dateFrom && grnDate <= dateTo) {
              // Use qty_in_tabs as primary (tab-based), fallback to quantity
              const tabQty = item.qty_in_tabs || item.quantity || 0;
              entries.push({
                id: `grn-${item.id}`,
                date: grnDate,
                type: 'IN',
                quantity: tabQty,
                balance: 0, // Will calculate later
                reference: po.grn_number || po.po_number,
                referenceType: 'GRN',
                details: {
                  supplier: po.supplier,
                  poNumber: po.po_number,
                  grnNumber: po.grn_number
                }
              });
            }
          }
        });
      }

      // Sort entries by date
      entries.sort((a, b) => {
        const dateA = new Date(a.date).getTime();
        const dateB = new Date(b.date).getTime();
        if (dateA === dateB) {
          // If same date, put IN before OUT
          return a.type === 'IN' ? -1 : 1;
        }
        return dateA - dateB;
      });

      // Calculate running balance
      let runningBalance = stockItem.currentStock;
      
      // First, calculate what the opening balance should have been
      // by reversing all the transactions
      for (let i = entries.length - 1; i >= 0; i--) {
        if (entries[i].type === 'OUT') {
          runningBalance += entries[i].quantity;
        } else {
          runningBalance -= entries[i].quantity;
        }
      }

      // Now calculate forward with running balance
      const openingBalance = runningBalance;
      for (let i = 0; i < entries.length; i++) {
        if (entries[i].type === 'IN') {
          runningBalance += entries[i].quantity;
        } else {
          runningBalance -= entries[i].quantity;
        }
        entries[i].balance = runningBalance;
      }

      // Add opening balance entry at the start
      if (entries.length > 0) {
        entries.unshift({
          id: 'opening',
          date: dateFrom,
          type: 'IN',
          quantity: openingBalance,
          balance: openingBalance,
          reference: 'Opening Balance',
          referenceType: 'Opening',
          details: {}
        });
      }

      setLedgerEntries(entries);
    } catch (error) {
      console.error('Error loading ledger data:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredEntries = ledgerEntries.filter(entry => {
    if (filterType === 'all') return true;
    return entry.type === filterType;
  });

  const totalIn = ledgerEntries
    .filter(e => e.type === 'IN' && e.referenceType !== 'Opening')
    .reduce((sum, e) => sum + e.quantity, 0);
  
  const totalOut = ledgerEntries
    .filter(e => e.type === 'OUT')
    .reduce((sum, e) => sum + e.quantity, 0);

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      });
    } catch {
      return dateStr;
    }
  };

  const exportToExcel = async () => {
    const exportData = filteredEntries.map(entry => ({
      'Date': formatDate(entry.date),
      'Type': entry.referenceType === 'Opening' ? 'Opening' : entry.type,
      'Reference': entry.reference,
      'Reference Type': entry.referenceType,
      'Patient/Supplier': entry.details.patientName || entry.details.supplier || '-',
      'Phone': entry.details.patientPhone || '-',
      'PO Number': entry.details.poNumber || '-',
      'GRN Number': entry.details.grnNumber || '-',
      'In Qty': entry.type === 'IN' ? entry.quantity : '',
      'Out Qty': entry.type === 'OUT' ? entry.quantity : '',
      'Balance': entry.balance
    }));

    const wb = createWorkbook();
    addJsonSheet(wb, exportData, 'Stock Ledger', [
      { wch: 12 }, { wch: 8 }, { wch: 15 }, { wch: 12 }, { wch: 25 },
      { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 8 }, { wch: 8 }, { wch: 10 },
    ]);

    const fileName = `Stock_Ledger_${stockItem.name.replace(/\s+/g, '_')}_${dateFrom}_to_${dateTo}.xlsx`;
    await writeFile(wb, fileName);
  };

  const exportFullLedgerToExcel = () => {
    // Export with the current date range (already filterable in UI)
    exportToExcel();
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <Package className="h-6 w-6 text-primary" />
            Stock Ledger: {stockItem.name}
          </DialogTitle>
        </DialogHeader>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 py-4">
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Current Stock</p>
                  <p className="text-2xl font-bold">{stockItem.currentStock}</p>
                </div>
                <Package className="h-8 w-8 text-primary" />
              </div>
            </CardContent>
          </Card>
          
          <Card className="border-l-4 border-l-green-500">
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Received</p>
                  <p className="text-2xl font-bold text-green-600">+{totalIn}</p>
                </div>
                <TrendingUp className="h-8 w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-red-500">
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Issued</p>
                  <p className="text-2xl font-bold text-red-600">-{totalOut}</p>
                </div>
                <TrendingDown className="h-8 w-8 text-red-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Transactions</p>
                  <p className="text-2xl font-bold">{ledgerEntries.length - 1}</p>
                </div>
                <FileText className="h-8 w-8 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-4 items-end border-b pb-4">
          <div className="space-y-1">
            <Label>From Date</Label>
            <Input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="w-40"
            />
          </div>
          <div className="space-y-1">
            <Label>To Date</Label>
            <Input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="w-40"
            />
          </div>
          <div className="flex gap-2">
            <Button
              variant={filterType === 'all' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilterType('all')}
            >
              All
            </Button>
            <Button
              variant={filterType === 'IN' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilterType('IN')}
              className="text-green-600"
            >
              <ArrowDownCircle className="h-4 w-4 mr-1" />
              Received
            </Button>
            <Button
              variant={filterType === 'OUT' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilterType('OUT')}
              className="text-red-600"
            >
              <ArrowUpCircle className="h-4 w-4 mr-1" />
              Issued
            </Button>
          </div>
          <div className="ml-auto">
            <Button
              variant="outline"
              size="sm"
              onClick={exportToExcel}
              disabled={filteredEntries.length === 0}
            >
              <Download className="h-4 w-4 mr-2" />
              Export Excel
            </Button>
          </div>
        </div>

        {/* Ledger Table */}
        <div className="flex-1 overflow-auto">
          {loading ? (
            <div className="flex items-center justify-center h-48">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : (
            <Table>
              <TableHeader className="sticky top-0 bg-background z-10">
                <TableRow>
                  <TableHead className="w-24">Date</TableHead>
                  <TableHead className="w-20">Type</TableHead>
                  <TableHead>Reference</TableHead>
                  <TableHead>Details</TableHead>
                  <TableHead className="text-right w-20">In</TableHead>
                  <TableHead className="text-right w-20">Out</TableHead>
                  <TableHead className="text-right w-24">Balance</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredEntries.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      No transactions found for the selected period
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredEntries.map((entry) => (
                    <TableRow 
                      key={entry.id} 
                      className={entry.referenceType === 'Opening' ? 'bg-muted/50 font-medium' : ''}
                    >
                      <TableCell className="font-medium">
                        {formatDate(entry.date)}
                      </TableCell>
                      <TableCell>
                        {entry.referenceType === 'Opening' ? (
                          <Badge variant="secondary">Opening</Badge>
                        ) : entry.type === 'IN' ? (
                          <Badge className="bg-green-500 hover:bg-green-600">
                            <ArrowDownCircle className="h-3 w-3 mr-1" />
                            IN
                          </Badge>
                        ) : (
                          <Badge className="bg-red-500 hover:bg-red-600">
                            <ArrowUpCircle className="h-3 w-3 mr-1" />
                            OUT
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-medium">{entry.reference}</span>
                          <span className="text-xs text-muted-foreground">
                            {entry.referenceType}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {entry.referenceType === 'Invoice' && entry.details.patientName && (
                          <div className="flex items-start gap-2">
                            <User className="h-4 w-4 text-muted-foreground mt-0.5" />
                            <div className="flex flex-col">
                              <span className="font-medium">{entry.details.patientName}</span>
                              {entry.details.patientPhone && (
                                <span className="text-xs text-muted-foreground">
                                  {entry.details.patientPhone}
                                </span>
                              )}
                            </div>
                          </div>
                        )}
                        {entry.referenceType === 'GRN' && entry.details.supplier && (
                          <div className="flex flex-col">
                            <span className="font-medium">{entry.details.supplier}</span>
                            {entry.details.poNumber && (
                              <span className="text-xs text-muted-foreground">
                                PO: {entry.details.poNumber}
                              </span>
                            )}
                          </div>
                        )}
                        {entry.referenceType === 'Opening' && (
                          <span className="text-muted-foreground">Opening stock for period</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right font-medium text-green-600">
                        {entry.type === 'IN' && entry.referenceType !== 'Opening' ? `+${entry.quantity}` : ''}
                        {entry.referenceType === 'Opening' ? entry.quantity : ''}
                      </TableCell>
                      <TableCell className="text-right font-medium text-red-600">
                        {entry.type === 'OUT' ? `-${entry.quantity}` : ''}
                      </TableCell>
                      <TableCell className="text-right font-bold">
                        {entry.balance}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-between items-center pt-4 border-t">
          <div className="text-sm text-muted-foreground">
            Showing {filteredEntries.length} entries
          </div>
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
