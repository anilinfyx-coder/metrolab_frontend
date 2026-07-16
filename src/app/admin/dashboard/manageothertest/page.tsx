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
  report_questions_id: number;
  question_text: string;
  description: string;
  answer_type: number; // 1 = text, 2 = select/radio
  answer_option: string; // comma separated options
  value: string;
}

interface TestReportParameter {
  report_request_parameters_id: number;
  reportRequestParameters: string;
  description: string;
  screeningCutoff: string;
  confirmationCutoff: string;
  unitText: string;
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
  fasting: string | null;
  requisition_no: string | null;
  device_identifier: string | null;
  date_administered: string | null;
  applied_to_arm: string | null;
  lot: string | null;
  expiry_date: string | null;
  date_read: string | null;
  mm_indurations: string | null;
  follow_up: string | null;
  reference_range_note: string | null;
  clinical_significance_note: string | null;
  result_interpretation_note: string | null;
  final_result_disposition: string | null;
  
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
    show_fasting: boolean;
    show_requisition_no: boolean;
    show_device_identifier: boolean;
    show_date_administered: boolean;
    show_applied_to: boolean;
    show_lot: boolean;
    show_expire_date: boolean;
    show_date_read: boolean;
    show_mm_indurations: boolean;
    show_follow_up: boolean;
    show_test_remark: boolean;
    show_final_result_disposition: boolean;
    show_final_remark: boolean;
  };
  testReportQuestionList: TestReportQuestion[];
  testResultParameterList: TestReportParameter[];
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
  const [drugTestAccept, setDrugTestAccept] = useState(false);
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
    if (!drugTestAccept) {
      setMsg({ type: 'error', text: 'You must confirm the drug test acceptance before saving.' });
      return;
    }
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

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
                  {editingDetail.labTest.show_report_status && (
                    <div className="form-group">
                      <label>Report Status</label>
                      <input type="text" value={editingDetail.report_status || ''} onChange={e => setEditingDetail({ ...editingDetail, report_status: e.target.value })} placeholder="Enter Report Status" />
                    </div>
                  )}
                  {editingDetail.labTest.show_fasting && (
                    <div className="form-group">
                      <label>Fasting</label>
                      <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem' }}>
                        <label><input type="radio" name="fasting" value="1" checked={editingDetail.fasting === '1'} onChange={e => setEditingDetail({ ...editingDetail, fasting: e.target.value })} /> Yes</label>
                        <label><input type="radio" name="fasting" value="2" checked={editingDetail.fasting === '2'} onChange={e => setEditingDetail({ ...editingDetail, fasting: e.target.value })} /> No</label>
                      </div>
                    </div>
                  )}
                  {editingDetail.labTest.show_requisition_no && (
                    <div className="form-group">
                      <label>Requisition No</label>
                      <input type="text" value={editingDetail.requisition_no || ''} onChange={e => setEditingDetail({ ...editingDetail, requisition_no: e.target.value })} placeholder="Enter Requisition No" />
                    </div>
                  )}
                  {editingDetail.labTest.show_device_identifier && (
                    <div className="form-group">
                      <label>Device Identifier</label>
                      <input type="text" value={editingDetail.device_identifier || ''} onChange={e => setEditingDetail({ ...editingDetail, device_identifier: e.target.value })} placeholder="Enter Device Identifier" />
                    </div>
                  )}
                </div>

                {/* Parameters List */}
                {editingDetail.testResultParameterList && editingDetail.testResultParameterList.length > 0 && (
                  <div style={{ marginBottom: '1.5rem', background: 'var(--bg-app)', padding: '1rem', borderRadius: '8px', overflowX: 'auto' }}>
                    <h4 style={{ marginTop: 0, marginBottom: '1rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem' }}>Parameters</h4>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <thead>
                        <tr>
                          <th style={{ textAlign: 'left', padding: '0.5rem' }}>Parameter Name</th>
                          <th style={{ textAlign: 'left', padding: '0.5rem' }}>Result</th>
                          {editingDetail.testResultParameterList[0].screeningCutoff !== 'Null' && <th style={{ textAlign: 'left', padding: '0.5rem' }}>Screening Cut Off</th>}
                          {editingDetail.testResultParameterList[0].confirmationCutoff !== 'Null' && <th style={{ textAlign: 'left', padding: '0.5rem' }}>Confirmation Cut Off</th>}
                        </tr>
                      </thead>
                      <tbody>
                        {editingDetail.testResultParameterList.map((p, idx) => (
                          <tr key={p.report_request_parameters_id}>
                            <td style={{ padding: '0.5rem' }}>
                              <div style={{ fontWeight: 600 }}>{p.reportRequestParameters}</div>
                              <small style={{ color: 'var(--text-muted)' }}>{p.description}</small>
                            </td>
                            <td style={{ padding: '0.5rem' }}>
                              <input type="text" value={p.value || ''} onChange={e => {
                                const newP = [...editingDetail.testResultParameterList];
                                newP[idx] = { ...newP[idx], value: e.target.value };
                                setEditingDetail({ ...editingDetail, testResultParameterList: newP });
                              }} style={{ width: '100%' }} />
                            </td>
                            {p.screeningCutoff !== 'Null' && <td style={{ padding: '0.5rem' }}>{p.screeningCutoff} {p.unitText}</td>}
                            {p.confirmationCutoff !== 'Null' && <td style={{ padding: '0.5rem' }}>{p.confirmationCutoff} {p.unitText}</td>}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* Dynamic Questions */}
                {editingDetail.testReportQuestionList && editingDetail.testReportQuestionList.length > 0 && (
                  <div style={{ marginBottom: '1.5rem', background: 'var(--bg-app)', padding: '1rem', borderRadius: '8px' }}>
                    <h4 style={{ marginTop: 0, marginBottom: '1rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem' }}>Report Questions</h4>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1rem' }}>
                      {editingDetail.testReportQuestionList.map((q, idx) => (
                        <div key={q.report_question_id} className="form-group">
                          <label>{q.question_text}</label>
                          {q.description && <small style={{ display: 'block', color: 'var(--text-muted)', marginBottom: '4px' }}>{q.description}</small>}

                          {q.answer_type === 1 && ( // Yes/No Radio
                            <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem' }}>
                              <label><input type="radio" value="1" checked={q.value === '1'} onChange={e => {
                                const newQs = [...editingDetail.testReportQuestionList];
                                newQs[idx] = { ...newQs[idx], value: e.target.value };
                                setEditingDetail({ ...editingDetail, testReportQuestionList: newQs });
                              }} /> Yes</label>
                              <label><input type="radio" value="0" checked={q.value === '0'} onChange={e => {
                                const newQs = [...editingDetail.testReportQuestionList];
                                newQs[idx] = { ...newQs[idx], value: e.target.value };
                                setEditingDetail({ ...editingDetail, testReportQuestionList: newQs });
                              }} /> No</label>
                            </div>
                          )}
                          {q.answer_type === 2 && ( // Checkbox (Done)
                            <div style={{ marginTop: '0.5rem' }}>
                              <label><input type="checkbox" checked={q.value === 'true'} onChange={e => {
                                const newQs = [...editingDetail.testReportQuestionList];
                                newQs[idx] = { ...newQs[idx], value: e.target.checked.toString() };
                                setEditingDetail({ ...editingDetail, testReportQuestionList: newQs });
                              }} /> Done</label>
                            </div>
                          )}
                          {q.answer_type === 3 && ( // Numeric
                            <input type="number" value={q.value || ''} placeholder="Enter Numeric Value" onChange={e => {
                              const newQs = [...editingDetail.testReportQuestionList];
                              newQs[idx] = { ...newQs[idx], value: e.target.value };
                              setEditingDetail({ ...editingDetail, testReportQuestionList: newQs });
                            }} />
                          )}
                          {q.answer_type === 4 && ( // Alphanumeric
                            <input type="text" value={q.value || ''} placeholder="Enter Alphanumeric Value" onChange={e => {
                              const newQs = [...editingDetail.testReportQuestionList];
                              newQs[idx] = { ...newQs[idx], value: e.target.value };
                              setEditingDetail({ ...editingDetail, testReportQuestionList: newQs });
                            }} />
                          )}
                          {q.answer_type === 5 && ( // Dropdown / Select
                            <select value={q.value || ''} onChange={e => {
                              const newQs = [...editingDetail.testReportQuestionList];
                              newQs[idx] = { ...newQs[idx], value: e.target.value };
                              setEditingDetail({ ...editingDetail, testReportQuestionList: newQs });
                            }}>
                              <option value="">Select Option</option>
                              {q.answer_option?.split(',').map(opt => opt.trim()).filter(Boolean).map(opt => (
                                <option key={opt} value={opt}>{opt}</option>
                              ))}
                            </select>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
                  {editingDetail.labTest.show_date_administered && (
                    <div className="form-group">
                      <label>Date Administered</label>
                      <input type="date" value={editingDetail.date_administered || ''} onChange={e => setEditingDetail({ ...editingDetail, date_administered: e.target.value })} />
                    </div>
                  )}
                  {editingDetail.labTest.show_applied_to && (
                    <div className="form-group">
                      <label>Applied To</label>
                      <select value={editingDetail.applied_to_arm || '0'} onChange={e => setEditingDetail({ ...editingDetail, applied_to_arm: e.target.value })}>
                        <option value="0">Right Arm</option>
                        <option value="1">Left Arm</option>
                      </select>
                    </div>
                  )}
                  {editingDetail.labTest.show_lot && (
                    <div className="form-group">
                      <label>Lot</label>
                      <input type="text" value={editingDetail.lot || ''} onChange={e => setEditingDetail({ ...editingDetail, lot: e.target.value })} placeholder="Enter Lot" />
                    </div>
                  )}
                  {editingDetail.labTest.show_expire_date && (
                    <div className="form-group">
                      <label>Exp. Date</label>
                      <input type="date" value={editingDetail.expiry_date || ''} onChange={e => setEditingDetail({ ...editingDetail, expiry_date: e.target.value })} />
                    </div>
                  )}
                  {editingDetail.labTest.show_date_read && (
                    <div className="form-group">
                      <label>Date Read</label>
                      <input type="date" value={editingDetail.date_read || ''} onChange={e => setEditingDetail({ ...editingDetail, date_read: e.target.value })} />
                    </div>
                  )}
                  {editingDetail.labTest.show_mm_indurations && (
                    <div className="form-group">
                      <label>mm Indurations</label>
                      <input type="text" value={editingDetail.mm_indurations || ''} onChange={e => setEditingDetail({ ...editingDetail, mm_indurations: e.target.value })} placeholder="Quantity in mm" disabled />
                    </div>
                  )}
                  {editingDetail.labTest.show_follow_up && (
                    <div className="form-group">
                      <label>Follow Up</label>
                      <select value={editingDetail.follow_up || 'None'} onChange={e => setEditingDetail({ ...editingDetail, follow_up: e.target.value })} disabled>
                        <option value="None">None</option>
                        <option value="Needed repeat test">Needed repeat test</option>
                        <option value="Chest x-ray">Chest x-ray</option>
                      </select>
                    </div>
                  )}
                </div>

                {/* Final Result Section */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1rem', marginBottom: '1.5rem' }}>
                  {editingDetail.labTest.show_final_result && (
                    <div className="form-group">
                      <label>Final Result</label>
                      <select value={editingDetail.final_result || '1'} onChange={e => setEditingDetail({ ...editingDetail, final_result: e.target.value })}>
                        <option value="1">Negative</option>
                        <option value="2">Positive</option>
                        <option value="3">Test Cancelled</option>
                        <option value="4">Refusal to test because Adulterated</option>
                        <option value="5">Refusal to test because Substituted</option>
                        <option value="6">Dilute</option>
                      </select>
                    </div>
                  )}
                  
                  {editingDetail.labTest.show_test_remark && (
                    <div className="form-group">
                      <label>Test Remark</label>
                      <textarea rows={4} value={editingDetail.test_remark || ''} onChange={e => setEditingDetail({ ...editingDetail, test_remark: e.target.value })} placeholder="Enter Test Remark" style={{ width: '100%', padding: '0.75rem', borderRadius: 8, border: '1px solid var(--border)' }}></textarea>
                    </div>
                  )}

                  {editingDetail.lab_test_id === 8 && (
                    <>
                      <div className="form-group">
                        <label>Reference Range Note</label>
                        <textarea rows={4} value={editingDetail.reference_range_note || ''} onChange={e => setEditingDetail({ ...editingDetail, reference_range_note: e.target.value })} placeholder="Add Note" style={{ width: '100%', padding: '0.75rem', borderRadius: 8, border: '1px solid var(--border)' }}></textarea>
                      </div>
                      <div className="form-group">
                        <label>Clinical Significance:</label>
                        <textarea rows={4} value={editingDetail.clinical_significance_note || ''} onChange={e => setEditingDetail({ ...editingDetail, clinical_significance_note: e.target.value })} placeholder="Add Clinical Significance:" style={{ width: '100%', padding: '0.75rem', borderRadius: 8, border: '1px solid var(--border)' }}></textarea>
                      </div>
                      <div className="form-group">
                        <label>Result Interpretation:</label>
                        <textarea rows={4} value={editingDetail.result_interpretation_note || ''} onChange={e => setEditingDetail({ ...editingDetail, result_interpretation_note: e.target.value })} placeholder="Add Result Interpretation:" style={{ width: '100%', padding: '0.75rem', borderRadius: 8, border: '1px solid var(--border)' }}></textarea>
                      </div>
                    </>
                  )}

                  {editingDetail.labTest.show_final_result_disposition && (
                    <div className="form-group">
                      <label>Final Result Disposition</label>
                      <select value={editingDetail.final_result_disposition || '1'} onChange={e => setEditingDetail({ ...editingDetail, final_result_disposition: e.target.value })}>
                        <option value="1">Negative</option>
                        <option value="2">Positive</option>
                        <option value="3">Test Cancelled</option>
                      </select>
                    </div>
                  )}

                  {editingDetail.labTest.show_final_remark && (
                    <div className="form-group">
                      <label>Final Remark</label>
                      <textarea rows={4} value={editingDetail.final_remark || ''} onChange={e => setEditingDetail({ ...editingDetail, final_remark: e.target.value })} placeholder="Enter Final Remark" style={{ width: '100%', padding: '0.75rem', borderRadius: 8, border: '1px solid var(--border)' }}></textarea>
                    </div>
                  )}
                </div>

              </div>
              <div className="card-footer" style={{ display: 'flex', gap: '1rem', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-app)', padding: '1rem 1.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <input type="checkbox" id="drugTestAccept" checked={drugTestAccept} onChange={e => setDrugTestAccept(e.target.checked)} />
                  <label htmlFor="drugTestAccept" style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>I understand that providing false information...</label>
                </div>
                <div style={{ display: 'flex', gap: '1rem' }}>
                  <button className="btn btn-ghost" onClick={() => setEditingDetail(null)}>Cancel</button>
                  <button className="btn btn-primary" onClick={saveEdit} disabled={saving}>{saving ? '⏳ Saving...' : '💾 Save Changes'}</button>
                </div>
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
