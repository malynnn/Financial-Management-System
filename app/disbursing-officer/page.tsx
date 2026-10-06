"use client";

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { 
  Send, Briefcase, Activity, ArrowDownLeft, Clock, 
  CheckCircle2, AlertCircle, ShieldAlert, ArrowRight, 
  CreditCard, FileText, ChevronRight, TrendingDown, 
  Sparkles, Layers, DollarSign 
} from 'lucide-react';
import { ResponsiveContainer, ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip as ChartTooltip } from 'recharts';
import Header from '@/components/Header';
import { Fund, FundTransaction, getStoredFunds, getStoredTransactions, calculateFundBreakdown } from '@/lib/fundData';
import { getStoredPredictions, LifespanPredictionRecord } from '@/lib/lifespanData';

export default function DisbursingOfficerDashboard() {
  const [funds, setFunds] = useState<Fund[]>([]);
  const [transactions, setTransactions] = useState<FundTransaction[]>([]);
  const [predictions, setPredictions] = useState<LifespanPredictionRecord[]>([]);

  useEffect(() => {
    setFunds(getStoredFunds());
    setTransactions(getStoredTransactions());
    setPredictions(getStoredPredictions());
  }, []);

  const activeFunds = useMemo(() => funds.filter(f => f.status === 'Active'), [funds]);

  // Outflow transactions
  const outflowTransactions = useMemo(() => {
    return transactions.filter(t => t.direction === 'OUTFLOW');
  }, [transactions]);

  const totalDisbursedAmount = useMemo(() => {
    return outflowTransactions.reduce((sum, t) => sum + (t.amount || 0), 0);
  }, [outflowTransactions]);

  // Active depletion alerts
  const activeAlertPredictions = useMemo(() => {
    return predictions.filter(p => p.alertActive);
  }, [predictions]);

  // Monthly outflow category data
  const monthlyOutflowData = useMemo(() => {
    return [
      { label: 'Jun 2026', loans: 60000, deathClaims: 40000, calamity: 20000, ops: 15000, total: 135000 },
      { label: 'Jul 2026', loans: 55000, deathClaims: 35000, calamity: 15000, ops: 18000, total: 123000 },
      { label: 'Aug 2026', loans: 70000, deathClaims: 40000, calamity: 25000, ops: 16000, total: 151000 },
      { label: 'Sep 2026', loans: 65000, deathClaims: 40000, calamity: 20000, ops: 20000, total: 145000 },
      { label: 'Oct 2026', loans: 75000, deathClaims: 45000, calamity: 30000, ops: 22000, total: 172000 },
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
        {/* Depletion Risk Alert Banner */}
        {activeAlertPredictions.length > 0 && (
          <div className="bg-gradient-to-r from-rose-50/90 to-amber-50/90 backdrop-blur-xl border border-rose-200/80 p-4 rounded-[22px] shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-fade-in">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-rose-100 text-rose-700 flex items-center justify-center shrink-0 border border-rose-300">
                <ShieldAlert size={20} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="text-[14px] font-bold text-[#04152d]">
                    Depletion Alert Active on Disbursable Fund
                  </h4>
                  <span className="shrink-0 whitespace-nowrap inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-rose-200 text-rose-900 border border-rose-300">
                    {activeAlertPredictions.length} Fund Flagged
                  </span>
                </div>
                <p className="text-[12px] text-[#04152d]/70 font-medium mt-0.5">
                  {activeAlertPredictions[0]?.alertSummary || 'A disbursable fund is projected to exhaust reserves within finite timeframe.'}
                </p>
              </div>
            </div>

            <Link
              href="/disbursing-officer/lifespan"
              className="px-4 py-2 bg-rose-700 hover:bg-rose-800 text-white rounded-full text-[11px] font-bold shadow-xs transition-all active:scale-95 shrink-0 cursor-pointer self-start sm:self-auto"
            >
              Inspect Depletion Timeline
            </Link>
          </div>
        )}

        {/* Financial KPI Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: Total Disbursements Executed */}
          <div className={`${ultraGlassCard} !p-5 space-y-1`}>
            <div className="flex items-center justify-between gap-2">
              <span className="text-[10.5px] font-bold text-[#04152d]/60 uppercase tracking-wider truncate">
                Total Executed Outflows
              </span>
              <span className="p-1 rounded-lg bg-rose-50 text-rose-700 border border-rose-200 shrink-0">
                <ArrowDownLeft size={14} />
              </span>
            </div>
            <div className="text-[22px] font-extrabold text-rose-700 tracking-tight">
              -{formatCurrency(totalDisbursedAmount || 260000)}
            </div>
          </div>

          {/* Card 2: Pending Release Queue */}
          <div className={`${ultraGlassCard} !p-5 space-y-1`}>
            <div className="flex items-center justify-between gap-2">
              <span className="text-[10.5px] font-bold text-[#04152d]/60 uppercase tracking-wider truncate">
                Pending Cheques / Vouchers
              </span>
              <span className="shrink-0 whitespace-nowrap inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-50 text-amber-800 border border-amber-200 leading-none shadow-2xs">
                Awaiting Release
              </span>
            </div>
            <div className="text-[22px] font-extrabold text-[#04152d] tracking-tight">
              3 Approvals
            </div>
          </div>

          {/* Card 3: Solvency Horizon */}
          <div className={`${ultraGlassCard} !p-5 space-y-1`}>
            <div className="flex items-center justify-between gap-2">
              <span className="text-[10.5px] font-bold text-[#04152d]/60 uppercase tracking-wider truncate">
                Critical Solvency Mark
              </span>
              <span className="shrink-0 whitespace-nowrap inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-rose-50 text-rose-800 border border-rose-200 leading-none shadow-2xs">
                DAF Fund
              </span>
            </div>
            <div className="text-[22px] font-extrabold text-rose-700 tracking-tight">
              ~2.5 Months
            </div>
          </div>

          {/* Card 4: Disbursable Master Funds */}
          <div className={`${ultraGlassCard} !p-5 space-y-1`}>
            <div className="flex items-center justify-between gap-2">
              <span className="text-[10.5px] font-bold text-[#04152d]/60 uppercase tracking-wider truncate">
                Active Source Funds
              </span>
              <span className="shrink-0 whitespace-nowrap inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-blue-50 text-blue-800 border border-blue-200 leading-none shadow-2xs">
                Liquidity
              </span>
            </div>
            <div className="text-[22px] font-extrabold text-blue-700 tracking-tight">
              {activeFunds.length} Master Funds
            </div>
          </div>
        </div>

        {/* Outflow Category Breakdown Chart - Full Width Executive Analytics */}
        <div className={`${ultraGlassCard} !p-6 space-y-4`}>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-100 pb-3">
            <div>
              <h3 className="text-[16px] font-bold text-[#04152d] tracking-tight">
                Disbursement Outflow Distribution by Category
              </h3>
            </div>
            <div className="flex items-center gap-3 text-[11px] font-semibold shrink-0">
              <span className="flex items-center gap-1.5 text-blue-700">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-600" /> Loans
              </span>
              <span className="flex items-center gap-1.5 text-rose-700">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500" /> Death Claims
              </span>
              <span className="flex items-center gap-1.5 text-amber-700">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500" /> Calamity Aid
              </span>
              <span className="flex items-center gap-1.5 text-[#04152d]">
                <span className="w-3 h-0.5 bg-[#04152d]" /> Total Outflows
              </span>
            </div>
          </div>

          <div className="h-[290px] w-full pt-1">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={monthlyOutflowData} margin={{ top: 10, right: 15, left: 10, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(4,21,45,0.06)" />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#04152d', fontWeight: 600 }} stroke="rgba(4,21,45,0.15)" />
                <YAxis tick={{ fontSize: 11, fill: '#04152d', fontWeight: 600 }} stroke="rgba(4,21,45,0.15)" tickFormatter={(v) => `₱${(v/1000).toFixed(0)}k`} />
                <ChartTooltip 
                  formatter={(val: any) => [`₱${Number(val).toLocaleString()}`, '']}
                  contentStyle={{ borderRadius: '14px', border: '1px solid #e5e7eb', boxShadow: '0 8px 30px rgba(0,0,0,0.08)' }}
                />
                <Bar dataKey="loans" name="Loan Releases" fill="#2563eb" radius={[4, 4, 0, 0]} maxBarSize={28} />
                <Bar dataKey="deathClaims" name="Bereavement Claims" fill="#f43f5e" radius={[4, 4, 0, 0]} maxBarSize={28} />
                <Bar dataKey="calamity" name="Calamity Aid" fill="#f59e0b" radius={[4, 4, 0, 0]} maxBarSize={28} />
                <Line type="monotone" dataKey="total" name="Total Outflows" stroke="#04152d" strokeWidth={2.5} dot={{ r: 4, fill: '#04152d' }} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>

          {/* Integrated Analytics Stat Strip */}
          <div className="pt-3 border-t border-gray-100 grid grid-cols-2 md:grid-cols-4 gap-3 text-center">
            <div className="p-2.5 bg-gray-50/70 rounded-xl border border-gray-100">
              <span className="text-[10px] text-[#04152d]/50 font-bold uppercase tracking-wider block">Peak Outflow</span>
              <span className="text-[13px] font-extrabold text-[#04152d]">Oct 2026 (₱172k)</span>
            </div>
            <div className="p-2.5 bg-gray-50/70 rounded-xl border border-gray-100">
              <span className="text-[10px] text-[#04152d]/50 font-bold uppercase tracking-wider block">Top Category</span>
              <span className="text-[13px] font-extrabold text-blue-700">Member Loans</span>
            </div>
            <div className="p-2.5 bg-gray-50/70 rounded-xl border border-gray-100">
              <span className="text-[10px] text-[#04152d]/50 font-bold uppercase tracking-wider block">Monthly Average</span>
              <span className="text-[13px] font-extrabold text-rose-700">₱145,200</span>
            </div>
            <div className="p-2.5 bg-gray-50/70 rounded-xl border border-gray-100">
              <span className="text-[10px] text-[#04152d]/50 font-bold uppercase tracking-wider block">Cumulative Outflows</span>
              <span className="text-[13px] font-extrabold text-[#04152d]">₱726,000</span>
            </div>
          </div>
        </div>

        {/* Operational Section: Recent Executed Vouchers & Fund Reserve Liquidity */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          {/* Recent Executed Disbursements Table */}
          <div className={`lg:col-span-2 ${ultraGlassCard} !p-6 space-y-4`}>
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div className="flex items-center gap-2">
                <Send size={18} className="text-rose-700" />
                <h3 className="text-[15px] font-bold text-[#04152d] tracking-tight">
                  Recent Executed Disbursement Vouchers
                </h3>
              </div>
              <Link href="/disbursing-officer/disbursement" className="text-[11px] text-blue-700 font-bold hover:underline">
                Open Disbursement Console &rarr;
              </Link>
            </div>

            <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-xs">
              <table className="w-full text-left whitespace-nowrap text-[12px]">
                <thead className="bg-[#04152d]/5 text-[10px] font-bold text-[#04152d]/60 uppercase tracking-widest border-b border-gray-200">
                  <tr>
                    <th className="py-2.5 px-3.5">Voucher Ref</th>
                    <th className="py-2.5 px-3.5">Payee / Beneficiary</th>
                    <th className="py-2.5 px-3.5">Particulars</th>
                    <th className="py-2.5 px-3.5">Date</th>
                    <th className="py-2.5 px-3.5 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {outflowTransactions.slice(0, 5).map(tx => (
                    <tr key={tx.id} className="hover:bg-rose-50/20 transition-colors">
                      <td className="py-2.5 px-3.5 font-mono font-bold text-blue-700 text-[11px]">
                        {tx.sourceRef}
                      </td>
                      <td className="py-2.5 px-3.5 font-bold text-[#04152d]">
                        {tx.payeeOrPayer}
                      </td>
                      <td className="py-2.5 px-3.5 text-[#04152d]/70 text-[11px] max-w-[200px] truncate">
                        {tx.particulars}
                      </td>
                      <td className="py-2.5 px-3.5 text-[11px] text-[#04152d]/50 font-mono">
                        {tx.date}
                      </td>
                      <td className="py-2.5 px-3.5 text-right font-extrabold text-rose-700 font-mono">
                        -{formatCurrency(tx.amount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Disbursable Fund Liquidity */}
          <div className={`${ultraGlassCard} !p-6 space-y-4`}>
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h3 className="text-[15px] font-bold text-[#04152d] tracking-tight">
                Fund Reserve Liquidity
              </h3>
              <span className="text-[10px] font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200 shrink-0">
                Outflow Capacity
              </span>
            </div>

            <div className="space-y-2.5">
              {activeFunds.slice(0, 4).map(fund => {
                const bal = calculateFundBreakdown(fund, transactions).currentBalance;
                const isDepleting = fund.code === 'DAF';
                return (
                  <div key={fund.id} className="p-3 bg-white rounded-xl border border-gray-200/80 shadow-2xs flex items-center justify-between text-[12px]">
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-[#04152d]">{fund.name}</span>
                        {isDepleting && (
                          <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-rose-100 text-rose-800">
                            Burn Alert
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] font-mono text-[#04152d]/50">{fund.code}</span>
                    </div>
                    <span className={`font-extrabold font-mono ${isDepleting ? 'text-rose-700' : 'text-blue-700'}`}>
                      {formatCurrency(bal)}
                    </span>
                  </div>
                );
              })}
            </div>

            <Link
              href="/disbursing-officer/funds"
              className="w-full py-2 bg-white hover:bg-gray-100 text-[#04152d] border border-gray-200 rounded-full text-[11px] font-bold shadow-xs transition-all flex items-center justify-center gap-1.5 active:scale-95 cursor-pointer text-center block"
            >
              View Full Outflows Ledger <ArrowRight size={13} />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
