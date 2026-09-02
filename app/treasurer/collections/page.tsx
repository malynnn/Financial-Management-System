"use client";

import React, { useState, useMemo, useEffect } from 'react';
import { 
  Search, ChevronDown, CheckCircle2, AlertCircle, ChevronLeft, ChevronRight, Info, Calendar
} from 'lucide-react';
import Header from '@/components/Header';
import TreasurerReviewModal from '@/components/collections/TreasurerReviewModal';

const MOCK_COLLECTIONS = Array.from({ length: 24 }).map((_, index) => {
  const isPosted = index % 3 === 0;
  const isRejected = index % 5 === 0 && !isPosted;
  const isPending = !isPosted && !isRejected;
  
  let status = 'Pending';
  if (isPosted) status = 'Posted';
  else if (isRejected) status = 'Rejected';
  else if (index % 2 === 0) status = 'For Verification';

  const amount = 1000 + (index * 250);

  return {
    id: `col${index + 1}`,
    ref: `TXN-${1000 + index}`,
    memberId: `MEM-2026-${(index % 9) + 1}`,
    memberName: ['Juan Dela Cruz', 'Maria Clara', 'Jose Rizal', 'Andres Bonifacio', 'Emilio Jacinto', 'Apolinario Mabini', 'Melchora Aquino'][index % 7],
    amount: amount,
    date: `2026-09-${(index % 30 + 1).toString().padStart(2, '0')}`,
    method: ['Bank Transfer', 'GCash', 'Over-the-Counter', 'Maya'][index % 4],
    paymentRef: isPosted ? `REF-${8000 + index}` : '',
    proofUrl: '#',
    status: status,
    isReconciled: isPosted && index % 2 === 0,
    rejectReason: isRejected ? 'The attached proof of payment is blurry and unreadable.' : undefined,
    applicationData: isPosted ? {
      obligationType: 'Annual Dues',
      originalBalance: amount + 500,
      appliedAmount: amount,
      remainingBalance: 500,
      exceptionStatus: 'Partial Payment'
    } : undefined,
    auditTrail: [
      { id: `at1-${index}`, action: 'Collection Record Created', actor: 'System', role: 'Automated', timestamp: new Date(Date.now() - 86400000 * 2).toISOString(), details: 'Member successfully submitted payment details and proof of transaction.' },
      ...(isPosted ? [{ id: `at3-${index}`, action: 'Payment Posted', actor: 'Maria Santos', role: 'Treasurer', timestamp: new Date().toISOString(), details: `Payment of ₱${amount.toLocaleString()} was successfully posted and applied. Exception Status: Partial Payment.` }] : []),
      ...(isRejected ? [{ id: `at4-${index}`, action: 'Collection Rejected', actor: 'Maria Santos', role: 'Treasurer', timestamp: new Date().toISOString(), details: 'Transaction rejected due to unreadable proof of payment.' }] : [])
    ]
  };
});

const ITEMS_PER_PAGE = 10;

