"use client";

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { 
  X, AlertTriangle, ShieldAlert, Building2, Calendar, 
  ArrowRight, CheckCircle2, TrendingDown, Info 
} from 'lucide-react';
import { LifespanPredictionRecord } from '@/lib/lifespanData';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  activeAlertPredictions: LifespanPredictionRecord[];
  onSelectPrediction: (prediction: LifespanPredictionRecord) => void;
}

export default function DepletionAlertModal({
  isOpen,
  onClose,
  activeAlertPredictions,
  onSelectPrediction,
}: Props) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!isOpen || !mounted) return null;

  const formatCurrency = (val: number) => 
    `₱${Number(val || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}`;

  const modalContent = (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-6 overflow-hidden">
      {/* Full-screen backdrop */}
      <div 
        className="fixed inset-0 bg-[#04152d]/60 backdrop-blur-md animate-fade-in" 
        onClick={onClose} 
      />

      {/* Modal Dialog Card */}
      <div 
        className="relative w-full max-w-2xl max-h-[86vh] flex flex-col bg-white/95 backdrop-blur-3xl border border-white/90 shadow-[0_24px_60px_rgba(4,21,45,0.25),inset_0_2px_4px_rgba(255,255,255,0.9)] rounded-[28px] overflow-hidden p-5 sm:p-7 z-10 animate-modal-enter"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Fixed Header */}
        <div className="flex items-center justify-between border-b border-gray-100 pb-4 mb-4 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center shadow-xs shrink-0">
              <ShieldAlert size={20} />
            </div>
            <div>
              <h3 className="text-[17px] font-bold text-[#04152d] tracking-tight">
                Active Fund Depletion Alerts
              </h3>
              <p className="text-[11px] text-[#04152d]/60 font-medium">
                {activeAlertPredictions.length} fund(s) flagged with elevated depletion risks
              </p>
            </div>
          </div>

          <button 
            onClick={onClose} 
            className="w-8 h-8 rounded-full bg-white hover:bg-gray-100 text-[#04152d]/60 hover:text-[#04152d] flex items-center justify-center border border-gray-200 shadow-xs transition-colors cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        {/* Scrollable Content Body - inner only */}
        <div className="flex-1 overflow-y-auto pr-1 space-y-3.5 hide-scrollbar min-h-0 text-[12px]">
          {activeAlertPredictions.length > 0 ? (
            activeAlertPredictions.map((pred) => (
              <div 
                key={pred.id} 
                className="bg-white/90 p-4 rounded-2xl border border-rose-200 shadow-xs space-y-3 relative overflow-hidden"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-rose-50 text-rose-700 flex items-center justify-center font-bold text-[13px] border border-rose-200">
                      {pred.fundCode}
                    </div>
                    <div>
                      <h4 className="text-[14px] font-bold text-[#04152d]">
                        {pred.fundName}
                      </h4>
                      <p className="text-[11px] text-[#04152d]/60 font-mono">
                        Ref {pred.id} • Evaluation: {pred.analysisPeriodStart} to {pred.analysisPeriodEnd}
                      </p>
                    </div>
                  </div>

                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border shadow-xs ${
                    pred.condition === 'Projected to Deplete' 
                      ? 'bg-rose-100 text-rose-800 border-rose-300' 
                      : 'bg-amber-100 text-amber-800 border-amber-300'
                  }`}>
                    {pred.condition}
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2 text-center text-[11px] pt-1 border-t border-rose-100">
                  <div className="bg-rose-50/40 p-2 rounded-xl border border-rose-100">
                    <span className="text-[9px] uppercase font-bold text-[#04152d]/50 block">Current Balance</span>
                    <span className="font-extrabold text-blue-700">{formatCurrency(pred.factors.currentBalance)}</span>
                  </div>

                  <div className="bg-rose-50/40 p-2 rounded-xl border border-rose-100">
                    <span className="text-[9px] uppercase font-bold text-[#04152d]/50 block">Estimated Lifespan</span>
                    <span className="font-extrabold text-rose-700">{pred.remainingLifespanDisplay}</span>
                  </div>

                  <div className="bg-rose-50/40 p-2 rounded-xl border border-rose-100">
                    <span className="text-[9px] uppercase font-bold text-[#04152d]/50 block">Depletion Horizon</span>
                    <span className="font-extrabold text-rose-800">{pred.projectedDepletionDate || 'Imminent'}</span>
                  </div>
                </div>

                {pred.alertSummary && (
                  <p className="text-[11px] text-rose-900 bg-rose-50/80 p-2.5 rounded-xl border border-rose-200 leading-relaxed font-medium">
                    {pred.alertSummary}
                  </p>
                )}

                <div className="flex justify-end pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      onSelectPrediction(pred);
                      onClose();
                    }}
                    className="px-4 py-1.5 bg-[#04152d] text-white hover:bg-[#0a1e3f] rounded-full text-[11px] font-bold shadow-xs transition-all flex items-center gap-1.5 active:scale-95 cursor-pointer"
                  >
                    Examine Forecast Chart <ArrowRight size={12} />
                  </button>
                </div>
              </div>
            ))
          ) : (
            <div className="p-8 text-center bg-white/70 rounded-2xl border border-white space-y-2">
              <CheckCircle2 size={32} className="mx-auto text-emerald-600" />
              <p className="text-[14px] font-bold text-[#04152d]">All Active Funds Solvent</p>
              <p className="text-[12px] text-[#04152d]/60">
                No active fund is currently classified as At Risk or Projected to Deplete.
              </p>
            </div>
          )}
        </div>

        {/* Fixed Footer */}
        <div className="shrink-0 border-t border-gray-100 pt-4 mt-3 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-full text-[12px] font-bold bg-white hover:bg-gray-100 text-[#04152d] border border-gray-200 shadow-xs transition-all cursor-pointer"
          >
            Dismiss Alert View
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
