'use client';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ReactNode, useEffect, useState } from 'react';
import { MdMenu, MdMenuOpen } from 'react-icons/md';
import { apiFetch, getUploadUrl } from '../../lib/api';
import { getStoredUser } from './portalConfig';
import { useWhitelabel } from './WhitelabelProvider';

export type NavItem = {
  href: string;
  label: string;
  icon: ReactNode;
  section: string;
};

interface SidebarProps {
  navItems: NavItem[];
  basePath?: string;
  tokenKey?: string;
  userKey?: string;
  loginPath?: string;
};

type LabBranding = {
  logoFile: string | null;
  tagline: string | null;
  companyName: string | null;
  primaryColorCode: string | null;
};

function normalizeText(value: unknown): string | null {
  if (value == null) return null;
  const text = String(value).trim();
  if (!text || text.toLowerCase() === 'null' || text.toLowerCase() === 'undefined') {
    return null;
  }
  return text;
}

function extractBranding(data: Record<string, unknown>): LabBranding {
  return {
    logoFile: normalizeText(data.logo_file),
    tagline: normalizeText(data.tagline),
    companyName: normalizeText(data.company_name) || normalizeText(data.name),
    primaryColorCode: normalizeText(data.primary_color_code),
  };
}

function MetroBrandBlock({ collapsed }: { collapsed: boolean }) {
  return (
    <>
      <Image
        src="/login-logo.png"
        alt="Metro Lab"
        width={280}
        height={250}
        priority
        className={collapsed ? 'sidebar-brand-full sidebar-brand-collapsed' : 'sidebar-brand-full'}
      />
      {!collapsed && (
        <div className="sidebar-logo-tagline">Precision is our Home Mark</div>
      )}
    </>
  );
}

