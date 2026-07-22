'use client';
import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { MdAdd, MdClose, MdDelete, MdEdit, MdHourglassEmpty, MdRefresh, MdSave } from 'react-icons/md';
import TopNav from '../../../components/TopNav';
import PageLoader from '../../../components/PageLoader';
import { useConfirm } from '../../../components/ConfirmModal';
import { FormGroup } from '../../../components/FormField';
import { apiFetch } from '../../../../lib/api';
import { patchListItem } from '../../../../lib/listState';
import { createInvalidHandler, fieldStyle, formResolver } from '../../../../lib/formHelpers';
import { testResultParameterSchema, type TestResultParameterFormValues } from '../../../../lib/schemas';

interface TestResultParameter {
  id: number;
  name: string;
  placeholder: string;
  label: string;
  input_type: string;
  validate_regex: string;
  unit_text: string;
  description: string;
  is_mandatory: boolean;
  type_data_id: number;
  status: boolean;
}
interface DocType { id: number; name: string; }

const INPUT_TYPES = [
  { value: '1', label: 'Text (String)' },
  { value: '2', label: 'TextBox (Int)' },
  { value: '3', label: 'Dropdown' },
  { value: '4', label: 'Upload File' },
  { value: '5', label: 'Upload File Type' },
];

const emptyForm: TestResultParameterFormValues = {
  name: '', placeholder: '', label: '', input_type: '1',
  validate_regex: '', unit_text: '',
  description: '', is_mandatory: false, type_data_id: '',
};

