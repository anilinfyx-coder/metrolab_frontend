'use client';
import { useState, useEffect, type InputHTMLAttributes } from 'react';
import TopNav from '../../../components/TopNav';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
function getToken() { return typeof window !== 'undefined' ? localStorage.getItem('admin_token') || '' : ''; }

// US States for dropdown
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

const emptyPatient = {
  name: '', mobile: '', gender: '1', dob_month: '1', dob_day: '1', dob_year: '',
  driving_license_state: '', driving_license: '', street1: '', street2: '',
  city: '', state: '', zipcode: '', email: '', ssn: '', accept: false as boolean
};

export default function PatientDemographicPage() {
  const [filter, setFilter] = useState({ uid: '', mobile: '' });
  const [patient, setPatient] = useState<Record<string, string | boolean>>({ ...emptyPatient });
  const [patientId, setPatientId] = useState<number | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [labTests, setLabTests] = useState<LabTest[]>([]);
  const [reason, setReason] = useState('Other');
  const [customReason, setCustomReason] = useState('');
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [saveError, setSaveError] = useState<string | null>(null);
  const [searching, setSearching] = useState(false);

  const clearFieldError = (key: string) => {
    setFieldErrors(prev => {
      if (!prev[key]) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  const inputClass = (field: string) =>
    `patient-form-input${fieldErrors[field] ? ' patient-form-input-error' : ''}`;

  const FieldErr = ({ field }: { field: string }) =>
    fieldErrors[field] ? <div className="patient-field-error">{fieldErrors[field]}</div> : null;

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};
    const str = (key: string) => String(patient[key] || '').trim();

    if (!str('name')) errors.name = 'Name is required.';
    if (!str('mobile')) errors.mobile = 'Mobile is required.';
    if (!str('dob_year')) errors.dob = 'Year is required.';
    if (!str('driving_license_state')) errors.driving_license_state = 'State of Driving License / State ID is required.';
    if (!str('driving_license')) errors.driving_license = 'Driving License Number / State ID is required.';
    if (!str('street1')) errors.street1 = 'Street 1 is required.';
    if (!str('city')) errors.city = 'City is required.';
    if (!str('state')) errors.state = 'State is required.';
    if (!str('zipcode')) errors.zipcode = 'Zip Code is required.';
    if (!str('email')) errors.email = 'Email is required.';
    if (!labTests.some(t => t.is_selected)) errors.labTests = 'Please select at least one lab test.';
    if (reason === 'Other' && !customReason.trim()) errors.customReason = 'Please specify the reason.';
    if (!(patient.accept as boolean)) errors.accept = 'Please acknowledge the information is accurate.';

    setFieldErrors(errors);
    setSaveError(null);

    if (Object.keys(errors).length > 0) {
      setTimeout(() => {
        document.querySelector('.patient-form-error-summary, .patient-field-error')
          ?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 0);
      return false;
    }
    return true;
  };

  useEffect(() => {
    // Load available lab tests
    fetch(`${API}/api/LabTests`, { headers: { token: getToken() } })
      .then(r => r.json())
      .then(d => { if (d.response_code === '200') setLabTests(d.obj.map((t: LabTest) => ({ ...t, is_selected: false }))); });
  }, []);

  const searchPatient = async () => {
    if (!filter.uid && !filter.mobile) { setMsg({ type: 'error', text: 'Please enter UID or Mobile to search.' }); return; }
    setSearching(true); setMsg(null);
    const res = await fetch(`${API}/api/Patient/search?uid=${filter.uid}&mobile=${filter.mobile}`, { headers: { token: getToken() } });
    const d = await res.json();
    setSearching(false);
    if (d.response_code === '200' && d.obj) {
      const p = d.obj;
      // Parse dob: YYYY-MM-DD
      const dobParts = p.dob ? p.dob.split('T')[0].split('-') : ['', '1', '1'];
      setPatient({
        ...emptyPatient,
        name: p.name || '', mobile: p.mobile || '', gender: String(p.gender || '1'),
        dob_year: dobParts[0] || '', dob_month: String(parseInt(dobParts[1]) || 1),
        dob_day: String(parseInt(dobParts[2]) || 1),
        driving_license_state: p.driving_license_state || '',
        driving_license: p.driving_license || '',
        street1: p.street1 || '', street2: p.street2 || '',
        city: p.city || '', state: p.state || '', zipcode: p.zipcode || '',
        email: p.email || '', ssn: p.ssn || '',
      });
      setPatientId(p.id);
      setShowDetails(true);
      setFieldErrors({});
      setSaveError(null);
    } else {
      setMsg({ type: 'error', text: 'Patient not found. Click "New Patient/Donor" to create one.' });
    }
  };

  const newPatient = () => {
    setPatient({ ...emptyPatient });
    setPatientId(null);
    setMsg(null);
    setFieldErrors({});
    setSaveError(null);
    setLabTests(prev => prev.map(t => ({ ...t, is_selected: false })));
    setReason('Other');
    setCustomReason('');
    setShowDetails(true);
  };

  const savePatient = async () => {
    if (!validateForm()) return;

    setSaving(true);
    setSaveError(null);
    const dobString = patient.dob_year
      ? `${patient.dob_year}-${String(patient.dob_month).padStart(2, '0')}-${String(patient.dob_day).padStart(2, '0')}`
      : null;

    const selectedTests = labTests.filter(t => t.is_selected).map(t => t.id);
    const reasonForTest = reason === 'Other' ? customReason : reason;

    let finalPatientId = patientId;
    let createdPatientUid = '';

    // Step 1: Create Patient if it doesn't exist yet
    if (!finalPatientId) {
      const patientPayload = {
        name: patient.name, mobile: patient.mobile, gender: patient.gender,
        dob: dobString,
        driving_license_state: patient.driving_license_state,
        driving_license: patient.driving_license,
        street1: patient.street1, street2: patient.street2,
        city: patient.city, state: patient.state, zipcode: patient.zipcode,
        email: patient.email, ssn: patient.ssn,
      };
      
      const patRes = await fetch(`${API}/api/Patient`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', token: getToken() },
        body: JSON.stringify(patientPayload)
      });
      const patD = await patRes.json();
      if (patD.response_code !== '200') {
        setSaving(false);
        setSaveError(typeof patD.obj === 'string' ? patD.obj : 'Failed to create patient.');
        return;
      }
      finalPatientId = patD.obj.id;
      createdPatientUid = patD.obj.uid || '';
    }

    // Step 2: Add to Waiting List
    const wlPayload = {
      patient_id: finalPatientId,
      lab_test_ids: selectedTests,
      reason_for_test: reasonForTest,
    };

    const res = await fetch(`${API}/api/WaitingList`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', token: getToken() },
      body: JSON.stringify(wlPayload)
    });
    const d = await res.json();
    setSaving(false);

    if (d.response_code === '200') {
      const savedUid = createdPatientUid ? ` (UID: ${createdPatientUid})` : '';
      setMsg({ type: 'success', text: `Patient saved and added to Waiting List successfully!${savedUid}` });
      setFieldErrors({});
      setSaveError(null);
      setPatient({ ...emptyPatient });
      setPatientId(null);
      setLabTests(prev => prev.map(t => ({ ...t, is_selected: false })));
      setShowDetails(false);
    } else {
      setSaveError(typeof d.obj === 'string' ? d.obj : 'Failed to save patient. Please try again.');
    }
  };

  const resetForm = () => {
    setPatient({ ...emptyPatient });
    setPatientId(null);
    setMsg(null);
    setFieldErrors({});
    setSaveError(null);
    setReason('Other');
    setCustomReason('');
    setLabTests(prev => prev.map(t => ({ ...t, is_selected: false })));
  };

  const inp = (key: string, ph: string, type = 'text', extra: InputHTMLAttributes<HTMLInputElement> = {}) => (
    <input
      type={type}
      className={inputClass(key)}
      placeholder={ph}
      value={patient[key] as string || ''}
      onChange={e => {
        clearFieldError(key);
        setSaveError(null);
        setPatient(p => ({ ...p, [key]: e.target.value }));
      }}
      {...extra}
    />
  );

  const sel = (key: string, options: { value: string; label: string }[], placeholder = 'Select') => (
    <select
      className={inputClass(key)}
      value={patient[key] as string || ''}
      onChange={e => {
        clearFieldError(key);
        setSaveError(null);
        setPatient(p => ({ ...p, [key]: e.target.value }));
      }}
    >
      <option value="">{placeholder}</option>
      {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  );

  const validationMessages = Object.values(fieldErrors);
  const showFormErrorSummary = validationMessages.length > 0 || !!saveError;

  return (
    <div className="page-content">
      <TopNav title="Patient Demographic" />
      <div style={{ padding: '1.5rem' }}>
        {msg && (
          <div style={{
            background: msg.type === 'success' ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
            border: `1px solid ${msg.type === 'success' ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)'}`,
            borderRadius: 8, padding: '0.75rem 1rem', marginBottom: '1rem',
            fontSize: '0.875rem', color: msg.type === 'success' ? '#10b981' : '#ef4444'
          }}>{msg.text}</div>
        )}

        {/* ── Search Card ── */}
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

        {/* ── Patient Details Card ── */}
        {showDetails && (
          <div className="card patient-details-card">
            <div className="card-header patient-details-header">
              <span className="card-title">Patient/Donor Details</span>
            </div>
            <div className="card-body patient-details-body">
              <div className="patient-form-row patient-form-row-3">
                <div className="form-group patient-gender-field">
                  <label>Name <span className="req">*</span></label>
                  {inp('name', 'Name')}
                  <FieldErr field="name" />
                </div>
                <div className="form-group">
                  <label>Mobile <span className="req">*</span></label>
                  {inp('mobile', 'Mobile')}
                  <FieldErr field="mobile" />
                </div>
                <div className="form-group">
                  <label>Gender <span className="req">*</span></label>
                  <div className="patient-gender-group">
                    {[['1', 'Male'], ['2', 'Female'], ['3', 'Prefer not to declare']].map(([val, lbl]) => (
                      <label key={val} className="patient-radio-label">
                        <input
                          type="radio"
                          name="gender"
                          value={val}
                          checked={patient.gender === val}
                          onChange={() => {
                            clearFieldError('gender');
                            setPatient(p => ({ ...p, gender: val }));
                          }}
                        />
                        {lbl}
                      </label>
                    ))}
                  </div>
                </div>
              </div>

              <div className="patient-form-row patient-form-row-3">
                <div className="form-group">
                  <label>DOB (mm/dd/yyyy) <span className="req">*</span></label>
                  <div className="patient-dob-row">
                    <select
                      className={`patient-form-input patient-dob-month${fieldErrors.dob ? ' patient-form-input-error' : ''}`}
                      value={patient.dob_month as string}
                      onChange={e => {
                        clearFieldError('dob');
                        setPatient(p => ({ ...p, dob_month: e.target.value }));
                      }}
                    >
                      {['January','February','March','April','May','June','July','August','September','October','November','December'].map((m, i) => (
                        <option key={m} value={i + 1}>{m}</option>
                      ))}
                    </select>
                    <select
                      className={`patient-form-input patient-dob-day${fieldErrors.dob ? ' patient-form-input-error' : ''}`}
                      value={patient.dob_day as string}
                      onChange={e => {
                        clearFieldError('dob');
                        setPatient(p => ({ ...p, dob_day: e.target.value }));
                      }}
                    >
                      {Array.from({ length: 31 }, (_, i) => i + 1).map(d => (
                        <option key={d} value={d}>{d}</option>
                      ))}
                    </select>
                    <input
                      type="number"
                      className={`patient-form-input patient-dob-year${fieldErrors.dob ? ' patient-form-input-error' : ''}`}
                      placeholder="Year"
                      value={patient.dob_year as string}
                      onChange={e => {
                        clearFieldError('dob');
                        setPatient(p => ({ ...p, dob_year: e.target.value }));
                      }}
                    />
                  </div>
                  <FieldErr field="dob" />
                </div>
                <div className="form-group">
                  <label>State of Driving License / State ID <span className="req">*</span></label>
                  {sel('driving_license_state', US_STATES.map(s => ({ value: s, label: s })), 'Select State')}
                  <FieldErr field="driving_license_state" />
                </div>
                <div className="form-group">
                  <label>Driving License Number / State ID <span className="req">*</span></label>
                  {inp('driving_license', 'Driving License')}
                  <FieldErr field="driving_license" />
                </div>
              </div>

              <div className="patient-form-row patient-form-row-2">
                <div className="form-group">
                  <label>Street 1 <span className="req">*</span></label>
                  {inp('street1', 'Home Address')}
                  <FieldErr field="street1" />
                </div>
                <div className="form-group">
                  <label>Street 2</label>
                  {inp('street2', 'Home Address')}
                </div>
              </div>

              <div className="patient-form-row patient-form-row-3">
                <div className="form-group">
                  <label>City <span className="req">*</span></label>
                  {inp('city', 'City')}
                  <FieldErr field="city" />
                </div>
                <div className="form-group">
                  <label>State <span className="req">*</span></label>
                  {sel('state', US_STATES.map(s => ({ value: s, label: s })), 'Select State')}
                  <FieldErr field="state" />
                </div>
                <div className="form-group">
                  <label>Zip Code <span className="req">*</span></label>
                  {inp('zipcode', 'ZIP Code')}
                  <FieldErr field="zipcode" />
                </div>
              </div>

              <div className="patient-form-row patient-form-row-3">
                <div className="form-group">
                  <label>Email <span className="req">*</span></label>
                  {inp('email', 'Email', 'email')}
                  <FieldErr field="email" />
                </div>
                <div className="form-group">
                  <label>Last 4 Digits of your SSN</label>
                  <input
                    type="text"
                    className="patient-form-input"
                    placeholder="SSN"
                    maxLength={4}
                    value={patient.ssn as string || ''}
                    onChange={e => setPatient(p => ({ ...p, ssn: e.target.value.replace(/\D/g, '').slice(0, 4) }))}
                  />
                </div>
                <div className="form-group patient-form-spacer" aria-hidden />
              </div>

              <div className={`patient-lab-tests-section${fieldErrors.labTests ? ' has-error' : ''}`}>
                <div className="patient-section-title">Select Lab Tests to be conducted</div>
                <div className="patient-lab-tests-grid">
                  {labTests.map(t => (
                    <label key={t.id} className="patient-lab-test-item">
                      <input
                        type="checkbox"
                        className="patient-lab-test-checkbox"
                        checked={!!t.is_selected}
                        onChange={() => {
                          clearFieldError('labTests');
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
                <FieldErr field="labTests" />
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
                        clearFieldError('customReason');
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
                      className={inputClass('customReason')}
                      placeholder="Reason"
                      value={customReason}
                      onChange={e => {
                        clearFieldError('customReason');
                        setSaveError(null);
                        setCustomReason(e.target.value);
                      }}
                    />
                    <FieldErr field="customReason" />
                  </div>
                )}
              </div>

              <div className={`patient-ack-row${fieldErrors.accept ? ' has-error' : ''}`}>
                <label className="patient-ack-label">
                  <input
                    type="checkbox"
                    className="patient-ack-checkbox"
                    checked={!!patient.accept}
                    onChange={e => {
                      clearFieldError('accept');
                      setSaveError(null);
                      setPatient(p => ({ ...p, accept: e.target.checked }));
                    }}
                  />
                  <span className="patient-ack-text">I hereby acknowledge that the information given by me is accurate and complete.</span>
                </label>
                <FieldErr field="accept" />
              </div>

              {showFormErrorSummary && (
                <div className="patient-form-error-summary">
                  <strong>Please correct the following:</strong>
                  <ul>
                    {saveError && <li>{saveError}</li>}
                    {validationMessages.map((text, i) => (
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
