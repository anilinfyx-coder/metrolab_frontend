'use client';
import { useState, useEffect } from 'react';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
function getToken() { return typeof window !== 'undefined' ? localStorage.getItem('admin_token') || '' : ''; }

interface TestRequest {
  id: number;
  patient_id: number;
  corporate_client_id: number;
  employee_id: number;
  reason_for_test: string;
  requisition_no: string;
  creation_timestamp: string;
  patient_name?: string;
  corporate_name?: string;
  employee_name?: string;
}

export default function ManageRequestsPage() {
  const [requests, setRequests] = useState<TestRequest[]>([]);
  const [patients, setPatients] = useState<{ id: number; name: string }[]>([]);
  const [corporates, setCorporates] = useState<{ id: number; company_name: string }[]>([]);
  const [employees, setEmployees] = useState<{ id: number; first_name: string; last_name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const loadData = async () => {
    setLoading(true);
    const [rRes, pRes, cRes, eRes] = await Promise.all([
      fetch(`${API}/api/TestRequest`, { headers: { token: getToken() } }),
      fetch(`${API}/api/Patient`, { headers: { token: getToken() } }),
      fetch(`${API}/api/CorporateClients`, { headers: { token: getToken() } }),
      fetch(`${API}/api/Employees`, { headers: { token: getToken() } }),
    ]);
    const [rD, pD, cD, eD] = await Promise.all([rRes.json(), pRes.json(), cRes.json(), eRes.json()]);
    const pts = pD.response_code === '200' ? pD.obj : [];
    const corps = cD.response_code === '200' ? cD.obj : [];
    const emps = eD.response_code === '200' ? eD.obj : [];
    setPatients(pts); setCorporates(corps); setEmployees(emps);
    if (rD.response_code === '200') {
      setRequests(rD.obj.map((r: TestRequest) => ({
        ...r,
        patient_name: pts.find((p: { id: number }) => p.id === r.patient_id)?.name || '—',
        corporate_name: corps.find((c: { id: number }) => c.id === r.corporate_client_id)?.company_name || '—',
        employee_name: (() => { const e = emps.find((e: { id: number }) => e.id === r.employee_id); return e ? `${e.first_name} ${e.last_name}` : '—'; })(),
      })));
    }
    setLoading(false);
  };

  useEffect(() => { loadData(); }, []);

  const filtered = requests.filter(r =>
    !search ||
    r.patient_name?.toLowerCase().includes(search.toLowerCase()) ||
    r.corporate_name?.toLowerCase().includes(search.toLowerCase()) ||
    r.employee_name?.toLowerCase().includes(search.toLowerCase()) ||
    r.reason_for_test?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="page-content">
      <div className="topnav">
        <h1 className="topnav-title">Manage Requests</h1>
        <div className="topnav-actions">
          <input id="req-search" type="text" placeholder="Search requests..." value={search} onChange={e => setSearch(e.target.value)}
            style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, padding: '0.5rem 0.75rem', color: 'var(--text)', fontSize: '0.875rem', width: 260 }} />
          <button className="btn btn-ghost" onClick={loadData} style={{ fontSize: '0.875rem' }}>🔄 Refresh</button>
        </div>
      </div>
      <div style={{ padding: '1.5rem' }}>
        <div className="card">
          <div className="card-body" style={{ padding: 0 }}>
            {loading ? (
              <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>Loading requests...</div>
            ) : filtered.length === 0 ? (
              <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>No test requests found.</div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border)' }}>
                    {['#', 'Patient', 'Corporate', 'Employee', 'Reason', 'Requisition No.', 'Date'].map(h => (
                      <th key={h} style={{ padding: '0.75rem 1rem', textAlign: 'left', color: 'var(--text-muted)', fontWeight: 600, whiteSpace: 'nowrap' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((r, i) => (
                    <tr key={r.id} style={{ borderBottom: '1px solid var(--border)', transition: 'background 0.15s' }}
                      onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-card-hover)')}
                      onMouseLeave={e => (e.currentTarget.style.background = '')}>
                      <td style={{ padding: '0.75rem 1rem', color: 'var(--text-muted)' }}>{i + 1}</td>
                      <td style={{ padding: '0.75rem 1rem', fontWeight: 500 }}>{r.patient_name}</td>
                      <td style={{ padding: '0.75rem 1rem' }}>{r.corporate_name}</td>
                      <td style={{ padding: '0.75rem 1rem' }}>{r.employee_name}</td>
                      <td style={{ padding: '0.75rem 1rem', maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.reason_for_test || '—'}</td>
                      <td style={{ padding: '0.75rem 1rem' }}>{r.requisition_no || '—'}</td>
                      <td style={{ padding: '0.75rem 1rem', whiteSpace: 'nowrap' }}>{new Date(r.creation_timestamp).toLocaleDateString()}</td>
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
