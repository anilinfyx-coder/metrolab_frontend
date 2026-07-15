'use client';
import { useState, useEffect } from 'react';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
function getToken() { return typeof window !== 'undefined' ? localStorage.getItem('admin_token') || '' : ''; }

export default function ApplyTestForm({ waitingListId, onClose, onSuccess }: { waitingListId: number, onClose: () => void, onSuccess: () => void }) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<number>(0);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{type: 'success' | 'error', text: string} | null>(null);

  // Form states mapping test_id -> form data
  const [formData, setFormData] = useState<any>({});
  
  useEffect(() => {
    fetch(`${API}/api/WaitingList/${waitingListId}`, { headers: { token: getToken() } })
      .then(r => r.json())
      .then(d => {
        if (d.response_code === '200') {
          setData(d.obj);
          // Initialize form data for each test
          const initialForm: any = {};
          d.obj.labTestList.forEach((t: any) => {
            initialForm[t.id] = {
              collectedDate: '', collectedTime: '', receivedDate: '', receivedTime: '',
              reportedDate: '', reportedTime: '', regulation: 'Non-DOT', specimenTypeId: t.specimenTypeList?.[0]?.id || '',
              dateOfTest: '', dateOfTime: '', testPerformedBy: '', reportStatus: 'Pending',
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
          
          const firstUnsubmitted = d.obj.labTestList.findIndex((t: any) => !t.submitStatus);
          setActiveTab(firstUnsubmitted !== -1 ? firstUnsubmitted : 0);
        }
      })
      .finally(() => setLoading(false));
  }, [waitingListId]);

  if (loading) return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', zIndex: 999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ background: '#fff', padding: '2rem', borderRadius: 8 }}>Loading Test Details...</div>
    </div>
  );

  if (!data) return null;
  if (!data.labTestList || data.labTestList.length === 0) {
    return (
      <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', zIndex: 999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ background: '#fff', padding: '2rem', borderRadius: 8, textAlign: 'center' }}>
          <h3 style={{ marginTop: 0 }}>No Tests Assigned</h3>
          <p>This patient does not have any lab tests assigned.</p>
          <button className="btn btn-primary" onClick={onClose}>Close</button>
        </div>
      </div>
    );
  }

  const test = data.labTestList[activeTab];
  const form = formData[test?.id] || {};

  const handleFormChange = (key: string, val: any) => {
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
    if (!form.confirmed) {
      alert('Please confirm the test results by checking the box at the bottom.');
      return;
    }
    setSaving(true);
    setMsg(null);
    try {
      const payload = {
        waiting_list_id: waitingListId,
        lab_test_id: test.id,
        b2b_client_id: data.b2b_client_id,
        ...form
      };
      const res = await fetch(`${API}/api/LabTestReport`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', token: getToken() },
        body: JSON.stringify(payload)
      });
      const d = await res.json();
      if (d.response_code === '200') {
        alert('Test report submitted successfully!');
        // Update local state to mark submitted
        setData((prev: any) => {
          const newList = [...prev.labTestList];
          newList[activeTab].submitStatus = true;
          return { ...prev, labTestList: newList };
        });
        
        // Move to next unsubmitted or close if all done
        const nextUnsubmitted = data.labTestList.findIndex((t: any, i: number) => !t.submitStatus && i !== activeTab);
        if (nextUnsubmitted !== -1) setActiveTab(nextUnsubmitted);
        else onSuccess();
      } else {
        setMsg({ type: 'error', text: typeof d.obj === 'string' ? d.obj : JSON.stringify(d.obj) });
      }
    } catch (e: any) {
      setMsg({ type: 'error', text: e.message });
    }
    setSaving(false);
  };

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', zIndex: 999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ background: 'var(--bg-main)', width: '90%', maxWidth: 1200, height: '90%', borderRadius: 8, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        
        {/* Header */}
        <div style={{ padding: '1rem', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-card)' }}>
          <h2 style={{ margin: 0, fontSize: '1.25rem' }}>Patient Demographics & Apply Test</h2>
          <button className="btn btn-ghost" onClick={onClose}>✕ Close</button>
        </div>

        {/* Scrollable Content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '1.5rem' }}>
          
          {/* Demographics Card */}
          <div className="card" style={{ marginBottom: '1.5rem' }}>
            <div className="card-body">
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '1rem' }}>
                <div><strong>Patient/Donor UID:</strong> {data.patient_uid || '-'}</div>
                <div><strong>Name:</strong> {data.patient_name}</div>
                <div><strong>Mobile:</strong> {data.patient_mobile}</div>
                <div><strong>Email:</strong> {data.patient_email || '-'}</div>
                <div><strong>Gender:</strong> {data.patient_gender || '-'}</div>
                <div><strong>DOB:</strong> {data.patient_dob || '-'}</div>
                <div><strong>SSN:</strong> {data.patient_ssn || '-'}</div>
                <div><strong>Reason for Test:</strong> {data.reason_for_test || '-'}</div>
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', marginBottom: '1.5rem', gap: '1rem' }}>
            {data.labTestList.map((t: any, i: number) => !t.submitStatus && (
              <div 
                key={t.id} 
                onClick={() => setActiveTab(i)}
                style={{ 
                  padding: '0.75rem 1.5rem', cursor: 'pointer', borderBottom: activeTab === i ? '2px solid var(--primary)' : '2px solid transparent',
                  fontWeight: activeTab === i ? 600 : 400, color: activeTab === i ? 'var(--primary)' : 'var(--text-muted)'
                }}>
                {t.name}
              </div>
            ))}
          </div>

          {/* Form Content */}
          {test && !test.submitStatus ? (
            <div className="card">
              <div className="card-header"><h3 className="card-title">{test.name} Details</h3></div>
              <div className="card-body">
                
                {msg && <div className={`alert alert-${msg.type}`} style={{ marginBottom: '1rem', color: msg.type === 'error' ? 'red' : 'green' }}>{msg.text}</div>}

                {/* Top Dates/Times Row */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
                  {test.show_collected_date && (
                    <div><label>Collected Date</label><input type="date" className="form-input" value={form.collectedDate} onChange={e => handleFormChange('collectedDate', e.target.value)} /></div>
                  )}
                  {test.show_collected_time && (
                    <div><label>Collected Time</label><input type="time" className="form-input" value={form.collectedTime} onChange={e => handleFormChange('collectedTime', e.target.value)} /></div>
                  )}
                  {test.show_received_date && (
                    <div><label>Received Date</label><input type="date" className="form-input" value={form.receivedDate} onChange={e => handleFormChange('receivedDate', e.target.value)} /></div>
                  )}
                  {test.show_received_time && (
                    <div><label>Received Time</label><input type="time" className="form-input" value={form.receivedTime} onChange={e => handleFormChange('receivedTime', e.target.value)} /></div>
                  )}
                  {test.show_reported_date && (
                    <div><label>Reported Date</label><input type="date" className="form-input" value={form.reportedDate} onChange={e => handleFormChange('reportedDate', e.target.value)} /></div>
                  )}
                  {test.show_reported_time && (
                    <div><label>Reported Time</label><input type="time" className="form-input" value={form.reportedTime} onChange={e => handleFormChange('reportedTime', e.target.value)} /></div>
                  )}
                </div>

                {/* Metadata Row */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
                  {test.show_regulation && (
                    <div><label>Regulation</label><select className="form-input" value={form.regulation} onChange={e => handleFormChange('regulation', e.target.value)}><option value="DOT">DOT</option><option value="Non-DOT">Non-DOT</option></select></div>
                  )}
                  {test.show_specimen && (
                    <div><label>Service & Specimen Type</label><select className="form-input" value={form.specimenTypeId} onChange={e => handleFormChange('specimenTypeId', e.target.value)}>
                      {test.specimenTypeList?.map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select></div>
                  )}
                  {test.show_test_date && (
                    <div><label>Date of Test</label><input type="date" className="form-input" value={form.dateOfTest} onChange={e => handleFormChange('dateOfTest', e.target.value)} /></div>
                  )}
                  {test.show_test_time && (
                    <div><label>Time of Test</label><input type="time" className="form-input" value={form.dateOfTime} onChange={e => handleFormChange('dateOfTime', e.target.value)} /></div>
                  )}
                  {test.show_test_performed_by && (
                    <div><label>Test Performed By</label><input type="text" className="form-input" value={form.testPerformedBy} onChange={e => handleFormChange('testPerformedBy', e.target.value)} /></div>
                  )}
                  {test.show_report_status && (
                    <div><label>Report Status</label><select className="form-input" value={form.reportStatus} onChange={e => handleFormChange('reportStatus', e.target.value)}><option>FINAL</option><option>Pending</option></select></div>
                  )}
                  {test.show_fasting && (
                    <div><label>Fasting</label><select className="form-input" value={form.fasting} onChange={e => handleFormChange('fasting', e.target.value)}><option value="1">Yes</option><option value="2">No</option></select></div>
                  )}
                  {test.show_requisition_no && (
                    <div><label>Requisition No</label><input type="text" className="form-input" value={form.requisitionNo} onChange={e => handleFormChange('requisitionNo', e.target.value)} /></div>
                  )}
                </div>

                {/* Questions */}
                {form.questions?.length > 0 && (
                  <div style={{ marginBottom: '1.5rem', background: 'var(--bg-main)', padding: '1rem', borderRadius: 8 }}>
                    <h4 style={{ margin: '0 0 1rem 0' }}>Please answer the following</h4>
                    {form.questions.map((q: any, i: number) => (
                      <div key={q.id} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', alignItems: 'center' }}>
                        <span style={{ flex: 1 }}>{i+1}. {q.question_text}?</span>
                        <div style={{ width: '200px' }}>
                          {q.answer_type === 1 ? (
                            <select className="form-input" value={q.value} onChange={e => handleQuestionChange(i, e.target.value)}>
                              <option value="Yes">Yes</option>
                              <option value="No">No</option>
                            </select>
                          ) : q.answer_type === 2 ? (
                            <label><input type="checkbox" checked={q.value === 'Done'} onChange={e => handleQuestionChange(i, e.target.checked ? 'Done' : '')}/> Done</label>
                          ) : q.answer_type === 3 || q.answer_type === 4 ? (
                            <input type={q.answer_type === 3 ? "number" : "text"} className="form-input" value={q.value} onChange={e => handleQuestionChange(i, e.target.value)} placeholder="Enter Value" />
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

                {/* Parameters */}
                {form.parameters?.length > 0 && (
                  <div style={{ marginBottom: '1.5rem' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                      <thead style={{ background: 'var(--bg-main)' }}>
                        <tr>
                          <th style={{ padding: '0.5rem' }}>Report Parameter</th>
                          <th style={{ padding: '0.5rem' }}>Screening Cut-off</th>
                          <th style={{ padding: '0.5rem' }}>Confirmation Cut-off</th>
                          <th style={{ padding: '0.5rem' }}>Value</th>
                        </tr>
                      </thead>
                      <tbody>
                        {form.parameters.map((p: any, i: number) => (
                          <tr key={p.id} style={{ borderBottom: '1px solid var(--border)' }}>
                            <td style={{ padding: '0.5rem' }}>
                              <div><strong>{p.label}</strong></div>
                              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{p.description}</div>
                            </td>
                            <td style={{ padding: '0.5rem' }}>{p.screening_cutoff !== 'Null' ? `${p.screening_cutoff} ${p.unit_text}` : '-'}</td>
                            <td style={{ padding: '0.5rem' }}>{p.confirmation_cutoff !== 'Null' ? `${p.confirmation_cutoff} ${p.unit_text}` : '-'}</td>
                            <td style={{ padding: '0.5rem' }}>
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

                {/* Additional Settings */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
                  {test.show_date_administered && <div><label>Date Administered</label><input type="date" className="form-input" value={form.dateAdministered} onChange={e => handleFormChange('dateAdministered', e.target.value)} /></div>}
                  {test.show_applied_to && <div><label>Applied To</label><select className="form-input" value={form.appliedToArm} onChange={e => handleFormChange('appliedToArm', e.target.value)}><option>Right Arm</option><option>Left Arm</option></select></div>}
                  {test.show_lot && <div><label>Lot</label><input type="text" className="form-input" value={form.lot} onChange={e => handleFormChange('lot', e.target.value)} /></div>}
                  {test.show_expire_date && <div><label>Exp. Date</label><input type="date" className="form-input" value={form.expiryDate} onChange={e => handleFormChange('expiryDate', e.target.value)} /></div>}
                  {test.show_date_read && <div><label>Date Read</label><input type="date" className="form-input" value={form.dateRead} onChange={e => handleFormChange('dateRead', e.target.value)} /></div>}
                  {test.show_mm_indurations && <div><label>mm Indurations</label><input type="text" className="form-input" value={form.mmIndurations} onChange={e => handleFormChange('mmIndurations', e.target.value)} /></div>}
                  {test.show_follow_up && <div><label>Follow Up</label><select className="form-input" value={form.followUp} onChange={e => handleFormChange('followUp', e.target.value)}><option>None</option><option>Needed repeat test</option><option>Chest x-ray</option></select></div>}
                  
                  {test.show_final_result && (
                    <div>
                      <label>Final Result</label>
                      <select className="form-input" value={form.finalResult} onChange={e => handleFormChange('finalResult', e.target.value)}>
                        <option value="1">Negative</option><option value="2">Positive</option><option value="3">Test Cancelled</option>
                        <option value="4">Refusal (Adulterated)</option><option value="5">Refusal (Substituted)</option>
                        <option value="6">Dilute</option><option value="">Other</option>
                      </select>
                      {form.finalResult === '' && <input type="text" className="form-input" style={{marginTop: '0.5rem'}} value={form.finalResultText} onChange={e => handleFormChange('finalResultText', e.target.value)} placeholder="Other Result" />}
                    </div>
                  )}
                  {test.show_final_result_disposition && (
                    <div><label>Final Result Disposition</label><select className="form-input" value={form.finalResultDisposition} onChange={e => handleFormChange('finalResultDisposition', e.target.value)}><option>Negative</option><option>Positive</option><option>Test Cancelled</option></select></div>
                  )}
                </div>

                {/* Remarks & Notes (Textareas) */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1.5rem' }}>
                  {test.show_test_remark && <div><label>Test Remark</label><textarea className="form-input" rows={3} value={form.testRemark} onChange={e => handleFormChange('testRemark', e.target.value)} /></div>}
                  {test.id === 8 && <div><label>Reference Range Note</label><textarea className="form-input" rows={3} value={form.referenceRangeNote} onChange={e => handleFormChange('referenceRangeNote', e.target.value)} /></div>}
                  {test.id === 8 && <div><label>Clinical Significance Note</label><textarea className="form-input" rows={3} value={form.clinicalSignificanceNote} onChange={e => handleFormChange('clinicalSignificanceNote', e.target.value)} /></div>}
                  {test.id === 8 && <div><label>Result Interpretation Note</label><textarea className="form-input" rows={3} value={form.resultInterpretationNote} onChange={e => handleFormChange('resultInterpretationNote', e.target.value)} /></div>}
                  {test.show_final_remark && <div><label>Final Remark</label><textarea className="form-input" rows={3} value={form.finalRemark} onChange={e => handleFormChange('finalRemark', e.target.value)} /></div>}
                </div>

              </div>
              
              <div className="card-footer" style={{ borderTop: '1px solid var(--border)', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontWeight: 500 }}>
                  <input type="checkbox" checked={form.confirmed} onChange={e => handleFormChange('confirmed', e.target.checked)} style={{ width: 18, height: 18 }} />
                  I hereby confirm the test results reported are checked and reviewed by me.
                </label>
                <div style={{ alignSelf: 'flex-start' }}>
                  <button className="btn btn-primary" onClick={handleSubmit} disabled={saving}>{saving ? 'Saving...' : 'Submit'}</button>
                </div>
              </div>
            </div>
          ) : (
            <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>All tests have been successfully submitted for this patient!</div>
          )}
        </div>

      </div>
    </div>
  );
}
