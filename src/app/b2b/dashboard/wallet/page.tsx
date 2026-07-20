'use client';
import { useState, useEffect } from 'react';
import { MdAccountBalanceWallet, MdAssignment, MdCheckCircle, MdWarning } from 'react-icons/md';
import TopNav from '../../../components/TopNav';
import { formatDateTime } from '../../../utils/dateFormat';
import { apiFetch } from '../../../../lib/api';

function getUser() {
  if (typeof window === 'undefined') return null;
  try { return JSON.parse(localStorage.getItem('b2b_user') || 'null'); } catch { return null; }
}

export default function WalletPage() {
  const [balance, setBalance] = useState<number>(0);
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const user = getUser();
    if (!user?.id) return;

    // Fetch balance and history in parallel
    void (async () => {
      try {
        const clientData = await apiFetch<{ wallet_balance?: string | number }>(`/api/B2bClients/${user.id}`, {
          tokenKey: 'b2b_token',
          errorFallback: 'Unable to load wallet balance.',
        });
        setBalance(parseFloat(String(clientData?.wallet_balance || 0)));
      } catch {
        setBalance(0);
      }
      try {
        const historyData = await apiFetch<any[]>(`/api/B2bClients/walletHistory/${user.id}`, {
          tokenKey: 'b2b_token',
          errorFallback: 'Unable to load wallet history.',
        });
        setHistory(historyData || []);
      } catch {
        setHistory([]);
      }
      setLoading(false);
    })();
  }, []);

  const totalCredits = history.filter(t => t.transaction_type === 'CREDIT').reduce((s, t) => s + parseFloat(t.amount), 0);
  const totalDebits = history.filter(t => t.transaction_type === 'DEBIT').reduce((s, t) => s + parseFloat(t.amount), 0);

  return (
    <div className="page-content">
      <TopNav title="Wallet & Transactions" />
      <div style={{ padding: '1.5rem' }}>
        {loading ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>Loading wallet...</div>
        ) : (
          <>
            {/* Stats Row */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.25rem', marginBottom: '1.5rem' }}>
              {/* Wallet Balance Card */}
              <div className="card" style={{ background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)', border: 'none', gridColumn: '1 / 2' }}>
                <div className="card-body" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.7)', marginBottom: '0.25rem' }}>Current Wallet Balance</div>
                    <div style={{ fontSize: '2.25rem', fontWeight: 700, color: '#fff' }}>${balance.toFixed(2)}</div>
                    <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.55)', marginTop: '0.25rem' }}>
                      {balance <= 0 ? (
                        <><MdWarning size={16} style={{ verticalAlign: 'text-bottom', marginRight: '0.35rem' }} aria-hidden />Insufficient funds — contact admin to recharge</>
                      ) : (
                        <><MdCheckCircle size={16} style={{ verticalAlign: 'text-bottom', marginRight: '0.35rem' }} aria-hidden />Available for test deductions</>
                      )}
                    </div>
                  </div>
                  <div style={{ fontSize: '2.5rem', opacity: 0.3 }}><MdAccountBalanceWallet size={40} aria-hidden /></div>
                </div>
              </div>

              {/* Total Credited */}
              <div className="card">
                <div className="card-body">
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>Total Credits</div>
                  <div style={{ fontSize: '1.75rem', fontWeight: 700, color: '#10b981' }}>+${totalCredits.toFixed(2)}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>Funds added to wallet</div>
                </div>
              </div>

              {/* Total Debited */}
              <div className="card">
                <div className="card-body">
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>Total Debits</div>
                  <div style={{ fontSize: '1.75rem', fontWeight: 700, color: '#ef4444' }}>-${totalDebits.toFixed(2)}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>Deducted for test reports</div>
                </div>
              </div>
            </div>

            {/* Transaction History */}
            <div className="card">
              <div className="card-header">
                <span className="card-title"><MdAssignment size={18} style={{ verticalAlign: 'text-bottom', marginRight: '0.35rem' }} aria-hidden />Transaction History</span>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{history.length} transactions</span>
              </div>
              <div className="card-body" style={{ padding: 0 }}>
                {history.length === 0 ? (
                  <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                    <div style={{ fontSize: '2rem', marginBottom: '0.75rem' }}>🪙</div>
                    <div>No transactions yet. Your wallet history will appear here once funds are added or deducted.</div>
                  </div>
                ) : (
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid var(--border)', background: '#f8f9fc' }}>
                        {['Date & Time', 'Type', 'Amount', 'Balance After', 'Description'].map(h => (
                          <th key={h} style={{ padding: '0.75rem 1rem', textAlign: 'left', color: 'var(--text-muted)', fontWeight: 600 }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {history.map((t: any) => (
                        <tr key={t.id} style={{ borderBottom: '1px solid var(--border)' }}
                          onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-card-hover)')}
                          onMouseLeave={e => (e.currentTarget.style.background = '')}>
                          <td style={{ padding: '0.75rem 1rem', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                            {formatDateTime(t.creation_timestamp)}
                          </td>
                          <td style={{ padding: '0.75rem 1rem' }}>
                            <span style={{
                              padding: '0.2rem 0.65rem', borderRadius: 999, fontSize: '0.75rem', fontWeight: 600,
                              background: t.transaction_type === 'CREDIT' ? 'rgba(16,185,129,0.12)' : 'rgba(239,68,68,0.12)',
                              color: t.transaction_type === 'CREDIT' ? '#10b981' : '#ef4444'
                            }}>
                              {t.transaction_type === 'CREDIT' ? '▲ CREDIT' : '▼ DEBIT'}
                            </span>
                          </td>
                          <td style={{ padding: '0.75rem 1rem', fontWeight: 600, color: t.transaction_type === 'CREDIT' ? '#10b981' : '#ef4444' }}>
                            {t.transaction_type === 'CREDIT' ? '+' : '-'}${parseFloat(t.amount).toFixed(2)}
                          </td>
                          <td style={{ padding: '0.75rem 1rem', fontWeight: 500 }}>${parseFloat(t.closing_balance).toFixed(2)}</td>
                          <td style={{ padding: '0.75rem 1rem', color: 'var(--text-muted)' }}>{t.description || '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>

            {/* Low balance warning */}
            {balance <= 50 && (
              <div style={{
                marginTop: '1.25rem', padding: '1rem 1.25rem', borderRadius: 10,
                background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)',
                display: 'flex', gap: '0.75rem', alignItems: 'flex-start'
              }}>
                <div style={{ fontSize: '1.25rem' }}><MdWarning size={20} aria-hidden /></div>
                <div>
                  <div style={{ fontWeight: 600, fontSize: '0.9rem', color: '#f59e0b', marginBottom: '0.25rem' }}>Low Wallet Balance</div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    Your wallet balance is low. Please contact your Metrolab administrator to add funds to your wallet so test reports can continue to be submitted without interruption.
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
