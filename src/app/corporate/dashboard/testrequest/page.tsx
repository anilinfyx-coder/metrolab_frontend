'use client';
import { useState, useEffect } from 'react';
import { FileDown, Mail } from 'lucide-react';
import TopNav from '../../../components/TopNav';
import { useConfirm } from '../../../components/ConfirmModal';
import ListingTable, { ListingColumn } from '../../../components/ListingTable';
import { formatDate, formatDateTime } from '../../../utils/dateFormat';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
function getToken() { return typeof window !== 'undefined' ? localStorage.getItem('corporate_token') || '' : ''; }
function getStoredUser() {
  if (typeof window === 'undefined') return null;
  try { return JSON.parse(localStorage.getItem('corporate_user') || '{}'); } catch { return {}; }
}

interface TestRequest {
  id: number;
  title: string;
  year: string;
  frequency: string;
  quarter?: string;
  allSubmitStatus?: boolean;
  creationTimestamp?: string;
  creation_timestamp?: string;
}

interface TestRequestDetail extends TestRequest {
  reasonForTest?: string;
  testType?: string;
  selectionType?: number | string;
  drugCount?: number;
  alcoholCount?: number;
  alternateCount?: number;
  totalCount?: number;
  totalSelectedCount?: number;
  corporateClientCompany?: string;
  b2bClientCompany?: string;
}

interface EmployeeRecord {
  id: number;
  employee_id?: number;
  first_name?: string;
  firstName?: string;
  last_name?: string;
  lastName?: string;
  mobile?: string;
  department?: string;
  isSelectedForDrug?: boolean;
  isSelectedForAlcohol?: boolean;
  isSelectedForAlternate?: boolean;
  is_selected_for_drug?: boolean;
  is_selected_for_alcohol?: boolean;
  is_selected_for_alternate?: boolean;
  drugReportSubmitStatus?: boolean;
  alcoholReportSubmitStatus?: boolean;
}

