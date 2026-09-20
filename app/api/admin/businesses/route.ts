import { NextResponse } from 'next/server';
import { randomInt } from 'crypto';
import { getSupabaseAdmin } from '../../../../lib/supabaseAdmin';
import { requireSuperAdmin } from '../../../../lib/adminAuth';

export const dynamic = 'force-dynamic';

const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';

function generatePassword(length = 12): string {
  let out = '';
  for (let i = 0; i < length; i++) out += ALPHABET[randomInt(ALPHABET.length)];
  return out;
}

function fail(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

/** List every business plus the login email of its owner (if any). */
export async function GET(req: Request) {
  if (!(await requireSuperAdmin(req))) return fail('Not authorised.', 403);

  const admin = getSupabaseAdmin();
  const { data, error } = await admin
    .from('businesses')
    .select('id, name, category, owner_id')
    .order('name');
  if (error) return fail(error.message, 500);

  const rows = data ?? [];
  const ownerIds = Array.from(new Set(rows.map((b) => b.owner_id).filter(Boolean))) as string[];
  const emails = new Map<string, string>();
  await Promise.all(
    ownerIds.map(async (id) => {
      const { data: u } = await admin.auth.admin.getUserById(id);
      if (u?.user?.email) emails.set(id, u.user.email);
    })
  );

  return NextResponse.json({
    businesses: rows.map((b) => ({
      id: String(b.id),
      name: b.name,
      category: b.category ?? null,
      hasOwner: !!b.owner_id,
      ownerEmail: b.owner_id ? emails.get(b.owner_id) ?? null : null,
    })),
  });
}

/**
 * Create the owner's login and attach it to a business.
 *  - with `businessId`: links the new owner to an existing listing that has no owner yet
 *  - without: creates a brand-new business row
 * The generated password is returned ONCE and is never stored.
 */
export async function POST(req: Request) {
  if (!(await requireSuperAdmin(req))) return fail('Not authorised.', 403);

  const body = await req.json().catch(() => null);
  const ownerEmail = String(body?.ownerEmail ?? '').trim().toLowerCase();
  const existingId = body?.businessId ? String(body.businessId) : '';
  const name = String(body?.name ?? '').trim();
  const category = String(body?.category ?? '').trim();
  const applicationId = body?.applicationId ? String(body.applicationId) : '';

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(ownerEmail)) return fail('Enter a valid owner email.', 400);
  if (!existingId && (!name || name.length > 120)) return fail('Enter the business name.', 400);
  // businesses.category is NOT NULL
  if (!existingId && !category) return fail('Choose a category.', 400);

  const admin = getSupabaseAdmin();

  if (existingId) {
    const { data: existing } = await admin
      .from('businesses')
      .select('id, owner_id')
      .eq('id', existingId)
      .maybeSingle();
    if (!existing) return fail('That business no longer exists.', 404);
    if (existing.owner_id) return fail('That business already has an owner login.', 409);
  }

  // 1. auth user
  const password = generatePassword();
  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email: ownerEmail,
    password,
    email_confirm: true,
  });
  if (createError || !created.user) {
    const msg = createError?.message ?? 'Could not create the login.';
    const taken = /already|registered|exists/i.test(msg);
    return fail(
      taken ? 'An account with that email already exists. Use a different email for the owner.' : msg,
      taken ? 409 : 500
    );
  }
  const ownerId = created.user.id;

  // 2. role (upsert: a signup trigger may already have created the row)
  const { error: profileError } = await admin
    .from('profiles')
    .upsert({ id: ownerId, role: 'business_owner' });
  if (profileError) {
    await admin.auth.admin.deleteUser(ownerId);
    return fail(`Could not set the owner role: ${profileError.message}`, 500);
  }

  // 3. business row
  const result = existingId
    ? await admin
        .from('businesses')
        .update({ owner_id: ownerId })
        .eq('id', existingId)
        .is('owner_id', null)
        .select('id, name')
        .maybeSingle()
    : await admin
        .from('businesses')
        .insert({ name, category, price_range: 'R', owner_id: ownerId })
        .select('id, name')
        .single();

  if (result.error || !result.data) {
    await admin.auth.admin.deleteUser(ownerId); // roll back so the email isn't left half-registered
    return fail(result.error?.message ?? 'Could not attach the owner to the business.', 500);
  }

  // If this came from a registration, mark it as set up (best effort — the login already exists).
  if (applicationId) {
    await admin
      .from('business_applications')
      .update({ status: 'Set up', business_id: result.data.id })
      .eq('id', applicationId);
  }

  return NextResponse.json({
    business: { id: String(result.data.id), name: result.data.name },
    ownerEmail,
    password,
  });
}
