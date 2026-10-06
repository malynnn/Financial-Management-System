"use client";

import React, { useState, useMemo, useEffect } from 'react';
import { 
  Search, ChevronDown, ChevronLeft, ChevronRight, Activity, 
  Calendar, AlertCircle, FileText, CheckCircle2, Shield, 
  Banknote, SearchX, ArrowDownLeft, ArrowUpRight, Building2, 
  ExternalLink, Calculator, Lock, Eye
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, 
  Tooltip as ChartTooltip, ResponsiveContainer, Cell 
} from 'recharts';
import Header from '@/components/Header';
import FundLedgerModal from '@/components/funds/FundLedgerModal';
import TransactionSourceModal from '@/components/funds/TransactionSourceModal';
import { 
  Fund, FundTransaction, getStoredFunds, getStoredTransactions, 
  calculateFundBreakdown, FundBreakdown 
} from '@/lib/fundData';

const ITEMS_PER_PAGE = 10;
const CHART_COLORS = ['#2563eb', '#3b82f6', '#60a5fa', '#93c5fd', '#1d4ed8', '#1e40af'];

export default function AuditorFundOversightPage() {
  const [funds, setFunds] = useState<Fund[]>([]);
  const [transactions, setTransactions] = useState<FundTransaction[]>([]);
  const [isClient, setIsClient] = useState(false);

  // Filters
  const [searchInput, setSearchInput] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [fundFilter, setFundFilter] = useState('All');
  const [movementFilter, setMovementFilter] = useState('All'); // All, INFLOW, OUTFLOW, OPENING
  const [statusFilter, setStatusFilter] = useState('All');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  
  const [currentPage, setCurrentPage] = useState(1);
  
  // Modals
  const [selectedFund, setSelectedFund] = useState<Fund | null>(null);
  const [isLedgerModalOpen, setIsLedgerModalOpen] = useState(false);
  
  const [selectedTransaction, setSelectedTransaction] = useState<FundTransaction | null>(null);
  const [isSourceModalOpen, setIsSourceModalOpen] = useState(false);

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
  }, [debouncedSearch, fundFilter, movementFilter, statusFilter, startDate, endDate]);

  // Compute calculated balance breakdown for all funds (User Story 12)
  const breakdowns = useMemo<Record<string, FundBreakdown>>(() => {
    const map: Record<string, FundBreakdown> = {};
    funds.forEach(f => {
      map[f.id] = calculateFundBreakdown(f, transactions);
    });
    return map;
  }, [funds, transactions]);

  // System-level aggregated audited components
  const masterBreakdown = useMemo(() => {
    let opening = 0;
    let inflows = 0;
    let outflows = 0;
    let current = 0;

    Object.values(breakdowns).forEach(b => {
      opening += b.openingBalance;
      inflows += b.totalPostedInflows;
      outflows += b.totalPostedOutflows;
      current += b.currentBalance;
    });

    return { opening, inflows, outflows, current };
  }, [breakdowns]);

  const activeFunds = useMemo(() => funds.filter(f => f.status === 'Active'), [funds]);

  const chartData = useMemo(() => {
    return activeFunds.map(f => {
      const b = breakdowns[f.id];
      return {
        name: f.code,
        fullName: f.name,
        balance: b ? b.currentBalance : 0
      };
    });
  }, [activeFunds, breakdowns]);

  // Filtered transactions for the ledger view
  const filteredTransactions = useMemo(() => {
    return transactions.filter(t => {
      if (fundFilter !== 'All' && t.fundName !== fundFilter && t.fundId !== fundFilter) return false;
      if (movementFilter !== 'All' && t.direction !== movementFilter) return false;
      if (statusFilter !== 'All' && t.status !== statusFilter) return false;
      if (startDate && t.date < startDate) return false;
      if (endDate && t.date > endDate) return false;

      if (debouncedSearch) {
        const q = debouncedSearch.toLowerCase();
        const matchesRef = t.id.toLowerCase().includes(q);
        const matchesSource = t.sourceRef.toLowerCase().includes(q);
        const matchesParticulars = t.particulars.toLowerCase().includes(q);
        const matchesParty = t.payeeOrPayer.toLowerCase().includes(q);
        const matchesFund = t.fundName.toLowerCase().includes(q) || t.fundCode.toLowerCase().includes(q);
        if (!matchesRef && !matchesSource && !matchesParticulars && !matchesParty && !matchesFund) {
          return false;
        }
      }
      return true;
    }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [transactions, fundFilter, movementFilter, statusFilter, startDate, endDate, debouncedSearch]);

  const totalPages = Math.ceil(filteredTransactions.length / ITEMS_PER_PAGE) || 1;
  const paginatedTransactions = filteredTransactions.slice(
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
    setSelectedTransaction(txn);
    setIsSourceModalOpen(true);
  };

  const ultraGlassCard = "bg-white/50 backdrop-blur-[40px] backdrop-saturate-[200%] border border-white/80 shadow-[0_8px_30px_rgba(4,21,45,0.06),inset_0_2px_3px_rgba(255,255,255,0.9)] rounded-[24px] p-6 relative overflow-hidden";
  const glassInput = "pl-10 pr-4 py-2.5 bg-white/60 hover:bg-white/80 focus:bg-white/90 backdrop-blur-xl border border-white/90 shadow-[inset_0_2px_4px_rgba(4,21,45,0.03)] rounded-[12px] text-[13px] font-semibold text-[#04152d] outline-none transition-all duration-300 placeholder:text-[#04152d]/40 focus:shadow-[0_4px_16px_rgba(4,21,45,0.08),inset_0_1px_2px_rgba(255,255,255,1)]";
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
        

        {/* User Story 12: Audited Master Fund Balance Equation Card */}
        <div className={`${ultraGlassCard} !p-5`}>
          <div className="flex items-center justify-between border-b border-white/70 pb-3 mb-4">
            <h3 className="text-[12px] font-extrabold text-[#04152d] uppercase tracking-widest flex items-center gap-2">
              <Calculator size={16} className="text-blue-600" />
              Audited Balance Breakdown (Master System Baseline)
            </h3>
            <span className="text-[11px] text-[#04152d]/50 font-medium">
              Formula: Opening Balance + Total Posted Inflows - Total Posted Outflows = Current Balance
            </span>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {/* 1. Opening Balance */}
            <div className="bg-white/70 p-4 rounded-2xl border border-white shadow-xs">
              <span className="block text-[10px] font-bold text-[#04152d]/50 uppercase tracking-widest mb-1">
                1. Recorded Opening Balances
              </span>
              <span className="block text-[22px] font-extrabold text-blue-700 tracking-tight">
                {formatCurrency(masterBreakdown.opening)}
              </span>
              <span className="text-[10px] text-[#04152d]/50 mt-1 block">Foundational Baselines</span>
            </div>

            {/* 2. Total Inflows */}
            <div className="bg-emerald-50/70 p-4 rounded-2xl border border-emerald-200 shadow-xs">
              <span className="block text-[10px] font-bold text-emerald-800 uppercase tracking-widest mb-1">
                + 2. Total Posted Inflows
              </span>
              <span className="block text-[22px] font-extrabold text-emerald-700 tracking-tight">
                +{formatCurrency(masterBreakdown.inflows)}
              </span>
              <span className="text-[10px] text-emerald-700/80 mt-1 block">Collections Credited</span>
            </div>

            {/* 3. Total Outflows */}
            <div className="bg-rose-50/70 p-4 rounded-2xl border border-rose-200 shadow-xs">
              <span className="block text-[10px] font-bold text-rose-800 uppercase tracking-widest mb-1">
                - 3. Total Posted Outflows
              </span>
              <span className="block text-[22px] font-extrabold text-rose-700 tracking-tight">
                -{formatCurrency(masterBreakdown.outflows)}
              </span>
              <span className="text-[10px] text-rose-700/80 mt-1 block">Disbursements Deducted</span>
            </div>

            {/* 4. Resulting Current Balance */}
            <div className="bg-blue-50/80 p-4 rounded-2xl border border-blue-200 shadow-sm">
              <span className="block text-[10px] font-bold text-blue-900 uppercase tracking-widest mb-1">
                = 4. Master Current Balance
              </span>
              <span className="block text-[24px] font-extrabold text-[#04152d] tracking-tight">
                {formatCurrency(masterBreakdown.current)}
              </span>
              <span className="text-[10px] text-blue-700 font-semibold mt-1 block">Reconciled & Audited</span>
            </div>
          </div>
        </div>

        {/* Individual Fund Balance Breakdown Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {funds.map((fund) => {
            const b = breakdowns[fund.id] || {
              openingBalance: fund.openingBalance || 0,
              totalPostedInflows: 0,
              totalPostedOutflows: 0,
              currentBalance: fund.openingBalance || 0,
              availableBalance: fund.openingBalance || 0,
              status: fund.status
            };

            const isInactive = fund.status === 'Inactive';

            return (
              <div 
                key={fund.id} 
                className={`${ultraGlassCard} flex flex-col group hover:-translate-y-1 transition-all duration-300 ${
                  isInactive ? 'opacity-70 bg-gray-50/60' : ''
                }`}
              >
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h3 className="text-[16px] font-bold text-[#04152d] tracking-tight">{fund.name}</h3>
                    <div className="flex items-center gap-1.5 mt-1">
                      <span className="text-[10px] font-bold text-[#04152d]/60 uppercase tracking-widest border border-[#04152d]/10 px-2 py-0.5 rounded bg-white/70">
                        {fund.code}
                      </span>
                      <span className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${
                        !isInactive ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-200 text-gray-700'
                      }`}>
                        {fund.status}
                      </span>
                    </div>
                  </div>

                  <button 
                    onClick={() => { setSelectedFund(fund); setIsLedgerModalOpen(true); }}
                    className="p-2 bg-white/70 hover:bg-white border border-white shadow-xs rounded-full text-blue-600 transition-colors"
                    title="Inspect Fund Equation & Movements"
                  >
                    <Eye size={16} />
                  </button>
                </div>

                {/* Fund 4-Part Balance Summary (User Story 12) */}
                <div className="bg-white/60 p-3 rounded-2xl border border-white my-3 space-y-1.5 text-[11px]">
                  <div className="flex justify-between text-[#04152d]/70">
                    <span>Recorded Opening:</span>
                    <span className="font-semibold text-[#04152d]">{formatCurrency(b.openingBalance)}</span>
                  </div>
                  <div className="flex justify-between text-emerald-700">
                    <span>+ Posted Inflows:</span>
                    <span className="font-semibold">+{formatCurrency(b.totalPostedInflows)}</span>
                  </div>
                  <div className="flex justify-between text-rose-700">
                    <span>- Posted Outflows:</span>
                    <span className="font-semibold">-{formatCurrency(b.totalPostedOutflows)}</span>
                  </div>
                  <div className="flex justify-between font-bold text-[13px] pt-1.5 border-t border-white text-[#04152d]">
                    <span>Current Balance:</span>
                    <span className="text-blue-700">{formatCurrency(b.currentBalance)}</span>
                  </div>
                </div>

                <div className="mt-auto pt-2 flex items-center justify-between text-[11px] text-[#04152d]/60">
                  <span className="flex items-center gap-1 text-emerald-600 font-semibold">
                    <CheckCircle2 size={13} /> Verified
                  </span>
                  <button
                    onClick={() => { setSelectedFund(fund); setIsLedgerModalOpen(true); }}
                    className="text-blue-600 hover:text-blue-800 font-semibold text-[11px] flex items-center gap-1 group-hover:underline"
                  >
                    View Movements Ledger &rarr;
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* User Story 7, 8, 9: Comprehensive Fund Transaction History / Ledger */}
        <div className={`${ultraGlassCard} !p-0 mt-8`}>
          <div className="p-5 border-b border-white/60 bg-white/40 flex flex-col gap-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-blue-50 border border-blue-200 text-blue-600 flex items-center justify-center">
                  <FileText size={16} />
                </div>
                <div>
                  <h3 className="text-[14px] font-bold text-[#04152d] uppercase tracking-widest">
                    Audited Fund Transaction History (Ledger View)
                  </h3>
                  <p className="text-[11px] text-[#04152d]/60">
                    Displaying movements across collections, disbursements, and opening balance baselines
                  </p>
                </div>
              </div>

              {/* Movement Direction Filter Pills (User Story 8) */}
              <div className="flex items-center gap-1 bg-white/80 p-1 rounded-full border border-white shadow-xs self-start sm:self-auto">
                <button
                  onClick={() => setMovementFilter('All')}
                  className={`px-3 py-1 rounded-full text-[11px] font-bold transition-all ${
                    movementFilter === 'All' ? 'bg-[#04152d] text-white shadow-xs' : 'text-[#04152d]/60 hover:text-[#04152d]'
                  }`}
                >
                  All ({transactions.length})
                </button>
                <button
                  onClick={() => setMovementFilter('INFLOW')}
                  className={`px-3 py-1 rounded-full text-[11px] font-bold transition-all ${
                    movementFilter === 'INFLOW' ? 'bg-emerald-600 text-white shadow-xs' : 'text-emerald-700 hover:text-emerald-900'
                  }`}
                >
                  Inflows (+)
                </button>
                <button
                  onClick={() => setMovementFilter('OUTFLOW')}
                  className={`px-3 py-1 rounded-full text-[11px] font-bold transition-all ${
                    movementFilter === 'OUTFLOW' ? 'bg-rose-600 text-white shadow-xs' : 'text-rose-700 hover:text-rose-900'
                  }`}
                >
                  Outflows (-)
                </button>
                <button
                  onClick={() => setMovementFilter('OPENING')}
                  className={`px-3 py-1 rounded-full text-[11px] font-bold transition-all ${
                    movementFilter === 'OPENING' ? 'bg-blue-600 text-white shadow-xs' : 'text-blue-700 hover:text-blue-900'
                  }`}
                >
                  Opening Baselines
                </button>
              </div>
            </div>
            
            {/* Search and Secondary Filter Controls */}
            <div className="flex flex-col xl:flex-row gap-3 items-center justify-between w-full">
              <div className="relative w-full xl:w-72 shrink-0">
                <Search size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#04152d]/50" />
                <input 
                  type="text" 
                  placeholder="Search Txn ID, Source Ref, Party..." 
                  value={searchInput} 
                  onChange={(e) => setSearchInput(e.target.value)} 
                  className={`${glassInput} w-full`} 
                />
              </div>

              <div className="flex flex-col sm:flex-row gap-3 w-full xl:w-auto flex-wrap xl:flex-nowrap justify-end">
                {/* Fund Filter */}
                <div className="relative w-full sm:w-auto">
                  <select 
                    value={fundFilter} 
                    onChange={(e) => setFundFilter(e.target.value)} 
                    className={`${glassInput} !pl-4 appearance-none pr-8 cursor-pointer w-full font-semibold`}
                  >
                    <option value="All">All Funds</option>
                    {funds.map(f => <option key={f.id} value={f.name}>{f.name} ({f.code})</option>)}
                  </select>
                  <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#04152d]/50 pointer-events-none" />
                </div>

                {/* Status Filter */}
                <div className="relative w-full sm:w-auto">
                  <select 
                    value={statusFilter} 
                    onChange={(e) => setStatusFilter(e.target.value)} 
                    className={`${glassInput} !pl-4 appearance-none pr-8 cursor-pointer w-full font-semibold`}
                  >
                    <option value="All">All Statuses</option>
                    <option value="Posted">Posted Only</option>
                    <option value="Pending">Pending Only</option>
                  </select>
                  <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#04152d]/50 pointer-events-none" />
                </div>

                {/* Date Range Filter */}
                <div className="flex items-center justify-between gap-2 w-full sm:w-auto bg-white/60 hover:bg-white/80 transition-colors border border-white/90 rounded-[12px] px-3 shadow-[inset_0_2px_4px_rgba(4,21,45,0.03)] h-[40px]">
                  <Calendar size={14} className="text-[#04152d]/50 shrink-0" />
                  <input 
                    type="date" 
                    value={startDate} 
                    max={endDate || undefined}
                    onChange={(e) => setStartDate(e.target.value)} 
                    className="bg-transparent text-[12px] font-semibold text-[#04152d] outline-none w-28 cursor-pointer" 
                  />
                  <span className="text-[#04152d]/30">-</span>
                  <input 
                    type="date" 
                    value={endDate} 
                    min={startDate || undefined}
                    onChange={(e) => setEndDate(e.target.value)} 
                    className="bg-transparent text-[12px] font-semibold text-[#04152d] outline-none w-28 cursor-pointer" 
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Ledger Table */}
          <div className="overflow-x-auto w-full">
            <table className="w-full text-left whitespace-nowrap border-collapse min-w-[950px]">
              <thead className="bg-white/60 backdrop-blur-md shadow-[0_1px_0_rgba(255,255,255,1)] text-[10px] font-bold text-[#04152d]/50 uppercase tracking-[0.18em]">
                <tr>
                  <th className="py-4 px-6 border-b border-white/50">Txn Reference</th>
                  <th className="py-4 px-6 border-b border-white/50">Fund Assigned</th>
                  <th className="py-4 px-6 border-b border-white/50">Transaction Type</th>
                  {/* User Story 9: Source Transaction Reference */}
                  <th className="py-4 px-6 border-b border-white/50">Source Reference</th>
                  <th className="py-4 px-6 border-b border-white/50">Party / Particulars</th>
                  <th className="py-4 px-6 border-b border-white/50">Date & Time</th>
                  {/* User Story 8: Distinguish Inflows and Outflows */}
                  <th className="py-4 px-6 border-b border-white/50 text-right">Movement Amount</th>
                  <th className="py-4 px-6 border-b border-white/50 text-center">Posting Status</th>
                  <th className="py-4 px-6 border-b border-white/50 text-right">Traceability</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/60 text-[13px] text-[#04152d] bg-white/30">
                {paginatedTransactions.length > 0 ? (
                  <>
                    {paginatedTransactions.map((tx) => {
                      const isInflow = tx.direction === 'INFLOW';
                      const isOutflow = tx.direction === 'OUTFLOW';
                      const isOpening = tx.direction === 'OPENING';

                      return (
                        <tr key={tx.id} className="hover:bg-white/70 transition-colors">
                          {/* Txn Reference */}
                          <td className="py-4 px-6 font-mono font-bold text-[12px] text-blue-700">
                            {tx.id}
                          </td>

                          {/* Fund Assigned */}
                          <td className="py-4 px-6">
                            <span className="font-bold text-[#04152d]">{tx.fundName}</span>
                            <span className="text-[10px] text-[#04152d]/50 ml-1.5 font-mono">({tx.fundCode})</span>
                          </td>

                          {/* Transaction Type */}
                          <td className="py-4 px-6">
                            <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider border shadow-xs ${
                              isInflow 
                                ? 'bg-emerald-50 text-emerald-800 border-emerald-200' 
                                : isOpening 
                                ? 'bg-blue-50 text-blue-800 border-blue-200' 
                                : 'bg-rose-50 text-rose-800 border-rose-200'
                            }`}>
                              {isInflow && <ArrowDownLeft size={12} />}
                              {isOutflow && <ArrowUpRight size={12} />}
                              {isOpening && <Building2 size={12} />}
                              {tx.type}
                            </span>
                          </td>

                          {/* User Story 9: Source Transaction Reference Link */}
                          <td className="py-4 px-6">
                            <button
                              onClick={() => handleOpenSource(tx)}
                              className="inline-flex items-center gap-1 font-mono font-bold text-[12px] text-blue-600 hover:text-blue-800 bg-blue-50/70 hover:bg-blue-100 border border-blue-200 px-2.5 py-1 rounded-md transition-all group"
                              title="Click to trace source document"
                            >
                              {tx.sourceRef}
                              <ExternalLink size={10} className="group-hover:translate-x-0.5 transition-transform" />
                            </button>
                          </td>

                          {/* Party / Particulars */}
                          <td className="py-4 px-6 max-w-[220px]">
                            <p className="font-semibold text-[#04152d] truncate">{tx.particulars}</p>
                            <p className="text-[11px] text-[#04152d]/50 truncate">{tx.payeeOrPayer}</p>
                          </td>

                          {/* Date & Time */}
                          <td className="py-4 px-6 text-[#04152d]/70 font-medium text-[12px]">
                            {tx.timestamp || tx.date}
                          </td>

                          {/* User Story 8: Distinguish Inflows and Outflows Amount */}
                          <td className="py-4 px-6 text-right font-bold text-[14px] tracking-tight">
                            <span className={
                              isInflow ? 'text-emerald-700' :
                              isOpening ? 'text-blue-700' :
                              'text-rose-700'
                            }>
                              {isInflow ? '+' : isOpening ? '' : '-'}{formatCurrency(tx.amount)}
                            </span>
                          </td>

                          {/* Posting Status */}
                          <td className="py-4 px-6 text-center">
                            {tx.status === 'Posted' ? (
                              <span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-md text-[10px] font-bold uppercase tracking-widest shadow-xs">
                                Posted
                              </span>
                            ) : (
                              <span className="px-2.5 py-1 bg-amber-50 text-amber-700 border border-amber-200 rounded-md text-[10px] font-bold uppercase tracking-widest shadow-xs">
                                Pending
                              </span>
                            )}
                          </td>

                          {/* Trace Action */}
                          <td className="py-4 px-6 text-right">
                            <button
                              onClick={() => handleOpenSource(tx)}
                              className="text-[12px] font-bold text-blue-600 hover:text-blue-800 underline"
                            >
                              Trace Lineage
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                    
                    {currentPage === totalPages && (
                      <tr>
                        <td colSpan={9} className="py-7 text-center text-[#04152d]/40 text-[12px] italic tracking-wide">
                          Audit history complete. All movements reconciled against source journal vouchers.
                        </td>
                      </tr>
                    )}
                  </>
                ) : (
                  <tr>
                    <td colSpan={9} className="py-20 text-center">
                      <div className="flex flex-col items-center justify-center space-y-3">
                        <div className="w-16 h-16 bg-white/60 border border-white rounded-full flex items-center justify-center shadow-sm">
                          <SearchX size={28} className="text-[#04152d]/30" />
                        </div>
                        <div>
                          <p className="text-[14px] font-semibold text-[#04152d] tracking-tight">No transactions match your query</p>
                          <p className="text-[12px] font-medium text-[#04152d]/50 mt-0.5">Try relaxing filters or adjusting dates.</p>
                        </div>
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
              <p className="text-[12px] text-[#04152d]/60 font-medium hidden sm:block">
                Showing {((currentPage - 1) * ITEMS_PER_PAGE) + 1} to {Math.min(currentPage * ITEMS_PER_PAGE, filteredTransactions.length)} of {filteredTransactions.length} movements
              </p>
              
              <div className="flex items-center gap-1 mx-auto sm:mx-0">
                <button 
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))} 
                  disabled={currentPage === 1} 
                  className={`${pageBtn} bg-white/60 border border-white hover:bg-white shadow-sm disabled:opacity-50`}
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
                        : 'bg-transparent text-[#04152d]/70 hover:bg-white/60'
                    }`}
                  >
                    {pageNum}
                  </button>
                ))}
                <button 
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))} 
                  disabled={currentPage === totalPages} 
                  className={`${pageBtn} bg-white/60 border border-white hover:bg-white shadow-sm disabled:opacity-50`}
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          )}
        </div>

      </div>

      {/* Fund Ledger Equation & Details Modal (User Story 12) */}
      <FundLedgerModal 
        isOpen={isLedgerModalOpen}
        onClose={() => setIsLedgerModalOpen(false)}
        fund={selectedFund}
        transactions={transactions}
        isAuditorView={true}
      />

      {/* Source Provenance Modal (User Story 9) */}
      <TransactionSourceModal
        isOpen={isSourceModalOpen}
        onClose={() => setIsSourceModalOpen(false)}
        transaction={selectedTransaction}
      />
    </div>
  );
}