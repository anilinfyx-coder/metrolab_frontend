'use client';
import Sidebar, { NavItem } from '../../components/Sidebar';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

const adminNavItems: NavItem[] = [
  { href: '/labtest', label: 'Waiting List', icon: '📋', section: 'Reports' },
  { href: '/manageothertest', label: 'Tests Reports', icon: '📝', section: 'Reports' },
  { href: '/testrequests', label: 'Manage Requests', icon: '🧪', section: 'Corporate' },
  { href: '/patient', label: 'Patient Demographic', icon: '🧑‍⚕️', section: 'Patients' },
  { href: '/patientList', label: 'Patient List', icon: '👥', section: 'Patients' },
];

export default function AdminDashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem('admin_token');
    if (!token) router.push('/admin/login');
  }, [router]);

  return (
    <div className="app-layout">
      <Sidebar navItems={adminNavItems} basePath="/admin/dashboard" tokenKey="admin_token" userKey="admin_user" loginPath="/admin/login" />
      <div className="main-content">
        {children}
      </div>
    </div>
  );
}
