import React, { useEffect } from 'react';
import { RouterProvider } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import { router } from './routes';
import { useAuthStore } from './store/useAuthStore';

import { isConfigured } from './firebase/config';

// Create a client for React Query
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

const App: React.FC = () => {
  const initialize = useAuthStore((state) => state.initialize);

  useEffect(() => {
    // Start listening to Firebase Auth state changes
    const unsubscribe = initialize();
    return () => unsubscribe();
  }, [initialize]);

  useEffect(() => {
    const applyTheme = () => {
      const savedTheme = localStorage.getItem('pref_theme') || 'System default';
      const root = window.document.documentElement;
      
      let isDark = true;
      if (savedTheme === 'Light') {
        isDark = false;
      } else if (savedTheme === 'System default') {
        isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      }
      
      if (isDark) {
        root.classList.add('dark');
        root.classList.remove('light');
        root.style.colorScheme = 'dark';
      } else {
        root.classList.add('light');
        root.classList.remove('dark');
        root.style.colorScheme = 'light';
      }
    };

    applyTheme();
    
    // Listen to preferences updates and system theme updates
    window.addEventListener('storage', applyTheme);
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    mediaQuery.addEventListener('change', applyTheme);
    
    return () => {
      window.removeEventListener('storage', applyTheme);
      mediaQuery.removeEventListener('change', applyTheme);
    };
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      {!isConfigured && (
        <div className="bg-amber-500/15 border-b border-amber-500/20 text-amber-500 px-4 py-2.5 text-center text-xs font-bold relative z-[100] flex items-center justify-center space-x-1.5 shadow-md">
          <span>⚠️ Firebase configuration environment variables are missing in web/.env. App is running in preview mode.</span>
        </div>
      )}
      <RouterProvider router={router} />
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: '#1B2433',
            color: '#F8FAFC',
            border: '1px solid rgba(148, 163, 184, 0.1)',
            borderRadius: '12px',
            fontSize: '14px',
            fontWeight: 500,
          },
          success: {
            iconTheme: {
              primary: '#22C55E',
              secondary: '#1B2433',
            },
          },
          error: {
            iconTheme: {
              primary: '#EF4444',
              secondary: '#1B2433',
            },
          },
        }}
      />
    </QueryClientProvider>
  );
};

export default App;
