'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import PageLoader from '../../../components/PageLoader';

/** Change Password lives on the profile page (same as Super Admin). */
export default function AdminChangePasswordRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/admin/dashboard/profile');
  }, [router]);

  return (
    <div className="page-content">
      <PageLoader message="Opening profile..." />
    </div>
  );
}
