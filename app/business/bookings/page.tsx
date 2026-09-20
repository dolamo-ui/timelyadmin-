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

  return (
    <div>
      <h1 className="font-display text-2xl font-semibold text-ink">Bookings</h1>
      <p className="mt-1.5 text-sm text-muted">
        Upcoming, completed and cancelled appointments for {business.name}.
      </p>

      <div className="mt-6 flex gap-2">
        {FILTERS.map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors ${
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

      <div className="mt-6 overflow-hidden rounded-xl border border-line">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-line bg-paper text-xs uppercase tracking-wide text-muted">
              <th className="px-5 py-3 font-medium">Customer</th>
              <th className="px-5 py-3 font-medium">Service</th>
              <th className="px-5 py-3 font-medium">When</th>
              <th className="px-5 py-3 font-medium text-right">Price</th>
              <th className="px-5 py-3 font-medium">Status</th>
              <th className="px-5 py-3 font-medium"></th>
            </tr>
          </thead>
          <tbody>
            {bookings === null && !error && (
              <tr>
                <td colSpan={6} className="px-5 py-6 text-center text-muted">
                  Loading…
                </td>
              </tr>
            )}
            {bookings !== null && visible.length === 0 && (
              <tr>
                <td colSpan={6} className="px-5 py-6 text-center text-muted">
                  No {filter === 'All' ? '' : filter.toLowerCase() + ' '}bookings.
                </td>
              </tr>
            )}
            {visible.map((b) => (
              <tr key={b.id} className="border-b border-line last:border-0 hover:bg-paper/60">
                <td className="px-5 py-3.5 font-medium text-ink">{b.customer}</td>
                <td className="px-5 py-3.5 text-muted">
                  {b.service}
                  <span className="block text-xs text-muted/70">{b.staff}</span>
                </td>
                <td className="px-5 py-3.5 text-muted">
                  {b.date} · {b.time}
                </td>
                <td className="px-5 py-3.5 text-right tabular-nums text-ink">{b.price}</td>
                <td className="px-5 py-3.5">
                  <span className={`rounded px-2 py-0.5 text-xs font-medium ${STATUS_STYLE[b.status] ?? ''}`}>
                    {b.status}
                  </span>
                  {b.checkedInAt && b.status === 'Upcoming' && (
                    <span className="ml-1.5 rounded bg-success/10 px-2 py-0.5 text-xs font-medium text-success">
                      Checked in {formatClock(b.checkedInAt)}
                    </span>
                  )}
                </td>
                <td className="px-5 py-3.5 text-right">
                  {b.status === 'Upcoming' && (
                    <div className="flex justify-end gap-3">
                      <button
                        disabled={busyId === b.id}
                        onClick={() => change(b.id, 'Completed')}
                        className="text-xs font-medium text-success hover:underline disabled:opacity-50"
                      >
                        Mark done
                      </button>
                      <button
                        disabled={busyId === b.id}
                        onClick={() => change(b.id, 'Cancelled')}
                        className="text-xs font-medium text-warn hover:underline disabled:opacity-50"
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
