'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Application,
  ApplicationStatus,
  fetchApplications,
  updateApplicationStatus,
} from '../../../lib/adminApi';
import { errorMessage, formatStamp, toInternational } from '../../../lib/format';

const STATUSES: ApplicationStatus[] = ['New', 'Contacted', 'Set up', 'Declined'];
const FILTERS = ['All', ...STATUSES] as const;
type Filter = (typeof FILTERS)[number];

const STATUS_STYLE: Record<ApplicationStatus, string> = {
  New: 'bg-brand-light text-brand-dark',
  Contacted: 'bg-warn/10 text-warn',
  'Set up': 'bg-success/10 text-success',
  Declined: 'bg-paper text-muted',
};

export default function ApplicationsPage() {
  const [rows, setRows] = useState<Application[] | null>(null);
  const [filter, setFilter] = useState<Filter>('New');
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    fetchApplications()
      .then(setRows)
      .catch((e) => {
        const m = errorMessage(e);
        setError(
          /business_applications/i.test(m)
            ? 'The registrations table doesn’t exist yet. Run supabase-registrations.sql in the Supabase SQL editor.'
            : m
        );
      });
  }, []);

  async function change(id: string, status: ApplicationStatus) {
    setBusyId(id);
    setError(null);
    try {
      await updateApplicationStatus(id, status);
      setRows((prev) => prev?.map((r) => (r.id === id ? { ...r, status } : r)) ?? prev);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusyId(null);
    }
  }

  const count = (f: Filter) => (rows ?? []).filter((r) => f === 'All' || r.status === f).length;
  const visible = (rows ?? []).filter((r) => filter === 'All' || r.status === filter);

  return (
    <div>
      <h1 className="font-display text-2xl font-semibold text-ink">Registrations</h1>
      <p className="mt-1.5 text-sm text-muted">
        Businesses that filled in the form on the Timely website. Contact them, then set up their login.
      </p>

      <div className="mt-6 flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors ${
              filter === f ? 'bg-brand text-white' : 'bg-paper text-muted hover:text-ink'
            }`}
          >
            {f}
            {rows ? ` (${count(f)})` : ''}
          </button>
        ))}
      </div>

      {error && (
        <div className="mt-5 rounded-lg bg-warn/10 px-3.5 py-2.5 text-sm text-warn">{error}</div>
      )}

      <div className="mt-6 overflow-x-auto rounded-xl border border-line">
        <table className="w-full min-w-[860px] text-left text-sm">
          <thead>
            <tr className="border-b border-line bg-paper text-xs uppercase tracking-wide text-muted">
              <th className="px-5 py-3 font-medium">Received</th>
              <th className="px-5 py-3 font-medium">Business</th>
              <th className="px-5 py-3 font-medium">Contact</th>
              <th className="px-5 py-3 font-medium">Status</th>
              <th className="px-5 py-3 font-medium"></th>
            </tr>
          </thead>
          <tbody>
            {rows === null && !error && (
              <tr><td colSpan={5} className="px-5 py-6 text-center text-muted">Loading…</td></tr>
            )}
            {rows !== null && visible.length === 0 && (
              <tr>
                <td colSpan={5} className="px-5 py-6 text-center text-muted">
                  {filter === 'All' ? 'No registrations yet.' : `No ${filter.toLowerCase()} registrations.`}
                </td>
              </tr>
            )}
            {visible.map((r) => {
              const intl = toInternational(r.phone);
              const waIntl = toInternational(r.whatsapp);
              return (
                <tr key={r.id} className="border-b border-line align-top last:border-0 hover:bg-paper/60">
                  <td className="whitespace-nowrap px-5 py-3.5 text-muted">{formatStamp(r.createdAt)}</td>
                  <td className="px-5 py-3.5">
                    <p className="font-medium text-ink">{r.businessName}</p>
                    <p className="text-xs text-muted">
                      {r.category} · {r.city}
                    </p>
                    {r.message && (
                      <p className="mt-1.5 max-w-xs text-xs italic text-muted/80" title={r.message}>
                        “{r.message.length > 120 ? r.message.slice(0, 120) + '…' : r.message}”
                      </p>
                    )}
                  </td>
                  <td className="px-5 py-3.5">
                    <p className="font-medium text-ink">{r.contactName}</p>
                    <div className="mt-1 flex flex-col gap-0.5 text-xs">
                      <a href={`tel:+${intl}`} className="text-brand hover:underline">
                        Call {r.phone}
                      </a>
                      <a
                        href={`https://wa.me/${waIntl}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-success hover:underline"
                      >
                        WhatsApp {r.whatsapp}
                      </a>
                      <a href={`mailto:${r.email}`} className="break-all text-brand hover:underline">
                        {r.email}
                      </a>
                    </div>
                  </td>
                  <td className="px-5 py-3.5">
                    <select
                      value={r.status}
                      disabled={busyId === r.id}
                      onChange={(e) => change(r.id, e.target.value as ApplicationStatus)}
                      aria-label={`Status for ${r.businessName}`}
                      className={`rounded-md border-0 px-2 py-1 text-xs font-medium outline-none focus:ring-2 focus:ring-brand-light ${STATUS_STYLE[r.status]}`}
                    >
                      {STATUSES.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    {(r.status === 'New' || r.status === 'Contacted') && (
                      <Link
                        href={`/admin/businesses/new?application=${encodeURIComponent(r.id)}`}
                        className="whitespace-nowrap text-xs font-medium text-brand hover:text-brand-dark"
                      >
                        Set up login
                      </Link>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
