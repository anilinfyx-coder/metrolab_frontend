'use client';
import Sidebar, { NavItem } from '../../components/Sidebar';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

const corporateNavItems: NavItem[] = [
  { href: '/employee', label: 'Employees', icon: '👥', section: 'Corporate' },
  { href: '/testrequest', label: 'Test Requests', icon: '🧪', section: 'Corporate' },
];

export default function CorporateDashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  useEffect(() => {
    const token = localStorage.getItem('corporate_token');
    if (!token) router.push('/');
  }, [router]);

  return (
    <div className="app-layout">
      <Sidebar navItems={corporateNavItems} basePath="/corporate/dashboard" tokenKey="corporate_token" userKey="corporate_user" loginPath="/" />
      <div className="main-content">{children}</div>
    </div>
  );
}
