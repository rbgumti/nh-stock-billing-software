// Sync invoices from an uploaded Excel workbook (parsed in the browser).
// Each parsed row creates one invoice (qty = sum of quantities) for the chosen patient.
// FIFO batch selection.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

interface Body {
  worksheetName?: string;
  invoiceDate?: string;
  patientName?: string;
  parsedRows: Array<{ row: number; medicineName: string; quantities: number[]; rate?: number | null }>;
  debug?: boolean;
}

type SyncTask = { rowSheet: number; medName: string; position: number; qty: number; rate: number | null };

function getFinancialYearSuffix(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth() + 1;
  const startYear = m >= 4 ? y : y - 1;
  const startSuffix = startYear.toString().slice(-2);
  const endSuffix = (startYear + 1).toString().slice(-2);
  return `${startSuffix}-${endSuffix}`;
}

function normalizeMedicineName(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/[\u2010-\u2015]/g, '-')
    .replace(/\b(mg|tab|tablet|tabs|cap|capsule|ml)\b/g, ' ')
    .replace(/[^a-z0-9.]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}
function compactMedicineName(raw: string): string {
  return normalizeMedicineName(raw).replace(/[^a-z0-9]/g, '');
}
function editDistanceAtMostOne(a: string, b: string): boolean {
  if (a === b) return true;
  if (Math.abs(a.length - b.length) > 1) return false;
  let i = 0, j = 0, edits = 0;
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) { i++; j++; continue; }
    edits++;
    if (edits > 1) return false;
    if (a.length > b.length) i++;
    else if (b.length > a.length) j++;
    else { i++; j++; }
  }
  return edits + (i < a.length ? 1 : 0) + (j < b.length ? 1 : 0) <= 1;
}
function extractNumericTokens(raw: string): string[] {
  const matches = String(raw).toLowerCase().match(/\d+(?:\.\d+)?/g);
  return matches ? [...matches].sort() : [];
}
function medicineNamesMatch(uploadedName: string, stockName: string): boolean {
  const u = normalizeMedicineName(uploadedName);
  const s = normalizeMedicineName(stockName);
  if (!u || !s) return false;
  // Dosage numbers (e.g. "1" vs "2") must match exactly so WINAM 1 != WINAM 2.
  if (extractNumericTokens(uploadedName).join(',') !== extractNumericTokens(stockName).join(',')) return false;
  if (u === s) return true;
  const uc = compactMedicineName(uploadedName);
  const sc = compactMedicineName(stockName);
  if (uc === sc) return true;
  return uc.length >= 6 && sc.length >= 6 && editDistanceAtMostOne(uc, sc);
}

function invoiceSequence(invoiceNumber: string | null | undefined, prefix: string): number | null {
  if (!invoiceNumber || !invoiceNumber.startsWith(prefix)) return null;
  const suffix = invoiceNumber.slice(prefix.length).trim();
  if (!/^\d+$/.test(suffix)) return null;
  const parsed = Number(suffix);
  return Number.isFinite(parsed) ? parsed : null;
}

async function getNextInvoiceSequence(supabase: any, prefix: string): Promise<number> {
  let offset = 0;
  let maxSeq = 0;
  const pageSize = 1000;

  while (true) {
    const { data, error } = await supabase
      .from('invoices')
      .select('invoice_number')
      .like('invoice_number', `${prefix}%`)
      .range(offset, offset + pageSize - 1);
    if (error) throw error;

    for (const row of (data || [])) {
      const seq = invoiceSequence(row.invoice_number, prefix);
      if (seq !== null && seq > maxSeq) maxSeq = seq;
    }

    if (!data || data.length < pageSize) break;
    offset += pageSize;
  }

  return maxSeq + 1;
}

function isSummaryRow(medicineName: string): boolean {
  return /^(brand|grand\s+total|total|summary|total\s+sale|total\s+as\s+per\s+sheet)$/i.test(medicineName.trim());
}

