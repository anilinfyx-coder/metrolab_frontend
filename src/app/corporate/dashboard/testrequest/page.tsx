'use client';
import { useState, useEffect } from 'react';
import { Eye, Trash2, FileDown, Plus, Mail } from 'lucide-react';
import TopNav from '../../../components/TopNav';
import { useConfirm } from '../../../components/ConfirmModal';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
function getToken() { return typeof window !== 'undefined' ? localStorage.getItem('corporate_token') || '' : ''; }

export default function TestRequestsPage() {
  const confirmDialog = useConfirm();
  const [requests, setRequests] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'LIST' | 'GENERATE' | 'VIEW'>('LIST');
  const [selectedRequest, setSelectedRequest] = useState<any>(null);
  const [selectedRequestEmployees, setSelectedRequestEmployees] = useState<any[]>([]);

  // Form State
  const [form, setForm] = useState({
    title: '',
    year: new Date().getFullYear().toString(),
    frequency: 'Quarter',
    quarter: '1',
    testType: 'DOT',
    reasonForTest: '',
    selectionType: '1', // 1=Number, 2=Percentage
    isDrugSelected: false,
    drugCount: 0,
    isAlcoholSelected: false,
    alcoholCount: 0,
    isAlternateSelected: false,
    alternateCount: 0
  });

  const [saving, setSaving] = useState(false);

  const loadData = async () => {
    setLoading(true);
    const [rRes, eRes] = await Promise.all([
      fetch(`${API}/api/TestRequest/getTestRequestList`, { method: 'POST', headers: { token: getToken() } }),
      fetch(`${API}/api/Employees`, { headers: { token: getToken() } })
    ]);
    const parseJson = async (res: Response, name: string) => {
      try {
        const text = await res.text();
        return JSON.parse(text);
      } catch (err) {
        console.error(`Error parsing JSON for ${name} from URL ${res.url}. Status: ${res.status}. Body:`, err);
        return { response_code: '500', obj: [] };
      }
    };

    const trD = await parseJson(rRes, 'TestRequest');
    const empD = await parseJson(eRes, 'Employees');

    if (trD.response_code === '200') setRequests(trD.obj || []);
    if (empD.response_code === '200') setEmployees(empD.obj || []);
    
    setLoading(false);
  };

  useEffect(() => { loadData(); }, []);

  function sortRandomlyExceptSelected(items: any[], flagKey: string) {
    const selected = items.filter(item => item[flagKey]);
    const nonSelected = items.filter(item => !item[flagKey]);
    const shuffled = nonSelected.sort(() => Math.random() - 0.5);
    return [...shuffled, ...selected];
  }

  const generateAndSubmit = async () => {
    if (!form.title) return alert("Request Title is mandatory");
    if (!form.reasonForTest) return alert("Reason for test is mandatory");

    let total = employees.length;
    let altC = form.alternateCount || 0;
    
    let alcC = form.alcoholCount || 0;
    if (form.selectionType === '2') alcC = Math.ceil((alcC / 100) * total);

    let drugC = form.drugCount || 0;
    if (form.selectionType === '2') drugC = Math.ceil((drugC / 100) * total);

    if (altC + drugC > total) return alert("Count in Drug + Alternate exceeds total employees");
    if (altC + alcC > total) return alert("Count in Alcohol + Alternate exceeds total employees");

    const ok = await confirmDialog({
      title: 'This is Random Pulling, Please confirm',
      message: 'Once this request has been generated, it will get auto submitted to your Lab. This cannot be reverted.',
      cancelText: 'NO, WAIT!',
      confirmText: 'CONFIRM',
    });
    if (!ok) return;

    setSaving(true);

    let emps = [...employees];
    
    // Assign Alternate
    emps.forEach(e => e.isSelectedForAlternate = false);
    emps.sort(() => Math.random() - 0.5);
    for (let i = 0; i < altC && i < total; i++) {
        emps[i].isSelectedForAlternate = true;
    }

    // Assign Alcohol
    emps.forEach(e => e.isSelectedForAlcohol = false);
    emps = sortRandomlyExceptSelected(emps, 'isSelectedForAlternate');
    for (let i = 0; i < alcC && i < emps.length; i++) {
        emps[i].isSelectedForAlcohol = true;
    }

    // Assign Drug
    emps.forEach(e => e.isSelectedForDrug = false);
    emps = sortRandomlyExceptSelected(emps, 'isSelectedForAlternate');
    for (let i = 0; i < drugC && i < emps.length; i++) {
        emps[i].isSelectedForDrug = true;
    }

    const payload = {
      ...form,
      totalCount: total,
      employeesList: emps
    };

    const res = await fetch(`${API}/api/TestRequest/saveTestRequestInBulk`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', token: getToken() },
      body: JSON.stringify(payload)
    });
    
    setSaving(false);
    
    const data = await res.json();
    if (data.response_code === '200') {
      alert("Successfully generated test request");
      setViewMode('LIST');
      loadData();
    } else {
      alert("Error: " + data.obj);
    }
  };

  const remove = async (id: number) => {
    const ok = await confirmDialog({
      title: 'You are trying to delete Test Request, Please confirm',
      message: 'This cannot be restored once deleted.',
      cancelText: 'NO, WAIT!',
      confirmText: 'CONFIRM DELETION',
    });
    if (!ok) return;
    await fetch(`${API}/api/TestRequest/deleteTestRequest`, { 
      method: 'POST', 
      headers: { 'Content-Type': 'application/json', token: getToken() },
      body: JSON.stringify({ id })
    });
    loadData();
  };

  const viewRequest = async (r: any) => {
    setSelectedRequest(r);
    // Fetch employees tied to this specific request
    const res = await fetch(`${API}/api/TestRequest/getTestRequestEmployees`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', token: getToken() },
      body: JSON.stringify({ test_request_id: r.id })
    });
    const d = await res.json();
    if (d.response_code === '200') {
      setSelectedRequestEmployees(d.obj || []);
    } else {
      // fallback: use the already-loaded employees list
      setSelectedRequestEmployees(employees);
    }
    setViewMode('VIEW');
  };

  const emailReport = async (testRequestId: number, employeeId: number) => {
    try {
      const res = await fetch(`${API}/api/TestRequest/emailTestRequestReport`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', token: getToken() },
        body: JSON.stringify({ test_request_id: testRequestId, employee_id: employeeId })
      });
      const data = await res.json();
      if (data.response_code === '200') {
        alert("Report emailed successfully.");
      } else {
        alert("Failed to email report: " + data.obj);
      }
    } catch (e: any) {
      alert("Error: " + e.message);
    }
  };

  return (
    <div className="page-content">
      {viewMode === 'LIST' && (
        <>
          <TopNav title="List of Test Requests">
          <button className="btn" style={{ background: '#17a2b8', color: '#fff', border: 'none', display: 'flex', alignItems: 'center', gap: '0.4rem' }} onClick={() => setViewMode('GENERATE')}>
            <Plus size={16} /> Generate Test Request
          </button>
        </TopNav>
          <div className="card" style={{ padding: '1rem' }}>
            {loading ? <div>Loading...</div> : (
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border)' }}>
                    <th style={{ padding: '0.75rem', textAlign: 'left' }}>Creation Timestamp</th>
                    <th style={{ padding: '0.75rem', textAlign: 'left' }}>Request Id</th>
                    <th style={{ padding: '0.75rem', textAlign: 'left' }}>Request Title</th>
                    <th style={{ padding: '0.75rem', textAlign: 'left' }}>Year/Frequency</th>
                    <th style={{ padding: '0.75rem', textAlign: 'left' }}>Status</th>
                    <th style={{ padding: '0.75rem', textAlign: 'left' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {requests.map(r => (
                    <tr key={r.id} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td style={{ padding: '0.75rem' }}>{r.creationTimestamp}</td>
                      <td style={{ padding: '0.75rem' }}>TR-{r.id}</td>
                      <td style={{ padding: '0.75rem' }}>{r.title}</td>
                      <td style={{ padding: '0.75rem' }}>{r.year}/{r.frequency} {r.frequency === 'Quarter' ? r.quarter : ''}</td>
                      <td style={{ padding: '0.75rem' }}>{r.allSubmitStatus ? 'Processed' : 'Pending'}</td>
                      <td style={{ padding: '0.75rem' }}>
                        <div style={{ display: 'flex', gap: '0.35rem', alignItems: 'center' }}>
                          <button
                            title="View"
                            style={{ padding: '0.35rem 0.6rem', background: '#2f5183', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.78rem' }}
                            onClick={() => viewRequest(r)}
                          ><Eye size={13} /></button>
                          <button
                            title="Download Report"
                            style={{ padding: '0.35rem 0.6rem', background: '#4db0e5', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.78rem' }}
                            onClick={async () => {
                              const res = await fetch(`${API}/api/TestRequest/downloadTestRequestReport`, {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json', token: getToken() },
                                body: JSON.stringify({ id: r.id }),
                              });
                              const blob = await res.blob();
                              const url = URL.createObjectURL(blob);
                              const a = document.createElement('a'); a.href = url; a.download = `TR-${r.id}-Report.pdf`; a.click();
                            }}
                          ><FileDown size={13} /></button>
                          <button
                            title="Delete"
                            style={{ padding: '0.35rem 0.6rem', background: '#f00e0e', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.78rem' }}
                            onClick={() => remove(r.id)}
                          ><Trash2 size={13} /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}

      {viewMode === 'GENERATE' && (
        <>
          <TopNav title="Test Request Detail">
          <button className="btn btn-ghost" onClick={() => setViewMode('LIST')}>Close</button>
        </TopNav>
          
          <div className="card" style={{ padding: '1.5rem', marginBottom: '2rem' }}>
            <div className="row" style={{ display: 'flex', flexWrap: 'wrap', margin: '-0.5rem' }}>
              <div style={{ width: '50%', padding: '0.5rem' }}>
                <div className="form-group" style={{ margin: 0 }}>
                  <label>Request Title <span style={{ color: 'red' }}>*</span></label>
                  <input type="text" placeholder="Enter Title" value={form.title} onChange={e => setForm({...form, title: e.target.value})} />
                </div>
              </div>
              <div style={{ width: '25%', padding: '0.5rem' }}>
                <div className="form-group" style={{ margin: 0 }}>
                  <label>Year <span style={{ color: 'red' }}>*</span></label>
                  <input type="text" disabled value={form.year} />
                </div>
              </div>
              <div style={{ width: '25%', padding: '0.5rem' }}>
                <div className="form-group" style={{ margin: 0 }}>
                  <label>Frequency <span style={{ color: 'red' }}>*</span></label>
                  <select value={form.frequency} onChange={e => setForm({...form, frequency: e.target.value})}>
                    <option value="Quarter">Quarter</option>
                    <option value="Annual">Annual</option>
                  </select>
                </div>
              </div>

              <div style={{ width: '25%', padding: '0.5rem' }}>
                <div className="form-group" style={{ margin: 0 }}>
                  <label>Test Type <span style={{ color: 'red' }}>*</span></label>
                  <select value={form.testType} onChange={e => setForm({...form, testType: e.target.value})}>
                    <option value="DOT">DOT</option>
                    <option value="Non-DOT">Non-DOT</option>
                  </select>
                </div>
              </div>
              {form.frequency === 'Quarter' && (
                <div style={{ width: '25%', padding: '0.5rem' }}>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label>Quarter <span style={{ color: 'red' }}>*</span></label>
                    <select value={form.quarter} onChange={e => setForm({...form, quarter: e.target.value})}>
                      <option value="1">1st</option><option value="2">2nd</option>
                      <option value="3">3rd</option><option value="4">4th</option>
                    </select>
                  </div>
                </div>
              )}
              <div style={{ width: form.frequency === 'Quarter' ? '50%' : '75%', padding: '0.5rem' }}>
                <div className="form-group" style={{ margin: 0 }}>
                  <label>Reason for Test <span style={{ color: 'red' }}>*</span></label>
                  <input type="text" placeholder="Enter Reason for Test" value={form.reasonForTest} onChange={e => setForm({...form, reasonForTest: e.target.value})} />
                </div>
              </div>
            </div>

            <div style={{ marginTop: '1.5rem', paddingTop: '1rem', borderTop: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
                <p style={{ margin: 0 }}><b>Test Date: {new Date().toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' }).replace(/\//g, '-')}</b></p>
                <p style={{ margin: 0 }}><b>Test Time: {new Date().toLocaleTimeString('en-US')}</b></p>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', marginBottom: '1.5rem' }}>
                <div style={{ width: '16.66%' }}>
                  <label style={{ margin: 0 }}>Set Selection Type</label>
                </div>
                <div style={{ width: '16.66%' }}>
                  <select value={form.selectionType} onChange={e => setForm({...form, selectionType: e.target.value})}>
                    <option value="1">Number</option>
                    <option value="2">Percentage</option>
                  </select>
                </div>
              </div>

              {/* Drug / Alcohol / Alternate checkboxes — isolated from global form-control CSS */}
              <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-start', gap: '0', marginBottom: '0.5rem' }}>

                {/* Drug */}
                <div style={{ width: '25%', padding: '0.5rem 0.5rem 0.75rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                    <input
                      type="checkbox"
                      id="chk-drug"
                      checked={form.isDrugSelected}
                      onChange={e => setForm({...form, isDrugSelected: e.target.checked})}
                      style={{ width: '16px', height: '16px' }}
                    />
                    <label htmlFor="chk-drug" style={{ margin: 0, fontWeight: 500, fontSize: '0.9rem', cursor: 'pointer', userSelect: 'none', background: 'none', border: 'none', padding: 0 }}>
                      Drug
                    </label>
                  </div>
                  {form.isDrugSelected && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <input
                        type="number" min={0}
                        style={{ width: '90px', padding: '0.35rem 0.5rem', border: '1px solid var(--border)', borderRadius: 5, background: 'var(--bg-input)', color: 'var(--text)', fontSize: '0.875rem' }}
                        value={form.drugCount}
                        onChange={e => setForm({...form, drugCount: Number(e.target.value)})}
                      />
                      {form.selectionType === '2' && <span style={{ fontWeight: 600 }}>%</span>}
                    </div>
                  )}
                </div>

                {/* Alcohol */}
                <div style={{ width: '25%', padding: '0.5rem 0.5rem 0.75rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                    <input
                      type="checkbox"
                      id="chk-alcohol"
                      checked={form.isAlcoholSelected}
                      onChange={e => setForm({...form, isAlcoholSelected: e.target.checked})}
                      style={{ width: '16px', height: '16px' }}
                    />
                    <label htmlFor="chk-alcohol" style={{ margin: 0, fontWeight: 500, fontSize: '0.9rem', cursor: 'pointer', userSelect: 'none', background: 'none', border: 'none', padding: 0 }}>
                      Alcohol
                    </label>
                  </div>
                  {form.isAlcoholSelected && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <input
                        type="number" min={0}
                        style={{ width: '90px', padding: '0.35rem 0.5rem', border: '1px solid var(--border)', borderRadius: 5, background: 'var(--bg-input)', color: 'var(--text)', fontSize: '0.875rem' }}
                        value={form.alcoholCount}
                        onChange={e => setForm({...form, alcoholCount: Number(e.target.value)})}
                      />
                      {form.selectionType === '2' && <span style={{ fontWeight: 600 }}>%</span>}
                    </div>
                  )}
                </div>

                {/* Alternate */}
                <div style={{ width: '25%', padding: '0.5rem 0.5rem 0.75rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                    <input
                      type="checkbox"
                      id="chk-alternate"
                      checked={form.isAlternateSelected}
                      onChange={e => setForm({...form, isAlternateSelected: e.target.checked})}
                      style={{ width: '16px', height: '16px' }}
                    />
                    <label htmlFor="chk-alternate" style={{ margin: 0, fontWeight: 500, fontSize: '0.9rem', cursor: 'pointer', userSelect: 'none', background: 'none', border: 'none', padding: 0 }}>
                      Alternate
                    </label>
                  </div>
                  {form.isAlternateSelected && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <input
                        type="number" min={0}
                        style={{ width: '90px', padding: '0.35rem 0.5rem', border: '1px solid var(--border)', borderRadius: 5, background: 'var(--bg-input)', color: 'var(--text)', fontSize: '0.875rem' }}
                        value={form.alternateCount}
                        onChange={e => setForm({...form, alternateCount: Number(e.target.value)})}
                      />
                    </div>
                  )}
                </div>

                {/* Select & Submit */}
                <div style={{ width: '25%', padding: '0.5rem', display: 'flex', alignItems: 'flex-start', paddingTop: '0.4rem' }}>
                  <button
                    style={{ background: '#17a2b8', color: '#fff', border: 'none', borderRadius: 6, padding: '0.45rem 1.2rem', cursor: 'pointer', fontWeight: 600, fontSize: '0.9rem', whiteSpace: 'nowrap' }}
                    onClick={generateAndSubmit}
                    disabled={saving}
                  >
                    {saving ? 'Processing...' : 'Select & Submit'}
                  </button>
                </div>
              </div>
            </div>

            <div style={{ marginTop: '1.5rem', paddingTop: '1.5rem', borderTop: '1px solid var(--border)' }}>
              <h3 style={{ margin: '0 0 1rem 0', fontSize: '1rem', fontWeight: 600 }}>Employees List (Total Employees: {employees.length})</h3>
              <div className="card" style={{ padding: 0, overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border)' }}>
                      <th style={{ padding: '0.75rem', textAlign: 'left' }}>Last Name</th>
                      <th style={{ padding: '0.75rem', textAlign: 'left' }}>First Name</th>
                      <th style={{ padding: '0.75rem', textAlign: 'left' }}>Mobile</th>
                      <th style={{ padding: '0.75rem', textAlign: 'left' }}>Department</th>
                      <th style={{ padding: '0.75rem', textAlign: 'center', minWidth: '140px' }}>Drug</th>
                      <th style={{ padding: '0.75rem', textAlign: 'center', minWidth: '140px' }}>Alcohol</th>
                      <th style={{ padding: '0.75rem', textAlign: 'center' }}>Alternate</th>
                    </tr>
                  </thead>
                  <tbody>
                    {employees.map(e => (
                      <tr key={e.id} style={{ borderBottom: '1px solid var(--border)' }}>
                        <td style={{ padding: '0.75rem' }}>{e.last_name}</td>
                        <td style={{ padding: '0.75rem' }}>{e.first_name}</td>
                        <td style={{ padding: '0.75rem' }}>{e.mobile}</td>
                        <td style={{ padding: '0.75rem' }}>{e.department}</td>
                        <td style={{ padding: '0.75rem', textAlign: 'center' }}>
                          <input type="checkbox" checked={!!e.isSelectedForDrug} disabled />
                        </td>
                        <td style={{ padding: '0.75rem', textAlign: 'center' }}>
                          <input type="checkbox" checked={!!e.isSelectedForAlcohol} disabled />
                        </td>
                        <td style={{ padding: '0.75rem', textAlign: 'center' }}>
                          <input type="checkbox" checked={!!e.isSelectedForAlternate} disabled />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        </>
      )}
      {viewMode === 'VIEW' && selectedRequest && (
        <>
          <TopNav title="Test Request Detail">
            <button className="btn btn-ghost" onClick={() => setViewMode('LIST')}>Close</button>
          </TopNav>

          <div className="card" style={{ padding: '1.5rem', marginBottom: '2rem' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-muted)' }}>Request Title</label>
                <div style={{ fontSize: '1rem', fontWeight: 500 }}>{selectedRequest.title}</div>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-muted)' }}>Corporate Name</label>
                <div style={{ fontSize: '1rem', fontWeight: 500 }}>{selectedRequest.corporateClientCompany}</div>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-muted)' }}>Reason for Test</label>
                <div style={{ fontSize: '1rem', fontWeight: 500 }}>{selectedRequest.reasonForTest}</div>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-muted)' }}>Test Date Time</label>
                <div style={{ fontSize: '1rem', fontWeight: 500 }}>{selectedRequest.creationTimestamp}</div>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-muted)' }}>Type:</label>
                <div style={{ fontSize: '1rem', fontWeight: 500 }}>{selectedRequest.testType}</div>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-muted)' }}>Year/Frequency:</label>
                <div style={{ fontSize: '1rem', fontWeight: 500 }}>
                  {selectedRequest.year}/{selectedRequest.frequency}
                  {selectedRequest.frequency === 'Quarter' ? ` ${selectedRequest.quarter}` : ''}
                </div>
              </div>
            </div>

            <hr style={{ borderColor: 'var(--border)', margin: '1rem 0' }} />

            <div style={{ display: 'flex', gap: '2rem', marginBottom: '1rem' }}>
              <div>
                <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-muted)' }}>Drug Count: </span>
                <span style={{ fontSize: '1rem', fontWeight: 500 }}>
                  {selectedRequest.drugCount}{selectedRequest.selectionType === 2 ? '%' : ''}
                </span>
              </div>
              <div>
                <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-muted)' }}>Alcohol Count: </span>
                <span style={{ fontSize: '1rem', fontWeight: 500 }}>
                  {selectedRequest.alcoholCount}{selectedRequest.selectionType === 2 ? '%' : ''}
                </span>
              </div>
              <div>
                <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-muted)' }}>Alternate Count: </span>
                <span style={{ fontSize: '1rem', fontWeight: 500 }}>{selectedRequest.alternateCount}</span>
              </div>
              <div>
                <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-muted)' }}>Total Count: </span>
                <span style={{ fontSize: '1rem', fontWeight: 500 }}>{selectedRequest.totalCount}</span>
              </div>
            </div>

            <hr style={{ borderColor: 'var(--border)', margin: '1rem 0 1.5rem' }} />

            <h3 style={{ margin: '0 0 1rem 0', fontSize: '1rem', fontWeight: 600 }}>Employees List</h3>
            <div className="card" style={{ padding: 0, overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border)', background: '#f8f9fc' }}>
                    <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: 600 }}>Last Name</th>
                    <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: 600 }}>First Name</th>
                    <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: 600 }}>Mobile</th>
                    <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: 600 }}>Department</th>
                    <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: 600, minWidth: '140px' }}>Drug</th>
                    <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: 600, minWidth: '140px' }}>Alcohol</th>
                    <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: 600 }}>Alternate</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedRequestEmployees.map((emp, i) => (
                    <tr key={emp.id || i} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td style={{ padding: '0.75rem' }}>{emp.last_name || emp.lastName}</td>
                      <td style={{ padding: '0.75rem' }}>{emp.first_name || emp.firstName}</td>
                      <td style={{ padding: '0.75rem' }}>{emp.mobile}</td>
                      <td style={{ padding: '0.75rem' }}>{emp.department}</td>
                      <td style={{ padding: '0.75rem' }}>
                        {emp.isSelectedForDrug || emp.is_selected_for_drug ? (
                          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', background: '#f0f4f8', padding: '0.2rem 0.5rem', borderRadius: '4px', border: '1px solid #d1d5db' }}>
                            <input type="checkbox" checked disabled style={{ width: '14px', height: '14px', margin: 0, accentColor: '#17a2b8' }} />
                            {!emp.drugReportSubmitStatus ? (
                              <span style={{ fontSize: '0.8rem', fontWeight: 500 }}>Pending</span>
                            ) : (
                                <div style={{ display: 'flex', gap: '0.2rem' }}>
                                <button title="Download" style={{ padding: '0.15rem 0.4rem', background: '#4db0e5', color: '#fff', border: 'none', borderRadius: 3, cursor: 'pointer' }}><FileDown size={12} /></button>
                                <button title="Email" onClick={() => emailReport(selectedRequest.id, emp.id)} style={{ padding: '0.15rem 0.4rem', background: '#2f5183', color: '#fff', border: 'none', borderRadius: 3, cursor: 'pointer' }}><Mail size={12} /></button>
                              </div>
                            )}
                          </div>
                        ) : (
                           <input type="checkbox" disabled style={{ width: '14px', height: '14px', margin: 0 }} />
                        )}
                      </td>
                      <td style={{ padding: '0.75rem' }}>
                        {emp.isSelectedForAlcohol || emp.is_selected_for_alcohol ? (
                          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', background: '#f0f4f8', padding: '0.2rem 0.5rem', borderRadius: '4px', border: '1px solid #d1d5db' }}>
                            <input type="checkbox" checked disabled style={{ width: '14px', height: '14px', margin: 0, accentColor: '#17a2b8' }} />
                            {!emp.alcoholReportSubmitStatus ? (
                              <span style={{ fontSize: '0.8rem', fontWeight: 500 }}>Pending</span>
                            ) : (
                                <div style={{ display: 'flex', gap: '0.2rem' }}>
                                <button title="Download" style={{ padding: '0.15rem 0.4rem', background: '#4db0e5', color: '#fff', border: 'none', borderRadius: 3, cursor: 'pointer' }}><FileDown size={12} /></button>
                                <button title="Email" onClick={() => emailReport(selectedRequest.id, emp.id)} style={{ padding: '0.15rem 0.4rem', background: '#2f5183', color: '#fff', border: 'none', borderRadius: 3, cursor: 'pointer' }}><Mail size={12} /></button>
                              </div>
                            )}
                          </div>
                        ) : (
                           <input type="checkbox" disabled style={{ width: '14px', height: '14px', margin: 0 }} />
                        )}
                      </td>
                      <td style={{ padding: '0.75rem' }}>
                        <input type="checkbox" checked={!!(emp.isSelectedForAlternate || emp.is_selected_for_alternate)} disabled style={{ width: '14px', height: '14px', accentColor: '#17a2b8' }} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
