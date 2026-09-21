'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { supabase } from '../../lib/supabase';
import { Logo } from './Logo';

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
  const [open, setOpen] = useState(false);

  // Longest matching href wins, so nested routes (/admin/businesses/new) keep
  // "Businesses" highlighted without also highlighting "Overview" (/admin).
  const activeHref = items
    .filter((i) => pathname === i.href || pathname.startsWith(i.href + '/'))
    .sort((a, b) => b.href.length - a.href.length)[0]?.href;

  // Phones/tablets: the menu is a slide-in drawer. Close it after navigating,
  // on Escape, and stop the page behind it from scrolling while it's open.
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open]);

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.replace('/login');
  }

  return (
    <>
      {/* Top bar — below 1024px */}
      <div className="sticky top-0 z-30 flex items-center justify-between border-b border-line bg-surface px-4 py-3 lg:hidden">
        <div className="flex min-w-0 items-center gap-2.5">
          <Logo size={36} className="shrink-0" priority />
          <div className="min-w-0">
            <p className="font-display text-[15px] font-semibold leading-tight tracking-tight text-ink">
              Timely Admin
            </p>
            <p className="truncate text-xs leading-tight text-muted">{contextLabel}</p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Open menu"
          aria-expanded={open}
          aria-controls="admin-nav"
          className="-mr-2 flex h-11 w-11 items-center justify-center rounded-lg text-ink hover:bg-paper"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
            <path d="M4 7h16M4 12h16M4 17h16" />
          </svg>
        </button>
      </div>

      {/* Backdrop — below 1024px, only while the drawer is open */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/40 lg:hidden"
          onClick={() => setOpen(false)}
          aria-hidden="true"
        />
      )}

      <aside
        id="admin-nav"
        className={`fixed inset-y-0 left-0 z-50 flex w-64 max-w-[85vw] flex-col border-r border-line bg-surface transition-[transform,visibility] duration-200 motion-reduce:transition-none lg:visible lg:sticky lg:top-0 lg:z-auto lg:h-screen lg:w-60 lg:max-w-none lg:shrink-0 lg:translate-x-0 ${
          open ? 'visible translate-x-0' : 'invisible -translate-x-full'
        }`}
      >
        <div className="flex items-start justify-between px-5 pb-4 pt-6">
          <div>
            <div className="flex items-center gap-2.5">
              <Logo size={32} />
              <span className="font-display text-[15px] font-semibold tracking-tight text-ink">
                Timely Admin
              </span>
            </div>
            <span className="mt-2 inline-block rounded bg-brand-light px-2 py-0.5 text-[11px] font-medium text-brand-dark">
              {sectionLabel}
            </span>
          </div>
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label="Close menu"
            className="-mr-2 -mt-2 flex h-10 w-10 items-center justify-center rounded-lg text-muted hover:bg-paper hover:text-ink lg:hidden"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto px-3">
          <ul className="space-y-0.5">
            {items.map((item) => {
              const isActive = item.href === activeHref;
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className={`relative block rounded-md px-3 py-2.5 text-sm transition-colors lg:py-2 ${
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
            className="mt-3 py-1 text-xs font-medium text-muted hover:text-ink"
          >
            Sign out
          </button>
        </div>
      </aside>
    </>
  );
}
