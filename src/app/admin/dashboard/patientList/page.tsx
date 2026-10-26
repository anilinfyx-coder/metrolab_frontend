'use client';
import { useState, useEffect } from 'react';
import { MdClose, MdVisibility, MdEdit } from 'react-icons/md';
import TopNav from '../../../components/TopNav';
import ListingTable, { ActionIcons, ListingColumn } from '../../../components/ListingTable';
import { useConfirm } from '../../../components/ConfirmModal';
import { formatDate } from '../../../utils/dateFormat';
import { apiFetch, handleApiResponse, toastApiError, toastApiSuccess, getToken, API_BASE } from '../../../../lib/api';
import { buildPageQuery, isPaginatedResult, PaginatedResult } from '../../../../lib/pagination';

interface Patient {
  id: number;
  name: string;
  mobile: string;
  email?: string | null;
  dob?: string | null;
  ssn?: string | null;
  uid?: string;
  gender?: string | number | null;
  driving_license?: string | null;
  driving_license_state?: string | null;
  street1?: string | null;
  street2?: string | null;
  country_id?: number | null;
  state_id?: number | null;
  city_id?: number | null;
  country?: string | null;
  city?: string | null;
  state?: string | null;
  zipcode?: string | null;
}

interface GeoItem {
  id: number;
  name: string;
}

interface TestHistoryEntry {
  id: number;
  waiting_list_id: number;
  creation_timestamp: string;
  reason_for_test: string;
  lab_test_id: number;
  lab_test_name: string;
  report_id?: number | null;
  report_uid?: string | null;
}

const US_STATES = [
  'Alabama','Alaska','Arizona','Arkansas','California','Colorado','Connecticut','Delaware',
  'Florida','Georgia','Hawaii','Idaho','Illinois','Indiana','Iowa','Kansas','Kentucky',
  'Louisiana','Maine','Maryland','Massachusetts','Michigan','Minnesota','Mississippi',
  'Missouri','Montana','Nebraska','Nevada','New Hampshire','New Jersey','New Mexico',
  'New York','North Carolina','North Dakota','Ohio','Oklahoma','Oregon','Pennsylvania',
  'Rhode Island','South Carolina','South Dakota','Tennessee','Texas','Utah','Vermont',
  'Virginia','Washington','West Virginia','Wisconsin','Wyoming'
];

const GENDER_LABELS: Record<string, string> = {
  '1': 'Male',
  '2': 'Female',
  '3': 'Prefer not to Declare',
  male: 'Male',
  female: 'Female',
};

function genderLabel(gender: string | number | null | undefined): string {
  if (gender == null || gender === '') return '—';
  const key = String(gender).trim();
  const mapped = GENDER_LABELS[key] || GENDER_LABELS[key.toLowerCase()];
  if (mapped) return mapped;
  if (/prefer not/i.test(key)) return 'Prefer not to Declare';
  return key;
}

function formatMobile(mobile?: string | null): string {
  if (!mobile) return '';
  const digits = String(mobile).replace(/\D/g, '');
  if (digits.length === 10) {
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  }
  if (digits.length === 11 && digits.startsWith('1')) {
    return `(${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7)}`;
  }
  return String(mobile);
}

function HistoryEyeIcon({ onClick, title = 'View History' }: { onClick: () => void; title?: string }) {
  return (
    <button type="button" className="history-eye-btn" title={title} onClick={onClick} aria-label={title}>
      <MdVisibility size={18} aria-hidden />
    </button>
  );
}

