'use client';
import { useState, useEffect } from 'react';
import TopNav from '../../../components/TopNav';
import { useConfirm } from '../../../components/ConfirmModal';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
function getToken() { return typeof window !== 'undefined' ? localStorage.getItem('superadmin_token') || '' : ''; }

interface LabTest {
  id: number; name: string; description: string; status: boolean; default_view?: boolean; cost?: number; cpt_code?: string;
  show_collected_date?: boolean; show_collected_time?: boolean; show_received_date?: boolean; show_received_time?: boolean;
  show_reported_date?: boolean; show_reported_time?: boolean; show_regulation?: boolean; show_specimen?: boolean;
  show_final_result?: boolean; show_test_remark?: boolean; show_final_remark?: boolean; show_final_result_disposition?: boolean;
  show_expire_date?: boolean; show_date_administered?: boolean; show_applied_to?: boolean; show_lot?: boolean;
  show_test_date?: boolean; show_test_time?: boolean; show_test_performed_by?: boolean; show_reason_for_test?: boolean;
  show_report_status?: boolean; show_fasting?: boolean; show_requisition_no?: boolean; show_device_identifier?: boolean;
  show_date_read?: boolean; show_mm_indurations?: boolean; show_follow_up?: boolean;
}
interface SpecimenType { id: number; name: string; }
interface SpecimenTypeMapping { id: number; specimen_type_id: number; lab_test_id: number; specimen_type?: string; lab_test?: string; }
interface ReportQuestion { id: number; question_text: string; answer_type: number; answer_option?: string; status?: boolean; }
interface ResultParam { id: number; name: string; label: string; placeholder: string; input_type: number; input_option?: string; unit_text?: string; status?: boolean; }

type View = 'list' | 'form' | 'specimen' | 'question' | 'result';

const emptyForm = {
  name: '', description: '', cost: '', cpt_code: '',
  show_collected_date: false, show_collected_time: false, show_received_date: false, show_received_time: false,
  show_reported_date: false, show_reported_time: false, show_regulation: false, show_specimen: false,
  show_final_result: false, show_test_remark: false, show_final_remark: false, show_final_result_disposition: false,
  show_expire_date: false, show_date_administered: false, show_applied_to: false, show_lot: false,
  show_test_date: false, show_test_time: false, show_test_performed_by: false, show_reason_for_test: false,
  show_report_status: false, show_fasting: false, show_requisition_no: false, show_device_identifier: false,
  show_date_read: false, show_mm_indurations: false, show_follow_up: false,
};

const CHECKBOX_FIELDS = [
  ['show_collected_date', 'Show Collected Date'], ['show_collected_time', 'Show Collected Time'],
  ['show_received_date', 'Show Received Date'], ['show_received_time', 'Show Received Time'],
  ['show_reported_date', 'Show Reported Date'], ['show_reported_time', 'Show Reported Time'],
  ['show_regulation', 'Show Regulation'], ['show_specimen', 'Show Specimen Type'],
  ['show_final_result', 'Show Final Result'], ['show_test_remark', 'Show Test Remark'],
  ['show_final_remark', 'Show Final Remark'], ['show_final_result_disposition', 'Show Final Result Disposition'],
  ['show_expire_date', 'Show Expiry Date'], ['show_date_administered', 'Show Date Administered'],
  ['show_applied_to', 'Show Applied To'], ['show_lot', 'Show Lot'],
  ['show_test_date', 'Show Test Date'], ['show_test_time', 'Show Test Time'],
  ['show_test_performed_by', 'Show Test Perform By'], ['show_reason_for_test', 'Show Reason for Test'],
  ['show_report_status', 'Show Report Status'], ['show_fasting', 'Show Fasting'],
  ['show_requisition_no', 'Show Requisition No.'], ['show_device_identifier', 'Show Device Identifier'],
  ['show_date_read', 'Show Date Read'], ['show_mm_indurations', 'Show mm Indurations'],
  ['show_follow_up', 'Show Follow Up'],
];

