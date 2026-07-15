'use client';
import Sidebar, { NavItem } from '../../components/Sidebar';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

const superAdminNavItems: NavItem[] = [
  { href: '/superadminstaff', label: 'Super Admin Staff', icon: '🔑', section: 'Master Configurations' },
  { href: '/documenttype', label: 'Document Type', icon: '📄', section: 'Master Configurations' },
  { href: '/specimentype', label: 'Specimen Type', icon: '🧪', section: 'Master Configurations' },
  { href: '/labtestcategory', label: 'Lab Test Category', icon: '🔬', section: 'Master Configurations' },
  { href: '/b2bclient', label: 'B2B Labs', icon: '🏢', section: 'Master Configurations' },
];

export default function SuperAdminDashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  useEffect(() => {
    const token = localStorage.getItem('superadmin_token');
    if (!token) router.push('/superadmin/login');
  }, [router]);

  return (
    <div className="app-layout">
      <Sidebar navItems={superAdminNavItems} basePath="/superadmin/dashboard" tokenKey="superadmin_token" userKey="superadmin_user" loginPath="/superadmin/login" />
      <div className="main-content">{children}</div>
    </div>
  );
}
