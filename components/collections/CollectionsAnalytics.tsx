"use client";

import React, { useMemo, useState } from 'react';
import { 
  CheckCircle2, Clock, XCircle, Banknote, 
  BarChart2, ChevronDown, ChevronUp, Activity, 
  ArrowUpRight, ShieldCheck, Filter, PieChart, Layers
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, 
  Tooltip as ChartTooltip, ResponsiveContainer, Cell, Legend 
} from 'recharts';

interface Collection {
  id: string;
  ref: string;
  memberId: string;
  memberName: string;
  amount: number;
  date: string;
  method: string;
  status: 'Pending' | 'For Verification' | 'Posted' | 'Rejected' | string;
  isReconciled?: boolean;
}

interface Props {
  collections: Collection[];
  startDate?: string;
  endDate?: string;
}

export default function CollectionsAnalytics({ collections, startDate, endDate }: Props) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [chartMetricFilter, setChartMetricFilter] = useState<'all' | 'posted' | 'pending' | 'rejected'>('all');

  // Compute KPIs and timeline data dynamically from the collections
  const { 
    totalAmount, 
    totalCount, 
    postedAmount, 
    postedCount, 
    pendingAmount, 
    pendingCount, 
    rejectedAmount, 
    rejectedCount,
    approvalRate,
    allDateRows,
    latestCollection,
    methodBreakdown
  } = useMemo(() => {
    let total = 0;
    let postedAmt = 0;
    let pendingAmt = 0;
    let rejectedAmt = 0;

    let postedCnt = 0;
    let pendingCnt = 0;
    let rejectedCnt = 0;

    const dateMap: Record<string, { date: string; displayDate: string; posted: number; pending: number; rejected: number; total: number }> = {};
    const methodMap: Record<string, { count: number; total: number }> = {};

    // Sort collections by date
    const sorted = [...collections].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    sorted.forEach((c) => {
      const amt = Number(c.amount) || 0;
      total += amt;

      const norm = (c.status || '').toLowerCase();
      if (norm === 'posted') {
        postedAmt += amt;
        postedCnt += 1;
      } else if (norm === 'rejected') {
        rejectedAmt += amt;
        rejectedCnt += 1;
      } else {
        pendingAmt += amt;
        pendingCnt += 1;
      }

      // Group by date
      const rawDate = c.date || 'Unknown';
      if (!dateMap[rawDate]) {
        let display = rawDate;
        try {
          const parts = rawDate.split('-');
          if (parts.length === 3) {
            const d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
            display = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
          }
        } catch {
          // fallback
        }
        dateMap[rawDate] = { date: rawDate, displayDate: display, posted: 0, pending: 0, rejected: 0, total: 0 };
      }

      dateMap[rawDate].total += amt;
      if (norm === 'posted') dateMap[rawDate].posted += amt;
      else if (norm === 'rejected') dateMap[rawDate].rejected += amt;
      else dateMap[rawDate].pending += amt;

      // Method distribution
      const m = c.method || 'Other';
      if (!methodMap[m]) methodMap[m] = { count: 0, total: 0 };
      methodMap[m].count += 1;
      methodMap[m].total += amt;
    });

    const totalCnt = collections.length;
    const rate = totalCnt > 0 ? Math.round((postedCnt / totalCnt) * 100) : 0;
    const allDateRows = Object.values(dateMap);
    const latest = sorted.length > 0 ? sorted[sorted.length - 1] : null;

    return {
      totalAmount: total,
      totalCount: totalCnt,
      postedAmount: postedAmt,
      postedCount: postedCnt,
      pendingAmount: pendingAmt,
      pendingCount: pendingCnt,
      rejectedAmount: rejectedAmt,
      rejectedCount: rejectedCnt,
      approvalRate: rate,
      allDateRows,
      latestCollection: latest,
      methodBreakdown: methodMap
    };
  }, [collections]);

  const formatCurrency = (val: number) => {
    return `₱${val.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  // Determine active chart rows based on selected status filter
  const activeChartData = useMemo(() => {
    let rows = allDateRows;
    if (chartMetricFilter === 'posted') {
      rows = allDateRows.filter(r => r.posted > 0);
    } else if (chartMetricFilter === 'rejected') {
      rows = allDateRows.filter(r => r.rejected > 0);
    } else if (chartMetricFilter === 'pending') {
      rows = allDateRows.filter(r => r.pending > 0);
    }
    return rows.slice(-12);
  }, [allDateRows, chartMetricFilter]);

  const hasDataForSelectedFilter = useMemo(() => {
    if (chartMetricFilter === 'all') return allDateRows.length > 0 && totalAmount > 0;
    if (chartMetricFilter === 'posted') return postedCount > 0 && activeChartData.length > 0;
    if (chartMetricFilter === 'pending') return pendingCount > 0 && activeChartData.length > 0;
    if (chartMetricFilter === 'rejected') return rejectedCount > 0 && activeChartData.length > 0;
    return true;
  }, [chartMetricFilter, allDateRows, totalAmount, postedCount, pendingCount, rejectedCount, activeChartData]);

  const ultraGlassCard = "bg-white/50 backdrop-blur-[40px] backdrop-saturate-[200%] border border-white/80 shadow-[0_8px_30px_rgba(4,21,45,0.06),inset_0_2px_3px_rgba(255,255,255,0.9)] rounded-[24px] p-6 relative overflow-hidden";

  return (
    <div className="space-y-4">
      {/* 4 KPI Widgets Styled Exactly like the BDOEA System Design */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        
        {/* Total Inflow */}
        <div className={`${ultraGlassCard} !p-5 flex items-center gap-4`}>
          <div className="w-12 h-12 bg-white/90 border border-white rounded-[16px] shadow-sm flex items-center justify-center shrink-0">
            <Banknote size={22} className="text-blue-600" />
          </div>
          <div className="overflow-hidden">
            <span className="block text-[10px] font-semibold text-[#04152d]/50 uppercase tracking-widest truncate">
              Total Inflow Volume
            </span>
            <span className="block text-[22px] font-semibold text-[#04152d] tracking-tighter mt-0.5 truncate">
              {formatCurrency(totalAmount)}
            </span>
            <span className="block text-[11px] text-[#04152d]/60 font-medium">
              Across <strong>{totalCount}</strong> transactions
            </span>
          </div>
        </div>

        {/* Posted & Credited */}
        <div className={`${ultraGlassCard} !p-5 flex items-center gap-4`}>
          <div className="w-12 h-12 bg-white/90 border border-white rounded-[16px] shadow-sm flex items-center justify-center shrink-0">
            <CheckCircle2 size={22} className="text-emerald-600" />
          </div>
          <div className="overflow-hidden">
            <span className="block text-[10px] font-semibold text-[#04152d]/50 uppercase tracking-widest truncate">
              Posted & Credited
            </span>
            <span className="block text-[22px] font-semibold text-emerald-600 tracking-tighter mt-0.5 truncate">
              {formatCurrency(postedAmount)}
            </span>
            <span className="block text-[11px] text-[#04152d]/60 font-medium">
              <strong>{postedCount}</strong> posted ({approvalRate}%)
            </span>
          </div>
        </div>

        {/* Requires Verification */}
        <div className={`${ultraGlassCard} !p-5 flex items-center gap-4`}>
          <div className="w-12 h-12 bg-white/90 border border-white rounded-[16px] shadow-sm flex items-center justify-center shrink-0">
            <Clock size={22} className="text-amber-500" />
          </div>
          <div className="overflow-hidden">
            <span className="block text-[10px] font-semibold text-[#04152d]/50 uppercase tracking-widest truncate">
              Requires Verification
            </span>
            <span className="block text-[22px] font-semibold text-amber-600 tracking-tighter mt-0.5 truncate">
              {formatCurrency(pendingAmount)}
            </span>
            <span className="block text-[11px] text-[#04152d]/60 font-medium">
              <strong>{pendingCount}</strong> awaiting review
            </span>
          </div>
        </div>

        {/* Rejected Collections */}
        <div className={`${ultraGlassCard} !p-5 flex items-center gap-4`}>
          <div className="w-12 h-12 bg-white/90 border border-white rounded-[16px] shadow-sm flex items-center justify-center shrink-0">
            <XCircle size={22} className="text-rose-500" />
          </div>
          <div className="overflow-hidden">
            <span className="block text-[10px] font-semibold text-[#04152d]/50 uppercase tracking-widest truncate">
              Rejected Collections
            </span>
            <span className="block text-[22px] font-semibold text-rose-600 tracking-tighter mt-0.5 truncate">
              {formatCurrency(rejectedAmount)}
            </span>
            <span className="block text-[11px] text-[#04152d]/60 font-medium">
              <strong>{rejectedCount}</strong> with formal cause
            </span>
          </div>
        </div>

      </div>

      {/* Interactive Timeline & Analytics Panel */}
      <div className={`${ultraGlassCard} !p-5`}>
        
        {/* Panel Header with Controls and Summary */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/60 pb-3">
          <div className="flex items-center gap-2">
            <Activity size={16} className="text-blue-500" />
            <h3 className="text-[12px] font-semibold text-[#04152d] uppercase tracking-widest">
              Collection Inflow & Timeline Analysis
            </h3>
            {(startDate || endDate) && (
              <span className="text-[10px] font-mono bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full border border-blue-100">
                Range: {startDate || 'Earliest'} to {endDate || 'Latest'}
              </span>
            )}
          </div>

          <div className="flex items-center gap-3 self-end sm:self-auto">
            {/* Interactive Series Toggle inside the chart */}
            {isExpanded && (
              <div className="flex items-center gap-1 bg-white/80 border border-white p-1 rounded-full shadow-sm text-[11px]">
                <button
                  onClick={() => setChartMetricFilter('all')}
                  className={`px-2.5 py-0.5 rounded-full font-semibold transition-all ${
                    chartMetricFilter === 'all' ? 'bg-[#04152d] text-white shadow-sm' : 'text-[#04152d]/60 hover:text-[#04152d]'
                  }`}
                >
                  All Statuses
                </button>
                <button
                  onClick={() => setChartMetricFilter('posted')}
                  className={`px-2.5 py-0.5 rounded-full font-semibold transition-all ${
                    chartMetricFilter === 'posted' ? 'bg-emerald-600 text-white shadow-sm' : 'text-emerald-700 hover:text-emerald-900'
                  }`}
                >
                  Posted
                </button>
                <button
                  onClick={() => setChartMetricFilter('pending')}
                  className={`px-2.5 py-0.5 rounded-full font-semibold transition-all ${
                    chartMetricFilter === 'pending' ? 'bg-amber-500 text-white shadow-sm' : 'text-amber-700 hover:text-amber-900'
                  }`}
                >
                  Pending
                </button>
                <button
                  onClick={() => setChartMetricFilter('rejected')}
                  className={`px-2.5 py-0.5 rounded-full font-semibold transition-all ${
                    chartMetricFilter === 'rejected' ? 'bg-rose-500 text-white shadow-sm' : 'text-rose-700 hover:text-rose-900'
                  }`}
                >
                  Rejected
                </button>
              </div>
            )}

            <button
              onClick={() => setIsExpanded(prev => !prev)}
              className="flex items-center gap-1.5 px-3 py-1 bg-white/80 hover:bg-white border border-white shadow-sm rounded-full text-[11px] font-semibold text-[#04152d]/70 hover:text-[#04152d] transition-all"
            >
              {isExpanded ? (
                <>Collapse View <ChevronUp size={13} /></>
              ) : (
                <>Expand Chart Details <ChevronDown size={13} /></>
              )}
            </button>
          </div>
        </div>

        {/* ========================================================= */}
        {/* COLLAPSED VIEW: Rich Executive Summary Strip (NOT EMPTY!) */}
        {/* ========================================================= */}
        {!isExpanded && (
          <div className="pt-3 flex flex-col md:flex-row md:items-center justify-between gap-4 text-[12px] animate-fade-in">
            {/* Latest Transaction Snapshot */}
            <div className="flex items-center gap-3">
              <span className="text-[10px] font-semibold text-[#04152d]/50 uppercase tracking-widest">
                Latest Record:
              </span>
              {latestCollection ? (
                <div className="flex items-center gap-2 bg-white/60 px-3 py-1.5 rounded-full border border-white shadow-sm">
                  <span className="font-mono text-blue-700 font-bold text-[11px]">{latestCollection.ref}</span>
                  <span className="w-1 h-1 rounded-full bg-gray-300"></span>
                  <span className="font-semibold text-[#04152d]">{latestCollection.memberName}</span>
                  <span className="w-1 h-1 rounded-full bg-gray-300"></span>
                  <span className="font-bold text-emerald-700">{formatCurrency(latestCollection.amount)}</span>
                  <span className="text-[10.5px] text-gray-500">({latestCollection.date})</span>
                </div>
              ) : (
                <span className="text-gray-400 italic">No transactions recorded</span>
              )}
            </div>

            {/* Quick Status Breakdown Indicators */}
            <div className="flex items-center gap-4 text-[11.5px] font-medium text-[#04152d]/70">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                <span>{postedCount} Posted</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-amber-400"></span>
                <span>{pendingCount} For Verification</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-rose-400"></span>
                <span>{rejectedCount} Rejected</span>
              </div>
              <div className="hidden lg:flex items-center gap-1.5 pl-2 border-l border-gray-200">
                <span className="text-[10px] text-gray-400 uppercase font-semibold">Active Channels:</span>
                <span className="font-semibold text-[#04152d]">{Object.keys(methodBreakdown).length} methods</span>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* EXPANDED VIEW: Interactive Recharts Graph & Channels       */}
        {/* ========================================================= */}
        {isExpanded && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 pt-4 animate-fade-in">
            
            {/* Interactive Timeline Bar Chart using Recharts */}
            <div className="lg:col-span-2 flex flex-col min-h-[220px]">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-semibold text-[#04152d]/50 uppercase tracking-widest">
                  Daily Volume Dynamics (₱)
                </span>
                <span className="text-[10px] text-gray-400 font-medium">
                  Hover bars for transaction breakdown
                </span>
              </div>

              <div className="flex-1 w-full h-[200px] flex items-center justify-center">
                {!hasDataForSelectedFilter ? (
                  <div className="flex flex-col items-center justify-center h-full w-full bg-white/30 rounded-2xl border border-white/60 text-center p-6 space-y-1">
                    <span className="text-[12px] font-bold text-[#04152d]/70">
                      No {chartMetricFilter.toUpperCase()} collections in this date range
                    </span>
                    <p className="text-[11px] text-[#04152d]/50 max-w-sm">
                      There are 0 {chartMetricFilter} collections recorded for the selected period. Switch to &ldquo;All Statuses&rdquo; or verify pending collections to view activity.
                    </p>
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={activeChartData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(4,21,45,0.06)" />
                      <XAxis 
                        dataKey="displayDate" 
                        stroke="#04152d" 
                        opacity={0.5} 
                        fontSize={11} 
                        tickLine={false} 
                        fontWeight="bold" 
                      />
                      <YAxis 
                        stroke="#04152d" 
                        opacity={0.5} 
                        fontSize={11} 
                        tickLine={false} 
                        fontWeight="bold" 
                        tickFormatter={(v) => `₱${(v / 1000).toFixed(0)}k`} 
                      />
                      <ChartTooltip 
                        cursor={{ fill: 'rgba(37,99,235,0.04)' }}
                        contentStyle={{ 
                          backgroundColor: 'rgba(255,255,255,0.95)', 
                          backdropFilter: 'blur(12px)', 
                          borderRadius: '16px', 
                          border: '1px solid rgba(255,255,255,1)', 
                          boxShadow: '0 8px 30px rgba(4,21,45,0.08)', 
                          fontSize: '12px' 
                        }}
                        formatter={(val: any, name: any) => [
                          `₱${Number(val).toLocaleString('en-US', { minimumFractionDigits: 2 })}`, 
                          name === 'posted' ? 'Posted & Credited' : name === 'pending' ? 'Pending Verification' : name === 'rejected' ? 'Rejected' : 'Total'
                        ]}
                        labelFormatter={(label) => `Date: ${label}`}
                      />
                      
                      {/* Dynamic Bar rendering based on selected chart filter */}
                      {chartMetricFilter === 'all' && (
                        <>
                          <Bar dataKey="posted" stackId="a" fill="#10b981" radius={[0, 0, 0, 0]} maxBarSize={36} />
                          <Bar dataKey="pending" stackId="a" fill="#f59e0b" radius={[0, 0, 0, 0]} maxBarSize={36} />
                          <Bar dataKey="rejected" stackId="a" fill="#f43f5e" radius={[4, 4, 0, 0]} maxBarSize={36} />
                        </>
                      )}
                      {chartMetricFilter === 'posted' && (
                        <Bar dataKey="posted" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={36} />
                      )}
                      {chartMetricFilter === 'pending' && (
                        <Bar dataKey="pending" fill="#f59e0b" radius={[4, 4, 0, 0]} maxBarSize={36} />
                      )}
                      {chartMetricFilter === 'rejected' && (
                        <Bar dataKey="rejected" fill="#f43f5e" radius={[4, 4, 0, 0]} maxBarSize={36} />
                      )}
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            {/* Payment Channel Breakdown */}
            <div className="bg-white/40 p-4 rounded-2xl border border-white/80 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between border-b border-gray-200/50 pb-2 mb-3">
                  <span className="text-[10px] font-semibold text-[#04152d]/60 uppercase tracking-widest flex items-center gap-1.5">
                    <PieChart size={13} className="text-blue-500" /> Channel Inflow
                  </span>
                  <span className="text-[10px] font-bold text-gray-400">Share of Total</span>
                </div>

                <div className="space-y-2.5">
                  {Object.entries(methodBreakdown).map(([method, data]) => {
                    const pct = totalAmount > 0 ? Math.round((data.total / totalAmount) * 100) : 0;
                    return (
                      <div key={method} className="space-y-1">
                        <div className="flex justify-between items-center text-[11.5px]">
                          <span className="font-semibold text-[#04152d]">{method}</span>
                          <span className="font-mono text-gray-600 text-[11px]">
                            {formatCurrency(data.total)} <strong className="text-blue-700">({pct}%)</strong>
                          </span>
                        </div>
                        <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-blue-600 rounded-full transition-all duration-500" 
                            style={{ width: `${pct}%` }} 
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="pt-3 border-t border-gray-200/50 flex items-center justify-between text-[11px] text-[#04152d]/60 font-medium">
                <span>Total Channels: <strong>{Object.keys(methodBreakdown).length}</strong></span>
                <span>Approval Velocity: <strong className="text-emerald-700">{approvalRate}%</strong></span>
              </div>
            </div>

          </div>
        )}

      </div>
    </div>
  );
}
