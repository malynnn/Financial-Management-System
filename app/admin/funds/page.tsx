"use client";

import React, { useState, useMemo, useEffect } from 'react';
import { 
  Search, ChevronDown, ChevronLeft, ChevronRight, Plus, 
  CheckCircle2, AlertCircle, Info, Edit, Power, PowerOff,
  Briefcase, Activity, Banknote, SearchX
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as ChartTooltip, ResponsiveContainer, Cell } from 'recharts';
import Header from '@/components/Header';
import FundActionModal from '@/components/funds/FundActionModal';

const MOCK_FUNDS = [
  { id: 'FND-001', name: 'Union Fund', code: 'UNF', description: 'Core operational fund for union activities.', balance: 500000, targetUtilization: 80, status: 'Active' },
  { id: 'FND-002', name: 'General Fund', code: 'GEN', description: 'Unrestricted assets for general management.', balance: 250000, targetUtilization: 75, status: 'Active' },
  { id: 'FND-003', name: 'Death Assistance Fund', code: 'DAF', description: 'Restricted fund for member bereavement support.', balance: 150000, targetUtilization: 50, status: 'Active' },
  { id: 'FND-005', name: 'Loan Fund', code: 'LNF', description: 'Revolving fund for member credit facilities.', balance: 850000, targetUtilization: 90, status: 'Active' },
  { id: 'FND-006', name: 'Calamity Fund', code: 'CAL', description: 'Emergency reserves for natural disasters.', balance: 300000, targetUtilization: 60, status: 'Active' },
  { id: 'FND-008', name: 'Legal Defense Fund', code: 'LDF', description: 'Retainer for union legal counsel.', balance: 95000, targetUtilization: 30, status: 'Inactive' },
];

