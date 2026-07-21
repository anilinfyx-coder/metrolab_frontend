'use client';
import { useEffect, useState } from 'react';
import PageLoader from './PageLoader';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

type Props = {
  labTestId: number;
  token: string;
  /** When set, loads B2B-specific display options and related config */
  b2bClientId?: number;
};

const FIELD_LABELS: { key: string; label: string; type?: string }[] = [
  { key: 'show_collected_date', label: 'Collected Date', type: 'date' },
  { key: 'show_collected_time', label: 'Collected Time', type: 'time' },
  { key: 'show_received_date', label: 'Received Date', type: 'date' },
  { key: 'show_received_time', label: 'Received Time', type: 'time' },
  { key: 'show_reported_date', label: 'Reported Date', type: 'date' },
  { key: 'show_reported_time', label: 'Reported Time', type: 'time' },
  { key: 'show_regulation', label: 'Regulation' },
  { key: 'show_specimen', label: 'Specimen Type' },
  { key: 'show_test_date', label: 'Test Date', type: 'date' },
  { key: 'show_test_time', label: 'Test Time', type: 'time' },
  { key: 'show_test_performed_by', label: 'Test Performed By' },
  { key: 'show_report_status', label: 'Report Status' },
  { key: 'show_fasting', label: 'Fasting' },
  { key: 'show_requisition_no', label: 'Requisition No.' },
  { key: 'show_date_administered', label: 'Date Administered', type: 'date' },
  { key: 'show_applied_to', label: 'Applied To' },
  { key: 'show_lot', label: 'Lot' },
  { key: 'show_expire_date', label: 'Expiry Date', type: 'date' },
  { key: 'show_date_read', label: 'Date Read', type: 'date' },
  { key: 'show_mm_indurations', label: 'mm Indurations' },
  { key: 'show_follow_up', label: 'Follow Up' },
  { key: 'show_final_result', label: 'Final Result' },
  { key: 'show_final_result_disposition', label: 'Final Result Disposition' },
  { key: 'show_test_remark', label: 'Test Remark' },
  { key: 'show_final_remark', label: 'Final Remark' },
];

export default function ViewLabTestForm({ labTestId, token, b2bClientId }: Props) {
  const [loading, setLoading] = useState(true);
  const [test, setTest] = useState<any>(null);
  const [questions, setQuestions] = useState<any[]>([]);
  const [parameters, setParameters] = useState<any[]>([]);
  const [specimens, setSpecimens] = useState<any[]>([]);

  useEffect(() => {
    setLoading(true);

    const b2bQuery = b2bClientId ? `&b2b_client_id=${b2bClientId}` : '';
    const testUrl = b2bClientId
      ? `${API}/api/B2bClientLabTestAccess/display-options?b2b_client_id=${b2bClientId}&lab_test_id=${labTestId}`
      : `${API}/api/LabTests/${labTestId}`;

    Promise.all([
      fetch(testUrl, { headers: { token } }).then(r => r.json()),
      fetch(`${API}/api/ReportQuestions?lab_test_id=${labTestId}${b2bQuery}&status=true`, { headers: { token } }).then(r => r.json()),
      fetch(`${API}/api/ReportRequestParameters?lab_test_id=${labTestId}${b2bQuery}&status=true`, { headers: { token } }).then(r => r.json()),
      fetch(`${API}/api/SpecimenTypeDrugLinking?lab_test_id=${labTestId}${b2bQuery}&status=true`, { headers: { token } }).then(r => r.json()),
    ])
      .then(([testRes, qRes, pRes, sRes]) => {
        if (testRes.response_code === '200') setTest(testRes.obj);
        if (qRes.response_code === '200') {
          setQuestions((qRes.obj || []).filter((x: any) => !x.deleted && x.status !== false));
        }
        if (pRes.response_code === '200') {
          setParameters((pRes.obj || []).filter((x: any) => !x.deleted && x.status !== false));
        }
        if (sRes.response_code === '200') {
          setSpecimens((sRes.obj || []).filter((x: any) => x.status !== false));
        }
      })
      .finally(() => setLoading(false));
  }, [labTestId, token, b2bClientId]);

  const visibleFields = FIELD_LABELS.filter(f => test?.[f.key]);

  if (loading) {
    return <PageLoader message="Loading form..." />;
  }

  if (!test) {
    return <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>Test not found.</div>;
  }

  return (
    <>
      {test.description && (
        <p style={{ color: 'var(--text-muted)', marginBottom: '1rem', fontSize: '0.875rem' }}>
          {test.description}
        </p>
      )}

      {visibleFields.length === 0 && questions.length === 0 && parameters.length === 0 ? (
        <p style={{ color: 'var(--text-muted)' }}>No form fields are configured for this test.</p>
      ) : (
        <div className="view-form-grid">
          {visibleFields.map(f => (
            <div className="form-group" key={f.key}>
              <label>{f.label}</label>
              {f.key === 'show_specimen' ? (
                <select disabled defaultValue="">
                  <option value="">Select specimen</option>
                  {specimens.map((s: any) => (
                    <option key={s.id} value={s.specimen_type_id || s.id}>
                      {s.specimen_type_name || s.name || `Specimen #${s.specimen_type_id || s.id}`}
                    </option>
                  ))}
                </select>
              ) : f.key === 'show_regulation' ? (
                <select disabled defaultValue="Non-DOT">
                  <option>Non-DOT</option>
                  <option>DOT</option>
                </select>
              ) : f.key === 'show_test_remark' || f.key === 'show_final_remark' ? (
                <textarea disabled rows={2} placeholder={f.label} />
              ) : (
                <input disabled type={f.type || 'text'} placeholder={f.label} />
              )}
            </div>
          ))}
        </div>
      )}

      {questions.length > 0 && (
        <div style={{ marginTop: '1.25rem' }}>
          <h3 className="view-form-section-title">Report Questions</h3>
          <div className="view-form-grid">
            {questions.map((q: any) => (
              <div className="form-group" key={q.id}>
                <label>{q.question_text || q.description || 'Question'}</label>
                <input disabled placeholder="Answer" />
              </div>
            ))}
          </div>
        </div>
      )}

      {parameters.length > 0 && (
        <div style={{ marginTop: '1.25rem' }}>
          <h3 className="view-form-section-title">Result Parameters</h3>
          <div className="view-form-grid">
            {parameters.map((p: any) => (
              <div className="form-group" key={p.id}>
                <label>
                  {p.label || p.name || 'Parameter'}
                  {p.unit_text ? ` (${p.unit_text})` : ''}
                </label>
                <input disabled placeholder={p.placeholder || 'Value'} />
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
