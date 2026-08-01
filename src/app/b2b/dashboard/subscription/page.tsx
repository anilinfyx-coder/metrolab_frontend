'use client';
import { useState, useEffect } from 'react';
import { MdCardMembership, MdCheckCircle, MdCancel } from 'react-icons/md';
import TopNav from '../../../components/TopNav';
import PageLoader from '../../../components/PageLoader';
import { formatDate } from '../../../utils/dateFormat';
import { apiFetch } from '../../../../lib/api';

function getUser() {
  if (typeof window === 'undefined') return null;
  try { return JSON.parse(localStorage.getItem('b2b_user') || 'null'); } catch { return null; }
}

export default function SubscriptionPage() {
  const [subscriptions, setSubscriptions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const user = getUser();
    if (!user?.id) return;

    void (async () => {
      try {
        const subs = await apiFetch<any[]>(`/api/B2bClientSubscription?b2b_client_id=${user.id}`, {
          tokenKey: 'b2b_token',
          errorFallback: 'Unable to load subscription history.',
        });
        setSubscriptions(subs || []);
      } catch {
        setSubscriptions([]);
      }
      setLoading(false);
    })();
  }, []);

  const activeSub = subscriptions.find(s => {
    const end = new Date(s.end_date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return end >= today;
  });

  return (
    <div className="page-content">
      <TopNav title="Active Subscription" />
      <div className="page-body">
        {loading ? (
          <PageLoader message="Loading subscription data..." size="lg" />
        ) : (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.25rem', marginBottom: '1.5rem' }}>
              <div className="card" style={{ background: activeSub ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)' : 'linear-gradient(135deg, #64748b 0%, #475569 100%)', border: 'none' }}>
                <div className="card-body" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.7)', marginBottom: '0.25rem' }}>Current Status</div>
                    <div style={{ fontSize: '1.75rem', fontWeight: 700, color: '#fff' }}>
                      {activeSub ? 'Active Subscription' : 'No Active Subscription'}
                    </div>
                    <div style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.8)', marginTop: '0.25rem' }}>
                      {activeSub ? (
                        <>Valid until: <strong>{formatDate(activeSub.end_date)}</strong></>
                      ) : (
                        <>You are currently operating on Custom Pricing / Wallet mode</>
                      )}
                    </div>
                  </div>
                  <div style={{ fontSize: '2.5rem', opacity: 0.3 }}><MdCardMembership size={40} aria-hidden /></div>
                </div>
              </div>
            </div>

            <div className="card">
              <div className="card-header">
                <span className="card-title">Subscription History</span>
              </div>
              <div className="card-body" style={{ padding: 0 }}>
                <div style={{ overflowX: 'auto' }}>
                  <table className="table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                    <thead>
                      <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                        <th style={{ padding: '12px 16px', fontWeight: 600, color: '#475569' }}>ID</th>
                        <th style={{ padding: '12px 16px', fontWeight: 600, color: '#475569' }}>Start Date</th>
                        <th style={{ padding: '12px 16px', fontWeight: 600, color: '#475569' }}>End Date</th>
                        <th style={{ padding: '12px 16px', fontWeight: 600, color: '#475569' }}>Amount</th>
                        <th style={{ padding: '12px 16px', fontWeight: 600, color: '#475569' }}>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {subscriptions.length === 0 ? (
                        <tr>
                          <td colSpan={5} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                            No subscription history found.
                          </td>
                        </tr>
                      ) : (
                        subscriptions.map((s) => {
                          const isExpired = new Date(s.end_date) < new Date(new Date().setHours(0,0,0,0));
                          return (
                            <tr key={s.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                              <td style={{ padding: '12px 16px', color: '#3b82f6', fontWeight: 500 }}>#{s.id}</td>
                              <td style={{ padding: '12px 16px' }}>{formatDate(s.start_date)}</td>
                              <td style={{ padding: '12px 16px' }}>{formatDate(s.end_date)}</td>
                              <td style={{ padding: '12px 16px' }}>${Number(s.amount).toFixed(2)}</td>
                              <td style={{ padding: '12px 16px' }}>
                                {isExpired ? (
                                  <span className="badge" style={{ background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca', padding: '2px 8px', borderRadius: '12px' }}>
                                    <MdCancel size={12} style={{ verticalAlign: 'text-bottom', marginRight: '4px' }}/> Expired
                                  </span>
                                ) : (
                                  <span className="badge" style={{ background: '#ecfdf5', color: '#059669', border: '1px solid #a7f3d0', padding: '2px 8px', borderRadius: '12px' }}>
                                    <MdCheckCircle size={12} style={{ verticalAlign: 'text-bottom', marginRight: '4px' }}/> Active
                                  </span>
                                )}
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
