import { useState } from 'react';
import { apiFetch } from '../../../../lib/api';

const FormGroup = ({ label, htmlFor, required, error, children }: any) => (
  <div className="form-group" style={{ marginBottom: '1.5rem' }}>
    <label htmlFor={htmlFor} style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500, color: 'var(--text-main)' }}>
      {label}{required && <span className="required-star" style={{ color: 'var(--accent-red)' }}>*</span>}
    </label>
    {children}
    {error && <div style={{ color: 'var(--accent-red)', fontSize: '0.85rem', marginTop: '0.25rem' }}>{error}</div>}
  </div>
);

const fieldStyle = (hasError: boolean) => ({
  border: hasError ? '1px solid var(--accent-red)' : '1px solid var(--border-color)',
});

export default function AdultHealthInlineForm({ patientId, waitingListId, labTestId, onSuccess }: { patientId: number, waitingListId: number, labTestId: number, onSuccess: () => void }) {
  const [form, setForm] = useState({
    free_from_disease: false,
    satisfactory_physical: false,
    tuberculin_test_type: '',
    tuberculin_date_planted: '',
    tuberculin_date_read: '',
    tuberculin_result: '',
    chest_xray_date: '',
    chest_xray_result: '',
    additional_info: '',
    clinician_name: '',
    clinician_specialty: 'MD',
    clinician_address: '',
    date_of_examination: '',
  });
  const [saving, setSaving] = useState(false);

  const handleFormChange = (key: string, value: any) => {
    setForm(prev => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async () => {
    setSaving(true);
    try {
      await apiFetch('/api/AdultHealthCertificates', {
        method: 'POST',
        tokenKey: 'admin_token',
        body: JSON.stringify({ ...form, patient_id: patientId, waiting_list_id: waitingListId, lab_test_id: labTestId }),
        successMessage: 'Adult Health Certificate submitted successfully!',
        errorFallback: 'Failed to submit certificate.',
      });
      onSuccess();
    } catch {
      // Handled by apiFetch
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="card-body wl-test-form-body" style={{ padding: '2rem' }}>
      <div className="cert-form-section">
        <h4 className="cert-form-section-title">Physical Examination</h4>
        <label className="cert-form-check">
          <input type="checkbox" checked={form.free_from_disease} onChange={e => handleFormChange('free_from_disease', e.target.checked)} />
          <span>1. Free from disease in communicable form.</span>
        </label>
        <label className="cert-form-check">
          <input type="checkbox" checked={form.satisfactory_physical} onChange={e => handleFormChange('satisfactory_physical', e.target.checked)} />
          <span>
            2. In satisfactory physical condition, this will permit, close association with
            children/elderly without danger to them.
          </span>
        </label>
      </div>

      <div className="cert-form-grid cert-form-grid-2">
        <div className="cert-form-section">
          <h4 className="cert-form-section-title">Tuberculin Test</h4>
          <FormGroup label="Test Type" htmlFor="tuberculin_test_type">
            <div style={{ display: 'flex', gap: '1rem', marginTop: '0.25rem' }}>
              <label className="cert-form-check" style={{ marginBottom: 0 }}>
                <input type="radio" value="" checked={form.tuberculin_test_type === ''} onChange={() => handleFormChange('tuberculin_test_type', '')} />
                <span>None</span>
              </label>
              <label className="cert-form-check" style={{ marginBottom: 0 }}>
                <input type="radio" value="Tine" checked={form.tuberculin_test_type === 'Tine'} onChange={() => handleFormChange('tuberculin_test_type', 'Tine')} />
                <span>Tine</span>
              </label>
              <label className="cert-form-check" style={{ marginBottom: 0 }}>
                <input type="radio" value="PPD" checked={form.tuberculin_test_type === 'PPD'} onChange={() => handleFormChange('tuberculin_test_type', 'PPD')} />
                <span>PPD</span>
              </label>
            </div>
          </FormGroup>
          <div className="cert-form-grid cert-form-grid-2">
            <FormGroup label="Date Planted" htmlFor="tuberculin_date_planted">
              <input
                id="tuberculin_date_planted"
                type="date"
                className="form-control"
                style={fieldStyle(false)}
                value={form.tuberculin_date_planted}
                onChange={e => handleFormChange('tuberculin_date_planted', e.target.value)}
              />
            </FormGroup>
            <FormGroup label="Date Read" htmlFor="tuberculin_date_read">
              <input
                id="tuberculin_date_read"
                type="date"
                className="form-control"
                style={fieldStyle(false)}
                value={form.tuberculin_date_read}
                onChange={e => handleFormChange('tuberculin_date_read', e.target.value)}
              />
            </FormGroup>
          </div>
          <FormGroup label="Result" htmlFor="tuberculin_result">
            <input
              id="tuberculin_result"
              type="text"
              className="form-control"
              style={fieldStyle(false)}
              value={form.tuberculin_result}
              onChange={e => handleFormChange('tuberculin_result', e.target.value)}
            />
          </FormGroup>
        </div>

        <div className="cert-form-section">
          <h4 className="cert-form-section-title">Chest X-Ray</h4>
          <FormGroup label="Date" htmlFor="chest_xray_date">
            <input
              id="chest_xray_date"
              type="date"
              className="form-control"
              style={fieldStyle(false)}
              value={form.chest_xray_date}
              onChange={e => handleFormChange('chest_xray_date', e.target.value)}
            />
          </FormGroup>
          <FormGroup label="Result" htmlFor="chest_xray_result">
            <input
              id="chest_xray_result"
              type="text"
              className="form-control"
              style={fieldStyle(false)}
              value={form.chest_xray_result}
              onChange={e => handleFormChange('chest_xray_result', e.target.value)}
            />
          </FormGroup>
        </div>
      </div>

      <div className="cert-form-section">
        <h4 className="cert-form-section-title">Additional Information</h4>
        <FormGroup label="Past Medical History, Current Medications" htmlFor="additional_info">
          <textarea
            id="additional_info"
            className="form-control"
            rows={3}
            style={{ ...fieldStyle(false), resize: 'vertical' }}
            value={form.additional_info}
            onChange={e => handleFormChange('additional_info', e.target.value)}
          />
        </FormGroup>
      </div>

      <div className="cert-form-section">
        <h4 className="cert-form-section-title">Clinician Details</h4>
        <div className="cert-form-grid cert-form-grid-3">
          <FormGroup label="Clinician Name" htmlFor="clinician_name" required>
            <input
              id="clinician_name"
              type="text"
              className="form-control"
              placeholder="e.g. Dr. John Doe"
              style={fieldStyle(false)}
              value={form.clinician_name}
              onChange={e => handleFormChange('clinician_name', e.target.value)}
            />
          </FormGroup>
          <div className="form-group">
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500, color: 'var(--text-main)' }}>
              Specialty<span className="required-star" style={{ color: 'var(--accent-red)' }}>*</span>
            </label>
            <div className="cert-radio-group" style={{ display: 'flex', gap: '1.25rem', marginTop: '0.5rem' }}>
              {(['MD', 'PA', 'NP'] as const).map(spec => (
                <label key={spec} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.1rem', cursor: 'pointer' }}>
                  <input 
                    type="radio" 
                    value={spec} 
                    checked={form.clinician_specialty === spec}
                    onChange={() => handleFormChange('clinician_specialty', spec)}
                  />
                  {spec}
                </label>
              ))}
            </div>
          </div>
          <FormGroup label="Date of Examination" htmlFor="date_of_examination" required>
            <input
              id="date_of_examination"
              type="date"
              className="form-control"
              style={fieldStyle(false)}
              value={form.date_of_examination}
              onChange={e => handleFormChange('date_of_examination', e.target.value)}
            />
          </FormGroup>
          <div className="cert-form-span-full">
            <FormGroup label="Address" htmlFor="clinician_address">
              <input
                id="clinician_address"
                type="text"
                className="form-control"
                style={fieldStyle(false)}
                value={form.clinician_address}
                onChange={e => handleFormChange('clinician_address', e.target.value)}
              />
            </FormGroup>
          </div>
        </div>
      </div>

      <div className="wl-test-form-footer" style={{ marginTop: '2rem' }}>
        <button type="button" className="btn btn-primary wl-submit-btn" onClick={handleSubmit} disabled={saving}>
          {saving ? 'Saving...' : 'Submit Custom Certificate'}
        </button>
      </div>
    </div>
  );
}
