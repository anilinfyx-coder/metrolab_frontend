'use client';
import { useEffect, useState } from 'react';
import {
  MdEdit,
  MdHelpOutline,
  MdHourglassEmpty,
  MdListAlt,
  MdRefresh,
  MdSave,
  MdScience,
  MdVisibility,
} from 'react-icons/md';
import TopNav from '../../../components/TopNav';
import { useConfirm } from '../../../components/ConfirmModal';
import ViewLabTestForm from '../../../components/ViewLabTestForm';
import ListingTable, { ActionIcons, ListingColumn } from '../../../components/ListingTable';
import { apiFetch, getToken, toastApiError, toastApiSuccess } from '../../../../lib/api';

interface B2BUser {
  id?: number;
  name?: string;
}

interface LabTest {
  id: number;
  name: string;
  description?: string;
  default_view?: boolean;
  status?: boolean;
  /** Status from b2b_client_lab_test_access — per-B2B, does NOT touch lab_tests table */
  accessStatus?: boolean;
}

interface SpecimenType {
  id: number;
  name: string;
}

interface SpecimenTypeMapping {
  id: number;
  specimen_type_id: number;
  lab_test_id: number;
  specimen_type_name?: string;
  b2b_client_id?: number | null;
  status?: boolean;
}

interface ReportQuestion {
  id: number;
  question_text: string;
  answer_type: number;
  answer_option?: string;
  status?: boolean;
  b2b_client_id?: number | null;
}

interface ResultParam {
  id: number;
  name: string;
  label: string;
  placeholder: string;
  input_type: number;
  input_option?: string;
  unit_text?: string;
  screening_cutoff?: string;
  confirmation_cutoff?: string;
  description?: string;
  is_mandatory?: boolean;
  status?: boolean;
  b2b_client_id?: number | null;
}

type View = 'list' | 'form' | 'edit' | 'specimen' | 'question' | 'result';

const DISPLAY_CHECKBOX_FIELDS: [string, string][] = [
  ['show_collected_date', 'Show Collected Date'], ['show_collected_time', 'Show Collected Time'],
  ['show_received_date', 'Show Received Date'], ['show_received_time', 'Show Received Time'],
  ['show_reported_date', 'Show Reported Date'], ['show_reported_time', 'Show Reported Time'],
  ['show_regulation', 'Show Regulation'], ['show_specimen', 'Show Specimen Type'],
  ['show_final_result', 'Show Final Result'], ['show_test_remark', 'Show Test Remark'],
  ['show_final_remark', 'Show Final Remark'], ['show_final_result_disposition', 'Show Final Result Disposition'],
  ['show_expire_date', 'Show Expiry Date'], ['show_date_administered', 'Show Date Administered'],
  ['show_applied_to', 'Show Applied To'], ['show_lot', 'Show Lot'],
  ['show_test_date', 'Show Test Date'], ['show_test_time', 'Show Test Time'],
  ['show_test_performed_by', 'Show Test Perform By'], ['show_reason_for_test', 'Show Reason for Test'],
  ['show_report_status', 'Show Report Status'], ['show_fasting', 'Show Fasting'],
  ['show_requisition_no', 'Show Requisition No.'], ['show_device_identifier', 'Show Device Identifier'],
  ['show_date_read', 'Show Date Read'], ['show_mm_indurations', 'Show mm Indurations'],
  ['show_follow_up', 'Show Follow Up'],
];

const emptyDisplayForm: Record<string, string | boolean> = {
  name: '',
  description: '',
  cost: '',
  cpt_code: '',
  display_options_customized: false,
  ...Object.fromEntries(DISPLAY_CHECKBOX_FIELDS.map(([k]) => [k, false])),
};

const UNIT_OPTIONS = ['ng/mL', 'Quant', 'mg/dL', 'pg/mL', '%'];

const emptyResultForm = {
  name: '',
  placeholder: '',
  label: '',
  input_type: '2',
  input_option: '',
  unit_text: '',
  screening_cutoff: '',
  confirmation_cutoff: '',
  description: '',
  is_mandatory: false,
};

type ResultForm = typeof emptyResultForm;
type ResultField = keyof ResultForm;
type ResultErrors = Partial<Record<ResultField, string>>;

function getUser(): B2BUser {
  if (typeof window === 'undefined') return {};
  try {
    return JSON.parse(localStorage.getItem('b2b_user') || '{}') as B2BUser;
  } catch {
    return {};
  }
}

function isGlobalRecord(b2bClientId?: number | null) {
  return b2bClientId == null;
}

function answerTypeLabel(type: number) {
  return ({ 1: 'Yes - No', 2: 'CheckBox', 3: 'Integer', 4: 'Alphabet', 5: 'Dropdown' } as Record<number, string>)[type] || '—';
}

function inputTypeLabel(type: number) {
  return ({ 1: 'Textbox (Numeric)', 2: 'Dropdown' } as Record<number, string>)[type] || '—';
}

