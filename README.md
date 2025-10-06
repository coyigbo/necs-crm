# necs-crm

## Auth Domain Restriction (Supabase)

This project includes an Edge Function to restrict authentication to `@necservices.org` emails.

### Prerequisites

- Supabase CLI installed (`npm i -g supabase`)
- Logged in: `supabase login`
- Linked to your project: `supabase link --project-ref <PROJECT_REF>`

### Deploy Function

```bash
supabase functions deploy restrict-auth --no-verify-jwt
```

### Configure Auth Hooks

In Supabase Dashboard → Authentication → Hooks, add the function URL:

- Before sign up → `https://<PROJECT_REF>.functions.supabase.co/restrict-auth`
- Before sign in → `https://<PROJECT_REF>.functions.supabase.co/restrict-auth`

The function returns 400 for emails not ending with `@necservices.org`.

### Local Dev

Optionally test locally:

```bash
supabase functions serve restrict-auth --no-verify-jwt
```

Then point hooks to your local URL (via a tunnel like `ngrok`) while testing.
