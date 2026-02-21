import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Package,
  Search,
  TrendingUp,
  TrendingDown,
  ArrowDownCircle,
  ArrowUpCircle,
  Download,
  BookOpen,
  ShoppingCart,
  Users,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { formatNumber } from "@/lib/formatUtils";
import { StockLedger } from "@/components/StockLedger";
import { StockItem } from "@/hooks/useStockStore";
import * as XLSX from "xlsx";

interface StockMovementSummary {
  itemId: number;
  name: string;
  category: string;
  currentStock: number;
  batchNo: string | null;
  totalIn: number;
  totalOut: number;
  unitPrice: number;
  mrp: number | null;
  supplier: string | null;
}

export default function StockLedgerReport() {
  const [movements, setMovements] = useState<StockMovementSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [dateFrom, setDateFrom] = useState(() => {
    const d = new Date();
    d.setMonth(d.getMonth() - 1);
    return d.toISOString().split("T")[0];
  });
  const [dateTo, setDateTo] = useState(
    () => new Date().toISOString().split("T")[0]
  );
  const [selectedItem, setSelectedItem] = useState<StockItem | null>(null);

  useEffect(() => {
    loadMovements();
  }, [dateFrom, dateTo]);

  const loadMovements = async () => {
    setLoading(true);
    try {
      // Fetch all stock items
      const { data: stockItems, error: stockError } = await supabase
        .from("stock_items")
        .select("*")
        .order("name");

      if (stockError) throw stockError;

      // Fetch all invoice items (OUT) in date range
      const { data: invoiceItems, error: invError } = await supabase
        .from("invoice_items")
        .select("medicine_id, stock_item_id, quantity, created_at")
        .gte("created_at", `${dateFrom}T00:00:00`)
        .lte("created_at", `${dateTo}T23:59:59`);

      if (invError) throw invError;

      // Fetch all PO items (IN) where PO is received, in date range
      const { data: poItems, error: poError } = await supabase
        .from("purchase_order_items")
        .select(
          "stock_item_id, qty_in_tabs, quantity, purchase_orders!inner(status, grn_date)"
        )
        .eq("purchase_orders.status", "Received");

      if (poError) throw poError;

      // Build movement map
      const movementMap = new Map<number, { totalIn: number; totalOut: number }>();

      // Process OUT movements
      (invoiceItems || []).forEach((item: any) => {
        const id = item.medicine_id || item.stock_item_id;
        if (!id) return;
        const existing = movementMap.get(id) || { totalIn: 0, totalOut: 0 };
        existing.totalOut += item.quantity || 0;
        movementMap.set(id, existing);
      });

      // Process IN movements
      (poItems || []).forEach((item: any) => {
        const id = item.stock_item_id;
        if (!id) return;
        const po = item.purchase_orders;
        if (!po?.grn_date) return;
        const grnDate = po.grn_date.split("T")[0];
        if (grnDate < dateFrom || grnDate > dateTo) return;
        const existing = movementMap.get(id) || { totalIn: 0, totalOut: 0 };
        existing.totalIn += item.qty_in_tabs || item.quantity || 0;
        movementMap.set(id, existing);
      });

      // Build summary
      const summaries: StockMovementSummary[] = (stockItems || []).map(
        (item: any) => {
          const movement = movementMap.get(item.item_id) || {
            totalIn: 0,
            totalOut: 0,
          };
          return {
            itemId: item.item_id,
            name: item.name,
            category: item.category,
            currentStock: item.current_stock,
            batchNo: item.batch_no,
            totalIn: movement.totalIn,
            totalOut: movement.totalOut,
            unitPrice: item.unit_price,
            mrp: item.mrp,
            supplier: item.supplier,
          };
        }
      );

      setMovements(summaries);
    } catch (error) {
      console.error("Error loading stock movements:", error);
    } finally {
      setLoading(false);
    }
  };

  const filtered = movements.filter(
    (m) =>
      m.name.toLowerCase().includes(search.toLowerCase()) ||
      m.category.toLowerCase().includes(search.toLowerCase()) ||
      (m.supplier || "").toLowerCase().includes(search.toLowerCase())
  );

  // Only show items that have movement or stock
  const activeItems = filtered.filter(
    (m) => m.totalIn > 0 || m.totalOut > 0 || m.currentStock > 0
  );

  const totalReceived = activeItems.reduce((s, m) => s + m.totalIn, 0);
  const totalIssued = activeItems.reduce((s, m) => s + m.totalOut, 0);
  const totalStockValue = activeItems.reduce(
    (s, m) => s + m.currentStock * (m.mrp || m.unitPrice),
    0
  );
  const itemsWithMovement = activeItems.filter(
    (m) => m.totalIn > 0 || m.totalOut > 0
  ).length;

  const exportToExcel = () => {
    const data = activeItems.map((m) => ({
      "Medicine Name": m.name,
      Category: m.category,
      "Batch No": m.batchNo || "-",
      Supplier: m.supplier || "-",
      "Current Stock": m.currentStock,
      "Total Received": m.totalIn,
      "Total Issued": m.totalOut,
      "MRP (₹)": m.mrp || m.unitPrice,
      "Stock Value (₹)": m.currentStock * (m.mrp || m.unitPrice),
    }));
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(data);
    ws["!cols"] = [
      { wch: 30 },
      { wch: 10 },
      { wch: 12 },
      { wch: 20 },
      { wch: 12 },
      { wch: 14 },
      { wch: 12 },
      { wch: 10 },
      { wch: 14 },
    ];
    XLSX.utils.book_append_sheet(wb, ws, "Stock Ledger");
    XLSX.writeFile(
      wb,
      `Stock_Ledger_${dateFrom}_to_${dateTo}.xlsx`
    );
  };

  const getCategoryColor = (cat: string) => {
    switch (cat) {
      case "BNX":
        return "bg-blue-500/10 text-blue-700 border-blue-500/30";
      case "TPN":
        return "bg-amber-500/10 text-amber-700 border-amber-500/30";
      case "PSHY":
        return "bg-purple-500/10 text-purple-700 border-purple-500/30";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  const handleOpenLedger = (item: StockMovementSummary) => {
    setSelectedItem({
      id: item.itemId,
      name: item.name,
      category: item.category,
      currentStock: item.currentStock,
      batchNo: item.batchNo || "",
      unitPrice: item.unitPrice,
      minimumStock: 10,
      supplier: item.supplier || "",
      mrp: item.mrp || 0,
      expiryDate: "",
      packing: "",
      composition: "",
      status: "Active",
    });
  };

  return (
    <>
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Stock Ledger</h2>
        <Button onClick={exportToExcel} disabled={activeItems.length === 0}>
          <Download className="h-4 w-4 mr-2" />
          Export Excel
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border-l-4 border-l-primary">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Items with Movement</p>
                <p className="text-2xl font-bold">{itemsWithMovement}</p>
              </div>
              <ShoppingCart className="h-8 w-8 text-primary" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-green-500">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Received</p>
                <p className="text-2xl font-bold text-green-600">+{totalReceived}</p>
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
                <p className="text-2xl font-bold text-red-600">-{totalIssued}</p>
              </div>
              <TrendingDown className="h-8 w-8 text-red-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-amber-500">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Stock Value</p>
                <p className="text-2xl font-bold">₹{formatNumber(totalStockValue)}</p>
              </div>
              <Package className="h-8 w-8 text-amber-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4 items-end">
        <div className="space-y-1 flex-1 min-w-[200px]">
          <Label>Search Medicine</Label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name, category, or supplier..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>
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
      </div>

      {/* Ledger Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5" />
            Stock Movement Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center h-48">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </div>
          ) : (
            <div className="overflow-auto max-h-[500px]">
              <Table>
                <TableHeader className="sticky top-0 bg-background z-10">
                  <TableRow>
                    <TableHead>Medicine</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Supplier</TableHead>
                    <TableHead className="text-right">Current Stock</TableHead>
                    <TableHead className="text-right">Received</TableHead>
                    <TableHead className="text-right">Issued</TableHead>
                    <TableHead className="text-right">MRP (₹)</TableHead>
                    <TableHead className="text-center">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {activeItems.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={8}
                        className="text-center py-12 text-muted-foreground"
                      >
                        <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p className="text-lg">No stock movements found</p>
                        <p className="text-sm">
                          Try adjusting the date range or search
                        </p>
                      </TableCell>
                    </TableRow>
                  ) : (
                    activeItems.map((item) => (
                      <TableRow
                        key={item.itemId}
                        className="hover:bg-muted/50 cursor-pointer"
                        onClick={() => handleOpenLedger(item)}
                      >
                        <TableCell>
                          <div>
                            <p className="font-medium">{item.name}</p>
                            {item.batchNo && (
                              <p className="text-xs text-muted-foreground">
                                Batch: {item.batchNo}
                              </p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={getCategoryColor(item.category)}
                          >
                            {item.category}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm">
                          {item.supplier || "-"}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {item.currentStock}
                        </TableCell>
                        <TableCell className="text-right">
                          {item.totalIn > 0 ? (
                            <span className="text-green-600 font-medium flex items-center justify-end gap-1">
                              <ArrowDownCircle className="h-3 w-3" />+
                              {item.totalIn}
                            </span>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          {item.totalOut > 0 ? (
                            <span className="text-red-600 font-medium flex items-center justify-end gap-1">
                              <ArrowUpCircle className="h-3 w-3" />-
                              {item.totalOut}
                            </span>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          ₹{formatNumber(item.mrp || item.unitPrice)}
                        </TableCell>
                        <TableCell className="text-center">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenLedger(item);
                            }}
                          >
                            <BookOpen className="h-4 w-4 mr-1" />
                            View
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Detailed Ledger Dialog */}
      {selectedItem && (
        <StockLedger
          stockItem={selectedItem}
          onClose={() => setSelectedItem(null)}
        />
      )}
    </>
  );
}
