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
        result.push(current.trim());
        current = "";
      } else {
        current += ch;
      }
    }
  }
  result.push(current.trim());
  return result;
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

    // Fetch CSV from URL
    const { csv_url } = await req.json();
    console.log("Fetching CSV from:", csv_url);
    const csvResp = await fetch(csv_url);
    if (!csvResp.ok) throw new Error(`Failed to fetch CSV: ${csvResp.status}`);
    const csvText = await csvResp.text();
    
    const lines = csvText.split("\n").filter((l) => l.trim());
    const headers = parseCsvLine(lines[0]);
    console.log("CSV headers:", headers);
    console.log("Total data rows:", lines.length - 1);

    const idx = (name: string) => headers.indexOf(name);

    // Table already cleared - skip delete step
    console.log("Starting import into empty patients table");

    // Step 2: Parse and insert in batches
    const batchSize = 50;
    let inserted = 0;
    const errors: string[] = [];

    for (let i = 1; i < lines.length; i += batchSize) {
      const batch: any[] = [];
      for (let j = i; j < Math.min(i + batchSize, lines.length); j++) {
        const fields = parseCsvLine(lines[j]);
        if (fields.length < 5) continue;

        const patientName = fields[idx("patient_name")] || "";
        const nameParts = patientName.trim().split(" ");
        const firstName = nameParts[0] || "Unknown";
        const lastName = nameParts.slice(1).join(" ") || "";

        const sNoRaw = fields[idx("s_no")];
        const sNoNum = parseInt(sNoRaw, 10);
        const sNo = isNaN(sNoNum) ? j : sNoNum;

        batch.push({
          s_no: sNo,
          patient_name: patientName,
          first_name: firstName,
          last_name: lastName || null,
          age: fields[idx("age")] || null,
          father_name: fields[idx("father_name")] || null,
          govt_id: fields[idx("govt_id")] || null,
          aadhar_card: fields[idx("aadhar_card")] || null,
          phone: fields[idx("phone")] || null,
          address: fields[idx("address")] || null,
          new_govt_id: fields[idx("new_govt_id")] || null,
          file_no: fields[idx("file_no")] || null,
          patient_id: fields[idx("file_no")] || null,
          category: fields[idx("category")] || null,
        });
      }

      if (batch.length > 0) {
        const { error } = await supabase.from("patients").insert(batch);
        if (error) {
          console.error(`Batch at row ${i} failed:`, error.message);
          errors.push(`Rows ${i}-${i + batch.length}: ${error.message}`);
        } else {
          inserted += batch.length;
          if (inserted % 500 === 0) console.log(`Inserted ${inserted} so far...`);
        }
      }
    }

    console.log(`Import complete: ${inserted} inserted, ${errors.length} batch errors`);

    return new Response(
      JSON.stringify({ success: true, inserted, totalRows: lines.length - 1, errors }),
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
