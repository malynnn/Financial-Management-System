"use client";

import React from 'react';
import Header from '@/components/Header';
import FundLifespanDashboard from '@/components/lifespan/FundLifespanDashboard';

export default function AdminLifespanPage() {
  return (
    <div className="relative flex flex-col min-h-screen bg-[#f4f5f7]">
      <style jsx global>{`
        @keyframes modal-fade-in { from { opacity: 0; transform: scale(0.96) translateY(8px); } to { opacity: 1; transform: scale(1) translateY(0); } }
        @keyframes fade-in { from { opacity: 0; } to { opacity: 1; } }
        .animate-modal-enter { animation: modal-fade-in 0.25s cubic-bezier(0.25, 1, 0.5, 1) forwards; }
        .animate-fade-in { animation: fade-in 0.25s ease-out forwards; }
        .hide-scrollbar::-webkit-scrollbar { display: none; }
      `}</style>

      {/* Header */}
      <div className="sticky top-0 z-40 w-full backdrop-blur-2xl bg-white/30 border-b border-white/50 shadow-[0_4px_30px_rgba(0,0,0,0.03)]">
        <Header />
      </div>

      <div className="flex-1 mt-2">
        <FundLifespanDashboard isAuditorView={false} currentUserRole="System Administrator" />
      </div>
    </div>
  );
}
