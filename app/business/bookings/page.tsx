'use client';

import { useEffect, useState } from 'react';
import { useBusiness } from '../../components/Business';
import { BookingRow, BookingStatus, listBookings, setBookingStatus } from '../../../lib/data';
import { errorMessage, formatClock } from '../../../lib/format';

const FILTERS = ['All', 'Upcoming', 'Completed', 'Cancelled'] as const;
type Filter = (typeof FILTERS)[number];

const STATUS_STYLE: Record<BookingStatus, string> = {
  Upcoming: 'bg-brand-light text-brand-dark',
  Completed: 'bg-success/10 text-success',
  Cancelled: 'bg-warn/10 text-warn',
};

export default function BookingsPage() {
  const { business } = useBusiness();
  const [bookings, setBookings] = useState<BookingRow[] | null>(null);
  const [filter, setFilter] = useState<Filter>('Upcoming');
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    listBookings(business.id)
      .then((rows) => {
        if (active) setBookings(rows);
      })
      .catch((e) => {
        if (active) setError(errorMessage(e));
      });
    return () => {
      active = false;
    };
  }, [business.id]);

  async function change(id: string, status: BookingStatus) {
    if (status === 'Cancelled' && !window.confirm('Cancel this booking? The customer will see it as cancelled.')) {
      return;
    }
    setBusyId(id);
    setError(null);
    try {
      await setBookingStatus(id, status);
      setBookings((prev) => prev?.map((b) => (b.id === id ? { ...b, status } : b)) ?? prev);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusyId(null);
    }
  }

  const visible = (bookings ?? [])
    .filter((b) => filter === 'All' || b.status === filter)
    .sort((a, b) =>
      filter === 'Upcoming' ? a.sortKey.localeCompare(b.sortKey) : b.sortKey.localeCompare(a.sortKey)
    );

  const loading = bookings === null && !error;
  const empty = bookings !== null && visible.length === 0;
  const emptyText = `No ${filter === 'All' ? '' : filter.toLowerCase() + ' '}bookings.`;

  return (
    <div>
      <h1 className="font-display text-2xl font-semibold text-ink">Bookings</h1>
      <p className="mt-1.5 text-sm text-muted">
        Upcoming, completed and cancelled appointments for {business.name}.
      </p>

      {/* filter chips scroll sideways on very narrow phones instead of wrapping into a mess */}
      <div className="-mx-4 mt-6 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0">
        {FILTERS.map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`shrink-0 rounded-full px-4 py-2 text-xs font-medium transition-colors sm:px-3.5 sm:py-1.5 ${
              filter === f ? 'bg-brand text-white' : 'bg-paper text-muted hover:text-ink'
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {error && (
        <div className="mt-5 rounded-lg bg-warn/10 px-3.5 py-2.5 text-sm text-warn">{error}</div>
      )}

      {/* ---------- phones: one card per booking ---------- */}
      <div className="mt-6 md:hidden">
        {loading && <p className="py-6 text-center text-sm text-muted">Loading…</p>}
        {empty && <p className="py-6 text-center text-sm text-muted">{emptyText}</p>}
        <ul className="space-y-3">
          {visible.map((b) => (
            <li key={b.id} className="rounded-xl border border-line bg-surface p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate font-medium text-ink">{b.customer}</p>
                  <p className="truncate text-sm text-muted">{b.service}</p>
                </div>
                <p className="shrink-0 font-medium tabular-nums text-ink">{b.price}</p>
              </div>
              <p className="mt-1.5 text-xs text-muted">
                {b.date} · {b.time}
                {b.staff !== 'Not assigned' && ` · ${b.staff}`}
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <span className={`rounded px-2 py-0.5 text-xs font-medium ${STATUS_STYLE[b.status] ?? ''}`}>
                  {b.status}
                </span>
                {b.checkedInAt && b.status === 'Upcoming' && (
                  <span className="rounded bg-success/10 px-2 py-0.5 text-xs font-medium text-success">
                    Checked in {formatClock(b.checkedInAt)}
                  </span>
                )}
              </div>
              {b.status === 'Upcoming' && (
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <button
                    disabled={busyId === b.id}
                    onClick={() => change(b.id, 'Completed')}
                    className="rounded-lg bg-success/10 py-2.5 text-sm font-medium text-success disabled:opacity-50"
                  >
                    Mark done
                  </button>
                  <button
                    disabled={busyId === b.id}
                    onClick={() => change(b.id, 'Cancelled')}
                    className="rounded-lg bg-warn/10 py-2.5 text-sm font-medium text-warn disabled:opacity-50"
                  >
                    Cancel
                  </button>
                </div>
              )}
            </li>
          ))}
        </ul>
      </div>

      {/* ---------- tablets and up: table ---------- */}
      <div className="mt-6 hidden overflow-x-auto rounded-xl border border-line md:block">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead>
            <tr className="border-b border-line bg-paper text-xs uppercase tracking-wide text-muted">
              <th className="px-3 py-3 font-medium xl:px-5">Customer</th>
              <th className="px-3 py-3 font-medium xl:px-5">Service</th>
              <th className="px-3 py-3 font-medium xl:px-5">When</th>
              <th className="px-3 py-3 text-right font-medium xl:px-5">Price</th>
              <th className="px-3 py-3 font-medium xl:px-5">Status</th>
              <th className="px-3 py-3 font-medium xl:px-5"></th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={6} className="px-5 py-6 text-center text-muted">Loading…</td>
              </tr>
            )}
            {empty && (
              <tr>
                <td colSpan={6} className="px-5 py-6 text-center text-muted">{emptyText}</td>
              </tr>
            )}
            {visible.map((b) => (
              <tr key={b.id} className="border-b border-line last:border-0 hover:bg-paper/60">
                <td className="px-3 py-3.5 font-medium text-ink xl:px-5">{b.customer}</td>
                <td className="px-3 py-3.5 text-muted xl:px-5">
                  {b.service}
                  <span className="block text-xs text-muted/70">{b.staff}</span>
                </td>
                <td className="px-3 py-3.5 text-muted xl:px-5">
                  {b.date}
                  <span className="block text-xs text-muted/70">{b.time}</span>
                </td>
                <td className="px-3 py-3.5 text-right tabular-nums text-ink xl:px-5">{b.price}</td>
                <td className="px-3 py-3.5 xl:px-5">
                  <div className="flex flex-col items-start gap-1">
                    <span className={`rounded px-2 py-0.5 text-xs font-medium ${STATUS_STYLE[b.status] ?? ''}`}>
                      {b.status}
                    </span>
                    {b.checkedInAt && b.status === 'Upcoming' && (
                      <span className="whitespace-nowrap rounded bg-success/10 px-2 py-0.5 text-xs font-medium text-success">
                        Checked in {formatClock(b.checkedInAt)}
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-3 py-3.5 text-right xl:px-5">
                  {b.status === 'Upcoming' && (
                    <div className="flex flex-col items-end gap-1.5 xl:flex-row xl:justify-end xl:gap-3">
                      <button
                        disabled={busyId === b.id}
                        onClick={() => change(b.id, 'Completed')}
                        className="whitespace-nowrap text-xs font-medium text-success hover:underline disabled:opacity-50"
                      >
                        Mark done
                      </button>
                      <button
                        disabled={busyId === b.id}
                        onClick={() => change(b.id, 'Cancelled')}
                        className="whitespace-nowrap text-xs font-medium text-warn hover:underline disabled:opacity-50"
                      >
                        Cancel
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
