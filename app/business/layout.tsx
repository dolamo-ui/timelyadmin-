import { RequireRole } from '../components/RequireRole';
import { BusinessShell } from '../components/Business';

const NAV_ITEMS = [
  { label: 'Overview', href: '/business' },
  { label: 'Bookings', href: '/business/bookings' },
  { label: 'Check-in', href: '/business/check-in' },
  { label: 'Services', href: '/business/services' },
  { label: 'Staff', href: '/business/staff' },
  { label: 'Profile & hours', href: '/business/profile' },
];

export default function BusinessLayout({ children }: { children: React.ReactNode }) {
  return (
    <RequireRole role="business_owner">
      <BusinessShell items={NAV_ITEMS}>{children}</BusinessShell>
    </RequireRole>
  );
}
