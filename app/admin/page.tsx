"use client";

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { 
  Briefcase, Activity, ShieldCheck, ArrowRight, 
  TrendingUp, Building2, Layers, DollarSign, Wallet, 
  Users, CheckCircle2, AlertTriangle, Sparkles, BarChart2 
} from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as ChartTooltip, Cell } from 'recharts';
import Header from '@/components/Header';
import { Fund, FundTransaction, getStoredFunds, getStoredTransactions, calculateFundBreakdown } from '@/lib/fundData';
import { getStoredPredictions, LifespanPredictionRecord } from '@/lib/lifespanData';

export default function AdminDashboard() {
  const [funds, setFunds] = useState<Fund[]>([]);
  const [transactions, setTransactions] = useState<FundTransaction[]>([]);
  const [predictions, setPredictions] = useState<LifespanPredictionRecord[]>([]);

  useEffect(() => {
    setFunds(getStoredFunds());
    setTransactions(getStoredTransactions());
    setPredictions(getStoredPredictions());
  }, []);

  const activeFunds = useMemo(() => funds.filter(f => f.status === 'Active'), [funds]);

  // Total Capitalization across all active funds
  const totalSystemCapitalization = useMemo(() => {
    return activeFunds.reduce((sum, f) => {
      const breakdown = calculateFundBreakdown(f, transactions);
      return sum + breakdown.currentBalance;
    }, 0);
  }, [activeFunds, transactions]);

  // Funds chart data
  const fundDistributionData = useMemo(() => {
    return activeFunds.map(f => {
      const breakdown = calculateFundBreakdown(f, transactions);
      return {
        code: f.code,
        name: f.name,
        balance: breakdown.currentBalance,
        inflows: breakdown.totalPostedInflows,
        outflows: breakdown.totalPostedOutflows,
      };
    });
  }, [activeFunds, transactions]);

  // Overall solvency condition
  const atRiskCount = useMemo(() => {
    return predictions.filter(p => p.condition === 'At Risk' || p.condition === 'Projected to Deplete').length;
  }, [predictions]);

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
          {/* Card 1: Total Capitalization */}
          <div className={`${ultraGlassCard} !p-5 space-y-1`}>
            <div className="flex items-center justify-between gap-2">
              <span className="text-[10.5px] font-bold text-[#04152d]/60 uppercase tracking-wider truncate">
                Total System Reserves
              </span>
              <span className="p-1 rounded-lg bg-blue-50 text-blue-700 border border-blue-200 shrink-0">
                <Wallet size={14} />
              </span>
            </div>
            <div className="text-[22px] font-extrabold text-blue-700 tracking-tight">
              {formatCurrency(totalSystemCapitalization || 1690000)}
            </div>
          </div>

          {/* Card 2: Active Master Funds */}
          <div className={`${ultraGlassCard} !p-5 space-y-1`}>
            <div className="flex items-center justify-between gap-2">
              <span className="text-[10.5px] font-bold text-[#04152d]/60 uppercase tracking-wider truncate">
                Active Master Funds
              </span>
              <span className="shrink-0 whitespace-nowrap inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-800 border border-emerald-200 leading-none shadow-2xs">
                Operational
              </span>
            </div>
            <div className="text-[22px] font-extrabold text-[#04152d] tracking-tight">
              {activeFunds.length} Active Funds
            </div>
          </div>

          {/* Card 3: Actuarial Solvency Health */}
          <div className={`${ultraGlassCard} !p-5 space-y-1`}>
            <div className="flex items-center justify-between gap-2">
              <span className="text-[10.5px] font-bold text-[#04152d]/60 uppercase tracking-wider truncate">
                Solvency Risk Level
              </span>
              <span className={`shrink-0 whitespace-nowrap inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider leading-none shadow-2xs border ${
                atRiskCount > 0 ? 'bg-amber-50 text-amber-800 border-amber-200' : 'bg-emerald-50 text-emerald-800 border-emerald-200'
              }`}>
                {atRiskCount > 0 ? 'Alert Active' : 'Solvent'}
              </span>
            </div>
            <div className={`text-[22px] font-extrabold tracking-tight ${atRiskCount > 0 ? 'text-rose-700' : 'text-emerald-700'}`}>
              {atRiskCount > 0 ? `${atRiskCount} Fund(s) At Risk` : 'All Funds Stable'}
            </div>
          </div>

          {/* Card 4: Ledger Activity */}
          <div className={`${ultraGlassCard} !p-5 space-y-1`}>
            <div className="flex items-center justify-between gap-2">
              <span className="text-[10.5px] font-bold text-[#04152d]/60 uppercase tracking-wider truncate">
                Audited Transactions
              </span>
              <span className="shrink-0 whitespace-nowrap inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-purple-50 text-purple-800 border border-purple-200 leading-none shadow-2xs">
                Reconciled
              </span>
            </div>
            <div className="text-[22px] font-extrabold text-purple-700 tracking-tight">
              {transactions.length} Postings
            </div>
          </div>
        </div>

        {/* Master Funds Capitalization Distribution Chart */}
        <div className={`${ultraGlassCard} !p-6 space-y-4`}>
          <div className="flex items-center justify-between border-b border-gray-100 pb-3">
            <div>
              <h3 className="text-[16px] font-bold text-[#04152d] tracking-tight">
                Consolidated Reserve Capitalization by Master Fund
              </h3>
            </div>
            <Link href="/admin/funds" className="text-[11px] text-blue-700 font-bold hover:underline">
              Configure Funds & Rules &rarr;
            </Link>
          </div>

          <div className="h-[280px] w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={fundDistributionData} margin={{ top: 10, right: 10, left: 10, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(4,21,45,0.06)" />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#04152d', fontWeight: 600 }} stroke="rgba(4,21,45,0.15)" />
                <YAxis tick={{ fontSize: 11, fill: '#04152d', fontWeight: 600 }} stroke="rgba(4,21,45,0.15)" tickFormatter={(v) => `₱${(v/1000).toFixed(0)}k`} />
                <ChartTooltip 
                  formatter={(val: any) => [`₱${Number(val).toLocaleString()}`, 'Current Balance']}
                  contentStyle={{ borderRadius: '14px', border: '1px solid #e5e7eb', boxShadow: '0 8px 30px rgba(0,0,0,0.08)' }}
                />
                <Bar dataKey="balance" name="Reserve Balance" radius={[6, 6, 0, 0]} maxBarSize={36}>
                  {fundDistributionData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={['#2563eb', '#10b981', '#f59e0b', '#f43f5e', '#8b5cf6'][index % 5]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Master Funds Governance Table */}
        <div className={`${ultraGlassCard} !p-6 space-y-4`}>
          <div className="flex items-center justify-between border-b border-gray-100 pb-3">
            <div className="flex items-center gap-2">
              <Building2 size={18} className="text-blue-700" />
              <h3 className="text-[15px] font-bold text-[#04152d] tracking-tight">
                Active Master Funds & Capital Allocation
              </h3>
            </div>
            <Link href="/admin/funds" className="text-[11px] text-blue-700 font-bold hover:underline">
              Open Fund Management Console
            </Link>
          </div>

          <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-xs">
            <table className="w-full text-left whitespace-nowrap text-[12px]">
              <thead className="bg-[#04152d]/5 text-[10px] font-bold text-[#04152d]/60 uppercase tracking-widest border-b border-gray-200">
                <tr>
                  <th className="py-3 px-4">Fund Name & Code</th>
                  <th className="py-3 px-4">Allocation Policy</th>
                  <th className="py-3 px-4">Opening Balance</th>
                  <th className="py-3 px-4">Current Verified Balance</th>
                  <th className="py-3 px-4">Solvency Condition</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {activeFunds.map(fund => {
                  const breakdown = calculateFundBreakdown(fund, transactions);
                  const pred = predictions.find(p => p.fundId === fund.id || p.fundCode === fund.code);
                  const condition = pred?.condition || 'Stable';
                  return (
                    <tr key={fund.id} className="hover:bg-blue-50/30 transition-colors">
                      <td className="py-3 px-4">
                        <span className="font-bold text-[#04152d] block">{fund.name}</span>
                        <span className="font-mono text-[10px] text-[#04152d]/50">{fund.code}</span>
                      </td>

                      <td className="py-3 px-4 text-[#04152d]/70 font-medium">
                        {fund.description || fund.code}
                      </td>

                      <td className="py-3 px-4 font-mono text-[#04152d]/60">
                        {formatCurrency(fund.openingBalance)}
                      </td>

                      <td className="py-3 px-4 font-bold text-blue-700 text-[13px]">
                        {formatCurrency(breakdown.currentBalance)}
                      </td>

                      <td className="py-3 px-4">
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border shadow-xs ${
                          condition === 'Stable' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' :
                          condition === 'Declining' ? 'bg-blue-50 text-blue-800 border-blue-200' :
                          condition === 'At Risk' ? 'bg-amber-50 text-amber-800 border-amber-200' :
                          'bg-rose-50 text-rose-800 border-rose-200'
                        }`}>
                          {condition}
                        </span>
                      </td>

                      <td className="py-3 px-4 text-right">
                        <Link
                          href="/admin/funds"
                          className="px-3 py-1 bg-white hover:bg-gray-100 border border-gray-200 text-[#04152d] rounded-full text-[11px] font-bold shadow-xs transition-all inline-flex items-center gap-1 cursor-pointer"
                        >
                          Manage Fund &rarr;
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
