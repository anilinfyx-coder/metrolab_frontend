'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import TopNav from '../../../../components/TopNav';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
function getToken() {
  return typeof window !== 'undefined' ? localStorage.getItem('admin_token') || '' : '';
}

type LabTestFlags = Record<string, boolean | string | number | null | undefined> & {
  name?: string;
};

type ParameterRow = {
  report_request_parameters_id: number;
  name?: string;
  label?: string;
  description?: string;
  placeholder?: string;
  input_type?: number;
  input_option?: string;
  unit_text?: string;
  screening_cutoff?: string;
  confirmation_cutoff?: string;
  value: string;
};

type QuestionRow = {
  report_question_id: number;
  question_text: string;
  description?: string;
  answer_type: number;
  answer_option?: string;
  value: string;
};

type Specimen = { id: number; name: string };

type FormState = {
  id: number;
  regulation: string;
  specimen_type_id: string;
  collected_date: string;
  collected_time: string;
  received_date: string;
  received_time: string;
  reported_date: string;
  reported_time: string;
  test_performed_by: string;
  reason_for_test: string;
  report_status: string;
  date_of_test: string;
  date_of_time: string;
  fasting: string;
  requisition_no: string;
  date_administered: string;
  applied_to_arm: string;
  lot: string;
  expiry_date: string;
  date_read: string;
  mm_indurations: string;
  follow_up: string;
  final_result: string;
  final_result_disposition: string;
  test_remark: string;
  final_remark: string;
  reference_range_note: string;
  clinical_significance_note: string;
  result_interpretation_note: string;
  device_identifier: string;
  testResultParameterList: ParameterRow[];
  testReportQuestionList: QuestionRow[];
};

