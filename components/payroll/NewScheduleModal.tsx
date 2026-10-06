"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { 
  X, Calendar, User, FileText, Banknote, AlertCircle, 
  CheckCircle2, ArrowRight, ArrowLeft, Loader2, ShieldCheck,
  AlertTriangle
} from 'lucide-react';
import { 
  DeductionSchedule, CONFIGURED_DEDUCTION_TYPES, 
  CONFIGURED_PERIODS, CONFIGURED_MEMBERS_MASTER, 
  validateDeductionSchedule, DeductionType
} from '@/lib/payrollData';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  existingSchedules: DeductionSchedule[];
  onSuccess: (newSchedule: DeductionSchedule) => void;
}

export default function NewScheduleModal({
  isOpen,
  onClose,
  existingSchedules,
  onSuccess
}: Props) {
  const [payrollPeriod, setPayrollPeriod] = useState(CONFIGURED_PERIODS[0]);
  const [memberId, setMemberId] = useState('');
  const [deductionType, setDeductionType] = useState<DeductionType>('Regular Loan Amortization');
  const [amount, setAmount] = useState('');
  const [displayAmount, setDisplayAmount] = useState('');

  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setPayrollPeriod(CONFIGURED_PERIODS[0]);
      setMemberId('');
      setDeductionType('Regular Loan Amortization');
      setAmount('');
      setDisplayAmount('');
      setTouched({});
      setGeneralError(null);
      setIsConfirmOpen(false);
      setIsSubmitting(false);
    }
  }, [isOpen]);

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value.replace(/,/g, '');
    val = val.replace(/[^0-9.]/g, '');
    const parts = val.split('.');
    if (parts.length > 2) val = parts[0] + '.' + parts.slice(1).join('');
    setAmount(val);

    if (val) {
      const [intPart, decPart] = val.split('.');
      const formatted = new Intl.NumberFormat('en-US').format(Number(intPart));
      setDisplayAmount(decPart !== undefined ? `${formatted}.${decPart}` : formatted);
    } else {
      setDisplayAmount('');
    }
  };

  // Real-time validation
  const validation = useMemo(() => {
    return validateDeductionSchedule(
      {
        payrollPeriod,
        memberId,
        deductionType,
        amount
      },
      existingSchedules
    );
  }, [payrollPeriod, memberId, deductionType, amount, existingSchedules]);

  // Autofill amount if member has matching obligation
  const matchedObligation = useMemo(() => {
    const mem = CONFIGURED_MEMBERS_MASTER[memberId.trim().toUpperCase()];
    if (!mem) return null;
    return mem.obligations.find(ob => ob.deductionType === deductionType) || null;
  }, [memberId, deductionType]);

  const handleSelectMember = (id: string) => {
    setMemberId(id);
    const mem = CONFIGURED_MEMBERS_MASTER[id];
    if (mem) {
      const ob = mem.obligations.find(o => o.deductionType === deductionType);
      if (ob && !amount) {
        setAmount(String(ob.monthlyAmount));
        setDisplayAmount(Number(ob.monthlyAmount).toLocaleString('en-US'));
      }
    }
  };

  const handleOpenConfirm = (e: React.FormEvent) => {
    e.preventDefault();
    setTouched({ payrollPeriod: true, memberId: true, deductionType: true, amount: true });

    if (!validation.isValid) {
      const firstErr = Object.values(validation.errors)[0];
      setGeneralError(firstErr || 'Please resolve all required field validations.');
      return;
    }

    setGeneralError(null);
    setIsConfirmOpen(true);
  };

  const handleExecuteSave = () => {
    setIsSubmitting(true);

    const mem = CONFIGURED_MEMBERS_MASTER[memberId.trim().toUpperCase()];
    const newSchedule: DeductionSchedule = {
      id: `SCH-${Date.now().toString().slice(-6)}`,
      payrollPeriod,
      memberId: memberId.trim().toUpperCase(),
      memberName: mem?.name || 'Unknown Member',
      deductionType,
      expectedAmount: Number(amount),
      obligationRef: validation.obligationRef || 'UNASSIGNED-REVIEW',
      status: validation.status,
      createdAt: new Date().toISOString().split('T')[0]
    };

    setTimeout(() => {
      setIsSubmitting(false);
      setIsConfirmOpen(false);
      onClose();
      onSuccess(newSchedule);
    }, 350);
  };

  if (!isOpen) return null;

  const formatCurrency = (val: number) => 
    `₱${Number(val || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}`;

  const ultraGlassCard = "bg-white/95 backdrop-blur-[40px] backdrop-saturate-[200%] border border-white/90 shadow-[0_20px_50px_rgba(4,21,45,0.16),inset_0_2px_4px_rgba(255,255,255,1)] rounded-[26px] p-6 lg:p-8 relative overflow-hidden";
  const glassInput = "w-full pl-4 pr-4 py-2.5 bg-white/70 hover:bg-white/90 focus:bg-white backdrop-blur-xl border border-white/90 shadow-[inset_0_2px_4px_rgba(4,21,45,0.03)] rounded-xl text-[13px] font-semibold text-[#04152d] outline-none transition-all placeholder:text-[#04152d]/40 focus:ring-2 focus:ring-blue-500/20";
  const labelStyle = "block text-[11px] font-bold text-[#04152d]/70 uppercase tracking-widest mb-1.5 flex items-center justify-between";

  return (
    <>
      {/* Primary Form Modal */}
      <div className="fixed inset-0 z-[110] flex items-center justify-center p-3 sm:p-6 transition-opacity duration-300">
        {/* Outer locked backdrop */}
        <div 
          className="absolute inset-0 bg-[#04152d]/50 backdrop-blur-md" 
          onClick={() => !isSubmitting && onClose()} 
        />

        <div className={`relative w-full max-w-lg max-h-[90vh] flex flex-col animate-modal-enter ${ultraGlassCard}`}>
          {/* Fixed Header */}
          <div className="flex items-center justify-between border-b border-white/70 pb-4 mb-4 shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-blue-50 border border-blue-200 text-blue-600 flex items-center justify-center shadow-xs">
                <Calendar size={20} />
              </div>
              <div>
                <h3 className="text-[17px] font-bold text-[#04152d] tracking-tight">
                  Schedule Payroll Deduction
                </h3>
                <p className="text-[11px] text-[#04152d]/60 font-medium">
                  Configure expected salary deductions for upcoming payroll
                </p>
              </div>
            </div>

            <button 
              onClick={() => !isSubmitting && onClose()} 
              disabled={isSubmitting} 
              className="p-2 bg-white/70 hover:bg-white rounded-full border border-white shadow-xs disabled:opacity-50 transition-colors text-[#04152d]/60 hover:text-[#04152d]"
            >
              <X size={16} />
            </button>
          </div>

          {/* Scrollable Content Body - only inner content moves */}
          <div className="flex-1 overflow-y-auto pr-1 space-y-4 hide-scrollbar min-h-0">
            {generalError && (
              <div className="bg-rose-50 border border-rose-200 text-rose-700 p-3 rounded-xl flex items-start gap-2 text-[12px] font-medium shadow-xs">
                <AlertCircle size={15} className="shrink-0 mt-0.5 text-rose-600" />
                <p>{generalError}</p>
              </div>
            )}

            <form id="schedule-form" onSubmit={handleOpenConfirm} className="space-y-4">
              {/* User Story 1 & 2: Payroll Period */}
              <div>
                <label className={labelStyle}>
                  <span>Payroll Period <span className="text-rose-500">*</span></span>
                </label>
                <div className="relative">
                  <select
                    value={payrollPeriod}
                    onChange={(e) => setPayrollPeriod(e.target.value)}
                    className={`${glassInput} cursor-pointer appearance-none pr-9`}
                  >
                    {CONFIGURED_PERIODS.map(p => (
                      <option key={p} value={p}>{p}</option>
                    ))}
                  </select>
                  <Calendar size={14} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#04152d]/40 pointer-events-none" />
                </div>
                {touched.payrollPeriod && validation.errors.payrollPeriod && (
                  <p className="text-rose-600 text-[11px] mt-1 font-semibold flex items-center gap-1">
                    <AlertCircle size={12} /> {validation.errors.payrollPeriod}
                  </p>
                )}
              </div>

              {/* User Story 2 & 5: Member Reference */}
              <div>
                <label className={labelStyle}>
                  <span>Member ID & Name <span className="text-rose-500">*</span></span>
                  <span className="text-[10px] text-blue-600 lowercase font-medium">must be an active member</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="e.g. MEM-2026-1"
                    value={memberId}
                    onChange={(e) => {
                      setMemberId(e.target.value);
                      setTouched(prev => ({ ...prev, memberId: true }));
                    }}
                    className={`${glassInput} font-mono uppercase ${
                      touched.memberId && validation.errors.memberId ? 'border-rose-400 focus:ring-rose-400/20' : ''
                    }`}
                  />
                  <User size={14} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#04152d]/40" />
                </div>

                {/* Member Lookup Indicator */}
                {memberId && (
                  <div className="mt-2">
                    {validation.member ? (
                      <div className={`p-2.5 rounded-xl border text-[12px] flex items-center justify-between ${
                        validation.member.status === 'ACTIVE' 
                          ? 'bg-emerald-50/80 border-emerald-200 text-emerald-900' 
                          : 'bg-rose-50 border-rose-200 text-rose-800'
                      }`}>
                        <div>
                          <p className="font-bold">{validation.member.name}</p>
                          <p className="text-[10px] text-[#04152d]/60">{validation.member.department}</p>
                        </div>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                          validation.member.status === 'ACTIVE' ? 'bg-emerald-200 text-emerald-900' : 'bg-rose-200 text-rose-900'
                        }`}>
                          {validation.member.status}
                        </span>
                      </div>
                    ) : (
                      <p className="text-rose-600 text-[11px] mt-1 font-semibold flex items-center gap-1">
                        <AlertCircle size={12} /> Member ID not found in master records.
                      </p>
                    )}
                  </div>
                )}

                {touched.memberId && validation.errors.memberId && !memberId && (
                  <p className="text-rose-600 text-[11px] mt-1 font-semibold flex items-center gap-1">
                    <AlertCircle size={12} /> {validation.errors.memberId}
                  </p>
                )}

                {/* Quick picker for demo/testing convenience */}
                <div className="mt-1.5 flex flex-wrap gap-1">
                  <span className="text-[10px] text-[#04152d]/50 self-center mr-1">Quick Select:</span>
                  {Object.values(CONFIGURED_MEMBERS_MASTER).slice(0, 4).map(m => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => handleSelectMember(m.id)}
                      className="px-2 py-0.5 bg-white/70 hover:bg-white text-[10px] font-semibold text-[#04152d]/70 hover:text-blue-700 rounded-md border border-white shadow-xs transition-colors"
                    >
                      {m.name.split(' ')[0]} ({m.id})
                    </button>
                  ))}
                </div>
              </div>

              {/* User Story 4: Select Deduction Type from Configured Values */}
              <div>
                <label className={labelStyle}>
                  <span>Deduction Classification <span className="text-rose-500">*</span></span>
                </label>
                <div className="relative">
                  <select
                    value={deductionType}
                    onChange={(e) => {
                      const newType = e.target.value as DeductionType;
                      setDeductionType(newType);
                      // Update amount if member has this obligation
                      const mem = CONFIGURED_MEMBERS_MASTER[memberId.trim().toUpperCase()];
                      if (mem) {
                        const ob = mem.obligations.find(o => o.deductionType === newType);
                        if (ob) {
                          setAmount(String(ob.monthlyAmount));
                          setDisplayAmount(Number(ob.monthlyAmount).toLocaleString('en-US'));
                        }
                      }
                    }}
                    className={`${glassInput} cursor-pointer appearance-none pr-9`}
                  >
                    {CONFIGURED_DEDUCTION_TYPES.map(t => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                  <FileText size={14} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#04152d]/40 pointer-events-none" />
                </div>
                {touched.deductionType && validation.errors.deductionType && (
                  <p className="text-rose-600 text-[11px] mt-1 font-semibold flex items-center gap-1">
                    <AlertCircle size={12} /> {validation.errors.deductionType}
                  </p>
                )}
              </div>

              {/* User Story 6: Applicable Obligation Basis Display */}
              <div className="bg-white/70 p-3.5 rounded-2xl border border-white shadow-xs space-y-1">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="font-bold text-[#04152d]/70 uppercase tracking-wider">
                    Applicable Obligation Reference:
                  </span>
                  <span className={`font-mono font-bold text-[11px] px-2 py-0.5 rounded border shadow-xs ${
                    validation.obligationRef && validation.obligationRef !== 'UNASSIGNED-REVIEW'
                      ? 'bg-blue-50 text-blue-700 border-blue-200'
                      : 'bg-amber-50 text-amber-700 border-amber-200'
                  }`}>
                    {validation.obligationRef || 'UNASSIGNED-REVIEW'}
                  </span>
                </div>

                {validation.status === 'Flagged for Review' ? (
                  <p className="text-[11px] text-amber-800 flex items-center gap-1 pt-1 font-medium">
                    <AlertTriangle size={12} className="shrink-0 text-amber-600" />
                    No active loan obligation exists for this deduction type. Record will be flagged for review.
                  </p>
                ) : (
                  <p className="text-[11px] text-emerald-800 flex items-center gap-1 pt-1 font-medium">
                    <CheckCircle2 size={12} className="shrink-0 text-emerald-600" />
                    Matched to member obligation schedule.
                  </p>
                )}
              </div>

              {/* User Story 3: Amount Validation (> 0 numeric values only) */}
              <div>
                <label className={labelStyle}>
                  <span>Expected Deduction Amount (₱) <span className="text-rose-500">*</span></span>
                  {matchedObligation && (
                    <span className="text-[10px] text-blue-600 font-medium">
                      Obligation balance: {formatCurrency(matchedObligation.remainingBalance)}
                    </span>
                  )}
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-bold text-[#04152d]/50 text-[14px]">
                    ₱
                  </span>
                  <input
                    type="text"
                    placeholder="0.00"
                    value={displayAmount}
                    onChange={handleAmountChange}
                    onBlur={() => setTouched(prev => ({ ...prev, amount: true }))}
                    className={`${glassInput} pl-8 font-bold text-[14px] text-blue-700 ${
                      touched.amount && validation.errors.amount ? 'border-rose-400 focus:ring-rose-400/20' : ''
                    }`}
                  />
                  <Banknote size={14} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#04152d]/40" />
                </div>
                {touched.amount && validation.errors.amount && (
                  <p className="text-rose-600 text-[11px] mt-1 font-semibold flex items-center gap-1">
                    <AlertCircle size={12} /> {validation.errors.amount}
                  </p>
                )}
              </div>
            </form>
          </div>

          {/* Fixed Footer */}
          <div className="shrink-0 border-t border-white/70 pt-4 mt-3 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-5 py-2.5 rounded-full text-[13px] font-semibold text-[#04152d]/70 hover:bg-white transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              form="schedule-form"
              disabled={isSubmitting || !validation.isValid}
              className="px-6 py-2.5 rounded-full text-[13px] font-semibold bg-[#04152d] text-white hover:bg-[#0a1e3f] disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md flex items-center gap-2 active:scale-95"
            >
              Review & Schedule <ArrowRight size={14} />
            </button>
          </div>
        </div>
      </div>

      {/* DEDICATED SEPARATE CONFIRMATION MODAL */}
      {isConfirmOpen && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-[#04152d]/60 backdrop-blur-md animate-fade-in overflow-hidden">
          <div 
            className="relative w-full max-w-md bg-white/95 backdrop-blur-3xl border border-white/90 shadow-[0_24px_60px_rgba(4,21,45,0.22),inset_0_2px_4px_rgba(255,255,255,1)] rounded-[28px] overflow-hidden animate-modal-enter p-6 lg:p-7 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-start justify-between border-b border-white/70 pb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-blue-50 border border-blue-200 text-blue-700 flex items-center justify-center shadow-xs shrink-0">
                  <Calendar size={20} />
                </div>
                <div>
                  <h4 className="text-[17px] font-bold text-[#04152d] tracking-tight">
                    Confirm Deduction Schedule
                  </h4>
                  <p className="text-[11px] text-[#04152d]/60 font-medium">
                    Verify member obligation & expected amount before saving
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => !isSubmitting && setIsConfirmOpen(false)}
                className="w-8 h-8 rounded-full bg-white/70 hover:bg-white text-[#04152d]/60 hover:text-[#04152d] flex items-center justify-center transition-all border border-white shadow-xs cursor-pointer"
              >
                <X size={15} />
              </button>
            </div>

            {/* Review Cards */}
            <div className="p-4 rounded-2xl bg-white/80 border border-white shadow-xs space-y-2.5 text-[12px]">
              <div className="flex justify-between items-center pb-2 border-b border-white">
                <span className="text-[#04152d]/60 font-semibold uppercase text-[10px]">Payroll Period:</span>
                <span className="font-bold text-[#04152d]">{payrollPeriod}</span>
              </div>

              <div className="flex justify-between items-center pb-2 border-b border-white">
                <span className="text-[#04152d]/60 font-semibold uppercase text-[10px]">Member:</span>
                <div className="text-right">
                  <span className="font-bold text-[#04152d] block">{validation.member?.name}</span>
                  <span className="font-mono text-[10px] text-blue-700 font-semibold">{memberId}</span>
                </div>
              </div>

              <div className="flex justify-between items-center pb-2 border-b border-white">
                <span className="text-[#04152d]/60 font-semibold uppercase text-[10px]">Deduction Classification:</span>
                <span className="font-semibold text-[#04152d]">{deductionType}</span>
              </div>

              <div className="flex justify-between items-center pb-2 border-b border-white">
                <span className="text-[#04152d]/60 font-semibold uppercase text-[10px]">Associated Obligation:</span>
                <span className="font-mono font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200 text-[11px]">
                  {validation.obligationRef}
                </span>
              </div>

              <div className="flex justify-between items-center pt-1 border-t border-white">
                <span className="text-[#04152d]/60 font-bold uppercase text-[10px]">Expected Deduction Amount:</span>
                <span className="font-extrabold text-[18px] text-blue-700">
                  {formatCurrency(Number(amount))}
                </span>
              </div>
            </div>

            {/* Flag Advisory */}
            {validation.status === 'Flagged for Review' && (
              <div className="p-3 bg-amber-50 rounded-2xl border border-amber-200 text-amber-800 text-[11px] flex items-start gap-2 shadow-xs">
                <AlertTriangle size={15} className="shrink-0 mt-0.5 text-amber-600" />
                <p>
                  <strong>Notice:</strong> This deduction has no direct active loan/obligation basis on file and will be flagged for officer review.
                </p>
              </div>
            )}

            {/* Action Buttons */}
            <div className="pt-2 flex items-center justify-end gap-2.5 border-t border-white/80">
              <button
                type="button"
                onClick={() => setIsConfirmOpen(false)}
                disabled={isSubmitting}
                className="px-4 py-2.5 rounded-full text-[12px] font-semibold text-[#04152d]/70 hover:bg-white transition-colors"
              >
                Back to Edit
              </button>
              <button
                type="button"
                onClick={handleExecuteSave}
                disabled={isSubmitting}
                className="px-5 py-2.5 rounded-full text-[12px] font-bold bg-emerald-700 text-white hover:bg-emerald-800 disabled:opacity-50 transition-all shadow-md flex items-center gap-1.5 active:scale-95"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 size={13} className="animate-spin" /> Saving...
                  </>
                ) : (
                  <>
                    <CheckCircle2 size={14} /> Confirm & Save Schedule
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
