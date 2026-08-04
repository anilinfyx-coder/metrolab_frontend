'use client';
import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import TopNav from '../../../components/TopNav';
import { useConfirm } from '../../../components/ConfirmModal';
import ListingTable, { ActionIcons, ListingColumn } from '../../../components/ListingTable';
import { FormGroup } from '../../../components/FormField';
import { apiFetch } from '../../../../lib/api';
import { patchListItem } from '../../../../lib/listState';
import { createInvalidHandler, fieldStyle, formResolver } from '../../../../lib/formHelpers';
import { stateSchema, type StateFormValues } from '../../../../lib/schemas';

interface Country { id: number; name: string; }
interface StateData { id: number; country_id: number; name: string; description: string; status: boolean; }

const emptyForm: StateFormValues = { country_id: '', name: '', description: '' };

export default function StatePage() {
  const confirmDialog = useConfirm();
  const [countries, setCountries] = useState<Country[]>([]);
  const [states, setStates] = useState<StateData[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<StateFormValues>({
    resolver: formResolver<StateFormValues>(stateSchema),
    defaultValues: emptyForm,
  });

  const loadData = async () => {
    setLoading(true);
    try {
      const [countriesData, statesData] = await Promise.all([
        apiFetch<Country[]>('/api/Country', { tokenKey: 'superadmin_token' }),
        apiFetch<StateData[]>('/api/State', { tokenKey: 'superadmin_token' })
      ]);
      setCountries(countriesData || []);
      setStates(statesData || []);
    } catch {
      setStates([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, []);

  const resetForm = () => {
    setEditingId(null);
    reset(emptyForm);
  };

  const save = handleSubmit(async values => {
    setSaving(true);
    const method = editingId ? 'PUT' : 'POST';
    const path = '/api/State' + (editingId ? '/' + editingId : '');
    try {
      await apiFetch(path, {
        method,
        tokenKey: 'superadmin_token',
        body: JSON.stringify({
          country_id: Number(values.country_id),
          name: values.name.trim(),
          description: (values.description || '').trim(),
        }),
        successMessage: `State ${editingId ? 'updated' : 'added'} successfully.`,
        errorFallback: 'Unable to save state.',
      });
      resetForm();
      loadData();
    } catch {
      /* error toasted by apiFetch */
    } finally {
      setSaving(false);
    }
  }, createInvalidHandler<StateFormValues>());

  const remove = async (id: number) => {
    const ok = await confirmDialog({
      title: 'You are trying to delete a State, Please confirm',
      message: 'This cannot be restored once deleted.',
      cancelText: 'NO, WAIT!',
      confirmText: 'CONFIRM DELETION',
    });
    if (!ok) return;
    try {
      await apiFetch(`/api/State/${id}`, {
        method: 'DELETE',
        tokenKey: 'superadmin_token',
        successMessage: 'State deleted successfully.',
        errorFallback: 'Unable to delete state.',
      });
      if (editingId === id) resetForm();
      loadData();
    } catch {
      /* error toasted by apiFetch */
    }
  };

  const toggleStatus = async (s: StateData) => {
    try {
      await apiFetch(`/api/State/${s.id}`, {
        method: 'PUT',
        tokenKey: 'superadmin_token',
        body: JSON.stringify({ status: !s.status }),
        successMessage: 'Status updated successfully.',
      });
      setStates(prev => patchListItem(prev, s.id, { status: !s.status }));
    } catch {
      /* error toasted by apiFetch */
    }
  };

  const openEdit = (s: StateData) => {
    reset({
      country_id: String(s.country_id),
      name: s.name || '',
      description: s.description || '',
      id: s.id,
    });
    setEditingId(s.id);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const getCountryName = (id: number) => countries.find(c => c.id === id)?.name || id;

  const columns: ListingColumn<StateData>[] = [
    { key: 'name', label: 'Name', width: '35%', sortable: true },
    { key: 'country_id', label: 'Country', width: '35%', sortable: true, getValue: s => getCountryName(s.country_id), render: s => getCountryName(s.country_id) },
  ];

  return (
    <div className="page-content" style={{ paddingTop: 0 }}>
      <TopNav title="State Master" />
      <div className="page-body">
        <div className="specimen-type-split">
          <div className="card">
            <div className="card-header">
              <span className="card-title">{editingId ? 'Edit State Detail' : 'State Detail'}</span>
            </div>
            <form onSubmit={save} noValidate>
              <div className="card-body">
                <FormGroup label="Country" htmlFor="state-country" required error={errors.country_id?.message}>
                  <select
                    id="state-country"
                    data-field="country_id"
                    aria-invalid={!!errors.country_id}
                    style={fieldStyle(!!errors.country_id)}
                    {...register('country_id')}
                  >
                    <option value="">Select Country</option>
                    {countries.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </FormGroup>
                <FormGroup label="State Name" htmlFor="state-name" required error={errors.name?.message}>
                  <input
                    id="state-name"
                    type="text"
                    placeholder="Enter Name"
                    data-field="name"
                    aria-invalid={!!errors.name}
                    style={fieldStyle(!!errors.name)}
                    {...register('name')}
                  />
                </FormGroup>
                <FormGroup label="Description" htmlFor="state-description" error={errors.description?.message}>
                  <textarea
                    id="state-description"
                    placeholder="Enter Description"
                    rows={4}
                    data-field="description"
                    aria-invalid={!!errors.description}
                    style={fieldStyle(!!errors.description)}
                    {...register('description')}
                  />
                </FormGroup>
              </div>
              <div className="specimen-type-form-actions">
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? 'Saving...' : 'Save'}
                </button>
                <button type="button" className="btn btn-ghost" onClick={resetForm} disabled={saving}>
                  Reset Data
                </button>
              </div>
            </form>
          </div>

          <ListingTable
            title="List of State Details"
            columns={columns}
            rows={states}
            loading={loading}
            emptyText="No state records found."
            actionsLabel="Actions"
            actionsWidth={120}
            defaultPageSize={10}
            rowActions={s => (
              <ActionIcons
                onEdit={() => openEdit(s)}
                onDelete={() => remove(s.id)}
                onToggleStatus={() => toggleStatus(s)}
                statusActive={s.status !== false}
              />
            )}
          />
        </div>
      </div>
    </div>
  );
}
