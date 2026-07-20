'use client';
import { useEffect, useState, type ReactNode } from 'react';
import Link from 'next/link';
import TopNav from '../../components/TopNav';
import { formatDate } from '../../utils/dateFormat';
import { apiFetch } from '../../../lib/api';

interface AdminUser {
  id?: number;
  name?: string;
  email?: string;
}

interface PatientRow {
  id: number;
  uid?: string;
  name?: string;
  mobile?: string;
  email?: string;
  creation_timestamp?: string;
}

interface WaitingListRow {
  id: number;
  patient_name?: string;
  patient_mobile?: string;
  tests?: string;
  test_count?: number;
  reason_for_test?: string;
  creation_timestamp?: string;
}

interface TestReportRow {
  id: number;
  uid?: string;
  patient_name?: string;
  lab_test_name?: string;
  report_status?: string;
  final_result?: string;
  creation_timestamp?: string;
}

interface TestRequestRow {
  id: number;
  title?: string;
  corporateClientCompany?: string;
  numberOfEmployee?: number;
  status?: boolean | string;
  creation_timestamp?: string;
}

function getAdminUser(): AdminUser | null {
  if (typeof window === 'undefined') return null;
  const raw = localStorage.getItem('admin_user');
  if (!raw) return null;
  try {
    return JSON.parse(raw) as AdminUser;
  } catch {
    return null;
  }
}

