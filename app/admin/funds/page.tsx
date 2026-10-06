"use client";

import React, { useState, useMemo, useEffect } from 'react';
import { 
  Search, ChevronDown, ChevronLeft, ChevronRight, Plus, 
  CheckCircle2, AlertCircle, Info, Edit, Power, PowerOff,
  Briefcase, Activity, Banknote, SearchX, FileText,
  AlertTriangle, Calculator, Layers, ShieldCheck
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, 
  Tooltip as ChartTooltip, ResponsiveContainer, Cell 
} from 'recharts';
import Header from '@/components/Header';
import FundActionModal from '@/components/funds/FundActionModal';
import FundLedgerModal from '@/components/funds/FundLedgerModal';
import { 
  Fund, FundTransaction, getStoredFunds, saveStoredFunds, 
  getStoredTransactions, saveStoredTransactions, 
  calculateFundBreakdown, FundBreakdown, createFundRecord 
} from '@/lib/fundData';

const ITEMS_PER_PAGE = 10;
const CHART_COLORS = ['#2563eb', '#3b82f6', '#60a5fa', '#93c5fd', '#1d4ed8', '#1e40af'];

export default function AdminFundMasterPage() {
  const [funds, setFunds] = useState<Fund[]>([]);
  const [transactions, setTransactions] = useState<FundTransaction[]>([]);
  const [isClient, setIsClient] = useState(false);
  
  const [searchInput, setSearchInput] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [currentPage, setCurrentPage] = useState(1);

  // Modals state
  const [selectedFundForEdit, setSelectedFundForEdit] = useState<Fund | null>(null);
  const [isActionModalOpen, setIsActionModalOpen] = useState(false);
  
  const [selectedFundForLedger, setSelectedFundForLedger] = useState<Fund | null>(null);
  const [isLedgerModalOpen, setIsLedgerModalOpen] = useState(false);

  // Status Toggle Confirmation Dialog State
  const [pendingStatusToggle, setPendingStatusToggle] = useState<{ fund: Fund; nextStatus: 'Active' | 'Inactive' } | null>(null);

  const [toast, setToast] = useState<{ message: string, type: 'success' | 'info' | 'error' } | null>(null);

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
  }, [debouncedSearch, statusFilter]);

  const showToast = (message: string, type: 'success' | 'info' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  // Fund breakdowns computed dynamically from opening balance + posted inflows - posted outflows
  const fundBreakdowns = useMemo<Record<string, FundBreakdown>>(() => {
    const map: Record<string, FundBreakdown> = {};
    funds.forEach(f => {
      map[f.id] = calculateFundBreakdown(f, transactions);
    });
    return map;
  }, [funds, transactions]);

  const filteredFunds = useMemo(() => {
    return funds.filter(f => {
      const q = debouncedSearch.toLowerCase();
      const matchesSearch = f.name.toLowerCase().includes(q) || 
                            f.code.toLowerCase().includes(q) ||
                            f.description.toLowerCase().includes(q);
      const matchesStatus = statusFilter === 'All' || f.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [funds, debouncedSearch, statusFilter]);

  const totalPages = Math.ceil(filteredFunds.length / ITEMS_PER_PAGE) || 1;
  const paginatedFunds = filteredFunds.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const activeFunds = useMemo(() => funds.filter(f => f.status === 'Active'), [funds]);
  const activeFundsCount = activeFunds.length;
  const inactiveFundsCount = funds.filter(f => f.status === 'Inactive').length;

  const totalSystemBalance = useMemo(() => {
    return Object.values(fundBreakdowns).reduce((sum, b) => sum + b.currentBalance, 0);
  }, [fundBreakdowns]);

  const totalRecordedOpening = useMemo(() => {
    return funds.reduce((sum, f) => sum + Number(f.openingBalance || 0), 0);
  }, [funds]);

  const chartData = useMemo(() => {
    return activeFunds.map(f => {
      const b = fundBreakdowns[f.id];
      return {
        name: f.code,
        fullName: f.name,
        balance: b ? b.currentBalance : 0
      };
    });
  }, [activeFunds, fundBreakdowns]);

  const handleModalSuccess = (savedFund: Fund) => {
    if (selectedFundForEdit) {
      // Editing existing fund
      const updated = funds.map(f => f.id === savedFund.id ? savedFund : f);
      setFunds(updated);
      saveStoredFunds(updated);
      showToast(`${savedFund.name} (${savedFund.code}) updated successfully.`, 'success');
    } else {
      // Registering new fund with baseline opening balance
      const { updatedFunds, updatedTxns, newFund } = createFundRecord(
        {
          name: savedFund.name,
          code: savedFund.code,
          description: savedFund.description,
          openingBalance: savedFund.openingBalance,
          targetUtilization: savedFund.targetUtilization
        },
        funds,
        transactions
      );
      setFunds(updatedFunds);
      setTransactions(updatedTxns);
      showToast(`${newFund.name} (${newFund.code}) registered with baseline opening balance of ₱${newFund.openingBalance.toLocaleString()}.`, 'success');
    }
  };

  const confirmToggleStatus = () => {
    if (!pendingStatusToggle) return;
    const { fund, nextStatus } = pendingStatusToggle;
    const updated = funds.map(f => f.id === fund.id ? { ...f, status: nextStatus } : f);
    setFunds(updated);
    saveStoredFunds(updated);
    setPendingStatusToggle(null);

    if (nextStatus === 'Inactive') {
      showToast(`${fund.name} deactivated. It is now restricted from new financial postings.`, 'info');
    } else {
      showToast(`${fund.name} activated and available for transactions.`, 'success');
    }
  };

  const formatCurrency = (val: number) => `₱${Number(val || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}`;

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
        @keyframes modal-fade-in { from { opacity: 0; transform: scale(0.96) translateY(8px); } to { opacity: 1; transform: scale(1) translateY(0); } }
        @keyframes slide-up { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        .animate-modal-enter { animation: modal-fade-in 0.25s cubic-bezier(0.25, 1, 0.5, 1) forwards; }
        .animate-fade-in { animation: modal-fade-in 0.35s ease-out forwards; }
        .animate-slide-up { animation: slide-up 0.35s cubic-bezier(0.25, 1, 0.5, 1) forwards; }
        .hide-scrollbar::-webkit-scrollbar { display: none; }
      `}</style>

      {/* Top Header */}
      <div className="sticky top-0 z-40 w-full backdrop-blur-2xl bg-white/30 border-b border-white/50 shadow-[0_4px_30px_rgba(0,0,0,0.03)]">
        <Header />
      </div>

      <div className="p-4 md:p-6 max-w-[1400px] w-full mx-auto animate-fade-in flex-1 relative z-10 space-y-6 mt-2">
        
        {/* User Story 1: Fund Dashboard Header & Metrics */}
        <div className="flex flex-col xl:flex-row items-stretch gap-6 mb-2">
          
          <div className="flex flex-col gap-4 w-full xl:w-1/3">
            {/* Total Balance Card */}
            <div className={`flex-1 flex items-center gap-4 ${ultraGlassCard} !p-5`}>
              <div className="w-12 h-12 bg-white/90 border border-white rounded-[16px] shadow-sm flex items-center justify-center shrink-0">
                <Banknote size={24} className="text-blue-600" />
              </div>
              <div>
                <span className="block text-[11px] font-bold text-[#04152d]/50 uppercase tracking-widest">
                  Total Active Master Ledger Balance
                </span>
                <span className="block text-[25px] font-extrabold text-[#04152d] tracking-tighter mt-0.5">
                  {formatCurrency(totalSystemBalance)}
                </span>
                <span className="block text-[10px] text-blue-600 font-semibold mt-0.5">
                  Across {activeFundsCount} Active Funds • Calculated Live
                </span>
              </div>
            </div>
            
            {/* Active vs Inactive Metrics (User Story 11) */}
            <div className="flex-1 grid grid-cols-2 gap-4">
              <div className={`h-full flex flex-col justify-center ${ultraGlassCard} !p-4`}>
                <span className="block text-[10px] font-bold text-[#04152d]/50 uppercase tracking-widest mb-1 flex items-center gap-1.5">
                  <Activity size={12} className="text-emerald-500" /> Active Funds
                </span>
                <span className="block text-[26px] font-bold text-emerald-600 tracking-tighter leading-none">
                  {activeFundsCount}
                </span>
                <span className="text-[10px] text-emerald-700/70 font-semibold mt-1">Selectable for Postings</span>
              </div>

              <div className={`h-full flex flex-col justify-center ${ultraGlassCard} !p-4`}>
                <span className="block text-[10px] font-bold text-[#04152d]/50 uppercase tracking-widest mb-1 flex items-center gap-1.5">
                  <PowerOff size={12} className="text-gray-500" /> Inactive Funds
                </span>
                <span className="block text-[26px] font-bold text-gray-500 tracking-tighter leading-none">
                  {inactiveFundsCount}
                </span>
                <span className="text-[10px] text-rose-600/80 font-semibold mt-1">Restricted from Postings</span>
              </div>
            </div>
          </div>

          {/* Active Fund Distribution Bar Chart */}
          <div className={`flex-1 ${ultraGlassCard} !p-5 flex flex-col`}>
            <div className="flex items-center justify-between border-b border-white/60 pb-2 mb-3 shrink-0">
              <h3 className="text-[12px] font-bold text-[#04152d] uppercase tracking-widest flex items-center gap-2">
                <Activity size={16} className="text-blue-500"/> Active Fund Liquidity Allocation
              </h3>
              <span className="text-[10px] font-semibold text-[#04152d]/50">
                Opening Baseline Total: {formatCurrency(totalRecordedOpening)}
              </span>
            </div>

            <div className="flex-1 w-full min-h-[160px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(4,21,45,0.06)" />
                  <XAxis dataKey="name" stroke="#04152d" opacity={0.6} fontSize={11} tickLine={false} fontWeight="bold" />
                  <YAxis stroke="#04152d" opacity={0.6} fontSize={11} tickLine={false} fontWeight="bold" tickFormatter={(v) => `₱${(v/1000).toFixed(0)}k`} />
                  <ChartTooltip 
                    cursor={{ fill: 'rgba(37,99,235,0.05)' }}
                    formatter={(value: any) => [`₱${Number(value).toLocaleString('en-US', { minimumFractionDigits: 2 })}`, 'Current Balance']}
                    labelFormatter={(label, payload) => payload[0]?.payload.fullName || label}
                    contentStyle={{ 
                      backgroundColor: 'rgba(255,255,255,0.95)', 
                      backdropFilter: 'blur(10px)', 
                      borderRadius: '12px', 
                      border: '1px solid rgba(255,255,255,1)', 
                      boxShadow: '0 8px 30px rgba(4,21,45,0.1)', 
                      fontSize: '12px', 
                      fontWeight: 'bold' 
                    }}
                  />
                  <Bar dataKey="balance" radius={[6, 6, 0, 0]} maxBarSize={55}>
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Filter and Action Controls */}
        <div className={`${ultraGlassCard} !p-4 flex flex-col lg:flex-row gap-4 items-center justify-between`}>
          <div className="relative w-full lg:w-1/3">
            <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#04152d]/50" />
            <input 
              type="text" 
              placeholder="Search Fund Name, Code, Description..." 
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className={`${glassInput} w-full`} 
            />
          </div>
          
          <div className="flex w-full lg:w-auto gap-3 items-center">
            {/* Status Filter Dropdown */}
            <div className="relative w-full sm:w-auto">
              <select 
                value={statusFilter} 
                onChange={(e) => setStatusFilter(e.target.value)} 
                className={`${glassInput} !pl-4 appearance-none pr-10 w-full cursor-pointer font-semibold`}
              >
                <option value="All">All Statuses ({funds.length})</option>
                <option value="Active">Active Funds Only ({activeFundsCount})</option>
                <option value="Inactive">Inactive Funds Only ({inactiveFundsCount})</option>
              </select>
              <ChevronDown size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-[#04152d]/50 pointer-events-none" />
            </div>

            {/* User Story 2: Register New Fund Button */}
            <button 
              onClick={() => { setSelectedFundForEdit(null); setIsActionModalOpen(true); }}
              className="relative overflow-hidden px-5 py-2.5 bg-gradient-to-b from-[#0a1e3f] to-[#04152d] text-white border border-[#04152d] shadow-[0_6px_20px_rgba(4,21,45,0.25)] hover:shadow-[0_8px_25px_rgba(4,21,45,0.35)] hover:from-[#0f2850] hover:to-[#061a38] rounded-full text-[13px] font-semibold transition-all duration-300 flex items-center gap-2 active:scale-95 whitespace-nowrap"
            >
              <Plus size={16} /> Register New Fund
            </button>
          </div>
        </div>

        {/* User Story 1, 3, 11: Fund Master Ledger Table */}
        <div className={`${ultraGlassCard} !p-0`}>
          <div className="overflow-x-auto w-full">
            <table className="w-full text-left whitespace-nowrap border-collapse min-w-[960px]">
              <thead className="bg-white/60 backdrop-blur-md shadow-[0_1px_0_rgba(255,255,255,1)] text-[10px] font-bold text-[#04152d]/50 uppercase tracking-[0.18em]">
                <tr>
                  <th className="py-4 px-6 border-b border-white/50">Fund Information</th>
                  {/* User Story 3: Opening Balance Displayed Separately */}
                  <th className="py-4 px-6 border-b border-white/50 text-right">Recorded Opening</th>
                  <th className="py-4 px-6 border-b border-white/50 text-right">Posted Inflows</th>
                  <th className="py-4 px-6 border-b border-white/50 text-right">Posted Outflows</th>
                  {/* User Story 1: Current Balance */}
                  <th className="py-4 px-6 border-b border-white/50 text-right font-extrabold text-[#04152d]">Current Balance</th>
                  {/* User Story 11: Active / Inactive Status */}
                  <th className="py-4 px-6 border-b border-white/50 text-center">Status</th>
                  <th className="py-4 px-6 border-b border-white/50 text-right">Management Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/60 text-[13px] text-[#04152d] bg-white/30">
                {paginatedFunds.length > 0 ? (
                  <>
                    {paginatedFunds.map((fund) => {
                      const breakdown = fundBreakdowns[fund.id] || {
                        openingBalance: fund.openingBalance || 0,
                        totalPostedInflows: 0,
                        totalPostedOutflows: 0,
                        currentBalance: fund.openingBalance || 0
                      };

                      const isInactive = fund.status === 'Inactive';

                      return (
                        <tr 
                          key={fund.id} 
                          className={`hover:bg-white/70 transition-all duration-200 ${
                            isInactive ? 'bg-gray-50/50 opacity-75' : ''
                          }`}
                        >
                          {/* Fund Info */}
                          <td className="py-4 px-6">
                            <div className="flex items-center gap-3">
                              <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 border font-bold text-[12px] shadow-xs ${
                                !isInactive 
                                  ? 'bg-blue-50 border-blue-200 text-blue-700' 
                                  : 'bg-gray-100 border-gray-300 text-gray-500'
                              }`}>
                                {fund.code}
                              </div>
                              <div>
                                <p className="font-bold text-[#04152d] tracking-tight">{fund.name}</p>
                                <p className="text-[11px] text-[#04152d]/50 truncate max-w-[220px]">
                                  {fund.description || 'No description provided'}
                                </p>
                              </div>
                            </div>
                          </td>

                          {/* User Story 3: Opening Balance Displayed Separately */}
                          <td className="py-4 px-6 text-right font-semibold text-[13px] text-[#04152d]/80">
                            {formatCurrency(breakdown.openingBalance)}
                          </td>

                          {/* Subsequent Posted Inflows */}
                          <td className="py-4 px-6 text-right font-semibold text-[13px] text-emerald-700">
                            +{formatCurrency(breakdown.totalPostedInflows)}
                          </td>

                          {/* Subsequent Posted Outflows */}
                          <td className="py-4 px-6 text-right font-semibold text-[13px] text-rose-700">
                            -{formatCurrency(breakdown.totalPostedOutflows)}
                          </td>

                          {/* User Story 1: Current Ledger Balance */}
                          <td className="py-4 px-6 text-right font-bold text-[15px] text-[#04152d]">
                            {formatCurrency(breakdown.currentBalance)}
                          </td>

                          {/* User Story 11: Active / Inactive Badge */}
                          <td className="py-4 px-6 text-center">
                            {fund.status === 'Active' ? (
                              <span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-md text-[10px] font-bold uppercase tracking-widest shadow-xs">
                                Active
                              </span>
                            ) : (
                              <span className="px-2.5 py-1 bg-gray-100 text-gray-600 border border-gray-200 rounded-md text-[10px] font-bold uppercase tracking-widest shadow-xs">
                                Inactive (Restricted)
                              </span>
                            )}
                          </td>

                          {/* Admin Actions */}
                          <td className="py-4 px-6 text-right">
                            <div className="flex items-center justify-end gap-2">
                              {/* View Breakdown & Ledger Modal */}
                              <button 
                                onClick={() => { setSelectedFundForLedger(fund); setIsLedgerModalOpen(true); }}
                                className="w-8 h-8 flex items-center justify-center bg-white backdrop-blur-md border border-white/80 shadow-xs hover:shadow-md rounded-full text-blue-600 hover:bg-blue-50 transition-all active:scale-95"
                                title="Inspect Audited Balance Equation & Ledger"
                              >
                                <Calculator size={14} />
                              </button>

                              {/* Edit Fund Configuration */}
                              <button 
                                onClick={() => { setSelectedFundForEdit(fund); setIsActionModalOpen(true); }}
                                className="w-8 h-8 flex items-center justify-center bg-white backdrop-blur-md border border-white/80 shadow-xs hover:shadow-md rounded-full text-[#04152d]/60 hover:text-blue-600 transition-all active:scale-95"
                                title="Edit Fund Configuration"
                              >
                                <Edit size={14} />
                              </button>

                              {/* User Story 11: Status Toggle with Explicit Confirmation Dialog */}
                              <button 
                                onClick={() => setPendingStatusToggle({
                                  fund,
                                  nextStatus: fund.status === 'Active' ? 'Inactive' : 'Active'
                                })}
                                className={`w-8 h-8 flex items-center justify-center bg-white backdrop-blur-md border border-white/80 shadow-xs hover:shadow-md rounded-full transition-all active:scale-95 ${
                                  fund.status === 'Active' 
                                    ? 'text-rose-500 hover:bg-rose-50' 
                                    : 'text-emerald-500 hover:bg-emerald-50'
                                }`}
                                title={fund.status === 'Active' ? 'Deactivate Fund' : 'Activate Fund'}
                              >
                                {fund.status === 'Active' ? <PowerOff size={14} /> : <Power size={14} />}
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                    
                    {currentPage === totalPages && (
                      <tr>
                        <td colSpan={7} className="py-7 text-center text-[#04152d]/40 text-[12px] italic tracking-wide">
                          End of master fund ledger records.
                        </td>
                      </tr>
                    )}
                  </>
                ) : (
                  <tr>
                    <td colSpan={7} className="py-20 text-center">
                      <div className="flex flex-col items-center justify-center space-y-3">
                        <div className="w-16 h-16 bg-white/60 border border-white rounded-full flex items-center justify-center shadow-sm">
                          <SearchX size={28} className="text-[#04152d]/30" />
                        </div>
                        <div>
                          <p className="text-[14px] font-semibold text-[#04152d] tracking-tight">No funds match your filter</p>
                          <p className="text-[12px] font-medium text-[#04152d]/50 mt-0.5">Try adjusting your search criteria or register a new fund.</p>
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
                Showing {((currentPage - 1) * ITEMS_PER_PAGE) + 1} to {Math.min(currentPage * ITEMS_PER_PAGE, filteredFunds.length)} of {filteredFunds.length} entries
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

      {/* Fund Create / Edit Modal (User Story 2 & Duplicate Validation) */}
      <FundActionModal
        isOpen={isActionModalOpen}
        onClose={() => setIsActionModalOpen(false)}
        fund={selectedFundForEdit}
        existingFunds={funds}
        onSuccess={handleModalSuccess}
      />

      {/* Fund Ledger & Breakdown Modal (User Story 3 & 12) */}
      <FundLedgerModal
        isOpen={isLedgerModalOpen}
        onClose={() => setIsLedgerModalOpen(false)}
        fund={selectedFundForLedger}
        transactions={transactions}
        isAuditorView={false}
      />

      {/* User Story 11 Confirmation Dialog: Toggle Fund Status */}
      {pendingStatusToggle && (
        <div className="fixed inset-0 z-[130] flex items-center justify-center p-4 transition-opacity duration-300">
          <div 
            className="absolute inset-0 bg-[#04152d]/50 backdrop-blur-sm"
            onClick={() => setPendingStatusToggle(null)}
          />
          <div className="relative w-full max-w-md bg-white/95 backdrop-blur-2xl border border-white p-6 rounded-[24px] shadow-2xl animate-modal-enter space-y-4">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-2xl flex items-center justify-center border shadow-sm ${
                pendingStatusToggle.nextStatus === 'Inactive' 
                  ? 'bg-rose-50 border-rose-200 text-rose-600' 
                  : 'bg-emerald-50 border-emerald-200 text-emerald-600'
              }`}>
                {pendingStatusToggle.nextStatus === 'Inactive' ? <AlertTriangle size={20} /> : <Power size={20} />}
              </div>
              <div>
                <h4 className="text-[16px] font-bold text-[#04152d]">
                  {pendingStatusToggle.nextStatus === 'Inactive' ? 'Deactivate Fund Record' : 'Activate Fund Record'}
                </h4>
                <p className="text-[11px] text-[#04152d]/60">
                  {pendingStatusToggle.fund.name} ({pendingStatusToggle.fund.code})
                </p>
              </div>
            </div>

            <p className="text-[13px] text-[#04152d]/80 leading-relaxed font-medium">
              {pendingStatusToggle.nextStatus === 'Inactive' ? (
                <>
                  Are you sure you want to mark <span className="font-bold text-[#04152d]">{pendingStatusToggle.fund.name}</span> as <strong>Inactive</strong>? Inactive funds cannot be selected for any new collection receipts or disbursement vouchers until reactivated.
                </>
              ) : (
                <>
                  Are you sure you want to restore <span className="font-bold text-[#04152d]">{pendingStatusToggle.fund.name}</span> to <strong>Active</strong>? It will immediately become selectable for new financial transactions.
                </>
              )}
            </p>

            <div className="flex justify-end gap-2.5 pt-2 border-t border-white/80">
              <button
                type="button"
                onClick={() => setPendingStatusToggle(null)}
                className="px-4 py-2 rounded-full text-[12px] font-semibold text-[#04152d]/70 hover:bg-white"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmToggleStatus}
                className={`px-5 py-2 rounded-full text-[12px] font-bold text-white shadow-md active:scale-95 transition-all ${
                  pendingStatusToggle.nextStatus === 'Inactive'
                    ? 'bg-rose-600 hover:bg-rose-700'
                    : 'bg-emerald-600 hover:bg-emerald-700'
                }`}
              >
                {pendingStatusToggle.nextStatus === 'Inactive' ? 'Confirm Deactivation' : 'Confirm Activation'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {toast && (
        <div className={`fixed bottom-6 right-6 z-[150] animate-slide-up bg-white/90 backdrop-blur-2xl border border-white shadow-[0_8px_30px_rgba(0,0,0,0.12)] p-4 rounded-[16px] flex items-center gap-3 min-w-[320px]`}>
          <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 border ${
            toast.type === 'success' ? 'bg-emerald-100/60 border-emerald-200 text-emerald-600' :
            toast.type === 'error' ? 'bg-rose-100/60 border-rose-200 text-rose-600' :
            'bg-blue-100/60 border-blue-200 text-blue-600'
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