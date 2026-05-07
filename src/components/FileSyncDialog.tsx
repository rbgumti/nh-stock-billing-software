import { useState } from "react";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FileUp, Loader2, FileSpreadsheet } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import ExcelJS from "exceljs";
import type { SyncSummary } from "@/components/OneDriveSyncDialog";

const FN_ENDPOINT = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/sync-onedrive-invoices`;
const FUNCTION_HEADERS = {
  apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string,
  Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string}`,
  "Content-Type": "application/json",
};

interface SyncResult {
  success: boolean;
  worksheet?: string;
  created?: number;
  errors?: Array<{ row: number; position: number; medicine: string; qty: number; reason: string }>;
  created_invoices?: Array<{ row: number; position: number; medicine: string; qty: number; invoice_number: string }>;
  error?: string;
}

interface ParsedWorkbookRow { row: number; medicineName: string; quantities: number[]; }

interface Props { onSynced?: (summary: SyncSummary) => void; }

export function FileSyncDialog({ onSynced }: Props) {
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [worksheetName, setWorksheetName] = useState("");
  const [patientName, setPatientName] = useState("TEST Test");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<SyncResult | null>(null);

  const parseFormulaNumbers = (raw: unknown): number[] => {
    if (raw === null || raw === undefined) return [];
    let s = String(raw).trim();
    if (!s) return [];
    if (s.startsWith("=")) s = s.slice(1);
    if (!/^[\d+\s.]+$/.test(s)) return [];
    return s.split("+").map((t) => Number(t.trim())).filter((n) => Number.isFinite(n) && n > 0);
  };

  const parseWorkbook = async (): Promise<ParsedWorkbookRow[]> => {
    if (!file) return [];
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(await file.arrayBuffer());
    const requested = worksheetName.trim();
    const today = String(new Date().getDate());
    const ws = (requested && wb.getWorksheet(requested)) || wb.getWorksheet(today) || wb.worksheets[0];
    if (!ws) throw new Error("No worksheets found in uploaded workbook");
    return ws.getRows(2, Math.max(ws.rowCount - 1, 0))
      ?.map((row) => {
        const fv = row.getCell(5).value;
        const ft = typeof fv === "object" && fv !== null && "formula" in fv
          ? `=${String(fv.formula)}`
          : typeof fv === "object" && fv !== null && "result" in fv
            ? fv.result
            : fv;
        return {
          row: row.number,
          medicineName: String(row.getCell(1).text || row.getCell(1).value || "").trim(),
          quantities: parseFormulaNumbers(ft),
        };
      })
      .filter((r) => r.medicineName && r.quantities.length) || [];
  };

  const runSync = async () => {
    if (!file) {
      toast({ title: "Pick a file", description: "Select an .xlsx workbook first.", variant: "destructive" });
      return;
    }
    setLoading(true);
    setResult(null);
    try {
      const parsedRows = await parseWorkbook();
      if (!parsedRows.length) {
        throw new Error("No rows found with medicine names in column A and quantities/formulas in column E.");
      }
      const res = await fetch(FN_ENDPOINT, {
        method: "POST",
        headers: FUNCTION_HEADERS,
        body: JSON.stringify({
          worksheetName: worksheetName.trim() || undefined,
          patientName: patientName.trim() || "TEST Test",
          parsedRows,
        }),
      });
      const r = (await res.json().catch(() => null)) as SyncResult | null;
      if (!res.ok || !r) throw new Error(r?.error || `Sync failed: HTTP ${res.status}`);
      setResult(r);
      if (r.success) {
        toast({
          title: "Sync complete",
          description: `${r.created ?? 0} invoice(s) created${r.errors?.length ? `, ${r.errors.length} skipped` : ""}.`,
        });
        onSynced?.({ created: r.created ?? 0, skipped: r.errors?.length ?? 0, worksheet: r.worksheet });
      } else {
        toast({ title: "Sync failed", description: r.error || "Unknown error", variant: "destructive" });
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
            <strong>column E</strong> (e.g. <code>=6+24+6</code>) from row 2 onward. Each <em>+</em>-separated
            number becomes one invoice using FIFO batch selection. Already-synced numbers are skipped.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div>
            <Label htmlFor="fsFile">Workbook (.xlsx)</Label>
            <Input id="fsFile" type="file" accept=".xlsx,.xlsm" onChange={(e) => setFile(e.target.files?.[0] || null)} />
          </div>
          <div>
            <Label htmlFor="fsWs">Worksheet name (optional)</Label>
            <Input id="fsWs" value={worksheetName} onChange={(e) => setWorksheetName(e.target.value)}
              placeholder={`defaults to today's day (${new Date().getDate()})`} />
          </div>
          <div>
            <Label htmlFor="fsPn">Patient name</Label>
            <Input id="fsPn" value={patientName} onChange={(e) => setPatientName(e.target.value)} />
          </div>
        </div>

        {result && (
          <div className="mt-3 max-h-48 overflow-auto rounded-md border border-border p-3 text-sm space-y-1">
            {result.success ? (
              <>
                <p className="font-medium">Worksheet: {result.worksheet}</p>
                <p>Created: <strong>{result.created ?? 0}</strong></p>
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
          <Button onClick={runSync} disabled={loading || !file}
            className="bg-gradient-to-r from-emerald-500 to-cyan text-white">
            {loading ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Syncing…</>
              : <><FileSpreadsheet className="h-4 w-4 mr-2" />Sync Now</>}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
