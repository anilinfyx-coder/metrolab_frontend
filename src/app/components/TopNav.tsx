'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { ReactNode, useEffect, useState } from 'react';
import { MdLogout, MdPerson, MdVpnKey } from 'react-icons/md';
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
        {portal.key === 'admin' && (
          <Link href={`${portal.basePath}/changepassword`} className="topnav-user-link" title="Change Password" style={{ marginRight: '0.5rem' }}>
            <span className="topnav-user-icon" aria-hidden>
              <MdVpnKey size={16} />
            </span>
            <span>Security</span>
          </Link>
        )}
        <Link href={portal.profilePath} className="topnav-user-link" title="Update Profile">
          <span className="topnav-user-icon" aria-hidden>
            <MdPerson size={16} />
          </span>
          <span>{userName}</span>
        </Link>
        <button type="button" className="topnav-signout" onClick={signOut} title="Sign Out">
          <span className="topnav-user-icon" aria-hidden>
            <MdLogout size={15} />
          </span>
          <span>Sign Out</span>
        </button>
      </div>
    </div>
  );
}
