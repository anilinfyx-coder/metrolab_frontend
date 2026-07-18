'use client';
import { useState, useEffect } from 'react';
import TopNav from '../../../components/TopNav';
import { useConfirm } from '../../../components/ConfirmModal';
import ListingTable, { ActionIcons, ListingColumn, ListingHeaderActions } from '../../../components/ListingTable';

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
interface SpecimenTypeMapping {
  id: number;
  specimen_type_id: number;
  lab_test_id: number;
  specimen_type?: string;
  specimen_type_name?: string;
  lab_test?: string;
  status?: boolean;
}
interface ReportQuestion { id: number; question_text: string; answer_type: number; answer_option?: string; status?: boolean; }
interface ResultParam {
  id: number;
  name: string;
  label: string;
  placeholder: string;
  input_type: number;
  input_option?: string;
  unit_text?: string;
  screening_cutoff?: string;
  confirmation_cutoff?: string;
  description?: string;
  is_mandatory?: boolean;
  status?: boolean;
}

const emptyResultForm = {
  name: '',
  placeholder: '',
  label: '',
  input_type: '2',
  input_option: '',
  unit_text: '',
  screening_cutoff: '',
  confirmation_cutoff: '',
  description: '',
  is_mandatory: false,
};

const UNIT_OPTIONS = ['ng/mL', 'Quant', 'mg/dL', 'pg/mL', '%'];
type ResultForm = typeof emptyResultForm;
type ResultField = keyof ResultForm;
type ResultErrors = Partial<Record<ResultField, string>>;

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

  // Specimen Type Mapping
  const [specimenTypes, setSpecimenTypes] = useState<SpecimenType[]>([]);
  const [specimenMappings, setSpecimenMappings] = useState<SpecimenTypeMapping[]>([]);
  const [specimenForm, setSpecimenForm] = useState({ specimen_type_id: '' });
  const [editingSpecimenId, setEditingSpecimenId] = useState<number | null>(null);
  const [specimenError, setSpecimenError] = useState('');

  // Report Questions
  const [questions, setQuestions] = useState<ReportQuestion[]>([]);
  const [questionForm, setQuestionForm] = useState({ question_text: '', answer_type: '1', answer_option: '' });
  const [editingQId, setEditingQId] = useState<number | null>(null);

  // Result Parameters
  const [resultParams, setResultParams] = useState<ResultParam[]>([]);
  const [resultForm, setResultForm] = useState({ ...emptyResultForm });
  const [editingRId, setEditingRId] = useState<number | null>(null);
  const [resultErrors, setResultErrors] = useState<ResultErrors>({});
  const [savingResult, setSavingResult] = useState(false);

  const loadTests = () => {
    setLoading(true);
    fetch(`${API}/api/LabTests`, { headers: { token: getToken() } })
      .then(r => r.json())
      .then(d => { if (d.response_code === '200') setTests(d.obj || []); })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    void Promise.resolve().then(loadTests);
  }, []);

  const [isReadOnly, setIsReadOnly] = useState(false);
  
  const openAdd = () => { setEditingId(null); setForm({ ...emptyForm }); setMsg(null); setIsReadOnly(false); setView('form'); };
  const openView = (t: LabTest) => {
    setEditingId(t.id);
    setForm({ ...emptyForm, ...t as unknown as Record<string, string | boolean> });
    setIsReadOnly(true);
    setMsg(null);
    setView('form');
  };
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
    const enrichedMappings = mappings.map((m: SpecimenTypeMapping) => ({
      ...m,
      specimen_type: m.specimen_type_name || m.specimen_type_id
    }));

    setSpecimenTypes(allSpecimens);
    setSpecimenMappings(enrichedMappings);
    setSpecimenForm({ specimen_type_id: '' });
    setEditingSpecimenId(null);
    setSpecimenError('');
    setView('specimen');
  };
  const saveSpecimen = async () => {
    if (!specimenForm.specimen_type_id) {
      setSpecimenError('Please select a specimen type.');
      return;
    }
    await fetch(`${API}/api/SpecimenTypeDrugLinking${editingSpecimenId ? `/${editingSpecimenId}` : ''}`, {
      method: editingSpecimenId ? 'PUT' : 'POST',
      headers: { 'Content-Type': 'application/json', token: getToken() },
      body: JSON.stringify({
        lab_test_id: selectedTest?.id,
        specimen_type_id: specimenForm.specimen_type_id,
      })
    });
    if (selectedTest) openSpecimen(selectedTest);
  };
  const editSpecimen = (mapping: SpecimenTypeMapping) => {
    setEditingSpecimenId(mapping.id);
    setSpecimenForm({ specimen_type_id: String(mapping.specimen_type_id) });
    setSpecimenError('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  const toggleSpecimenStatus = async (mapping: SpecimenTypeMapping) => {
    await fetch(`${API}/api/SpecimenTypeDrugLinking/${mapping.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', token: getToken() },
      body: JSON.stringify({ status: !mapping.status }),
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
  const toggleQuestionStatus = async (question: ReportQuestion) => {
    await fetch(`${API}/api/ReportQuestions/${question.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', token: getToken() },
      body: JSON.stringify({ status: question.status === false }),
    });
    if (selectedTest) openQuestions(selectedTest);
  };

  // ── Result Parameters ──────────────────────────────────────────────────────
  const openResultParams = async (t: LabTest) => {
    setSelectedTest(t);
    const res = await fetch(`${API}/api/ReportRequestParameters?lab_test_id=${t.id}`, { headers: { token: getToken() } });
    const d = await res.json();
    setResultParams(d.response_code === '200' ? d.obj : []);
    setResultForm({ ...emptyResultForm });
    setResultErrors({});
    setMsg(null);
    setEditingRId(null);
    setView('result');
  };
  const refreshResultParams = async (successText?: string) => {
    if (!selectedTest) return;
    const res = await fetch(`${API}/api/ReportRequestParameters?lab_test_id=${selectedTest.id}`, { headers: { token: getToken() } });
    const d = await res.json();
    setResultParams(d.response_code === '200' ? d.obj : []);
    if (successText) setMsg({ type: 'success', text: successText });
  };
  const saveResult = async () => {
    const errors: ResultErrors = {};
    if (!resultForm.name.trim()) errors.name = 'Please enter the parameter name.';
    if (!resultForm.placeholder.trim()) errors.placeholder = 'Please enter placeholder text.';
    if (!resultForm.label.trim()) errors.label = 'Please enter the field label.';
    if (!['1', '2'].includes(resultForm.input_type)) errors.input_type = 'Please select a valid input type.';
    if (resultForm.input_type === '2') {
      const options = resultForm.input_option.split(',').map(value => value.trim());
      if (!resultForm.input_option.trim()) {
        errors.input_option = 'Please enter at least one dropdown value.';
      } else if (options.some(value => !value)) {
        errors.input_option = 'Dropdown values must be comma separated without empty values.';
      }
    }
    if (!resultForm.unit_text.trim()) errors.unit_text = 'Please select or enter a unit.';
    if (!resultForm.screening_cutoff.trim()) errors.screening_cutoff = 'Please enter the screening cutoff.';
    if (!resultForm.confirmation_cutoff.trim()) errors.confirmation_cutoff = 'Please enter the confirmation cutoff.';
    if (!resultForm.is_mandatory) errors.is_mandatory = 'Please check Is Mandatory. This field is required.';

    setResultErrors(errors);
    if (Object.keys(errors).length > 0) {
      setMsg({ type: 'error', text: 'Please correct the highlighted fields before saving.' });
      const firstInvalidField = Object.keys(errors)[0];
      window.setTimeout(() => {
        const input = document.querySelector<HTMLElement>(`[data-result-field="${firstInvalidField}"]`);
        input?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        input?.focus();
      }, 0);
      return;
    }

    setSavingResult(true);
    setMsg(null);
    const method = editingRId ? 'PUT' : 'POST';
    const url = `${API}/api/ReportRequestParameters${editingRId ? `/${editingRId}` : ''}`;
    try {
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json', token: getToken() },
        body: JSON.stringify({
          ...resultForm,
          input_option: resultForm.input_type === '2' ? resultForm.input_option.trim() : '',
          input_type: Number(resultForm.input_type),
          lab_test_id: selectedTest?.id,
          status: true,
        }),
      });
      const d = await res.json();
      if (res.ok && d.response_code === '200') {
        const action = editingRId ? 'updated' : 'saved';
        setResultForm({ ...emptyResultForm });
        setResultErrors({});
        setEditingRId(null);
        await refreshResultParams(`Parameter ${action} successfully.`);
      } else {
        setMsg({ type: 'error', text: typeof d.obj === 'string' ? d.obj : 'Unable to save the parameter. Please try again.' });
      }
    } catch {
      setMsg({ type: 'error', text: 'Unable to connect to the server. Please check your connection and try again.' });
    } finally {
      setSavingResult(false);
    }
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
    await refreshResultParams('Parameter deleted successfully.');
  };
  const toggleResultStatus = async (r: ResultParam) => {
    const res = await fetch(`${API}/api/ReportRequestParameters/${r.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', token: getToken() },
      body: JSON.stringify({ status: !r.status }),
    });
    const d = await res.json();
    if (d.response_code === '200') {
      await refreshResultParams(`Parameter ${r.status ? 'disabled' : 'enabled'} successfully.`);
    } else {
      setMsg({ type: 'error', text: typeof d.obj === 'string' ? d.obj : 'Unable to update parameter status.' });
    }
  };

  const answerTypeLabel = (t: number) => ({ 1: 'Yes - No', 2: 'CheckBox', 3: 'Integer', 4: 'Alphabet', 5: 'Dropdown' }[t] || '—');
  const inputTypeLabel = (t: number) => ({ 1: 'Textbox (Numeric)', 2: 'Dropdown' }[t] || '—');

  const loadResultFormFromRow = (r: ResultParam) => {
    setResultForm({
      name: r.name || '',
      placeholder: r.placeholder || '',
      label: r.label || '',
      input_type: String(r.input_type || 2),
      input_option: r.input_option || '',
      unit_text: r.unit_text || '',
      screening_cutoff: r.screening_cutoff || '',
      confirmation_cutoff: r.confirmation_cutoff || '',
      description: r.description || '',
      is_mandatory: !!r.is_mandatory,
    });
    setResultErrors({});
    setMsg(null);
    setEditingRId(r.id);
  };

  // ════════════════════════════════════════════════════════════════════════════
  // View: FORM
  // ════════════════════════════════════════════════════════════════════════════
  if (view === 'form') {
    return (
      <div className="page-content">
        <TopNav title={isReadOnly ? 'Manage Lab Test Category' : 'Lab Test Type Detail'}>
          {!isReadOnly && (
            <button className="btn btn-ghost" onClick={() => setView('list')}>✕ Close</button>
          )}
        </TopNav>
        <div style={{ padding: '1.5rem' }}>
          {msg && <div style={{ background: msg.type === 'success' ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)', border: `1px solid ${msg.type === 'success' ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)'}`, borderRadius: 8, padding: '0.75rem 1rem', marginBottom: '1rem', fontSize: '0.875rem', color: msg.type === 'success' ? '#10b981' : '#ef4444' }}>{msg.text}</div>}
          <div className="card">
            <div
              className="card-header"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '1rem',
              }}
            >
              <span className="card-title">
                {isReadOnly ? String(form.name || 'Lab Test Type') : editingId ? '✏️ Edit Lab Test Type' : '➕ Add Lab Test Type'}
              </span>
              {isReadOnly && (
                <button type="button" className="listing-header-link" onClick={() => setView('list')}>
                  Close
                </button>
              )}
            </div>
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
    const specimenColumns: ListingColumn<SpecimenTypeMapping>[] = [
      {
        key: 'specimen_type',
        label: 'Specimen Type',
        width: '42%',
        getValue: mapping => mapping.specimen_type || mapping.specimen_type_id,
        render: mapping => mapping.specimen_type || mapping.specimen_type_id,
      },
      {
        key: 'lab_test',
        label: 'Lab Test',
        width: '38%',
        getValue: mapping => mapping.lab_test || selectedTest?.name || '',
        render: mapping => mapping.lab_test || selectedTest?.name || '—',
      },
    ];

    return (
      <div className="page-content">
        <TopNav title="Manage Lab Test Category" />
        <div className="labtest-specimen-split" style={{ padding: '1.5rem' }}>
          <div className="card">
            <div className="card-header">
              <span className="card-title">
                {editingSpecimenId ? 'Edit Link Specimen Type Detail' : 'Link Specimen Type Detail'}
              </span>
            </div>
            <div className="card-body">
              <div className="form-group">
                <label>Specimen Type <span style={{ color: '#ef4444' }}>*</span></label>
                <select
                  value={specimenForm.specimen_type_id}
                  aria-invalid={!!specimenError}
                  onChange={e => {
                    setSpecimenForm({ specimen_type_id: e.target.value });
                    if (specimenError) setSpecimenError('');
                  }}
                  style={{
                    width: '100%',
                    background: 'var(--bg-input)',
                    border: `1px solid ${specimenError ? '#ef4444' : 'var(--border)'}`,
                    borderRadius: 6,
                    padding: '0.5rem',
                    color: 'var(--text)',
                  }}
                >
                  <option value="">Select Specimen Type</option>
                  {specimenTypes.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
                {specimenError && (
                  <div role="alert" style={{ color: '#ef4444', fontSize: '0.78rem', marginTop: '0.35rem', fontWeight: 500 }}>
                    {specimenError}
                  </div>
                )}
              </div>
            </div>
            <div className="labtest-specimen-form-actions">
              <button className="btn btn-primary" onClick={saveSpecimen}>Save</button>
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => {
                  setSpecimenForm({ specimen_type_id: '' });
                  setEditingSpecimenId(null);
                  setSpecimenError('');
                }}
              >
                Reset Data
              </button>
            </div>
          </div>

          <ListingTable
            title={`List of Link Specimen Types for ("${selectedTest?.name || ''}")`}
            columns={specimenColumns}
            rows={specimenMappings}
            emptyText="No specimen types linked."
            headerActions={(
              <button type="button" className="listing-header-link" onClick={() => setView('list')}>
                Close
              </button>
            )}
            actionsLabel="Actions"
            actionsWidth={150}
            defaultPageSize={10}
            rowActions={mapping => (
              <ActionIcons
                onEdit={() => editSpecimen(mapping)}
                onToggleStatus={() => toggleSpecimenStatus(mapping)}
                onDelete={() => deleteSpecimen(mapping.id)}
                statusActive={mapping.status !== false}
                editTitle="Edit Specimen Type Link"
                deleteTitle="Delete Specimen Type Link"
              />
            )}
          />
        </div>
      </div>
    );
  }

  // ════════════════════════════════════════════════════════════════════════════
  // View: REPORT QUESTIONS
  // ════════════════════════════════════════════════════════════════════════════
  if (view === 'question') {
    const questionColumns: ListingColumn<ReportQuestion>[] = [
      {
        key: 'question_text',
        label: 'Questions',
        width: '48%',
        getValue: question => question.question_text || '',
      },
      {
        key: 'answer_type',
        label: 'Answer Type',
        width: '32%',
        getValue: question => answerTypeLabel(question.answer_type),
        render: question => answerTypeLabel(question.answer_type),
      },
    ];

    return (
      <div className="page-content">
        <TopNav title="Manage Lab Test Category" />
        <div className="labtest-question-split" style={{ padding: '1.5rem' }}>
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
            </div>
            <div className="labtest-question-form-actions">
              <button className="btn btn-primary" onClick={saveQuestion}>Save</button>
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => {
                  setQuestionForm({ question_text: '', answer_type: '1', answer_option: '' });
                  setEditingQId(null);
                }}
              >
                Reset Data
              </button>
            </div>
          </div>

          <ListingTable
            title={`List of Test Report Questions for ("${selectedTest?.name || ''}")`}
            columns={questionColumns}
            rows={questions}
            emptyText="No questions found."
            headerActions={(
              <button type="button" className="listing-header-link" onClick={() => setView('list')}>
                Close
              </button>
            )}
            actionsLabel="Actions"
            actionsWidth={150}
            defaultPageSize={10}
            rowActions={question => (
              <ActionIcons
                onEdit={() => {
                  setQuestionForm({
                    question_text: question.question_text,
                    answer_type: String(question.answer_type),
                    answer_option: question.answer_option || '',
                  });
                  setEditingQId(question.id);
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                onToggleStatus={() => toggleQuestionStatus(question)}
                onDelete={() => deleteQuestion(question.id)}
                statusActive={question.status !== false}
                editTitle="Edit Question"
                deleteTitle="Delete Question"
              />
            )}
          />
        </div>
      </div>
    );
  }

  // ════════════════════════════════════════════════════════════════════════════
  // View: RESULT PARAMETERS
  // ════════════════════════════════════════════════════════════════════════════
  if (view === 'result') {
    const fieldStyle = { width: '100%', background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: 6, padding: '0.5rem', color: 'var(--text)' };
    const updateResultField = <K extends ResultField>(field: K, value: ResultForm[K]) => {
      setResultForm(previous => ({ ...previous, [field]: value }));
      setResultErrors(previous => {
        if (!previous[field]) return previous;
        const next = { ...previous };
        delete next[field];
        return next;
      });
      if (msg?.type === 'error') setMsg(null);
    };
    const resultFieldStyle = (field: ResultField) => ({
      ...fieldStyle,
      borderColor: resultErrors[field] ? '#ef4444' : 'var(--border)',
      boxShadow: resultErrors[field] ? '0 0 0 1px rgba(239,68,68,0.15)' : 'none',
    });
    const errorMessage = (field: ResultField) => resultErrors[field] ? (
      <div role="alert" style={{ color: '#ef4444', fontSize: '0.78rem', marginTop: '0.35rem', fontWeight: 500 }}>
        {resultErrors[field]}
      </div>
    ) : null;
    const resetResultForm = () => {
      setResultForm({ ...emptyResultForm });
      setResultErrors({});
      setEditingRId(null);
      setMsg(null);
    };

    return (
      <div className="page-content">
        <TopNav title={`Lab Test Type Params — ${selectedTest?.name || ''}`}>
          <button className="btn btn-ghost" onClick={() => setView('list')}>✕ Close</button>
        </TopNav>
        {msg && (
          <div role="alert" aria-live="assertive" style={{ position: 'sticky', top: 8, zIndex: 20, margin: '1rem 1.5rem 0', background: msg.type === 'success' ? '#ecfdf5' : '#fef2f2', border: `1px solid ${msg.type === 'success' ? '#10b981' : '#ef4444'}`, borderRadius: 8, padding: '0.85rem 1rem', fontSize: '0.875rem', color: msg.type === 'success' ? '#047857' : '#b91c1c', fontWeight: 600, boxShadow: '0 4px 12px rgba(0,0,0,0.12)' }}>
            {msg.type === 'success' ? '✓ ' : '⚠ '}{msg.text}
          </div>
        )}
        <div style={{ padding: '1.5rem', display: 'grid', gridTemplateColumns: '400px 1fr', gap: '1.5rem', alignItems: 'start' }}>
          <div className="card">
            <div className="card-header"><span className="card-title">Lab Test Type Params</span></div>
            <div className="card-body">
              <div className="form-group">
                <label>Name <span style={{ color: '#ef4444' }}>*</span></label>
                <input type="text" placeholder="Enter Name" value={resultForm.name} data-result-field="name"
                  aria-invalid={!!resultErrors.name} onChange={e => updateResultField('name', e.target.value)} style={resultFieldStyle('name')} />
                {errorMessage('name')}
              </div>
              <div className="form-group">
                <label>Placeholder <span style={{ color: '#ef4444' }}>*</span></label>
                <input type="text" placeholder="Enter Placeholder" value={resultForm.placeholder} data-result-field="placeholder"
                  aria-invalid={!!resultErrors.placeholder} onChange={e => updateResultField('placeholder', e.target.value)} style={resultFieldStyle('placeholder')} />
                {errorMessage('placeholder')}
              </div>
              <div className="form-group">
                <label>Label <span style={{ color: '#ef4444' }}>*</span></label>
                <input type="text" placeholder="Enter Label Name" value={resultForm.label} data-result-field="label"
                  aria-invalid={!!resultErrors.label} onChange={e => updateResultField('label', e.target.value)} style={resultFieldStyle('label')} />
                {errorMessage('label')}
              </div>
              <div className="form-group">
                <label>Input Type</label>
                <select value={resultForm.input_type} data-result-field="input_type" aria-invalid={!!resultErrors.input_type}
                  onChange={e => updateResultField('input_type', e.target.value)} style={resultFieldStyle('input_type')}>
                  <option value="1">Textbox (Numeric)</option>
                  <option value="2">Dropdown</option>
                </select>
                {errorMessage('input_type')}
              </div>
              {resultForm.input_type === '2' && (
                <div className="form-group">
                  <label>Dropdown Values (Comma Separated) <span style={{ color: '#ef4444' }}>*</span></label>
                  <input type="text" placeholder="e.g. Negative, Positive" value={resultForm.input_option} data-result-field="input_option"
                    aria-invalid={!!resultErrors.input_option} onChange={e => updateResultField('input_option', e.target.value)} style={resultFieldStyle('input_option')} />
                  {errorMessage('input_option')}
                </div>
              )}
              <div className="form-group">
                <label>Unit Text <span style={{ color: '#ef4444' }}>*</span></label>
                <select
                  value={UNIT_OPTIONS.includes(resultForm.unit_text) ? resultForm.unit_text : ''}
                  onChange={e => updateResultField('unit_text', e.target.value)}
                  aria-invalid={!!resultErrors.unit_text}
                  style={{ ...resultFieldStyle('unit_text'), marginBottom: '0.5rem' }}
                >
                  <option value="">Select Unit</option>
                  {UNIT_OPTIONS.map(u => <option key={u} value={u}>{u}</option>)}
                </select>
                <input type="text" placeholder="Enter Unit Text" value={resultForm.unit_text} data-result-field="unit_text"
                  aria-invalid={!!resultErrors.unit_text} onChange={e => updateResultField('unit_text', e.target.value)} style={resultFieldStyle('unit_text')} />
                {errorMessage('unit_text')}
              </div>
              <div className="form-group">
                <label>Screening Cutoff <span style={{ color: '#ef4444' }}>*</span></label>
                <input type="text" placeholder="Enter Screening Cutoff" value={resultForm.screening_cutoff} data-result-field="screening_cutoff"
                  aria-invalid={!!resultErrors.screening_cutoff} onChange={e => updateResultField('screening_cutoff', e.target.value)} style={resultFieldStyle('screening_cutoff')} />
                {errorMessage('screening_cutoff')}
              </div>
              <div className="form-group">
                <label>Confirmation Cutoff <span style={{ color: '#ef4444' }}>*</span></label>
                <input type="text" placeholder="Enter Confirmation Cutoff" value={resultForm.confirmation_cutoff} data-result-field="confirmation_cutoff"
                  aria-invalid={!!resultErrors.confirmation_cutoff} onChange={e => updateResultField('confirmation_cutoff', e.target.value)} style={resultFieldStyle('confirmation_cutoff')} />
                {errorMessage('confirmation_cutoff')}
              </div>
              <div className="form-group">
                <label>Description</label>
                <textarea rows={3} value={resultForm.description}
                  onChange={e => setResultForm(p => ({ ...p, description: e.target.value }))}
                  style={{ ...fieldStyle, resize: 'vertical', fontFamily: 'inherit' }} />
              </div>
              <div className="form-group">
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', color: resultErrors.is_mandatory ? '#b91c1c' : undefined }}>
                  <input
                    type="checkbox"
                    checked={resultForm.is_mandatory}
                    data-result-field="is_mandatory"
                    aria-invalid={!!resultErrors.is_mandatory}
                    onChange={e => updateResultField('is_mandatory', e.target.checked)}
                    style={{ width: 16, height: 16, cursor: 'pointer', outline: resultErrors.is_mandatory ? '2px solid #ef4444' : undefined }}
                  />
                  Is Mandatory <span style={{ color: '#ef4444' }}>*</span>
                </label>
                {errorMessage('is_mandatory')}
              </div>
              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem' }}>
                <button className="btn btn-primary" onClick={saveResult} disabled={savingResult}>
                  {savingResult ? '⏳ Saving...' : '💾 Save'}
                </button>
                <button className="btn btn-ghost" onClick={resetResultForm} disabled={savingResult}>🔄 Reset</button>
              </div>
            </div>
          </div>
          <ListingTable
            title={`List of Result Parameters for "${selectedTest?.name || ''}"`}
            columns={([
              {
                key: 'name',
                label: 'Name',
                sortable: true,
                filterable: true,
                width: '22%',
                getValue: (r) => r.name || '',
              },
              {
                key: 'label',
                label: 'Label',
                sortable: true,
                filterable: true,
                width: '22%',
                getValue: (r) => r.label || '',
              },
              {
                key: 'input_type',
                label: 'Input Type',
                sortable: true,
                filterable: true,
                width: '22%',
                getValue: (r) => inputTypeLabel(r.input_type),
                render: (r) => inputTypeLabel(r.input_type),
              },
              {
                key: 'unit_text',
                label: 'Unit',
                sortable: true,
                filterable: true,
                width: '16%',
                getValue: (r) => r.unit_text || '',
                render: (r) => r.unit_text || '—',
              },
            ] as ListingColumn<ResultParam>[])}
            rows={resultParams}
            showTotal
            emptyText="No parameters found."
            actionsLabel="Actions"
            actionsWidth={120}
            defaultPageSize={10}
            rowActions={(r) => (
              <ActionIcons
                editTitle="Edit"
                deleteTitle="Delete"
                onEdit={() => loadResultFormFromRow(r)}
                onToggleStatus={() => toggleResultStatus(r)}
                statusActive={!!r.status}
                onDelete={() => deleteResult(r.id)}
              />
            )}
          />
        </div>
      </div>
    );
  }

  // ════════════════════════════════════════════════════════════════════════════
  // View: LIST
  // ════════════════════════════════════════════════════════════════════════════
  const labTestColumns: ListingColumn<LabTest>[] = [
    {
      key: 'name',
      label: 'Name',
      sortable: true,
      filterable: true,
      width: '48%',
      getValue: test => test.name || '',
      render: test => <span style={{ fontWeight: 500 }}>{test.name}</span>,
    },
    {
      key: 'configurations',
      label: 'Configurations',
      sortable: false,
      filterable: false,
      width: '34%',
      render: test => (
        <div className="listing-actions">
          <button type="button" className="action-btn action-btn-view-eye" title="View Form" onClick={() => openView(test)}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" strokeLinecap="round" strokeLinejoin="round" />
              <circle cx="12" cy="12" r="3" />
            </svg>
          </button>
          {!test.default_view && (
            <>
              <button type="button" className="action-btn action-btn-view" title="Specimen Types" onClick={() => openSpecimen(test)}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                  <path d="M9 3v2h1v5.59l-5.7 5.7A1 1 0 0 0 5 18h14a1 1 0 0 0 .7-1.71L14 10.59V5h1V3H9zm2 8.41V5h2v6.41L17.59 16H6.41L11 11.41z" />
                </svg>
              </button>
              <button type="button" className="action-btn action-btn-view" title="Result Parameters" onClick={() => openResultParams(test)}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                  <path d="M4 5h16v14H4V5zm2 3v2h12V8H6zm0 4v2h8v-2H6zm0 4v1h6v-1H6z" />
                </svg>
              </button>
              <button type="button" className="action-btn action-btn-download" title="Report Questions" onClick={() => openQuestions(test)}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                  <path d="M11 18h2v-2h-2v2zm1-16C6.48 2 2 6.03 2 11c0 2.19.88 4.19 2.34 5.72L3 22l5.49-1.32A11.2 11.2 0 0 0 12 21c5.52 0 10-4.03 10-9S17.52 2 12 2zm.1 12.5h-1.8c0-3 3.2-2.75 3.2-4.75 0-.92-.68-1.55-1.68-1.55-.94 0-1.61.48-2.15 1.28L8.2 8.4C9.05 7.08 10.27 6.25 12 6.25c2.12 0 3.65 1.25 3.65 3.28 0 2.88-3.55 3.1-3.55 4.97z" />
                </svg>
              </button>
            </>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="page-content">
      <TopNav title="Manage Lab Test Category" />
      <div style={{ padding: '1.5rem' }}>
        <ListingTable
          title="List of Lab Test Categories"
          columns={labTestColumns}
          rows={tests}
          loading={loading}
          emptyText="No Lab Tests found."
          headerActions={<ListingHeaderActions onAdd={openAdd} onRefresh={loadTests} />}
          actionsLabel="Actions"
          actionsWidth={150}
          defaultPageSize={10}
          rowActions={test => (
            <ActionIcons
              editTitle="Edit Lab Test Category"
              statusTitle={test.status ? 'Active — click to disable' : 'Inactive — click to enable'}
              deleteTitle="Delete Lab Test Category"
              onEdit={!test.default_view ? () => openEdit(test) : undefined}
              onToggleStatus={() => toggleStatus(test)}
              statusActive={!!test.status}
              onDelete={!test.default_view ? () => remove(test.id) : undefined}
            />
          )}
        />
      </div>
    </div>
  );
}
