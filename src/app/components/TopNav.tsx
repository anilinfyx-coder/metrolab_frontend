'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { ReactNode, useEffect, useState, useRef } from 'react';
import { MdLogout, MdPerson, MdVpnKey, MdNotifications } from 'react-icons/md';
import { getPortalFromPath, getStoredUser } from './portalConfig';
import { apiFetch } from '../../lib/api';

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
  const dropdownRef = useRef<HTMLDivElement>(null);

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
    router.push(portal.loginPath);
  };

  return (
    <div className="topnav">
      <h1 className="topnav-title">{title}</h1>
      <div className="topnav-actions">
        {children}
        
        {/* Notification Bell */}
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
              <div style={{
                position: 'absolute',
                top: '100%',
                right: '0',
                marginTop: '10px',
                width: '320px',
                backgroundColor: 'white',
                border: '1px solid var(--border)',
                borderRadius: '8px',
                boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                zIndex: 1000,
                maxHeight: '400px',
                overflowY: 'auto'
              }}>
                <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', fontWeight: 'bold' }}>
                  Notifications
                </div>
                {alerts.length === 0 ? (
                  <div style={{ padding: '16px', color: 'var(--text-muted)', textAlign: 'center' }}>
                    No new notifications
                  </div>
                ) : (
                  <div>
                    {alerts.map((alert, idx) => (
                      <div key={idx} style={{ 
                        padding: '12px 16px', 
                        borderBottom: idx < alerts.length - 1 ? '1px solid var(--border)' : 'none',
                        backgroundColor: alert.type === 'wallet_empty' ? '#fff5f5' : '#fffbeb',
                        borderLeft: `4px solid ${alert.type === 'wallet_empty' ? '#ef4444' : '#f59e0b'}`
                      }}>
                        <div style={{ fontSize: '13px', color: '#111827' }}>
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

        {portal.key === 'admin' && (
          <Link href={`${portal.basePath}/changepassword`} className="topnav-user-link" title="Change Password">
            <span className="topnav-user-icon" aria-hidden>
              <MdVpnKey size={18} />
            </span>
            <span>Security</span>
          </Link>
        )}
        <Link href={portal.profilePath} className="topnav-user-link" title="Update Profile">
          <span className="topnav-user-icon" aria-hidden>
            <MdPerson size={18} />
          </span>
          <span>{userName}</span>
        </Link>
        <button type="button" className="topnav-signout" onClick={signOut} title="Sign Out">
          <span className="topnav-user-icon" aria-hidden>
            <MdLogout size={18} />
          </span>
          <span>Sign Out</span>
        </button>
      </div>
    </div>
  );
}
