'use client';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

export default function PrintAdultHealthCertificate() {
  const { id } = useParams();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCert = async () => {
      try {
        const token = localStorage.getItem('admin_token') || '';
        const res = await fetch(`${API}/api/AdultHealthCertificates/${id}`, { headers: { token } });
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

  return (
    <div style={{ background: '#fff', minHeight: '100vh', padding: '20px', fontFamily: 'Arial, sans-serif' }}>
      <style dangerouslySetInnerHTML={{__html: `
        @media print {
          body { -webkit-print-color-adjust: exact; margin: 0; padding: 0; }
          .no-print { display: none !important; }
        }
        .print-container {
          max-width: 800px;
          margin: 40px auto;
          padding: 40px;
          background: white;
          box-shadow: 0 0 10px rgba(0,0,0,0.1);
          border: 1px solid #ddd;
          font-family: 'Times New Roman', serif; /* Classic certificate font */
          color: #000;
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
        .checkbox-box {
          display: inline-block;
          width: 12px;
          height: 12px;
          border: 1px solid #000;
          margin-right: 8px;
          position: relative;
        }
        .checkbox-box.checked::after {
          content: '✓';
          position: absolute;
          top: -4px;
          left: 1px;
          font-size: 14px;
          font-weight: bold;
        }
        .line-input {
          border-bottom: 1px solid #000;
          display: inline-block;
          min-width: 100px;
          text-align: center;
          font-weight: bold;
          font-family: Arial, sans-serif;
        }
      `}} />

      <div className="no-print" style={{ textAlign: 'center', padding: '20px', background: '#f8fafc' }}>
        <button onClick={() => window.print()} style={{ padding: '10px 20px', fontSize: '16px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
          🖨️ Print Certificate
        </button>
      </div>

      <div className="print-container">
        
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

        <h3 style={{ textAlign: 'center', fontSize: '20px', textDecoration: 'underline', marginBottom: '30px' }}>
          Adult Health Certificate
        </h3>

        {/* PATIENT INFO */}
        <div style={{ marginBottom: '30px', fontSize: '14px', lineHeight: '2' }}>
          <div style={{ display: 'flex', gap: '10px' }}>
            <div style={{ flex: 1 }}>Name: <span className="line-input" style={{ width: '80%' }}>{data.name}</span></div>
            <div style={{ width: '250px' }}>Sex: 
              <span style={{ marginLeft: '10px' }}>
                <span className="line-input" style={{ width: '40px' }}>{data.sex === 1 ? 'X' : ''}</span> Male 
              </span>
              <span style={{ marginLeft: '10px' }}>
                <span className="line-input" style={{ width: '40px' }}>{data.sex === 2 ? 'X' : ''}</span> Female
              </span>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <div style={{ flex: 1 }}>DOB: <span className="line-input" style={{ width: '60%' }}>{formatDate(data.dob)}</span></div>
            <div style={{ flex: 1 }}>Tel #: <span className="line-input" style={{ width: '80%' }}>{data.tel}</span></div>
          </div>
          <div>
            Address: <span className="line-input" style={{ width: '90%' }}>{fullAddress || '_________________________________'}</span>
          </div>
        </div>

        {/* Form Body */}
        <div style={{ marginTop: '30px', paddingLeft: '20px' }}>
          
          <div style={{ marginBottom: '15px' }}>
            <span className={`checkbox-box ${data.free_from_disease ? 'checked' : ''}`}></span>
            Free from communicable diseases.
          </div>

          <div style={{ marginBottom: '15px' }}>
            <span className={`checkbox-box ${data.satisfactory_physical ? 'checked' : ''}`}></span>
            In satisfactory physical condition.
          </div>

          <div style={{ marginBottom: '25px', paddingLeft: '30px' }}>
            <div style={{ marginBottom: '10px' }}>
              Tuberculin test (check one): 
              <span className="line-input" style={{ width: '50px', marginLeft: '10px', textAlign: 'center' }}>
                 {data.tuberculin_test_type === 'Tine' ? 'X' : ''}
              </span> Tine 
              <span className="line-input" style={{ width: '50px', marginLeft: '20px', textAlign: 'center' }}>
                 {data.tuberculin_test_type === 'PPD' ? 'X' : ''}
              </span> PPD
            </div>
            
            <div style={{ display: 'flex', gap: '40px', marginBottom: '10px' }}>
              <div>Date planted: <span className="line-input">{formatDate(data.tuberculin_date_planted)}</span></div>
              <div>Date read: <span className="line-input">{formatDate(data.tuberculin_date_read)}</span></div>
            </div>
            <div>Result: <span className="line-input" style={{ minWidth: '300px' }}>{data.tuberculin_result}</span></div>
          </div>

          <div style={{ marginBottom: '25px', paddingLeft: '30px' }}>
            <div style={{ marginBottom: '10px' }}>Chest x-ray:</div>
            <div style={{ display: 'flex', gap: '40px', marginBottom: '10px' }}>
              <div>Date: <span className="line-input">{formatDate(data.chest_xray_date)}</span></div>
              <div>Result: <span className="line-input" style={{ minWidth: '200px' }}>{data.chest_xray_result}</span></div>
            </div>
          </div>

          <div style={{ marginBottom: '40px' }}>
            <div>Additional information:</div>
            <div className="line-input" style={{ width: '100%', marginTop: '5px', minHeight: '30px' }}>
              {data.additional_info}
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px', lineHeight: '2' }}>
            <div style={{ flex: 1, paddingRight: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: '5px' }}>
                <div>Name/Signature:</div>
                <div className="line-input" style={{ width: '60%', textAlign: 'center', position: 'relative' }}>
                  {data.b2b_signature ? (
                    <img src={`${API}/uploads/${data.b2b_signature}`} alt="Signature" style={{ maxHeight: '40px', position: 'absolute', bottom: '0', left: '50%', transform: 'translateX(-50%)' }} onError={(e) => e.currentTarget.style.display = 'none'} />
                  ) : (
                    <span style={{ fontFamily: "'Brush Script MT', cursive", fontSize: '24px' }}>{data.clinician_name}</span>
                  )}
                </div>
                <div>MD/PA/NP</div>
              </div>
              <div style={{ marginTop: '10px' }}>Date: <span className="line-input" style={{ width: '80%' }}>{formatDate(data.date_of_examination)}</span></div>
            </div>
            <div style={{ flex: 1 }}>
              <div>Address: <span className="line-input" style={{ width: '80%' }}>{data.clinician_address}</span></div>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
