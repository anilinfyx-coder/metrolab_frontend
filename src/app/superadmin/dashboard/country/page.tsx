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
import { countrySchema, type CountryFormValues } from '../../../../lib/schemas';

interface Country { id: number; name: string; description: string; status: boolean; }

const emptyForm: CountryFormValues = { name: '', description: '' };

export default function CountryPage() {
  const confirmDialog = useConfirm();
  const [countries, setCountries] = useState<Country[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CountryFormValues>({
    resolver: formResolver<CountryFormValues>(countrySchema),
    defaultValues: emptyForm,
  });

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await apiFetch<Country[]>('/api/Country', { tokenKey: 'superadmin_token' });
      setCountries(data || []);
    } catch {
      setCountries([]);
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
    const path = '/api/Country' + (editingId ? '/' + editingId : '');
    try {
      await apiFetch(path, {
        method,
        tokenKey: 'superadmin_token',
        body: JSON.stringify({
          name: values.name.trim(),
          description: (values.description || '').trim(),
        }),
        successMessage: `Country ${editingId ? 'updated' : 'added'} successfully.`,
        errorFallback: 'Unable to save country.',
      });
      resetForm();
      loadData();
    } catch {
      /* error toasted by apiFetch */
    } finally {
      setSaving(false);
    }
  }, createInvalidHandler<CountryFormValues>());

  const remove = async (id: number) => {
    const ok = await confirmDialog({
      title: 'You are trying to delete a Country, Please confirm',
      message: 'This cannot be restored once deleted.',
      cancelText: 'NO, WAIT!',
      confirmText: 'CONFIRM DELETION',
    });
    if (!ok) return;
    try {
      await apiFetch(`/api/Country/${id}`, {
        method: 'DELETE',
        tokenKey: 'superadmin_token',
        successMessage: 'Country deleted successfully.',
        errorFallback: 'Unable to delete country.',
      });
      if (editingId === id) resetForm();
      loadData();
    } catch {
      /* error toasted by apiFetch */
    }
  };

  const toggleStatus = async (c: Country) => {
    try {
      await apiFetch(`/api/Country/${c.id}`, {
        method: 'PUT',
        tokenKey: 'superadmin_token',
        body: JSON.stringify({ status: !c.status }),
        successMessage: 'Status updated successfully.',
      });
      setCountries(prev => patchListItem(prev, c.id, { status: !c.status }));
    } catch {
      /* error toasted by apiFetch */
    }
  };

  const openEdit = (c: Country) => {
    reset({
      name: c.name || '',
      description: c.description || '',
      id: c.id,
    });
    setEditingId(c.id);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const columns: ListingColumn<Country>[] = [
    { key: 'name', label: 'Name', width: '70%', sortable: true },
  ];

  return (
    <div className="page-content" style={{ paddingTop: 0 }}>
      <TopNav title="Country Master" />
      <div className="page-body">
        <div className="specimen-type-split">
          <div className="card">
            <div className="card-header">
              <span className="card-title">{editingId ? 'Edit Country Detail' : 'Country Detail'}</span>
            </div>
            <form onSubmit={save} noValidate>
              <div className="card-body">
                <FormGroup label="Name" htmlFor="country-name" required error={errors.name?.message}>
                  <input
                    id="country-name"
                    type="text"
                    placeholder="Enter Name"
                    data-field="name"
                    aria-invalid={!!errors.name}
                    style={fieldStyle(!!errors.name)}
                    {...register('name')}
                  />
                </FormGroup>
                <FormGroup label="Description" htmlFor="country-description" error={errors.description?.message}>
                  <textarea
                    id="country-description"
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
            title="List of Country Details"
            columns={columns}
            rows={countries}
            loading={loading}
            emptyText="No country records found."
            actionsLabel="Actions"
            actionsWidth={120}
            defaultPageSize={10}
            rowActions={c => (
              <ActionIcons
                onEdit={() => openEdit(c)}
                onDelete={() => remove(c.id)}
                onToggleStatus={() => toggleStatus(c)}
                statusActive={c.status !== false}
              />
            )}
          />
        </div>
      </div>
    </div>
  );
}
