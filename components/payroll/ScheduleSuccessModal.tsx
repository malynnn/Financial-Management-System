"use client";

import React from 'react';
import { 
  CheckCircle2, X, Calendar, User, FileText, 
  Banknote, AlertTriangle, ArrowRight, Plus 
} from 'lucide-react';
import { DeductionSchedule } from '@/lib/payrollData';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onScheduleAnother?: () => void;
  schedule: DeductionSchedule | null;
}

export default function ScheduleSuccessModal({
  isOpen,
  onClose,
  onScheduleAnother,
  schedule
}: Props) {
  if (!isOpen || !schedule) return null;

  const formatCurrency = (val: number) => 
    `₱${Number(val || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}`;

  const isFlagged = schedule.status === 'Flagged for Review';

  return (
    <div className="fixed inset-0 z-[130] flex items-center justify-center p-4 bg-[#04152d]/60 backdrop-blur-md animate-fade-in overflow-hidden">
      <div 
        className="relative w-full max-w-lg bg-white/95 backdrop-blur-3xl border border-white/90 shadow-[0_24px_60px_rgba(4,21,45,0.22),inset_0_2px_4px_rgba(255,255,255,1)] rounded-[28px] overflow-hidden animate-modal-enter p-6 lg:p-7 space-y-5"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between border-b border-white/70 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center shadow-xs shrink-0">
              <CheckCircle2 size={26} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-[18px] font-bold text-[#04152d] tracking-tight">
                  Deduction Schedule Confirmed
                </h3>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border shadow-xs ${
                  isFlagged 
                    ? 'bg-amber-100 text-amber-800 border-amber-300' 
                    : 'bg-emerald-100 text-emerald-800 border-emerald-300'
                }`}>
                  {schedule.status}
                </span>
              </div>
              <p className="text-[12px] text-[#04152d]/60 font-medium">
                Record saved under Schedule Reference <span className="font-mono font-bold text-blue-700">{schedule.id}</span>
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

        {/* Schedule Summary Card */}
        <div className="p-4 rounded-2xl bg-white/80 border border-white shadow-xs space-y-2.5 text-[12px]">
          <div className="flex items-center justify-between">
            <span className="text-[#04152d]/60 font-medium">Payroll Period:</span>
            <span className="font-bold text-[#04152d]">{schedule.payrollPeriod}</span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-[#04152d]/60 font-medium">Member:</span>
            <div className="text-right">
              <span className="font-bold text-[#04152d] block">{schedule.memberName}</span>
              <span className="font-mono text-[10px] text-blue-700 font-semibold">{schedule.memberId}</span>
            </div>
          </div>

          <div className="flex items-center justify-between pt-1 border-t border-white/60">
            <span className="text-[#04152d]/60 font-medium">Deduction Type:</span>
            <span className="font-semibold text-[#04152d]">{schedule.deductionType}</span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-[#04152d]/60 font-medium">Obligation Basis / Reference:</span>
            <span className={`font-mono text-[11px] font-bold px-2 py-0.5 rounded border ${
              schedule.obligationRef === 'UNASSIGNED-REVIEW' 
                ? 'bg-amber-50 text-amber-800 border-amber-300' 
                : 'bg-blue-50 text-blue-800 border-blue-200'
            }`}>
              {schedule.obligationRef}
            </span>
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-white/70">
            <span className="text-[13px] font-bold text-[#04152d]">Expected Deduction Amount:</span>
            <span className="text-[20px] font-extrabold text-blue-700">
              {formatCurrency(schedule.expectedAmount)}
            </span>
          </div>
        </div>

        {/* Status Advisory */}
        {isFlagged ? (
          <div className="p-3.5 rounded-2xl bg-amber-50/80 border border-amber-200/90 text-amber-900 text-[12px] flex items-start gap-2.5 shadow-xs">
            <AlertTriangle size={16} className="text-amber-600 shrink-0 mt-0.5" />
            <div className="leading-relaxed">
              <span className="font-bold">Flagged for Review:</span> No pre-existing active obligation basis was located for this deduction type. The Collecting Officer will be required to verify member authorization prior to final payroll collection clearance.
            </div>
          </div>
        ) : (
          <div className="p-3.5 rounded-2xl bg-emerald-50/80 border border-emerald-200/90 text-emerald-900 text-[12px] flex items-start gap-2.5 shadow-xs">
            <CheckCircle2 size={16} className="text-emerald-600 shrink-0 mt-0.5" />
            <div className="leading-relaxed">
              <span className="font-bold">Ready for Payroll Remittance:</span> This deduction has been matched against active obligation <span className="font-mono font-bold text-blue-800">{schedule.obligationRef}</span> and will automatically reconcile against uploaded payroll remittance files.
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="pt-2 flex flex-col sm:flex-row items-center gap-3">
          {onScheduleAnother && (
            <button
              type="button"
              onClick={onScheduleAnother}
              className="w-full sm:flex-1 py-2.5 rounded-full border border-white bg-white hover:bg-gray-50 text-[12px] font-bold text-[#04152d] transition-all shadow-xs flex items-center justify-center gap-1.5 active:scale-95 cursor-pointer"
            >
              <Plus size={14} className="text-blue-600" />
              <span>Schedule Another</span>
            </button>
          )}

          <button
            type="button"
            onClick={onClose}
            className="w-full sm:flex-1 py-2.5 bg-[#04152d] hover:bg-[#0a1e3f] text-white shadow-md rounded-full text-[12px] font-bold transition-all active:scale-95 text-center cursor-pointer"
          >
            Done & View Roster
          </button>
        </div>
      </div>
    </div>
  );
}
