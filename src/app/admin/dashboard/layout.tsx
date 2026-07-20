'use client';
import Sidebar, { NavItem } from '../../components/Sidebar';
import AppFooter from '../../components/AppFooter';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  MdAssignment,
  MdDescription,
  MdLocalHospital,
  MdPeople,
  MdScience,
} from 'react-icons/md';

const adminNavItems: NavItem[] = [
  { href: '', label: 'Dashboard', icon: '📊', section: 'Overview' },
  { href: '/labtest', label: 'Waiting List', icon: <MdAssignment size={18} />, section: 'Reports' },
  { href: '/manageothertest', label: 'Tests Reports', icon: <MdDescription size={18} />, section: 'Reports' },
  { href: '/testrequests', label: 'Manage Requests', icon: <MdScience size={18} />, section: 'Corporate' },
  { href: '/patient', label: 'Patient Demographic', icon: <MdLocalHospital size={18} />, section: 'Patients' },
  { href: '/patientList', label: 'Patient List', icon: <MdPeople size={18} />, section: 'Patients' },
];

export default function AdminDashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem('admin_token');
    if (!token) router.push('/');
  }, [router]);

  return (
    <div className="app-layout">
      <Sidebar navItems={adminNavItems} basePath="/admin/dashboard" tokenKey="admin_token" userKey="admin_user" loginPath="/" />
      <div className="main-content">
        <div className="main-content-body">{children}</div>
        <AppFooter />
      </div>
    </div>
  );
}
