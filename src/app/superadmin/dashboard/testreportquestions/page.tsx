'use client';
import { useState, useEffect } from 'react';
import TopNav from '../../../components/TopNav';
import { useConfirm } from '../../../components/ConfirmModal';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
function getToken() { return typeof window !== 'undefined' ? localStorage.getItem('superadmin_token') || '' : ''; }

interface ReportQuestion { id: number; question_text: string; type_data_id: number; status: boolean; }
interface DocType { id: number; name: string; }

const emptyForm = { question_text: '', type_data_id: '' };

export default function TestReportQuestionsPage() {
  const confirmDialog = useConfirm();
  const [questions, setQuestions] = useState<ReportQuestion[]>([]);
  const [docTypes, setDocTypes] = useState<DocType[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ ...emptyForm });
  const [editingId, setEditingId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [search, setSearch] = useState('');

  const loadData = () => {
    setLoading(true);
    fetch(`${API}/api/ReportQuestions`, { headers: { token: getToken() } })
      .then(r => r.json())
      .then(d => { if (d.response_code === '200') setQuestions(d.obj || []); })
      .catch(() => setQuestions([]))
      .finally(() => setLoading(false));
  };

  const loadDocTypes = () => {
    fetch(`${API}/api/TypeData`, { headers: { token: getToken() } })
      .then(r => r.json())
      .then(d => { if (d.response_code === '200') setDocTypes(d.obj || []); });
  };

  useEffect(() => { loadData(); loadDocTypes(); }, []);

  const save = async () => {
    if (!form.question_text) {
      setMsg({ type: 'error', text: 'Question text is required.' }); return;
    }
    setSaving(true); setMsg(null);
    const method = editingId ? 'PUT' : 'POST';
    const url = `${API}/api/ReportQuestions${editingId ? `/${editingId}` : ''}`;
    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json', token: getToken() },
      body: JSON.stringify({ ...form, type_data_id: form.type_data_id || null })
    });
    const d = await res.json();
    setSaving(false);
    if (d.response_code === '200') {
      setMsg({ type: 'success', text: `Question ${editingId ? 'updated' : 'added'}.` });
      setForm({ ...emptyForm });
      setEditingId(null);
      setShowModal(false);
      loadData();
    } else { setMsg({ type: 'error', text: typeof d.obj === 'string' ? d.obj : 'Error saving.' }); }
  };

  const remove = async (id: number) => {
    const ok = await confirmDialog({
      title: 'You are trying to delete Test Report Question, Please confirm',
      message: 'This cannot be restored once deleted.',
      cancelText: 'NO, WAIT!',
      confirmText: 'CONFIRM DELETION',
    });
    if (!ok) return;
    await fetch(`${API}/api/ReportQuestions/${id}`, { method: 'DELETE', headers: { token: getToken() } });
    loadData();
  };

  const toggleStatus = async (q: ReportQuestion) => {
    await fetch(`${API}/api/ReportQuestions/${q.id}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json', token: getToken() },
      body: JSON.stringify({ status: !q.status })
    });
    loadData();
  };

  const openEdit = (q: ReportQuestion) => {
    setEditingId(q.id);
    setForm({ question_text: q.question_text || '', type_data_id: String(q.type_data_id || '') });
    setShowModal(true);
    setMsg(null);
  };

  const getTypeName = (id: number) => docTypes.find(d => d.id === id)?.name || '—';

  const filtered = questions.filter(q => !search || q.question_text?.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="page-content">
      <TopNav title="Test Report Questions">
        <input type="text" placeholder="Search questions..." value={search} onChange={e => setSearch(e.target.value)}
          style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, padding: '0.5rem 0.75rem', color: 'var(--text)', fontSize: '0.875rem', width: 240 }} />
        <button className="btn btn-primary" onClick={() => { setEditingId(null); setForm({ ...emptyForm }); setMsg(null); setShowModal(true); }}>
          ➕ Add Question
        </button>
      </TopNav>

      <div style={{ padding: '1.5rem' }}>
        {msg && !showModal && (
          <div style={{ background: msg.type === 'success' ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)', border: `1px solid ${msg.type === 'success' ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)'}`, borderRadius: 8, padding: '0.75rem 1rem', marginBottom: '1rem', fontSize: '0.875rem', color: msg.type === 'success' ? '#10b981' : '#ef4444' }}>
            {msg.text}
          </div>
        )}

        {showModal && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999 }}>
            <div className="card" style={{ width: '100%', maxWidth: 520, margin: '1rem' }}>
              <div className="card-header"><span className="card-title">{editingId ? '✏️ Edit' : '➕ Add'} Test Report Question</span></div>
              <div className="card-body">
                {msg && <div style={{ background: msg.type === 'success' ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)', border: `1px solid ${msg.type === 'success' ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)'}`, borderRadius: 8, padding: '0.6rem 0.9rem', marginBottom: '1rem', fontSize: '0.85rem', color: msg.type === 'success' ? '#10b981' : '#ef4444' }}>{msg.text}</div>}

                <div className="form-group">
                  <label>Test Type</label>
                  <select value={form.type_data_id} onChange={e => setForm(p => ({ ...p, type_data_id: e.target.value }))}>
                    <option value="">-- Select Test Type --</option>
                    {docTypes.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                  </select>
                </div>

                <div className="form-group">
                  <label>Question <span style={{ color: '#ef4444' }}>*</span></label>
                  <textarea rows={4} placeholder="Enter question text"
                    value={form.question_text}
                    onChange={e => setForm(p => ({ ...p, question_text: e.target.value }))}
                    style={{ width: '100%', background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: 6, padding: '0.5rem', color: 'var(--text)', resize: 'vertical', fontFamily: 'inherit' }} />
                </div>

                <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem' }}>
                  <button className="btn btn-primary" onClick={save} disabled={saving}>{saving ? '⏳' : '💾 Save'}</button>
                  <button className="btn btn-ghost" onClick={() => setShowModal(false)}>Cancel</button>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="card">
          <div className="card-body" style={{ padding: 0 }}>
            {loading ? (
              <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>Loading...</div>
            ) : filtered.length === 0 ? (
              <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>No questions found.</div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border)' }}>
                    {['#', 'Question', 'Test Type', 'Status', 'Action'].map(h => (
                      <th key={h} style={{ padding: '0.75rem 1rem', textAlign: 'left', color: 'var(--text-muted)', fontWeight: 600 }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((q, i) => (
                    <tr key={q.id} style={{ borderBottom: '1px solid var(--border)', transition: 'background 0.15s' }}
                      onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-card-hover)')}
                      onMouseLeave={e => (e.currentTarget.style.background = '')}>
                      <td style={{ padding: '0.75rem 1rem', color: 'var(--text-muted)' }}>{i + 1}</td>
                      <td style={{ padding: '0.75rem 1rem', fontWeight: 500, maxWidth: 400 }}>{q.question_text}</td>
                      <td style={{ padding: '0.75rem 1rem' }}>{getTypeName(q.type_data_id)}</td>
                      <td style={{ padding: '0.75rem 1rem' }}>
                        <span className={`badge ${q.status ? 'badge-success' : 'badge-danger'}`}>{q.status ? 'Active' : 'Inactive'}</span>
                      </td>
                      <td style={{ padding: '0.75rem 1rem', display: 'flex', gap: '0.5rem' }}>
                        <button className="btn btn-ghost" style={{ fontSize: '0.75rem', padding: '0.25rem 0.75rem' }} onClick={() => openEdit(q)}>✏️ Edit</button>
                        <button className="btn btn-ghost" style={{ fontSize: '0.75rem', padding: '0.25rem 0.75rem' }} onClick={() => toggleStatus(q)}>⚡ {q.status ? 'Disable' : 'Enable'}</button>
                        <button className="btn btn-ghost" style={{ fontSize: '0.75rem', padding: '0.25rem 0.75rem', color: '#ef4444' }} onClick={() => remove(q.id)}>🗑 Delete</button>
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
