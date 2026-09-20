import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '../../../../lib/supabaseAdmin';
import { requireSuperAdmin } from '../../../../lib/adminAuth';

export const dynamic = 'force-dynamic';

const STATUSES = ['New', 'Contacted', 'Set up', 'Declined'];

function fail(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

export async function GET(req: Request) {
  if (!(await requireSuperAdmin(req))) return fail('Not authorised.', 403);

  const { data, error } = await getSupabaseAdmin()
    .from('business_applications')
    .select('id, created_at, business_name, category, contact_name, email, phone, whatsapp, city, message, status')
    .order('created_at', { ascending: false })
    .limit(300);
  if (error) return fail(error.message, 500);

  return NextResponse.json({
    applications: (data ?? []).map((a) => ({
      id: String(a.id),
      createdAt: a.created_at,
      businessName: a.business_name,
      category: a.category,
      contactName: a.contact_name,
      email: a.email,
      phone: a.phone,
      whatsapp: a.whatsapp,
      city: a.city ?? '',
      message: a.message ?? '',
      status: a.status,
    })),
  });
}

export async function PATCH(req: Request) {
  if (!(await requireSuperAdmin(req))) return fail('Not authorised.', 403);

  const body = await req.json().catch(() => null);
  const id = String(body?.id ?? '');
  const status = String(body?.status ?? '');
  if (!id) return fail('Missing registration id.', 400);
  if (!STATUSES.includes(status)) return fail('Unknown status.', 400);

  const { error } = await getSupabaseAdmin().from('business_applications').update({ status }).eq('id', id);
  if (error) return fail(error.message, 500);
  return NextResponse.json({ ok: true });
}
