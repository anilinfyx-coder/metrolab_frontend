'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import TopNav from '../../../components/TopNav';
import ListingTable, { ActionIcons, ListingColumn } from '../../../components/ListingTable';
import { useConfirm } from '../../../components/ConfirmModal';
import { formatDateTime } from '../../../utils/dateFormat';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
function getToken() { return typeof window !== 'undefined' ? localStorage.getItem('admin_token') || '' : ''; }

interface TestRequest {
  id: number;
  title: string;
  year: string;
  quarter: string;
  frequency: string;
  status: boolean | null;
  allSubmitStatus: boolean | null;
  numberOfEmployee: number;
  corporateClientCompany: string;
  b2bClientCompany: string;
  creationTimestamp: string;
  creation_timestamp?: string;
}

function statusLabel(r: TestRequest) {
  if (r.status === false) return 'Rejected';
  if (r.allSubmitStatus === true || r.status === true) return 'Processed';
  return 'Pending';
}

export default function ManageRequestsPage() {
  const router = useRouter();
  const confirmDialog = useConfirm();
  const [requests, setRequests] = useState<TestRequest[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/TestRequest`, { headers: { token: getToken() } });
      const d = await res.json();
      if (d.response_code === '200') {
        setRequests(d.obj || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  const handleDelete = async (id: number) => {
    const ok = await confirmDialog({
      title: 'You are trying to remove Test Request, Please confirm',
      message: `Delete TR-${id}? This cannot be restored once deleted.`,
      cancelText: 'NO, WAIT!',
      confirmText: 'CONFIRM DELETION',
    });
    if (!ok) return;
    try {
      const res = await fetch(`${API}/api/TestRequest/deleteTestRequest`, {
        method: 'POST',
        headers: { token: getToken(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      const d = await res.json();
      if (d.response_code === '200') {
        loadData();
      } else {
        alert(d.obj || 'Failed to delete');
      }
    } catch (err) {
      console.error(err);
      alert('Error deleting test request');
    }
  };

  const handleDownload = async (id: number) => {
    try {
      const res = await fetch(`${API}/api/TestRequest/downloadTestRequestReport`, {
        method: 'POST',
        headers: { token: getToken(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      if (!res.ok) {
        throw new Error('Network response was not ok');
      }

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `TR-${id}-Report.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
      alert('Error downloading report');
    }
  };

  const columns: ListingColumn<TestRequest>[] = [
    {
      key: 'creationTimestamp',
      label: 'Date Time',
      sortable: true,
      filterable: true,
      width: '20%',
      getValue: (row) => formatDateTime(row.creationTimestamp || row.creation_timestamp),
      render: (row) => formatDateTime(row.creationTimestamp || row.creation_timestamp),
    },
    {
      key: 'requestId',
      label: 'Request ID',
      sortable: true,
      filterable: true,
      width: '12%',
      getValue: (row) => `TR-${row.id}`,
      render: (row) => `TR-${row.id}`,
    },
    {
      key: 'corporateName',
      label: 'Corporate Name',
      sortable: true,
      filterable: true,
      width: '22%',
      getValue: (row) => row.corporateClientCompany || row.b2bClientCompany || '',
      render: (row) => row.corporateClientCompany || row.b2bClientCompany || '—',
    },
    {
      key: 'title',
      label: 'Request Title',
      sortable: true,
      filterable: true,
      width: '22%',
      getValue: (row) => row.title || '',
      render: (row) => row.title || '—',
    },
    {
      key: 'statusLabel',
      label: 'Status',
      sortable: true,
      filterable: true,
      width: '12%',
      getValue: (row) => statusLabel(row),
      render: (row) => statusLabel(row),
    },
  ];

  return (
    <div className="page-content" style={{ paddingTop: 0 }}>
      <TopNav title="Manage Test Requests" />

      <div style={{ padding: '1.5rem 1.75rem' }}>
        <ListingTable
          className="test-requests-table"
          title="List of Test Requests"
          columns={columns}
          rows={requests}
          loading={loading}
          emptyText="No test requests found."
          actionsLabel="Actions"
          actionsWidth={140}
          defaultPageSize={25}
          rowActions={(r) => (
            <ActionIcons
              onDownload={() => handleDownload(r.id)}
              downloadTitle="Download Test Report"
              onView={() => router.push(`/admin/dashboard/testrequests/${r.id}`)}
              viewTitle="View Test Request"
              onDelete={() => handleDelete(r.id)}
              deleteTitle="Delete"
            />
          )}
        />
      </div>
    </div>
  );
}
