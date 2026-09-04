"use client";

import React, { useState, useMemo, useEffect } from 'react';
import { 
  Search, ChevronDown, ChevronLeft, ChevronRight, Activity, Calendar, AlertCircle, FileText, PieChart, CheckCircle2, Shield, Banknote, PowerOff, SearchX
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as ChartTooltip, ResponsiveContainer, Cell } from 'recharts';
import Header from '@/components/Header';
import FundFinancialSummaryModal from '@/components/funds/FundFinancialSummaryModal';

const ITEMS_PER_PAGE = 10;
const CHART_COLORS = ['#2563eb', '#3b82f6', '#60a5fa', '#93c5fd', '#1d4ed8', '#1e40af'];

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export default function AuditorFundOversightPage() {
  const [funds, setFunds] = useState<any[]>([]);
  const [isFundsLoading, setIsFundsLoading] = useState(true);

  const [transactions, setTransactions] = useState<any[]>([]);
  const [isTransactionsLoading, setIsTransactionsLoading] = useState(false);
  const [totalTransactions, setTotalTransactions] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  const [searchInput, setSearchInput] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [fundFilter, setFundFilter] = useState('All');
  const [typeFilter, setTypeFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedFund, setSelectedFund] = useState<any | null>(null);
  const [isSummaryModalOpen, setIsSummaryModalOpen] = useState(false);

  // Fetch all funds from database backend (same source as Admin)
  const fetchFunds = async () => {
    try {
      setIsFundsLoading(true);
      const res = await fetch(`${API_BASE_URL}/funds`);
      if (res.ok) {
        const data = await res.json();
        if (data && Array.isArray(data.funds)) {
          setFunds(data.funds);
        }
      }
    } catch (err) {
      console.warn('Could not fetch funds from backend.', err);
    } finally {
      setIsFundsLoading(false);
    }
  };

  // Fetch transaction ledger from database backend
  const fetchLedger = async () => {
    try {
      setIsTransactionsLoading(true);
      const params = new URLSearchParams();
      if (fundFilter !== 'All') params.append('fundName', fundFilter);
      if (typeFilter !== 'All') params.append('type', typeFilter);
      if (statusFilter !== 'All') params.append('status', statusFilter);
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);
      if (debouncedSearch) params.append('search', debouncedSearch);
      params.append('page', String(currentPage));
      params.append('limit', String(ITEMS_PER_PAGE));

      const res = await fetch(`${API_BASE_URL}/funds/transactions/ledger?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        if (data && Array.isArray(data.data)) {
          setTransactions(data.data);
          setTotalPages(data.totalPages || 1);
          setTotalTransactions(data.total || 0);
        }
      }
    } catch (err) {
      console.warn('Could not fetch transactions ledger from backend.', err);
    } finally {
      setIsTransactionsLoading(false);
    }
  };

  useEffect(() => {
    fetchFunds();
  }, []);

  useEffect(() => {
    fetchLedger();
  }, [currentPage, debouncedSearch, fundFilter, typeFilter, statusFilter, startDate, endDate]);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchInput), 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearch, fundFilter, typeFilter, statusFilter, startDate, endDate]);

  const totalSystemBalance = useMemo(() => {
    return funds.reduce((sum, f) => sum + Number(f.balance || 0), 0);
  }, [funds]);

  const activeFunds = useMemo(() => {
    return funds.filter(f => f.status === 'Active');
  }, [funds]);

  const activeFundsCount = activeFunds.length;
  const inactiveFundsCount = funds.filter(f => f.status === 'Inactive').length;
  
  const chartData = useMemo(() => {
    return activeFunds.map(f => ({
      name: f.code,
      fullName: f.name,
      balance: Number(f.balance || 0)
    }));
  }, [activeFunds]);

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

  const ultraGlassCard = "bg-white/50 backdrop-blur-[40px] backdrop-saturate-[200%] border border-white/80 shadow-[0_8px_30px_rgba(4,21,45,0.06),inset_0_2px_3px_rgba(255,255,255,0.9)] rounded-[24px] p-6 relative overflow-hidden";
  const glassInput = "pl-11 pr-4 py-2.5 bg-white/60 hover:bg-white/80 focus:bg-white/90 backdrop-blur-xl border border-white/90 shadow-[inset_0_2px_4px_rgba(4,21,45,0.03)] rounded-[12px] text-[13px] font-semibold text-[#04152d] outline-none transition-all duration-300 placeholder:text-[#04152d]/40 focus:shadow-[0_4px_16px_rgba(4,21,45,0.08),inset_0_1px_2px_rgba(255,255,255,1)]";
  const pageBtn = "w-8 h-8 flex items-center justify-center rounded-full text-[12px] font-medium transition-all duration-300";

  return (
    <div className="relative flex flex-col min-h-screen bg-[#f4f5f7]">
      <style jsx global>{`
        @keyframes modal-fade-in { from { opacity: 0; transform: scale(0.95) translateY(10px); } to { opacity: 1; transform: scale(1) translateY(0); } }
        .animate-modal-enter { animation: modal-fade-in 0.3s cubic-bezier(0.25, 1, 0.5, 1) forwards; }
        .animate-fade-in { animation: modal-fade-in 0.4s ease-out forwards; }
        .hide-scrollbar::-webkit-scrollbar { display: none; }
      `}</style>

      <div className="sticky top-0 z-40 w-full backdrop-blur-2xl bg-white/30 border-b border-white/50 shadow-[0_4px_30px_rgba(0,0,0,0.03)]">
        <Header />
      </div>

      <div className="p-4 md:p-6 max-w-[1400px] w-full mx-auto animate-fade-in flex-1 relative z-10 space-y-6 mt-2">
        
        <div className="flex flex-col xl:flex-row items-stretch gap-6">
          <div className="flex flex-col gap-4 w-full xl:w-1/3">
            <div className={`flex-1 flex items-center gap-4 ${ultraGlassCard} !p-5`}>
              <div className="w-12 h-12 bg-white/90 border border-white rounded-[16px] shadow-sm flex items-center justify-center shrink-0">
                <Banknote size={24} className="text-blue-600" />
              </div>
              <div>
                <span className="block text-[11px] font-semibold text-[#04152d]/50 uppercase tracking-widest">Total Master Ledger Balance</span>
                <span className="block text-[24px] font-semibold text-[#04152d] tracking-tighter mt-0.5">{formatCurrency(totalSystemBalance)}</span>
              </div>
            </div>
            
            <div className="flex-1 grid grid-cols-2 gap-4">
              <div className={`h-full flex flex-col justify-center ${ultraGlassCard} !p-5`}>
                <span className="block text-[10px] font-semibold text-[#04152d]/50 uppercase tracking-widest mb-1 flex items-center gap-1.5"><Activity size={12}/> Active Funds</span>
                <span className="block text-[28px] font-semibold text-emerald-600 tracking-tighter leading-none">{activeFundsCount}</span>
              </div>
              <div className={`h-full flex flex-col justify-center ${ultraGlassCard} !p-5`}>
                <span className="block text-[10px] font-semibold text-[#04152d]/50 uppercase tracking-widest mb-1 flex items-center gap-1.5"><PowerOff size={12}/> Inactive</span>
                <span className="block text-[28px] font-semibold text-gray-500 tracking-tighter leading-none">{inactiveFundsCount}</span>
              </div>
            </div>
          </div>

          <div className={`flex-1 ${ultraGlassCard} !p-5 flex flex-col`}>
            <h3 className="text-[13px] font-semibold text-[#04152d] uppercase tracking-widest border-b border-white/60 pb-2 mb-4 shrink-0 flex items-center gap-2">
              <Activity size={16} className="text-blue-500"/> Active Fund Distribution
            </h3>
            <div className="flex-1 w-full min-h-[160px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(4,21,45,0.06)" />
                  <XAxis dataKey="name" stroke="#04152d" opacity={0.5} fontSize={11} tickLine={false} fontWeight="bold" />
                  <YAxis stroke="#04152d" opacity={0.5} fontSize={11} tickLine={false} fontWeight="bold" tickFormatter={(v) => `₱${(v/1000).toFixed(0)}k`} />
                  <ChartTooltip 
                    cursor={{ fill: 'rgba(37,99,235,0.05)' }}
                    formatter={(value: any, name: any) => [`₱${Number(value).toLocaleString('en-US', { minimumFractionDigits: 2 })}`, 'Current Balance']}
                    labelFormatter={(label, payload) => payload[0]?.payload.fullName || label}
                    contentStyle={{ backgroundColor: 'rgba(255,255,255,0.9)', backdropFilter: 'blur(10px)', borderRadius: '12px', border: '1px solid rgba(255,255,255,1)', boxShadow: '0 8px 30px rgba(4,21,45,0.08)', fontSize: '12px', fontWeight: 'bold' }}
                  />
                  <Bar dataKey="balance" radius={[6, 6, 0, 0]} maxBarSize={60}>
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {activeFunds.map((fund) => {
            const isInsufficient = Number(fund.pendingDisbursements || 0) > Number(fund.balance || 0);
            const util = Number(fund.currentUtilization || 0);
            const utilColor = util > 85 ? 'bg-red-500' : util > 60 ? 'bg-yellow-500' : 'bg-emerald-500';

            return (
              <div key={fund.id} className={`${ultraGlassCard} flex flex-col group hover:-translate-y-1 transition-transform duration-300`}>
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-[16px] font-semibold text-[#04152d] tracking-tight">{fund.name}</h3>
                    <span className="text-[10px] font-semibold text-[#04152d]/50 uppercase tracking-widest border border-[#04152d]/10 px-2 py-0.5 rounded bg-white/50">{fund.code}</span>
                  </div>
                  <button 
                    onClick={() => { setSelectedFund(fund); setIsSummaryModalOpen(true); }}
                    className="p-2 bg-white/60 hover:bg-white border border-white shadow-sm rounded-full text-blue-600 transition-colors"
                    title="View Financial Summary"
                  >
                    <PieChart size={16} />
                  </button>
                </div>

                <div className="mb-5">
                  <span className="block text-[11px] font-semibold text-[#04152d]/60 uppercase tracking-widest mb-1">Current Balance</span>
                  <span className="block text-[28px] font-semibold text-[#04152d] tracking-tighter leading-none">
                    {formatCurrency(Number(fund.balance || 0))}
                  </span>
                </div>

                <div className="space-y-1.5 mb-4">
                  <div className="flex justify-between text-[11px] font-medium text-[#04152d]/70">
                    <span>Utilization</span>
                    <span className="font-semibold">{util}%</span>
                  </div>
                  <div className="h-1.5 w-full bg-white/80 rounded-full overflow-hidden border border-[#04152d]/5">
                    <div className={`h-full rounded-full ${utilColor}`} style={{ width: `${Math.min(100, Math.max(0, util))}%` }} />
                  </div>
                </div>

                <div className="mt-auto pt-4 border-t border-[#04152d]/10">
                  {isInsufficient ? (
                    <div className="flex items-start gap-2 bg-red-50 p-2.5 rounded-[12px] border border-red-100 text-red-700">
                      <AlertCircle size={14} className="shrink-0 mt-0.5" />
                      <div>
                        <span className="block text-[11px] font-semibold uppercase tracking-widest">Insufficient Funds</span>
                        <span className="block text-[11px] font-medium mt-0.5 leading-tight">Pending outflows ({formatCurrency(Number(fund.pendingDisbursements || 0))}) exceed available balance.</span>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-[11px] font-medium text-[#04152d]/60">
                      <CheckCircle2 size={14} className="text-emerald-500" /> Sufficient liquidity for pending operations.
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <div className={`${ultraGlassCard} !p-0 mt-8`}>
          <div className="p-5 border-b border-white/60 bg-white/40 flex flex-col gap-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <h3 className="text-[14px] font-semibold text-[#04152d] uppercase tracking-widest flex items-center gap-2 shrink-0">
                  <FileText size={16} className="text-blue-600" /> Transaction Ledger
                </h3>
              </div>
            </div>
            
            <div className="flex flex-col xl:flex-row gap-3 items-center justify-between w-full">
              <div className="relative w-full xl:w-72 shrink-0">
                <Search size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#04152d]/50" />
                <input type="text" placeholder="Search Ref ID..." value={searchInput} onChange={(e) => setSearchInput(e.target.value)} className={`${glassInput} w-full`} />
              </div>

              <div className="flex flex-col sm:flex-row gap-3 w-full xl:w-auto flex-wrap xl:flex-nowrap justify-end">
                <div className="relative w-full sm:w-auto">
                  <select value={fundFilter} onChange={(e) => setFundFilter(e.target.value)} className={`${glassInput} !pl-4 appearance-none pr-8 cursor-pointer w-full`}>
                    <option value="All">All Funds</option>
                    {funds.map(f => <option key={f.id} value={f.name}>{f.name}</option>)}
                  </select>
                  <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#04152d]/50 pointer-events-none" />
                </div>

                <div className="relative w-full sm:w-auto">
                  <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className={`${glassInput} !pl-4 appearance-none pr-8 cursor-pointer w-full`}>
                    <option value="All">All Types</option>
                    <option value="Inflow (Collection)">Inflows</option>
                    <option value="Outflow (Disbursement)">Outflows</option>
                    <option value="Opening Balance">Opening Balance</option>
                    <option value="Transfer In">Transfers In</option>
                    <option value="Transfer Out">Transfers Out</option>
                  </select>
                  <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#04152d]/50 pointer-events-none" />
                </div>

                <div className="relative w-full sm:w-auto">
                  <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className={`${glassInput} !pl-4 appearance-none pr-8 cursor-pointer w-full`}>
                    <option value="All">All Statuses</option>
                    <option value="Posted">Posted</option>
                    <option value="Pending">Pending</option>
                  </select>
                  <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#04152d]/50 pointer-events-none" />
                </div>

                <div className="flex items-center justify-between gap-2 w-full sm:w-auto bg-white/60 hover:bg-white/80 transition-colors border border-white/90 rounded-[12px] px-3 shadow-[inset_0_2px_4px_rgba(4,21,45,0.03)] h-[38px] xl:h-auto">
                  <Calendar size={14} className="text-[#04152d]/50 shrink-0" />
                  <input 
                    type="date" 
                    value={startDate} 
                    max={endDate || undefined}
                    onChange={(e) => setStartDate(e.target.value)} 
                    className="bg-transparent text-[12px] font-semibold text-[#04152d] outline-none w-28 [&::-webkit-calendar-picker-indicator]:opacity-50 cursor-pointer" 
                  />
                  <span className="text-[#04152d]/30">-</span>
                  <input 
                    type="date" 
                    value={endDate} 
                    min={startDate || undefined}
                    onChange={(e) => setEndDate(e.target.value)} 
                    className="bg-transparent text-[12px] font-semibold text-[#04152d] outline-none w-28 [&::-webkit-calendar-picker-indicator]:opacity-50 cursor-pointer" 
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto w-full">
            <table className="w-full text-left whitespace-nowrap border-collapse min-w-[900px]">
              <thead className="bg-white/60 backdrop-blur-md shadow-[0_1px_0_rgba(255,255,255,1)] text-[10px] font-semibold text-[#04152d]/50 uppercase tracking-[0.2em]">
                <tr>
                  <th className="py-4 px-6 border-b border-white/50">Txn Ref</th>
                  <th className="py-4 px-6 border-b border-white/50">Fund Name</th>
                  <th className="py-4 px-6 border-b border-white/50">Transaction Type</th>
                  <th className="py-4 px-6 border-b border-white/50">Date</th>
                  <th className="py-4 px-6 border-b border-white/50 text-right">Amount</th>
                  <th className="py-4 px-6 border-b border-white/50 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/60 text-[13px] text-[#04152d] bg-white/30">
                {transactions.length > 0 ? (
                  <>
                    {transactions.map((tx) => {
                      const typeStr = tx.type || '';
                      const isPositive = typeStr.includes('Inflow') || typeStr.includes('Opening') || typeStr.includes('Transfer In');
                      const badgeColor = isPositive 
                        ? 'bg-blue-50 text-blue-700 border-blue-200' 
                        : 'bg-yellow-50 text-yellow-700 border-yellow-200';

                      return (
                        <tr key={tx.id} className="hover:bg-white/70 transition-colors">
                          <td className="py-4 px-6 font-mono text-[12px] font-semibold text-blue-600">{tx.id}</td>
                          <td className="py-4 px-6 font-semibold text-[#04152d]">{tx.fundName}</td>
                          <td className="py-4 px-6">
                            <span className={`px-2 py-0.5 rounded text-[11px] font-medium border ${badgeColor}`}>
                              {tx.type}
                            </span>
                          </td>
                          <td className="py-4 px-6 text-[#04152d]/70 font-medium">{tx.date}</td>
                          <td className="py-4 px-6 text-right font-semibold text-[14px] tracking-tight">{formatCurrency(tx.amount)}</td>
                          <td className="py-4 px-6 text-center">
                            {tx.status === 'Posted' ? (
                              <span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-md text-[10px] font-semibold uppercase tracking-widest shadow-sm">Posted</span>
                            ) : (
                              <span className="px-2.5 py-1 bg-gray-100 text-gray-600 border border-gray-200 rounded-md text-[10px] font-semibold uppercase tracking-widest shadow-sm">{tx.status || 'Pending'}</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                    
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
                    <td colSpan={6} className="py-20 text-center">
                      <div className="flex flex-col items-center justify-center space-y-3">
                        <div className="w-16 h-16 bg-white/60 border border-white rounded-full flex items-center justify-center shadow-sm">
                          <SearchX size={28} className="text-[#04152d]/30" />
                        </div>
                        <div>
                          <p className="text-[14px] font-semibold text-[#04152d] tracking-tight">No transactions found</p>
                          <p className="text-[12px] font-medium text-[#04152d]/50 mt-0.5">Try adjusting your filters or search terms.</p>
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="p-4 border-t border-white/60 bg-white/40 flex items-center justify-between">
              <p className="text-[12px] text-[#04152d]/60 font-medium hidden sm:block">
                Showing {((currentPage - 1) * ITEMS_PER_PAGE) + 1} to {Math.min(currentPage * ITEMS_PER_PAGE, totalTransactions)} of {totalTransactions} entries
              </p>
              
              <div className="flex items-center gap-1 mx-auto sm:mx-0">
                <button onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))} disabled={currentPage === 1} className={`${pageBtn} bg-white/60 border border-white hover:bg-white shadow-sm disabled:opacity-50`}><ChevronLeft size={16} /></button>
                {getPageNumbers().map((pageNum, idx) => (
                  <button key={idx} onClick={() => typeof pageNum === 'number' ? setCurrentPage(pageNum) : null} disabled={pageNum === '...'} className={`${pageBtn} ${pageNum === currentPage ? 'bg-[#04152d] text-white shadow-md' : 'bg-transparent text-[#04152d]/70 hover:bg-white/60'}`}>
                    {pageNum}
                  </button>
                ))}
                <button onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))} disabled={currentPage === totalPages} className={`${pageBtn} bg-white/60 border border-white hover:bg-white shadow-sm disabled:opacity-50`}><ChevronRight size={16} /></button>
              </div>
            </div>
          )}
        </div>

      </div>

      <FundFinancialSummaryModal 
        isOpen={isSummaryModalOpen}
        onClose={() => setIsSummaryModalOpen(false)}
        fund={selectedFund}
      />
    </div>
  );
}