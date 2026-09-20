'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { supabase } from '../../lib/supabase';

export interface NavItem {
  label: string;
  href: string;
}

export function Sidebar({
  sectionLabel,
  contextLabel,
  items,
}: {
  /** "Super Admin" or "Business Owner" — shown as a small tag under the wordmark. */
  sectionLabel: string;
  /** e.g. the business name for an owner, or "All Businesses" for the super admin. */
  contextLabel: string;
  items: NavItem[];
}) {
  const pathname = usePathname();
  const router = useRouter();

  // Longest matching href wins, so nested routes (/admin/businesses/new) keep
  // "Businesses" highlighted without also highlighting "Overview" (/admin).
  const activeHref = items
    .filter((i) => pathname === i.href || pathname.startsWith(i.href + '/'))
    .sort((a, b) => b.href.length - a.href.length)[0]?.href;

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.replace('/login');
  }

  return (
    <aside className="sticky top-0 flex h-screen w-60 shrink-0 flex-col border-r border-line bg-surface">
      <div className="px-5 pb-4 pt-6">
        <div className="flex items-center gap-2.5">
          <span className="flex h-7 w-7 items-center justify-center rounded-md bg-brand text-xs font-semibold text-white font-display">
            T
          </span>
          <span className="font-display text-[15px] font-semibold tracking-tight text-ink">
            Timely Admin
          </span>
        </div>
        <span className="mt-2 inline-block rounded bg-brand-light px-2 py-0.5 text-[11px] font-medium text-brand-dark">
          {sectionLabel}
        </span>
      </div>

      <nav className="flex-1 px-3">
        <ul className="space-y-0.5">
          {items.map((item) => {
            const isActive = item.href === activeHref;
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={`relative block rounded-md px-3 py-2 text-sm transition-colors ${
                    isActive
                      ? 'bg-brand-light font-medium text-brand-dark'
                      : 'text-muted hover:bg-paper hover:text-ink'
                  }`}
                >
                  {isActive && (
                    <span className="absolute left-0 top-1/2 h-4 w-0.5 -translate-y-1/2 rounded-full bg-brand" />
                  )}
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="border-t border-line px-5 py-4">
        <p className="text-[11px] uppercase tracking-wide text-muted/70">Viewing</p>
        <p className="mt-0.5 truncate text-sm font-medium text-ink">{contextLabel}</p>
        <button
          onClick={handleSignOut}
          className="mt-3 text-xs font-medium text-muted hover:text-ink"
        >
          Sign out
        </button>
      </div>
    </aside>
  );
}
