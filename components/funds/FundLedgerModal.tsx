"use client";

import React, { useState, useMemo } from 'react';
import { 
  X, ShieldCheck, ArrowDownLeft, ArrowUpRight, 
  Calendar, FileText, Building2, CheckCircle2, 
  Layers, Search, Filter, ExternalLink, HelpCircle
} from 'lucide-react';
import { 
  Fund, FundTransaction, calculateFundBreakdown, 
  FundBreakdown 
} from '@/lib/fundData';
import TransactionSourceModal from './TransactionSourceModal';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  fund: Fund | null;
  transactions: FundTransaction[];
  isAuditorView?: boolean;
}

export default function FundLedgerModal({
  isOpen,
  onClose,
  fund,
  transactions,
  isAuditorView = false
}: Props) {
  const [selectedTxn, setSelectedTxn] = useState<FundTransaction | null>(null);
  const [isSourceModalOpen, setIsSourceModalOpen] = useState(false);
  const [filterType, setFilterType] = useState<'All' | 'INFLOW' | 'OUTFLOW' | 'OPENING'>('All');
  const [searchTerm, setSearchTerm] = useState('');

  const breakdown: FundBreakdown | null = useMemo(() => {
    if (!fund) return null;
    return calculateFundBreakdown(fund, transactions);
  }, [fund, transactions]);

  const fundTransactions = useMemo(() => {
    if (!fund) return [];
    return transactions
      .filter(t => t.fundId === fund.id || t.fundName === fund.name)
      .filter(t => {
        if (filterType !== 'All' && t.direction !== filterType) return false;
        if (searchTerm) {
          const q = searchTerm.toLowerCase();
          return (
            t.id.toLowerCase().includes(q) ||
            t.sourceRef.toLowerCase().includes(q) ||
            t.particulars.toLowerCase().includes(q) ||
            t.payeeOrPayer.toLowerCase().includes(q)
          );
        }
        return true;
      })
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [fund, transactions, filterType, searchTerm]);

  if (!isOpen || !fund || !breakdown) return null;

  const formatCurrency = (val: number) => `₱${Number(val || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}`;

  const handleOpenSource = (txn: FundTransaction) => {
    setSelectedTxn(txn);
    setIsSourceModalOpen(true);
  };

  const ultraGlassCard = "bg-white/90 backdrop-blur-[40px] backdrop-saturate-[200%] border border-white/90 shadow-[0_24px_60px_rgba(4,21,45,0.18),inset_0_2px_4px_rgba(255,255,255,1)] rounded-[26px] p-6 lg:p-8 relative overflow-hidden";
  const glassInput = "pl-9 pr-4 py-2 bg-white/70 hover:bg-white/90 focus:bg-white backdrop-blur-xl border border-white/90 shadow-[inset_0_2px_4px_rgba(4,21,45,0.03)] rounded-full text-[12px] font-semibold text-[#04152d] outline-none transition-all placeholder:text-[#04152d]/40";

  return (
    <>
      <div className="fixed inset-0 z-[105] flex items-center justify-center p-3 sm:p-6 transition-opacity duration-300">
        {/* Outer locked backdrop */}
        <div 
          className="absolute inset-0 bg-[#04152d]/50 backdrop-blur-md" 
          onClick={onClose} 
        />

        <div className={`relative w-full max-w-4xl max-h-[92vh] flex flex-col animate-modal-enter ${ultraGlassCard}`}>
          {/* Fixed Header */}
          <div className="flex items-center justify-between border-b border-white/70 pb-4 mb-4 shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-blue-50 border border-blue-200 text-blue-700 flex items-center justify-center font-bold text-[14px] shadow-sm">
                {fund.code}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-[19px] font-bold text-[#04152d] tracking-tight">
                    {fund.name}
                  </h3>
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border shadow-sm ${
                    fund.status === 'Active' 
                      ? 'bg-emerald-100 text-emerald-800 border-emerald-300' 
                      : 'bg-gray-100 text-gray-700 border-gray-300'
                  }`}>
                    {fund.status}
                  </span>
                </div>
                <p className="text-[12px] text-[#04152d]/60 mt-0.5">
                  {fund.description}
                </p>
              </div>
            </div>

            <button 
              onClick={onClose} 
              className="p-2 bg-white/70 hover:bg-white rounded-full border border-white shadow-sm transition-colors text-[#04152d]/60 hover:text-[#04152d]"
            >
              <X size={18} />
            </button>
          </div>

          {/* Scrollable Body - only content moves */}
          <div className="flex-1 overflow-y-auto pr-1 space-y-6 hide-scrollbar">
            
            {/* Opening Balance Displayed Separately & Equation Breakdown */}
            <div className="bg-white/80 backdrop-blur-xl border border-white shadow-xs p-5 rounded-[22px] space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-white/70">
                <span className="text-[11px] font-bold uppercase tracking-widest text-[#04152d]/70 flex items-center gap-1.5">
                  <ShieldCheck size={14} className="text-blue-600" />
                  Fund Balance Equation & Reconciliation
                </span>
                <span className="text-[10px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200 px-2.5 py-0.5 rounded-full">
                  Status: Balanced
                </span>
              </div>

              {/* Equation Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-center">
                {/* 1. Opening Balance */}
                <div className="bg-white/80 p-3.5 rounded-xl border border-white shadow-xs">
                  <span className="block text-[10px] uppercase font-bold text-[#04152d]/50 tracking-wider mb-1">
                    1. Recorded Opening Balance
                  </span>
                  <span className="text-[17px] font-extrabold text-blue-700 tracking-tight">
                    {formatCurrency(breakdown.openingBalance)}
                  </span>
                  <span className="block text-[9px] text-[#04152d]/50 mt-0.5">Inception Baseline</span>
                </div>

                {/* 2. Total Posted Inflows */}
                <div className="bg-emerald-50/70 p-3.5 rounded-xl border border-emerald-200 shadow-xs">
                  <span className="block text-[10px] uppercase font-bold text-emerald-800 tracking-wider mb-1">
                    + 2. Posted Inflows
                  </span>
                  <span className="text-[17px] font-extrabold text-emerald-700 tracking-tight">
                    +{formatCurrency(breakdown.totalPostedInflows)}
                  </span>
                  <span className="block text-[9px] text-emerald-700/80 mt-0.5">Collections Credited</span>
                </div>

                {/* 3. Total Posted Outflows */}
                <div className="bg-rose-50/70 p-3.5 rounded-xl border border-rose-200 shadow-xs">
                  <span className="block text-[10px] uppercase font-bold text-rose-800 tracking-wider mb-1">
                    - 3. Posted Outflows
                  </span>
                  <span className="text-[17px] font-extrabold text-rose-700 tracking-tight">
                    -{formatCurrency(breakdown.totalPostedOutflows)}
                  </span>
                  <span className="block text-[9px] text-rose-700/80 mt-0.5">Disbursements Deducted</span>
                </div>

                {/* 4. Resulting Current Balance */}
                <div className="bg-blue-50/80 p-3.5 rounded-xl border border-blue-200 shadow-xs">
                  <span className="block text-[10px] uppercase font-bold text-blue-900 tracking-wider mb-1">
                    = 4. Resulting Balance
                  </span>
                  <span className="text-[18px] font-extrabold text-[#04152d] tracking-tight">
                    {formatCurrency(breakdown.currentBalance)}
                  </span>
                  <span className="block text-[9px] text-blue-700 mt-0.5 font-semibold">Active Fund Balance</span>
                </div>
              </div>

              <div className="pt-3 border-t border-white/70 flex flex-col sm:flex-row items-center justify-between text-[11px] text-[#04152d]/70 gap-2">
                <span>
                  Formula: <code className="text-[#04152d] font-mono bg-white px-1.5 py-0.5 rounded border border-white">Current Balance = Opening + Inflows - Outflows</code>
                </span>
                <span className="font-semibold text-[#04152d]">
                  Available Liquidity: {formatCurrency(breakdown.availableBalance)}
                </span>
              </div>
            </div>

            {/* Filter and Search Bar */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white/50 p-3 rounded-2xl border border-white">
              <div className="relative w-full sm:w-64">
                <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#04152d]/40" />
                <input 
                  type="text" 
                  placeholder="Search Txn, Ref, Particulars..." 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className={`${glassInput} w-full`}
                />
              </div>

              {/* Movement Type Filter Tabs */}
              <div className="flex items-center gap-1.5 bg-white/80 p-1 rounded-full border border-white/80 shadow-sm w-full sm:w-auto justify-center">
                <button
                  onClick={() => setFilterType('All')}
                  className={`px-3 py-1 rounded-full text-[11px] font-bold transition-all ${
                    filterType === 'All' ? 'bg-[#04152d] text-white shadow-sm' : 'text-[#04152d]/60 hover:text-[#04152d]'
                  }`}
                >
                  All Movements ({fundTransactions.length})
                </button>
                <button
                  onClick={() => setFilterType('INFLOW')}
                  className={`px-3 py-1 rounded-full text-[11px] font-bold transition-all ${
                    filterType === 'INFLOW' ? 'bg-emerald-600 text-white shadow-sm' : 'text-emerald-700 hover:text-emerald-900'
                  }`}
                >
                  Inflows (+)
                </button>
                <button
                  onClick={() => setFilterType('OUTFLOW')}
                  className={`px-3 py-1 rounded-full text-[11px] font-bold transition-all ${
                    filterType === 'OUTFLOW' ? 'bg-rose-600 text-white shadow-sm' : 'text-rose-700 hover:text-rose-900'
                  }`}
                >
                  Outflows (-)
                </button>
                <button
                  onClick={() => setFilterType('OPENING')}
                  className={`px-3 py-1 rounded-full text-[11px] font-bold transition-all ${
                    filterType === 'OPENING' ? 'bg-blue-600 text-white shadow-sm' : 'text-blue-700 hover:text-blue-900'
                  }`}
                >
                  Opening Baseline
                </button>
              </div>
            </div>

            {/* Fund Movement Ledger Table (User Stories 7, 8, 9) */}
            <div className="bg-white/60 rounded-2xl border border-white overflow-hidden shadow-sm">
              <div className="overflow-x-auto w-full">
                <table className="w-full text-left whitespace-nowrap border-collapse min-w-[760px]">
                  <thead className="bg-white/80 text-[10px] font-bold text-[#04152d]/50 uppercase tracking-[0.15em] border-b border-white">
                    <tr>
                      <th className="py-3 px-4">Txn Ref</th>
                      <th className="py-3 px-4">Movement & Module</th>
                      <th className="py-3 px-4">Source Transaction Ref</th>
                      <th className="py-3 px-4">Particulars / Party</th>
                      <th className="py-3 px-4">Date & Time</th>
                      <th className="py-3 px-4 text-right">Amount</th>
                      <th className="py-3 px-4 text-center">Status</th>
                      <th className="py-3 px-4 text-right">Lineage</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/70 text-[12px] text-[#04152d]">
                    {fundTransactions.length > 0 ? (
                      fundTransactions.map((tx) => {
                        const isInflow = tx.direction === 'INFLOW';
                        const isOpening = tx.direction === 'OPENING';
                        const isOutflow = tx.direction === 'OUTFLOW';

                        return (
                          <tr key={tx.id} className="hover:bg-white/80 transition-colors">
                            <td className="py-3.5 px-4 font-mono font-bold text-blue-700 text-[11px]">
                              {tx.id}
                            </td>

                            <td className="py-3.5 px-4">
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

                            {/* User Story 9: Source Transaction Reference */}
                            <td className="py-3.5 px-4">
                              <button
                                onClick={() => handleOpenSource(tx)}
                                className="inline-flex items-center gap-1 font-mono font-bold text-[11px] text-blue-600 hover:text-blue-800 bg-blue-50/80 hover:bg-blue-100 border border-blue-200 px-2 py-0.5 rounded transition-all group"
                                title="Inspect Source Provenance"
                              >
                                {tx.sourceRef}
                                <ExternalLink size={10} className="group-hover:translate-x-0.5 transition-transform" />
                              </button>
                            </td>

                            <td className="py-3.5 px-4 max-w-[220px]">
                              <p className="font-semibold text-[#04152d] truncate">{tx.particulars}</p>
                              <p className="text-[10px] text-[#04152d]/50 truncate">{tx.payeeOrPayer}</p>
                            </td>

                            <td className="py-3.5 px-4 font-medium text-[#04152d]/70 text-[11px]">
                              {tx.timestamp || tx.date}
                            </td>

                            {/* User Story 8: Distinguish Inflows and Outflows */}
                            <td className="py-3.5 px-4 text-right font-bold text-[13px] tracking-tight">
                              <span className={
                                isInflow ? 'text-emerald-700' :
                                isOpening ? 'text-blue-700' :
                                'text-rose-700'
                              }>
                                {isInflow ? '+' : isOpening ? '' : '-'}{formatCurrency(tx.amount)}
                              </span>
                            </td>

                            <td className="py-3.5 px-4 text-center">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${
                                tx.status === 'Posted'
                                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                  : 'bg-amber-50 text-amber-700 border-amber-200'
                              }`}>
                                {tx.status}
                              </span>
                            </td>

                            <td className="py-3.5 px-4 text-right">
                              <button
                                onClick={() => handleOpenSource(tx)}
                                className="text-[11px] font-bold text-blue-600 hover:text-blue-800 underline"
                              >
                                Trace
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan={8} className="py-12 text-center text-[#04152d]/50 text-[12px] italic">
                          No fund movements matching the selected criteria.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Fixed Footer */}
          <div className="shrink-0 border-t border-white/70 pt-4 mt-4 flex items-center justify-between">
            <span className="text-[11px] text-[#04152d]/50">
              Total movements shown: <span className="font-bold text-[#04152d]">{fundTransactions.length}</span>
            </span>
            <button
              onClick={onClose}
              className="px-6 py-2.5 rounded-full text-[13px] font-semibold bg-[#04152d] text-white hover:bg-[#0a1e3f] transition-all shadow-md active:scale-95"
            >
              Done Viewing
            </button>
          </div>
        </div>
      </div>

      <TransactionSourceModal
        isOpen={isSourceModalOpen}
        onClose={() => setIsSourceModalOpen(false)}
        transaction={selectedTxn}
      />
    </>
  );
}
