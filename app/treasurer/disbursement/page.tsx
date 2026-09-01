"use client";

import React, { useState, useMemo, useEffect } from 'react';
import { useSession } from "next-auth/react";
import { 
  Search, ChevronDown, CheckCircle2, AlertCircle, ChevronLeft, ChevronRight, Info, Plus, Calendar
} from 'lucide-react';
import Header from '@/components/Header';
import DisbursementRequestModal from '@/components/disbursement/DisbursementRequestModal';
import DisbursementActionModal from '@/components/disbursement/DisbursementActionModal';

const MOCK_DISBURSEMENTS = Array.from({ length: 15 }).map((_, index) => {
  const statuses = ['Pending Approval', 'Approved', 'Executed', 'Rejected'];
  const status = statuses[index % 4];
  const amount = 5000 + (index * 1500);

  return {
    id: `disb${index + 1}`,
    ref: `REQ-${2000 + index}`,
    member: ['Juan Dela Cruz', 'Maria Clara', 'Jose Rizal', 'Andres Bonifacio'][index % 4],
    loanType: ['Emergency Loan', 'Educational Loan', 'Calamity Loan'][index % 3],
    amount: amount,
    date: `2026-09-${(index % 30 + 1).toString().padStart(2, '0')}`,
    beneficiary: { name: 'Juan Dela Cruz', bank: 'BDO', account: '00123456789' },
    fundSource: 'General Fund',
    method: 'Bank Transfer',
    status: status as any,
    executionRef: status === 'Executed' ? `PAY-99${index}` : undefined,
    auditTrail: [
      { id: `at-${index}`, action: 'Disbursement Requested', actor: 'Maria Santos', role: 'Treasurer', timestamp: new Date(Date.now() - 86400000).toISOString(), details: `Requested ₱${amount.toLocaleString()} for processing.` }
    ]
  };
});

const ITEMS_PER_PAGE = 10;

