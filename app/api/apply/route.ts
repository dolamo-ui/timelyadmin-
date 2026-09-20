import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '../../../lib/supabaseAdmin';
import { compactPhone, RegistrationInput, validateRegistration } from '../../../lib/registration';

export const dynamic = 'force-dynamic';

// Best-effort limiter (per server instance): 5 submissions per IP per hour.
const hits = new Map<string, number[]>();
function tooMany(ip: string): boolean {
  const now = Date.now();
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < 60 * 60 * 1000);
  recent.push(now);
  hits.set(ip, recent);
  return recent.length > 5;
}

function json(body: object, status = 200) {
  return NextResponse.json(body, { status });
}

/** Public: anyone can register a business. Rows are only readable by the super admin. */
export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  if (!body || typeof body !== 'object') return json({ error: 'Invalid request.' }, 400);

  // Honeypot: real people never fill this hidden field, bots usually do. Pretend it worked.
  if (typeof body.website === 'string' && body.website.trim() !== '') return json({ ok: true });

  const ip = (req.headers.get('x-forwarded-for') ?? 'unknown').split(',')[0].trim();
  if (tooMany(ip)) {
    return json({ error: 'Too many registrations from this connection. Please try again later.' }, 429);
  }

  const input: RegistrationInput = {
    businessName: String(body.businessName ?? ''),
    category: String(body.category ?? ''),
    contactName: String(body.contactName ?? ''),
    email: String(body.email ?? ''),
    phone: String(body.phone ?? ''),
    whatsapp: String(body.whatsapp ?? ''),
    city: String(body.city ?? ''),
    message: String(body.message ?? ''),
  };

  const errors = validateRegistration(input);
  if (Object.keys(errors).length) return json({ error: 'Please check the highlighted fields.', fields: errors }, 400);

  const row = {
    business_name: input.businessName.trim(),
    category: input.category,
    contact_name: input.contactName.trim(),
    email: input.email.trim().toLowerCase(),
    phone: compactPhone(input.phone),
    whatsapp: compactPhone(input.whatsapp),
    city: input.city.trim(),
    message: input.message.trim() || null,
    status: 'New',
  };

  try {
    const admin = getSupabaseAdmin();

    // Same person double-tapping submit: don't create a second row.
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { data: existing } = await admin
      .from('business_applications')
      .select('id')
      .eq('email', row.email)
      .eq('business_name', row.business_name)
      .gte('created_at', since)
      .limit(1);
    if (existing && existing.length) return json({ ok: true });

    const { error } = await admin.from('business_applications').insert(row);
    if (error) throw error;
    return json({ ok: true });
  } catch (e) {
    console.error('[apply] could not save registration:', e);
    return json({ error: 'We couldn’t save your registration right now. Please try again in a moment.' }, 500);
  }
}