export default function TestRequestsPage() {
  const confirmDialog = useConfirm();
  const [requests, setRequests] = useState<TestRequest[]>([]);
  const [employees, setEmployees] = useState<EmployeeRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'LIST' | 'GENERATE' | 'VIEW'>('LIST');
  const [selectedRequest, setSelectedRequest] = useState<TestRequestDetail | null>(null);
  const [selectedRequestEmployees, setSelectedRequestEmployees] = useState<EmployeeRecord[]>([]);
  const [viewLoading, setViewLoading] = useState(false);

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
    const user = getStoredUser();
    const query = user?.id ? `?corporate_client_id=${user.id}` : '';
    const [rRes, eRes] = await Promise.all([
      fetch(`${API}/api/TestRequest/getTestRequestList`, { method: 'POST', headers: { token: getToken() } }),
      fetch(`${API}/api/Employees${query}`, { headers: { token: getToken() } })
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

  useEffect(() => {
    void Promise.resolve().then(loadData);
  }, []);

  function sortRandomlyExceptSelected(items: EmployeeRecord[], flagKey: keyof EmployeeRecord) {
    const selected = items.filter(item => item[flagKey]);
    const nonSelected = items.filter(item => !item[flagKey]);
    const shuffled = nonSelected.sort(() => Math.random() - 0.5);
    return [...shuffled, ...selected];
  }

  const generateAndSubmit = async () => {
    if (!form.title) return alert("Request Title is mandatory");
    if (!form.reasonForTest) return alert("Reason for test is mandatory");

    const total = employees.length;
    const altC = form.alternateCount || 0;
    
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

  const viewRequest = async (r: TestRequest) => {
    setSelectedRequest(r); // set basic info immediately so page shows
    setSelectedRequestEmployees([]);
    setViewLoading(true);
    setViewMode('VIEW');
    // Fetch full details including all summary fields + employees from GET /:id
    try {
      const res = await fetch(`${API}/api/TestRequest/${r.id}`, {
        headers: { token: getToken() }
      });
      const d = await res.json();
      if (d.response_code === '200') {
        const detail = d.obj;
        // Merge full detail into selectedRequest (camelCase names used by view)
        setSelectedRequest({
          id: detail.id,
          title: detail.title,
          reasonForTest: detail.reason_for_test,
          testType: detail.test_type,
          year: detail.year,
          frequency: detail.frequency,
          quarter: detail.quarter,
          selectionType: detail.selection_type,
          drugCount: detail.drug_count,
          alcoholCount: detail.alcohol_count,
          alternateCount: detail.alternate_count,
          totalCount: detail.total_count,
          totalSelectedCount: detail.total_selected_count,
          corporateClientCompany: detail.corporateClientCompany,
          b2bClientCompany: detail.b2bClientCompany,
          creationTimestamp: detail.creationTimestamp,
          allSubmitStatus: detail.status,
        });
        setSelectedRequestEmployees(detail.employees || []);
      }
    } catch (e) {
      console.error('Failed to fetch test request detail', e);
    } finally {
      setViewLoading(false);
    }
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
    } catch (error: unknown) {
      alert("Error: " + (error instanceof Error ? error.message : 'Unable to email report'));
    }
  };

  const downloadRequest = async (id: number) => {
    const res = await fetch(`${API}/api/TestRequest/downloadTestRequestReport`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', token: getToken() },
      body: JSON.stringify({ id }),
    });
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `TR-${id}-Report.pdf`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const requestColumns: ListingColumn<TestRequest>[] = [
    {
      key: 'creationTimestamp',
      label: 'Creation Timestamp',
      width: '19%',
      getValue: request => formatDateTime(request.creationTimestamp || request.creation_timestamp),
      render: request => formatDateTime(request.creationTimestamp || request.creation_timestamp),
    },
    {
      key: 'requestId',
      label: 'Request ID',
      width: '14%',
      getValue: request => `TR-${request.id}`,
      render: request => `TR-${request.id}`,
    },
    { key: 'title', label: 'Request Title', width: '20%' },
    {
      key: 'yearFrequency',
      label: 'Year/Frequency',
      width: '19%',
      getValue: request => `${request.year}/${request.frequency}${request.frequency === 'Quarter' ? ` ${request.quarter || ''}` : ''}`,
      render: request => `${request.year}/${request.frequency}${request.frequency === 'Quarter' ? ` ${request.quarter || ''}` : ''}`,
    },
    {
      key: 'status',
      label: 'Status',
      width: '14%',
      getValue: request => request.allSubmitStatus ? 'Processed' : 'Pending',
      render: request => request.allSubmitStatus ? 'Processed' : 'Pending',
    },
  ];

  const employeeDetailColumns: ListingColumn<EmployeeRecord>[] = [
    { key: 'last_name', label: 'Last Name', width: '18%' },
    { key: 'first_name', label: 'First Name', width: '18%' },
    { key: 'mobile', label: 'Mobile', width: '18%' },
    { key: 'department', label: 'Department', width: '18%' },
    {
      key: 'drug',
      label: 'Drug',
      width: '10%',
      sortable: false,
      filterable: false,
      align: 'center',
      render: employee => <input type="checkbox" checked={!!employee.isSelectedForDrug} disabled />,
    },
    {
      key: 'alcohol',
      label: 'Alcohol',
      width: '10%',
      sortable: false,
      filterable: false,
      align: 'center',
      render: employee => <input type="checkbox" checked={!!employee.isSelectedForAlcohol} disabled />,
    },
    {
      key: 'alternate',
      label: 'Alternate',
      width: '10%',
      sortable: false,
      filterable: false,
      align: 'center',
      render: employee => <input type="checkbox" checked={!!employee.isSelectedForAlternate} disabled />,
    },
  ];


  return (
    <div className="page-content">
      {viewMode === 'LIST' && (
        <>
          <TopNav title="Manage Test Request" />
          <div style={{ padding: '1.5rem 1.75rem' }}>
            <ListingTable
              className="test-requests-table corporate-test-requests-table"
              title="List of Test Requests"
              columns={requestColumns}
              rows={requests}
              loading={loading}
              emptyText="No test requests found."
              headerActions={(
                <button type="button" className="test-request-generate-button" onClick={() => setViewMode('GENERATE')}>
                  Generate Test Request
                </button>
              )}
              actionsLabel="Actions"
              actionsWidth={120}
              defaultPageSize={10}
              rowActions={request => (
                <div className="listing-actions">
                  <button
                    type="button"
                    className="action-btn action-btn-download"
                    title="Download Test Request"
                    onClick={() => downloadRequest(request.id)}
                  >
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                      <path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z" />
                    </svg>
                  </button>
                  <button
                    type="button"
                    className="action-btn action-btn-view-eye"
                    title="View Test Request"
                    onClick={() => viewRequest(request)}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" strokeLinecap="round" strokeLinejoin="round" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  </button>
                </div>
              )}
            />
          </div>
        </>
      )}

      {viewMode === 'GENERATE' && (
        <>
          <TopNav title="Manage Test Request" />
          
          <div className="card" style={{ padding: '1.5rem', marginBottom: '2rem' }}>
            <div
              className="card-header"
              style={{
                margin: '-1.5rem -1.5rem 1.5rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '1rem',
              }}
            >
              <span className="card-title">Test Request Detail</span>
              <button type="button" className="listing-header-link" onClick={() => setViewMode('LIST')}>
                Close
              </button>
            </div>
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
                <p style={{ margin: 0 }}><b>Test Date: {formatDate(new Date())}</b></p>
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

              {/* Drug / Alcohol / Alternate checkboxes â€” isolated from global form-control CSS */}
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
              <ListingTable
                className="test-requests-table test-request-employees-table"
                title={`Employees List (Total Employees: ${employees.length})`}
                columns={employeeDetailColumns}
                rows={employees}
                emptyText="No employees found."
                defaultPageSize={25}
              />
            </div>

          </div>
        </>
      )}
      {viewMode === 'VIEW' && selectedRequest && (
        <>
          <TopNav title="Manage Test Request" />

          <div className="card" style={{ padding: '1.5rem', marginBottom: '2rem' }}>
            <div
              className="card-header"
              style={{
                margin: '-1.5rem -1.5rem 1.5rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '1rem',
              }}
            >
              <span className="card-title">Test Request Detail</span>
              <button type="button" className="listing-header-link" onClick={() => setViewMode('LIST')}>
                Close
              </button>
            </div>
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
                <div style={{ fontSize: '1rem', fontWeight: 500 }}>{formatDateTime(selectedRequest.creationTimestamp)}</div>
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
                <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-muted)' }}>Pool Employees: </span>
                <span style={{ fontSize: '1rem', fontWeight: 500 }}>{selectedRequest.totalCount}</span>
              </div>
              <div>
                <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-muted)' }}>Selected Employees: </span>
                <span style={{ fontSize: '1rem', fontWeight: 500 }}>{selectedRequest.totalSelectedCount}</span>
              </div>
            </div>

            <hr style={{ borderColor: 'var(--border)', margin: '1rem 0 1.5rem' }} />

            <h3 style={{ margin: '0 0 1rem 0', fontSize: '1rem', fontWeight: 600 }}>Employees List ({selectedRequestEmployees.length} total)</h3>
            {viewLoading ? (
              <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.9rem' }}>â³ Loading employees...</div>
            ) : (
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
                                <button title="Email" onClick={() => emailReport(selectedRequest.id, emp.employee_id)} style={{ padding: '0.15rem 0.4rem', background: '#2f5183', color: '#fff', border: 'none', borderRadius: 3, cursor: 'pointer' }}><Mail size={12} /></button>
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
                                <button title="Email" onClick={() => emailReport(selectedRequest.id, emp.employee_id)} style={{ padding: '0.15rem 0.4rem', background: '#2f5183', color: '#fff', border: 'none', borderRadius: 3, cursor: 'pointer' }}><Mail size={12} /></button>
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
            )}
          </div>
        </>
      )}
    </div>
  );
}
