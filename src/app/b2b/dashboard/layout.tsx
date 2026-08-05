'use client';
import Sidebar, { NavItem } from '../../components/Sidebar';
import AppFooter from '../../components/AppFooter';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { MdAccountBalanceWallet, MdAssignment, MdBusiness, MdComputer, MdDashboard, MdPeople, MdCardMembership } from 'react-icons/md';
import { apiFetch } from '../../../lib/api';

const baseB2bNavItems: NavItem[] = [
  { href: '', label: 'Dashboard', icon: <MdDashboard size={18} />, section: 'Overview' },
  { href: '/users', label: 'Manage Staff Users', icon: <MdPeople size={18} />, section: 'Lab Admin' },
  { href: '/assigntestcategory', label: 'Assigned Test Category', icon: <MdAssignment size={18} />, section: 'Lab Admin' },
  { href: '/corporateclient', label: 'Corporate Client', icon: <MdBusiness size={18} />, section: 'Lab Admin' },
];

export default function B2bDashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [navItems, setNavItems] = useState<NavItem[]>([...baseB2bNavItems, { href: '/wallet', label: 'Wallet & Transactions', icon: <MdAccountBalanceWallet size={18} />, section: 'Billing' }]);

  useEffect(() => {
    const token = localStorage.getItem('b2b_token');
    const userStr = localStorage.getItem('b2b_user');
    if (!token || !userStr) {
      router.push('/');
      return;
    }

    try {
      const user = JSON.parse(userStr);
      Promise.all([
        apiFetch<any[]>(`/api/B2bClientSubscription?b2b_client_id=${user.id}`, { tokenKey: 'b2b_token', silent: true }).catch(() => []),
        apiFetch<any>(`/api/B2bClients/${user.id}`, { tokenKey: 'b2b_token', silent: true }).catch(() => null)
      ])
        .then(([subs, clientProfile]) => {
          const billingMode = clientProfile?.billing_mode || 'monthly';
          let hasActiveSub = false;

          const isCorporateEnabled = clientProfile && typeof clientProfile.is_corporate_enabled === 'boolean' 
            ? clientProfile.is_corporate_enabled 
            : true;
            
          const filteredNavItems = isCorporateEnabled 
            ? baseB2bNavItems 
            : baseB2bNavItems.filter(item => item.href !== '/corporateclient');

          // Custom pricing is always considered an active subscription
          if (billingMode === 'custom') {
            hasActiveSub = true;
          } else if (subs && subs.length > 0) {
            const latestSub = subs[0];
            const endDate = new Date(latestSub.end_date);
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            if (endDate >= today) {
              hasActiveSub = true;
            }
          }

          if (hasActiveSub) {
            setNavItems([
              ...filteredNavItems,
              { href: billingMode === 'custom' ? '/wallet' : '/subscription', label: 'Active Subscription', icon: <MdCardMembership size={18} />, section: 'Billing' }
            ]);
          } else {
            setNavItems([
              ...filteredNavItems,
              { href: '/wallet', label: 'Wallet & Transactions', icon: <MdAccountBalanceWallet size={18} />, section: 'Billing' }
            ]);
          }
        })
        .catch(() => {});
    } catch (err) {}
  }, [router]);

  return (
    <div className="app-layout">
      <Sidebar navItems={navItems} basePath="/b2b/dashboard" tokenKey="b2b_token" userKey="b2b_user" loginPath="/" />
      <div className="main-content">
        <div className="main-content-body">{children}</div>
        <AppFooter />
      </div>
    </div>
  );
}
