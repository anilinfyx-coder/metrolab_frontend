'use client';
import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { MdHourglassEmpty, MdRefresh, MdSave } from 'react-icons/md';
import TopNav from '../../../components/TopNav';
import { useConfirm } from '../../../components/ConfirmModal';
import { FormGroup } from '../../../components/FormField';
import ListingTable, { ActionIcons, ListingColumn } from '../../../components/ListingTable';
import { apiFetch } from '../../../../lib/api';
import { createInvalidHandler, fieldStyle, formResolver } from '../../../../lib/formHelpers';
import { b2bManageParameterSchema, type B2bManageParameterFormValues } from '../../../../lib/schemas';

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

const emptyForm: B2bManageParameterFormValues = {
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

const INPUT_TYPE_LABELS: Record<string, string> = {
  '1': 'Textbox (Numeric)',
  '2': 'Dropdown',
};

export default function TestResultParameterPage() {
  const confirmDialog = useConfirm();
  const [params, setParams] = useState<TestResultParameter[]>([]);
  const [labTests, setLabTests] = useState<{ id: number; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<B2bManageParameterFormValues>({
    resolver: formResolver<B2bManageParameterFormValues>(b2bManageParameterSchema),
    defaultValues: emptyForm,
  });

  const inputType = watch('input_type');

  const loadData = async () => {
    setLoading(true);
    const user = getStoredUser();
    const query = user?.id ? `?b2b_client_id=${user.id}` : '';
    try {
      const data = await apiFetch<TestResultParameter[]>(`/api/ReportRequestParameters${query}`, {
        tokenKey: 'b2b_token',
        errorFallback: 'Unable to load parameters.',
      });
      setParams(data || []);
    } catch {
      setParams([]);
    } finally {
      setLoading(false);
    }
  };

  const loadLabTests = async () => {
    try {
      const data = await apiFetch<{ id: number; name: string }[]>('/api/LabTests?status=true', {
        tokenKey: 'b2b_token',
        errorFallback: 'Unable to load lab tests.',
      });
      setLabTests(data || []);
    } catch {
      setLabTests([]);
    }
  };

  useEffect(() => {
    void Promise.resolve().then(() => {
      loadData();
      loadLabTests();
    });
  }, []);

  const save = handleSubmit(async values => {
    setSaving(true);
    const method = editingId ? 'PUT' : 'POST';
    const path = `/api/ReportRequestParameters${editingId ? `/${editingId}` : ''}`;
    const user = getStoredUser();
    try {
      await apiFetch(path, {
        method,
        tokenKey: 'b2b_token',
        body: JSON.stringify({
          name: values.name.trim(),
          placeholder: values.placeholder.trim(),
          label: values.label.trim(),
          input_type: Number(values.input_type),
          input_option: values.input_type === '2' ? (values.input_option || '').trim() : '',
          unit_text: values.unit_text.trim(),
          screening_cutoff: values.screening_cutoff.trim(),
          confirmation_cutoff: values.confirmation_cutoff.trim(),
          description: (values.description || '').trim(),
          is_mandatory: true,
          lab_test_id: Number(values.lab_test_id),
          b2b_client_id: user?.id,
          status: true,
        }),
        successMessage: `Parameter ${editingId ? 'updated' : 'added'} successfully.`,
        errorFallback: 'Unable to save the parameter. Please try again.',
      });
      resetForm();
      loadData();
    } catch {
      /* toast handled by apiFetch */
    } finally {
      setSaving(false);
    }
  }, createInvalidHandler<B2bManageParameterFormValues>());

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
        tokenKey: 'b2b_token',
        successMessage: 'Parameter deleted successfully.',
        errorFallback: 'Unable to delete parameter.',
      });
      loadData();
    } catch {
      /* toast handled by apiFetch */
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
        tokenKey: 'b2b_token',
        body: JSON.stringify({ status: !p.status }),
        successMessage: 'Status Updated Successfully',
        errorFallback: 'Unable to update parameter status.',
      });
      loadData();
    } catch {
      /* toast handled by apiFetch */
    }
  };

  const openEdit = (p: TestResultParameter) => {
    setEditingId(p.id);
    reset({
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
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const resetForm = () => {
    setEditingId(null);
    reset(emptyForm);
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

  return (
    <div className="page-content">
      <TopNav title="Test Result Parameters" />
      <div className="page-body">
        <div className="manage-parameters-split">
          <div className="card">
            <div className="card-header">
              <span className="card-title">
                {editingId ? 'Edit Test Result Parameter Detail' : 'Test Result Parameter Detail'}
              </span>
            </div>
            <form onSubmit={save} noValidate>
              <div className="card-body">
                <FormGroup label="Lab Test" htmlFor="mp-lab-test" required error={errors.lab_test_id?.message}>
                  <select id="mp-lab-test" data-field="lab_test_id" aria-invalid={!!errors.lab_test_id} style={fieldStyle(!!errors.lab_test_id)} {...register('lab_test_id')}>
                    <option value="">-- Select Lab Test --</option>
                    {labTests.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                  </select>
                </FormGroup>

                <FormGroup label="Name" htmlFor="mp-name" required error={errors.name?.message}>
                  <input id="mp-name" type="text" placeholder="Enter Name" data-field="name" aria-invalid={!!errors.name} style={fieldStyle(!!errors.name)} {...register('name')} />
                </FormGroup>

                <FormGroup label="Placeholder" htmlFor="mp-placeholder" required error={errors.placeholder?.message}>
                  <input id="mp-placeholder" type="text" placeholder="Enter Placeholder" data-field="placeholder" aria-invalid={!!errors.placeholder} style={fieldStyle(!!errors.placeholder)} {...register('placeholder')} />
                </FormGroup>

                <FormGroup label="Label" htmlFor="mp-label" required error={errors.label?.message}>
                  <input id="mp-label" type="text" placeholder="Enter Label Name" data-field="label" aria-invalid={!!errors.label} style={fieldStyle(!!errors.label)} {...register('label')} />
                </FormGroup>

                <FormGroup label="Input Type" htmlFor="mp-input-type" error={errors.input_type?.message}>
                  <select id="mp-input-type" data-field="input_type" aria-invalid={!!errors.input_type} style={fieldStyle(!!errors.input_type)} {...register('input_type')}>
                    <option value="1">Textbox (Numeric)</option>
                    <option value="2">Dropdown</option>
                  </select>
                </FormGroup>

                {inputType === '2' && (
                  <FormGroup label="Dropdown Values (Comma Separated)" htmlFor="mp-input-option" required error={errors.input_option?.message}>
                    <input id="mp-input-option" type="text" placeholder="e.g. Negative, Positive" data-field="input_option" aria-invalid={!!errors.input_option} style={fieldStyle(!!errors.input_option)} {...register('input_option')} />
                  </FormGroup>
                )}

                <FormGroup label="Unit Text" htmlFor="mp-unit" required error={errors.unit_text?.message}>
                  <select
                    value={UNIT_OPTIONS.includes(watch('unit_text')) ? watch('unit_text') : ''}
                    onChange={e => setValue('unit_text', e.target.value, { shouldValidate: true })}
                    aria-invalid={!!errors.unit_text}
                    style={{ ...fieldStyle(!!errors.unit_text), marginBottom: '0.5rem' }}
                  >
                    <option value="">Select Unit</option>
                    {UNIT_OPTIONS.map(u => <option key={u} value={u}>{u}</option>)}
                  </select>
                  <input id="mp-unit" type="text" placeholder="Enter Unit Text" data-field="unit_text" aria-invalid={!!errors.unit_text} style={fieldStyle(!!errors.unit_text)} {...register('unit_text')} />
                </FormGroup>

                <FormGroup label="Screening Cutoff" htmlFor="mp-screening" required error={errors.screening_cutoff?.message}>
                  <input id="mp-screening" type="text" placeholder="Enter Screening Cutoff" data-field="screening_cutoff" aria-invalid={!!errors.screening_cutoff} style={fieldStyle(!!errors.screening_cutoff)} {...register('screening_cutoff')} />
                </FormGroup>

                <FormGroup label="Confirmation Cutoff" htmlFor="mp-confirmation" required error={errors.confirmation_cutoff?.message}>
                  <input id="mp-confirmation" type="text" placeholder="Enter Confirmation Cutoff" data-field="confirmation_cutoff" aria-invalid={!!errors.confirmation_cutoff} style={fieldStyle(!!errors.confirmation_cutoff)} {...register('confirmation_cutoff')} />
                </FormGroup>

                <div className="form-group">
                  <label htmlFor="mp-description">Description</label>
                  <textarea id="mp-description" rows={3} data-field="description" style={{ ...fieldStyle(false), resize: 'vertical', fontFamily: 'inherit' }} {...register('description')} />
                </div>

                <div className="form-group">
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', color: errors.is_mandatory ? '#b91c1c' : undefined }}>
                    <input type="checkbox" data-field="is_mandatory" aria-invalid={!!errors.is_mandatory} style={{ width: 16, height: 16, cursor: 'pointer', outline: errors.is_mandatory ? '2px solid #ef4444' : undefined }} {...register('is_mandatory')} />
                    Is Mandatory <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  {errors.is_mandatory?.message && (
                    <div role="alert" style={{ color: '#ef4444', fontSize: '0.78rem', marginTop: '0.35rem', fontWeight: 500 }}>{errors.is_mandatory.message}</div>
                  )}
                </div>

                <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.5rem' }}>
                  <button type="submit" className="btn btn-primary" disabled={saving}>
                    {saving ? <><MdHourglassEmpty size={16} aria-hidden /> Saving...</> : <><MdSave size={16} aria-hidden /> Save</>}
                  </button>
                  <button type="button" className="btn btn-ghost" onClick={resetForm} disabled={saving}><MdRefresh size={16} style={{ verticalAlign: 'text-bottom', marginRight: '0.35rem' }} aria-hidden />Reset</button>
                </div>
              </div>
            </form>
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
                <span title="Global parameter (read-only)" style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600 }}>
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
