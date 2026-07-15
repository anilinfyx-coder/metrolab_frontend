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
  uid: string;
  status: boolean; // isLocked
}

interface TestReportQuestion {
  report_question_id: number;
  question_text: string;
  description: string;
  answer_type: number; // 1 = text, 2 = select/radio
  answer_option: string; // comma separated options
  value: string;
}

interface FullReportDetail extends TestReport {
  specimen_type_id: number | null;
  date_of_test: string | null;
  test_performed_by: string | null;
  test_remark: string | null;
  final_remark: string | null;
  test_result: number | null;
  received_timestamp: string | null;
  reported_timestamp: string | null;
  labTest: {
    name: string;
    show_collected_date: boolean;
    show_collected_time: boolean;
    show_received_date: boolean;
    show_received_time: boolean;
    show_reported_date: boolean;
    show_reported_time: boolean;
    show_test_date: boolean;
    show_test_performed_by: boolean;
    show_reason_for_test: boolean;
    show_specimen: boolean;
    show_regulation: boolean;
    show_final_result: boolean;
    show_report_status: boolean;
  };
  testReportQuestionList: TestReportQuestion[];
}

export default function TestsReportsPage() {
  const [reports, setReports] = useState<TestReport[]>([]);
  const [patients, setPatients] = useState<{ id: number; name: string }[]>([]);
  const [labTests, setLabTests] = useState<{ id: number; name: string }[]>([]);
  const [specimens, setSpecimens] = useState<{ id: number; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const [editingDetail, setEditingDetail] = useState<FullReportDetail | null>(null);
  const [modalLoading, setModalLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const loadData = async () => {
    setLoading(true);
    const [rRes, pRes, ltRes, spRes] = await Promise.all([
      fetch(`${API}/api/LabTestCategoryReport`, { headers: { token: getToken() } }),
      fetch(`${API}/api/Patient`, { headers: { token: getToken() } }),
      fetch(`${API}/api/LabTests`, { headers: { token: getToken() } }),
      fetch(`${API}/api/SpecimenType`, { headers: { token: getToken() } }),
    ]);
    const [rD, pD, ltD, spD] = await Promise.all([rRes.json(), pRes.json(), ltRes.json(), spRes.json()]);

    const pts = pD.response_code === '200' ? pD.obj : [];
    const lts = ltD.response_code === '200' ? ltD.obj : [];
    const sps = spD.response_code === '200' ? spD.obj : [];

    setPatients(pts); setLabTests(lts); setSpecimens(sps);

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

  const openEditModal = async (reportId: number) => {
    setModalLoading(true);
    setMsg(null);
    try {
      const res = await fetch(`${API}/api/LabTestCategoryReport/getLabTestCategoryReportDetails`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', token: getToken() },
        body: JSON.stringify({ id: reportId })
      });
      const data = await res.json();
      if (data.response_code === '200') {
        const detail = data.obj as FullReportDetail;
        // Format dates for input type="date" and time
        if (detail.collected_timestamp) {
          const d = new Date(detail.collected_timestamp);
          detail.collected_timestamp = d.toISOString().slice(0, 16);
        }
        if (detail.received_timestamp) {
          const d = new Date(detail.received_timestamp);
          detail.received_timestamp = d.toISOString().slice(0, 16);
        }
        if (detail.reported_timestamp) {
          const d = new Date(detail.reported_timestamp);
          detail.reported_timestamp = d.toISOString().slice(0, 16);
        }
        if (detail.date_of_test) {
          const d = new Date(detail.date_of_test);
          detail.date_of_test = d.toISOString().split('T')[0];
        }
        setEditingDetail(detail);
      } else {
        setMsg({ type: 'error', text: data.obj });
      }
    } catch (err: any) {
      setMsg({ type: 'error', text: err.message });
    }
    setModalLoading(false);
  };

  const saveEdit = async () => {
    if (!editingDetail) return;
    setSaving(true); setMsg(null);
    try {
      // Re-format dates to ISO strings before sending if needed, or send as is (pg parses them well)
      const res = await fetch(`${API}/api/LabTestCategoryReport/saveLabTestCategoryReport`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', token: getToken() },
        body: JSON.stringify(editingDetail)
      });
      const d = await res.json();
      if (d.response_code === '200') {
        setMsg({ type: 'success', text: 'Report updated successfully.' });
        setEditingDetail(null);
        loadData();
      } else {
        setMsg({ type: 'error', text: d.obj });
      }
    } catch (err: any) {
      setMsg({ type: 'error', text: err.message });
    }
    setSaving(false);
  };

  const toggleLock = async (report: TestReport) => {
    const newStatus = !report.status;
    const res = await fetch(`${API}/api/LabTestCategoryReport/changeLabTestCategoryReportStatus`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', token: getToken() },
      body: JSON.stringify({ id: report.id, status: newStatus })
    });
    const data = await res.json();
    if (data.response_code === '200') {
      loadData();
    } else {
      alert("Error changing lock status: " + data.obj);
    }
  };

  const filtered = reports.filter(r =>
    !search || r.patient_name?.toLowerCase().includes(search.toLowerCase()) ||
    r.lab_test_name?.toLowerCase().includes(search.toLowerCase()) ||
    r.final_result?.toLowerCase().includes(search.toLowerCase()) ||
    r.uid?.toLowerCase().includes(search.toLowerCase())
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

        {/* Full Edit Modal */}
        {editingDetail && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999 }}>
            <div className="card" style={{ width: '100%', maxWidth: 800, maxHeight: '90vh', display: 'flex', flexDirection: 'column', margin: '1rem' }}>
              <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span className="card-title">✏️ Update {editingDetail.labTest.name}</span>
                <button className="btn btn-ghost" onClick={() => setEditingDetail(null)}>✖</button>
              </div>

              <div className="card-body" style={{ overflowY: 'auto', padding: '1.5rem' }}>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
                  {editingDetail.labTest.show_regulation && (
                    <div className="form-group">
                      <label>Regulation</label>
                      <input type="text" value="Non-DOT" disabled style={{ background: 'var(--bg-app)' }} />
                    </div>
                  )}
                  {editingDetail.labTest.show_specimen && (
                    <div className="form-group">
                      <label>Service and Specimen type</label>
                      <select value={editingDetail.specimen_type_id || ''} onChange={e => setEditingDetail({ ...editingDetail, specimen_type_id: parseInt(e.target.value) || null })}>
                        <option value="">Select Specimen Type</option>
                        {specimens.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                      </select>
                    </div>
                  )}
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
                  {editingDetail.labTest.show_collected_date && (
                    <div className="form-group">
                      <label>Collected Date & Time</label>
                      <input type="datetime-local" value={editingDetail.collected_timestamp || ''} onChange={e => setEditingDetail({ ...editingDetail, collected_timestamp: e.target.value })} />
                    </div>
                  )}
                  {editingDetail.labTest.show_received_date && (
                    <div className="form-group">
                      <label>Received Date & Time</label>
                      <input type="datetime-local" value={editingDetail.received_timestamp || ''} onChange={e => setEditingDetail({ ...editingDetail, received_timestamp: e.target.value })} />
                    </div>
                  )}
                  {editingDetail.labTest.show_reported_date && (
                    <div className="form-group">
                      <label>Reported Date & Time</label>
                      <input type="datetime-local" value={editingDetail.reported_timestamp || ''} onChange={e => setEditingDetail({ ...editingDetail, reported_timestamp: e.target.value })} />
                    </div>
                  )}
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
                  {editingDetail.labTest.show_test_date && (
                    <div className="form-group">
                      <label>Date of Test</label>
                      <input type="date" value={editingDetail.date_of_test || ''} onChange={e => setEditingDetail({ ...editingDetail, date_of_test: e.target.value })} />
                    </div>
                  )}
                  {editingDetail.labTest.show_test_performed_by && (
                    <div className="form-group">
                      <label>Test Performed By</label>
                      <input type="text" value={editingDetail.test_performed_by || ''} onChange={e => setEditingDetail({ ...editingDetail, test_performed_by: e.target.value })} placeholder="Enter Test Performed By" />
                    </div>
                  )}
                  {editingDetail.labTest.show_reason_for_test && (
                    <div className="form-group">
                      <label>Reason For Test</label>
                      <input type="text" value={editingDetail.reason_for_test || ''} onChange={e => setEditingDetail({ ...editingDetail, reason_for_test: e.target.value })} placeholder="Enter Reason For Test" />
                    </div>
                  )}
                </div>

                {/* Dynamic Questions */}
                {editingDetail.testReportQuestionList && editingDetail.testReportQuestionList.length > 0 && (
                  <div style={{ marginBottom: '1.5rem', background: 'var(--bg-app)', padding: '1rem', borderRadius: '8px' }}>
                    <h4 style={{ marginTop: 0, marginBottom: '1rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem' }}>Report Questions</h4>
                    {editingDetail.testReportQuestionList.map((q, idx) => (
                      <div key={q.report_question_id} className="form-group" style={{ marginBottom: '1rem' }}>
                        <label>{q.question_text}</label>
                        {q.description && <small style={{ display: 'block', color: 'var(--text-muted)', marginBottom: '4px' }}>{q.description}</small>}

                        {q.answer_type === 1 && ( // Text Input
                          <input type="text" value={q.value || ''} onChange={e => {
                            const newQs = [...editingDetail.testReportQuestionList];
                            newQs[idx] = { ...newQs[idx], value: e.target.value };
                            setEditingDetail({ ...editingDetail, testReportQuestionList: newQs });
                          }} />
                        )}
                        {q.answer_type === 2 && ( // Dropdown / Select
                          <select value={q.value || ''} onChange={e => {
                            const newQs = [...editingDetail.testReportQuestionList];
                            newQs[idx] = { ...newQs[idx], value: e.target.value };
                            setEditingDetail({ ...editingDetail, testReportQuestionList: newQs });
                          }}>
                            <option value="">Select Option</option>
                            {q.answer_option?.split(',').map(opt => opt.trim()).map(opt => (
                              <option key={opt} value={opt}>{opt}</option>
                            ))}
                            {/* Fallback to Yes/No if empty options but answer_type is 2 */}
                            {(!q.answer_option || q.answer_option.trim() === '') && (
                              <>
                                <option value="Yes">Yes</option>
                                <option value="No">No</option>
                              </>
                            )}
                          </select>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* Final Result Section */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  {editingDetail.labTest.show_final_result && (
                    <div className="form-group">
                      <label>Final Result</label>
                      <input type="text" value={editingDetail.final_result || ''} onChange={e => setEditingDetail({ ...editingDetail, final_result: e.target.value })} placeholder="Enter Final Result" />
                    </div>
                  )}
                  {editingDetail.labTest.show_report_status && (
                    <div className="form-group">
                      <label>Report Status</label>
                      <select value={editingDetail.report_status || ''} onChange={e => setEditingDetail({ ...editingDetail, report_status: e.target.value })}>
                        <option value="">Select Status</option>
                        <option value="Pending">Pending</option>
                        <option value="In Progress">In Progress</option>
                        <option value="Completed">Completed</option>
                        <option value="Cancelled">Cancelled</option>
                      </select>
                    </div>
                  )}
                </div>

              </div>
              <div className="card-footer" style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end', background: 'var(--bg-app)' }}>
                <button className="btn btn-ghost" onClick={() => setEditingDetail(null)}>Cancel</button>
                <button className="btn btn-primary" onClick={saveEdit} disabled={saving}>{saving ? '⏳ Saving...' : '💾 Save Changes'}</button>
              </div>
            </div>
          </div>
        )}

        <div className="card">
          <div className="card-body" style={{ padding: 0 }}>
            {loading || modalLoading ? (
              <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>Loading reports...</div>
            ) : filtered.length === 0 ? (
              <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>No test reports found.</div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border)' }}>
                      {['UID', 'Patient Name', 'Lab Test', 'Result', 'Status', 'Date', 'Action'].map(h => (
                        <th key={h} style={{ padding: '0.75rem 1rem', textAlign: 'left', color: 'var(--text-muted)', fontWeight: 600, whiteSpace: 'nowrap' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((r) => (
                      <tr key={r.id} style={{ borderBottom: '1px solid var(--border)', transition: 'background 0.15s' }}
                        onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-card-hover)')}
                        onMouseLeave={e => (e.currentTarget.style.background = '')}>
                        <td style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>{r.uid || `TR-${r.id}`}</td>
                        <td style={{ padding: '0.75rem 1rem' }}>{r.patient_name}</td>
                        <td style={{ padding: '0.75rem 1rem' }}>{r.lab_test_name}</td>
                        <td style={{ padding: '0.75rem 1rem' }}>{r.final_result || '—'}</td>
                        <td style={{ padding: '0.75rem 1rem' }}>
                          <span className={`badge ${r.status ? 'badge-success' : 'badge-warning'}`}>
                            {r.status ? '🔒 Locked' : '🔓 Unlocked'}
                          </span>
                        </td>
                        <td style={{ padding: '0.75rem 1rem', whiteSpace: 'nowrap' }}>{new Date(r.creation_timestamp).toLocaleDateString()}</td>
                        <td style={{ padding: '0.75rem 1rem', display: 'flex', gap: '0.5rem' }}>
                          <button
                            className="btn btn-ghost"
                            style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem' }}
                            onClick={() => openEditModal(r.id)}
                            disabled={r.status} // Disabled if locked
                            title={r.status ? 'Cannot edit locked report' : 'Edit Report'}
                          >
                            ✏️ Edit
                          </button>
                          <button
                            className={`btn ${r.status ? 'btn-ghost' : 'btn-primary'}`}
                            style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem' }}
                            onClick={() => toggleLock(r)}
                          >
                            {r.status ? '🔓 Unlock' : '🔒 Lock'}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
