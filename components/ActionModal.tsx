"use client";

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Loader2, CheckCircle2, AlertTriangle, X, Info } from 'lucide-react';

interface ActionModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  status: 'idle' | 'loading' | 'success' | 'error';
  resultMsg?: string;
  onConfirm: () => void;
  onClose: () => void;
  confirmText?: string;
}

export default function ActionModal({
  isOpen,
  title,
  message,
  status,
  resultMsg,
  onConfirm,
  onClose,
  confirmText = 'Confirm'
}: ActionModalProps) {
  const [mounted, setMounted] = useState(false);

  // for scroll locking
  useEffect(() => {
    setMounted(true);
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen || !mounted) return null;

  const ultraGlassCard = "glass-sheen bg-gradient-to-br from-white/60 via-white/40 to-white/30 backdrop-blur-[40px] backdrop-saturate-[200%] border border-white/80 shadow-[0_10px_30px_rgba(4,21,45,0.06),0_1px_1px_rgba(255,255,255,0.6),inset_0_2px_3px_rgba(255,255,255,0.9)] rounded-[24px] p-6";
  const iconBtn = "glass-sheen flex items-center justify-center bg-white/70 hover:bg-white/90 backdrop-blur-md border border-white/80 shadow-[0_2px_8px_rgba(4,21,45,0.04),inset_0_1px_2px_rgba(255,255,255,0.8)] hover:shadow-[0_4px_12px_rgba(4,21,45,0.08),inset_0_1px_2px_rgba(255,255,255,1)] rounded-full transition-all duration-300 active:scale-90 text-[#04152d]/60 hover:text-[#04152d]";

  const getIcon = () => {
    if (status === 'success') return <CheckCircle2 className="text-blue-600" size={20} />;
    if (status === 'error') return <AlertTriangle className="text-red-600" size={20} />;
    return <Info className="text-blue-600" size={20} />;
  };

  const modalContent = (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 sm:p-6">
      
      {/* aimations */}
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes modal-enter {
          from { opacity: 0; transform: scale(0.95) translateY(10px); }
          to { opacity: 1; transform: scale(1) translateY(0); }
        }
        .animate-modal-enter { animation: modal-enter 0.4s cubic-bezier(0.25, 1, 0.5, 1) forwards; }
        
        .glass-sheen { position: relative; overflow: hidden; isolation: isolate; }
        .glass-sheen::before {
          content: ''; position: absolute; inset: 0;
          background: linear-gradient(128deg, rgba(255,255,255,0.65) 0%, rgba(255,255,255,0.14) 28%, rgba(255,255,255,0) 46%), radial-gradient(130% 110% at 12% -18%, rgba(255,255,255,0.55), rgba(255,255,255,0) 58%);
          opacity: 0.85; transition: opacity 0.35s ease; pointer-events: none; z-index: 1;
        }
        .glass-sheen:hover::before { opacity: 1; }
        .glass-sheen::after {
          content: ''; position: absolute; inset: 0;
          box-shadow: inset 0 1px 0 rgba(255,255,255,0.9), inset 0 -10px 18px -14px rgba(4,21,45,0.15), inset 1px 0 0 rgba(255,255,255,0.4), inset -1px 0 0 rgba(255,255,255,0.1), inset 0 0 0 1px rgba(255,255,255,0.1);
          transition: box-shadow 0.35s ease; pointer-events: none; z-index: 1; border-radius: inherit;
        }
        .glass-sheen:hover::after {
          box-shadow: inset 0 1px 0 rgba(255,255,255,1), inset 0 -10px 20px -12px rgba(4,21,45,0.2), inset 1px 0 0 rgba(255,255,255,0.6), inset -1px 0 0 rgba(255,255,255,0.2), inset 0 0 0 1px rgba(255,255,255,0.4);
        }
      `}} />

      {/* background overlay */}
      <div 
        className="absolute inset-0 bg-[#04152d]/40 backdrop-blur-sm transition-opacity duration-300" 
        onClick={status !== 'loading' ? onClose : undefined} 
      />
      
      {/* card */}
      <div className={`relative w-full max-w-md ${ultraGlassCard} flex flex-col animate-modal-enter`}>
        
        {/* header */}
        <div className="flex items-center justify-between border-b border-white/60 pb-4 mb-5">
          <h3 className="text-[16px] font-black text-[#04152d] tracking-tight flex items-center gap-2.5">
            {getIcon()} {title}
          </h3>
          {status !== 'loading' && (
            <button onClick={onClose} className={`${iconBtn} w-8 h-8`} title="Close">
              <X size={16} />
            </button>
          )}
        </div>

        {/* content body */}
        <div className="bg-white/50 backdrop-blur-md border border-white/80 p-6 rounded-[20px] shadow-[inset_0_1px_2px_rgba(255,255,255,0.9)] mb-6 flex flex-col items-center justify-center min-h-[100px] text-center">
          {status === 'loading' ? (
            <div className="flex flex-col items-center gap-3">
              <Loader2 size={28} className="animate-spin text-blue-600" />
              <p className="text-[13px] font-bold text-[#04152d]/70">{message}</p>
            </div>
          ) : (
            <p className="text-[13.5px] font-bold text-[#04152d]/80 leading-relaxed">
              {resultMsg || message}
            </p>
          )}
        </div>

        {/* actions */}
        {status === 'idle' && (
          <div className="flex items-center gap-3 w-full mt-auto">
            <button
              onClick={onClose}
              className="glass-sheen flex-1 px-5 py-3.5 bg-white/70 hover:bg-white/90 backdrop-blur-xl border border-white/80 shadow-[0_4px_14px_rgba(4,21,45,0.06),inset_0_1px_2px_rgba(255,255,255,1)] rounded-full text-[13px] font-black text-[#04152d] transition-all duration-300 active:scale-95 outline-none"
            >
              Cancel
            </button>
            <button
              onClick={onConfirm}
              className="glass-sheen flex-1 px-5 py-3.5 bg-[#04152d] hover:bg-[#04152d]/90 text-white shadow-[0_6px_16px_rgba(4,21,45,0.25)] border border-white/20 rounded-full text-[13px] font-black transition-all duration-300 active:scale-95 outline-none"
            >
              {confirmText}
            </button>
          </div>
        )}

        {/* end states */}
        {(status === 'success' || status === 'error') && (
          <div className="flex w-full mt-auto">
            <button
              onClick={onClose}
              className="glass-sheen w-full px-5 py-3.5 bg-[#04152d] hover:bg-[#04152d]/90 text-white shadow-[0_6px_16px_rgba(4,21,45,0.25)] border border-white/20 rounded-full text-[13px] font-black transition-all duration-300 active:scale-95 outline-none"
            >
              Close
            </button>
          </div>
        )}
        
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}