"use client";

import React, { useState, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { 
  X, Activity, Calendar, Building2, AlertTriangle, 
  CheckCircle2, ArrowRight, Loader2, Sparkles, AlertCircle, 
  Info, ShieldCheck 
} from 'lucide-react';
import { Fund, FundTransaction, calculateFundBreakdown } from '@/lib/fundData';
import { 
  aggregateFundHistoricalMovements, 
  computeFundLifespanPrediction, 
  LifespanPredictionRecord 
} from '@/lib/lifespanData';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  funds: Fund[];
  transactions: FundTransaction[];
  onPredictionGenerated: (prediction: LifespanPredictionRecord) => void;
  userName?: string;
}

export default function GeneratePredictionModal({
  isOpen,
  onClose,
  funds,
  transactions,
  onPredictionGenerated,
  userName = 'Financial Officer'
}: Props) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Only valid/active funds available from Fund Management (Criteria 1)
  const activeFunds = useMemo(() => funds.filter(f => f.status === 'Active'), [funds]);

  const [selectedFundId, setSelectedFundId] = useState<string>(activeFunds[0]?.id || '');
  const [periodPreset, setPeriodPreset] = useState<'3M' | '6M' | '12M' | 'ALL'>('6M');
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  // Selected Fund
  const selectedFund = useMemo(() => {
    return activeFunds.find(f => f.id === selectedFundId) || activeFunds[0];
  }, [activeFunds, selectedFundId]);

  const selectedFundBalance = useMemo(() => {
    return selectedFund ? calculateFundBreakdown(selectedFund, transactions).currentBalance : 0;
  }, [selectedFund, transactions]);

  // Compute dates based on period preset (Criteria 2)
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

  // Data sufficiency and historical calculations pre-check (Criteria 2, 4, 5, 11)
  const historical = useMemo(() => {
    if (!selectedFund) return null;
    return aggregateFundHistoricalMovements(
      selectedFund.id,
      transactions,
      periodPreset === 'ALL' ? undefined : dateRange.startDate,
      dateRange.endDate
    );
  }, [selectedFund, transactions, periodPreset, dateRange]);

  const formatCurrency = (val: number) => 
    `₱${Number(val || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}`;

  const handleOpenConfirm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFund) return;
    setIsConfirmOpen(true);
  };

  const handleExecuteGenerate = () => {
    if (!selectedFund || !historical) return;

    setIsGenerating(true);

    setTimeout(() => {
      const newPrediction = computeFundLifespanPrediction(
        selectedFund,
        Number(selectedFundBalance || 0),
        historical,
        dateRange.startDate,
        dateRange.endDate,
        userName
      );

      setIsGenerating(false);
      setIsConfirmOpen(false);
      onPredictionGenerated(newPrediction);
      onClose();
    }, 700);
  };

  if (!isOpen || !mounted) return null;

  const glassInput = "w-full pl-4 pr-4 py-2.5 bg-gray-50/80 hover:bg-white focus:bg-white border border-gray-200 focus:border-blue-500 rounded-xl text-[13px] font-semibold text-[#04152d] outline-none transition-all placeholder:text-[#04152d]/40 focus:ring-2 focus:ring-blue-100 shadow-2xs";
  const labelStyle = "block text-[11px] font-bold text-[#04152d]/70 uppercase tracking-widest mb-1.5 flex items-center justify-between";

  const modalContent = (
    <>
      <div className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-6 overflow-hidden">
        {/* Outer locked backdrop */}
        <div 
          className="fixed inset-0 bg-[#04152d]/60 backdrop-blur-md animate-fade-in" 
          onClick={() => !isGenerating && onClose()} 
        />

        <div 
          className="relative w-full max-w-lg max-h-[86vh] flex flex-col bg-white/95 backdrop-blur-3xl border border-white/90 shadow-[0_24px_60px_rgba(4,21,45,0.25),inset_0_2px_4px_rgba(255,255,255,0.9)] rounded-[28px] overflow-hidden p-6 sm:p-7 z-10 animate-modal-enter"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Fixed Header */}
          <div className="flex items-center justify-between border-b border-gray-100 pb-4 mb-4 shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-blue-50 border border-blue-200 text-blue-600 flex items-center justify-center shadow-xs shrink-0">
                <Activity size={20} />
              </div>
              <div>
                <h3 className="text-[17px] font-bold text-[#04152d] tracking-tight">
                  Generate Fund Lifespan Prediction
                </h3>
                <p className="text-[11px] text-[#04152d]/60 font-medium">
                  Run actuarial run-rate simulation using validated ledger history
                </p>
              </div>
            </div>

            <button 
              onClick={() => !isGenerating && onClose()} 
              disabled={isGenerating} 
              className="w-8 h-8 rounded-full bg-white hover:bg-gray-100 text-[#04152d]/60 hover:text-[#04152d] flex items-center justify-center border border-gray-200 shadow-xs transition-colors cursor-pointer"
            >
              <X size={16} />
            </button>
          </div>

          {/* Scrollable Content Body - only inner content moves */}
          <div className="flex-1 overflow-y-auto pr-1 space-y-4 hide-scrollbar min-h-0 text-[12px]">
            <form id="prediction-form" onSubmit={handleOpenConfirm} className="space-y-4">
              {/* User Story 1: Select Active Fund */}
              <div>
                <label className={labelStyle}>
                  <span>Target Fund <span className="text-rose-500">*</span></span>
                  <span className="text-[10px] text-blue-600 font-medium lowercase">Active funds only</span>
                </label>
                <div className="relative">
                  <select
                    value={selectedFund?.id || ''}
                    onChange={(e) => setSelectedFundId(e.target.value)}
                    className={`${glassInput} cursor-pointer appearance-none pr-9`}
                  >
                    {activeFunds.map(f => {
                      const bal = calculateFundBreakdown(f, transactions).currentBalance;
                      return (
                        <option key={f.id} value={f.id}>
                          {f.name} ({f.code}) — Balance: {formatCurrency(bal)}
                        </option>
                      );
                    })}
                  </select>
                  <Building2 size={14} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#04152d]/40 pointer-events-none" />
                </div>
              </div>

              {/* User Story 2: Select Historical Period */}
              <div>
                <label className={labelStyle}>
                  <span>Analysis Period (Historical Baseline) <span className="text-rose-500">*</span></span>
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {[
                    { id: '3M', label: 'Last 3 Mo' },
                    { id: '6M', label: 'Last 6 Mo' },
                    { id: '12M', label: 'Last 12 Mo' },
                    { id: 'ALL', label: 'All History' },
                  ].map(tab => (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setPeriodPreset(tab.id as any)}
                      className={`py-2 rounded-xl text-[11px] font-bold border transition-all cursor-pointer ${
                        periodPreset === tab.id
                          ? 'bg-[#04152d] text-white border-[#04152d] shadow-xs'
                          : 'bg-gray-50 hover:bg-white text-[#04152d]/70 border-gray-200'
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
                <p className="text-[11px] text-[#04152d]/50 mt-1.5 font-medium">
                  Evaluation Range: <span className="font-semibold text-[#04152d]">{dateRange.startDate}</span> to <span className="font-semibold text-[#04152d]">{dateRange.endDate}</span>
                </p>
              </div>

              {/* Historical Pre-Check Card (Criteria 3, 4, 5, 11) */}
              {selectedFund && historical && (
                <div className="bg-gray-50/80 p-4 rounded-2xl border border-gray-200 shadow-2xs space-y-2.5">
                  <span className="block text-[10px] font-bold text-[#04152d]/50 uppercase tracking-widest border-b border-gray-200 pb-1.5">
                    Validated Dataset Evaluation
                  </span>

                  <div className="flex justify-between items-center text-[12px]">
                    <span className="text-[#04152d]/60 font-medium">Current Validated Balance:</span>
                    <span className="font-bold text-blue-700">{formatCurrency(selectedFundBalance)}</span>
                  </div>

                  <div className="flex justify-between items-center text-[12px]">
                    <span className="text-[#04152d]/60 font-medium">Historical Posted Inflows:</span>
                    <span className="font-bold text-emerald-700">+{formatCurrency(historical.totalInflows)}</span>
                  </div>

                  <div className="flex justify-between items-center text-[12px]">
                    <span className="text-[#04152d]/60 font-medium">Historical Posted Outflows:</span>
                    <span className="font-bold text-rose-700">-{formatCurrency(historical.totalOutflows)}</span>
                  </div>

                  <div className="flex justify-between items-center text-[12px] pt-1 border-t border-gray-200">
                    <span className="text-[#04152d]/60 font-bold">Net Movement (Inflows - Outflows):</span>
                    <span className={`font-bold text-[13px] ${historical.netMovementTotal >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                      {historical.netMovementTotal >= 0 ? '+' : ''}{formatCurrency(historical.netMovementTotal)}
                    </span>
                  </div>
                </div>
              )}

              {/* Data Sufficiency Warning / Notification (Criteria 11) */}
              {historical && !historical.hasSufficientData && (
                <div className="p-3.5 bg-amber-50 rounded-2xl border border-amber-200 text-amber-900 text-[11px] flex items-start gap-2.5 shadow-2xs leading-relaxed">
                  <AlertTriangle size={16} className="text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <strong className="font-bold block">Insufficient Historical Activity:</strong>
                    This fund has transactions recorded across only {historical.monthsCount} month(s) (minimum 3 required for predictive regression). The model will output an <strong>Insufficient Data</strong> status without a finite depletion date.
                  </div>
                </div>
              )}

              {historical && historical.hasSufficientData && (
                <div className="p-3 bg-emerald-50 rounded-2xl border border-emerald-200 text-emerald-900 text-[11px] flex items-center gap-2 shadow-2xs">
                  <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
                  <span>
                    Dataset satisfies requirements ({historical.monthsCount} monthly periods with posted activity).
                  </span>
                </div>
              )}
            </form>
          </div>

          {/* Fixed Footer */}
          <div className="shrink-0 border-t border-gray-100 pt-4 mt-3 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isGenerating}
              className="px-5 py-2.5 rounded-full text-[13px] font-semibold text-[#04152d]/70 hover:bg-gray-100 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              form="prediction-form"
              disabled={isGenerating || !selectedFund}
              className="px-6 py-2.5 rounded-full text-[13px] font-semibold bg-[#04152d] text-white hover:bg-[#0a1e3f] disabled:opacity-50 transition-all shadow-md flex items-center gap-2 active:scale-95 cursor-pointer"
            >
              Review & Simulate <ArrowRight size={14} />
            </button>
          </div>
        </div>
      </div>

      {/* DEDICATED SEPARATE CONFIRMATION OVERLAY MODAL */}
      {isConfirmOpen && selectedFund && historical && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 overflow-hidden">
          <div 
            className="fixed inset-0 bg-[#04152d]/65 backdrop-blur-md animate-fade-in" 
            onClick={() => !isGenerating && setIsConfirmOpen(false)}
          />
          <div 
            className="relative w-full max-w-md bg-white/98 backdrop-blur-3xl border border-white/90 shadow-[0_24px_60px_rgba(4,21,45,0.3),inset_0_2px_4px_rgba(255,255,255,0.9)] rounded-[28px] overflow-hidden p-6 sm:p-7 space-y-4 z-10 animate-modal-enter"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-start justify-between border-b border-gray-100 pb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-blue-50 border border-blue-200 text-blue-700 flex items-center justify-center shadow-xs shrink-0">
                  <Activity size={20} />
                </div>
                <div>
                  <h4 className="text-[17px] font-bold text-[#04152d] tracking-tight">
                    Confirm Prediction Execution
                  </h4>
                  <p className="text-[11px] text-[#04152d]/60 font-medium">
                    Verify simulation parameters before running analysis
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => !isGenerating && setIsConfirmOpen(false)}
                className="w-8 h-8 rounded-full bg-white hover:bg-gray-100 text-[#04152d]/60 hover:text-[#04152d] flex items-center justify-center border border-gray-200 shadow-xs transition-colors cursor-pointer"
              >
                <X size={15} />
              </button>
            </div>

            {/* Review Cards */}
            <div className="p-4 rounded-2xl bg-gray-50/80 border border-gray-200 shadow-2xs space-y-2.5 text-[12px]">
              <div className="flex justify-between items-center pb-2 border-b border-gray-200">
                <span className="text-[#04152d]/60 font-semibold uppercase text-[10px]">Target Fund:</span>
                <span className="font-bold text-[#04152d]">{selectedFund.name} ({selectedFund.code})</span>
              </div>

              <div className="flex justify-between items-center pb-2 border-b border-gray-200">
                <span className="text-[#04152d]/60 font-semibold uppercase text-[10px]">Analysis Range:</span>
                <span className="font-semibold text-[#04152d]">{dateRange.startDate} to {dateRange.endDate}</span>
              </div>

              <div className="flex justify-between items-center pb-2 border-b border-gray-200">
                <span className="text-[#04152d]/60 font-semibold uppercase text-[10px]">Starting Baseline Balance:</span>
                <span className="font-bold text-blue-700">{formatCurrency(selectedFundBalance)}</span>
              </div>

              <div className="flex justify-between items-center pt-1 border-t border-gray-200">
                <span className="text-[#04152d]/60 font-bold uppercase text-[10px]">Observed Net Flow:</span>
                <span className={`font-extrabold text-[14px] ${historical.netMovementTotal >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                  {historical.netMovementTotal >= 0 ? '+' : ''}{formatCurrency(historical.netMovementTotal)}
                </span>
              </div>
            </div>

            {!historical.hasSufficientData && (
              <div className="p-3 bg-amber-50 rounded-2xl border border-amber-200 text-amber-900 text-[11px] flex items-start gap-2 shadow-2xs">
                <AlertTriangle size={15} className="shrink-0 mt-0.5 text-amber-600" />
                <p>
                  <strong>Notice:</strong> This fund has fewer than 3 months of posted activity. Per system rules, the result will be classified as <strong>Insufficient Data</strong> without a finite depletion date.
                </p>
              </div>
            )}

            {/* Action Buttons */}
            <div className="pt-2 flex items-center justify-end gap-2.5 border-t border-gray-100">
              <button
                type="button"
                onClick={() => setIsConfirmOpen(false)}
                disabled={isGenerating}
                className="px-4 py-2.5 rounded-full text-[12px] font-semibold text-[#04152d]/70 hover:bg-gray-100 transition-colors cursor-pointer"
              >
                Back to Edit
              </button>
              <button
                type="button"
                onClick={handleExecuteGenerate}
                disabled={isGenerating}
                className="px-5 py-2.5 rounded-full text-[12px] font-bold bg-[#04152d] text-white hover:bg-[#0a1e3f] disabled:opacity-50 transition-all shadow-md flex items-center gap-1.5 active:scale-95 cursor-pointer"
              >
                {isGenerating ? (
                  <>
                    <Loader2 size={13} className="animate-spin" /> Running Simulation...
                  </>
                ) : (
                  <>
                    <Sparkles size={14} className="text-amber-400" /> Execute Prediction
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );

  return createPortal(modalContent, document.body);
}
