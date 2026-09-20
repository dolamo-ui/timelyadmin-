import { Sidebar } from '../components/Sidebar';
import { RequireRole } from '../components/RequireRole';

const NAV_ITEMS = [
  { label: 'Overview', href: '/admin' },
  { label: 'Registrations', href: '/admin/applications' },
  { label: 'Businesses', href: '/admin/businesses' },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <RequireRole role="super_admin">
      <div className="flex">
        <Sidebar sectionLabel="Super Admin" contextLabel="All businesses" items={NAV_ITEMS} />
        <div className="flex-1 px-10 py-8">
          <div className="mx-auto max-w-5xl">{children}</div>
        </div>
      </div>
    </RequireRole>
  );
}
