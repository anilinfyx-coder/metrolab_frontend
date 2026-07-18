'use client';
import { useState, useEffect } from 'react';
import TopNav from '../../../components/TopNav';
import ListingTable, { ActionIcons, ListingColumn } from '../../../components/ListingTable';
import { useConfirm } from '../../../components/ConfirmModal';
import { formatDate } from '../../../utils/dateFormat';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
function getToken() { return typeof window !== 'undefined' ? localStorage.getItem('admin_token') || '' : ''; }

interface Patient {
  id: number;
  name: string;
  mobile: string;
  email: string;
  dob: string;
  ssn: string;
  uid: string;
  gender: string | number;
}

interface TestHistoryEntry {
  id: number;
  waiting_list_id: number;
  creation_timestamp: string;
  reason_for_test: string;
  lab_test_id: number;
  lab_test_name: string;
  report_id?: number | null;
  report_uid?: string | null;
}

const GENDER_LABELS: Record<string, string> = {
  '1': 'Male',
  '2': 'Female',
  '3': 'Prefer not to Declare',
  male: 'Male',
  female: 'Female',
};

function genderLabel(gender: string | number | null | undefined): string {
  if (gender == null || gender === '') return '—';
  const key = String(gender).trim();
  const mapped = GENDER_LABELS[key] || GENDER_LABELS[key.toLowerCase()];
  if (mapped) return mapped;
  if (/prefer not/i.test(key)) return 'Prefer not to Declare';
  return key;
}

function formatMobile(mobile?: string | null): string {
  if (!mobile) return '';
  const digits = String(mobile).replace(/\D/g, '');
  if (digits.length === 10) {
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  }
  if (digits.length === 11 && digits.startsWith('1')) {
    return `(${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7)}`;
  }
  return String(mobile);
}

function HistoryEyeIcon({ onClick, title = 'View History' }: { onClick: () => void; title?: string }) {
  return (
    <button type="button" className="history-eye-btn" title={title} onClick={onClick} aria-label={title}>
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="12" cy="12" r="3" />
      </svg>
    </button>
  );
}

