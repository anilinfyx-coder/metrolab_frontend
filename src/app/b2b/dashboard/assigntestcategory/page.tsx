'use client';
import { useEffect, useState } from 'react';
import TopNav from '../../../components/TopNav';
import ListingTable, { ActionIcons, ListingColumn } from '../../../components/ListingTable';
import ViewLabTestForm from '../../../components/ViewLabTestForm';

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
  const [view, setView] = useState<'list' | 'form'>('list');
  const [viewTestId, setViewTestId] = useState<number | null>(null);
  const [viewTestName, setViewTestName] = useState('');

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

  const openView = (c: LabTest) => {
    setViewTestId(c.id);
    setViewTestName(c.name || 'View Form');
    setView('form');
  };

  const closeView = () => {
    setView('list');
    setViewTestId(null);
    setViewTestName('');
  };

  if (view === 'form' && viewTestId != null) {
    return (
      <div className="page-content" style={{ paddingTop: 0 }}>
        <TopNav title="Manage Assign Test Categories" />
        <div style={{ padding: '1.25rem 1.5rem' }}>
          <div className="card">
            <div className="listing-card-header">
              <h2 className="listing-card-title">👁 View Form — {viewTestName}</h2>
              <button type="button" className="listing-header-link" onClick={closeView}>Close</button>
            </div>
            <div className="card-body">
              <ViewLabTestForm labTestId={viewTestId} token={getToken()} />
            </div>
          </div>
        </div>
      </div>
    );
  }

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
            <ActionIcons onView={() => openView(c)} />
          )}
          actionsLabel="View Form"
          actionsWidth={110}
        />
      </div>
    </div>
  );
}
