'use client';
import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import TopNav from '../../../../components/TopNav';
import { useConfirm } from '../../../../components/ConfirmModal';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
function getToken() {
  return typeof window !== 'undefined' ? localStorage.getItem('admin_token') || '' : '';
}

type EmployeeRow = {
  id: number;
  employee_id: number;
  first_name: string;
  last_name: string;
  mobile: string;
  department: string;
  email: string;
  is_selected_for_drug: boolean;
  is_selected_for_alcohol: boolean;
  is_selected_for_alternate: boolean;
  status: boolean;
  waiting_list_id?: number | null;
  transferred_to_waiting_list?: boolean;
  is_cancelled?: boolean;
  cancellation_reason?: string;
};

type AlternateEmployeeOption = {
  id: number;
  first_name: string;
  last_name: string;
  mobile: string;
  department: string;
  label: string;
};

const CANCELLATION_REASONS = [
  'Random',
  'Reasonable Susp.',
  'Post-Accident',
  'Return to Duty',
  'Follow-up',
  'Pre-employment',
] as const;

type TestRequestDetail = {
  id: number;
  title: string;
  reason_for_test: string;
  test_type: string;
  year: string;
  frequency: string;
  quarter: string;
  drug_count: number;
  alcohol_count: number;
  alternate_count: number;
  total_count: number;
  total_selected_count: number;
  status: boolean | null;
  creationTimestamp: string;
  corporateClientCompany?: string;
  b2bClientCompany?: string;
  employees: EmployeeRow[];
};

function formatMobile(mobile?: string) {
  if (!mobile) return '—';
  const digits = String(mobile).replace(/\D/g, '');
  if (digits.length === 10) {
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  }
  if (digits.length === 11 && digits.startsWith('1')) {
    return `(${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7)}`;
  }
  return mobile;
}

function yearFrequency(detail: TestRequestDetail) {
  const year = detail.year || '—';
  const freq = detail.frequency || '';
  const q = detail.quarter ? ` ${detail.quarter}` : '';
  if (!freq && !detail.quarter) return year;
  return `${year}/${freq}${q}`.replace(/\s+/g, ' ').trim();
}

function employeeHasSelectedTest(e: EmployeeRow) {
  return e.is_selected_for_drug || e.is_selected_for_alcohol || e.is_selected_for_alternate;
}

function canTransferEmployee(e: EmployeeRow, requestStatus: boolean | null | undefined) {
  return (
    e.status &&
    employeeHasSelectedTest(e) &&
    requestStatus !== false &&
    !e.transferred_to_waiting_list
  );
}

