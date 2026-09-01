"use client";

import React from 'react';
import { Calculator, Info } from 'lucide-react';

interface ApplicationData {
  obligationType: string;
  originalBalance: number;
  appliedAmount: number;
  remainingBalance: number;
  exceptionStatus: 'Exact Match' | 'Partial Payment' | 'Overpayment' | 'Unapplied';
}

interface Props {
  data?: ApplicationData;
}

export default function PaymentApplicationModal({ data }: Props) {
  if (!data) {
    return (
      <div className="bg-white/40 p-5 rounded-[16px] border border-white/60 text-center">
        <p className="text-[13px] text-[#04152d]/50 font-medium">No application data available for this transaction.</p>
      </div>
    );
  }

  const formatCurrency = (val: number) => `₱${val.toLocaleString('en-US', { minimumFractionDigits: 2 })}`;

  return (
    <div className="bg-white/50 p-5 rounded-[16px] border border-white space-y-4">
      <h4 className="text-[13px] font-semibold text-[#04152d] uppercase tracking-widest border-b border-white/60 pb-2 flex items-center gap-2">
        <Calculator size={16} className="text-blue-600" /> Payment Application Math
      </h4>
      
      <div className="space-y-2">
        <div className="flex justify-between items-center text-[13px]">
          <span className="font-medium text-[#04152d]/70">Target Obligation:</span>
          <span className="font-semibold text-[#04152d]">{data.obligationType}</span>
        </div>
        <div className="flex justify-between items-center text-[13px]">
          <span className="font-medium text-[#04152d]/70">Outstanding Balance:</span>
          <span className="font-semibold text-[#04152d]">{formatCurrency(data.originalBalance)}</span>
        </div>
        <div className="flex justify-between items-center text-[13px]">
          <span className="font-medium text-[#04152d]/70">Applied Amount:</span>
          <span className="font-semibold text-emerald-600">- {formatCurrency(data.appliedAmount)}</span>
        </div>
        <div className="border-t border-white/60 pt-2 mt-2 flex justify-between items-center text-[14px]">
          <span className="font-semibold text-[#04152d]">Remaining Balance:</span>
          <span className={`font-semibold tracking-tight ${data.remainingBalance < 0 ? 'text-red-600' : 'text-[#04152d]'}`}>
            {formatCurrency(data.remainingBalance < 0 ? 0 : data.remainingBalance)}
          </span>
        </div>
      </div>

      <div className={`mt-4 p-3 rounded-[12px] flex items-center gap-2 text-[12px] font-medium border ${
        data.exceptionStatus === 'Overpayment' ? 'bg-red-50 border-red-100 text-red-700' :
        data.exceptionStatus === 'Partial Payment' ? 'bg-yellow-50 border-yellow-100 text-yellow-700' :
        data.exceptionStatus === 'Unapplied' ? 'bg-gray-50 border-gray-200 text-gray-700' :
        'bg-emerald-50 border-emerald-100 text-emerald-700'
      }`}>
        <Info size={14} className="shrink-0" />
        Recorded Exception Status: <span className="font-semibold uppercase tracking-wide">{data.exceptionStatus}</span>
      </div>
    </div>
  );
}