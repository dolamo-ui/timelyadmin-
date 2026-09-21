'use client';

import { useCallback, useEffect, useState } from 'react';
import { useBusiness } from '../../components/Business';
import { Service, deleteService, listServices, saveService } from '../../../lib/data';
import { errorMessage, formatPrice } from '../../../lib/format';

interface Draft {
  id?: string;
  name: string;
  description: string;
  duration: string;
  price: string;
}

const EMPTY: Draft = { name: '', description: '', duration: '30', price: '' };
const INPUT =
  'w-full rounded-lg border border-line bg-surface px-3.5 py-2.5 text-sm text-ink outline-none focus:border-brand focus:ring-2 focus:ring-brand-light';

export default function ServicesPage() {
  const { business } = useBusiness();
  const [services, setServices] = useState<Service[] | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    try {
      setServices(await listServices(business.id));
    } catch (e) {
      setError(errorMessage(e));
    }
  }, [business.id]);

  useEffect(() => {
    reload();
  }, [reload]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!draft) return;

    const duration = parseInt(draft.duration, 10);
    const price = parseFloat(draft.price);
    if (!draft.name.trim()) return setError('Give the service a name.');
    if (!Number.isFinite(duration) || duration <= 0) return setError('Duration must be a number of minutes.');
    if (!Number.isFinite(price) || price < 0) return setError('Enter a valid price.');

    setError(null);
    setSaving(true);
    try {
      await saveService(business.id, {
        id: draft.id,
        name: draft.name.trim(),
        description: draft.description.trim(),
        duration_minutes: duration,
        price,
      });
      setDraft(null);
      await reload();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(s: Service) {
    if (!window.confirm(`Delete “${s.name}”? Existing bookings for it are not removed.`)) return;
    setError(null);
    try {
      await deleteService(s.id);
      await reload();
    } catch (err) {
      setError(errorMessage(err));
    }
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold text-ink">Services</h1>
          <p className="mt-1.5 text-sm text-muted">What customers can book, and what it costs.</p>
        </div>
        <button
          onClick={() => {
            setError(null);
            setDraft(EMPTY);
          }}
          className="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-dark"
        >
          Add service
        </button>
      </div>

      {error && (
        <div className="mt-5 rounded-lg bg-warn/10 px-3.5 py-2.5 text-sm text-warn">{error}</div>
      )}

      {draft && (
        <form onSubmit={handleSave} className="mt-6 rounded-xl border border-line bg-paper p-5">
          <h2 className="font-display text-sm font-semibold text-ink">
            {draft.id ? 'Edit service' : 'New service'}
          </h2>
          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <label htmlFor="s-name" className="mb-1.5 block text-sm font-medium text-ink">Name</label>
              <input
                id="s-name"
                className={INPUT}
                value={draft.name}
                onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                placeholder="Haircut & Style"
                autoFocus
              />
            </div>
            <div>
              <label htmlFor="s-dur" className="mb-1.5 block text-sm font-medium text-ink">Duration (min)</label>
              <input
                id="s-dur"
                type="number"
                min={5}
                step={5}
                className={INPUT}
                value={draft.duration}
                onChange={(e) => setDraft({ ...draft, duration: e.target.value })}
              />
            </div>
            <div>
              <label htmlFor="s-price" className="mb-1.5 block text-sm font-medium text-ink">Price (R)</label>
              <input
                id="s-price"
                type="number"
                min={0}
                step="any"
                className={INPUT}
                value={draft.price}
                onChange={(e) => setDraft({ ...draft, price: e.target.value })}
                placeholder="350"
              />
            </div>
          </div>
          <div className="mt-4">
            <label htmlFor="s-desc" className="mb-1.5 block text-sm font-medium text-ink">Description (optional)</label>
            <textarea
              id="s-desc"
              rows={2}
              className={INPUT}
              value={draft.description}
              onChange={(e) => setDraft({ ...draft, description: e.target.value })}
              placeholder="What's included?"
            />
          </div>
          <div className="mt-4 flex gap-3">
            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-dark disabled:opacity-60"
            >
              {saving ? 'Saving…' : 'Save'}
            </button>
            <button type="button" onClick={() => setDraft(null)} className="text-sm font-medium text-muted hover:text-ink">
              Cancel
            </button>
          </div>
        </form>
      )}

      <div className="mt-8 overflow-x-auto rounded-xl border border-line">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-line bg-paper text-xs uppercase tracking-wide text-muted">
              <th className="px-3 py-3 sm:px-5 font-medium">Service</th>
              <th className="hidden px-3 py-3 font-medium sm:table-cell sm:px-5">Duration</th>
              <th className="px-3 py-3 sm:px-5 font-medium text-right">Price</th>
              <th className="px-3 py-3 sm:px-5 font-medium"></th>
            </tr>
          </thead>
          <tbody>
            {services === null && !error && (
              <tr><td colSpan={4} className="px-3 py-6 sm:px-5 text-center text-muted">Loading…</td></tr>
            )}
            {services?.length === 0 && (
              <tr><td colSpan={4} className="px-3 py-6 sm:px-5 text-center text-muted">No services yet — add your first one.</td></tr>
            )}
            {services?.map((s) => (
              <tr key={s.id} className="border-b border-line last:border-0 hover:bg-paper/60">
                <td className="px-3 py-3.5 font-medium text-ink sm:px-5">
                  {s.name}
                  <span className="mt-0.5 block text-xs font-normal text-muted sm:hidden">{s.duration_minutes} min</span>
                </td>
                <td className="hidden px-3 py-3.5 text-muted sm:table-cell sm:px-5">{s.duration_minutes} min</td>
                <td className="px-3 py-3.5 sm:px-5 text-right tabular-nums text-ink">{formatPrice(s.price)}</td>
                <td className="px-3 py-3.5 sm:px-5 text-right">
                  <div className="flex flex-col items-end gap-2 sm:flex-row sm:justify-end sm:gap-3">
                    <button
                      onClick={() => {
                        setError(null);
                        setDraft({
                          id: s.id,
                          name: s.name,
                          description: s.description ?? '',
                          duration: String(s.duration_minutes),
                          price: String(s.price),
                        });
                      }}
                      className="text-xs font-medium text-brand hover:underline"
                    >
                      Edit
                    </button>
                    <button onClick={() => handleDelete(s)} className="text-xs font-medium text-warn hover:underline">
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
