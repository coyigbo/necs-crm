// @ts-nocheck
// Edge Function: user-names
// Usage: POST with JSON { userIds: string[] }
// Returns: { names: Record<userId, fullName>, emails: Record<userId, email> }

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabaseUrl = Deno.env.get("SUPABASE_URL");
const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
if (!supabaseUrl || !supabaseKey) throw new Error("Missing Supabase env");

const admin = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false },
});

interface NamesRequest {
  userIds?: string[];
}

// deno-lint-ignore no-explicit-any
function coalesceName(user: any): string | null {
  const md = user?.user_metadata ?? {};
  const full = (md.full_name as string | undefined)?.trim();
  if (full) return full;
  const first = (md.first_name as string | undefined)?.trim();
  const last = (md.last_name as string | undefined)?.trim();
  const combined = [first, last].filter(Boolean).join(" ").trim();
  return combined.length > 0 ? combined : null;
}

// deno-lint-ignore no-explicit-any
function isStringArray(arr: any): arr is string[] {
  return Array.isArray(arr) && arr.every((x) => typeof x === "string");
}

// deno-lint-ignore no-explicit-any
serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("", { headers: corsHeaders() });
  }
  if (req.method !== "POST") {
    return new Response("Method Not Allowed", {
      status: 405,
      headers: corsHeaders(),
    });
  }
  try {
    const body = (await req.json().catch(() => ({}))) as NamesRequest;
    const ids = (body.userIds ?? []).filter(Boolean);
    if (!isStringArray(ids) || ids.length === 0) {
      return new Response(JSON.stringify({ names: {} }), {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders() },
      });
    }

    const uniqueIds = Array.from(new Set(ids));
    const results = await Promise.all(
      uniqueIds.map(async (id) => {
        const { data, error } = await admin.auth.admin.getUserById(id);
        if (error || !data?.user) return [id, null, null] as const;
        return [
          id,
          coalesceName(data.user),
          (data.user.email as string | null) ?? null,
        ] as const;
      })
    );

    const names: Record<string, string> = {};
    const emails: Record<string, string> = {};
    for (const [id, name, email] of results) {
      if (name) names[id] = name;
      if (email) emails[id] = email;
    }

    return new Response(JSON.stringify({ names, emails }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders() },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: "Bad Request" }), {
      status: 400,
      headers: { "Content-Type": "application/json", ...corsHeaders() },
    });
  }
});

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type",
  } as Record<string, string>;
}
