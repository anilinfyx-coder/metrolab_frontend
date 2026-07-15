'use client';

export type PortalKey = 'superadmin' | 'admin' | 'b2b' | 'corporate';

export type PortalConfig = {
  key: PortalKey;
  tokenKey: string;
  userKey: string;
  basePath: string;
  profilePath: string;
  apiPath: string;
  loginPath: string;
  nameField: 'name' | 'company_name';
};

const PORTALS: PortalConfig[] = [
  {
    key: 'superadmin',
    tokenKey: 'superadmin_token',
    userKey: 'superadmin_user',
    basePath: '/superadmin/dashboard',
    profilePath: '/superadmin/dashboard/profile',
    apiPath: '/api/SuperAdmin',
    loginPath: '/',
    nameField: 'name',
  },
  {
    key: 'admin',
    tokenKey: 'admin_token',
    userKey: 'admin_user',
    basePath: '/admin/dashboard',
    profilePath: '/admin/dashboard/profile',
    apiPath: '/api/AdminUsers',
    loginPath: '/',
    nameField: 'name',
  },
  {
    key: 'b2b',
    tokenKey: 'b2b_token',
    userKey: 'b2b_user',
    basePath: '/b2b/dashboard',
    profilePath: '/b2b/dashboard/profile',
    apiPath: '/api/B2bClients',
    loginPath: '/',
    nameField: 'company_name',
  },
  {
    key: 'corporate',
    tokenKey: 'corporate_token',
    userKey: 'corporate_user',
    basePath: '/corporate/dashboard',
    profilePath: '/corporate/dashboard/profile',
    apiPath: '/api/CorporateClients',
    loginPath: '/',
    nameField: 'company_name',
  },
];

export function getPortalFromPath(pathname: string): PortalConfig {
  if (pathname.startsWith('/superadmin')) return PORTALS[0];
  if (pathname.startsWith('/admin')) return PORTALS[1];
  if (pathname.startsWith('/b2b')) return PORTALS[2];
  if (pathname.startsWith('/corporate')) return PORTALS[3];
  return PORTALS[1];
}

export function getStoredUser(userKey: string): { id?: number; name?: string; email?: string; company_name?: string } | null {
  if (typeof window === 'undefined') return null;
  const raw = localStorage.getItem(userKey);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}
