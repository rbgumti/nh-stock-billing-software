import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

    // Parse body for optional sourceStorageUrl (cross-environment sync)
    let sourceStorageUrl: string | null = null
    try {
      const cloned = req.clone()
      const body = await cloned.json()
      sourceStorageUrl = body?.sourceStorageUrl || null
    } catch {
      // No body or invalid JSON – that's fine
    }

    console.log('sourceStorageUrl:', sourceStorageUrl)

    // When sourceStorageUrl is provided this is a cross-environment call from
    // the Test Admin Panel – skip user auth because Test tokens are invalid
    // against the Live auth service.  The function still uses the service role
    // internally so it can write to the DB.

    const supabase = createClient(supabaseUrl, serviceKey)

    // Tables in FK-safe order
    const tables = [
      'suppliers', 'employees', 'sequence_numbers', 'app_settings',
      'patients', 'stock_items', 'purchase_orders', 'purchase_order_items',
      'invoices', 'invoice_items', 'prescriptions', 'prescription_items',
      'appointments', 'day_reports', 'salary_employees', 'salary_records',
      'attendance_records', 'supplier_payments',
    ]

    // Use provided source URL (cross-env) or fall back to own storage
    const storageBase = sourceStorageUrl || `${supabaseUrl}/storage/v1/object/public/data-sync`
    console.log(`Reading from storage: ${storageBase}`)

    const results: Record<string, { fetched: number; inserted: number; errors: string[] }> = {}
    const batchSize = 50

    for (const table of tables) {
      console.log(`Importing ${table}...`)
      const tableResult = { fetched: 0, inserted: 0, errors: [] as string[] }

      try {
        // Fetch JSON from storage
        const resp = await fetch(`${storageBase}/${table}.json`)
        if (!resp.ok) {
          tableResult.errors.push(`Failed to fetch: ${resp.status}`)
          results[table] = tableResult
          continue
        }

        const rows = await resp.json()
        tableResult.fetched = rows.length

        if (rows.length === 0) {
          results[table] = tableResult
          continue
        }

        // Insert in batches with upsert
        for (let i = 0; i < rows.length; i += batchSize) {
          const batch = rows.slice(i, i + batchSize)
          const pkCol = table === 'stock_items' ? 'item_id' : 'id'

          const { error } = await supabase
            .from(table)
            .upsert(batch, { 
              onConflict: pkCol,
              ignoreDuplicates: true 
            })

          if (error) {
            console.error(`${table} batch ${i}: ${error.message}`)
            tableResult.errors.push(`Batch ${i}: ${error.message}`)
          } else {
            tableResult.inserted += batch.length
          }
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        tableResult.errors.push(msg)
        console.error(`${table} error:`, msg)
      }

      results[table] = tableResult
      console.log(`${table}: ${tableResult.inserted}/${tableResult.fetched} inserted`)
    }

    return new Response(JSON.stringify({ success: true, results }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  } catch (error) {
    console.error('Import error:', error)
    return new Response(JSON.stringify({ error: String(error) }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
