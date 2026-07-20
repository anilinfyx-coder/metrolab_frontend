'use client';
import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { MdBlock, MdForward } from 'react-icons/md';
import TopNav from '../../../../components/TopNav';
import { useConfirm } from '../../../../components/ConfirmModal';
import { formatDateTime } from '../../../../utils/dateFormat';
import { handleApiResponse, toastApiError, toastApiSuccess, getToken, API_BASE } from '../../../../../lib/api';

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
  const [loadError, setLoadError] = useState<string | null>(null);
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
    setLoadError(null);
    try {
      const res = await fetch(`${API_BASE}/api/TestRequest/${id}`, {
        headers: { token: getToken('admin_token') },
      });
      const obj = await handleApiResponse<TestRequestDetail>(res, {
        errorFallback: 'Failed to load request',
      });
      setDetail(obj);
    } catch (err: unknown) {
      setLoadError(err instanceof Error ? err.message : 'Failed to load request');
      setDetail(null);
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
    try {
      const res = await fetch(`${API_BASE}/api/TestRequest/changeTestRequestStatus`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', token: getToken('admin_token') },
        body: JSON.stringify({ id: detail.id, status: false }),
      });
      await handleApiResponse(res, {
        successMessage: 'Request rejected.',
        errorFallback: 'Failed to reject',
      });
      loadDetail();
    } catch {
      // Error toast handled by handleApiResponse
    }
  };

  const approveRequest = async () => {
    if (!detail) return;
    try {
      const res = await fetch(`${API_BASE}/api/TestRequest/changeTestRequestStatus`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', token: getToken('admin_token') },
        body: JSON.stringify({ id: detail.id, status: true }),
      });
      await handleApiResponse(res, {
        successMessage: 'Request approved.',
        errorFallback: 'Failed to approve',
      });
      loadDetail();
    } catch {
      // Error toast handled by handleApiResponse
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
      toastApiError('Employee is already cancelled.');
      return;
    }
    if (!employeeHasSelectedTest(employee)) {
      toastApiError('Employee is not allotted for any test.');
      return;
    }

    setCancelEmployee(employee);
    setCancelModalOpen(true);
    setCancelLoading(true);
    setSelectedAlternateId('');
    setSelectedReason('');

    try {
      const res = await fetch(`${API_BASE}/api/TestRequest/getAlternateEmployeesForReassign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', token: getToken('admin_token') },
        body: JSON.stringify({ id: employee.id }),
      });
      const list = await handleApiResponse<AlternateEmployeeOption[]>(res, {
        errorFallback: 'Failed to load alternate employees',
      });
      setAlternateEmployees(list || []);
      if (!list || list.length === 0) {
        toastApiError('No employee available in this corporate to assign');
        closeCancelModal();
      }
    } catch {
      closeCancelModal();
    } finally {
      setCancelLoading(false);
    }
  };

  const submitCancellation = async () => {
    if (!cancelEmployee) return;
    if (!selectedAlternateId) {
      toastApiError('Please select an alternate employee.');
      return;
    }
    if (!selectedReason) {
      toastApiError('Please select a reason.');
      return;
    }

    setCancelSubmitting(true);
    try {
      const res = await fetch(`${API_BASE}/api/TestRequest/excludeAndReassignEmployee`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', token: getToken('admin_token') },
        body: JSON.stringify({
          id: cancelEmployee.id,
          alternate_employee_id: Number(selectedAlternateId),
          reason: selectedReason,
        }),
      });
      const result = await handleApiResponse<{ message?: string }>(res, {
        errorFallback: 'No employee available in this corporate to assign',
      });
      toastApiSuccess(String(result?.message || 'Employee cancelled and reassigned.'));
      closeCancelModal();
      await loadDetail();
    } catch {
      // Error toast handled by handleApiResponse
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

    try {
      const res = await fetch(`${API_BASE}/api/TestRequest/transferEmployeeToWaitingList`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', token: getToken('admin_token') },
        body: JSON.stringify({ id: employee.id }),
      });
      const result = await handleApiResponse<{ waiting_list_id?: number; patient_uid?: string }>(res, {
        errorFallback: 'Failed to transfer employee',
      });
      const waitingListId = result?.waiting_list_id;
      const patientUid = result?.patient_uid;
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
      toastApiSuccess(
        patientUid
          ? `Employee transferred to waiting list (UID: ${patientUid}).`
          : 'Employee transferred to waiting list.',
      );
    } catch {
      // Error toast handled by handleApiResponse
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
              <p>{loadError || 'Test request not found.'}</p>
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
                    <div className="tr-detail-value">{formatDateTime(detail.creationTimestamp)}</div>
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
                                  <MdForward size={16} aria-hidden />
                                </button>
                                <button
                                  type="button"
                                  className="action-btn action-btn-block"
                                  title="Exclude employee and reassign"
                                  onClick={() => openCancelModal(e)}
                                >
                                  <MdBlock size={15} aria-hidden />
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
