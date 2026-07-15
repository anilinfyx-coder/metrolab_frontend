'use client';
import { useState, useEffect } from 'react';
import TopNav from '../../../components/TopNav';
import { useConfirm } from '../../../components/ConfirmModal';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
function getToken() { return typeof window !== 'undefined' ? localStorage.getItem('corporate_token') || '' : ''; }

export default function TestRequestsPage() {
  const confirmDialog = useConfirm();
  const [requests, setRequests] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'LIST' | 'GENERATE'>('LIST');

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

  return (
    <div className="page-content">
      {viewMode === 'LIST' && (
        <>
          <TopNav title="List of Test Requests">
          <button className="btn btn-primary" onClick={() => setViewMode('GENERATE')}>Generate Test Request</button>
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
                      <td style={{ padding: '0.75rem', display: 'flex', gap: '0.5rem' }}>
                        <button className="btn btn-ghost" style={{ padding: '0.25rem 0.5rem', color: '#ef4444' }} onClick={() => remove(r.id)}>Delete</button>
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
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
              <div className="form-group" style={{ gridColumn: 'span 2' }}>
                <label>Request Title *</label>
                <input type="text" placeholder="Enter Title" value={form.title} onChange={e => setForm({...form, title: e.target.value})} />
              </div>
              <div className="form-group">
                <label>Year *</label>
                <input type="text" disabled value={form.year} />
              </div>
              <div className="form-group">
                <label>Frequency *</label>
                <select value={form.frequency} onChange={e => setForm({...form, frequency: e.target.value})}>
                  <option value="Quarter">Quarter</option>
                  <option value="Annual">Annual</option>
                </select>
              </div>
              <div className="form-group">
                <label>Test Type *</label>
                <select value={form.testType} onChange={e => setForm({...form, testType: e.target.value})}>
                  <option value="DOT">DOT</option>
                  <option value="Non-DOT">Non-DOT</option>
                </select>
              </div>
              {form.frequency === 'Quarter' && (
                <div className="form-group">
                  <label>Quarter *</label>
                  <select value={form.quarter} onChange={e => setForm({...form, quarter: e.target.value})}>
                    <option value="1">1st</option><option value="2">2nd</option>
                    <option value="3">3rd</option><option value="4">4th</option>
                  </select>
                </div>
              )}
              <div className="form-group" style={{ gridColumn: 'span 3' }}>
                <label>Reason for Test *</label>
                <input type="text" placeholder="Enter Reason for Test" value={form.reasonForTest} onChange={e => setForm({...form, reasonForTest: e.target.value})} />
              </div>
            </div>

            <hr style={{ margin: '2rem 0', borderColor: 'var(--border)' }} />

            <div style={{ display: 'flex', alignItems: 'center', gap: '2rem', marginBottom: '1.5rem' }}>
              <div className="form-group" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <label style={{ margin: 0 }}>Set Selection Type</label>
                <select style={{ width: '150px' }} value={form.selectionType} onChange={e => setForm({...form, selectionType: e.target.value})}>
                  <option value="1">Number</option>
                  <option value="2">Percentage</option>
                </select>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem' }}>
              <div>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem', fontWeight: 500 }}>
                  <input type="checkbox" checked={form.isDrugSelected} onChange={e => setForm({...form, isDrugSelected: e.target.checked})} />
                  Drug
                </label>
                {form.isDrugSelected && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <input type="number" style={{ width: '100px' }} value={form.drugCount} onChange={e => setForm({...form, drugCount: Number(e.target.value)})} />
                    {form.selectionType === '2' && <span>%</span>}
                  </div>
                )}
              </div>
              
              <div>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem', fontWeight: 500 }}>
                  <input type="checkbox" checked={form.isAlcoholSelected} onChange={e => setForm({...form, isAlcoholSelected: e.target.checked})} />
                  Alcohol
                </label>
                {form.isAlcoholSelected && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <input type="number" style={{ width: '100px' }} value={form.alcoholCount} onChange={e => setForm({...form, alcoholCount: Number(e.target.value)})} />
                    {form.selectionType === '2' && <span>%</span>}
                  </div>
                )}
              </div>

              <div>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem', fontWeight: 500 }}>
                  <input type="checkbox" checked={form.isAlternateSelected} onChange={e => setForm({...form, isAlternateSelected: e.target.checked})} />
                  Alternate
                </label>
                {form.isAlternateSelected && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <input type="number" style={{ width: '100px' }} value={form.alternateCount} onChange={e => setForm({...form, alternateCount: Number(e.target.value)})} />
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', alignItems: 'end' }}>
                <button className="btn btn-primary" onClick={generateAndSubmit} disabled={saving}>
                  {saving ? 'Processing...' : 'Select & Submit'}
                </button>
              </div>
            </div>

          </div>

          <div className="card" style={{ padding: '1rem' }}>
            <h3 style={{ margin: '0 0 1rem 0' }}>Employees List (Total: {employees.length})</h3>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                  <th style={{ padding: '0.75rem', textAlign: 'left' }}>First Name</th>
                  <th style={{ padding: '0.75rem', textAlign: 'left' }}>Last Name</th>
                  <th style={{ padding: '0.75rem', textAlign: 'left' }}>Mobile</th>
                </tr>
              </thead>
              <tbody>
                {employees.map(e => (
                  <tr key={e.id} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: '0.75rem' }}>{e.first_name}</td>
                    <td style={{ padding: '0.75rem' }}>{e.last_name}</td>
                    <td style={{ padding: '0.75rem' }}>{e.mobile}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