export default function TestResultParameterPage() {
  const confirmDialog = useConfirm();
  const [params, setParams] = useState<TestResultParameter[]>([]);
  const [docTypes, setDocTypes] = useState<DocType[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'list' | 'form'>('list');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<TestResultParameterFormValues>({
    resolver: formResolver<TestResultParameterFormValues>(testResultParameterSchema),
    defaultValues: emptyForm,
  });

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await apiFetch<TestResultParameter[]>('/api/ReportRequestParameters', { tokenKey: 'superadmin_token' });
      setParams(data || []);
    } catch {
      setParams([]);
    } finally {
      setLoading(false);
    }
  };

  const loadDocTypes = async () => {
    try {
      const data = await apiFetch<DocType[]>('/api/TypeData?status=true', { tokenKey: 'superadmin_token' });
      setDocTypes(data || []);
    } catch {
      setDocTypes([]);
    }
  };

  useEffect(() => { loadData(); loadDocTypes(); }, []);

  const save = handleSubmit(async values => {
    setSaving(true);
    const method = editingId ? 'PUT' : 'POST';
    const path = `/api/ReportRequestParameters${editingId ? `/${editingId}` : ''}`;
    const payload = {
      ...values,
      type_data_id: values.type_data_id || null,
      is_mandatory: values.is_mandatory === true,
    };
    try {
      await apiFetch(path, {
        method,
        tokenKey: 'superadmin_token',
        body: JSON.stringify(payload),
        successMessage: `Parameter ${editingId ? 'updated' : 'added'} successfully.`,
        errorFallback: 'Error saving.',
      });
      reset(emptyForm);
      setEditingId(null);
      setView('list');
      loadData();
    } catch {
      /* error toasted by apiFetch */
    } finally {
      setSaving(false);
    }
  }, createInvalidHandler<TestResultParameterFormValues>());

  const remove = async (id: number) => {
    const ok = await confirmDialog({
      title: 'You are trying to delete Test Result Parameter, Please confirm',
      message: 'This cannot be restored once deleted.',
      cancelText: 'NO, WAIT!',
      confirmText: 'CONFIRM DELETION',
    });
    if (!ok) return;
    try {
      await apiFetch(`/api/ReportRequestParameters/${id}`, {
        method: 'DELETE',
        tokenKey: 'superadmin_token',
        successMessage: 'Parameter deleted successfully.',
        errorFallback: 'Unable to delete parameter.',
      });
      loadData();
    } catch {
      /* error toasted by apiFetch */
    }
  };

  const toggleStatus = async (p: TestResultParameter) => {
    const enabling = !p.status;
    const ok = await confirmDialog({
      title: enabling ? 'Enable Parameter?' : 'Disable Parameter?',
      message: enabling
        ? `${p.name || 'This parameter'} will become active.`
        : `${p.name || 'This parameter'} will become inactive. You can enable it again later.`,
      cancelText: 'Cancel',
      confirmText: enabling ? 'Enable' : 'Disable',
    });
    if (!ok) return;
    try {
      await apiFetch(`/api/ReportRequestParameters/${p.id}`, {
        method: 'PUT',
        tokenKey: 'superadmin_token',
        body: JSON.stringify({ status: !p.status }),
        successMessage: 'Status Updated Successfully',
        errorFallback: 'Failed to update status.',
      });
      setParams(prev => patchListItem(prev, p.id, { status: !p.status }));
    } catch {
      /* error toasted by apiFetch */
    }
  };

  const openEdit = (p: TestResultParameter) => {
    setEditingId(p.id);
    reset({
      name: p.name || '', placeholder: p.placeholder || '', label: p.label || '',
      input_type: String(p.input_type || '1'), validate_regex: p.validate_regex || '',
      unit_text: p.unit_text || '',
      description: p.description || '', is_mandatory: p.is_mandatory || false,
      type_data_id: String(p.type_data_id || ''),
    });
    setView('form');
  };

  const openAdd = () => {
    setEditingId(null);
    reset(emptyForm);
    setView('form');
  };

  const getInputTypeLabel = (val: string) => INPUT_TYPES.find(t => t.value === String(val))?.label || val;
  const getTypeName = (id: number) => docTypes.find(d => d.id === id)?.name || '—';

  const filtered = params.filter(p => !search || p.name?.toLowerCase().includes(search.toLowerCase()) || p.label?.toLowerCase().includes(search.toLowerCase()));

  if (view === 'form') {
    return (
      <div className="page-content">
        <TopNav title={editingId ? 'Edit Test Result Parameter' : 'Add Test Result Parameter'} />
        <div className="page-body">
          <div className="card">
            <div className="card-header">
              <span className="card-title">Test Result Parameter Detail</span>
              <button type="button" className="btn btn-ghost" onClick={() => setView('list')}>
                <MdClose size={16} style={{ verticalAlign: 'text-bottom', marginRight: '0.35rem' }} aria-hidden />Close
              </button>
            </div>
            <form onSubmit={save} noValidate>
              <div className="card-body">
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '0 1.5rem' }}>
                  <FormGroup label="Name" htmlFor="trp-name" required error={errors.name?.message}>
                    <input id="trp-name" type="text" placeholder="Enter Name" data-field="name" aria-invalid={!!errors.name} style={fieldStyle(!!errors.name)} {...register('name')} />
                  </FormGroup>
                  <FormGroup label="Placeholder" htmlFor="trp-placeholder" error={errors.placeholder?.message}>
                    <input id="trp-placeholder" type="text" placeholder="Enter Placeholder" data-field="placeholder" style={fieldStyle(!!errors.placeholder)} {...register('placeholder')} />
                  </FormGroup>
                  <FormGroup label="Label" htmlFor="trp-label" error={errors.label?.message}>
                    <input id="trp-label" type="text" placeholder="Enter Label" data-field="label" style={fieldStyle(!!errors.label)} {...register('label')} />
                  </FormGroup>

                  <FormGroup label="Input Type" htmlFor="trp-input-type" required error={errors.input_type?.message}>
                    <select id="trp-input-type" data-field="input_type" aria-invalid={!!errors.input_type} style={fieldStyle(!!errors.input_type)} {...register('input_type')}>
                      {INPUT_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                    </select>
                  </FormGroup>

                  <FormGroup label="Validation Regex" htmlFor="trp-regex" error={errors.validate_regex?.message}>
                    <input id="trp-regex" type="text" placeholder="Enter Validation Regex" data-field="validate_regex" style={fieldStyle(!!errors.validate_regex)} {...register('validate_regex')} />
                  </FormGroup>
                  <FormGroup label="Unit Text" htmlFor="trp-unit" error={errors.unit_text?.message}>
                    <input id="trp-unit" type="text" placeholder="Enter Unit Text" data-field="unit_text" style={fieldStyle(!!errors.unit_text)} {...register('unit_text')} />
                  </FormGroup>

                  <FormGroup label="Test Type" htmlFor="trp-type-data" error={errors.type_data_id?.message}>
                    <select id="trp-type-data" data-field="type_data_id" style={fieldStyle(!!errors.type_data_id)} {...register('type_data_id')}>
                      <option value="">-- Select Test Type --</option>
                      {docTypes.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                    </select>
                  </FormGroup>

                  <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                    <label htmlFor="trp-description">Description</label>
                    <textarea id="trp-description" rows={3} placeholder="Enter Description" data-field="description" style={{ width: '100%', background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: 6, padding: '0.5rem', color: 'var(--text)', resize: 'vertical', fontFamily: 'inherit' }} {...register('description')} />
                  </div>

                  <div className="form-group">
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                      <input type="checkbox" data-field="is_mandatory" style={{ width: 16, height: 16, cursor: 'pointer' }} {...register('is_mandatory')} />
                      Is Mandatory
                    </label>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.5rem' }}>
                  <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? <><MdHourglassEmpty size={16} aria-hidden /> Saving...</> : <><MdSave size={16} aria-hidden /> Save</>}</button>
                  <button type="button" className="btn btn-ghost" onClick={() => reset(emptyForm)}><MdRefresh size={16} style={{ verticalAlign: 'text-bottom', marginRight: '0.35rem' }} aria-hidden />Reset</button>
                </div>
              </div>
            </form>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page-content">
      <TopNav title="Test Result Parameters">
        <input type="text" placeholder="Search parameters..." value={search} onChange={e => setSearch(e.target.value)}
          style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, padding: '0.5rem 0.75rem', color: 'var(--text)', fontSize: '0.875rem', width: 240 }} />
        <button type="button" className="btn btn-primary" onClick={openAdd}>
          <MdAdd size={16} style={{ verticalAlign: 'text-bottom', marginRight: '0.35rem' }} aria-hidden />Add Parameter
        </button>
      </TopNav>

      <div className="page-body">
        <div className="card">
          <div className="card-body" style={{ padding: 0 }}>
            {loading ? (
              <PageLoader message="Loading parameters..." size="lg" />
            ) : filtered.length === 0 ? (
              <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>No parameters found.</div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border)' }}>
                    {['#', 'Name', 'Label', 'Description', 'Input Type', 'Test Type', 'Status', 'Action'].map(h => (
                      <th key={h} style={{ padding: '0.75rem 1rem', textAlign: 'left', color: 'var(--text-muted)', fontWeight: 600 }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((p, i) => (
                    <tr key={p.id} style={{ borderBottom: '1px solid var(--border)', transition: 'background 0.15s' }}
                      onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-card-hover)')}
                      onMouseLeave={e => (e.currentTarget.style.background = '')}>
                      <td style={{ padding: '0.75rem 1rem', color: 'var(--text-muted)' }}>{i + 1}</td>
                      <td style={{ padding: '0.75rem 1rem', fontWeight: 500 }}>{p.name}</td>
                      <td style={{ padding: '0.75rem 1rem' }}>{p.label}</td>
                      <td style={{ padding: '0.75rem 1rem', maxWidth: 200 }}>{p.description}</td>
                      <td style={{ padding: '0.75rem 1rem' }}>{getInputTypeLabel(p.input_type)}</td>
                      <td style={{ padding: '0.75rem 1rem' }}>{getTypeName(p.type_data_id)}</td>
                      <td style={{ padding: '0.75rem 1rem' }}>
                        <span className={`badge ${p.status ? 'badge-success' : 'badge-danger'}`}>{p.status ? 'Active' : 'Inactive'}</span>
                      </td>
                      <td style={{ padding: '0.75rem 1rem', display: 'flex', gap: '0.5rem' }}>
                        <button type="button" className="btn btn-ghost" style={{ fontSize: '0.75rem', padding: '0.25rem 0.75rem' }} onClick={() => openEdit(p)}><MdEdit size={14} style={{ verticalAlign: 'text-bottom', marginRight: '0.25rem' }} aria-hidden />Edit</button>
                        <button type="button" className="btn btn-ghost" style={{ fontSize: '0.75rem', padding: '0.25rem 0.75rem' }} onClick={() => toggleStatus(p)}>⚡ {p.status ? 'Disable' : 'Enable'}</button>
                        <button type="button" className="btn btn-ghost" style={{ fontSize: '0.75rem', padding: '0.25rem 0.75rem', color: '#ef4444' }} onClick={() => remove(p.id)}><MdDelete size={14} style={{ verticalAlign: 'text-bottom', marginRight: '0.25rem' }} aria-hidden />Delete</button>
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
