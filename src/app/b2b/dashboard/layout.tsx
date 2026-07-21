'use client';
import Sidebar, { NavItem } from '../../components/Sidebar';
import AppFooter from '../../components/AppFooter';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  MdAccountBalanceWallet,
  MdAssignment,
  MdBusiness,
  MdComputer,
  MdDashboard,
  MdPeople,
} from 'react-icons/md';

const b2bNavItems: NavItem[] = [
  { href: '', label: 'Dashboard', icon: <MdDashboard size={18} />, section: 'Overview' },
  { href: '/users', label: 'Manage Staff Users', icon: <MdPeople size={18} />, section: 'Lab Admin' },
  { href: '/assigntestcategory', label: 'Assigned Test Category', icon: <MdAssignment size={18} />, section: 'Lab Admin' },
  { href: '/corporateclient', label: 'Corporate Client', icon: <MdBusiness size={18} />, section: 'Lab Admin' },
  { href: '/wallet', label: 'Wallet & Transactions', icon: <MdAccountBalanceWallet size={18} />, section: 'Billing' },
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
      <div className="main-content">
        <div className="main-content-body">{children}</div>
        <AppFooter />
      </div>
    </div>
  );
}
