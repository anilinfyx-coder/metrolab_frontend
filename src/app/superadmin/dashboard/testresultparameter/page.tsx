'use client';
import { useState, useEffect } from 'react';
import TopNav from '../../../components/TopNav';
import { useConfirm } from '../../../components/ConfirmModal';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
function getToken() { return typeof window !== 'undefined' ? localStorage.getItem('superadmin_token') || '' : ''; }

interface TestResultParameter {
  id: number;
  name: string;
  placeholder: string;
  label: string;
  input_type: string;
  validate_regex: string;
  reference_range_text: string;
  unit_text: string;
  description: string;
  is_mandatory: boolean;
  type_data_id: number;
  status: boolean;
}
interface DocType { id: number; name: string; }

const INPUT_TYPES = [
  { value: '1', label: 'Text (String)' },
  { value: '2', label: 'TextBox (Int)' },
  { value: '3', label: 'Dropdown' },
  { value: '4', label: 'Upload File' },
  { value: '5', label: 'Upload File Type' },
];

const emptyForm = {
  name: '', placeholder: '', label: '', input_type: '1',
  validate_regex: '', reference_range_text: '', unit_text: '',
  description: '', is_mandatory: false, type_data_id: '',
};

export default function TestResultParameterPage() {
  const confirmDialog = useConfirm();
  const [params, setParams] = useState<TestResultParameter[]>([]);
  const [docTypes, setDocTypes] = useState<DocType[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'list' | 'form'>('list');
  const [form, setForm] = useState<Record<string, string | boolean>>({ ...emptyForm });
  const [editingId, setEditingId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [search, setSearch] = useState('');

  const loadData = () => {
    setLoading(true);
    fetch(`${API}/api/ReportRequestParameters`, { headers: { token: getToken() } })
      .then(r => r.json())
      .then(d => { if (d.response_code === '200') setParams(d.obj || []); })
      .catch(() => setParams([]))
      .finally(() => setLoading(false));
  };

  const loadDocTypes = () => {
    fetch(`${API}/api/TypeData`, { headers: { token: getToken() } })
      .then(r => r.json())
      .then(d => { if (d.response_code === '200') setDocTypes(d.obj || []); });
  };

  useEffect(() => { loadData(); loadDocTypes(); }, []);

  const save = async () => {
    setSaving(true); setMsg(null);
    const method = editingId ? 'PUT' : 'POST';
    const url = `${API}/api/ReportRequestParameters${editingId ? `/${editingId}` : ''}`;
    const payload = {
      ...form,
      type_data_id: form.type_data_id || null,
      is_mandatory: form.is_mandatory === true || form.is_mandatory === 'true',
    };
    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json', token: getToken() },
      body: JSON.stringify(payload)
    });
    const d = await res.json();
    setSaving(false);
    if (d.response_code === '200') {
      setMsg({ type: 'success', text: `Parameter ${editingId ? 'updated' : 'added'}.` });
      setForm({ ...emptyForm });
      setEditingId(null);
      setView('list');
      loadData();
    } else { setMsg({ type: 'error', text: typeof d.obj === 'string' ? d.obj : 'Error saving.' }); }
  };

  const remove = async (id: number) => {
    const ok = await confirmDialog({
      title: 'You are trying to delete Test Result Parameter, Please confirm',
      message: 'This cannot be restored once deleted.',
      cancelText: 'NO, WAIT!',
      confirmText: 'CONFIRM DELETION',
    });
    if (!ok) return;
    await fetch(`${API}/api/ReportRequestParameters/${id}`, { method: 'DELETE', headers: { token: getToken() } });
    loadData();
  };

  const toggleStatus = async (p: TestResultParameter) => {
    await fetch(`${API}/api/ReportRequestParameters/${p.id}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json', token: getToken() },
      body: JSON.stringify({ status: !p.status })
    });
    loadData();
  };

  const openEdit = (p: TestResultParameter) => {
    setEditingId(p.id);
    setForm({
      name: p.name || '', placeholder: p.placeholder || '', label: p.label || '',
      input_type: String(p.input_type || '1'), validate_regex: p.validate_regex || '',
      reference_range_text: p.reference_range_text || '', unit_text: p.unit_text || '',
      description: p.description || '', is_mandatory: p.is_mandatory || false,
      type_data_id: String(p.type_data_id || ''),
    });
    setMsg(null);
    setView('form');
  };

  const getInputTypeLabel = (val: string) => INPUT_TYPES.find(t => t.value === String(val))?.label || val;
  const getTypeName = (id: number) => docTypes.find(d => d.id === id)?.name || '—';

  const filtered = params.filter(p => !search || p.name?.toLowerCase().includes(search.toLowerCase()) || p.label?.toLowerCase().includes(search.toLowerCase()));

  const inp = (key: string, label: string, type = 'text') => (
    <div className="form-group">
      <label>{label}</label>
      <input type={type} value={String(form[key] || '')}
        onChange={e => setForm(p => ({ ...p, [key]: e.target.value }))}
        placeholder={`Enter ${label}`} />
    </div>
  );

  if (view === 'form') {
    return (
      <div className="page-content">
        <TopNav title={editingId ? 'Edit Test Result Parameter' : 'Add Test Result Parameter'}>
          <button className="btn btn-ghost" onClick={() => { setView('list'); setMsg(null); }}>✕ Close</button>
        </TopNav>
        <div style={{ padding: '1.5rem' }}>
          {msg && (
            <div style={{ background: msg.type === 'success' ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)', border: `1px solid ${msg.type === 'success' ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)'}`, borderRadius: 8, padding: '0.75rem 1rem', marginBottom: '1rem', fontSize: '0.875rem', color: msg.type === 'success' ? '#10b981' : '#ef4444' }}>
              {msg.text}
            </div>
          )}
          <div className="card">
            <div className="card-header"><span className="card-title">Test Result Parameter Detail</span></div>
            <div className="card-body">
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '0 1.5rem' }}>
                {inp('name', 'Name')}
                {inp('placeholder', 'Placeholder')}
                {inp('label', 'Label')}

                <div className="form-group">
                  <label>Input Type</label>
                  <select value={String(form.input_type || '1')} onChange={e => setForm(p => ({ ...p, input_type: e.target.value }))}>
                    {INPUT_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                </div>

                {inp('validate_regex', 'Validation Regex')}
                {inp('reference_range_text', 'Reference Range Text')}
                {inp('unit_text', 'Unit Text')}

                <div className="form-group">
                  <label>Test Type</label>
                  <select value={String(form.type_data_id || '')} onChange={e => setForm(p => ({ ...p, type_data_id: e.target.value }))}>
                    <option value="">-- Select Test Type --</option>
                    {docTypes.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                  </select>
                </div>

                <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                  <label>Description</label>
                  <textarea rows={3} placeholder="Enter Description"
                    value={String(form.description || '')}
                    onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
                    style={{ width: '100%', background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: 6, padding: '0.5rem', color: 'var(--text)', resize: 'vertical', fontFamily: 'inherit' }} />
                </div>

                <div className="form-group">
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                    <input type="checkbox"
                      checked={form.is_mandatory === true || form.is_mandatory === 'true'}
                      onChange={e => setForm(p => ({ ...p, is_mandatory: e.target.checked }))}
                      style={{ width: 16, height: 16, cursor: 'pointer' }} />
                    Is Mandatory
                  </label>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.5rem' }}>
                <button className="btn btn-primary" onClick={save} disabled={saving}>{saving ? '⏳ Saving...' : '💾 Save'}</button>
                <button className="btn btn-ghost" onClick={() => { setForm({ ...emptyForm }); setMsg(null); }}>🔄 Reset</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page-content">
      <TopNav title="Test Result Parameters">
        <input type="text" placeholder="Search parameters..." value={search} onChange={e => setSearch(e.target.value)}
          style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, padding: '0.5rem 0.75rem', color: 'var(--text)', fontSize: '0.875rem', width: 240 }} />
        <button className="btn btn-primary" onClick={() => { setEditingId(null); setForm({ ...emptyForm }); setMsg(null); setView('form'); }}>
          ➕ Add Parameter
        </button>
      </TopNav>

      <div style={{ padding: '1.5rem' }}>
        {msg && (
          <div style={{ background: msg.type === 'success' ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)', border: `1px solid ${msg.type === 'success' ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)'}`, borderRadius: 8, padding: '0.75rem 1rem', marginBottom: '1rem', fontSize: '0.875rem', color: msg.type === 'success' ? '#10b981' : '#ef4444' }}>
            {msg.text}
          </div>
        )}

        <div className="card">
          <div className="card-body" style={{ padding: 0 }}>
            {loading ? (
              <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>Loading...</div>
            ) : filtered.length === 0 ? (
              <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>No parameters found.</div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border)' }}>
                    {['#', 'Name', 'Label', 'Description', 'Input Type', 'Test Type', 'Status', 'Action'].map(h => (
                      <th key={h} style={{ padding: '0.75rem 1rem', textAlign: 'left', color: 'var(--text-muted)', fontWeight: 600 }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((p, i) => (
                    <tr key={p.id} style={{ borderBottom: '1px solid var(--border)', transition: 'background 0.15s' }}
                      onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-card-hover)')}
                      onMouseLeave={e => (e.currentTarget.style.background = '')}>
                      <td style={{ padding: '0.75rem 1rem', color: 'var(--text-muted)' }}>{i + 1}</td>
                      <td style={{ padding: '0.75rem 1rem', fontWeight: 500 }}>{p.name}</td>
                      <td style={{ padding: '0.75rem 1rem' }}>{p.label}</td>
                      <td style={{ padding: '0.75rem 1rem', maxWidth: 200 }}>{p.description}</td>
                      <td style={{ padding: '0.75rem 1rem' }}>{getInputTypeLabel(p.input_type)}</td>
                      <td style={{ padding: '0.75rem 1rem' }}>{getTypeName(p.type_data_id)}</td>
                      <td style={{ padding: '0.75rem 1rem' }}>
                        <span className={`badge ${p.status ? 'badge-success' : 'badge-danger'}`}>{p.status ? 'Active' : 'Inactive'}</span>
                      </td>
                      <td style={{ padding: '0.75rem 1rem', display: 'flex', gap: '0.5rem' }}>
                        <button className="btn btn-ghost" style={{ fontSize: '0.75rem', padding: '0.25rem 0.75rem' }} onClick={() => openEdit(p)}>✏️ Edit</button>
                        <button className="btn btn-ghost" style={{ fontSize: '0.75rem', padding: '0.25rem 0.75rem' }} onClick={() => toggleStatus(p)}>⚡ {p.status ? 'Disable' : 'Enable'}</button>
                        <button className="btn btn-ghost" style={{ fontSize: '0.75rem', padding: '0.25rem 0.75rem', color: '#ef4444' }} onClick={() => remove(p.id)}>🗑 Delete</button>
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
