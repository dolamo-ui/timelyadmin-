import { getSupabaseAdmin } from './supabaseAdmin';

/**
 * Verifies the bearer token on a request and returns the user only if their
 * profile role is 'super_admin'. Every /api/admin/* route calls this first,
 * so the UI-level RequireRole check is never the only thing protecting them.
 */
export async function requireSuperAdmin(req: Request) {
  const token = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '').trim();
  if (!token) return null;

  const admin = getSupabaseAdmin();
  const { data, error } = await admin.auth.getUser(token);
  if (error || !data.user) return null;

  const { data: profile } = await admin
    .from('profiles')
    .select('role')
    .eq('id', data.user.id)
    .maybeSingle();

  return profile?.role === 'super_admin' ? data.user : null;
}
