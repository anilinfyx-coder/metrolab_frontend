'use client';
import { useState, useEffect } from 'react';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
function getToken() { return typeof window !== 'undefined' ? localStorage.getItem('admin_token') || '' : ''; }

interface Patient { id: number; name: string; mobile: string; email: string; dob: string; ssn: string; uid: string; }
interface WaitingEntry { id: number; creation_timestamp: string; reason_for_test: string; lab_tests?: { lab_test_name: string }[]; }

export default function PatientListPage() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Patient | null>(null);
  const [history, setHistory] = useState<WaitingEntry[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  useEffect(() => {
    fetch(`${API}/api/Patient`, { headers: { token: getToken() } })
      .then(r => r.json())
      .then(d => { if (d.response_code === '200') setPatients(d.obj); })
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
      setHistory(d.obj.filter((w: WaitingEntry & { patient_id: number }) => w.patient_id === p.id));
    }
  };

  const filtered = patients.filter(p =>
    !search || p.name?.toLowerCase().includes(search.toLowerCase()) ||
    p.mobile?.includes(search) || p.ssn?.includes(search)
  );

  if (selected) {
    return (
      <div className="page-content">
        <div className="topnav">
          <h1 className="topnav-title">Patient History — {selected.name}</h1>
          <div className="topnav-actions">
            <button className="btn btn-ghost" id="back-to-list-btn" onClick={() => setSelected(null)}>← Back to List</button>
          </div>
        </div>
        <div style={{ padding: '1.5rem' }}>
          <div className="card" style={{ marginBottom: '1.5rem' }}>
            <div className="card-header"><span className="card-title">👤 Patient Info</span></div>
            <div className="card-body">
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', fontSize: '0.875rem' }}>
                {[['Name', selected.name], ['Mobile', selected.mobile], ['Email', selected.email], ['DOB', selected.dob ? new Date(selected.dob).toLocaleDateString() : '—'], ['SSN', selected.ssn], ['UID', selected.uid]].map(([k, v]) => (
                  <div key={k}><span style={{ color: 'var(--text-muted)' }}>{k}:</span> <strong>{v || '—'}</strong></div>
                ))}
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-header"><span className="card-title">📋 Test History ({history.length})</span></div>
            <div className="card-body" style={{ padding: 0 }}>
              {historyLoading ? <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>Loading...</div> : history.length === 0 ? (
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
    <div className="page-content">
      <div className="topnav">
        <h1 className="topnav-title">Patient List</h1>
        <div className="topnav-actions">
          <input id="patient-search" type="text" placeholder="Search by name, mobile, SSN..." value={search} onChange={e => setSearch(e.target.value)}
            style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, padding: '0.5rem 0.75rem', color: 'var(--text)', fontSize: '0.875rem', width: 280 }} />
        </div>
      </div>
      <div style={{ padding: '1.5rem' }}>
        <div className="card">
          <div className="card-body" style={{ padding: 0 }}>
            {loading ? <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>Loading...</div> : filtered.length === 0 ? (
              <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>No patients found.</div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border)' }}>
                    {['#', 'Name', 'Mobile', 'Email', 'DOB', 'SSN', 'Actions'].map(h => (
                      <th key={h} style={{ padding: '0.75rem 1rem', textAlign: 'left', color: 'var(--text-muted)', fontWeight: 600 }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((p, i) => (
                    <tr key={p.id} style={{ borderBottom: '1px solid var(--border)', transition: 'background 0.15s' }} onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-card-hover)')} onMouseLeave={e => (e.currentTarget.style.background = '')}>
                      <td style={{ padding: '0.75rem 1rem', color: 'var(--text-muted)' }}>{i + 1}</td>
                      <td style={{ padding: '0.75rem 1rem', fontWeight: 500 }}>{p.name}</td>
                      <td style={{ padding: '0.75rem 1rem' }}>{p.mobile || '—'}</td>
                      <td style={{ padding: '0.75rem 1rem' }}>{p.email || '—'}</td>
                      <td style={{ padding: '0.75rem 1rem' }}>{p.dob ? new Date(p.dob).toLocaleDateString() : '—'}</td>
                      <td style={{ padding: '0.75rem 1rem' }}>{p.ssn || '—'}</td>
                      <td style={{ padding: '0.75rem 1rem' }}>
                        <button id={`view-history-${p.id}`} className="btn btn-ghost" style={{ fontSize: '0.75rem', padding: '0.25rem 0.75rem' }} onClick={() => viewHistory(p)}>
                          📋 History
                        </button>
                      </td>
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
