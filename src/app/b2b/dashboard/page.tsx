'use client';
import { useEffect, useState } from 'react';
import {
  MdAccountBalanceWallet,
  MdAssignment,
  MdBiotech,
  MdBlock,
  MdBusiness,
  MdComputer,
  MdLocalHospital,
  MdRocketLaunch,
  MdWarning,
  MdWavingHand,
} from 'react-icons/md';
import Link from 'next/link';
import TopNav from '../../components/TopNav';
import PageLoader from '../../components/PageLoader';
import { apiFetch } from '../../../lib/api';
import { formatDate } from '../../utils/dateFormat';

function getUser() {
  if (typeof window !== 'undefined') {
    const userStr = localStorage.getItem('b2b_user');
    if (userStr) return JSON.parse(userStr);
  }
  return null;
}

export default function B2bDashboardPage() {
  const [user, setUser] = useState<any>(null);
  const [walletBalance, setWalletBalance] = useState<number | null>(null);
  const [corporateClients, setCorporateClients] = useState<any[]>([]);
  const [patients, setPatients] = useState<any[]>([]);
  const [testRequests, setTestRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const currentUser = getUser();
        setUser(currentUser);

        if (currentUser?.id) {
          const [wallet, corp, patientList, testReqList] = await Promise.all([
            apiFetch<{ wallet_balance?: string | number }>(`/api/B2bClients/${currentUser.id}`, {
              tokenKey: 'b2b_token',
            }).catch(() => null),
            apiFetch<unknown[]>(`/api/CorporateClients?b2b_client_id=${currentUser.id}&status=true`, {
              tokenKey: 'b2b_token',
            }).catch(() => []),
            apiFetch<unknown[]>(`/api/Patient?b2b_client_id=${currentUser.id}`, {
              tokenKey: 'b2b_token',
            }).catch(() => []),
            apiFetch<unknown[]>(`/api/TestRequest?b2b_client_id=${currentUser.id}`, {
              tokenKey: 'b2b_token',
            }).catch(() => []),
          ]);

          if (wallet) setWalletBalance(parseFloat(String(wallet.wallet_balance || 0)));
          setCorporateClients((corp as any[]) || []);
          setPatients((patientList as any[]) || []);
          setTestRequests((testReqList as any[]) || []);
        }
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const recentCorporate = corporateClients.slice(0, 5);
  const recentPatients = patients.slice(0, 5);
  const recentTestRequests = testRequests.slice(0, 5);

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
            
            <div style={{ marginBottom: '24px' }}>
              <h2 style={{ fontSize: '1.8rem', color: '#0f172a', margin: '0 0 8px 0' }}>
                Welcome back, {user?.name || 'B2B Admin'} 👋
              </h2>
              <p style={{ color: '#64748b', margin: 0 }}>Here is what is happening in your lab today.</p>
            </div>

            {/* Low balance warning */}
            {walletBalance !== null && walletBalance <= 50 && (
              <div style={{
                marginBottom: '24px', padding: '16px 20px', borderRadius: '12px',
                background: walletBalance <= 0 ? '#fef2f2' : '#fffbeb',
                border: `1px solid ${walletBalance <= 0 ? '#fecaca' : '#fef3c7'}`,
                display: 'flex', gap: '12px', alignItems: 'flex-start'
              }}>
                <div style={{ fontSize: '1.5rem', lineHeight: 1 }}>{walletBalance <= 0 ? <MdBlock size={20} aria-hidden /> : <MdWarning size={20} aria-hidden />}</div>
                <div>
                  <div style={{ fontWeight: 600, fontSize: '1rem', color: walletBalance <= 0 ? '#dc2626' : '#d97706', marginBottom: '4px' }}>
                    {walletBalance <= 0 ? 'Wallet Empty — Test submissions are blocked!' : 'Low Wallet Balance'}
                  </div>
                  <div style={{ fontSize: '0.9rem', color: walletBalance <= 0 ? '#991b1b' : '#92400e' }}>
                    Please contact your Metrolab administrator to recharge your wallet. Current balance: <strong>${walletBalance.toFixed(2)}</strong>
                  </div>
                </div>
              </div>
            )}

            {/* KPI Cards section */}
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', 
              gap: '20px', 
              marginBottom: '30px' 
            }}>
              <DashboardCard 
                title="Wallet Balance" 
                value={walletBalance !== null ? `$${walletBalance.toFixed(2)}` : '—'} 
                icon="💰" 
                gradient="linear-gradient(135deg, #10b981 0%, #059669 100%)" 
                link="/b2b/dashboard/wallet"
              />
              <DashboardCard 
                title="Total Patients" 
                value={patients.length} 
                icon="🧑‍⚕️" 
                gradient="linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)" 
              />
              <DashboardCard 
                title="Corporate Clients" 
                value={corporateClients.length} 
                icon="🏢" 
                gradient="linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)" 
              />
              <DashboardCard 
                title="Test Requests" 
                value={testRequests.length} 
                icon="🧪" 
                gradient="linear-gradient(135deg, #f59e0b 0%, #d97706 100%)" 
              />
            </div>

            {/* Main Tables Grid */}
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fit, minmax(500px, 1fr))', 
              gap: '24px',
              marginBottom: '24px'
            }}>
              
              {/* Recent Test Requests */}
              <div className="card" style={cardStyle}>
                <div className="card-header" style={cardHeaderStyle}>
                  <h3 className="card-title" style={cardTitleStyle}>Recent Test Requests</h3>
                </div>
                <div className="card-body" style={{ padding: 0 }}>
                  <div style={{ overflowX: 'auto' }}>
                    <table style={tableStyle}>
                      <thead>
                        <tr style={tableHeaderStyle}>
                          <th style={thStyle}>ID</th>
                          <th style={thStyle}>Title</th>
                          <th style={thStyle}>Corporate Client</th>
                          <th style={thStyle}>Date</th>
                        </tr>
                      </thead>
                      <tbody>
                        {recentTestRequests.length === 0 ? (
                          <tr><td colSpan={4} style={emptyTdStyle}>No recent test requests.</td></tr>
                        ) : (
                          recentTestRequests.map((tr, i) => (
                            <tr key={i} style={trStyle}>
                              <td style={{...tdStyle, color: '#3b82f6', fontWeight: 500}}>#{tr.id}</td>
                              <td style={{...tdStyle, color: '#334155', fontWeight: 500}}>{tr.title || 'N/A'}</td>
                              <td style={tdStyle}>{tr.corporateClientCompany || 'Self'}</td>
                              <td style={{...tdStyle, fontSize: '0.85rem'}}>
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

              {/* Recent Corporate Clients */}
              <div className="card" style={cardStyle}>
                <div className="card-header" style={cardHeaderStyle}>
                  <h3 className="card-title" style={cardTitleStyle}>New Corporate Clients</h3>
                  <Link href="/b2b/dashboard/corporateclient" style={linkStyle}>
                    View All →
                  </Link>
                </div>
                <div className="card-body" style={{ padding: 0 }}>
                  <div style={{ overflowX: 'auto' }}>
                    <table style={tableStyle}>
                      <thead>
                        <tr style={tableHeaderStyle}>
                          <th style={thStyle}>Company</th>
                          <th style={thStyle}>Contact</th>
                          <th style={thStyle}>Date Added</th>
                        </tr>
                      </thead>
                      <tbody>
                        {recentCorporate.length === 0 ? (
                          <tr><td colSpan={3} style={emptyTdStyle}>No corporate clients found.</td></tr>
                        ) : (
                          recentCorporate.map((corp, i) => (
                            <tr key={i} style={trStyle}>
                              <td style={{...tdStyle, color: '#334155', fontWeight: 500}}>
                                {corp.company_name}
                                <div style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 400 }}>{corp.email}</div>
                              </td>
                              <td style={tdStyle}>{corp.contact_person_name || 'N/A'}</td>
                              <td style={{...tdStyle, fontSize: '0.85rem'}}>
                                {corp.creation_timestamp ? formatDate(corp.creation_timestamp) : 'N/A'}
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
              <div className="card" style={{ ...cardStyle, gridColumn: '1 / -1' }}>
                <div className="card-header" style={cardHeaderStyle}>
                  <h3 className="card-title" style={cardTitleStyle}>Recently Registered Patients</h3>
                  <Link href="/b2b/dashboard/patients" style={linkStyle}>
                    View All →
                  </Link>
                </div>
                <div className="card-body" style={{ padding: 0 }}>
                  <div style={{ overflowX: 'auto' }}>
                    <table style={tableStyle}>
                      <thead>
                        <tr style={tableHeaderStyle}>
                          <th style={thStyle}>Patient ID</th>
                          <th style={thStyle}>Name</th>
                          <th style={thStyle}>Age / Gender</th>
                          <th style={thStyle}>Date Added</th>
                        </tr>
                      </thead>
                      <tbody>
                        {recentPatients.length === 0 ? (
                          <tr><td colSpan={4} style={emptyTdStyle}>No patients found.</td></tr>
                        ) : (
                          recentPatients.map((pat, i) => (
                            <tr key={i} style={trStyle}>
                              <td style={{...tdStyle, color: '#10b981', fontWeight: 500}}>#{pat.patient_id_number || pat.id}</td>
                              <td style={{...tdStyle, color: '#334155', fontWeight: 500}}>
                                {pat.first_name} {pat.last_name}
                                <div style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 400 }}>{pat.email}</div>
                              </td>
                              <td style={tdStyle}>{pat.age} Y / {pat.gender}</td>
                              <td style={{...tdStyle, fontSize: '0.85rem'}}>
                                {pat.creation_timestamp ? formatDate(pat.creation_timestamp) : 'N/A'}
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

            {/* Quick Actions */}
            <div className="card" style={{ ...cardStyle, marginBottom: 0 }}>
              <div className="card-header" style={cardHeaderStyle}>
                <h3 className="card-title" style={cardTitleStyle}>🚀 Quick Actions</h3>
              </div>
              <div className="card-body" style={{ padding: '24px', display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                <Link href="/b2b/dashboard/admindashboard" style={quickActionStyle('#e0e7ff', '#4f46e5')}>
                  <span style={{ fontSize: '1.5rem', marginBottom: '8px' }}>🖥️</span>
                  <span style={{ fontWeight: 600 }}>Admin Dashboard</span>
                </Link>
                <Link href="/b2b/dashboard/corporateclient" style={quickActionStyle('#dcfce7', '#16a34a')}>
                  <span style={{ fontSize: '1.5rem', marginBottom: '8px' }}>🏢</span>
                  <span style={{ fontWeight: 600 }}>Manage Corporate Clients</span>
                </Link>
                <Link href="/b2b/dashboard/wallet" style={quickActionStyle('#fef9c3', '#ca8a04')}>
                  <span style={{ fontSize: '1.5rem', marginBottom: '8px' }}>💰</span>
                  <span style={{ fontWeight: 600 }}>View Wallet & Transactions</span>
                </Link>
              </div>
            </div>

          </div>
        )}
      </div>
    </>
  );
}

function DashboardCard({ title, value, icon, gradient, link }: { title: string, value: string | number, icon: string, gradient: string, link?: string }) {
  const CardWrapper = link ? Link : ('div' as any);
  const wrapperProps = link ? { href: link, style: { textDecoration: 'none' } } : {};
  
  return (
    <CardWrapper {...wrapperProps}>
      <div style={{
        background: '#fff',
        borderRadius: '16px',
        padding: '24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        boxShadow: '0 4px 20px rgba(0,0,0,0.03)',
        transition: 'transform 0.3s ease, box-shadow 0.3s ease',
        cursor: link ? 'pointer' : 'default',
        position: 'relative',
        overflow: 'hidden',
        height: '100%'
      }}
      onMouseEnter={(e: any) => {
        e.currentTarget.style.transform = 'translateY(-5px)';
        e.currentTarget.style.boxShadow = '0 10px 25px rgba(0,0,0,0.08)';
      }}
      onMouseLeave={(e: any) => {
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
    </CardWrapper>
  );
}

// Shared Styles
const cardStyle: React.CSSProperties = {
  borderRadius: '12px', 
  border: 'none', 
  boxShadow: '0 10px 30px rgba(0,0,0,0.05)', 
  backgroundColor: '#fff'
};
const cardHeaderStyle: React.CSSProperties = {
  display: 'flex', 
  justifyContent: 'space-between', 
  alignItems: 'center', 
  borderBottom: '1px solid #edf2f9', 
  borderRadius: '12px 12px 0 0', 
  padding: '20px'
};
const cardTitleStyle: React.CSSProperties = {
  margin: 0, 
  fontSize: '1.1rem', 
  color: '#1e293b'
};
const linkStyle: React.CSSProperties = {
  fontSize: '0.85rem', 
  color: '#3b82f6', 
  textDecoration: 'none', 
  fontWeight: 600
};
const tableStyle: React.CSSProperties = {
  width: '100%', 
  borderCollapse: 'collapse', 
  fontSize: '0.9rem'
};
const tableHeaderStyle: React.CSSProperties = {
  backgroundColor: '#f8fafc', 
  color: '#64748b', 
  textAlign: 'left'
};
const thStyle: React.CSSProperties = {
  padding: '12px 20px', 
  fontWeight: 600
};
const tdStyle: React.CSSProperties = {
  padding: '16px 20px', 
  color: '#64748b'
};
const trStyle: React.CSSProperties = {
  borderBottom: '1px solid #edf2f9', 
  transition: 'background-color 0.2s'
};
const emptyTdStyle: React.CSSProperties = {
  padding: '20px', 
  textAlign: 'center', 
  color: '#94a3b8'
};
const quickActionStyle = (bg: string, color: string): React.CSSProperties => ({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '24px',
  backgroundColor: bg,
  color: color,
  borderRadius: '12px',
  textDecoration: 'none',
  minWidth: '200px',
  flex: '1 1 auto',
  transition: 'transform 0.2s',
  border: `1px solid ${color}33`,
});
