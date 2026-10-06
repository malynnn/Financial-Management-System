"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';

export default function DashboardRedirect() {
  const router = useRouter();
  const { data: session, status } = useSession();

  useEffect(() => {
    if (status === 'loading') return;

    if (!session) {
      router.replace('/login');
      return;
    }

    const rawRole = ((session.user as any)?.role || '').toLowerCase();

    if (rawRole === 'collecting_officer') {
      router.replace('/collecting-officer');
    } else if (rawRole === 'disbursing_officer') {
      router.replace('/disbursing-officer');
    } else if (rawRole === 'auditor') {
      router.replace('/auditor');
    } else if (rawRole === 'admin') {
      router.replace('/admin');
    } else {
      router.replace('/collecting-officer');
    }
  }, [session, status, router]);

  return (
    <div className="flex items-center justify-center min-h-screen bg-[#f4f5f7]">
      <div className="text-center space-y-2">
        <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-[12px] text-[#04152d]/60 font-medium">Navigating to your dashboard...</p>
      </div>
    </div>
  );
}
