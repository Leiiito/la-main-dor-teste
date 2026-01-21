// Supabase Edge Function — admin-api
// Objectif : permettre à /admin (site statique) d'écrire en DB + Storage sans exposer la clé service_role.
// Déploiement : Supabase Dashboard > Edge Functions > "Deploy a new function" > coller ce fichier index.ts
//
// Secrets à configurer (Dashboard > Edge Functions > Secrets) :
// - ADMIN_PASSWORD
// - SUPABASE_URL
// - SUPABASE_SERVICE_ROLE_KEY

import { createClient } from "npm:@supabase/supabase-js@2";

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders() });
  }

  try {
    const body = await req.json();
    const password = String(body?.password || "");
    const adminPassword = Deno.env.get("ADMIN_PASSWORD") ?? "";

    if (!adminPassword || password !== adminPassword) {
      return new Response(JSON.stringify({ error: "unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders(), "Content-Type": "application/json" },
      });
    }

    const url = Deno.env.get("SUPABASE_URL") ?? "";
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const supabaseAdmin = createClient(url, serviceKey);

    const action = String(body?.action || "");

    if (action === "save_settings") {
      const value = body?.value ?? {};
      const { error } = await supabaseAdmin
        .from("settings")
        .upsert({ key: "global", value, updated_at: new Date().toISOString() }, { onConflict: "key" });

      if (error) throw error;

      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders(), "Content-Type": "application/json" },
      });
    }

    if (action === "replace_reviews") {
      const reviews = Array.isArray(body?.reviews) ? body.reviews : [];

      // On remplace toute la table (simple et robuste pour une liste courte)
      const { error: delErr } = await supabaseAdmin.from("reviews").delete().neq("id", "00000000-0000-0000-0000-000000000000");
      if (delErr) throw delErr;

      if (reviews.length) {
        const rows = reviews.map((r: any, idx: number) => ({
          // si l'admin stocke un id, on le garde
          id: r.id || undefined,
          author: (r.name || "Cliente").toString(),
          rating: Math.max(1, Math.min(5, parseInt(r.rating, 10) || 5)),
          text: (r.text || "").toString(),
          date: (r.date || "").toString(),
          order_index: Number.isFinite(+r.order_index) ? +r.order_index : idx * 10,
        }));

        const { error: insErr } = await supabaseAdmin.from("reviews").insert(rows);
        if (insErr) throw insErr;
      }

      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders(), "Content-Type": "application/json" },
      });
    }

    if (action === "upload_image") {
      const bucket = String(body?.bucket || "public-images");
      const folder = String(body?.folder || "uploads");
      const dataUrl = String(body?.data_url || "");

      const match = dataUrl.match(/^data:(image\/(png|jpeg|jpg|webp));base64,(.+)$/i);
      if (!match) {
        return new Response(JSON.stringify({ error: "invalid_data_url" }), {
          status: 400,
          headers: { ...corsHeaders(), "Content-Type": "application/json" },
        });
      }

      const mime = match[1].toLowerCase();
      const b64 = match[3];
      const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));

      const ext = mime.includes("png") ? "png" : mime.includes("webp") ? "webp" : "jpg";
      const path = `${folder}/${Date.now()}.${ext}`;

      const { error: upErr } = await supabaseAdmin
        .storage
        .from(bucket)
        .upload(path, bytes, { contentType: mime, upsert: true });

      if (upErr) throw upErr;

      const publicUrl = `${url}/storage/v1/object/public/${bucket}/${path}`;

      return new Response(JSON.stringify({ ok: true, publicUrl }), {
        headers: { ...corsHeaders(), "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "unknown_action" }), {
      status: 400,
      headers: { ...corsHeaders(), "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e?.message || e) }), {
      status: 500,
      headers: { ...corsHeaders(), "Content-Type": "application/json" },
    });
  }
});
