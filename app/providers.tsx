'use client';

import { SessionProvider } from 'next-auth/react';
import { ReactNode } from 'react';

export function Providers({ children }: { children: ReactNode }) {
  // 💡 BACKEND-READY MOCK: 
  // Change "role" to 'admin', 'member', 'auditor', or 'treasurer' to test the UI.
  // When the backend is ready, just remove the `session={mockSession}` prop.
  const mockSession = {
    expires: '9999-12-31T23:59:59.999Z',
    user: {
      name: 'Ven',
      email: 'ven@bdoea.com',
      role: 'treasurer', // <--- CHANGE THIS TO TEST DIFFERENT SIDEBARS
    },
  };

  return (
    <SessionProvider 
      session={mockSession} 
      refetchInterval={0} 
      refetchOnWindowFocus={false}
    >
      {children}
    </SessionProvider>
  );
}