'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import TopNav from '../../../components/TopNav';
import Link from 'next/link';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

export default function PhysicalExaminationsPage() {
  const [certificates, setCertificates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  
  const [formData, setFormData] = useState({
    patient_id: '',
    age: '', height: '', weight: '', bp: '', pulse: '',
    hearing_right: '', hearing_left: '',
    vision_right: '', vision_left: '', wear_glasses: false,
    eval_head: '', eval_nose: '', eval_mouth: '', eval_ears: '',
    eval_eyes: '', eval_lungs: '', eval_heart: '', eval_vascular: '',
    eval_abdomen: '', eval_spine: '', eval_skin: '', eval_neurologic: '',
    additional_comments: '',
    overall_condition: 'Fit',
    clinician_name: '',
    date_of_examination: '',
    clinician_address: ''
  });

  const router = useRouter();

  const getToken = () => localStorage.getItem('admin_token') || '';

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/PhysicalExaminationCertificates`, { headers: { token: getToken() } });
      const data = await res.json();
      if (data.response_code === '200') setCertificates(data.obj || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch(`${API}/api/PhysicalExaminationCertificates`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', token: getToken() },
        body: JSON.stringify(formData)
      });
      const data = await res.json();
      if (data.response_code === '200') {
        alert('Certificate issued successfully');
        setShowModal(false);
        fetchData();
        setFormData({
          patient_id: '', age: '', height: '', weight: '', bp: '', pulse: '',
          hearing_right: '', hearing_left: '', vision_right: '', vision_left: '', wear_glasses: false,
          eval_head: '', eval_nose: '', eval_mouth: '', eval_ears: '',
          eval_eyes: '', eval_lungs: '', eval_heart: '', eval_vascular: '',
          eval_abdomen: '', eval_spine: '', eval_skin: '', eval_neurologic: '',
          additional_comments: '', overall_condition: 'Fit', clinician_name: '',
          date_of_examination: '', clinician_address: ''
        });
      } else {
        alert(data.obj);
      }
    } catch (err) {
      alert('Failed to save');
    }
  };

  const deleteCert = async (id: number) => {
    if(!confirm('Are you sure you want to delete this certificate?')) return;
    try {
      await fetch(`${API}/api/PhysicalExaminationCertificates/${id}`, { method: 'DELETE', headers: { token: getToken() } });
      fetchData();
    } catch(err) { alert('Delete failed'); }
  };

  const formatDate = (d: string) => new Date(d).toLocaleDateString();

  const EvalSelect = ({ label, field }: { label: string, field: string }) => (
    <div className="col-md-6" style={{ display: 'flex', alignItems: 'center', marginBottom: '8px' }}>
      <label style={{ width: '180px', marginBottom: 0 }}>{label}</label>
      <select className="form-control" style={{ width: '100px' }} value={(formData as any)[field]} onChange={e => setFormData({...formData, [field]: e.target.value})}>
        <option value="">-</option>
        <option value="N">Normal (N)</option>
        <option value="AB">Abnormal (AB)</option>
      </select>
    </div>
  );

  return (
    <div className="admin-page">
      <TopNav title="Physical Examination Certificates" />
      <div className="page-content">
        <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h2 className="page-title">Physical Examinations</h2>
            <p className="page-subtitle">Manage and print Physical Examination certificates</p>
          </div>
          <button className="btn btn-primary" onClick={() => setShowModal(true)}>
            + Issue New Certificate
          </button>
        </div>

        <div className="card">
          <div className="card-body" style={{ padding: 0 }}>
            {loading ? (
              <div style={{ padding: '24px', textAlign: 'center' }}>Loading...</div>
            ) : (
              <div className="table-responsive">
                <table className="table">
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>PATIENT</th>
                      <th>EXAM DATE</th>
                      <th>CLINICIAN</th>
                      <th>CONDITION</th>
                      <th>ACTIONS</th>
                    </tr>
                  </thead>
              <tbody>
                {certificates.length === 0 ? (
                  <tr><td colSpan={6} style={{ textAlign: 'center', padding: '24px' }}>No certificates found</td></tr>
                ) : (
                  certificates.map(cert => (
                    <tr key={cert.id}>
                      <td>#{cert.id}</td>
                      <td>
                        <strong>{cert.name}</strong>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>ID: {cert.patient_id}</div>
                      </td>
                      <td>{cert.date_of_examination ? formatDate(cert.date_of_examination) : 'N/A'}</td>
                      <td>{cert.clinician_name}</td>
                      <td>
                        <span className={`badge ${cert.overall_condition === 'Fit' ? 'badge-success' : 'badge-danger'}`}>
                          {cert.overall_condition}
                        </span>
                      </td>
                        <td>
                          <div style={{ display: 'flex', gap: '8px' }}>
                            <Link href={`/admin/dashboard/physical-examinations/print/${cert.id}`} target="_blank" className="btn btn-sm btn-ghost" style={{ padding: '4px 8px' }}>
                              🖨️ Print
                            </Link>
                            <button className="btn btn-sm" style={{ padding: '4px 8px', color: '#dc2626', background: 'transparent', border: '1px solid #dc2626' }} onClick={() => deleteCert(cert.id)}>
                              🗑️
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            )}
          </div>
        </div>

      {showModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1050, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: '#fff', borderRadius: '8px', width: '900px', maxWidth: '95%', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '16px 24px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0 }}>Issue Physical Examination Certificate</h3>
              <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', fontSize: '24px', cursor: 'pointer' }}>&times;</button>
            </div>
            
            <div style={{ padding: '24px', overflowY: 'auto', flex: 1 }}>
              <form id="peForm" onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                
                {/* Patient Selection */}
                <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                  <h4 style={{ margin: '0 0 12px 0', fontSize: '1rem' }}>Patient Selection</h4>
                  <div className="form-group">
                    <label className="form-label">Search Patient (UID or Mobile)</label>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <input type="text" className="form-control" id="patientSearchInput" placeholder="Enter PT001 or 9999999999" />
                      <button type="button" className="btn btn-secondary" onClick={async () => {
                        const val = (document.getElementById('patientSearchInput') as HTMLInputElement).value;
                        if(!val) return;
                        const isMobile = /^\\d+$/.test(val);
                        const q = isMobile ? `mobile=${val}` : `uid=${val}`;
                        try {
                          const res = await fetch(`${API}/api/Patient/search?${q}`, { headers: { token: getToken() } });
                          const data = await res.json();
                          if(data.response_code === '200') {
                            setFormData({...formData, patient_id: data.obj.id, age: '', height: '', weight: ''}); // Could auto-calculate age here if needed
                            alert(`Patient Selected: ${data.obj.name}`);
                          } else {
                            alert('Patient not found!');
                          }
                        } catch(e) { alert('Error searching patient'); }
                      }}>Search</button>
                    </div>
                  </div>
                  {formData.patient_id && <div style={{ marginTop: '8px', color: 'green', fontWeight: 'bold' }}>✓ Patient ID {formData.patient_id} Selected</div>}
                </div>

                {/* Vitals Section */}
                <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                  <h4 style={{ margin: '0 0 12px 0', fontSize: '1rem' }}>Vitals & Basics</h4>
                  <div className="row">
                    <div className="col-md-4 form-group"><label>Age</label><input type="text" className="form-control" value={formData.age} onChange={e=>setFormData({...formData, age:e.target.value})} /></div>
                    <div className="col-md-4 form-group"><label>Height</label><input type="text" className="form-control" value={formData.height} onChange={e=>setFormData({...formData, height:e.target.value})} /></div>
                    <div className="col-md-4 form-group"><label>Weight</label><input type="text" className="form-control" value={formData.weight} onChange={e=>setFormData({...formData, weight:e.target.value})} /></div>
                    <div className="col-md-6 form-group mt-2"><label>Blood Pressure</label><input type="text" className="form-control" value={formData.bp} onChange={e=>setFormData({...formData, bp:e.target.value})} /></div>
                    <div className="col-md-6 form-group mt-2"><label>Pulse</label><input type="text" className="form-control" value={formData.pulse} onChange={e=>setFormData({...formData, pulse:e.target.value})} /></div>
                  </div>
                </div>

                {/* Hearing & Vision */}
                <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                  <h4 style={{ margin: '0 0 12px 0', fontSize: '1rem' }}>Hearing & Vision</h4>
                  <div className="row">
                    <div className="col-md-6 form-group"><label>Hearing Right</label><input type="text" className="form-control" value={formData.hearing_right} onChange={e=>setFormData({...formData, hearing_right:e.target.value})} /></div>
                    <div className="col-md-6 form-group"><label>Hearing Left</label><input type="text" className="form-control" value={formData.hearing_left} onChange={e=>setFormData({...formData, hearing_left:e.target.value})} /></div>
                    <div className="col-md-6 form-group mt-2"><label>Vision Right (20/___)</label><input type="text" className="form-control" value={formData.vision_right} onChange={e=>setFormData({...formData, vision_right:e.target.value})} /></div>
                    <div className="col-md-6 form-group mt-2"><label>Vision Left (20/___)</label><input type="text" className="form-control" value={formData.vision_left} onChange={e=>setFormData({...formData, vision_left:e.target.value})} /></div>
                    <div className="col-md-12 form-group mt-2">
                      <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                        <input type="checkbox" checked={formData.wear_glasses} onChange={e=>setFormData({...formData, wear_glasses:e.target.checked})} />
                        Wear Glasses
                      </label>
                    </div>
                  </div>
                </div>

                {/* Evaluations */}
                <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                  <h4 style={{ margin: '0 0 12px 0', fontSize: '1rem' }}>Evaluation (NORMAL = N, ABNORMAL = AB)</h4>
                  <div className="row">
                    <EvalSelect label="1. Head, Neck, Face & Scalp" field="eval_head" />
                    <EvalSelect label="2. Nose and Sinuses" field="eval_nose" />
                    <EvalSelect label="3. Mouth and Throat" field="eval_mouth" />
                    <EvalSelect label="4. Ears" field="eval_ears" />
                    <EvalSelect label="5. Eyes, Pupils & Motion" field="eval_eyes" />
                    <EvalSelect label="6. Lungs, Chest & Breasts" field="eval_lungs" />
                    <EvalSelect label="7. Heart" field="eval_heart" />
                    <EvalSelect label="8. Vascular System" field="eval_vascular" />
                    <EvalSelect label="9. Abdomen and Viscera" field="eval_abdomen" />
                    <EvalSelect label="10. Spine, Muscular Skeletal" field="eval_spine" />
                    <EvalSelect label="11. Skin and Lymphatic" field="eval_skin" />
                    <EvalSelect label="12. Neurologic" field="eval_neurologic" />
                  </div>
                  
                  <div className="form-group mt-3">
                    <label>13. Additional Comment, Past medical history, current medications:</label>
                    <textarea className="form-control" rows={3} value={formData.additional_comments} onChange={e=>setFormData({...formData, additional_comments:e.target.value})}></textarea>
                  </div>
                </div>

                {/* Conclusion */}
                <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                  <h4 style={{ margin: '0 0 12px 0', fontSize: '1rem' }}>Conclusion & Signature</h4>
                  
                  <div className="form-group mb-3">
                    <label>14. Overall Physical Condition</label>
                    <select className="form-control" value={formData.overall_condition} onChange={e=>setFormData({...formData, overall_condition:e.target.value})}>
                      <option value="Fit">Fit</option>
                      <option value="Unfit">Unfit</option>
                    </select>
                  </div>

                  <div className="row">
                    <div className="col-md-12 form-group">
                      <label>Examining Clinician Name (MD/PA/NP)</label>
                      <input type="text" className="form-control" required value={formData.clinician_name} onChange={e=>setFormData({...formData, clinician_name:e.target.value})} />
                    </div>
                    <div className="col-md-6 form-group mt-2">
                      <label>Date of Examination</label>
                      <input type="date" className="form-control" required value={formData.date_of_examination} onChange={e=>setFormData({...formData, date_of_examination:e.target.value})} />
                    </div>
                    <div className="col-md-6 form-group mt-2">
                      <label>Address</label>
                      <input type="text" className="form-control" value={formData.clinician_address} onChange={e=>setFormData({...formData, clinician_address:e.target.value})} />
                    </div>
                  </div>
                </div>

              </form>
            </div>
            
            <div style={{ padding: '16px 24px', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
              <button className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
              <button type="submit" form="peForm" className="btn btn-primary" disabled={!formData.patient_id}>Save Certificate</button>
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  );
}
