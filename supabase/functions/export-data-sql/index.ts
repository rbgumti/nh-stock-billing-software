import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function escapeSQL(val: unknown): string {
  if (val === null || val === undefined) return 'NULL'
  if (typeof val === 'number') return String(val)
  if (typeof val === 'boolean') return val ? 'TRUE' : 'FALSE'
  if (typeof val === 'object') return `'${JSON.stringify(val).replace(/'/g, "''")}'::jsonb`
  return `'${String(val).replace(/'/g, "''")}'`
}

function buildInsert(table: string, rows: Record<string, unknown>[]): string {
  if (!rows.length) return `-- No data in ${table}\n`
  const cols = Object.keys(rows[0])
  const lines: string[] = []
  lines.push(`-- Table: ${table} (${rows.length} rows)`)
  lines.push(`-- Disable triggers for faster import`)
  lines.push(`ALTER TABLE public.${table} DISABLE TRIGGER ALL;`)
  
  // batch inserts in groups of 50
  for (let i = 0; i < rows.length; i += 50) {
    const batch = rows.slice(i, i + 50)
    const values = batch.map(row => {
      const vals = cols.map(c => escapeSQL(row[c]))
      return `(${vals.join(', ')})`
    }).join(',\n')
    lines.push(`INSERT INTO public.${table} (${cols.map(c => `"${c}"`).join(', ')}) VALUES\n${values}\nON CONFLICT DO NOTHING;`)
  }
  
  lines.push(`ALTER TABLE public.${table} ENABLE TRIGGER ALL;`)
  lines.push('')
  return lines.join('\n')
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

    const adminClient = createClient(supabaseUrl, serviceKey)
    const { data: roleData } = await adminClient
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

    const supabase = adminClient
    const sql: string[] = []
    sql.push('-- NH Software: Full Data Export from Test Environment')
    sql.push(`-- Generated: ${new Date().toISOString()}`)
    sql.push('-- Run this in Cloud View > Run SQL with "Live" selected')
    sql.push('BEGIN;')
    sql.push('')

    // Export order respects foreign key dependencies
    const tables = [
      'suppliers',
      'employees', 
      'sequence_numbers',
      'app_settings',
      'patients',
      'stock_items',
      'purchase_orders',
      'purchase_order_items',
      'invoices',
      'invoice_items',
      'prescriptions',
      'prescription_items',
      'appointments',
      'day_reports',
      'salary_employees',
      'salary_records',
      'attendance_records',
      'supplier_payments',
    ]

    for (const table of tables) {
      console.log(`Exporting ${table}...`)
      // Fetch all rows (handle >1000 with pagination)
      let allRows: Record<string, unknown>[] = []
      let from = 0
      const pageSize = 1000
      while (true) {
        const { data, error } = await supabase
          .from(table)
          .select('*')
          .range(from, from + pageSize - 1)
        if (error) {
          sql.push(`-- ERROR exporting ${table}: ${error.message}`)
          break
        }
        if (!data || data.length === 0) break
        allRows = allRows.concat(data)
        if (data.length < pageSize) break
        from += pageSize
      }
      sql.push(buildInsert(table, allRows))
    }

    sql.push('COMMIT;')
    
    const output = sql.join('\n')
    console.log(`Export complete: ${output.length} characters`)

    return new Response(output, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'text/plain; charset=utf-8',
        'Content-Disposition': 'attachment; filename="nh-data-export.sql"',
      }
    })
  } catch (error) {
    console.error('Export error:', error)
    return new Response(JSON.stringify({ error: String(error) }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
