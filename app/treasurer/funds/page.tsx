"use client";

import React, { useState, useMemo, useEffect } from 'react';
import { 
  Search, ChevronDown, ChevronLeft, ChevronRight, Activity, Calendar, AlertCircle, FileText, PieChart, CheckCircle2, SearchX, BrainCircuit
} from 'lucide-react';
import Header from '@/components/Header';
import FundFinancialSummaryModal from '@/components/funds/FundFinancialSummaryModal';

const MOCK_ACTIVE_FUNDS = [
  { id: 'FND-001', name: 'Union Fund', code: 'UNF', balance: 500000, pendingDisbursements: 25000, currentUtilization: 45, isForecastingReady: true },
  { id: 'FND-002', name: 'General Fund', code: 'GEN', balance: 250000, pendingDisbursements: 12000, currentUtilization: 65, isForecastingReady: true },
  { id: 'FND-003', name: 'Death Assistance Fund', code: 'DAF', balance: 15000, pendingDisbursements: 20000, currentUtilization: 95, isForecastingReady: false },
  { id: 'FND-005', name: 'Loan Fund', code: 'LNF', balance: 850000, pendingDisbursements: 150000, currentUtilization: 80, isForecastingReady: true },
  { id: 'FND-006', name: 'Calamity Fund', code: 'CAL', balance: 300000, pendingDisbursements: 0, currentUtilization: 10, isForecastingReady: false },
];

const MOCK_TRANSACTIONS = Array.from({ length: 45 }).map((_, i) => {
  const types = ['Inflow (Collection)', 'Outflow (Disbursement)'];
  const type = types[i % 2];
  const funds = MOCK_ACTIVE_FUNDS.map(f => f.name);
  
  return {
    id: `TXN-${5000 + i}`,
    fundName: funds[i % funds.length],
    amount: (i * 1250) + 500,
    type: type,
    date: new Date(Date.now() - (i * 86400000)).toISOString().split('T')[0],
    status: i % 7 === 0 ? 'Pending' : 'Posted'
  };
});

