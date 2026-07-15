'use client';
import { useState, useEffect } from 'react';
import TopNav from '../../../components/TopNav';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
function getToken() { return typeof window !== 'undefined' ? localStorage.getItem('admin_token') || '' : ''; }

interface TestReport {
  id: number;
  patient_id: number;
  patient_name?: string;
  lab_test_id: number;
  lab_test_name?: string;
  final_result: string;
  report_status: string;
  creation_timestamp: string;
  collected_timestamp: string;
  reason_for_test: string;
  waiting_list_id: number;
}

export default function TestsReportsPage() {
  const [reports, setReports] = useState<TestReport[]>([]);
  const [patients, setPatients] = useState<{ id: number; name: string }[]>([]);
  const [labTests, setLabTests] = useState<{ id: number; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState<TestReport | null>(null);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const loadData = async () => {
    setLoading(true);
    const [rRes, pRes, ltRes] = await Promise.all([
      fetch(`${API}/api/LabTestCategoryReport`, { headers: { token: getToken() } }),
      fetch(`${API}/api/Patient`, { headers: { token: getToken() } }),
      fetch(`${API}/api/LabTests`, { headers: { token: getToken() } }),
    ]);
    const [rD, pD, ltD] = await Promise.all([rRes.json(), pRes.json(), ltRes.json()]);
    const pts = pD.response_code === '200' ? pD.obj : [];
    const lts = ltD.response_code === '200' ? ltD.obj : [];
    setPatients(pts); setLabTests(lts);
    if (rD.response_code === '200') {
      setReports(rD.obj.map((r: TestReport) => ({
        ...r,
        patient_name: pts.find((p: { id: number }) => p.id === r.patient_id)?.name || `Patient #${r.patient_id}`,
        lab_test_name: lts.find((l: { id: number }) => l.id === r.lab_test_id)?.name || `Test #${r.lab_test_id}`,
      })));
    }
    setLoading(false);
  };

  useEffect(() => { loadData(); }, []);

  const saveEdit = async () => {
    if (!editing) return;
    setSaving(true); setMsg(null);
    const res = await fetch(`${API}/api/LabTestCategoryReport/${editing.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', token: getToken() },
      body: JSON.stringify({ final_result: editing.final_result, report_status: editing.report_status })
    });
    const d = await res.json();
    setSaving(false);
    if (d.response_code === '200') {
      setMsg({ type: 'success', text: 'Report updated successfully.' });
      setEditing(null);
      loadData();
    } else { setMsg({ type: 'error', text: d.obj }); }
  };

  const filtered = reports.filter(r =>
    !search || r.patient_name?.toLowerCase().includes(search.toLowerCase()) ||
    r.lab_test_name?.toLowerCase().includes(search.toLowerCase()) ||
    r.final_result?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="page-content">
      <TopNav title="Tests Reports">
          <input id="report-search" type="text" placeholder="Search reports..." value={search} onChange={e => setSearch(e.target.value)}
            style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, padding: '0.5rem 0.75rem', color: 'var(--text)', fontSize: '0.875rem', width: 260 }} />
          <button className="btn btn-ghost" onClick={loadData} style={{ fontSize: '0.875rem' }}>🔄 Refresh</button>
        </TopNav>
      <div style={{ padding: '1.5rem' }}>
        {msg && (
          <div style={{ background: msg.type === 'success' ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)', border: `1px solid ${msg.type === 'success' ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)'}`, borderRadius: 8, padding: '0.75rem 1rem', marginBottom: '1rem', fontSize: '0.875rem', color: msg.type === 'success' ? '#10b981' : '#ef4444' }}>
            {msg.text}
          </div>
        )}

        {/* Edit Modal */}
        {editing && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999 }}>
            <div className="card" style={{ width: '100%', maxWidth: 500, margin: '1rem' }}>
              <div className="card-header"><span className="card-title">✏️ Update Test Report</span></div>
              <div className="card-body">
                <div style={{ marginBottom: '0.75rem', fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                  Patient: <strong style={{ color: 'var(--text)' }}>{editing.patient_name}</strong> | Test: <strong style={{ color: 'var(--text)' }}>{editing.lab_test_name}</strong>
                </div>
                <div className="form-group">
                  <label htmlFor="edit-result">Final Result</label>
                  <input id="edit-result" type="text" value={editing.final_result || ''} onChange={e => setEditing(ed => ed ? { ...ed, final_result: e.target.value } : null)} placeholder="e.g. Negative, Positive" />
                </div>
                <div className="form-group">
                  <label htmlFor="edit-status">Report Status</label>
                  <select id="edit-status" value={editing.report_status || ''} onChange={e => setEditing(ed => ed ? { ...ed, report_status: e.target.value } : null)}>
                    <option value="">Select Status</option>
                    <option value="Pending">Pending</option>
                    <option value="In Progress">In Progress</option>
                    <option value="Completed">Completed</option>
                    <option value="Cancelled">Cancelled</option>
                  </select>
                </div>
                <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem' }}>
                  <button id="save-report-btn" className="btn btn-primary" onClick={saveEdit} disabled={saving}>{saving ? '⏳' : '💾 Save'}</button>
                  <button className="btn btn-ghost" onClick={() => setEditing(null)}>Cancel</button>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="card">
          <div className="card-body" style={{ padding: 0 }}>
            {loading ? (
              <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>Loading reports...</div>
            ) : filtered.length === 0 ? (
              <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>No test reports found.</div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border)' }}>
                    {['#', 'Patient', 'Lab Test', 'Reason', 'Final Result', 'Status', 'Date', 'Action'].map(h => (
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
                      <td style={{ padding: '0.75rem 1rem' }}>{r.lab_test_name}</td>
                      <td style={{ padding: '0.75rem 1rem', maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.reason_for_test || '—'}</td>
                      <td style={{ padding: '0.75rem 1rem' }}>{r.final_result || '—'}</td>
                      <td style={{ padding: '0.75rem 1rem' }}>
                        <span className={`badge ${r.report_status === 'Completed' ? 'badge-success' : r.report_status === 'Cancelled' ? 'badge-danger' : 'badge-warning'}`}>
                          {r.report_status || 'Pending'}
                        </span>
                      </td>
                      <td style={{ padding: '0.75rem 1rem', whiteSpace: 'nowrap' }}>{new Date(r.creation_timestamp).toLocaleDateString()}</td>
                      <td style={{ padding: '0.75rem 1rem' }}>
                        <button id={`edit-report-${r.id}`} className="btn btn-ghost" style={{ fontSize: '0.75rem', padding: '0.25rem 0.75rem' }} onClick={() => { setEditing(r); setMsg(null); }}>
                          ✏️ Edit
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
