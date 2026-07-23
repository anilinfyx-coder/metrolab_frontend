'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { API_BASE, getUploadUrl } from '../../lib/api';

export interface WhitelabelConfig {
  id: number;
  company_name: string;
  primary_color_code: string;
  logo_file: string;
  logo_url: string | null;
  custom_domain: string;
}

interface WhitelabelContextType {
  config: WhitelabelConfig | null;
  isLoading: boolean;
  isWhitelabel: boolean;
}

const WhitelabelContext = createContext<WhitelabelContextType>({
  config: null,
  isLoading: true,
  isWhitelabel: false,
});

export const useWhitelabel = () => useContext(WhitelabelContext);

export function WhitelabelProvider({ children }: { children: ReactNode }) {
  const [config, setConfig] = useState<WhitelabelConfig | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isWhitelabel, setIsWhitelabel] = useState(false);

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
          } else if (override) {
            localStorage.setItem('test_domain', override);
          }
          
          const testDomain = override || localStorage.getItem('test_domain');
          if (testDomain) {
            hostname = testDomain;
          } else {
            setIsWhitelabel(false);
            setIsLoading(false);
            return;
          }
        } else {
          localStorage.removeItem('test_domain');
        }

        // Skip for default domain
        if (hostname === 'lab.metrolab.biz') {
          setIsWhitelabel(false);
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

          // Apply primary color to theme if available
          if (data.obj.primary_color_code) {
            document.documentElement.style.setProperty('--primary-color', data.obj.primary_color_code);
            document.documentElement.style.setProperty('--sidebar-bg', data.obj.primary_color_code);
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

  return (
    <WhitelabelContext.Provider value={{ config, isLoading, isWhitelabel }}>
      {children}
    </WhitelabelContext.Provider>
  );
}