export default function Sidebar({
  navItems,
  basePath = '/admin/dashboard',
  tokenKey,
  userKey,
}: SidebarProps) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [labBranding, setLabBranding] = useState<LabBranding | null>(null);

  const isB2bPortal = userKey === 'b2b_user';
  const isAdminPortal = userKey === 'admin_user';
  const usesLabBranding = isB2bPortal || isAdminPortal;
  const resolvedTokenKey = tokenKey || (isB2bPortal ? 'b2b_token' : isAdminPortal ? 'admin_token' : undefined);

  useEffect(() => {
    document.body.classList.toggle('sidebar-collapsed', collapsed);
    return () => document.body.classList.remove('sidebar-collapsed');
  }, [collapsed]);

  useEffect(() => {
    if (!usesLabBranding || !userKey || typeof window === 'undefined') {
      setLabBranding(null);
      return;
    }

    let cancelled = false;
    const stored = getStoredUser(userKey) as Record<string, unknown> | null;
    if (!stored?.id) return;

    const applyBranding = (data: Record<string, unknown>) => {
      if (cancelled) return;
      const extracted = extractBranding(data);
      setLabBranding(extracted);
    };

    applyBranding(stored);

    const persistBranding = (data: Record<string, unknown>) => {
      const branding = extractBranding(data);
      if (!branding.logoFile && !branding.tagline && !branding.companyName) return;
      localStorage.setItem(
        userKey,
        JSON.stringify({
          ...stored,
          logo_file: branding.logoFile,
          tagline: branding.tagline,
          company_name: branding.companyName ?? stored.company_name,
          primary_color_code: branding.primaryColorCode ?? stored.primary_color_code,
        }),
      );
    };

    const loadB2bBranding = async () => {
      try {
        const client = await apiFetch<Record<string, unknown>>(`/api/B2bClients/${stored.id}`, {
          tokenKey: resolvedTokenKey,
          silent: true,
        });
        applyBranding(client);
        persistBranding(client);
      } catch {
        /* keep stored/fallback branding */
      }
    };

    const loadAdminBranding = async () => {
      try {
        const profile = await apiFetch<Record<string, unknown>>('/api/AdminUsers/getProfile', {
          method: 'POST',
          tokenKey: resolvedTokenKey,
          body: JSON.stringify({ id: stored.id }),
          silent: true,
        });
        applyBranding(profile);
        persistBranding(profile);
        return;
      } catch {
        /* fall through to B2B client lookup */
      }

      const b2bClientId = stored.user_id;
      if (!b2bClientId) return;

      try {
        const client = await apiFetch<Record<string, unknown>>(`/api/B2bClients/${b2bClientId}`, {
          tokenKey: resolvedTokenKey,
          silent: true,
        });
        applyBranding(client);
        persistBranding(client);
      } catch {
        /* keep stored/fallback branding */
      }
    };

    void (isB2bPortal ? loadB2bBranding() : loadAdminBranding());

    return () => {
      cancelled = true;
    };
  }, [usesLabBranding, userKey, isB2bPortal, resolvedTokenKey]);

  const { isWhitelabel, config } = useWhitelabel();

  useEffect(() => {
    if (!isWhitelabel && labBranding?.primaryColorCode) {
      document.documentElement.style.setProperty('--primary-color', labBranding.primaryColorCode);
      document.documentElement.style.setProperty('--sidebar-bg', labBranding.primaryColorCode);
    }
  }, [isWhitelabel, labBranding?.primaryColorCode]);

  const toggleSidebar = () => setCollapsed((value) => !value);

  // If we are on a whitelabel domain, use the config logo. Otherwise use the logged in user's logo.
  const activeLogoFile = isWhitelabel ? config?.logo_file : labBranding?.logoFile;
  const activeCompanyName = isWhitelabel ? config?.company_name : labBranding?.companyName;
  const activeTagline = isWhitelabel ? null : labBranding?.tagline; // Can keep tagline blank or use config later if needed

  const hasLabLogo = Boolean(activeLogoFile);
  const showLabBranding = (usesLabBranding || isWhitelabel) && hasLabLogo;
  const labLogoUrl = hasLabLogo ? (isWhitelabel && config?.logo_url ? config.logo_url : getUploadUrl(activeLogoFile)) : '';

  const toggleButton = (
    <button
      type="button"
      onClick={toggleSidebar}
      className="hamburger-btn sidebar-toggle-btn"
      title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      aria-expanded={!collapsed}
    >
      {collapsed ? <MdMenuOpen size={22} aria-hidden /> : <MdMenu size={20} aria-hidden />}
    </button>
  );

  const brandContent = showLabBranding ? (
    <>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={labLogoUrl}
        alt={activeCompanyName || 'Lab logo'}
        className={`sidebar-lab-logo${collapsed ? ' sidebar-lab-logo-collapsed' : ''}`}
      />
      {!collapsed && activeTagline ? (
        <div className="sidebar-logo-tagline">{activeTagline}</div>
      ) : null}
    </>
  ) : isWhitelabel ? (
    <div style={{ minHeight: '60px', width: '100%' }} />
  ) : (
    <MetroBrandBlock collapsed={collapsed} />
  );

  return (
    <aside className={`sidebar${collapsed ? ' sidebar-is-collapsed' : ''}`}>
      <div className={`sidebar-logo${collapsed ? ' sidebar-logo-collapsed' : ''}`}>
        {collapsed ? (
          <>
            <div className="sidebar-brand-block">{brandContent}</div>
            <div className="sidebar-header-toggle">{toggleButton}</div>
          </>
        ) : (
          <div className="sidebar-logo-left">
            <div className="sidebar-brand-block">{brandContent}</div>
          </div>
        )}
      </div>

      <nav className="sidebar-nav">
        {navItems.map(item => {
          const fullHref = `${basePath}${item.href}`;
          const isActive = item.href === ''
            ? pathname === fullHref
            : (pathname === fullHref || pathname.startsWith(fullHref + '/'));
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
      </nav>

      {!collapsed ? (
        <div
          className={`sidebar-footer-bar${showLabBranding ? ' sidebar-footer-bar-with-logo' : ' sidebar-footer-bar-toggle-only'}`}
        >
          {toggleButton}
          {showLabBranding && !isWhitelabel ? (
            <div className="sidebar-footer-brand">
              <Image
                src="/login-logo.png"
                alt="Metro Lab"
                width={140}
                height={120}
                className="sidebar-metro-footer-logo"
              />
              <div className="sidebar-metro-footer-tagline">Precision is our Home Mark</div>
            </div>
          ) : null}
        </div>
      ) : showLabBranding && !isWhitelabel ? (
        <div className="sidebar-footer-bar sidebar-footer-bar-logo-only">
          <div className="sidebar-footer-brand">
            <Image
              src="/login-logo.png"
              alt="Metro Lab"
              width={140}
              height={120}
              className="sidebar-metro-footer-logo sidebar-brand-collapsed"
            />
          </div>
        </div>
      ) : null}
    </aside>
  );
}
