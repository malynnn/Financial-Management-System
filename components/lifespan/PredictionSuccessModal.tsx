"use client";

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { 
  CheckCircle2, X, Activity, Calendar, ShieldCheck, 
  ArrowRight, AlertTriangle, TrendingDown, TrendingUp, Sparkles 
} from 'lucide-react';
import { LifespanPredictionRecord } from '@/lib/lifespanData';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  prediction: LifespanPredictionRecord | null;
}

export default function PredictionSuccessModal({
  isOpen,
  onClose,
  prediction,
}: Props) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!isOpen || !prediction || !mounted) return null;

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

  const modalContent = (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-6 overflow-hidden">
      {/* Full-screen backdrop */}
      <div 
        className="fixed inset-0 bg-[#04152d]/60 backdrop-blur-md animate-fade-in" 
        onClick={onClose} 
      />

      {/* Modal Dialog Card */}
      <div 
        className="relative w-full max-w-lg max-h-[88vh] flex flex-col bg-white/95 backdrop-blur-3xl border border-white/90 shadow-[0_24px_60px_rgba(4,21,45,0.25),inset_0_2px_4px_rgba(255,255,255,0.9)] rounded-[28px] overflow-hidden p-6 sm:p-7 space-y-4 z-10 animate-modal-enter"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between border-b border-gray-100 pb-4 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center shadow-xs shrink-0">
              <CheckCircle2 size={26} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-[18px] font-bold text-[#04152d] tracking-tight">
                  Lifespan Prediction Generated
                </h3>
                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border shadow-xs ${getConditionStyle(prediction.condition)}`}>
                  {prediction.condition}
                </span>
              </div>
              <p className="text-[12px] text-[#04152d]/60 font-medium">
                Analysis Reference <span className="font-mono font-bold text-blue-700">{prediction.id}</span>
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

        {/* Prediction Key Findings Card */}
        <div className="flex-1 overflow-y-auto pr-1 space-y-3.5 hide-scrollbar min-h-0 text-[12px]">
          <div className="p-4 rounded-2xl bg-gray-50/80 border border-gray-200 shadow-2xs space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[#04152d]/60 font-medium">Target Fund:</span>
              <span className="font-bold text-[#04152d]">{prediction.fundName} ({prediction.fundCode})</span>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-gray-200">
              <div className="bg-white p-3 rounded-xl border border-gray-200 space-y-0.5 shadow-2xs">
                <span className="text-[10px] uppercase font-bold text-[#04152d]/50 block">Remaining Lifespan</span>
                <span className="text-[16px] font-extrabold text-[#04152d]">
                  {prediction.remainingLifespanDisplay}
                </span>
              </div>

              <div className="bg-white p-3 rounded-xl border border-gray-200 space-y-0.5 shadow-2xs">
                <span className="text-[10px] uppercase font-bold text-[#04152d]/50 block">Projected Depletion</span>
                <span className={`text-[16px] font-extrabold ${prediction.projectedDepletionDate ? 'text-rose-700' : 'text-emerald-700'}`}>
                  {prediction.projectedDepletionDate || 'None (Solvent)'}
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-gray-200 text-[11px]">
              <span className="text-[#04152d]/60 font-medium">Statistical Confidence:</span>
              <div className="flex items-center gap-1.5 font-bold">
                <span className="text-blue-700 font-mono">{prediction.confidenceScore}%</span>
                <span className="text-[10px] text-[#04152d]/50 font-medium">({prediction.confidenceLevel} Confidence)</span>
              </div>
            </div>

            <div className="flex items-center justify-between text-[11px]">
              <span className="text-[#04152d]/60 font-medium">Calculated Monthly Burn Rate:</span>
              <span className={`font-mono font-bold ${prediction.factors.averageMonthlyBurnRate > 0 ? 'text-rose-700' : 'text-emerald-700'}`}>
                {prediction.factors.averageMonthlyBurnRate > 0 ? '-' : '+'}
                {formatCurrency(Math.abs(prediction.factors.averageMonthlyBurnRate))} / mo
              </span>
            </div>
          </div>

          {/* Regulatory Advisory Note */}
          <div className="p-3.5 rounded-2xl bg-blue-50/70 border border-blue-200 text-blue-950 text-[11px] leading-relaxed flex items-start gap-2.5 shadow-2xs">
            <ShieldCheck size={16} className="text-blue-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold">Actuarial Forecast Notice:</span> This projection has been calculated and registered in the system audit trail. Note that estimates are statistical simulations based on historical posted transactions and do not replace formal board appropriations.
            </div>
          </div>
        </div>

        {/* Action Button */}
        <div className="pt-2 shrink-0 border-t border-gray-100">
          <button
            type="button"
            onClick={onClose}
            className="w-full py-2.5 bg-[#04152d] hover:bg-[#0a1e3f] text-white shadow-md rounded-full text-[12px] font-bold transition-all active:scale-95 text-center cursor-pointer"
          >
            Acknowledge & View Forecast Dashboard
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
