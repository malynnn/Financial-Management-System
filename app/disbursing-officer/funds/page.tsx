"use client";

/**
 * Disbursing Officer — Fund Outflows & Liquidity Sufficiency Page
 * Implements Sprint 3 User Stories 5 & 6:
 * - User Story 5: "As a Disbursing Officer, I want to see posted disbursements deducted from a fund so that outgoing fund movements are visible.
 *   Rule: The fund transaction history shall identify posted disbursements as fund outflows and display their source reference and amount."
 * - User Story 6: "As a Disbursing Officer, I want the current available fund balance displayed before release so that I can verify fund sufficiency.
 *   Rule: The interface shall display the applicable available balance and shall indicate insufficient funds when the requested disbursement exceeds the available balance."
 */

import React, { useState, useMemo, useEffect } from 'react';
import { 
  Search, ChevronDown, ChevronLeft, ChevronRight, Calendar, 
  ArrowUpRight, CheckCircle2, AlertTriangle, Building2, Banknote, 
  SearchX, ExternalLink, ShieldCheck, Filter, AlertCircle
} from 'lucide-react';
import Header from '@/components/Header';
import TransactionSourceModal from '@/components/funds/TransactionSourceModal';
import FundLedgerModal from '@/components/funds/FundLedgerModal';
import { 
  Fund, FundTransaction, getStoredFunds, getStoredTransactions, 
  calculateFundBreakdown, FundBreakdown 
} from '@/lib/fundData';

const ITEMS_PER_PAGE = 10;

