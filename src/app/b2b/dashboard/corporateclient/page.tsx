'use client';
import { useState, useEffect, useMemo } from 'react';
import TopNav from '../../../components/TopNav';
import { useConfirm } from '../../../components/ConfirmModal';
import ListingTable, { ActionIcons, ListingHeaderActions, ListingColumn } from '../../../components/ListingTable';
import { apiFetch, toastApiError } from '../../../../lib/api';

function getUser() { return typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('b2b_user') || '{}') : {}; }

interface CorporateClient {
  id: number; company_name: string; contact_person_name: string;
  email: string; mobile: string; status: boolean; address?: string;
  country_id?: number | string | null; state_id?: number | string | null;
  city_id?: number | string | null; pincode?: string; password?: string;
  b2b_client_id?: number | string | null;
}

interface GeoItem { id: number; name: string; country_id?: number; state_id?: number; }

const emptyClient = {
  company_name: '', contact_person_name: '', email: '', mobile: '',
  address: '', country_id: '', state_id: '', city_id: '', pincode: '', password: ''
};

/** Same password rules as Staff Users / B2B Profile */
function validatePassword(password: string): string | null {
  const pwd = password.trim();
  if (!pwd) return 'Password is required.';
  if (pwd.length < 6) return 'Password must be at least 6 characters.';
  if (/[^a-zA-Z0-9@#]/.test(pwd)) return 'Only @ # are allowed as special characters in password.';
  return null;
}

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
  const [form, setForm] = useState({ ...emptyClient, id: null as number | null });
  const [saving, setSaving] = useState(false);

  const [countries, setCountries] = useState<GeoItem[]>([]);
  const [states, setStates] = useState<GeoItem[]>([]);
  const [cities, setCities] = useState<GeoItem[]>([]);

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
      const data = await apiFetch<GeoItem[]>('/api/Country', {
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
    if (!form.country_id) {
      setStates([]);
      return;
    }
    apiFetch<GeoItem[]>(`/api/State?country_id=${form.country_id}`, {
      tokenKey: 'b2b_token',
      errorFallback: 'Unable to load states.',
    })
      .then(data => setStates(data || []))
      .catch(() => setStates([]));
  }, [form.country_id]);

  useEffect(() => {
    if (!form.state_id) {
      setCities([]);
      return;
    }
    apiFetch<GeoItem[]>(`/api/City?state_id=${form.state_id}`, {
      tokenKey: 'b2b_token',
      errorFallback: 'Unable to load cities.',
    })
      .then(data => setCities(data || []))
      .catch(() => setCities([]));
  }, [form.state_id]);

  const filteredStates = useMemo(
    () => states.filter(s => !form.country_id || Number(s.country_id) === Number(form.country_id)),
    [states, form.country_id]
  );
  const filteredCities = useMemo(
    () => cities.filter(c => !form.state_id || Number(c.state_id) === Number(form.state_id)),
    [cities, form.state_id]
  );

  const generatePassword = () => {
    const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789@#";
    let pass = "";
    for (let i = 0; i < 10; i++) pass += chars.charAt(Math.floor(Math.random() * chars.length));
    return pass;
  };

  const openAdd = () => {
    setForm({ ...emptyClient, id: null, password: generatePassword() });
    setView('form');
  };

  const openEdit = (c: CorporateClient) => {
    setForm({
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
    setForm({ ...emptyClient, id: null });
  };

  const resetForm = () => {
    if (form.id) {
      const existing = clients.find(c => c.id === form.id);
      if (existing) openEdit(existing);
      else setForm({ ...emptyClient, id: form.id });
    } else {
      setForm({ ...emptyClient, id: null });
    }
  };

  const save = async () => {
    if (!form.company_name.trim() || !form.contact_person_name.trim() || !form.mobile.trim() ||
        !form.email.trim() || !form.address.trim() || !form.country_id || !form.state_id || !form.city_id) {
      toastApiError('Please fill all required fields.');
      return;
    }
    if (!form.id && !form.password.trim()) {
      toastApiError('Password is required for new corporate clients.');
      return;
    }
    if (!form.id || form.password.trim()) {
      const pwdError = validatePassword(form.password);
      if (pwdError) {
        toastApiError(pwdError);
        return;
      }
    }

    setSaving(true);
    const method = form.id ? 'PUT' : 'POST';
    const path = `/api/CorporateClients${form.id ? `/${form.id}` : ''}`;

    const payload: Record<string, unknown> = {
      company_name: form.company_name.trim(),
      contact_person_name: form.contact_person_name.trim(),
      email: form.email.trim(),
      mobile: form.mobile.trim(),
      address: form.address.trim(),
      country_id: form.country_id ? Number(form.country_id) : null,
      state_id: form.state_id ? Number(form.state_id) : null,
      city_id: form.city_id ? Number(form.city_id) : null,
      pincode: form.pincode.trim() || null,
      b2b_client_id: getUser().id,
    };
    if (form.password.trim()) payload.password = form.password.trim();

    try {
      await apiFetch(path, {
        method,
        tokenKey: 'b2b_token',
        body: JSON.stringify(payload),
        errorFallback: 'Failed to save corporate client.',
      });
      closeForm();
      loadData();
    } catch {
      /* toast handled by apiFetch */
    } finally {
      setSaving(false);
    }
  };

  const toggleStatus = async (c: CorporateClient) => {
    try {
      await apiFetch(`/api/CorporateClients/${c.id}`, {
        method: 'PUT',
        tokenKey: 'b2b_token',
        body: JSON.stringify({ status: !c.status }),
        errorFallback: 'Failed to update corporate client status.',
      });
      loadData();
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
        <div style={{ padding: '1.25rem 1.5rem' }}>
          <div className="card">
            <div className="listing-card-header">
              <h2 className="listing-card-title">Corporate Client Details</h2>
              <button type="button" className="listing-header-link" onClick={closeForm}>Close</button>
            </div>
            <div className="card-body">
              <div className="detail-form-grid">
                <div className="form-group">
                  <label>Company Name<span className="required-star">*</span></label>
                  <input
                    type="text"
                    placeholder="Enter Company Name"
                    value={form.company_name}
                    onChange={e => setForm(p => ({ ...p, company_name: e.target.value }))}
                  />
                </div>
                <div className="form-group">
                  <label>Contact Person Name<span className="required-star">*</span></label>
                  <input
                    type="text"
                    placeholder="Enter Contact Person Name"
                    value={form.contact_person_name}
                    onChange={e => setForm(p => ({ ...p, contact_person_name: e.target.value }))}
                  />
                </div>
                <div className="form-group">
                  <label>Mobile<span className="required-star">*</span></label>
                  <input
                    type="text"
                    placeholder="Enter Mobile"
                    value={form.mobile}
                    onChange={e => setForm(p => ({ ...p, mobile: e.target.value }))}
                  />
                </div>

                <div className="form-group">
                  <label>Email<span className="required-star">*</span></label>
                  <input
                    type="email"
                    placeholder="Enter Email"
                    value={form.email}
                    onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
                  />
                </div>
                <div className="form-group">
                  <label>
                    Password{!form.id && <span className="required-star">*</span>}
                    {form.id && (
                      <span style={{ fontWeight: 400, color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                        {' '}(leave blank to keep current)
                      </span>
                    )}
                  </label>
                  <input
                    type="password"
                    placeholder={form.id ? 'Leave blank to keep current' : 'Enter Password'}
                    value={form.password}
                    onChange={e => !!form.id && setForm(p => ({ ...p, password: e.target.value }))}
                    readOnly={!form.id}
                    style={!form.id ? { backgroundColor: 'var(--bg-card)', cursor: 'not-allowed' } : {}}
                    autoComplete="new-password"
                  />
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.35rem', fontStyle: 'italic' }}>
                    (Enter atleast 6 characters. Only @ # are allowed as special character)
                  </div>
                </div>
                <div className="form-group">
                  <label>Address<span className="required-star">*</span></label>
                  <input
                    type="text"
                    placeholder="Enter Address"
                    value={form.address}
                    onChange={e => setForm(p => ({ ...p, address: e.target.value }))}
                  />
                </div>

                <div className="form-group">
                  <label>Country<span className="required-star">*</span></label>
                  <select
                    value={form.country_id}
                    onChange={e => setForm(p => ({ ...p, country_id: e.target.value, state_id: '', city_id: '' }))}
                  >
                    <option value="">Select Country</option>
                    {countries.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>State<span className="required-star">*</span></label>
                  <select
                    value={form.state_id}
                    onChange={e => setForm(p => ({ ...p, state_id: e.target.value, city_id: '' }))}
                    disabled={!form.country_id}
                  >
                    <option value="">Select State</option>
                    {filteredStates.map(s => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>City<span className="required-star">*</span></label>
                  <select
                    value={form.city_id}
                    onChange={e => setForm(p => ({ ...p, city_id: e.target.value }))}
                    disabled={!form.state_id}
                  >
                    <option value="">Select City</option>
                    {filteredCities.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>Pincode</label>
                  <input
                    type="text"
                    placeholder="Enter Pincode"
                    value={form.pincode}
                    onChange={e => setForm(p => ({ ...p, pincode: e.target.value }))}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.25rem' }}>
                <button type="button" className="btn btn-primary" onClick={save} disabled={saving}>
                  {saving ? 'Saving…' : 'Save'}
                </button>
                <button type="button" className="btn btn-reset" onClick={resetForm}>
                  Reset Data
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page-content" style={{ paddingTop: 0 }}>
      <TopNav title="Manage Corporate Client" />
      <div style={{ padding: '1.25rem 1.5rem' }}>
        <ListingTable
          title="List of Corporate Clients"
          columns={columns}
          rows={clients}
          loading={loading}
          emptyText="No Corporate Clients found."
          headerActions={<ListingHeaderActions onAdd={openAdd} onRefresh={loadData} />}
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
