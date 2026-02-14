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
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

    // Auth check - admin only
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Authorization required' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const authClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    })
    const { data: { user }, error: authError } = await authClient.auth.getUser()
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const supabase = createClient(supabaseUrl, serviceKey)
    const { data: roleData } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .maybeSingle()

    if (!roleData) {
      return new Response(JSON.stringify({ error: 'Admin access required' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const tables = [
      'suppliers', 'employees', 'sequence_numbers', 'app_settings',
      'patients', 'stock_items', 'purchase_orders', 'purchase_order_items',
      'invoices', 'invoice_items', 'prescriptions', 'prescription_items',
      'appointments', 'day_reports', 'salary_employees', 'salary_records',
      'attendance_records', 'supplier_payments',
    ]

    const results: Record<string, number> = {}

    // Ensure bucket exists
    await supabase.storage.createBucket('data-sync', { public: true }).catch(() => {})

    for (const table of tables) {
      console.log(`Exporting ${table}...`)
      let allRows: Record<string, unknown>[] = []
      let from = 0
      const pageSize = 1000

      while (true) {
        const { data, error } = await supabase
          .from(table)
          .select('*')
          .range(from, from + pageSize - 1)
        if (error) {
          console.error(`Error fetching ${table}:`, error.message)
          break
        }
        if (!data || data.length === 0) break
        allRows = allRows.concat(data)
        if (data.length < pageSize) break
        from += pageSize
      }

      results[table] = allRows.length

      // Upload as JSON to storage
      const jsonData = JSON.stringify(allRows)
      const { error: uploadError } = await supabase.storage
        .from('data-sync')
        .upload(`${table}.json`, new Blob([jsonData], { type: 'application/json' }), {
          upsert: true,
          contentType: 'application/json',
        })

      if (uploadError) {
        console.error(`Upload error for ${table}:`, uploadError.message)
      } else {
        console.log(`Uploaded ${table}: ${allRows.length} rows`)
      }
    }

    return new Response(JSON.stringify({ success: true, exported: results }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  } catch (error) {
    console.error('Export error:', error)
    return new Response(JSON.stringify({ error: String(error) }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
