'use client';
import { useState, useEffect } from 'react';
import TopNav from '../../../components/TopNav';
import { useConfirm } from '../../../components/ConfirmModal';
import ListingTable, { ActionIcons, ListingColumn } from '../../../components/ListingTable';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
function getToken() { return typeof window !== 'undefined' ? localStorage.getItem('b2b_token') || '' : ''; }
function getStoredUser() {
  if (typeof window === 'undefined') return null;
  try { return JSON.parse(localStorage.getItem('b2b_user') || '{}'); } catch { return {}; }
}

interface TestResultParameter {
  id: number;
  name: string;
  placeholder: string;
  label: string;
  input_type: number | string;
  input_option?: string;
  unit_text: string;
  screening_cutoff?: string;
  confirmation_cutoff?: string;
  description: string;
  is_mandatory: boolean;
  status: boolean;
  lab_test_id: number;
  b2b_client_id: number | null;
}

const UNIT_OPTIONS = ['ng/mL', 'Quant', 'mg/dL', 'pg/mL', '%'];

const emptyForm = {
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
  lab_test_id: '',
};

type ParamForm = typeof emptyForm;
type ParamField = keyof ParamForm;
type ParamErrors = Partial<Record<ParamField, string>>;

const INPUT_TYPE_LABELS: Record<string, string> = {
  '1': 'Textbox (Numeric)',
  '2': 'Dropdown',
};

