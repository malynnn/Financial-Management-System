"use client";

import React, { useState, useEffect } from 'react';
import { 
  X, Loader2, Save, Briefcase, AlertCircle, Percent
} from 'lucide-react';

interface Fund {
  id: string;
  name: string;
  code: string;
  description: string;
  balance: number;
  targetUtilization: number;
  status: 'Active' | 'Inactive';
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  fund: Fund | null; 
  existingFunds: Fund[];
  onSuccess: (fundData: any) => void;
}

export default function FundActionModal({ isOpen, onClose, fund, existingFunds, onSuccess }: Props) {
  const isEditMode = Boolean(fund);

  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [description, setDescription] = useState('');
  
  // Strict Currency Masking States
  const [balance, setBalance] = useState(''); 
  const [displayBalance, setDisplayBalance] = useState(''); 
  
  const [targetUtilization, setTargetUtilization] = useState('');

  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      if (fund) {
        setName(fund.name);
        setCode(fund.code);
        setDescription(fund.description);
        setBalance(String(fund.balance));
        setDisplayBalance(fund.balance.toLocaleString('en-US'));
        setTargetUtilization(String(fund.targetUtilization));
      } else {
        setName('');
        setCode('');
        setDescription('');
        setBalance('');
        setDisplayBalance('');
        setTargetUtilization('');
      }
      setError(null);
      setIsSubmitting(false);
    }
  }, [isOpen, fund]);

  const handleBalanceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value.replace(/,/g, '');
    val = val.replace(/[^0-9.]/g, ''); // Allow only numbers and decimal
    
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const cleanName = name.trim();
    const cleanCode = code.trim().toUpperCase();

    if (!cleanName || !cleanCode || !targetUtilization) {
      return setError('Please fill in all required fields.');
    }

    if (cleanCode.length > 4 || cleanCode.length < 2) {
      return setError('Fund code must be strictly between 2 and 4 characters.');
    }

    if (Number(targetUtilization) <= 0 || Number(targetUtilization) > 100) {
      return setError('Target utilization must be a valid percentage between 1 and 100.');
    }

    if (!isEditMode && Number(balance) < 0) {
      return setError('Initial balance cannot be a negative value.');
    }

    const isNameDuplicate = existingFunds.some(f => f.name.toLowerCase() === cleanName.toLowerCase() && f.id !== fund?.id);
    const isCodeDuplicate = existingFunds.some(f => f.code.toLowerCase() === cleanCode.toLowerCase() && f.id !== fund?.id);

    if (isNameDuplicate) return setError(`A fund with the name "${cleanName}" already exists.`);
    if (isCodeDuplicate) return setError(`The fund code "${cleanCode}" is already in use.`);

    setIsSubmitting(true);
    setError(null);

    const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

    (async () => {
      try {
        let responseData: any = null;
        if (isEditMode && fund) {
          const res = await fetch(`${API_BASE_URL}/funds/${fund.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              name: cleanName,
              code: cleanCode,
              description: description.trim(),
              targetUtilization: Number(targetUtilization),
            }),
          });
          if (!res.ok) {
            const errData = await res.json().catch(() => ({}));
            throw new Error(errData.message || 'Failed to update fund.');
          }
          responseData = await res.json();
        } else {
          const res = await fetch(`${API_BASE_URL}/funds`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              name: cleanName,
              code: cleanCode,
              description: description.trim(),
              openingBalance: Number(balance) || 0,
              targetUtilization: Number(targetUtilization),
              status: 'Active',
            }),
          });
          if (!res.ok) {
            const errData = await res.json().catch(() => ({}));
            throw new Error(errData.message || 'Failed to register fund.');
          }
          responseData = await res.json();
        }

        onSuccess(responseData || {
          id: isEditMode ? fund!.id : `FND-${Date.now()}`,
          name: cleanName,
          code: cleanCode,
          description: description.trim(),
          balance: isEditMode ? fund!.balance : Number(balance) || 0,
          targetUtilization: Number(targetUtilization),
          status: isEditMode ? fund!.status : 'Active'
        });
        setIsSubmitting(false);
        onClose();
      } catch (err: any) {
        setIsSubmitting(false);
        setError(err.message || 'An error occurred while saving fund.');
      }
    })();
  };

  if (!isOpen) return null;

  const ultraGlassCard = "bg-white/80 backdrop-blur-[40px] backdrop-saturate-[200%] border border-white/90 shadow-[0_16px_40px_rgba(4,21,45,0.1),inset_0_2px_4px_rgba(255,255,255,1)] rounded-[24px] p-6 lg:p-8 relative overflow-hidden transition-all duration-400";
  const glassInput = "w-full pl-4 pr-4 py-3 bg-white/60 hover:bg-white/80 focus:bg-white/90 backdrop-blur-xl border border-white/90 shadow-[inset_0_2px_4px_rgba(4,21,45,0.03)] rounded-[12px] text-[13px] font-semibold text-[#04152d] outline-none transition-all duration-300 placeholder:text-[#04152d]/40 focus:shadow-[0_4px_16px_rgba(4,21,45,0.08),inset_0_1px_2px_rgba(255,255,255,1)] disabled:opacity-50 disabled:cursor-not-allowed";
  const labelStyle = "block text-[11px] font-semibold text-[#04152d]/70 uppercase tracking-widest mb-2 flex items-center gap-1";

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 transition-opacity duration-300 opacity-100">
      <div className="absolute inset-0 bg-[#04152d]/40 backdrop-blur-md" onClick={() => !isSubmitting && onClose()} />
      
      <div className={`relative w-full max-w-lg max-h-[90vh] flex flex-col animate-modal-enter ${ultraGlassCard}`}>
        
        <div className="flex items-center justify-between border-b border-white/60 pb-4 mb-5 shrink-0">
          <h3 className="text-[18px] font-semibold text-[#04152d] tracking-tight flex items-center gap-2">
            <Briefcase className="text-blue-600" size={20} />
            {isEditMode ? 'Edit Fund Configuration' : 'Register New Fund'}
          </h3>
          <button onClick={() => !isSubmitting && onClose()} disabled={isSubmitting} className="p-2 bg-white/50 hover:bg-white/80 rounded-full border border-white shadow-sm disabled:opacity-50 transition-colors">
            <X size={16} className="text-[#04152d]/60 hover:text-[#04152d]" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
          <div className="flex-1 overflow-y-auto pr-2 space-y-5 hide-scrollbar">
            {error && (
              <div className="bg-red-50/80 border border-red-200 text-red-700 p-3 rounded-[12px] flex items-start gap-2 text-[12px] font-medium animate-fade-in">
                <AlertCircle size={16} className="shrink-0 mt-0.5 text-red-500" />
                <p className="leading-tight">{error}</p>
              </div>
            )}

            <div>
              <label className={labelStyle}>Fund Name <span className="text-red-500 text-[14px] leading-none">*</span></label>
              <input type="text" required disabled={isSubmitting} value={name} onChange={(e) => setName(e.target.value)} className={glassInput} placeholder="e.g. Union Fund" />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelStyle}>Fund Code <span className="text-red-500 text-[14px] leading-none">*</span></label>
                <input type="text" maxLength={4} required disabled={isSubmitting} value={code} onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))} className={`${glassInput} uppercase`} placeholder="e.g. UNF" />
              </div>
              <div>
                <label className={labelStyle}>Target Utilization <span className="text-red-500 text-[14px] leading-none">*</span></label>
                <div className="relative">
                  <input type="number" min="1" max="100" required disabled={isSubmitting} value={targetUtilization} onChange={(e) => setTargetUtilization(e.target.value)} className={`${glassInput} !pr-10`} placeholder="80" />
                  <Percent size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-[#04152d]/50 pointer-events-none" />
                </div>
              </div>
            </div>

            {!isEditMode && (
              <div>
                <label className={labelStyle}>Initial Balance (Opening Ledger) <span className="text-red-500 text-[14px] leading-none">*</span></label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#04152d]/50 font-bold text-[14px]">₱</span>
                  <input
                    type="text"
                    required
                    disabled={isSubmitting}
                    value={displayBalance}
                    onChange={handleBalanceChange}
                    className={`${glassInput} !pl-9`}
                    placeholder="0.00"
                  />
                </div>
                <p className="text-[10px] text-[#04152d]/50 mt-1.5 ml-1">This will generate a system-level opening balance transaction.</p>
              </div>
            )}

            <div>
              <label className={labelStyle}>Description / Purpose</label>
              <textarea rows={3} disabled={isSubmitting} value={description} onChange={(e) => setDescription(e.target.value)} className={glassInput} placeholder="Brief description of the fund's purpose..." />
            </div>
          </div>

          <div className="shrink-0 border-t border-white/60 pt-5 mt-4 flex gap-3 justify-end">
            <button type="button" onClick={onClose} disabled={isSubmitting} className="px-5 py-2.5 rounded-full text-[13px] font-semibold text-[#04152d]/60 hover:bg-white transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={isSubmitting} className="relative overflow-hidden px-5 py-2.5 bg-gradient-to-b from-[#0a1e3f] to-[#04152d] text-white border border-[#04152d] shadow-[0_6px_20px_rgba(4,21,45,0.3),inset_0_1px_1px_rgba(255,255,255,0.15)] hover:shadow-[0_8px_25px_rgba(4,21,45,0.4),inset_0_1px_1px_rgba(255,255,255,0.25)] hover:from-[#0f2850] hover:to-[#061a38] rounded-full text-[13px] font-semibold transition-all duration-300 flex items-center gap-2 active:scale-95 disabled:opacity-50">
              {isSubmitting ? <><Loader2 size={14} className="animate-spin" /> Saving...</> : <><Save size={14} /> {isEditMode ? 'Update Fund' : 'Register Fund'}</>}
            </button>
          </div>
        </form>

      </div>
    </div>
  );
}