"use client";

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { 
  FileText, ShieldCheck, Calendar, Briefcase, Activity, 
  Send, ArrowRight, CheckCircle2, AlertTriangle, Eye, 
  Layers, Search, Clock, ArrowUpRight, ArrowDownLeft 
} from 'lucide-react';
import { ResponsiveContainer, ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip as ChartTooltip } from 'recharts';
import Header from '@/components/Header';
import { Fund, FundTransaction, getStoredFunds, getStoredTransactions, calculateFundBreakdown } from '@/lib/fundData';
import { PayrollBatch, getStoredBatches } from '@/lib/payrollData';
import { getStoredPredictions, LifespanPredictionRecord } from '@/lib/lifespanData';

export default function AuditorDashboard() {
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

  const activeFunds = useMemo(() => funds.filter(f => f.status === 'Active'), [funds]);

  const totalInflows = useMemo(() => {
    return transactions.filter(t => t.direction === 'INFLOW').reduce((sum, t) => sum + (t.amount || 0), 0);
  }, [transactions]);

  const totalOutflows = useMemo(() => {
    return transactions.filter(t => t.direction === 'OUTFLOW').reduce((sum, t) => sum + (t.amount || 0), 0);
  }, [transactions]);

  const totalExceptions = useMemo(() => {
    return payrollBatches.reduce((sum, b) => sum + (b.exceptionCount || 0), 0);
  }, [payrollBatches]);

  // Dual flow reconciliation data
  const reconciliationData = useMemo(() => {
    return [
      { month: 'Jun 2026', inflows: 120000, outflows: 135000, variance: -15000 },
      { month: 'Jul 2026', inflows: 130000, outflows: 123000, variance: 7000 },
      { month: 'Aug 2026', inflows: 124000, outflows: 151000, variance: -27000 },
      { month: 'Sep 2026', inflows: 140000, outflows: 145000, variance: -5000 },
      { month: 'Oct 2026', inflows: 150000, outflows: 172000, variance: -22000 },
    ];
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
        {/* Financial Compliance KPI Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: Cross-Ledger Inflow Audit */}
          <div className={`${ultraGlassCard} !p-5 space-y-1`}>
            <div className="flex items-center justify-between gap-2">
              <span className="text-[10.5px] font-bold text-[#04152d]/60 uppercase tracking-wider truncate">
                Audited Inflows Total
              </span>
              <span className="p-1 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 shrink-0">
                <ArrowUpRight size={14} />
              </span>
            </div>
            <div className="text-[22px] font-extrabold text-emerald-700 tracking-tight">
              +{formatCurrency(totalInflows || 345000)}
            </div>
          </div>

          {/* Card 2: Audited Outflows Total */}
          <div className={`${ultraGlassCard} !p-5 space-y-1`}>
            <div className="flex items-center justify-between gap-2">
              <span className="text-[10.5px] font-bold text-[#04152d]/60 uppercase tracking-wider truncate">
                Audited Outflows Total
              </span>
              <span className="p-1 rounded-lg bg-rose-50 text-rose-700 border border-rose-200 shrink-0">
                <ArrowDownLeft size={14} />
              </span>
            </div>
            <div className="text-[22px] font-extrabold text-rose-700 tracking-tight">
              -{formatCurrency(totalOutflows || 260000)}
            </div>
          </div>

          {/* Card 3: Payroll Exceptions Flagged */}
          <div className={`${ultraGlassCard} !p-5 space-y-1`}>
            <div className="flex items-center justify-between gap-2">
              <span className="text-[10.5px] font-bold text-[#04152d]/60 uppercase tracking-wider truncate">
                Payroll Exceptions
              </span>
              <span className={`shrink-0 whitespace-nowrap inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider leading-none shadow-2xs border ${
                totalExceptions > 0 ? 'bg-amber-50 text-amber-800 border-amber-200' : 'bg-emerald-50 text-emerald-800 border-emerald-200'
              }`}>
                {totalExceptions > 0 ? 'Requires Audit' : 'Clean'}
              </span>
            </div>
            <div className="text-[22px] font-extrabold text-[#04152d] tracking-tight">
              {totalExceptions} Items
            </div>
          </div>

          {/* Card 4: Actuarial Evaluations Audited */}
          <div className={`${ultraGlassCard} !p-5 space-y-1`}>
            <div className="flex items-center justify-between gap-2">
              <span className="text-[10.5px] font-bold text-[#04152d]/60 uppercase tracking-wider truncate">
                Lifespan Audits
              </span>
              <span className="shrink-0 whitespace-nowrap inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-blue-50 text-blue-800 border border-blue-200 leading-none shadow-2xs">
                Tracked
              </span>
            </div>
            <div className="text-[22px] font-extrabold text-blue-700 tracking-tight">
              {predictions.length} Historical Runs
            </div>
          </div>
        </div>

        {/* Cross-Ledger Balance Verification Chart - Full Width Executive Analytics */}
        <div className={`${ultraGlassCard} !p-6 space-y-4`}>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-100 pb-3">
            <div>
              <h3 className="text-[16px] font-bold text-[#04152d] tracking-tight">
                Cross-Ledger Balance Verification (Inflows vs Disbursements)
              </h3>
            </div>
            <div className="flex items-center gap-3 text-[11px] font-semibold shrink-0">
              <span className="flex items-center gap-1.5 text-emerald-700">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> Inflows
              </span>
              <span className="flex items-center gap-1.5 text-rose-700">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500" /> Disbursements
              </span>
              <span className="flex items-center gap-1.5 text-[#04152d]">
                <span className="w-3 h-0.5 bg-[#04152d]" /> Net Period Variance
              </span>
            </div>
          </div>

          <div className="h-[290px] w-full pt-1">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={reconciliationData} margin={{ top: 10, right: 15, left: 10, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(4,21,45,0.06)" />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#04152d', fontWeight: 600 }} stroke="rgba(4,21,45,0.15)" />
                <YAxis tick={{ fontSize: 11, fill: '#04152d', fontWeight: 600 }} stroke="rgba(4,21,45,0.15)" tickFormatter={(v) => `₱${(v/1000).toFixed(0)}k`} />
                <ChartTooltip 
                  formatter={(val: any) => [`₱${Number(val).toLocaleString()}`, '']}
                  contentStyle={{ borderRadius: '14px', border: '1px solid #e5e7eb', boxShadow: '0 8px 30px rgba(0,0,0,0.08)' }}
                />
                <Bar dataKey="inflows" name="Posted Inflows" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={28} />
                <Bar dataKey="outflows" name="Executed Disbursements" fill="#f43f5e" radius={[4, 4, 0, 0]} maxBarSize={28} />
                <Line type="monotone" dataKey="variance" name="Net Period Variance" stroke="#04152d" strokeWidth={2.5} dot={{ r: 4, fill: '#04152d' }} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>

          {/* Integrated Analytics Stat Strip */}
          <div className="pt-3 border-t border-gray-100 grid grid-cols-2 md:grid-cols-4 gap-3 text-center">
            <div className="p-2.5 bg-gray-50/70 rounded-xl border border-gray-100">
              <span className="text-[10px] text-[#04152d]/50 font-bold uppercase tracking-wider block">Net Variance</span>
              <span className="text-[13px] font-extrabold text-rose-700">Oct: -₱22,000</span>
            </div>
            <div className="p-2.5 bg-gray-50/70 rounded-xl border border-gray-100">
              <span className="text-[10px] text-[#04152d]/50 font-bold uppercase tracking-wider block">Reconciliation</span>
              <span className="text-[13px] font-extrabold text-emerald-700">99.8% Matched</span>
            </div>
            <div className="p-2.5 bg-gray-50/70 rounded-xl border border-gray-100">
              <span className="text-[10px] text-[#04152d]/50 font-bold uppercase tracking-wider block">Audit Horizon</span>
              <span className="text-[13px] font-extrabold text-blue-700">5 Mo. Reconciled</span>
            </div>
            <div className="p-2.5 bg-gray-50/70 rounded-xl border border-gray-100">
              <span className="text-[10px] text-[#04152d]/50 font-bold uppercase tracking-wider block">Discrepancies</span>
              <span className="text-[13px] font-extrabold text-emerald-700">0 Critical Flags</span>
            </div>
          </div>
        </div>

        {/* Operational Section: Audit Modules & Master Ledger Status */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          {/* Left: Audit Trail Modules (2 cols) */}
          <div className={`lg:col-span-2 ${ultraGlassCard} !p-6 space-y-4`}>
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div className="flex items-center gap-2">
                <Clock size={18} className="text-indigo-700" />
                <h3 className="text-[15px] font-bold text-[#04152d] tracking-tight">
                  Audit Modules & Verification Consoles
                </h3>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-[12px]">
              <Link href="/auditor/disbursement" className="p-3.5 bg-white rounded-xl border border-gray-200/80 shadow-2xs hover:border-blue-400 hover:shadow-xs transition-all space-y-1 block">
                <span className="font-bold text-[#04152d] block text-[13px]">Disbursement Vouchers</span>
                <span className="text-[10px] text-blue-700 font-bold inline-flex items-center gap-0.5 pt-1">Open Audit &rarr;</span>
              </Link>

              <Link href="/auditor/collections" className="p-3.5 bg-white rounded-xl border border-gray-200/80 shadow-2xs hover:border-blue-400 hover:shadow-xs transition-all space-y-1 block">
                <span className="font-bold text-[#04152d] block text-[13px]">Collections Register</span>
                <span className="text-[10px] text-blue-700 font-bold inline-flex items-center gap-0.5 pt-1">Open Audit &rarr;</span>
              </Link>

              <Link href="/auditor/payroll" className="p-3.5 bg-white rounded-xl border border-gray-200/80 shadow-2xs hover:border-blue-400 hover:shadow-xs transition-all space-y-1 block">
                <span className="font-bold text-[#04152d] block text-[13px]">Payroll Remittances</span>
                <span className="text-[10px] text-blue-700 font-bold inline-flex items-center gap-0.5 pt-1">Open Audit &rarr;</span>
              </Link>

              <Link href="/auditor/lifespan" className="p-3.5 bg-white rounded-xl border border-gray-200/80 shadow-2xs hover:border-blue-400 hover:shadow-xs transition-all space-y-1 block">
                <span className="font-bold text-[#04152d] block text-[13px]">Lifespan Simulations</span>
                <span className="text-[10px] text-blue-700 font-bold inline-flex items-center gap-0.5 pt-1">Open Audit &rarr;</span>
              </Link>
            </div>
          </div>

          {/* Right: Master Funds Audit Overview (1 col) */}
          <div className={`${ultraGlassCard} !p-6 space-y-4`}>
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h3 className="text-[15px] font-bold text-[#04152d] tracking-tight">
                Master Ledger Audit Status
              </h3>
              <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-200 shrink-0">
                Audited
              </span>
            </div>

            <div className="space-y-2.5">
              {activeFunds.slice(0, 4).map(fund => {
                const bal = calculateFundBreakdown(fund, transactions).currentBalance;
                return (
                  <div key={fund.id} className="p-3 bg-white rounded-xl border border-gray-200/80 shadow-2xs flex items-center justify-between text-[12px]">
                    <div>
                      <span className="font-bold text-[#04152d] block">{fund.name}</span>
                      <span className="text-[10px] font-mono text-[#04152d]/50">{fund.code} • {fund.status}</span>
                    </div>
                    <span className="font-extrabold text-blue-700 font-mono">{formatCurrency(bal)}</span>
                  </div>
                );
              })}
            </div>

            <Link
              href="/auditor/funds"
              className="w-full py-2 bg-white hover:bg-gray-100 text-[#04152d] border border-gray-200 rounded-full text-[11px] font-bold shadow-xs transition-all flex items-center justify-center gap-1.5 active:scale-95 cursor-pointer text-center block"
            >
              Examine Funds Ledger <ArrowRight size={13} />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
