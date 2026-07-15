'use client';
import { useEffect, useState } from 'react';
import TopNav from '../../../components/TopNav';
import ListingTable, { ActionIcons, ListingColumn } from '../../../components/ListingTable';
import ViewLabTestFormModal from '../../../components/ViewLabTestFormModal';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
function getToken() { return typeof window !== 'undefined' ? localStorage.getItem('b2b_token') || '' : ''; }
function getUser() { return typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('b2b_user') || '{}') : {}; }

interface LabTest {
  id: number;
  name: string;
  description?: string;
}

const columns: ListingColumn<LabTest>[] = [
  { key: 'name', label: 'Name', sortable: true },
  { key: 'description', label: 'Description', sortable: true },
];

export default function AssignedTestCategoryPage() {
  const [categories, setCategories] = useState<LabTest[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewTestId, setViewTestId] = useState<number | null>(null);

  const loadData = () => {
    const b2bId = getUser().id;
    setLoading(true);

    Promise.all([
      fetch(`${API}/api/LabTests`, { headers: { token: getToken() } }).then(r => r.json()),
      b2bId
        ? fetch(`${API}/api/B2bClientLabTestAccess?b2b_client_id=${b2bId}`, { headers: { token: getToken() } }).then(r => r.json())
        : Promise.resolve({ response_code: '200', obj: [] }),
    ])
      .then(([testsRes, accessRes]) => {
        const allTests: LabTest[] = testsRes.response_code === '200' ? (testsRes.obj || []) : [];
        const access = accessRes.response_code === '200' ? (accessRes.obj || []) : [];
        const accessIds = new Set(access.map((a: any) => Number(a.lab_test_id)));
        const list = accessIds.size > 0
          ? allTests.filter(t => accessIds.has(Number(t.id)))
          : allTests;
        setCategories(list);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadData(); }, []);

  return (
    <div className="page-content" style={{ paddingTop: 0 }}>
      <TopNav title="Manage Assign Test Categories" />

      <div style={{ padding: '1.25rem 1.5rem' }}>
        <ListingTable
          title="List of Assign Test Categories"
          columns={columns}
          rows={categories}
          loading={loading}
          emptyText="No assigned test categories found."
          rowActions={(c) => (
            <ActionIcons onView={() => setViewTestId(c.id)} />
          )}
          actionsLabel="View Form"
          actionsWidth={110}
        />
      </div>

      {viewTestId != null && (
        <ViewLabTestFormModal
          labTestId={viewTestId}
          token={getToken()}
          onClose={() => setViewTestId(null)}
        />
      )}
    </div>
  );
}
