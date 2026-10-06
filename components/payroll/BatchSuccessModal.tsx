"use client";

import React from 'react';
import { 
  CheckCircle2, X, FileText, Calendar, 
  Layers, ArrowRight, ShieldCheck 
} from 'lucide-react';
import { PayrollBatch } from '@/lib/payrollData';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  batch: PayrollBatch | null;
}

export default function BatchSuccessModal({
  isOpen,
  onClose,
  batch
}: Props) {
  if (!isOpen || !batch) return null;

  const formatCurrency = (val: number) => 
    `₱${Number(val || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}`;

  const isReady = batch.status === 'Ready for Collection Processing';

  return (
    <div className="fixed inset-0 z-[130] flex items-center justify-center p-4 bg-[#04152d]/60 backdrop-blur-md animate-fade-in overflow-hidden">
      <div 
        className="relative w-full max-w-lg bg-white/95 backdrop-blur-3xl border border-white/90 shadow-[0_24px_60px_rgba(4,21,45,0.22),inset_0_2px_4px_rgba(255,255,255,1)] rounded-[28px] overflow-hidden animate-modal-enter p-6 lg:p-7 space-y-5"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between border-b border-white/70 pb-4">
          <div className="flex items-center gap-3">
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-xs shrink-0 ${
              isReady ? 'bg-emerald-50 border border-emerald-200 text-emerald-600' : 'bg-blue-50 border border-blue-200 text-blue-600'
            }`}>
              <CheckCircle2 size={26} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-[18px] font-bold text-[#04152d] tracking-tight">
                  {isReady ? 'Remittance Batch Ready for Processing' : 'Remittance Batch Saved'}
                </h3>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border shadow-xs ${
                  isReady 
                    ? 'bg-emerald-100 text-emerald-800 border-emerald-300' 
                    : 'bg-blue-100 text-blue-800 border-blue-300'
                }`}>
                  {batch.status}
                </span>
              </div>
              <p className="text-[12px] text-[#04152d]/60 font-medium">
                Batch Reference <span className="font-mono font-bold text-blue-700">{batch.batchRef}</span>
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/70 hover:bg-white text-[#04152d]/60 hover:text-[#04152d] flex items-center justify-center transition-all border border-white shadow-xs cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        {/* Batch Metric Summary */}
        <div className="p-4 rounded-2xl bg-white/80 border border-white shadow-xs space-y-3 text-[12px]">
          <div className="flex items-center justify-between">
            <span className="text-[#04152d]/60 font-medium">Target Payroll Period:</span>
            <span className="font-bold text-[#04152d]">{batch.payrollPeriod}</span>
          </div>

          <div className="grid grid-cols-3 gap-2 text-center pt-2 border-t border-white/60">
            <div className="bg-white/80 p-2.5 rounded-xl border border-white">
              <span className="text-[9px] uppercase font-bold text-[#04152d]/50 block">Total Records</span>
              <span className="text-[16px] font-extrabold text-[#04152d]">{batch.recordCount}</span>
            </div>
            <div className="bg-emerald-50/70 p-2.5 rounded-xl border border-emerald-200">
              <span className="text-[9px] uppercase font-bold text-emerald-800 block">Valid Matched</span>
              <span className="text-[16px] font-extrabold text-emerald-700">{batch.validCount}</span>
            </div>
            <div className={`p-2.5 rounded-xl border ${
              batch.exceptionCount > 0 ? 'bg-rose-50/70 border-rose-200' : 'bg-gray-50/70 border-gray-200'
            }`}>
              <span className={`text-[9px] uppercase font-bold block ${
                batch.exceptionCount > 0 ? 'text-rose-800' : 'text-gray-500'
              }`}>
                Exceptions
              </span>
              <span className={`text-[16px] font-extrabold ${
                batch.exceptionCount > 0 ? 'text-rose-700' : 'text-gray-600'
              }`}>
                {batch.exceptionCount}
              </span>
            </div>
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-white/70">
            <span className="text-[13px] font-bold text-[#04152d]">Total Remitted Value:</span>
            <span className="text-[20px] font-extrabold text-blue-700">
              {formatCurrency(batch.remittedTotal)}
            </span>
          </div>
        </div>

        {/* Advisory */}
        <div className="p-3.5 rounded-2xl bg-blue-50/60 border border-blue-200/80 text-blue-950 text-[12px] flex items-start gap-2.5 shadow-xs">
          <ShieldCheck size={16} className="text-blue-600 shrink-0 mt-0.5" />
          <div className="leading-relaxed">
            {isReady ? (
              <span>This batch has passed all validation checks and has been staged in the system. The Collecting Officer can now begin collection distribution and posting in the Collections module.</span>
            ) : (
              <span>Batch draft recorded. You can return to inspect exception details, resolve variances, or mark ready once discrepancies have been audited.</span>
            )}
          </div>
        </div>

        {/* Action */}
        <div className="pt-2">
          <button
            type="button"
            onClick={onClose}
            className="w-full py-2.5 bg-[#04152d] hover:bg-[#0a1e3f] text-white shadow-md rounded-full text-[12px] font-bold transition-all active:scale-95 text-center cursor-pointer"
          >
            Acknowledge & View Batch History
          </button>
        </div>
      </div>
    </div>
  );
}
