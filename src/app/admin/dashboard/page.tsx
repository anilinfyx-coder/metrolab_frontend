'use client';
import { useEffect, useState, useMemo, type ReactNode } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
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
import { formatDate, formatDateTime } from '../../utils/dateFormat';
import { apiFetch, handleApiResponse, getToken, API_BASE } from '../../../lib/api';
import { useConfirm } from '../../components/ConfirmModal';
import ListingTable, { ActionIcons, ListingColumn } from '../../components/ListingTable';

interface WaitingListRow {
  id: number;
  patient_id?: number;
  patient_name?: string;
  patient_mobile?: string;
  patient_uid?: string;
  reason_for_test?: string;
  requisition_no?: string;
  creation_timestamp?: string;
  status?: boolean;
  tests?: string;
  test_count?: number;
}

const waitingColumns: ListingColumn<WaitingListRow>[] = [
  {
    key: 'creation_timestamp',
    label: 'Date Time',
    sortable: false,
    filterable: false,
    width: 160,
    getValue: (row) => formatDateTime(row.creation_timestamp),
  },
  {
    key: 'patient_uid',
    label: 'Patient/Donor UID',
    sortable: true,
    filterable: true,
    width: 140,
    getValue: (row) => row.patient_uid || '',
  },
  {
    key: 'patient_name',
    label: 'Name',
    sortable: true,
    filterable: true,
    width: 130,
    getValue: (row) => row.patient_name || (row.patient_id ? `Patient #${row.patient_id}` : ''),
  },
  {
    key: 'tests',
    label: 'Tests',
    sortable: false,
    filterable: false,
    width: '48%',
    getValue: (row) => {
      const t = (row.tests || '').trim();
      if (!t) return '';
      return t.endsWith('.') ? t : `${t}.`;
    },
  },
  {
    key: 'test_count',
    label: 'Test Count',
    sortable: false,
    filterable: false,
    width: 100,
    align: 'center',
    getValue: (row) => row.test_count ?? 0,
  },
];

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
  creationTimestamp?: string;
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
  const router = useRouter();
  const confirmDialog = useConfirm();

  const [waitingCount, setWaitingCount] = useState(0);
  const [pendingCount, setPendingCount] = useState(0);
  const [requestCount, setRequestCount] = useState(0);
  const [todaysPatients, setTodaysPatients] = useState(0);
  const [todaysCompletedTests, setTodaysCompletedTests] = useState(0);
  const [isCorporateEnabled, setIsCorporateEnabled] = useState(true);

  const [recentWaiting, setRecentWaiting] = useState<WaitingListRow[]>([]);
  const [recentReports, setRecentReports] = useState<TestReportRow[]>([]);
  const [recentRequests, setRecentRequests] = useState<TestRequestRow[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchWaitingList = async () => {
    try {
      const waitingData = await apiFetch<PaginatedEnvelope<WaitingListRow> | WaitingListRow[]>(
        '/api/WaitingList?page=1&limit=10&pending_only=true',
        { tokenKey: 'admin_token' }
      );
      if (isPagedResult<WaitingListRow>(waitingData)) {
        setWaitingCount(waitingData.total);
        setPendingCount(waitingData.total);
        setRecentWaiting(waitingData.items);
      } else if (Array.isArray(waitingData)) {
        setWaitingCount(waitingData.length);
        setPendingCount(waitingData.length);
        setRecentWaiting(waitingData.slice(0, 10));
      }
    } catch {
      setRecentWaiting([]);
    }
  };

  const removeWaiting = async (id: number) => {
    const ok = await confirmDialog({
      title: 'You are trying to remove Waiting List entry, Please confirm',
      message: 'This cannot be restored once deleted.',
      cancelText: 'NO, WAIT!',
      confirmText: 'CONFIRM DELETION',
    });
    if (!ok) return;
    try {
      const res = await fetch(`${API_BASE}/api/WaitingList/${id}`, {
        method: 'DELETE',
        headers: { token: getToken('admin_token') },
      });
      await handleApiResponse(res, {
        successMessage: 'Waiting list entry deleted successfully.',
        errorFallback: 'Failed to delete waiting list entry.',
      });
      fetchWaitingList();
    } catch {
      // Error toast handled by handleApiResponse
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [
          waitingData,
          reportData,
          requestData,
          badgesRes,
        ] = await Promise.all([
          apiFetch<PaginatedEnvelope<WaitingListRow> | WaitingListRow[]>('/api/WaitingList?page=1&limit=10&pending_only=true', { tokenKey: 'admin_token' }).catch(() => null),
          apiFetch<PaginatedEnvelope<TestReportRow> | TestReportRow[]>('/api/LabTestCategoryReport?page=1&limit=10', { tokenKey: 'admin_token' }).catch(() => null),
          apiFetch<PaginatedEnvelope<TestRequestRow> | TestRequestRow[]>('/api/TestRequest?page=1&limit=10', { tokenKey: 'admin_token' }).catch(() => null),
          apiFetch<{ isCorporateEnabled?: boolean, todaysPatients?: number, todaysCompletedTests?: number }>('/api/TestRequest/sidebarBadgeCounts', { tokenKey: 'admin_token' }).catch(() => null),
        ]);

        if (isPagedResult<WaitingListRow>(waitingData)) {
          setWaitingCount(waitingData.total);
          setPendingCount(waitingData.total);
          setRecentWaiting(waitingData.items);
        } else if (Array.isArray(waitingData)) {
          setWaitingCount(waitingData.length);
          setPendingCount(waitingData.length);
          setRecentWaiting(waitingData.slice(0, 10));
        }

        if (isPagedResult<TestReportRow>(reportData)) {
          setRecentReports(reportData.items);
        } else if (Array.isArray(reportData)) {
          setRecentReports(reportData.slice(0, 10));
        }

        if (isPagedResult<TestRequestRow>(requestData)) {
          setRequestCount(requestData.total);
          setRecentRequests(requestData.items);
        } else if (Array.isArray(requestData)) {
          setRequestCount(requestData.length);
          setRecentRequests(requestData.slice(0, 10));
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

  const sortedWaiting = useMemo(() => {
    return [...recentWaiting].sort((a, b) => {
      const timeA = a.creation_timestamp ? new Date(a.creation_timestamp).getTime() : 0;
      const timeB = b.creation_timestamp ? new Date(b.creation_timestamp).getTime() : 0;
      return timeB - timeA || b.id - a.id;
    });
  }, [recentWaiting]);

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

            <div className="admin-dashboard-tables-stacked">
              <ListingTable
                className="waiting-list-table"
                title="Recent Waiting List"
                headerActions={
                  <Link href="/admin/dashboard/labtest" className="admin-dashboard-view-all">
                    View All →
                  </Link>
                }
                columns={waitingColumns}
                rows={sortedWaiting}
                defaultSortKey={null}
                defaultPageSize={10}
                emptyText="Waiting list is empty. Add patients from Patient Demographic."
                actionsLabel="Actions"
                actionsWidth={100}
                rowActions={(e) => (
                  <ActionIcons
                    deleteFirst
                    editVariant="outline"
                    editTitle="Edit / Apply Test"
                    onDelete={() => removeWaiting(e.id)}
                    onEdit={() => router.push(`/admin/dashboard/labtest/${e.id}`)}
                  />
                )}
              />

              <DashboardTableCard
                title="Recent Test Reports"
                viewHref="/admin/dashboard/manageothertest"
                headers={['Report UID', 'Patient', 'Test', 'Status / Result', 'Date']}
                emptyText="No test reports found."
                rows={recentReports.map((row) => [
                  <span key="uid" style={{ color: '#10b981', fontWeight: 500 }}>{row.uid || `#${row.id}`}</span>,
                  <span key="patient" style={{ color: '#334155', fontWeight: 500 }}>{row.patient_name || 'N/A'}</span>,
                  <span key="test" style={{ color: '#334155' }}>{row.lab_test_name || 'N/A'}</span>,
                  <span key="status" style={{ fontSize: '0.85rem', color: '#64748b' }}>{row.final_result || row.report_status || '—'}</span>,
                  <span key="date" style={{ fontSize: '0.85rem', whiteSpace: 'nowrap' }}>
                    {row.creation_timestamp ? formatDateTime(row.creation_timestamp) : 'N/A'}
                  </span>,
                ])}
              />

              {isCorporateEnabled && (
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
                      {row.creation_timestamp
                        ? formatDateTime(row.creation_timestamp)
                        : row.creationTimestamp
                        ? formatDateTime(row.creationTimestamp)
                        : 'N/A'}
                    </span>,
                  ])}
                />
              )}
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
