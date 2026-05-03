// Sync invoices from a OneDrive Excel sheet (column A = medicine name, column E = formula like =6+24+...)
// Each numeric term in column E becomes one invoice (qty for that medicine) for patient "TEST Test".
// FIFO batch selection. Only NEW (row, position) entries are processed (deduped via onedrive_sync_log).

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const GATEWAY = 'https://connector-gateway.lovable.dev/microsoft_excel';

interface Body {
  itemId?: string;          // OneDrive driveItem id of the workbook (optional if workbookName provided)
  workbookName?: string;    // e.g. "Daily Stock Report" — auto-resolved to itemId
  worksheetName?: string;   // default: today's day-of-month (e.g. "3" on 3 May)
  patientName?: string;     // default: 'TEST Test'
}

function getFinancialYearSuffix(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth() + 1; // April = 4
  const startYear = m >= 4 ? y : y - 1;
  const endYear = (startYear + 1).toString().slice(-2);
  return `${startYear}-${endYear}`;
}

async function gw(path: string, lovableKey: string, excelKey: string, init?: RequestInit) {
  const res = await fetch(`${GATEWAY}${path}`, {
    ...init,
    headers: {
      'Authorization': `Bearer ${lovableKey}`,
      'X-Connection-Api-Key': excelKey,
      'Content-Type': 'application/json',
      ...(init?.headers || {}),
    },
  });
  const text = await res.text();
  let json: any = null;
  try { json = text ? JSON.parse(text) : null; } catch { /* not JSON */ }
  if (!res.ok) {
    throw new Error(`Excel gateway ${path} failed [${res.status}]: ${text.slice(0, 500)}`);
  }
  return json;
}

