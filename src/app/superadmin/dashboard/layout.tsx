'use client';
import Sidebar, { NavItem } from '../../components/Sidebar';
import AppFooter from '../../components/AppFooter';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

const superAdminNavItems: NavItem[] = [
  { href: '', label: 'Dashboard', icon: '📊', section: 'Overview' },
  { href: '/superadminstaff', label: 'Super Admin Staff', icon: '🔑', section: 'Master Configurations' },
  { href: '/documenttype', label: 'Document Type', icon: '📄', section: 'Master Configurations' },
  { href: '/specimentype', label: 'Specimen Type', icon: '🧪', section: 'Master Configurations' },
  { href: '/labtestcategory', label: 'Lab Test Category', icon: '🔬', section: 'Master Configurations' },
  // { href: '/testreportquestions', label: 'Test Report Questions', icon: '❓', section: 'Master Configurations' },
  // { href: '/testresultparameter', label: 'Test Result Parameters', icon: '📊', section: 'Master Configurations' },
  { href: '/b2bclient', label: 'B2B Labs', icon: '🏢', section: 'Master Configurations' },
  { href: '/globalsettings', label: 'Global Settings', icon: '⚙️', section: 'Master Configurations' },
  { href: '/profile', label: 'My Profile', icon: '👤', section: 'Account' },
];

export default function SuperAdminDashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  useEffect(() => {
    const token = localStorage.getItem('superadmin_token');
    if (!token) router.push('/');
  }, [router]);

  return (
    <div className="app-layout">
      <Sidebar navItems={superAdminNavItems} basePath="/superadmin/dashboard" tokenKey="superadmin_token" userKey="superadmin_user" loginPath="/" />
      <div className="main-content">
        <div className="main-content-body">{children}</div>
        <AppFooter />
      </div>
    </div>
  );
}
