-- =====================================================================
-- Timely: price range fix + new categories
-- =====================================================================

-- ---------- STEP A — price range (run now) ----------
-- 1. New businesses default to "R" instead of "$"
alter table public.businesses alter column price_range set default 'R';

-- 2. Convert existing "$" values to the rand scale
update public.businesses set price_range = 'R'   where price_range = '$';
update public.businesses set price_range = 'RR'  where price_range = '$$';
update public.businesses set price_range = 'RRR' where price_range in ('$$$', '$$$$');

-- 3. Anything still not R / RR / RRR (e.g. someone typed "R1500.00") — fix by hand:
select id, name, price_range
from public.businesses
where price_range not in ('R', 'RR', 'RRR');


-- ---------- STEP B — new categories ----------
-- Run this AFTER you've updated the category chips in the mobile app's
-- index.tsx (see the chat message). Until then the Massage / Clinic chips
-- would show nothing.
--
-- Preview first:
--   select name, category from public.businesses order by category;
--
update public.businesses
set category = case category
  when 'Hair'       then 'Beauty & Hair'
  when 'Barber'     then 'Beauty & Hair'
  when 'Nail Salon' then 'Beauty & Hair'
  when 'Nails'      then 'Beauty & Hair'
  when 'Massage'    then 'Wellness'
  when 'Spa'        then 'Wellness'
  when 'Dental'     then 'Health & Dental'
  when 'Clinic'     then 'Health & Dental'
  else category
end
where category in ('Hair','Barber','Nail Salon','Nails','Massage','Spa','Dental','Clinic');