export default function TreasurerCollectionsPage() {
  const [collections, setCollections] = useState<any[]>(MOCK_COLLECTIONS);
  const [isLoading, setIsLoading] = useState(false);
  
  // Standard Filters
  const [searchInput, setSearchInput] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('Requires Action');
  const [methodFilter, setMethodFilter] = useState('All');
  
  // Date Range Filter
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedCollection, setSelectedCollection] = useState<any | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [toast, setToast] = useState<{ message: string, type: 'success' | 'info' | 'error' } | null>(null);

  const fetchCollectionsFromApi = async () => {
    try {
      setIsLoading(true);
      const res = await fetch('http://localhost:3001/collections');
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          const mapped = data.map((c: any) => {
            let status = 'Pending';
            if (c.status === 'POSTED') status = 'Posted';
            else if (c.status === 'REJECTED') status = 'Rejected';
            else if (c.status === 'FOR_VERIFICATION') status = 'For Verification';
            else if (c.status === 'VALIDATED') status = 'For Verification';

            let method = 'GCash';
            if (c.paymentMethod === 'BANK_TRANSFER') method = 'Bank Transfer';
            else if (c.paymentMethod === 'CASH') method = 'Over-the-Counter';
            else if (c.paymentMethod === 'GCASH') method = 'GCash';

            return {
              id: c.id,
              ref: c.collectionRefNo || c.paymentReference,
              memberId: c.memberId,
              memberName: c.member?.name || 'Member',
              amount: Number(c.paymentAmount),
              date: new Date(c.paymentDate).toISOString().split('T')[0],
              method,
              paymentRef: c.paymentReference,
              proofUrl: c.proofOfPaymentPath ? `http://localhost:3001/${c.proofOfPaymentPath}` : '#',
              status,
              isReconciled: c.isReadyForReconciliation,
              rejectReason: c.rejectReason,
              applicationData: c.application ? {
                obligationType: c.application.obligation?.obligationType || 'General Obligation',
                originalBalance: Number(c.application.originalBalance),
                appliedAmount: Number(c.application.appliedAmount),
                remainingBalance: Number(c.application.remainingBalance),
                exceptionStatus: c.application.exceptionStatus,
              } : undefined,
              auditTrail: c.auditTrail ? c.auditTrail.map((at: any) => ({
                id: at.id,
                action: at.action,
                actor: at.actor,
                role: at.role,
                timestamp: at.timestamp,
                details: at.details,
              })) : [],
            };
          });
          setCollections(mapped);
        }
      }
    } catch {
      // Fallback to initial state
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCollectionsFromApi();
  }, []);

  // Debounce the search input by 300ms
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchInput), 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearch, statusFilter, methodFilter, startDate, endDate]);

  const showToast = (message: string, type: 'success' | 'info' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const filteredCollections = useMemo(() => {
    return collections.filter(c => {
      const matchesSearch = c.ref.toLowerCase().includes(debouncedSearch.toLowerCase()) || 
                            c.memberName.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
                            c.memberId.toLowerCase().includes(debouncedSearch.toLowerCase());
      
      const matchesMethod = methodFilter === 'All' || c.method === methodFilter;

      let matchesStatus = true;
      if (statusFilter === 'Requires Action') {
        matchesStatus = c.status === 'Pending' || c.status === 'For Verification';
      } else if (statusFilter !== 'All') {
        matchesStatus = c.status === statusFilter;
      }

      // Validating Date Range
      const collectionDate = new Date(c.date);
      const matchesStartDate = startDate ? collectionDate >= new Date(startDate) : true;
      const matchesEndDate = endDate ? collectionDate <= new Date(endDate) : true;

      return matchesSearch && matchesMethod && matchesStatus && matchesStartDate && matchesEndDate;
    });
  }, [collections, debouncedSearch, statusFilter, methodFilter, startDate, endDate]);

  const totalPages = Math.ceil(filteredCollections.length / ITEMS_PER_PAGE) || 1;
  const paginatedCollections = filteredCollections.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const handleProcessSuccess = (id: string, newStatus: string) => {
    setCollections(prev => prev.map(c => 
      c.id === id ? { ...c, status: newStatus, isReconciled: newStatus === 'Posted' } : c
    ));
    if (newStatus === 'Posted') showToast('Collection successfully posted and applied to records.', 'success');
    else if (newStatus === 'Rejected') showToast('Collection rejected and flagged for member review.', 'error');
    fetchCollectionsFromApi();
  };

  const formatCurrency = (val: number) => `₱${val.toLocaleString('en-US', { minimumFractionDigits: 2 })}`;

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Posted': return <span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-md text-[10px] font-semibold uppercase tracking-widest shadow-sm">Posted</span>;
      case 'Rejected': return <span className="px-2.5 py-1 bg-red-50 text-red-700 border border-red-200 rounded-md text-[10px] font-semibold uppercase tracking-widest shadow-sm">Rejected</span>;
      case 'For Verification': return <span className="px-2.5 py-1 bg-blue-50 text-blue-700 border border-blue-200 rounded-md text-[10px] font-semibold uppercase tracking-widest shadow-sm">For Verification</span>;
      default: return <span className="px-2.5 py-1 bg-yellow-50 text-yellow-700 border border-yellow-200 rounded-md text-[10px] font-semibold uppercase tracking-widest shadow-sm">Pending</span>;
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
        
        {/* Updated Filter Bar containing Date Range inputs */}
        <div className={`${ultraGlassCard} !p-4 flex flex-col xl:flex-row gap-4 items-center justify-between`}>
          <div className="flex flex-col sm:flex-row w-full xl:w-auto gap-4 flex-1">
            <div className="relative w-full sm:w-80 shrink-0">
              <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#04152d]/50" />
              <input 
                type="text" 
                placeholder="Search Ref, Member ID, or Name..." 
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
          
          <div className="flex w-full xl:w-auto gap-3">
            <div className="relative w-full sm:w-auto">
              <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className={`${glassInput} !pl-4 appearance-none pr-10 w-full cursor-pointer`}>
                <option value="Requires Action">Requires Action</option>
                <option value="All">All Statuses</option>
                <option value="Posted">Posted Only</option>
                <option value="Rejected">Rejected Only</option>
              </select>
              <ChevronDown size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-[#04152d]/50 pointer-events-none" />
            </div>

            <div className="relative w-full sm:w-auto">
              <select value={methodFilter} onChange={(e) => setMethodFilter(e.target.value)} className={`${glassInput} !pl-4 appearance-none pr-10 w-full cursor-pointer`}>
                <option value="All">All Methods</option>
                <option value="Bank Transfer">Bank Transfer</option>
                <option value="GCash">GCash</option>
                <option value="Over-the-Counter">Over-the-Counter</option>
              </select>
              <ChevronDown size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-[#04152d]/50 pointer-events-none" />
            </div>
          </div>
        </div>

        <div className={`${ultraGlassCard} !p-0`}>
          <div className="overflow-x-auto w-full">
            <table className="w-full text-left whitespace-nowrap border-collapse min-w-[900px]">
              <thead className="bg-white/60 backdrop-blur-md shadow-[0_1px_0_rgba(255,255,255,1)] text-[10px] font-semibold text-[#04152d]/50 uppercase tracking-[0.2em]">
                <tr>
                  <th className="py-4 px-6 border-b border-white/50">Reference</th>
                  <th className="py-4 px-6 border-b border-white/50">Member</th>
                  <th className="py-4 px-6 border-b border-white/50">Date & Method</th>
                  <th className="py-4 px-6 border-b border-white/50 text-right">Amount</th>
                  <th className="py-4 px-6 border-b border-white/50 text-center">Status</th>
                  <th className="py-4 px-6 border-b border-white/50 text-center">Reconciliation</th>
                  <th className="py-4 px-6 border-b border-white/50 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/60 text-[13px] text-[#04152d] bg-white/30">
                {paginatedCollections.length > 0 ? (
                  <>
                    {paginatedCollections.map((col) => (
                      <tr key={col.id} className="hover:bg-white/70 transition-all duration-300">
                        <td className="py-4 px-6 font-mono text-[12px] text-blue-600">{col.ref}</td>
                        <td className="py-4 px-6">
                          <p className="font-semibold text-[#04152d] tracking-tight">{col.memberName}</p>
                          <p className="text-[11px] text-[#04152d]/60">{col.memberId}</p>
                        </td>
                        <td className="py-4 px-6">
                          <p className="text-[#04152d]">{col.date}</p>
                          <p className="text-[11px] text-[#04152d]/60">{col.method}</p>
                        </td>
                        <td className="py-4 px-6 text-right font-semibold tracking-tighter text-[14px]">{formatCurrency(col.amount)}</td>
                        <td className="py-4 px-6 text-center">{getStatusBadge(col.status)}</td>
                        
                        <td className="py-4 px-6 text-center">
                          {col.status === 'Posted' && col.paymentRef ? (
                            <div className="flex items-center justify-center gap-1.5 text-emerald-600 bg-emerald-50/50 border border-emerald-100 px-2 py-1 rounded-full text-[10px] uppercase tracking-widest mx-auto w-fit">
                              <CheckCircle2 size={12} /> Ready
                            </div>
                          ) : col.status === 'Posted' && !col.paymentRef ? (
                            <div className="flex items-center justify-center gap-1.5 text-yellow-600 bg-yellow-50/50 border border-yellow-100 px-2 py-1 rounded-full text-[10px] uppercase tracking-widest mx-auto w-fit">
                              <AlertCircle size={12} /> Missing Ref
                            </div>
                          ) : (
                            <span className="text-[10px] text-[#04152d]/30 uppercase tracking-widest">-</span>
                          )}
                        </td>

                        <td className="py-4 px-6 text-right">
                          <button 
                            onClick={() => { setSelectedCollection(col); setIsModalOpen(true); }}
                            className="px-4 py-2 bg-white backdrop-blur-md border border-white/80 shadow-[0_2px_8px_rgba(4,21,45,0.05)] hover:shadow-md rounded-full text-[11px] font-semibold text-blue-600 uppercase tracking-widest transition-all active:scale-95"
                          >
                            {col.status === 'Pending' || col.status === 'For Verification' ? 'Review' : 'View'}
                          </button>
                        </td>
                      </tr>
                    ))}
                    
                    {currentPage === totalPages && (
                      <tr>
                        <td colSpan={7} className="py-8 text-center text-[#04152d]/40 text-[12px] italic tracking-wide">
                          Nothing else follows.
                        </td>
                      </tr>
                    )}
                  </>
                ) : (
                  <tr>
                    <td colSpan={7} className="py-24 text-center text-[#04152d]/40 font-medium text-[12px] uppercase tracking-widest">
                      No collection records found matching your filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="p-4 border-t border-white/60 bg-white/40 flex items-center justify-between">
              <p className="text-[12px] text-[#04152d]/60 font-medium hidden sm:block">
                Showing {((currentPage - 1) * ITEMS_PER_PAGE) + 1} to {Math.min(currentPage * ITEMS_PER_PAGE, filteredCollections.length)} of {filteredCollections.length} entries
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

      <TreasurerReviewModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        collection={selectedCollection}
        onProcessSuccess={handleProcessSuccess}
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