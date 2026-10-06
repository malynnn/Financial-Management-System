"use client";

import React, { useState, useMemo, useEffect } from 'react';
import { 
  Building2, Calendar, Activity, TrendingUp, TrendingDown, 
  Wallet, BrainCircuit, BarChart2, RefreshCw, CheckCircle2, 
  Database, Clock, AlertCircle, AlertTriangle, ShieldCheck, 
  History, Sparkles, Plus, Eye, ShieldAlert, ArrowDownLeft, 
  ArrowUpRight, Info, Filter, Layers, Flame, SlidersHorizontal,
  CheckSquare, Square
} from 'lucide-react';
import { 
  ResponsiveContainer, ComposedChart, Line, Bar, XAxis, 
  YAxis, CartesianGrid, Tooltip as ChartTooltip, Legend, Area,
  ReferenceLine, Cell 
} from 'recharts';
import { Fund, FundTransaction, getStoredFunds, getStoredTransactions, calculateFundBreakdown } from '@/lib/fundData';
import { 
  LifespanPredictionRecord, 
  getStoredPredictions, 
  saveStoredPredictions, 
  aggregateFundHistoricalMovements, 
  computeFundLifespanPrediction 
} from '@/lib/lifespanData';
import GeneratePredictionModal from './GeneratePredictionModal';
import PredictionSuccessModal from './PredictionSuccessModal';
import PredictionHistoryModal from './PredictionHistoryModal';
import DepletionAlertModal from './DepletionAlertModal';

interface Props {
  isAuditorView?: boolean;
  currentUserRole?: string;
}

