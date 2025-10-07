-- Grants schema (scoped by organization)
-- Run in Supabase SQL editor

create extension if not exists pgcrypto;

create table if not exists public.grants (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,

  donor_name text not null,
  date_opened date,
  date_due date,
  program text,
  value numeric(14,2),
  region text,
  contact text,
  review_url text,
  notes text,
  date_submission date,
  status text check (status in (
    'Queued','Pending Submission','Submission','Proposal Rejected','Proposal Accepted'
  )),
  report_due date,

  created_at timestamptz not null default now()
);

create index if not exists idx_grants_org on public.grants(organization_id);
create index if not exists idx_grants_org_due on public.grants(organization_id, date_due);

alter table public.grants enable row level security;

-- Select policy: users can read grants in their organization
create policy grants_select_by_org on public.grants for select using (
  exists (
    select 1 from public.user_organizations uo
    where uo.organization_id = grants.organization_id
      and uo.user_id = auth.uid()
  )
);

-- Insert policy: users can insert for their organization
create policy grants_insert_by_org on public.grants for insert with check (
  exists (
    select 1 from public.user_organizations uo
    where uo.organization_id = grants.organization_id
      and uo.user_id = auth.uid()
  )
);

-- Update policy
create policy grants_update_by_org on public.grants for update using (
  exists (
    select 1 from public.user_organizations uo
    where uo.organization_id = grants.organization_id
      and uo.user_id = auth.uid()
  )
) with check (
  exists (
    select 1 from public.user_organizations uo
    where uo.organization_id = grants.organization_id
      and uo.user_id = auth.uid()
  )
);

-- Delete policy
create policy grants_delete_by_org on public.grants for delete using (
  exists (
    select 1 from public.user_organizations uo
    where uo.organization_id = grants.organization_id
      and uo.user_id = auth.uid()
  )
);


