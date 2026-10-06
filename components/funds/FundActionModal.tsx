"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { 
  X, Loader2, Save, Briefcase, AlertCircle, Percent,
  CheckCircle2, ArrowRight, ArrowLeft, ShieldCheck, Banknote
} from 'lucide-react';
import { Fund, validateFundCode } from '@/lib/fundData';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  fund: Fund | null; 
  existingFunds: Fund[];
  onSuccess: (fundData: Fund) => void;
}

export default function FundActionModal({ 
  isOpen, 
  onClose, 
  fund, 
  existingFunds, 
  onSuccess 
}: Props) {
  const isEditMode = Boolean(fund);

  // Form Step: 'input' -> 'confirm'
  const [step, setStep] = useState<'input' | 'confirm'>('input');

  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [description, setDescription] = useState('');
  
  // Strict Currency Masking States
  const [balance, setBalance] = useState(''); 
  const [displayBalance, setDisplayBalance] = useState(''); 
  const [targetUtilization, setTargetUtilization] = useState('80');

  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setStep('input');
      if (fund) {
        setName(fund.name);
        setCode(fund.code);
        setDescription(fund.description);
        setBalance(String(fund.openingBalance || 0));
        setDisplayBalance(Number(fund.openingBalance || 0).toLocaleString('en-US'));
        setTargetUtilization(String(fund.targetUtilization || 80));
      } else {
        setName('');
        setCode('');
        setDescription('');
        setBalance('0');
        setDisplayBalance('0');
        setTargetUtilization('80');
      }
      setTouched({});
      setError(null);
      setIsSubmitting(false);
    }
  }, [isOpen, fund]);

  const handleBalanceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value.replace(/,/g, '');
    val = val.replace(/[^0-9.]/g, ''); // Numbers and decimal only
    
    const parts = val.split('.');
    if (parts.length > 2) val = parts[0] + '.' + parts.slice(1).join('');
    
    setBalance(val); 
    
    if (val) {
      const [integerPart, decimalPart] = val.split('.');
      const formattedInteger = new Intl.NumberFormat('en-US').format(Number(integerPart));
      setDisplayBalance(decimalPart !== undefined ? `${formattedInteger}.${decimalPart}` : formattedInteger);
    } else {
      setDisplayBalance('');
    }
  };

  // Real-time Code Uniqueness Check
  const codeValidation = useMemo(() => {
    if (!code) return { isValid: true };
    return validateFundCode(code, existingFunds, fund?.id);
  }, [code, existingFunds, fund]);

  // Name duplicate check
  const nameValidation = useMemo(() => {
    const clean = name.trim().toLowerCase();
    if (!clean) return { isValid: true };
    const isDuplicate = existingFunds.some(
      f => f.name.toLowerCase() === clean && f.id !== fund?.id
    );
    if (isDuplicate) {
      return { isValid: false, error: `A fund named "${name.trim()}" already exists.` };
    }
    return { isValid: true };
  }, [name, existingFunds, fund]);

  const handleProceedToReview = (e: React.FormEvent) => {
    e.preventDefault();
    setTouched({ name: true, code: true, targetUtilization: true, balance: true });

    const cleanName = name.trim();
    const cleanCode = code.trim().toUpperCase();

    if (!cleanName || !cleanCode || !targetUtilization) {
      return setError('Please fill in all mandatory configuration fields.');
    }

    if (!codeValidation.isValid) {
      return setError(codeValidation.error || 'Invalid fund code.');
    }

    if (!nameValidation.isValid) {
      return setError(nameValidation.error || 'Duplicate fund name.');
    }

    const utilNum = Number(targetUtilization);
    if (isNaN(utilNum) || utilNum <= 0 || utilNum > 100) {
      return setError('Target utilization must be a valid percentage between 1% and 100%.');
    }

    const balanceNum = Number(balance);
    if (isNaN(balanceNum) || balanceNum < 0) {
      return setError('Recorded opening balance cannot be negative.');
    }

    setError(null);
    setStep('confirm');
  };

  const handleFinalSubmit = async () => {
    setIsSubmitting(true);
    setError(null);

    const cleanName = name.trim();
    const cleanCode = code.trim().toUpperCase();
    const numericBalance = Number(balance) || 0;
    const numericUtil = Number(targetUtilization) || 80;

    try {
      const fundPayload: Fund = {
        id: isEditMode && fund ? fund.id : `FND-${(existingFunds.length + 1).toString().padStart(3, '0')}`,
        name: cleanName,
        code: cleanCode,
        description: description.trim(),
        openingBalance: isEditMode && fund ? fund.openingBalance : numericBalance,
        targetUtilization: numericUtil,
        status: isEditMode && fund ? fund.status : 'Active',
        createdAt: isEditMode && fund ? fund.createdAt : new Date().toISOString().split('T')[0]
      };

      onSuccess(fundPayload);
      setIsSubmitting(false);
      onClose();
    } catch (err: any) {
      setIsSubmitting(false);
      setError(err.message || 'An error occurred while saving fund record.');
    }
  };

  if (!isOpen) return null;

  const formatCurrency = (val: number) => `₱${Number(val || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}`;

  const ultraGlassCard = "bg-white/95 backdrop-blur-[40px] backdrop-saturate-[200%] border border-white/90 shadow-[0_20px_50px_rgba(4,21,45,0.16),inset_0_2px_4px_rgba(255,255,255,1)] rounded-[26px] p-6 lg:p-8 relative overflow-hidden";
  const glassInput = "w-full pl-4 pr-4 py-2.5 bg-white/70 hover:bg-white/90 focus:bg-white backdrop-blur-xl border border-white/90 shadow-[inset_0_2px_4px_rgba(4,21,45,0.03)] rounded-xl text-[13px] font-semibold text-[#04152d] outline-none transition-all placeholder:text-[#04152d]/40 focus:ring-2 focus:ring-blue-500/20";
  const labelStyle = "block text-[11px] font-bold text-[#04152d]/70 uppercase tracking-widest mb-1.5 flex items-center justify-between";

  return (
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
            <div className="w-10 h-10 rounded-2xl bg-blue-50 border border-blue-200 text-blue-600 flex items-center justify-center shadow-sm">
              <Briefcase size={20} />
            </div>
            <div>
              <h3 className="text-[17px] font-bold text-[#04152d] tracking-tight">
                {step === 'confirm' 
                  ? 'Confirm Fund Configuration' 
                  : isEditMode ? 'Edit Fund Record' : 'Register New Fund'}
              </h3>
              <p className="text-[11px] text-[#04152d]/60 font-medium">
                {step === 'confirm' 
                  ? 'Verify financial parameters before recording to master ledger'
                  : 'Fund Master Ledger Configuration (System Admin)'}
              </p>
            </div>
          </div>
          <button 
            onClick={() => !isSubmitting && onClose()} 
            disabled={isSubmitting} 
            className="p-2 bg-white/70 hover:bg-white rounded-full border border-white shadow-sm disabled:opacity-50 transition-colors text-[#04152d]/60 hover:text-[#04152d]"
          >
            <X size={16} />
          </button>
        </div>

        {/* Scrollable Content Body - Inner only moves */}
        <div className="flex-1 overflow-y-auto pr-1 space-y-4 hide-scrollbar min-h-0">
          {error && (
            <div className="bg-rose-50 border border-rose-200 text-rose-700 p-3.5 rounded-xl flex items-start gap-2.5 text-[12px] font-medium animate-fade-in shadow-xs">
              <AlertCircle size={16} className="shrink-0 mt-0.5 text-rose-600" />
              <p className="leading-tight">{error}</p>
            </div>
          )}

          {step === 'input' ? (
            <form id="fund-form" onSubmit={handleProceedToReview} className="space-y-4">
              <div>
                <label className={labelStyle}>
                  <span>Fund Name <span className="text-rose-500">*</span></span>
                  {!nameValidation.isValid && (
                    <span className="text-rose-600 text-[10px] font-bold lowercase">duplicate</span>
                  )}
                </label>
                <input 
                  type="text" 
                  required 
                  disabled={isSubmitting} 
                  value={name} 
                  onChange={(e) => setName(e.target.value)} 
                  className={`${glassInput} ${!nameValidation.isValid ? 'border-rose-400 bg-rose-50/50' : ''}`}
                  placeholder="e.g., Union Emergency Fund" 
                />
                {!nameValidation.isValid && (
                  <p className="text-[11px] text-rose-600 mt-1 font-medium">{nameValidation.error}</p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3.5">
                <div>
                  <label className={labelStyle}>
                    <span>Fund Code <span className="text-rose-500">*</span></span>
                    <span className="text-[10px] text-[#04152d]/40">2-4 Alphanumeric</span>
                  </label>
                  <input 
                    type="text" 
                    maxLength={4} 
                    required 
                    disabled={isSubmitting} 
                    value={code} 
                    onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))} 
                    className={`${glassInput} uppercase font-mono ${!codeValidation.isValid ? 'border-rose-400 bg-rose-50/50' : ''}`} 
                    placeholder="e.g., UEF" 
                  />
                  {!codeValidation.isValid && (
                    <p className="text-[11px] text-rose-600 mt-1 font-medium leading-tight">
                      {codeValidation.error}
                    </p>
                  )}
                  {code && codeValidation.isValid && (
                    <p className="text-[10px] text-emerald-600 mt-1 font-semibold flex items-center gap-1">
                      <CheckCircle2 size={10} /> Unique fund code verified
                    </p>
                  )}
                </div>

                <div>
                  <label className={labelStyle}>
                    <span>Utilization Target <span className="text-rose-500">*</span></span>
                    <span className="text-[10px] text-[#04152d]/40">% Limit</span>
                  </label>
                  <div className="relative">
                    <input 
                      type="number" 
                      min="1" 
                      max="100" 
                      required 
                      disabled={isSubmitting} 
                      value={targetUtilization} 
                      onChange={(e) => setTargetUtilization(e.target.value)} 
                      className={`${glassInput} !pr-8`} 
                      placeholder="80" 
                    />
                    <Percent size={14} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#04152d]/40 pointer-events-none" />
                  </div>
                </div>
              </div>

              {/* Recorded Opening Balance baseline (User Story 3) */}
              <div>
                <label className={labelStyle}>
                  <span>Recorded Opening Balance Baseline <span className="text-rose-500">*</span></span>
                  <span className="text-[10px] text-blue-600 font-bold uppercase">Starting Position</span>
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#04152d]/60 font-bold text-[14px]">₱</span>
                  <input
                    type="text"
                    required
                    disabled={isSubmitting || isEditMode}
                    value={displayBalance}
                    onChange={handleBalanceChange}
                    className={`${glassInput} !pl-9 font-semibold text-[15px] ${isEditMode ? 'opacity-70 bg-gray-100 cursor-not-allowed' : ''}`}
                    placeholder="0.00"
                  />
                </div>
                <p className="text-[10px] text-[#04152d]/60 mt-1.5 leading-relaxed">
                  {isEditMode 
                    ? 'The recorded opening balance baseline is immutable post-inception to preserve audit integrity.' 
                    : 'This records the starting baseline balance separately from subsequent inflows and outflows.'}
                </p>
              </div>

              <div>
                <label className={labelStyle}>Description & Constitutional Purpose</label>
                <textarea 
                  rows={3} 
                  disabled={isSubmitting} 
                  value={description} 
                  onChange={(e) => setDescription(e.target.value)} 
                  className={`${glassInput} resize-none`} 
                  placeholder="Detail the constitutional mandate, eligible obligations, and allocation rules..." 
                />
              </div>
            </form>
          ) : (
            /* Review & Security Confirmation Step */
            <div className="space-y-4 animate-fade-in">
              <div className="bg-blue-50/60 p-4 rounded-2xl border border-blue-200 space-y-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-blue-800 flex items-center gap-1.5">
                  <ShieldCheck size={14} /> Master Ledger Integrity Confirmation
                </span>
                <p className="text-[12px] text-[#04152d]/80 leading-relaxed font-medium">
                  You are about to {isEditMode ? 'update the configuration for' : 'register and initialize'} <span className="font-bold text-[#04152d]">{name.trim()}</span> ({code.trim().toUpperCase()}).
                </p>
              </div>

              <div className="bg-white/80 p-4 rounded-2xl border border-white space-y-3 text-[12px]">
                <div className="flex justify-between items-center pb-2 border-b border-white">
                  <span className="text-[#04152d]/60 font-semibold uppercase text-[10px]">Fund Name:</span>
                  <span className="font-bold text-[#04152d]">{name.trim()}</span>
                </div>
                <div className="flex justify-between items-center pb-2 border-b border-white">
                  <span className="text-[#04152d]/60 font-semibold uppercase text-[10px]">Unique Fund Code:</span>
                  <span className="font-mono font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                    {code.trim().toUpperCase()}
                  </span>
                </div>
                <div className="flex justify-between items-center pb-2 border-b border-white">
                  <span className="text-[#04152d]/60 font-semibold uppercase text-[10px]">Recorded Opening Balance:</span>
                  <span className="font-bold text-[14px] text-blue-700">{formatCurrency(Number(balance) || 0)}</span>
                </div>
                <div className="flex justify-between items-center pb-2 border-b border-white">
                  <span className="text-[#04152d]/60 font-semibold uppercase text-[10px]">Target Utilization Limit:</span>
                  <span className="font-bold text-[#04152d]">{targetUtilization}%</span>
                </div>
                <div className="pt-1">
                  <span className="text-[#04152d]/60 font-semibold uppercase text-[10px] block mb-1">Purpose:</span>
                  <p className="text-[11px] text-[#04152d]/80 italic bg-white/50 p-2 rounded-lg border border-white">
                    {description.trim() || 'No description provided.'}
                  </p>
                </div>
              </div>

              <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-amber-800 text-[11px] flex items-start gap-2">
                <AlertCircle size={15} className="shrink-0 mt-0.5 text-amber-600" />
                <p>
                  Once registered, this fund will immediately be marked as <strong>Active</strong> and available for new collection deposits and authorized disbursements.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Fixed Footer */}
        <div className="shrink-0 border-t border-white/70 pt-4 mt-3 flex items-center justify-between gap-3">
          {step === 'input' ? (
            <>
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
                form="fund-form"
                disabled={isSubmitting || !codeValidation.isValid || !nameValidation.isValid} 
                className="px-6 py-2.5 rounded-full text-[13px] font-semibold bg-[#04152d] text-white hover:bg-[#0a1e3f] disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md flex items-center gap-2 active:scale-95"
              >
                Review & Confirm <ArrowRight size={14} />
              </button>
            </>
          ) : (
            <>
              <button 
                type="button" 
                onClick={() => setStep('input')} 
                disabled={isSubmitting} 
                className="px-5 py-2.5 rounded-full text-[13px] font-semibold text-[#04152d]/70 hover:bg-white transition-colors flex items-center gap-1.5"
              >
                <ArrowLeft size={14} /> Back to Edit
              </button>
              <button 
                type="button" 
                onClick={handleFinalSubmit}
                disabled={isSubmitting} 
                className="px-6 py-2.5 rounded-full text-[13px] font-semibold bg-emerald-700 text-white hover:bg-emerald-800 disabled:opacity-50 transition-all shadow-md flex items-center gap-2 active:scale-95"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 size={14} className="animate-spin" /> Recording Fund...
                  </>
                ) : (
                  <>
                    <CheckCircle2 size={15} /> Confirm & Execute Registration
                  </>
                )}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}