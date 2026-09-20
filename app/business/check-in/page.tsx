'use client';

import { useState } from 'react';
import { useBusiness } from '../../components/Business';
import { QrScanner } from '../../components/QrScanner';
import {
  BookingRow,
  checkInBooking,
  findBooking,
  parseBookingRef,
  setBookingStatus,
} from '../../../lib/data';
import { errorMessage, todayISO } from '../../../lib/format';

type Verdict = 'ready' | 'wrongDay' | 'already' | 'completed' | 'cancelled';

function verdictFor(b: BookingRow): Verdict {
  if (b.status === 'Cancelled') return 'cancelled';
  if (b.status === 'Completed') return 'completed';
  if (b.checkedInAt) return 'already';
  if (b.isoDate !== todayISO()) return 'wrongDay';
  return 'ready';
}

function timeOf(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-ZA', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Africa/Johannesburg',
  });
}

const INPUT =
  'w-full rounded-lg border border-line bg-surface px-3.5 py-2.5 text-sm text-ink outline-none focus:border-brand focus:ring-2 focus:ring-brand-light';

export default function CheckInPage() {
  const { business } = useBusiness();
  const [scanning, setScanning] = useState(false);
  const [manual, setManual] = useState('');
  const [looking, setLooking] = useState(false);
  const [busy, setBusy] = useState(false);
  const [booking, setBooking] = useState<BookingRow | null>(null);
  const [justCheckedIn, setJustCheckedIn] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function lookup(text: string) {
    const ref = parseBookingRef(text);
    setScanning(false);
    setError(null);
    setBooking(null);
    setJustCheckedIn(false);
    if (!ref) return setError('Enter the booking reference shown under the QR code.');

    setLooking(true);
    try {
      const found = await findBooking(business.id, ref);
      if (found) setBooking(found);
      else
        setError(
          `No booking “${ref.slice(0, 40)}” found at ${business.name}. The code may be wrong, or the booking belongs to another business.`
        );
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setLooking(false);
    }
  }

  async function doCheckIn() {
    if (!booking) return;
    setBusy(true);
    setError(null);
    try {
      const at = await checkInBooking(booking.id);
      setBooking({ ...booking, checkedInAt: at });
      setJustCheckedIn(true);
    } catch (e) {
      const m = errorMessage(e);
      setError(
        /checked_in_at/i.test(m)
          ? 'Check-in isn’t switched on in the database yet. Run the latest supabase-admin-setup.sql, then try again.'
          : m
      );
    } finally {
      setBusy(false);
    }
  }

  async function markDone() {
    if (!booking) return;
    setBusy(true);
    setError(null);
    try {
      await setBookingStatus(booking.id, 'Completed');
      setBooking({ ...booking, status: 'Completed' });
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  function reset() {
    setBooking(null);
    setError(null);
    setJustCheckedIn(false);
    setManual('');
    setScanning(true);
  }

  const verdict = booking ? verdictFor(booking) : null;
  const firstName = booking?.customer.split(' ')[0] ?? '';

  return (
    <div className="max-w-xl">
      <h1 className="font-display text-2xl font-semibold text-ink">Check-in</h1>
      <p className="mt-1.5 text-sm text-muted">
        Scan the QR code on a customer’s booking, or type the reference printed under it.
      </p>

      {!booking && (
        <div className="mt-8 space-y-6">
          {scanning ? (
            <div className="space-y-3">
              <QrScanner onScan={lookup} />
              <button
                onClick={() => setScanning(false)}
                className="text-sm font-medium text-muted hover:text-ink"
              >
                Stop camera
              </button>
            </div>
          ) : (
            <button
              onClick={() => {
                setError(null);
                setScanning(true);
              }}
              className="w-full rounded-lg bg-brand py-3 text-sm font-medium text-white hover:bg-brand-dark"
            >
              Scan QR code
            </button>
          )}

          <form
            onSubmit={(e) => {
              e.preventDefault();
              lookup(manual);
            }}
            className="rounded-xl border border-line bg-paper p-5"
          >
            <label htmlFor="ref" className="mb-1.5 block text-sm font-medium text-ink">
              Or type the reference
            </label>
            <div className="flex gap-2">
              <input
                id="ref"
                value={manual}
                onChange={(e) => setManual(e.target.value)}
                placeholder="#BK482913"
                inputMode="text"
                autoComplete="off"
                className={INPUT}
              />
              <button
                type="submit"
                disabled={looking || !manual.trim()}
                className="shrink-0 rounded-lg border border-line bg-surface px-4 text-sm font-medium text-ink hover:bg-paper disabled:opacity-50"
              >
                {looking ? 'Looking…' : 'Find booking'}
              </button>
            </div>
          </form>
        </div>
      )}

      {error && (
        <div className="mt-6 rounded-lg bg-warn/10 px-3.5 py-2.5 text-sm text-warn">{error}</div>
      )}

      {booking && verdict && (
        <div className="mt-8">
          <div
            className={`rounded-xl px-5 py-4 text-sm ${
              verdict === 'ready' || justCheckedIn
                ? 'bg-success/10 text-success'
                : verdict === 'already' || verdict === 'completed'
                  ? 'bg-brand-light text-brand-dark'
                  : 'bg-warn/10 text-warn'
            }`}
          >
            <p className="font-medium">
              {justCheckedIn && `${firstName} is checked in at ${timeOf(booking.checkedInAt as string)}.`}
              {!justCheckedIn && verdict === 'ready' && 'This booking is for today and hasn’t been checked in yet.'}
              {!justCheckedIn && verdict === 'wrongDay' && `This booking is for ${booking.date}, not today.`}
              {!justCheckedIn && verdict === 'already' && `Already checked in at ${timeOf(booking.checkedInAt as string)}.`}
              {!justCheckedIn && verdict === 'completed' && 'This booking is already completed.'}
              {!justCheckedIn && verdict === 'cancelled' && 'This booking was cancelled. Don’t check it in.'}
            </p>
          </div>

          <dl className="mt-4 divide-y divide-line overflow-hidden rounded-xl border border-line text-sm">
            {[
              ['Customer', booking.customer],
              ['Service', booking.service],
              ['Staff', booking.staff],
              ['When', `${booking.date} at ${booking.time}`],
              ['Price', booking.price],
              ['Reference', `#BK${booking.id.padStart(6, '0')}`],
            ].map(([k, v]) => (
              <div key={k} className="flex justify-between gap-4 px-5 py-3">
                <dt className="text-muted">{k}</dt>
                <dd className="text-right font-medium text-ink">{v}</dd>
              </div>
            ))}
          </dl>

          <div className="mt-6 flex flex-wrap items-center gap-3">
            {!justCheckedIn && (verdict === 'ready' || verdict === 'wrongDay') && (
              <button
                onClick={doCheckIn}
                disabled={busy}
                className="rounded-lg bg-brand px-5 py-2.5 text-sm font-medium text-white hover:bg-brand-dark disabled:opacity-60"
              >
                {busy ? 'Checking in…' : verdict === 'ready' ? `Check in ${firstName}` : `Check in ${firstName} anyway`}
              </button>
            )}
            {(justCheckedIn || verdict === 'already') && booking.status === 'Upcoming' && (
              <button
                onClick={markDone}
                disabled={busy}
                className="rounded-lg border border-line px-4 py-2.5 text-sm font-medium text-ink hover:bg-paper disabled:opacity-60"
              >
                {busy ? 'Saving…' : 'Mark as completed'}
              </button>
            )}
            <button onClick={reset} className="text-sm font-medium text-brand hover:text-brand-dark">
              Scan the next booking
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
