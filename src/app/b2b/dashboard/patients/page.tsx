'use client';
import { useEffect, useState, useCallback } from 'react';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

interface Patient {
  id: number;
  uid: string;
  name: string;
  mobile: string;
  email: string;
  dob: string;
  gender: number | null;
  city: string;
  state: string;
  zipcode: string;
  status: boolean | null;
  deleted: boolean | null;
}

const emptyPatient: Partial<Patient> = {
  name: '', mobile: '', email: '', dob: '', gender: 1, city: '', state: '', zipcode: '', uid: ''
};

export default function PatientsPage() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState<Partial<Patient>>(emptyPatient);
  const [saving, setSaving] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);

  const token = typeof window !== 'undefined' ? localStorage.getItem('token') || '' : '';
  const headers = { 'Content-Type': 'application/json', token };

  const fetchPatients = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/Patient`, { headers });
      const data = await res.json();
      if (data.response_code === '200') setPatients(data.obj);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { fetchPatients(); }, [fetchPatients]);

  const filtered = patients.filter(p =>
    p.name?.toLowerCase().includes(search.toLowerCase()) ||
    p.mobile?.includes(search) ||
    p.email?.toLowerCase().includes(search.toLowerCase())
  );

  const openAdd = () => { setForm(emptyPatient); setEditId(null); setShowModal(true); };
  const openEdit = (p: Patient) => { setForm(p); setEditId(p.id); setShowModal(true); };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const url = editId ? `${API_BASE}/api/Patient/${editId}` : `${API_BASE}/api/Patient`;
      const method = editId ? 'PUT' : 'POST';
      const res = await fetch(url, { method, headers, body: JSON.stringify(form) });
      const data = await res.json();
      if (data.response_code === '200') {
        setShowModal(false);
        fetchPatients();
      }
    } catch { /* ignore */ }
    finally { setSaving(false); }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this patient?')) return;
    await fetch(`${API_BASE}/api/Patient/${id}`, { method: 'DELETE', headers });
    fetchPatients();
  };

  const genderLabel = (g: number | null) => g === 1 ? 'Male' : g === 2 ? 'Female' : 'Other';

  return (
    <>
      <div className="topnav">
        <h1 className="topnav-title">Patients</h1>
        <div className="topnav-actions">
          <button id="add-patient-btn" className="btn btn-primary" onClick={openAdd}>➕ Add Patient</button>
        </div>
      </div>

      <div className="page-content">
        <div className="page-header">
          <div>
            <h2 className="page-title">Patient Management</h2>
            <p className="page-subtitle">{patients.length} total patients registered</p>
          </div>
          <div className="search-bar" style={{ minWidth: 280 }}>
            <span>🔍</span>
            <input
              id="patient-search"
              type="text"
              placeholder="Search by name, mobile, email..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
        </div>

        <div className="card">
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>UID</th>
                  <th>Name</th>
                  <th>Mobile</th>
                  <th>Email</th>
                  <th>Gender</th>
                  <th>City</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={8} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>Loading patients...</td></tr>
                ) : filtered.length === 0 ? (
                  <tr><td colSpan={8} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>No patients found</td></tr>
                ) : filtered.map(p => (
                  <tr key={p.id}>
                    <td><span className="badge badge-primary">{p.uid}</span></td>
                    <td style={{ fontWeight: 600 }}>{p.name}</td>
                    <td>{p.mobile}</td>
                    <td style={{ color: 'var(--text-muted)' }}>{p.email}</td>
                    <td>{genderLabel(p.gender)}</td>
                    <td>{p.city}</td>
                    <td>
                      <span className={`badge ${p.status ? 'badge-success' : 'badge-danger'}`}>
                        {p.status ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button className="btn btn-ghost btn-sm" id={`edit-patient-${p.id}`} onClick={() => openEdit(p)}>✏️ Edit</button>
                        <button className="btn btn-danger btn-sm" id={`del-patient-${p.id}`} onClick={() => handleDelete(p.id)}>🗑️</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editId ? 'Edit Patient' : 'Add New Patient'}</h2>
              <button className="btn btn-ghost btn-sm" id="close-patient-modal" onClick={() => setShowModal(false)}>✕</button>
            </div>
            <form onSubmit={handleSave}>
              <div className="modal-body">
                <div className="form-row">
                  <div className="form-group">
                    <label>Full Name *</label>
                    <input id="patient-name" required value={form.name || ''} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="John Doe" />
                  </div>
                  <div className="form-group">
                    <label>UID</label>
                    <input id="patient-uid" value={form.uid || ''} onChange={e => setForm({ ...form, uid: e.target.value })} placeholder="PT-001" />
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Mobile *</label>
                    <input id="patient-mobile" required value={form.mobile || ''} onChange={e => setForm({ ...form, mobile: e.target.value })} placeholder="+1 555 0000" />
                  </div>
                  <div className="form-group">
                    <label>Email</label>
                    <input id="patient-email" type="email" value={form.email || ''} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="patient@email.com" />
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Date of Birth</label>
                    <input id="patient-dob" type="date" value={form.dob || ''} onChange={e => setForm({ ...form, dob: e.target.value })} />
                  </div>
                  <div className="form-group">
                    <label>Gender</label>
                    <select id="patient-gender" value={form.gender ?? 1} onChange={e => setForm({ ...form, gender: parseInt(e.target.value) })}>
                      <option value={1}>Male</option>
                      <option value={2}>Female</option>
                      <option value={3}>Other</option>
                    </select>
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>City</label>
                    <input id="patient-city" value={form.city || ''} onChange={e => setForm({ ...form, city: e.target.value })} placeholder="New York" />
                  </div>
                  <div className="form-group">
                    <label>State</label>
                    <input id="patient-state" value={form.state || ''} onChange={e => setForm({ ...form, state: e.target.value })} placeholder="NY" />
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-ghost" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" id="save-patient-btn" className="btn btn-primary" disabled={saving}>
                  {saving ? 'Saving...' : editId ? 'Update Patient' : 'Add Patient'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
