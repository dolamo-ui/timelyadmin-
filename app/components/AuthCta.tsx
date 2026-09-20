'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '../../lib/supabase';

const HOME: Record<string, string> = {
  super_admin: '/admin',
  business_owner: '/business',
};

/** "Sign in" for visitors, "Open dashboard" (to the right section) for people already signed in. */
export function AuthCta({
  className,
  guestLabel = 'Sign in',
  memberLabel = 'Open dashboard',
}: {
  className?: string;
  guestLabel?: string;
  memberLabel?: string;
}) {
  const [href, setHref] = useState('/login');
  const [label, setLabel] = useState(guestLabel);

  useEffect(() => {
    let active = true;
    (async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) return;
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', session.user.id)
        .maybeSingle();
      const dest = profile?.role ? HOME[profile.role] : undefined;
      if (active && dest) {
        setHref(dest);
        setLabel(memberLabel);
      }
    })();
    return () => {
      active = false;
    };
  }, [memberLabel]);

  return (
    <Link href={href} className={className}>
      {label}
    </Link>
  );
}
