'use client';
import { useState, useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import TopNav from '../../../components/TopNav';
import { useConfirm } from '../../../components/ConfirmModal';
import { FormGroup } from '../../../components/FormField';
import PasswordInput from '../../../components/PasswordInput';
import ListingTable, { ActionIcons, ListingHeaderActions, ListingColumn } from '../../../components/ListingTable';
import { apiFetch } from '../../../../lib/api';
import { patchListItem } from '../../../../lib/listState';
import { createInvalidHandler, fieldStyle, formResolver, generateAutoPassword } from '../../../../lib/formHelpers';
import {
  corporateClientFormSchema,
  PASSWORD_HELPER_TEXT,
  type CorporateClientFormValues,
} from '../../../../lib/schemas';

function getUser() { return typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('b2b_user') || '{}') : {}; }

interface CorporateClient {
  id: number; company_name: string; contact_person_name: string;
  email: string; mobile: string; status: boolean; address?: string;
  country_id?: number | string | null; state_id?: number | string | null;
  city_id?: number | string | null; pincode?: string; password?: string;
  b2b_client_id?: number | string | null;
}

interface GeoItem { id: number; name: string; country_id?: number; state_id?: number; }

const emptyClient: CorporateClientFormValues = {
  company_name: '', contact_person_name: '', email: '', mobile: '',
  address: '', country_id: '', state_id: '', city_id: '', pincode: '', password: '', id: null,
};

const columns: ListingColumn<CorporateClient>[] = [
  { key: 'company_name', label: 'Company Name', sortable: true },
  { key: 'contact_person_name', label: 'Contact', sortable: true },
  { key: 'mobile', label: 'Mobile', sortable: true },
  { key: 'email', label: 'Email', sortable: true },
  {
    key: 'status',
    label: 'Status',
    sortable: true,
    getValue: (r) => (r.status ? 'Active' : 'Inactive'),
    render: (r) => (
      <span className={`badge ${r.status ? 'badge-success' : 'badge-danger'}`}>
        {r.status ? 'Active' : 'Inactive'}
      </span>
    ),
  },
];

