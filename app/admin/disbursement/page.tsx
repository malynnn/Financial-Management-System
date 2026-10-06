"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function AdminDisbursementRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/admin/funds');
  }, [router]);

  return (
    <div className="flex items-center justify-center min-h-screen bg-[#f4f5f7]">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin" />
        <p className="text-[13px] font-semibold text-[#04152d]/60">Redirecting to Funds Master...</p>
      </div>
    </div>
  );
}