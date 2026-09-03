"use client";

import React, { useState, useMemo, useEffect } from 'react';
import { 
  ChevronDown, Calendar, Activity, TrendingUp, TrendingDown, Wallet, BrainCircuit, BarChart2, RefreshCw, CheckCircle2, Database, Clock, AlertCircle
} from 'lucide-react';
import { 
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as ChartTooltip, ResponsiveContainer, Legend, ComposedChart, Area, Cell 
} from 'recharts';
import Header from '@/components/Header';
import ForecastGenerationModal from '@/components/forecasting/ForecastGenerationModal';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

const MOCK_ACTIVE_FUNDS = [
  { id: 'FND-001', name: 'Union Fund', code: 'UNF', historicalBalance: 500000, projectedBalance: 619100 },
  { id: 'FND-002', name: 'General Fund', code: 'GEN', historicalBalance: 250000, projectedBalance: 263500 },
  { id: 'FND-003', name: 'Death Assistance Fund', code: 'DAF', historicalBalance: 150000, projectedBalance: 199833 },
  { id: 'FND-004', name: 'Foreign Assistance Fund', code: 'FAF', historicalBalance: 80000, projectedBalance: 98500 },
  { id: 'FND-005', name: 'Loan Fund', code: 'LNF', historicalBalance: 850000, projectedBalance: 965000 },
];

const CHART_COLORS = ['#2563eb', '#10b981', '#f59e0b', '#6366f1', '#ec4899'];

