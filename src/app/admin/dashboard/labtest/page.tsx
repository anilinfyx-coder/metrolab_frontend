'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import TopNav from '../../../components/TopNav';
import { useConfirm } from '../../../components/ConfirmModal';
import ListingTable, { ActionIcons, ListingColumn } from '../../../components/ListingTable';
import { formatDateTime } from '../../../utils/dateFormat';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
function getToken() { return typeof window !== 'undefined' ? localStorage.getItem('admin_token') || '' : ''; }

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

  const loadData = () => {
    setLoading(true);
    fetch(`${API}/api/WaitingList`, { headers: { token: getToken() } })
      .then(r => r.json())
      .then(d => { if (d.response_code === '200') setEntries(d.obj || []); })
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadData(); }, []);

  const remove = async (id: number) => {
    const ok = await confirmDialog({
      title: 'You are trying to remove Waiting List entry, Please confirm',
      message: 'This cannot be restored once deleted.',
      cancelText: 'NO, WAIT!',
      confirmText: 'CONFIRM DELETION',
    });
    if (!ok) return;
    await fetch(`${API}/api/WaitingList/${id}`, { method: 'DELETE', headers: { token: getToken() } });
    loadData();
  };

  return (
    <div className="page-content" style={{ paddingTop: 0 }}>
      <TopNav title="Waiting List" />

      <div style={{ padding: '1.25rem 1.5rem' }}>
        <ListingTable
          className="waiting-list-table"
          title="List of Patients/Donor"
          columns={columns}
          rows={entries}
          loading={loading}
          showTotal
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
