# Timely Admin — wiring it to Supabase

1. Merge these files into your existing admin project (same relative paths).
   `lib/supabase.ts` (your existing browser client) is untouched.
   `app/page.tsx` (the landing page) replaces the old "Go to login" page.
   `app/globals.css` keeps your original styles and adds smooth scrolling.
2. Install the QR scanner library:   npm i jsqr
3. `.env.local`:
   NEXT_PUBLIC_SUPABASE_URL=...
   NEXT_PUBLIC_SUPABASE_ANON_KEY=...
   SUPABASE_SERVICE_ROLE_KEY=...      # server only, NEVER prefix with NEXT_PUBLIC_
4. Supabase SQL editor - run BOTH files (each is safe to re-run):
   - supabase-admin-setup.sql     (permissions, check-in column, photo storage)
   - supabase-registrations.sql   (the table the website registration form saves into)
5. Make yourself super admin: step 10 in supabase-admin-setup.sql.
6. In `app/page.tsx`, change CONTACT_EMAIL to your real address.
7. `npm run dev` -> open http://localhost:3000
   Registrations show up in the admin under "Registrations".
