'use client';
import { useEffect, useState } from 'react';
import TopNav from '../../../components/TopNav';
import { formatDate } from '../../../utils/dateFormat';
import Link from 'next/link';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
function getToken() { return typeof window !== 'undefined' ? localStorage.getItem('admin_token') || '' : ''; }

export default function HealthCertificatesPage() {
  const [certificates, setCertificates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [emailingId, setEmailingId] = useState<number | null>(null);
  
  // Form state
  const [formData, setFormData] = useState({
    patient_id: '',
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
    date_of_examination: ''
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/AdultHealthCertificates`, { headers: { token: getToken() } });
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
    if (!formData.patient_id) {
      alert('Please search and select a patient first.');
      return;
    }
    if (!formData.clinician_specialty) {
      alert('Please select a clinician specialty (MD, PA, or NP).');
      return;
    }
    try {
      const res = await fetch(`${API}/api/AdultHealthCertificates`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', token: getToken() },
        body: JSON.stringify(formData)
      });
      const data = await res.json();
      if (data.response_code === '200') {
        setShowModal(false);
        fetchData();
        setFormData({
          patient_id: '', free_from_disease: false, satisfactory_physical: false,
          tuberculin_test_type: '', tuberculin_date_planted: '', tuberculin_date_read: '',
          tuberculin_result: '', chest_xray_date: '', chest_xray_result: '',
          additional_info: '', clinician_name: '', clinician_specialty: 'MD', clinician_address: '', date_of_examination: ''
        });
      } else {
        alert(data.obj);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this certificate?')) return;
    try {
      await fetch(`${API}/api/AdultHealthCertificates/${id}`, {
        method: 'DELETE',
        headers: { token: getToken() }
      });
      fetchData();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <>
      <TopNav title="Adult Health Certificates" />
      <div className="page-content">
        <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h2 className="page-title">Health Certificates</h2>
            <p className="page-subtitle">Manage and print Adult Health Certificates for patients.</p>
          </div>
          <button className="btn btn-primary" onClick={() => setShowModal(!showModal)}>
            {showModal ? 'View Certificates List' : '+ Issue New Certificate'}
          </button>
        </div>

        {/* Issue Certificate Form Inline */}
        {showModal ? (
          <div className="card" style={{ width: '100%', marginBottom: '24px' }}>
            <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 className="card-title">Issue Adult Health Certificate</h3>
            </div>
            <div className="card-body">
              <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                
                <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                  <h4 style={{ margin: '0 0 12px 0', fontSize: '1rem' }}>Patient Selection</h4>
                  <div className="form-group" style={{ display: 'flex', gap: '8px' }}>
                    <div style={{ flex: 1 }}>
                      <label className="form-label">Search Patient (UID or Mobile)</label>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <input type="text" className="form-control" id="patientSearchInput" placeholder="Enter PT001 or 9999999999" />
                        <button type="button" className="btn btn-secondary" onClick={async () => {
                          const val = (document.getElementById('patientSearchInput') as HTMLInputElement).value;
                          if(!val) return;
                          const isMobile = /^\d+$/.test(val);
                          const q = isMobile ? `mobile=${val}` : `uid=${val}`;
                          try {
                            const res = await fetch(`${API}/api/Patient/search?${q}`, { headers: { token: getToken() } });
                            const data = await res.json();
                            if(data.response_code === '200') {
                              setFormData({...formData, patient_id: data.obj.id});
                              alert(`Patient Selected: ${data.obj.name}`);
                            } else {
                              alert('Patient not found!');
                            }
                          } catch(e) { alert('Error searching patient'); }
                        }}>Search</button>
                      </div>
                    </div>
                  </div>
                  {formData.patient_id && <div style={{ marginTop: '8px', color: 'green', fontWeight: 'bold' }}>✓ Patient ID {formData.patient_id} Selected</div>}
                </div>

                <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                  <h4 style={{ margin: '0 0 12px 0', fontSize: '1rem' }}>Physical Examination</h4>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', cursor: 'pointer' }}>
                    <input type="checkbox" checked={formData.free_from_disease} onChange={e => setFormData({...formData, free_from_disease: e.target.checked})} />
                    <span>1. Free from disease in communicable form.</span>
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                    <input type="checkbox" checked={formData.satisfactory_physical} onChange={e => setFormData({...formData, satisfactory_physical: e.target.checked})} />
                    <span>2. In satisfactory physical condition, this will permit, close association with children/elderly without danger to them.</span>
                  </label>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                    <h4 style={{ margin: '0 0 12px 0', fontSize: '1rem' }}>Tuberculin Test</h4>
                    <div className="form-group">
                      <label className="form-label">Test Type</label>
                      <select className="form-control" value={formData.tuberculin_test_type} onChange={e => setFormData({...formData, tuberculin_test_type: e.target.value})}>
                        <option value="">None</option>
                        <option value="Tine">Tine</option>
                        <option value="PPD">PPD</option>
                      </select>
                    </div>
                    <div className="form-group">
                      <label className="form-label">Date Planted</label>
                      <input type="date" className="form-control" value={formData.tuberculin_date_planted} onChange={e => setFormData({...formData, tuberculin_date_planted: e.target.value})} />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Date Read</label>
                      <input type="date" className="form-control" value={formData.tuberculin_date_read} onChange={e => setFormData({...formData, tuberculin_date_read: e.target.value})} />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Result</label>
                      <input type="text" className="form-control" value={formData.tuberculin_result} onChange={e => setFormData({...formData, tuberculin_result: e.target.value})} />
                    </div>
                  </div>

                  <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                    <h4 style={{ margin: '0 0 12px 0', fontSize: '1rem' }}>Chest X-Ray</h4>
                    <div className="form-group">
                      <label className="form-label">Date</label>
                      <input type="date" className="form-control" value={formData.chest_xray_date} onChange={e => setFormData({...formData, chest_xray_date: e.target.value})} />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Result</label>
                      <input type="text" className="form-control" value={formData.chest_xray_result} onChange={e => setFormData({...formData, chest_xray_result: e.target.value})} />
                    </div>
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Additional Information (Past Medical History, Current Medications)</label>
                  <textarea className="form-control" rows={3} value={formData.additional_info} onChange={e => setFormData({...formData, additional_info: e.target.value})}></textarea>
                </div>

                <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                  <h4 style={{ margin: '0 0 12px 0', fontSize: '1rem' }}>Clinician Details</h4>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
                    <div className="form-group">
                      <label className="form-label">Clinician Name *</label>
                      <input type="text" className="form-control" required value={formData.clinician_name} onChange={e => setFormData({...formData, clinician_name: e.target.value})} placeholder="e.g. Dr. John Doe" />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Specialty *</label>
                      <div style={{ display: 'flex', gap: '16px', marginTop: '8px' }}>
                        {['MD', 'PA', 'NP'].map(spec => (
                          <label key={spec} style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}>
                            <input type="radio" name="clinician_specialty" value={spec} checked={formData.clinician_specialty === spec} onChange={e => setFormData({...formData, clinician_specialty: e.target.value})} />
                            {spec}
                          </label>
                        ))}
                      </div>
                    </div>
                    <div className="form-group">
                      <label className="form-label">Date of Exam *</label>
                      <input type="date" className="form-control" required value={formData.date_of_examination} onChange={e => setFormData({...formData, date_of_examination: e.target.value})} />
                    </div>
                  </div>
                  <div className="form-group" style={{ marginTop: '16px' }}>
                    <label className="form-label">Clinician Address</label>
                    <input type="text" className="form-control" value={formData.clinician_address} onChange={e => setFormData({...formData, clinician_address: e.target.value})} />
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '16px' }}>
                  <button type="button" className="btn btn-ghost" onClick={() => setShowModal(false)}>Cancel</button>
                  <button type="submit" className="btn btn-primary">Save & Issue Certificate</button>
                </div>

              </form>
            </div>
          </div>
        ) : (
          <div className="card">
            <div className="card-body" style={{ padding: 0 }}>
              <div className="table-responsive">
                <table className="table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr>
                      <th style={{ textAlign: 'left', padding: '12px 16px', borderBottom: '1px solid #e2e8f0', background: '#f8fafc', color: '#64748b', fontSize: '13px', fontWeight: 600 }}>Cert ID</th>
                      <th style={{ textAlign: 'left', padding: '12px 16px', borderBottom: '1px solid #e2e8f0', background: '#f8fafc', color: '#64748b', fontSize: '13px', fontWeight: 600 }}>Patient Name</th>
                      <th style={{ textAlign: 'left', padding: '12px 16px', borderBottom: '1px solid #e2e8f0', background: '#f8fafc', color: '#64748b', fontSize: '13px', fontWeight: 600 }}>Exam Date</th>
                      <th style={{ textAlign: 'left', padding: '12px 16px', borderBottom: '1px solid #e2e8f0', background: '#f8fafc', color: '#64748b', fontSize: '13px', fontWeight: 600 }}>Clinician</th>
                      <th style={{ textAlign: 'right', padding: '12px 16px', borderBottom: '1px solid #e2e8f0', background: '#f8fafc', color: '#64748b', fontSize: '13px', fontWeight: 600 }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <tr><td colSpan={5} style={{ textAlign: 'center', padding: '24px' }}>Loading...</td></tr>
                    ) : certificates.length === 0 ? (
                      <tr><td colSpan={5} style={{ textAlign: 'center', padding: '24px', color: '#64748b' }}>No certificates found.</td></tr>
                    ) : (
                      certificates.map((cert) => (
                        <tr key={cert.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                          <td style={{ padding: '12px 16px', fontSize: '14px', color: '#0f172a' }}>#{cert.id}</td>
                          <td style={{ padding: '12px 16px', fontSize: '14px', color: '#0f172a', fontWeight: 500 }}>{cert.name || 'Unknown'}</td>
                          <td style={{ padding: '12px 16px', fontSize: '14px', color: '#64748b' }}>{cert.date_of_examination ? formatDate(cert.date_of_examination) : '—'}</td>
                          <td style={{ padding: '12px 16px', fontSize: '14px', color: '#64748b' }}>{cert.clinician_name || '—'}</td>
                          <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                              <button 
                                className="btn btn-sm" 
                                style={{ padding: '4px 8px', background: '#f1f5f9', color: '#0f172a', border: '1px solid #cbd5e1' }}
                                disabled={emailingId === cert.id}
                                onClick={async () => {
                                  setEmailingId(cert.id);
                                  try {
                                    const res = await fetch(`${API}/api/AdultHealthCertificates/email`, {
                                      method: 'POST',
                                      headers: { 'Content-Type': 'application/json', token: getToken() },
                                      body: JSON.stringify({ id: cert.id })
                                    });
                                    const data = await res.json();
                                    if (data.response_code === '200') {
                                      alert('Certificate emailed successfully!');
                                    } else {
                                      alert(data.obj || 'Failed to email certificate');
                                    }
                                  } catch(e) {
                                    alert('Error sending email');
                                  } finally {
                                    setEmailingId(null);
                                  }
                                }}
                              >
                                {emailingId === cert.id ? '⏳' : '✉️ Email'}
                              </button>
                              <Link href={`/admin/dashboard/health-certificates/print/${cert.id}`} target="_blank" className="btn btn-sm btn-ghost" style={{ padding: '4px 8px' }}>
                                🖨️ Print
                              </Link>
                              <button className="btn btn-sm" style={{ padding: '4px 8px', color: '#dc2626', background: 'transparent', border: '1px solid #dc2626' }} onClick={() => handleDelete(cert.id)}>
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
            </div>
          </div>
        )}
      </div>
    </>
  );
}
