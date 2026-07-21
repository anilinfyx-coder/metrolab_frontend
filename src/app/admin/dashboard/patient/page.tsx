'use client';
import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import TopNav from '../../../components/TopNav';
import { FieldError } from '../../../components/FormField';
import { handleApiResponse, toastApiError, getToken, API_BASE } from '../../../../lib/api';
import { createInvalidHandler, formResolver } from '../../../../lib/formHelpers';
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

interface Patient {
  id: number; name: string; mobile: string; gender: string; dob: string;
  driving_license_state: string; driving_license: string; street1: string; street2: string;
  city: string; state: string; zipcode: string; email: string; ssn: string;
}
interface LabTest { id: number; name: string; is_selected?: boolean; }

const emptyPatient: PatientDemographicFormValues = {
  name: '',
  mobile: '',
  gender: '1',
  dob_month: '1',
  dob_day: '1',
  dob_year: '',
  driving_license_state: '',
  driving_license: '',
  street1: '',
  street2: '',
  city: '',
  state: '',
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
  const [reason, setReason] = useState('Other');
  const [customReason, setCustomReason] = useState('');
  const [saving, setSaving] = useState(false);
  const [extraErrors, setExtraErrors] = useState<Record<string, string>>({});
  const [saveError, setSaveError] = useState<string | null>(null);
  const [searching, setSearching] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<PatientDemographicFormValues>({
    resolver: formResolver<PatientDemographicFormValues>(patientDemographicSchema),
    defaultValues: emptyPatient,
  });

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
        const res = await fetch(`${API_BASE}/api/LabTests?status=true`, { headers: { token: getToken('admin_token') } });
        const list = await handleApiResponse<LabTest[]>(res, {
          errorFallback: 'Failed to load lab tests.',
        });
        setLabTests(list.map((t: LabTest) => ({ ...t, is_selected: false })));
      } catch {
        setLabTests([]);
      }
    })();
  }, []);

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
        dob_year: dobParts[0] || '',
        dob_month: String(parseInt(dobParts[1]) || 1),
        dob_day: String(parseInt(dobParts[2]) || 1),
        driving_license_state: p.driving_license_state || '',
        driving_license: p.driving_license || '',
        street1: p.street1 || '',
        street2: p.street2 || '',
        city: p.city || '',
        state: p.state || '',
        zipcode: p.zipcode || '',
        email: p.email || '',
        ssn: p.ssn || '',
        accept: false,
      });
      setPatientId(p.id);
      setShowDetails(true);
      setExtraErrors({});
      setSaveError(null);
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
    const dobString = values.dob_year
      ? `${values.dob_year}-${String(values.dob_month).padStart(2, '0')}-${String(values.dob_day).padStart(2, '0')}`
      : null;

    const selectedTests = labTests.filter(t => t.is_selected).map(t => t.id);
    const reasonForTest = reason === 'Other' ? customReason : reason;

    let finalPatientId = patientId;
    let createdPatientUid = '';

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
        city: values.city,
        state: values.state,
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
        createdPatientUid = created.uid || '';
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
      setReason('Other');
      setCustomReason('');
      setShowDetails(false);
    } catch {
      // Error toast handled by handleApiResponse
    } finally {
      setSaving(false);
    }
  }, createInvalidHandler<PatientDemographicFormValues>());

  const resetForm = () => {
    reset(emptyPatient);
    setPatientId(null);
    setExtraErrors({});
    setSaveError(null);
    setReason('Other');
    setCustomReason('');
    setLabTests(prev => prev.map(t => ({ ...t, is_selected: false })));
  };

  const formErrorMessages = [
    ...Object.values(errors).map(e => e?.message).filter(Boolean) as string[],
    ...Object.values(extraErrors),
  ];
  const showFormErrorSummary = formErrorMessages.length > 0 || !!saveError;

  return (
    <div className="page-content">
      <TopNav title="Patient Demographic" />
      <div className="page-body">
        <div className="card patient-search-card" style={{ marginBottom: '1.5rem' }}>
          <div className="card-header patient-search-card-header"><span className="card-title">Select Patient/Donor</span></div>
          <div className="card-body patient-search-card-body">
            <div className="patient-search-row">
              <div className="form-group patient-search-field" style={{ margin: 0 }}>
                <label>UID</label>
                <input type="text" placeholder="Enter UID" value={filter.uid} onChange={e => setFilter(p => ({ ...p, uid: e.target.value }))} />
              </div>
              <div className="form-group patient-search-field" style={{ margin: 0 }}>
                <label>Mobile</label>
                <input type="text" placeholder="Enter Mobile" value={filter.mobile} onChange={e => setFilter(p => ({ ...p, mobile: e.target.value }))} />
              </div>
              <button className="btn btn-primary patient-search-btn" onClick={searchPatient} disabled={searching}>
                {searching ? 'Searching...' : 'Search'}
              </button>
              <span className="patient-search-or">or</span>
              <button className="btn btn-primary patient-search-btn patient-search-new-btn" onClick={newPatient}>New Patient/Donor</button>
            </div>
          </div>
        </div>

        {showDetails && (
          <div className="card patient-details-card">
            <div className="card-header patient-details-header">
              <span className="card-title">Patient/Donor Details</span>
            </div>
            <div className="card-body patient-details-body">
              <div className="patient-form-row patient-form-row-3">
                <div className="form-group patient-gender-field">
                  <label>Name <span className="req">*</span></label>
                  <input
                    type="text"
                    className={inputClass('name')}
                    placeholder="Name"
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
                    inputMode="numeric"
                    className={inputClass('mobile')}
                    placeholder="Mobile (9-12 digits)"
                    data-field="mobile"
                    aria-invalid={!!errors.mobile}
                    {...register('mobile')}
                  />
                  <FieldError message={errors.mobile?.message} />
                </div>
                <div className="form-group">
                  <label>Gender <span className="req">*</span></label>
                  <div className="patient-gender-group">
                    {[['1', 'Male'], ['2', 'Female'], ['3', 'Prefer not to declare']].map(([val, lbl]) => (
                      <label key={val} className="patient-radio-label">
                        <input
                          type="radio"
                          value={val}
                          data-field="gender"
                          {...register('gender')}
                        />
                        {lbl}
                      </label>
                    ))}
                  </div>
                  <FieldError message={errors.gender?.message} />
                </div>
              </div>

              <div className="patient-form-row patient-form-row-3">
                <div className="form-group">
                  <label>DOB (mm/dd/yyyy) <span className="req">*</span></label>
                  <div className="patient-dob-row">
                    <select
                      className={`patient-form-input patient-dob-month${errors.dob_year ? ' patient-form-input-error' : ''}`}
                      data-field="dob_month"
                      aria-invalid={!!errors.dob_year}
                      {...register('dob_month')}
                    >
                      {['January','February','March','April','May','June','July','August','September','October','November','December'].map((m, i) => (
                        <option key={m} value={i + 1}>{m}</option>
                      ))}
                    </select>
                    <select
                      className={`patient-form-input patient-dob-day${errors.dob_year ? ' patient-form-input-error' : ''}`}
                      data-field="dob_day"
                      aria-invalid={!!errors.dob_year}
                      {...register('dob_day')}
                    >
                      {Array.from({ length: 31 }, (_, i) => i + 1).map(d => (
                        <option key={d} value={d}>{d}</option>
                      ))}
                    </select>
                    <input
                      type="number"
                      className={`patient-form-input patient-dob-year${errors.dob_year ? ' patient-form-input-error' : ''}`}
                      placeholder="Year"
                      data-field="dob_year"
                      aria-invalid={!!errors.dob_year}
                      {...register('dob_year')}
                    />
                  </div>
                  <FieldError message={errors.dob_year?.message} />
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

              <div className="patient-form-row patient-form-row-3">
                <div className="form-group">
                  <label>City <span className="req">*</span></label>
                  <input
                    type="text"
                    className={inputClass('city')}
                    placeholder="City"
                    data-field="city"
                    aria-invalid={!!errors.city}
                    {...register('city')}
                  />
                  <FieldError message={errors.city?.message} />
                </div>
                <div className="form-group">
                  <label>State <span className="req">*</span></label>
                  <select
                    className={inputClass('state')}
                    data-field="state"
                    aria-invalid={!!errors.state}
                    {...register('state')}
                  >
                    <option value="">Select State</option>
                    {US_STATES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                  <FieldError message={errors.state?.message} />
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
                <div className="patient-section-title">Select Lab Tests to be conducted</div>
                <div className="patient-lab-tests-grid">
                  {labTests.map(t => (
                    <label key={t.id} className="patient-lab-test-item">
                      <input
                        type="checkbox"
                        className="patient-lab-test-checkbox"
                        checked={!!t.is_selected}
                        onChange={() => {
                          clearExtraError('labTests');
                          setSaveError(null);
                          setLabTests(prev =>
                            prev.map(lt => (lt.id === t.id ? { ...lt, is_selected: !lt.is_selected } : lt))
                          );
                        }}
                      />
                      <span>{t.name}</span>
                    </label>
                  ))}
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
