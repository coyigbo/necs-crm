-- Closed Client Files schema (scoped by organization)
-- Run this in Supabase SQL Editor

-- Optional: ensure pgcrypto for gen_random_uuid()
create extension if not exists pgcrypto;

-- Ensure organizations exists (in case this file is run standalone)
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

-- Ensure user_organizations exists (single-org per user)
create table if not exists public.user_organizations (
  user_id uuid primary key references auth.users(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete restrict,
  role text not null check (role in ('admin','member','viewer')) default 'member',
  created_at timestamptz not null default now()
);

create table if not exists public.closed_client_files (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  -- Fiscal year of the record
  year integer not null check (year between 2000 and 2100),

  -- Core fields mapped from the CSV sample
  client_name text not null,
  life_coach text,
  start_date date,
  end_date date,
  area_office text,
  race_eth text,
  sex text,
  case_code text,          -- from CSV header "Case "
  age integer,
  hometown text,
  model text,
  notes text,

  created_at timestamptz not null default now()
);

-- Helpful indexes
create index if not exists idx_cclf_org on public.closed_client_files (organization_id);
create index if not exists idx_cclf_org_year on public.closed_client_files (organization_id, year);
create index if not exists idx_cclf_org_start on public.closed_client_files (organization_id, start_date);

-- Row Level Security: scope all access by the user’s organization
alter table public.closed_client_files enable row level security;

-- A user can read rows for organizations they belong to
create policy cclf_select_by_org
on public.closed_client_files
for select
using (
  exists (
    select 1
    from public.user_organizations uo
    where uo.organization_id = closed_client_files.organization_id
      and uo.user_id = auth.uid()
  )
);

-- A user can insert rows only for their organization
create policy cclf_insert_by_org
on public.closed_client_files
for insert
with check (
  exists (
    select 1
    from public.user_organizations uo
    where uo.organization_id = closed_client_files.organization_id
      and uo.user_id = auth.uid()
  )
);

-- A user can update rows only for their organization
create policy cclf_update_by_org
on public.closed_client_files
for update
using (
  exists (
    select 1
    from public.user_organizations uo
    where uo.organization_id = closed_client_files.organization_id
      and uo.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.user_organizations uo
    where uo.organization_id = closed_client_files.organization_id
      and uo.user_id = auth.uid()
  )
);

-- A user can delete rows only for their organization
create policy cclf_delete_by_org
on public.closed_client_files
for delete
using (
  exists (
    select 1
    from public.user_organizations uo
    where uo.organization_id = closed_client_files.organization_id
      and uo.user_id = auth.uid()
  )
);


