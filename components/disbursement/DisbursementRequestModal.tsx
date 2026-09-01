"use client";

import React, { useState, useEffect } from 'react';
import { 
  X, Loader2, Send, CreditCard, Banknote, AlertCircle, Calculator
} from 'lucide-react';

const ELIGIBLE_LOANS = [
  { id: 'L-2026-001', member: 'Juan Dela Cruz', type: 'Emergency Loan', approvedAmount: 50000, remainingAmount: 50000, fundSource: 'Emergency Fund', availableFund: 150000, beneficiary: { name: 'Juan Dela Cruz', bank: 'BDO', account: '00123456789' } },
  { id: 'L-2026-002', member: 'Maria Clara', type: 'Educational Loan', approvedAmount: 25000, remainingAmount: 15000, fundSource: 'General Fund', availableFund: 240000, beneficiary: { name: 'Maria Clara', bank: 'BPI', account: '9876543210' } },
];

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (newDisbursement: any) => void;
}

export default function DisbursementRequestModal({ isOpen, onClose, onSuccess }: Props) {
  const [selectedLoanId, setSelectedLoanId] = useState('');
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState('');
  
  const [amountError, setAmountError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const selectedLoan = ELIGIBLE_LOANS.find(l => l.id === selectedLoanId);

  useEffect(() => {
    if (isOpen) {
      setSelectedLoanId('');
      setAmount('');
      setMethod('');
      setAmountError(null);
      setIsSubmitting(false);
    }
  }, [isOpen]);

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setAmount(val);
    
    if (!selectedLoan) return;

    if (val && Number(val) <= 0) {
      setAmountError("Amount must be greater than zero.");
    } else if (val && Number(val) > selectedLoan.remainingAmount) {
      setAmountError(`Exceeds remaining loan balance (₱${selectedLoan.remainingAmount.toLocaleString()}).`);
    } else if (val && Number(val) > selectedLoan.availableFund) {
      setAmountError(`Exceeds available fund balance (₱${selectedLoan.availableFund.toLocaleString()}).`);
    } else {
      setAmountError(null);
    }
  };

  const isFormValid = selectedLoanId && method && amount && Number(amount) > 0 && !amountError;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid || !selectedLoan) return;

    setIsSubmitting(true);
    setTimeout(() => {
      const newRecord = {
        id: `disb-${Date.now()}`,
        ref: `REQ-${Math.floor(Math.random() * 9000) + 1000}`,
        member: selectedLoan.member,
        loanType: selectedLoan.type,
        amount: Number(amount),
        status: 'Pending Approval',
        date: new Date().toISOString().split('T')[0],
        beneficiary: selectedLoan.beneficiary,
        fundSource: selectedLoan.fundSource,
        method: method,
        auditTrail: [{ id: `at-${Date.now()}`, action: 'Disbursement Requested', actor: 'Treasurer', role: 'Initiator', timestamp: new Date().toISOString(), details: `Requested ₱${Number(amount).toLocaleString()} for ${selectedLoan.type}.` }]
      };
      
      onSuccess(newRecord);
      setIsSubmitting(false);
      onClose();
    }, 1500);
  };

  if (!isOpen) return null;

  const formatCurrency = (val: number) => `₱${val.toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
  const ultraGlassCard = "bg-white/80 backdrop-blur-[40px] backdrop-saturate-[200%] border border-white/90 shadow-[0_16px_40px_rgba(4,21,45,0.1),inset_0_2px_4px_rgba(255,255,255,1)] rounded-[24px] p-6 lg:p-8 relative overflow-hidden transition-all duration-400";
  const glassInput = "w-full pl-4 pr-4 py-3 bg-white/60 hover:bg-white/80 focus:bg-white/90 backdrop-blur-xl border border-white/90 shadow-[inset_0_2px_4px_rgba(4,21,45,0.03)] rounded-[12px] text-[13px] font-semibold text-[#04152d] outline-none transition-all duration-300 placeholder:text-[#04152d]/40 focus:shadow-[0_4px_16px_rgba(4,21,45,0.08),inset_0_1px_2px_rgba(255,255,255,1)] disabled:opacity-50 disabled:cursor-not-allowed";
  const labelStyle = "block text-[11px] font-semibold text-[#04152d]/70 uppercase tracking-widest mb-2 flex items-center gap-1";

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 transition-opacity duration-300 opacity-100">
      <div className="absolute inset-0 bg-[#04152d]/40 backdrop-blur-md" onClick={() => !isSubmitting && onClose()} />
      
      <div className={`relative w-full max-w-2xl max-h-[90vh] flex flex-col animate-modal-enter ${ultraGlassCard}`}>
        <div className="flex items-center justify-between border-b border-white/60 pb-4 mb-5">
          <h3 className="text-[18px] font-semibold text-[#04152d] tracking-tight flex items-center gap-2">
            <Send className="text-blue-600" /> Initiate Disbursement
          </h3>
          <button onClick={() => !isSubmitting && onClose()} disabled={isSubmitting} className="p-2 bg-white/50 hover:bg-white/80 rounded-full border border-white shadow-sm disabled:opacity-50 transition-colors">
            <X size={16} className="text-[#04152d]/60 hover:text-[#04152d]" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto pr-2 space-y-6 hide-scrollbar">
          
          <div className="space-y-4">
            <div>
              <label className={labelStyle}>Eligible Approved Loan <span className="text-red-500 text-[14px] leading-none">*</span></label>
              <select required disabled={isSubmitting} value={selectedLoanId} onChange={(e) => setSelectedLoanId(e.target.value)} className={glassInput}>
                <option value="" disabled>Select approved obligation...</option>
                {ELIGIBLE_LOANS.map(loan => (
                  <option key={loan.id} value={loan.id}>{loan.member} - {loan.type} ({loan.id})</option>
                ))}
              </select>
            </div>

            {selectedLoan && (
              <div className="animate-fade-in space-y-5">
                <div className="bg-blue-50/50 p-4 rounded-[16px] border border-blue-100 flex items-start gap-3">
                  <Banknote className="text-blue-500 shrink-0 mt-0.5" size={18} />
                  <div>
                    <p className="text-[11px] font-semibold text-blue-800 uppercase tracking-widest mb-1">Beneficiary Information</p>
                    <p className="text-[13px] font-semibold text-[#04152d]">{selectedLoan.beneficiary.name}</p>
                    <p className="text-[12px] font-medium text-[#04152d]/70">{selectedLoan.beneficiary.bank} - {selectedLoan.beneficiary.account}</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="bg-white/50 p-4 rounded-[16px] border border-white">
                    <p className="text-[10px] font-semibold text-[#04152d]/50 uppercase tracking-widest mb-1 flex items-center gap-1">
                      <Calculator size={12} /> Loan Limits
                    </p>
                    <div className="flex justify-between items-center text-[12px] mt-2">
                      <span className="font-medium text-[#04152d]/60">Total Approved:</span>
                      <span className="font-semibold text-[#04152d]">{formatCurrency(selectedLoan.approvedAmount)}</span>
                    </div>
                    <div className="flex justify-between items-center text-[12px] mt-1">
                      <span className="font-medium text-[#04152d]/60">Remaining Avail:</span>
                      <span className="font-semibold text-emerald-600">{formatCurrency(selectedLoan.remainingAmount)}</span>
                    </div>
                  </div>

                  <div className="bg-white/50 p-4 rounded-[16px] border border-white">
                    <p className="text-[10px] font-semibold text-[#04152d]/50 uppercase tracking-widest mb-1 flex items-center gap-1">
                      <Calculator size={12} /> Fund Integrity
                    </p>
                    <div className="flex justify-between items-center text-[12px] mt-2">
                      <span className="font-medium text-[#04152d]/60">Source Fund:</span>
                      <span className="font-semibold text-[#04152d] truncate max-w-[100px]" title={selectedLoan.fundSource}>{selectedLoan.fundSource}</span>
                    </div>
                    <div className="flex justify-between items-center text-[12px] mt-1 border-t border-white/60 pt-1">
                      <span className="font-medium text-[#04152d]/60">Available Bal:</span>
                      <span className="font-semibold text-blue-600">{formatCurrency(selectedLoan.availableFund)}</span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-t border-white/60 pt-5">
                  <div>
                    <label className={labelStyle}>Request Amount <span className="text-red-500 text-[14px] leading-none">*</span></label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#04152d]/50 font-bold text-[14px]">₱</span>
                      <input
                        type="number"
                        min="0.01"
                        step="0.01"
                        required
                        disabled={isSubmitting}
                        value={amount}
                        onChange={handleAmountChange}
                        className={`${glassInput} !pl-9 ${amountError ? '!border-red-400 !bg-red-50/50 focus:!shadow-[0_4px_16px_rgba(239,68,68,0.15),inset_0_1px_2px_rgba(255,255,255,1)]' : ''}`}
                        placeholder="0.00"
                      />
                    </div>
                    {amountError && (
                      <p className="text-[11px] font-semibold text-red-500 mt-1.5 ml-1 flex items-center gap-1">
                        <AlertCircle size={10} /> {amountError}
                      </p>
                    )}
                  </div>
                  <div>
                    <label className={labelStyle}>Disbursement Method <span className="text-red-500 text-[14px] leading-none">*</span></label>
                    <div className="relative">
                      <CreditCard size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#04152d]/50 z-10" />
                      <select required disabled={isSubmitting} value={method} onChange={(e) => setMethod(e.target.value)} className={`${glassInput} !pl-10 appearance-none`}>
                        <option value="" disabled>Select method</option>
                        <option value="Bank Transfer">Bank Transfer</option>
                        <option value="Check">Check Issuance</option>
                      </select>
                    </div>
                  </div>
                </div>

              </div>
            )}
          </div>

          <div className="border-t border-white/60 pt-5 mt-2 flex gap-3 justify-end">
            <button type="button" onClick={onClose} disabled={isSubmitting} className="px-5 py-2.5 rounded-full text-[13px] font-semibold text-[#04152d]/60 hover:bg-white transition-colors">Cancel</button>
            <button type="submit" disabled={!isFormValid || isSubmitting} className="px-5 py-2.5 rounded-full text-[13px] font-semibold text-white bg-blue-600 hover:bg-blue-700 transition-colors shadow-md disabled:opacity-50 flex items-center gap-2">
              {isSubmitting ? <><Loader2 size={14} className="animate-spin" /> Processing...</> : 'Submit Request'}
            </button>
          </div>
        </form>

      </div>
    </div>
  );
}