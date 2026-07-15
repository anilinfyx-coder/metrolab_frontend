'use client';
import Link from 'next/link';

export default function LandingPage() {
  const portals = [
    { title: 'Super Admin', path: '/superadmin/login', desc: 'System configuration and global management', icon: '⚡', color: '#8e44ad' },
    { title: 'Admin / Staff', path: '/admin/login', desc: 'Lab operations and daily management', icon: '👨‍💼', color: '#18BADD' },
    { title: 'B2B Client', path: '/b2b/login', desc: 'Partner clinics and hospitals portal', icon: '🏢', color: '#27ae60' },
    { title: 'Corporate Client', path: '/corporate/login', desc: 'Employee testing and corporate dashboard', icon: '🏭', color: '#e67e22' },
  ];

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #f4f6f8 0%, #dde3ea 100%)',
      padding: '2rem',
    }}>
      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
        <div style={{
          width: 72, height: 72, borderRadius: 18,
          background: '#18BADD',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '2rem', fontWeight: 700, color: 'white',
          margin: '0 auto 1rem',
          boxShadow: '0 6px 20px rgba(24,186,221,0.3)',
        }}>ML</div>
        <h1 style={{ fontSize: '1.8rem', fontWeight: 700, color: '#2c3e50', marginBottom: '0.4rem' }}>Metrolab</h1>
        <p style={{ color: '#7f8c9a', fontSize: '0.9rem', fontStyle: 'italic' }}>
          Precision is our Home Mark
        </p>
        <p style={{ color: '#7f8c9a', fontSize: '0.85rem', marginTop: '0.5rem' }}>
          Please select your portal to continue
        </p>
      </div>

      {/* Portal cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
        gap: '1.25rem',
        width: '100%',
        maxWidth: 1100,
      }}>
        {portals.map(p => (
          <Link key={p.title} href={p.path} style={{ textDecoration: 'none' }}>
            <div style={{
              background: '#ffffff',
              border: '1px solid #e6e9ed',
              borderRadius: 10,
              padding: '1.75rem',
              cursor: 'pointer',
              transition: 'all 0.2s',
              boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'flex-start',
              gap: '0.75rem',
              height: '100%',
            }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLDivElement).style.borderColor = p.color;
                (e.currentTarget as HTMLDivElement).style.boxShadow = `0 6px 20px ${p.color}25`;
                (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-3px)';
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLDivElement).style.borderColor = '#e6e9ed';
                (e.currentTarget as HTMLDivElement).style.boxShadow = '0 2px 8px rgba(0,0,0,0.06)';
                (e.currentTarget as HTMLDivElement).style.transform = 'translateY(0)';
              }}
            >
              <div style={{
                width: 52, height: 52, borderRadius: 12,
                background: `${p.color}18`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '1.5rem',
              }}>{p.icon}</div>
              <div>
                <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#2c3e50', marginBottom: '0.3rem' }}>{p.title}</h3>
                <p style={{ fontSize: '0.8rem', color: '#7f8c9a', lineHeight: 1.5 }}>{p.desc}</p>
              </div>
              <div style={{ marginTop: 'auto', color: p.color, fontWeight: 600, fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                Enter Portal →
              </div>
            </div>
          </Link>
        ))}
      </div>

      <p style={{ color: '#aab4be', fontSize: '0.78rem', marginTop: '2.5rem' }}>
        Metrolab v2.0 — Node.js / Next.js Edition
      </p>
    </div>
  );
}
