'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { AdminBusinessRow, fetchBusinesses } from '../../../lib/adminApi';
import { errorMessage } from '../../../lib/format';

export default function BusinessesPage() {
  const [rows, setRows] = useState<AdminBusinessRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchBusinesses().then(setRows).catch((e) => setError(errorMessage(e)));
  }, []);

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold text-ink">Businesses</h1>
          <p className="mt-1.5 text-sm text-muted">
            Every business on Timely, and whether their owner account is set up.
          </p>
        </div>
        <Link
          href="/admin/businesses/new"
          className="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-dark"
        >
          New business
        </Link>
      </div>

      {error && (
        <div className="mt-5 rounded-lg bg-warn/10 px-3.5 py-2.5 text-sm text-warn">{error}</div>
      )}

      <div className="mt-8 overflow-hidden rounded-xl border border-line">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-line bg-paper text-xs uppercase tracking-wide text-muted">
              <th className="px-5 py-3 font-medium">Business</th>
              <th className="px-5 py-3 font-medium">Category</th>
              <th className="px-5 py-3 font-medium">Owner login</th>
              <th className="px-5 py-3 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {rows === null && !error && (
              <tr>
                <td colSpan={4} className="px-5 py-6 text-center text-muted">
                  Loading…
                </td>
              </tr>
            )}
            {rows?.length === 0 && (
              <tr>
                <td colSpan={4} className="px-5 py-6 text-center text-muted">
                  No businesses yet.
                </td>
              </tr>
            )}
            {rows?.map((b) => (
              <tr key={b.id} className="border-b border-line last:border-0 hover:bg-paper/60">
                <td className="px-5 py-3.5 font-medium text-ink">{b.name}</td>
                <td className="px-5 py-3.5 text-muted">{b.category ?? '—'}</td>
                <td className="px-5 py-3.5 text-muted">{b.ownerEmail ?? 'Not yet invited'}</td>
                <td className="px-5 py-3.5">
                  <span
                    className={`rounded px-2 py-0.5 text-xs font-medium ${
                      b.hasOwner ? 'bg-success/10 text-success' : 'bg-warn/10 text-warn'
                    }`}
                  >
                    {b.hasOwner ? 'Active' : 'Awaiting setup'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
