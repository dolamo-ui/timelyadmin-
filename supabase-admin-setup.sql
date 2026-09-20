-- =====================================================================
-- Timely Admin — Supabase setup (v2, safe to re-run any number of times)
-- Run the WHOLE file in the Supabase SQL editor.
-- Policies are additive: your existing customer/mobile policies keep working.
-- =====================================================================

-- 0. Columns the admin needs on businesses (no-ops if they already exist)
alter table public.businesses
  add column if not exists owner_id uuid references auth.users(id) on delete set null;
create index if not exists businesses_owner_id_idx on public.businesses(owner_id);

-- Check-in: when the owner scans a customer's QR ticket, the arrival time is stamped here.
alter table public.bookings
  add column if not exists checked_in_at timestamptz;

-- 1. Helper: "does the signed-in user own this business?"
--    SECURITY DEFINER so it works no matter what the RLS rules on `businesses`
--    are — the previous version's policies silently failed when they couldn't
--    read the business row, which is what caused
--    "new row violates row-level security policy for table services".
create or replace function public.owns_business(_business_id text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.businesses b
    where b.id::text = _business_id and b.owner_id = auth.uid()
  );
$$;
grant execute on function public.owns_business(text) to authenticated;

-- 2. Make sure RLS is on
alter table public.businesses enable row level security;
alter table public.services   enable row level security;
alter table public.staff      enable row level security;
alter table public.bookings   enable row level security;
alter table public.profiles   enable row level security;

-- 3. businesses: owners read + update their own row (no insert/delete: the
--    server creates businesses with the service role)
drop policy if exists "admin: owner reads own business" on public.businesses;
create policy "admin: owner reads own business"
  on public.businesses for select
  using (owner_id = auth.uid());

drop policy if exists "admin: owner updates own business" on public.businesses;
create policy "admin: owner updates own business"
  on public.businesses for update
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());   -- an owner can't hand the business to someone else

-- 4. services + staff: owners manage the ones for their business
drop policy if exists "admin: owner manages own services" on public.services;
create policy "admin: owner manages own services"
  on public.services for all
  using (public.owns_business(business_id::text))
  with check (public.owns_business(business_id::text));

drop policy if exists "admin: owner manages own staff" on public.staff;
create policy "admin: owner manages own staff"
  on public.staff for all
  using (public.owns_business(business_id::text))
  with check (public.owns_business(business_id::text));

-- 5. bookings: owners see + update bookings made at their business
drop policy if exists "admin: owner reads own bookings" on public.bookings;
create policy "admin: owner reads own bookings"
  on public.bookings for select
  using (public.owns_business(business_id::text));

drop policy if exists "admin: owner updates own bookings" on public.bookings;
create policy "admin: owner updates own bookings"
  on public.bookings for update
  using (public.owns_business(business_id::text))
  with check (public.owns_business(business_id::text));

-- 6. profiles: everyone can read their OWN row (the admin login check needs this).
drop policy if exists "admin: users read own profile" on public.profiles;
create policy "admin: users read own profile"
  on public.profiles for select
  using (id = auth.uid());

-- 7. profiles: owners can read the names of customers who booked with them.
--    Only created if your bookings table has a user_id column.
do $$
begin
  if exists (select 1 from information_schema.columns
             where table_schema = 'public' and table_name = 'bookings' and column_name = 'user_id') then

    execute $f$
      create or replace function public.owns_customer(_user_id text)
      returns boolean language sql stable security definer set search_path = public as $b$
        select exists (
          select 1 from public.bookings bk
          join public.businesses b on b.id::text = bk.business_id::text
          where bk.user_id::text = _user_id and b.owner_id = auth.uid()
        );
      $b$
    $f$;
    execute 'grant execute on function public.owns_customer(text) to authenticated';

    execute 'drop policy if exists "admin: owner reads customers of own bookings" on public.profiles';
    execute 'create policy "admin: owner reads customers of own bookings"
             on public.profiles for select using (public.owns_customer(id::text))';
  end if;
end $$;

-- 8. Photos: public bucket for business images; owners can only write inside
--    a folder named after their own business id.
insert into storage.buckets (id, name, public)
values ('business-images', 'business-images', true)
on conflict (id) do update set public = true;

drop policy if exists "admin: owners upload own business images" on storage.objects;
create policy "admin: owners upload own business images"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'business-images'
              and public.owns_business((storage.foldername(name))[1]));

drop policy if exists "admin: owners delete own business images" on storage.objects;
create policy "admin: owners delete own business images"
  on storage.objects for delete to authenticated
  using (bucket_id = 'business-images'
         and public.owns_business((storage.foldername(name))[1]));

-- 9. Stop people promoting themselves. If the mobile app lets users edit their
--    own profile row, any customer could set role = 'super_admin'. This blocks
--    role changes from API users; the service role and this SQL editor still work.
create or replace function public.protect_profile_role()
returns trigger language plpgsql as $$
begin
  if new.role is distinct from old.role and current_user in ('authenticated', 'anon') then
    raise exception 'role can only be changed by an administrator';
  end if;
  return new;
end $$;

drop trigger if exists protect_profile_role on public.profiles;
create trigger protect_profile_role
  before update on public.profiles
  for each row execute function public.protect_profile_role();

-- 10. Make yourself super admin (do this once):
-- update public.profiles set role = 'super_admin' where id = '<your-auth-user-uuid>';


-- =====================================================================
-- OPTIONAL — fix opening hours on your existing businesses.
-- Your seeded rows store hours like {"monday":"09:00-17:00","sunday":"Closed"},
-- but the mobile booking + details screens read {"1":{"open","close","closed"}}
-- (keys 0-6, Sunday = 0). In that state the app sees those businesses as closed.
-- Step A — preview what would change:
--   select name, opening_hours from public.businesses
--   where opening_hours::text ~ '"(monday|tuesday|wednesday|thursday|friday|saturday|sunday)"';
-- Step B — run this to convert them (days that aren't "HH:MM-HH:MM" become closed):
-- =====================================================================
-- update public.businesses b
-- set opening_hours = (
--   select jsonb_object_agg(
--     d.idx::text,
--     case
--       when replace(coalesce(b.opening_hours ->> d.dname, ''), ' ', '') ~ '^[0-9]{1,2}:[0-9]{2}-[0-9]{1,2}:[0-9]{2}$'
--       then jsonb_build_object(
--              'open',   split_part(replace(b.opening_hours ->> d.dname, ' ', ''), '-', 1),
--              'close',  split_part(replace(b.opening_hours ->> d.dname, ' ', ''), '-', 2),
--              'closed', false)
--       else jsonb_build_object('closed', true)
--     end)
--   from (values (0,'sunday'),(1,'monday'),(2,'tuesday'),(3,'wednesday'),
--                (4,'thursday'),(5,'friday'),(6,'saturday')) as d(idx, dname)
-- )
-- where b.opening_hours::text ~ '"(monday|tuesday|wednesday|thursday|friday|saturday|sunday)"';
