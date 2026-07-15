'use client';
import { useState, useEffect } from 'react';

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
  const [reason, setReason] = useState('Pre-Employment');
  const [customReason, setCustomReason] = useState('');
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [searching, setSearching] = useState(false);

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
    } else {
      setMsg({ type: 'error', text: 'Patient not found. Click "New Patient/Donor" to create one.' });
    }
  };

  const newPatient = () => {
    setPatient({ ...emptyPatient });
    setPatientId(null);
    setMsg(null);
    setLabTests(prev => prev.map(t => ({ ...t, is_selected: false })));
    setReason('Pre-Employment');
    setCustomReason('');
    setShowDetails(true);
  };

  const savePatient = async () => {
    if (!patient.name || !patient.mobile || !patient.gender) {
      setMsg({ type: 'error', text: 'Name, Mobile and Gender are required.' }); return;
    }
    if (!(patient.accept as boolean)) {
      setMsg({ type: 'error', text: 'Please acknowledge the information is accurate.' }); return;
    }

    setSaving(true); setMsg(null);
    const dobString = patient.dob_year
      ? `${patient.dob_year}-${String(patient.dob_month).padStart(2, '0')}-${String(patient.dob_day).padStart(2, '0')}`
      : null;

    const selectedTests = labTests.filter(t => t.is_selected).map(t => t.id);
    const reasonForTest = reason === 'Other' ? customReason : reason;

    let finalPatientId = patientId;

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
        setMsg({ type: 'error', text: typeof patD.obj === 'string' ? patD.obj : 'Failed to create patient: ' + JSON.stringify(patD.obj) });
        return;
      }
      finalPatientId = patD.obj.id;
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
      setMsg({ type: 'success', text: 'Patient saved and added to Waiting List successfully!' });
      setPatient({ ...emptyPatient });
      setPatientId(null);
      setLabTests(prev => prev.map(t => ({ ...t, is_selected: false })));
      setShowDetails(false);
    } else {
      setMsg({ type: 'error', text: typeof d.obj === 'string' ? d.obj : JSON.stringify(d.obj) });
    }
  };

  const inp = (key: string, ph: string, type = 'text') => (
    <input type={type} className="form-control" placeholder={ph}
      value={patient[key] as string || ''}
      onChange={e => setPatient(p => ({ ...p, [key]: e.target.value }))} />
  );

  return (
    <div className="page-content">
      <div className="topnav">
        <h1 className="topnav-title">Patient Demographic</h1>
      </div>
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
        <div className="card" style={{ marginBottom: '1.5rem' }}>
          <div className="card-header"><span className="card-title">Select Patient/Donor</span></div>
          <div className="card-body">
            <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-end', flexWrap: 'wrap' }}>
              <div className="form-group" style={{ margin: 0 }}>
                <label>UID</label>
                <input type="text" placeholder="Enter UID" value={filter.uid} onChange={e => setFilter(p => ({ ...p, uid: e.target.value }))} style={{ width: 200 }} />
              </div>
              <div className="form-group" style={{ margin: 0 }}>
                <label>Mobile</label>
                <input type="text" placeholder="Enter Mobile" value={filter.mobile} onChange={e => setFilter(p => ({ ...p, mobile: e.target.value }))} style={{ width: 200 }} />
              </div>
              <button className="btn btn-primary" onClick={searchPatient} disabled={searching}>{searching ? '🔍...' : '🔍 Search'}</button>
              <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem', alignSelf: 'center' }}>or</span>
              <button className="btn btn-primary" onClick={newPatient}>➕ New Patient/Donor</button>
            </div>
          </div>
        </div>

        {/* ── Patient Details Card ── */}
        {showDetails && (
          <div className="card">
            <div className="card-header"><span className="card-title">Patient/Donor Details</span></div>
            <div className="card-body">
              {/* Row 1: Name, Mobile, Gender */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginBottom: '1rem' }}>
                <div className="form-group">
                  <label>Name <span style={{ color: '#ef4444' }}>*</span></label>
                  {inp('name', 'Name')}
                </div>
                <div className="form-group">
                  <label>Mobile <span style={{ color: '#ef4444' }}>*</span></label>
                  {inp('mobile', 'Mobile', 'text')}
                </div>
                <div className="form-group">
                  <label>Gender <span style={{ color: '#ef4444' }}>*</span></label>
                  <div style={{ display: 'flex', gap: '1.5rem', paddingTop: '0.5rem' }}>
                    {[['1', 'Male'], ['2', 'Female'], ['3', 'Prefer not to declare']].map(([val, lbl]) => (
                      <label key={val} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', cursor: 'pointer', fontSize: '0.875rem' }}>
                        <input type="radio" name="gender" value={val} checked={patient.gender === val}
                          onChange={() => setPatient(p => ({ ...p, gender: val }))} />
                        {lbl}
                      </label>
                    ))}
                  </div>
                </div>
              </div>

              {/* Row 2: DOB, DL State, DL Number */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                <div className="form-group">
                  <label>DOB (mm/dd/yyyy) <span style={{ color: '#ef4444' }}>*</span></label>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <select value={patient.dob_month as string} onChange={e => setPatient(p => ({ ...p, dob_month: e.target.value }))}
                      style={{ flex: 2, background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: 6, padding: '0.5rem', color: 'var(--text)' }}>
                      {['January','February','March','April','May','June','July','August','September','October','November','December'].map((m, i) => (
                        <option key={i} value={i + 1}>{m}</option>
                      ))}
                    </select>
                    <select value={patient.dob_day as string} onChange={e => setPatient(p => ({ ...p, dob_day: e.target.value }))}
                      style={{ flex: 1, background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: 6, padding: '0.5rem', color: 'var(--text)' }}>
                      {Array.from({ length: 31 }, (_, i) => i + 1).map(d => <option key={d} value={d}>{d}</option>)}
                    </select>
                    <input type="number" placeholder="Year" value={patient.dob_year as string}
                      onChange={e => setPatient(p => ({ ...p, dob_year: e.target.value }))}
                      style={{ flex: 1.5, background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: 6, padding: '0.5rem', color: 'var(--text)' }} />
                  </div>
                </div>
                <div className="form-group">
                  <label>State of Driving License / State ID <span style={{ color: '#ef4444' }}>*</span></label>
                  <select value={patient.driving_license_state as string} onChange={e => setPatient(p => ({ ...p, driving_license_state: e.target.value }))}
                    style={{ width: '100%', background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: 6, padding: '0.5rem', color: 'var(--text)' }}>
                    <option value="">Select State</option>
                    {US_STATES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label>Driving License Number / State ID <span style={{ color: '#ef4444' }}>*</span></label>
                  {inp('driving_license', 'Driving License')}
                </div>
              </div>

              {/* Row 3: Street */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                <div className="form-group">
                  <label>Street 1 <span style={{ color: '#ef4444' }}>*</span></label>
                  {inp('street1', 'Home Address')}
                </div>
                <div className="form-group">
                  <label>Street 2</label>
                  {inp('street2', 'Home Address (optional)')}
                </div>
              </div>

              {/* Row 4: City, State, Zip */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginBottom: '1rem' }}>
                <div className="form-group">
                  <label>City <span style={{ color: '#ef4444' }}>*</span></label>
                  {inp('city', 'City')}
                </div>
                <div className="form-group">
                  <label>State <span style={{ color: '#ef4444' }}>*</span></label>
                  <select value={patient.state as string} onChange={e => setPatient(p => ({ ...p, state: e.target.value }))}
                    style={{ width: '100%', background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: 6, padding: '0.5rem', color: 'var(--text)' }}>
                    <option value="">Select State</option>
                    {US_STATES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label>Zip Code <span style={{ color: '#ef4444' }}>*</span></label>
                  {inp('zipcode', 'ZIP Code', 'number')}
                </div>
              </div>

              {/* Row 5: Email, SSN */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
                <div className="form-group">
                  <label>Email <span style={{ color: '#ef4444' }}>*</span></label>
                  {inp('email', 'Email', 'email')}
                </div>
                <div className="form-group">
                  <label>Last 4 Digits of your SSN</label>
                  <input type="text" maxLength={4} placeholder="SSN" value={patient.ssn as string}
                    onChange={e => setPatient(p => ({ ...p, ssn: e.target.value.slice(0, 4) }))} />
                </div>
              </div>

              {/* Lab Tests */}
              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ fontWeight: 600, display: 'block', marginBottom: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontSize: '0.75rem', letterSpacing: '0.05em' }}>
                  Select Lab Tests to be conducted
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.5rem' }}>
                  {labTests.map(t => (
                    <label key={t.id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.875rem', padding: '0.4rem 0.6rem', borderRadius: 6, border: `1px solid ${t.is_selected ? 'var(--primary)' : 'var(--border)'}`, background: t.is_selected ? 'rgba(var(--primary-rgb), 0.08)' : 'transparent', transition: 'all 0.15s' }}>
                      <input type="checkbox" checked={!!t.is_selected}
                        onChange={() => setLabTests(prev => prev.map(lt => lt.id === t.id ? { ...lt, is_selected: !lt.is_selected } : lt))} />
                      {t.name}
                    </label>
                  ))}
                </div>
              </div>

              {/* Reason for Test */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '1rem', marginBottom: '1.5rem' }}>
                <div className="form-group">
                  <label>Select the reason for the test:</label>
                  <select value={reason} onChange={e => setReason(e.target.value)}
                    style={{ width: '100%', background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: 6, padding: '0.5rem', color: 'var(--text)' }}>
                    {REASONS.map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                </div>
                {reason === 'Other' && (
                  <div className="form-group">
                    <label>Specify Reason:</label>
                    <input type="text" placeholder="Reason" value={customReason} onChange={e => setCustomReason(e.target.value)} />
                  </div>
                )}
              </div>

              {/* Acknowledgement */}
              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', cursor: 'pointer', fontSize: '0.875rem' }}>
                  <input type="checkbox" checked={!!patient.accept}
                    onChange={e => setPatient(p => ({ ...p, accept: e.target.checked }))}
                    style={{ marginTop: '0.2rem', flexShrink: 0 }} />
                  <span>I hereby acknowledge that the information given by me is accurate and complete.</span>
                </label>
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <button className="btn btn-primary" onClick={savePatient} disabled={saving}>
                  {saving ? '⏳ Saving...' : '💾 Save'}
                </button>
                <button className="btn btn-ghost" onClick={() => { setPatient({ ...emptyPatient }); setMsg(null); setLabTests(prev => prev.map(t => ({ ...t, is_selected: false }))); }}>
                  🔄 Reset Data
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
