import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '../../../../lib/supabaseAdmin';
import { requireSuperAdmin } from '../../../../lib/adminAuth';
import { parseBookingDate, weekRange } from '../../../../lib/format';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  if (!(await requireSuperAdmin(req))) {
    return NextResponse.json({ error: 'Not authorised.' }, { status: 403 });
  }

  const admin = getSupabaseAdmin();
  const { start, end } = weekRange();

  const [active, pending, bookings, applications] = await Promise.all([
    admin.from('businesses').select('id', { count: 'exact', head: true }).not('owner_id', 'is', null),
    admin.from('businesses').select('id', { count: 'exact', head: true }).is('owner_id', null),
    // `date` is display text ("Fri, 19 Sep 2026") in the mobile app, so count in code.
    admin.from('bookings').select('date'),
    admin.from('business_applications').select('id', { count: 'exact', head: true }).eq('status', 'New'),
  ]);

  const firstError = active.error ?? pending.error ?? bookings.error;
  if (firstError) return NextResponse.json({ error: firstError.message }, { status: 500 });

  const bookingsThisWeek = (bookings.data ?? []).filter((b: { date: string }) => {
    const iso = parseBookingDate(b.date);
    return !!iso && iso >= start && iso <= end;
  }).length;

  return NextResponse.json({
    activeBusinesses: active.count ?? 0,
    pendingOnboarding: pending.count ?? 0,
    bookingsThisWeek,
    // 0 if the registrations table hasn't been created yet — never break the overview over it
    newApplications: applications.error ? 0 : applications.count ?? 0,
  });
}
