'use client';
import Sidebar, { NavItem } from '../../components/Sidebar';
import AppFooter from '../../components/AppFooter';
import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import {
  MdAssignment,
  MdDashboard,
  MdDescription,
  MdHealthAndSafety,
  MdLocalHospital,
  MdMedicalServices,
  MdPeople,
  MdScience,
} from 'react-icons/md';

const adminNavItems: NavItem[] = [
  { href: '', label: 'Dashboard', icon: <MdDashboard size={18} />, section: 'Overview' },
  { href: '/labtest', label: 'Waiting List', icon: <MdAssignment size={18} />, section: 'Reports' },
  { href: '/manageothertest', label: 'Tests Reports', icon: <MdDescription size={18} />, section: 'Reports' },
  { href: '/testrequests', label: 'Manage Requests', icon: <MdScience size={18} />, section: 'Corporate' },
  { href: '/patient', label: 'Patient Demographic', icon: <MdLocalHospital size={18} />, section: 'Patients' },
  { href: '/patientList', label: 'Patient List', icon: <MdPeople size={18} />, section: 'Patients' },
  { href: '/health-certificates', label: 'Health Certificates', icon: <MdHealthAndSafety size={18} />, section: 'Patients' },
  { href: '/physical-examinations', label: 'Physical Examinations', icon: <MdMedicalServices size={18} />, section: 'Patients' },
];

export default function AdminDashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const isPrintView = pathname?.includes('/print/') ?? false;

  useEffect(() => {
    const token = localStorage.getItem('admin_token');
    if (!token) router.push('/');
  }, [router]);

  // Certificate print/preview pages: certificate only (no sidebar/footer)
  if (isPrintView) {
    return <div className="cert-print-root">{children}</div>;
  }

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
