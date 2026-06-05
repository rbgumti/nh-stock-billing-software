import { useState } from "react";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileUp, Loader2, FileSpreadsheet } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import ExcelJS from "exceljs";
import { supabase } from "@/integrations/supabase/client";

export interface SyncSummary {
  created: number;
  skipped: number;
  worksheet?: string;
  invoiceIds?: string[];
}

interface ParsedWorkbookRow { row: number; medicineName: string; quantities: number[]; rate: number | null; }

interface SyncResult {
  success: boolean;
  worksheet?: string;
  attempted?: number;
  created?: number;
  errors?: Array<{ row: number; position: number; medicine: string; qty: number; reason: string }>;
  created_invoices?: Array<{ row: number; position: number; medicine: string; qty: number; invoice_id?: string; invoice_number: string }>;
  debug?: boolean;
  error?: string;
}



interface Props { onSynced?: (summary: SyncSummary) => void; }

export function FileSyncDialog({ onSynced }: Props) {
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [workbook, setWorkbook] = useState<ExcelJS.Workbook | null>(null);
  const [sheetNames, setSheetNames] = useState<string[]>([]);
  const [worksheetName, setWorksheetName] = useState("");
  const [previewCount, setPreviewCount] = useState<number | null>(null);
  const [patientName, setPatientName] = useState("TEST Test");
  const [loading, setLoading] = useState(false);
  const [debug, setDebug] = useState(true);
  const [result, setResult] = useState<SyncResult | null>(null);

  const TARGET_ROWS = [3, 4, 5, 6, 7, ...Array.from({ length: 22 }, (_, i) => 11 + i)];

  const parseFormulaNumbers = (raw: unknown): number[] => {
    if (raw === null || raw === undefined) return [];
    let s = String(raw).trim();
    if (!s) return [];
    if (s.startsWith("=")) s = s.slice(1);
    if (!/^[\d+\s.]+$/.test(s)) return [];
    return s.split("+").map((t) => Number(t.trim())).filter((n) => Number.isFinite(n) && n > 0);
  };

  const totalFormulaNumbers = (raw: unknown): number | null => {
    const nums = parseFormulaNumbers(raw);
    if (!nums.length) return null;
    return nums.reduce((sum, n) => sum + n, 0);
  };

  const readQty = (raw: unknown): number[] => {
    if (raw === null || raw === undefined) return [];
    if (typeof raw === "number" && Number.isFinite(raw) && raw > 0) return [raw];
    if (typeof raw === "object" && raw !== null) {
      const obj = raw as { formula?: unknown; result?: unknown };
      if ("result" in obj && typeof obj.result === "number" && obj.result > 0) return [obj.result];
      if ("formula" in obj && obj.formula != null) {
        const formulaTotal = totalFormulaNumbers(`=${String(obj.formula)}`);
        if (formulaTotal && formulaTotal > 0) return [formulaTotal];
      }
    }
    const formulaTotal = totalFormulaNumbers(raw);
    return formulaTotal && formulaTotal > 0 ? [formulaTotal] : [];
  };

  const parseSheet = (wb: ExcelJS.Workbook, name: string): ParsedWorkbookRow[] => {
    const ws = wb.getWorksheet(name);
    if (!ws) return [];
    const out: ParsedWorkbookRow[] = [];
    for (const rowNum of TARGET_ROWS) {
      const row = ws.getRow(rowNum);
      const medicineName = String(row.getCell(1).text || row.getCell(1).value || "").trim();
      if (!medicineName) continue;
      const quantities = readQty(row.getCell(5).value);
      if (!quantities.length) continue;
      const rateRaw = row.getCell(9).value;
      let rate: number | null = null;
      if (typeof rateRaw === "number" && Number.isFinite(rateRaw)) rate = rateRaw;
      else if (rateRaw && typeof rateRaw === "object" && "result" in (rateRaw as any) && typeof (rateRaw as any).result === "number") rate = (rateRaw as any).result;
      else { const n = Number(String(rateRaw ?? "").trim()); if (Number.isFinite(n) && n > 0) rate = n; }
      out.push({ row: rowNum, medicineName, quantities, rate });
    }
    return out;
  };

  const onFile = async (f: File | null) => {
    setFile(f);
    setWorkbook(null);
    setSheetNames([]);
    setWorksheetName("");
    setPreviewCount(null);
    setResult(null);
    if (!f) return;
    try {
      const wb = new ExcelJS.Workbook();
      await wb.xlsx.load(await f.arrayBuffer());
      const names = wb.worksheets.map((w) => w.name);
      setWorkbook(wb);
      setSheetNames(names);
      const today = String(new Date().getDate());
      const initial = names.includes(today) ? today : (names[names.length - 1] || "");
      setWorksheetName(initial);
      if (initial) setPreviewCount(parseSheet(wb, initial).reduce((n, r) => n + r.quantities.length, 0));
    } catch (e: unknown) {
      toast({ title: "Cannot read file", description: e instanceof Error ? e.message : String(e), variant: "destructive" });
    }
  };

  const onSheetChange = (name: string) => {
    setWorksheetName(name);
    if (workbook) setPreviewCount(parseSheet(workbook, name).reduce((n, r) => n + r.quantities.length, 0));
  };

  const runSync = async () => {
    if (!workbook || !worksheetName) {
      toast({ title: "Pick a file & sheet", description: "Upload a workbook and choose the sheet.", variant: "destructive" });
      return;
    }
    setLoading(true);
    setResult(null);
    try {
      const parsedRows = parseSheet(workbook, worksheetName);
      if (!parsedRows.length) {
        throw new Error(`Sheet "${worksheetName}" has no rows with medicine names in column A and quantities in column E.`);
      }
      const { data: r, error } = await supabase.functions.invoke("sync-invoices-from-file", {
        body: {
          worksheetName,
          patientName: patientName.trim() || "TEST Test",
          parsedRows,
          debug,
        },
      });
      if (error || !r) throw new Error((r as SyncResult | null)?.error || error?.message || "Sync failed");
      const syncResult = r as SyncResult;
      setResult(syncResult);
      if (syncResult.success) {
        const attempted = syncResult.attempted ?? parsedRows.length;
        toast({
          title: debug ? "Debug sync complete" : "Sync complete",
          description: `${syncResult.created ?? 0}/${attempted} invoice(s) created${syncResult.errors?.length ? `, ${syncResult.errors.length} skipped` : ""}.`,
        });
        onSynced?.({
          created: syncResult.created ?? 0,
          skipped: syncResult.errors?.length ?? 0,
          worksheet: syncResult.worksheet,
          invoiceIds: syncResult.created_invoices?.map((invoice) => invoice.invoice_id).filter(Boolean) as string[] | undefined,
        });
      } else {
        toast({ title: "Sync failed", description: syncResult.error || "Unknown error", variant: "destructive" });
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      setResult({ success: false, error: msg });
      toast({ title: "Sync failed", description: msg, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="glass-subtle border-emerald-500/30 hover:border-emerald-500/60">
          <FileUp className="h-4 w-4 mr-2" />
          Sync from File
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Sync invoices from Excel file</DialogTitle>
          <DialogDescription>
            Upload an <code>.xlsx</code> workbook. Reads <strong>column A</strong> (medicine name) and{" "}
            <strong>column E</strong> from rows A3–A7 and A11–A32. Each row creates one invoice using the
            total quantity from column E.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div>
            <Label htmlFor="fsFile">Workbook (.xlsx)</Label>
            <Input id="fsFile" type="file" accept=".xlsx,.xlsm"
              onChange={(e) => onFile(e.target.files?.[0] || null)} />
          </div>
          {sheetNames.length > 0 && (
            <div>
              <Label htmlFor="fsWs">Worksheet</Label>
              <Select value={worksheetName} onValueChange={onSheetChange}>
                <SelectTrigger id="fsWs"><SelectValue placeholder="Pick a sheet" /></SelectTrigger>
                <SelectContent>
                  {sheetNames.map((n) => (
                    <SelectItem key={n} value={n}>{n}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {previewCount !== null && (
                <p className="text-xs text-muted-foreground mt-1">
                  {previewCount === 0
                    ? "No quantities found in column E on this sheet."
                    : `Will attempt to create ${previewCount} invoice(s) from this sheet (minus already-synced rows).`}
                </p>
              )}
            </div>
          )}
          <div>
            <Label htmlFor="fsPn">Patient name</Label>
            <Input id="fsPn" value={patientName} onChange={(e) => setPatientName(e.target.value)} />
          </div>
          <p className="text-xs text-muted-foreground">
            One invoice is created for each medicine row that has a quantity in
            the <strong>Issued to Patients</strong> column (E). Unit price uses the
            <strong> Rate</strong> column (I) when present.
          </p>
        </div>

        {result && (
          <div className="mt-3 max-h-48 overflow-auto rounded-md border border-border p-3 text-sm space-y-1">
            {result.success ? (
              <>
                <p className="font-medium">Worksheet: {result.worksheet} {result.debug && <span className="text-xs text-amber-500">(debug)</span>}</p>
                <p>Created: <strong>{result.created ?? 0}</strong>{typeof result.attempted === "number" && <> / {result.attempted} attempted</>}</p>
                {!!result.created_invoices?.length && (
                  <details className="mt-1">
                    <summary className="cursor-pointer text-xs text-muted-foreground">Show created invoices</summary>
                    <ul className="list-disc pl-4 text-xs mt-1">
                      {result.created_invoices.map((c, i) => (
                        <li key={i}>Row {c.row} — {c.medicine} × {c.qty} → {c.invoice_number}</li>
                      ))}
                    </ul>
                  </details>
                )}
                {!!result.errors?.length && (
                  <div className="mt-2">
                    <p className="text-destructive font-medium">Skipped: {result.errors.length}</p>
                    <ul className="list-disc pl-4 text-xs">
                      {result.errors.slice(0, 20).map((e, i) => (
                        <li key={i}>Row {e.row} #{e.position} — {e.medicine} × {e.qty}: {e.reason}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </>
            ) : (
              <p className="text-destructive">{result.error}</p>
            )}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={loading}>Close</Button>
          <Button onClick={runSync} disabled={loading || !workbook || !worksheetName}
            className="bg-gradient-to-r from-emerald-500 to-cyan text-white">
            {loading ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Syncing…</>
              : <><FileSpreadsheet className="h-4 w-4 mr-2" />Sync Now</>}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
