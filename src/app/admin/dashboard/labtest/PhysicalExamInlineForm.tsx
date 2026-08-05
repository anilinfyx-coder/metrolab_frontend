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

const EVAL_FIELDS = [
  { field: 'eval_head', label: '1. Head, Face, Neck, & Scalp' },
  { field: 'eval_nose', label: '2. Nose & Sinuses' },
  { field: 'eval_mouth', label: '3. Mouth & Throat' },
  { field: 'eval_ears', label: '4. Ears' },
  { field: 'eval_eyes', label: '5. Eyes' },
  { field: 'eval_lungs', label: '6. Lungs & Chest' },
  { field: 'eval_heart', label: '7. Heart (Thrust, size, rhythm, sounds)' },
  { field: 'eval_vascular', label: '8. Vascular System' },
  { field: 'eval_abdomen', label: '9. Abdomen & Viscera' },
  { field: 'eval_spine', label: '10. Spine, other musculoskeletal' },
  { field: 'eval_skin', label: '11. Skin, Lymphatics' },
  { field: 'eval_neurologic', label: '12. Neurologic' },
];

export default function PhysicalExamInlineForm({ patientId, waitingListId, labTestId, onSuccess }: { patientId: number, waitingListId: number, labTestId: number, onSuccess: () => void }) {
  const [form, setForm] = useState({
    age: '',
    height: '',
    weight: '',
    bp: '',
    pulse: '',
    hearing_right: '',
    hearing_left: '',
    vision_right: '',
    vision_left: '',
    wear_glasses: false,
    eval_head: 'Normal',
    eval_nose: 'Normal',
    eval_mouth: 'Normal',
    eval_ears: 'Normal',
    eval_eyes: 'Normal',
    eval_lungs: 'Normal',
    eval_heart: 'Normal',
    eval_vascular: 'Normal',
    eval_abdomen: 'Normal',
    eval_spine: 'Normal',
    eval_skin: 'Normal',
    eval_neurologic: 'Normal',
    additional_comments: '',
    overall_condition: 'Fit',
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
      await apiFetch('/api/PhysicalExaminationCertificates', {
        method: 'POST',
        tokenKey: 'admin_token',
        body: JSON.stringify({ ...form, patient_id: patientId, waiting_list_id: waitingListId, lab_test_id: labTestId }),
        successMessage: 'Physical Examination Certificate submitted successfully!',
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
        <h4 className="cert-form-section-title">Vitals & Measurements</h4>
        <div className="cert-form-grid cert-form-grid-3">
          <FormGroup label="Age" htmlFor="age">
            <input id="age" type="number" className="form-control" style={fieldStyle(false)} value={form.age} onChange={e => handleFormChange('age', e.target.value)} />
          </FormGroup>
          <FormGroup label="Height (in/cm)" htmlFor="height">
            <input id="height" type="text" className="form-control" style={fieldStyle(false)} value={form.height} onChange={e => handleFormChange('height', e.target.value)} />
          </FormGroup>
          <FormGroup label="Weight" htmlFor="weight">
            <input id="weight" type="text" className="form-control" style={fieldStyle(false)} value={form.weight} onChange={e => handleFormChange('weight', e.target.value)} />
          </FormGroup>
          <FormGroup label="Blood Pressure" htmlFor="bp">
            <input id="bp" type="text" className="form-control" style={fieldStyle(false)} value={form.bp} onChange={e => handleFormChange('bp', e.target.value)} />
          </FormGroup>
          <FormGroup label="Pulse" htmlFor="pulse">
            <input id="pulse" type="text" className="form-control" style={fieldStyle(false)} value={form.pulse} onChange={e => handleFormChange('pulse', e.target.value)} />
          </FormGroup>
        </div>
      </div>

      <div className="cert-form-section">
        <h4 className="cert-form-section-title">Hearing & Vision</h4>
        <div className="cert-form-grid cert-form-grid-2">
          <FormGroup label="Hearing Right" htmlFor="hearing_right">
            <input
              id="hearing_right"
              type="text"
              className="form-control"
              style={fieldStyle(false)}
              value={form.hearing_right}
              onChange={e => handleFormChange('hearing_right', e.target.value)}
            />
          </FormGroup>
          <FormGroup label="Hearing Left" htmlFor="hearing_left">
            <input
              id="hearing_left"
              type="text"
              className="form-control"
              style={fieldStyle(false)}
              value={form.hearing_left}
              onChange={e => handleFormChange('hearing_left', e.target.value)}
            />
          </FormGroup>
          <FormGroup label="Vision Right (20/___)" htmlFor="vision_right">
            <input
              id="vision_right"
              type="text"
              className="form-control"
              style={fieldStyle(false)}
              value={form.vision_right}
              onChange={e => handleFormChange('vision_right', e.target.value)}
            />
          </FormGroup>
          <FormGroup label="Vision Left (20/___)" htmlFor="vision_left">
            <input
              id="vision_left"
              type="text"
              className="form-control"
              style={fieldStyle(false)}
              value={form.vision_left}
              onChange={e => handleFormChange('vision_left', e.target.value)}
            />
          </FormGroup>
          <div className="cert-form-span-full">
            <label className="cert-form-check">
              <input type="checkbox" checked={form.wear_glasses} onChange={e => handleFormChange('wear_glasses', e.target.checked)} />
              <span>Wear Glasses</span>
            </label>
          </div>
        </div>
      </div>

      <div className="cert-form-section">
        <h4 className="cert-form-section-title">Evaluation (NORMAL = N, ABNORMAL = AB)</h4>
        <div className="cert-eval-list">
          {EVAL_FIELDS.map(item => (
            <div key={item.field} className="cert-eval-item" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', padding: '0.5rem', background: 'var(--bg-secondary)', borderRadius: '4px' }}>
              <span className="cert-eval-label">{item.label}</span>
              <div className="cert-eval-controls" style={{ display: 'flex', gap: '1rem' }}>
                <label className="cert-eval-radio" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                  <input
                    type="radio"
                    value="Normal"
                    checked={(form as any)[item.field] === 'Normal'}
                    onChange={() => handleFormChange(item.field, 'Normal')}
                  />
                  <span>Normal</span>
                </label>
                <label className="cert-eval-radio" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                  <input
                    type="radio"
                    value="Abnormal"
                    checked={(form as any)[item.field] === 'Abnormal'}
                    onChange={() => handleFormChange(item.field, 'Abnormal')}
                  />
                  <span>Abnormal</span>
                </label>
              </div>
            </div>
          ))}
        </div>
        <FormGroup
          label="13. Additional Comment, Past medical history, current medications"
          htmlFor="additional_comments"
        >
          <textarea
            id="additional_comments"
            className="form-control"
            rows={3}
            style={{ ...fieldStyle(false), resize: 'vertical' }}
            value={form.additional_comments}
            onChange={e => handleFormChange('additional_comments', e.target.value)}
          />
        </FormGroup>
      </div>

      <div className="cert-form-section">
        <h4 className="cert-form-section-title">Conclusion & Signature</h4>
        <div className="cert-form-grid cert-form-grid-3">
          <FormGroup label="14. Overall Physical Condition" htmlFor="overall_condition">
            <select
              id="overall_condition"
              className="form-control"
              style={fieldStyle(false)}
              value={form.overall_condition}
              onChange={e => handleFormChange('overall_condition', e.target.value)}
            >
              <option value="Fit">Fit</option>
              <option value="Unfit">Unfit</option>
            </select>
          </FormGroup>
          <FormGroup
            label="Examining Clinician Name"
            htmlFor="clinician_name"
            required
          >
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
          <FormGroup
            label="Date of Examination"
            htmlFor="date_of_examination"
            required
          >
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
