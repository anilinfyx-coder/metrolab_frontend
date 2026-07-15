'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

export type NavItem = {
  href: string;
  label: string;
  icon: string;
  section: string;
};

interface SidebarProps {
  navItems: NavItem[];
  basePath?: string;
  tokenKey?: string;
  userKey?: string;
  loginPath?: string;
}

export default function Sidebar({
  navItems,
  basePath = '/admin/dashboard',
  tokenKey = 'admin_token',
  userKey = 'admin_user',
  loginPath = '/',
}: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<{ name?: string; email?: string } | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem(userKey);
    if (stored) setUser(JSON.parse(stored));
  }, [userKey]);

  const signOut = () => {
    localStorage.removeItem(tokenKey);
    localStorage.removeItem(userKey);
    router.push(loginPath);
  };

  // Group nav items by section
  const sections = navItems.reduce<Record<string, typeof navItems>>((acc, item) => {
    if (!acc[item.section]) acc[item.section] = [];
    acc[item.section].push(item);
    return acc;
  }, {});

  const toggleSidebar = () => {
    document.body.classList.toggle('sidebar-collapsed');
  };

  return (
    <aside className="sidebar">
      {/* Logo */}
      <div className="sidebar-logo">
        <div className="sidebar-logo-left">
          <div className="sidebar-logo-icon">ML</div>
          <div>
            <div className="sidebar-logo-text">Metrolab</div>
            <div style={{ fontSize: '0.65rem', color: '#aab4be', fontStyle: 'italic', marginTop: '1px' }}>
              Precision is our Home Mark
            </div>
          </div>
        </div>
        <button onClick={toggleSidebar} className="hamburger-btn" title="Toggle Menu">
          ☰
        </button>
      </div>

      {/* User info strip */}
      {user && (
        <div style={{
          padding: '0.65rem 1rem',
          background: '#22262a',
          borderBottom: '1px solid #3a4149',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
        }}>
          <div style={{
            width: 30, height: 30, borderRadius: '50%',
            background: 'var(--primary)', color: 'white',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '0.75rem', fontWeight: 700, flexShrink: 0
          }}>
            {user.name?.charAt(0).toUpperCase() || 'U'}
          </div>
          <div style={{ minWidth: 0 }} className="sidebar-link-text">
            <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#ffffff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {user.name}
            </div>
            <div style={{ fontSize: '0.7rem', color: '#aab4be', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {user.email}
            </div>
          </div>
        </div>
      )}

      {/* Navigation */}
      <nav className="sidebar-nav">
        {Object.entries(sections).map(([section, items]) => (
          <div key={section}>
            <div className="sidebar-section-label">{section}</div>
            {items.map(item => {
              const fullHref = `${basePath}${item.href}`;
              const isActive = pathname === fullHref || pathname.startsWith(fullHref + '/');
              return (
                <Link
                  key={item.href}
                  href={fullHref}
                  className={`sidebar-link ${isActive ? 'active' : ''}`}
                  id={`nav-${item.label.toLowerCase().replace(/\s+/g, '-')}`}
                  title={item.label}
                >
                  <span className="icon">{item.icon}</span>
                  <span className="sidebar-link-text">{item.label}</span>
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      <div className="sidebar-footer" style={{ background: 'transparent' }}>
        <div style={{ marginBottom: '0.5rem' }} className="sidebar-link-text">
          <Link href="/" style={{ fontSize: '0.75rem', color: '#aab4be', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            ← Switch Portal
          </Link>
        </div>
        <button
          id="signout-btn"
          onClick={signOut}
          className="sidebar-link-text"
          style={{
            width: '100%', padding: '0.5rem 0.85rem',
            background: 'transparent', border: '1px solid #3a4149',
            borderRadius: 6, color: '#aab4be',
            fontSize: '0.82rem', cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: '0.4rem',
            justifyContent: 'center', fontFamily: 'inherit',
            transition: 'all 0.15s',
          }}
          onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(231,76,60,0.1)'; (e.currentTarget as HTMLButtonElement).style.color = '#e74c3c'; (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(231,76,60,0.3)'; }}
          onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; (e.currentTarget as HTMLButtonElement).style.color = '#aab4be'; (e.currentTarget as HTMLButtonElement).style.borderColor = '#3a4149'; }}
        >
          🚪 Sign Out
        </button>
      </div>
    </aside>
  );
}
