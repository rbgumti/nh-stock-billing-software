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
    const importSecret = Deno.env.get('IMPORT_SECRET')

    // Authenticate the caller as admin
    const authHeader = req.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const userClient = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: authHeader } },
    })

    const token = authHeader.replace('Bearer ', '')
    const { data: claims, error: claimsError } = await userClient.auth.getUser(token)
    if (claimsError || !claims?.user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Verify admin role
    const adminClient = createClient(supabaseUrl, serviceKey)
    const { data: roleData } = await adminClient
      .from('user_roles')
      .select('role')
      .eq('user_id', claims.user.id)
      .eq('role', 'admin')
      .maybeSingle()

    if (!roleData) {
      return new Response(JSON.stringify({ error: 'Only admins can sync data' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Parse body to get liveUrl and liveAnonKey
    const body = await req.json()
    const { liveUrl, liveAnonKey } = body

    if (!liveUrl || !liveAnonKey) {
      return new Response(JSON.stringify({ error: 'liveUrl and liveAnonKey are required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const testStorageUrl = `${supabaseUrl}/storage/v1/object/public/data-sync`

    // Step 1: Export data from Test DB to Test storage
    const { data: exportData, error: exportError } = await adminClient.functions.invoke('export-data-storage', {
      headers: { Authorization: authHeader },
    })

    if (exportError) {
      return new Response(JSON.stringify({ error: `Export failed: ${exportError.message}` }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Step 2: Call Live import function with the shared secret
    const importResp = await fetch(`${liveUrl}/functions/v1/import-data-storage`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': liveAnonKey,
        'Authorization': `Bearer ${liveAnonKey}`,
        'x-import-secret': importSecret || '',
      },
      body: JSON.stringify({ sourceStorageUrl: testStorageUrl }),
    })

    if (!importResp.ok) {
      const errBody = await importResp.text()
      return new Response(JSON.stringify({ error: `Live import failed (${importResp.status}): ${errBody}` }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const importData = await importResp.json()

    return new Response(JSON.stringify({ 
      success: true, 
      exported: (exportData as any)?.exported || null,
      imported: importData 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('Sync error:', error)
    const msg = error instanceof Error ? error.message : String(error)
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
