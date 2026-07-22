'use client';
import Sidebar, { NavItem } from '../../components/Sidebar';
import AppFooter from '../../components/AppFooter';
import { useEffect } from 'react';
import Link from 'next/link';
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
  MdAdd,
  MdMail,
  MdClose,
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

      {/* Floating Action Button (Add Patient) */}
      <div style={{ position: 'fixed', bottom: '30px', right: '30px', zIndex: 9999 }}>
        <Link 
          href="/admin/dashboard/patient"
          title="Add Patient"
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
