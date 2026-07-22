'use client';
import Sidebar, { NavItem } from '../../components/Sidebar';
import AppFooter from '../../components/AppFooter';
import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import {
  MdBiotech,
  MdBusiness,
  MdDashboard,
  MdDescription,
  MdPerson,
  MdScience,
  MdSettings,
  MdVpnKey,
  MdAdd,
} from 'react-icons/md';

const superAdminNavItems: NavItem[] = [
  { href: '', label: 'Dashboard', icon: <MdDashboard size={18} />, section: 'Overview' },
  { href: '/superadminstaff', label: 'Super Admin Staff', icon: <MdVpnKey size={18} />, section: 'Master Configurations' },
  { href: '/documenttype', label: 'Document Type', icon: <MdDescription size={18} />, section: 'Master Configurations' },
  { href: '/specimentype', label: 'Specimen Type', icon: <MdScience size={18} />, section: 'Master Configurations' },
  { href: '/labtestcategory', label: 'Lab Test Category', icon: <MdBiotech size={18} />, section: 'Master Configurations' },
  // { href: '/testreportquestions', label: 'Test Report Questions', icon: <MdHelpOutline size={18} />, section: 'Master Configurations' },
  // { href: '/testresultparameter', label: 'Test Result Parameters', icon: <MdBarChart size={18} />, section: 'Master Configurations' },
  { href: '/b2bclient', label: 'B2B Labs', icon: <MdBusiness size={18} />, section: 'Master Configurations' },
  // { href: '/globalsettings', label: 'Global Settings', icon: <MdSettings size={18} />, section: 'Master Configurations' },
  { href: '/profile', label: 'My Profile', icon: <MdPerson size={18} />, section: 'Account' },
];

export default function SuperAdminDashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [navItems, setNavItems] = useState<NavItem[]>(superAdminNavItems);

  useEffect(() => {
    const token = localStorage.getItem('superadmin_token');
    if (!token) {
      router.push('/');
      return;
    }

    const userStr = localStorage.getItem('superadmin_user');
    if (userStr) {
      try {
        const user = JSON.parse(userStr);
        if (Number(user.role) !== 1) {
          setNavItems(prev => prev.filter(item => item.href !== '/superadminstaff'));
        }
      } catch {}
    }
  }, [router]);

  return (
    <div className="app-layout">
      <Sidebar navItems={navItems} basePath="/superadmin/dashboard" tokenKey="superadmin_token" userKey="superadmin_user" loginPath="/" />
      <div className="main-content">
        <div className="main-content-body">{children}</div>
        <AppFooter />
      </div>

      {/* Floating Action Button (Add B2B Lab) */}
      <div style={{ position: 'fixed', bottom: '30px', right: '30px', zIndex: 9999 }}>
        <Link 
          href="/superadmin/dashboard/b2bclient?view=form"
          title="Add B2B Lab"
          style={{
            width: '56px',
            height: '56px',
            borderRadius: '50%',
            backgroundColor: 'var(--primary)',
            color: 'white',
            boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            textDecoration: 'none',
            transition: 'transform 0.2s'
          }}
          onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
          onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
        >
          <MdAdd size={28} />
        </Link>
      </div>
    </div>
  );
}
