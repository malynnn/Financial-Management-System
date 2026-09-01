"use client";

export const dynamic = 'force-dynamic';

import { useState, useMemo, useEffect } from 'react';
import { Search, ArrowRightLeft, TrendingUp, TrendingDown, Wallet, Calendar, X, Layers, Loader2 } from 'lucide-react';
import { PieChart, Pie, Tooltip, ResponsiveContainer, Cell, Legend } from 'recharts';
import Header from '@/components/Header'; 
import ActionModal from '@/components/ActionModal';
import FundTransferModal from '@/components/FundTransferModal';

// Strictly BDOEA Palette
const CHART_COLORS = ['#04152d', '#2563eb', '#eab308', '#60a5fa', '#fef08a'];

export default function FundPage() {
  const [funds, setFunds] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [searchTerm, setSearchTerm] = useState('');
  const [filterMonth, setFilterMonth] = useState('');

  // --- LIVE BACKEND FETCH WITH TIMEFRAME FILTER ---
  const fetchRealFundsData = async (month?: string) => {
    try {
      setIsLoading(true);
      const gatewayUrl = process.env.NEXT_PUBLIC_GATEWAY_URL || 'http://localhost:3001';
      
      const url = month ? `${gatewayUrl}/api/finance/funds?month=${month}` : `${gatewayUrl}/api/finance/funds`;
      
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        const mappedData = data.map((f: any) => ({
          id: f.code || f.id,
          name: f.name,
          status: 'Active',
          totalIn: Number(f.totalIn ?? 0),
          totalOut: Number(f.totalOut ?? 0),
          balance: Number(f.currentBalance ?? f.balance ?? 0)
        }));
        setFunds(mappedData);
      }
    } catch(err) {
      console.error("Network error fetching funds:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRealFundsData(filterMonth);
  }, [filterMonth]);

  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [actionModal, setActionModal] = useState<{
    isOpen: boolean; title: string; message: string; status: 'idle' | 'loading' | 'success' | 'error'; resultMsg?: string;
  }>({ isOpen: false, title: '', message: '', status: 'idle' });

  const filteredFunds = useMemo(() => {
    return funds.filter(f => {
      const matchSearch = f.name.toLowerCase().includes(searchTerm.toLowerCase());
      return matchSearch && f.status === 'Active';
    });
  }, [funds, searchTerm]);
  
  // --- MATH ---
  const totalAssets = funds.filter(f => f.status === 'Active').reduce((sum, f) => sum + f.balance, 0);
  const totalCashIn = funds.filter(f => f.status === 'Active').reduce((sum, f) => sum + f.totalIn, 0);
  const totalCashOut = funds.filter(f => f.status === 'Active').reduce((sum, f) => sum + f.totalOut, 0);

  const chartData = useMemo(() => {
    return funds
      .filter(f => f.status === 'Active' && f.balance > 0)
      .map((f, index) => ({ name: f.name, value: f.balance, fill: CHART_COLORS[index % CHART_COLORS.length] }));
  }, [funds]);

  const handleExecuteTransfer = async (data: { sourceId: string; destId: string; amount: number; notes: string }) => {
    setIsTransferModalOpen(false);
    setActionModal({ isOpen: true, title: 'Processing Transfer', message: 'Executing transaction securely...', status: 'loading' });

    try {
      const gatewayUrl = process.env.NEXT_PUBLIC_GATEWAY_URL || 'http://localhost:3001';
      const res = await fetch(`${gatewayUrl}/api/finance/funds/transfer`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data)
      });

      if (res.ok) {
        setFunds(prev => prev.map(f => {
          if (f.id === data.sourceId) return { ...f, balance: f.balance - data.amount, totalOut: f.totalOut + data.amount };
          if (f.id === data.destId) return { ...f, balance: f.balance + data.amount, totalIn: f.totalIn + data.amount };
          return f;
        }));
        setActionModal({ isOpen: true, title: 'Transfer Successful', message: '', status: 'success', resultMsg: `Successfully transferred ₱${data.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}.` });
      } else {
        const errData = await res.json().catch(() => ({ error: 'Server error' }));
        setActionModal({ isOpen: true, title: 'Transfer Failed', message: '', status: 'error', resultMsg: errData.error || 'Request refused.' });
      }
    } catch (error) {
      setActionModal({ isOpen: true, title: 'Network Error', message: '', status: 'error', resultMsg: 'Failed to communicate with the server.' });
    }
  };

  // StudioSeven Liquid Glass Primitives
  const ultraGlassCard = "glass-sheen bg-gradient-to-br from-white/60 via-white/40 to-white/30 backdrop-blur-[40px] backdrop-saturate-[200%] border border-white/80 shadow-[0_10px_30px_rgba(4,21,45,0.06),0_1px_1px_rgba(255,255,255,0.6),inset_0_2px_3px_rgba(255,255,255,0.9)] rounded-[24px] p-5 md:p-6 transition-all duration-400 ease-[cubic-bezier(0.25,1,0.5,1)]";
  const pillBtn = "glass-sheen px-5 py-2.5 bg-white/70 hover:bg-white/90 backdrop-blur-xl backdrop-saturate-[180%] border border-white/80 shadow-[0_4px_14px_rgba(4,21,45,0.06),inset_0_1px_2px_rgba(255,255,255,1)] hover:shadow-[0_8px_20px_rgba(4,21,45,0.1),inset_0_1px_2px_rgba(255,255,255,1)] hover:-translate-y-0.5 active:scale-95 active:translate-y-0 rounded-full text-[13px] font-black text-[#04152d] transition-all duration-300 ease-[cubic-bezier(0.25,1,0.5,1)] flex items-center gap-1.5 cursor-pointer disabled:opacity-40 disabled:hover:translate-y-0";

  return (
    <div className="relative flex flex-col min-h-screen bg-[#f4f5f7]">
      
      <style jsx global>{`
        .glass-sheen { position: relative; overflow: hidden; isolation: isolate; }
        .glass-sheen::before {
          content: ''; position: absolute; inset: 0;
          background: linear-gradient(128deg, rgba(255,255,255,0.65) 0%, rgba(255,255,255,0.14) 28%, rgba(255,255,255,0) 46%), radial-gradient(130% 110% at 12% -18%, rgba(255,255,255,0.55), rgba(255,255,255,0) 58%);
          opacity: 0.85; transition: opacity 0.35s ease; pointer-events: none; z-index: 1;
        }
        .glass-sheen:hover::before { opacity: 1; }
        .glass-sheen::after {
          content: ''; position: absolute; inset: 0;
          box-shadow: inset 0 1px 0 rgba(255,255,255,0.9), inset 0 -10px 18px -14px rgba(4,21,45,0.15), inset 1px 0 0 rgba(255,255,255,0.4), inset -1px 0 0 rgba(255,255,255,0.1), inset 0 0 0 1px rgba(255,255,255,0.1);
          transition: box-shadow 0.35s ease; pointer-events: none; z-index: 1; border-radius: inherit;
        }
        .glass-sheen:hover::after {
          box-shadow: inset 0 1px 0 rgba(255,255,255,1), inset 0 -10px 20px -12px rgba(4,21,45,0.2), inset 1px 0 0 rgba(255,255,255,0.6), inset -1px 0 0 rgba(255,255,255,0.2), inset 0 0 0 1px rgba(255,255,255,0.4);
        }
      `}</style>
      
      <ActionModal 
        isOpen={actionModal.isOpen} title={actionModal.title} message={actionModal.message} status={actionModal.status} resultMsg={actionModal.resultMsg}
        onConfirm={() => setActionModal({ ...actionModal, isOpen: false })} onClose={() => setActionModal({ ...actionModal, isOpen: false })} confirmText="Acknowledge"
      />

      <FundTransferModal 
        isOpen={isTransferModalOpen} onClose={() => setIsTransferModalOpen(false)} funds={funds.filter(f => f.status === 'Active')} onSubmit={handleExecuteTransfer}
      />

      {/* Sticky Header */}
      <div className="sticky top-0 z-40 w-full backdrop-blur-2xl bg-white/30 border-b border-white/50 shadow-[0_4px_30px_rgba(0,0,0,0.03)]">
        <Header />
      </div>

      {/* Main Content Area */}
      <main className="p-4 md:p-6 max-w-[1600px] w-full mx-auto space-y-6 flex-1 animate-fade-in relative z-10">

        {/* Analytics Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          
          <div className={`${ultraGlassCard} flex flex-col justify-center relative overflow-hidden group hover:-translate-y-1 hover:shadow-[0_14px_30px_rgba(4,21,45,0.08),inset_0_2px_3px_rgba(255,255,255,1)]`}>
            <Wallet size={120} strokeWidth={1} className="absolute -right-6 -bottom-6 text-blue-600/10 group-hover:scale-110 transition-transform duration-500" />
            <div className="relative z-10">
              <p className="block text-[10px] font-black text-[#04152d]/50 uppercase tracking-[0.16em] mb-1 text-left">Total Running Balance</p>
              <p className="text-3xl lg:text-4xl font-black text-[#04152d] tracking-tighter text-left truncate" title={`₱${totalAssets.toLocaleString(undefined, { minimumFractionDigits: 2 })}`}>
                {isLoading ? '...' : `₱${totalAssets.toLocaleString(undefined, { minimumFractionDigits: 2 })}`}
              </p>
            </div>
          </div>

          <div className={`${ultraGlassCard} flex flex-col justify-center group hover:-translate-y-1 hover:shadow-[0_14px_30px_rgba(4,21,45,0.08),inset_0_2px_3px_rgba(255,255,255,1)]`}>
            <div className="flex items-center gap-3 mb-2 text-left">
              <div className="w-10 h-10 rounded-2xl bg-white/90 flex items-center justify-center border border-white shadow-[0_4px_10px_rgba(4,21,45,0.06)] shrink-0">
                <TrendingUp size={20} className="text-blue-600" />
              </div>
              <p className="block text-[10px] font-black text-[#04152d]/50 uppercase tracking-[0.16em] leading-tight">Total Collections<br/>(Cash In)</p>
            </div>
            <p className="text-2xl lg:text-[26px] font-black text-blue-600 tracking-tighter text-left mt-1 truncate" title={`+ ₱${totalCashIn.toLocaleString(undefined, { minimumFractionDigits: 2 })}`}>
              {isLoading ? '...' : `+ ₱${totalCashIn.toLocaleString(undefined, { minimumFractionDigits: 2 })}`}
            </p>
          </div>

          <div className={`${ultraGlassCard} flex flex-col justify-center group hover:-translate-y-1 hover:shadow-[0_14px_30px_rgba(4,21,45,0.08),inset_0_2px_3px_rgba(255,255,255,1)]`}>
            <div className="flex items-center gap-3 mb-2 text-left">
              <div className="w-10 h-10 rounded-2xl bg-white/90 flex items-center justify-center border border-white shadow-[0_4px_10px_rgba(4,21,45,0.06)] shrink-0">
                <TrendingDown size={20} className="text-yellow-600" />
              </div>
              <p className="block text-[10px] font-black text-[#04152d]/50 uppercase tracking-[0.16em] leading-tight">Total Disbursements<br/>(Cash Out)</p>
            </div>
            <p className="text-2xl lg:text-[26px] font-black text-yellow-600 tracking-tighter text-left mt-1 truncate" title={`- ₱${totalCashOut.toLocaleString(undefined, { minimumFractionDigits: 2 })}`}>
              {isLoading ? '...' : `- ₱${totalCashOut.toLocaleString(undefined, { minimumFractionDigits: 2 })}`}
            </p>
          </div>

          {/* Recharts Analytics */}
          <div className={`${ultraGlassCard} flex items-center justify-center group hover:-translate-y-1 hover:shadow-[0_14px_30px_rgba(4,21,45,0.08),inset_0_2px_3px_rgba(255,255,255,1)]`}>
            {chartData.length > 0 && !isLoading ? (
              <div className="w-full h-full flex flex-col items-center justify-between">
                <div className="h-[90px] w-full mt-2">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={chartData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={30} outerRadius={45} paddingAngle={4}>
                        {chartData.map((entry: any, index: number) => (
                          <Cell key={`cell-${index}`} fill={entry.fill} stroke="rgba(255,255,255,0.6)" strokeWidth={2} />
                        ))}
                      </Pie>
                      <Tooltip 
                        contentStyle={{ backgroundColor: 'rgba(255,255,255,0.85)', backdropFilter: 'blur(20px)', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.9)', boxShadow: '0 8px 30px rgba(4,21,45,0.08)', fontSize: '11px', fontWeight: '900' }} 
                        itemStyle={{ color: '#04152d' }} 
                        formatter={(value: any) => `₱${Number(value).toLocaleString(undefined, { minimumFractionDigits: 2 })}`} 
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="w-full flex items-center justify-center mt-3 border-t border-white/60 pt-3">
                  <p className="text-[10px] font-black text-[#04152d]/60 uppercase tracking-widest text-center">Asset Distribution</p>
                </div>
              </div>
            ) : (
              <p className="text-xs font-bold text-[#04152d]/40 text-center uppercase tracking-widest">{isLoading ? 'Syncing...' : 'No Asset Data'}</p>
            )}
          </div>
        </div>

        {/* Filters Row */}
        <div className={`${ultraGlassCard} !p-4 flex flex-wrap gap-4 items-center`}>
          <div className="flex-1 min-w-[250px] relative glass-sheen rounded-full">
            <Search size={16} className="absolute left-5 top-1/2 -translate-y-1/2 text-[#04152d]/40 z-10" />
            <input 
              type="text" placeholder="Search fund pot..." 
              value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
              className="relative w-full pl-12 pr-5 py-3 rounded-full bg-white/60 hover:bg-white/80 backdrop-blur-xl backdrop-saturate-[200%] border border-white/80 shadow-[inset_0_2px_6px_rgba(4,21,45,0.03)] text-[13px] font-bold outline-none focus:bg-white focus:shadow-[0_6px_20px_rgba(4,21,45,0.08)] transition-all duration-400 text-[#04152d] placeholder:text-[#04152d]/40"
            />
          </div>
          
          {/* Calendar / Month Picker Filter */}
          <div className="relative inline-flex items-center min-w-[180px] glass-sheen bg-white/60 hover:bg-white/80 backdrop-blur-xl rounded-full border border-white/80 shadow-[inset_0_2px_6px_rgba(4,21,45,0.03)] transition-all duration-400 group">
            <div className="pl-5 pr-2 flex items-center pointer-events-none z-10">
              <Calendar size={16} className="text-[#04152d]/40 group-focus-within:text-[#04152d]/70 transition-colors" />
            </div>
            <div className="relative flex-1">
              <input 
                type="month" 
                value={filterMonth} 
                onChange={(e) => setFilterMonth(e.target.value)} 
                className="w-full py-3 text-[13px] outline-none font-bold text-[#04152d] bg-transparent cursor-pointer opacity-0 absolute inset-0 z-20" 
              />
              <div className="py-3 text-[13px] font-bold text-[#04152d] pointer-events-none truncate pr-3 relative z-10">
                {filterMonth ? new Date(filterMonth + '-01').toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) : 'All Time'}
              </div>
            </div>
            {filterMonth && (
              <button 
                onClick={() => setFilterMonth('')} 
                className="pr-5 pl-2 text-[#04152d]/40 hover:text-red-500 z-30 transition-colors"
              >
                <X size={15} />
              </button>
            )}
          </div>
        </div>

        {/* Ledger Table Section */}
        <div className={`!p-0 overflow-hidden flex flex-col !rounded-[24px] ${ultraGlassCard}`}>
          
          <div className="p-6 md:p-8 border-b border-white/60 flex flex-wrap items-center justify-between gap-5 bg-white/40 backdrop-blur-2xl backdrop-saturate-[190%]">
            <div className="flex items-center gap-4">
              <h2 className="text-[17px] font-black text-[#04152d] text-left flex items-center gap-2.5">
                <Layers className="text-blue-600" size={20} /> Fund Matrix
              </h2>
              <span className="glass-sheen bg-white/80 backdrop-blur-md px-3 py-1.5 rounded-lg border border-white shadow-[0_2px_6px_rgba(4,21,45,0.05)] text-[10px] font-black text-[#04152d]/60 uppercase tracking-[0.16em]">
                {filteredFunds.length} Active Pots
              </span>
            </div>
            
            <button 
              onClick={() => setIsTransferModalOpen(true)}
              className={`${pillBtn} !bg-[#04152d] !text-white hover:!bg-[#04152d]/90 !shadow-[0_6px_16px_rgba(4,21,45,0.25)] border-white/20`}
            >
              <ArrowRightLeft size={14} /> Inter-Fund Transfer
            </button>
          </div>
          
          <div className="overflow-x-auto w-full">
            <table className="w-full text-left whitespace-nowrap min-w-[1000px] border-collapse">
              <thead className="bg-white/60 backdrop-blur-2xl backdrop-saturate-[200%] shadow-[0_1px_0_rgba(255,255,255,1)] sticky top-0 z-10">
                <tr>
                  <th className="px-6 py-5 text-[10px] font-black text-[#04152d]/50 uppercase tracking-[0.2em] text-left">Fund Name</th>
                  <th className="px-6 py-5 text-[10px] font-black text-[#04152d]/50 uppercase tracking-[0.2em] text-right">Collections (In)</th>
                  <th className="px-6 py-5 text-[10px] font-black text-[#04152d]/50 uppercase tracking-[0.2em] text-right">Disbursements (Out)</th>
                  <th className="px-6 py-5 text-[10px] font-black text-[#04152d]/50 uppercase tracking-[0.2em] text-right pr-8">Running Balance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/60 text-[13.5px] font-bold text-[#04152d] bg-white/30 backdrop-blur-xl backdrop-saturate-[180%]">
                {isLoading ? (
                  <tr><td colSpan={4} className="px-6 py-24 text-center text-[#04152d]/40 font-black text-[11px] uppercase tracking-widest text-left">Syncing data stream...</td></tr>
                ) : filteredFunds.length > 0 ? filteredFunds.map((fund) => (
                  <tr key={fund.id} className="hover:bg-white/70 hover:backdrop-blur-xl hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.9)] transition-all duration-300 ease-[cubic-bezier(0.25,1,0.5,1)]">
                    <td className="px-6 py-5 text-left">
                      <p className="font-black text-[#04152d] text-[14px] tracking-tight">{fund.name}</p>
                      <p className="font-mono text-[10.5px] text-[#04152d]/40 mt-1 uppercase tracking-widest">{fund.id}</p>
                    </td>
                    <td className="px-6 py-5 text-right font-black text-blue-600 text-[14px] tracking-tighter">
                      + ₱{fund.totalIn.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-6 py-5 text-right font-black text-yellow-600 text-[14px] tracking-tighter">
                      - ₱{fund.totalOut.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-6 py-5 text-right pr-8">
                      <span className="font-black text-[17px] text-[#04152d] tracking-tighter">
                        ₱{fund.balance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </span>
                    </td>
                  </tr>
                )) : (
                  <tr><td colSpan={4} className="px-6 py-24 text-center text-[#04152d]/40 font-black text-[11px] uppercase tracking-widest text-left">No funds matched your filter.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

      </main>
    </div>
  );
}