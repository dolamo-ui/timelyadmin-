'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { Business, getMyBusiness } from '../../lib/data';
import { errorMessage } from '../../lib/format';
import { NavItem, Sidebar } from './Sidebar';

interface BusinessCtx {
  business: Business;
  setBusiness: (b: Business) => void;
}

const Ctx = createContext<BusinessCtx | null>(null);

/** The signed-in owner's business. Only usable inside <BusinessShell>. */
export function useBusiness(): BusinessCtx {
  const v = useContext(Ctx);
  if (!v) throw new Error('useBusiness must be used inside <BusinessShell>');
  return v;
}

type State = 'loading' | 'ready' | 'missing' | 'error';

export function BusinessShell({ items, children }: { items: NavItem[]; children: React.ReactNode }) {
  const [business, setBusiness] = useState<Business | null>(null);
  const [state, setState] = useState<State>('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    let active = true;
    getMyBusiness()
      .then((b) => {
        if (!active) return;
        if (b) {
          setBusiness(b);
          setState('ready');
        } else {
          setState('missing');
        }
      })
      .catch((e) => {
        if (!active) return;
        setMessage(errorMessage(e));
        setState('error');
      });
    return () => {
      active = false;
    };
  }, []);

  return (
    <div className="flex flex-col lg:flex-row">
      <Sidebar sectionLabel="Business Owner" contextLabel={business?.name ?? '—'} items={items} />
      <div className="min-w-0 flex-1 px-4 py-6 sm:px-6 lg:px-10 lg:py-8">
        <div className="mx-auto max-w-4xl">
          {state === 'loading' && <p className="text-sm text-muted">Loading your business…</p>}
          {state === 'missing' && (
            <p className="text-sm text-muted">
              No business is linked to this account yet. Please contact Timely.
            </p>
          )}
          {state === 'error' && (
            <div className="rounded-lg bg-warn/10 px-3.5 py-2.5 text-sm text-warn">{message}</div>
          )}
          {state === 'ready' && business && (
            <Ctx.Provider value={{ business, setBusiness }}>{children}</Ctx.Provider>
          )}
        </div>
      </div>
    </div>
  );
}
