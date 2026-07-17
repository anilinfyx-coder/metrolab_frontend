'use client';
import { useState, useEffect } from 'react';
import TopNav from '../../../components/TopNav';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
function getToken() { return typeof window !== 'undefined' ? localStorage.getItem('superadmin_token') || '' : ''; }

export default function GlobalSettingsPage() {
  const [prices, setPrices] = useState({
    drug_test_price: '',
    alcohol_test_price: '',
    alternate_test_price: '',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    fetch(`${API}/api/GlobalSettings`, { headers: { token: getToken() } })
      .then(r => r.json())
      .then(d => {
        if (d.response_code === '200') {
          const s = d.obj;
          setPrices({
            drug_test_price: s.drug_test_price?.value || '',
            alcohol_test_price: s.alcohol_test_price?.value || '',
            alternate_test_price: s.alternate_test_price?.value || '',
          });
        }
      })
      .finally(() => setLoading(false));
  }, []);

  const save = async () => {
    const parsed: Record<string, number> = {
      drug_test_price: parseFloat(prices.drug_test_price),
      alcohol_test_price: parseFloat(prices.alcohol_test_price),
      alternate_test_price: parseFloat(prices.alternate_test_price),
    };
    for (const [k, v] of Object.entries(parsed)) {
      if (isNaN(v) || v < 0) {
        setMsg({ type: 'error', text: `Invalid value for ${k.replace(/_/g, ' ')}` }); return;
      }
    }
    setSaving(true); setMsg(null);
    const res = await fetch(`${API}/api/GlobalSettings/updatePricing`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', token: getToken() },
      body: JSON.stringify({ prices: parsed })
    });
    const d = await res.json();
    setSaving(false);
    if (d.response_code === '200') {
      setMsg({ type: 'success', text: 'Pricing updated successfully.' });
    } else {
      setMsg({ type: 'error', text: typeof d.obj === 'string' ? d.obj : 'Failed to update pricing.' });
    }
  };

  return (
    <div className="page-content">
      <TopNav title="Global Settings — Test Pricing" />
      <div style={{ padding: '1.5rem' }}>
        {msg && (
          <div style={{
            background: msg.type === 'success' ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
            border: `1px solid ${msg.type === 'success' ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)'}`,
            borderRadius: 8, padding: '0.75rem 1rem', marginBottom: '1rem',
            fontSize: '0.875rem', color: msg.type === 'success' ? '#10b981' : '#ef4444'
          }}>{msg.text}</div>
        )}

        <div className="card">
          <div className="card-header">
            <span className="card-title">💲 Test Pricing Configuration</span>
          </div>
          <div className="card-body">
            <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
              Set the price per test type. These amounts will be automatically deducted from a B2B client&apos;s wallet when a test report is submitted.
            </p>

            {loading ? (
              <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>Loading current prices...</div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.5rem', marginBottom: '1.5rem' }}>
                {[
                  { key: 'drug_test_price', label: 'Drug Test Price', icon: '💊', color: '#ef4444' },
                  { key: 'alcohol_test_price', label: 'Alcohol Test Price', icon: '🍺', color: '#f59e0b' },
                  { key: 'alternate_test_price', label: 'Alternate Test Price', icon: '🔄', color: '#6366f1' },
                ].map(({ key, label, icon, color }) => (
                  <div key={key} className="card" style={{ border: `1px solid ${color}30`, padding: '1.25rem', margin: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
                      <div style={{ fontSize: '1.5rem', width: 44, height: 44, borderRadius: 12, background: `${color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{icon}</div>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{label}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Per test deduction</div>
                      </div>
                    </div>
                    <div className="form-group" style={{ margin: 0 }}>
                      <label style={{ fontSize: '0.8rem' }}>Price (USD)</label>
                      <div style={{ position: 'relative' }}>
                        <span style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', fontWeight: 600 }}>$</span>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={prices[key as keyof typeof prices]}
                          onChange={e => setPrices(p => ({ ...p, [key]: e.target.value }))}
                          style={{ paddingLeft: '1.5rem' }}
                          placeholder="0.00"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button className="btn btn-primary" onClick={save} disabled={saving || loading}>
                {saving ? '⏳ Saving...' : '💾 Save Pricing'}
              </button>
            </div>
          </div>
        </div>

        {/* Info Card */}
        <div className="card" style={{ marginTop: '1.5rem', background: 'rgba(99,102,241,0.05)', border: '1px solid rgba(99,102,241,0.2)' }}>
          <div className="card-body">
            <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
              <div style={{ fontSize: '1.25rem' }}>ℹ️</div>
              <div>
                <div style={{ fontWeight: 600, marginBottom: '0.25rem', fontSize: '0.9rem' }}>How Auto-Deduction Works</div>
                <ul style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: 0, paddingLeft: '1.25rem', lineHeight: 1.8 }}>
                  <li>When a B2B lab submits a test report, the system identifies the test type (Drug / Alcohol / Alternate).</li>
                  <li>It checks the B2B client&apos;s wallet balance. If balance is insufficient, the submission is blocked.</li>
                  <li>On successful submission, the test price is deducted and logged in the wallet ledger.</li>
                  <li>If <strong>$0.00</strong> is set, no deduction occurs for that test type.</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