// --- CUSTOM RICH TOOLTIPS ---
const CustomTrendTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white/95 backdrop-blur-xl border border-white p-4 rounded-[16px] shadow-[0_12px_40px_rgba(4,21,45,0.15)] min-w-[220px]">
        <p className="text-[13px] font-bold text-[#04152d] border-b border-[#04152d]/10 pb-2 mb-3">Period: {label}</p>
        {payload.map((entry: any, index: number) => (
          <div key={index} className="flex items-center justify-between gap-6 mb-2 last:mb-0">
            <span className="flex items-center gap-2 text-[12px] font-semibold text-[#04152d]/70">
              <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: entry.color }} />
              {entry.name}
            </span>
            <span className="text-[13px] font-bold text-[#04152d]">₱{(entry.value || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

const CustomComparisonTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-white/95 backdrop-blur-xl border border-white p-4 rounded-[16px] shadow-[0_12px_40px_rgba(4,21,45,0.15)] min-w-[240px]">
        <div className="border-b border-[#04152d]/10 pb-2 mb-3">
          <p className="text-[10px] font-semibold text-[#04152d]/50 uppercase tracking-widest">{data.code}</p>
          <p className="text-[14px] font-bold text-[#04152d] tracking-tight">{data.fullName || data.name}</p>
        </div>
        <div className="flex flex-col gap-1">
          <p className="text-[11px] font-semibold text-[#04152d]/60 uppercase tracking-widest">AI Projected Target</p>
          <p className="text-[18px] font-bold text-emerald-600 tracking-tight">₱{(data.value || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
        </div>
      </div>
    );
  }
  return null;
};

const CustomCashflowTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const inflow = payload.find((p: any) => p.dataKey === 'Inflow')?.value || 0;
    const outflow = payload.find((p: any) => p.dataKey === 'Outflow')?.value || 0;
    const netFlow = inflow - outflow;
    
    return (
      <div className="bg-white/95 backdrop-blur-xl border border-white p-4 rounded-[16px] shadow-[0_12px_40px_rgba(4,21,45,0.15)] min-w-[220px]">
        <p className="text-[13px] font-bold text-[#04152d] border-b border-[#04152d]/10 pb-2 mb-3">Period: {label}</p>
        
        {payload.map((entry: any, index: number) => (
          <div key={index} className="flex items-center justify-between gap-6 mb-2">
            <span className="flex items-center gap-2 text-[12px] font-semibold text-[#04152d]/70">
              <span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: entry.color }} />
              {entry.name}
            </span>
            <span className="text-[13px] font-bold text-[#04152d]">₱{(entry.value || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
          </div>
        ))}

        <div className="border-t border-[#04152d]/10 pt-2 mt-3 flex items-center justify-between gap-6">
          <span className="text-[12px] font-bold text-[#04152d]/80 uppercase tracking-widest">Net Flow</span>
          <span className={`text-[13px] font-bold ${netFlow >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
            {netFlow >= 0 ? '+' : ''}₱{netFlow.toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </span>
        </div>
      </div>
    );
  }
  return null;
};

export default function ForecastingDashboardPage() {
  const [fundFilter, setFundFilter] = useState('All');
  const [startDate, setStartDate] = useState('2026-04-01');
  const [endDate, setEndDate] = useState('2026-12-31');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [liveForecastData, setLiveForecastData] = useState<any>(null);

  // FAI-012: Fetch forecast results for interactive dashboard (prioritizing valid stored forecasts)
  const fetchForecast = async (fundCode: string = 'ALL') => {
    setIsLoading(true);
    try {
      // First attempt to get the latest valid stored forecasts (FAI-012)
      const storedRes = await fetch(`${API_BASE_URL}/forecasting/stored/latest?fundCode=${fundCode === 'All' ? 'ALL' : fundCode}`);
      if (storedRes.ok) {
        const storedData = await storedRes.json();
        if (storedData && storedData.forecasts && Object.keys(storedData.forecasts).length > 0) {
          setLiveForecastData(storedData);
          setIsLoading(false);
          return;
        }
      }

      // If no stored forecast yet, generate on-demand
      const res = await fetch(`${API_BASE_URL}/forecasting/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fundCode: fundCode === 'All' ? 'ALL' : fundCode,
          horizonMonths: 4,
          persistResults: true,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setLiveForecastData(data);
      }
    } catch (e) {
      console.warn('Could not connect to live forecasting backend, using mock baseline data:', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchForecast(fundFilter);
  }, [fundFilter]);

  // Determine active fund figures
  const activeFundData = useMemo(() => {
    if (liveForecastData && liveForecastData.forecasts) {
      if (fundFilter === 'All') {
        const forecasts = Object.values(liveForecastData.forecasts) as any[];
        const histSum = forecasts.reduce((acc, f) => acc + (f.baselineBalance || 0), 0);
        const projSum = forecasts.reduce((acc, f) => acc + (f.projectedBalance || f.latestProjectedBalance || 0), 0);
        if (histSum > 0 || projSum > 0) {
          return {
            historicalBalance: histSum,
            projectedBalance: projSum,
            name: 'All Active Funds',
            code: 'ALL',
          };
        }
      } else if (liveForecastData.forecasts[fundFilter]) {
        const f = liveForecastData.forecasts[fundFilter];
        if (f.baselineBalance > 0 || f.projectedBalance > 0) {
          return {
            historicalBalance: f.baselineBalance,
            projectedBalance: f.projectedBalance || f.latestProjectedBalance,
            name: f.fundName,
            code: f.fundCode,
          };
        }
      }
    }

    // Fallback if live data not loaded
    if (fundFilter === 'All') {
      return {
        historicalBalance: MOCK_ACTIVE_FUNDS.reduce((acc, curr) => acc + curr.historicalBalance, 0),
        projectedBalance: MOCK_ACTIVE_FUNDS.reduce((acc, curr) => acc + curr.projectedBalance, 0),
        name: 'All Active Funds',
        code: 'ALL',
      };
    }
    return MOCK_ACTIVE_FUNDS.find(f => f.code === fundFilter) || MOCK_ACTIVE_FUNDS[0];
  }, [fundFilter, liveForecastData]);

  // Trendline data from live forecast or computed
  const trendData = useMemo(() => {
    if (liveForecastData?.forecasts) {
      if (fundFilter !== 'All' && liveForecastData.forecasts[fundFilter]?.timeSeries) {
        const points = liveForecastData.forecasts[fundFilter].timeSeries.map((t: any) => ({
          date: t.period,
          historical: t.historicalBalance !== undefined ? t.historicalBalance : (t.isProjected ? null : t.forecastBalance),
          forecast: t.forecastBalance,
        }));
        if (points.some((p: any) => (p.historical !== null && p.historical > 0) || (p.forecast !== null && p.forecast > 0))) {
          return points;
        }
      } else if (fundFilter === 'All') {
        const seriesMap: Record<string, { historical: number | null; forecast: number | null }> = {};
        for (const fc of Object.values(liveForecastData.forecasts) as any[]) {
          if (fc.timeSeries) {
            for (const point of fc.timeSeries) {
              if (!seriesMap[point.period]) {
                seriesMap[point.period] = { historical: null, forecast: null };
              }
              if (point.historicalBalance !== null && point.historicalBalance !== undefined) {
                seriesMap[point.period].historical = (seriesMap[point.period].historical || 0) + point.historicalBalance;
              }
              if (point.forecastBalance !== null && point.forecastBalance !== undefined) {
                seriesMap[point.period].forecast = (seriesMap[point.period].forecast || 0) + point.forecastBalance;
              }
            }
          }
        }
        const points = Object.entries(seriesMap).map(([period, vals]) => ({
          date: period,
          historical: vals.historical,
          forecast: vals.forecast,
        })).sort((a, b) => a.date.localeCompare(b.date));

        if (points.some((p: any) => (p.historical !== null && p.historical > 0) || (p.forecast !== null && p.forecast > 0))) {
          return points;
        }
      }
    }

    // Default realistic curve based on active baseline
    const base = activeFundData.historicalBalance || 1870000;
    return [
      { date: '2026-05', historical: Math.round(base * 0.85), forecast: null },
      { date: '2026-06', historical: Math.round(base * 0.90), forecast: null },
      { date: '2026-07', historical: Math.round(base * 0.95), forecast: null },
      { date: '2026-08', historical: Math.round(base), forecast: Math.round(base) },
      { date: '2026-09', historical: null, forecast: Math.round(base * 1.05) },
      { date: '2026-10', historical: null, forecast: Math.round(base * 1.11) },
      { date: '2026-11', historical: null, forecast: Math.round(base * 1.18) },
      { date: '2026-12', historical: null, forecast: Math.round(base * 1.25) },
    ];
  }, [fundFilter, liveForecastData, activeFundData]);

  // Cashflow data (Inflows vs Outflows)
  const cashflowData = useMemo(() => {
    if (liveForecastData?.forecasts) {
      if (fundFilter === 'All') {
        const cashMap: Record<string, { Inflow: number; Outflow: number }> = {};
        for (const fc of Object.values(liveForecastData.forecasts) as any[]) {
          if (fc.timeSeries) {
            for (const point of fc.timeSeries) {
              if (!cashMap[point.period]) {
                cashMap[point.period] = { Inflow: 0, Outflow: 0 };
              }
              cashMap[point.period].Inflow += (point.inflows || 0);
              cashMap[point.period].Outflow += (point.outflows || 0);
            }
          }
        }
        const points = Object.entries(cashMap).map(([period, vals]) => ({
          date: period,
          Inflow: Math.round(vals.Inflow),
          Outflow: Math.round(vals.Outflow),
        })).sort((a, b) => a.date.localeCompare(b.date));

        if (points.some((p: any) => p.Inflow > 0 || p.Outflow > 0)) {
          return points;
        }
      } else if (liveForecastData.forecasts[fundFilter]?.timeSeries) {
        const points = liveForecastData.forecasts[fundFilter].timeSeries.map((t: any) => ({
          date: t.period,
          Inflow: Math.round(t.inflows || 0),
          Outflow: Math.round(t.outflows || 0),
        }));
        if (points.some((p: any) => p.Inflow > 0 || p.Outflow > 0)) {
          return points;
        }
      }
    }

    const base = activeFundData.historicalBalance || 1870000;
    return [
      { date: '2026-05', Inflow: Math.round(base * 0.12), Outflow: Math.round(base * 0.08) },
      { date: '2026-06', Inflow: Math.round(base * 0.15), Outflow: Math.round(base * 0.10) },
      { date: '2026-07', Inflow: Math.round(base * 0.18), Outflow: Math.round(base * 0.11) },
      { date: '2026-08', Inflow: Math.round(base * 0.20), Outflow: Math.round(base * 0.12) },
      { date: '2026-09', Inflow: Math.round(base * 0.19), Outflow: Math.round(base * 0.11) },
      { date: '2026-10', Inflow: Math.round(base * 0.21), Outflow: Math.round(base * 0.12) },
      { date: '2026-11', Inflow: Math.round(base * 0.23), Outflow: Math.round(base * 0.13) },
      { date: '2026-12', Inflow: Math.round(base * 0.25), Outflow: Math.round(base * 0.14) },
    ];
  }, [fundFilter, liveForecastData, activeFundData]);

  // Comparison bar chart data across all Master funds
  const comparisonData = useMemo(() => {
    if (liveForecastData?.fundComparisons && liveForecastData.fundComparisons.length > 0) {
      return liveForecastData.fundComparisons.map((fc: any) => ({
        name: fc.code,
        fullName: fc.name,
        code: fc.code,
        value: fc.projected,
      }));
    }
    return MOCK_ACTIVE_FUNDS.map(f => ({ 
      name: f.code, 
      fullName: f.name,
      code: f.code,
      value: f.projectedBalance 
    }));
  }, [liveForecastData]);

  const variance = activeFundData.projectedBalance - activeFundData.historicalBalance;
  const variancePercent = activeFundData.historicalBalance > 0 
    ? (variance / activeFundData.historicalBalance) * 100 
    : 0;

  const formatCurrency = (val: number) => `₱${(val || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const ultraGlassCard = "bg-white/50 backdrop-blur-[40px] backdrop-saturate-[200%] border border-white/80 shadow-[0_8px_30px_rgba(4,21,45,0.06),inset_0_2px_3px_rgba(255,255,255,0.9)] rounded-[24px] p-6 relative overflow-hidden";
  const glassInput = "pl-4 pr-8 py-2 bg-white/60 hover:bg-white/80 focus:bg-white/90 backdrop-blur-xl border border-white/90 shadow-[inset_0_2px_4px_rgba(4,21,45,0.03)] rounded-[12px] text-[13px] font-semibold text-[#04152d] outline-none transition-all duration-300";

  return (
    <div className="relative flex flex-col min-h-screen bg-[#f4f5f7]">
      <style jsx global>{`
        @keyframes fade-in { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        .animate-fade-in { animation: fade-in 0.4s ease-out forwards; }
      `}</style>

      <div className="sticky top-0 z-40 w-full backdrop-blur-2xl bg-white/30 border-b border-white/50 shadow-[0_4px_30px_rgba(0,0,0,0.03)]">
        <Header />
      </div>

      <div className="p-4 md:p-6 max-w-[1400px] w-full mx-auto animate-fade-in flex-1 relative z-10 space-y-6 mt-2">
        
        {/* Top Control Bar with Fund Filter and Generate CTA */}
        <div className={`${ultraGlassCard} !p-4 flex flex-col xl:flex-row items-center justify-between gap-4 z-20`}>
          <div className="flex flex-col sm:flex-row gap-3 w-full xl:w-auto items-center">
            <div className="relative w-full sm:w-72">
              <select 
                value={fundFilter} 
                onChange={(e) => setFundFilter(e.target.value)} 
                className={`${glassInput} w-full appearance-none cursor-pointer`}
              >
                <option value="All">All Active Funds</option>
                <option value="UNF">Union Fund (UNF)</option>
                <option value="GEN">General Fund (GEN)</option>
                <option value="DAF">Death Assistance Fund (DAF)</option>
                <option value="FAF">Foreign Assistance Fund (FAF)</option>
                <option value="LNF">Loan Fund (LNF)</option>
              </select>
              <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#04152d]/50 pointer-events-none" />
            </div>

            <div className="flex items-center justify-between gap-2 w-full sm:w-auto bg-white/60 hover:bg-white/80 transition-colors border border-white/90 rounded-[12px] px-3 shadow-[inset_0_2px_4px_rgba(4,21,45,0.03)] h-[38px]">
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

            {/* FAI-011 / FAI-012 Stored Status Badge */}
            {liveForecastData?.batchId && (
              <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-700 text-[11px] font-semibold">
                <Database size={12} className="text-blue-600" />
                <span>Stored Batch: {liveForecastData.batchId.slice(-8)}</span>
              </div>
            )}
          </div>
          
          <div className="flex items-center gap-2 w-full xl:w-auto">
            <button
              onClick={() => fetchForecast(fundFilter)}
              title="Refresh Forecast Data"
              className="p-2.5 bg-white/60 hover:bg-white/90 border border-white/90 rounded-[100px] text-[#04152d]/70 transition-all shadow-sm active:scale-95"
            >
              <RefreshCw size={16} className={isLoading ? 'animate-spin text-emerald-600' : ''} />
            </button>

            <button 
              onClick={() => setIsModalOpen(true)}
              className="flex-1 xl:flex-initial relative overflow-hidden px-5 py-2.5 bg-gradient-to-b from-emerald-500 to-emerald-700 text-white border border-emerald-800 shadow-[0_6px_20px_rgba(16,185,129,0.3),inset_0_1px_1px_rgba(255,255,255,0.2)] hover:shadow-[0_8px_25px_rgba(16,185,129,0.4),inset_0_1px_1px_rgba(255,255,255,0.3)] hover:from-emerald-400 hover:to-emerald-600 rounded-[100px] text-[13px] font-semibold transition-all duration-300 flex justify-center items-center gap-2 active:scale-95"
            >
              <BrainCircuit size={16} /> Generate AI Forecast
            </button>
          </div>
        </div>

        {/* Data Sufficiency Warning Notice (FAI-003 - FAI-008) */}
        {((fundFilter !== 'All' && liveForecastData?.errors?.[fundFilter]) || 
          (fundFilter === 'All' && liveForecastData?.errors && Object.keys(liveForecastData.errors).length > 0 && !liveForecastData?.forecasts?.[Object.keys(liveForecastData.forecasts)[0]])) && (
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-[16px] p-4 flex items-start gap-3 shadow-sm">
            <AlertCircle size={18} className="text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-[13px] font-bold text-amber-900">Historical Data Sufficiency Verification</p>
              <p className="text-[12px] text-amber-800/80 mt-0.5">
                {fundFilter !== 'All' 
                  ? (liveForecastData.errors[fundFilter]?.error || 'This fund requires at least 3 distinct historical periods with posted transactions to compute a reliable projection.')
                  : 'One or more funds currently have fewer than 3 historical periods of posted transactions. Projections are computed only for funds meeting data sufficiency.'}
              </p>
            </div>
          </div>
        )}

        {/* 3 Metric Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <div className={`${ultraGlassCard} !p-5 flex items-center gap-4`}>
            <div className="w-12 h-12 bg-white/90 border border-white rounded-[16px] shadow-sm flex items-center justify-center shrink-0">
              <Wallet size={20} className="text-[#04152d]/60" />
            </div>
            <div>
              <span className="block text-[10px] font-semibold text-[#04152d]/50 uppercase tracking-widest">Historical Baseline</span>
              <span className="block text-[24px] font-semibold text-[#04152d] tracking-tighter mt-0.5">{formatCurrency(activeFundData.historicalBalance)}</span>
            </div>
          </div>
          <div className={`${ultraGlassCard} !p-5 flex items-center gap-4`}>
            <div className="w-12 h-12 bg-white/90 border border-white rounded-[16px] shadow-sm flex items-center justify-center shrink-0">
              <BrainCircuit size={20} className="text-emerald-600" />
            </div>
            <div>
              <span className="block text-[10px] font-semibold text-[#04152d]/50 uppercase tracking-widest">AI Projected Target</span>
              <span className="block text-[24px] font-semibold text-[#04152d] tracking-tighter mt-0.5">{formatCurrency(activeFundData.projectedBalance)}</span>
            </div>
          </div>
          <div className={`${ultraGlassCard} !p-5 flex items-center gap-4`}>
            <div className="w-12 h-12 bg-white/90 border border-white rounded-[16px] shadow-sm flex items-center justify-center shrink-0">
              {variance >= 0 ? <TrendingUp size={20} className="text-emerald-600" /> : <TrendingDown size={20} className="text-red-600" />}
            </div>
            <div>
              <span className="block text-[10px] font-semibold text-[#04152d]/50 uppercase tracking-widest">Net Forecast Variance</span>
              <span className={`block text-[24px] font-semibold tracking-tighter mt-0.5 ${variance >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                {variance >= 0 ? '+' : ''}{formatCurrency(variance)} ({variancePercent.toFixed(1)}%)
              </span>
            </div>
          </div>
        </div>

        {/* Projection Trendline Chart */}
        <div className={`${ultraGlassCard} !p-5 flex flex-col h-[380px]`}>
          <div className="flex justify-between items-start border-b border-white/60 pb-3 mb-4 shrink-0">
            <div>
              <h3 className="text-[14px] font-semibold text-[#04152d] uppercase tracking-widest flex items-center gap-2">
                <Activity size={16} className="text-blue-500"/> Fund Projection Trendline
              </h3>
              <p className="text-[11px] font-medium text-[#04152d]/50 mt-1">
                Analyzing: {activeFundData.name} | Period Horizon: Selected Forecast Horizon
              </p>
            </div>
          </div>
          <div className="flex-1 w-full min-h-[250px]">
            {trendData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={trendData} margin={{ top: 10, right: 10, left: 20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorHistorical" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#2563eb" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#2563eb" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(4,21,45,0.06)" />
                  <XAxis dataKey="date" stroke="#04152d" opacity={0.5} fontSize={11} tickLine={false} fontWeight="bold" />
                  <YAxis stroke="#04152d" opacity={0.5} fontSize={11} tickLine={false} fontWeight="bold" tickFormatter={(v) => `₱${(v/1000).toFixed(0)}k`} />
                  <ChartTooltip content={<CustomTrendTooltip />} cursor={{ stroke: 'rgba(4,21,45,0.1)', strokeWidth: 2, strokeDasharray: '4 4' }} />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: '11px', fontWeight: 'bold', opacity: 0.7 }} />
                  <Area type="monotone" dataKey="historical" name="Historical Balance" stroke="#2563eb" strokeWidth={3} fillOpacity={1} fill="url(#colorHistorical)" />
                  <Line type="monotone" dataKey="forecast" name="AI Projected Forecast" stroke="#10b981" strokeWidth={3} strokeDasharray="5 5" dot={{ r: 4, strokeWidth: 2 }} activeDot={{ r: 6 }} />
                </ComposedChart>
              </ResponsiveContainer>
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center text-[#04152d]/40">
                <Activity size={32} className="mb-2 opacity-50" />
                <p className="text-[13px] font-semibold tracking-tight">No data for selected period</p>
                <p className="text-[11px] font-medium">Please adjust the date range to view the projection.</p>
              </div>
            )}
          </div>
        </div>

        {/* Comparison & Cashflow Row */}
        <div className="flex flex-col xl:flex-row items-stretch gap-6">
          
          <div className={`flex-1 ${ultraGlassCard} !p-5 flex flex-col min-h-[300px]`}>
            <h3 className="text-[13px] font-semibold text-[#04152d] uppercase tracking-widest border-b border-white/60 pb-2 mb-4 shrink-0 flex items-center gap-2">
              <BarChart2 size={16} className="text-emerald-500"/> Projected Fund Comparison
            </h3>
            <div className="flex-1 w-full min-h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={comparisonData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(4,21,45,0.06)" />
                  <XAxis dataKey="name" stroke="#04152d" opacity={0.5} fontSize={11} tickLine={false} fontWeight="bold" />
                  <YAxis stroke="#04152d" opacity={0.5} fontSize={11} tickLine={false} fontWeight="bold" tickFormatter={(v) => `₱${(v/1000).toFixed(0)}k`} />
                  <ChartTooltip content={<CustomComparisonTooltip />} cursor={{ fill: 'rgba(16,185,129,0.05)' }} />
                  <Bar dataKey="value" radius={[6, 6, 0, 0]} maxBarSize={50}>
                    {comparisonData.map((entry: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className={`flex-1 ${ultraGlassCard} !p-5 flex flex-col min-h-[300px]`}>
            <h3 className="text-[13px] font-semibold text-[#04152d] uppercase tracking-widest border-b border-white/60 pb-2 mb-4 shrink-0 flex items-center gap-2">
              <Activity size={16} className="text-blue-500"/> Monthly Cashflow Analysis (Inflows vs Outflows)
            </h3>
            <div className="flex-1 w-full min-h-[200px]">
              {cashflowData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={cashflowData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(4,21,45,0.06)" />
                    <XAxis dataKey="date" stroke="#04152d" opacity={0.5} fontSize={11} tickLine={false} fontWeight="bold" />
                    <YAxis stroke="#04152d" opacity={0.5} fontSize={11} tickLine={false} fontWeight="bold" tickFormatter={(v) => `₱${(v/1000).toFixed(0)}k`} />
                    <ChartTooltip content={<CustomCashflowTooltip />} cursor={{ fill: 'rgba(37,99,235,0.05)' }} />
                    <Legend iconType="circle" wrapperStyle={{ fontSize: '11px', fontWeight: 'bold', opacity: 0.7 }} />
                    <Bar dataKey="Inflow" name="Inflows" fill="#3b82f6" radius={[4, 4, 0, 0]} maxBarSize={30} />
                    <Bar dataKey="Outflow" name="Outflows" fill="#f59e0b" radius={[4, 4, 0, 0]} maxBarSize={30} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center text-[#04152d]/40">
                  <Activity size={32} className="mb-2 opacity-50" />
                  <p className="text-[13px] font-semibold tracking-tight">No cashflow data</p>
                  <p className="text-[11px] font-medium">Please adjust the date range to view analysis.</p>
                </div>
              )}
            </div>
          </div>
        </div>

      </div>

      <ForecastGenerationModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        selectedFundName={activeFundData.name}
        selectedFundCode={fundFilter === 'All' ? 'ALL' : fundFilter}
        targetEndDate={endDate}
        onSuccess={(result) => {
          if (result) {
            setLiveForecastData(result);
          } else {
            fetchForecast(fundFilter);
          }
        }}
      />
    </div>
  );
}