export default function TestRequestDetailPage() {
  const router = useRouter();
  const params = useParams();
  const id = Number(params?.id);
  const confirmDialog = useConfirm();

  const [loading, setLoading] = useState(true);
  const [detail, setDetail] = useState<TestRequestDetail | null>(null);
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [filters, setFilters] = useState({
    last_name: '',
    first_name: '',
    mobile: '',
    department: '',
  });
  const [sortKey, setSortKey] = useState<'last_name' | 'first_name' | 'mobile' | 'department'>('last_name');
  const [sortAsc, setSortAsc] = useState(true);
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [cancelEmployee, setCancelEmployee] = useState<EmployeeRow | null>(null);
  const [alternateEmployees, setAlternateEmployees] = useState<AlternateEmployeeOption[]>([]);
  const [selectedAlternateId, setSelectedAlternateId] = useState('');
  const [selectedReason, setSelectedReason] = useState('');
  const [cancelLoading, setCancelLoading] = useState(false);
  const [cancelSubmitting, setCancelSubmitting] = useState(false);

  const goBack = () => router.push('/admin/dashboard/testrequests');

  const loadDetail = async () => {
    if (!id || Number.isNaN(id)) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/TestRequest/${id}`, {
        headers: { token: getToken() },
      });
      const d = await res.json();
      if (d.response_code === '200') {
        setDetail(d.obj);
      } else {
        setMsg({ type: 'error', text: String(d.obj || 'Failed to load request') });
        setDetail(null);
      }
    } catch (err: unknown) {
      setMsg({ type: 'error', text: err instanceof Error ? err.message : 'Failed to load request' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDetail();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const filteredEmployees = useMemo(() => {
    if (!detail) return [];
    let list = [...(detail.employees || [])];

    const match = (val: string, q: string) =>
      !q.trim() || String(val || '').toLowerCase().includes(q.trim().toLowerCase());

    list = list.filter(
      (e) =>
        match(e.last_name, filters.last_name) &&
        match(e.first_name, filters.first_name) &&
        match(formatMobile(e.mobile), filters.mobile) &&
        match(e.mobile, filters.mobile) &&
        match(e.department, filters.department)
    );

    list.sort((a, b) => {
      const av = String(a[sortKey] || '').toLowerCase();
      const bv = String(b[sortKey] || '').toLowerCase();
      if (av < bv) return sortAsc ? -1 : 1;
      if (av > bv) return sortAsc ? 1 : -1;
      return 0;
    });

    return list;
  }, [detail, filters, sortKey, sortAsc]);

  const toggleSort = (key: typeof sortKey) => {
    if (sortKey === key) setSortAsc((v) => !v);
    else {
      setSortKey(key);
      setSortAsc(true);
    }
  };

  const rejectRequest = async () => {
    if (!detail) return;
    const res = await fetch(`${API}/api/TestRequest/changeTestRequestStatus`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', token: getToken() },
      body: JSON.stringify({ id: detail.id, status: false }),
    });
    const d = await res.json();
    if (d.response_code === '200') {
      setMsg({ type: 'success', text: 'Request rejected.' });
      loadDetail();
    } else {
      setMsg({ type: 'error', text: String(d.obj || 'Failed to reject') });
    }
  };

  const approveRequest = async () => {
    if (!detail) return;
    const res = await fetch(`${API}/api/TestRequest/changeTestRequestStatus`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', token: getToken() },
      body: JSON.stringify({ id: detail.id, status: true }),
    });
    const d = await res.json();
    if (d.response_code === '200') {
      setMsg({ type: 'success', text: 'Request approved.' });
      loadDetail();
    } else {
      setMsg({ type: 'error', text: String(d.obj || 'Failed to approve') });
    }
  };

  const closeCancelModal = () => {
    setCancelModalOpen(false);
    setCancelEmployee(null);
    setAlternateEmployees([]);
    setSelectedAlternateId('');
    setSelectedReason('');
    setCancelLoading(false);
    setCancelSubmitting(false);
  };

  const openCancelModal = async (employee: EmployeeRow) => {
    if (!detail) return;
    if (!employee.status || employee.is_cancelled) {
      setMsg({ type: 'error', text: 'Employee is already cancelled.' });
      return;
    }
    if (!employeeHasSelectedTest(employee)) {
      setMsg({ type: 'error', text: 'Employee is not allotted for any test.' });
      return;
    }

    setCancelEmployee(employee);
    setCancelModalOpen(true);
    setCancelLoading(true);
    setSelectedAlternateId('');
    setSelectedReason('');

    try {
      const res = await fetch(`${API}/api/TestRequest/getAlternateEmployeesForReassign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', token: getToken() },
        body: JSON.stringify({ id: employee.id }),
      });
      const d = await res.json();
      if (d.response_code === '200') {
        const list = (d.obj || []) as AlternateEmployeeOption[];
        setAlternateEmployees(list);
        if (list.length === 0) {
          setMsg({ type: 'error', text: 'No employee available in this corporate to assign' });
          closeCancelModal();
        }
      } else {
        setMsg({ type: 'error', text: String(d.obj || 'Failed to load alternate employees') });
        closeCancelModal();
      }
    } catch (err: unknown) {
      setMsg({
        type: 'error',
        text: err instanceof Error ? err.message : 'Failed to load alternate employees',
      });
      closeCancelModal();
    } finally {
      setCancelLoading(false);
    }
  };

  const submitCancellation = async () => {
    if (!cancelEmployee) return;
    if (!selectedAlternateId) {
      setMsg({ type: 'error', text: 'Please select an alternate employee.' });
      return;
    }
    if (!selectedReason) {
      setMsg({ type: 'error', text: 'Please select a reason.' });
      return;
    }

    setCancelSubmitting(true);
    try {
      const res = await fetch(`${API}/api/TestRequest/excludeAndReassignEmployee`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', token: getToken() },
        body: JSON.stringify({
          id: cancelEmployee.id,
          alternate_employee_id: Number(selectedAlternateId),
          reason: selectedReason,
        }),
      });
      const d = await res.json();
      if (d.response_code === '200') {
        setMsg({ type: 'success', text: String(d.obj?.message || 'Employee cancelled and reassigned.') });
        closeCancelModal();
        await loadDetail();
      } else {
        setMsg({
          type: 'error',
          text: String(d.obj || 'No employee available in this corporate to assign'),
        });
      }
    } catch (err: unknown) {
      setMsg({
        type: 'error',
        text: err instanceof Error ? err.message : 'Failed to cancel employee',
      });
    } finally {
      setCancelSubmitting(false);
    }
  };

  const transferEmployee = async (employee: EmployeeRow) => {
    if (!detail || !canTransferEmployee(employee, detail.status)) return;

    const ok = await confirmDialog({
      title: 'Transfer employee to waiting list',
      message: `Transfer ${employee.first_name} ${employee.last_name} to the waiting list?`,
      cancelText: 'Cancel',
      confirmText: 'Transfer',
    });
    if (!ok) return;

    const res = await fetch(`${API}/api/TestRequest/transferEmployeeToWaitingList`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', token: getToken() },
      body: JSON.stringify({ id: employee.id }),
    });
    const d = await res.json();
    if (d.response_code === '200') {
      const waitingListId = d.obj?.waiting_list_id;
      const patientUid = d.obj?.patient_uid;
      setDetail((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          employees: prev.employees.map((e) =>
            e.id === employee.id
              ? {
                  ...e,
                  transferred_to_waiting_list: true,
                  waiting_list_id: waitingListId ?? e.waiting_list_id,
                }
              : e
          ),
        };
      });
      setMsg({
        type: 'success',
        text: patientUid
          ? `Employee transferred to waiting list (UID: ${patientUid}).`
          : 'Employee transferred to waiting list.',
      });
    } else {
      setMsg({ type: 'error', text: String(d.obj || 'Failed to transfer employee') });
    }
  };

  if (!id || Number.isNaN(id)) {
    return (
      <div className="page-content" style={{ paddingTop: 0 }}>
        <TopNav title="Manage Test Requests" />
        <div style={{ padding: '1.5rem' }}>
          <p>Invalid test request.</p>
          <button type="button" className="btn btn-primary" onClick={goBack}>Back</button>
        </div>
      </div>
    );
  }

  return (
    <div className="page-content" style={{ paddingTop: 0 }}>
      <TopNav title="Manage Test Requests" />

      <div className="tr-detail-page">
        {loading ? (
          <div className="tr-detail-loading">Loading request details...</div>
        ) : !detail ? (
          <div className="card tr-detail-card">
            <div className="tr-detail-body">
              <p>{msg?.text || 'Test request not found.'}</p>
              <button type="button" className="btn btn-primary" onClick={goBack}>Back to List</button>
            </div>
          </div>
        ) : (
          <div className="card tr-detail-card">
            <div className="tr-detail-header">
              <h2 className="tr-detail-title">Test Request Details: TR-{detail.id}</h2>
              <div className="tr-detail-header-actions">
                {detail.status !== false ? (
                  <button type="button" className="tr-detail-link" onClick={rejectRequest}>
                    Reject
                  </button>
                ) : (
                  <button type="button" className="tr-detail-link" onClick={approveRequest}>
                    Approve
                  </button>
                )}
                <span className="tr-detail-sep">|</span>
                <button type="button" className="tr-detail-link" onClick={goBack}>
                  Close
                </button>
              </div>
            </div>

            <div className="tr-detail-body">
              {msg && (
                <div className={`tr-detail-msg ${msg.type === 'success' ? 'ok' : 'err'}`}>
                  {msg.text}
                </div>
              )}

              <div className="tr-detail-grid">
                <div className="tr-detail-col">
                  <div className="tr-detail-field">
                    <div className="tr-detail-label">Request Title:</div>
                    <div className="tr-detail-value">{detail.title || '—'}</div>
                  </div>
                  <div className="tr-detail-field">
                    <div className="tr-detail-label">Reason for Test:</div>
                    <div className="tr-detail-value">{detail.reason_for_test || '—'}</div>
                  </div>
                  <div className="tr-detail-field">
                    <div className="tr-detail-label">Type:</div>
                    <div className="tr-detail-value">{detail.test_type || '—'}</div>
                  </div>
                </div>
                <div className="tr-detail-col">
                  <div className="tr-detail-field">
                    <div className="tr-detail-label">Corporate Name:</div>
                    <div className="tr-detail-value">
                      {detail.corporateClientCompany || detail.b2bClientCompany || '—'}
                    </div>
                  </div>
                  <div className="tr-detail-field">
                    <div className="tr-detail-label">Test Date Time:</div>
                    <div className="tr-detail-value">{detail.creationTimestamp || '—'}</div>
                  </div>
                  <div className="tr-detail-field">
                    <div className="tr-detail-label">Year/Frequency:</div>
                    <div className="tr-detail-value">{yearFrequency(detail)}</div>
                  </div>
                </div>
              </div>

              <div className="tr-detail-divider" />

              <h3 className="tr-section-title">Random Pulling Counts</h3>
              <div className="tr-counts-row">
                <div className="tr-count-item">
                  <span className="tr-count-label">Drug Count:</span>{' '}
                  <span className="tr-count-value">{detail.drug_count ?? 0}%</span>
                </div>
                <div className="tr-count-item">
                  <span className="tr-count-label">Alcohol Count:</span>{' '}
                  <span className="tr-count-value">{detail.alcohol_count ?? 0}%</span>
                </div>
                <div className="tr-count-item">
                  <span className="tr-count-label">Alternate Count:</span>{' '}
                  <span className="tr-count-value">{detail.alternate_count ?? 0}</span>
                </div>
                <div className="tr-count-item">
                  <span className="tr-count-label">Total Selected Count:</span>{' '}
                  <span className="tr-count-value">{detail.total_selected_count ?? 0}</span>
                </div>
                <div className="tr-count-item">
                  <span className="tr-count-label">Total Employee Count:</span>{' '}
                  <span className="tr-count-value">{detail.total_count ?? detail.employees.length}</span>
                </div>
              </div>

              <div className="tr-detail-divider" />

              <h3 className="tr-section-title">Employees List</h3>

              <div className="tr-emp-table-wrap">
                <table className="tr-emp-table">
                  <thead>
                    <tr>
                      {([
                        ['last_name', 'Last Name'],
                        ['first_name', 'First Name'],
                        ['mobile', 'Mobile'],
                        ['department', 'Department'],
                      ] as const).map(([key, label]) => (
                        <th key={key}>
                          <button type="button" className="th-sort-btn" onClick={() => toggleSort(key)}>
                            {label}
                            {sortKey === key ? (
                              <span aria-hidden>{sortAsc ? '▲' : '▼'}</span>
                            ) : (
                              <span className="th-sort-hint" aria-hidden>⇅</span>
                            )}
                          </button>
                        </th>
                      ))}
                      <th>Drug</th>
                      <th>Alcohol</th>
                      <th>Alternate</th>
                      <th>Action</th>
                    </tr>
                    <tr className="tr-emp-filter-row">
                      {(['last_name', 'first_name', 'mobile', 'department'] as const).map((key) => (
                        <td key={key}>
                          <input
                            value={filters[key]}
                            onChange={(e) => setFilters((prev) => ({ ...prev, [key]: e.target.value }))}
                            aria-label={`Filter ${key}`}
                          />
                        </td>
                      ))}
                      <td /><td /><td /><td />
                    </tr>
                  </thead>
                  <tbody>
                    {filteredEmployees.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="tr-emp-empty">No employees found.</td>
                      </tr>
                    ) : (
                      filteredEmployees.map((e) => (
                        <tr key={e.id} className={e.is_cancelled ? 'tr-emp-excluded' : ''}>
                          <td>{e.last_name || '—'}</td>
                          <td>{e.first_name || '—'}</td>
                          <td>{formatMobile(e.mobile)}</td>
                          <td>{e.department || '—'}</td>
                          <td className="tr-emp-check">
                            <input type="checkbox" checked={e.is_selected_for_drug} disabled readOnly />
                          </td>
                          <td className="tr-emp-check">
                            <input type="checkbox" checked={e.is_selected_for_alcohol} disabled readOnly />
                          </td>
                          <td className="tr-emp-check">
                            <input type="checkbox" checked={e.is_selected_for_alternate} disabled readOnly />
                          </td>
                          <td>
                            {e.transferred_to_waiting_list ? (
                              <span className="tr-emp-processed">Processed</span>
                            ) : e.is_cancelled ? (
                              <span className="tr-emp-cancelled">Cancelled</span>
                            ) : !employeeHasSelectedTest(e) ? (
                              <span className="tr-emp-not-alloted">Not Alloted</span>
                            ) : (
                              <div className="listing-actions">
                                <button
                                  type="button"
                                  className="action-btn action-btn-forward"
                                  title="Transfer this employee to waiting list"
                                  disabled={!canTransferEmployee(e, detail.status)}
                                  onClick={() => transferEmployee(e)}
                                >
                                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                                    <path d="M4 18l8.5-6L4 6v12zm9-12v12l8.5-6L13 6z" />
                                  </svg>
                                </button>
                                <button
                                  type="button"
                                  className="action-btn action-btn-block"
                                  title="Exclude employee and reassign"
                                  onClick={() => openCancelModal(e)}
                                >
                                  <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.42 0-8-3.58-8-8 0-1.85.63-3.55 1.69-4.9L16.9 18.31A7.902 7.902 0 0 1 12 20zm6.31-3.1L7.1 5.69A7.902 7.902 0 0 1 12 4c4.42 0 8 3.58 8 8 0 1.85-.63 3.55-1.69 4.9z" />
                                  </svg>
                                </button>
                              </div>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>

      {cancelModalOpen && cancelEmployee && (
        <div className="modal-overlay" role="presentation" onClick={closeCancelModal}>
          <div
            className="modal tr-cancel-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="tr-cancel-modal-title"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <h2 id="tr-cancel-modal-title">Cancellation Confirmation</h2>
            </div>
            <div className="modal-body">
              <div className="tr-cancel-field">
                <label htmlFor="tr-alternate-employee">Select Alternate Employee</label>
                <select
                  id="tr-alternate-employee"
                  value={selectedAlternateId}
                  onChange={(e) => setSelectedAlternateId(e.target.value)}
                  disabled={cancelLoading || cancelSubmitting}
                >
                  <option value="">Select</option>
                  {alternateEmployees.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.label || `${emp.first_name} ${emp.last_name}`.trim()}
                    </option>
                  ))}
                </select>
              </div>
              <div className="tr-cancel-field">
                <label htmlFor="tr-cancel-reason">Reason</label>
                <select
                  id="tr-cancel-reason"
                  value={selectedReason}
                  onChange={(e) => setSelectedReason(e.target.value)}
                  disabled={cancelLoading || cancelSubmitting}
                >
                  <option value="">Select</option>
                  {CANCELLATION_REASONS.map((reason) => (
                    <option key={reason} value={reason}>
                      {reason}
                    </option>
                  ))}
                </select>
              </div>
              {cancelLoading && (
                <p className="tr-cancel-loading">Loading alternate employees...</p>
              )}
            </div>
            <div className="tr-cancel-footer">
              <button
                type="button"
                className="tr-cancel-confirm-btn"
                onClick={submitCancellation}
                disabled={cancelLoading || cancelSubmitting}
              >
                {cancelSubmitting ? 'Confirming...' : 'Confirm'}
              </button>
              <button
                type="button"
                className="tr-cancel-dismiss-btn"
                onClick={closeCancelModal}
                disabled={cancelSubmitting}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
