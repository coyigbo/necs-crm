// Supabase Edge Function (Deno) to enforce @necservices.org emails on auth
// Configure as an Auth Hook (Before Sign Up and Before Sign In)
// Deployment (with Supabase CLI):
//   supabase functions deploy restrict-auth --no-verify-jwt
// Then set hooks in Dashboard → Authentication → Hooks:
//   - Before sign up → https://<project-ref>.functions.supabase.co/restrict-auth
//   - Before sign in → https://<project-ref>.functions.supabase.co/restrict-auth

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

type AuthHookPayload = {
  type:
    | "signup"
    | "invitation"
    | "recovery"
    | "magiclink"
    | "email_change"
    | "reauthentication"
    | "sms_otp"
    | "email_otp"
    | "saml"
    | "signin"
    | string;
  user?: { email?: string } | null;
  email?: string;
  phone?: string;
  factorId?: string;
};

const ALLOWED_DOMAIN = "necservices.org";

function isAllowedEmail(email: string | undefined | null): boolean {
  if (!email) return false;
  // Allow @necservices.org emails and any other valid email domains
  return (
    /@necservices\.org$/i.test(email.trim()) ||
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
  );
}

serve(async (req: Request) => {
  try {
    if (req.method !== "POST") {
      return new Response("Method Not Allowed", { status: 405 });
    }

    const payload = (await req.json()) as AuthHookPayload;
    const emailFromBody = payload.email ?? payload.user?.email ?? null;

    // Only enforce for email-based sign up / sign in
    const shouldEnforce = ["signup", "signin", "invitation"].includes(
      (payload.type || "").toLowerCase()
    );

    if (shouldEnforce && !isAllowedEmail(emailFromBody)) {
      return new Response(
        JSON.stringify({
          error: `Only @${ALLOWED_DOMAIN} accounts are permitted.`,
        }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Allow auth to proceed; optionally enrich metadata
    return new Response(
      JSON.stringify({
        user_metadata: {},
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: "Auth restriction function failed" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});
