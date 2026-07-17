'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import TopNav from '../../../components/TopNav';
import ListingTable, { ActionIcons, ListingColumn } from '../../../components/ListingTable';
import { useConfirm } from '../../../components/ConfirmModal';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
function getToken() { return typeof window !== 'undefined' ? localStorage.getItem('admin_token') || '' : ''; }

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

function formatDateTime(value?: string) {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(d.getDate())}-${pad(d.getMonth() + 1)}-${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

export default function TestsReportsPage() {
  const router = useRouter();
  const confirmDialog = useConfirm();
  const [reports, setReports] = useState<TestReport[]>([]);
  const [labTests, setLabTests] = useState<{ id: number; name: string }[]>([]);
  const [selectedTestId, setSelectedTestId] = useState('');
  const [loading, setLoading] = useState(false);
  const [testsLoading, setTestsLoading] = useState(true);
  const [drugTestAccept, setDrugTestAccept] = useState(false);
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    let cancelled = false;
    setTestsLoading(true);
    setMsg(null);

    fetch(`${API}/api/LabTests`, { headers: { token: getToken() } })
      .then(async (r) => {
        if (!r.ok) throw new Error(`Lab tests request failed (${r.status})`);
        return r.json();
      })
      .then((ltD) => {
        if (cancelled) return;
        if (ltD.response_code === '200') {
          setLabTests(ltD.obj || []);
        } else {
          setLabTests([]);
          setMsg({ type: 'error', text: String(ltD.obj || 'Failed to load lab tests') });
        }
      })
      .catch((err) => {
        if (cancelled) return;
        setLabTests([]);
        setMsg({
          type: 'error',
          text: `Cannot reach API at ${API}. Make sure the backend is running. (${err instanceof Error ? err.message : 'Failed to fetch'})`,
        });
      })
      .finally(() => {
        if (!cancelled) setTestsLoading(false);
      });

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
      const res = await fetch(
        `${API}/api/LabTestCategoryReport?lab_test_id=${encodeURIComponent(labTestId)}`,
        { headers: { token: getToken() } }
      );
      const d = await res.json();
      if (d.response_code === '200') {
        setReports(
          (d.obj || []).map((r: TestReport) => ({
            ...r,
            patient_name: r.patient_name || (r.patient_id ? `Patient #${r.patient_id}` : '—'),
          }))
        );
      } else {
        setReports([]);
      }
    } catch {
      setReports([]);
    } finally {
      setLoading(false);
    }
  };

  const onTestChange = (value: string) => {
    setSelectedTestId(value);
    setMsg(null);
    loadReports(value);
  };

  const toggleLock = async (report: TestReport) => {
    const newStatus = !report.status;

    if (newStatus) {
      const ok = await confirmDialog({
        title: 'Lock this report?',
        message:
          'Once locked, this report cannot be edited and its action buttons will be hidden. Continue?',
        cancelText: 'Cancel',
        confirmText: 'Lock',
      });
      if (!ok) return;
    }

    const res = await fetch(`${API}/api/LabTestCategoryReport/changeLabTestCategoryReportStatus`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', token: getToken() },
      body: JSON.stringify({ id: report.id, status: newStatus }),
    });
    const data = await res.json();
    if (data.response_code === '200') {
      loadReports(selectedTestId);
    } else {
      alert('Error changing lock status: ' + data.obj);
    }
  };

  const downloadReport = async (report: TestReport) => {
    try {
      const res = await fetch(`${API}/api/LabTestCategoryReport/downloadLabTestCategoryReport`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', token: getToken() },
        body: JSON.stringify({ id: report.id }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => null);
        alert(err?.obj || 'Download failed');
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${report.uid || `Report-${report.id}`}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      alert('Error downloading report');
    }
  };

  const emailReport = (report: TestReport) => {
    const email = (report.patient_email || '').trim();
    if (!email) {
      alert('No email address found for this patient.');
      return;
    }
    const subject = encodeURIComponent(`Test Report ${report.uid || report.id}`);
    const body = encodeURIComponent(
      `Please find the lab test report for ${report.patient_name || 'patient'} (UID: ${report.uid || '—'}).`
    );
    window.location.href = `mailto:${email}?subject=${subject}&body=${body}`;
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

      <div style={{ padding: '1.5rem 1.75rem' }}>
        {msg && (
          <div
            style={{
              background: msg.type === 'success' ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
              border: `1px solid ${msg.type === 'success' ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)'}`,
              borderRadius: 8,
              padding: '0.75rem 1rem',
              marginBottom: '1rem',
              fontSize: '0.875rem',
              color: msg.type === 'success' ? '#10b981' : '#ef4444',
            }}
          >
            {msg.text}
          </div>
        )}

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
            >
              <option value="">Select Test</option>
              {labTests.map(t => (
                <option key={t.id} value={String(t.id)}>{t.name}</option>
              ))}
            </select>
          }
          rowActions={(r) =>
            r.status ? (
              <span className="report-locked-label" title="This report is locked">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                  <path d="M12 1a5 5 0 0 0-5 5v3H6a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-9a2 2 0 0 0-2-2h-1V6a5 5 0 0 0-5-5zm3 8H9V6a3 3 0 0 1 6 0v3z" />
                </svg>
                Locked
              </span>
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
