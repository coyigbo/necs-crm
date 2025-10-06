// Edge Function: org-lookup
// Usage: POST with JSON { domain: "example.org" } or GET ?domain=example.org
// Returns: { name: string | null }

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabaseUrl = Deno.env.get("SUPABASE_URL");
const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
if (!supabaseUrl || !serviceKey) throw new Error("Missing Supabase env");

const admin = createClient(supabaseUrl, serviceKey, {
  auth: { persistSession: false },
});

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type",
  } as Record<string, string>;
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("", { headers: corsHeaders() });
  }

  try {
    let domain = "";
    if (req.method === "GET") {
      const url = new URL(req.url);
      domain = (url.searchParams.get("domain") || "").toLowerCase();
    } else if (req.method === "POST") {
      const body = await req.json().catch(() => ({}));
      domain = (body?.domain || "").toLowerCase();
    } else {
      return new Response("Method Not Allowed", {
        status: 405,
        headers: corsHeaders(),
      });
    }

    if (!domain) {
      return new Response(JSON.stringify({ name: null }), {
        status: 200,
        headers: { ...corsHeaders(), "Content-Type": "application/json" },
      });
    }

    const { data, error } = await admin
      .from("organizations")
      .select("name")
      .eq("email_domain", domain)
      .maybeSingle();

    if (error) throw error;

    return new Response(JSON.stringify({ name: data?.name ?? null }), {
      status: 200,
      headers: { ...corsHeaders(), "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ name: null }), {
      status: 200,
      headers: { ...corsHeaders(), "Content-Type": "application/json" },
    });
  }
});
