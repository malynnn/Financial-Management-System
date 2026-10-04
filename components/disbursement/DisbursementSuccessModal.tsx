"use client";

import React from 'react';
import {
  CheckCircle2,
  X,
  Building2,
  FileText
} from 'lucide-react';

interface FundFinancialEffect {
  fundName: string;
  previousBalance: number;
  disbursedAmount: number;
  updatedBalance: number;
}

interface DisbursementSuccessModalProps {
  isOpen: boolean;
  onClose: () => void;
  onViewVoucher?: () => void;
  disbursement: {
    ref: string;
    payee: string;
    amount: number;
    fundSource: string;
    date: string;
    paymentMethod?: string;
    chequeRecord?: {
      chequeNumber: string;
      chequeDate: string;
      status: string;
    };
    fundFinancialEffect?: FundFinancialEffect;
  } | null;
}

export default function DisbursementSuccessModal({
  isOpen,
  onClose,
  onViewVoucher,
  disbursement
}: DisbursementSuccessModalProps) {
  if (!isOpen || !disbursement) return null;

  const effect = disbursement.fundFinancialEffect || {
    fundName: disbursement.fundSource || 'Fund',
    previousBalance: 850000,
    disbursedAmount: disbursement.amount || 0,
    updatedBalance: 850000 - (disbursement.amount || 0)
  };

  const formatCurrency = (val?: number | string | null) => {
    if (val === undefined || val === null) return '₱0.00';
    const num = typeof val === 'number' ? val : parseFloat(val);
    if (isNaN(num)) return '₱0.00';
    return `₱${num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#04152d]/60 backdrop-blur-md animate-fade-in overflow-y-auto">
      <div
        className="relative w-full max-w-lg bg-white/90 backdrop-blur-3xl border border-white/90 shadow-[0_20px_60px_rgba(4,21,45,0.25),inset_0_2px_4px_rgba(255,255,255,0.9)] rounded-[28px] overflow-hidden animate-modal-enter my-8 p-6 space-y-5"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="relative w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-600 shadow-sm animate-pulse-ring">
              <CheckCircle2 size={26} className="text-emerald-600" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-[18px] font-bold text-[#04152d] tracking-tight">
                  Disbursement Finalized
                </h2>
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full border border-emerald-200">
                  Audited
                </span>
              </div>
              <p className="text-[12px] text-[#04152d]/60">
                Transaction recorded under Ref <span className="font-mono font-bold text-blue-700">{disbursement.ref}</span>
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/70 hover:bg-white text-[#04152d]/60 hover:text-[#04152d] flex items-center justify-center transition-all duration-200 border border-white shadow-sm hover:scale-105 active:scale-95 cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        {/* Transaction Summary Card */}
        <div className="p-4 rounded-2xl bg-white/70 border border-white/90 shadow-sm space-y-2 text-[13px]">
          <div className="flex items-center justify-between">
            <span className="text-[#04152d]/60">Payee / Recipient:</span>
            <span className="font-bold text-[#04152d]">{disbursement.payee}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[#04152d]/60">Disbursement Date:</span>
            <span className="font-semibold text-[#04152d]">{disbursement.date}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[#04152d]/60">Payment Release Method:</span>
            <span className="font-semibold text-blue-900">{disbursement.paymentMethod || 'Cheque'}</span>
          </div>
          {disbursement.chequeRecord && (
            <div className="flex items-center justify-between pt-1 border-t border-white/60">
              <span className="text-[#04152d]/60">Cheque Number & Status:</span>
              <span className="font-mono text-xs font-bold text-amber-900 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                {disbursement.chequeRecord.chequeNumber} ({disbursement.chequeRecord.status})
              </span>
            </div>
          )}
        </div>

        {/* Task 14: Updated Fund Balance Display */}
        <div className="p-5 rounded-2xl bg-gradient-to-br from-blue-50/70 via-white/80 to-blue-50/40 border border-blue-200/80 shadow-[inset_0_1px_2px_rgba(255,255,255,0.9)] space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Building2 size={16} className="text-blue-700" />
              <span className="text-[12px] font-bold text-blue-950 uppercase tracking-wider">
                Financial Effect on {effect.fundName}
              </span>
            </div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full">
              Ledger Updated
            </span>
          </div>

          <div className="grid grid-cols-3 gap-3 text-center">
            {/* Previous Balance */}
            <div className="p-3 bg-white/80 rounded-xl border border-white shadow-sm space-y-1">
              <span className="text-[10px] uppercase font-bold text-[#04152d]/50 block">
                Previous Balance
              </span>
              <span className="font-semibold text-[13px] text-[#04152d]">
                {formatCurrency(effect.previousBalance)}
              </span>
            </div>

            {/* Disbursed Amount */}
            <div className="p-3 bg-red-50/70 rounded-xl border border-red-100 shadow-sm space-y-1">
              <span className="text-[10px] uppercase font-bold text-red-700/70 block">
                Disbursed Outflow
              </span>
              <span className="font-bold text-[13px] text-red-700">
                - {formatCurrency(effect.disbursedAmount)}
              </span>
            </div>

            {/* Updated Balance */}
            <div className="p-3 bg-emerald-50/70 rounded-xl border border-emerald-200 shadow-sm space-y-1">
              <span className="text-[10px] uppercase font-bold text-emerald-800 block">
                Updated Balance
              </span>
              <span className="font-bold text-[14px] text-emerald-800">
                {formatCurrency(effect.updatedBalance)}
              </span>
            </div>
          </div>

          <p className="text-[11px] text-center text-[#04152d]/60 font-medium">
            Available liquidity in <span className="font-bold text-[#04152d]">{effect.fundName}</span> has been reduced by{' '}
            <span className="font-bold text-red-700">{formatCurrency(effect.disbursedAmount)}</span>.
          </p>
        </div>

        {/* Footer Actions */}
        <div className="pt-2 flex flex-col sm:flex-row items-center gap-3">
          {onViewVoucher && (
            <button
              type="button"
              onClick={onViewVoucher}
              className="w-full sm:flex-1 py-2.5 rounded-full border border-gray-300 bg-white hover:bg-gray-50 text-[13px] font-semibold text-[#04152d] transition-all duration-200 hover:scale-[1.02] active:scale-95 flex items-center justify-center gap-1.5 shadow-sm cursor-pointer"
            >
              <FileText size={15} className="text-blue-600" />
              <span>View Voucher & Download PDF</span>
            </button>
          )}

          <button
            type="button"
            onClick={onClose}
            className="w-full sm:flex-1 py-2.5 bg-gradient-to-b from-[#0a1e3f] to-[#04152d] text-white shadow-md hover:shadow-lg rounded-full text-[13px] font-semibold transition-all duration-200 hover:scale-[1.02] active:scale-95 text-center cursor-pointer"
          >
            Acknowledge & Return to List
          </button>
        </div>
      </div>
    </div>
  );
}
