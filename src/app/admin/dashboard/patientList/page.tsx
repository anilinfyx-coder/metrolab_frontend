'use client';
import { useState, useEffect } from 'react';
import TopNav from '../../../components/TopNav';
import ListingTable, { ListingColumn } from '../../../components/ListingTable';

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

interface WaitingEntry {
  id: number;
  creation_timestamp: string;
  reason_for_test: string;
  lab_tests?: { lab_test_name: string }[];
  patient_id?: number;
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
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Patient | null>(null);
  const [history, setHistory] = useState<WaitingEntry[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

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
    const res = await fetch(`${API}/api/WaitingList`, { headers: { token: getToken() } });
    const d = await res.json();
    setHistoryLoading(false);
    if (d.response_code === '200') {
      setHistory((d.obj || []).filter((w: WaitingEntry) => w.patient_id === p.id));
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

  if (selected) {
    return (
      <div className="page-content" style={{ paddingTop: 0 }}>
        <TopNav title={`Patient History — ${selected.name || ''}`}>
          <button className="btn btn-ghost" id="back-to-list-btn" onClick={() => setSelected(null)}>← Back to List</button>
        </TopNav>
        <div style={{ padding: '1.25rem 1.5rem' }}>
          <div className="card" style={{ marginBottom: '1.5rem' }}>
            <div className="card-header"><span className="card-title">Patient Info</span></div>
            <div className="card-body">
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', fontSize: '0.875rem' }}>
                {[
                  ['UID', selected.uid],
                  ['Name', selected.name],
                  ['Mobile', formatMobile(selected.mobile) || selected.mobile],
                  ['Gender', genderLabel(selected.gender)],
                  ['Email', selected.email],
                  ['DOB', selected.dob ? new Date(selected.dob).toLocaleDateString() : '—'],
                  ['SSN', selected.ssn],
                ].map(([k, v]) => (
                  <div key={k}><span style={{ color: 'var(--text-muted)' }}>{k}:</span> <strong>{v || '—'}</strong></div>
                ))}
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-header"><span className="card-title">Test History ({history.length})</span></div>
            <div className="card-body" style={{ padding: 0 }}>
              {historyLoading ? (
                <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>Loading...</div>
              ) : history.length === 0 ? (
                <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>No test history found.</div>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border)' }}>
                      {['#', 'Date', 'Reason for Test', 'Tests Assigned'].map(h => (
                        <th key={h} style={{ padding: '0.75rem 1rem', textAlign: 'left', color: 'var(--text-muted)', fontWeight: 600 }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {history.map((w, i) => (
                      <tr key={w.id} style={{ borderBottom: '1px solid var(--border)' }}>
                        <td style={{ padding: '0.75rem 1rem', color: 'var(--text-muted)' }}>{i + 1}</td>
                        <td style={{ padding: '0.75rem 1rem' }}>{new Date(w.creation_timestamp).toLocaleDateString()}</td>
                        <td style={{ padding: '0.75rem 1rem' }}>{w.reason_for_test || '—'}</td>
                        <td style={{ padding: '0.75rem 1rem' }}>{w.lab_tests?.map(t => t.lab_test_name).join(', ') || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
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
