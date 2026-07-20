'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
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
  userKey = 'admin_user',
}: SidebarProps) {
  const pathname = usePathname();
  const [user, setUser] = useState<{ name?: string; email?: string } | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem(userKey);
    if (stored) setUser(JSON.parse(stored));
  }, [userKey]);

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
            <div className="sidebar-logo-text">METRO LAB</div>
            <div style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.92)', fontStyle: 'italic', marginTop: '1px' }}>
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
          background: 'rgba(0,0,0,0.12)',
          borderBottom: '1px solid rgba(255,255,255,0.12)',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
        }}>
          <div style={{
            width: 30, height: 30, borderRadius: '50%',
            background: 'var(--sidebar-active)', color: '#003d54',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '0.75rem', fontWeight: 700, flexShrink: 0
          }}>
            {user.name?.charAt(0).toUpperCase() || 'U'}
          </div>
          <div style={{ minWidth: 0 }} className="sidebar-link-text">
            <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#ffffff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {user.name}
            </div>
            <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.9)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
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
              const isActive = item.href === '' 
                ? pathname === fullHref 
                : (pathname === fullHref || pathname.startsWith(fullHref + '/'));
              return (
                <Link
                  key={item.href}
                  // @ts-ignore
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

      <div className="sidebar-footer" style={{ background: 'transparent', borderTop: '1px solid rgba(255,255,255,0.15)' }}>
        <div className="sidebar-link-text">
          <Link href="/" style={{ fontSize: '0.75rem', color: '#ffffff', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            ← Switch Portal
          </Link>
        </div>
      </div>
    </aside>
  );
}
