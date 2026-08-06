'use client';
import { useEffect, useState, type ReactNode } from 'react';
import Link from 'next/link';
import {
  MdDescription,
  MdHealthAndSafety,
  MdHourglassEmpty,
  MdMedicalServices,
  MdPeople,
  MdPendingActions,
  MdCorporateFare,
  MdAssignment,
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

interface PaginatedEnvelope<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

function isPagedResult<T>(v: unknown): v is PaginatedEnvelope<T> {
  return !!v && typeof v === 'object' && Array.isArray((v as PaginatedEnvelope<T>).items) && typeof (v as PaginatedEnvelope<T>).total === 'number';
}

export default function AdminDashboardPage() {
  const [waitingCount, setWaitingCount] = useState(0);
  const [pendingCount, setPendingCount] = useState(0);
  const [requestCount, setRequestCount] = useState(0);
  const [todaysPatients, setTodaysPatients] = useState(0);
  const [todaysCompletedTests, setTodaysCompletedTests] = useState(0);
  const [isCorporateEnabled, setIsCorporateEnabled] = useState(true);

  const [recentPatients, setRecentPatients] = useState<PatientRow[]>([]);
  const [recentWaiting, setRecentWaiting] = useState<WaitingListRow[]>([]);
  const [recentReports, setRecentReports] = useState<TestReportRow[]>([]);
  const [recentRequests, setRecentRequests] = useState<TestRequestRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch counts (limit=1 just to get the total field) and recent 5 rows in parallel
        const [
          patientData,
          waitingData,
          pendingData,
          reportData,
          requestData,
          badgesRes,
        ] = await Promise.all([
          apiFetch<PaginatedEnvelope<PatientRow> | PatientRow[]>('/api/Patient?page=1&limit=5', { tokenKey: 'admin_token' }).catch(() => null),
          apiFetch<PaginatedEnvelope<WaitingListRow> | WaitingListRow[]>('/api/WaitingList?page=1&limit=5', { tokenKey: 'admin_token' }).catch(() => null),
          apiFetch<PaginatedEnvelope<WaitingListRow> | WaitingListRow[]>('/api/WaitingList?page=1&limit=1&pending_only=true', { tokenKey: 'admin_token' }).catch(() => null),
          apiFetch<PaginatedEnvelope<TestReportRow> | TestReportRow[]>('/api/LabTestCategoryReport?page=1&limit=5', { tokenKey: 'admin_token' }).catch(() => null),
          apiFetch<PaginatedEnvelope<TestRequestRow> | TestRequestRow[]>('/api/TestRequest?page=1&limit=5', { tokenKey: 'admin_token' }).catch(() => null),
          apiFetch<{ isCorporateEnabled?: boolean, todaysPatients?: number, todaysCompletedTests?: number }>('/api/TestRequest/sidebarBadgeCounts', { tokenKey: 'admin_token' }).catch(() => null),
        ]);

        if (isPagedResult<PatientRow>(patientData)) {
          setRecentPatients(patientData.items);
        } else if (Array.isArray(patientData)) {
          setRecentPatients(patientData.slice(0, 5));
        }

        if (isPagedResult<WaitingListRow>(waitingData)) {
          setWaitingCount(waitingData.total);
          setRecentWaiting(waitingData.items);
        } else if (Array.isArray(waitingData)) {
          setWaitingCount(waitingData.length);
          setRecentWaiting(waitingData.slice(0, 5));
        }

        if (isPagedResult<WaitingListRow>(pendingData)) {
          setPendingCount(pendingData.total);
        } else if (Array.isArray(pendingData)) {
          setPendingCount(pendingData.length);
        }

        if (isPagedResult<TestReportRow>(reportData)) {
          setRecentReports(reportData.items);
        } else if (Array.isArray(reportData)) {
          setRecentReports(reportData.slice(0, 5));
        }

        if (isPagedResult<TestRequestRow>(requestData)) {
          setRequestCount(requestData.total);
          setRecentRequests(requestData.items);
        } else if (Array.isArray(requestData)) {
          setRequestCount(requestData.length);
          setRecentRequests(requestData.slice(0, 5));
        }

        if (badgesRes && typeof badgesRes === 'object') {
          if ('isCorporateEnabled' in badgesRes && badgesRes.isCorporateEnabled === false) {
            setIsCorporateEnabled(false);
          }
          setTodaysPatients(badgesRes.todaysPatients || 0);
          setTodaysCompletedTests(badgesRes.todaysCompletedTests || 0);
        }
      } finally {
        setLoading(false);
      }
    };

    void fetchData();
  }, []);



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
                title="Waiting List"
                value={pendingCount}
                icon={<MdPendingActions size={28} aria-hidden />}
                gradient="linear-gradient(135deg, #0072ff 0%, #00c6ff 100%)"
                link="/admin/dashboard/labtest"
              />
              {isCorporateEnabled && (
                <DashboardCard
                  title="Corporate Requests"
                  value={requestCount}
                  icon={<MdCorporateFare size={28} aria-hidden />}
                  gradient="linear-gradient(135deg, #11998e 0%, #38ef7d 100%)"
                  link="/admin/dashboard/testrequests"
                />
              )}
              <DashboardCard
                title="Patients (Today)"
                value={todaysPatients}
                icon={<MdPeople size={28} aria-hidden />}
                gradient="linear-gradient(135deg, #8b5cf6 0%, #c4b5fd 100%)"
                link="/admin/dashboard/patientList"
              />
              <DashboardCard
                title="Tests Completed (Today)"
                value={todaysCompletedTests}
                icon={<MdAssignment size={28} aria-hidden />}
                gradient="linear-gradient(135deg, #f59e0b 0%, #fcd34d 100%)"
                link="/admin/dashboard/manageothertest"
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
