import { useState, useEffect } from "react";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Cloud, Loader2, CheckCircle2, XCircle, AlertCircle, RefreshCw } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

const STORAGE_KEY = "onedrive_sync_settings_v1";
const FN_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/sync-onedrive-invoices?health=1`;

type Health =
  | { status: "idle" }
  | { status: "checking" }
  | { status: "ok"; excelReachable: boolean; excelError: string | null; hasSecrets: boolean }
  | { status: "error"; message: string };

interface SyncResult {
  success: boolean;
  worksheet?: string;
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
  const [worksheetName, setWorksheetName] = useState("");
  const [patientName, setPatientName] = useState("TEST Test");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<SyncResult | null>(null);
  const [health, setHealth] = useState<Health>({ status: "idle" });

  const checkHealth = async () => {
    setHealth({ status: "checking" });
    try {
      const res = await fetch(FN_URL, {
        method: "GET",
        headers: { apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string },
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
        setWorksheetName(s.worksheetName || "");
        setPatientName(s.patientName || "TEST Test");
      }
    } catch {}
  }, []);

  const persist = () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ itemId, worksheetName, patientName }));
  };

  const runSync = async () => {
    if (!itemId.trim()) {
      toast({ title: "Missing", description: "Enter the OneDrive workbook item ID.", variant: "destructive" });
      return;
    }
    persist();
    setLoading(true);
    setResult(null);
    try {
      const { data, error } = await supabase.functions.invoke("sync-onedrive-invoices", {
        body: {
          itemId: itemId.trim(),
          worksheetName: worksheetName.trim() || undefined,
          patientName: patientName.trim() || "TEST Test",
        },
      });
      if (error) throw error;
      const r = data as SyncResult;
      setResult(r);
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

        <div className="space-y-3">
          <div>
            <Label htmlFor="itemId">OneDrive workbook item ID *</Label>
            <Input id="itemId" value={itemId} onChange={(e) => setItemId(e.target.value)} placeholder="e.g. 01ABCDEFGHIJKLMNOPQRST" />
            <p className="text-xs text-muted-foreground mt-1">
              Open the file in OneDrive on the web → <em>File ▸ Info</em> or share link; the long ID after <code>resid=</code> works for personal OneDrive accounts when this project's connected Microsoft account owns the file.
            </p>
          </div>
          <div>
            <Label htmlFor="ws">Worksheet name (optional)</Label>
            <Input id="ws" value={worksheetName} onChange={(e) => setWorksheetName(e.target.value)} placeholder="defaults to first sheet" />
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
