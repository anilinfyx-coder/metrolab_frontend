'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import PageLoader from '../components/PageLoader';

/**
 * Legacy query-string links (?token=&email=) redirect to the path-based reset page.
 * Gmail often wraps links; path-based URLs are more reliable.
 */
export default function ResetPasswordLegacyPage() {
  const router = useRouter();

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const params = new URLSearchParams(window.location.search);
    let token = (params.get('token') || '').trim();

    // Recover mangled Gmail links where & became literal text in the path
    if (!token && window.location.href.includes('token=')) {
      const match = window.location.href.match(/[?&]token=([^&]+)/i);
      if (match?.[1]) {
        try {
          token = decodeURIComponent(match[1]).trim();
        } catch {
          token = match[1].trim();
        }
      }
    }

    if (token) {
      router.replace(`/reset-password/${encodeURIComponent(token)}`);
      return;
    }

    router.replace('/forgot-password');
  }, [router]);

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <PageLoader message="Opening reset page..." size="lg" />
    </div>
  );
}
