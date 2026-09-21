'use client';

import { useEffect, useState } from 'react';
import { useBusiness } from '../components/Business';
import { getOwnerStats } from '../../lib/data';
import { errorMessage } from '../../lib/format';

export default function BusinessOverviewPage() {
  const { business } = useBusiness();
  const [stats, setStats] = useState<Awaited<ReturnType<typeof getOwnerStats>> | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getOwnerStats(business.id).then(setStats).catch((e) => setError(errorMessage(e)));
  }, [business.id]);

  const metrics = [
    { label: "Today's bookings", value: stats?.today },
    { label: 'Upcoming this week', value: stats?.upcomingWeek },
    { label: 'Active services', value: stats?.services },
  ];

  return (
    <div>
      <h1 className="font-display text-2xl font-semibold text-ink">Overview</h1>
      <p className="mt-1.5 text-sm text-muted">How {business.name} is doing on Timely.</p>

      {error && (
        <div className="mt-5 rounded-lg bg-warn/10 px-3.5 py-2.5 text-sm text-warn">{error}</div>
      )}

      <div className="mt-8 grid grid-cols-1 gap-px sm:grid-cols-3 overflow-hidden rounded-xl border border-line bg-line">
        {metrics.map((m) => (
          <div key={m.label} className="bg-surface p-5">
            <p className="text-sm text-muted">{m.label}</p>
            <p className="mt-2 font-display text-3xl font-semibold tabular-nums text-ink">
              {m.value ?? '—'}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
