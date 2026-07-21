'use client';
import { useState, useEffect, useMemo, type ReactNode } from 'react';
import { useForm } from 'react-hook-form';
import {
  MdBloodtype,
  MdCoronavirus,
  MdHourglassEmpty,
  MdLocalBar,
  MdMedication,
  MdSave,
  MdScience,
} from 'react-icons/md';
import TopNav from '../../../components/TopNav';
import PageLoader from '../../../components/PageLoader';
import { FormGroup } from '../../../components/FormField';
import { apiFetch, handleApiResponse, getToken, API_BASE } from '../../../../lib/api';
import { createInvalidHandler, fieldStyle, formResolver } from '../../../../lib/formHelpers';
import { globalPricingSchema } from '../../../../lib/schemas';

interface LabTest {
  id: number;
  name: string;
}

type PricingFormValues = Record<string, string>;

function PricingForm({ labTests, initialPrices }: { labTests: LabTest[]; initialPrices: PricingFormValues }) {
  const [saving, setSaving] = useState(false);

  const priceKeys = useMemo(
    () => labTests.map(t => `lab_test_${t.id}_price`),
    [labTests],
  );
  const schema = useMemo(() => globalPricingSchema(priceKeys), [priceKeys]);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<PricingFormValues>({
    resolver: formResolver<PricingFormValues>(schema),
    defaultValues: initialPrices,
  });

  const save = handleSubmit(async values => {
    const parsed: Record<string, number> = {};
    for (const key of priceKeys) {
      const v = values[key];
      if (v === '' || v == null) {
        parsed[key] = 0;
      } else {
        parsed[key] = parseFloat(v);
      }
    }
    setSaving(true);
    try {
      await apiFetch('/api/GlobalSettings/updatePricing', {
        method: 'POST',
        tokenKey: 'superadmin_token',
        body: JSON.stringify({ prices: parsed }),
        successMessage: 'Pricing updated successfully.',
        errorFallback: 'Failed to update pricing.',
      });
    } catch {
      /* error toasted by apiFetch */
    } finally {
      setSaving(false);
    }
  }, createInvalidHandler<PricingFormValues>());

  return (
    <form onSubmit={save} noValidate>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.5rem', marginBottom: '1.5rem' }}>
        {labTests.map(test => {
          const key = `lab_test_${test.id}_price`;
          let icon: ReactNode = <MdScience size={24} aria-hidden />;
          let color = '#6366f1';
          const n = (test.name || '').toLowerCase();
          if (n.includes('drug')) { icon = <MdMedication size={24} aria-hidden />; color = '#ef4444'; }
          else if (n.includes('alcohol')) { icon = <MdLocalBar size={24} aria-hidden />; color = '#f59e0b'; }
          else if (n.includes('covid')) { icon = <MdCoronavirus size={24} aria-hidden />; color = '#10b981'; }
          else if (n.includes('blood')) { icon = <MdBloodtype size={24} aria-hidden />; color = '#e11d48'; }

          const fieldError = errors[key]?.message as string | undefined;

          return (
            <div key={key} className="card" style={{ border: `1px solid ${color}30`, padding: '1.25rem', margin: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
                <div style={{ fontSize: '1.5rem', width: 44, height: 44, borderRadius: 12, background: `${color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{icon}</div>
                <div>
                  <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{test.name}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Per test deduction</div>
                </div>
              </div>
              <FormGroup label="Price (USD)" htmlFor={`price-${key}`} error={fieldError}>
                <div style={{ position: 'relative' }}>
                  <span style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', fontWeight: 600 }}>$</span>
                  <input
                    id={`price-${key}`}
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="0.00"
                    data-field={key}
                    aria-invalid={!!fieldError}
                    style={fieldStyle(!!fieldError, { paddingLeft: '1.5rem' })}
                    {...register(key)}
                  />
                </div>
              </FormGroup>
            </div>
          );
        })}
      </div>

      <div style={{ display: 'flex', gap: '0.75rem' }}>
        <button type="submit" className="btn btn-primary" disabled={saving}>
          {saving ? <><MdHourglassEmpty size={16} aria-hidden /> Saving...</> : <><MdSave size={16} aria-hidden /> Save Pricing</>}
        </button>
      </div>
    </form>
  );
}

export default function GlobalSettingsPage() {
  const [labTests, setLabTests] = useState<LabTest[]>([]);
  const [prices, setPrices] = useState<PricingFormValues>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const [settingsRes, testsRes] = await Promise.all([
          fetch(`${API_BASE}/api/GlobalSettings`, { headers: { token: getToken('superadmin_token') } }),
          fetch(`${API_BASE}/api/LabTests?status=true`, { headers: { token: getToken('superadmin_token') } }),
        ]);
        const [settings, tests] = await Promise.all([
          handleApiResponse<Record<string, { value?: string }>>(settingsRes),
          handleApiResponse<LabTest[]>(testsRes),
        ]);
        const testList = tests || [];
        setLabTests(testList);
        const newPrices: PricingFormValues = {};
        testList.forEach((t: LabTest) => {
          const key = `lab_test_${t.id}_price`;
          newPrices[key] = settings[key]?.value || '';
        });
        setPrices(newPrices);
      } catch {
        /* error toasted by handleApiResponse */
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, []);

  return (
    <div className="page-content">
      <TopNav title="Global Settings — Test Pricing" />
      <div style={{ padding: '1.5rem' }}>
        <div className="card">
          <div className="card-header">
            <span className="card-title">💲 Test Pricing Configuration</span>
          </div>
          <div className="card-body">
            <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
              Set the price per test type. These amounts will be automatically deducted from a B2B client&apos;s wallet when a test report is submitted.
            </p>

            {loading ? (
              <PageLoader message="Loading current prices..." />
            ) : (
              <PricingForm labTests={labTests} initialPrices={prices} />
            )}
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
                  <li>When a B2B lab submits a test report, the system identifies the test type.</li>
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