const ITEMS_PER_PAGE = 10;

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export default function TreasurerFundMonitoringPage() {
  const [funds, setFunds] = useState<any[]>(MOCK_ACTIVE_FUNDS);
  const [transactions, setTransactions] = useState<any[]>(MOCK_TRANSACTIONS);
  const [isLoading, setIsLoading] = useState(false);

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

  // Fetch active funds from backend
  const fetchFunds = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/funds?status=Active`);
      if (res.ok) {
        const data = await res.json();
        if (data && Array.isArray(data.funds)) {
          setFunds(data.funds);
        }
      }
    } catch (err) {
      console.warn('Could not fetch active funds from backend, using defaults.', err);
    }
  };

  // Fetch transactions ledger from backend
  const fetchLedger = async () => {
    try {
      setIsLoading(true);
      const params = new URLSearchParams();
      if (fundFilter !== 'All') params.append('fundName', fundFilter);
      if (typeFilter !== 'All') params.append('type', typeFilter);
      if (statusFilter !== 'All') params.append('status', statusFilter);
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);
      if (debouncedSearch) params.append('search', debouncedSearch);
      params.append('limit', '100');

      const res = await fetch(`${API_BASE_URL}/funds/transactions/ledger?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        if (data && Array.isArray(data.data) && data.data.length > 0) {
          setTransactions(data.data);
        }
      }
    } catch (err) {
      console.warn('Could not fetch ledger from backend, using default mock data.', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchFunds();
  }, []);

  useEffect(() => {
    fetchLedger();
  }, [fundFilter, typeFilter, statusFilter, startDate, endDate, debouncedSearch]);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchInput), 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearch, fundFilter, typeFilter, statusFilter, startDate, endDate]);

  const filteredTransactions = useMemo(() => {
    return transactions.filter(t => {
      const matchesSearch = t.id.toLowerCase().includes(debouncedSearch.toLowerCase());
      const matchesFund = fundFilter === 'All' || t.fundName === fundFilter;
      const matchesType = typeFilter === 'All' || t.type === typeFilter;
      const matchesStatus = statusFilter === 'All' || t.status === statusFilter;
      
      const txDate = new Date(t.date);
      const matchesStart = startDate ? txDate >= new Date(startDate) : true;
      const matchesEnd = endDate ? txDate <= new Date(endDate) : true;

      return matchesSearch && matchesFund && matchesType && matchesStatus && matchesStart && matchesEnd;
    });
  }, [transactions, debouncedSearch, fundFilter, typeFilter, statusFilter, startDate, endDate]);

  const totalPages = Math.ceil(filteredTransactions.length / ITEMS_PER_PAGE) || 1;
  const paginatedTransactions = filteredTransactions.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const formatCurrency = (val: number) => `₱${val.toLocaleString('en-US', { minimumFractionDigits: 2 })}`;

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
        
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {funds.map((fund) => {
            const isInsufficient = Number(fund.pendingDisbursements || 0) > Number(fund.balance || 0);
            const utilColor = (fund.currentUtilization || 0) > 85 ? 'bg-red-500' : (fund.currentUtilization || 0) > 60 ? 'bg-yellow-500' : 'bg-emerald-500';

            return (
              <div key={fund.id} className={`${ultraGlassCard} flex flex-col group hover:-translate-y-1 transition-transform duration-300`}>
                
                {/* UPGRADED HEADER WITH AI FORECAST READY BADGE */}
                <div className="flex justify-between items-start mb-4">
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2">
                      <h3 className="text-[16px] font-semibold text-[#04152d] tracking-tight">{fund.name}</h3>
                      {fund.isForecastingReady ? (
                        <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 text-[9px] font-bold uppercase tracking-widest shadow-sm" title="Validated historical data available for AI Forecasting">
                          <BrainCircuit size={10} /> Forecast Ready
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-gray-50 text-gray-500 border border-gray-200 text-[9px] font-bold uppercase tracking-widest shadow-sm" title="Insufficient validated data for AI Forecasting">
                          Needs Data
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] font-semibold text-[#04152d]/50 uppercase tracking-widest border border-[#04152d]/10 px-2 py-0.5 rounded bg-white/50 inline-block">
                      {fund.code}
                    </span>
                  </div>
                  <button 
                    onClick={() => { setSelectedFund(fund); setIsSummaryModalOpen(true); }}
                    className="p-2 bg-white/60 hover:bg-white border border-white shadow-sm rounded-full text-blue-600 transition-colors shrink-0"
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
                    <span className="font-semibold">{fund.currentUtilization || 0}%</span>
                  </div>
                  <div className="h-1.5 w-full bg-white/80 rounded-full overflow-hidden border border-[#04152d]/5">
                    <div className={`h-full rounded-full ${utilColor}`} style={{ width: `${fund.currentUtilization || 0}%` }} />
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
                {paginatedTransactions.length > 0 ? (
                  <>
                    {paginatedTransactions.map((tx) => (
                      <tr key={tx.id} className="hover:bg-white/70 transition-colors">
                        <td className="py-4 px-6 font-mono text-[12px] font-semibold text-blue-600">{tx.id}</td>
                        <td className="py-4 px-6 font-semibold text-[#04152d]">{tx.fundName}</td>
                        <td className="py-4 px-6">
                          <span className={`px-2 py-0.5 rounded text-[11px] font-medium border ${tx.type.includes('Inflow') ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-yellow-50 text-yellow-700 border-yellow-200'}`}>
                            {tx.type}
                          </span>
                        </td>
                        <td className="py-4 px-6 text-[#04152d]/70 font-medium">{tx.date}</td>
                        <td className="py-4 px-6 text-right font-semibold text-[14px] tracking-tight">{formatCurrency(tx.amount)}</td>
                        <td className="py-4 px-6 text-center">
                          {tx.status === 'Posted' ? (
                            <span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-md text-[10px] font-semibold uppercase tracking-widest shadow-sm">Posted</span>
                          ) : (
                            <span className="px-2.5 py-1 bg-gray-100 text-gray-600 border border-gray-200 rounded-md text-[10px] font-semibold uppercase tracking-widest shadow-sm">Pending</span>
                          )}
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
                  // Premium Empty State
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
                Showing {((currentPage - 1) * ITEMS_PER_PAGE) + 1} to {Math.min(currentPage * ITEMS_PER_PAGE, filteredTransactions.length)} of {filteredTransactions.length} entries
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