'use client';
import { useEffect, useState, type ReactNode } from 'react';
import Link from 'next/link';
import {
  MdAssignment,
  MdBadge,
  MdHourglassEmpty,
} from 'react-icons/md';
import TopNav from '../../components/TopNav';
import PageLoader from '../../components/PageLoader';
import { formatDate } from '../../utils/dateFormat';
import { apiFetch } from '../../../lib/api';

function getUser() {
  if (typeof window !== 'undefined') {
    const userStr = localStorage.getItem('corporate_user');
    if (userStr) return JSON.parse(userStr);
  }
  return null;
}

export default function CorporateDashboard() {
  const [user, setUser] = useState<any>(null);
  const [employees, setEmployees] = useState<any[]>([]);
  const [testRequests, setTestRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const currentUser = getUser();
        setUser(currentUser);

        if (currentUser?.id) {
          const [empList, trList] = await Promise.all([
            apiFetch<unknown[]>(`/api/Employees?corporate_client_id=${currentUser.id}&status=true`, {
              tokenKey: 'corporate_token',
            }).catch(() => []),
            apiFetch<unknown[]>(`/api/TestRequest?corporate_client_id=${currentUser.id}`, {
              tokenKey: 'corporate_token',
            }).catch(() => []),
          ]);

          setEmployees((empList as any[]) || []);
          setTestRequests((trList as any[]) || []);
        }
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const recentEmployees = employees.slice(0, 5);
  const recentTestRequests = testRequests.slice(0, 5);
  const pendingRequests = testRequests.filter(tr => tr.status !== 'Completed').length;

  return (
    <>
      <TopNav title="Dashboard" />

      <div className="page-content" style={{ backgroundColor: '#f0f4f8', minHeight: 'calc(100vh - 70px)' }}>
        {loading ? (
          <div className="page-body">
            <PageLoader message="Loading your dashboard..." size="lg" />
          </div>
        ) : (
          <div className="page-body">
            
            {/* KPI Cards section */}
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 200px), 1fr))', 
              gap: '20px', 
              marginBottom: '30px' 
            }}>
              <DashboardCard 
                title="Total Employees" 
                value={employees.length} 
                icon={<MdBadge size={28} aria-hidden />}
                gradient="linear-gradient(135deg, #0072ff 0%, #00c6ff 100%)" 
              />
              <DashboardCard 
                title="Total Test Requests" 
                value={testRequests.length} 
                icon={<MdAssignment size={28} aria-hidden />}
                gradient="linear-gradient(135deg, #8E2DE2 0%, #4A00E0 100%)" 
              />
              <DashboardCard 
                title="Pending Tests" 
                value={pendingRequests} 
                icon={<MdHourglassEmpty size={28} aria-hidden />}
                gradient="linear-gradient(135deg, #f12711 0%, #f5af19 100%)" 
              />
            </div>

            {/* Tables Section */}
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 320px), 1fr))', 
              gap: '24px' 
            }}>
              
              {/* Recent Test Requests */}
              <div className="card" style={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 30px rgba(0,0,0,0.05)', backgroundColor: '#fff' }}>
                <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #edf2f9', borderRadius: '12px 12px 0 0', padding: '20px' }}>
                  <h3 className="card-title" style={{ margin: 0, fontSize: '1.1rem', color: '#1e293b' }}>Recent Test Requests</h3>
                  <Link href="/corporate/dashboard/testrequest" style={{ fontSize: '0.85rem', color: '#3b82f6', textDecoration: 'none', fontWeight: 600 }}>
                    View All →
                  </Link>
                </div>
                <div className="card-body" style={{ padding: 0 }}>
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
                      <thead>
                        <tr style={{ backgroundColor: '#f8fafc', color: '#64748b', textAlign: 'left' }}>
                          <th style={{ padding: '12px 20px', fontWeight: 700, color: '#64748b' }}>Request ID</th>
                          <th style={{ padding: '12px 20px', fontWeight: 700, color: '#64748b' }}>Title</th>
                          <th style={{ padding: '12px 20px', fontWeight: 700, color: '#64748b' }}>Employees</th>
                          <th style={{ padding: '12px 20px', fontWeight: 700, color: '#64748b' }}>Date</th>
                        </tr>
                      </thead>
                      <tbody>
                        {recentTestRequests.length === 0 ? (
                          <tr><td colSpan={4} style={{ padding: '20px', textAlign: 'center', color: '#94a3b8' }}>No recent test requests found.</td></tr>
                        ) : (
                          recentTestRequests.map((tr, i) => (
                            <tr key={i} style={{ borderBottom: '1px solid #edf2f9', transition: 'background-color 0.2s' }}>
                              <td style={{ padding: '16px 20px', color: '#3b82f6', fontWeight: 500 }}>#{tr.id}</td>
                              <td style={{ padding: '16px 20px', color: '#334155', fontWeight: 500 }}>{tr.title || 'N/A'}</td>
                              <td style={{ padding: '16px 20px', color: '#475569' }}>{tr.numberOfEmployee || 0}</td>
                              <td style={{ padding: '16px 20px', color: '#64748b', fontSize: '0.85rem', whiteSpace: 'nowrap' }}>
                                {tr.creation_timestamp ? formatDate(tr.creation_timestamp) : (tr.creationTimestamp || 'N/A')}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              {/* Recent Employees */}
              <div className="card" style={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 30px rgba(0,0,0,0.05)', backgroundColor: '#fff' }}>
                <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #edf2f9', borderRadius: '12px 12px 0 0', padding: '20px' }}>
                  <h3 className="card-title" style={{ margin: 0, fontSize: '1.1rem', color: '#1e293b' }}>Recently Added Employees</h3>
                  <Link href="/corporate/dashboard/employee" style={{ fontSize: '0.85rem', color: '#3b82f6', textDecoration: 'none', fontWeight: 600 }}>
                    View All →
                  </Link>
                </div>
                <div className="card-body" style={{ padding: 0 }}>
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
                      <thead>
                        <tr style={{ backgroundColor: '#f8fafc', color: '#64748b', textAlign: 'left' }}>
                          <th style={{ padding: '12px 20px', fontWeight: 700, color: '#64748b' }}>Employee ID</th>
                          <th style={{ padding: '12px 20px', fontWeight: 700, color: '#64748b' }}>Name</th>
                          <th style={{ padding: '12px 20px', fontWeight: 700, color: '#64748b' }}>Department</th>
                          <th style={{ padding: '12px 20px', fontWeight: 700, color: '#64748b' }}>Added Date</th>
                        </tr>
                      </thead>
                      <tbody>
                        {recentEmployees.length === 0 ? (
                          <tr><td colSpan={4} style={{ padding: '20px', textAlign: 'center', color: '#94a3b8' }}>No employees found.</td></tr>
                        ) : (
                          recentEmployees.map((emp, i) => (
                            <tr key={i} style={{ borderBottom: '1px solid #edf2f9', transition: 'background-color 0.2s' }}>
                              <td style={{ padding: '16px 20px', color: '#10b981', fontWeight: 500 }}>{emp.employee_id || emp.id}</td>
                              <td style={{ padding: '16px 20px', color: '#334155' }}>
                                <div style={{ fontWeight: 500 }}>{emp.first_name} {emp.last_name}</div>
                                <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>{emp.email}</div>
                              </td>
                              <td style={{ padding: '16px 20px', color: '#64748b' }}>
                                <span style={{ 
                                  backgroundColor: '#f1f5f9', 
                                  color: '#475569',
                                  padding: '4px 8px',
                                  borderRadius: '4px',
                                  fontSize: '0.75rem',
                                  fontWeight: 600,
                                }}>
                                  {emp.department || 'General'}
                                </span>
                              </td>
                              <td style={{ padding: '16px 20px', color: '#64748b', fontSize: '0.85rem', whiteSpace: 'nowrap' }}>
                                 {emp.creation_timestamp ? formatDate(emp.creation_timestamp) : 'N/A'}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

            </div>
          </div>
        )}
      </div>
    </>
  );
}

function DashboardCard({ title, value, icon, gradient }: { title: string, value: number, icon: ReactNode, gradient: string }) {
  return (
    <div style={{
      background: '#fff',
      borderRadius: '16px',
      padding: '24px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: '12px',
      boxShadow: '0 4px 20px rgba(0,0,0,0.03)',
      transition: 'transform 0.3s ease, box-shadow 0.3s ease',
      cursor: 'default',
      position: 'relative',
      overflow: 'hidden',
      minWidth: 0,
    }}
    onMouseEnter={(e) => {
      e.currentTarget.style.transform = 'translateY(-5px)';
      e.currentTarget.style.boxShadow = '0 10px 25px rgba(0,0,0,0.08)';
    }}
    onMouseLeave={(e) => {
      e.currentTarget.style.transform = 'translateY(0)';
      e.currentTarget.style.boxShadow = '0 4px 20px rgba(0,0,0,0.03)';
    }}
    >
      <div style={{
        position: 'absolute',
        top: 0, left: 0, width: '100%', height: '4px',
        background: gradient
      }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ color: '#64748b', fontSize: '0.9rem', fontWeight: 600, marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
          {title}
        </div>
        <div style={{ color: '#0f172a', fontSize: '2rem', fontWeight: 800, lineHeight: 1 }}>
          {Number(value || 0).toLocaleString()}
        </div>
      </div>
      <div style={{
        width: '56px', height: '56px',
        borderRadius: '12px',
        background: gradient,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: '#fff',
        boxShadow: '0 4px 15px rgba(0,0,0,0.1)',
        flexShrink: 0,
      }}>
        {icon}
      </div>
    </div>
  );
}