export default function DisbursingOfficerFundsPage() {
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

  // Compute live fund breakdown & sufficiency indicators (User Story 6)
  const breakdowns = useMemo<Record<string, FundBreakdown>>(() => {
    const map: Record<string, FundBreakdown> = {};
    funds.forEach(f => {
      map[f.id] = calculateFundBreakdown(f, transactions);
    });
    return map;
  }, [funds, transactions]);

  // Sprint 3 Story 5: Filter to disbursement-based outflows
  const disbursementOutflows = useMemo(() => {
    return transactions.filter(t => {
      // Must be an outflow or disbursement movement
      const isOutflow = t.direction === 'OUTFLOW' || t.sourceModule === 'Disbursement';
      if (!isOutflow) return false;

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

  const totalOutflowsDeducted = useMemo(() => {
    return disbursementOutflows
      .filter(t => t.status === 'Posted')
      .reduce((sum, t) => sum + Number(t.amount || 0), 0);
  }, [disbursementOutflows]);

  const pendingDisbursementsTotal = useMemo(() => {
    return disbursementOutflows
      .filter(t => t.status === 'Pending')
      .reduce((sum, t) => sum + Number(t.amount || 0), 0);
  }, [disbursementOutflows]);

  const totalPages = Math.ceil(disbursementOutflows.length / ITEMS_PER_PAGE) || 1;
  const paginatedOutflows = disbursementOutflows.slice(
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
            <div className="w-11 h-11 rounded-2xl bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center shrink-0 shadow-xs">
              <ArrowUpRight size={22} />
            </div>
            <div>
              <span className="block text-[10px] font-bold text-[#04152d]/50 uppercase tracking-widest">
                Total Posted Deductions
              </span>
              <span className="text-[22px] font-extrabold text-rose-700 tracking-tight">
                -{formatCurrency(totalOutflowsDeducted)}
              </span>
            </div>
          </div>

          <div className={`${ultraGlassCard} !p-4 flex items-center gap-3.5`}>
            <div className="w-11 h-11 rounded-2xl bg-blue-50 border border-blue-200 text-blue-600 flex items-center justify-center shrink-0 shadow-xs">
              <Building2 size={20} />
            </div>
            <div>
              <span className="block text-[10px] font-bold text-[#04152d]/50 uppercase tracking-widest">
                Managed Funds
              </span>
              <span className="text-[22px] font-extrabold text-[#04152d] tracking-tight">
                {funds.filter(f => f.status === 'Active').length} Active
              </span>
            </div>
          </div>

          <div className={`${ultraGlassCard} !p-4 flex items-center gap-3.5`}>
            <div className="w-11 h-11 rounded-2xl bg-amber-50 border border-amber-200 text-amber-700 flex items-center justify-center shrink-0 shadow-xs">
              <AlertCircle size={20} />
            </div>
            <div>
              <span className="block text-[10px] font-bold text-[#04152d]/50 uppercase tracking-widest">
                Pending Queued Deductions
              </span>
              <span className="text-[22px] font-extrabold text-amber-700 tracking-tight">
                {formatCurrency(pendingDisbursementsTotal)}
              </span>
            </div>
          </div>
        </div>

        {/* User Story 6: Current Available Fund Balances & Sufficiency Indicators */}
        <div>
          <div className="flex items-center justify-between mb-3 px-1">
            <h3 className="text-[12px] font-bold text-[#04152d] uppercase tracking-widest flex items-center gap-1.5">
              <Building2 size={15} className="text-blue-600" />
              Applicable Available Fund Balances (Sufficiency Before Release)
            </h3>
            <span className="text-[11px] text-[#04152d]/60 font-semibold">
              Live Liquidity Status
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {funds.map(fund => {
              const b = breakdowns[fund.id] || {
                openingBalance: fund.openingBalance || 0,
                totalPostedInflows: 0,
                totalPostedOutflows: 0,
                currentBalance: fund.openingBalance || 0,
                pendingOutflows: 0,
                availableBalance: fund.openingBalance || 0,
                status: fund.status
              };

              const isInactive = fund.status === 'Inactive';
              const isInsufficient = b.pendingOutflows > b.currentBalance;

              return (
                <div 
                  key={fund.id}
                  className={`${ultraGlassCard} !p-4 flex flex-col justify-between ${
                    isInactive ? 'opacity-70 bg-gray-50/60' : ''
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono text-[11px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                          {fund.code}
                        </span>
                        <span className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${
                          !isInactive ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-200 text-gray-700'
                        }`}>
                          {fund.status}
                        </span>
                      </div>
                      <h4 className="text-[14px] font-bold text-[#04152d] mt-1.5">{fund.name}</h4>
                    </div>

                    <button 
                      onClick={() => { setSelectedFund(fund); setIsLedgerModalOpen(true); }}
                      className="text-[11px] font-bold text-blue-600 hover:text-blue-800 underline"
                    >
                      Audit Ledger
                    </button>
                  </div>

                  {/* Available Balance Display (User Story 6) */}
                  <div className="my-3 bg-white/70 p-3 rounded-xl border border-white space-y-1 text-[12px]">
                    <div className="flex justify-between text-[#04152d]/60">
                      <span>Total Current Balance:</span>
                      <span className="font-semibold text-[#04152d]">{formatCurrency(b.currentBalance)}</span>
                    </div>
                    <div className="flex justify-between text-rose-600 text-[11px]">
                      <span>Pending Vouchers Queued:</span>
                      <span className="font-semibold">-{formatCurrency(b.pendingOutflows)}</span>
                    </div>
                    <div className="flex justify-between font-bold text-[13px] pt-1 border-t border-white text-[#04152d]">
                      <span>Available Liquidity:</span>
                      <span className="text-blue-700 font-extrabold">{formatCurrency(b.availableBalance)}</span>
                    </div>
                  </div>

                  {/* Sufficiency Indicator (User Story 6) */}
                  <div className="pt-1">
                    {isInsufficient ? (
                      <div className="p-2 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-[11px] font-semibold flex items-center gap-1.5">
                        <AlertCircle size={13} className="shrink-0" />
                        <span>Insufficient Funds: Pending vouchers exceed balance</span>
                      </div>
                    ) : isInactive ? (
                      <div className="p-2 rounded-lg bg-gray-100 border border-gray-200 text-gray-600 text-[11px] font-semibold flex items-center gap-1.5">
                        <AlertTriangle size={13} className="shrink-0 text-amber-500" />
                        <span>Restricted: Inactive fund cannot receive postings</span>
                      </div>
                    ) : (
                      <div className="p-2 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 text-[11px] font-semibold flex items-center gap-1.5">
                        <CheckCircle2 size={13} className="shrink-0" />
                        <span>Sufficient Liquidity for Disbursements</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Outflow Ledger Table (Sprint 3 User Story 5) */}
        <div className={`${ultraGlassCard} !p-0 mt-6`}>
          <div className="p-4 sm:p-5 border-b border-white/60 bg-white/40 flex flex-col gap-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-[13px] font-bold text-[#04152d] uppercase tracking-widest flex items-center gap-2">
                  <ArrowUpRight size={16} className="text-rose-600" /> Posted Disbursement Outflow Transactions
                </h3>
              </div>
            </div>

            {/* Filter Controls */}
            <div className="flex flex-col xl:flex-row gap-3 items-center justify-between">
              <div className="relative w-full xl:w-72 shrink-0">
                <Search size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#04152d]/50" />
                <input 
                  type="text" 
                  placeholder="Search Txn, Voucher, Payee..." 
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
                    <option value="All">All Debited Funds</option>
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
                    <option value="Posted">Posted Deductions</option>
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
                  <th className="py-3.5 px-6">Outflow Txn Ref</th>
                  {/* User Story 5: Source Reference */}
                  <th className="py-3.5 px-6">Source Voucher Ref</th>
                  <th className="py-3.5 px-6">Debited Fund</th>
                  <th className="py-3.5 px-6">Payee / Beneficiary</th>
                  <th className="py-3.5 px-6">Payment Instrument</th>
                  <th className="py-3.5 px-6">Release Date</th>
                  {/* User Story 5: Deducted Outflow Amount */}
                  <th className="py-3.5 px-6 text-right">Deducted Amount</th>
                  <th className="py-3.5 px-6 text-center">Posting Status</th>
                  <th className="py-3.5 px-6 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/60 text-[13px] text-[#04152d] bg-white/30">
                {paginatedOutflows.length > 0 ? (
                  paginatedOutflows.map((tx) => (
                    <tr key={tx.id} className="hover:bg-white/70 transition-colors">
                      <td className="py-3.5 px-6 font-mono font-bold text-[12px] text-blue-700">
                        {tx.id}
                      </td>

                      {/* User Story 5: Source Reference Display */}
                      <td className="py-3.5 px-6">
                        <button
                          onClick={() => handleOpenSource(tx)}
                          className="inline-flex items-center gap-1 font-mono font-bold text-[12px] text-rose-800 bg-rose-50 hover:bg-rose-100 border border-rose-300 px-2 py-0.5 rounded transition-all"
                          title="View Originating Disbursement Voucher"
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

                      {/* User Story 5: Outflow Display with - and rose color */}
                      <td className="py-3.5 px-6 text-right font-bold text-[14px] text-rose-700 tracking-tight">
                        -{formatCurrency(tx.amount)}
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
                          className="text-[11px] font-bold text-rose-700 hover:text-rose-900 underline"
                        >
                          Inspect Voucher
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={9} className="py-16 text-center">
                      <div className="flex flex-col items-center justify-center space-y-2">
                        <SearchX size={26} className="text-[#04152d]/30" />
                        <p className="text-[13px] font-semibold text-[#04152d]">No disbursement fund outflows found</p>
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
                Showing {((currentPage - 1) * ITEMS_PER_PAGE) + 1} to {Math.min(currentPage * ITEMS_PER_PAGE, disbursementOutflows.length)} of {disbursementOutflows.length} outflows
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
