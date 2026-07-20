'use client';
import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { MdAdd, MdDelete, MdEdit, MdHourglassEmpty, MdSave } from 'react-icons/md';
import TopNav from '../../../components/TopNav';
import { useConfirm } from '../../../components/ConfirmModal';
import { apiFetch } from '../../../../lib/api';

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
  const [search, setSearch] = useState('');

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await apiFetch<ReportQuestion[]>('/api/ReportQuestions', { tokenKey: 'superadmin_token' });
      setQuestions(data || []);
    } catch {
      setQuestions([]);
    } finally {
      setLoading(false);
    }
  };

  const loadDocTypes = async () => {
    try {
      const data = await apiFetch<DocType[]>('/api/TypeData', { tokenKey: 'superadmin_token' });
      setDocTypes(data || []);
    } catch {
      setDocTypes([]);
    }
  };

  useEffect(() => { loadData(); loadDocTypes(); }, []);

  const save = async () => {
    if (!form.question_text) {
      toast.error('Question text is required.');
      return;
    }
    setSaving(true);
    const method = editingId ? 'PUT' : 'POST';
    const path = `/api/ReportQuestions${editingId ? `/${editingId}` : ''}`;
    try {
      await apiFetch(path, {
        method,
        tokenKey: 'superadmin_token',
        body: JSON.stringify({ ...form, type_data_id: form.type_data_id || null }),
        successMessage: `Question ${editingId ? 'updated' : 'added'}.`,
        errorFallback: 'Error saving.',
      });
      setForm({ ...emptyForm });
      setEditingId(null);
      setShowModal(false);
      loadData();
    } catch {
      /* error toasted by apiFetch */
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id: number) => {
    const ok = await confirmDialog({
      title: 'You are trying to delete Test Report Question, Please confirm',
      message: 'This cannot be restored once deleted.',
      cancelText: 'NO, WAIT!',
      confirmText: 'CONFIRM DELETION',
    });
    if (!ok) return;
    try {
      await apiFetch(`/api/ReportQuestions/${id}`, { method: 'DELETE', tokenKey: 'superadmin_token' });
      loadData();
    } catch {
      /* error toasted by apiFetch */
    }
  };

  const toggleStatus = async (q: ReportQuestion) => {
    try {
      await apiFetch(`/api/ReportQuestions/${q.id}`, {
        method: 'PUT',
        tokenKey: 'superadmin_token',
        body: JSON.stringify({ status: !q.status }),
      });
      loadData();
    } catch {
      /* error toasted by apiFetch */
    }
  };

  const openEdit = (q: ReportQuestion) => {
    setEditingId(q.id);
    setForm({ question_text: q.question_text || '', type_data_id: String(q.type_data_id || '') });
    setShowModal(true);
  };

  const getTypeName = (id: number) => docTypes.find(d => d.id === id)?.name || '—';

  const filtered = questions.filter(q => !search || q.question_text?.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="page-content">
      <TopNav title="Test Report Questions">
        <input type="text" placeholder="Search questions..." value={search} onChange={e => setSearch(e.target.value)}
          style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, padding: '0.5rem 0.75rem', color: 'var(--text)', fontSize: '0.875rem', width: 240 }} />
        <button className="btn btn-primary" onClick={() => { setEditingId(null); setForm({ ...emptyForm }); setShowModal(true); }}>
          <MdAdd size={16} style={{ verticalAlign: 'text-bottom', marginRight: '0.35rem' }} aria-hidden />Add Question
        </button>
      </TopNav>

      <div style={{ padding: '1.5rem' }}>
        {showModal && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999 }}>
            <div className="card" style={{ width: '100%', maxWidth: 520, margin: '1rem' }}>
              <div className="card-header"><span className="card-title">{editingId ? <><MdEdit size={16} style={{ verticalAlign: 'text-bottom', marginRight: '0.35rem' }} aria-hidden />Edit</> : <><MdAdd size={16} style={{ verticalAlign: 'text-bottom', marginRight: '0.35rem' }} aria-hidden />Add</>} Test Report Question</span></div>
              <div className="card-body">
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
                  <button className="btn btn-primary" onClick={save} disabled={saving}>{saving ? <MdHourglassEmpty size={16} aria-hidden /> : <><MdSave size={16} aria-hidden /> Save</>}</button>
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
                        <button className="btn btn-ghost" style={{ fontSize: '0.75rem', padding: '0.25rem 0.75rem' }} onClick={() => openEdit(q)}><MdEdit size={14} style={{ verticalAlign: 'text-bottom', marginRight: '0.25rem' }} aria-hidden />Edit</button>
                        <button className="btn btn-ghost" style={{ fontSize: '0.75rem', padding: '0.25rem 0.75rem' }} onClick={() => toggleStatus(q)}>⚡ {q.status ? 'Disable' : 'Enable'}</button>
                        <button className="btn btn-ghost" style={{ fontSize: '0.75rem', padding: '0.25rem 0.75rem', color: '#ef4444' }} onClick={() => remove(q.id)}><MdDelete size={14} style={{ verticalAlign: 'text-bottom', marginRight: '0.25rem' }} aria-hidden />Delete</button>
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
