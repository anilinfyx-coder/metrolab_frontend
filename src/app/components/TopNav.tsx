'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { ReactNode, useEffect, useState } from 'react';
import { getPortalFromPath, getStoredUser } from './portalConfig';

interface TopNavProps {
  title: string;
  children?: ReactNode;
}

export default function TopNav({ title, children }: TopNavProps) {
  const pathname = usePathname();
  const router = useRouter();
  const portal = getPortalFromPath(pathname || '');
  const [userName, setUserName] = useState('');

  useEffect(() => {
    const user = getStoredUser(portal.userKey);
    setUserName(user?.name || user?.company_name || user?.email || 'User');
  }, [portal.userKey, pathname]);

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
        <Link href={portal.profilePath} className="topnav-user-link" title="Update Profile">
          <span className="topnav-user-icon" aria-hidden>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v1.2h19.2v-1.2c0-3.2-6.4-4.8-9.6-4.8z" />
            </svg>
          </span>
          <span>{userName}</span>
        </Link>
        <button type="button" className="topnav-signout" onClick={signOut} title="Sign Out">
          <span className="topnav-user-icon" aria-hidden>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
              <circle cx="12" cy="12" r="9" />
              <path d="M12 7v5" strokeLinecap="round" />
            </svg>
          </span>
          <span>Sign Out</span>
        </button>
      </div>
    </div>
  );
}
