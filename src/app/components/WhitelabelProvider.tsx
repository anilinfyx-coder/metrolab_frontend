'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import { API_BASE, getUploadUrl } from '../../lib/api';

export interface WhitelabelConfig {
  id: number;
  company_name: string;
  primary_color_code: string;
  logo_file: string;
  logo_url: string | null;
  favicon_file?: string | null;
  favicon_url?: string | null;
  custom_domain: string;
  tagline?: string | null;
}

interface WhitelabelContextType {
  config: WhitelabelConfig | null;
  isLoading: boolean;
  isWhitelabel: boolean;
  b2bBasePath: string;
}

const WhitelabelContext = createContext<WhitelabelContextType>({
  config: null,
  isLoading: true,
  isWhitelabel: false,
  b2bBasePath: '/b2b/dashboard',
});

export const useWhitelabel = () => useContext(WhitelabelContext);

import PageLoader from './PageLoader';

export function WhitelabelProvider({ children }: { children: ReactNode }) {
  const [config, setConfig] = useState<WhitelabelConfig | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isWhitelabel, setIsWhitelabel] = useState(false);
  const [b2bBasePath, setB2bBasePath] = useState('/b2b/dashboard');
  const pathname = usePathname();

  useEffect(() => {
    const fetchConfig = async () => {
      try {
        let hostname = window.location.hostname;

        // Allow local testing override via query param or localStorage
        if (hostname === 'localhost' || hostname === '127.0.0.1') {
          const urlParams = new URLSearchParams(window.location.search);
          const override = urlParams.get('test_domain');

          if (override === 'reset' || override === 'clear') {
            localStorage.removeItem('test_domain');
            document.cookie = 'test_domain=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
          } else if (override) {
            localStorage.setItem('test_domain', override);
            document.cookie = `test_domain=${override}; path=/; max-age=86400`;
          }

          const testDomain = override || localStorage.getItem('test_domain');
          if (testDomain) {
            hostname = testDomain;
          } else {
            setIsWhitelabel(false);
            setB2bBasePath('/b2b/dashboard');
            setIsLoading(false);
            return;
          }
        } else {
          localStorage.removeItem('test_domain');
          document.cookie = 'test_domain=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
        }

        if (hostname === 'lab.metrolab.biz') {
          setIsWhitelabel(false);
          setB2bBasePath('/b2b/dashboard');
          setIsLoading(false);
          return;
        }

        const res = await fetch(`${API_BASE}/api/B2bClients/whitelabelConfig?domain=${hostname}`);
        if (!res.ok) {
          setIsLoading(false);
          return;
        }

        const data = await res.json();
        if (data.response_code === '200' && data.obj) {
          setConfig(data.obj);
          setIsWhitelabel(true);
          setB2bBasePath('/dashboard');

          // Apply primary color to theme if available
          if (data.obj.primary_color_code) {
            document.documentElement.style.setProperty('--primary-color', data.obj.primary_color_code);
            document.documentElement.style.setProperty('--sidebar-bg', data.obj.primary_color_code);
          }

          // Update page title initially
          if (data.obj.company_name) {
            document.title = data.obj.company_name;
          }

          // Update favicon initially
          const iconUrl = data.obj.favicon_url || (data.obj.favicon_file ? getUploadUrl(data.obj.favicon_file) : null) || data.obj.logo_url || (data.obj.logo_file ? getUploadUrl(data.obj.logo_file) : null);
          if (iconUrl) {
            const iconLinks = document.querySelectorAll<HTMLLinkElement>("link[rel~='icon'], link[rel='shortcut icon'], link[rel='apple-touch-icon']");
            if (iconLinks.length > 0) {
              iconLinks.forEach(link => {
                link.href = iconUrl;
              });
            } else {
              const link = document.createElement('link');
              link.rel = 'icon';
              link.href = iconUrl;
              document.head.appendChild(link);
            }
          }
        }
      } catch (err) {
        console.error('Failed to fetch whitelabel config', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchConfig();
  }, []);

  // Re-apply title and favicon on navigation (Next.js client-side routing can override it)
  useEffect(() => {
    if (config) {
      if (config.company_name) {
        document.title = config.company_name;
      }
      
      const iconUrl = config.favicon_url || (config.favicon_file ? getUploadUrl(config.favicon_file) : null) || config.logo_url || (config.logo_file ? getUploadUrl(config.logo_file) : null);
      if (iconUrl) {
        const iconLinks = document.querySelectorAll<HTMLLinkElement>("link[rel~='icon'], link[rel='shortcut icon'], link[rel='apple-touch-icon']");
        iconLinks.forEach(link => {
          link.href = iconUrl;
        });
      }
    }
  }, [config, pathname]);

  if (isLoading) {
    return <PageLoader centered message="" />;
  }

  return (
    <WhitelabelContext.Provider value={{ config, isLoading, isWhitelabel, b2bBasePath }}>
      {children}
    </WhitelabelContext.Provider>
  );
}
