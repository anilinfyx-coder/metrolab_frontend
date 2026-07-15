'use client';
import { useState, useEffect } from 'react';
import TopNav from '../../../components/TopNav';
import { Download, Eye, Trash2, X, Check, XCircle } from 'lucide-react';

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
}

export default function ManageRequestsPage() {
  const [requests, setRequests] = useState<TestRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [viewingRequest, setViewingRequest] = useState<TestRequest | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/TestRequest`, { headers: { token: getToken() } });
      const d = await res.json();
      if (d.response_code === '200') {
        setRequests(d.obj);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  const handleDelete = async (id: number) => {
    if (!confirm(`Are you sure you want to delete Test Request TR-${id}?`)) return;
    try {
      const res = await fetch(`${API}/api/TestRequest/deleteTestRequest`, {
        method: 'POST',
        headers: { token: getToken(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ id })
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

  const handleStatusChange = async (req: TestRequest, newStatus: boolean) => {
    try {
      const res = await fetch(`${API}/api/TestRequest/changeTestRequestStatus`, {
        method: 'POST',
        headers: { token: getToken(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: req.id, status: newStatus })
      });
      const d = await res.json();
      if (d.response_code === '200') {
        setViewingRequest(null);
        loadData();
      } else {
        alert(d.obj || 'Failed to update status');
      }
    } catch (err) {
      console.error(err);
      alert('Error updating status');
    }
  };

  const handleDownload = async (id: number) => {
    try {
      const res = await fetch(`${API}/api/TestRequest/downloadTestRequestReport`, {
        method: 'POST',
        headers: { token: getToken(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ id })
      });
      if (!res.ok) {
        const text = await res.text();
        console.error('Download error response:', res.status, text);
        throw new Error('Network response was not ok: ' + text);
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

  const filtered = requests.filter(r =>
    !search ||
    r.title?.toLowerCase().includes(search.toLowerCase()) ||
    r.corporateClientCompany?.toLowerCase().includes(search.toLowerCase()) ||
    `TR-${r.id}`.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="page-content">
      <TopNav title="List of Test Requests">
        <input type="text" placeholder="Search requests..." value={search} onChange={e => setSearch(e.target.value)}
          style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, padding: '0.5rem 0.75rem', color: 'var(--text)', fontSize: '0.875rem', width: 260 }} />
        <button className="btn btn-ghost" onClick={loadData} style={{ fontSize: '0.875rem' }}>🔄 Refresh</button>
      </TopNav>

      <div style={{ padding: '1.5rem' }}>
        <div className="card">
          <div className="card-body" style={{ padding: 0 }}>
            {loading ? (
              <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>Loading requests...</div>
            ) : filtered.length === 0 ? (
              <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>No test requests found.</div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border)' }}>
                    <th style={{ padding: '0.75rem 1rem', textAlign: 'left', color: 'var(--text-muted)', fontWeight: 600, whiteSpace: 'nowrap' }}>Date Time</th>
                    <th style={{ padding: '0.75rem 1rem', textAlign: 'left', color: 'var(--text-muted)', fontWeight: 600, whiteSpace: 'nowrap' }}>Request Id</th>
                    <th style={{ padding: '0.75rem 1rem', textAlign: 'left', color: 'var(--text-muted)', fontWeight: 600, whiteSpace: 'nowrap' }}>Corporate Name</th>
                    <th style={{ padding: '0.75rem 1rem', textAlign: 'left', color: 'var(--text-muted)', fontWeight: 600, whiteSpace: 'nowrap' }}>Request Title</th>
                    <th style={{ padding: '0.75rem 1rem', textAlign: 'left', color: 'var(--text-muted)', fontWeight: 600, whiteSpace: 'nowrap' }}>Status</th>
                    <th style={{ padding: '0.75rem 1rem', textAlign: 'center', color: 'var(--text-muted)', fontWeight: 600, whiteSpace: 'nowrap' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(r => (
                    <tr key={r.id} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td style={{ padding: '0.75rem 1rem', color: 'var(--text)', whiteSpace: 'nowrap' }}>
                        {r.creationTimestamp}
                      </td>
                      <td style={{ padding: '0.75rem 1rem', color: 'var(--text)', whiteSpace: 'nowrap' }}>
                        TR-{r.id}
                      </td>
                      <td style={{ padding: '0.75rem 1rem', color: 'var(--text)' }}>
                        {r.corporateClientCompany || r.b2bClientCompany || '—'}
                      </td>
                      <td style={{ padding: '0.75rem 1rem', color: 'var(--text)' }}>
                        {r.title || '—'}
                      </td>
                      <td style={{ padding: '0.75rem 1rem', color: 'var(--text)' }}>
                        {r.status === false ? 'Rejected' : (
                          r.allSubmitStatus === false ? 'Pending' : (
                            r.allSubmitStatus === true ? 'Processed' : 'Pending'
                          )
                        )}
                      </td>
                      <td style={{ padding: '0.75rem 1rem', textAlign: 'center', whiteSpace: 'nowrap' }}>
                        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
                          <button
                            title="Download Test Report"
                            onClick={() => handleDownload(r.id)}
                            className="btn btn-sm btn-info"
                            style={{ padding: '0.4rem', minWidth: '40px', background: '#4db0e5', border: 'none' }}
                          >
                            <Download className="w-4 h-4" />
                          </button>
                          <button
                            title="View Test Request"
                            onClick={() => setViewingRequest(r)}
                            className="btn btn-sm btn-primary"
                            style={{ padding: '0.4rem', minWidth: '40px', background: '#2f5183', border: 'none' }}
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            title="Delete"
                            onClick={() => handleDelete(r.id)}
                            className="btn btn-sm btn-danger"
                            style={{ padding: '0.4rem', minWidth: '40px', background: '#f00e0e', border: 'none' }}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>

      {/* View Request Modal */}
      {viewingRequest && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.5)', zIndex: 9999, display: 'flex',
          alignItems: 'center', justifyContent: 'center'
        }}>
          <div className="card" style={{ width: '100%', maxWidth: '600px', margin: '1rem', background: 'var(--bg-card)' }}>
            <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 className="card-title">Test Request Details: TR-{viewingRequest.id}</h3>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                {viewingRequest.status !== false && (
                  <button
                    onClick={() => handleStatusChange(viewingRequest, false)}
                    style={{ color: '#007eaa', background: 'none', border: 'none', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
                  >
                    <XCircle className="w-4 h-4" /> Reject
                  </button>
                )}
                {viewingRequest.status === false && (
                  <button
                    onClick={() => handleStatusChange(viewingRequest, true)}
                    style={{ color: '#aa0808', background: 'none', border: 'none', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
                  >
                    <Check className="w-4 h-4" /> Approve
                  </button>
                )}
                <span style={{ color: 'var(--border)' }}>|</span>
                <button
                  onClick={() => setViewingRequest(null)}
                  style={{ color: 'var(--text)', background: 'none', border: 'none', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
                >
                  <X className="w-4 h-4" /> Close
                </button>
              </div>
            </div>
            <div className="card-body">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Title</label>
                  <div style={{ fontSize: '0.875rem', fontWeight: 500 }}>{viewingRequest.title || 'N/A'}</div>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Corporate Name</label>
                  <div style={{ fontSize: '0.875rem', fontWeight: 500 }}>{viewingRequest.corporateClientCompany || viewingRequest.b2bClientCompany || 'N/A'}</div>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Year</label>
                  <div style={{ fontSize: '0.875rem', fontWeight: 500 }}>{viewingRequest.year || 'N/A'}</div>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Quarter</label>
                  <div style={{ fontSize: '0.875rem', fontWeight: 500 }}>{viewingRequest.quarter || 'N/A'}</div>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Total Employees</label>
                  <div style={{ fontSize: '0.875rem', fontWeight: 500 }}>{viewingRequest.numberOfEmployee || 0}</div>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Status</label>
                  <div style={{ fontSize: '0.875rem', fontWeight: 500 }}>
                    <span className={`badge ${viewingRequest.status === false ? 'badge-danger' : (viewingRequest.allSubmitStatus === true ? 'badge-success' : 'badge-warning')}`}>
                      {viewingRequest.status === false ? 'Rejected' : (viewingRequest.allSubmitStatus === false ? 'Pending' : (viewingRequest.allSubmitStatus === true ? 'Processed' : 'Pending'))}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
