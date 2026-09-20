'use client';

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
  AdminBusinessRow,
  CreatedBusiness,
  createBusiness,
  fetchApplications,
  fetchBusinesses,
} from '../../../../lib/adminApi';
import { CATEGORIES } from '../../../../lib/registration';
import { errorMessage } from '../../../../lib/format';


const INPUT =
  'w-full rounded-lg border border-line bg-surface px-3.5 py-2.5 text-sm text-ink outline-none focus:border-brand focus:ring-2 focus:ring-brand-light';

function NewBusinessForm() {
  const params = useSearchParams();
  const applicationId = params.get('application') ?? '';
  const [unclaimed, setUnclaimed] = useState<AdminBusinessRow[]>([]);
  const [existingId, setExistingId] = useState('');
  const [name, setName] = useState('');
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [ownerEmail, setOwnerEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<CreatedBusiness | null>(null);
  const [copied, setCopied] = useState(false);

  // Coming from Registrations: pre-fill what the business told us.
  useEffect(() => {
    if (!applicationId) return;
    fetchApplications()
      .then((list) => {
        const a = list.find((x) => x.id === applicationId);
        if (!a) return;
        setName(a.businessName);
        if (CATEGORIES.includes(a.category)) setCategory(a.category);
        setOwnerEmail(a.email);
      })
      .catch(() => {});
  }, [applicationId]);

  // Listings that already exist but have no owner login yet.
  useEffect(() => {
    fetchBusinesses()
      .then((list) => setUnclaimed(list.filter((b) => !b.hasOwner)))
      .catch(() => {});
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await createBusiness({
        businessId: existingId || undefined,
        applicationId: applicationId || undefined,
        name: name.trim(),
        category,
        ownerEmail: ownerEmail.trim(),
      });
      setCreated(res);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  async function copyDetails() {
    if (!created) return;
    try {
      await navigator.clipboard.writeText(`Email: ${created.ownerEmail}\nPassword: ${created.password}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard blocked — the details are on screen anyway */
    }
  }

  if (created) {
    return (
      <div className="max-w-md">
        <span className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-full bg-success/10 text-success">
          ✓
        </span>
        <h1 className="font-display text-2xl font-semibold text-ink">
          {created.business.name} is set up
        </h1>
        <p className="mt-1.5 text-sm text-muted">
          Share these login details with the owner — they can change the password once they sign in.
        </p>

        <div className="mt-6 space-y-3 rounded-xl border border-line bg-paper p-5">
          <div>
            <p className="text-xs uppercase tracking-wide text-muted">Email</p>
            <p className="mt-0.5 text-sm font-medium text-ink">{created.ownerEmail}</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-muted">Temporary password</p>
            <p className="mt-0.5 font-mono text-sm font-medium text-ink">{created.password}</p>
          </div>
          <button onClick={copyDetails} className="text-xs font-medium text-brand hover:text-brand-dark">
            {copied ? 'Copied ✓' : 'Copy both'}
          </button>
        </div>

        <p className="mt-4 text-xs text-warn">
          This password is shown only once and isn&apos;t stored anywhere. Copy it now.
        </p>

        <Link
          href="/admin/businesses"
          className="mt-6 inline-block text-sm font-medium text-brand hover:text-brand-dark"
        >
          Back to businesses
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-md">
      <h1 className="font-display text-2xl font-semibold text-ink">New business</h1>
      <p className="mt-1.5 text-sm text-muted">
        Use this once a business has paid — it creates their login and gives you a password to share.
      </p>

      {error && (
        <div className="mt-5 rounded-lg bg-warn/10 px-3.5 py-2.5 text-sm text-warn">{error}</div>
      )}

      <form onSubmit={handleSubmit} className="mt-8 space-y-4">
        {unclaimed.length > 0 && (
          <div>
            <label htmlFor="existing" className="mb-1.5 block text-sm font-medium text-ink">
              Listing
            </label>
            <select
              id="existing"
              value={existingId}
              onChange={(e) => setExistingId(e.target.value)}
              className={INPUT}
            >
              <option value="">Create a new listing</option>
              {unclaimed.map((b) => (
                <option key={b.id} value={b.id}>
                  Link to existing: {b.name}
                </option>
              ))}
            </select>
          </div>
        )}

        {!existingId && (
          <>
            <div>
              <label htmlFor="name" className="mb-1.5 block text-sm font-medium text-ink">
                Business name
              </label>
              <input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className={INPUT}
                placeholder="Glow Hair Studio"
              />
            </div>

            <div>
              <label htmlFor="category" className="mb-1.5 block text-sm font-medium text-ink">
                Category
              </label>
              <select
                id="category"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className={INPUT}
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
          </>
        )}

        <div>
          <label htmlFor="ownerEmail" className="mb-1.5 block text-sm font-medium text-ink">
            Owner&apos;s email
          </label>
          <input
            id="ownerEmail"
            type="email"
            value={ownerEmail}
            onChange={(e) => setOwnerEmail(e.target.value)}
            required
            className={INPUT}
            placeholder="owner@business.com"
          />
          <p className="mt-1.5 text-xs text-muted">
            This is what they&apos;ll use to sign in. It must not already have a Timely account.
          </p>
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-lg bg-brand py-2.5 text-sm font-medium text-white transition-colors hover:bg-brand-dark disabled:opacity-60"
        >
          {submitting ? 'Creating…' : 'Create business & generate login'}
        </button>
      </form>
    </div>
  );
}

export default function NewBusinessPage() {
  // useSearchParams needs a Suspense boundary in the App Router.
  return (
    <Suspense fallback={null}>
      <NewBusinessForm />
    </Suspense>
  );
}
