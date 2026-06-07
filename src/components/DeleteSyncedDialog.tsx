import { useState } from "react";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Trash2, Loader2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface Props {
  onDeleted?: () => void;
}

export function DeleteSyncedDialog({ onDeleted }: Props) {
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [loading, setLoading] = useState(false);
  const [count, setCount] = useState<number | null>(null);

  const previewCount = async (d: string) => {
    if (!d) { setCount(null); return; }
    const startIso = new Date(`${d}T00:00:00.000Z`).toISOString();
    const endIso = new Date(new Date(`${d}T00:00:00.000Z`).getTime() + 86400000).toISOString();
    const { count: c } = await supabase
      .from("invoices")
      .select("id", { count: "exact", head: true })
      .like("notes", "Auto-synced%")
      .gte("invoice_date", startIso)
      .lt("invoice_date", endIso);
    setCount(c ?? 0);
  };

  const onDateChange = (d: string) => {
    setDate(d);
    setCount(null);
    previewCount(d);
  };

  const onOpenChange = (next: boolean) => {
    setOpen(next);
    if (next) previewCount(date);
    else setCount(null);
  };

  const runDelete = async () => {
    if (!date) return;
    if (!window.confirm(`Delete ALL auto-synced invoices dated ${date}? This cannot be undone.`)) return;
    setLoading(true);
    try {
      const startIso = new Date(`${date}T00:00:00.000Z`).toISOString();
      const endIso = new Date(new Date(`${date}T00:00:00.000Z`).getTime() + 86400000).toISOString();
      const { data: rows, error: qErr } = await supabase
        .from("invoices")
        .select("id")
        .like("notes", "Auto-synced%")
        .gte("invoice_date", startIso)
        .lt("invoice_date", endIso);
      if (qErr) throw qErr;
      const ids = (rows || []).map((r) => r.id);
      if (!ids.length) {
        toast({ title: "Nothing to delete", description: `No auto-synced invoices found for ${date}.` });
        return;
      }
      const { error: itemErr } = await supabase.from("invoice_items").delete().in("invoice_id", ids);
      if (itemErr) throw itemErr;
      const { error: delErr } = await supabase.from("invoices").delete().in("id", ids);
      if (delErr) throw delErr;
      toast({ title: "Deleted", description: `Removed ${ids.length} synced invoice(s) for ${date}.` });
      setCount(0);
      onDeleted?.();
      setOpen(false);
    } catch (e: unknown) {
      toast({ title: "Delete failed", description: e instanceof Error ? e.message : String(e), variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline" className="glass-subtle border-destructive/40 text-destructive hover:border-destructive/70 hover:text-destructive">
          <Trash2 className="h-4 w-4 mr-2" />
          Delete Sync
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Delete synced invoices</DialogTitle>
          <DialogDescription>
            Removes only invoices created by the Excel sync (notes starting with
            <code className="px-1">Auto-synced</code>) for the selected date.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div>
            <Label htmlFor="delSyncDate">Invoice date</Label>
            <Input id="delSyncDate" type="date" value={date} onChange={(e) => onDateChange(e.target.value)} />
          </div>
          <p className="text-sm">
            {count === null
              ? "Checking…"
              : count === 0
                ? <span className="text-muted-foreground">No auto-synced invoices found for this date.</span>
                : <><strong className="text-destructive">{count}</strong> auto-synced invoice(s) will be deleted.</>}
          </p>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={loading}>Cancel</Button>
          <Button variant="destructive" onClick={runDelete} disabled={loading || !date || !count}>
            {loading ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Deleting…</> : <><Trash2 className="h-4 w-4 mr-2" />Delete</>}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
