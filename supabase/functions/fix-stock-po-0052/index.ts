import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Correct stock as of 1 March 2026 per attached report
const STOCK_CORRECTIONS: { item_id: number; name: string; current_stock: number }[] = [
  { item_id: 1, name: "Addnok N 0.4 mg", current_stock: 0 },
  { item_id: 38, name: "Addnok N 0.4 mg (Batch 2)", current_stock: 5485 },
  { item_id: 2, name: "Addnok N 2 mg", current_stock: 14388 },
  { item_id: 7, name: "AFTIN", current_stock: 504 },
  { item_id: 8, name: "AMITRI-10", current_stock: 130 },
  { item_id: 5, name: "Ari-Rok N", current_stock: 1679 },
  { item_id: 4, name: "Boquit Plus", current_stock: 17918 },
  { item_id: 3, name: "Buset Plus", current_stock: 0 },
  { item_id: 14, name: "CLONIDINE 0.1 MG TAB", current_stock: 0 },
  { item_id: 31, name: "Cyptor syrup", current_stock: 10 },
  { item_id: 9, name: "DIVSHOR-ER-250", current_stock: 0 },
  { item_id: 10, name: "DONAKEM-M", current_stock: 140 },
  { item_id: 30, name: "EMEGA-4G", current_stock: 186 },
  { item_id: 11, name: "ESCTOLPRAM-10", current_stock: 194 },
  { item_id: 12, name: "ESCTOLPRAM-20", current_stock: 118 },
  { item_id: 13, name: "Ewin 0.5", current_stock: 391 },
  { item_id: 23, name: "ISPRO 2", current_stock: 100 },
  { item_id: 28, name: "Laxwin", current_stock: 10 },
  { item_id: 15, name: "NEPZ-2", current_stock: 0 },
  { item_id: 32, name: "NEPZ-2 (Batch 2)", current_stock: 984 },
  { item_id: 16, name: "OJOPINE 10", current_stock: 0 },
  { item_id: 17, name: "PILO-20", current_stock: 69 },
  { item_id: 41, name: "PREGABALIN M (Batch 2)", current_stock: 0 },
  { item_id: 18, name: "PREGABALIN M", current_stock: 0 },
  { item_id: 19, name: "PROXY -CR 25", current_stock: 319 },
  { item_id: 21, name: "S-DEPWIN PLUS", current_stock: 312 },
  { item_id: 20, name: "SANTROL-50", current_stock: 166 },
  { item_id: 35, name: "Spastin SR 20", current_stock: 95 },
  { item_id: 36, name: "Syotin-20", current_stock: 100 },
  { item_id: 42, name: "Tapyad 100 MG (Batch 2)", current_stock: 35 },
  { item_id: 6, name: "Tapyad 100 MG", current_stock: 0 },
  { item_id: 29, name: "V-QUIT 100", current_stock: 550 },
  { item_id: 24, name: "V-QUIT 50", current_stock: 1057 },
  { item_id: 40, name: "VCLOD (Batch 2)", current_stock: 0 },
  { item_id: 37, name: "VCLOD", current_stock: 379 },
  { item_id: 25, name: "WILCID DSR", current_stock: 120 },
  { item_id: 34, name: "WILLRICH-P", current_stock: 1991 },
  { item_id: 33, name: "WINAC INJ", current_stock: 16 },
  { item_id: 26, name: "WINAM 1", current_stock: 845 },
  { item_id: 39, name: "WINAM 2", current_stock: 895 },
  { item_id: 27, name: "WINAM-0.5", current_stock: 626 },
  { item_id: 22, name: "WINFORCE-D", current_stock: 103 },
];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const results: { item_id: number; name: string; old: number; new_stock: number }[] = [];
    const errors: string[] = [];

    for (const item of STOCK_CORRECTIONS) {
      // Get current stock first
      const { data: existing } = await supabase
        .from("stock_items")
        .select("item_id, current_stock")
        .eq("item_id", item.item_id)
        .maybeSingle();

      if (!existing) {
        errors.push(`Item ${item.item_id} (${item.name}) not found - skipped`);
        continue;
      }

      const { error } = await supabase
        .from("stock_items")
        .update({ current_stock: item.current_stock })
        .eq("item_id", item.item_id);

      if (error) {
        errors.push(`Item ${item.item_id} (${item.name}): ${error.message}`);
      } else {
        results.push({
          item_id: item.item_id,
          name: item.name,
          old: existing.current_stock,
          new_stock: item.current_stock,
        });
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Updated ${results.length}/${STOCK_CORRECTIONS.length} items`,
        updated: results,
        errors: errors.length > 0 ? errors : undefined,
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