export default function TestResultParameterPage() {
  const confirmDialog = useConfirm();
  const [params, setParams] = useState<TestResultParameter[]>([]);
  const [labTests, setLabTests] = useState<{ id: number; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState<ParamForm>({ ...emptyForm });
  const [errors, setErrors] = useState<ParamErrors>({});
  const [editingId, setEditingId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const loadData = () => {
    setLoading(true);
    const user = getStoredUser();
    const query = user?.id ? `?b2b_client_id=${user.id}` : '';
    fetch(`${API}/api/ReportRequestParameters${query}`, { headers: { token: getToken() } })
      .then(r => r.json())
      .then(d => { if (d.response_code === '200') setParams(d.obj || []); })
      .catch(() => setParams([]))
      .finally(() => setLoading(false));
  };

  const loadLabTests = () => {
    fetch(`${API}/api/LabTests`, { headers: { token: getToken() } })
      .then(r => r.json())
      .then(d => { if (d.response_code === '200') setLabTests(d.obj || []); });
  };

  useEffect(() => {
    void Promise.resolve().then(() => {
      loadData();
      loadLabTests();
    });
  }, []);

  const updateField = <K extends ParamField>(field: K, value: ParamForm[K]) => {
    setForm(previous => ({ ...previous, [field]: value }));
    setErrors(previous => {
      if (!previous[field]) return previous;
      const next = { ...previous };
      delete next[field];
      return next;
    });
    if (msg?.type === 'error') setMsg(null);
  };

  const validateForm = (): ParamErrors => {
    const next: ParamErrors = {};
    if (!form.name.trim()) next.name = 'Please enter the parameter name.';
    if (!form.placeholder.trim()) next.placeholder = 'Please enter placeholder text.';
    if (!form.label.trim()) next.label = 'Please enter the field label.';
    if (!['1', '2'].includes(form.input_type)) next.input_type = 'Please select a valid input type.';
    if (form.input_type === '2') {
      const options = form.input_option.split(',').map(value => value.trim());
      if (!form.input_option.trim()) {
        next.input_option = 'Please enter at least one dropdown value.';
      } else if (options.some(value => !value)) {
        next.input_option = 'Dropdown values must be comma separated without empty values.';
      }
    }
    if (!form.unit_text.trim()) next.unit_text = 'Please select or enter a unit.';
    if (!form.screening_cutoff.trim()) next.screening_cutoff = 'Please enter the screening cutoff.';
    if (!form.confirmation_cutoff.trim()) next.confirmation_cutoff = 'Please enter the confirmation cutoff.';
    if (!form.is_mandatory) next.is_mandatory = 'Please check Is Mandatory. This field is required.';
    if (!form.lab_test_id) next.lab_test_id = 'Please select a lab test.';
    return next;
  };

  const save = async () => {
    const nextErrors = validateForm();
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      setMsg({ type: 'error', text: 'Please correct the highlighted fields before saving.' });
      const firstInvalidField = Object.keys(nextErrors)[0];
      window.setTimeout(() => {
        const input = document.querySelector<HTMLElement>(`[data-param-field="${firstInvalidField}"]`);
        input?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        input?.focus();
      }, 0);
      return;
    }

    setSaving(true);
    setMsg(null);
    const method = editingId ? 'PUT' : 'POST';
    const url = `${API}/api/ReportRequestParameters${editingId ? `/${editingId}` : ''}`;
    const user = getStoredUser();
    try {
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json', token: getToken() },
        body: JSON.stringify({
          name: form.name.trim(),
          placeholder: form.placeholder.trim(),
          label: form.label.trim(),
          input_type: Number(form.input_type),
          input_option: form.input_type === '2' ? form.input_option.trim() : '',
          unit_text: form.unit_text.trim(),
          screening_cutoff: form.screening_cutoff.trim(),
          confirmation_cutoff: form.confirmation_cutoff.trim(),
          description: form.description.trim(),
          is_mandatory: true,
          lab_test_id: Number(form.lab_test_id),
          b2b_client_id: user?.id,
          status: true,
        }),
      });
      const d = await res.json();
      if (res.ok && d.response_code === '200') {
        setMsg({ type: 'success', text: `Parameter ${editingId ? 'updated' : 'added'} successfully.` });
        setForm({ ...emptyForm });
        setErrors({});
        setEditingId(null);
        loadData();
      } else {
        setMsg({ type: 'error', text: typeof d.obj === 'string' ? d.obj : 'Unable to save the parameter. Please try again.' });
      }
    } catch {
      setMsg({ type: 'error', text: 'Unable to connect to the server. Please check your connection and try again.' });
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id: number) => {
    const ok = await confirmDialog({
      title: 'You are trying to delete Test Result Parameter, Please confirm',
      message: 'This cannot be restored once deleted.',
      cancelText: 'NO, WAIT!',
      confirmText: 'CONFIRM DELETION',
    });
    if (!ok) return;
    await fetch(`${API}/api/ReportRequestParameters/${id}`, { method: 'DELETE', headers: { token: getToken() } });
    loadData();
  };

  const toggleStatus = async (p: TestResultParameter) => {
    await fetch(`${API}/api/ReportRequestParameters/${p.id}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json', token: getToken() },
      body: JSON.stringify({ status: !p.status }),
    });
    loadData();
  };

  const openEdit = (p: TestResultParameter) => {
    setEditingId(p.id);
    setForm({
      name: p.name || '',
      placeholder: p.placeholder || '',
      label: p.label || '',
      input_type: String(p.input_type || 2),
      input_option: p.input_option || '',
      unit_text: p.unit_text || '',
      screening_cutoff: p.screening_cutoff || '',
      confirmation_cutoff: p.confirmation_cutoff || '',
      description: p.description || '',
      is_mandatory: !!p.is_mandatory,
      lab_test_id: String(p.lab_test_id || ''),
    });
    setErrors({});
    setMsg(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const resetForm = () => {
    setEditingId(null);
    setForm({ ...emptyForm });
    setErrors({});
    setMsg(null);
  };

  const getInputTypeLabel = (val: number | string) => INPUT_TYPE_LABELS[String(val)] || String(val);
  const getLabTestName = (id: number) => labTests.find(t => t.id === id)?.name || '—';
  const parameterColumns: ListingColumn<TestResultParameter>[] = [
    { key: 'name', label: 'Name', sortable: true, width: '22%' },
    {
      key: 'lab_test_id',
      label: 'Lab Test',
      sortable: true,
      width: '24%',
      getValue: p => getLabTestName(p.lab_test_id),
      render: p => getLabTestName(p.lab_test_id),
    },
    {
      key: 'input_type',
      label: 'Input Type',
      sortable: true,
      width: '20%',
      getValue: p => getInputTypeLabel(p.input_type),
      render: p => getInputTypeLabel(p.input_type),
    },
    { key: 'unit_text', label: 'Unit Text', sortable: true, width: '18%' },
  ];

  const fieldStyle = {
    width: '100%',
    background: 'var(--bg-input)',
    border: '1px solid var(--border)',
    borderRadius: 6,
    padding: '0.5rem',
    color: 'var(--text)',
  };
  const fieldErrorStyle = (field: ParamField) => ({
    ...fieldStyle,
    borderColor: errors[field] ? '#ef4444' : 'var(--border)',
    boxShadow: errors[field] ? '0 0 0 1px rgba(239,68,68,0.15)' : 'none',
  });
  const errorMessage = (field: ParamField) => errors[field] ? (
    <div role="alert" style={{ color: '#ef4444', fontSize: '0.78rem', marginTop: '0.35rem', fontWeight: 500 }}>
      {errors[field]}
    </div>
  ) : null;

  return (
    <div className="page-content">
      <TopNav title="Test Result Parameters" />
      <div style={{ padding: '1.5rem' }}>
          {msg && (
            <div
              role="alert"
              style={{
                background: msg.type === 'success' ? '#ecfdf5' : '#fef2f2',
                border: `1px solid ${msg.type === 'success' ? '#10b981' : '#ef4444'}`,
                borderRadius: 8,
                padding: '0.85rem 1rem',
                marginBottom: '1rem',
                fontSize: '0.875rem',
                color: msg.type === 'success' ? '#047857' : '#b91c1c',
                fontWeight: 600,
              }}
            >
              {msg.type === 'success' ? '✓ ' : '⚠ '}{msg.text}
            </div>
          )}
        <div className="manage-parameters-split">
          <div className="card">
            <div className="card-header">
              <span className="card-title">
                {editingId ? 'Edit Test Result Parameter Detail' : 'Test Result Parameter Detail'}
              </span>
            </div>
            <div className="card-body">
              <div className="form-group">
                <label>Lab Test <span style={{ color: '#ef4444' }}>*</span></label>
                <select
                  value={form.lab_test_id}
                  data-param-field="lab_test_id"
                  aria-invalid={!!errors.lab_test_id}
                  onChange={e => updateField('lab_test_id', e.target.value)}
                  style={fieldErrorStyle('lab_test_id')}
                >
                  <option value="">-- Select Lab Test --</option>
                  {labTests.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
                {errorMessage('lab_test_id')}
              </div>

              <div className="form-group">
                <label>Name <span style={{ color: '#ef4444' }}>*</span></label>
                <input
                  type="text"
                  placeholder="Enter Name"
                  value={form.name}
                  data-param-field="name"
                  aria-invalid={!!errors.name}
                  onChange={e => updateField('name', e.target.value)}
                  style={fieldErrorStyle('name')}
                />
                {errorMessage('name')}
              </div>

              <div className="form-group">
                <label>Placeholder <span style={{ color: '#ef4444' }}>*</span></label>
                <input
                  type="text"
                  placeholder="Enter Placeholder"
                  value={form.placeholder}
                  data-param-field="placeholder"
                  aria-invalid={!!errors.placeholder}
                  onChange={e => updateField('placeholder', e.target.value)}
                  style={fieldErrorStyle('placeholder')}
                />
                {errorMessage('placeholder')}
              </div>

              <div className="form-group">
                <label>Label <span style={{ color: '#ef4444' }}>*</span></label>
                <input
                  type="text"
                  placeholder="Enter Label Name"
                  value={form.label}
                  data-param-field="label"
                  aria-invalid={!!errors.label}
                  onChange={e => updateField('label', e.target.value)}
                  style={fieldErrorStyle('label')}
                />
                {errorMessage('label')}
              </div>

              <div className="form-group">
                <label>Input Type</label>
                <select
                  value={form.input_type}
                  data-param-field="input_type"
                  aria-invalid={!!errors.input_type}
                  onChange={e => updateField('input_type', e.target.value)}
                  style={fieldErrorStyle('input_type')}
                >
                  <option value="1">Textbox (Numeric)</option>
                  <option value="2">Dropdown</option>
                </select>
                {errorMessage('input_type')}
              </div>

              {form.input_type === '2' && (
                <div className="form-group">
                  <label>Dropdown Values (Comma Separated) <span style={{ color: '#ef4444' }}>*</span></label>
                  <input
                    type="text"
                    placeholder="e.g. Negative, Positive"
                    value={form.input_option}
                    data-param-field="input_option"
                    aria-invalid={!!errors.input_option}
                    onChange={e => updateField('input_option', e.target.value)}
                    style={fieldErrorStyle('input_option')}
                  />
                  {errorMessage('input_option')}
                </div>
              )}

              <div className="form-group">
                <label>Unit Text <span style={{ color: '#ef4444' }}>*</span></label>
                <select
                  value={UNIT_OPTIONS.includes(form.unit_text) ? form.unit_text : ''}
                  onChange={e => updateField('unit_text', e.target.value)}
                  aria-invalid={!!errors.unit_text}
                  style={{ ...fieldErrorStyle('unit_text'), marginBottom: '0.5rem' }}
                >
                  <option value="">Select Unit</option>
                  {UNIT_OPTIONS.map(u => <option key={u} value={u}>{u}</option>)}
                </select>
                <input
                  type="text"
                  placeholder="Enter Unit Text"
                  value={form.unit_text}
                  data-param-field="unit_text"
                  aria-invalid={!!errors.unit_text}
                  onChange={e => updateField('unit_text', e.target.value)}
                  style={fieldErrorStyle('unit_text')}
                />
                {errorMessage('unit_text')}
              </div>

              <div className="form-group">
                <label>Screening Cutoff <span style={{ color: '#ef4444' }}>*</span></label>
                <input
                  type="text"
                  placeholder="Enter Screening Cutoff"
                  value={form.screening_cutoff}
                  data-param-field="screening_cutoff"
                  aria-invalid={!!errors.screening_cutoff}
                  onChange={e => updateField('screening_cutoff', e.target.value)}
                  style={fieldErrorStyle('screening_cutoff')}
                />
                {errorMessage('screening_cutoff')}
              </div>

              <div className="form-group">
                <label>Confirmation Cutoff <span style={{ color: '#ef4444' }}>*</span></label>
                <input
                  type="text"
                  placeholder="Enter Confirmation Cutoff"
                  value={form.confirmation_cutoff}
                  data-param-field="confirmation_cutoff"
                  aria-invalid={!!errors.confirmation_cutoff}
                  onChange={e => updateField('confirmation_cutoff', e.target.value)}
                  style={fieldErrorStyle('confirmation_cutoff')}
                />
                {errorMessage('confirmation_cutoff')}
              </div>

              <div className="form-group">
                <label>Description</label>
                <textarea
                  rows={3}
                  value={form.description}
                  onChange={e => updateField('description', e.target.value)}
                  style={{ ...fieldStyle, resize: 'vertical', fontFamily: 'inherit' }}
                />
              </div>

              <div className="form-group">
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', color: errors.is_mandatory ? '#b91c1c' : undefined }}>
                  <input
                    type="checkbox"
                    checked={form.is_mandatory}
                    data-param-field="is_mandatory"
                    aria-invalid={!!errors.is_mandatory}
                    onChange={e => updateField('is_mandatory', e.target.checked)}
                    style={{ width: 16, height: 16, cursor: 'pointer', outline: errors.is_mandatory ? '2px solid #ef4444' : undefined }}
                  />
                  Is Mandatory <span style={{ color: '#ef4444' }}>*</span>
                </label>
                {errorMessage('is_mandatory')}
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.5rem' }}>
                <button className="btn btn-primary" onClick={save} disabled={saving}>
                  {saving ? '⏳ Saving...' : '💾 Save'}
                </button>
                <button className="btn btn-ghost" onClick={resetForm} disabled={saving}>🔄 Reset</button>
              </div>
            </div>
          </div>
          <ListingTable
            title="List of Test Result Parameters"
            columns={parameterColumns}
            rows={params}
            loading={loading}
            emptyText="No parameters found."
            actionsLabel="Actions"
            actionsWidth={130}
            defaultPageSize={10}
            rowActions={p => (
              p.b2b_client_id == null ? (
                <span
                  title="Global parameter (read-only)"
                  style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600 }}
                >
                  🔒 Global
                </span>
              ) : (
                <ActionIcons
                  onEdit={() => openEdit(p)}
                  onToggleStatus={() => toggleStatus(p)}
                  onDelete={() => remove(p.id)}
                  statusActive={!!p.status}
                  editTitle="Edit Parameter"
                  deleteTitle="Delete Parameter"
                />
              )
            )}
          />
        </div>
      </div>
    </div>
  );
}
