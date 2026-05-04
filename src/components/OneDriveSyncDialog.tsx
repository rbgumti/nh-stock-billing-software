import { useState, useEffect } from "react";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Cloud, Loader2, CheckCircle2, XCircle, AlertCircle, RefreshCw } from "lucide-react";
import { toast } from "@/hooks/use-toast";

const STORAGE_KEY = "onedrive_sync_settings_v1";
const FN_ENDPOINT = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/sync-onedrive-invoices`;
const FN_HEALTH_URL = `${FN_ENDPOINT}?health=1`;
const FUNCTION_HEADERS = {
  apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string,
  Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string}`,
  "Content-Type": "application/json",
};

type Health =
  | { status: "idle" }
  | { status: "checking" }
  | { status: "ok"; excelReachable: boolean; excelError: string | null; hasSecrets: boolean }
  | { status: "error"; message: string };

interface SyncResult {
  success: boolean;
  worksheet?: string;
  workbook?: string;
  itemId?: string;
  created?: number;
  errors?: Array<{ row: number; position: number; medicine: string; qty: number; reason: string }>;
  created_invoices?: Array<{ row: number; position: number; medicine: string; qty: number; invoice_number: string }>;
  error?: string;
}

interface Props {
  onSynced?: () => void;
}

export function OneDriveSyncDialog({ onSynced }: Props) {
  const [open, setOpen] = useState(false);
  const [itemId, setItemId] = useState("");
  const [workbookName, setWorkbookName] = useState("Daily Stock Report");
  const [worksheetName, setWorksheetName] = useState("");
  const [patientName, setPatientName] = useState("TEST Test");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<SyncResult | null>(null);
  const [health, setHealth] = useState<Health>({ status: "idle" });

  const checkHealth = async () => {
    setHealth({ status: "checking" });
    try {
      const res = await fetch(FN_HEALTH_URL, {
        method: "GET",
        headers: FUNCTION_HEADERS,
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const j = await res.json();
      const hasSecrets = !!(j?.secrets?.LOVABLE_API_KEY && j?.secrets?.MICROSOFT_EXCEL_API_KEY);
      setHealth({
        status: "ok",
        excelReachable: !!j?.excel_connection?.reachable,
        excelError: j?.excel_connection?.error || null,
        hasSecrets,
      });
    } catch (e: any) {
      setHealth({ status: "error", message: e?.message || "Unreachable" });
    }
  };

  useEffect(() => { if (open) checkHealth(); }, [open]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const s = JSON.parse(raw);
        setItemId(s.itemId || "");
        setWorkbookName(s.workbookName || "Daily Stock Report");
        setWorksheetName(s.worksheetName || "");
        setPatientName(s.patientName || "TEST Test");
      }
    } catch {}
  }, []);

  const persist = () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ itemId, workbookName, worksheetName, patientName }));
  };

  const runSync = async () => {
    if (!itemId.trim() && !workbookName.trim()) {
      toast({ title: "Missing", description: "Enter the workbook name or item ID.", variant: "destructive" });
      return;
    }
    persist();
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch(FN_ENDPOINT, {
        method: "POST",
        headers: FUNCTION_HEADERS,
        body: JSON.stringify({
          itemId: itemId.trim() || undefined,
          workbookName: workbookName.trim() || undefined,
          worksheetName: worksheetName.trim() || undefined,
          patientName: patientName.trim() || "TEST Test",
        }),
      });
      const r = (await res.json().catch(() => null)) as SyncResult | null;
      if (!res.ok || !r) throw new Error(r?.error || `Sync request failed: HTTP ${res.status}`);
      setResult(r);
      // If the function resolved an itemId, cache it for instant subsequent syncs
      if (r?.itemId && !itemId.trim()) setItemId(r.itemId);
      if (r.success) {
        toast({
          title: "Sync complete",
          description: `${r.created ?? 0} invoice(s) created${r.errors?.length ? `, ${r.errors.length} skipped` : ""}.`,
        });
        onSynced?.();
      } else {
        toast({ title: "Sync failed", description: r.error || "Unknown error", variant: "destructive" });
      }
    } catch (e: any) {
      const msg = e?.message || String(e);
      setResult({ success: false, error: msg });
      toast({ title: "Sync failed", description: msg, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="glass-subtle border-cyan/30 hover:border-cyan/60">
          <Cloud className="h-4 w-4 mr-2" />
          Sync from OneDrive
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Sync invoices from OneDrive</DialogTitle>
          <DialogDescription>
            Reads <strong>column A</strong> (medicine name) and <strong>column E</strong> (e.g. <code>=6+24+6</code>)
            from row 2 onward. Each <em>+</em>-separated number becomes one invoice for the selected patient using
            FIFO batch selection. Only new numbers since the last sync are processed.
          </DialogDescription>
        </DialogHeader>

        {/* Health indicator */}
        <div className="flex items-center justify-between gap-2 rounded-md border border-border bg-muted/30 px-3 py-2 text-sm">
          <div className="flex items-center gap-2 min-w-0">
            {health.status === "checking" && <><Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /><span className="text-muted-foreground">Checking edge function…</span></>}
            {health.status === "idle" && <><AlertCircle className="h-4 w-4 text-muted-foreground" /><span className="text-muted-foreground">Status unknown</span></>}
            {health.status === "error" && <><XCircle className="h-4 w-4 text-destructive" /><span className="truncate"><strong className="text-destructive">Unreachable:</strong> {health.message}</span></>}
            {health.status === "ok" && (
              health.hasSecrets && health.excelReachable
                ? <><CheckCircle2 className="h-4 w-4 text-emerald-500" /><span><strong className="text-emerald-600">Ready</strong> — function deployed, Excel connected</span></>
                : !health.hasSecrets
                  ? <><XCircle className="h-4 w-4 text-destructive" /><span><strong className="text-destructive">Missing secrets</strong> — connect Microsoft Excel</span></>
                  : <><AlertCircle className="h-4 w-4 text-amber-500" /><span className="truncate"><strong className="text-amber-600">Excel not reachable:</strong> {health.excelError || "verify connection"}</span></>
            )}
          </div>
          <Button size="sm" variant="ghost" onClick={checkHealth} disabled={health.status === "checking"} className="shrink-0 h-7 px-2">
            <RefreshCw className={`h-3.5 w-3.5 ${health.status === "checking" ? "animate-spin" : ""}`} />
          </Button>
        </div>

        <div className="space-y-3">
          <div>
            <Label htmlFor="wbName">Workbook name</Label>
            <Input id="wbName" value={workbookName} onChange={(e) => setWorkbookName(e.target.value)} placeholder="Daily Stock Report" />
            <p className="text-xs text-muted-foreground mt-1">
              Searched in your connected OneDrive. The first matching <code>.xlsx</code> is used.
            </p>
          </div>
          <div>
            <Label htmlFor="itemId">OneDrive item ID (optional, overrides name)</Label>
            <Input id="itemId" value={itemId} onChange={(e) => setItemId(e.target.value)} placeholder="auto-resolved from workbook name" />
          </div>
          <div>
            <Label htmlFor="ws">Worksheet name (optional)</Label>
            <Input id="ws" value={worksheetName} onChange={(e) => setWorksheetName(e.target.value)} placeholder={`defaults to today's day (${new Date().getDate()})`} />
            <p className="text-xs text-muted-foreground mt-1">
              Sheets are named "1", "2", … for day-of-month. Leave blank to use today.
            </p>
          </div>
          <div>
            <Label htmlFor="pn">Patient name</Label>
            <Input id="pn" value={patientName} onChange={(e) => setPatientName(e.target.value)} />
          </div>
        </div>

        {result && (
          <div className="mt-3 max-h-48 overflow-auto rounded-md border border-border p-3 text-sm space-y-1">
            {result.success ? (
              <>
                <p className="font-medium">Worksheet: {result.worksheet}</p>
                <p>Created: <strong>{result.created ?? 0}</strong></p>
                {!!result.created_invoices?.length && (
                  <ul className="list-disc pl-4 text-xs">
                    {result.created_invoices.slice(0, 20).map((c, i) => (
                      <li key={i}>
                        Row {c.row} #{c.position} — {c.medicine} × {c.qty} → {c.invoice_number}
                      </li>
                    ))}
                  </ul>
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
          <Button onClick={runSync} disabled={loading} className="bg-gradient-to-r from-cyan to-purple text-white">
            {loading ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Syncing…</> : "Sync Now"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
