'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import TopNav from '../../../components/TopNav';
import { useConfirm } from '../../../components/ConfirmModal';
import ListingTable, { ActionIcons, ListingColumn } from '../../../components/ListingTable';
import { formatDateTime } from '../../../utils/dateFormat';
import { apiFetch, handleApiResponse, getToken, API_BASE } from '../../../../lib/api';
import { buildPageQuery, isPaginatedResult, PaginatedResult } from '../../../../lib/pagination';

interface WaitingEntry {
  id: number;
  patient_id: number;
  patient_name: string;
  patient_mobile: string;
  patient_uid: string;
  reason_for_test: string;
  requisition_no: string;
  creation_timestamp: string;
  status: boolean;
  tests?: string;
  test_count?: number;
}

const columns: ListingColumn<WaitingEntry>[] = [
  {
    key: 'creation_timestamp',
    label: 'Date Time',
    sortable: false,
    filterable: false,
    width: 160,
    getValue: (row) => formatDateTime(row.creation_timestamp),
  },
  {
    key: 'patient_uid',
    label: 'Patient/Donor UID',
    sortable: true,
    filterable: true,
    width: 140,
    getValue: (row) => row.patient_uid || '',
  },
  {
    key: 'patient_name',
    label: 'Name',
    sortable: true,
    filterable: true,
    width: 130,
    getValue: (row) => row.patient_name || (row.patient_id ? `Patient #${row.patient_id}` : ''),
  },
  {
    key: 'tests',
    label: 'Tests',
    sortable: false,
    filterable: false,
    width: '48%',
    getValue: (row) => {
      const t = (row.tests || '').trim();
      if (!t) return '';
      return t.endsWith('.') ? t : `${t}.`;
    },
  },
  {
    key: 'test_count',
    label: 'Test Count',
    sortable: false,
    filterable: false,
    width: 100,
    align: 'center',
    getValue: (row) => row.test_count ?? 0,
  },
];

export default function WaitingListPage() {
  const router = useRouter();
  const confirmDialog = useConfirm();
  const [entries, setEntries] = useState<WaitingEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [total, setTotal] = useState(0);

  const loadData = async (p = page, ps = pageSize) => {
    setLoading(true);
    try {
      const result = await apiFetch<PaginatedResult<WaitingEntry> | WaitingEntry[]>(
        `/api/WaitingList?${buildPageQuery(p, ps)}`,
        {
          tokenKey: 'admin_token',
          errorFallback: 'Failed to load waiting list.',
        },
      );
      if (isPaginatedResult<WaitingEntry>(result)) {
        setEntries(result.items);
        setTotal(result.total);
      } else {
        setEntries(result || []);
        setTotal((result || []).length);
      }
    } catch {
      setEntries([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(page, pageSize); }, [page, pageSize]);

  const remove = async (id: number) => {
    const ok = await confirmDialog({
      title: 'You are trying to remove Waiting List entry, Please confirm',
      message: 'This cannot be restored once deleted.',
      cancelText: 'NO, WAIT!',
      confirmText: 'CONFIRM DELETION',
    });
    if (!ok) return;
    try {
      const res = await fetch(`${API_BASE}/api/WaitingList/${id}`, {
        method: 'DELETE',
        headers: { token: getToken('admin_token') },
      });
      await handleApiResponse(res, {
        successMessage: 'Waiting list entry deleted successfully.',
        errorFallback: 'Failed to delete waiting list entry.',
      });
      loadData(page, pageSize);
    } catch {
      // Error toast handled by handleApiResponse
    }
  };

  return (
    <div className="page-content" style={{ paddingTop: 0 }}>
      <TopNav title="Waiting List" />

      <div className="page-body">
        <ListingTable
          className="waiting-list-table"
          title="List of Patients/Donor"
          columns={columns}
          rows={entries}
          loading={loading}
          showTotal
          paginationMode="server"
          page={page}
          pageSize={pageSize}
          total={total}
          onPageChange={setPage}
          onPageSizeChange={(size) => { setPageSize(size); setPage(1); }}
          emptyText="Waiting list is empty. Add patients from Patient Demographic."
          actionsLabel="Actions"
          actionsWidth={100}
          rowActions={(e) => (
            <ActionIcons
              deleteFirst
              editVariant="outline"
              editTitle="Edit / Apply Test"
              onDelete={() => remove(e.id)}
              onEdit={() => router.push(`/admin/dashboard/labtest/${e.id}`)}
            />
          )}
        />
      </div>
    </div>
  );
}
