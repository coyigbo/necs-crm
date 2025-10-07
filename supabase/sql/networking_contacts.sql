-- Networking contacts schema (scoped by organization)
-- Run in Supabase SQL editor

create extension if not exists pgcrypto;

create table if not exists public.networking_contacts (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,

  name text not null,
  organization text,
  title text,
  email text,
  phone text,
  donor text,           -- store raw values like Y/N/Yes
  award_ceremony text,  -- e.g., Inv/Yes/No
  status text,          -- optional app-defined status

  created_at timestamptz not null default now()
);

create index if not exists idx_networking_contacts_org on public.networking_contacts(organization_id);
create index if not exists idx_networking_contacts_org_name on public.networking_contacts(organization_id, name);

alter table public.networking_contacts enable row level security;

-- Select policy: users can read rows for their organization
create policy networking_contacts_select_by_org on public.networking_contacts for select using (
  exists (
    select 1 from public.user_organizations uo
    where uo.organization_id = networking_contacts.organization_id
      and uo.user_id = auth.uid()
  )
);

-- Insert policy: users can insert rows for their organization
create policy networking_contacts_insert_by_org on public.networking_contacts for insert with check (
  exists (
    select 1 from public.user_organizations uo
    where uo.organization_id = networking_contacts.organization_id
      and uo.user_id = auth.uid()
  )
);

-- Update policy: users can update rows for their organization
create policy networking_contacts_update_by_org on public.networking_contacts for update using (
  exists (
    select 1 from public.user_organizations uo
    where uo.organization_id = networking_contacts.organization_id
      and uo.user_id = auth.uid()
  )
) with check (
  exists (
    select 1 from public.user_organizations uo
    where uo.organization_id = networking_contacts.organization_id
      and uo.user_id = auth.uid()
  )
);

-- Delete policy: users can delete rows for their organization
create policy networking_contacts_delete_by_org on public.networking_contacts for delete using (
  exists (
    select 1 from public.user_organizations uo
    where uo.organization_id = networking_contacts.organization_id
      and uo.user_id = auth.uid()
  )
);