export default function PatientListPage() {
  const confirmDialog = useConfirm();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [total, setTotal] = useState(0);
  const [selected, setSelected] = useState<Patient | null>(null);
  const [history, setHistory] = useState<TestHistoryEntry[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [emailing, setEmailing] = useState(false);

  // Geo data for Edit modal
  const [countries, setCountries] = useState<GeoItem[]>([]);
  const [states, setStates] = useState<GeoItem[]>([]);
  const [cities, setCities] = useState<GeoItem[]>([]);
  const [loadingStates, setLoadingStates] = useState(false);
  const [loadingCities, setLoadingCities] = useState(false);

  // Edit Patient State
  const [editingPatient, setEditingPatient] = useState<Patient | null>(null);
  const [editForm, setEditForm] = useState({
    name: '',
    mobile: '',
    email: '',
    gender: '1',
    dob: '',
    driving_license_state: '',
    driving_license: '',
    street1: '',
    street2: '',
    country_id: '',
    state_id: '',
    city_id: '',
    country: '',
    state: '',
    city: '',
    zipcode: '',
    ssn: '',
  });
  const [editSaving, setEditSaving] = useState(false);
  const [editErrors, setEditErrors] = useState<Record<string, string>>({});

  const loadCountries = async (): Promise<GeoItem[]> => {
    if (countries.length > 0) return countries;
    try {
      const res = await fetch(`${API_BASE}/api/Country?status=true`, {
        headers: { token: getToken('admin_token') },
      });
      const list = await handleApiResponse<GeoItem[]>(res, { silent: true });
      const items = list || [];
      setCountries(items);
      return items;
    } catch {
      setCountries([]);
      return [];
    }
  };

  const fetchStates = async (cId: string | number): Promise<GeoItem[]> => {
    if (!cId) return [];
    try {
      const res = await fetch(`${API_BASE}/api/State?country_id=${cId}&status=true`, {
        headers: { token: getToken('admin_token') },
      });
      const list = await handleApiResponse<GeoItem[]>(res, { silent: true });
      return list || [];
    } catch {
      return [];
    }
  };

  const fetchCities = async (sId: string | number): Promise<GeoItem[]> => {
    if (!sId) return [];
    try {
      const res = await fetch(`${API_BASE}/api/City?state_id=${sId}&status=true`, {
        headers: { token: getToken('admin_token') },
      });
      const list = await handleApiResponse<GeoItem[]>(res, { silent: true });
      return list || [];
    } catch {
      return [];
    }
  };

  useEffect(() => {
    loadCountries();
  }, []);

  const openEdit = async (p: Patient) => {
    setEditErrors({});
    const initialDob = p.dob ? (p.dob.includes('T') ? p.dob.split('T')[0] : p.dob) : '';
    setEditingPatient(p);

    const countryList = await loadCountries();

    let curCountryId = p.country_id ? String(p.country_id) : '';
    let curStateId = p.state_id ? String(p.state_id) : '';
    let curCityId = p.city_id ? String(p.city_id) : '';
    let curCountry = p.country || '';
    let curState = p.state || '';
    let curCity = p.city || '';

    if (!curCountryId && curCountry && countryList.length > 0) {
      const matched = countryList.find(c => c.name.toLowerCase() === curCountry.trim().toLowerCase());
      if (matched) {
        curCountryId = String(matched.id);
        curCountry = matched.name;
      }
    }

    setEditForm({
      name: p.name || '',
      mobile: p.mobile || '',
      email: p.email || '',
      gender: p.gender != null ? String(p.gender) : '1',
      dob: initialDob,
      driving_license_state: p.driving_license_state || '',
      driving_license: p.driving_license || '',
      street1: p.street1 || '',
      street2: p.street2 || '',
      country_id: curCountryId,
      state_id: curStateId,
      city_id: curCityId,
      country: curCountry,
      state: curState,
      city: curCity,
      zipcode: p.zipcode || '',
      ssn: p.ssn || '',
    });

    if (curCountryId) {
      setLoadingStates(true);
      const stList = await fetchStates(curCountryId);
      setStates(stList);
      setLoadingStates(false);

      if (!curStateId && curState && stList.length > 0) {
        const matchedState = stList.find(s => s.name.toLowerCase() === curState.trim().toLowerCase());
        if (matchedState) {
          curStateId = String(matchedState.id);
          curState = matchedState.name;
          setEditForm(prev => ({ ...prev, state_id: curStateId, state: curState }));
        }
      }

      if (curStateId) {
        setLoadingCities(true);
        const ctList = await fetchCities(curStateId);
        setCities(ctList);
        setLoadingCities(false);

        if (!curCityId && curCity && ctList.length > 0) {
          const matchedCity = ctList.find(c => c.name.toLowerCase() === curCity.trim().toLowerCase());
          if (matchedCity) {
            curCityId = String(matchedCity.id);
            curCity = matchedCity.name;
            setEditForm(prev => ({ ...prev, city_id: curCityId, city: curCity }));
          }
        }
      } else {
        setCities([]);
      }
    } else {
      setStates([]);
      setCities([]);
    }

    try {
      const full = await apiFetch<Patient>(`/api/Patient/${p.id}`, {
        tokenKey: 'admin_token',
        silent: true,
      });
      if (full) {
        setEditingPatient(full);
        let fullCountryId = full.country_id ? String(full.country_id) : curCountryId;
        let fullStateId = full.state_id ? String(full.state_id) : curStateId;
        let fullCityId = full.city_id ? String(full.city_id) : curCityId;
        let fullCountry = full.country || curCountry;
        let fullState = full.state || curState;
        let fullCity = full.city || curCity;

        if (!fullCountryId && fullCountry && countryList.length > 0) {
          const matched = countryList.find(c => c.name.toLowerCase() === fullCountry.trim().toLowerCase());
          if (matched) {
            fullCountryId = String(matched.id);
            fullCountry = matched.name;
          }
        }

        setEditForm(prev => ({
          ...prev,
          name: full.name || prev.name,
          mobile: full.mobile || prev.mobile,
          email: full.email || prev.email,
          gender: full.gender != null ? String(full.gender) : prev.gender,
          dob: full.dob ? (full.dob.includes('T') ? full.dob.split('T')[0] : full.dob) : prev.dob,
          driving_license_state: full.driving_license_state || prev.driving_license_state,
          driving_license: full.driving_license || prev.driving_license,
          street1: full.street1 || prev.street1,
          street2: full.street2 || prev.street2,
          country_id: fullCountryId,
          state_id: fullStateId,
          city_id: fullCityId,
          country: fullCountry,
          state: fullState,
          city: fullCity,
          zipcode: full.zipcode || prev.zipcode,
          ssn: full.ssn || prev.ssn,
        }));

        if (fullCountryId && fullCountryId !== curCountryId) {
          setLoadingStates(true);
          const stList = await fetchStates(fullCountryId);
          setStates(stList);
          setLoadingStates(false);
          if (fullStateId) {
            setLoadingCities(true);
            const ctList = await fetchCities(fullStateId);
            setCities(ctList);
            setLoadingCities(false);
          }
        }
      }
    } catch {
      // Continue with current patient data if fetch fails
    }
  };

  const handleCountrySelect = async (cId: string) => {
    const selectedC = countries.find(c => String(c.id) === cId);
    setEditForm(prev => ({
      ...prev,
      country_id: cId,
      country: selectedC ? selectedC.name : '',
      state_id: '',
      state: '',
      city_id: '',
      city: '',
    }));
    setStates([]);
    setCities([]);
    if (cId) {
      setLoadingStates(true);
      try {
        const stList = await fetchStates(cId);
        setStates(stList);
      } finally {
        setLoadingStates(false);
      }
    }
  };

  const handleStateSelect = async (sId: string) => {
    const selectedS = states.find(s => String(s.id) === sId);
    setEditForm(prev => ({
      ...prev,
      state_id: sId,
      state: selectedS ? selectedS.name : '',
      city_id: '',
      city: '',
    }));
    setCities([]);
    if (sId) {
      setLoadingCities(true);
      try {
        const ctList = await fetchCities(sId);
        setCities(ctList);
      } finally {
        setLoadingCities(false);
      }
    }
  };

  const handleCitySelect = (ctId: string) => {
    const selectedCt = cities.find(c => String(c.id) === ctId);
    setEditForm(prev => ({
      ...prev,
      city_id: ctId,
      city: selectedCt ? selectedCt.name : '',
    }));
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPatient) return;

    const errors: Record<string, string> = {};
    if (!editForm.name.trim()) {
      errors.name = 'Patient name is required.';
    }
    const cleanMobile = editForm.mobile.replace(/\D/g, '');
    if (!cleanMobile) {
      errors.mobile = 'Mobile number is required.';
    } else if (cleanMobile.length < 9 || cleanMobile.length > 15) {
      errors.mobile = 'Mobile number must be between 9 and 15 digits.';
    }
    if (editForm.email?.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(editForm.email.trim())) {
      errors.email = 'Please enter a valid email address.';
    }

    if (Object.keys(errors).length > 0) {
      setEditErrors(errors);
      return;
    }

    setEditSaving(true);
    try {
      const payload = {
        name: editForm.name.trim(),
        mobile: editForm.mobile.trim(),
        email: editForm.email.trim(),
        gender: parseInt(editForm.gender, 10) || 1,
        dob: editForm.dob || null,
        driving_license_state: editForm.driving_license_state.trim(),
        driving_license: editForm.driving_license.trim(),
        street1: editForm.street1.trim(),
        street2: editForm.street2.trim(),
        country_id: editForm.country_id ? parseInt(editForm.country_id, 10) : null,
        state_id: editForm.state_id ? parseInt(editForm.state_id, 10) : null,
        city_id: editForm.city_id ? parseInt(editForm.city_id, 10) : null,
        country: editForm.country.trim(),
        state: editForm.state.trim(),
        city: editForm.city.trim(),
        zipcode: editForm.zipcode.trim(),
        ssn: editForm.ssn.trim(),
      };

      await apiFetch<Patient>(`/api/Patient/${editingPatient.id}`, {
        method: 'PUT',
        tokenKey: 'admin_token',
        body: JSON.stringify(payload),
        successMessage: 'Patient updated successfully.',
        errorFallback: 'Unable to update patient.',
      });

      setPatients(prev =>
        prev.map(p => (p.id === editingPatient.id ? { ...p, ...payload, id: p.id, uid: p.uid } : p))
      );

      if (selected && selected.id === editingPatient.id) {
        setSelected(prev => (prev ? { ...prev, ...payload } : null));
      }

      setEditingPatient(null);
    } catch {
      // Toast handled by apiFetch
    } finally {
      setEditSaving(false);
    }
  };

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const result = await apiFetch<PaginatedResult<Patient> | Patient[]>(
          `/api/Patient?${buildPageQuery(page, pageSize)}`,
          {
            tokenKey: 'admin_token',
            errorFallback: 'Failed to load patients.',
          },
        );
        if (isPaginatedResult<Patient>(result)) {
          setPatients(result.items);
          setTotal(result.total);
        } else {
          setPatients(result || []);
          setTotal((result || []).length);
        }
      } catch {
        setPatients([]);
        setTotal(0);
      } finally {
        setLoading(false);
      }
    })();
  }, [page, pageSize]);

  const viewHistory = async (p: Patient) => {
    setSelected(p);
    setHistoryLoading(true);
    setHistory([]);
    try {
      const res = await fetch(`${API_BASE}/api/WaitingList/patient/${p.id}/history`, {
        headers: { token: getToken('admin_token') },
      });
      const list = await handleApiResponse<TestHistoryEntry[]>(res, {
        errorFallback: 'Unable to load patient test history.',
      });
      setHistory(list || []);
    } catch {
      // Error toast handled by handleApiResponse
    } finally {
      setHistoryLoading(false);
    }
  };

  const downloadReport = async (entry: TestHistoryEntry) => {
    if (!entry.report_id) return;
    try {
      const blob = await apiFetch<Blob>('/api/LabTestCategoryReport/downloadLabTestCategoryReport', {
        method: 'POST',
        tokenKey: 'admin_token',
        body: JSON.stringify({ id: entry.report_id }),
        errorFallback: 'Report download failed.',
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${entry.report_uid || `Report-${entry.report_id}`}.pdf`;
      link.click();
      URL.revokeObjectURL(url);
    } catch {
      // Error toast handled by apiFetch
    }
  };

  const emailReport = async (entry: TestHistoryEntry) => {
    if (!entry.report_id || !selected || emailing) return;
    if (!selected.email?.trim()) {
      toastApiError('No email address is available for this patient.');
      return;
    }

    const confirmed = await confirmDialog({
      title: 'Send report by email?',
      message: `Email the ${entry.lab_test_name} report to ${selected.email}?`,
      cancelText: 'Cancel',
      confirmText: 'Send Email',
    });
    if (!confirmed) return;

    setEmailing(true);
    try {
      const res = await fetch(`${API_BASE}/api/LabTestCategoryReport/emailLabTestCategoryReport`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', token: getToken('admin_token') },
        body: JSON.stringify({ id: entry.report_id }),
      });
      const data = await handleApiResponse<{ email?: string }>(res, {
        errorFallback: 'Failed to send the report email.',
      });
      toastApiSuccess(`Report emailed successfully to ${data?.email || selected.email}.`);
    } catch {
      // Error toast handled by handleApiResponse
    } finally {
      setEmailing(false);
    }
  };

  const columns: ListingColumn<Patient>[] = [
    {
      key: 'uid',
      label: 'UID',
      sortable: true,
      filterable: true,
      width: '14%',
      getValue: (row) => row.uid || '',
    },
    {
      key: 'name',
      label: 'Patient Name',
      sortable: true,
      filterable: true,
      width: '26%',
      getValue: (row) => row.name || '',
    },
    {
      key: 'mobile',
      label: 'Mobile',
      sortable: true,
      filterable: true,
      width: '22%',
      getValue: (row) => formatMobile(row.mobile) || row.mobile || '',
      render: (row) => formatMobile(row.mobile) || row.mobile || '—',
    },
    {
      key: 'gender',
      label: 'Gender',
      sortable: true,
      filterable: true,
      width: '26%',
      getValue: (row) => genderLabel(row.gender),
      render: (row) => genderLabel(row.gender),
    },
    {
      key: 'actions',
      label: 'Actions',
      sortable: false,
      filterable: false,
      width: '14%',
      align: 'left',
      getValue: () => '',
      render: (row) => (
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.45rem' }}>
          <button
            type="button"
            className="action-btn action-btn-edit"
            title={`Edit patient — ${row.name || row.uid || ''}`}
            onClick={() => openEdit(row)}
            aria-label="Edit Patient"
          >
            <MdEdit size={14} aria-hidden />
          </button>
          <HistoryEyeIcon onClick={() => viewHistory(row)} title={`View history — ${row.name || row.uid || ''}`} />
        </div>
      ),
    },
  ];

  const historyColumns: ListingColumn<TestHistoryEntry>[] = [
    {
      key: 'creation_timestamp',
      label: 'Date',
      sortable: true,
      filterable: true,
      width: '22%',
      getValue: row => formatDate(row.creation_timestamp),
      render: row => formatDate(row.creation_timestamp),
    },
    {
      key: 'reason_for_test',
      label: 'Reason for Test',
      sortable: true,
      filterable: true,
      width: '30%',
      getValue: row => row.reason_for_test || '',
      render: row => row.reason_for_test || '—',
    },
    {
      key: 'lab_test_name',
      label: 'Test Name',
      sortable: true,
      filterable: true,
      width: '34%',
      getValue: row => row.lab_test_name || '',
      render: row => <span style={{ fontWeight: 500 }}>{row.lab_test_name || '—'}</span>,
    },
  ];

  const renderEditModal = () => {
    if (!editingPatient) return null;
    return (
      <div className="modal-overlay" onClick={() => setEditingPatient(null)}>
        <div
          className="modal"
          style={{ maxWidth: '720px', width: '95%', maxHeight: '90vh', overflowY: 'auto' }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="modal-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <h2 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 600 }}>Edit Patient</h2>
              {editingPatient.uid && (
                <span className="badge badge-primary" style={{ fontSize: '0.8rem', padding: '0.2rem 0.6rem' }}>
                  {editingPatient.uid}
                </span>
              )}
            </div>
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() => setEditingPatient(null)}
              aria-label="Close"
            >
              <MdClose size={18} />
            </button>
          </div>

          <form onSubmit={handleSaveEdit} noValidate>
            <div className="modal-body" style={{ padding: '1.25rem 1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
                <div className="form-group">
                  <label style={{ display: 'block', marginBottom: '0.35rem', fontWeight: 600, fontSize: '0.85rem' }}>
                    Patient Name <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <input
                    type="text"
                    className={`form-input${editErrors.name ? ' is-invalid' : ''}`}
                    placeholder="Full Name"
                    value={editForm.name}
                    onChange={(e) => {
                      setEditForm({ ...editForm, name: e.target.value });
                      if (editErrors.name) setEditErrors({ ...editErrors, name: '' });
                    }}
                  />
                  {editErrors.name && <span className="field-error" style={{ color: '#ef4444', fontSize: '0.78rem' }}>{editErrors.name}</span>}
                </div>

                <div className="form-group">
                  <label style={{ display: 'block', marginBottom: '0.35rem', fontWeight: 600, fontSize: '0.85rem' }}>
                    Mobile <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <input
                    type="tel"
                    className={`form-input${editErrors.mobile ? ' is-invalid' : ''}`}
                    placeholder="(202) 555-0123"
                    value={editForm.mobile}
                    onChange={(e) => {
                      setEditForm({ ...editForm, mobile: e.target.value });
                      if (editErrors.mobile) setEditErrors({ ...editErrors, mobile: '' });
                    }}
                  />
                  {editErrors.mobile && <span className="field-error" style={{ color: '#ef4444', fontSize: '0.78rem' }}>{editErrors.mobile}</span>}
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
                <div className="form-group">
                  <label style={{ display: 'block', marginBottom: '0.35rem', fontWeight: 600, fontSize: '0.85rem' }}>
                    Gender
                  </label>
                  <select
                    className="form-input"
                    value={editForm.gender}
                    onChange={(e) => setEditForm({ ...editForm, gender: e.target.value })}
                  >
                    <option value="1">Male</option>
                    <option value="2">Female</option>
                    <option value="3">Prefer not to Declare</option>
                  </select>
                </div>

                <div className="form-group">
                  <label style={{ display: 'block', marginBottom: '0.35rem', fontWeight: 600, fontSize: '0.85rem' }}>
                    Date of Birth
                  </label>
                  <input
                    type="date"
                    className="form-input"
                    value={editForm.dob}
                    onChange={(e) => setEditForm({ ...editForm, dob: e.target.value })}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
                <div className="form-group">
                  <label style={{ display: 'block', marginBottom: '0.35rem', fontWeight: 600, fontSize: '0.85rem' }}>
                    Email
                  </label>
                  <input
                    type="email"
                    className={`form-input${editErrors.email ? ' is-invalid' : ''}`}
                    placeholder="patient@example.com"
                    value={editForm.email}
                    onChange={(e) => {
                      setEditForm({ ...editForm, email: e.target.value });
                      if (editErrors.email) setEditErrors({ ...editErrors, email: '' });
                    }}
                  />
                  {editErrors.email && <span className="field-error" style={{ color: '#ef4444', fontSize: '0.78rem' }}>{editErrors.email}</span>}
                </div>

                <div className="form-group">
                  <label style={{ display: 'block', marginBottom: '0.35rem', fontWeight: 600, fontSize: '0.85rem' }}>
                    SSN
                  </label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="XXX-XX-XXXX"
                    value={editForm.ssn}
                    onChange={(e) => setEditForm({ ...editForm, ssn: e.target.value })}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
                <div className="form-group">
                  <label style={{ display: 'block', marginBottom: '0.35rem', fontWeight: 600, fontSize: '0.85rem' }}>
                    Driving License State
                  </label>
                  <select
                    className="form-input"
                    value={editForm.driving_license_state}
                    onChange={(e) => setEditForm({ ...editForm, driving_license_state: e.target.value })}
                  >
                    <option value="">Select State</option>
                    {US_STATES.map((st) => (
                      <option key={st} value={st}>{st}</option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label style={{ display: 'block', marginBottom: '0.35rem', fontWeight: 600, fontSize: '0.85rem' }}>
                    Driving License
                  </label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="License Number"
                    value={editForm.driving_license}
                    onChange={(e) => setEditForm({ ...editForm, driving_license: e.target.value })}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
                <div className="form-group">
                  <label style={{ display: 'block', marginBottom: '0.35rem', fontWeight: 600, fontSize: '0.85rem' }}>
                    Street Address 1
                  </label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Street line 1"
                    value={editForm.street1}
                    onChange={(e) => setEditForm({ ...editForm, street1: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label style={{ display: 'block', marginBottom: '0.35rem', fontWeight: 600, fontSize: '0.85rem' }}>
                    Street Address 2
                  </label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Apt, Suite, Unit, etc."
                    value={editForm.street2}
                    onChange={(e) => setEditForm({ ...editForm, street2: e.target.value })}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem' }}>
                <div className="form-group">
                  <label style={{ display: 'block', marginBottom: '0.35rem', fontWeight: 600, fontSize: '0.85rem' }}>
                    Country
                  </label>
                  <select
                    className="form-input"
                    value={editForm.country_id}
                    onChange={(e) => handleCountrySelect(e.target.value)}
                  >
                    <option value="">Select Country</option>
                    {countries.map((c) => (
                      <option key={c.id} value={String(c.id)}>{c.name}</option>
                    ))}
                    {editForm.country_id && !countries.some(c => String(c.id) === editForm.country_id) && editForm.country && (
                      <option value={editForm.country_id}>{editForm.country}</option>
                    )}
                  </select>
                </div>

                <div className="form-group">
                  <label style={{ display: 'block', marginBottom: '0.35rem', fontWeight: 600, fontSize: '0.85rem' }}>
                    State {loadingStates ? '...' : ''}
                  </label>
                  <select
                    className="form-input"
                    value={editForm.state_id}
                    onChange={(e) => handleStateSelect(e.target.value)}
                    disabled={!editForm.country_id || loadingStates}
                  >
                    <option value="">Select State</option>
                    {states.map((s) => (
                      <option key={s.id} value={String(s.id)}>{s.name}</option>
                    ))}
                    {editForm.state_id && !states.some(s => String(s.id) === editForm.state_id) && editForm.state && (
                      <option value={editForm.state_id}>{editForm.state}</option>
                    )}
                  </select>
                </div>

                <div className="form-group">
                  <label style={{ display: 'block', marginBottom: '0.35rem', fontWeight: 600, fontSize: '0.85rem' }}>
                    City {loadingCities ? '...' : ''}
                  </label>
                  <select
                    className="form-input"
                    value={editForm.city_id}
                    onChange={(e) => handleCitySelect(e.target.value)}
                    disabled={!editForm.state_id || loadingCities}
                  >
                    <option value="">Select City</option>
                    {cities.map((ct) => (
                      <option key={ct.id} value={String(ct.id)}>{ct.name}</option>
                    ))}
                    {editForm.city_id && !cities.some(ct => String(ct.id) === editForm.city_id) && editForm.city && (
                      <option value={editForm.city_id}>{editForm.city}</option>
                    )}
                  </select>
                </div>

                <div className="form-group">
                  <label style={{ display: 'block', marginBottom: '0.35rem', fontWeight: 600, fontSize: '0.85rem' }}>
                    Zipcode
                  </label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Zipcode"
                    value={editForm.zipcode}
                    onChange={(e) => setEditForm({ ...editForm, zipcode: e.target.value })}
                  />
                </div>
              </div>
            </div>

            <div className="modal-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', padding: '1rem 1.5rem', borderTop: '1px solid var(--border)' }}>
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => setEditingPatient(null)}
                disabled={editSaving}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={editSaving}
              >
                {editSaving ? 'Updating...' : 'Update Patient'}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  };

  if (selected) {
    return (
      <div className="page-content" style={{ paddingTop: 0 }}>
        <TopNav title={`Patient History — ${selected.name || ''}`} />

        {emailing && (
          <div className="test-reports-email-overlay" role="status" aria-live="polite" aria-busy="true">
            <div className="test-reports-email-overlay-card">
              <span className="test-reports-email-spinner" aria-hidden />
              <div className="test-reports-email-overlay-title">Sending email...</div>
              <div className="test-reports-email-overlay-text">
                Please wait while we generate and send the report PDF.
              </div>
            </div>
          </div>
        )}

        <div className={`page-body${emailing ? ' test-reports-page-busy' : ''}`}>
          <div className="card" style={{ marginBottom: '1.5rem' }}>
            <div className="card-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span className="card-title">Patient Info</span>
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <button type="button" className="btn btn-primary btn-sm" onClick={() => openEdit(selected)}>
                  <MdEdit size={14} style={{ verticalAlign: 'text-bottom', marginRight: '0.25rem' }} aria-hidden />Edit Patient
                </button>
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => setSelected(null)}>
                  <MdClose size={16} style={{ verticalAlign: 'text-bottom', marginRight: '0.35rem' }} aria-hidden />Close
                </button>
              </div>
            </div>
            <div className="card-body">
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', fontSize: '0.875rem' }}>
                {[
                  ['UID', selected.uid],
                  ['Name', selected.name],
                  ['Mobile', formatMobile(selected.mobile) || selected.mobile],
                  ['Gender', genderLabel(selected.gender)],
                  ['Email', selected.email],
                  ['DOB', formatDate(selected.dob)],
                  ['SSN', selected.ssn],
                ].map(([k, v]) => (
                  <div key={k}><span style={{ color: 'var(--text-muted)' }}>{k}:</span> <strong>{v || '—'}</strong></div>
                ))}
              </div>
            </div>
          </div>

          <ListingTable
            className="patient-history-table"
            title="Test History"
            columns={historyColumns}
            rows={history}
            loading={historyLoading}
            showTotal
            emptyText="No test history found."
            actionsLabel="Actions"
            actionsWidth={130}
            defaultPageSize={10}
            rowActions={entry => (
              entry.report_id ? (
                <ActionIcons
                  onDownload={() => downloadReport(entry)}
                  downloadTitle={`Download ${entry.lab_test_name} report`}
                  onMail={() => emailReport(entry)}
                  mailTitle={`Email ${entry.lab_test_name} report`}
                />
              ) : (
                <span style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>Report pending</span>
              )
            )}
          />
        </div>

        {renderEditModal()}
      </div>
    );
  }

  return (
    <div className="page-content" style={{ paddingTop: 0 }}>
      <TopNav title="Manage Patients" />

      <div className="page-body">
        <ListingTable
          className="patient-list-table"
          title="List of Patients"
          columns={columns}
          rows={patients}
          loading={loading}
          emptyText="No patients found."
          defaultPageSize={25}
          showTotal={false}
          hidePaginationTotal={true}
          paginationMode="server"
          page={page}
          pageSize={pageSize}
          total={total}
          onPageChange={setPage}
          onPageSizeChange={(size) => { setPageSize(size); setPage(1); }}
        />
      </div>

      {renderEditModal()}
    </div>
  );
}
