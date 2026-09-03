"use client";

import React, { useState } from 'react';
import { X, Loader2, BrainCircuit, History, CheckCircle2, Clock, Database, Target } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  selectedFundName: string;
  targetEndDate: string;
}

const MOCK_HISTORY = [
  { id: 'FCST-092', date: '2026-08-28 14:30', status: 'Completed', user: 'Treasurer' },
  { id: 'FCST-091', date: '2026-07-28 10:15', status: 'Completed', user: 'Treasurer' },
  { id: 'FCST-090', date: '2026-06-29 16:45', status: 'Completed', user: 'System Auto' },
];

export default function ForecastGenerationModal({ isOpen, onClose, onSuccess, selectedFundName, targetEndDate }: Props) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);

  const handleGenerate = () => {
    setIsGenerating(true);
    setLoadingStep(1);
    
    setTimeout(() => setLoadingStep(2), 800);
    setTimeout(() => setLoadingStep(3), 1600);
    
    setTimeout(() => {
      setIsGenerating(false);
      setLoadingStep(0);
      onSuccess();
      onClose();
    }, 2500);
  };

  if (!isOpen) return null;

  const ultraGlassCard = "bg-white/80 backdrop-blur-[40px] backdrop-saturate-[200%] border border-white/90 shadow-[0_16px_40px_rgba(4,21,45,0.1),inset_0_2px_4px_rgba(255,255,255,1)] rounded-[24px] p-6 lg:p-8 relative overflow-hidden transition-all duration-400";

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 transition-opacity duration-300 opacity-100">
      <div className="absolute inset-0 bg-[#04152d]/40 backdrop-blur-md" onClick={() => !isGenerating && onClose()} />
      
      <div className={`relative w-full max-w-lg max-h-[90vh] flex flex-col animate-modal-enter ${ultraGlassCard}`}>
        
        <div className="flex items-center justify-between border-b border-white/60 pb-4 mb-5 shrink-0">
          <h3 className="text-[18px] font-semibold text-[#04152d] tracking-tight flex items-center gap-2">
            <BrainCircuit className="text-emerald-600" size={20} />
            AI Forecast Generation
          </h3>
          <button onClick={() => !isGenerating && onClose()} disabled={isGenerating} className="p-2 bg-white/50 hover:bg-white/80 rounded-full border border-white shadow-sm disabled:opacity-50 transition-colors outline-none">
            <X size={16} className="text-[#04152d]/60 hover:text-[#04152d]" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto pr-2 hide-scrollbar flex flex-col gap-6">
          
          <div className="bg-emerald-50/50 border border-emerald-100 p-5 rounded-[16px] flex flex-col items-center justify-center text-center shrink-0 relative overflow-hidden">
            <div className={`w-14 h-14 rounded-full flex items-center justify-center mb-3 shadow-sm transition-colors duration-500 relative z-10 ${isGenerating ? 'bg-emerald-100' : 'bg-white border border-emerald-100'}`}>
              {isGenerating ? (
                <Loader2 size={28} className="text-emerald-600 animate-spin" />
              ) : (
                <BrainCircuit size={28} className="text-emerald-600" />
              )}
            </div>
            <h4 className="text-[14px] font-semibold text-[#04152d] tracking-tight relative z-10">
              {isGenerating 
                ? loadingStep === 1 ? 'Validating historical ledgers...' 
                : loadingStep === 2 ? 'Applying predictive modeling...' 
                : 'Finalizing projections...'
                : 'Forecasting Engine Ready'}
            </h4>
            
            {/* Modal Purpose & Scope Definitions */}
            {!isGenerating && (
              <div className="mt-4 w-full bg-white/60 rounded-[12px] p-3 text-left border border-white/80">
                <p className="text-[10px] font-semibold text-[#04152d]/50 uppercase tracking-widest mb-2 border-b border-[#04152d]/10 pb-1">Data Scope Parameters</p>
                <div className="flex items-center gap-2 text-[12px] font-medium text-[#04152d] mb-1.5">
                  <Database size={14} className="text-blue-500" />
                  <span>Target Entity: <strong>{selectedFundName}</strong></span>
                </div>
                <div className="flex items-center gap-2 text-[12px] font-medium text-[#04152d]">
                  <Target size={14} className="text-orange-500" />
                  <span>Projection Horizon: <strong>{targetEndDate || 'No End Date Selected'}</strong></span>
                </div>
              </div>
            )}
          </div>

          <div className="shrink-0">
            <h4 className="text-[11px] font-semibold text-[#04152d]/60 uppercase tracking-widest flex items-center gap-1.5 mb-3">
              <History size={14} /> Generation History
            </h4>
            <div className="space-y-2">
              {MOCK_HISTORY.map((log) => (
                <div key={log.id} className="flex items-center justify-between p-3 bg-white/40 border border-white/60 rounded-[12px] shadow-[inset_0_1px_2px_rgba(255,255,255,0.8)]">
                  <div className="flex items-center gap-3">
                    <CheckCircle2 size={16} className="text-emerald-500" />
                    <div>
                      <p className="text-[12px] font-semibold text-[#04152d]">{log.id}</p>
                      <p className="text-[10px] font-medium text-[#04152d]/50 flex items-center gap-1"><Clock size={10} /> {log.date}</p>
                    </div>
                  </div>
                  <span className="text-[10px] font-semibold bg-white px-2 py-0.5 rounded shadow-sm text-[#04152d]/70">
                    By: {log.user}
                  </span>
                </div>
              ))}
            </div>
          </div>

        </div>

        <div className="shrink-0 border-t border-white/60 pt-5 mt-4 flex justify-end">
          <button onClick={handleGenerate} disabled={isGenerating || !targetEndDate} className="w-full relative overflow-hidden px-5 py-3 bg-gradient-to-b from-emerald-500 to-emerald-700 text-white border border-emerald-800 shadow-[0_6px_20px_rgba(16,185,129,0.3),inset_0_1px_1px_rgba(255,255,255,0.2)] hover:shadow-[0_8px_25px_rgba(16,185,129,0.4),inset_0_1px_1px_rgba(255,255,255,0.3)] hover:from-emerald-400 hover:to-emerald-600 rounded-[12px] text-[13px] font-semibold transition-all duration-300 flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50">
            {isGenerating ? 'Processing Forecast...' : !targetEndDate ? 'Select End Date to Generate' : 'Run Forecast Model'}
          </button>
        </div>

      </div>
    </div>
  );
}