export default function FundLifespanDashboard({
  isAuditorView = false,
  currentUserRole = 'Financial Officer'
}: Props) {
  const [funds, setFunds] = useState<Fund[]>([]);
  const [transactions, setTransactions] = useState<FundTransaction[]>([]);
  const [predictions, setPredictions] = useState<LifespanPredictionRecord[]>([]);

  // Selection states
  const [selectedFundId, setSelectedFundId] = useState<string>('');
  const [periodPreset, setPeriodPreset] = useState<'3M' | '6M' | '12M' | 'ALL'>('6M');

  // Active prediction being viewed
  const [activePrediction, setActivePrediction] = useState<LifespanPredictionRecord | null>(null);

  // Chart category and filter controls
  const [chartCategory, setChartCategory] = useState<'overview' | 'trajectory' | 'flows' | 'burn'>('overview');
  const [dataScope, setDataScope] = useState<'all' | 'actual' | 'projected'>('all');
  const [visibleSeries, setVisibleSeries] = useState({
    balance: true,
    inflows: true,
    outflows: true,
    net: true
  });

  const toggleSeries = (key: keyof typeof visibleSeries) => {
    setVisibleSeries(prev => ({ ...prev, [key]: !prev[key] }));
  };

  // Modals
  const [isGenerateModalOpen, setIsGenerateModalOpen] = useState(false);
  const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(false);
  const [newlyCreatedPrediction, setNewlyCreatedPrediction] = useState<LifespanPredictionRecord | null>(null);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [isAlertModalOpen, setIsAlertModalOpen] = useState(false);

  useEffect(() => {
    const loadedFunds = getStoredFunds();
    const loadedTx = getStoredTransactions();
    const loadedPreds = getStoredPredictions();

    setFunds(loadedFunds);
    setTransactions(loadedTx);
    setPredictions(loadedPreds);

    // Default to first active fund
    const firstActive = loadedFunds.find(f => f.status === 'Active') || loadedFunds[0];
    if (firstActive) {
      setSelectedFundId(firstActive.id);
      // Find latest prediction for this fund if exists
      const match = loadedPreds.find(p => p.fundId === firstActive.id || p.fundCode === firstActive.code);
      if (match) {
        setActivePrediction(match);
      }
    }
  }, []);

  // Filter only Active Funds per Criteria 1
  const activeFunds = useMemo(() => {
    return funds.filter(f => f.status === 'Active');
  }, [funds]);

  const selectedFund = useMemo(() => {
    return activeFunds.find(f => f.id === selectedFundId) || activeFunds[0];
  }, [activeFunds, selectedFundId]);

  // Compute date range based on period preset per Criteria 2
  const dateRange = useMemo(() => {
    const end = new Date();
    const start = new Date();
    if (periodPreset === '3M') {
      start.setMonth(start.getMonth() - 3);
    } else if (periodPreset === '6M') {
      start.setMonth(start.getMonth() - 6);
    } else if (periodPreset === '12M') {
      start.setFullYear(start.getFullYear() - 1);
    } else {
      start.setFullYear(2025, 0, 1);
    }
    return {
      startDate: start.toISOString().split('T')[0],
      endDate: end.toISOString().split('T')[0],
    };
  }, [periodPreset]);

  // Aggregate real-time historical data from validated posted transactions per Criteria 3, 4, 5
  const currentHistorical = useMemo(() => {
    if (!selectedFund) return null;
    return aggregateFundHistoricalMovements(
      selectedFund.id,
      transactions,
      periodPreset === 'ALL' ? undefined : dateRange.startDate,
      dateRange.endDate
    );
  }, [selectedFund, transactions, periodPreset, dateRange]);

  // Handle fund change
  const handleFundChange = (fundId: string) => {
    setSelectedFundId(fundId);
    const target = activeFunds.find(f => f.id === fundId);
    if (!target) return;

    // Check if an existing prediction exists for this fund
    const existing = predictions.find(p => p.fundId === target.id || p.fundCode === target.code);
    if (existing) {
      setActivePrediction(existing);
    } else {
      // Dynamically generate a live evaluation
      const hist = aggregateFundHistoricalMovements(target.id, transactions, dateRange.startDate, dateRange.endDate);
      const targetBalance = calculateFundBreakdown(target, transactions).currentBalance;
      const computed = computeFundLifespanPrediction(target, targetBalance, hist, dateRange.startDate, dateRange.endDate, currentUserRole);
      setActivePrediction(computed);
    }
  };

  // When period preset changes, update active prediction
  const handlePeriodPresetChange = (preset: '3M' | '6M' | '12M' | 'ALL') => {
    setPeriodPreset(preset);
    if (!selectedFund) return;

    const hist = aggregateFundHistoricalMovements(selectedFund.id, transactions, preset === 'ALL' ? undefined : dateRange.startDate, dateRange.endDate);
    const selectedBalance = calculateFundBreakdown(selectedFund, transactions).currentBalance;
    const computed = computeFundLifespanPrediction(selectedFund, selectedBalance, hist, dateRange.startDate, dateRange.endDate, currentUserRole);
    setActivePrediction(computed);
  };

  // Prediction generated callback
  const handlePredictionGenerated = (newPred: LifespanPredictionRecord) => {
    const updated = [newPred, ...predictions];
    setPredictions(updated);
    saveStoredPredictions(updated);
    setActivePrediction(newPred);
    setNewlyCreatedPrediction(newPred);
    setIsSuccessModalOpen(true);
  };

  // Smooth scroll and focus on the chart section
  const scrollToChart = (highlightColor: 'rose' | 'blue' = 'blue') => {
    setTimeout(() => {
      const el = document.getElementById('actuarial-chart-section');
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        const ringClass = highlightColor === 'rose' ? 'ring-rose-500' : 'ring-blue-500';
        el.classList.add('ring-2', ringClass, 'ring-offset-4');
        setTimeout(() => {
          el.classList.remove('ring-2', ringClass, 'ring-offset-4');
        }, 2200);
      }
    }, 120);
  };

  // Active depletion alerts per Criteria 14
  const activeAlertPredictions = useMemo(() => {
    return predictions.filter(p => p.alertActive);
  }, [predictions]);

  // Filtered Time Series based on dataScope
  const filteredTimeSeries = useMemo(() => {
    if (!activePrediction?.timeSeries) return [];
    if (dataScope === 'actual') return activePrediction.timeSeries.filter(d => !d.isProjected);
    if (dataScope === 'projected') return activePrediction.timeSeries.filter(d => d.isProjected);
    return activePrediction.timeSeries;
  }, [activePrediction?.timeSeries, dataScope]);

  // Statistical calculations for the KPI strip above the chart
  const chartStats = useMemo(() => {
    if (!filteredTimeSeries.length) return null;
    const balances = filteredTimeSeries.map(d => d.actualEndingBalance);
    const inflows = filteredTimeSeries.map(d => d.inflows);
    const outflows = filteredTimeSeries.map(d => d.outflows);
    const nets = filteredTimeSeries.map(d => d.netMovement);

    const peakBalance = Math.max(...balances);
    const minBalance = Math.min(...balances);
    const endingBalance = balances[balances.length - 1];
    const avgInflow = Math.round(inflows.reduce((a, b) => a + b, 0) / inflows.length);
    const avgOutflow = Math.round(outflows.reduce((a, b) => a + b, 0) / outflows.length);
    const avgNet = Math.round(nets.reduce((a, b) => a + b, 0) / nets.length);

    return { peakBalance, minBalance, endingBalance, avgInflow, avgOutflow, avgNet };
  }, [filteredTimeSeries]);

  // Index where projection begins in filtered data (for reference lines)
  const projectionStartIndex = useMemo(() => {
    return filteredTimeSeries.findIndex(d => d.isProjected);
  }, [filteredTimeSeries]);

  const formatCurrency = (val: number) => 
    `₱${Number(val || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}`;

  const getConditionStyle = (cond: string) => {
    switch (cond) {
      case 'Stable':
        return 'bg-emerald-100 text-emerald-800 border-emerald-300';
      case 'Declining':
        return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'At Risk':
        return 'bg-amber-100 text-amber-800 border-amber-300';
      case 'Projected to Deplete':
        return 'bg-rose-100 text-rose-800 border-rose-300';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-300';
    }
  };

  // Custom Chart Tooltip strictly distinguishing Actual vs Predicted per Criteria 9 & 16
  const CustomChartTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const dataPoint = payload[0].payload;
      const isProjected = dataPoint.isProjected;

      return (
        <div className="bg-white/95 backdrop-blur-xl border border-gray-200 p-4 rounded-[18px] shadow-[0_12px_40px_rgba(4,21,45,0.18)] min-w-[260px] text-[12px]">
          <div className="flex items-center justify-between border-b border-gray-100 pb-2 mb-2.5">
            <span className="font-bold text-[#04152d]">{label}</span>
            <span className={`px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase tracking-wider border shadow-2xs ${
              isProjected 
                ? 'bg-purple-100 text-purple-900 border-purple-300' 
                : 'bg-blue-100 text-blue-900 border-blue-300'
            }`}>
              {isProjected ? 'Simulated Estimate' : 'Posted Ledger Entry'}
            </span>
          </div>

          <div className="space-y-1.5">
            <div className="flex justify-between items-center text-[11px]">
              <span className="text-emerald-700 font-semibold">Monthly Inflows:</span>
              <span className="font-mono font-bold text-emerald-700">+{formatCurrency(dataPoint.inflows)}</span>
            </div>
            <div className="flex justify-between items-center text-[11px]">
              <span className="text-rose-700 font-semibold">Monthly Outflows:</span>
              <span className="font-mono font-bold text-rose-700">-{formatCurrency(dataPoint.outflows)}</span>
            </div>
            <div className="flex justify-between items-center text-[11px] pt-1 border-t border-gray-100">
              <span className="text-[#04152d]/60 font-semibold">Net Cashflow:</span>
              <span className={`font-mono font-bold ${dataPoint.netMovement >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                {dataPoint.netMovement >= 0 ? '+' : ''}{formatCurrency(dataPoint.netMovement)}
              </span>
            </div>
            <div className="flex justify-between items-center text-[12px] pt-1 border-t border-gray-100">
              <span className="text-[#04152d] font-bold">
                {isProjected ? 'Projected Balance:' : 'Ending Balance:'}
              </span>
              <span className="font-mono font-extrabold text-blue-700">
                {formatCurrency(dataPoint.actualEndingBalance)}
              </span>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  const ultraGlassCard = "bg-white/50 backdrop-blur-[40px] backdrop-saturate-[200%] border border-white/80 shadow-[0_8px_30px_rgba(4,21,45,0.06),inset_0_2px_3px_rgba(255,255,255,0.9)] rounded-[24px] p-6 relative overflow-hidden";
  const glassInput = "pl-4 pr-9 py-2.5 bg-white/70 hover:bg-white/90 focus:bg-white backdrop-blur-xl border border-white/90 shadow-[inset_0_2px_4px_rgba(4,21,45,0.03)] rounded-xl text-[13px] font-semibold text-[#04152d] outline-none transition-all placeholder:text-[#04152d]/40";

  return (
    <div className="p-4 md:p-6 max-w-[1400px] w-full mx-auto animate-fade-in flex-1 relative z-10 space-y-6">
      {/* Depletion Alert Notification Banner (Criteria 14) */}
      {activeAlertPredictions.length > 0 && (
        <div className="bg-gradient-to-r from-rose-50/90 to-amber-50/90 backdrop-blur-xl border border-rose-200/80 p-4 rounded-[22px] shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-fade-in">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-rose-100 text-rose-700 flex items-center justify-center shrink-0 border border-rose-300">
              <ShieldAlert size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="text-[14px] font-bold text-[#04152d]">
                  Depletion Risk Alert Active
                </h4>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-rose-200 text-rose-900 border border-rose-300">
                  {activeAlertPredictions.length} Alert{activeAlertPredictions.length > 1 ? 's' : ''}
                </span>
              </div>
              <p className="text-[12px] text-[#04152d]/70 font-medium mt-0.5">
                {activeAlertPredictions[0]?.alertSummary || 'Funds have been detected with imminent depletion trajectories.'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setIsAlertModalOpen(true)}
            className="px-4 py-2 bg-rose-700 hover:bg-rose-800 text-white rounded-full text-[11px] font-bold shadow-xs transition-all active:scale-95 shrink-0 cursor-pointer self-start sm:self-auto"
          >
            Review Active Alerts
          </button>
        </div>
      )}

      {/* Control & Configuration Bar */}
      <div className={`${ultraGlassCard} !p-4 flex flex-col lg:flex-row items-center justify-between gap-4`}>
        {/* User Story 1: Select Active Fund */}
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full lg:w-auto">
          <div className="relative w-full sm:w-72">
            <span className="block text-[9px] font-bold text-[#04152d]/50 uppercase tracking-widest mb-1">
              Select Fund for Analysis
            </span>
            <select
              value={selectedFund?.id || ''}
              onChange={(e) => handleFundChange(e.target.value)}
              className={`${glassInput} w-full cursor-pointer appearance-none`}
            >
              {activeFunds.map(f => (
                <option key={f.id} value={f.id}>
                  {f.name} ({f.code})
                </option>
              ))}
            </select>
            <Building2 size={15} className="absolute right-3.5 bottom-3 text-[#04152d]/40 pointer-events-none" />
          </div>

          {/* User Story 2: Historical Analysis Period Window */}
          <div className="w-full sm:w-auto">
            <span className="block text-[9px] font-bold text-[#04152d]/50 uppercase tracking-widest mb-1">
              Historical Analysis Window
            </span>
            <div className="flex items-center gap-1.5 p-1 bg-white/60 rounded-xl border border-white">
              {(['3M', '6M', '12M', 'ALL'] as const).map(preset => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => handlePeriodPresetChange(preset)}
                  className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                    periodPreset === preset
                      ? 'bg-[#04152d] text-white shadow-xs'
                      : 'hover:bg-white/80 text-[#04152d]/60'
                  }`}
                >
                  {preset === 'ALL' ? 'All' : preset}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2.5 w-full lg:w-auto justify-end">
          <button
            type="button"
            onClick={() => setIsHistoryModalOpen(true)}
            className="px-4 py-2.5 bg-white/70 hover:bg-white text-[#04152d] border border-white rounded-full text-[12px] font-bold shadow-xs transition-all flex items-center gap-1.5 active:scale-95 cursor-pointer"
          >
            <History size={14} className="text-blue-700" />
            Audit History & Model Provenance
          </button>

          {!isAuditorView && (
            <button
              type="button"
              onClick={() => setIsGenerateModalOpen(true)}
              className="px-5 py-2.5 bg-[#04152d] hover:bg-[#0a1e3f] text-white rounded-full text-[12px] font-bold shadow-md transition-all flex items-center gap-2 active:scale-95 cursor-pointer"
            >
              <Sparkles size={14} className="text-amber-400" />
              Simulate Lifespan Scenario
            </button>
          )}
        </div>
      </div>

      {/* Main KPI Status Strip */}
      {selectedFund && activePrediction && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: Current Validated Fund Balance & As-Of Date (Criteria 3) */}
          <div className={`${ultraGlassCard} !p-5 space-y-1`}>
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-[#04152d]/50 uppercase tracking-widest">
                Validated Balance
              </span>
              <span className="px-2 py-0.5 rounded-full text-[9px] font-bold uppercase bg-blue-50 text-blue-800 border border-blue-200">
                Posted
              </span>
            </div>
            <div className="text-[22px] font-extrabold text-blue-700 tracking-tight">
              {formatCurrency(activePrediction.factors.currentBalance)}
            </div>
            <p className="text-[10px] text-[#04152d]/50 font-semibold">
              As of {activePrediction.factors.balanceAsOfDate}
            </p>
          </div>

          {/* Card 2: Historical Net Movement (Inflows - Outflows) (Criteria 4 & 5) */}
          <div className={`${ultraGlassCard} !p-5 space-y-1`}>
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-[#04152d]/50 uppercase tracking-widest">
                Net Cashflow ({periodPreset})
              </span>
              <span className={`text-[10px] font-bold ${activePrediction.factors.netMovementTotal >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                {activePrediction.factors.netMovementTotal >= 0 ? 'Surplus' : 'Deficit'}
              </span>
            </div>
            <div className={`text-[22px] font-extrabold tracking-tight ${
              activePrediction.factors.netMovementTotal >= 0 ? 'text-emerald-700' : 'text-rose-700'
            }`}>
              {activePrediction.factors.netMovementTotal >= 0 ? '+' : ''}
              {formatCurrency(activePrediction.factors.netMovementTotal)}
            </div>
            <p className="text-[10px] text-[#04152d]/50 font-medium">
              In: +{formatCurrency(activePrediction.factors.totalHistoricalInflows)} • Out: -{formatCurrency(activePrediction.factors.totalHistoricalOutflows)}
            </p>
          </div>

          {/* Card 3: Projected Lifespan / Depletion Date (Criteria 7 & 8) */}
          <div className={`${ultraGlassCard} !p-5 space-y-1`}>
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-[#04152d]/50 uppercase tracking-widest">
                Predicted Lifespan
              </span>
              <span className="text-[9px] font-mono text-[#04152d]/50 font-bold">
                Run-Rate
              </span>
            </div>
            <div className="text-[20px] font-extrabold text-[#04152d] tracking-tight">
              {activePrediction.remainingLifespanDisplay}
            </div>
            <p className="text-[10px] text-[#04152d]/50 font-medium">
              {activePrediction.projectedDepletionDate 
                ? `Depletion Point: ${activePrediction.projectedDepletionDate}` 
                : 'Zero finite depletion detected'}
            </p>
          </div>

          {/* Card 4: Fund Condition & Confidence Rating (Criteria 10 & 12) */}
          <div className={`${ultraGlassCard} !p-5 space-y-1`}>
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-[#04152d]/50 uppercase tracking-widest">
                Condition & Confidence
              </span>
              <span className="text-[10px] font-bold text-blue-700">
                {activePrediction.confidenceScore}% Score
              </span>
            </div>
            <div className="pt-1">
              <span className={`inline-block px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider border shadow-xs ${getConditionStyle(activePrediction.condition)}`}>
                {activePrediction.condition}
              </span>
            </div>
            <p className="text-[10px] text-[#04152d]/50 font-medium pt-1">
              Quality: {activePrediction.confidenceLevel} Confidence • {activePrediction.factors.analysisPeriodMonths} mo sample
            </p>
          </div>
        </div>
      )}

      {/* Criteria 11: Data Sufficiency Warning Banner */}
      {activePrediction && !activePrediction.hasSufficientData && (
        <div className="bg-amber-50/90 border border-amber-200/90 p-4 rounded-[20px] text-amber-900 shadow-sm flex items-start gap-3 animate-fade-in">
          <AlertTriangle size={18} className="text-amber-600 shrink-0 mt-0.5" />
          <div className="text-[12px] leading-relaxed">
            <strong className="font-bold">Insufficient Historical Ledger Data:</strong> This fund has fewer than 3 months of validated transaction history in the selected evaluation window. Per actuarial rules, the system will not project a finite depletion date to prevent unreliable forecasts.
          </div>
        </div>
      )}

      {/* IMPROVED CHART MODULE WITH RICH CATEGORIES & FILTERS (Criteria 9 & 16) */}
      {activePrediction && (
        <div id="actuarial-chart-section" className={`${ultraGlassCard} !p-6 space-y-5 transition-all duration-500`}>
          {/* Chart Header Bar */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 border-b border-gray-100 pb-3">
            <div className="flex items-center gap-2">
              <h3 className="text-[16px] font-bold text-[#04152d] tracking-tight">
                Actuarial Trajectory & Cashflow Projection
              </h3>
            </div>

            {/* Actual vs Predicted Legend */}
            <div className="flex items-center gap-3 text-[11px] font-semibold">
              <span className="flex items-center gap-1.5 text-blue-700">
                <span className="w-3 h-3 rounded-full bg-blue-600" /> [Actual] Posted Ledger
              </span>
              <span className="flex items-center gap-1.5 text-purple-700">
                <span className="w-3 h-3 rounded-full bg-purple-500 border border-dashed border-purple-800" /> [Predicted] Projected Estimate
              </span>
            </div>
          </div>

          {/* Interactive Chart Category Tabs & Data Scope Filter */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-gray-50/70 p-2.5 rounded-2xl border border-gray-200">
            {/* Category / View Mode Switcher */}
            <div className="flex items-center gap-1.5 overflow-x-auto hide-scrollbar">
              {[
                { id: 'overview', label: 'Combined Overview', icon: Layers },
                { id: 'trajectory', label: 'Reserve Trajectory', icon: TrendingUp },
                { id: 'flows', label: 'Inflows vs Outflows', icon: ArrowUpRight },
                { id: 'burn', label: 'Net Burn Rate', icon: Flame },
              ].map(cat => {
                const IconComponent = cat.icon;
                const isActive = chartCategory === cat.id;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setChartCategory(cat.id as any)}
                    className={`px-3 py-1.5 rounded-xl text-[11px] font-bold transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
                      isActive
                        ? 'bg-[#04152d] text-white shadow-xs'
                        : 'bg-white hover:bg-gray-100 text-[#04152d]/70 border border-gray-200'
                    }`}
                  >
                    <IconComponent size={13} className={isActive ? 'text-amber-400' : 'text-[#04152d]/50'} />
                    {cat.label}
                  </button>
                );
              })}
            </div>

            {/* Data Horizon Scope Filter */}
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-[10px] uppercase font-bold text-[#04152d]/50">Scope:</span>
              <div className="flex items-center gap-1 p-0.5 bg-white rounded-xl border border-gray-200">
                {[
                  { id: 'all', label: 'All Periods' },
                  { id: 'actual', label: 'Ledger Actuals' },
                  { id: 'projected', label: 'Forecast Only' },
                ].map(scope => (
                  <button
                    key={scope.id}
                    type="button"
                    onClick={() => setDataScope(scope.id as any)}
                    className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                      dataScope === scope.id
                        ? 'bg-blue-700 text-white shadow-2xs'
                        : 'text-[#04152d]/60 hover:text-[#04152d]'
                    }`}
                  >
                    {scope.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Series Visibility Toggles & Quick Stats Strip */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-[11px]">
            {/* Series Toggles */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[10px] uppercase font-bold text-[#04152d]/50">Series:</span>
              <button
                type="button"
                onClick={() => toggleSeries('balance')}
                className={`px-2.5 py-1 rounded-full font-bold border transition-all flex items-center gap-1 cursor-pointer ${
                  visibleSeries.balance 
                    ? 'bg-blue-50 text-blue-800 border-blue-300' 
                    : 'bg-gray-100 text-gray-400 border-gray-200'
                }`}
              >
                <span className={`w-2 h-2 rounded-full ${visibleSeries.balance ? 'bg-blue-600' : 'bg-gray-300'}`} />
                Reserve Balance
              </button>

              <button
                type="button"
                onClick={() => toggleSeries('inflows')}
                className={`px-2.5 py-1 rounded-full font-bold border transition-all flex items-center gap-1 cursor-pointer ${
                  visibleSeries.inflows 
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-300' 
                    : 'bg-gray-100 text-gray-400 border-gray-200'
                }`}
              >
                <span className={`w-2 h-2 rounded-full ${visibleSeries.inflows ? 'bg-emerald-600' : 'bg-gray-300'}`} />
                Inflows
              </button>

              <button
                type="button"
                onClick={() => toggleSeries('outflows')}
                className={`px-2.5 py-1 rounded-full font-bold border transition-all flex items-center gap-1 cursor-pointer ${
                  visibleSeries.outflows 
                    ? 'bg-rose-50 text-rose-800 border-rose-300' 
                    : 'bg-gray-100 text-gray-400 border-gray-200'
                }`}
              >
                <span className={`w-2 h-2 rounded-full ${visibleSeries.outflows ? 'bg-rose-600' : 'bg-gray-300'}`} />
                Outflows
              </button>

              <button
                type="button"
                onClick={() => toggleSeries('net')}
                className={`px-2.5 py-1 rounded-full font-bold border transition-all flex items-center gap-1 cursor-pointer ${
                  visibleSeries.net 
                    ? 'bg-purple-50 text-purple-800 border-purple-300' 
                    : 'bg-gray-100 text-gray-400 border-gray-200'
                }`}
              >
                <span className={`w-2 h-2 rounded-full ${visibleSeries.net ? 'bg-purple-600' : 'bg-gray-300'}`} />
                Net Cashflow
              </button>
            </div>

            {/* Key Statistics Strip */}
            {chartStats && (
              <div className="flex items-center gap-3 text-[11px] font-semibold text-[#04152d]/70 flex-wrap">
                <span>Peak: <strong className="text-blue-700">{formatCurrency(chartStats.peakBalance)}</strong></span>
                <span>•</span>
                <span>Ending: <strong className={chartStats.endingBalance > 0 ? 'text-blue-700' : 'text-rose-700'}>{formatCurrency(chartStats.endingBalance)}</strong></span>
                <span>•</span>
                <span>Monthly Velocity: <strong className={chartStats.avgNet >= 0 ? 'text-emerald-700' : 'text-rose-700'}>
                  {chartStats.avgNet >= 0 ? '+' : ''}{formatCurrency(chartStats.avgNet)}/mo
                </strong></span>
              </div>
            )}
          </div>

          {/* Recharts Multi-Mode Dynamic Visualizer */}
          <div className="h-[360px] w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              {chartCategory === 'burn' ? (
                /* Diverging Bar Chart for Net Burn Rate */
                <ComposedChart data={filteredTimeSeries} margin={{ top: 15, right: 15, left: 15, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(4,21,45,0.06)" />
                  <XAxis 
                    dataKey="label" 
                    tick={{ fontSize: 11, fill: '#04152d', fontWeight: 600 }} 
                    stroke="rgba(4,21,45,0.15)"
                  />
                  <YAxis 
                    tick={{ fontSize: 11, fill: '#04152d', fontWeight: 600 }}
                    stroke="rgba(4,21,45,0.15)"
                    tickFormatter={(val) => `₱${(val / 1000).toFixed(0)}k`}
                  />
                  <ChartTooltip content={<CustomChartTooltip />} />
                  <ReferenceLine y={0} stroke="#04152d" strokeWidth={1.5} label={{ value: 'Break-Even (₱0.00)', position: 'insideTopLeft', fill: '#04152d', fontSize: 10, fontWeight: 700 }} />
                  <Bar dataKey="netMovement" name="Monthly Net Movement" maxBarSize={28} radius={[4, 4, 4, 4]}>
                    {filteredTimeSeries.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.netMovement >= 0 ? '#10b981' : '#f43f5e'} />
                    ))}
                  </Bar>
                </ComposedChart>
              ) : chartCategory === 'flows' ? (
                /* Grouped Bar Chart for Inflows vs Outflows */
                <ComposedChart data={filteredTimeSeries} margin={{ top: 15, right: 15, left: 15, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(4,21,45,0.06)" />
                  <XAxis 
                    dataKey="label" 
                    tick={{ fontSize: 11, fill: '#04152d', fontWeight: 600 }} 
                    stroke="rgba(4,21,45,0.15)"
                  />
                  <YAxis 
                    tick={{ fontSize: 11, fill: '#04152d', fontWeight: 600 }}
                    stroke="rgba(4,21,45,0.15)"
                    tickFormatter={(val) => `₱${(val / 1000).toFixed(0)}k`}
                  />
                  <ChartTooltip content={<CustomChartTooltip />} />
                  {visibleSeries.inflows && (
                    <Bar dataKey="inflows" name="Posted Inflows" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={22} />
                  )}
                  {visibleSeries.outflows && (
                    <Bar dataKey="outflows" name="Posted Outflows" fill="#f43f5e" radius={[4, 4, 0, 0]} maxBarSize={22} />
                  )}
                  {visibleSeries.net && (
                    <Line 
                      type="monotone" 
                      dataKey="netMovement" 
                      name="Net Cashflow" 
                      stroke="#04152d" 
                      strokeWidth={2}
                      dot={{ r: 4, stroke: '#04152d', fill: '#ffffff' }}
                    />
                  )}
                </ComposedChart>
              ) : chartCategory === 'trajectory' ? (
                /* Pure Trajectory Area Chart with Depletion Line */
                <ComposedChart data={filteredTimeSeries} margin={{ top: 15, right: 15, left: 15, bottom: 20 }}>
                  <defs>
                    <linearGradient id="trajGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#2563eb" stopOpacity={0.35} />
                      <stop offset="95%" stopColor="#2563eb" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(4,21,45,0.06)" />
                  <XAxis 
                    dataKey="label" 
                    tick={{ fontSize: 11, fill: '#04152d', fontWeight: 600 }} 
                    stroke="rgba(4,21,45,0.15)"
                  />
                  <YAxis 
                    tick={{ fontSize: 11, fill: '#04152d', fontWeight: 600 }}
                    stroke="rgba(4,21,45,0.15)"
                    tickFormatter={(val) => `₱${(val / 1000).toFixed(0)}k`}
                  />
                  <ChartTooltip content={<CustomChartTooltip />} />
                  <ReferenceLine y={0} stroke="#dc2626" strokeDasharray="4 4" strokeWidth={1.5} label={{ value: 'Depletion Waterline (₱0.00)', position: 'insideBottomRight', fill: '#dc2626', fontSize: 10, fontWeight: 700 }} />
                  {projectionStartIndex !== -1 && (
                    <ReferenceLine x={filteredTimeSeries[projectionStartIndex]?.label} stroke="#9333ea" strokeDasharray="3 3" label={{ value: 'Forecast Horizon', position: 'top', fill: '#9333ea', fontSize: 10, fontWeight: 700 }} />
                  )}
                  {visibleSeries.balance && (
                    <Area 
                      type="monotone" 
                      dataKey="actualEndingBalance" 
                      name="Reserve Balance" 
                      stroke="#2563eb" 
                      strokeWidth={3}
                      fill="url(#trajGradient)"
                      dot={{ r: 4, stroke: '#2563eb', strokeWidth: 2, fill: '#ffffff' }}
                      activeDot={{ r: 6 }}
                    />
                  )}
                </ComposedChart>
              ) : (
                /* Overview: Dual Y-Axis (Left: Reserve Balance, Right: Monthly Flow Volume) */
                <ComposedChart data={filteredTimeSeries} margin={{ top: 15, right: 15, left: 15, bottom: 20 }}>
                  <defs>
                    <linearGradient id="actualGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#2563eb" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#2563eb" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>

                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(4,21,45,0.06)" />
                  <XAxis 
                    dataKey="label" 
                    tick={{ fontSize: 11, fill: '#04152d', fontWeight: 600 }} 
                    stroke="rgba(4,21,45,0.15)"
                  />
                  {/* Left Axis: Reserve Balance */}
                  <YAxis 
                    yAxisId="balance"
                    orientation="left"
                    tick={{ fontSize: 11, fill: '#2563eb', fontWeight: 600 }}
                    stroke="#2563eb"
                    tickFormatter={(val) => `₱${(val / 1000).toFixed(0)}k`}
                  />
                  {/* Right Axis: Monthly Flow Volume */}
                  <YAxis 
                    yAxisId="flows"
                    orientation="right"
                    tick={{ fontSize: 11, fill: '#10b981', fontWeight: 600 }}
                    stroke="#10b981"
                    tickFormatter={(val) => `₱${(val / 1000).toFixed(0)}k`}
                  />
                  <ChartTooltip content={<CustomChartTooltip />} />

                  {/* Cashflow Bars tied to Right Axis */}
                  {visibleSeries.inflows && (
                    <Bar yAxisId="flows" dataKey="inflows" name="Posted Inflows" fill="#10b981" opacity={0.7} radius={[4, 4, 0, 0]} maxBarSize={16} />
                  )}
                  {visibleSeries.outflows && (
                    <Bar yAxisId="flows" dataKey="outflows" name="Posted Outflows" fill="#f43f5e" opacity={0.7} radius={[4, 4, 0, 0]} maxBarSize={16} />
                  )}

                  {/* Net Movement Line tied to Right Axis */}
                  {visibleSeries.net && (
                    <Line 
                      yAxisId="flows"
                      type="monotone" 
                      dataKey="netMovement" 
                      name="Net Movement" 
                      stroke="#9333ea" 
                      strokeWidth={2}
                      strokeDasharray="4 4"
                      dot={{ r: 3, fill: '#9333ea' }}
                    />
                  )}

                  {/* Balance Curve tied to Left Axis */}
                  {visibleSeries.balance && (
                    <Line 
                      yAxisId="balance"
                      type="monotone" 
                      dataKey="actualEndingBalance" 
                      name="Reserve Balance" 
                      stroke="#2563eb" 
                      strokeWidth={3} 
                      dot={{ r: 4, stroke: '#2563eb', strokeWidth: 2, fill: '#ffffff' }}
                      activeDot={{ r: 6 }}
                    />
                  )}
                </ComposedChart>
              )}
            </ResponsiveContainer>
          </div>

          {/* Chart Footer Advisory Note */}
          <div className="pt-2 border-t border-gray-100 flex flex-col sm:flex-row items-center justify-between text-[11px] text-[#04152d]/60 font-medium gap-2">
            <span>
              Disclaimer: Future projections are statistical simulations calculated from historical run-rates and do not represent guaranteed cash availability.
            </span>
            <span className="font-semibold text-[#04152d]">
              Evaluation Horizon: Next 6 Months Forward
            </span>
          </div>
        </div>
      )}

      {/* Explainable Prediction Factors Card (User Story 13) */}
      {activePrediction && (
        <div className={`${ultraGlassCard} !p-6 space-y-4`}>
          <div className="flex items-center justify-between border-b border-gray-100 pb-3">
            <div className="flex items-center gap-2">
              <BrainCircuit size={18} className="text-blue-700" />
              <h3 className="text-[15px] font-bold text-[#04152d] tracking-tight">
                Explainable Prediction Factors & Financial Assumptions
              </h3>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-[12px]">
            {/* Factor 1: Baseline Liquidity */}
            <div className="bg-white/80 p-4 rounded-2xl border border-white shadow-xs space-y-1">
              <span className="block text-[10px] uppercase font-bold text-[#04152d]/50">
                1. Starting Baseline Balance
              </span>
              <span className="text-[18px] font-extrabold text-blue-700 block">
                {formatCurrency(activePrediction.factors.currentBalance)}
              </span>
              <p className="text-[11px] text-[#04152d]/60">
                Reconciled against master fund ledger as of {activePrediction.factors.balanceAsOfDate}.
              </p>
            </div>

            {/* Factor 2: Net Consumption Rate */}
            <div className="bg-white/80 p-4 rounded-2xl border border-white shadow-xs space-y-1">
              <span className="block text-[10px] uppercase font-bold text-[#04152d]/50">
                2. Average Monthly Net Burn
              </span>
              <span className={`text-[18px] font-extrabold block ${
                activePrediction.factors.averageMonthlyBurnRate > 0 ? 'text-rose-700' : 'text-emerald-700'
              }`}>
                {activePrediction.factors.averageMonthlyBurnRate > 0 ? '-' : '+'}
                {formatCurrency(Math.abs(activePrediction.factors.averageMonthlyBurnRate))} / mo
              </span>
              <p className="text-[11px] text-[#04152d]/60">
                Calculated from {activePrediction.factors.analysisPeriodMonths} active sample months ({formatCurrency(activePrediction.factors.netMovementTotal)} net variance).
              </p>
            </div>

            {/* Factor 3: Data Quality & Reliability */}
            <div className="bg-white/80 p-4 rounded-2xl border border-white shadow-xs space-y-1">
              <span className="block text-[10px] uppercase font-bold text-[#04152d]/50">
                3. Statistical Quality Index
              </span>
              <span className="text-[18px] font-extrabold text-blue-700 block">
                {activePrediction.confidenceScore}% ({activePrediction.confidenceLevel})
              </span>
              <p className="text-[11px] text-[#04152d]/60">
                Evaluates ledger posting frequency, sample size completeness, and volatility metrics.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Modals */}
      <GeneratePredictionModal
        isOpen={isGenerateModalOpen}
        onClose={() => setIsGenerateModalOpen(false)}
        funds={funds}
        transactions={transactions}
        onPredictionGenerated={handlePredictionGenerated}
        userName={currentUserRole}
      />

      <PredictionSuccessModal
        isOpen={isSuccessModalOpen}
        onClose={() => {
          setIsSuccessModalOpen(false);
          scrollToChart('blue');
        }}
        prediction={newlyCreatedPrediction}
      />

      <PredictionHistoryModal
        isOpen={isHistoryModalOpen}
        onClose={() => setIsHistoryModalOpen(false)}
        predictions={predictions}
        isAuditorView={isAuditorView}
        onSelectPrediction={(pred) => {
          setSelectedFundId(pred.fundId);
          setActivePrediction(pred);
          setChartCategory('overview');
          scrollToChart('blue');
        }}
      />

      <DepletionAlertModal
        isOpen={isAlertModalOpen}
        onClose={() => setIsAlertModalOpen(false)}
        activeAlertPredictions={activeAlertPredictions}
        onSelectPrediction={(pred) => {
          setSelectedFundId(pred.fundId);
          setActivePrediction(pred);
          setChartCategory('trajectory');
          scrollToChart('rose');
        }}
      />
    </div>
  );
}
