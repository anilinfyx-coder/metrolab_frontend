'use client';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

export default function PrintPhysicalExamination() {
  const { id } = useParams();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCert = async () => {
      try {
        const token = localStorage.getItem('admin_token') || '';
        const res = await fetch(`${API}/api/PhysicalExaminationCertificates/${id}`, { headers: { token } });
        const json = await res.json();
        if (json.response_code === '200') {
          setData(json.obj);
          setTimeout(() => {
            window.print();
          }, 500);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchCert();
  }, [id]);

  if (loading) return <div style={{ padding: '20px', textAlign: 'center' }}>Loading...</div>;
  if (!data) return <div style={{ padding: '20px', textAlign: 'center' }}>Certificate not found</div>;

  const formatDate = (d: string) => {
    if (!d) return '';
    const date = new Date(d);
    return `${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getDate().toString().padStart(2, '0')}/${date.getFullYear()}`;
  };

  const fullAddress = [data.street1, data.street2, data.city, data.state, data.zipcode].filter(Boolean).join(', ');

  const EvalLine = ({ num, label, val }: { num: string, label: string, val: string }) => (
    <div style={{ display: 'flex', marginBottom: '8px' }}>
      <div style={{ width: '25px', textAlign: 'right', paddingRight: '5px' }}>{num}.</div>
      <div style={{ flex: 1 }}>
        {label}
        <span className="line-input" style={{ width: '100px', marginLeft: '5px', textAlign: 'center' }}>
          {val || '___'}
        </span>
      </div>
    </div>
  );

  return (
    <div style={{ background: '#fff', minHeight: '100vh', padding: '20px', fontFamily: 'Arial, sans-serif', color: '#000' }}>
      <style dangerouslySetInnerHTML={{__html: `
        @media print {
          body { -webkit-print-color-adjust: exact; margin: 0; padding: 0; }
          .no-print { display: none !important; }
        }
        .line-input {
          display: inline-block;
          border-bottom: 1px solid #000;
          min-width: 50px;
          padding: 0 5px;
        }
        .cert-container {
          max-width: 800px;
          margin: 0 auto;
          background: #fff;
          padding: 40px;
        }
        .header {
          text-align: center;
          margin-bottom: 30px;
        }
        .header h1 {
          font-size: 32px;
          font-weight: bold;
          margin: 0;
          color: #333;
        }
        .header p {
          margin: 2px 0;
          font-size: 14px;
        }
        .title {
          text-align: center;
          font-size: 20px;
          font-weight: bold;
          margin: 20px 0;
        }
      `}} />

      <div className="no-print" style={{ textAlign: 'center', marginBottom: '20px' }}>
        <button onClick={() => window.print()} style={{ padding: '10px 20px', background: '#0d6efd', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
          Print Certificate
        </button>
      </div>

      <div className="cert-container">
        {/* HEADER */}
        <div className="header">
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '15px', marginBottom: '10px' }}>
            {data.b2b_logo ? (
              <img src={`${API}/uploads/${data.b2b_logo}`} alt="Logo" style={{ height: '60px' }} onError={(e) => e.currentTarget.style.display = 'none'} />
            ) : (
              <img src="/metrolablogo.png" alt="Metro Lab Logo" style={{ height: '60px' }} onError={(e) => e.currentTarget.style.display = 'none'} />
            )}
            {!data.b2b_logo && (
               <div>
                  <h1 style={{ letterSpacing: '2px', color: '#666' }}>METRO <span style={{ color: '#d4af37' }}>LAB</span></h1>
               </div>
            )}
          </div>
          <div style={{ borderBottom: '2px solid #6c9cd4', borderTop: '2px solid #6c9cd4', padding: '5px 0' }}>
            <p>{data.b2b_address || '3422 Georgia Avenue NW • Washington, D.C. 20010'}</p>
            <p>Phone: {data.b2b_phone || '202.234.1234'} • Fax: {data.b2b_fax || '202.234.1339'} • {data.b2b_email || 'manager@metrolabdc.com'}</p>
          </div>
          <h2 style={{ marginTop: '20px', marginBottom: '5px' }}>{data.b2b_company_name || 'Metro Lab & Clinic LLC'}</h2>
          <p>{data.b2b_address || '3422 Georgia Ave NW Washington DC 20010'}</p>
          <p>(Tell) {data.b2b_phone || '202-234-1234'} (Fax) {data.b2b_fax || '202-234-1339'}</p>
          <p>{data.b2b_website || 'www.metrolabdc.com'}</p>
        </div>

        <div className="title">Physical Examination Certificate</div>

        {/* PATIENT INFO */}
        <div style={{ marginBottom: '20px', fontSize: '14px', lineHeight: '2' }}>
          <div style={{ display: 'flex', gap: '10px' }}>
            <div style={{ flex: 1 }}>Name: <span className="line-input" style={{ width: '80%' }}>{data.name}</span></div>
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <div style={{ flex: 1 }}>DOB: <span className="line-input" style={{ width: '60%' }}>{formatDate(data.dob)}</span></div>
            <div style={{ flex: 1 }}>Tel #: <span className="line-input" style={{ width: '80%' }}>{data.tel}</span></div>
          </div>
          <div>
            Address: <span className="line-input" style={{ width: '90%' }}>{fullAddress || '_________________________________'}</span>
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <div>Sex: <span className="line-input" style={{ width: '50px', textAlign: 'center' }}>{data.sex === 1 ? 'M' : data.sex === 2 ? 'F' : data.sex || ''}</span></div>
            <div>Age: <span className="line-input" style={{ width: '50px', textAlign: 'center' }}>{data.age || ''}</span></div>
            <div>Height: <span className="line-input" style={{ width: '50px', textAlign: 'center' }}>{data.height || ''}</span></div>
            <div>Weight: <span className="line-input" style={{ width: '50px', textAlign: 'center' }}>{data.weight || ''}</span></div>
          </div>
        </div>

        <div style={{ fontWeight: 'bold', marginBottom: '10px' }}>
          EVALUATED with corresponding letter <br/>
          NORMAL = N &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; ABNORMAL = AB
        </div>

        <div style={{ marginBottom: '20px', lineHeight: '2' }}>
          <div style={{ display: 'flex', gap: '40px' }}>
            <div>Blood pressure: <span className="line-input" style={{ width: '80px', textAlign: 'center' }}>{data.bp}</span></div>
            <div>Pulse: <span className="line-input" style={{ width: '80px', textAlign: 'center' }}>{data.pulse}</span></div>
          </div>
          <div style={{ display: 'flex', gap: '20px' }}>
            <div>Hearing: Right: <span className="line-input" style={{ width: '60px', textAlign: 'center' }}>{data.hearing_right}</span></div>
            <div>Left: <span className="line-input" style={{ width: '60px', textAlign: 'center' }}>{data.hearing_left}</span></div>
          </div>
          <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
            <div>Vision: Right 20 / <span className="line-input" style={{ width: '40px', textAlign: 'center' }}>{data.vision_right}</span></div>
            <div>Left 20 / <span className="line-input" style={{ width: '40px', textAlign: 'center' }}>{data.vision_left}</span></div>
            <div style={{ marginLeft: '20px' }}>
              Wear glasses: 
              <span style={{ marginLeft: '10px' }}>Yes <span className="line-input" style={{ width: '30px', textAlign: 'center' }}>{data.wear_glasses ? 'X' : ''}</span></span>
              <span style={{ marginLeft: '10px' }}>No <span className="line-input" style={{ width: '30px', textAlign: 'center' }}>{!data.wear_glasses ? 'X' : ''}</span></span>
            </div>
          </div>
        </div>

        <div style={{ marginBottom: '20px', paddingLeft: '20px' }}>
          <EvalLine num="1" label="Head, Neck, Face & Scalp" val={data.eval_head} />
          <EvalLine num="2" label="Nose and Sinuses" val={data.eval_nose} />
          <EvalLine num="3" label="Mouth and Throat" val={data.eval_mouth} />
          <EvalLine num="4" label="Ears" val={data.eval_ears} />
          <EvalLine num="5" label="Eyes, Pupils and Ocular Motion" val={data.eval_eyes} />
          <EvalLine num="6" label="Lungs, Chest, and Breasts" val={data.eval_lungs} />
          <EvalLine num="7" label="Heart" val={data.eval_heart} />
          <EvalLine num="8" label="Vascular System" val={data.eval_vascular} />
          <EvalLine num="9" label="Abdomen and Viscera" val={data.eval_abdomen} />
          <EvalLine num="10" label="Spine, other Muscular Skeletal System" val={data.eval_spine} />
          <EvalLine num="11" label="Skin and Lymphatic" val={data.eval_skin} />
          <EvalLine num="12" label="Neurologic" val={data.eval_neurologic} />
          <div style={{ display: 'flex', marginTop: '10px' }}>
            <div style={{ width: '25px', textAlign: 'right', paddingRight: '5px' }}>13.</div>
            <div style={{ flex: 1 }}>
              Additional Comment, Past medical history, current medications:
              <div className="line-input" style={{ width: '100%', minHeight: '20px', marginTop: '5px' }}>
                {data.additional_comments}
              </div>
            </div>
          </div>
        </div>

        <div style={{ marginTop: '30px', paddingLeft: '20px' }}>
          <div style={{ display: 'flex', marginBottom: '30px', alignItems: 'center' }}>
            <div style={{ width: '25px', textAlign: 'right', paddingRight: '5px' }}>14.</div>
            <div>
              Overall Physical Condition 
              <span style={{ marginLeft: '20px' }}>Fit <span className="line-input" style={{ width: '100px', textAlign: 'center' }}>{data.overall_condition === 'Fit' ? 'X' : ''}</span></span>
              <span style={{ marginLeft: '20px' }}>Unfit <span className="line-input" style={{ width: '100px', textAlign: 'center' }}>{data.overall_condition === 'Unfit' ? 'X' : ''}</span></span>
            </div>
          </div>

          <div style={{ lineHeight: '2.5' }}>
            <div style={{ display: 'flex', alignItems: 'flex-end' }}>
              <div style={{ width: '250px' }}>Name/Signature of examining Clinician:</div>
              <div className="line-input" style={{ flex: 1, paddingLeft: '10px', textAlign: 'center', position: 'relative', minHeight: '30px' }}>
                {data.b2b_signature ? (
                  <img src={`${API}/uploads/${data.b2b_signature}`} alt="Signature" style={{ maxHeight: '40px', position: 'absolute', bottom: '0', left: '50%', transform: 'translateX(-50%)' }} onError={(e) => e.currentTarget.style.display = 'none'} />
                ) : (
                  <span style={{ fontFamily: "'Brush Script MT', cursive", fontSize: '24px' }}>{data.clinician_name}</span>
                )}
              </div>
              <div style={{ width: '80px', textAlign: 'right' }}>MD/PA/NP</div>
            </div>
            <div style={{ display: 'flex' }}>
              <div style={{ width: '150px' }}>Date of examination:</div>
              <div className="line-input" style={{ flex: 1, paddingLeft: '10px' }}>{formatDate(data.date_of_examination)}</div>
            </div>
            <div style={{ display: 'flex' }}>
              <div style={{ width: '60px' }}>Address:</div>
              <div className="line-input" style={{ flex: 1, paddingLeft: '10px' }}>{data.clinician_address}</div>
            </div>
          </div>
        </div>

        <div style={{ textAlign: 'center', marginTop: '40px', fontWeight: 'bold' }}>
          www.metrolabdc.com
        </div>
      </div>
    </div>
  );
}