export default function AdminDashboardPage() {
  const [user, setUser] = useState<AdminUser | null>(null);
  const [patients, setPatients] = useState<PatientRow[]>([]);
  const [waitingList, setWaitingList] = useState<WaitingListRow[]>([]);
  const [testReports, setTestReports] = useState<TestReportRow[]>([]);
  const [testRequests, setTestRequests] = useState<TestRequestRow[]>([]);
  const [healthCertificates, setHealthCertificates] = useState<unknown[]>([]);
  const [physicalExams, setPhysicalExams] = useState<unknown[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setUser(getAdminUser());

        const [
          patientData,
          waitingData,
          reportData,
          requestData,
          healthData,
          physicalData,
        ] = await Promise.all([
          apiFetch<PatientRow[]>('/api/Patient', { tokenKey: 'admin_token' }).catch(() => []),
          apiFetch<WaitingListRow[]>('/api/WaitingList', { tokenKey: 'admin_token' }).catch(() => []),
          apiFetch<TestReportRow[]>('/api/LabTestCategoryReport', { tokenKey: 'admin_token' }).catch(() => []),
          apiFetch<TestRequestRow[]>('/api/TestRequest', { tokenKey: 'admin_token' }).catch(() => []),
          apiFetch<unknown[]>('/api/AdultHealthCertificates', { tokenKey: 'admin_token' }).catch(() => []),
          apiFetch<unknown[]>('/api/PhysicalExaminationCertificates', { tokenKey: 'admin_token' }).catch(() => []),
        ]);

        setPatients(Array.isArray(patientData) ? patientData : []);
        setWaitingList(Array.isArray(waitingData) ? waitingData : []);
        setTestReports(Array.isArray(reportData) ? reportData : []);
        setTestRequests(Array.isArray(requestData) ? requestData : []);
        setHealthCertificates(Array.isArray(healthData) ? healthData : []);
        setPhysicalExams(Array.isArray(physicalData) ? physicalData : []);
      } finally {
        setLoading(false);
      }
    };

    void fetchData();
  }, []);

  const recentPatients = patients.slice(0, 5);
  const recentWaiting = waitingList.slice(0, 5);
  const recentReports = testReports.slice(0, 5);
  const recentRequests = testRequests.slice(0, 5);
  const pendingWaiting = waitingList.filter((row) => (row.test_count || 0) > 0).length;

  return (
    <>
      <TopNav title="Dashboard" />

      <div className="page-content" style={{ backgroundColor: '#f0f4f8', minHeight: 'calc(100vh - 70px)', padding: '24px' }}>
        {loading ? (
          <div style={{ padding: '20px', color: 'var(--text-muted)' }}>Loading dashboard...</div>
        ) : (
          <div style={{ maxWidth: '1400px', margin: '0 auto', width: '100%' }}>
            <div style={{ marginBottom: '24px' }}>
              <h2 style={{ fontSize: '1.8rem', color: '#0f172a', margin: '0 0 8px 0' }}>
                Welcome back, {user?.name || 'Admin'} 👋
              </h2>
              <p style={{ color: '#64748b', margin: 0 }}>
                Here is an overview of patients, waiting list, test reports, and corporate requests in your lab today.
              </p>
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                gap: '20px',
                marginBottom: '30px',
              }}
            >
              <DashboardCard
                title="Total Patients"
                value={patients.length}
                icon="🏥"
                gradient="linear-gradient(135deg, #f12711 0%, #f5af19 100%)"
                link="/admin/dashboard/patientList"
              />
              <DashboardCard
                title="Waiting List"
                value={waitingList.length}
                icon="📋"
                gradient="linear-gradient(135deg, #0072ff 0%, #00c6ff 100%)"
                link="/admin/dashboard/labtest"
              />
              <DashboardCard
                title="Pending Tests"
                value={pendingWaiting}
                icon="⏳"
                gradient="linear-gradient(135deg, #8E2DE2 0%, #4A00E0 100%)"
                link="/admin/dashboard/labtest"
              />
              <DashboardCard
                title="Test Reports"
                value={testReports.length}
                icon="🧪"
                gradient="linear-gradient(135deg, #FF416C 0%, #FF4B2B 100%)"
                link="/admin/dashboard/manageothertest"
              />
              <DashboardCard
                title="Manage Requests"
                value={testRequests.length}
                icon="📨"
                gradient="linear-gradient(135deg, #11998e 0%, #38ef7d 100%)"
                link="/admin/dashboard/testrequests"
              />
              <DashboardCard
                title="Health Certificates"
                value={healthCertificates.length}
                icon="📄"
                gradient="linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)"
                link="/admin/dashboard/health-certificates"
              />
              <DashboardCard
                title="Physical Exams"
                value={physicalExams.length}
                icon="🩺"
                gradient="linear-gradient(135deg, #ec4899 0%, #db2777 100%)"
                link="/admin/dashboard/physical-examinations"
              />
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(500px, 1fr))',
                gap: '24px',
                marginBottom: '24px',
              }}
            >
              <DashboardTableCard
                title="Recent Waiting List"
                viewHref="/admin/dashboard/labtest"
                headers={['ID', 'Patient', 'Tests', 'Date']}
                emptyText="No waiting list entries found."
                rows={recentWaiting.map((row) => [
                  <span key="id" style={{ color: '#3b82f6', fontWeight: 500 }}>#{row.id}</span>,
                  <div key="patient">
                    <div style={{ fontWeight: 500, color: '#334155' }}>{row.patient_name || 'N/A'}</div>
                    <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>{row.patient_mobile || 'N/A'}</div>
                  </div>,
                  <span key="tests" style={{ color: '#475569' }}>{row.tests || `${row.test_count || 0} test(s)`}</span>,
                  <span key="date" style={{ fontSize: '0.85rem', whiteSpace: 'nowrap' }}>
                    {row.creation_timestamp ? formatDate(row.creation_timestamp) : 'N/A'}
                  </span>,
                ])}
              />

              <DashboardTableCard
                title="Recent Test Reports"
                viewHref="/admin/dashboard/manageothertest"
                headers={['Report UID', 'Patient', 'Test', 'Date']}
                emptyText="No test reports found."
                rows={recentReports.map((row) => [
                  <span key="uid" style={{ color: '#10b981', fontWeight: 500 }}>{row.uid || `#${row.id}`}</span>,
                  <span key="patient" style={{ color: '#334155', fontWeight: 500 }}>{row.patient_name || 'N/A'}</span>,
                  <div key="test">
                    <div style={{ fontWeight: 500, color: '#334155' }}>{row.lab_test_name || 'N/A'}</div>
                    <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>{row.final_result || row.report_status || '—'}</div>
                  </div>,
                  <span key="date" style={{ fontSize: '0.85rem', whiteSpace: 'nowrap' }}>
                    {row.creation_timestamp ? formatDate(row.creation_timestamp) : 'N/A'}
                  </span>,
                ])}
              />

              <DashboardTableCard
                title="Recent Manage Requests"
                viewHref="/admin/dashboard/testrequests"
                headers={['Request ID', 'Title', 'Corporate Client', 'Date']}
                emptyText="No manage requests found."
                rows={recentRequests.map((row) => [
                  <span key="id" style={{ color: '#3b82f6', fontWeight: 500 }}>#{row.id}</span>,
                  <span key="title" style={{ color: '#334155', fontWeight: 500 }}>{row.title || 'N/A'}</span>,
                  <span key="corp">{row.corporateClientCompany || 'N/A'}</span>,
                  <span key="date" style={{ fontSize: '0.85rem', whiteSpace: 'nowrap' }}>
                    {row.creation_timestamp ? formatDate(row.creation_timestamp) : 'N/A'}
                  </span>,
                ])}
              />

              <DashboardTableCard
                title="Recently Added Patients"
                viewHref="/admin/dashboard/patientList"
                headers={['UID', 'Name', 'Mobile', 'Date']}
                emptyText="No patients found."
                rows={recentPatients.map((row) => [
                  <span key="uid" style={{ color: '#10b981', fontWeight: 500 }}>{row.uid || `#${row.id}`}</span>,
                  <div key="name">
                    <div style={{ fontWeight: 500, color: '#334155' }}>{row.name || 'N/A'}</div>
                    <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>{row.email || '—'}</div>
                  </div>,
                  <span key="mobile">{row.mobile || 'N/A'}</span>,
                  <span key="date" style={{ fontSize: '0.85rem', whiteSpace: 'nowrap' }}>
                    {row.creation_timestamp ? formatDate(row.creation_timestamp) : 'N/A'}
                  </span>,
                ])}
              />
            </div>

            <div className="card" style={cardStyle}>
              <div className="card-header" style={cardHeaderStyle}>
                <h3 className="card-title" style={cardTitleStyle}>🚀 Quick Actions</h3>
              </div>
              <div className="card-body" style={{ padding: '24px', display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                <Link href="/admin/dashboard/patient" style={quickActionStyle('#e0f2fe', '#0284c7')}>
                  <span style={{ fontSize: '1.5rem', marginBottom: '8px' }}>➕</span>
                  <span style={{ fontWeight: 600 }}>Add Patient</span>
                </Link>
                <Link href="/admin/dashboard/labtest" style={quickActionStyle('#ede9fe', '#7c3aed')}>
                  <span style={{ fontSize: '1.5rem', marginBottom: '8px' }}>📋</span>
                  <span style={{ fontWeight: 600 }}>Waiting List</span>
                </Link>
                <Link href="/admin/dashboard/manageothertest" style={quickActionStyle('#fee2e2', '#dc2626')}>
                  <span style={{ fontSize: '1.5rem', marginBottom: '8px' }}>🧪</span>
                  <span style={{ fontWeight: 600 }}>Test Reports</span>
                </Link>
                <Link href="/admin/dashboard/testrequests" style={quickActionStyle('#dcfce7', '#16a34a')}>
                  <span style={{ fontSize: '1.5rem', marginBottom: '8px' }}>📨</span>
                  <span style={{ fontWeight: 600 }}>Manage Requests</span>
                </Link>
                <Link href="/admin/dashboard/health-certificates" style={quickActionStyle('#dbeafe', '#2563eb')}>
                  <span style={{ fontSize: '1.5rem', marginBottom: '8px' }}>📄</span>
                  <span style={{ fontWeight: 600 }}>Health Certificates</span>
                </Link>
                <Link href="/admin/dashboard/physical-examinations" style={quickActionStyle('#fce7f3', '#db2777')}>
                  <span style={{ fontSize: '1.5rem', marginBottom: '8px' }}>🩺</span>
                  <span style={{ fontWeight: 600 }}>Physical Examinations</span>
                </Link>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

function DashboardCard({
  title,
  value,
  icon,
  gradient,
  link,
}: {
  title: string;
  value: string | number;
  icon: string;
  gradient: string;
  link?: string;
}) {
  const CardWrapper = link ? Link : 'div';
  const wrapperProps = link ? { href: link, style: { textDecoration: 'none' } } : {};

  return (
    <CardWrapper {...wrapperProps}>
      <div
        style={{
          background: '#fff',
          borderRadius: '16px',
          padding: '24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          boxShadow: '0 4px 20px rgba(0,0,0,0.03)',
          transition: 'transform 0.3s ease, box-shadow 0.3s ease',
          cursor: link ? 'pointer' : 'default',
          position: 'relative',
          overflow: 'hidden',
          height: '100%',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'translateY(-5px)';
          e.currentTarget.style.boxShadow = '0 10px 25px rgba(0,0,0,0.08)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'translateY(0)';
          e.currentTarget.style.boxShadow = '0 4px 20px rgba(0,0,0,0.03)';
        }}
      >
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '4px',
            background: gradient,
          }}
        />
        <div>
          <div
            style={{
              color: '#64748b',
              fontSize: '0.9rem',
              fontWeight: 600,
              marginBottom: '8px',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
            }}
          >
            {title}
          </div>
          <div style={{ color: '#0f172a', fontSize: '2rem', fontWeight: 800, lineHeight: 1 }}>{value}</div>
        </div>
        <div
          style={{
            width: '56px',
            height: '56px',
            borderRadius: '12px',
            background: gradient,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '1.8rem',
            color: '#fff',
            boxShadow: '0 4px 15px rgba(0,0,0,0.1)',
          }}
        >
          {icon}
        </div>
      </div>
    </CardWrapper>
  );
}

