'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { fetchAdminStats } from '../../lib/adminApi';
import { errorMessage } from '../../lib/format';

export default function AdminOverviewPage() {
  const [stats, setStats] = useState<Awaited<ReturnType<typeof fetchAdminStats>> | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchAdminStats().then(setStats).catch((e) => setError(errorMessage(e)));
  }, []);

  const metrics = [
    { label: 'Active businesses', value: stats?.activeBusinesses },
    { label: 'Bookings this week', value: stats?.bookingsThisWeek },
    { label: 'Pending onboarding', value: stats?.pendingOnboarding },
  ];

  return (
    <div>
      <h1 className="font-display text-2xl font-semibold text-ink">Overview</h1>
      <p className="mt-1.5 text-sm text-muted">A snapshot across every business on Timely.</p>

      {error && (
        <div className="mt-5 rounded-lg bg-warn/10 px-3.5 py-2.5 text-sm text-warn">{error}</div>
      )}

      {!!stats?.newApplications && (
        <Link
          href="/admin/applications"
          className="mt-6 flex items-center justify-between rounded-xl bg-brand-light px-5 py-4 text-sm font-medium text-brand-dark hover:opacity-90"
        >
          <span>
            {stats.newApplications} new {stats.newApplications === 1 ? 'business registration is' : 'business registrations are'} waiting for you
          </span>
          <span>View</span>
        </Link>
      )}

      <div className="mt-8 grid grid-cols-3 gap-px overflow-hidden rounded-xl border border-line bg-line">
        {metrics.map((m) => (
          <div key={m.label} className="bg-surface p-5">
            <p className="text-sm text-muted">{m.label}</p>
            <p className="mt-2 font-display text-3xl font-semibold tabular-nums text-ink">
              {m.value ?? '—'}
            </p>
          </div>
        ))}
      </div>

      <p className="mt-6 text-sm text-muted">
        “Active” means the business has an owner login. “Pending onboarding” are listings still waiting for one.
      </p>
    </div>
  );
}
