'use client';

import { useState, useEffect } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Provider as ReduxProvider } from 'react-redux';
import { Toaster } from 'react-hot-toast';
import { store } from '../../store';
import { ConfirmProvider } from './ConfirmModal';

import { WhitelabelProvider } from './WhitelabelProvider';

export default function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        retry: 1,
        refetchOnWindowFocus: false,
      },
      mutations: {
        retry: 0,
      },
    },
  }));

  // Global handler to open date pickers when clicking anywhere in the input field
  useEffect(() => {
    const handleDateClick = (e: MouseEvent) => {
      const target = e.target as HTMLInputElement;
      if (target && target.tagName === 'INPUT' && (target.type === 'date' || target.type === 'time')) {
        try {
          if ('showPicker' in target) {
            target.showPicker();
          }
        } catch (err) {
          // Ignore if picker is already open
        }
      }
    };
    
    document.addEventListener('click', handleDateClick);
    return () => document.removeEventListener('click', handleDateClick);
  }, []);

  return (
    <ReduxProvider store={store}>
      <QueryClientProvider client={queryClient}>
        <ConfirmProvider>
          <WhitelabelProvider>{children}</WhitelabelProvider>
        </ConfirmProvider>
        <Toaster
          position="top-center"
          reverseOrder={false}
          toastOptions={{
            duration: 3500,
            style: {
              fontSize: '0.875rem',
              fontFamily: 'inherit',
            },
            success: {
              style: {
                background: '#10b981',
                color: '#fff',
              },
              iconTheme: {
                primary: '#fff',
                secondary: '#10b981',
              },
            },
            error: {
              style: {
                background: '#ef4444',
                color: '#fff',
              },
              iconTheme: {
                primary: '#fff',
                secondary: '#ef4444',
              },
            },
          }}
        />
      </QueryClientProvider>
    </ReduxProvider>
  );
}
