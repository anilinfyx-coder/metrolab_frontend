'use client';
import { useEffect, useState, type ReactNode } from 'react';
import Link from 'next/link';
import {
  MdAdd,
  MdAssignment,
  MdDescription,
  MdHealthAndSafety,
  MdHourglassEmpty,
  MdLocalHospital,
  MdMail,
  MdMedicalServices,
  MdPeople,
  MdScience,
} from 'react-icons/md';
import TopNav from '../../components/TopNav';
import PageLoader from '../../components/PageLoader';
import { formatDate } from '../../utils/dateFormat';
import { apiFetch } from '../../../lib/api';

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

export default function AdminDashboardPage() {
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
    <div className="page-content" style={{ paddingTop: 0 }}>
      <TopNav title="Dashboard" />

      <div className="page-body admin-dashboard-body">
        {loading ? (
          <PageLoader message="Loading dashboard..." size="lg" />
        ) : (
          <div className="admin-dashboard-inner">
            <div className="admin-dashboard-cards">
              <DashboardCard
                title="Total Patients"
                value={patients.length}
                icon={<MdPeople size={28} aria-hidden />}
                gradient="linear-gradient(135deg, #f12711 0%, #f5af19 100%)"
                link="/admin/dashboard/patientList"
              />
              <DashboardCard
                title="Waiting List"
                value={waitingList.length}
                icon={<MdAssignment size={28} aria-hidden />}
                gradient="linear-gradient(135deg, #0072ff 0%, #00c6ff 100%)"
                link="/admin/dashboard/labtest"
              />
              <DashboardCard
                title="Pending Tests"
                value={pendingWaiting}
                icon={<MdHourglassEmpty size={28} aria-hidden />}
                gradient="linear-gradient(135deg, #8E2DE2 0%, #4A00E0 100%)"
                link="/admin/dashboard/labtest"
              />
              <DashboardCard
                title="Test Reports"
                value={testReports.length}
                icon={<MdDescription size={28} aria-hidden />}
                gradient="linear-gradient(135deg, #FF416C 0%, #FF4B2B 100%)"
                link="/admin/dashboard/manageothertest"
              />
              <DashboardCard
                title="Corporate Requests"
                value={testRequests.length}
                icon={<MdScience size={28} aria-hidden />}
                gradient="linear-gradient(135deg, #11998e 0%, #38ef7d 100%)"
                link="/admin/dashboard/testrequests"
              />
              <DashboardCard
                title="Health Certificates"
                value={healthCertificates.length}
                icon={<MdHealthAndSafety size={28} aria-hidden />}
                gradient="linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)"
                link="/admin/dashboard/health-certificates"
              />
              <DashboardCard
                title="Physical Exams"
                value={physicalExams.length}
                icon={<MdMedicalServices size={28} aria-hidden />}
                gradient="linear-gradient(135deg, #ec4899 0%, #db2777 100%)"
                link="/admin/dashboard/physical-examinations"
              />
            </div>

            <div className="admin-dashboard-tables">
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
                title="Recent Corporate Requests"
                viewHref="/admin/dashboard/testrequests"
                headers={['Request ID', 'Title', 'Corporate Client', 'Date']}
                emptyText="No corporate requests found."
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

          </div>
        )}
      </div>
    </div>
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
  icon: ReactNode;
  gradient: string;
  link?: string;
}) {
  const cardContent = (
    <div className="admin-stat-card">
      <div className="admin-stat-card-bar" style={{ background: gradient }} />
      <div>
        <div className="admin-stat-card-title">{title}</div>
        <div className="admin-stat-card-value">{value}</div>
      </div>
      <div className="admin-stat-card-icon" style={{ background: gradient }}>
        {icon}
      </div>
    </div>
  );

  if (link) {
    return (
      <Link href={link} className="admin-stat-card-link">
        {cardContent}
      </Link>
    );
  }

  return cardContent;
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
    <div className="card admin-dashboard-table-card">
      <div className="card-header admin-dashboard-table-header">
        <h3 className="card-title">{title}</h3>
        <Link href={viewHref} className="admin-dashboard-view-all">
          View All →
        </Link>
      </div>
      <div className="card-body" style={{ padding: 0 }}>
        <div style={{ overflowX: 'auto' }}>
          <table className="admin-dashboard-table">
            <thead>
              <tr>
                {headers.map((header) => (
                  <th key={header}>{header}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={headers.length} className="admin-dashboard-empty">{emptyText}</td>
                </tr>
              ) : (
                rows.map((cells, rowIndex) => (
                  <tr key={rowIndex}>
                    {cells.map((cell, cellIndex) => (
                      <td key={cellIndex}>{cell}</td>
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
