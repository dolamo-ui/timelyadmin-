# Timely Admin

The web dashboard for Timely — a Super Admin area (you) and a Business Owner
area (the businesses you onboard).

## Running it

```bash
npm install
npm run dev
```

Then open http://localhost:3000 — it'll take you to `/login`.

Try these routes directly for now (nothing is wired to real auth yet):

- `/login` — the sign-in screen (UI only)
- `/admin` and `/admin/businesses` — Super Admin: overview + businesses list
- `/admin/businesses/new` — the "create a business after they've paid" form
- `/business` — Business Owner: overview
- `/business/bookings`, `/business/services`, `/business/staff`, `/business/profile`

## What's real vs. placeholder right now

Everything you see is real, working UI — forms hold their own state, the
bookings table's "Mark done" / "Cancel" buttons actually update the row.
What's **not** wired up yet:

- Login doesn't call Supabase yet.
- All lists (businesses, bookings, services, staff) show mock data marked
  with a `// TODO (backend step)` comment showing exactly what query goes
  there.
- "Create business & generate login" shows a preview password but doesn't
  actually create an account — that needs a protected server route using
  Supabase's service role key, which must never run in client code.

This is intentional — we're doing the backend wiring as the next step.
