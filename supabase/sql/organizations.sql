-- Organizations and user_organizations (single-org per user) schema + RLS

create table if not exists public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  website text,
  support_email text,
  email_domain text unique,
  created_at timestamptz not null default now()
);

alter table if exists public.organizations
  add column if not exists website text,
  add column if not exists support_email text,
  add column if not exists email_domain text;

create index if not exists organizations_email_domain_idx on public.organizations (lower(email_domain));

create table if not exists public.user_organizations (
  user_id uuid primary key references auth.users(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete restrict,
  role text not null check (role in ('admin','member','viewer')) default 'member',
  created_at timestamptz not null default now()
);

-- RLS
alter table public.organizations enable row level security;
alter table public.user_organizations enable row level security;

-- Policies: user_organizations
create policy if not exists "uo_select_own"
on public.user_organizations
for select using (auth.uid() = user_id);

-- Insert/Update/Delete should be performed via secured RPC/edge functions only
create policy if not exists "uo_block_writes_direct"
on public.user_organizations
for all
using (false) with check (false);

-- Policies: organizations
-- Select organizations where the user has a membership
create policy if not exists "org_select_members"
on public.organizations
for select using (
  exists (
    select 1 from public.user_organizations uo
    where uo.organization_id = organizations.id
      and uo.user_id = auth.uid()
  )
);


