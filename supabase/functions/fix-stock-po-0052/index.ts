import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Fix PREGABALIN M (item_id 18): +2500
    const { data: item18, error: e1 } = await supabase
      .from("stock_items")
      .select("current_stock")
      .eq("item_id", 18)
      .single();
    if (e1) throw e1;

    const { error: u1 } = await supabase
      .from("stock_items")
      .update({ current_stock: (item18?.current_stock || 0) + 2500 })
      .eq("item_id", 18);
    if (u1) throw u1;

    // Fix WINAM 1 (item_id 26): +1000
    const { data: item26, error: e2 } = await supabase
      .from("stock_items")
      .select("current_stock")
      .eq("item_id", 26)
      .single();
    if (e2) throw e2;

    const { error: u2 } = await supabase
      .from("stock_items")
      .update({ current_stock: (item26?.current_stock || 0) + 1000 })
      .eq("item_id", 26);
    if (u2) throw u2;

    // Fix received_quantity on PO items
    const { error: u3 } = await supabase
      .from("purchase_order_items")
      .update({ received_quantity: 2500 })
      .eq("purchase_order_id", "78051997-558f-4ae8-9fde-aebdd7aa6843")
      .eq("stock_item_id", 18);
    if (u3) throw u3;

    const { error: u4 } = await supabase
      .from("purchase_order_items")
      .update({ received_quantity: 1000 })
      .eq("purchase_order_id", "78051997-558f-4ae8-9fde-aebdd7aa6843")
      .eq("stock_item_id", 26);
    if (u4) throw u4;

    return new Response(
      JSON.stringify({
        success: true,
        message: "Stock fixed: PREGABALIN M +2500, WINAM 1 +1000, PO items updated",
        pregabalin_new_stock: (item18?.current_stock || 0) + 2500,
        winam_new_stock: (item26?.current_stock || 0) + 1000,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
