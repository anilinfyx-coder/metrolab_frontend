'use client';
import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { MdAdd, MdDelete, MdEdit, MdHourglassEmpty, MdSave } from 'react-icons/md';
import TopNav from '../../../components/TopNav';
import PageLoader from '../../../components/PageLoader';
import { useConfirm } from '../../../components/ConfirmModal';
import { FormGroup } from '../../../components/FormField';
import { apiFetch } from '../../../../lib/api';
import { createInvalidHandler, fieldStyle, formResolver } from '../../../../lib/formHelpers';
import { testReportQuestionSchema, type TestReportQuestionFormValues } from '../../../../lib/schemas';

interface ReportQuestion { id: number; question_text: string; type_data_id: number; status: boolean; }
interface DocType { id: number; name: string; }

const emptyForm: TestReportQuestionFormValues = { question_text: '', type_data_id: '' };

export default function TestReportQuestionsPage() {
  const confirmDialog = useConfirm();
  const [questions, setQuestions] = useState<ReportQuestion[]>([]);
  const [docTypes, setDocTypes] = useState<DocType[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<TestReportQuestionFormValues>({
    resolver: formResolver<TestReportQuestionFormValues>(testReportQuestionSchema),
    defaultValues: emptyForm,
  });

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
      const data = await apiFetch<DocType[]>('/api/TypeData?status=true', { tokenKey: 'superadmin_token' });
      setDocTypes(data || []);
    } catch {
      setDocTypes([]);
    }
  };

  useEffect(() => { loadData(); loadDocTypes(); }, []);

  const save = handleSubmit(async values => {
    setSaving(true);
    const method = editingId ? 'PUT' : 'POST';
    const path = `/api/ReportQuestions${editingId ? `/${editingId}` : ''}`;
    try {
      await apiFetch(path, {
        method,
        tokenKey: 'superadmin_token',
        body: JSON.stringify({
          question_text: values.question_text.trim(),
          type_data_id: values.type_data_id || null,
        }),
        successMessage: `Question ${editingId ? 'updated' : 'added'} successfully.`,
        errorFallback: 'Error saving.',
      });
      reset(emptyForm);
      setEditingId(null);
      setShowModal(false);
      loadData();
    } catch {
      /* error toasted by apiFetch */
    } finally {
      setSaving(false);
    }
  }, createInvalidHandler<TestReportQuestionFormValues>());

  const remove = async (id: number) => {
    const ok = await confirmDialog({
      title: 'You are trying to delete Test Report Question, Please confirm',
      message: 'This cannot be restored once deleted.',
      cancelText: 'NO, WAIT!',
      confirmText: 'CONFIRM DELETION',
    });
    if (!ok) return;
    try {
      await apiFetch(`/api/ReportQuestions/${id}`, {
        method: 'DELETE',
        tokenKey: 'superadmin_token',
        successMessage: 'Question deleted successfully.',
        errorFallback: 'Unable to delete question.',
      });
      loadData();
    } catch {
      /* error toasted by apiFetch */
    }
  };

  const toggleStatus = async (q: ReportQuestion) => {
    const enabling = !q.status;
    const ok = await confirmDialog({
      title: enabling ? 'Enable Question?' : 'Disable Question?',
      message: enabling
        ? 'This report question will become active.'
        : 'This report question will become inactive. You can enable it again later.',
      cancelText: 'Cancel',
      confirmText: enabling ? 'Enable' : 'Disable',
    });
    if (!ok) return;
    try {
      await apiFetch(`/api/ReportQuestions/${q.id}`, {
        method: 'PUT',
        tokenKey: 'superadmin_token',
        body: JSON.stringify({ status: !q.status }),
        successMessage: 'Status Updated Successfully',
        errorFallback: 'Failed to update status.',
      });
      loadData();
    } catch {
      /* error toasted by apiFetch */
    }
  };

  const openEdit = (q: ReportQuestion) => {
    setEditingId(q.id);
    reset({ question_text: q.question_text || '', type_data_id: String(q.type_data_id || '') });
    setShowModal(true);
  };

  const openAdd = () => {
    setEditingId(null);
    reset(emptyForm);
    setShowModal(true);
  };

  const getTypeName = (id: number) => docTypes.find(d => d.id === id)?.name || '—';

  const filtered = questions.filter(q => !search || q.question_text?.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="page-content">
      <TopNav title="Test Report Questions">
        <input type="text" placeholder="Search questions..." value={search} onChange={e => setSearch(e.target.value)}
          style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, padding: '0.5rem 0.75rem', color: 'var(--text)', fontSize: '0.875rem', width: 240 }} />
        <button className="btn btn-primary" onClick={openAdd}>
          <MdAdd size={16} style={{ verticalAlign: 'text-bottom', marginRight: '0.35rem' }} aria-hidden />Add Question
        </button>
      </TopNav>

      <div style={{ padding: '1.5rem' }}>
        {showModal && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999 }}>
            <div className="card" style={{ width: '100%', maxWidth: 520, margin: '1rem' }}>
              <div className="card-header"><span className="card-title">{editingId ? <><MdEdit size={16} style={{ verticalAlign: 'text-bottom', marginRight: '0.35rem' }} aria-hidden />Edit</> : <><MdAdd size={16} style={{ verticalAlign: 'text-bottom', marginRight: '0.35rem' }} aria-hidden />Add</>} Test Report Question</span></div>
              <form onSubmit={save} noValidate>
                <div className="card-body">
                  <FormGroup label="Test Type" htmlFor="trq-type" error={errors.type_data_id?.message}>
                    <select
                      id="trq-type"
                      data-field="type_data_id"
                      style={fieldStyle(!!errors.type_data_id)}
                      {...register('type_data_id')}
                    >
                      <option value="">-- Select Test Type --</option>
                      {docTypes.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                    </select>
                  </FormGroup>

                  <FormGroup label="Question" htmlFor="trq-question" required error={errors.question_text?.message}>
                    <textarea
                      id="trq-question"
                      rows={4}
                      placeholder="Enter question text"
                      data-field="question_text"
                      aria-invalid={!!errors.question_text}
                      style={{ ...fieldStyle(!!errors.question_text), resize: 'vertical', fontFamily: 'inherit' }}
                      {...register('question_text')}
                    />
                  </FormGroup>

                  <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem' }}>
                    <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? <MdHourglassEmpty size={16} aria-hidden /> : <><MdSave size={16} aria-hidden /> Save</>}</button>
                    <button type="button" className="btn btn-ghost" onClick={() => setShowModal(false)}>Cancel</button>
                  </div>
                </div>
              </form>
            </div>
          </div>
        )}

        <div className="card">
          <div className="card-body" style={{ padding: 0 }}>
            {loading ? (
              <PageLoader message="Loading questions..." />
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