function DashboardTableCard({
  title,
  viewHref,
  headers,
  rows,
  emptyText,
}: {
  title: string;
  viewHref: string;
  headers: string[];
  rows: ReactNode[][];
  emptyText: string;
}) {
  return (
    <div className="card" style={cardStyle}>
      <div className="card-header" style={cardHeaderStyle}>
        <h3 className="card-title" style={cardTitleStyle}>{title}</h3>
        <Link href={viewHref} style={linkStyle}>
          View All →
        </Link>
      </div>
      <div className="card-body" style={{ padding: 0 }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={tableStyle}>
            <thead>
              <tr style={tableHeaderStyle}>
                {headers.map((header) => (
                  <th key={header} style={thStyle}>{header}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={headers.length} style={emptyTdStyle}>{emptyText}</td>
                </tr>
              ) : (
                rows.map((cells, rowIndex) => (
                  <tr key={rowIndex} style={trStyle}>
                    {cells.map((cell, cellIndex) => (
                      <td key={cellIndex} style={tdStyle}>{cell}</td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

const cardStyle: React.CSSProperties = {
  borderRadius: '12px',
  border: 'none',
  boxShadow: '0 10px 30px rgba(0,0,0,0.05)',
  backgroundColor: '#fff',
};

const cardHeaderStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  borderBottom: '1px solid #edf2f9',
  borderRadius: '12px 12px 0 0',
  padding: '20px',
};

const cardTitleStyle: React.CSSProperties = {
  margin: 0,
  fontSize: '1.1rem',
  color: '#1e293b',
};

const linkStyle: React.CSSProperties = {
  fontSize: '0.85rem',
  color: '#3b82f6',
  textDecoration: 'none',
  fontWeight: 600,
};

const tableStyle: React.CSSProperties = {
  width: '100%',
  borderCollapse: 'collapse',
  fontSize: '0.9rem',
};

const tableHeaderStyle: React.CSSProperties = {
  backgroundColor: '#f8fafc',
  color: '#64748b',
  textAlign: 'left',
};

const thStyle: React.CSSProperties = {
  padding: '12px 20px',
  fontWeight: 600,
};

const tdStyle: React.CSSProperties = {
  padding: '16px 20px',
  color: '#64748b',
};

const trStyle: React.CSSProperties = {
  borderBottom: '1px solid #edf2f9',
  transition: 'background-color 0.2s',
};

const emptyTdStyle: React.CSSProperties = {
  padding: '20px',
  textAlign: 'center',
  color: '#94a3b8',
};

const quickActionStyle = (bg: string, color: string): React.CSSProperties => ({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '24px',
  backgroundColor: bg,
  color,
  borderRadius: '12px',
  textDecoration: 'none',
  minWidth: '180px',
  flex: '1 1 auto',
  transition: 'transform 0.2s',
  border: `1px solid ${color}33`,
});
