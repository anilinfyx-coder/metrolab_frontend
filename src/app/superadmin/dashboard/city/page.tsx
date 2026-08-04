'use client';
import { useState, useEffect } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import TopNav from '../../../components/TopNav';
import { useConfirm } from '../../../components/ConfirmModal';
import ListingTable, { ActionIcons, ListingColumn } from '../../../components/ListingTable';
import { FormGroup } from '../../../components/FormField';
import { apiFetch } from '../../../../lib/api';
import { patchListItem } from '../../../../lib/listState';
import { createInvalidHandler, fieldStyle, formResolver } from '../../../../lib/formHelpers';
import { citySchema, type CityFormValues } from '../../../../lib/schemas';

interface Country { id: number; name: string; }
interface StateData { id: number; country_id: number; name: string; }
interface CityData { id: number; country_id: number; state_id: number; name: string; description: string; status: boolean; }

const emptyForm: CityFormValues = { country_id: '', state_id: '', name: '', description: '' };

export default function CityPage() {
  const confirmDialog = useConfirm();
  const [countries, setCountries] = useState<Country[]>([]);
  const [allStates, setAllStates] = useState<StateData[]>([]);
  const [cities, setCities] = useState<CityData[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    control,
    setValue,
    formState: { errors },
  } = useForm<CityFormValues>({
    resolver: formResolver<CityFormValues>(citySchema),
    defaultValues: emptyForm,
  });

  const selectedCountry = useWatch({ control, name: 'country_id' });
  const filteredStates = allStates.filter(s => String(s.country_id) === String(selectedCountry));

  // Reset state dropdown when country changes manually (not on first load)
  useEffect(() => {
    if (selectedCountry && !editingId) {
      setValue('state_id', '');
    }
  }, [selectedCountry, setValue, editingId]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [countriesData, statesData, citiesData] = await Promise.all([
        apiFetch<Country[]>('/api/Country', { tokenKey: 'superadmin_token' }),
        apiFetch<StateData[]>('/api/State', { tokenKey: 'superadmin_token' }),
        apiFetch<CityData[]>('/api/City', { tokenKey: 'superadmin_token' })
      ]);
      setCountries(countriesData || []);
      setAllStates(statesData || []);
      setCities(citiesData || []);
    } catch {
      setCities([]);
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
    const path = '/api/City' + (editingId ? '/' + editingId : '');
    try {
      await apiFetch(path, {
        method,
        tokenKey: 'superadmin_token',
        body: JSON.stringify({
          country_id: Number(values.country_id),
          state_id: Number(values.state_id),
          name: values.name.trim(),
          description: (values.description || '').trim(),
        }),
        successMessage: `City ${editingId ? 'updated' : 'added'} successfully.`,
        errorFallback: 'Unable to save city.',
      });
      resetForm();
      loadData();
    } catch {
      /* error toasted by apiFetch */
    } finally {
      setSaving(false);
    }
  }, createInvalidHandler<CityFormValues>());

  const remove = async (id: number) => {
    const ok = await confirmDialog({
      title: 'You are trying to delete a City, Please confirm',
      message: 'This cannot be restored once deleted.',
      cancelText: 'NO, WAIT!',
      confirmText: 'CONFIRM DELETION',
    });
    if (!ok) return;
    try {
      await apiFetch(`/api/City/${id}`, {
        method: 'DELETE',
        tokenKey: 'superadmin_token',
        successMessage: 'City deleted successfully.',
        errorFallback: 'Unable to delete city.',
      });
      if (editingId === id) resetForm();
      loadData();
    } catch {
      /* error toasted by apiFetch */
    }
  };

  const toggleStatus = async (c: CityData) => {
    try {
      await apiFetch(`/api/City/${c.id}`, {
        method: 'PUT',
        tokenKey: 'superadmin_token',
        body: JSON.stringify({ status: !c.status }),
        successMessage: 'Status updated successfully.',
      });
      setCities(prev => patchListItem(prev, c.id, { status: !c.status }));
    } catch {
      /* error toasted by apiFetch */
    }
  };

  const openEdit = (c: CityData) => {
    reset({
      country_id: String(c.country_id),
      state_id: String(c.state_id),
      name: c.name || '',
      description: c.description || '',
      id: c.id,
    });
    setEditingId(c.id);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const getCountryName = (id: number) => countries.find(x => x.id === id)?.name || id;
  const getStateName = (id: number) => allStates.find(x => x.id === id)?.name || id;

  const columns: ListingColumn<CityData>[] = [
    { key: 'name', label: 'City', width: '25%', sortable: true },
    { key: 'state_id', label: 'State', width: '25%', sortable: true, getValue: c => getStateName(c.state_id), render: c => getStateName(c.state_id) },
    { key: 'country_id', label: 'Country', width: '25%', sortable: true, getValue: c => getCountryName(c.country_id), render: c => getCountryName(c.country_id) },
  ];

  return (
    <div className="page-content" style={{ paddingTop: 0 }}>
      <TopNav title="City Master" />
      <div className="page-body">
        <div className="specimen-type-split">
          <div className="card">
            <div className="card-header">
              <span className="card-title">{editingId ? 'Edit City Detail' : 'City Detail'}</span>
            </div>
            <form onSubmit={save} noValidate>
              <div className="card-body">
                <FormGroup label="Country" htmlFor="city-country" required error={errors.country_id?.message}>
                  <select
                    id="city-country"
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
                <FormGroup label="State" htmlFor="city-state" required error={errors.state_id?.message}>
                  <select
                    id="city-state"
                    data-field="state_id"
                    aria-invalid={!!errors.state_id}
                    style={fieldStyle(!!errors.state_id)}
                    {...register('state_id')}
                    disabled={!selectedCountry}
                  >
                    <option value="">Select State</option>
                    {filteredStates.map(s => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </FormGroup>
                <FormGroup label="City Name" htmlFor="city-name" required error={errors.name?.message}>
                  <input
                    id="city-name"
                    type="text"
                    placeholder="Enter Name"
                    data-field="name"
                    aria-invalid={!!errors.name}
                    style={fieldStyle(!!errors.name)}
                    {...register('name')}
                  />
                </FormGroup>
                <FormGroup label="Description" htmlFor="city-description" error={errors.description?.message}>
                  <textarea
                    id="city-description"
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
            title="List of City Details"
            columns={columns}
            rows={cities}
            loading={loading}
            emptyText="No city records found."
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
