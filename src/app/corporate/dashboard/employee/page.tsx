'use client';
import { useState, useEffect } from 'react';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
function getToken() { return typeof window !== 'undefined' ? localStorage.getItem('corporate_token') || '' : ''; }

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

interface Employee {
  id: number; first_name: string; last_name: string; mobile: string; department: string; status: boolean;
}

const emptyForm = {
  first_name: '', last_name: '', mobile: '', gender: '1', dob_month: '1', dob_day: '1', dob_year: '',
  driving_license_state: '', driving_license: '', street1: '', street2: '',
  city: '', state: '', zipcode: '', email: '', ssn: '', department: ''
};

export default function EmployeePage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState<Record<string, string | boolean>>({ ...emptyForm });
  const [editingId, setEditingId] = useState<number | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [search, setSearch] = useState('');

  const loadEmployees = () => {
    setLoading(true);
    // In a real app we'd filter by corporate client ID, but generic CRUD doesn't enforce it unless we pass it.
    fetch(`${API}/api/Employees`, { headers: { token: getToken() } })
      .then(r => r.json())
      .then(d => { if (d.response_code === '200') setEmployees(d.obj || []); })
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadEmployees(); }, []);

  const openAdd = () => { setEditingId(null); setForm({ ...emptyForm }); setMsg(null); setShowForm(true); };
  
  const openEdit = (e: any) => {
    setEditingId(e.id);
    const dobParts = e.dob ? e.dob.split('T')[0].split('-') : ['', '1', '1'];
    setForm({
      ...emptyForm, ...e,
      dob_year: dobParts[0] || '', dob_month: String(parseInt(dobParts[1]) || 1), dob_day: String(parseInt(dobParts[2]) || 1),
      gender: String(e.gender || '1')
    });
    setMsg(null); setShowForm(true);
  };

  const save = async () => {
    if (!form.first_name || !form.last_name || !form.mobile) {
      setMsg({ type: 'error', text: 'First Name, Last Name, and Mobile are required.' }); return;
    }

    setSaving(true); setMsg(null);
    const dobString = form.dob_year
      ? `${form.dob_year}-${String(form.dob_month).padStart(2, '0')}-${String(form.dob_day).padStart(2, '0')}`
      : null;

    const payload = {
      first_name: form.first_name, last_name: form.last_name, mobile: form.mobile, gender: parseInt(form.gender as string),
      dob: dobString, driving_license_state: form.driving_license_state, driving_license: form.driving_license,
      street1: form.street1, street2: form.street2, city: form.city, state: form.state, zipcode: form.zipcode,
      email: form.email, ssn: form.ssn, department: form.department
    };

    const method = editingId ? 'PUT' : 'POST';
    const url = `${API}/api/Employees${editingId ? `/${editingId}` : ''}`;
    
    const res = await fetch(url, {
      method, headers: { 'Content-Type': 'application/json', token: getToken() },
      body: JSON.stringify(payload)
    });
    const d = await res.json();
    setSaving(false);

    if (d.response_code === '200') {
      setShowForm(false);
      loadEmployees();
    } else {
      setMsg({ type: 'error', text: typeof d.obj === 'string' ? d.obj : JSON.stringify(d.obj) });
    }
  };

  const remove = async (id: number) => {
    if (!confirm('Delete this Employee?')) return;
    await fetch(`${API}/api/Employees/${id}`, { method: 'DELETE', headers: { token: getToken() } });
    loadEmployees();
  };

  const toggleStatus = async (e: Employee) => {
    await fetch(`${API}/api/Employees/${e.id}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json', token: getToken() },
      body: JSON.stringify({ status: !e.status })
    });
    loadEmployees();
  };

  const filtered = employees.filter(e => 
    !search || 
    e.first_name?.toLowerCase().includes(search.toLowerCase()) || 
    e.last_name?.toLowerCase().includes(search.toLowerCase()) ||
    e.mobile?.includes(search)
  );

  const inp = (key: string, ph: string, type = 'text', maxLength?: number) => (
    <input type={type} className="form-control" placeholder={ph} maxLength={maxLength}
      value={form[key] as string || ''} onChange={e => setForm(p => ({ ...p, [key]: e.target.value }))} />
  );

  if (showForm) {
    return (
      <div className="page-content">
        <div className="topnav">
          <h1 className="topnav-title">Employee Details</h1>
          <div className="topnav-actions"><button className="btn btn-ghost" onClick={() => setShowForm(false)}>✕ Close</button></div>
        </div>
        <div style={{ padding: '1.5rem' }}>
          {msg && <div style={{ background: msg.type === 'success' ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)', border: `1px solid ${msg.type === 'success' ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)'}`, borderRadius: 8, padding: '0.75rem 1rem', marginBottom: '1rem', fontSize: '0.875rem', color: msg.type === 'success' ? '#10b981' : '#ef4444' }}>{msg.text}</div>}
          <div className="card">
            <div className="card-header"><span className="card-title">{editingId ? '✏️ Edit Employee' : '➕ Add Employee'}</span></div>
            <div className="card-body">
              {/* Row 1 */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginBottom: '1rem' }}>
                <div className="form-group"><label>First Name <span style={{ color: '#ef4444' }}>*</span></label>{inp('first_name', 'First Name')}</div>
                <div className="form-group"><label>Last Name <span style={{ color: '#ef4444' }}>*</span></label>{inp('last_name', 'Last Name')}</div>
                <div className="form-group"><label>Mobile <span style={{ color: '#ef4444' }}>*</span></label>{inp('mobile', 'Mobile', 'text', 15)}</div>
              </div>

              {/* Row 2 */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                <div className="form-group">
                  <label>DOB (mm/dd/yyyy)</label>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <select value={form.dob_month as string} onChange={e => setForm(p => ({ ...p, dob_month: e.target.value }))} style={{ flex: 2, background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: 6, padding: '0.5rem', color: 'var(--text)' }}>
                      {['January','February','March','April','May','June','July','August','September','October','November','December'].map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
                    </select>
                    <select value={form.dob_day as string} onChange={e => setForm(p => ({ ...p, dob_day: e.target.value }))} style={{ flex: 1, background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: 6, padding: '0.5rem', color: 'var(--text)' }}>
                      {Array.from({ length: 31 }, (_, i) => i + 1).map(d => <option key={d} value={d}>{d}</option>)}
                    </select>
                    <input type="number" placeholder="Year" value={form.dob_year as string} onChange={e => setForm(p => ({ ...p, dob_year: e.target.value }))} style={{ flex: 1.5, background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: 6, padding: '0.5rem', color: 'var(--text)' }} />
                  </div>
                </div>
                <div className="form-group">
                  <label>State of Driving License / State ID</label>
                  <select value={form.driving_license_state as string} onChange={e => setForm(p => ({ ...p, driving_license_state: e.target.value }))} style={{ width: '100%', background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: 6, padding: '0.5rem', color: 'var(--text)' }}>
                    <option value="">Select State</option>
                    {US_STATES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div className="form-group"><label>Driving License Number / State ID</label>{inp('driving_license', 'Driving License')}</div>
              </div>

              {/* Row 3 */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                <div className="form-group">
                  <label>Gender <span style={{ color: '#ef4444' }}>*</span></label>
                  <div style={{ display: 'flex', gap: '1.5rem', paddingTop: '0.5rem' }}>
                    {[['1', 'Male'], ['2', 'Female'], ['3', 'Prefer not to declare']].map(([val, lbl]) => (
                      <label key={val} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', cursor: 'pointer', fontSize: '0.875rem' }}>
                        <input type="radio" name="gender" value={val} checked={form.gender === val} onChange={() => setForm(p => ({ ...p, gender: val }))} /> {lbl}
                      </label>
                    ))}
                  </div>
                </div>
                <div className="form-group"><label>Street 1</label>{inp('street1', 'Home Address')}</div>
                <div className="form-group"><label>Street 2</label>{inp('street2', 'Home Address')}</div>
              </div>

              {/* Row 4 */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginBottom: '1rem' }}>
                <div className="form-group"><label>City</label>{inp('city', 'City')}</div>
                <div className="form-group">
                  <label>State</label>
                  <select value={form.state as string} onChange={e => setForm(p => ({ ...p, state: e.target.value }))} style={{ width: '100%', background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: 6, padding: '0.5rem', color: 'var(--text)' }}>
                    <option value="">Select State</option>
                    {US_STATES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div className="form-group"><label>Zip Code</label>{inp('zipcode', 'ZIP Code', 'number')}</div>
              </div>

              {/* Row 5 */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
                <div className="form-group"><label>Email</label>{inp('email', 'Email', 'email')}</div>
                <div className="form-group"><label>Last 4 Digits of your SSN</label>{inp('ssn', 'SSN', 'text', 4)}</div>
                <div className="form-group"><label>Department</label>{inp('department', 'Department')}</div>
              </div>

              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <button className="btn btn-primary" onClick={save} disabled={saving}>{saving ? '⏳ Saving...' : '💾 Save'}</button>
                <button className="btn btn-ghost" onClick={() => { setForm({ ...emptyForm }); setMsg(null); }}>🔄 Reset Data</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page-content">
      <div className="topnav">
        <h1 className="topnav-title">Employees</h1>
        <div className="topnav-actions">
          <input type="text" placeholder="Search employees..." value={search} onChange={e => setSearch(e.target.value)}
            style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, padding: '0.5rem 0.75rem', color: 'var(--text)', fontSize: '0.875rem', width: 220 }} />
          <button className="btn btn-primary" onClick={openAdd}>➕ Add Employee</button>
        </div>
      </div>
      <div style={{ padding: '1.5rem' }}>
        <div className="card">
          <div className="card-body" style={{ padding: 0 }}>
            {loading ? <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>Loading...</div>
              : filtered.length === 0 ? <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>No Employees found.</div>
              : (
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border)' }}>
                      {['First Name', 'Last Name', 'Department', 'Mobile', 'Actions'].map(h => (
                        <th key={h} style={{ padding: '0.75rem 1rem', textAlign: 'left', color: 'var(--text-muted)', fontWeight: 600 }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map(e => (
                      <tr key={e.id} style={{ borderBottom: '1px solid var(--border)' }}
                        onMouseEnter={ev => (ev.currentTarget.style.background = 'var(--bg-card-hover)')}
                        onMouseLeave={ev => (ev.currentTarget.style.background = '')}>
                        <td style={{ padding: '0.75rem 1rem', fontWeight: 500 }}>{e.first_name}</td>
                        <td style={{ padding: '0.75rem 1rem' }}>{e.last_name}</td>
                        <td style={{ padding: '0.75rem 1rem' }}>{e.department || '—'}</td>
                        <td style={{ padding: '0.75rem 1rem' }}>{e.mobile}</td>
                        <td style={{ padding: '0.75rem 1rem' }}>
                          <div style={{ display: 'flex', gap: '0.35rem' }}>
                            <button className="btn btn-ghost" style={{ fontSize: '0.72rem', padding: '0.2rem 0.5rem' }} onClick={() => openEdit(e)}>✏️</button>
                            <button className="btn btn-ghost" style={{ fontSize: '0.72rem', padding: '0.2rem 0.5rem', color: e.status ? '#10b981' : '#9ca3af' }} onClick={() => toggleStatus(e)}>{e.status ? '🟢' : '🔴'}</button>
                            <button className="btn btn-ghost" style={{ fontSize: '0.72rem', padding: '0.2rem 0.5rem', color: '#ef4444' }} onClick={() => remove(e.id)}>🗑</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
          </div>
        </div>
      </div>
    </div>
  );
}