export default function CorporateClientPage() {
  const confirmDialog = useConfirm();
  const [view, setView] = useState<'list' | 'form'>('list');
  const [clients, setClients] = useState<CorporateClient[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  const [countries, setCountries] = useState<GeoItem[]>([]);
  const [states, setStates] = useState<GeoItem[]>([]);
  const [cities, setCities] = useState<GeoItem[]>([]);

  const schema = useMemo(() => corporateClientFormSchema(!!editingId), [editingId]);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<CorporateClientFormValues>({
    resolver: formResolver<CorporateClientFormValues>(schema),
    defaultValues: emptyClient,
  });

  const countryId = watch('country_id');
  const stateId = watch('state_id');

  const loadData = async () => {
    setLoading(true);
    try {
      const all = await apiFetch<CorporateClient[]>('/api/CorporateClients', {
        tokenKey: 'b2b_token',
        errorFallback: 'Unable to load corporate clients.',
      });
      const b2bId = getUser().id;
      setClients(b2bId ? (all || []).filter((c) => Number(c.b2b_client_id) === Number(b2bId)) : (all || []));
    } catch {
      setClients([]);
    } finally {
      setLoading(false);
    }
  };

  const loadCountries = async () => {
    try {
      const data = await apiFetch<GeoItem[]>('/api/Country?status=true', {
        tokenKey: 'b2b_token',
        errorFallback: 'Unable to load countries.',
      });
      setCountries(data || []);
    } catch {
      setCountries([]);
    }
  };

  useEffect(() => {
    loadData();
    loadCountries();
  }, []);

  useEffect(() => {
    if (!countryId) {
      setStates([]);
      return;
    }
    apiFetch<GeoItem[]>(`/api/State?country_id=${countryId}&status=true`, {
      tokenKey: 'b2b_token',
      errorFallback: 'Unable to load states.',
    })
      .then(data => setStates(data || []))
      .catch(() => setStates([]));
  }, [countryId]);

  useEffect(() => {
    if (!stateId) {
      setCities([]);
      return;
    }
    apiFetch<GeoItem[]>(`/api/City?state_id=${stateId}&status=true`, {
      tokenKey: 'b2b_token',
      errorFallback: 'Unable to load cities.',
    })
      .then(data => setCities(data || []))
      .catch(() => setCities([]));
  }, [stateId]);

  const filteredStates = useMemo(
    () => states.filter(s => !countryId || Number(s.country_id) === Number(countryId)),
    [states, countryId]
  );
  const filteredCities = useMemo(
    () => cities.filter(c => !stateId || Number(c.state_id) === Number(stateId)),
    [cities, stateId]
  );

  const openAdd = () => {
    setEditingId(null);
    reset({ ...emptyClient, password: generateAutoPassword() });
    setView('form');
  };

  const openEdit = (c: CorporateClient) => {
    setEditingId(c.id);
    reset({
      company_name: c.company_name || '',
      contact_person_name: c.contact_person_name || '',
      email: c.email || '',
      mobile: c.mobile || '',
      address: c.address || '',
      country_id: c.country_id != null ? String(c.country_id) : '',
      state_id: c.state_id != null ? String(c.state_id) : '',
      city_id: c.city_id != null ? String(c.city_id) : '',
      pincode: c.pincode || '',
      password: '',
      id: c.id,
    });
    setView('form');
  };

  const closeForm = () => {
    setView('list');
    setEditingId(null);
    reset(emptyClient);
  };

  const resetForm = () => {
    if (editingId) {
      const existing = clients.find(c => c.id === editingId);
      if (existing) openEdit(existing);
      else reset({ ...emptyClient, id: editingId });
    } else {
      reset({ ...emptyClient, password: generateAutoPassword() });
    }
  };

  const save = handleSubmit(async values => {
    setSaving(true);
    const method = values.id ? 'PUT' : 'POST';
    const path = `/api/CorporateClients${values.id ? `/${values.id}` : ''}`;

    const payload: Record<string, unknown> = {
      company_name: values.company_name.trim(),
      contact_person_name: values.contact_person_name.trim(),
      email: values.email.trim(),
      mobile: values.mobile.trim(),
      address: values.address.trim(),
      country_id: values.country_id ? Number(values.country_id) : null,
      state_id: values.state_id ? Number(values.state_id) : null,
      city_id: values.city_id ? Number(values.city_id) : null,
      pincode: values.pincode.trim() || null,
      b2b_client_id: getUser().id,
    };
    if (values.password?.trim()) payload.password = values.password.trim();

    try {
      await apiFetch(path, {
        method,
        tokenKey: 'b2b_token',
        body: JSON.stringify(payload),
        successMessage: `Corporate client ${values.id ? 'updated' : 'added'} successfully.`,
        errorFallback: 'Failed to save corporate client.',
      });
      closeForm();
      loadData();
    } catch {
      /* toast handled by apiFetch */
    } finally {
      setSaving(false);
    }
  }, createInvalidHandler<CorporateClientFormValues>());

  const toggleStatus = async (c: CorporateClient) => {
    const enabling = !c.status;
    const ok = await confirmDialog({
      title: enabling ? 'Enable Corporate Client?' : 'Disable Corporate Client?',
      message: enabling
        ? `${c.company_name || 'This corporate client'} will become active.`
        : `${c.company_name || 'This corporate client'} will become inactive. You can enable it again later.`,
      cancelText: 'Cancel',
      confirmText: enabling ? 'Enable' : 'Disable',
    });
    if (!ok) return;
    try {
      await apiFetch(`/api/CorporateClients/${c.id}`, {
        method: 'PUT',
        tokenKey: 'b2b_token',
        body: JSON.stringify({ status: !c.status }),
        successMessage: 'Status Updated Successfully',
        errorFallback: 'Failed to update corporate client status.',
      });
      setClients(prev => patchListItem(prev, c.id, { status: !c.status }));
    } catch {
      /* toast handled by apiFetch */
    }
  };

  const remove = async (id: number) => {
    const ok = await confirmDialog({
      title: 'You are trying to delete Corporate Client, Please confirm',
      message: 'This cannot be restored once deleted.',
      cancelText: 'NO, WAIT!',
      confirmText: 'CONFIRM DELETION',
    });
    if (!ok) return;
    try {
      await apiFetch(`/api/CorporateClients/${id}`, {
        method: 'DELETE',
        tokenKey: 'b2b_token',
        successMessage: 'Corporate client deleted successfully.',
        errorFallback: 'Failed to delete corporate client.',
      });
      loadData();
    } catch {
      /* toast handled by apiFetch */
    }
  };

  if (view === 'form') {
    return (
      <div className="page-content" style={{ paddingTop: 0 }}>
        <TopNav title="Manage Corporate Client" />
        <div className="page-body">
          <div className="card">
            <div className="listing-card-header">
              <h2 className="listing-card-title">Corporate Client Details</h2>
              <button type="button" className="listing-header-link" onClick={closeForm}>Close</button>
            </div>
            <form onSubmit={save} noValidate>
              <div className="card-body">
                <div className="detail-form-grid">
                  <FormGroup label="Company Name" htmlFor="cc-company" required error={errors.company_name?.message}>
                    <input id="cc-company" type="text" placeholder="Enter Company Name" data-field="company_name" aria-invalid={!!errors.company_name} style={fieldStyle(!!errors.company_name)} {...register('company_name')} />
                  </FormGroup>
                  <FormGroup label="Contact Person Name" htmlFor="cc-contact" required error={errors.contact_person_name?.message}>
                    <input id="cc-contact" type="text" placeholder="Enter Contact Person Name" data-field="contact_person_name" aria-invalid={!!errors.contact_person_name} style={fieldStyle(!!errors.contact_person_name)} {...register('contact_person_name')} />
                  </FormGroup>
                  <FormGroup label="Mobile" htmlFor="cc-mobile" required error={errors.mobile?.message}>
                    <input id="cc-mobile" type="text" inputMode="numeric" placeholder="Enter Mobile" data-field="mobile" aria-invalid={!!errors.mobile} style={fieldStyle(!!errors.mobile)} {...register('mobile')} />
                  </FormGroup>
                  <FormGroup label="Email" htmlFor="cc-email" required error={errors.email?.message}>
                    <input id="cc-email" type="email" placeholder="Enter Email" data-field="email" aria-invalid={!!errors.email} style={fieldStyle(!!errors.email)} {...register('email')} />
                  </FormGroup>
                  <FormGroup label="Password" htmlFor="cc-password" required={!editingId} error={errors.password?.message}>
                    <PasswordInput
                      id="cc-password"
                      placeholder={editingId ? 'Leave blank to keep current' : 'Enter Password'}
                      data-field="password"
                      aria-invalid={!!errors.password}
                      style={fieldStyle(!!errors.password, !editingId ? { backgroundColor: 'var(--bg-card)', cursor: 'not-allowed' } : {})}
                      readOnly={!editingId}
                      autoComplete="new-password"
                      {...register('password')}
                    />
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.35rem', fontStyle: 'italic' }}>
                      {PASSWORD_HELPER_TEXT}
                    </div>
                  </FormGroup>
                  <FormGroup label="Address" htmlFor="cc-address" required error={errors.address?.message}>
                    <input id="cc-address" type="text" placeholder="Enter Address" data-field="address" aria-invalid={!!errors.address} style={fieldStyle(!!errors.address)} {...register('address')} />
                  </FormGroup>
                  <FormGroup label="Country" htmlFor="cc-country" required error={errors.country_id?.message}>
                    <select
                      id="cc-country"
                      data-field="country_id"
                      aria-invalid={!!errors.country_id}
                      style={fieldStyle(!!errors.country_id)}
                      {...register('country_id', {
                        onChange: e => {
                          setValue('country_id', e.target.value);
                          setValue('state_id', '');
                          setValue('city_id', '');
                        },
                      })}
                    >
                      <option value="">Select Country</option>
                      {countries.map(c => (<option key={c.id} value={c.id}>{c.name}</option>))}
                    </select>
                  </FormGroup>
                  <FormGroup label="State" htmlFor="cc-state" required error={errors.state_id?.message}>
                    <select
                      id="cc-state"
                      data-field="state_id"
                      disabled={!countryId}
                      aria-invalid={!!errors.state_id}
                      style={fieldStyle(!!errors.state_id)}
                      {...register('state_id', {
                        onChange: e => {
                          setValue('state_id', e.target.value);
                          setValue('city_id', '');
                        },
                      })}
                    >
                      <option value="">Select State</option>
                      {filteredStates.map(s => (<option key={s.id} value={s.id}>{s.name}</option>))}
                    </select>
                  </FormGroup>
                  <FormGroup label="City" htmlFor="cc-city" required error={errors.city_id?.message}>
                    <select id="cc-city" data-field="city_id" disabled={!stateId} aria-invalid={!!errors.city_id} style={fieldStyle(!!errors.city_id)} {...register('city_id')}>
                      <option value="">Select City</option>
                      {filteredCities.map(c => (<option key={c.id} value={c.id}>{c.name}</option>))}
                    </select>
                  </FormGroup>
                  <FormGroup label="Pincode" htmlFor="cc-pincode" error={errors.pincode?.message}>
                    <input id="cc-pincode" type="text" placeholder="Enter Pincode" data-field="pincode" style={fieldStyle(!!errors.pincode)} {...register('pincode')} />
                  </FormGroup>
                </div>

                <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.25rem' }}>
                  <button type="submit" className="btn btn-primary" disabled={saving}>
                    {saving ? 'Saving…' : 'Save'}
                  </button>
                  <button type="button" className="btn btn-reset" onClick={resetForm}>
                    Reset Data
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page-content" style={{ paddingTop: 0 }}>
      <TopNav title="Manage Corporate Client" />
      <div className="page-body">
        <ListingTable
          title="List of Corporate Clients"
          columns={columns}
          rows={clients}
          loading={loading}
          emptyText="No Corporate Clients found."
          headerActions={<ListingHeaderActions onAdd={openAdd} />}
          rowActions={(c) => (
            <ActionIcons
              onEdit={() => openEdit(c)}
              onToggleStatus={() => toggleStatus(c)}
              onDelete={() => remove(c.id)}
              statusActive={!!c.status}
            />
          )}
        />
      </div>
    </div>
  );
}
