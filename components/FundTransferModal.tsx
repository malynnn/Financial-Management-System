"use client";

import { useState, useEffect } from 'react';
import { X, ArrowRightLeft } from 'lucide-react';

interface Fund {
  id: string;
  name: string;
  balance: number;
}

interface FundTransferModalProps {
  isOpen: boolean;
  onClose: () => void;
  funds: Fund[];
  onSubmit: (data: { sourceId: string; destId: string; amount: number; notes: string }) => void;
}

export default function FundTransferModal({ isOpen, onClose, funds, onSubmit }: FundTransferModalProps) {
  const [sourceId, setSourceId] = useState('');
  const [destId, setDestId] = useState('');
  const [amount, setAmount] = useState('');
  const [notes, setNotes] = useState('');

  const [isRendered, setIsRendered] = useState(isOpen);
  const [show, setShow] = useState(false);

  // Handle smooth mount/unmount animations
  useEffect(() => {
    if (isOpen) {
      setIsRendered(true);
      const raf = requestAnimationFrame(() => {
        requestAnimationFrame(() => setShow(true));
      });
      return () => cancelAnimationFrame(raf);
    } else {
      setShow(false);
      const timer = setTimeout(() => setIsRendered(false), 400);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  if (!isRendered) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!sourceId || !destId || !amount || Number(amount) <= 0) return;
    onSubmit({ sourceId, destId, amount: Number(amount), notes });
    
    // Reset form after submit
    setSourceId('');
    setDestId('');
    setAmount('');
    setNotes('');
  };

  const sourceFund = funds.find(f => f.id === sourceId);
  const isValidAmount = sourceFund ? Number(amount) <= sourceFund.balance : false;

  const inputClass = "w-full rounded-xl pl-4 pr-4 py-2.5 text-[13px] bg-white/60 hover:bg-white/80 backdrop-blur-xl backdrop-saturate-[200%] border border-white/80 shadow-[inset_0_2px_6px_rgba(4,21,45,0.03)] focus:bg-white focus:shadow-[0_4px_16px_rgba(4,21,45,0.08)] outline-none font-bold text-[#04152d] transition-all duration-300";

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
      <div 
        className={`absolute inset-0 bg-[#04152d]/40 backdrop-blur-md transition-opacity duration-400 ease-[cubic-bezier(0.25,1,0.5,1)] ${show ? 'opacity-100' : 'opacity-0'}`} 
        onClick={onClose} 
      />
      
      <div className={`relative w-full max-w-lg flex flex-col glass-sheen bg-gradient-to-br from-white/60 via-white/40 to-white/30 backdrop-blur-[40px] backdrop-saturate-[200%] border border-white/80 shadow-[0_10px_30px_rgba(4,21,45,0.06),0_1px_1px_rgba(255,255,255,0.6),inset_0_2px_3px_rgba(255,255,255,0.9)] rounded-[24px] p-6 md:p-8 transition-all duration-400 ease-[cubic-bezier(0.25,1,0.5,1)] transform ${show ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-95 translate-y-4'}`}>
        
        <div className="flex items-center justify-between border-b border-white/60 pb-4 mb-5">
          <h3 className="text-[17px] font-black text-[#04152d] tracking-tight flex items-center gap-2">
            <ArrowRightLeft size={18} className="text-blue-600" /> Inter-Fund Transfer
          </h3>
          <button 
            onClick={onClose} 
            className="glass-sheen flex items-center justify-center bg-white/70 hover:bg-white/90 backdrop-blur-md border border-white/80 shadow-[0_2px_8px_rgba(4,21,45,0.04),inset_0_1px_2px_rgba(255,255,255,0.8)] hover:shadow-[0_4px_12px_rgba(4,21,45,0.08),inset_0_1px_2px_rgba(255,255,255,1)] rounded-full transition-all duration-300 ease-[cubic-bezier(0.25,1,0.5,1)] active:scale-90 text-[#04152d]/60 hover:text-[#04152d] w-8 h-8"
          >
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-[10px] font-black text-[#04152d]/50 uppercase tracking-[0.2em] mb-1.5">Source Fund</label>
            <select required value={sourceId} onChange={e => setSourceId(e.target.value)} className={inputClass}>
              <option value="" disabled>Select origin fund...</option>
              {funds.map(f => (
                <option key={f.id} value={f.id}>{f.name} (Available: ₱{f.balance.toLocaleString()})</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-black text-[#04152d]/50 uppercase tracking-[0.2em] mb-1.5">Destination Fund</label>
            <select required value={destId} onChange={e => setDestId(e.target.value)} className={inputClass}>
              <option value="" disabled>Select target fund...</option>
              {funds.filter(f => f.id !== sourceId).map(f => (
                <option key={f.id} value={f.id}>{f.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-black text-[#04152d]/50 uppercase tracking-[0.2em] mb-1.5">Transfer Amount</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#04152d]/50 font-black">₱</span>
              <input 
                type="number" required min="1" step="0.01" 
                placeholder="0.00" value={amount} 
                onChange={e => setAmount(e.target.value)}
                className={`${inputClass} pl-8`} 
              />
            </div>
            {sourceId && amount && !isValidAmount && (
              <p className="text-[10.5px] font-bold text-red-500 mt-1.5 ml-1 flex items-center gap-1">
                Insufficient funds in source account.
              </p>
            )}
          </div>

          <div>
            <label className="block text-[10px] font-black text-[#04152d]/50 uppercase tracking-[0.2em] mb-1.5">Authorization Notes</label>
            <textarea 
              rows={2} placeholder="Reason for transfer..." 
              value={notes} onChange={e => setNotes(e.target.value)} 
              className={`${inputClass} resize-none`} 
            />
          </div>

          <div className="pt-2">
            <button 
              type="submit" 
              disabled={!sourceId || !destId || !amount || !isValidAmount}
              className="w-full glass-sheen py-3.5 bg-[#04152d] hover:bg-[#04152d]/90 text-white border border-white/20 shadow-[0_6px_16px_rgba(4,21,45,0.25)] active:scale-95 disabled:opacity-40 disabled:active:scale-100 rounded-full text-[13px] font-black transition-all duration-300 flex items-center justify-center gap-2"
            >
              <ArrowRightLeft size={16} /> Execute Transfer
            </button>
          </div>
        </form>

      </div>
    </div>
  );
}