export default function PatientListPage() {
  const confirmDialog = useConfirm();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Patient | null>(null);
  const [history, setHistory] = useState<TestHistoryEntry[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [emailing, setEmailing] = useState(false);
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    fetch(`${API}/api/Patient`, { headers: { token: getToken() } })
      .then(r => r.json())
      .then(d => { if (d.response_code === '200') setPatients(d.obj || []); })
      .finally(() => setLoading(false));
  }, []);

  const viewHistory = async (p: Patient) => {
    setSelected(p);
    setHistoryLoading(true);
    setHistory([]);
    setMsg(null);
    try {
      const res = await fetch(`${API}/api/WaitingList/patient/${p.id}/history`, { headers: { token: getToken() } });
      const d = await res.json();
      if (res.ok && d.response_code === '200') {
        setHistory(d.obj || []);
      } else {
        setMsg({ type: 'error', text: String(d.obj || 'Unable to load patient test history.') });
      }
    } catch {
      setMsg({ type: 'error', text: 'Unable to connect to the server while loading test history.' });
    } finally {
      setHistoryLoading(false);
    }
  };

  const downloadReport = async (entry: TestHistoryEntry) => {
    if (!entry.report_id) return;
    setMsg(null);
    try {
      const res = await fetch(`${API}/api/LabTestCategoryReport/downloadLabTestCategoryReport`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', token: getToken() },
        body: JSON.stringify({ id: entry.report_id }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setMsg({ type: 'error', text: String(data?.obj || 'Report download failed.') });
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${entry.report_uid || `Report-${entry.report_id}`}.pdf`;
      link.click();
      URL.revokeObjectURL(url);
    } catch {
      setMsg({ type: 'error', text: 'Unable to download the report. Please try again.' });
    }
  };

  const emailReport = async (entry: TestHistoryEntry) => {
    if (!entry.report_id || !selected || emailing) return;
    if (!selected.email?.trim()) {
      setMsg({ type: 'error', text: 'No email address is available for this patient.' });
      return;
    }

    const confirmed = await confirmDialog({
      title: 'Send report by email?',
      message: `Email the password-protected ${entry.lab_test_name} report to ${selected.email}? The patient will need their birthdate 4 digits (MMDD) to open it.`,
      cancelText: 'Cancel',
      confirmText: 'Send Email',
    });
    if (!confirmed) return;

    setEmailing(true);
    setMsg(null);
    try {
      const res = await fetch(`${API}/api/LabTestCategoryReport/emailLabTestCategoryReport`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', token: getToken() },
        body: JSON.stringify({ id: entry.report_id }),
      });
      const data = await res.json();
      if (res.ok && data.response_code === '200') {
        setMsg({ type: 'success', text: `Report emailed successfully to ${data.obj?.email || selected.email}.` });
      } else {
        setMsg({ type: 'error', text: String(data.obj || 'Failed to send the report email.') });
      }
    } catch {
      setMsg({ type: 'error', text: 'Unable to send the report email. Please try again.' });
    } finally {
      setEmailing(false);
    }
  };

  const columns: ListingColumn<Patient>[] = [
    {
      key: 'uid',
      label: 'UID',
      sortable: true,
      filterable: true,
      width: '14%',
      getValue: (row) => row.uid || '',
    },
    {
      key: 'name',
      label: 'Patient Name',
      sortable: true,
      filterable: true,
      width: '26%',
      getValue: (row) => row.name || '',
    },
    {
      key: 'mobile',
      label: 'Mobile',
      sortable: true,
      filterable: true,
      width: '22%',
      getValue: (row) => formatMobile(row.mobile) || row.mobile || '',
      render: (row) => formatMobile(row.mobile) || row.mobile || '—',
    },
    {
      key: 'gender',
      label: 'Gender',
      sortable: true,
      filterable: true,
      width: '26%',
      getValue: (row) => genderLabel(row.gender),
      render: (row) => genderLabel(row.gender),
    },
    {
      key: 'history',
      label: 'History',
      sortable: false,
      filterable: false,
      width: '12%',
      align: 'left',
      getValue: () => '',
      render: (row) => (
        <HistoryEyeIcon onClick={() => viewHistory(row)} title={`View history — ${row.name || row.uid || ''}`} />
      ),
    },
  ];

  const historyColumns: ListingColumn<TestHistoryEntry>[] = [
    {
      key: 'creation_timestamp',
      label: 'Date',
      sortable: true,
      filterable: true,
      width: '22%',
      getValue: row => formatDate(row.creation_timestamp),
      render: row => formatDate(row.creation_timestamp),
    },
    {
      key: 'reason_for_test',
      label: 'Reason for Test',
      sortable: true,
      filterable: true,
      width: '30%',
      getValue: row => row.reason_for_test || '',
      render: row => row.reason_for_test || '—',
    },
    {
      key: 'lab_test_name',
      label: 'Test Name',
      sortable: true,
      filterable: true,
      width: '34%',
      getValue: row => row.lab_test_name || '',
      render: row => <span style={{ fontWeight: 500 }}>{row.lab_test_name || '—'}</span>,
    },
  ];

  if (selected) {
    return (
      <div className="page-content" style={{ paddingTop: 0 }}>
        <TopNav title={`Patient History — ${selected.name || ''}`} />

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

        <div style={{ padding: '1.25rem 1.5rem' }} className={emailing ? 'test-reports-page-busy' : undefined}>
          {msg && (
            <div
              role="alert"
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

          <div className="card" style={{ marginBottom: '1.5rem' }}>
            <div className="card-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span className="card-title">Patient Info</span>
              <button type="button" className="btn btn-ghost" onClick={() => setSelected(null)}>
                ✕ Close
              </button>
            </div>
            <div className="card-body">
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', fontSize: '0.875rem' }}>
                {[
                  ['UID', selected.uid],
                  ['Name', selected.name],
                  ['Mobile', formatMobile(selected.mobile) || selected.mobile],
                  ['Gender', genderLabel(selected.gender)],
                  ['Email', selected.email],
                  ['DOB', formatDate(selected.dob)],
                  ['SSN', selected.ssn],
                ].map(([k, v]) => (
                  <div key={k}><span style={{ color: 'var(--text-muted)' }}>{k}:</span> <strong>{v || '—'}</strong></div>
                ))}
              </div>
            </div>
          </div>

          <ListingTable
            className="patient-history-table"
            title="Test History"
            columns={historyColumns}
            rows={history}
            loading={historyLoading}
            showTotal
            emptyText="No test history found."
            actionsLabel="Actions"
            actionsWidth={130}
            defaultPageSize={10}
            rowActions={entry => (
              entry.report_id ? (
                <ActionIcons
                  onDownload={() => downloadReport(entry)}
                  downloadTitle={`Download ${entry.lab_test_name} report`}
                  onMail={() => emailReport(entry)}
                  mailTitle={`Email ${entry.lab_test_name} report`}
                />
              ) : (
                <span style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>Report pending</span>
              )
            )}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="page-content" style={{ paddingTop: 0 }}>
      <TopNav title="Manage Patients" />

      <div style={{ padding: '1.5rem 1.75rem' }}>
        <ListingTable
          className="patient-list-table"
          title="List of Patients"
          columns={columns}
          rows={patients}
          loading={loading}
          emptyText="No patients found."
          defaultPageSize={25}
        />
      </div>
    </div>
  );
}
