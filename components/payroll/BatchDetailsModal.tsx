"use client";

import React, { useState } from 'react';
import { 
  X, FileText, CheckCircle2, AlertTriangle, AlertCircle, 
  Calendar, Layers, ShieldCheck, Download
} from 'lucide-react';
import { PayrollBatch } from '@/lib/payrollData';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  batch: PayrollBatch | null;
  isAuditorView?: boolean;
}

export default function BatchDetailsModal({
  isOpen,
  onClose,
  batch,
  isAuditorView = false
}: Props) {
  const [filter, setFilter] = useState<'ALL' | 'VALID' | 'EXCEPTIONS'>('ALL');

  if (!isOpen || !batch) return null;

  const formatCurrency = (val: number) => `₱${Number(val || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}`;

  const filteredRecords = batch.records.filter(r => {
    if (filter === 'VALID') return r.status === 'VALID';
    if (filter === 'EXCEPTIONS') return r.status !== 'VALID';
    return true;
  });

  const ultraGlassCard = "bg-white/95 backdrop-blur-[40px] backdrop-saturate-[200%] border border-white/90 shadow-[0_24px_60px_rgba(4,21,45,0.18),inset_0_2px_4px_rgba(255,255,255,1)] rounded-[26px] p-6 lg:p-8 relative overflow-hidden";

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-3 sm:p-6 transition-opacity duration-300">
      <div 
        className="absolute inset-0 bg-[#04152d]/50 backdrop-blur-md" 
        onClick={onClose} 
      />

      <div className={`relative w-full max-w-4xl max-h-[92vh] flex flex-col animate-modal-enter ${ultraGlassCard}`}>
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/70 pb-4 mb-4 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-50 border border-blue-200 text-blue-700 flex items-center justify-center shadow-xs">
              <FileText size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-[17px] font-bold text-[#04152d] tracking-tight">
                  Payroll Remittance Batch Details
                </h3>
                <span className="font-mono text-[11px] font-bold text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-200">
                  {batch.batchRef}
                </span>
                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border shadow-xs ${
                  batch.status === 'Ready for Collection Processing' 
                    ? 'bg-emerald-100 text-emerald-800 border-emerald-300' 
                    : 'bg-blue-100 text-blue-800 border-blue-300'
                }`}>
                  {batch.status}
                </span>
              </div>
              <p className="text-[11px] text-[#04152d]/60 font-medium mt-0.5">
                Period: {batch.payrollPeriod} • Processed by {batch.uploader} at {batch.timestamp}
              </p>
            </div>
          </div>

          <button 
            onClick={onClose} 
            className="p-2 bg-white/70 hover:bg-white rounded-full border border-white shadow-xs transition-colors text-[#04152d]/60 hover:text-[#04152d]"
          >
            <X size={16} />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto pr-1 space-y-4 hide-scrollbar min-h-0 text-[12px]">
          {/* Summary Row */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-white/80 p-3 rounded-xl border border-white shadow-xs">
              <span className="block text-[10px] font-bold text-[#04152d]/50 uppercase tracking-widest mb-0.5">Total Records</span>
              <span className="text-[18px] font-extrabold text-[#04152d]">{batch.recordCount}</span>
            </div>

            <div className="bg-emerald-50/80 p-3 rounded-xl border border-emerald-200 shadow-xs">
              <span className="block text-[10px] font-bold text-emerald-800 uppercase tracking-widest mb-0.5">Valid Entries</span>
              <span className="text-[18px] font-extrabold text-emerald-700">{batch.validCount}</span>
            </div>

            <div className="bg-rose-50/80 p-3 rounded-xl border border-rose-200 shadow-xs">
              <span className="block text-[10px] font-bold text-rose-800 uppercase tracking-widest mb-0.5">Exceptions</span>
              <span className="text-[18px] font-extrabold text-rose-700">{batch.exceptionCount}</span>
            </div>

            <div className="bg-blue-50/80 p-3 rounded-xl border border-blue-200 shadow-xs">
              <span className="block text-[10px] font-bold text-blue-800 uppercase tracking-widest mb-0.5">Remitted Total</span>
              <span className="text-[18px] font-extrabold text-blue-700">{formatCurrency(batch.remittedTotal)}</span>
            </div>
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-1.5 bg-white/80 p-1 rounded-full border border-white shadow-xs w-fit">
            <button
              onClick={() => setFilter('ALL')}
              className={`px-3 py-1 rounded-full text-[11px] font-bold transition-all ${
                filter === 'ALL' ? 'bg-[#04152d] text-white shadow-xs' : 'text-[#04152d]/60 hover:text-[#04152d]'
              }`}
            >
              All Records ({batch.records.length})
            </button>
            <button
              onClick={() => setFilter('VALID')}
              className={`px-3 py-1 rounded-full text-[11px] font-bold transition-all ${
                filter === 'VALID' ? 'bg-emerald-600 text-white shadow-xs' : 'text-emerald-700 hover:text-emerald-900'
              }`}
            >
              Valid Only ({batch.validCount})
            </button>
            <button
              onClick={() => setFilter('EXCEPTIONS')}
              className={`px-3 py-1 rounded-full text-[11px] font-bold transition-all ${
                filter === 'EXCEPTIONS' ? 'bg-rose-600 text-white shadow-xs' : 'text-rose-700 hover:text-rose-900'
              }`}
            >
              Exceptions ({batch.exceptionCount})
            </button>
          </div>

          {/* Table */}
          <div className="bg-white/60 rounded-2xl border border-white overflow-hidden shadow-xs">
            <div className="overflow-x-auto w-full max-h-[360px]">
              <table className="w-full text-left whitespace-nowrap border-collapse min-w-[700px]">
                <thead className="bg-white/80 text-[10px] font-bold text-[#04152d]/50 uppercase tracking-[0.14em] sticky top-0 z-10 border-b border-white">
                  <tr>
                    <th className="py-2.5 px-4">Member</th>
                    <th className="py-2.5 px-4">Classification</th>
                    <th className="py-2.5 px-4">Remittance Ref</th>
                    <th className="py-2.5 px-4 text-right">Expected</th>
                    <th className="py-2.5 px-4 text-right">Actual Remitted</th>
                    <th className="py-2.5 px-4 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/70 text-[12px] text-[#04152d]">
                  {filteredRecords.map((r) => (
                    <tr key={r.id} className="hover:bg-white/80 transition-colors">
                      <td className="py-3 px-4">
                        <p className="font-bold text-[#04152d]">{r.memberName}</p>
                        <p className="font-mono text-[10px] text-[#04152d]/50">{r.memberId}</p>
                      </td>

                      <td className="py-3 px-4 font-semibold text-[#04152d]/80">
                        {r.deductionType}
                      </td>

                      <td className="py-3 px-4 font-mono font-bold text-blue-700">
                        {r.reference}
                      </td>

                      <td className="py-3 px-4 text-right font-semibold text-[#04152d]/70">
                        {formatCurrency(r.expectedAmount)}
                      </td>

                      <td className="py-3 px-4 text-right font-extrabold text-[13px] text-[#04152d]">
                        {formatCurrency(r.actualRemittedAmount)}
                      </td>

                      <td className="py-3 px-4 text-center">
                        {r.status === 'VALID' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-800 border border-emerald-300">
                            <CheckCircle2 size={11} /> Matched
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-rose-100 text-rose-800 border border-rose-300">
                            <AlertTriangle size={11} /> {r.status.replace('_', ' ')}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="shrink-0 border-t border-white/70 pt-4 mt-3 flex items-center justify-between">
          <span className="text-[11px] text-[#04152d]/50 font-medium">
            Batch ID: <code className="font-bold text-[#04152d]">{batch.id}</code>
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-2 rounded-full text-[12px] font-bold bg-[#04152d] text-white hover:bg-[#0a1e3f] shadow-md transition-all active:scale-95"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
