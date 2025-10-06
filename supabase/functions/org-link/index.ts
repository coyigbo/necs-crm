// Supabase Edge Function: Link user to single organization on signup
// Configure as an Auth Hook: After user confirmation (or Before sign in if needed)
// Deployment:
//   supabase functions deploy org-link --no-verify-jwt
// Hook URL: https://<PROJECT_REF>.functions.supabase.co/org-link

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

type HookPayload = {
  type: string;
  user?: {
    id: string;
    email?: string;
    user_metadata?: Record<string, unknown>;
  } | null;
};

const supabaseUrl = Deno.env.get("SUPABASE_URL");
const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
if (!supabaseUrl || !supabaseKey) {
  throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY env");
}

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
const admin = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false },
});

serve(async (req) => {
  if (req.method !== "POST")
    return new Response("Method Not Allowed", { status: 405 });
  try {
    const payload = (await req.json()) as HookPayload;
    const user = payload.user;
    if (!user?.id) return new Response(JSON.stringify({}), { status: 200 });

    const orgNameRaw = (
      user.user_metadata?.organization_name as string | undefined
    )?.trim();
    const orgName = orgNameRaw && orgNameRaw.length > 0 ? orgNameRaw : null;
    if (!orgName) return new Response(JSON.stringify({}), { status: 200 });

    // Derive email domain
    const email = user.email ?? "";
    const domainMatch = email.split("@")[1] ?? null;

    // Upsert organization by name and set email_domain if empty
    const { data: orgUpsert, error: orgErr } = await admin
      .from("organizations")
      .upsert(
        { name: orgName, email_domain: domainMatch },
        { onConflict: "name" }
      )
      .select("id")
      .single();
    if (orgErr) throw orgErr;

    const organization_id = orgUpsert.id as string;

    // Determine role: first user in org -> admin, else member
    const { count, error: countErr } = await admin
      .from("user_organizations")
      .select("user_id", { count: "exact", head: true })
      .eq("organization_id", organization_id);
    if (countErr) throw countErr;
    const role = (count ?? 0) === 0 ? "admin" : "member";

    // Insert membership if not exists
    const { error: linkErr } = await admin
      .from("user_organizations")
      .upsert(
        { user_id: user.id, organization_id, role },
        { onConflict: "user_id" }
      );
    if (linkErr) throw linkErr;

    return new Response(JSON.stringify({ ok: true }), { status: 200 });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500 });
  }
});
