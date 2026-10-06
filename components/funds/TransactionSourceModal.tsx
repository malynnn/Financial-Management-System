"use client";

import React from 'react';
import { 
  X, ExternalLink, ShieldCheck, ArrowDownLeft, ArrowUpRight, 
  Calendar, FileText, User, CreditCard, Building2, CheckCircle2, Clock
} from 'lucide-react';
import { FundTransaction } from '@/lib/fundData';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  transaction: FundTransaction | null;
}

export default function TransactionSourceModal({ isOpen, onClose, transaction }: Props) {
  if (!isOpen || !transaction) return null;

  const isInflow = transaction.direction === 'INFLOW' || transaction.type.includes('Inflow');
  const isOpening = transaction.direction === 'OPENING' || transaction.type.includes('Opening');

  const formatCurrency = (val: number) => `₱${Number(val || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}`;

  const ultraGlassCard = "bg-white/90 backdrop-blur-[40px] backdrop-saturate-[200%] border border-white/90 shadow-[0_20px_50px_rgba(4,21,45,0.15),inset_0_2px_4px_rgba(255,255,255,1)] rounded-[24px] p-6 lg:p-8 relative overflow-hidden";

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 sm:p-6 transition-opacity duration-300">
      {/* Locked outer backdrop */}
      <div 
        className="absolute inset-0 bg-[#04152d]/45 backdrop-blur-md transition-opacity" 
        onClick={onClose} 
      />

      <div className={`relative w-full max-w-xl max-h-[90vh] flex flex-col animate-modal-enter ${ultraGlassCard}`}>
        {/* Header - Fixed shrink-0 */}
        <div className="flex items-center justify-between border-b border-white/70 pb-4 mb-5 shrink-0">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-2xl flex items-center justify-center border shadow-sm ${
              isInflow ? 'bg-emerald-50 border-emerald-200 text-emerald-600' :
              isOpening ? 'bg-blue-50 border-blue-200 text-blue-600' :
              'bg-rose-50 border-rose-200 text-rose-600'
            }`}>
              {isInflow ? <ArrowDownLeft size={20} /> :
               isOpening ? <Building2 size={20} /> :
               <ArrowUpRight size={20} />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-[17px] font-semibold text-[#04152d] tracking-tight">
                  Source Transaction Provenance
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-blue-100/70 text-blue-800 border border-blue-200">
                  {transaction.sourceModule}
                </span>
              </div>
              <p className="text-[11px] font-mono text-[#04152d]/60 mt-0.5">
                Fund Movement Ref: <span className="font-semibold text-blue-600">{transaction.id}</span>
              </p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="p-2 bg-white/70 hover:bg-white rounded-full border border-white shadow-sm transition-colors text-[#04152d]/60 hover:text-[#04152d]"
          >
            <X size={16} />
          </button>
        </div>

        {/* Scrollable Content Body - inner only moves */}
        <div className="flex-1 overflow-y-auto pr-1 space-y-5 hide-scrollbar">
          {/* Key Metric Card */}
          <div className={`p-4 rounded-2xl border ${
            isInflow ? 'bg-emerald-50/60 border-emerald-200' :
            isOpening ? 'bg-blue-50/60 border-blue-200' :
            'bg-rose-50/60 border-rose-200'
          } flex items-center justify-between`}>
            <div>
              <span className="block text-[10px] font-bold uppercase tracking-widest text-[#04152d]/50">
                {isInflow ? 'Credited Fund Inflow' : isOpening ? 'Opening Balance Baseline' : 'Debited Fund Outflow'}
              </span>
              <span className={`text-[26px] font-bold tracking-tight ${
                isInflow ? 'text-emerald-700' : isOpening ? 'text-blue-700' : 'text-rose-700'
              }`}>
                {isInflow ? '+' : isOpening ? '' : '-'}{formatCurrency(transaction.amount)}
              </span>
            </div>
            <div className="text-right">
              <span className="block text-[10px] font-bold uppercase tracking-widest text-[#04152d]/50">Posting Status</span>
              <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider border shadow-sm ${
                transaction.status === 'Posted' 
                  ? 'bg-emerald-100 text-emerald-800 border-emerald-300' 
                  : 'bg-amber-100 text-amber-800 border-amber-300'
              }`}>
                <CheckCircle2 size={12} /> {transaction.status}
              </span>
            </div>
          </div>

          {/* Source Reference Details */}
          <div className="bg-white/60 rounded-2xl border border-white p-4 space-y-3.5 shadow-sm">
            <h4 className="text-[12px] font-bold text-[#04152d] uppercase tracking-wider flex items-center gap-2 border-b border-white/80 pb-2">
              <FileText size={14} className="text-blue-600" /> Originating Document Specification
            </h4>

            <div className="grid grid-cols-2 gap-4 text-[12px]">
              <div>
                <span className="block text-[10px] font-semibold text-[#04152d]/50 uppercase tracking-wider mb-0.5">
                  Originating Reference ID
                </span>
                <span className="font-mono font-bold text-blue-700 bg-white/80 border border-blue-200 px-2.5 py-1 rounded-lg inline-block">
                  {transaction.sourceRef}
                </span>
              </div>

              <div>
                <span className="block text-[10px] font-semibold text-[#04152d]/50 uppercase tracking-wider mb-0.5">
                  Financial Module
                </span>
                <span className="font-semibold text-[#04152d]">
                  {transaction.sourceModule === 'Collection' ? 'Collection Receipting & Remittance' :
                   transaction.sourceModule === 'Disbursement' ? 'Disbursement Voucher Processing' :
                   'General Assembly Financial Baseline'}
                </span>
              </div>

              <div>
                <span className="block text-[10px] font-semibold text-[#04152d]/50 uppercase tracking-wider mb-0.5 flex items-center gap-1">
                  <User size={12} /> {isInflow ? 'Payor / Remitter' : 'Payee / Beneficiary'}
                </span>
                <span className="font-semibold text-[#04152d]">
                  {transaction.payeeOrPayer || 'N/A'}
                </span>
              </div>

              <div>
                <span className="block text-[10px] font-semibold text-[#04152d]/50 uppercase tracking-wider mb-0.5 flex items-center gap-1">
                  <CreditCard size={12} /> Payment Instrument
                </span>
                <span className="font-semibold text-[#04152d]">
                  {transaction.paymentMethod || 'System Allocation'}
                </span>
              </div>

              <div>
                <span className="block text-[10px] font-semibold text-[#04152d]/50 uppercase tracking-wider mb-0.5 flex items-center gap-1">
                  <Calendar size={12} /> Transaction Date & Time
                </span>
                <span className="font-semibold text-[#04152d]">
                  {transaction.timestamp || `${transaction.date} 00:00:00`}
                </span>
              </div>

              <div>
                <span className="block text-[10px] font-semibold text-[#04152d]/50 uppercase tracking-wider mb-0.5 flex items-center gap-1">
                  <Building2 size={12} /> Target Ledger Fund
                </span>
                <span className="font-semibold text-[#04152d]">
                  {transaction.fundName} ({transaction.fundCode})
                </span>
              </div>
            </div>

            <div className="pt-2 border-t border-white/80">
              <span className="block text-[10px] font-semibold text-[#04152d]/50 uppercase tracking-wider mb-1">
                Particulars & Business Purpose
              </span>
              <p className="text-[12px] font-medium text-[#04152d]/80 bg-white/70 p-2.5 rounded-xl border border-white">
                {transaction.particulars || 'No additional remarks recorded.'}
              </p>
            </div>
          </div>

          {/* Audit Verification Stamp */}
          <div className="bg-blue-50/40 rounded-2xl border border-blue-100/80 p-3.5 flex items-start gap-3">
            <ShieldCheck size={18} className="text-blue-600 shrink-0 mt-0.5" />
            <div className="text-[11px] text-[#04152d]/70 leading-relaxed">
              <span className="font-bold text-[#04152d]">Ledger Reconciled Entry:</span> This fund movement is linked directly to source voucher <span className="font-mono font-bold text-blue-700">{transaction.sourceRef}</span>. Reconciled and logged in the master general ledger.
            </div>
          </div>
        </div>

        {/* Footer - Fixed shrink-0 */}
        <div className="shrink-0 border-t border-white/70 pt-4 mt-4 flex items-center justify-between">
          <span className="text-[11px] text-[#04152d]/50 flex items-center gap-1 font-medium">
            <Clock size={12} /> Trace verified at {new Date().toLocaleTimeString()}
          </span>
          <button 
            type="button" 
            onClick={onClose} 
            className="px-5 py-2.5 rounded-full text-[13px] font-semibold bg-[#04152d] text-white hover:bg-[#0a1e3f] transition-all shadow-md active:scale-95"
          >
            Close Provenance Viewer
          </button>
        </div>
      </div>
    </div>
  );
}
