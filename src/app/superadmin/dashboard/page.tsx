'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import TopNav from '../../components/TopNav';
import { formatDate } from '../../utils/dateFormat';
import { apiFetch } from '../../../lib/api';

export default function SuperAdminDashboard() {
  const [stats, setStats] = useState<any>(null);
  const [recentPatients, setRecentPatients] = useState<any[]>([]);
  const [recentTests, setRecentTests] = useState<any[]>([]);
  const [recentB2BClients, setRecentB2BClients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = getToken();
        const headers = { token, 'Content-Type': 'application/json' };
        
        // Fetch stats
        const statsRes = await fetch(`${API_BASE}/api/SuperAdmin/dashboardStats`, { headers });
        const statsData = await statsRes.json();
        if (statsData.response_code === '200') setStats(statsData.obj);

        // Fetch recent patients
        const patientsRes = await fetch(`${API_BASE}/api/Patient`, { headers });
        const patientsData = await patientsRes.json();
        if (patientsData.response_code === '200') {
          setRecentPatients(patientsData.obj.slice(0, 5));
        }

        // Fetch recent tests
        const testsRes = await fetch(`${API_BASE}/api/WaitingList`, { headers });
        const testsData = await testsRes.json();
        if (testsData.response_code === '200') {
          setRecentTests(testsData.obj.slice(0, 5));
        }

        // Fetch recent B2B clients
        const b2bRes = await fetch(`${API_BASE}/api/B2bClients`, { headers });
        const b2bData = await b2bRes.json();
        if (b2bData.response_code === '200') {
          setRecentB2BClients(b2bData.obj.slice(0, 5));
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, []);

  return (
    <>
      <TopNav title="Dashboard" />

      <div className="page-content" style={{ backgroundColor: '#f0f4f8' }}>
        {loading ? (
          <div style={{ padding: '20px', color: 'var(--text-muted)' }}>Loading dashboard...</div>
        ) : (
          <div style={{ maxWidth: '1400px', margin: '0 auto', width: '100%' }}>
            
            {/* KPI Cards section */}
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', 
              gap: '20px', 
              marginBottom: '30px' 
            }}>
              <DashboardCard 
                title="Total Staff" 
                value={stats?.total_staff || 0} 
                icon="👥" 
                gradient="linear-gradient(135deg, #0072ff 0%, #00c6ff 100%)" 
              />
              <DashboardCard 
                title="B2B Clients" 
                value={stats?.total_b2b_clients || 0} 
                icon="🏢" 
                gradient="linear-gradient(135deg, #11998e 0%, #38ef7d 100%)" 
              />
              <DashboardCard 
                title="Corporate Clients" 
                value={stats?.total_corporate_clients || 0} 
                icon="🤝" 
                gradient="linear-gradient(135deg, #8E2DE2 0%, #4A00E0 100%)" 
              />
              <DashboardCard 
                title="Lab Tests" 
                value={stats?.total_lab_tests || 0} 
                icon="🧪" 
                gradient="linear-gradient(135deg, #FF416C 0%, #FF4B2B 100%)" 
              />
              <DashboardCard 
                title="Total Patients" 
                value={stats?.total_patients || 0} 
                icon="🏥" 
                gradient="linear-gradient(135deg, #f12711 0%, #f5af19 100%)" 
              />
            </div>

            {/* Tables Section */}
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fit, minmax(500px, 1fr))', 
              gap: '24px' 
            }}>
              
              {/* Recent B2B Clients */}
              <div className="card" style={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 30px rgba(0,0,0,0.05)' }}>
                <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #edf2f9', backgroundColor: '#fff', borderRadius: '12px 12px 0 0', padding: '20px' }}>
                  <h3 className="card-title" style={{ margin: 0, fontSize: '1.1rem', color: '#1e293b' }}>Latest B2B Clients</h3>
                  <Link href="/superadmin/dashboard/b2bclient" style={{ fontSize: '0.85rem', color: '#3b82f6', textDecoration: 'none', fontWeight: 600 }}>
                    View More →
                  </Link>
                </div>
                <div className="card-body" style={{ padding: 0 }}>
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
                      <thead>
                        <tr style={{ backgroundColor: '#f8fafc', color: '#64748b', textAlign: 'left' }}>
                          <th style={{ padding: '12px 20px', fontWeight: 600 }}>Company Name</th>
                          <th style={{ padding: '12px 20px', fontWeight: 600 }}>Contact Person</th>
                          <th style={{ padding: '12px 20px', fontWeight: 600 }}>Wallet Balance</th>
                          <th style={{ padding: '12px 20px', fontWeight: 600 }}>Added Date</th>
                        </tr>
                      </thead>
                      <tbody>
                        {recentB2BClients.length === 0 ? (
                          <tr><td colSpan={4} style={{ padding: '20px', textAlign: 'center', color: '#94a3b8' }}>No B2B clients found.</td></tr>
                        ) : (
                          recentB2BClients.map((client, i) => (
                            <tr key={i} style={{ borderBottom: '1px solid #edf2f9', transition: 'background-color 0.2s' }}>
                              <td style={{ padding: '16px 20px', color: '#10b981', fontWeight: 500 }}>{client.company_name || 'N/A'}</td>
                              <td style={{ padding: '16px 20px', color: '#334155' }}>
                                <div style={{ fontWeight: 500 }}>{client.contact_person_name || 'N/A'}</div>
                                <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>{client.mobile || 'N/A'}</div>
                              </td>
                              <td style={{ padding: '16px 20px', color: '#0ea5e9', fontWeight: 700 }}>
                                <Link 
                                  href={`/superadmin/dashboard/b2bclient?view=wallet&clientId=${client.id}`} 
                                  style={{ color: '#0ea5e9', textDecoration: 'none', padding: '4px 8px', backgroundColor: '#f0f9ff', borderRadius: '6px', border: '1px solid #bae6fd', display: 'inline-block', transition: 'all 0.2s' }}
                                  onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#e0f2fe'; e.currentTarget.style.borderColor = '#7dd3fc'; }}
                                  onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#f0f9ff'; e.currentTarget.style.borderColor = '#bae6fd'; }}
                                  title="View Wallet History"
                                >
                                  ${Number(client.wallet_balance || 0).toFixed(2)}
                                </Link>
                              </td>
                              <td style={{ padding: '16px 20px', color: '#64748b', fontSize: '0.85rem', whiteSpace: 'nowrap' }}>
                                 {client.creation_timestamp ? formatDate(client.creation_timestamp) : 'N/A'}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              {/* Recent Test Requests */}
              <div className="card" style={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 30px rgba(0,0,0,0.05)' }}>
                <div className="card-header" style={{ borderBottom: '1px solid #edf2f9', backgroundColor: '#fff', borderRadius: '12px 12px 0 0', padding: '20px' }}>
                  <h3 className="card-title" style={{ margin: 0, fontSize: '1.1rem', color: '#1e293b' }}>Recent Test Requests</h3>
                </div>
                <div className="card-body" style={{ padding: 0 }}>
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
                      <thead>
                        <tr style={{ backgroundColor: '#f8fafc', color: '#64748b', textAlign: 'left' }}>
                          <th style={{ padding: '12px 20px', fontWeight: 600 }}>ID</th>
                          <th style={{ padding: '12px 20px', fontWeight: 600 }}>Patient</th>
                          <th style={{ padding: '12px 20px', fontWeight: 600 }}>Tests</th>
                          <th style={{ padding: '12px 20px', fontWeight: 600 }}>Date</th>
                        </tr>
                      </thead>
                      <tbody>
                        {recentTests.length === 0 ? (
                          <tr><td colSpan={4} style={{ padding: '20px', textAlign: 'center', color: '#94a3b8' }}>No recent tests found.</td></tr>
                        ) : (
                          recentTests.map((t, i) => (
                            <tr key={i} style={{ borderBottom: '1px solid #edf2f9', transition: 'background-color 0.2s' }}>
                              <td style={{ padding: '16px 20px', color: '#3b82f6', fontWeight: 500 }}>#{t.id}</td>
                              <td style={{ padding: '16px 20px', color: '#334155' }}>
                                <div style={{ fontWeight: 500 }}>{t.patient_name || 'N/A'}</div>
                                <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>{t.patient_mobile || 'N/A'}</div>
                              </td>
                              <td style={{ padding: '16px 20px', color: '#475569', maxWidth: '200px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                {t.tests || 'N/A'}
                              </td>
                              <td style={{ padding: '16px 20px', color: '#64748b', fontSize: '0.85rem', whiteSpace: 'nowrap' }}>
                                {t.creation_timestamp ? formatDate(t.creation_timestamp) : 'N/A'}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              {/* Recent Patients */}
              <div className="card" style={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 30px rgba(0,0,0,0.05)' }}>
                <div className="card-header" style={{ borderBottom: '1px solid #edf2f9', backgroundColor: '#fff', borderRadius: '12px 12px 0 0', padding: '20px' }}>
                  <h3 className="card-title" style={{ margin: 0, fontSize: '1.1rem', color: '#1e293b' }}>Recently Added Patients</h3>
                </div>
                <div className="card-body" style={{ padding: 0 }}>
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
                      <thead>
                        <tr style={{ backgroundColor: '#f8fafc', color: '#64748b', textAlign: 'left' }}>
                          <th style={{ padding: '12px 20px', fontWeight: 600 }}>UID</th>
                          <th style={{ padding: '12px 20px', fontWeight: 600 }}>Name</th>
                          <th style={{ padding: '12px 20px', fontWeight: 600 }}>Client</th>
                          <th style={{ padding: '12px 20px', fontWeight: 600 }}>Date</th>
                        </tr>
                      </thead>
                      <tbody>
                        {recentPatients.length === 0 ? (
                          <tr><td colSpan={4} style={{ padding: '20px', textAlign: 'center', color: '#94a3b8' }}>No recent patients found.</td></tr>
                        ) : (
                          recentPatients.map((p, i) => (
                            <tr key={i} style={{ borderBottom: '1px solid #edf2f9', transition: 'background-color 0.2s' }}>
                              <td style={{ padding: '16px 20px', color: '#10b981', fontWeight: 500 }}>{p.uid || 'N/A'}</td>
                              <td style={{ padding: '16px 20px', color: '#334155', fontWeight: 500 }}>{p.name || 'N/A'}</td>
                              <td style={{ padding: '16px 20px', color: '#64748b' }}>
                                <span style={{ 
                                  backgroundColor: p.b2b_client_name ? '#e0e7ff' : '#f1f5f9', 
                                  color: p.b2b_client_name ? '#4f46e5' : '#64748b',
                                  padding: '4px 8px',
                                  borderRadius: '4px',
                                  fontSize: '0.75rem',
                                  fontWeight: 600,
                                  whiteSpace: 'nowrap'
                                }}>
                                  {p.b2b_client_name || 'Walk-in'}
                                </span>
                              </td>
                              <td style={{ padding: '16px 20px', color: '#64748b', fontSize: '0.85rem', whiteSpace: 'nowrap' }}>
                                 {p.creation_timestamp ? formatDate(p.creation_timestamp) : 'N/A'}
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

function DashboardCard({ title, value, icon, gradient }: { title: string, value: number, icon: string, gradient: string }) {
  return (
    <div style={{
      background: '#fff',
      borderRadius: '16px',
      padding: '24px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      boxShadow: '0 4px 20px rgba(0,0,0,0.03)',
      transition: 'transform 0.3s ease, box-shadow 0.3s ease',
      cursor: 'default',
      position: 'relative',
      overflow: 'hidden'
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
      <div>
        <div style={{ color: '#64748b', fontSize: '0.9rem', fontWeight: 600, marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
          {title}
        </div>
        <div style={{ color: '#0f172a', fontSize: '2rem', fontWeight: 800, lineHeight: 1 }}>
          {value}
        </div>
      </div>
      <div style={{
        width: '56px', height: '56px',
        borderRadius: '12px',
        background: gradient,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: '1.8rem',
        color: '#fff',
        boxShadow: '0 4px 15px rgba(0,0,0,0.1)'
      }}>
        {icon}
      </div>
    </div>
  );
}
