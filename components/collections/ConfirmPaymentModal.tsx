"use client";

import React, { useState, useEffect } from 'react';
import { CheckCircle2 } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: () => void;
  amount: string;
  selectedMethodLabel: string;
  reference: string;
  paymentDate: string;
}

export default function ConfirmPaymentModal({
  isOpen, onClose, onSubmit, amount, selectedMethodLabel, reference, paymentDate
}: Props) {
  // Animation unmount delay
  const [shouldRender, setShouldRender] = useState(isOpen);
  
  useEffect(() => {
    if (isOpen) setShouldRender(true);
    else {
      const timer = setTimeout(() => setShouldRender(false), 200);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  if (!shouldRender) return null;

  const ultraGlassCard = "bg-white/80 backdrop-blur-[40px] backdrop-saturate-[200%] border border-white/90 shadow-[0_16px_40px_rgba(4,21,45,0.1),inset_0_2px_4px_rgba(255,255,255,1)] rounded-[24px] p-6 lg:p-8 relative overflow-hidden transition-all duration-400";

  return (
    <div className={`fixed inset-0 z-[100] flex items-center justify-center p-4 transition-opacity duration-200 ${isOpen ? 'opacity-100' : 'opacity-0'}`}>
      <div className="absolute inset-0 bg-[#04152d]/60 backdrop-blur-sm" onClick={onClose} />
      
      <div className={`relative w-full max-w-md ${ultraGlassCard} ${isOpen ? 'animate-modal-enter' : 'animate-modal-exit'}`}>
        <h3 className="text-[20px] font-black text-[#04152d] tracking-tight mb-2">Confirm Payment Submission</h3>
        <p className="text-[14px] text-[#04152d]/70 mb-6 leading-relaxed">
          Please double check the details below. Once submitted, your payment will be queued for Treasurer verification.
        </p>

        <div className="bg-blue-50/50 rounded-[16px] p-5 border border-blue-100/50 space-y-4 mb-8">
          <div className="flex justify-between items-center border-b border-blue-100 pb-3">
            <span className="text-[12px] font-bold text-blue-900/60 uppercase tracking-widest">Amount</span>
            <span className="text-[18px] font-black text-blue-700 tracking-tight">₱{Number(amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
          </div>
          <div className="flex justify-between items-center border-b border-blue-100 pb-3">
            <span className="text-[12px] font-bold text-blue-900/60 uppercase tracking-widest">Method</span>
            <span className="text-[14px] font-bold text-[#04152d]">{selectedMethodLabel}</span>
          </div>
          <div className="flex justify-between items-center border-b border-blue-100 pb-3">
            <span className="text-[12px] font-bold text-blue-900/60 uppercase tracking-widest">Reference</span>
            <span className="text-[14px] font-bold text-[#04152d] font-mono">{reference || 'N/A'}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-[12px] font-bold text-blue-900/60 uppercase tracking-widest">Date</span>
            <span className="text-[14px] font-bold text-[#04152d]">{paymentDate}</span>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3">
          <button type="button" onClick={onClose} className="px-5 py-2.5 rounded-full text-[13px] font-bold text-[#04152d]/60 hover:bg-gray-100 transition-colors">
            Cancel
          </button>
          <button type="button" onClick={onSubmit} className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-full text-[13px] font-bold tracking-wide shadow-[0_4px_12px_rgba(37,99,235,0.3)] transition-all transform hover:scale-105 active:scale-95 flex items-center gap-2">
            <CheckCircle2 size={16} /> Confirm & Submit
          </button>
        </div>
      </div>
    </div>
  );
}
