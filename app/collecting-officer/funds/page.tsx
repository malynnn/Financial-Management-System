"use client";

/**
 * Collecting Officer — Fund Inflow History
 * Implements Sprint 3 User Story 4:
 * "As a Collecting Officer, I want to see posted collections credited to a fund so that incoming fund movements are visible.
 *  Rule: The fund transaction history shall identify posted collection transactions as fund inflows and display their source reference and amount."
 */

import React, { useState, useMemo, useEffect } from 'react';
import { 
  Search, ChevronDown, ChevronLeft, ChevronRight, Calendar, 
  ArrowDownLeft, CheckCircle2, Building2, Banknote, 
  SearchX, ExternalLink, ShieldCheck, Filter
} from 'lucide-react';
import Header from '@/components/Header';
import TransactionSourceModal from '@/components/funds/TransactionSourceModal';
import FundLedgerModal from '@/components/funds/FundLedgerModal';
import { 
  Fund, FundTransaction, getStoredFunds, getStoredTransactions, 
  calculateFundBreakdown 
} from '@/lib/fundData';

const ITEMS_PER_PAGE = 10;

export default function CollectingOfficerFundsPage() {
  const [funds, setFunds] = useState<Fund[]>([]);
  const [transactions, setTransactions] = useState<FundTransaction[]>([]);
  const [isClient, setIsClient] = useState(false);

  // Filters
  const [searchInput, setSearchInput] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [fundFilter, setFundFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  // Modal State
  const [selectedTxn, setSelectedTxn] = useState<FundTransaction | null>(null);
  const [isSourceModalOpen, setIsSourceModalOpen] = useState(false);
  const [selectedFund, setSelectedFund] = useState<Fund | null>(null);
  const [isLedgerModalOpen, setIsLedgerModalOpen] = useState(false);

  useEffect(() => {
    setIsClient(true);
    setFunds(getStoredFunds());
    setTransactions(getStoredTransactions());
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchInput), 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearch, fundFilter, statusFilter, startDate, endDate]);

  // Sprint 3 Story 4: Filter to collection-based inflows
  const collectionInflows = useMemo(() => {
    return transactions.filter(t => {
      // Must be an inflow or collection movement
      const isInflow = t.direction === 'INFLOW' || t.sourceModule === 'Collection';
      if (!isInflow) return false;

      if (fundFilter !== 'All' && t.fundName !== fundFilter && t.fundId !== fundFilter) return false;
      if (statusFilter !== 'All' && t.status !== statusFilter) return false;
      if (startDate && t.date < startDate) return false;
      if (endDate && t.date > endDate) return false;

      if (debouncedSearch) {
        const q = debouncedSearch.toLowerCase();
        const matchesRef = t.id.toLowerCase().includes(q);
        const matchesSource = t.sourceRef.toLowerCase().includes(q);
        const matchesParty = t.payeeOrPayer.toLowerCase().includes(q);
        const matchesFund = t.fundName.toLowerCase().includes(q) || t.fundCode.toLowerCase().includes(q);
        const matchesParticulars = t.particulars.toLowerCase().includes(q);
        if (!matchesRef && !matchesSource && !matchesParty && !matchesFund && !matchesParticulars) {
          return false;
        }
      }
      return true;
    }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [transactions, fundFilter, statusFilter, startDate, endDate, debouncedSearch]);

  const totalInflowsCredited = useMemo(() => {
    return collectionInflows
      .filter(t => t.status === 'Posted')
      .reduce((sum, t) => sum + Number(t.amount || 0), 0);
  }, [collectionInflows]);

  const pendingInflowsCount = useMemo(() => {
    return collectionInflows.filter(t => t.status === 'Pending').length;
  }, [collectionInflows]);

  const totalPages = Math.ceil(collectionInflows.length / ITEMS_PER_PAGE) || 1;
  const paginatedInflows = collectionInflows.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const formatCurrency = (val: number) => `₱${Number(val || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}`;

  const getPageNumbers = () => {
    const maxVisible = 5;
    const pages = [];
    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      if (currentPage <= 3) pages.push(1, 2, 3, 4, '...', totalPages);
      else if (currentPage > totalPages - 3) pages.push(1, '...', totalPages - 3, totalPages - 2, totalPages - 1, totalPages);
      else pages.push(1, '...', currentPage - 1, currentPage, currentPage + 1, '...', totalPages);
    }
    return pages;
  };

  const handleOpenSource = (txn: FundTransaction) => {
    setSelectedTxn(txn);
    setIsSourceModalOpen(true);
  };

  const ultraGlassCard = "bg-white/50 backdrop-blur-[40px] backdrop-saturate-[200%] border border-white/80 shadow-[0_8px_30px_rgba(4,21,45,0.06),inset_0_2px_3px_rgba(255,255,255,0.9)] rounded-[24px] p-6 relative overflow-hidden";
  const glassInput = "pl-10 pr-4 py-2.5 bg-white/60 hover:bg-white/80 focus:bg-white/90 backdrop-blur-xl border border-white/90 shadow-[inset_0_2px_4px_rgba(4,21,45,0.03)] rounded-[12px] text-[13px] font-semibold text-[#04152d] outline-none transition-all placeholder:text-[#04152d]/40 focus:shadow-[0_4px_16px_rgba(4,21,45,0.08)]";
  const pageBtn = "w-8 h-8 flex items-center justify-center rounded-full text-[12px] font-medium transition-all duration-300";

  return (
    <div className="relative flex flex-col min-h-screen bg-[#f4f5f7]">
      <style jsx global>{`
        @keyframes modal-fade-in { from { opacity: 0; transform: scale(0.96) translateY(8px); } to { opacity: 1; transform: scale(1) translateY(0); } }
        .animate-modal-enter { animation: modal-fade-in 0.25s cubic-bezier(0.25, 1, 0.5, 1) forwards; }
        .animate-fade-in { animation: modal-fade-in 0.35s ease-out forwards; }
        .hide-scrollbar::-webkit-scrollbar { display: none; }
      `}</style>

      {/* Header */}
      <div className="sticky top-0 z-40 w-full backdrop-blur-2xl bg-white/30 border-b border-white/50 shadow-[0_4px_30px_rgba(0,0,0,0.03)]">
        <Header />
      </div>

      <div className="p-4 md:p-6 max-w-[1400px] w-full mx-auto animate-fade-in flex-1 relative z-10 space-y-6 mt-2">
        
        {/* Metric Overview Row */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className={`${ultraGlassCard} !p-4 flex items-center gap-3.5`}>
            <div className="w-11 h-11 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center shrink-0 shadow-xs">
              <ArrowDownLeft size={22} />
            </div>
            <div>
              <span className="block text-[10px] font-bold text-[#04152d]/50 uppercase tracking-widest">
                Total Posted Inflows
              </span>
              <span className="text-[22px] font-extrabold text-emerald-700 tracking-tight">
                +{formatCurrency(totalInflowsCredited)}
              </span>
            </div>
          </div>

          <div className={`${ultraGlassCard} !p-4 flex items-center gap-3.5`}>
            <div className="w-11 h-11 rounded-2xl bg-blue-50 border border-blue-200 text-blue-600 flex items-center justify-center shrink-0 shadow-xs">
              <Building2 size={20} />
            </div>
            <div>
              <span className="block text-[10px] font-bold text-[#04152d]/50 uppercase tracking-widest">
                Receiving Funds
              </span>
              <span className="text-[22px] font-extrabold text-[#04152d] tracking-tight">
                {funds.filter(f => f.status === 'Active').length} Active
              </span>
            </div>
          </div>

          <div className={`${ultraGlassCard} !p-4 flex items-center gap-3.5`}>
            <div className="w-11 h-11 rounded-2xl bg-purple-50 border border-purple-200 text-purple-600 flex items-center justify-center shrink-0 shadow-xs">
              <CheckCircle2 size={20} />
            </div>
            <div>
              <span className="block text-[10px] font-bold text-[#04152d]/50 uppercase tracking-widest">
                Credited Movements
              </span>
              <span className="text-[22px] font-extrabold text-[#04152d] tracking-tight">
                {collectionInflows.filter(t => t.status === 'Posted').length} Processed
              </span>
            </div>
          </div>
        </div>

        {/* Active Funds Receiving Collections */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {funds.filter(f => f.status === 'Active').map(fund => {
            const b = calculateFundBreakdown(fund, transactions);
            return (
              <div 
                key={fund.id}
                onClick={() => { setSelectedFund(fund); setIsLedgerModalOpen(true); }}
                className={`${ultraGlassCard} !p-3.5 cursor-pointer hover:border-emerald-300 transition-all hover:-translate-y-0.5 group`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-mono text-[10px] font-bold text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded">
                    {fund.code}
                  </span>
                  <ArrowDownLeft size={12} className="text-emerald-500" />
                </div>
                <h4 className="text-[12px] font-bold text-[#04152d] truncate">{fund.name}</h4>
                <p className="text-[10px] text-emerald-700 font-bold mt-1">
                  +{formatCurrency(b.totalPostedInflows)}
                </p>
                <span className="text-[9px] text-[#04152d]/40 mt-0.5 block">Posted Inflows</span>
              </div>
            );
          })}
        </div>

        {/* Inflow Ledger Table (Sprint 3 User Story 4) */}
        <div className={`${ultraGlassCard} !p-0`}>
          <div className="p-4 sm:p-5 border-b border-white/60 bg-white/40 flex flex-col gap-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-[13px] font-bold text-[#04152d] uppercase tracking-widest flex items-center gap-2">
                  <ArrowDownLeft size={16} className="text-emerald-600" /> Posted Collection Inflow Transactions
                </h3>
              </div>

              {pendingInflowsCount > 0 && (
                <span className="px-3 py-1 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-300 self-start sm:self-auto">
                  {pendingInflowsCount} Deposit Pending Final Posting
                </span>
              )}
            </div>

            {/* Filter Controls */}
            <div className="flex flex-col xl:flex-row gap-3 items-center justify-between">
              <div className="relative w-full xl:w-72 shrink-0">
                <Search size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#04152d]/50" />
                <input 
                  type="text" 
                  placeholder="Search Ref, Member, Receipt..." 
                  value={searchInput} 
                  onChange={(e) => setSearchInput(e.target.value)} 
                  className={`${glassInput} w-full`} 
                />
              </div>

              <div className="flex flex-col sm:flex-row gap-2.5 w-full xl:w-auto flex-wrap justify-end">
                <div className="relative w-full sm:w-auto">
                  <select 
                    value={fundFilter} 
                    onChange={(e) => setFundFilter(e.target.value)} 
                    className={`${glassInput} !pl-4 appearance-none pr-8 cursor-pointer font-semibold`}
                  >
                    <option value="All">All Credited Funds</option>
                    {funds.map(f => <option key={f.id} value={f.name}>{f.name} ({f.code})</option>)}
                  </select>
                  <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#04152d]/50 pointer-events-none" />
                </div>

                <div className="relative w-full sm:w-auto">
                  <select 
                    value={statusFilter} 
                    onChange={(e) => setStatusFilter(e.target.value)} 
                    className={`${glassInput} !pl-4 appearance-none pr-8 cursor-pointer font-semibold`}
                  >
                    <option value="All">All Statuses</option>
                    <option value="Posted">Posted Inflows</option>
                    <option value="Pending">Pending Clearance</option>
                  </select>
                  <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#04152d]/50 pointer-events-none" />
                </div>

                <div className="flex items-center justify-between gap-1.5 w-full sm:w-auto bg-white/60 hover:bg-white/80 border border-white/90 rounded-[12px] px-3 shadow-xs h-[40px]">
                  <Calendar size={13} className="text-[#04152d]/50 shrink-0" />
                  <input 
                    type="date" 
                    value={startDate} 
                    max={endDate || undefined}
                    onChange={(e) => setStartDate(e.target.value)} 
                    className="bg-transparent text-[11px] font-semibold text-[#04152d] outline-none w-26 cursor-pointer" 
                  />
                  <span className="text-[#04152d]/30">-</span>
                  <input 
                    type="date" 
                    value={endDate} 
                    min={startDate || undefined}
                    onChange={(e) => setEndDate(e.target.value)} 
                    className="bg-transparent text-[11px] font-semibold text-[#04152d] outline-none w-26 cursor-pointer" 
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto w-full">
            <table className="w-full text-left whitespace-nowrap border-collapse min-w-[920px]">
              <thead className="bg-white/60 text-[10px] font-bold text-[#04152d]/50 uppercase tracking-[0.16em] border-b border-white/50">
                <tr>
                  <th className="py-3.5 px-6">Inflow Txn Ref</th>
                  {/* User Story 4: Source Reference */}
                  <th className="py-3.5 px-6">Source Collection Ref</th>
                  <th className="py-3.5 px-6">Credited Fund</th>
                  <th className="py-3.5 px-6">Remitter / Payor</th>
                  <th className="py-3.5 px-6">Payment Instrument</th>
                  <th className="py-3.5 px-6">Posting Date</th>
                  {/* User Story 4: Credited Inflow Amount */}
                  <th className="py-3.5 px-6 text-right">Credited Amount</th>
                  <th className="py-3.5 px-6 text-center">Status</th>
                  <th className="py-3.5 px-6 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/60 text-[13px] text-[#04152d] bg-white/30">
                {paginatedInflows.length > 0 ? (
                  paginatedInflows.map((tx) => (
                    <tr key={tx.id} className="hover:bg-white/70 transition-colors">
                      <td className="py-3.5 px-6 font-mono font-bold text-[12px] text-blue-700">
                        {tx.id}
                      </td>

                      {/* User Story 4: Source Reference Display */}
                      <td className="py-3.5 px-6">
                        <button
                          onClick={() => handleOpenSource(tx)}
                          className="inline-flex items-center gap-1 font-mono font-bold text-[12px] text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 px-2 py-0.5 rounded transition-all"
                          title="View Source Collection Receipt"
                        >
                          {tx.sourceRef}
                          <ExternalLink size={10} />
                        </button>
                      </td>

                      <td className="py-3.5 px-6 font-bold text-[#04152d]">
                        {tx.fundName} <span className="text-[10px] font-mono text-[#04152d]/50">({tx.fundCode})</span>
                      </td>

                      <td className="py-3.5 px-6 max-w-[200px]">
                        <p className="font-semibold text-[#04152d] truncate">{tx.payeeOrPayer}</p>
                        <p className="text-[10px] text-[#04152d]/50 truncate">{tx.particulars}</p>
                      </td>

                      <td className="py-3.5 px-6 text-[#04152d]/80 font-medium text-[12px]">
                        {tx.paymentMethod}
                      </td>

                      <td className="py-3.5 px-6 text-[#04152d]/70 text-[12px] font-medium">
                        {tx.timestamp || tx.date}
                      </td>

                      {/* User Story 4: Inflow Display with + and emerald color */}
                      <td className="py-3.5 px-6 text-right font-bold text-[14px] text-emerald-700 tracking-tight">
                        +{formatCurrency(tx.amount)}
                      </td>

                      <td className="py-3.5 px-6 text-center">
                        <span className={`px-2.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${
                          tx.status === 'Posted'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : 'bg-amber-50 text-amber-700 border-amber-200'
                        }`}>
                          {tx.status}
                        </span>
                      </td>

                      <td className="py-3.5 px-6 text-right">
                        <button
                          onClick={() => handleOpenSource(tx)}
                          className="text-[11px] font-bold text-emerald-700 hover:text-emerald-900 underline"
                        >
                          Inspect Receipt
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={9} className="py-16 text-center">
                      <div className="flex flex-col items-center justify-center space-y-2">
                        <SearchX size={26} className="text-[#04152d]/30" />
                        <p className="text-[13px] font-semibold text-[#04152d]">No collection fund inflows found</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="p-4 border-t border-white/60 bg-white/40 flex items-center justify-between">
              <p className="text-[12px] text-[#04152d]/60 font-medium">
                Showing {((currentPage - 1) * ITEMS_PER_PAGE) + 1} to {Math.min(currentPage * ITEMS_PER_PAGE, collectionInflows.length)} of {collectionInflows.length} inflows
              </p>
              
              <div className="flex items-center gap-1">
                <button 
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))} 
                  disabled={currentPage === 1} 
                  className={`${pageBtn} bg-white/60 border border-white hover:bg-white shadow-xs disabled:opacity-50`}
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
                        ? 'bg-[#04152d] text-white shadow-xs' 
                        : 'bg-transparent text-[#04152d]/70 hover:bg-white/60'
                    }`}
                  >
                    {pageNum}
                  </button>
                ))}
                <button 
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))} 
                  disabled={currentPage === totalPages} 
                  className={`${pageBtn} bg-white/60 border border-white hover:bg-white shadow-xs disabled:opacity-50`}
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          )}
        </div>

      </div>

      <TransactionSourceModal
        isOpen={isSourceModalOpen}
        onClose={() => setIsSourceModalOpen(false)}
        transaction={selectedTxn}
      />

      <FundLedgerModal
        isOpen={isLedgerModalOpen}
        onClose={() => setIsLedgerModalOpen(false)}
        fund={selectedFund}
        transactions={transactions}
      />
    </div>
  );
}
