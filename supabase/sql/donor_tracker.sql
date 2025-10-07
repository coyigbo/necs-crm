-- Donor Tracker schema (scoped by organization)
-- Run in Supabase SQL editor

create extension if not exists pgcrypto;

create table if not exists public.donor_tracker (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,

  donor_name text not null,
  date_opened date,
  date_due date,
  program text,
  value text, -- keep as raw text to allow ranges like "5000-20000"
  region text,
  contact text,
  review_url text,
  notes text,
  date_submission date,
  report_due date,
  status text,

  created_at timestamptz not null default now()
);

create index if not exists idx_donor_tracker_org on public.donor_tracker(organization_id);
create index if not exists idx_donor_tracker_org_due on public.donor_tracker(organization_id, date_due);

alter table public.donor_tracker enable row level security;

-- Select policy: users can read rows for their organization
create policy donor_tracker_select_by_org on public.donor_tracker for select using (
  exists (
    select 1 from public.user_organizations uo
    where uo.organization_id = donor_tracker.organization_id
      and uo.user_id = auth.uid()
  )
);

-- Insert policy: users can insert rows for their organization
create policy donor_tracker_insert_by_org on public.donor_tracker for insert with check (
  exists (
    select 1 from public.user_organizations uo
    where uo.organization_id = donor_tracker.organization_id
      and uo.user_id = auth.uid()
  )
);

-- Update policy: users can update rows for their organization
create policy donor_tracker_update_by_org on public.donor_tracker for update using (
  exists (
    select 1 from public.user_organizations uo
    where uo.organization_id = donor_tracker.organization_id
      and uo.user_id = auth.uid()
  )
) with check (
  exists (
    select 1 from public.user_organizations uo
    where uo.organization_id = donor_tracker.organization_id
      and uo.user_id = auth.uid()
  )
);

-- Delete policy: users can delete rows for their organization
create policy donor_tracker_delete_by_org on public.donor_tracker for delete using (
  exists (
    select 1 from public.user_organizations uo
    where uo.organization_id = donor_tracker.organization_id
      and uo.user_id = auth.uid()
  )
);


