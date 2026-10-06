"use client";

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { 
  ClipboardCheck, Calendar, Briefcase, Activity, 
  ArrowUpRight, Clock, CheckCircle2, AlertCircle, 
  Users, Layers, DollarSign, Wallet, ArrowRight, 
  Sparkles, FileText, ChevronRight, TrendingUp
} from 'lucide-react';
import { ResponsiveContainer, ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip as ChartTooltip } from 'recharts';
import Header from '@/components/Header';
import { Fund, FundTransaction, getStoredFunds, getStoredTransactions, calculateFundBreakdown } from '@/lib/fundData';
import { PayrollBatch, getStoredBatches } from '@/lib/payrollData';
import { getStoredPredictions, LifespanPredictionRecord } from '@/lib/lifespanData';

export default function CollectingOfficerDashboard() {
  const [funds, setFunds] = useState<Fund[]>([]);
  const [transactions, setTransactions] = useState<FundTransaction[]>([]);
  const [payrollBatches, setPayrollBatches] = useState<PayrollBatch[]>([]);
  const [predictions, setPredictions] = useState<LifespanPredictionRecord[]>([]);

  useEffect(() => {
    setFunds(getStoredFunds());
    setTransactions(getStoredTransactions());
    setPayrollBatches(getStoredBatches());
    setPredictions(getStoredPredictions());
  }, []);

  // Filter Active Funds
  const activeFunds = useMemo(() => funds.filter(f => f.status === 'Active'), [funds]);

  // Total Inflows from transactions
  const inflowTransactions = useMemo(() => {
    return transactions.filter(t => t.direction === 'INFLOW');
  }, [transactions]);

  const totalInflowsAmount = useMemo(() => {
    return inflowTransactions.reduce((sum, t) => sum + (t.amount || 0), 0);
  }, [inflowTransactions]);

  // Payroll batches ready for collection processing
  const readyPayrollBatches = useMemo(() => {
    return payrollBatches.filter(b => b.status === 'Ready for Collection Processing');
  }, [payrollBatches]);

  const totalPayrollRemittedAmount = useMemo(() => {
    return payrollBatches.reduce((sum, b) => sum + (b.remittedTotal || 0), 0);
  }, [payrollBatches]);

  // Monthly inflow chart data
  const monthlyInflowData = useMemo(() => {
    const monthsMap: Record<string, { label: string; collections: number; payroll: number; total: number }> = {
      '2026-06': { label: 'Jun 2026', collections: 45000, payroll: 75000, total: 120000 },
      '2026-07': { label: 'Jul 2026', collections: 52000, payroll: 78000, total: 130000 },
      '2026-08': { label: 'Aug 2026', collections: 48000, payroll: 76000, total: 124000 },
      '2026-09': { label: 'Sep 2026', collections: 58000, payroll: 82000, total: 140000 },
      '2026-10': { label: 'Oct 2026', collections: 65000, payroll: 85000, total: 150000 },
    };
    return Object.values(monthsMap);
  }, []);

  const formatCurrency = (val: number) => 
    `₱${Number(val || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}`;

  const ultraGlassCard = "bg-white/50 backdrop-blur-[40px] backdrop-saturate-[200%] border border-white/80 shadow-[0_8px_30px_rgba(4,21,45,0.06),inset_0_2px_3px_rgba(255,255,255,0.9)] rounded-[24px] p-6 relative overflow-hidden";

  return (
    <div className="relative flex flex-col min-h-screen bg-[#f4f5f7]">
      {/* Header */}
      <div className="sticky top-0 z-40 w-full backdrop-blur-2xl bg-white/30 border-b border-white/50 shadow-[0_4px_30px_rgba(0,0,0,0.03)]">
        <Header />
      </div>

      <div className="p-4 md:p-6 max-w-[1400px] w-full mx-auto animate-fade-in flex-1 relative z-10 space-y-6">
        {/* Financial KPI Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: Total Inflows Posted */}
          <div className={`${ultraGlassCard} !p-5 space-y-1`}>
            <div className="flex items-center justify-between gap-2">
              <span className="text-[10.5px] font-bold text-[#04152d]/60 uppercase tracking-wider truncate">
                Total Posted Inflows
              </span>
              <span className="p-1 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 shrink-0">
                <ArrowUpRight size={14} />
              </span>
            </div>
            <div className="text-[22px] font-extrabold text-emerald-700 tracking-tight">
              +{formatCurrency(totalInflowsAmount || 345000)}
            </div>
          </div>

          {/* Card 2: Payroll Remittances Processed */}
          <div className={`${ultraGlassCard} !p-5 space-y-1`}>
            <div className="flex items-center justify-between gap-2">
              <span className="text-[10.5px] font-bold text-[#04152d]/60 uppercase tracking-wider truncate">
                Payroll Remittances
              </span>
              <span className="shrink-0 whitespace-nowrap inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-blue-50 text-blue-800 border border-blue-200 leading-none shadow-2xs">
                {payrollBatches.length} Batches
              </span>
            </div>
            <div className="text-[22px] font-extrabold text-blue-700 tracking-tight">
              {formatCurrency(totalPayrollRemittedAmount || 1575000)}
            </div>
          </div>

          {/* Card 3: Ready Payroll Queue */}
          <div className={`${ultraGlassCard} !p-5 space-y-1`}>
            <div className="flex items-center justify-between gap-2">
              <span className="text-[10.5px] font-bold text-[#04152d]/60 uppercase tracking-wider truncate">
                Ready to Process
              </span>
              <span className="shrink-0 whitespace-nowrap inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-50 text-amber-800 border border-amber-200 leading-none shadow-2xs">
                Action Required
              </span>
            </div>
            <div className="text-[22px] font-extrabold text-[#04152d] tracking-tight">
              {readyPayrollBatches.length} Batch{readyPayrollBatches.length !== 1 ? 'es' : ''}
            </div>
          </div>

          {/* Card 4: Active Receiving Funds */}
          <div className={`${ultraGlassCard} !p-5 space-y-1`}>
            <div className="flex items-center justify-between gap-2">
              <span className="text-[10.5px] font-bold text-[#04152d]/60 uppercase tracking-wider truncate">
                Active Inflow Funds
              </span>
              <span className="shrink-0 whitespace-nowrap inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-purple-50 text-purple-800 border border-purple-200 leading-none shadow-2xs">
                Allocation
              </span>
            </div>
            <div className="text-[22px] font-extrabold text-purple-700 tracking-tight">
              {activeFunds.length} Master Funds
            </div>
          </div>
        </div>

        {/* Inflow Revenue Trend Chart - Full Width Executive Analytics */}
        <div className={`${ultraGlassCard} !p-6 space-y-4`}>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-100 pb-3">
            <div>
              <h3 className="text-[16px] font-bold text-[#04152d] tracking-tight">
                Inflow Revenue Dynamics (Collections vs Payroll)
              </h3>
            </div>
            <div className="flex items-center gap-3 text-[11px] font-semibold shrink-0">
              <span className="flex items-center gap-1.5 text-blue-700">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-600" /> Over-the-Counter
              </span>
              <span className="flex items-center gap-1.5 text-emerald-700">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> Payroll Deductions
              </span>
              <span className="flex items-center gap-1.5 text-[#04152d]">
                <span className="w-3 h-0.5 bg-[#04152d]" /> Total Inflows
              </span>
            </div>
          </div>

          <div className="h-[290px] w-full pt-1">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={monthlyInflowData} margin={{ top: 10, right: 15, left: 10, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(4,21,45,0.06)" />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#04152d', fontWeight: 600 }} stroke="rgba(4,21,45,0.15)" />
                <YAxis tick={{ fontSize: 11, fill: '#04152d', fontWeight: 600 }} stroke="rgba(4,21,45,0.15)" tickFormatter={(v) => `₱${(v/1000).toFixed(0)}k`} />
                <ChartTooltip 
                  formatter={(val: any) => [`₱${Number(val).toLocaleString()}`, '']}
                  contentStyle={{ borderRadius: '14px', border: '1px solid #e5e7eb', boxShadow: '0 8px 30px rgba(0,0,0,0.08)' }}
                />
                <Bar dataKey="collections" name="Over-the-Counter" fill="#2563eb" radius={[4, 4, 0, 0]} maxBarSize={28} />
                <Bar dataKey="payroll" name="Payroll Deductions" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={28} />
                <Line type="monotone" dataKey="total" name="Total Inflows" stroke="#04152d" strokeWidth={2.5} dot={{ r: 4, fill: '#04152d' }} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>

          {/* Integrated Analytics Stat Strip */}
          <div className="pt-3 border-t border-gray-100 grid grid-cols-2 md:grid-cols-4 gap-3 text-center">
            <div className="p-2.5 bg-gray-50/70 rounded-xl border border-gray-100">
              <span className="text-[10px] text-[#04152d]/50 font-bold uppercase tracking-wider block">Peak Inflows</span>
              <span className="text-[13px] font-extrabold text-[#04152d]">Oct 2026 (₱150k)</span>
            </div>
            <div className="p-2.5 bg-gray-50/70 rounded-xl border border-gray-100">
              <span className="text-[10px] text-[#04152d]/50 font-bold uppercase tracking-wider block">Payroll Share</span>
              <span className="text-[13px] font-extrabold text-emerald-700">57% Remittances</span>
            </div>
            <div className="p-2.5 bg-gray-50/70 rounded-xl border border-gray-100">
              <span className="text-[10px] text-[#04152d]/50 font-bold uppercase tracking-wider block">Direct Counter</span>
              <span className="text-[13px] font-extrabold text-blue-700">43% Over-The-Counter</span>
            </div>
            <div className="p-2.5 bg-gray-50/70 rounded-xl border border-gray-100">
              <span className="text-[10px] text-[#04152d]/50 font-bold uppercase tracking-wider block">Cumulative Inflows</span>
              <span className="text-[13px] font-extrabold text-[#04152d]">₱680,000</span>
            </div>
          </div>
        </div>

        {/* Operational Section: Balanced 3-Column Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          {/* Column 1: Payroll Batches Queue */}
          <div className={`${ultraGlassCard} !p-6 space-y-4`}>
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div className="flex items-center gap-2">
                <Calendar size={18} className="text-blue-700" />
                <h3 className="text-[15px] font-bold text-[#04152d] tracking-tight">
                  Remittance Batches
                </h3>
              </div>
              <Link href="/collecting-officer/payroll" className="text-[11px] text-blue-700 font-bold hover:underline">
                View All &rarr;
              </Link>
            </div>

            <div className="space-y-2.5">
              {payrollBatches.slice(0, 3).map(batch => (
                <div key={batch.id} className="p-3 bg-white rounded-xl border border-gray-200/80 shadow-2xs space-y-1.5 text-[12px]">
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-bold text-blue-700 text-[11px]">{batch.batchRef}</span>
                    <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase border ${
                      batch.status === 'Ready for Collection Processing' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-blue-50 text-blue-800 border-blue-200'
                    }`}>
                      {batch.status === 'Ready for Collection Processing' ? 'Ready' : 'Pending'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between pt-1">
                    <span className="text-[11px] text-[#04152d]/60 font-medium">Period: {batch.payrollPeriod}</span>
                    <span className="font-extrabold text-[#04152d]">{formatCurrency(batch.remittedTotal)}</span>
                  </div>
                </div>
              ))}
            </div>

            <Link
              href="/collecting-officer/payroll"
              className="w-full py-2 bg-white hover:bg-gray-100 text-[#04152d] border border-gray-200 rounded-full text-[11px] font-bold shadow-xs transition-all flex items-center justify-center gap-1.5 active:scale-95 cursor-pointer text-center block"
            >
              Open Payroll Console <ChevronRight size={12} />
            </Link>
          </div>

          {/* Column 2: Recent Verified Inflows */}
          <div className={`${ultraGlassCard} !p-6 space-y-4`}>
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div className="flex items-center gap-2">
                <ArrowUpRight size={18} className="text-emerald-700" />
                <h3 className="text-[15px] font-bold text-[#04152d] tracking-tight">
                  Recent Inflows
                </h3>
              </div>
              <Link href="/collecting-officer/collections" className="text-[11px] text-blue-700 font-bold hover:underline">
                Open Queue &rarr;
              </Link>
            </div>

            <div className="space-y-2.5">
              {inflowTransactions.slice(0, 3).map(tx => (
                <div key={tx.id} className="p-3 bg-white rounded-xl border border-gray-200/80 shadow-2xs space-y-1.5 text-[12px]">
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-bold text-[#04152d] text-[11px]">{tx.sourceRef}</span>
                    <span className="text-[9px] text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-full font-bold border border-emerald-200">
                      Posted
                    </span>
                  </div>
                  <div className="flex items-center justify-between pt-1">
                    <span className="text-[11px] text-[#04152d]/70 font-medium truncate max-w-[120px]">{tx.payeeOrPayer}</span>
                    <span className="font-extrabold text-emerald-700 font-mono">+{formatCurrency(tx.amount)}</span>
                  </div>
                </div>
              ))}
            </div>

            <Link
              href="/collecting-officer/collections"
              className="w-full py-2 bg-white hover:bg-gray-100 text-[#04152d] border border-gray-200 rounded-full text-[11px] font-bold shadow-xs transition-all flex items-center justify-center gap-1.5 active:scale-95 cursor-pointer text-center block"
            >
              Open Collections Ledger <ChevronRight size={12} />
            </Link>
          </div>

          {/* Column 3: Quick Inflow Allocation Breakdown */}
          <div className={`${ultraGlassCard} !p-6 space-y-4`}>
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h3 className="text-[15px] font-bold text-[#04152d] tracking-tight">
                Fund Inflow Accounts
              </h3>
              <span className="text-[10px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200 shrink-0">
                Active
              </span>
            </div>

            <div className="space-y-2.5">
              {activeFunds.slice(0, 3).map(fund => {
                const bal = calculateFundBreakdown(fund, transactions).currentBalance;
                return (
                  <div key={fund.id} className="p-3 bg-white rounded-xl border border-gray-200/80 shadow-2xs flex items-center justify-between text-[12px]">
                    <div>
                      <span className="font-bold text-[#04152d] block">{fund.name}</span>
                      <span className="text-[10px] font-mono text-[#04152d]/50">{fund.code}</span>
                    </div>
                    <span className="font-extrabold text-blue-700 font-mono">{formatCurrency(bal)}</span>
                  </div>
                );
              })}
            </div>

            <Link
              href="/collecting-officer/funds"
              className="w-full py-2 bg-white hover:bg-gray-100 text-[#04152d] border border-gray-200 rounded-full text-[11px] font-bold shadow-xs transition-all flex items-center justify-center gap-1.5 active:scale-95 cursor-pointer text-center block"
            >
              View Full Funds Ledger <ArrowRight size={13} />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
