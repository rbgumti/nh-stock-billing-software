import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { TrendingUp, Loader2, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { formatNumber } from "@/lib/formatUtils";
import { createWorkbook, addAoaSheet, writeFile } from "@/lib/excelUtils";
import { toast } from "sonner";

interface MonthlyBrandData {
  month: string; // "Jan 2025"
  monthKey: string; // "2025-01"
  medicines: Record<string, { qty: number; value: number }>;
  totalQty: number;
  totalValue: number;
}

export function BnxMonthlySalesAnalytics() {
  const [loading, setLoading] = useState(false);
  const [year, setYear] = useState(() => new Date().getFullYear().toString());
  const [monthlyData, setMonthlyData] = useState<MonthlyBrandData[]>([]);
  const [medicineNames, setMedicineNames] = useState<string[]>([]);

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 5 }, (_, i) => (currentYear - i).toString());

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      // Get all BNX stock items
      const { data: bnxItems } = await supabase
        .from("stock_items")
        .select("item_id, name, mrp, unit_price")
        .eq("category", "BNX");

      const bnxNameMap: Record<number, { name: string; rate: number }> = {};
      const bnxNamesSet = new Set<string>();
      (bnxItems || []).forEach((item) => {
        const key = item.name.toLowerCase();
        bnxNameMap[item.item_id] = {
          name: item.name,
          rate: item.mrp || item.unit_price || 0,
        };
        bnxNamesSet.add(item.name);
      });

      // Get invoices for the selected year
      const startDate = `${year}-01-01T00:00:00`;
      const endDate = `${year}-12-31T23:59:59.999`;

      const { data: invoices } = await supabase
        .from("invoices")
        .select("id, invoice_date")
        .gte("invoice_date", startDate)
        .lte("invoice_date", endDate);

      const invoiceIds = (invoices || []).map((inv) => inv.id);
      const invoiceMonthMap: Record<string, string> = {};
      (invoices || []).forEach((inv) => {
        const d = new Date(inv.invoice_date);
        const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
        invoiceMonthMap[inv.id] = monthKey;
      });

      // Get invoice items for BNX medicines
      let allInvoiceItems: any[] = [];
      if (invoiceIds.length > 0) {
        // Fetch in batches to avoid query limits
        const batchSize = 500;
        for (let i = 0; i < invoiceIds.length; i += batchSize) {
          const batch = invoiceIds.slice(i, i + batchSize);
          const { data: items } = await supabase
            .from("invoice_items")
            .select("invoice_id, medicine_name, medicine_id, quantity, mrp, unit_price")
            .in("invoice_id", batch);
          if (items) allInvoiceItems.push(...items);
        }
      }

      // Aggregate by month and medicine name
      const monthMap: Record<string, Record<string, { qty: number; value: number }>> = {};
      const allMedicineNames = new Set<string>();

      allInvoiceItems.forEach((item) => {
        const medName = item.medicine_name || "";
        // Check if this is a BNX medicine
        if (!bnxNamesSet.has(medName)) return;

        const monthKey = invoiceMonthMap[item.invoice_id];
        if (!monthKey) return;

        allMedicineNames.add(medName);

        if (!monthMap[monthKey]) monthMap[monthKey] = {};
        if (!monthMap[monthKey][medName]) monthMap[monthKey][medName] = { qty: 0, value: 0 };

        const price = item.mrp || item.unit_price || 0;
        monthMap[monthKey][medName].qty += item.quantity || 0;
        monthMap[monthKey][medName].value += (item.quantity || 0) * price;
      });

      // Build monthly data array
      const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      const result: MonthlyBrandData[] = monthNames.map((name, idx) => {
        const monthKey = `${year}-${String(idx + 1).padStart(2, "0")}`;
        const medicines = monthMap[monthKey] || {};
        const totalQty = Object.values(medicines).reduce((s, m) => s + m.qty, 0);
        const totalValue = Object.values(medicines).reduce((s, m) => s + m.value, 0);
        return {
          month: `${name} ${year}`,
          monthKey,
          medicines,
          totalQty,
          totalValue,
        };
      });

      const sortedNames = Array.from(allMedicineNames).sort();
      setMedicineNames(sortedNames);
      setMonthlyData(result);
    } catch (err: any) {
      console.error("Error loading BNX analytics:", err);
      toast.error("Failed to load BNX analytics");
    } finally {
      setLoading(false);
    }
  }, [year]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Chart data - top medicines by total qty
  const topMedicines = [...medicineNames]
    .map((name) => ({
      name,
      totalQty: monthlyData.reduce((s, m) => s + (m.medicines[name]?.qty || 0), 0),
      totalValue: monthlyData.reduce((s, m) => s + (m.medicines[name]?.value || 0), 0),
    }))
    .sort((a, b) => b.totalValue - a.totalValue)
    .slice(0, 10);

  const chartData = monthlyData.map((m) => {
    const row: any = { month: m.month.split(" ")[0] };
    topMedicines.forEach((med) => {
      row[med.name] = m.medicines[med.name]?.value || 0;
    });
    return row;
  });

  const colors = [
    "hsl(210, 80%, 55%)", "hsl(340, 75%, 55%)", "hsl(150, 70%, 45%)",
    "hsl(40, 90%, 55%)", "hsl(270, 65%, 55%)", "hsl(180, 60%, 45%)",
    "hsl(20, 85%, 55%)", "hsl(300, 60%, 55%)", "hsl(100, 60%, 45%)",
    "hsl(60, 80%, 50%)",
  ];

  const grandTotalQty = monthlyData.reduce((s, m) => s + m.totalQty, 0);
  const grandTotalValue = monthlyData.reduce((s, m) => s + m.totalValue, 0);

  const exportToExcel = async () => {
    const wb = createWorkbook();
    const headers = ["Month", ...medicineNames.map((n) => `${n} (Qty)`), ...medicineNames.map((n) => `${n} (₹)`), "Total Qty", "Total Value"];
    const rows = monthlyData.map((m) => [
      m.month,
      ...medicineNames.map((n) => m.medicines[n]?.qty || 0),
      ...medicineNames.map((n) => Math.round((m.medicines[n]?.value || 0) * 100) / 100),
      m.totalQty,
      Math.round(m.totalValue * 100) / 100,
    ]);
    rows.push(["TOTAL", ...medicineNames.map((n) => monthlyData.reduce((s, m) => s + (m.medicines[n]?.qty || 0), 0)), ...medicineNames.map((n) => Math.round(monthlyData.reduce((s, m) => s + (m.medicines[n]?.value || 0), 0) * 100) / 100), grandTotalQty, Math.round(grandTotalValue * 100) / 100]);

    addAoaSheet(wb, [headers, ...rows], "BNX Monthly Sales");
    await writeFile(wb, `BNX_Monthly_Sales_${year}.xlsx`);
    toast.success("Exported successfully");
  };

  return (
    <Card className="glass-strong border-0 overflow-hidden">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <CardTitle className="flex items-center gap-2 text-lg">
            <TrendingUp className="h-5 w-5 text-blue-500" />
            BNX Monthly Sales Analytics (Brand-wise)
          </CardTitle>
          <div className="flex items-center gap-2">
            <Select value={year} onValueChange={setYear}>
              <SelectTrigger className="w-28">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {years.map((y) => (
                  <SelectItem key={y} value={y}>{y}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" onClick={exportToExcel} disabled={loading}>
              <Download className="h-4 w-4 mr-1" />
              Excel
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            {/* Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="rounded-lg bg-blue-50 dark:bg-blue-950/30 p-3 text-center">
                <div className="text-xs text-muted-foreground">Total Brands Sold</div>
                <div className="text-xl font-bold text-blue-600">{medicineNames.length}</div>
              </div>
              <div className="rounded-lg bg-green-50 dark:bg-green-950/30 p-3 text-center">
                <div className="text-xs text-muted-foreground">Total Qty Sold</div>
                <div className="text-xl font-bold text-green-600">{grandTotalQty.toLocaleString("en-IN")}</div>
              </div>
              <div className="rounded-lg bg-purple-50 dark:bg-purple-950/30 p-3 text-center">
                <div className="text-xs text-muted-foreground">Total Sale Value</div>
                <div className="text-xl font-bold text-purple-600">₹{formatNumber(grandTotalValue)}</div>
              </div>
              <div className="rounded-lg bg-amber-50 dark:bg-amber-950/30 p-3 text-center">
                <div className="text-xs text-muted-foreground">Avg Monthly Sale</div>
                <div className="text-xl font-bold text-amber-600">₹{formatNumber(grandTotalValue / 12)}</div>
              </div>
            </div>

            {/* Chart - Top 10 medicines by value */}
            {topMedicines.length > 0 && (
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border/30" />
                    <XAxis dataKey="month" className="text-xs" />
                    <YAxis className="text-xs" tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
                    <Tooltip
                      formatter={(value: number, name: string) => [`₹${formatNumber(value)}`, name]}
                      contentStyle={{ background: "hsl(var(--background))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }}
                    />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    {topMedicines.map((med, idx) => (
                      <Bar key={med.name} dataKey={med.name} stackId="a" fill={colors[idx % colors.length]} />
                    ))}
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Detailed Table */}
            <div className="border rounded-lg overflow-auto max-h-96">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="font-bold sticky left-0 bg-muted/50 z-10 min-w-[100px]">Month</TableHead>
                    {medicineNames.map((name) => (
                      <TableHead key={name} className="text-right font-bold text-xs min-w-[90px]">{name}</TableHead>
                    ))}
                    <TableHead className="text-right font-bold min-w-[80px]">Total Qty</TableHead>
                    <TableHead className="text-right font-bold min-w-[100px]">Total Value</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {monthlyData.map((m, idx) => (
                    <TableRow key={m.monthKey} className={idx % 2 === 0 ? "bg-background" : "bg-muted/20"}>
                      <TableCell className="font-medium sticky left-0 bg-inherit z-10">{m.month.split(" ")[0]}</TableCell>
                      {medicineNames.map((name) => {
                        const d = m.medicines[name];
                        return (
                          <TableCell key={name} className="text-right text-xs tabular-nums">
                            {d ? `${d.qty} / ₹${formatNumber(d.value)}` : "-"}
                          </TableCell>
                        );
                      })}
                      <TableCell className="text-right font-semibold">{m.totalQty}</TableCell>
                      <TableCell className="text-right font-semibold">₹{formatNumber(m.totalValue)}</TableCell>
                    </TableRow>
                  ))}
                  {/* Grand Total Row */}
                  <TableRow className="bg-blue-50 dark:bg-blue-950/30 font-bold">
                    <TableCell className="sticky left-0 bg-blue-50 dark:bg-blue-950/30 z-10">TOTAL</TableCell>
                    {medicineNames.map((name) => {
                      const totalQty = monthlyData.reduce((s, m) => s + (m.medicines[name]?.qty || 0), 0);
                      const totalVal = monthlyData.reduce((s, m) => s + (m.medicines[name]?.value || 0), 0);
                      return (
                        <TableCell key={name} className="text-right text-xs tabular-nums">
                          {totalQty > 0 ? `${totalQty} / ₹${formatNumber(totalVal)}` : "-"}
                        </TableCell>
                      );
                    })}
                    <TableCell className="text-right">{grandTotalQty}</TableCell>
                    <TableCell className="text-right">₹{formatNumber(grandTotalValue)}</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
