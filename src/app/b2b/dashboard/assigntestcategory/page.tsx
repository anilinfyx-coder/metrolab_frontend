'use client';
import { useEffect, useState } from 'react';
import { MdVisibility } from 'react-icons/md';
import TopNav from '../../../components/TopNav';
import ListingTable, { ActionIcons, ListingColumn } from '../../../components/ListingTable';
import ViewLabTestForm from '../../../components/ViewLabTestForm';
import { apiFetch, getToken } from '../../../../lib/api';

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

  const loadData = async () => {
    const b2bId = getUser().id;
    setLoading(true);
    try {
      const allTests = await apiFetch<LabTest[]>('/api/LabTests', {
        tokenKey: 'b2b_token',
        errorFallback: 'Unable to load lab tests.',
      });
      let access: { lab_test_id: number }[] = [];
      if (b2bId) {
        try {
          access = await apiFetch<{ lab_test_id: number }[]>(
            `/api/B2bClientLabTestAccess?b2b_client_id=${b2bId}`,
            {
              tokenKey: 'b2b_token',
              errorFallback: 'Unable to load test access.',
            },
          );
        } catch {
          access = [];
        }
      }
      const accessIds = new Set(access.map(a => Number(a.lab_test_id)));
      const list = accessIds.size > 0
        ? (allTests || []).filter(t => accessIds.has(Number(t.id)))
        : (allTests || []);
      setCategories(list);
    } catch {
      setCategories([]);
    } finally {
      setLoading(false);
    }
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
              <h2 className="listing-card-title"><MdVisibility size={18} style={{ verticalAlign: 'text-bottom', marginRight: '0.35rem' }} aria-hidden />View Form — {viewTestName}</h2>
              <button type="button" className="listing-header-link" onClick={closeView}>Close</button>
            </div>
            <div className="card-body">
              <ViewLabTestForm labTestId={viewTestId} token={getToken('b2b_token')} />
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
