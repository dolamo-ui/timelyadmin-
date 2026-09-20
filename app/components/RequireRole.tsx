'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../lib/supabase';

const HOME: Record<string, string> = {
  super_admin: '/admin',
  business_owner: '/business',
};

export function RequireRole({
  role,
  children,
}: {
  role: 'super_admin' | 'business_owner';
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    let active = true;

    (async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        router.replace('/login');
        return;
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', session.user.id)
        .maybeSingle();

      if (!active) return;

      if (!profile?.role) {
        router.replace('/login');
        return;
      }

      // Right account, wrong section (e.g. an owner typing /admin) — send them
      // to their own home instead of bouncing them to the login screen.
      if (profile.role !== role) {
        router.replace(HOME[profile.role] ?? '/login');
        return;
      }

      setAllowed(true);
    })();

    // Sign out in another tab (or an expired session) should kick this tab out too.
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') router.replace('/login');
    });

    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, [role, router]);

  if (!allowed) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-muted">
        Checking access…
      </div>
    );
  }

  return <>{children}</>;
}
