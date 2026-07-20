'use client';
import Sidebar, { NavItem } from '../../components/Sidebar';
import AppFooter from '../../components/AppFooter';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { MdPeople, MdScience } from 'react-icons/md';

const corporateNavItems: NavItem[] = [
  { href: '', label: 'Dashboard', icon: '📊', section: 'Overview' },
  { href: '/employee', label: 'Employees', icon: <MdPeople size={18} />, section: 'Corporate' },
  { href: '/testrequest', label: 'Test Requests', icon: <MdScience size={18} />, section: 'Corporate' },
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
      <div className="main-content">
        <div className="main-content-body">{children}</div>
        <AppFooter />
      </div>
    </div>
  );
}