// Parse a cell like "=6+24+6" or "6+24+6" or "6" → [6,24,6]
function parseFormulaNumbers(raw: unknown): number[] {
  if (raw === null || raw === undefined) return [];
  let s = String(raw).trim();
  if (!s) return [];
  if (s.startsWith('=')) s = s.slice(1);
  // Only support pure addition expressions of positive numbers
  if (!/^[\d+\s.]+$/.test(s)) return [];
  return s.split('+').map(t => Number(t.trim())).filter(n => Number.isFinite(n) && n > 0);
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  // Health check: GET or ?health=1 → reports deployment + secret/connection status
  const url = new URL(req.url);
  if (req.method === 'GET' || url.searchParams.get('health') === '1') {
    const hasLovable = !!Deno.env.get('LOVABLE_API_KEY');
    const hasExcel = !!Deno.env.get('MICROSOFT_EXCEL_API_KEY');
    let excelReachable = false;
    let excelError: string | null = null;
    if (hasLovable && hasExcel) {
      try {
        const r = await fetch('https://connector-gateway.lovable.dev/api/v1/verify_credentials', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${Deno.env.get('LOVABLE_API_KEY')}`,
            'X-Connection-Api-Key': Deno.env.get('MICROSOFT_EXCEL_API_KEY')!,
            'Content-Type': 'application/json',
          },
        });
        const j = await r.json().catch(() => ({}));
        excelReachable = r.ok && (j?.outcome === 'verified' || j?.outcome === 'skipped');
        if (!excelReachable) excelError = j?.error || j?.message || `HTTP ${r.status}`;
      } catch (e) {
        excelError = e instanceof Error ? e.message : String(e);
      }
    }
    return new Response(JSON.stringify({
      ok: true,
      deployed: true,
      timestamp: new Date().toISOString(),
      secrets: { LOVABLE_API_KEY: hasLovable, MICROSOFT_EXCEL_API_KEY: hasExcel },
      excel_connection: { reachable: excelReachable, error: excelError },
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    const MICROSOFT_EXCEL_API_KEY = Deno.env.get('MICROSOFT_EXCEL_API_KEY');
    if (!LOVABLE_API_KEY) throw new Error('LOVABLE_API_KEY not configured');
    if (!MICROSOFT_EXCEL_API_KEY) throw new Error('MICROSOFT_EXCEL_API_KEY not configured (connect Microsoft Excel)');

    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const body = (await req.json()) as Body;
    const patientName = body.patientName || 'TEST Test';

    // 0) Resolve workbook itemId — by name search if not provided
    let itemId = body.itemId?.trim();
    let resolvedWorkbookName: string | undefined;
    if (!itemId) {
      const wbName = (body.workbookName || 'Daily Stock Report').trim();
      const q = encodeURIComponent(wbName);
      const search = await gw(
        `/me/drive/root/search(q='${q}')?$select=id,name,file&$top=25`,
        LOVABLE_API_KEY, MICROSOFT_EXCEL_API_KEY
      );
      const candidates = (search?.value || []).filter((x: any) =>
        x?.file && /\.xlsx?$/i.test(x.name || '')
      );
      // Prefer exact (case-insensitive) name match; otherwise first xlsx hit
      const exact = candidates.find((x: any) =>
        String(x.name || '').replace(/\.xlsx?$/i, '').trim().toLowerCase() === wbName.toLowerCase()
      );
      const pick = exact || candidates[0];
      if (!pick) throw new Error(`Workbook "${wbName}" not found in OneDrive`);
      itemId = pick.id;
      resolvedWorkbookName = pick.name;
    }

    // 1) Pick worksheet — default to today's day-of-month (e.g. "3")
    let worksheetName = body.worksheetName?.trim();
    if (!worksheetName) {
      const ws = await gw(`/me/drive/items/${itemId}/workbook/worksheets`, LOVABLE_API_KEY, MICROSOFT_EXCEL_API_KEY);
      const sheets: any[] = ws?.value || [];
      if (!sheets.length) throw new Error('No worksheets found in workbook');
      const today = String(new Date().getDate()); // "1".."31"
      const match = sheets.find(s => String(s.name).trim() === today)
        || sheets.find(s => String(s.name).trim().toLowerCase() === today.toLowerCase());
      worksheetName = (match || sheets[0]).name;
    }

    // 2) Read used range — both values and formulas (so "=6+24" is preserved)
    const usedRangeUrl = `/me/drive/items/${itemId}/workbook/worksheets/${encodeURIComponent(worksheetName!)}/usedRange(valuesOnly=false)?$select=address,values,formulas,rowIndex,columnIndex`;
    const usedRange = await gw(usedRangeUrl, LOVABLE_API_KEY, MICROSOFT_EXCEL_API_KEY);
    const formulas: any[][] = usedRange?.formulas || [];
    const values: any[][] = usedRange?.values || [];
    const rowOffset: number = usedRange?.rowIndex ?? 0; // 0-based first row index in sheet
    const colOffset: number = usedRange?.columnIndex ?? 0;

    // 3) Find the patient (single shared "TEST Test")
    const { data: patientRow, error: pErr } = await supabase
      .from('patients')
      .select('id, patient_name, phone')
      .ilike('patient_name', patientName)
      .limit(1)
      .maybeSingle();
    if (pErr) throw pErr;
    if (!patientRow) throw new Error(`Patient "${patientName}" not found. Create them first.`);

    // 4) Existing log entries for this sheet (to skip duplicates)
    const { data: existing } = await supabase
      .from('onedrive_sync_log')
      .select('row_number, position')
      .eq('sheet_name', worksheetName!);
    const seen = new Set((existing || []).map(e => `${e.row_number}:${e.position}`));

    // 5) Find current max invoice number for FY (we'll increment locally per insert)
    const fy = getFinancialYearSuffix();
    const prefix = `NH/INV-${fy}-`;
    const { data: lastInv } = await supabase
      .from('invoices')
      .select('invoice_number')
      .like('invoice_number', `${prefix}%`)
      .order('invoice_number', { ascending: false })
      .limit(1);
    let nextSeq = 1;
    if (lastInv && lastInv.length && lastInv[0].invoice_number) {
      const n = parseInt(String(lastInv[0].invoice_number).replace(prefix, ''), 10);
      if (!isNaN(n)) nextSeq = n + 1;
    }

    // 6) Build list of (rowSheetIdx, medicineNameInColA, position, qty)
    const aColIdx = 0 - colOffset; // we want sheet column A (index 0)
    const eColIdx = 4 - colOffset; // sheet column E (index 4)
    const tasks: Array<{ rowSheet: number; medName: string; position: number; qty: number }> = [];

    for (let r = 0; r < (formulas.length || values.length); r++) {
      const sheetRow = rowOffset + r + 1; // 1-based
      if (sheetRow < 2) continue; // skip header row 1

      const aCell = aColIdx >= 0 ? (values[r]?.[aColIdx] ?? '') : '';
      const medName = String(aCell || '').trim();
      if (!medName) continue;

      // Prefer formula (raw "=6+24..."), fall back to computed value
      let eRaw: any = '';
      if (eColIdx >= 0) {
        eRaw = formulas[r]?.[eColIdx] ?? values[r]?.[eColIdx] ?? '';
      }
      const nums = parseFormulaNumbers(eRaw);
      if (!nums.length) continue;

      nums.forEach((qty, idx) => {
        const position = idx + 1;
        if (seen.has(`${sheetRow}:${position}`)) return;
        tasks.push({ rowSheet: sheetRow, medName, position, qty });
      });
    }

    if (!tasks.length) {
      return new Response(JSON.stringify({
        success: true, created: 0, skipped: 0, errors: [], message: 'No new numbers to sync',
        worksheet: worksheetName, workbook: resolvedWorkbookName, itemId,
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // 7) Pre-load all stock items once (active, has stock)
    const { data: allStock, error: sErr } = await supabase
      .from('stock_items')
      .select('item_id, name, batch_no, expiry_date, current_stock, unit_price, mrp, is_active');
    if (sErr) throw sErr;

    // mutable in-memory stock map keyed by item_id (so within one sync we deduct correctly)
    const stockById = new Map<number, any>();
    for (const it of (allStock || [])) stockById.set(it.item_id, { ...it });

    function isValidExpiry(d?: string | null): boolean {
      if (!d || d === 'N/A' || String(d).trim() === '') return false;
      const t = new Date(d as string).getTime();
      return !isNaN(t);
    }

    // FIFO batch picker by exact name match (case-insensitive)
    function pickFifoBatch(name: string, qty: number): any | null {
      const target = name.trim().toLowerCase();
      const candidates = Array.from(stockById.values()).filter((m: any) =>
        m.is_active &&
        (m.current_stock ?? 0) >= qty &&
        String(m.name || '').trim().toLowerCase() === target
      );
      if (!candidates.length) return null;
      candidates.sort((a: any, b: any) => {
        const av = isValidExpiry(a.expiry_date), bv = isValidExpiry(b.expiry_date);
        if (!av && !bv) return 0;
        if (!av) return 1;
        if (!bv) return -1;
        return new Date(a.expiry_date).getTime() - new Date(b.expiry_date).getTime();
      });
      return candidates[0];
    }

    const created: any[] = [];
    const errors: Array<{ row: number; position: number; medicine: string; qty: number; reason: string }> = [];

    // 8) Process tasks sequentially (stock mutation must be deterministic)
    for (const t of tasks) {
      const batch = pickFifoBatch(t.medName, t.qty);
      if (!batch) {
        errors.push({ row: t.rowSheet, position: t.position, medicine: t.medName, qty: t.qty, reason: 'No matching active stock with sufficient quantity (exact name match required)' });
        continue;
      }

      const unitPrice = Number(batch.mrp ?? batch.unit_price ?? 0);
      const lineTotal = +(unitPrice * t.qty).toFixed(2);
      const invoiceNumber = `${prefix}${String(nextSeq).padStart(4, '0')}`;
      nextSeq++;

      // Insert invoice
      const { data: inv, error: iErr } = await supabase
        .from('invoices')
        .insert({
          invoice_number: invoiceNumber,
          patient_id: patientRow.id,
          patient_name: patientRow.patient_name,
          patient_phone: patientRow.phone || '',
          invoice_date: new Date().toISOString(),
          subtotal: lineTotal,
          discount: 0,
          tax: 0,
          total: lineTotal,
          status: 'Pending',
          payment_status: 'Paid',
          payment_method: 'Cash',
          notes: `Auto-synced from OneDrive sheet "${worksheetName}" row ${t.rowSheet} term #${t.position}`,
        })
        .select('id, invoice_number')
        .single();
      if (iErr || !inv) {
        errors.push({ row: t.rowSheet, position: t.position, medicine: t.medName, qty: t.qty, reason: `Invoice insert failed: ${iErr?.message || 'unknown'}` });
        nextSeq--; // rollback sequence
        continue;
      }

      // Insert invoice item
      const { error: itErr } = await supabase.from('invoice_items').insert({
        invoice_id: inv.id,
        medicine_id: batch.item_id,
        medicine_name: batch.name,
        batch_no: batch.batch_no,
        expiry_date: batch.expiry_date,
        mrp: batch.mrp,
        quantity: t.qty,
        unit_price: unitPrice,
        total: lineTotal,
      });
      if (itErr) {
        errors.push({ row: t.rowSheet, position: t.position, medicine: t.medName, qty: t.qty, reason: `Invoice item insert failed: ${itErr.message}` });
        // continue — invoice header still exists
      }

      // Reduce stock atomically (read-modify-write on item we already hold)
      const newStock = (batch.current_stock ?? 0) - t.qty;
      const { error: stErr } = await supabase
        .from('stock_items')
        .update({ current_stock: newStock })
        .eq('item_id', batch.item_id);
      if (stErr) {
        errors.push({ row: t.rowSheet, position: t.position, medicine: t.medName, qty: t.qty, reason: `Stock update failed: ${stErr.message}` });
      } else {
        // Update in-memory cache
        stockById.set(batch.item_id, { ...batch, current_stock: newStock });
      }

      // Log to prevent duplicates next sync
      await supabase.from('onedrive_sync_log').insert({
        sheet_name: worksheetName,
        row_number: t.rowSheet,
        position: t.position,
        value: t.qty,
        medicine_name: batch.name,
        invoice_id: inv.id,
        invoice_number: inv.invoice_number,
      });

      created.push({ row: t.rowSheet, position: t.position, medicine: batch.name, qty: t.qty, invoice_number: inv.invoice_number });
    }

    return new Response(JSON.stringify({
      success: true,
      worksheet: worksheetName,
      created: created.length,
      skipped: 0,
      errors,
      created_invoices: created,
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    console.error('sync-onedrive-invoices error:', msg);
    return new Response(JSON.stringify({ success: false, error: msg }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
