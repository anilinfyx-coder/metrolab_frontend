'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import TopNav from '../../../components/TopNav';
import ListingTable, { ActionIcons, ListingColumn } from '../../../components/ListingTable';
import { useConfirm } from '../../../components/ConfirmModal';
import { formatDateTime } from '../../../utils/dateFormat';
import { apiFetch, handleApiResponse, toastApiError, toastApiSuccess, getToken, API_BASE } from '../../../../lib/api';

interface TestReport {
  id: number;
  patient_id: number;
  patient_name?: string;
  patient_email?: string;
  patient_uid?: string;
  lab_test_id: number;
  lab_test_name?: string;
  final_result: string;
  report_status: string;
  creation_timestamp: string;
  collected_timestamp: string;
  reason_for_test: string;
  uid: string;
  status: boolean;
}

export default function TestsReportsPage() {
  const router = useRouter();
  const confirmDialog = useConfirm();
  const [reports, setReports] = useState<TestReport[]>([]);
  const [labTests, setLabTests] = useState<{ id: number; name: string }[]>([]);
  const [selectedTestId, setSelectedTestId] = useState('');
  const [loading, setLoading] = useState(false);
  const [testsLoading, setTestsLoading] = useState(true);
  const [emailing, setEmailing] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setTestsLoading(true);

    (async () => {
      try {
        const list = await apiFetch<{ id: number; name: string }[]>('/api/LabTests', {
          tokenKey: 'admin_token',
          errorFallback: 'Failed to load lab tests',
        });
        if (!cancelled) setLabTests(list || []);
      } catch (err: unknown) {
        if (cancelled) return;
        setLabTests([]);
        toastApiError(
          err,
          `Cannot reach API at ${API_BASE}. Make sure the backend is running.`,
        );
      } finally {
        if (!cancelled) setTestsLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const loadReports = async (labTestId: string) => {
    if (!labTestId) {
      setReports([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const list = await apiFetch<TestReport[]>(
        `/api/LabTestCategoryReport?lab_test_id=${encodeURIComponent(labTestId)}`,
        {
          tokenKey: 'admin_token',
          errorFallback: 'Failed to load test reports.',
        },
      );
      setReports(
        (list || []).map((r: TestReport) => ({
          ...r,
          patient_name: r.patient_name || (r.patient_id ? `Patient #${r.patient_id}` : '—'),
        })),
      );
    } catch {
      setReports([]);
    } finally {
      setLoading(false);
    }
  };

  const onTestChange = (value: string) => {
    setSelectedTestId(value);
    loadReports(value);
  };

  const toggleLock = async (report: TestReport) => {
    const newStatus = !report.status;

    if (newStatus) {
      const ok = await confirmDialog({
        title: 'Lock this report?',
        message:
          'Once locked, this report cannot be edited. Only the email action will remain available. Continue?',
        cancelText: 'Cancel',
        confirmText: 'Lock',
      });
      if (!ok) return;
    }

    try {
      const res = await fetch(`${API_BASE}/api/LabTestCategoryReport/changeLabTestCategoryReportStatus`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', token: getToken('admin_token') },
        body: JSON.stringify({ id: report.id, status: newStatus }),
      });
      await handleApiResponse(res, { errorFallback: 'Error changing lock status' });
      loadReports(selectedTestId);
    } catch {
      // Error toast handled by handleApiResponse
    }
  };

  const downloadReport = async (report: TestReport) => {
    try {
      const blob = await apiFetch<Blob>('/api/LabTestCategoryReport/downloadLabTestCategoryReport', {
        method: 'POST',
        tokenKey: 'admin_token',
        body: JSON.stringify({ id: report.id }),
        errorFallback: 'Download failed',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${report.uid || `Report-${report.id}`}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      // Error toast handled by apiFetch
    }
  };

  const emailReport = async (report: TestReport) => {
    if (emailing) return;

    const email = (report.patient_email || '').trim();
    if (!email) {
      toastApiError('No email address found for this patient.');
      return;
    }

    const ok = await confirmDialog({
      title: 'Send report by email?',
      message: `Email the password-protected PDF report to ${email}? The patient will need their birthdate 4 digits (MMDD) to open the PDF.`,
      cancelText: 'Cancel',
      confirmText: 'Send Email',
    });
    if (!ok) return;

    setEmailing(true);
    try {
      const res = await fetch(`${API_BASE}/api/LabTestCategoryReport/emailLabTestCategoryReport`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', token: getToken('admin_token') },
        body: JSON.stringify({ id: report.id }),
      });
      const data = await handleApiResponse<{ email?: string }>(res, {
        errorFallback: 'Failed to send email',
      });
      toastApiSuccess(`Report emailed successfully to ${data?.email || email}.`);
    } catch {
      // Error toast handled by handleApiResponse
    } finally {
      setEmailing(false);
      if (typeof window !== 'undefined') {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    }
  };

  const columns: ListingColumn<TestReport>[] = [
    {
      key: 'creation_timestamp',
      label: 'Creation Timestamp',
      sortable: true,
      filterable: true,
      width: '26%',
      getValue: (row) => formatDateTime(row.creation_timestamp),
      render: (row) => formatDateTime(row.creation_timestamp),
    },
    {
      key: 'patient_name',
      label: 'Patient/Donor Name',
      sortable: true,
      filterable: true,
      width: '30%',
      getValue: (row) => row.patient_name || '',
      render: (row) => (
        <span className="report-patient-name">{row.patient_name || '—'}</span>
      ),
    },
    {
      key: 'uid',
      label: 'UID',
      sortable: true,
      filterable: true,
      width: '18%',
      getValue: (row) => row.uid || row.patient_uid || '',
      render: (row) => row.uid || row.patient_uid || '—',
    },
  ];

  return (
    <div className="page-content" style={{ paddingTop: 0 }}>
      <TopNav title="Manage Test Reports" />

      {emailing && (
        <div className="test-reports-email-overlay" role="status" aria-live="polite" aria-busy="true">
          <div className="test-reports-email-overlay-card">
            <span className="test-reports-email-spinner" aria-hidden />
            <div className="test-reports-email-overlay-title">Sending email...</div>
            <div className="test-reports-email-overlay-text">
              Please wait while we generate and send the report PDF.
            </div>
          </div>
        </div>
      )}

      <div style={{ padding: '1.5rem 1.75rem' }} className={emailing ? 'test-reports-page-busy' : undefined}>
        <ListingTable
          className="test-reports-table"
          title="List of Test Reports"
          columns={columns}
          rows={selectedTestId ? reports : []}
          loading={loading || testsLoading}
          emptyText={
            selectedTestId
              ? 'No test reports found for this test.'
              : ''
          }
          actionsLabel="Actions"
          actionsWidth={170}
          defaultPageSize={25}
          headerActions={
            <select
              className="test-report-filter-select"
              value={selectedTestId}
              onChange={e => onTestChange(e.target.value)}
              aria-label="Select lab test"
              disabled={emailing}
            >
              <option value="">Select Test</option>
              {labTests.map(t => (
                <option key={t.id} value={String(t.id)}>{t.name}</option>
              ))}
            </select>
          }
          rowActions={(r) =>
            r.status ? (
              <ActionIcons
                onMail={() => emailReport(r)}
                mailTitle={`Email report ${r.uid || r.id}`}
              />
            ) : (
              <ActionIcons
                onDownload={() => downloadReport(r)}
                onEdit={() => router.push(`/admin/dashboard/manageothertest/${r.id}`)}
                editTitle="Edit"
                onLock={() => toggleLock(r)}
                locked={false}
                lockTitle="Lock"
                onMail={() => emailReport(r)}
              />
            )
          }
        />
      </div>
    </div>
  );
}