function splitTimestamp(value?: string | null) {
  if (!value) return { date: '', time: '' };
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) {
    const [datePart, timePart] = String(value).split(/[T\s]/);
    return {
      date: datePart || '',
      time: timePart ? timePart.slice(0, 8) : '',
    };
  }
  const pad = (n: number) => String(n).padStart(2, '0');
  return {
    date: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`,
    time: `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`,
  };
}

function toDateInput(value?: string | null) {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value).slice(0, 10);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function formatCutoff(value?: string | null, unit?: string | null) {
  if (!value || value === 'Null' || value === 'null') return '—';
  const unitText = unit && unit !== 'Null' ? ` ${unit}` : '';
  return `${value}${unitText}`;
}

function paramLabel(p: ParameterRow) {
  return p.label || p.name || 'Parameter';
}

export default function EditTestReportPage() {
  const router = useRouter();
  const params = useParams();
  const id = Number(params?.id);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [labTest, setLabTest] = useState<LabTestFlags | null>(null);
  const [specimens, setSpecimens] = useState<Specimen[]>([]);
  const [locked, setLocked] = useState(false);
  const [form, setForm] = useState<FormState | null>(null);

  const goBack = () => router.push('/admin/dashboard/manageothertest');

  useEffect(() => {
    if (!id || Number.isNaN(id)) {
      setLoading(false);
      return;
    }

    setLoading(true);
    fetch(`${API}/api/LabTestCategoryReport/getLabTestCategoryReportDetails`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', token: getToken() },
      body: JSON.stringify({ id }),
    })
      .then((r) => r.json())
      .then((d) => {
        if (d.response_code !== '200') {
          setMsg({ type: 'error', text: String(d.obj || 'Failed to load report') });
          return;
        }
        const report = d.obj;
        const collected = splitTimestamp(report.collected_timestamp);
        const received = splitTimestamp(report.received_timestamp);
        const reported = splitTimestamp(report.reported_timestamp);

        setLabTest(report.labTest || null);
        setSpecimens(report.specimenTypeList || []);
        setLocked(!!report.status);
        setForm({
          id: report.id,
          regulation: report.regulation || 'Non-DOT',
          specimen_type_id: report.specimen_type_id ? String(report.specimen_type_id) : '',
          collected_date: collected.date,
          collected_time: collected.time,
          received_date: received.date,
          received_time: received.time,
          reported_date: reported.date,
          reported_time: reported.time,
          test_performed_by: report.test_performed_by || '',
          reason_for_test: report.reason_for_test || '',
          report_status: report.report_status || '',
          date_of_test: toDateInput(report.date_of_test),
          date_of_time: '',
          fasting: report.fasting || '1',
          requisition_no: report.requisition_no || '',
          date_administered: toDateInput(report.date_administered),
          applied_to_arm: report.applied_to_arm || 'Right Arm',
          lot: report.lot || '',
          expiry_date: toDateInput(report.expiry_date),
          date_read: toDateInput(report.date_read),
          mm_indurations: report.mm_indurations || '',
          follow_up: report.follow_up || 'None',
          final_result: report.final_result || '',
          final_result_disposition: report.final_result_disposition || '',
          test_remark: report.test_remark || '',
          final_remark: report.final_remark || '',
          reference_range_note: report.reference_range_note || '',
          clinical_significance_note: report.clinical_significance_note || '',
          result_interpretation_note: report.result_interpretation_note || '',
          device_identifier: report.device_identifier || '',
          testResultParameterList: (report.testResultParameterList || []).map((p: ParameterRow) => ({
            ...p,
            value: p.value || '',
          })),
          testReportQuestionList: (report.testReportQuestionList || []).map((q: QuestionRow) => ({
            ...q,
            value: q.value || '',
          })),
        });
      })
      .catch((err) => setMsg({ type: 'error', text: err.message || 'Failed to load report' }))
      .finally(() => setLoading(false));
  }, [id]);

  const setField = (key: keyof FormState, value: string) => {
    setForm((prev) => (prev ? { ...prev, [key]: value } : prev));
  };

  const setParamValue = (index: number, value: string) => {
    setForm((prev) => {
      if (!prev) return prev;
      const list = [...prev.testResultParameterList];
      list[index] = { ...list[index], value };
      return { ...prev, testResultParameterList: list };
    });
  };

  const setQuestionValue = (index: number, value: string) => {
    setForm((prev) => {
      if (!prev) return prev;
      const list = [...prev.testReportQuestionList];
      list[index] = { ...list[index], value };
      return { ...prev, testReportQuestionList: list };
    });
  };

  const save = async () => {
    if (!form) return;
    if (locked) {
      setMsg({ type: 'error', text: 'This report is locked and cannot be edited.' });
      return;
    }
    setSaving(true);
    setMsg(null);
    try {
      const res = await fetch(`${API}/api/LabTestCategoryReport/saveLabTestCategoryReport`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', token: getToken() },
        body: JSON.stringify(form),
      });
      const d = await res.json();
      if (d.response_code === '200') {
        setMsg({ type: 'success', text: 'Report updated successfully.' });
      } else {
        setMsg({ type: 'error', text: String(d.obj || 'Save failed') });
      }
    } catch (err: unknown) {
      setMsg({ type: 'error', text: err instanceof Error ? err.message : 'Save failed' });
    }
    setSaving(false);
  };

  if (!id || Number.isNaN(id)) {
    return (
      <div className="page-content" style={{ paddingTop: 0 }}>
        <TopNav title="Manage Test Reports" />
        <div style={{ padding: '1.5rem' }}>
          <p>Invalid report.</p>
          <button type="button" className="btn btn-primary" onClick={goBack}>Back</button>
        </div>
      </div>
    );
  }

  const show = (flag: string) => !!(labTest && labTest[flag]);

  return (
    <div className="page-content" style={{ paddingTop: 0 }}>
      <TopNav title="Manage Test Reports" />

      <div className="report-edit-page">
        {loading || !form || !labTest ? (
          <div className="report-edit-loading">Loading report...</div>
        ) : (
          <div className="card report-edit-card">
            <div className="report-edit-header">
              <h2 className="report-edit-title">{labTest.name || 'Test Report'}</h2>
              <button type="button" className="report-edit-close" onClick={goBack}>
                Close
              </button>
            </div>

            <div className="report-edit-body">
              {msg && (
                <div className={`report-edit-msg ${msg.type === 'success' ? 'ok' : 'err'}`}>
                  {msg.text}
                </div>
              )}

              {locked && (
                <div className="report-edit-msg err">
                  This report is locked. Unlock it from the list to edit.
                </div>
              )}

              <fieldset disabled={locked} className="report-edit-fieldset">
                <div className="wl-form-row wl-form-row-2">
                  {show('show_regulation') && (
                    <div className="form-group">
                      <label>Regulation:</label>
                      <select
                        className="form-input report-edit-input"
                        value={form.regulation}
                        onChange={(e) => setField('regulation', e.target.value)}
                      >
                        <option value="DOT">DOT</option>
                        <option value="Non-DOT">Non-DOT</option>
                      </select>
                    </div>
                  )}
                  {show('show_specimen') && (
                    <div className="form-group">
                      <label>Service and Specimen type:</label>
                      <select
                        className="form-input report-edit-input"
                        value={form.specimen_type_id}
                        onChange={(e) => setField('specimen_type_id', e.target.value)}
                      >
                        <option value="">Select Specimen Type</option>
                        {specimens.map((s) => (
                          <option key={s.id} value={s.id}>{s.name}</option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>

                <div className="wl-form-row wl-form-row-6">
                  {show('show_collected_date') && (
                    <div className="form-group">
                      <label>Collected Date:</label>
                      <input
                        type="date"
                        className="form-input report-edit-input"
                        value={form.collected_date}
                        onChange={(e) => setField('collected_date', e.target.value)}
                      />
                    </div>
                  )}
                  {show('show_collected_time') && (
                    <div className="form-group">
                      <label>Collected Time:</label>
                      <input
                        type="time"
                        step="1"
                        className="form-input report-edit-input"
                        value={form.collected_time}
                        onChange={(e) => setField('collected_time', e.target.value)}
                      />
                    </div>
                  )}
                  {show('show_received_date') && (
                    <div className="form-group">
                      <label>Received Date:</label>
                      <input
                        type="date"
                        className="form-input report-edit-input"
                        value={form.received_date}
                        onChange={(e) => setField('received_date', e.target.value)}
                      />
                    </div>
                  )}
                  {show('show_received_time') && (
                    <div className="form-group">
                      <label>Received Time:</label>
                      <input
                        type="time"
                        step="1"
                        className="form-input report-edit-input"
                        value={form.received_time}
                        onChange={(e) => setField('received_time', e.target.value)}
                      />
                    </div>
                  )}
                  {show('show_reported_date') && (
                    <div className="form-group">
                      <label>Reported Date:</label>
                      <input
                        type="date"
                        className="form-input report-edit-input"
                        value={form.reported_date}
                        onChange={(e) => setField('reported_date', e.target.value)}
                      />
                    </div>
                  )}
                  {show('show_reported_time') && (
                    <div className="form-group">
                      <label>Reported Time:</label>
                      <input
                        type="time"
                        step="1"
                        className="form-input report-edit-input"
                        value={form.reported_time}
                        onChange={(e) => setField('reported_time', e.target.value)}
                      />
                    </div>
                  )}
                </div>

                <div className="wl-form-row wl-form-row-2">
                  {show('show_test_performed_by') && (
                    <div className="form-group">
                      <label>Test Performed By:</label>
                      <input
                        type="text"
                        className="form-input report-edit-input"
                        placeholder="Enter Test Performed By"
                        value={form.test_performed_by}
                        onChange={(e) => setField('test_performed_by', e.target.value)}
                      />
                    </div>
                  )}
                  <div className="form-group">
                    <label>Reason for Test:</label>
                    <input
                      type="text"
                      className="form-input report-edit-input"
                      placeholder="Enter Reason For Test"
                      value={form.reason_for_test}
                      onChange={(e) => setField('reason_for_test', e.target.value)}
                    />
                  </div>
                </div>

                {show('show_report_status') && (
                  <div className="wl-form-row wl-form-row-1">
                    <div className="form-group wl-form-group-narrow">
                      <label>Report Status:</label>
                      <input
                        type="text"
                        className="form-input report-edit-input"
                        placeholder="Enter Report Status"
                        value={form.report_status}
                        onChange={(e) => setField('report_status', e.target.value)}
                      />
                    </div>
                  </div>
                )}

                {form.testResultParameterList.length > 0 && (
                  <div className="report-param-table-wrap">
                    <table className="report-param-table">
                      <thead>
                        <tr>
                          <th>Parameter Name</th>
                          <th>Result</th>
                          <th>Screening Cut Off</th>
                          <th>Confirmation Cut Off</th>
                        </tr>
                      </thead>
                      <tbody>
                        {form.testResultParameterList.map((p, i) => (
                          <tr key={p.report_request_parameters_id || i}>
                            <td>
                              <div className="report-param-name">{paramLabel(p)}</div>
                              {p.description && (
                                <div className="report-param-desc">{p.description}</div>
                              )}
                            </td>
                            <td>
                              {p.input_type === 2 ? (
                                <select
                                  className="form-input report-edit-input"
                                  value={p.value}
                                  onChange={(e) => setParamValue(i, e.target.value)}
                                >
                                  <option value="">Select</option>
                                  {p.input_option?.split(',').map((opt) => opt.trim()).filter(Boolean).map((opt) => (
                                    <option key={opt} value={opt}>{opt}</option>
                                  ))}
                                </select>
                              ) : (
                                <input
                                  type="text"
                                  className="form-input report-edit-input"
                                  placeholder={p.placeholder || ''}
                                  value={p.value}
                                  onChange={(e) => setParamValue(i, e.target.value)}
                                />
                              )}
                            </td>
                            <td>{formatCutoff(p.screening_cutoff, p.unit_text)}</td>
                            <td>{formatCutoff(p.confirmation_cutoff, p.unit_text)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {form.testReportQuestionList.length > 0 && (
                  <div className="wl-questions-block">
                    <h4>Please answer the following</h4>
                    {form.testReportQuestionList.map((q, i) => (
                      <div key={q.report_question_id} className="wl-question-row">
                        <span>{i + 1}. {q.question_text}</span>
                        <div className="wl-question-input">
                          {q.answer_type === 1 ? (
                            <select
                              className="form-input report-edit-input"
                              value={q.value}
                              onChange={(e) => setQuestionValue(i, e.target.value)}
                            >
                              <option value="Yes">Yes</option>
                              <option value="No">No</option>
                            </select>
                          ) : q.answer_type === 2 ? (
                            <select
                              className="form-input report-edit-input"
                              value={q.value}
                              onChange={(e) => setQuestionValue(i, e.target.value)}
                            >
                              <option value="">Select Option</option>
                              {q.answer_option?.split(',').map((opt) => opt.trim()).filter(Boolean).map((opt) => (
                                <option key={opt} value={opt}>{opt}</option>
                              ))}
                              {(!q.answer_option || !q.answer_option.trim()) && (
                                <>
                                  <option value="Yes">Yes</option>
                                  <option value="No">No</option>
                                </>
                              )}
                            </select>
                          ) : (
                            <input
                              type="text"
                              className="form-input report-edit-input"
                              value={q.value}
                              onChange={(e) => setQuestionValue(i, e.target.value)}
                            />
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <div className="wl-form-row wl-form-row-3">
                  {show('show_test_date') && (
                    <div className="form-group">
                      <label>Date of Test:</label>
                      <input type="date" className="form-input report-edit-input" value={form.date_of_test} onChange={(e) => setField('date_of_test', e.target.value)} />
                    </div>
                  )}
                  {show('show_test_time') && (
                    <div className="form-group">
                      <label>Time of Test:</label>
                      <input type="time" className="form-input report-edit-input" value={form.date_of_time} onChange={(e) => setField('date_of_time', e.target.value)} />
                    </div>
                  )}
                  {show('show_fasting') && (
                    <div className="form-group">
                      <label>Fasting:</label>
                      <select className="form-input report-edit-input" value={form.fasting} onChange={(e) => setField('fasting', e.target.value)}>
                        <option value="1">Yes</option>
                        <option value="2">No</option>
                      </select>
                    </div>
                  )}
                  {show('show_requisition_no') && (
                    <div className="form-group">
                      <label>Requisition No:</label>
                      <input type="text" className="form-input report-edit-input" value={form.requisition_no} onChange={(e) => setField('requisition_no', e.target.value)} />
                    </div>
                  )}
                  {show('show_date_administered') && (
                    <div className="form-group">
                      <label>Date Administered:</label>
                      <input type="date" className="form-input report-edit-input" value={form.date_administered} onChange={(e) => setField('date_administered', e.target.value)} />
                    </div>
                  )}
                  {show('show_applied_to') && (
                    <div className="form-group">
                      <label>Applied To:</label>
                      <select className="form-input report-edit-input" value={form.applied_to_arm} onChange={(e) => setField('applied_to_arm', e.target.value)}>
                        <option>Right Arm</option>
                        <option>Left Arm</option>
                      </select>
                    </div>
                  )}
                  {show('show_lot') && (
                    <div className="form-group">
                      <label>Lot:</label>
                      <input type="text" className="form-input report-edit-input" value={form.lot} onChange={(e) => setField('lot', e.target.value)} />
                    </div>
                  )}
                  {show('show_expire_date') && (
                    <div className="form-group">
                      <label>Exp. Date:</label>
                      <input type="date" className="form-input report-edit-input" value={form.expiry_date} onChange={(e) => setField('expiry_date', e.target.value)} />
                    </div>
                  )}
                  {show('show_date_read') && (
                    <div className="form-group">
                      <label>Date Read:</label>
                      <input type="date" className="form-input report-edit-input" value={form.date_read} onChange={(e) => setField('date_read', e.target.value)} />
                    </div>
                  )}
                  {show('show_mm_indurations') && (
                    <div className="form-group">
                      <label>mm Indurations:</label>
                      <input type="text" className="form-input report-edit-input" value={form.mm_indurations} onChange={(e) => setField('mm_indurations', e.target.value)} />
                    </div>
                  )}
                  {show('show_follow_up') && (
                    <div className="form-group">
                      <label>Follow Up:</label>
                      <select className="form-input report-edit-input" value={form.follow_up} onChange={(e) => setField('follow_up', e.target.value)}>
                        <option>None</option>
                        <option>Needed repeat test</option>
                        <option>Chest x-ray</option>
                      </select>
                    </div>
                  )}
                  {show('show_final_result') && (
                    <div className="form-group">
                      <label>Final Result:</label>
                      <input type="text" className="form-input report-edit-input" value={form.final_result} onChange={(e) => setField('final_result', e.target.value)} />
                    </div>
                  )}
                  {show('show_final_result_disposition') && (
                    <div className="form-group">
                      <label>Final Result Disposition:</label>
                      <select className="form-input report-edit-input" value={form.final_result_disposition} onChange={(e) => setField('final_result_disposition', e.target.value)}>
                        <option value="">Select</option>
                        <option>Negative</option>
                        <option>Positive</option>
                        <option>Test Cancelled</option>
                      </select>
                    </div>
                  )}
                  {show('show_device_identifier') && (
                    <div className="form-group">
                      <label>Device Identifier:</label>
                      <input type="text" className="form-input report-edit-input" value={form.device_identifier} onChange={(e) => setField('device_identifier', e.target.value)} />
                    </div>
                  )}
                </div>

                <div className="wl-form-remarks">
                  {show('show_test_remark') && (
                    <div className="form-group">
                      <label>Test Remark:</label>
                      <textarea className="form-input report-edit-input" rows={3} value={form.test_remark} onChange={(e) => setField('test_remark', e.target.value)} />
                    </div>
                  )}
                  {show('show_final_remark') && (
                    <div className="form-group">
                      <label>Final Remark:</label>
                      <textarea className="form-input report-edit-input" rows={3} value={form.final_remark} onChange={(e) => setField('final_remark', e.target.value)} />
                    </div>
                  )}
                </div>
              </fieldset>

              <div className="report-edit-footer">
                <button type="button" className="btn btn-ghost" onClick={goBack}>
                  Close
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={save}
                  disabled={saving || locked}
                >
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
