'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { ReactNode, useEffect, useState, useRef } from 'react';
import { MdLogout, MdMenu, MdPerson, MdNotifications } from 'react-icons/md';
import { getPortalFromPath, getStoredUser } from './portalConfig';
import { apiFetch } from '../../lib/api';
import { SIDEBAR_MOBILE_CLOSE_EVENT, setSidebarMobileOpen } from '../lib/mobileNav';

import { useWhitelabel } from './WhitelabelProvider';

interface TopNavProps {
  title: string;
  children?: ReactNode;
}

export default function TopNav({ title, children }: TopNavProps) {
  const pathname = usePathname();
  const router = useRouter();
  const portal = getPortalFromPath(pathname || '');
  const [userName, setUserName] = useState('');
  const [alerts, setAlerts] = useState<any[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { isWhitelabel, config } = useWhitelabel();

  useEffect(() => {
    setMobileNavOpen(false);
    setSidebarMobileOpen(false);
  }, [pathname]);

  useEffect(() => {
    const onClose = () => setMobileNavOpen(false);
    window.addEventListener(SIDEBAR_MOBILE_CLOSE_EVENT, onClose);
    return () => {
      window.removeEventListener(SIDEBAR_MOBILE_CLOSE_EVENT, onClose);
      setSidebarMobileOpen(false);
    };
  }, []);

  useEffect(() => {
    setSidebarMobileOpen(mobileNavOpen);
  }, [mobileNavOpen]);

  const toggleMobileNav = () => setMobileNavOpen(open => !open);
  const closeMobileNav = () => {
    setMobileNavOpen(false);
    setSidebarMobileOpen(false);
  };

  useEffect(() => {
    const user = getStoredUser(portal.userKey);
    setUserName(user?.name || user?.company_name || user?.email || 'User');

    // Fetch alerts for superadmin or b2b
    if (portal.key === 'superadmin' || portal.key === 'b2b') {
      const fetchAlerts = async () => {
        try {
          const endpoint = portal.key === 'b2b' && user?.id
            ? `/api/B2bClients/alerts?b2b_client_id=${user.id}`
            : '/api/B2bClients/alerts';
          
          const alertsData = await apiFetch<any[]>(endpoint, {
            tokenKey: portal.tokenKey,
            silent: true // don't show toast errors for background polling
          });
          setAlerts(alertsData || []);
        } catch {
          // ignore error
        }
      };
      
      // Initial fetch
      fetchAlerts();

      // Set up polling interval every 60 seconds (60000 ms)
      const intervalId = setInterval(fetchAlerts, 60000);

      // Cleanup interval on unmount
      return () => clearInterval(intervalId);
    }
  }, [portal.userKey, portal.key, portal.tokenKey, pathname]);

  // Handle clicking outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const signOut = () => {
    localStorage.removeItem(portal.tokenKey);
    localStorage.removeItem(portal.userKey);
    
    // For local testing, clear the whitelabel domain on logout
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
      localStorage.removeItem('test_domain');
      window.location.href = portal.loginPath;
      return;
    }
    
    router.push(portal.loginPath);
  };

  return (
    <>
      <button
        type="button"
        className="sidebar-mobile-overlay"
        aria-label="Close navigation menu"
        tabIndex={mobileNavOpen ? 0 : -1}
        onClick={closeMobileNav}
      />
      <div className="topnav">
        <div className="topnav-left">
          <button
            type="button"
            className="topnav-menu-btn"
            onClick={toggleMobileNav}
            aria-label={mobileNavOpen ? 'Close navigation menu' : 'Open navigation menu'}
            aria-expanded={mobileNavOpen}
          >
            <MdMenu size={22} aria-hidden />
          </button>
          <h1 className="topnav-title">{title}</h1>
          {portal.key === 'b2b' && (
            isWhitelabel && config ? (
              <span className="topnav-mode-badge topnav-mode-badge-whitelabel">
                Whitelabel Mode: {config.custom_domain}
              </span>
            ) : (
              <span className="topnav-mode-badge">
                Standard MetroLab Mode
              </span>
            )
          )}
        </div>
        <div className="topnav-actions">
          {children}

          {(portal.key === 'superadmin' || portal.key === 'b2b') && (
            <div className="topnav-notifications" ref={dropdownRef}>
              <button
                type="button"
                className="topnav-user-link topnav-notification-btn"
                onClick={() => setShowDropdown(!showDropdown)}
                title="Notifications"
              >
                <span className="topnav-user-icon" aria-hidden>
                  <MdNotifications size={18} />
                </span>
                {alerts.length > 0 && (
                  <span className="topnav-notification-badge">
                    {alerts.length}
                  </span>
                )}
              </button>

              {showDropdown && (
                <div className="topnav-notification-panel">
                  <div className="topnav-notification-panel-title">
                    Notifications
                  </div>
                  {alerts.length === 0 ? (
                    <div className="topnav-notification-empty">
                      No new notifications
                    </div>
                  ) : (
                    <div>
                      {alerts.map((alert, idx) => (
                        <div
                          key={idx}
                          className={`topnav-notification-item${alert.type === 'wallet_empty' ? ' is-critical' : ' is-warning'}`}
                        >
                          <div className="topnav-notification-item-text">
                            {portal.key === 'superadmin' && <strong>{alert.client?.company_name}: </strong>}
                            {alert.message}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          <Link href={portal.profilePath} className="topnav-user-link" title="Update Profile">
            <span className="topnav-user-icon" aria-hidden>
              <MdPerson size={18} />
            </span>
            <span className="topnav-user-label">{userName}</span>
          </Link>
          <button type="button" className="topnav-signout" onClick={signOut} title="Sign Out">
            <span className="topnav-user-icon" aria-hidden>
              <MdLogout size={18} />
            </span>
            <span className="topnav-user-label">Sign Out</span>
          </button>
        </div>
      </div>
    </>
  );
}