export default function LabTestCategoryPage() {
  const confirmDialog = useConfirm();
  const [tests, setTests] = useState<LabTest[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<View>('list');
  const [selectedTest, setSelectedTest] = useState<LabTest | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<Record<string, string | boolean>>({ ...emptyForm });
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [search, setSearch] = useState('');

  // Specimen Type Mapping
  const [specimenTypes, setSpecimenTypes] = useState<SpecimenType[]>([]);
  const [specimenMappings, setSpecimenMappings] = useState<SpecimenTypeMapping[]>([]);
  const [specimenForm, setSpecimenForm] = useState({ specimen_type_id: '' });

  // Report Questions
  const [questions, setQuestions] = useState<ReportQuestion[]>([]);
  const [questionForm, setQuestionForm] = useState({ question_text: '', answer_type: '1', answer_option: '' });
  const [editingQId, setEditingQId] = useState<number | null>(null);

  // Result Parameters
  const [resultParams, setResultParams] = useState<ResultParam[]>([]);
  const [resultForm, setResultForm] = useState({ name: '', label: '', placeholder: '', input_type: '1', input_option: '', unit_text: 'ng/mL' });
  const [editingRId, setEditingRId] = useState<number | null>(null);

  const loadTests = () => {
    setLoading(true);
    fetch(`${API}/api/LabTests`, { headers: { token: getToken() } })
      .then(r => r.json())
      .then(d => { if (d.response_code === '200') setTests(d.obj || []); })
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadTests(); }, []);

  const [isReadOnly, setIsReadOnly] = useState(false);
  
  const openAdd = () => { setEditingId(null); setForm({ ...emptyForm }); setMsg(null); setIsReadOnly(false); setView('form'); };
  const openEdit = (t: LabTest) => {
    setEditingId(t.id);
    setForm({ ...emptyForm, ...t as unknown as Record<string, string | boolean> });
    setIsReadOnly(!!t.default_view);
    setMsg(null); setView('form');
  };
  const save = async () => {
    if (!form.name) { setMsg({ type: 'error', text: 'Name is required.' }); return; }
    setSaving(true); setMsg(null);
    const method = editingId ? 'PUT' : 'POST';
    const url = `${API}/api/LabTests${editingId ? `/${editingId}` : ''}`;
    const res = await fetch(url, {
      method, headers: { 'Content-Type': 'application/json', token: getToken() },
      body: JSON.stringify({ ...form, status: true, deleted: false })
    });
    const d = await res.json();
    setSaving(false);
    if (d.response_code === '200') { setView('list'); loadTests(); }
    else { setMsg({ type: 'error', text: typeof d.obj === 'string' ? d.obj : JSON.stringify(d.obj) }); }
  };
  const remove = async (id: number) => {
    const ok = await confirmDialog({
      title: 'You are trying to delete Lab Test, Please confirm',
      message: 'This cannot be restored once deleted.',
      cancelText: 'NO, WAIT!',
      confirmText: 'CONFIRM DELETION',
    });
    if (!ok) return;
    await fetch(`${API}/api/LabTests/${id}`, { method: 'DELETE', headers: { token: getToken() } });
    loadTests();
  };
  const toggleStatus = async (t: LabTest) => {
    await fetch(`${API}/api/LabTests/${t.id}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json', token: getToken() },
      body: JSON.stringify({ status: !t.status })
    });
    loadTests();
  };

  // ── Specimen Type Mapping ──────────────────────────────────────────────────
  const openSpecimen = async (t: LabTest) => {
    setSelectedTest(t);
    const [spRes, mapRes] = await Promise.all([
      fetch(`${API}/api/SpecimenType`, { headers: { token: getToken() } }),
      fetch(`${API}/api/SpecimenTypeDrugLinking?lab_test_id=${t.id}`, { headers: { token: getToken() } })
    ]);
    const [spD, mapD] = await Promise.all([spRes.json(), mapRes.json()]);
    
    const allSpecimens = spD.response_code === '200' ? spD.obj : [];
    const mappings = mapD.response_code === '200' ? mapD.obj : [];
    
    // Use specimen_type_name from JOIN in the backend
    const enrichedMappings = mappings.map((m: any) => ({
      ...m,
      specimen_type: m.specimen_type_name || m.specimen_type_id
    }));

    setSpecimenTypes(allSpecimens);
    setSpecimenMappings(enrichedMappings);
    setSpecimenForm({ specimen_type_id: '' });
    setView('specimen');
  };
  const saveSpecimen = async () => {
    if (!specimenForm.specimen_type_id) return;
    await fetch(`${API}/api/SpecimenTypeDrugLinking`, {
      method: 'POST', headers: { 'Content-Type': 'application/json', token: getToken() },
      body: JSON.stringify({ lab_test_id: selectedTest?.id, specimen_type_id: specimenForm.specimen_type_id })
    });
    if (selectedTest) openSpecimen(selectedTest);
  };
  const deleteSpecimen = async (id: number) => {
    const ok = await confirmDialog({
      title: 'You are trying to delete Specimen Type link, Please confirm',
      message: 'This cannot be restored once deleted.',
      cancelText: 'NO, WAIT!',
      confirmText: 'CONFIRM DELETION',
    });
    if (!ok) return;
    await fetch(`${API}/api/SpecimenTypeDrugLinking/${id}`, { method: 'DELETE', headers: { token: getToken() } });
    if (selectedTest) openSpecimen(selectedTest);
  };

  // ── Report Questions ───────────────────────────────────────────────────────
  const openQuestions = async (t: LabTest) => {
    setSelectedTest(t);
    const res = await fetch(`${API}/api/ReportQuestions?lab_test_id=${t.id}`, { headers: { token: getToken() } });
    const d = await res.json();
    setQuestions(d.response_code === '200' ? d.obj : []);
    setQuestionForm({ question_text: '', answer_type: '1', answer_option: '' });
    setEditingQId(null);
    setView('question');
  };
  const saveQuestion = async () => {
    if (!questionForm.question_text) return;
    const method = editingQId ? 'PUT' : 'POST';
    const url = `${API}/api/ReportQuestions${editingQId ? `/${editingQId}` : ''}`;
    await fetch(url, {
      method, headers: { 'Content-Type': 'application/json', token: getToken() },
      body: JSON.stringify({ ...questionForm, lab_test_id: selectedTest?.id })
    });
    setQuestionForm({ question_text: '', answer_type: '1', answer_option: '' });
    setEditingQId(null);
    if (selectedTest) openQuestions(selectedTest);
  };
  const deleteQuestion = async (id: number) => {
    const ok = await confirmDialog({
      title: 'You are trying to delete Question, Please confirm',
      message: 'This cannot be restored once deleted.',
      cancelText: 'NO, WAIT!',
      confirmText: 'CONFIRM DELETION',
    });
    if (!ok) return;
    await fetch(`${API}/api/ReportQuestions/${id}`, { method: 'DELETE', headers: { token: getToken() } });
    if (selectedTest) openQuestions(selectedTest);
  };

  // ── Result Parameters ──────────────────────────────────────────────────────
  const openResultParams = async (t: LabTest) => {
    setSelectedTest(t);
    const res = await fetch(`${API}/api/ReportRequestParameters?lab_test_id=${t.id}`, { headers: { token: getToken() } });
    const d = await res.json();
    setResultParams(d.response_code === '200' ? d.obj : []);
    setResultForm({ name: '', label: '', placeholder: '', input_type: '1', input_option: '', unit_text: 'ng/mL' });
    setEditingRId(null);
    setView('result');
  };
  const saveResult = async () => {
    if (!resultForm.name) return;
    const method = editingRId ? 'PUT' : 'POST';
    const url = `${API}/api/ReportRequestParameters${editingRId ? `/${editingRId}` : ''}`;
    await fetch(url, {
      method, headers: { 'Content-Type': 'application/json', token: getToken() },
      body: JSON.stringify({ ...resultForm, lab_test_id: selectedTest?.id })
    });
    setResultForm({ name: '', label: '', placeholder: '', input_type: '1', input_option: '', unit_text: 'ng/mL' });
    setEditingRId(null);
    if (selectedTest) openResultParams(selectedTest);
  };
  const deleteResult = async (id: number) => {
    const ok = await confirmDialog({
      title: 'You are trying to delete Parameter, Please confirm',
      message: 'This cannot be restored once deleted.',
      cancelText: 'NO, WAIT!',
      confirmText: 'CONFIRM DELETION',
    });
    if (!ok) return;
    await fetch(`${API}/api/ReportRequestParameters/${id}`, { method: 'DELETE', headers: { token: getToken() } });
    if (selectedTest) openResultParams(selectedTest);
  };

  const filtered = tests.filter(t => !search || t.name?.toLowerCase().includes(search.toLowerCase()));
  const answerTypeLabel = (t: number) => ({ 1: 'Yes - No', 2: 'CheckBox', 3: 'Integer', 4: 'Alphabet', 5: 'Dropdown' }[t] || '—');

  // ════════════════════════════════════════════════════════════════════════════
  // View: FORM
  // ════════════════════════════════════════════════════════════════════════════
  if (view === 'form') {
    return (
      <div className="page-content">
        <TopNav title="Lab Test Type Detail">
          <button className="btn btn-ghost" onClick={() => setView('list')}>✕ Close</button>
        </TopNav>
        <div style={{ padding: '1.5rem' }}>
          {msg && <div style={{ background: msg.type === 'success' ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)', border: `1px solid ${msg.type === 'success' ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)'}`, borderRadius: 8, padding: '0.75rem 1rem', marginBottom: '1rem', fontSize: '0.875rem', color: msg.type === 'success' ? '#10b981' : '#ef4444' }}>{msg.text}</div>}
          <div className="card">
            <div className="card-header"><span className="card-title">{isReadOnly ? '👁 View Lab Test Type' : editingId ? '✏️ Edit Lab Test Type' : '➕ Add Lab Test Type'}</span></div>
            <div className="card-body">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
                <div className="form-group" style={{ gridColumn: 'span 3' }}>
                  <label>Name <span style={{ color: '#ef4444' }}>*</span></label>
                  <input type="text" placeholder="Enter Name" disabled={isReadOnly} value={form.name as string} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} />
                </div>
                <div className="form-group" style={{ gridColumn: 'span 3' }}>
                  <label>Description</label>
                  <textarea rows={3} placeholder="Enter Description" disabled={isReadOnly} value={form.description as string} onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
                    style={{ width: '100%', background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: 6, padding: '0.5rem', color: 'var(--text)', resize: 'vertical' }} />
                </div>
                <div className="form-group">
                  <label>Cost ($)</label>
                  <input type="number" placeholder="Enter Cost" disabled={isReadOnly} value={form.cost as string} onChange={e => setForm(p => ({ ...p, cost: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label>CPT Code</label>
                  <input type="text" placeholder="Enter CPT Code" disabled={isReadOnly} value={form.cpt_code as string} onChange={e => setForm(p => ({ ...p, cpt_code: e.target.value }))} />
                </div>
              </div>

              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ fontWeight: 600, display: 'block', marginBottom: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontSize: '0.75rem', letterSpacing: '0.05em' }}>
                  Report Display Options
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem' }}>
                  {CHECKBOX_FIELDS.map(([k, l]) => (
                    <label key={k} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', cursor: isReadOnly ? 'default' : 'pointer' }}>
                      <input type="checkbox" checked={!!form[k]} disabled={isReadOnly}
                        onChange={e => setForm(p => ({ ...p, [k]: e.target.checked }))}
                        style={{ width: 16, height: 16, cursor: isReadOnly ? 'default' : 'pointer', accentColor: '#6366f1' }} />
                      {l}
                    </label>
                  ))}
                </div>
              </div>

              <div style={{ display: 'flex', gap: '0.75rem' }}>
                {!isReadOnly && <button className="btn btn-primary" onClick={save} disabled={saving}>{saving ? '⏳ Saving...' : '💾 Save'}</button>}
                {!isReadOnly && <button className="btn btn-ghost" onClick={() => { setForm({ ...emptyForm }); setMsg(null); }}>🔄 Reset Data</button>}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ════════════════════════════════════════════════════════════════════════════
  // View: SPECIMEN TYPE MAPPING
  // ════════════════════════════════════════════════════════════════════════════
  if (view === 'specimen') {
    return (
      <div className="page-content">
        <TopNav title={`Specimen Types — ${selectedTest?.name || ''}`}>
          <button className="btn btn-ghost" onClick={() => setView('list')}>✕ Close</button>
        </TopNav>
        <div style={{ padding: '1.5rem', display: 'grid', gridTemplateColumns: '360px 1fr', gap: '1.5rem', alignItems: 'start' }}>
          <div className="card">
            <div className="card-header"><span className="card-title">Link Specimen Type Detail</span></div>
            <div className="card-body">
              <div className="form-group">
                <label>Specimen Type <span style={{ color: '#ef4444' }}>*</span></label>
                <select value={specimenForm.specimen_type_id} onChange={e => setSpecimenForm(p => ({ ...p, specimen_type_id: e.target.value }))}
                  style={{ width: '100%', background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: 6, padding: '0.5rem', color: 'var(--text)' }}>
                  <option value="">Select Specimen Type</option>
                  {specimenTypes.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem' }}>
                <button className="btn btn-primary" onClick={saveSpecimen}>💾 Save</button>
                <button className="btn btn-ghost" onClick={() => setSpecimenForm({ specimen_type_id: '' })}>🔄 Reset</button>
              </div>
            </div>
          </div>
          <div className="card">
            <div className="card-header"><span className="card-title">Linked Specimen Types for &quot;{selectedTest?.name}&quot;</span></div>
            <div className="card-body" style={{ padding: 0 }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                <thead><tr style={{ borderBottom: '1px solid var(--border)' }}>
                  {['Specimen Type', 'Lab Test', 'Actions'].map(h => <th key={h} style={{ padding: '0.75rem 1rem', textAlign: 'left', color: 'var(--text-muted)' }}>{h}</th>)}
                </tr></thead>
                <tbody>
                  {specimenMappings.map(m => (
                    <tr key={m.id} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td style={{ padding: '0.75rem 1rem' }}>{m.specimen_type || m.specimen_type_id}</td>
                      <td style={{ padding: '0.75rem 1rem' }}>{m.lab_test || selectedTest?.name}</td>
                      <td style={{ padding: '0.75rem 1rem' }}><button className="btn btn-ghost" style={{ fontSize: '0.75rem', color: '#ef4444' }} onClick={() => deleteSpecimen(m.id)}>🗑 Delete</button></td>
                    </tr>
                  ))}
                  {specimenMappings.length === 0 && <tr><td colSpan={3} style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>No specimen types linked.</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ════════════════════════════════════════════════════════════════════════════
  // View: REPORT QUESTIONS
  // ════════════════════════════════════════════════════════════════════════════
  if (view === 'question') {
    return (
      <div className="page-content">
        <TopNav title={`Test Report Questions — ${selectedTest?.name || ''}`}>
          <button className="btn btn-ghost" onClick={() => setView('list')}>✕ Close</button>
        </TopNav>
        <div style={{ padding: '1.5rem', display: 'grid', gridTemplateColumns: '380px 1fr', gap: '1.5rem', alignItems: 'start' }}>
          <div className="card">
            <div className="card-header"><span className="card-title">Test Report Question Detail</span></div>
            <div className="card-body">
              <div className="form-group"><label>Question <span style={{ color: '#ef4444' }}>*</span></label>
                <textarea rows={3} placeholder="Enter Question" value={questionForm.question_text}
                  onChange={e => setQuestionForm(p => ({ ...p, question_text: e.target.value }))}
                  style={{ width: '100%', background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: 6, padding: '0.5rem', color: 'var(--text)' }} />
              </div>
              <div className="form-group"><label>Answer Type <span style={{ color: '#ef4444' }}>*</span></label>
                <select value={questionForm.answer_type} onChange={e => setQuestionForm(p => ({ ...p, answer_type: e.target.value }))}
                  style={{ width: '100%', background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: 6, padding: '0.5rem', color: 'var(--text)' }}>
                  <option value="1">Yes - No</option><option value="2">CheckBox</option>
                  <option value="3">Integer</option><option value="4">Alphabet</option><option value="5">Dropdown</option>
                </select>
              </div>
              {questionForm.answer_type === '5' && (
                <div className="form-group"><label>Dropdown Values (Comma Separated)</label>
                  <input type="text" placeholder="Enter values" value={questionForm.answer_option}
                    onChange={e => setQuestionForm(p => ({ ...p, answer_option: e.target.value }))} />
                </div>
              )}
              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem' }}>
                <button className="btn btn-primary" onClick={saveQuestion}>💾 Save</button>
                <button className="btn btn-ghost" onClick={() => { setQuestionForm({ question_text: '', answer_type: '1', answer_option: '' }); setEditingQId(null); }}>🔄 Reset</button>
              </div>
            </div>
          </div>
          <div className="card">
            <div className="card-header"><span className="card-title">List of Test Report Questions for &quot;{selectedTest?.name}&quot;</span></div>
            <div className="card-body" style={{ padding: 0 }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                <thead><tr style={{ borderBottom: '1px solid var(--border)' }}>
                  {['Question', 'Answer Type', 'Actions'].map(h => <th key={h} style={{ padding: '0.75rem 1rem', textAlign: 'left', color: 'var(--text-muted)' }}>{h}</th>)}
                </tr></thead>
                <tbody>
                  {questions.map(q => (
                    <tr key={q.id} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td style={{ padding: '0.75rem 1rem' }}>{q.question_text}</td>
                      <td style={{ padding: '0.75rem 1rem' }}>{answerTypeLabel(q.answer_type)}</td>
                      <td style={{ padding: '0.75rem 1rem' }}>
                        <button className="btn btn-ghost" style={{ fontSize: '0.75rem', marginRight: '0.5rem' }} onClick={() => { setQuestionForm({ question_text: q.question_text, answer_type: String(q.answer_type), answer_option: q.answer_option || '' }); setEditingQId(q.id); }}>✏️</button>
                        <button className="btn btn-ghost" style={{ fontSize: '0.75rem', color: '#ef4444' }} onClick={() => deleteQuestion(q.id)}>🗑</button>
                      </td>
                    </tr>
                  ))}
                  {questions.length === 0 && <tr><td colSpan={3} style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>No questions found.</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ════════════════════════════════════════════════════════════════════════════
  // View: RESULT PARAMETERS
  // ════════════════════════════════════════════════════════════════════════════
  if (view === 'result') {
    return (
      <div className="page-content">
        <TopNav title={`Test Result Parameters — ${selectedTest?.name || ''}`}>
          <button className="btn btn-ghost" onClick={() => setView('list')}>✕ Close</button>
        </TopNav>
        <div style={{ padding: '1.5rem', display: 'grid', gridTemplateColumns: '400px 1fr', gap: '1.5rem', alignItems: 'start' }}>
          <div className="card">
            <div className="card-header"><span className="card-title">Test Result Parameter Detail</span></div>
            <div className="card-body">
              {[['name', 'Name'], ['label', 'Label'], ['placeholder', 'Placeholder']].map(([k, l]) => (
                <div key={k} className="form-group"><label>{l} <span style={{ color: '#ef4444' }}>*</span></label>
                  <input type="text" placeholder={`Enter ${l}`} value={(resultForm as Record<string, string>)[k]}
                    onChange={e => setResultForm(p => ({ ...p, [k]: e.target.value }))} />
                </div>
              ))}
              <div className="form-group"><label>Input Type</label>
                <select value={resultForm.input_type} onChange={e => setResultForm(p => ({ ...p, input_type: e.target.value }))}
                  style={{ width: '100%', background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: 6, padding: '0.5rem', color: 'var(--text)' }}>
                  <option value="1">Textbox (Numeric)</option><option value="2">Dropdown</option>
                </select>
              </div>
              {resultForm.input_type === '2' && (
                <div className="form-group"><label>Dropdown Values (Comma Separated)</label>
                  <input type="text" placeholder="e.g. Negative,Positive" value={resultForm.input_option}
                    onChange={e => setResultForm(p => ({ ...p, input_option: e.target.value }))} />
                </div>
              )}
              <div className="form-group"><label>Unit Text <span style={{ color: '#ef4444' }}>*</span></label>
                <select value={resultForm.unit_text} onChange={e => setResultForm(p => ({ ...p, unit_text: e.target.value }))}
                  style={{ width: '100%', background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: 6, padding: '0.5rem', color: 'var(--text)' }}>
                  <option value="ng/mL">ng/mL</option><option value="Quant">Quant</option>
                </select>
              </div>
              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem' }}>
                <button className="btn btn-primary" onClick={saveResult}>💾 Save</button>
                <button className="btn btn-ghost" onClick={() => { setResultForm({ name: '', label: '', placeholder: '', input_type: '1', input_option: '', unit_text: 'ng/mL' }); setEditingRId(null); }}>🔄 Reset</button>
              </div>
            </div>
          </div>
          <div className="card">
            <div className="card-header"><span className="card-title">List of Result Parameters for &quot;{selectedTest?.name}&quot;</span></div>
            <div className="card-body" style={{ padding: 0 }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                <thead><tr style={{ borderBottom: '1px solid var(--border)' }}>
                  {['Name', 'Label', 'Input Type', 'Unit', 'Actions'].map(h => <th key={h} style={{ padding: '0.75rem 1rem', textAlign: 'left', color: 'var(--text-muted)' }}>{h}</th>)}
                </tr></thead>
                <tbody>
                  {resultParams.map(r => (
                    <tr key={r.id} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td style={{ padding: '0.75rem 1rem' }}>{r.name}</td>
                      <td style={{ padding: '0.75rem 1rem' }}>{r.label}</td>
                      <td style={{ padding: '0.75rem 1rem' }}>{r.input_type === 1 ? 'Textbox (Numeric)' : 'Dropdown'}</td>
                      <td style={{ padding: '0.75rem 1rem' }}>{r.unit_text || '—'}</td>
                      <td style={{ padding: '0.75rem 1rem' }}>
                        <button className="btn btn-ghost" style={{ fontSize: '0.75rem', marginRight: '0.5rem' }} onClick={() => { setResultForm({ name: r.name, label: r.label, placeholder: r.placeholder, input_type: String(r.input_type), input_option: r.input_option || '', unit_text: r.unit_text || 'ng/mL' }); setEditingRId(r.id); }}>✏️</button>
                        <button className="btn btn-ghost" style={{ fontSize: '0.75rem', color: '#ef4444' }} onClick={() => deleteResult(r.id)}>🗑</button>
                      </td>
                    </tr>
                  ))}
                  {resultParams.length === 0 && <tr><td colSpan={5} style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>No parameters found.</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ════════════════════════════════════════════════════════════════════════════
  // View: LIST
  // ════════════════════════════════════════════════════════════════════════════
  return (
    <div className="page-content">
      <TopNav title="Lab Test Categories">
          <input type="text" placeholder="Search tests..." value={search} onChange={e => setSearch(e.target.value)}
            style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, padding: '0.5rem 0.75rem', color: 'var(--text)', fontSize: '0.875rem', width: 220 }} />
          <button className="btn btn-ghost" onClick={loadTests}>🔄 Refresh</button>
          <button className="btn btn-primary" onClick={openAdd}>➕ Add</button>
        </TopNav>
      <div style={{ padding: '1.5rem' }}>
        <div className="card">
          <div className="card-body" style={{ padding: 0 }}>
            {loading ? <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>Loading...</div>
              : filtered.length === 0 ? <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>No Lab Tests found.</div>
              : (
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border)' }}>
                      {['Name', 'Cost', 'CPT Code', 'Configurations', 'Actions'].map(h => (
                        <th key={h} style={{ padding: '0.75rem 1rem', textAlign: 'left', color: 'var(--text-muted)', fontWeight: 600 }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map(t => (
                      <tr key={t.id} style={{ borderBottom: '1px solid var(--border)' }}
                        onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-card-hover)')}
                        onMouseLeave={e => (e.currentTarget.style.background = '')}>
                        <td style={{ padding: '0.75rem 1rem', fontWeight: 500 }}>{t.name}</td>
                        <td style={{ padding: '0.75rem 1rem' }}>{t.cost ? `$${t.cost}` : '—'}</td>
                        <td style={{ padding: '0.75rem 1rem' }}>{t.cpt_code || '—'}</td>
                        <td style={{ padding: '0.75rem 1rem' }}>
                          <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
                            <button title="View Form" className="btn btn-ghost" style={{ fontSize: '0.72rem', padding: '0.2rem 0.5rem', background: 'rgba(47,81,131,0.2)', color: '#2f5183', border: '1px solid rgba(47,81,131,0.3)' }} onClick={() => openEdit(t)}>👁 Form</button>
                            {!t.default_view && <>
                              <button title="Specimen Types" className="btn btn-ghost" style={{ fontSize: '0.72rem', padding: '0.2rem 0.5rem' }} onClick={() => openSpecimen(t)}>🧪 Specimen</button>
                              <button title="Result Parameters" className="btn btn-ghost" style={{ fontSize: '0.72rem', padding: '0.2rem 0.5rem' }} onClick={() => openResultParams(t)}>📋 Params</button>
                              <button title="Report Questions" className="btn btn-ghost" style={{ fontSize: '0.72rem', padding: '0.2rem 0.5rem' }} onClick={() => openQuestions(t)}>❓ Questions</button>
                            </>}
                          </div>
                        </td>
                        <td style={{ padding: '0.75rem 1rem' }}>
                          <div style={{ display: 'flex', gap: '0.35rem' }}>
                            {!t.default_view && <button className="btn btn-ghost" style={{ fontSize: '0.72rem', padding: '0.2rem 0.5rem' }} onClick={() => openEdit(t)}>✏️</button>}
                            <button className="btn btn-ghost" style={{ fontSize: '0.72rem', padding: '0.2rem 0.5rem', color: t.status ? '#10b981' : '#9ca3af' }} onClick={() => toggleStatus(t)}>{t.status ? '🟢' : '🔴'}</button>
                            {!t.default_view && <button className="btn btn-ghost" style={{ fontSize: '0.72rem', padding: '0.2rem 0.5rem', color: '#ef4444' }} onClick={() => remove(t.id)}>🗑</button>}
                          </div>
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
