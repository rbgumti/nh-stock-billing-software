import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// Bump this when you change the function to confirm the deployed version.
const VERSION = 'create-user@2026-02-04_1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log(`[${VERSION}] ${req.method} ${new URL(req.url).pathname}`);
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized', _version: VERSION }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Create client with user's token to verify they're admin
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );

    // Verify user is authenticated and is admin
    const token = authHeader.replace('Bearer ', '');
    const { data: claims, error: claimsError } = await supabaseClient.auth.getUser(token);
    
    if (claimsError || !claims?.user) {
      return new Response(JSON.stringify({ error: 'Unauthorized', _version: VERSION }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check if user is admin using service role
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const { data: roleData } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', claims.user.id)
      .eq('role', 'admin')
      .maybeSingle();

    if (!roleData) {
      return new Response(JSON.stringify({ error: 'Only admins can create users', _version: VERSION }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { email, password, fullName, role, username } = await req.json();

    if (!email || !password || !role) {
      return new Response(JSON.stringify({ error: 'Email, password, and role are required', _version: VERSION }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (password.length < 8) {
      return new Response(JSON.stringify({ error: 'Password must be at least 8 characters', _version: VERSION }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check if username is already taken (if provided)
    if (username) {
      const { data: existingUsername } = await supabaseAdmin
        .from('profiles')
        .select('id')
        .ilike('username', username)
        .maybeSingle();

      if (existingUsername) {
        return new Response(JSON.stringify({ error: 'Username is already taken', _version: VERSION }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    // Create user with admin client
    const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Auto-confirm email
    });

    if (createError) {
      return new Response(JSON.stringify({ error: createError.message, _version: VERSION }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Create or update profile.
    // IMPORTANT: profiles.user_id is unique (used by login + role joins),
    // so a plain insert can fail if a profile already exists.
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .upsert(
        {
          user_id: newUser.user.id,
          email,
          full_name: fullName || null,
          username: username || null,
        },
        { onConflict: 'user_id' }
      );

    if (profileError) {
      // Roll back auth user to avoid orphaned accounts
      await supabaseAdmin.auth.admin.deleteUser(newUser.user.id);
      return new Response(JSON.stringify({ error: `Profile creation failed: ${profileError.message}`, _version: VERSION }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Assign role
    const { error: roleError } = await supabaseAdmin
      .from('user_roles')
      .insert({
        user_id: newUser.user.id,
        role,
      });

    if (roleError) {
      // Roll back created data to avoid users with no permissions
      await supabaseAdmin.from('profiles').delete().eq('user_id', newUser.user.id);
      await supabaseAdmin.auth.admin.deleteUser(newUser.user.id);

      return new Response(JSON.stringify({ error: `Role assignment failed: ${roleError.message}`, _version: VERSION }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ success: true, userId: newUser.user.id, _version: VERSION }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error:', error);
    return new Response(JSON.stringify({ error: error.message, _version: VERSION }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
