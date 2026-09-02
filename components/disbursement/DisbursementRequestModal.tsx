"use client";

import React, { useState, useEffect } from 'react';
import { 
  X, Loader2, Send, CreditCard, Banknote, AlertCircle, Calculator, CheckCircle2, AlertTriangle
} from 'lucide-react';

const FALLBACK_ELIGIBLE_LOANS = [
  { id: 'L-2026-001', memberId: 'mem-1', member: 'Juan Dela Cruz', type: 'Emergency Loan', approvedAmount: 50000, remainingAmount: 50000, fundSource: 'Emergency Fund', availableFund: 150000, beneficiary: { name: 'Juan Dela Cruz', bank: 'BDO', account: '00123456789' } },
  { id: 'L-2026-002', memberId: 'mem-2', member: 'Maria Clara', type: 'Educational Loan', approvedAmount: 25000, remainingAmount: 15000, fundSource: 'General Fund', availableFund: 240000, beneficiary: { name: 'Maria Clara', bank: 'BPI', account: '9876543210' } },
];

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (newDisbursement: any) => void;
}

export default function DisbursementRequestModal({ isOpen, onClose, onSuccess }: Props) {
  const [loans, setLoans] = useState<any[]>(FALLBACK_ELIGIBLE_LOANS);
  const [isLoadingLoans, setIsLoadingLoans] = useState(false);
  const [selectedLoanId, setSelectedLoanId] = useState('');
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState('');
  const [beneficiaryName, setBeneficiaryName] = useState('');
  const [beneficiaryBank, setBeneficiaryBank] = useState('');
  const [beneficiaryAccount, setBeneficiaryAccount] = useState('');
  
  const [amountError, setAmountError] = useState<string | null>(null);
  const [beneficiaryError, setBeneficiaryError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // DMP-001: Fetch eligible approved loans from backend
  useEffect(() => {
    if (isOpen) {
      setSelectedLoanId('');
      setAmount('');
      setMethod('');
      setAmountError(null);
      setBeneficiaryError(null);
      setIsSubmitting(false);

      const fetchEligibleLoans = async () => {
        setIsLoadingLoans(true);
        try {
          const res = await fetch('http://localhost:3001/disbursements/eligible-loans');
          if (res.ok) {
            const data = await res.json();
            if (Array.isArray(data) && data.length > 0) {
              setLoans(data);
            } else {
              setLoans(FALLBACK_ELIGIBLE_LOANS);
            }
          }
        } catch {
          setLoans(FALLBACK_ELIGIBLE_LOANS);
        } finally {
          setIsLoadingLoans(false);
        }
      };

      fetchEligibleLoans();
    }
  }, [isOpen]);

  const selectedLoan = loans.find(l => l.id === selectedLoanId);

  // Sync beneficiary details when loan is selected
  useEffect(() => {
    if (selectedLoan) {
      setBeneficiaryName(selectedLoan.beneficiary?.name || selectedLoan.member || '');
      setBeneficiaryBank(selectedLoan.beneficiary?.bank || 'BDO');
      setBeneficiaryAccount(selectedLoan.beneficiary?.account || '00123456789');
      setAmountError(null);
      setBeneficiaryError(null);
    }
  }, [selectedLoan]);

  // DMP-004: Validate beneficiary
  const handleBeneficiaryChange = (name: string) => {
    setBeneficiaryName(name);
    if (!selectedLoan) return;

    const expectedName = (selectedLoan.beneficiary?.name || selectedLoan.member || '').trim().toLowerCase();
    const inputName = name.trim().toLowerCase();

    if (!inputName) {
      setBeneficiaryError('Beneficiary name is required.');
    } else if (!expectedName.includes(inputName) && !inputName.includes(expectedName)) {
      setBeneficiaryError(`DMP-004: Beneficiary name does not match approved loan record (${selectedLoan.beneficiary?.name || selectedLoan.member}).`);
    } else {
      setBeneficiaryError(null);
    }
  };

  // DMP-005, DMP-006, DMP-007: Validate Amount Limits
  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setAmount(val);
    
    if (!selectedLoan) return;

    const numVal = Number(val);
    if (val && numVal <= 0) {
      setAmountError("DMP-005: Amount must be greater than zero.");
    } else if (val && numVal > selectedLoan.remainingAmount) {
      setAmountError(`DMP-005/007: Exceeds approved remaining loan balance (₱${selectedLoan.remainingAmount.toLocaleString()}).`);
    } else if (val && numVal > selectedLoan.availableFund) {
      setAmountError(`DMP-006/007: Exceeds available fund balance (₱${selectedLoan.availableFund.toLocaleString()}).`);
    } else {
      setAmountError(null);
    }
  };

  const isFormValid = selectedLoanId && method && amount && Number(amount) > 0 && !amountError && !beneficiaryError && beneficiaryName;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid || !selectedLoan) return;

    setIsSubmitting(true);

    const payload = {
      obligationId: selectedLoan.id,
      memberId: selectedLoan.memberId || 'mem-1',
      amount: Number(amount),
      paymentMethod: method === 'Check' ? 'CHECK' : 'BANK_TRANSFER',
      fundSource: selectedLoan.fundSource,
      beneficiaryName: beneficiaryName,
      beneficiaryBank: beneficiaryBank,
      beneficiaryAccount: beneficiaryAccount,
      description: `Disbursement request for ${selectedLoan.type || selectedLoan.obligationType || 'Loan'}`,
      actorName: 'Treasurer',
      actorRole: 'Treasurer',
    };

    try {
      const res = await fetch('http://localhost:3001/disbursements/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const data = await res.json();
        onSuccess({
          id: data.id,
          ref: data.disbursementRefNo || `REQ-${Math.floor(Math.random() * 9000) + 1000}`,
          member: selectedLoan.member,
          loanType: selectedLoan.type || selectedLoan.obligationType,
          amount: Number(amount),
          status: 'Pending Approval',
          date: new Date().toISOString().split('T')[0],
          beneficiary: { name: beneficiaryName, bank: beneficiaryBank, account: beneficiaryAccount },
          fundSource: selectedLoan.fundSource,
          method: method,
          auditTrail: [
            {
              id: `at-${Date.now()}`,
              action: 'Disbursement Requested',
              actor: 'Treasurer',
              role: 'Treasurer',
              timestamp: new Date().toISOString(),
              details: `Requested ₱${Number(amount).toLocaleString()} for ${selectedLoan.type || selectedLoan.obligationType}.`,
            },
          ],
        });
      } else {
        throw new Error('API request failed');
      }
    } catch {
      // Fallback local creation
      const newRecord = {
        id: `disb-${Date.now()}`,
        ref: `REQ-${Math.floor(Math.random() * 9000) + 1000}`,
        member: selectedLoan.member,
        loanType: selectedLoan.type || selectedLoan.obligationType,
        amount: Number(amount),
        status: 'Pending Approval',
        date: new Date().toISOString().split('T')[0],
        beneficiary: { name: beneficiaryName, bank: beneficiaryBank, account: beneficiaryAccount },
        fundSource: selectedLoan.fundSource,
        method: method,
        auditTrail: [{ id: `at-${Date.now()}`, action: 'Disbursement Requested', actor: 'Treasurer', role: 'Treasurer', timestamp: new Date().toISOString(), details: `Requested ₱${Number(amount).toLocaleString()} for ${selectedLoan.type || selectedLoan.obligationType}.` }]
      };
      onSuccess(newRecord);
    } finally {
      setIsSubmitting(false);
      onClose();
    }
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
          <div>
            <h3 className="text-[18px] font-semibold text-[#04152d] tracking-tight flex items-center gap-2">
              <Send className="text-blue-600" /> Initiate Disbursement Request
            </h3>
            <p className="text-[11px] text-[#04152d]/50 mt-0.5">Sprint 2 DMP-001 - DMP-007 Verification & Processing</p>
          </div>
          <button onClick={() => !isSubmitting && onClose()} disabled={isSubmitting} className="p-2 bg-white/50 hover:bg-white/80 rounded-full border border-white shadow-sm disabled:opacity-50 transition-colors">
            <X size={16} className="text-[#04152d]/60 hover:text-[#04152d]" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto pr-2 space-y-6 hide-scrollbar">
          
          <div className="space-y-4">
            <div>
              <label className={labelStyle}>Eligible Approved Loan <span className="text-red-500 text-[14px] leading-none">*</span></label>
              <select required disabled={isSubmitting || isLoadingLoans} value={selectedLoanId} onChange={(e) => setSelectedLoanId(e.target.value)} className={glassInput}>
                <option value="" disabled>{isLoadingLoans ? 'Loading eligible loans...' : 'Select approved obligation (DMP-001)...'}</option>
                {loans.map(loan => (
                  <option key={loan.id} value={loan.id}>{loan.member} - {loan.type || loan.obligationType} ({loan.id}) - Avail: {formatCurrency(loan.remainingAmount)}</option>
                ))}
              </select>
            </div>

            {selectedLoan && (
              <div className="animate-fade-in space-y-5">
                
                {/* DMP-004: Beneficiary Details */}
                <div className="bg-blue-50/50 p-4 rounded-[16px] border border-blue-100 space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-[11px] font-semibold text-blue-800 uppercase tracking-widest flex items-center gap-1.5">
                      <Banknote size={15} /> Beneficiary Verification (DMP-004)
                    </p>
                    <span className="text-[10px] font-semibold bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">Approved Recipient</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] font-medium text-[#04152d]/60 uppercase">Beneficiary Name</label>
                      <input
                        type="text"
                        required
                        disabled={isSubmitting}
                        value={beneficiaryName}
                        onChange={(e) => handleBeneficiaryChange(e.target.value)}
                        className={`${glassInput} !py-2 !text-[12px] ${beneficiaryError ? '!border-red-400 !bg-red-50/50' : ''}`}
                      />
                      {beneficiaryError && (
                        <p className="text-[10px] font-semibold text-red-500 mt-1 flex items-center gap-1">
                          <AlertTriangle size={10} /> {beneficiaryError}
                        </p>
                      )}
                    </div>
                    <div>
                      <label className="text-[10px] font-medium text-[#04152d]/60 uppercase">Bank & Account Number</label>
                      <input
                        type="text"
                        disabled={isSubmitting}
                        value={`${beneficiaryBank} - ${beneficiaryAccount}`}
                        onChange={(e) => {
                          const parts = e.target.value.split('-');
                          setBeneficiaryBank(parts[0]?.trim() || '');
                          setBeneficiaryAccount(parts[1]?.trim() || '');
                        }}
                        className={`${glassInput} !py-2 !text-[12px]`}
                      />
                    </div>
                  </div>
                </div>

                {/* DMP-005 & DMP-006: Loan Limits and Fund Integrity */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="bg-white/50 p-4 rounded-[16px] border border-white">
                    <p className="text-[10px] font-semibold text-[#04152d]/50 uppercase tracking-widest mb-1 flex items-center gap-1">
                      <Calculator size={12} /> Loan Limits (DMP-005)
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
                      <Calculator size={12} /> Fund Integrity (DMP-006)
                    </p>
                    <div className="flex justify-between items-center text-[12px] mt-2">
                      <span className="font-medium text-[#04152d]/60">Source Fund:</span>
                      <span className="font-semibold text-[#04152d] truncate max-w-[120px]" title={selectedLoan.fundSource}>{selectedLoan.fundSource}</span>
                    </div>
                    <div className="flex justify-between items-center text-[12px] mt-1 border-t border-white/60 pt-1">
                      <span className="font-medium text-[#04152d]/60">Available Bal:</span>
                      <span className="font-semibold text-blue-600">{formatCurrency(selectedLoan.availableFund)}</span>
                    </div>
                  </div>
                </div>

                {/* DMP-002, DMP-003, DMP-007: Amount and Method */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-t border-white/60 pt-5">
                  <div>
                    <label className={labelStyle}>Request Amount (DMP-007) <span className="text-red-500 text-[14px] leading-none">*</span></label>
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
                        <option value="Cash">Cash Release</option>
                        <option value="GCash">GCash</option>
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
              {isSubmitting ? <><Loader2 size={14} className="animate-spin" /> Submitting...</> : 'Submit Request'}
            </button>
          </div>
        </form>

      </div>
    </div>
  );
}