function invoiceDateForWorksheet(worksheetName: string, selectedDate?: string): string {
  const now = new Date();
  const explicitDate = String(selectedDate || '').trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(explicitDate)) {
    return new Date(`${explicitDate}T00:00:00.000Z`).toISOString();
  }
  const dayMatch = String(worksheetName || '').trim().match(/^(\d{1,2})$/);
  if (!dayMatch) return now.toISOString();

  const day = Number(dayMatch[1]);
  const istNow = new Date(now.getTime() + 330 * 60 * 1000);
  const year = istNow.getUTCFullYear();
  const month = istNow.getUTCMonth();
  const sheetDate = new Date(Date.UTC(year, month, day));

  if (sheetDate.getUTCFullYear() !== year || sheetDate.getUTCMonth() !== month || sheetDate.getUTCDate() !== day) {
    return now.toISOString();
  }

  return sheetDate.toISOString();
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const body = (await req.json()) as Body;
    const patientName = body.patientName || 'TEST Test';
    const uploadedRows = Array.isArray(body.parsedRows) ? body.parsedRows : [];
    const worksheetName = body.worksheetName || String(new Date().getDate());
    if (!uploadedRows.length) {
      return new Response(JSON.stringify({ success: false, error: 'parsedRows is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const { data: patientRow, error: pErr } = await supabase
      .from('patients')
      .select('id, patient_name, phone')
      .ilike('patient_name', patientName)
      .limit(1)
      .maybeSingle();
    if (pErr) throw pErr;
    if (!patientRow) throw new Error(`Patient "${patientName}" not found. Create them first.`);

    const fy = getFinancialYearSuffix();
    const prefix = `NH/INV-${fy}-`;
    let nextSeq = await getNextInvoiceSequence(supabase, prefix);

    const tasks: SyncTask[] = [];
    for (const row of uploadedRows) {
      const sheetRow = Number(row.row);
      const medName = String(row.medicineName || '').trim();
      const nums = Array.isArray(row.quantities)
        ? row.quantities.map(Number).filter(n => Number.isFinite(n) && n > 0)
        : [];
      if (!sheetRow || !medName || isSummaryRow(medName) || !nums.length) continue;
      const totalQty = nums.reduce((s, n) => s + n, 0);
      const rate = (typeof row.rate === 'number' && Number.isFinite(row.rate) && row.rate > 0) ? row.rate : null;
      if (totalQty > 0) tasks.push({ rowSheet: sheetRow, medName, position: 1, qty: totalQty, rate });
    }

    if (!tasks.length) {
      return new Response(JSON.stringify({
        success: true, created: 0, skipped: 0, errors: [], message: 'No rows to sync',
        worksheet: worksheetName,
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const { data: allStock, error: sErr } = await supabase
      .from('stock_items')
      .select('item_id, name, batch_no, expiry_date, current_stock, unit_price, mrp, is_active');
    if (sErr) throw sErr;

    const stockById = new Map<number, any>();
    for (const it of (allStock || [])) stockById.set(it.item_id, { ...it });

    function isValidExpiry(d?: string | null): boolean {
      if (!d || d === 'N/A' || String(d).trim() === '') return false;
      const t = new Date(d as string).getTime();
      return !isNaN(t);
    }
    function pickFifoBatch(name: string, qty: number): any | null {
      const candidates = Array.from(stockById.values()).filter((m: any) =>
        m.is_active && (m.current_stock ?? 0) >= qty && medicineNamesMatch(name, String(m.name || ''))
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
    const invoiceDate = invoiceDateForWorksheet(worksheetName, body.invoiceDate);

    for (const t of tasks) {
      // Always try to FIFO-match a batch (for stock deduction), but never skip the row.
      const batch = pickFifoBatch(t.medName, t.qty);
      // Pricing priority: sheet rate (col I) -> batch mrp -> batch unit_price -> 0
      const effectiveRate = t.rate ?? Number(batch?.mrp ?? batch?.unit_price ?? 0);
      const unitPrice = +Number(effectiveRate || 0).toFixed(2);
      const lineTotal = +(unitPrice * t.qty).toFixed(2);
      const invoiceNumber = `${prefix}${String(nextSeq).padStart(4, '0')}`;
      nextSeq++;

      const { data: inv, error: iErr } = await supabase
        .from('invoices')
        .insert({
          invoice_number: invoiceNumber,
          patient_id: patientRow.id,
          patient_name: patientRow.patient_name,
          patient_phone: patientRow.phone || '',
          invoice_date: invoiceDate,
          subtotal: lineTotal,
          discount: 0,
          tax: 0,
          total: lineTotal,
          status: 'Paid',
          payment_status: 'Paid',
          payment_method: 'Cash',
          notes: `Auto-synced from uploaded sheet "${worksheetName}" row ${t.rowSheet}`,
        })
        .select('id, invoice_number')
        .single();
      if (iErr || !inv) {
        errors.push({ row: t.rowSheet, position: t.position, medicine: t.medName, qty: t.qty, reason: `Invoice insert failed: ${iErr?.message || 'unknown'}` });
        nextSeq--;
        continue;
      }

      const { error: itErr } = await supabase.from('invoice_items').insert({
        invoice_id: inv.id,
        medicine_id: batch?.item_id ?? null,
        medicine_name: t.medName,
        batch_no: batch?.batch_no ?? null,
        expiry_date: batch?.expiry_date ?? null,
        mrp: batch?.mrp ?? unitPrice,
        quantity: t.qty,
        unit_price: unitPrice,
        total: lineTotal,
      });
      if (itErr) {
        errors.push({ row: t.rowSheet, position: t.position, medicine: t.medName, qty: t.qty, reason: `Invoice item insert failed: ${itErr.message}` });
      }

      if (batch) {
        const newStock = (batch.current_stock ?? 0) - t.qty;
        const { error: stErr } = await supabase
          .from('stock_items')
          .update({ current_stock: newStock })
          .eq('item_id', batch.item_id);
        if (stErr) {
          errors.push({ row: t.rowSheet, position: t.position, medicine: t.medName, qty: t.qty, reason: `Stock update failed: ${stErr.message}` });
        } else {
          stockById.set(batch.item_id, { ...batch, current_stock: newStock });
        }
      }

      created.push({
        row: t.rowSheet,
        position: t.position,
        medicine: t.medName,
        qty: t.qty,
        invoice_id: inv.id,
        invoice_number: inv.invoice_number,
      });
    }

    return new Response(JSON.stringify({
      success: true,
      worksheet: worksheetName,
      attempted: tasks.length,
      created: created.length,
      skipped: errors.length,
      errors,
      created_invoices: created,
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    console.error('sync-invoices-from-file error:', msg);
    return new Response(JSON.stringify({ success: false, error: msg }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
