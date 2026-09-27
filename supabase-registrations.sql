-- =====================================================================
-- Timely: business registrations from the website form.
-- Safe to re-run. Run once in the Supabase SQL editor.
-- =====================================================================

create table if not exists public.business_applications (
  id            uuid primary key default gen_random_uuid(),
  created_at    timestamptz not null default now(),
  business_name text not null,
  category      text not null,
  contact_name  text not null,
  email         text not null,
  phone         text not null,
  whatsapp      text not null,
  city          text,
  message       text,
  status        text not null default 'New',      -- New | Contacted | Set up | Declined
  business_id   uuid references public.businesses(id) on delete set null
);

create index if not exists business_applications_status_idx
  on public.business_applications (status, created_at desc);

-- Row Level Security ON with NO policies = nobody can read or write from the
-- browser. The website form saves through the server (/api/apply), and only the
-- super admin can read them (through /api/admin/applications).
alter table public.business_applications enable row level security;