export default function TreasurerDisbursementPage() {
  const { data: session } = useSession();
  
  // Extracting current role to pass into Action Modal for Task 8 compliance
  let currentUserRole = 'Treasurer';
  const rawRole = (session?.user as { role?: string })?.role;
  if (rawRole) {
    const formatted = rawRole.charAt(0).toUpperCase() + rawRole.slice(1).toLowerCase();
    if (formatted === 'Admin') currentUserRole = 'Officer/Admin';
    else currentUserRole = formatted;
  }

  const [disbursements, setDisbursements] = useState<any[]>(MOCK_DISBURSEMENTS);
  
  const [searchInput, setSearchInput] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const [currentPage, setCurrentPage] = useState(1);

  const [selectedDisbursement, setSelectedDisbursement] = useState<any | null>(null);
  const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);
  const [isActionModalOpen, setIsActionModalOpen] = useState(false);
  
  const [toast, setToast] = useState<{ message: string, type: 'success' | 'info' | 'error' } | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchInput), 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearch, statusFilter, startDate, endDate]);

  const showToast = (message: string, type: 'success' | 'info' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const filteredDisbursements = useMemo(() => {
    return disbursements.filter(d => {
      const matchesSearch = d.ref.toLowerCase().includes(debouncedSearch.toLowerCase()) || 
                            d.member.toLowerCase().includes(debouncedSearch.toLowerCase());
      const matchesStatus = statusFilter === 'All' || d.status === statusFilter;
      
      const requestDate = new Date(d.date);
      const matchesStartDate = startDate ? requestDate >= new Date(startDate) : true;
      const matchesEndDate = endDate ? requestDate <= new Date(endDate) : true;

      return matchesSearch && matchesStatus && matchesStartDate && matchesEndDate;
    });
  }, [disbursements, debouncedSearch, statusFilter, startDate, endDate]);

  const totalPages = Math.ceil(filteredDisbursements.length / ITEMS_PER_PAGE) || 1;
  const paginatedDisbursements = filteredDisbursements.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const handleRequestSuccess = (newDisb: any) => {
    setDisbursements(prev => [newDisb, ...prev]);
    showToast('Disbursement request successfully initiated.', 'success');
  };

  const handleActionSuccess = (id: string, newStatus: string, executionRef?: string) => {
    setDisbursements(prev => prev.map(d => {
      if (d.id === id) {
        const newLog = {
          id: `at-new-${Date.now()}`,
          action: newStatus === 'Approved' ? 'Request Approved' : newStatus === 'Rejected' ? 'Request Rejected' : 'Payment Executed',
          actor: newStatus === 'Approved' ? 'Admin Approver' : 'Treasurer',
          role: newStatus === 'Approved' ? 'Approver' : 'Processor',
          timestamp: new Date().toISOString(),
          details: newStatus === 'Executed' ? `Funds released with reference ${executionRef}.` : `Status updated to ${newStatus}.`
        };
        return { ...d, status: newStatus, executionRef, auditTrail: [...d.auditTrail, newLog] };
      }
      return d;
    }));
    showToast(`Disbursement successfully updated to ${newStatus}.`, 'success');
  };

  const formatCurrency = (val: number) => `₱${val.toLocaleString('en-US', { minimumFractionDigits: 2 })}`;

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Executed': return <span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-md text-[10px] font-semibold uppercase tracking-widest shadow-sm">Executed</span>;
      case 'Approved': return <span className="px-2.5 py-1 bg-blue-50 text-blue-700 border border-blue-200 rounded-md text-[10px] font-semibold uppercase tracking-widest shadow-sm">Approved</span>;
      case 'Rejected': return <span className="px-2.5 py-1 bg-red-50 text-red-700 border border-red-200 rounded-md text-[10px] font-semibold uppercase tracking-widest shadow-sm">Rejected</span>;
      default: return <span className="px-2.5 py-1 bg-yellow-50 text-yellow-700 border border-yellow-200 rounded-md text-[10px] font-semibold uppercase tracking-widest shadow-sm">Pending Apprv</span>;
    }
  };

  const getPageNumbers = () => {
    const maxVisible = 5;
    const pages = [];
    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      if (currentPage <= 3) {
        pages.push(1, 2, 3, 4, '...', totalPages);
      } else if (currentPage > totalPages - 3) {
        pages.push(1, '...', totalPages - 3, totalPages - 2, totalPages - 1, totalPages);
      } else {
        pages.push(1, '...', currentPage - 1, currentPage, currentPage + 1, '...', totalPages);
      }
    }
    return pages;
  };

  const ultraGlassCard = "bg-white/50 backdrop-blur-[40px] backdrop-saturate-[200%] border border-white/80 shadow-[0_8px_30px_rgba(4,21,45,0.06),inset_0_2px_3px_rgba(255,255,255,0.9)] rounded-[24px] p-6 relative overflow-hidden";
  const glassInput = "pl-11 pr-4 py-2.5 bg-white/60 hover:bg-white/80 focus:bg-white/90 backdrop-blur-xl border border-white/90 shadow-[inset_0_2px_4px_rgba(4,21,45,0.03)] rounded-full text-[13px] text-[#04152d] outline-none transition-all duration-300 placeholder:text-[#04152d]/40 focus:shadow-[0_4px_16px_rgba(4,21,45,0.08),inset_0_1px_2px_rgba(255,255,255,1)]";
  const pageBtn = "w-8 h-8 flex items-center justify-center rounded-full text-[12px] font-medium transition-all duration-300";

  return (
    <div className="relative flex flex-col min-h-screen bg-[#f4f5f7]">
      <style jsx global>{`
        @keyframes modal-fade-in { from { opacity: 0; transform: scale(0.95) translateY(10px); } to { opacity: 1; transform: scale(1) translateY(0); } }
        @keyframes slide-up { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        .animate-modal-enter { animation: modal-fade-in 0.3s cubic-bezier(0.25, 1, 0.5, 1) forwards; }
        .animate-fade-in { animation: modal-fade-in 0.4s ease-out forwards; }
        .animate-slide-up { animation: slide-up 0.4s cubic-bezier(0.25, 1, 0.5, 1) forwards; }
        .hide-scrollbar::-webkit-scrollbar { display: none; }
      `}</style>

      <div className="sticky top-0 z-40 w-full backdrop-blur-2xl bg-white/30 border-b border-white/50 shadow-[0_4px_30px_rgba(0,0,0,0.03)]">
        <Header />
      </div>

      <div className="p-4 md:p-6 max-w-[1400px] w-full mx-auto animate-fade-in flex-1 relative z-10 space-y-6 mt-2">
        
        <div className={`${ultraGlassCard} !p-4 flex flex-col xl:flex-row gap-4 items-center justify-between`}>
          <div className="flex flex-col sm:flex-row w-full xl:w-auto gap-4 flex-1">
            <div className="relative w-full sm:w-80 shrink-0">
              <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#04152d]/50" />
              <input 
                type="text" 
                placeholder="Search Request Ref or Member..." 
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className={`${glassInput} w-full`} 
              />
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <div className="relative flex-1 sm:w-36">
                <Calendar size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#04152d]/50" />
                <input 
                  type="date" 
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className={`${glassInput} !pl-10 w-full text-[12px] [&::-webkit-calendar-picker-indicator]:opacity-50`} 
                />
              </div>
              <span className="text-[#04152d]/40 font-bold">-</span>
              <div className="relative flex-1 sm:w-36">
                <Calendar size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#04152d]/50" />
                <input 
                  type="date" 
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className={`${glassInput} !pl-10 w-full text-[12px] [&::-webkit-calendar-picker-indicator]:opacity-50`} 
                />
              </div>
            </div>
          </div>
          
          <div className="flex w-full xl:w-auto gap-3 items-center">
            <div className="relative w-full sm:w-auto">
              <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className={`${glassInput} !pl-4 appearance-none pr-10 w-full cursor-pointer`}>
                <option value="All">All Statuses</option>
                <option value="Pending Approval">Pending Approval</option>
                <option value="Approved">Approved (Ready to Exec)</option>
                <option value="Executed">Executed</option>
              </select>
              <ChevronDown size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-[#04152d]/50 pointer-events-none" />
            </div>
            <button 
              onClick={() => setIsRequestModalOpen(true)}
              className="relative overflow-hidden px-5 py-2.5 bg-gradient-to-b from-[#0a1e3f] to-[#04152d] text-white border border-[#04152d] shadow-[0_6px_20px_rgba(4,21,45,0.3),inset_0_1px_1px_rgba(255,255,255,0.15)] hover:shadow-[0_8px_25px_rgba(4,21,45,0.4),inset_0_1px_1px_rgba(255,255,255,0.25)] hover:from-[#0f2850] hover:to-[#061a38] rounded-full text-[13px] font-semibold transition-all duration-300 flex items-center gap-2 active:scale-95 whitespace-nowrap"
            >
              <Plus size={16} /> New Request
            </button>
          </div>
        </div>

        <div className={`${ultraGlassCard} !p-0`}>
          <div className="overflow-x-auto w-full">
            <table className="w-full text-left whitespace-nowrap border-collapse min-w-[900px]">
              <thead className="bg-white/60 backdrop-blur-md shadow-[0_1px_0_rgba(255,255,255,1)] text-[10px] font-semibold text-[#04152d]/50 uppercase tracking-[0.2em]">
                <tr>
                  <th className="py-4 px-6 border-b border-white/50">Request Ref</th>
                  <th className="py-4 px-6 border-b border-white/50">Member & Obligation</th>
                  <th className="py-4 px-6 border-b border-white/50 text-right">Amount</th>
                  <th className="py-4 px-6 border-b border-white/50 text-center">Status</th>
                  <th className="py-4 px-6 border-b border-white/50 text-center">Reconciliation</th>
                  <th className="py-4 px-6 border-b border-white/50 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/60 text-[13px] text-[#04152d] bg-white/30">
                {paginatedDisbursements.length > 0 ? (
                  <>
                    {paginatedDisbursements.map((disb) => (
                      <tr key={disb.id} className="hover:bg-white/70 transition-all duration-300">
                        <td className="py-4 px-6 font-mono text-[12px] text-blue-600">{disb.ref}</td>
                        <td className="py-4 px-6">
                          <p className="font-semibold text-[#04152d] tracking-tight">{disb.member}</p>
                          <p className="text-[11px] text-[#04152d]/60">{disb.loanType}</p>
                        </td>
                        <td className="py-4 px-6 text-right font-semibold text-[14px]">{formatCurrency(disb.amount)}</td>
                        <td className="py-4 px-6 text-center">{getStatusBadge(disb.status)}</td>
                        
                        <td className="py-4 px-6 text-center">
                          {disb.status === 'Executed' && disb.executionRef ? (
                            <div className="flex items-center justify-center gap-1.5 text-emerald-600 bg-emerald-50/50 border border-emerald-100 px-2 py-1 rounded-full text-[10px] uppercase tracking-widest mx-auto w-fit">
                              <CheckCircle2 size={12} /> Ready
                            </div>
                          ) : (
                            <span className="text-[10px] text-[#04152d]/30 uppercase tracking-widest">-</span>
                          )}
                        </td>

                        <td className="py-4 px-6 text-right">
                          <button 
                            onClick={() => { setSelectedDisbursement(disb); setIsActionModalOpen(true); }}
                            className="px-4 py-2 bg-white backdrop-blur-md border border-white/80 shadow-[0_2px_8px_rgba(4,21,45,0.05)] hover:shadow-md rounded-full text-[11px] font-semibold text-blue-600 uppercase tracking-widest transition-all active:scale-95"
                          >
                            {disb.status === 'Pending Approval' ? 'Review' : disb.status === 'Approved' ? 'Execute' : 'History'}
                          </button>
                        </td>
                      </tr>
                    ))}
                    
                    {currentPage === totalPages && (
                      <tr>
                        <td colSpan={6} className="py-8 text-center text-[#04152d]/40 text-[12px] italic tracking-wide">
                          Nothing else follows.
                        </td>
                      </tr>
                    )}
                  </>
                ) : (
                  <tr>
                    <td colSpan={6} className="py-24 text-center text-[#04152d]/40 font-medium text-[12px] uppercase tracking-widest">
                      No disbursement records found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="p-4 border-t border-white/60 bg-white/40 flex items-center justify-between">
              <p className="text-[12px] text-[#04152d]/60 font-medium hidden sm:block">
                Showing {((currentPage - 1) * ITEMS_PER_PAGE) + 1} to {Math.min(currentPage * ITEMS_PER_PAGE, filteredDisbursements.length)} of {filteredDisbursements.length} entries
              </p>
              
              <div className="flex items-center gap-1 mx-auto sm:mx-0">
                <button 
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  className={`${pageBtn} bg-white/60 text-[#04152d] border border-white hover:bg-white shadow-sm disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  <ChevronLeft size={16} />
                </button>

                {getPageNumbers().map((pageNum, idx) => (
                  <button
                    key={idx}
                    onClick={() => typeof pageNum === 'number' ? setCurrentPage(pageNum) : null}
                    disabled={pageNum === '...'}
                    className={`${pageBtn} ${
                      pageNum === currentPage 
                        ? 'bg-[#04152d] text-white shadow-md' 
                        : 'bg-transparent text-[#04152d]/70 hover:bg-white/60 border border-transparent'
                    } ${pageNum === '...' ? 'cursor-default opacity-50' : ''}`}
                  >
                    {pageNum}
                  </button>
                ))}

                <button 
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                  className={`${pageBtn} bg-white/60 text-[#04152d] border border-white hover:bg-white shadow-sm disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          )}
        </div>

      </div>

      <DisbursementRequestModal
        isOpen={isRequestModalOpen}
        onClose={() => setIsRequestModalOpen(false)}
        onSuccess={handleRequestSuccess}
      />

      <DisbursementActionModal
        isOpen={isActionModalOpen}
        onClose={() => setIsActionModalOpen(false)}
        disbursement={selectedDisbursement}
        currentUserRole={currentUserRole}
        onProcessSuccess={handleActionSuccess}
      />

      {toast && (
        <div className={`fixed bottom-6 right-6 z-[150] animate-slide-up bg-white/80 backdrop-blur-2xl border border-white shadow-[0_8px_30px_rgba(0,0,0,0.12)] p-4 rounded-[16px] flex items-center gap-3 min-w-[300px]`}>
          <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 border ${
            toast.type === 'success' ? 'bg-emerald-100/50 border-emerald-200 text-emerald-600' :
            toast.type === 'error' ? 'bg-red-100/50 border-red-200 text-red-600' :
            'bg-blue-100/50 border-blue-200 text-blue-600'
          }`}>
            {toast.type === 'success' ? <CheckCircle2 size={16} /> :
             toast.type === 'error' ? <AlertCircle size={16} /> :
             <Info size={16} />}
          </div>
          <p className="text-[13px] font-medium text-[#04152d] leading-tight pr-4">
            {toast.message}
          </p>
        </div>
      )}
    </div>
  );
}

