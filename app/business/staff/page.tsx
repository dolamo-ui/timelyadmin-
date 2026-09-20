'use client';

import { useCallback, useEffect, useState } from 'react';
import { useBusiness } from '../../components/Business';
import { StaffMember, deleteStaff, listStaff, saveStaff } from '../../../lib/data';
import { errorMessage } from '../../../lib/format';

interface Draft {
  id?: string;
  name: string;
  role: string;
}

const EMPTY: Draft = { name: '', role: '' };
const INPUT =
  'w-full rounded-lg border border-line bg-surface px-3.5 py-2.5 text-sm text-ink outline-none focus:border-brand focus:ring-2 focus:ring-brand-light';

export default function StaffPage() {
  const { business } = useBusiness();
  const [staff, setStaff] = useState<StaffMember[] | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    try {
      setStaff(await listStaff(business.id));
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
    if (!draft.name.trim()) return setError('Enter the team member’s name.');

    setError(null);
    setSaving(true);
    try {
      await saveStaff(business.id, { id: draft.id, name: draft.name.trim(), role: draft.role.trim() });
      setDraft(null);
      await reload();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(s: StaffMember) {
    if (!window.confirm(`Remove ${s.name} from your team?`)) return;
    setError(null);
    try {
      await deleteStaff(s.id);
      await reload();
    } catch (err) {
      setError(errorMessage(err));
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold text-ink">Staff</h1>
          <p className="mt-1.5 text-sm text-muted">Team members customers can book with.</p>
        </div>
        <button
          onClick={() => {
            setError(null);
            setDraft(EMPTY);
          }}
          className="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-dark"
        >
          Add staff member
        </button>
      </div>

      {error && (
        <div className="mt-5 rounded-lg bg-warn/10 px-3.5 py-2.5 text-sm text-warn">{error}</div>
      )}

      {draft && (
        <form onSubmit={handleSave} className="mt-6 rounded-xl border border-line bg-paper p-5">
          <h2 className="font-display text-sm font-semibold text-ink">
            {draft.id ? 'Edit staff member' : 'New staff member'}
          </h2>
          <div className="mt-4 grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="st-name" className="mb-1.5 block text-sm font-medium text-ink">Name</label>
              <input
                id="st-name"
                className={INPUT}
                value={draft.name}
                onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                autoFocus
              />
            </div>
            <div>
              <label htmlFor="st-role" className="mb-1.5 block text-sm font-medium text-ink">Role</label>
              <input
                id="st-role"
                className={INPUT}
                value={draft.role}
                onChange={(e) => setDraft({ ...draft, role: e.target.value })}
                placeholder="Senior Stylist"
              />
            </div>
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

      <div className="mt-8 overflow-hidden rounded-xl border border-line">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-line bg-paper text-xs uppercase tracking-wide text-muted">
              <th className="px-5 py-3 font-medium">Name</th>
              <th className="px-5 py-3 font-medium">Role</th>
              <th className="px-5 py-3 font-medium"></th>
            </tr>
          </thead>
          <tbody>
            {staff === null && !error && (
              <tr><td colSpan={3} className="px-5 py-6 text-center text-muted">Loading…</td></tr>
            )}
            {staff?.length === 0 && (
              <tr><td colSpan={3} className="px-5 py-6 text-center text-muted">No staff yet — add your first team member.</td></tr>
            )}
            {staff?.map((s) => (
              <tr key={s.id} className="border-b border-line last:border-0 hover:bg-paper/60">
                <td className="px-5 py-3.5 font-medium text-ink">{s.name}</td>
                <td className="px-5 py-3.5 text-muted">{s.role ?? '—'}</td>
                <td className="px-5 py-3.5 text-right">
                  <div className="flex justify-end gap-3">
                    <button
                      onClick={() => {
                        setError(null);
                        setDraft({ id: s.id, name: s.name, role: s.role ?? '' });
                      }}
                      className="text-xs font-medium text-brand hover:underline"
                    >
                      Edit
                    </button>
                    <button onClick={() => handleDelete(s)} className="text-xs font-medium text-warn hover:underline">
                      Remove
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