export default function AssignedTestCategoryPage() {
  const confirmDialog = useConfirm();
  const [categories, setCategories] = useState<LabTest[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<View>('list');
  const [selectedTest, setSelectedTest] = useState<LabTest | null>(null);
  const [viewTestId, setViewTestId] = useState<number | null>(null);
  const [viewTestName, setViewTestName] = useState('');
  const [editForm, setEditForm] = useState<Record<string, string | boolean>>({ ...emptyDisplayForm });
  const [savingEdit, setSavingEdit] = useState(false);
  const [editLoading, setEditLoading] = useState(false);

  const [specimenTypes, setSpecimenTypes] = useState<SpecimenType[]>([]);
  const [specimenMappings, setSpecimenMappings] = useState<SpecimenTypeMapping[]>([]);
  const [specimenForm, setSpecimenForm] = useState({ specimen_type_id: '' });
  const [editingSpecimenId, setEditingSpecimenId] = useState<number | null>(null);
  const [specimenError, setSpecimenError] = useState('');

  const [questions, setQuestions] = useState<ReportQuestion[]>([]);
  const [questionForm, setQuestionForm] = useState({ question_text: '', answer_type: '1', answer_option: '' });
  const [editingQId, setEditingQId] = useState<number | null>(null);

  const [resultParams, setResultParams] = useState<ResultParam[]>([]);
  const [resultForm, setResultForm] = useState({ ...emptyResultForm });
  const [resultErrors, setResultErrors] = useState<ResultErrors>({});
  const [editingRId, setEditingRId] = useState<number | null>(null);
  const [savingResult, setSavingResult] = useState(false);

  const b2bId = getUser().id;

  const loadData = async () => {
    setLoading(true);
    try {
      const allTests = await apiFetch<LabTest[]>('/api/LabTests?status=true', {
        tokenKey: 'b2b_token',
        errorFallback: 'Unable to load lab tests.',
      });
      let access: { lab_test_id: number; status?: boolean }[] = [];
      if (b2bId) {
        try {
          access = await apiFetch<{ lab_test_id: number; status?: boolean }[]>(
            `/api/B2bClientLabTestAccess?b2b_client_id=${b2bId}`,
            { tokenKey: 'b2b_token', errorFallback: 'Unable to load test access.' },
          );
        } catch {
          access = [];
        }
      }
      // Build a map of lab_test_id → access.status (from b2b_client_lab_test_access)
      const accessStatusMap = new Map(access.map(a => [Number(a.lab_test_id), a.status]));
      const accessIds = new Set(access.map(a => Number(a.lab_test_id)));
      const list = accessIds.size > 0
        ? (allTests || []).filter(t => accessIds.has(Number(t.id))).map(t => ({
          ...t,
          accessStatus: accessStatusMap.get(Number(t.id)) !== false,
        }))
        : (allTests || []).map(t => ({ ...t, accessStatus: true }));
      setCategories(list);
    } catch {
      setCategories([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, []);

  const openView = (test: LabTest) => {
    setViewTestId(test.id);
    setViewTestName(test.name || 'View Form');
    setView('form');
  };

  const closeView = () => {
    setView('list');
    setViewTestId(null);
    setViewTestName('');
  };

  const openEdit = async (test: LabTest) => {
    if (!b2bId) {
      toastApiError('B2B client not found. Please log in again.');
      return;
    }
    setSelectedTest(test);
    setEditLoading(true);
    setView('edit');
    try {
      const data = await apiFetch<Record<string, string | boolean | number | null>>(
        `/api/B2bClientLabTestAccess/display-options?b2b_client_id=${b2bId}&lab_test_id=${test.id}`,
        { tokenKey: 'b2b_token', errorFallback: 'Unable to load display options.' },
      );
      const nextForm: Record<string, string | boolean> = { ...emptyDisplayForm };
      for (const [key] of DISPLAY_CHECKBOX_FIELDS) {
        nextForm[key] = !!data?.[key];
      }
      nextForm.name = String(data?.name || test.name || '');
      nextForm.description = String(data?.description || test.description || '');
      nextForm.cost = data?.cost != null ? String(data.cost) : '';
      nextForm.cpt_code = String(data?.cpt_code || '');
      nextForm.display_options_customized = !!data?.display_options_customized;
      setEditForm(nextForm);
    } catch {
      setEditForm({
        ...emptyDisplayForm,
        name: test.name || '',
        description: test.description || '',
      });
    } finally {
      setEditLoading(false);
    }
  };

  const saveEdit = async () => {
    if (!b2bId || !selectedTest) return;
    setSavingEdit(true);
    try {
      const payload: Record<string, string | boolean | number> = {
        b2b_client_id: b2bId,
        lab_test_id: selectedTest.id,
      };
      for (const [key] of DISPLAY_CHECKBOX_FIELDS) {
        payload[key] = !!editForm[key];
      }
      await apiFetch('/api/B2bClientLabTestAccess/display-options', {
        method: 'PUT',
        tokenKey: 'b2b_token',
        body: JSON.stringify(payload),
        successMessage: 'Report display options saved successfully.',
        errorFallback: 'Unable to save display options.',
      });
      setView('list');
      setSelectedTest(null);
      setEditForm({ ...emptyDisplayForm });
    } catch {
      /* toast handled */
    } finally {
      setSavingEdit(false);
    }
  };

  const openSpecimen = async (test: LabTest) => {
    setSelectedTest(test);
    try {
      const query = b2bId
        ? `?lab_test_id=${test.id}&b2b_client_id=${b2bId}`
        : `?lab_test_id=${test.id}`;
      const [allSpecimens, mappings] = await Promise.all([
        apiFetch<SpecimenType[]>('/api/SpecimenType', { tokenKey: 'b2b_token' }),
        apiFetch<SpecimenTypeMapping[]>(`/api/SpecimenTypeDrugLinking${query}`, { tokenKey: 'b2b_token' }),
      ]);
      setSpecimenTypes(allSpecimens || []);
      setSpecimenMappings(mappings || []);
    } catch {
      setSpecimenTypes([]);
      setSpecimenMappings([]);
    }
    setSpecimenForm({ specimen_type_id: '' });
    setEditingSpecimenId(null);
    setSpecimenError('');
    setView('specimen');
  };

  const saveSpecimen = async () => {
    if (!specimenForm.specimen_type_id) {
      setSpecimenError('Please select a specimen type.');
      return;
    }
    try {
      await apiFetch(`/api/SpecimenTypeDrugLinking${editingSpecimenId ? `/${editingSpecimenId}` : ''}`, {
        method: editingSpecimenId ? 'PUT' : 'POST',
        tokenKey: 'b2b_token',
        body: JSON.stringify({
          lab_test_id: selectedTest?.id,
          specimen_type_id: specimenForm.specimen_type_id,
          ...(editingSpecimenId ? {} : { b2b_client_id: b2bId }),
        }),
        successMessage: `Specimen type ${editingSpecimenId ? 'updated' : 'linked'} successfully.`,
        errorFallback: 'Unable to save specimen type link.',
      });
      if (selectedTest) await openSpecimen(selectedTest);
    } catch {
      /* toast handled */
    }
  };

  const openQuestions = async (test: LabTest) => {
    setSelectedTest(test);
    try {
      const query = b2bId
        ? `?lab_test_id=${test.id}&b2b_client_id=${b2bId}`
        : `?lab_test_id=${test.id}`;
      const data = await apiFetch<ReportQuestion[]>(`/api/ReportQuestions${query}`, { tokenKey: 'b2b_token' });
      setQuestions(data || []);
    } catch {
      setQuestions([]);
    }
    setQuestionForm({ question_text: '', answer_type: '1', answer_option: '' });
    setEditingQId(null);
    setView('question');
  };

  const saveQuestion = async () => {
    if (!questionForm.question_text.trim()) {
      toastApiError('Question text is required.');
      return;
    }
    const method = editingQId ? 'PUT' : 'POST';
    const path = `/api/ReportQuestions${editingQId ? `/${editingQId}` : ''}`;
    try {
      await apiFetch(path, {
        method,
        tokenKey: 'b2b_token',
        body: JSON.stringify({
          ...questionForm,
          answer_type: Number(questionForm.answer_type),
          lab_test_id: selectedTest?.id,
          ...(editingQId ? {} : { b2b_client_id: b2bId }),
        }),
        successMessage: `Question ${editingQId ? 'updated' : 'added'} successfully.`,
        errorFallback: 'Unable to save question.',
      });
      setQuestionForm({ question_text: '', answer_type: '1', answer_option: '' });
      setEditingQId(null);
      if (selectedTest) await openQuestions(selectedTest);
    } catch {
      /* toast handled */
    }
  };

  const deleteQuestion = async (id: number) => {
    const ok = await confirmDialog({
      title: 'You are trying to delete Question, Please confirm',
      message: 'This cannot be restored once deleted.',
      cancelText: 'NO, WAIT!',
      confirmText: 'CONFIRM DELETION',
    });
    if (!ok) return;
    try {
      await apiFetch(`/api/ReportQuestions/${id}`, { method: 'DELETE', tokenKey: 'b2b_token' });
      if (selectedTest) await openQuestions(selectedTest);
    } catch {
      /* toast handled */
    }
  };

  const toggleQuestionStatus = async (question: ReportQuestion) => {
    try {
      await apiFetch(`/api/ReportQuestions/${question.id}`, {
        method: 'PUT',
        tokenKey: 'b2b_token',
        body: JSON.stringify({ status: question.status === false }),
      });
      if (selectedTest) await openQuestions(selectedTest);
    } catch {
      /* toast handled */
    }
  };

  const openResultParams = async (test: LabTest) => {
    setSelectedTest(test);
    try {
      const query = b2bId
        ? `?lab_test_id=${test.id}&b2b_client_id=${b2bId}`
        : `?lab_test_id=${test.id}`;
      const data = await apiFetch<ResultParam[]>(`/api/ReportRequestParameters${query}`, { tokenKey: 'b2b_token' });
      setResultParams(data || []);
    } catch {
      setResultParams([]);
    }
    setResultForm({ ...emptyResultForm });
    setResultErrors({});
    setEditingRId(null);
    setView('result');
  };

  const refreshResultParams = async (successText?: string) => {
    if (!selectedTest) return;
    try {
      const query = b2bId
        ? `?lab_test_id=${selectedTest.id}&b2b_client_id=${b2bId}`
        : `?lab_test_id=${selectedTest.id}`;
      const data = await apiFetch<ResultParam[]>(`/api/ReportRequestParameters${query}`, { tokenKey: 'b2b_token' });
      setResultParams(data || []);
      if (successText) toastApiSuccess(successText);
    } catch {
      /* toast handled */
    }
  };

  const saveResult = async () => {
    const errors: ResultErrors = {};
    if (!resultForm.name.trim()) errors.name = 'Please enter the parameter name.';
    if (!resultForm.placeholder.trim()) errors.placeholder = 'Please enter placeholder text.';
    if (!resultForm.label.trim()) errors.label = 'Please enter the field label.';
    if (!['1', '2'].includes(resultForm.input_type)) errors.input_type = 'Please select a valid input type.';
    if (resultForm.input_type === '2') {
      const options = resultForm.input_option.split(',').map(v => v.trim());
      if (!resultForm.input_option.trim()) errors.input_option = 'Please enter at least one dropdown value.';
      else if (options.some(v => !v)) errors.input_option = 'Dropdown values must be comma separated without empty values.';
    }
    if (!resultForm.unit_text.trim()) errors.unit_text = 'Please select or enter a unit.';
    if (!resultForm.screening_cutoff.trim()) errors.screening_cutoff = 'Please enter the screening cutoff.';
    if (!resultForm.confirmation_cutoff.trim()) errors.confirmation_cutoff = 'Please enter the confirmation cutoff.';
    if (!resultForm.is_mandatory) errors.is_mandatory = 'Please check Is Mandatory. This field is required.';

    setResultErrors(errors);
    if (Object.keys(errors).length > 0) {
      toastApiError('Please correct the highlighted fields before saving.');
      return;
    }

    setSavingResult(true);
    const method = editingRId ? 'PUT' : 'POST';
    const path = `/api/ReportRequestParameters${editingRId ? `/${editingRId}` : ''}`;
    try {
      await apiFetch(path, {
        method,
        tokenKey: 'b2b_token',
        body: JSON.stringify({
          ...resultForm,
          input_option: resultForm.input_type === '2' ? resultForm.input_option.trim() : '',
          input_type: Number(resultForm.input_type),
          lab_test_id: selectedTest?.id,
          is_mandatory: true,
          status: true,
          ...(editingRId ? {} : { b2b_client_id: b2bId }),
        }),
        errorFallback: 'Unable to save the parameter.',
      });
      setResultForm({ ...emptyResultForm });
      setResultErrors({});
      setEditingRId(null);
      await refreshResultParams(`Parameter ${editingRId ? 'updated' : 'saved'} successfully.`);
    } catch {
      /* toast handled */
    } finally {
      setSavingResult(false);
    }
  };

  const deleteResult = async (id: number) => {
    const ok = await confirmDialog({
      title: 'You are trying to delete Parameter, Please confirm',
      message: 'This cannot be restored once deleted.',
      cancelText: 'NO, WAIT!',
      confirmText: 'CONFIRM DELETION',
    });
    if (!ok) return;
    try {
      await apiFetch(`/api/ReportRequestParameters/${id}`, { method: 'DELETE', tokenKey: 'b2b_token' });
      await refreshResultParams('Parameter deleted successfully.');
    } catch {
      /* toast handled */
    }
  };

  const toggleResultStatus = async (row: ResultParam) => {
    try {
      await apiFetch(`/api/ReportRequestParameters/${row.id}`, {
        method: 'PUT',
        tokenKey: 'b2b_token',
        body: JSON.stringify({ status: !row.status }),
      });
      await refreshResultParams();
    } catch {
      /* toast handled */
    }
  };

  const loadResultFormFromRow = (row: ResultParam) => {
    setResultForm({
      name: row.name || '',
      placeholder: row.placeholder || '',
      label: row.label || '',
      input_type: String(row.input_type || 2),
      input_option: row.input_option || '',
      unit_text: row.unit_text || '',
      screening_cutoff: row.screening_cutoff || '',
      confirmation_cutoff: row.confirmation_cutoff || '',
      description: row.description || '',
      is_mandatory: !!row.is_mandatory,
    });
    setResultErrors({});
    setEditingRId(row.id);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const globalAction = (record: { b2b_client_id?: number | null }) => (
    isGlobalRecord(record.b2b_client_id) ? (
      <span title="Global configuration (read-only)" style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600 }}>
        🔒 Global
      </span>
    ) : null
  );

  if (view === 'edit' && selectedTest) {
    return (
      <div className="page-content">
        <TopNav title="Manage Assign Test Categories" />
        <div style={{ padding: '1.5rem' }}>
          <div className="card">
            <div
              className="card-header"
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem' }}
            >
              <span className="card-title">
                <MdEdit size={16} style={{ verticalAlign: 'text-bottom', marginRight: '0.35rem' }} aria-hidden />
                Edit Report Display Options — {selectedTest.name}
              </span>
              <button type="button" className="listing-header-link" onClick={() => { setView('list'); setSelectedTest(null); }}>
                Close
              </button>
            </div>
            <div className="card-body">
              {editLoading ? (
                <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>Loading...</div>
              ) : (
                <>
                  <p style={{ margin: '0 0 1rem', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                    {editForm.display_options_customized
                      ? 'You are using your own report display settings for this test category.'
                      : 'Showing superadmin defaults. Save any change to apply your own settings for reports under your lab.'}
                  </p>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
                    <div className="form-group" style={{ gridColumn: 'span 3' }}>
                      <label>Name</label>
                      <input type="text" disabled value={editForm.name as string} />
                    </div>
                    <div className="form-group" style={{ gridColumn: 'span 3' }}>
                      <label>Description</label>
                      <textarea rows={3} disabled value={editForm.description as string}
                        style={{ width: '100%', background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: 6, padding: '0.5rem', color: 'var(--text)', resize: 'vertical' }} />
                    </div>
                    <div className="form-group">
                      <label>Cost ($)</label>
                      <input type="text" disabled value={editForm.cost as string} />
                    </div>
                    <div className="form-group">
                      <label>CPT Code</label>
                      <input type="text" disabled value={editForm.cpt_code as string} />
                    </div>
                  </div>

                  <div style={{ marginBottom: '1.5rem' }}>
                    <label style={{ fontWeight: 600, display: 'block', marginBottom: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontSize: '0.75rem', letterSpacing: '0.05em' }}>
                      Report Display Options
                    </label>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem' }}>
                      {DISPLAY_CHECKBOX_FIELDS.map(([k, l]) => (
                        <label key={k} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', cursor: 'pointer' }}>
                          <input
                            type="checkbox"
                            checked={!!editForm[k]}
                            onChange={e => setEditForm(p => ({ ...p, [k]: e.target.checked }))}
                            style={{ width: 16, height: 16, accentColor: '#6366f1' }}
                          />
                          {l}
                        </label>
                      ))}
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '0.75rem' }}>
                    <button className="btn btn-primary" onClick={saveEdit} disabled={savingEdit}>
                      {savingEdit ? <><MdHourglassEmpty size={16} aria-hidden /> Saving...</> : <><MdSave size={16} aria-hidden /> Save</>}
                    </button>
                    <button className="btn btn-ghost" onClick={() => openEdit(selectedTest)} disabled={savingEdit}>
                      <MdRefresh size={16} style={{ verticalAlign: 'text-bottom', marginRight: '0.35rem' }} aria-hidden />
                      Reset
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (view === 'form' && viewTestId != null) {
    return (
      <div className="page-content" style={{ paddingTop: 0 }}>
        <TopNav title="Manage Assign Test Categories" />
        <div className="page-body">
          <div className="card">
            <div className="listing-card-header">
              <h2 className="listing-card-title">
                <MdVisibility size={18} style={{ verticalAlign: 'text-bottom', marginRight: '0.35rem' }} aria-hidden />
                View Form — {viewTestName}
              </h2>
              <button type="button" className="listing-header-link" onClick={closeView}>Close</button>
            </div>
            <div className="card-body">
              <ViewLabTestForm
                labTestId={viewTestId}
                token={getToken('b2b_token')}
                b2bClientId={b2bId}
              />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (view === 'specimen' && selectedTest) {
    const specimenColumns: ListingColumn<SpecimenTypeMapping>[] = [
      { key: 'specimen_type_name', label: 'Specimen Type', width: '70%', getValue: m => m.specimen_type_name || String(m.specimen_type_id) },
    ];

    return (
      <div className="page-content">
        <TopNav title="Manage Assign Test Categories" />
        <div className="labtest-specimen-split" style={{ padding: '1.5rem' }}>
          <div className="card">
            <div className="card-header"><span className="card-title">Specimen Type Detail</span></div>
            <div className="card-body">
              <div className="form-group">
                <label>Specimen Type <span style={{ color: '#ef4444' }}>*</span></label>
                <select
                  value={specimenForm.specimen_type_id}
                  onChange={e => {
                    setSpecimenForm({ specimen_type_id: e.target.value });
                    if (specimenError) setSpecimenError('');
                  }}
                  style={{
                    width: '100%',
                    background: 'var(--bg-input)',
                    border: `1px solid ${specimenError ? '#ef4444' : 'var(--border)'}`,
                    borderRadius: 6,
                    padding: '0.5rem',
                    color: 'var(--text)',
                  }}
                >
                  <option value="">Select Specimen Type</option>
                  {specimenTypes.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
                {specimenError && <div role="alert" style={{ color: '#ef4444', fontSize: '0.78rem', marginTop: '0.35rem' }}>{specimenError}</div>}
              </div>
            </div>
            <div className="labtest-specimen-form-actions">
              <button className="btn btn-primary" onClick={saveSpecimen}>Save</button>
              <button type="button" className="btn btn-ghost" onClick={() => { setSpecimenForm({ specimen_type_id: '' }); setEditingSpecimenId(null); setSpecimenError(''); }}>Reset Data</button>
            </div>
          </div>

          <ListingTable
            title={`List of Link Specimen Types for ("${selectedTest.name}")`}
            columns={specimenColumns}
            rows={specimenMappings}
            emptyText="No specimen types linked."
            headerActions={<button type="button" className="listing-header-link" onClick={() => setView('list')}>Close</button>}
            actionsLabel="Actions"
            actionsWidth={150}
            defaultPageSize={10}
            rowActions={mapping => (
              isGlobalRecord(mapping.b2b_client_id) ? globalAction(mapping) : (
                <ActionIcons
                  onEdit={() => { setEditingSpecimenId(mapping.id); setSpecimenForm({ specimen_type_id: String(mapping.specimen_type_id) }); setSpecimenError(''); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                  onToggleStatus={async () => {
                    await apiFetch(`/api/SpecimenTypeDrugLinking/${mapping.id}`, { method: 'PUT', tokenKey: 'b2b_token', body: JSON.stringify({ status: mapping.status === false }) });
                    await openSpecimen(selectedTest);
                  }}
                  onDelete={async () => {
                    const ok = await confirmDialog({ title: 'Delete specimen type link?', message: 'This cannot be restored once deleted.', cancelText: 'Cancel', confirmText: 'Delete' });
                    if (!ok) return;
                    await apiFetch(`/api/SpecimenTypeDrugLinking/${mapping.id}`, { method: 'DELETE', tokenKey: 'b2b_token' });
                    await openSpecimen(selectedTest);
                  }}
                  statusActive={mapping.status !== false}
                />
              )
            )}
          />
        </div>
      </div>
    );
  }

  if (view === 'question' && selectedTest) {
    const questionColumns: ListingColumn<ReportQuestion>[] = [
      { key: 'question_text', label: 'Questions', width: '48%', getValue: q => q.question_text || '' },
      { key: 'answer_type', label: 'Answer Type', width: '32%', getValue: q => answerTypeLabel(q.answer_type), render: q => answerTypeLabel(q.answer_type) },
    ];

    return (
      <div className="page-content">
        <TopNav title="Manage Assign Test Categories" />
        <div className="labtest-question-split" style={{ padding: '1.5rem' }}>
          <div className="card">
            <div className="card-header"><span className="card-title">Test Report Question Detail</span></div>
            <div className="card-body">
              <div className="form-group">
                <label>Question <span style={{ color: '#ef4444' }}>*</span></label>
                <textarea rows={3} placeholder="Enter Question" value={questionForm.question_text}
                  onChange={e => setQuestionForm(p => ({ ...p, question_text: e.target.value }))}
                  style={{ width: '100%', background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: 6, padding: '0.5rem', color: 'var(--text)' }} />
              </div>
              <div className="form-group">
                <label>Answer Type <span style={{ color: '#ef4444' }}>*</span></label>
                <select value={questionForm.answer_type} onChange={e => setQuestionForm(p => ({ ...p, answer_type: e.target.value }))}
                  style={{ width: '100%', background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: 6, padding: '0.5rem', color: 'var(--text)' }}>
                  <option value="1">Yes - No</option><option value="2">CheckBox</option>
                  <option value="3">Integer</option><option value="4">Alphabet</option><option value="5">Dropdown</option>
                </select>
              </div>
              {questionForm.answer_type === '5' && (
                <div className="form-group">
                  <label>Dropdown Values (Comma Separated)</label>
                  <input type="text" value={questionForm.answer_option} onChange={e => setQuestionForm(p => ({ ...p, answer_option: e.target.value }))} />
                </div>
              )}
            </div>
            <div className="labtest-question-form-actions">
              <button className="btn btn-primary" onClick={saveQuestion}>Save</button>
              <button type="button" className="btn btn-ghost" onClick={() => { setQuestionForm({ question_text: '', answer_type: '1', answer_option: '' }); setEditingQId(null); }}>Reset Data</button>
            </div>
          </div>

          <ListingTable
            title={`List of Test Report Questions for ("${selectedTest.name}")`}
            columns={questionColumns}
            rows={questions}
            emptyText="No questions found."
            headerActions={<button type="button" className="listing-header-link" onClick={() => setView('list')}>Close</button>}
            actionsLabel="Actions"
            actionsWidth={150}
            defaultPageSize={10}
            rowActions={question => (
              isGlobalRecord(question.b2b_client_id) ? globalAction(question) : (
                <ActionIcons
                  onEdit={() => { setQuestionForm({ question_text: question.question_text, answer_type: String(question.answer_type), answer_option: question.answer_option || '' }); setEditingQId(question.id); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                  onToggleStatus={() => toggleQuestionStatus(question)}
                  onDelete={() => deleteQuestion(question.id)}
                  statusActive={question.status !== false}
                />
              )
            )}
          />
        </div>
      </div>
    );
  }

  if (view === 'result' && selectedTest) {
    const fieldStyle = { width: '100%', background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: 6, padding: '0.5rem', color: 'var(--text)' };
    const updateResultField = <K extends ResultField>(field: K, value: ResultForm[K]) => {
      setResultForm(prev => ({ ...prev, [field]: value }));
      setResultErrors(prev => { if (!prev[field]) return prev; const next = { ...prev }; delete next[field]; return next; });
    };
    const resultFieldStyle = (field: ResultField) => ({ ...fieldStyle, borderColor: resultErrors[field] ? '#ef4444' : 'var(--border)' });
    const errorMessage = (field: ResultField) => resultErrors[field] ? <div role="alert" style={{ color: '#ef4444', fontSize: '0.78rem', marginTop: '0.35rem' }}>{resultErrors[field]}</div> : null;

    return (
      <div className="page-content">
        <TopNav title={`Manage Parameters — ${selectedTest.name}`} />
        <div className="manage-parameters-split" style={{ padding: '1.5rem' }}>
          <div className="card">
            <div className="card-header"><span className="card-title">Test Result Parameter Detail</span></div>
            <div className="card-body">
              <div className="form-group"><label>Name <span style={{ color: '#ef4444' }}>*</span></label><input type="text" value={resultForm.name} onChange={e => updateResultField('name', e.target.value)} style={resultFieldStyle('name')} />{errorMessage('name')}</div>
              <div className="form-group"><label>Placeholder <span style={{ color: '#ef4444' }}>*</span></label><input type="text" value={resultForm.placeholder} onChange={e => updateResultField('placeholder', e.target.value)} style={resultFieldStyle('placeholder')} />{errorMessage('placeholder')}</div>
              <div className="form-group"><label>Label <span style={{ color: '#ef4444' }}>*</span></label><input type="text" value={resultForm.label} onChange={e => updateResultField('label', e.target.value)} style={resultFieldStyle('label')} />{errorMessage('label')}</div>
              <div className="form-group"><label>Input Type</label><select value={resultForm.input_type} onChange={e => updateResultField('input_type', e.target.value)} style={resultFieldStyle('input_type')}><option value="1">Textbox (Numeric)</option><option value="2">Dropdown</option></select></div>
              {resultForm.input_type === '2' && <div className="form-group"><label>Dropdown Values <span style={{ color: '#ef4444' }}>*</span></label><input type="text" value={resultForm.input_option} onChange={e => updateResultField('input_option', e.target.value)} style={resultFieldStyle('input_option')} />{errorMessage('input_option')}</div>}
              <div className="form-group"><label>Unit Text <span style={{ color: '#ef4444' }}>*</span></label><select value={UNIT_OPTIONS.includes(resultForm.unit_text) ? resultForm.unit_text : ''} onChange={e => updateResultField('unit_text', e.target.value)} style={{ ...resultFieldStyle('unit_text'), marginBottom: '0.5rem' }}><option value="">Select Unit</option>{UNIT_OPTIONS.map(u => <option key={u} value={u}>{u}</option>)}</select><input type="text" value={resultForm.unit_text} onChange={e => updateResultField('unit_text', e.target.value)} style={resultFieldStyle('unit_text')} />{errorMessage('unit_text')}</div>
              <div className="form-group"><label>Screening Cutoff <span style={{ color: '#ef4444' }}>*</span></label><input type="text" value={resultForm.screening_cutoff} onChange={e => updateResultField('screening_cutoff', e.target.value)} style={resultFieldStyle('screening_cutoff')} />{errorMessage('screening_cutoff')}</div>
              <div className="form-group"><label>Confirmation Cutoff <span style={{ color: '#ef4444' }}>*</span></label><input type="text" value={resultForm.confirmation_cutoff} onChange={e => updateResultField('confirmation_cutoff', e.target.value)} style={resultFieldStyle('confirmation_cutoff')} />{errorMessage('confirmation_cutoff')}</div>
              <div className="form-group"><label>Description</label><textarea rows={3} value={resultForm.description} onChange={e => updateResultField('description', e.target.value)} style={{ ...fieldStyle, resize: 'vertical' }} /></div>
              <div className="form-group"><label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><input type="checkbox" checked={resultForm.is_mandatory} onChange={e => updateResultField('is_mandatory', e.target.checked)} />Is Mandatory <span style={{ color: '#ef4444' }}>*</span></label>{errorMessage('is_mandatory')}</div>
              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem' }}>
                <button className="btn btn-primary" onClick={saveResult} disabled={savingResult}>{savingResult ? <><MdHourglassEmpty size={16} aria-hidden /> Saving...</> : <><MdSave size={16} aria-hidden /> Save</>}</button>
                <button className="btn btn-ghost" onClick={() => { setResultForm({ ...emptyResultForm }); setResultErrors({}); setEditingRId(null); }} disabled={savingResult}><MdRefresh size={16} style={{ verticalAlign: 'text-bottom', marginRight: '0.35rem' }} aria-hidden />Reset</button>
              </div>
            </div>
          </div>

          <ListingTable
            title={`List of Result Parameters for "${selectedTest.name}"`}
            columns={[
              { key: 'name', label: 'Name', sortable: true, width: '22%', getValue: r => r.name || '' },
              { key: 'label', label: 'Label', sortable: true, width: '22%', getValue: r => r.label || '' },
              { key: 'input_type', label: 'Input Type', sortable: true, width: '22%', getValue: r => inputTypeLabel(r.input_type), render: r => inputTypeLabel(r.input_type) },
              { key: 'unit_text', label: 'Unit', sortable: true, width: '16%', getValue: r => r.unit_text || '—', render: r => r.unit_text || '—' },
            ]}
            rows={resultParams}
            emptyText="No parameters found."
            headerActions={<button type="button" className="listing-header-link" onClick={() => setView('list')}>Close</button>}
            actionsLabel="Actions"
            actionsWidth={130}
            defaultPageSize={10}
            rowActions={row => (
              isGlobalRecord(row.b2b_client_id) ? globalAction(row) : (
                <ActionIcons
                  onEdit={() => loadResultFormFromRow(row)}
                  onToggleStatus={() => toggleResultStatus(row)}
                  onDelete={() => deleteResult(row.id)}
                  statusActive={!!row.status}
                />
              )
            )}
          />
        </div>
      </div>
    );
  }

  const columns: ListingColumn<LabTest>[] = [
    { key: 'name', label: 'Name', sortable: true, width: '34%', getValue: t => t.name || '', render: t => <span style={{ fontWeight: 500 }}>{t.name}</span> },
    { key: 'description', label: 'Description', sortable: true, width: '28%', getValue: t => t.description || '—', render: t => t.description || '—' },
    {
      key: 'configurations',
      label: 'Configurations',
      sortable: false,
      filterable: false,
      width: '28%',
      render: test => (
        <div className="listing-actions">
          <button type="button" className="action-btn action-btn-view-eye" title="View Form" onClick={() => openView(test)}>
            <MdVisibility size={16} aria-hidden />
          </button>
          {!test.default_view && (
            <>
              <button type="button" className="action-btn action-btn-view" title="Specimen Types" onClick={() => openSpecimen(test)}>
                <MdScience size={15} aria-hidden />
              </button>
              <button type="button" className="action-btn action-btn-view" title="Result Parameters" onClick={() => openResultParams(test)}>
                <MdListAlt size={15} aria-hidden />
              </button>
              <button type="button" className="action-btn action-btn-download" title="Report Questions" onClick={() => openQuestions(test)}>
                <MdHelpOutline size={15} aria-hidden />
              </button>
            </>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="page-content" style={{ paddingTop: 0 }}>
      <TopNav title="Manage Assign Test Categories" />

      <div className="page-body">
        <ListingTable
          title="List of Assign Test Categories"
          columns={columns}
          rows={categories}
          loading={loading}
          emptyText="No assigned test categories found."
          actionsLabel="Actions"
          actionsWidth={150}
          rowActions={c => (
            <ActionIcons
              onEdit={!c.default_view ? () => openEdit(c) : undefined}
              editTitle="Edit Display Options"
              onToggleStatus={async () => {
                await apiFetch('/api/B2bClientLabTestAccess/status', {
                  method: 'PUT',
                  tokenKey: 'b2b_token',
                  body: JSON.stringify({
                    b2b_client_id: b2bId,
                    lab_test_id: c.id,
                    status: !c.accessStatus,
                  }),
                  successMessage: c.accessStatus ? 'Test disabled for your account.' : 'Test enabled for your account.',
                  errorFallback: 'Unable to update test status.',
                });
                await loadData();
              }}
              statusActive={c.accessStatus !== false}
            />
          )}
        />
      </div>
    </div>
  );
}
