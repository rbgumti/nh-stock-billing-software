import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"') {
        if (i + 1 < line.length && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        current += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === ",") {
        result.push(current);
        current = "";
      } else {
        current += ch;
      }
    }
  }
  result.push(current);
  return result;
}

function parseCsv(text: string): Record<string, string>[] {
  const lines = text.split("\n").filter((l) => l.trim());
  if (lines.length < 2) return [];
  const headers = parseCsvLine(lines[0]);
  const rows: Record<string, string>[] = [];
  for (let i = 1; i < lines.length; i++) {
    const fields = parseCsvLine(lines[i]);
    if (fields.length < 2) continue;
    const row: Record<string, string> = {};
    for (let j = 0; j < headers.length; j++) {
      row[headers[j].trim()] = (fields[j] || "").trim();
    }
    rows.push(row);
  }
  return rows;
}

function val(v: string | undefined): string | null {
  if (!v || v === "" || v === "null" || v === "undefined") return null;
  return v;
}

function numVal(v: string | undefined): number | null {
  if (!v || v === "" || v === "null") return null;
  const n = Number(v);
  return isNaN(n) ? null : n;
}

function boolVal(v: string | undefined): boolean {
  return v === "true" || v === "t";
}

function tryParseJson(v: string | undefined): any {
  if (!v || v === "" || v === "null") return null;
  try {
    return JSON.parse(v);
  } catch {
    return null;
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Verify user is authenticated and is admin
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ success: false, error: "Authorization required" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const authClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authError } = await authClient.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ success: false, error: "Unauthorized" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const adminClient = createClient(supabaseUrl, serviceKey);
    const { data: roleData } = await adminClient
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .maybeSingle();

    if (!roleData) {
      return new Response(
        JSON.stringify({ success: false, error: "Admin access required" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = adminClient;
    console.log(`Import initiated by admin user: ${user.id}`);

    const storageBase = `${supabaseUrl}/storage/v1/object/public/csv-imports`;
    const results: Record<string, any> = {};

    // Fetch all CSVs from storage
    console.log("Fetching CSVs from storage...");
    const csvNames = [
      "invoices_rows",
      "invoice_items_rows",
      "prescription_items_rows",
      "day_reports_rows",
      "attendance_records_rows",
      "appointments_rows",
    ];

    const csvData: Record<string, Record<string, string>[]> = {};
    for (const name of csvNames) {
      const url = `${storageBase}/${name}.csv`;
      console.log(`Fetching: ${url}`);
      const resp = await fetch(url);
      if (!resp.ok) throw new Error(`Failed to fetch ${name}: ${resp.status}`);
      const text = await resp.text();
      csvData[name] = parseCsv(text);
      console.log(`${name}: ${csvData[name].length} rows`);
    }

    // Build patient s_no -> UUID mapping (fetch ALL patients)
    console.log("Building patient mapping...");
    let allPatients: any[] = [];
    let from = 0;
    const pageSize = 1000;
    while (true) {
      const { data, error } = await supabase
        .from("patients")
        .select("id, s_no")
        .range(from, from + pageSize - 1);
      if (error) throw new Error(`Patient fetch error: ${error.message}`);
      if (!data || data.length === 0) break;
      allPatients = allPatients.concat(data);
      if (data.length < pageSize) break;
      from += pageSize;
    }

    const patientMap: Record<string, string> = {};
    for (const p of allPatients) {
      patientMap[String(p.s_no)] = p.id;
    }
    console.log(`Patient map: ${Object.keys(patientMap).length} entries`);

    // Step 1: Delete existing data in correct FK order
    console.log("Deleting existing data...");

    const deletes = [
      "invoice_items", "invoices", "prescription_items", "prescriptions",
      "appointments", "attendance_records", "day_reports"
    ];
    for (const table of deletes) {
      const { error } = await supabase.from(table).delete().neq("id", "00000000-0000-0000-0000-000000000000");
      if (error) console.error(`Delete ${table} error:`, error.message);
      else console.log(`Deleted ${table}`);
    }

    const batchSize = 50;

    // Step 2: Insert day_reports
    console.log("Inserting day_reports...");
    const dayReports = csvData["day_reports_rows"];
    let dayInserted = 0;
    for (let i = 0; i < dayReports.length; i += batchSize) {
      const batch = dayReports.slice(i, i + batchSize).map((r) => ({
        id: r.id,
        report_date: r.report_date,
        new_patients: numVal(r.new_patients) ?? 0,
        follow_up_patients: numVal(r.follow_up_patients) ?? 0,
        cash_previous_day: numVal(r.cash_previous_day) ?? 0,
        loose_balance: numVal(r.loose_balance) ?? 0,
        deposit_in_bank: numVal(r.deposit_in_bank) ?? 0,
        paytm_gpay: numVal(r.paytm_gpay) ?? 0,
        cash_handover_amarjeet: numVal(r.cash_handover_amarjeet) ?? 0,
        cash_handover_mandeep: numVal(r.cash_handover_mandeep) ?? 0,
        cash_handover_sir: numVal(r.cash_handover_sir) ?? 0,
        adjustments: numVal(r.adjustments) ?? 0,
        tapentadol_patients: numVal(r.tapentadol_patients) ?? 0,
        psychiatry_patients: numVal(r.psychiatry_patients) ?? 0,
        fees: numVal(r.fees) ?? 0,
        lab_collection: numVal(r.lab_collection) ?? 0,
        psychiatry_collection: numVal(r.psychiatry_collection) ?? 0,
        cash_denominations: tryParseJson(r.cash_denominations),
        expenses: tryParseJson(r.expenses),
        created_at: r.created_at || new Date().toISOString(),
        updated_at: r.updated_at || new Date().toISOString(),
        created_by: val(r.created_by),
        stock_snapshot: tryParseJson(r.stock_snapshot),
        advances: tryParseJson(r.advances),
      }));
      const { error } = await supabase.from("day_reports").insert(batch);
      if (error) console.error(`day_reports batch ${i}:`, error.message);
      else dayInserted += batch.length;
    }
    results.day_reports = { inserted: dayInserted, total: dayReports.length };
    console.log(`day_reports: ${dayInserted}/${dayReports.length}`);

    // Step 3: Insert attendance_records
    console.log("Inserting attendance_records...");
    const attRecords = csvData["attendance_records_rows"];
    let attInserted = 0;
    for (let i = 0; i < attRecords.length; i += batchSize) {
      const batch = attRecords.slice(i, i + batchSize).map((r) => ({
        id: r.id,
        employee_id: val(r.employee_id),
        date: r.date,
        status: val(r.status) ?? "present",
        notes: val(r.notes),
        created_at: r.created_at || new Date().toISOString(),
      }));
      const { error } = await supabase.from("attendance_records").insert(batch);
      if (error) console.error(`attendance batch ${i}:`, error.message);
      else attInserted += batch.length;
    }
    results.attendance_records = { inserted: attInserted, total: attRecords.length };
    console.log(`attendance_records: ${attInserted}/${attRecords.length}`);

    // Step 4: Insert appointments
    console.log("Inserting appointments...");
    const appointments = csvData["appointments_rows"];
    let apptInserted = 0;
    let apptSkipped = 0;
    for (let i = 0; i < appointments.length; i += batchSize) {
      const batch = [];
      for (const r of appointments.slice(i, i + batchSize)) {
        const patientUuid = patientMap[r.patient_id];
        if (!patientUuid && r.patient_id) {
          apptSkipped++;
          continue;
        }
        batch.push({
          id: r.id,
          patient_id: patientUuid || null,
          patient_name: val(r.patient_name),
          patient_phone: val(r.patient_phone),
          appointment_date: r.appointment_date,
          duration_minutes: numVal(r.duration_minutes) ?? 30,
          reason: val(r.reason),
          notes: val(r.notes),
          status: val(r.status) ?? "Scheduled",
          reminder_sent: boolVal(r.reminder_sent),
          created_at: r.created_at || new Date().toISOString(),
          updated_at: r.updated_at || new Date().toISOString(),
        });
      }
      if (batch.length > 0) {
        const { error } = await supabase.from("appointments").insert(batch);
        if (error) console.error(`appointments batch ${i}:`, error.message);
        else apptInserted += batch.length;
      }
    }
    results.appointments = { inserted: apptInserted, total: appointments.length, skipped: apptSkipped };
    console.log(`appointments: ${apptInserted}/${appointments.length} (skipped ${apptSkipped})`);

    // Step 5: Create stub prescriptions
    console.log("Creating stub prescriptions...");
    const prescItems = csvData["prescription_items_rows"];
    const uniquePrescIds = [...new Set(prescItems.map((r) => r.prescription_id).filter(Boolean))];
    let prescInserted = 0;
    for (let i = 0; i < uniquePrescIds.length; i += batchSize) {
      const batch = uniquePrescIds.slice(i, i + batchSize).map((pid) => ({
        id: pid,
        prescription_number: `RX-${pid.substring(0, 8)}`,
        status: "Active",
        prescription_date: new Date().toISOString(),
      }));
      const { error } = await supabase.from("prescriptions").insert(batch);
      if (error) console.error(`prescriptions stub batch ${i}:`, error.message);
      else prescInserted += batch.length;
    }
    console.log(`Created ${prescInserted} stub prescriptions`);

    // Step 6: Insert prescription_items
    console.log("Inserting prescription_items...");
    let prescItemsInserted = 0;
    for (let i = 0; i < prescItems.length; i += batchSize) {
      const batch = prescItems.slice(i, i + batchSize).map((r) => ({
        id: r.id,
        prescription_id: val(r.prescription_id),
        medicine_name: r.medicine_name,
        dosage: val(r.dosage),
        frequency: val(r.frequency),
        duration: val(r.duration),
        quantity: numVal(r.quantity),
        instructions: val(r.instructions),
        created_at: r.created_at || new Date().toISOString(),
      }));
      const { error } = await supabase.from("prescription_items").insert(batch);
      if (error) console.error(`prescription_items batch ${i}:`, error.message);
      else prescItemsInserted += batch.length;
    }
    results.prescription_items = { inserted: prescItemsInserted, total: prescItems.length };
    console.log(`prescription_items: ${prescItemsInserted}/${prescItems.length}`);

    // Build valid stock item IDs set
    const validMedicineIds = new Set<number>();
    let sfrom = 0;
    while (true) {
      const { data: si } = await supabase.from("stock_items").select("item_id").range(sfrom, sfrom + 999);
      if (!si || si.length === 0) break;
      for (const s of si) validMedicineIds.add(s.item_id);
      if (si.length < 1000) break;
      sfrom += 1000;
    }
    console.log(`Valid medicine IDs: ${validMedicineIds.size}`);

    // Step 7: Insert invoices
    console.log("Inserting invoices...");
    const invoices = csvData["invoices_rows"];
    const invoiceIdMap: Record<string, string> = {};
    let invInserted = 0;
    for (let i = 0; i < invoices.length; i += batchSize) {
      const batch = [];
      for (const r of invoices.slice(i, i + batchSize)) {
        const newId = crypto.randomUUID();
        invoiceIdMap[r.id] = newId;
        const patientUuid = patientMap[r.patient_id];
        batch.push({
          id: newId,
          invoice_number: r.id,
          patient_id: patientUuid || null,
          patient_name: val(r.patient_name),
          patient_phone: val(r.patient_phone),
          invoice_date: r.invoice_date || new Date().toISOString(),
          subtotal: numVal(r.subtotal) ?? 0,
          tax: numVal(r.tax) ?? 0,
          total: numVal(r.total) ?? 0,
          notes: val(r.notes),
          status: val(r.status) ?? "Draft",
          created_at: r.created_at || new Date().toISOString(),
          updated_at: r.updated_at || new Date().toISOString(),
          follow_up_date: val(r.follow_up_date),
        });
      }
      if (batch.length > 0) {
        const { error } = await supabase.from("invoices").insert(batch);
        if (error) console.error(`invoices batch ${i}:`, error.message);
        else invInserted += batch.length;
      }
    }
    results.invoices = { inserted: invInserted, total: invoices.length };
    console.log(`invoices: ${invInserted}/${invoices.length}`);

    // Step 8: Insert invoice_items
    console.log("Inserting invoice_items...");
    const invItems = csvData["invoice_items_rows"];
    let invItemsInserted = 0;
    let invItemsSkipped = 0;
    for (let i = 0; i < invItems.length; i += batchSize) {
      const batch = [];
      for (const r of invItems.slice(i, i + batchSize)) {
        const mappedInvoiceId = invoiceIdMap[r.invoice_id];
        if (!mappedInvoiceId) {
          invItemsSkipped++;
          continue;
        }
        const medId = numVal(r.medicine_id);
        batch.push({
          id: r.id,
          invoice_id: mappedInvoiceId,
          medicine_id: medId !== null && validMedicineIds.has(medId) ? medId : null,
          medicine_name: r.medicine_name || "Unknown",
          batch_no: val(r.batch_no),
          expiry_date: val(r.expiry_date),
          mrp: numVal(r.mrp),
          quantity: numVal(r.quantity) ?? 1,
          unit_price: numVal(r.unit_price) ?? 0,
          total: numVal(r.total) ?? 0,
          created_at: r.created_at || new Date().toISOString(),
          frequency: val(r.frequency),
          duration_days: numVal(r.duration_days),
        });
      }
      if (batch.length > 0) {
        const { error } = await supabase.from("invoice_items").insert(batch);
        if (error) console.error(`invoice_items batch ${i}:`, error.message);
        else invItemsInserted += batch.length;
      }
    }
    results.invoice_items = { inserted: invItemsInserted, total: invItems.length, skipped: invItemsSkipped };
    console.log(`invoice_items: ${invItemsInserted}/${invItems.length} (skipped ${invItemsSkipped})`);

    console.log("Import complete!", JSON.stringify(results));

    return new Response(
      JSON.stringify({ success: true, results }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Import error:", err);
    return new Response(
      JSON.stringify({ success: false, error: String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
