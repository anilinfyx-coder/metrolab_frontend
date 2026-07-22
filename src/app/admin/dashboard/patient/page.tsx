'use client';
import { useState, useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { MdClose, MdSearch } from 'react-icons/md';
import TopNav from '../../../components/TopNav';
import { FieldError } from '../../../components/FormField';
import { handleApiResponse, toastApiError, getToken, API_BASE } from '../../../../lib/api';
import { formResolver } from '../../../../lib/formHelpers';
import { patientDemographicSchema, type PatientDemographicFormValues } from '../../../../lib/schemas';

const US_STATES = [
  'Alabama','Alaska','Arizona','Arkansas','California','Colorado','Connecticut','Delaware',
  'Florida','Georgia','Hawaii','Idaho','Illinois','Indiana','Iowa','Kansas','Kentucky',
  'Louisiana','Maine','Maryland','Massachusetts','Michigan','Minnesota','Mississippi',
  'Missouri','Montana','Nebraska','Nevada','New Hampshire','New Jersey','New Mexico',
  'New York','North Carolina','North Dakota','Ohio','Oklahoma','Oregon','Pennsylvania',
  'Rhode Island','South Carolina','South Dakota','Tennessee','Texas','Utah','Vermont',
  'Virginia','Washington','West Virginia','Wisconsin','Wyoming'
];

const REASONS = [
  'Pre-Employment','Periodic Medical','Follow Up','Random','Promotion','Transfer',
  'Post Accident','Return to Duty','Reasonable Suspicion/Cause','Diversion','Travel',
  'Medical Exam','Other'
];

interface GeoItem { id: number; name: string; country_id?: number; state_id?: number; }

interface Patient {
  id: number; name: string; mobile: string; gender: string; dob: string;
  driving_license_state: string; driving_license: string; street1: string; street2: string;
  country_id?: number | null; state_id?: number | null; city_id?: number | null;
  country?: string; city: string; state: string; zipcode: string; email: string; ssn: string;
}
interface LabTest { id: number; name: string; is_selected?: boolean; }

const emptyPatient: PatientDemographicFormValues = {
  name: '',
  mobile: '',
  gender: '1',
  dob: '',
  driving_license_state: '',
  driving_license: '',
  street1: '',
  street2: '',
  country_id: '',
  state_id: '',
  city_id: '',
  zipcode: '',
  email: '',
  ssn: '',
  accept: false,
};

export default function PatientDemographicPage() {
  const [filter, setFilter] = useState({ uid: '', mobile: '' });
  const [patientId, setPatientId] = useState<number | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [labTests, setLabTests] = useState<LabTest[]>([]);
  const [labTestSearch, setLabTestSearch] = useState('');
  const [reason, setReason] = useState('Other');
  const [customReason, setCustomReason] = useState('');
  const [saving, setSaving] = useState(false);
  const [extraErrors, setExtraErrors] = useState<Record<string, string>>({});
  const [saveError, setSaveError] = useState<string | null>(null);
  const [searching, setSearching] = useState(false);

  const [countries, setCountries] = useState<GeoItem[]>([]);
  const [states, setStates] = useState<GeoItem[]>([]);
  const [cities, setCities] = useState<GeoItem[]>([]);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<PatientDemographicFormValues>({
    resolver: formResolver<PatientDemographicFormValues>(patientDemographicSchema),
    defaultValues: emptyPatient,
  });

  const countryId = watch('country_id');
  const stateId = watch('state_id');

  const inputClass = (field: keyof PatientDemographicFormValues) =>
    `patient-form-input${errors[field] ? ' patient-form-input-error' : ''}`;

  const clearExtraError = (key: string) => {
    setExtraErrors(prev => {
      if (!prev[key]) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${API_BASE}/api/LabTests/assigned?status=true`, {
          headers: { token: getToken('admin_token') },
        });
        const list = await handleApiResponse<LabTest[]>(res, {
          errorFallback: 'Failed to load assigned lab tests.',
        });
        setLabTests(list.map((t: LabTest) => ({ ...t, is_selected: false })));
      } catch {
        setLabTests([]);
      }
    })();
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${API_BASE}/api/Country?status=true`, {
          headers: { token: getToken('admin_token') },
        });
        const list = await handleApiResponse<GeoItem[]>(res, { silent: true });
        setCountries(list || []);
      } catch {
        setCountries([]);
      }
    })();
  }, []);

  useEffect(() => {
    if (!countryId) {
      setStates([]);
      return;
    }
    (async () => {
      try {
        const res = await fetch(`${API_BASE}/api/State?country_id=${countryId}&status=true`, {
          headers: { token: getToken('admin_token') },
        });
        const list = await handleApiResponse<GeoItem[]>(res, { silent: true });
        setStates(list || []);
      } catch {
        setStates([]);
      }
    })();
  }, [countryId]);

  useEffect(() => {
    if (!stateId) {
      setCities([]);
      return;
    }
    (async () => {
      try {
        const res = await fetch(`${API_BASE}/api/City?state_id=${stateId}&status=true`, {
          headers: { token: getToken('admin_token') },
        });
        const list = await handleApiResponse<GeoItem[]>(res, { silent: true });
        setCities(list || []);
      } catch {
        setCities([]);
      }
    })();
  }, [stateId]);

  const filteredLabTests = useMemo(() => {
    const q = labTestSearch.trim().toLowerCase();
    if (!q) return labTests;
    return labTests.filter(t => (t.name || '').toLowerCase().includes(q));
  }, [labTests, labTestSearch]);

  const selectedLabTests = useMemo(
    () => labTests.filter(t => t.is_selected),
    [labTests],
  );

  const toggleLabTest = (id: number) => {
    clearExtraError('labTests');
    setSaveError(null);
    setLabTests(prev =>
      prev.map(lt => (lt.id === id ? { ...lt, is_selected: !lt.is_selected } : lt)),
    );
  };

  const selectAllFiltered = () => {
    clearExtraError('labTests');
    setSaveError(null);
    const ids = new Set(filteredLabTests.map(t => t.id));
    setLabTests(prev => prev.map(t => (ids.has(t.id) ? { ...t, is_selected: true } : t)));
  };

  const clearSelectedLabTests = () => {
    setLabTests(prev => prev.map(t => ({ ...t, is_selected: false })));
  };

  const searchPatient = async () => {
    if (!filter.uid && !filter.mobile) {
      toastApiError('Please enter UID or Mobile to search.');
      return;
    }
    setSearching(true);
    try {
      const res = await fetch(`${API_BASE}/api/Patient/search?uid=${filter.uid}&mobile=${filter.mobile}`, {
        headers: { token: getToken('admin_token') },
      });
      const p = await handleApiResponse<Patient>(res, {
        errorFallback: 'Patient not found. Click "New Patient/Donor" to create one.',
      });
      const dobParts = p.dob ? p.dob.split('T')[0].split('-') : ['', '1', '1'];
      reset({
        name: p.name || '',
        mobile: p.mobile || '',
        gender: String(p.gender || '1'),
        dob: p.dob ? p.dob.split('T')[0] : '',
        driving_license_state: p.driving_license_state || '',
        driving_license: p.driving_license || '',
        street1: p.street1 || '',
        street2: p.street2 || '',
        country_id: p.country_id != null ? String(p.country_id) : '',
        state_id: p.state_id != null ? String(p.state_id) : '',
        city_id: p.city_id != null ? String(p.city_id) : '',
        zipcode: p.zipcode || '',
        email: p.email || '',
        ssn: p.ssn || '',
        accept: false,
      });
      setPatientId(p.id);
      setShowDetails(true);
      setExtraErrors({});
      setSaveError(null);
      setLabTestSearch('');
    } catch {
      // Error toast handled by handleApiResponse
    } finally {
      setSearching(false);
    }
  };

  const newPatient = () => {
    reset(emptyPatient);
    setPatientId(null);
    setExtraErrors({});
    setSaveError(null);
    setLabTests(prev => prev.map(t => ({ ...t, is_selected: false })));
    setLabTestSearch('');
    setReason('Other');
    setCustomReason('');
    setShowDetails(true);
  };

  const validateExtraFields = (): boolean => {
    const next: Record<string, string> = {};
    if (!labTests.some(t => t.is_selected)) {
      next.labTests = 'Please select at least one lab test.';
    }
    if (reason === 'Other' && !customReason.trim()) {
      next.customReason = 'Please specify the reason.';
    }
    setExtraErrors(next);
    if (Object.keys(next).length > 0) {
      window.setTimeout(() => {
        document.querySelector('.patient-form-error-summary, .patient-field-error, .patient-lab-tests-section.has-error')
          ?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 0);
      return false;
    }
    return true;
  };

  const savePatient = handleSubmit(async values => {
    if (!validateExtraFields()) return;

    setSaving(true);
    setSaveError(null);
    const dobString = values.dob || null;

    const selectedTests = labTests.filter(t => t.is_selected).map(t => t.id);
    const reasonForTest = reason === 'Other' ? customReason : reason;
    const countryName = countries.find(c => String(c.id) === String(values.country_id))?.name || '';
    const stateName = states.find(s => String(s.id) === String(values.state_id))?.name || '';
    const cityName = cities.find(c => String(c.id) === String(values.city_id))?.name || '';

    let finalPatientId = patientId;

    if (!finalPatientId) {
      const patientPayload = {
        name: values.name,
        mobile: values.mobile,
        gender: values.gender,
        dob: dobString,
        driving_license_state: values.driving_license_state,
        driving_license: values.driving_license,
        street1: values.street1,
        street2: values.street2,
        country_id: values.country_id ? Number(values.country_id) : null,
        state_id: values.state_id ? Number(values.state_id) : null,
        city_id: values.city_id ? Number(values.city_id) : null,
        country: countryName,
        city: cityName,
        state: stateName,
        zipcode: values.zipcode,
        email: values.email,
        ssn: values.ssn,
      };

      try {
        const patRes = await fetch(`${API_BASE}/api/Patient`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', token: getToken('admin_token') },
          body: JSON.stringify(patientPayload),
        });
        const created = await handleApiResponse<{ id: number; uid?: string }>(patRes, {
          successMessage: 'Patient created successfully.',
          errorFallback: 'Failed to create patient.',
        });
        finalPatientId = created.id;
      } catch {
        setSaving(false);
        return;
      }
    }

    const wlPayload = {
      patient_id: finalPatientId,
      lab_test_ids: selectedTests,
      reason_for_test: reasonForTest,
    };

    try {
      const res = await fetch(`${API_BASE}/api/WaitingList`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', token: getToken('admin_token') },
        body: JSON.stringify(wlPayload),
      });
      await handleApiResponse(res, {
        successMessage: 'Patient added to waiting list successfully.',
        errorFallback: 'Failed to save patient. Please try again.',
      });
      setExtraErrors({});
      setSaveError(null);
      reset(emptyPatient);
      setPatientId(null);
      setLabTests(prev => prev.map(t => ({ ...t, is_selected: false })));
      setLabTestSearch('');
      setReason('Other');
      setCustomReason('');
      setShowDetails(false);
    } catch {
      setSaveError('Failed to save. Please try again.');
    } finally {
      setSaving(false);
    }
  });

  const resetForm = () => {
    reset(emptyPatient);
    setPatientId(null);
    setExtraErrors({});
    setSaveError(null);
    setLabTests(prev => prev.map(t => ({ ...t, is_selected: false })));
    setLabTestSearch('');
    setReason('Other');
    setCustomReason('');
  };

  const formErrorMessages = [
    ...Object.values(errors).map(e => e?.message).filter(Boolean) as string[],
    ...Object.values(extraErrors),
  ];
  const showFormErrorSummary = !!(saveError || formErrorMessages.length > 0);

  return (
    <div className="page-content">
      <TopNav title="Patient Demographic" />
      <div className="page-body">
        <div className="card patient-search-card" style={{ marginBottom: '1.5rem' }}>
          <div className="card-header patient-search-card-header">
            <span className="card-title">Select Patient/Donor</span>
          </div>
          <div className="card-body patient-search-card-body">
            <div className="patient-search-row">
              <div className="form-group patient-search-field" style={{ margin: 0 }}>
                <label>UID</label>
                <input
                  type="text"
                  className="patient-form-input"
                  placeholder="UID"
                  value={filter.uid}
                  onChange={e => setFilter(p => ({ ...p, uid: e.target.value }))}
                />
              </div>
              <span className="patient-search-or">or</span>
              <div className="form-group patient-search-field" style={{ margin: 0 }}>
                <label>Mobile</label>
                <input
                  type="text"
                  className="patient-form-input"
                  placeholder="Mobile"
                  value={filter.mobile}
                  onChange={e => setFilter(p => ({ ...p, mobile: e.target.value }))}
                />
              </div>
              <button type="button" className="btn btn-primary patient-search-btn" onClick={searchPatient} disabled={searching}>
                {searching ? 'Searching...' : 'Search'}
              </button>
              <button type="button" className="btn btn-primary patient-search-btn patient-search-new-btn" onClick={newPatient}>
                New Patient/Donor
              </button>
            </div>
          </div>
        </div>

        {showDetails && (
          <div className="card">
            <div className="card-header">
              <span className="card-title">Patient/Donor Details</span>
            </div>
            <div className="card-body">
              <div className="patient-form-row patient-form-row-3">
                <div className="form-group">
                  <label>Name <span className="req">*</span></label>
                  <input
                    type="text"
                    className={inputClass('name')}
                    placeholder="Full Name"
                    data-field="name"
                    aria-invalid={!!errors.name}
                    {...register('name')}
                  />
                  <FieldError message={errors.name?.message} />
                </div>
                <div className="form-group">
                  <label>Mobile <span className="req">*</span></label>
                  <input
                    type="text"
                    className={inputClass('mobile')}
                    placeholder="Mobile"
                    data-field="mobile"
                    aria-invalid={!!errors.mobile}
                    {...register('mobile')}
                  />
                  <FieldError message={errors.mobile?.message} />
                </div>
                <div className="form-group">
                  <label>Gender <span className="req">*</span></label>
                  <select
                    className={inputClass('gender')}
                    data-field="gender"
                    aria-invalid={!!errors.gender}
                    {...register('gender')}
                  >
                    <option value="1">Male</option>
                    <option value="2">Female</option>
                    <option value="3">Other</option>
                  </select>
                  <FieldError message={errors.gender?.message} />
                </div>
              </div>

              <div className="patient-form-row patient-form-row-3">
                <div className="form-group">
                  <label>DOB <span className="req">*</span></label>
                  <input
                    type="date"
                    className={inputClass('dob')}
                    data-field="dob"
                    aria-invalid={!!errors.dob}
                    {...register('dob')}
                  />
                  <FieldError message={errors.dob?.message} />
                </div>
                <div className="form-group">
                  <label>State of Driving License / State ID <span className="req">*</span></label>
                  <select
                    className={inputClass('driving_license_state')}
                    data-field="driving_license_state"
                    aria-invalid={!!errors.driving_license_state}
                    {...register('driving_license_state')}
                  >
                    <option value="">Select State</option>
                    {US_STATES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                  <FieldError message={errors.driving_license_state?.message} />
                </div>
                <div className="form-group">
                  <label>Driving License Number / State ID <span className="req">*</span></label>
                  <input
                    type="text"
                    className={inputClass('driving_license')}
                    placeholder="Driving License"
                    data-field="driving_license"
                    aria-invalid={!!errors.driving_license}
                    {...register('driving_license')}
                  />
                  <FieldError message={errors.driving_license?.message} />
                </div>
              </div>

              <div className="patient-form-row patient-form-row-2">
                <div className="form-group">
                  <label>Street 1 <span className="req">*</span></label>
                  <input
                    type="text"
                    className={inputClass('street1')}
                    placeholder="Home Address"
                    data-field="street1"
                    aria-invalid={!!errors.street1}
                    {...register('street1')}
                  />
                  <FieldError message={errors.street1?.message} />
                </div>
                <div className="form-group">
                  <label>Street 2</label>
                  <input
                    type="text"
                    className={inputClass('street2')}
                    placeholder="Home Address"
                    data-field="street2"
                    {...register('street2')}
                  />
                </div>
              </div>

              <div className="patient-form-row patient-form-row-4">
                <div className="form-group">
                  <label>Country <span className="req">*</span></label>
                  <select
                    className={inputClass('country_id')}
                    data-field="country_id"
                    aria-invalid={!!errors.country_id}
                    {...register('country_id', {
                      onChange: e => {
                        setValue('country_id', e.target.value);
                        setValue('state_id', '');
                        setValue('city_id', '');
                      },
                    })}
                  >
                    <option value="">Select Country</option>
                    {countries.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                  <FieldError message={errors.country_id?.message} />
                </div>
                <div className="form-group">
                  <label>State <span className="req">*</span></label>
                  <select
                    className={inputClass('state_id')}
                    data-field="state_id"
                    disabled={!countryId}
                    aria-invalid={!!errors.state_id}
                    {...register('state_id', {
                      onChange: e => {
                        setValue('state_id', e.target.value);
                        setValue('city_id', '');
                      },
                    })}
                  >
                    <option value="">Select State</option>
                    {states.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                  <FieldError message={errors.state_id?.message} />
                </div>
                <div className="form-group">
                  <label>City <span className="req">*</span></label>
                  <select
                    className={inputClass('city_id')}
                    data-field="city_id"
                    disabled={!stateId}
                    aria-invalid={!!errors.city_id}
                    {...register('city_id')}
                  >
                    <option value="">Select City</option>
                    {cities.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                  <FieldError message={errors.city_id?.message} />
                </div>
                <div className="form-group">
                  <label>Zip Code <span className="req">*</span></label>
                  <input
                    type="text"
                    className={inputClass('zipcode')}
                    placeholder="ZIP Code"
                    data-field="zipcode"
                    aria-invalid={!!errors.zipcode}
                    {...register('zipcode')}
                  />
                  <FieldError message={errors.zipcode?.message} />
                </div>
              </div>

              <div className="patient-form-row patient-form-row-3">
                <div className="form-group">
                  <label>Email <span className="req">*</span></label>
                  <input
                    type="email"
                    className={inputClass('email')}
                    placeholder="Email"
                    data-field="email"
                    aria-invalid={!!errors.email}
                    {...register('email')}
                  />
                  <FieldError message={errors.email?.message} />
                </div>
                <div className="form-group">
                  <label>Last 4 Digits of your SSN</label>
                  <input
                    type="text"
                    className="patient-form-input"
                    placeholder="SSN"
                    maxLength={4}
                    data-field="ssn"
                    {...register('ssn', {
                      onChange: e => {
                        e.target.value = e.target.value.replace(/\D/g, '').slice(0, 4);
                      },
                    })}
                  />
                </div>
                <div className="form-group patient-form-spacer" aria-hidden />
              </div>

              <div className={`patient-lab-tests-section${extraErrors.labTests ? ' has-error' : ''}`}>
                <div className="patient-lab-tests-header">
                  <div>
                    <div className="patient-section-title" style={{ marginBottom: '0.2rem' }}>
                      Select Lab Tests to be conducted
                    </div>
                    <div className="patient-lab-tests-meta">
                      {selectedLabTests.length} of {labTests.length} selected
                      {labTestSearch.trim() ? ` · Showing ${filteredLabTests.length}` : ''}
                    </div>
                  </div>
                  <div className="patient-lab-tests-toolbar">
                    <button type="button" className="patient-lab-tests-link" onClick={selectAllFiltered} disabled={filteredLabTests.length === 0}>
                      Select all{labTestSearch.trim() ? ' shown' : ''}
                    </button>
                    <button type="button" className="patient-lab-tests-link" onClick={clearSelectedLabTests} disabled={selectedLabTests.length === 0}>
                      Clear selected
                    </button>
                  </div>
                </div>

                <div className="patient-lab-tests-search">
                  <MdSearch size={18} aria-hidden className="patient-lab-tests-search-icon" />
                  <input
                    type="text"
                    className="patient-form-input"
                    placeholder="Search lab tests by name..."
                    value={labTestSearch}
                    onChange={e => setLabTestSearch(e.target.value)}
                    aria-label="Search lab tests"
                  />
                </div>

                {selectedLabTests.length > 0 && (
                  <div className="patient-lab-tests-selected">
                    {selectedLabTests.map(t => (
                      <button
                        key={t.id}
                        type="button"
                        className="patient-lab-test-chip"
                        onClick={() => toggleLabTest(t.id)}
                        title="Remove"
                      >
                        <span>{t.name}</span>
                        <MdClose size={14} aria-hidden />
                      </button>
                    ))}
                  </div>
                )}

                <div className="patient-lab-tests-grid-wrap">
                  {filteredLabTests.length === 0 ? (
                    <div className="patient-lab-tests-empty">
                      {labTests.length === 0
                        ? 'No assigned lab tests available.'
                        : 'No lab tests match your search.'}
                    </div>
                  ) : (
                    <div className="patient-lab-tests-grid-2col">
                      {filteredLabTests.map(t => (
                        <label key={t.id} className={`patient-lab-test-card${t.is_selected ? ' is-selected' : ''}`}>
                          <input
                            type="checkbox"
                            className="patient-lab-test-checkbox"
                            checked={!!t.is_selected}
                            onChange={() => toggleLabTest(t.id)}
                          />
                          <span>{t.name}</span>
                        </label>
                      ))}
                    </div>
                  )}
                </div>
                <FieldError message={extraErrors.labTests} />
              </div>

              <div className={`patient-form-row ${reason === 'Other' ? 'patient-form-row-reason' : 'patient-form-row-1'}`}>
                <div className="form-group">
                  <label>Select the reason for the test:</label>
                  <select
                    className="patient-form-input"
                    value={reason}
                    onChange={e => {
                      const val = e.target.value;
                      setReason(val);
                      if (val !== 'Other') {
                        setCustomReason('');
                        clearExtraError('customReason');
                      }
                    }}
                  >
                    {REASONS.map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                </div>
                {reason === 'Other' && (
                  <div className="form-group">
                    <label>Specify Reason:</label>
                    <input
                      type="text"
                      className={`patient-form-input${extraErrors.customReason ? ' patient-form-input-error' : ''}`}
                      placeholder="Reason"
                      data-field="customReason"
                      value={customReason}
                      onChange={e => {
                        clearExtraError('customReason');
                        setSaveError(null);
                        setCustomReason(e.target.value);
                      }}
                    />
                    <FieldError message={extraErrors.customReason} />
                  </div>
                )}
              </div>

              <div className={`patient-ack-row${errors.accept ? ' has-error' : ''}`}>
                <label className="patient-ack-label">
                  <input
                    type="checkbox"
                    className="patient-ack-checkbox"
                    data-field="accept"
                    {...register('accept')}
                  />
                  <span className="patient-ack-text">I hereby acknowledge that the information given by me is accurate and complete.</span>
                </label>
                <FieldError message={errors.accept?.message} />
              </div>

              {showFormErrorSummary && (
                <div className="patient-form-error-summary">
                  <strong>Please correct the following:</strong>
                  <ul>
                    {saveError && <li>{saveError}</li>}
                    {formErrorMessages.map((text, i) => (
                      <li key={`${text}-${i}`}>{text}</li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="patient-form-actions">
                <button type="button" className="btn btn-primary patient-save-btn" onClick={savePatient} disabled={saving}>
                  {saving ? 'Saving...' : 'Save'}
                </button>
                <button type="button" className="btn patient-reset-btn" onClick={resetForm}>
                  Reset Data
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
