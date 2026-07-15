'use client';
import Sidebar, { NavItem } from '../../components/Sidebar';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

const b2bNavItems: NavItem[] = [
  { href: '/admindashboard', label: 'Admin Dashboard', icon: '🖥️', section: 'Lab Admin' },
  { href: '/users', label: 'Manage Staff Users', icon: '👥', section: 'Lab Admin' },
  { href: '/assigntestcategory', label: 'Assigned Test Category', icon: '📋', section: 'Lab Admin' },
  { href: '/corporateclient', label: 'Corporate Client', icon: '🏢', section: 'Lab Admin' },
];

export default function B2bDashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  useEffect(() => {
    const token = localStorage.getItem('b2b_token');
    if (!token) router.push('/');
  }, [router]);

  return (
    <div className="app-layout">
      <Sidebar navItems={b2bNavItems} basePath="/b2b/dashboard" tokenKey="b2b_token" userKey="b2b_user" loginPath="/" />
      <div className="main-content">{children}</div>
    </div>
  );
}
