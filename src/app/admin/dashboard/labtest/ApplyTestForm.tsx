'use client';
import { useState, useEffect } from 'react';
import { MdClose } from 'react-icons/md';
import PageLoader from '../../../components/PageLoader';
import { apiFetch, handleApiResponse, toastApiError, getToken, API_BASE } from '../../../../lib/api';

function formatCutoff(value?: string | null, unit?: string | null) {
  if (value === null || value === undefined || value === '' || value === 'Null' || value === 'null') {
    return '—';
  }
  const unitText =
    unit && unit !== 'Null' && unit !== 'null' && String(unit).trim()
      ? ` ${unit}`
      : '';
  return `${value}${unitText}`;
}

export default function ApplyTestForm({
  waitingListId,
  onClose,
  onSuccess,
  variant = 'modal',
}: {
  waitingListId: number;
  onClose: () => void;
  onSuccess: () => void;
  /** `page` renders as a full content area (no overlay popup). */
  variant?: 'modal' | 'page';
}) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedTestId, setSelectedTestId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState<any>({});
  const isPage = variant === 'page';

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${API_BASE}/api/WaitingList/${waitingListId}`, {
          headers: { token: getToken('admin_token') },
        });
        const obj = await handleApiResponse<any>(res, {
          errorFallback: 'Failed to load test details.',
        });
        setData(obj);
        const initialForm: any = {};
        obj.labTestList.forEach((t: any) => {
          initialForm[t.id] = {
            collectedDate: '', collectedTime: '', receivedDate: '', receivedTime: '',
            reportedDate: '', reportedTime: '', regulation: 'Non-DOT', specimenTypeId: t.specimenTypeList?.[0]?.id || '',
            dateOfTest: '', dateOfTime: '', testPerformedBy: '', reportStatus: 'Pending',
            reasonForTest: obj.reason_for_test || '',
            fasting: '1', requisitionNo: '', deviceIdentifier: '',
            lot: '', expiryDate: '', dateRead: '', mmIndurations: '', followUp: 'None',
            finalResult: '1', finalResultText: '', testRemark: '', referenceRangeNote: '',
            clinicalSignificanceNote: '', resultInterpretationNote: '', finalResultDisposition: 'Negative',
            finalRemark: '', dateAdministered: '', appliedToArm: 'Right Arm',
            confirmed: false,
            questions: t.testReportQuestionList.map((q: any) => ({ ...q, value: q.answer_type === 1 ? 'Yes' : '' })),
            parameters: t.testResultParameterList.map((p: any) => ({ ...p, value: '' }))
          };
        });
        setFormData(initialForm);
      } catch {
        // Error toast handled by handleApiResponse
      } finally {
        setLoading(false);
      }
    })();
  }, [waitingListId]);

  if (loading) {
    if (isPage) {
      return (
        <div style={{ padding: '2rem 1rem' }}>
          <PageLoader message="Loading test details..." size="lg" />
        </div>
      );
    }
    return (
      <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', zIndex: 999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ background: '#fff', padding: '2rem 2.5rem', borderRadius: 8, minWidth: 220 }}>
          <PageLoader message="Loading test details..." />
        </div>
      </div>
    );
  }

  if (!data) return null;
  if (!data.labTestList || data.labTestList.length === 0) {
    const emptyBody = (
      <div style={{ background: '#fff', padding: '2rem', borderRadius: 8, textAlign: 'center' }}>
        <h3 style={{ marginTop: 0 }}>No Tests Assigned</h3>
        <p>This patient does not have any lab tests assigned.</p>
        <button className="btn btn-primary" onClick={onClose}>Close</button>
      </div>
    );
    if (isPage) {
      return <div className="page-body">{emptyBody}</div>;
    }
    return (
      <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', zIndex: 999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {emptyBody}
      </div>
    );
  }

  const test = selectedTestId
    ? data.labTestList.find((t: any) => t.id === selectedTestId)
    : null;
  const form = test ? (formData[test.id] || {}) : {};

  const handleFormChange = (key: string, val: any) => {
    if (!test) return;
    setFormData((prev: any) => ({ ...prev, [test.id]: { ...prev[test.id], [key]: val } }));
  };

  const handleQuestionChange = (idx: number, val: any) => {
    const newQs = [...form.questions];
    newQs[idx].value = val;
    handleFormChange('questions', newQs);
  };

  const handleParamChange = (idx: number, val: any) => {
    const newPs = [...form.parameters];
    newPs[idx].value = val;
    handleFormChange('parameters', newPs);
  };

  const handleSubmit = async () => {
    if (!test) return;
    if (!form.confirmed) {
      toastApiError('Please confirm the test results by checking the box at the bottom.');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        waiting_list_id: waitingListId,
        lab_test_id: test.id,
        b2b_client_id: data.resolved_b2b_client_id || data.b2b_client_id || test.resolved_b2b_client_id || null,
        ...form
      };
      await apiFetch('/api/LabTestReport', {
        method: 'POST',
        tokenKey: 'admin_token',
        body: JSON.stringify(payload),
        successMessage: 'Test report submitted successfully!',
        errorFallback: 'Failed to submit test report.',
      });
      setData((prev: any) => {
        const newList = prev.labTestList.map((t: any) =>
          t.id === test.id ? { ...t, submitStatus: true } : t
        );
        if (newList.every((t: any) => t.submitStatus)) {
          setTimeout(() => onSuccess(), 0);
        }
        return { ...prev, labTestList: newList };
      });
      setSelectedTestId(null);
    } catch {
      // Error toast handled by apiFetch
    }
    setSaving(false);
  };

  const formatDob = (value?: string) => {
    if (!value) return '';
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return value;
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${pad(d.getMonth() + 1)}/${pad(d.getDate())}/${d.getFullYear()}`;
  };

  const drivingLicense = [data.patient_dl_state, data.patient_dl]
    .filter((v: string | null | undefined) => v && String(v).trim())
    .join(' - ');

  const address = [
    data.patient_street1,
    data.patient_street2,
    data.patient_city,
    data.patient_state,
    data.patient_zipcode,
  ]
    .filter((v: string | null | undefined) => v && String(v).trim())
    .join(', ');

  const demoRow = (label: string, value?: string | null) => (
    <div className="wl-demo-row">
      <span className="wl-demo-label">{label}:</span>{' '}
      <span className="wl-demo-value">{value && String(value).trim() ? value : ''}</span>
    </div>
  );

  const formBody = (
    <>
      {!isPage && (
        <div style={{
          padding: '1rem',
          borderBottom: '1px solid var(--border)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          background: 'var(--bg-card)',
        }}>
          <h2 style={{ margin: 0, fontSize: '1.25rem' }}>Patient Demographics & Apply Test</h2>
          <button type="button" className="btn btn-ghost" onClick={onClose}><MdClose size={16} style={{ verticalAlign: 'text-bottom', marginRight: '0.35rem' }} aria-hidden />Close</button>
        </div>
      )}

      <div style={{ flex: 1, overflowY: 'auto', padding: '1.5rem' }}>
        <div className="card wl-demo-card" style={{ marginBottom: '1.25rem' }}>
          <div className="wl-demo-card-header">
            <h2 className="wl-demo-card-title">Patient/Donor Demographics</h2>
            <button type="button" className="wl-demo-close" onClick={onClose} title="Close" aria-label="Close">
              ×
            </button>
          </div>
          <div className="card-body wl-demo-body">
            <div className="wl-demo-grid">
              <div className="wl-demo-col">
                {demoRow('Patient/Donor UID', data.patient_uid)}
                {demoRow('Mobile', data.patient_mobile)}
                {demoRow('DOB', formatDob(data.patient_dob))}
                {demoRow('Select the reason for the test', data.reason_for_test)}
              </div>
              <div className="wl-demo-col">
                {demoRow('Name', data.patient_name)}
                {demoRow('Email', data.patient_email)}
                {demoRow('SNN', data.patient_ssn)}
              </div>
              <div className="wl-demo-col">
                {demoRow('Driving License/State Id', drivingLicense)}
                {demoRow('Gender', data.patient_gender)}
                {demoRow('Address', address)}
              </div>
            </div>
          </div>
        </div>

        <div className="wl-test-list">
          {data.labTestList.map((t: any) => (
            <button
              type="button"
              key={t.id}
              className={`wl-test-name-btn${selectedTestId === t.id ? ' active' : ''}${t.submitStatus ? ' submitted' : ''}`}
              onClick={() => {
                if (t.submitStatus) return;
                setSelectedTestId(t.id);
              }}
              disabled={t.submitStatus}
            >
              {t.name}{t.submitStatus ? ' (Submitted)' : ''}
            </button>
          ))}
        </div>

        {test && !test.submitStatus && selectedTestId === test.id ? (
          <div className="card wl-test-form-card">
            <h3 className="wl-test-form-title">{test.name}</h3>
            <div className="card-body wl-test-form-body">
              <div className="wl-form-row wl-form-row-2">
                {test.show_regulation && (
                  <div className="form-group">
                    <label>Regulation</label>
                    <select className="form-input" value={form.regulation} onChange={e => handleFormChange('regulation', e.target.value)}>
                      <option value="DOT">DOT</option>
                      <option value="Non-DOT">Non-DOT</option>
                    </select>
                  </div>
                )}
                {test.show_specimen && (
                  <div className="form-group">
                    <label>Service and Specimen type</label>
                    <select className="form-input" value={form.specimenTypeId} onChange={e => handleFormChange('specimenTypeId', e.target.value)}>
                      {test.specimenTypeList?.map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                  </div>
                )}
              </div>

              <div className="wl-form-row wl-form-row-6">
                {test.show_collected_date && (
                  <div className="form-group"><label>Collected Date</label><input type="date" className="form-input" value={form.collectedDate} onChange={e => handleFormChange('collectedDate', e.target.value)} /></div>
                )}
                {test.show_collected_time && (
                  <div className="form-group"><label>Collected Time</label><input type="time" className="form-input" value={form.collectedTime} onChange={e => handleFormChange('collectedTime', e.target.value)} /></div>
                )}
                {test.show_received_date && (
                  <div className="form-group"><label>Received Date</label><input type="date" className="form-input" value={form.receivedDate} onChange={e => handleFormChange('receivedDate', e.target.value)} /></div>
                )}
                {test.show_received_time && (
                  <div className="form-group"><label>Received Time</label><input type="time" className="form-input" value={form.receivedTime} onChange={e => handleFormChange('receivedTime', e.target.value)} /></div>
                )}
                {test.show_reported_date && (
                  <div className="form-group"><label>Reported Date</label><input type="date" className="form-input" value={form.reportedDate} onChange={e => handleFormChange('reportedDate', e.target.value)} /></div>
                )}
                {test.show_reported_time && (
                  <div className="form-group"><label>Reported Time</label><input type="time" className="form-input" value={form.reportedTime} onChange={e => handleFormChange('reportedTime', e.target.value)} /></div>
                )}
              </div>

              <div className="wl-form-row wl-form-row-2">
                {test.show_test_performed_by && (
                  <div className="form-group">
                    <label>Test Performed By</label>
                    <input type="text" className="form-input" placeholder="Enter Test Performed By" value={form.testPerformedBy} onChange={e => handleFormChange('testPerformedBy', e.target.value)} />
                  </div>
                )}
                {test.show_reason_for_test && (
                  <div className="form-group">
                    <label>Reason for Test</label>
                    <input type="text" className="form-input" placeholder="Enter Reason For Test" value={form.reasonForTest} onChange={e => handleFormChange('reasonForTest', e.target.value)} />
                  </div>
                )}
              </div>

              {test.show_report_status && (
                <div className="wl-form-row wl-form-row-1">
                  <div className="form-group wl-form-group-narrow">
                    <label>Report Status</label>
                    <input type="text" className="form-input" placeholder="Enter Report Status" value={form.reportStatus} onChange={e => handleFormChange('reportStatus', e.target.value)} />
                  </div>
                </div>
              )}

              {form.parameters?.length > 0 && (
                <div className="wl-param-table-wrap">
                  <table className="wl-param-table">
                    <thead>
                      <tr>
                        <th>Report Parameter</th>
                        <th>Screening Cutt-off Value</th>
                        <th>Confirmation Cutt-off Value</th>
                        <th>Value</th>
                      </tr>
                    </thead>
                    <tbody>
                      {form.parameters.map((p: any, i: number) => (
                        <tr key={p.id}>
                          <td>
                            <div className="wl-param-label">{p.label}</div>
                            {p.description && <div className="wl-param-desc">{p.description}</div>}
                          </td>
                          <td>{formatCutoff(p.screening_cutoff, p.unit_text)}</td>
                          <td>{formatCutoff(p.confirmation_cutoff, p.unit_text)}</td>
                          <td>
                            {p.input_type === 1 ? (
                              <input type="text" className="form-input" value={p.value} onChange={e => handleParamChange(i, e.target.value)} />
                            ) : p.input_type === 2 ? (
                              <select className="form-input" value={p.value} onChange={e => handleParamChange(i, e.target.value)}>
                                <option value="">Select</option>
                                {p.input_option?.split(',').map((opt: string) => <option key={opt} value={opt}>{opt}</option>)}
                              </select>
                            ) : null}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {form.questions?.length > 0 && (
                <div className="wl-questions-block">
                  <h4>Please answer the following</h4>
                  {form.questions.map((q: any, i: number) => (
                    <div key={q.id} className="wl-question-row">
                      <span>{i + 1}. {q.question_text}?</span>
                      <div className="wl-question-input">
                        {q.answer_type === 1 ? (
                          <select className="form-input" value={q.value} onChange={e => handleQuestionChange(i, e.target.value)}>
                            <option value="Yes">Yes</option>
                            <option value="No">No</option>
                          </select>
                        ) : q.answer_type === 2 ? (
                          <label><input type="checkbox" checked={q.value === 'Done'} onChange={e => handleQuestionChange(i, e.target.checked ? 'Done' : '')}/> Done</label>
                        ) : q.answer_type === 3 || q.answer_type === 4 ? (
                          <input type={q.answer_type === 3 ? 'number' : 'text'} className="form-input" value={q.value} onChange={e => handleQuestionChange(i, e.target.value)} placeholder="Enter Value" />
                        ) : q.answer_type === 5 ? (
                          <select className="form-input" value={q.value} onChange={e => handleQuestionChange(i, e.target.value)}>
                            <option value="">Select</option>
                            {q.answer_option?.split(',').map((opt: string) => <option key={opt} value={opt}>{opt}</option>)}
                          </select>
                        ) : null}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="wl-form-row wl-form-row-3">
                {test.show_test_date && (
                  <div className="form-group"><label>Date of Test</label><input type="date" className="form-input" value={form.dateOfTest} onChange={e => handleFormChange('dateOfTest', e.target.value)} /></div>
                )}
                {test.show_test_time && (
                  <div className="form-group"><label>Time of Test</label><input type="time" className="form-input" value={form.dateOfTime} onChange={e => handleFormChange('dateOfTime', e.target.value)} /></div>
                )}
                {test.show_fasting && (
                  <div className="form-group"><label>Fasting</label><select className="form-input" value={form.fasting} onChange={e => handleFormChange('fasting', e.target.value)}><option value="1">Yes</option><option value="2">No</option></select></div>
                )}
                {test.show_requisition_no && (
                  <div className="form-group"><label>Requisition No</label><input type="text" className="form-input" value={form.requisitionNo} onChange={e => handleFormChange('requisitionNo', e.target.value)} /></div>
                )}
                {test.show_date_administered && <div className="form-group"><label>Date Administered</label><input type="date" className="form-input" value={form.dateAdministered} onChange={e => handleFormChange('dateAdministered', e.target.value)} /></div>}
                {test.show_applied_to && <div className="form-group"><label>Applied To</label><select className="form-input" value={form.appliedToArm} onChange={e => handleFormChange('appliedToArm', e.target.value)}><option>Right Arm</option><option>Left Arm</option></select></div>}
                {test.show_lot && <div className="form-group"><label>Lot</label><input type="text" className="form-input" value={form.lot} onChange={e => handleFormChange('lot', e.target.value)} /></div>}
                {test.show_expire_date && <div className="form-group"><label>Exp. Date</label><input type="date" className="form-input" value={form.expiryDate} onChange={e => handleFormChange('expiryDate', e.target.value)} /></div>}
                {test.show_date_read && <div className="form-group"><label>Date Read</label><input type="date" className="form-input" value={form.dateRead} onChange={e => handleFormChange('dateRead', e.target.value)} /></div>}
                {test.show_mm_indurations && <div className="form-group"><label>mm Indurations</label><input type="text" className="form-input" value={form.mmIndurations} onChange={e => handleFormChange('mmIndurations', e.target.value)} /></div>}
                {test.show_follow_up && <div className="form-group"><label>Follow Up</label><select className="form-input" value={form.followUp} onChange={e => handleFormChange('followUp', e.target.value)}><option>None</option><option>Needed repeat test</option><option>Chest x-ray</option></select></div>}
                {test.show_final_result && (
                  <div className="form-group">
                    <label>Final Result</label>
                    <select className="form-input" value={form.finalResult} onChange={e => handleFormChange('finalResult', e.target.value)}>
                      <option value="1">Negative</option><option value="2">Positive</option><option value="3">Test Cancelled</option>
                      <option value="4">Refusal (Adulterated)</option><option value="5">Refusal (Substituted)</option>
                      <option value="6">Dilute</option><option value="">Other</option>
                    </select>
                    {form.finalResult === '' && <input type="text" className="form-input" style={{ marginTop: '0.5rem' }} value={form.finalResultText} onChange={e => handleFormChange('finalResultText', e.target.value)} placeholder="Other Result" />}
                  </div>
                )}
                {test.show_final_result_disposition && (
                  <div className="form-group"><label>Final Result Disposition</label><select className="form-input" value={form.finalResultDisposition} onChange={e => handleFormChange('finalResultDisposition', e.target.value)}><option>Negative</option><option>Positive</option><option>Test Cancelled</option></select></div>
                )}
              </div>

              <div className="wl-form-remarks">
                {test.show_test_remark && <div className="form-group"><label>Test Remark</label><textarea className="form-input" rows={3} value={form.testRemark} onChange={e => handleFormChange('testRemark', e.target.value)} /></div>}
                {test.id === 8 && <div className="form-group"><label>Reference Range Note</label><textarea className="form-input" rows={3} value={form.referenceRangeNote} onChange={e => handleFormChange('referenceRangeNote', e.target.value)} /></div>}
                {test.id === 8 && <div className="form-group"><label>Clinical Significance Note</label><textarea className="form-input" rows={3} value={form.clinicalSignificanceNote} onChange={e => handleFormChange('clinicalSignificanceNote', e.target.value)} /></div>}
                {test.id === 8 && <div className="form-group"><label>Result Interpretation Note</label><textarea className="form-input" rows={3} value={form.resultInterpretationNote} onChange={e => handleFormChange('resultInterpretationNote', e.target.value)} /></div>}
                {test.show_final_remark && <div className="form-group"><label>Final Remark</label><textarea className="form-input" rows={3} value={form.finalRemark} onChange={e => handleFormChange('finalRemark', e.target.value)} /></div>}
              </div>
            </div>

            <div className="wl-test-form-footer">
              <label className="wl-confirm-label">
                <input type="checkbox" checked={form.confirmed} onChange={e => handleFormChange('confirmed', e.target.checked)} />
                I hereby confirm the test results reported are checked and reviewed by me.
              </label>
              <button type="button" className="btn btn-primary wl-submit-btn" onClick={handleSubmit} disabled={saving}>
                {saving ? 'Saving...' : 'Submit'}
              </button>
            </div>
          </div>
        ) : data.labTestList.every((t: any) => t.submitStatus) ? (
          <div className="wl-all-submitted">All tests have been successfully submitted for this patient!</div>
        ) : null}
      </div>
    </>
  );

  if (isPage) {
    return (
      <div style={{
        background: 'var(--bg-main)',
        minHeight: 'calc(100vh - 120px)',
        display: 'flex',
        flexDirection: 'column',
      }}>
        {formBody}
      </div>
    );
  }

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', zIndex: 999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ background: 'var(--bg-main)', width: '90%', maxWidth: 1200, height: '90%', borderRadius: 8, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {formBody}
      </div>
    </div>
  );
}