const ITEMS_PER_PAGE = 10;
const CHART_COLORS = ['#2563eb', '#3b82f6', '#60a5fa', '#93c5fd', '#1d4ed8', '#1e40af'];

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export default function AdminFundMasterPage() {
  const [funds, setFunds] = useState<any[]>(MOCK_FUNDS);
  const [isLoading, setIsLoading] = useState(false);
  
  const [searchInput, setSearchInput] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  
  const [currentPage, setCurrentPage] = useState(1);

  const [selectedFund, setSelectedFund] = useState<any | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [toast, setToast] = useState<{ message: string, type: 'success' | 'info' | 'error' } | null>(null);

  const fetchFunds = async () => {
    try {
      setIsLoading(true);
      const res = await fetch(`${API_BASE_URL}/funds?search=${encodeURIComponent(debouncedSearch)}&status=${encodeURIComponent(statusFilter)}`);
      if (res.ok) {
        const data = await res.json();
        if (data && Array.isArray(data.funds)) {
          setFunds(data.funds);
        }
      }
    } catch (err) {
      console.warn('Backend funds API not reachable, using local state.', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchFunds();
  }, [debouncedSearch, statusFilter]);

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

  const filteredFunds = useMemo(() => {
    return funds.filter(f => {
      const matchesSearch = f.name.toLowerCase().includes(debouncedSearch.toLowerCase()) || 
                            f.code.toLowerCase().includes(debouncedSearch.toLowerCase());
      const matchesStatus = statusFilter === 'All' || f.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [funds, debouncedSearch, statusFilter]);

  const totalPages = Math.ceil(filteredFunds.length / ITEMS_PER_PAGE) || 1;
  const paginatedFunds = filteredFunds.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const totalSystemBalance = funds.reduce((sum, f) => sum + Number(f.balance || 0), 0);
  const activeFundsCount = funds.filter(f => f.status === 'Active').length;
  
  const chartData = useMemo(() => {
    return funds.filter(f => f.status === 'Active').map(f => ({
      name: f.code,
      fullName: f.name,
      balance: Number(f.balance || 0)
    }));
  }, [funds]);

  const handleModalSuccess = (fundData: any) => {
    fetchFunds();
    if (selectedFund) {
      setFunds(prev => prev.map(f => f.id === fundData.id ? { ...f, ...fundData } : f));
      showToast(`${fundData.name} configuration updated successfully.`, 'success');
    } else {
      setFunds(prev => [fundData, ...prev]);
      showToast(`${fundData.name} registered successfully.`, 'success');
    }
  };

  const toggleFundStatus = async (fundId: string, currentStatus: string, fundName: string) => {
    const newStatus = currentStatus === 'Active' ? 'Inactive' : 'Active';
    try {
      const res = await fetch(`${API_BASE_URL}/funds/${fundId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        fetchFunds();
      }
    } catch (err) {
      console.warn('Could not reach backend to toggle fund status.', err);
    }
    setFunds(prev => prev.map(f => f.id === fundId ? { ...f, status: newStatus } : f));
    showToast(`${fundName} has been ${newStatus === 'Active' ? 'activated' : 'deactivated'}.`, newStatus === 'Active' ? 'success' : 'info');
  };

  const formatCurrency = (val: number) => `₱${val.toLocaleString('en-US', { minimumFractionDigits: 2 })}`;

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
        
        <div className="flex flex-col xl:flex-row items-stretch gap-6 mb-6">
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
                <span className="block text-[28px] font-semibold text-gray-500 tracking-tighter leading-none">{funds.length - activeFundsCount}</span>
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

        <div className={`${ultraGlassCard} !p-4 flex flex-col lg:flex-row gap-4 items-center justify-between`}>
          <div className="relative w-full lg:w-1/3">
            <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#04152d]/50" />
            <input 
              type="text" 
              placeholder="Search Fund Name or Code..." 
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className={`${glassInput} w-full`} 
            />
          </div>
          
          <div className="flex w-full lg:w-auto gap-3 items-center">
            <div className="relative w-full sm:w-auto">
              <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className={`${glassInput} !pl-4 appearance-none pr-10 w-full cursor-pointer`}>
                <option value="All">All Statuses</option>
                <option value="Active">Active Funds</option>
                <option value="Inactive">Inactive Funds</option>
              </select>
              <ChevronDown size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-[#04152d]/50 pointer-events-none" />
            </div>
            <button 
              onClick={() => { setSelectedFund(null); setIsModalOpen(true); }}
              className="relative overflow-hidden px-5 py-2.5 bg-gradient-to-b from-[#0a1e3f] to-[#04152d] text-white border border-[#04152d] shadow-[0_6px_20px_rgba(4,21,45,0.3),inset_0_1px_1px_rgba(255,255,255,0.15)] hover:shadow-[0_8px_25px_rgba(4,21,45,0.4),inset_0_1px_1px_rgba(255,255,255,0.25)] hover:from-[#0f2850] hover:to-[#061a38] rounded-full text-[13px] font-semibold transition-all duration-300 flex items-center gap-2 active:scale-95 whitespace-nowrap"
            >
              <Plus size={16} /> Register Fund
            </button>
          </div>
        </div>

        <div className={`${ultraGlassCard} !p-0`}>
          <div className="overflow-x-auto w-full">
            <table className="w-full text-left whitespace-nowrap border-collapse min-w-[900px]">
              <thead className="bg-white/60 backdrop-blur-md shadow-[0_1px_0_rgba(255,255,255,1)] text-[10px] font-semibold text-[#04152d]/50 uppercase tracking-[0.2em]">
                <tr>
                  <th className="py-4 px-6 border-b border-white/50">Fund Details</th>
                  <th className="py-4 px-6 border-b border-white/50 text-right">Current Ledger Balance</th>
                  <th className="py-4 px-6 border-b border-white/50 text-center">Utilization Target</th>
                  <th className="py-4 px-6 border-b border-white/50 text-center">Status</th>
                  <th className="py-4 px-6 border-b border-white/50 text-right">Admin Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/60 text-[13px] text-[#04152d] bg-white/30">
                {paginatedFunds.length > 0 ? (
                  <>
                    {paginatedFunds.map((fund) => (
                      <tr key={fund.id} className={`hover:bg-white/70 transition-all duration-300 ${fund.status === 'Inactive' ? 'opacity-70' : ''}`}>
                        <td className="py-4 px-6">
                          <div className="flex items-center gap-3">
                            <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 border ${fund.status === 'Active' ? 'bg-blue-50 border-blue-200 text-blue-600' : 'bg-gray-100 border-gray-200 text-gray-500'}`}>
                              <span className="font-bold text-[10px] truncate max-w-[28px]">{fund.code}</span>
                            </div>
                            <div>
                              <p className="font-semibold text-[#04152d] tracking-tight">{fund.name}</p>
                              <p className="text-[11px] text-[#04152d]/50 truncate max-w-[250px]">{fund.description}</p>
                            </div>
                          </div>
                        </td>
                        <td className="py-4 px-6 text-right font-semibold text-[14px]">{formatCurrency(fund.balance)}</td>
                        <td className="py-4 px-6 text-center">
                          <span className="text-[12px] font-semibold bg-white/50 border border-white px-2 py-0.5 rounded">{fund.targetUtilization}%</span>
                        </td>
                        <td className="py-4 px-6 text-center">
                          {fund.status === 'Active' ? (
                            <span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-md text-[10px] font-semibold uppercase tracking-widest shadow-sm">Active</span>
                          ) : (
                            <span className="px-2.5 py-1 bg-gray-100 text-gray-600 border border-gray-200 rounded-md text-[10px] font-semibold uppercase tracking-widest shadow-sm">Inactive</span>
                          )}
                        </td>
                        <td className="py-4 px-6 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button 
                              onClick={() => { setSelectedFund(fund); setIsModalOpen(true); }}
                              className="w-8 h-8 flex items-center justify-center bg-white backdrop-blur-md border border-white/80 shadow-[0_2px_8px_rgba(4,21,45,0.05)] hover:shadow-md rounded-full text-[#04152d]/60 hover:text-blue-600 transition-all active:scale-95"
                              title="Edit Fund"
                            >
                              <Edit size={14} />
                            </button>
                            <button 
                              onClick={() => toggleFundStatus(fund.id, fund.status, fund.name)}
                              className={`w-8 h-8 flex items-center justify-center bg-white backdrop-blur-md border border-white/80 shadow-[0_2px_8px_rgba(4,21,45,0.05)] hover:shadow-md rounded-full transition-all active:scale-95 ${fund.status === 'Active' ? 'text-red-500 hover:bg-red-50' : 'text-emerald-500 hover:bg-emerald-50'}`}
                              title={fund.status === 'Active' ? 'Deactivate Fund' : 'Activate Fund'}
                            >
                              {fund.status === 'Active' ? <PowerOff size={14} /> : <Power size={14} />}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    
                    {currentPage === totalPages && (
                      <tr>
                        <td colSpan={5} className="py-8 text-center text-[#04152d]/40 text-[12px] italic tracking-wide">
                          Nothing else follows.
                        </td>
                      </tr>
                    )}
                  </>
                ) : (
                  // Premium Empty State
                  <tr>
                    <td colSpan={5} className="py-20 text-center">
                      <div className="flex flex-col items-center justify-center space-y-3">
                        <div className="w-16 h-16 bg-white/60 border border-white rounded-full flex items-center justify-center shadow-sm">
                          <SearchX size={28} className="text-[#04152d]/30" />
                        </div>
                        <div>
                          <p className="text-[14px] font-semibold text-[#04152d] tracking-tight">No funds found</p>
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

      <FundActionModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        fund={selectedFund}
        existingFunds={funds}
        onSuccess={handleModalSuccess}
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