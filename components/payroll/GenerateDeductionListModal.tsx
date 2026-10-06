"use client";

import React, { useState, useMemo } from 'react';
import { 
  X, Download, FileText, CheckCircle2, AlertTriangle, 
  Calendar, Layers, ArrowRight, ShieldCheck, Printer
} from 'lucide-react';
import { DeductionSchedule, CONFIGURED_PERIODS } from '@/lib/payrollData';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  schedules: DeductionSchedule[];
}

export default function GenerateDeductionListModal({
  isOpen,
  onClose,
  schedules
}: Props) {
  const [selectedPeriod, setSelectedPeriod] = useState<string>(CONFIGURED_PERIODS[0]);
  const [isGenerated, setIsGenerated] = useState(false);

  // User Story 7: Filter only valid, non-duplicate deduction records for the selected payroll period
  const periodSchedules = useMemo(() => {
    const list = schedules.filter(s => s.payrollPeriod === selectedPeriod);
    
    // Deduplicate in case any duplicate existed
    const seen = new Set<string>();
    const uniqueList: DeductionSchedule[] = [];
    
    for (const item of list) {
      const key = `${item.memberId}-${item.deductionType}`;
      if (!seen.has(key)) {
        seen.add(key);
        uniqueList.push(item);
      }
    }
    return uniqueList;
  }, [schedules, selectedPeriod]);

  const totalExpectedAmount = useMemo(() => {
    return periodSchedules.reduce((sum, s) => sum + Number(s.expectedAmount || 0), 0);
  }, [periodSchedules]);

  const flaggedCount = useMemo(() => {
    return periodSchedules.filter(s => s.status === 'Flagged for Review').length;
  }, [periodSchedules]);

  const formatCurrency = (val: number) => `₱${Number(val || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}`;

  const handleExportCSV = () => {
    const headers = "Schedule ID,Payroll Period,Member ID,Member Name,Deduction Type,Expected Amount,Obligation Reference,Status\n";
    const rows = periodSchedules.map(s => 
      `"${s.id}","${s.payrollPeriod}","${s.memberId}","${s.memberName}","${s.deductionType}",${s.expectedAmount},"${s.obligationRef}","${s.status}"`
    ).join("\n");

    const blob = new Blob([headers + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Deduction_List_${selectedPeriod.replace(/[^a-zA-Z0-9]/g, '_')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (!isOpen) return null;

  const ultraGlassCard = "bg-white/95 backdrop-blur-[40px] backdrop-saturate-[200%] border border-white/90 shadow-[0_24px_60px_rgba(4,21,45,0.18),inset_0_2px_4px_rgba(255,255,255,1)] rounded-[26px] p-6 lg:p-8 relative overflow-hidden";

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-3 sm:p-6 transition-opacity duration-300">
      <div 
        className="absolute inset-0 bg-[#04152d]/50 backdrop-blur-md" 
        onClick={onClose} 
      />

      <div className={`relative w-full max-w-3xl max-h-[92vh] flex flex-col animate-modal-enter ${ultraGlassCard}`}>
        {/* Fixed Header */}
        <div className="flex items-center justify-between border-b border-white/70 pb-4 mb-4 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-50 border border-blue-200 text-blue-700 flex items-center justify-center shadow-xs">
              <FileText size={20} />
            </div>
            <div>
              <h3 className="text-[17px] font-bold text-[#04152d] tracking-tight">
                Generate Payroll Deduction Roster
              </h3>
              <p className="text-[11px] text-[#04152d]/60 font-medium">
                Compile and validate non-duplicate expected deductions for employer payroll processing
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

        {/* Scrollable Body - only content moves */}
        <div className="flex-1 overflow-y-auto pr-1 space-y-4 hide-scrollbar min-h-0">
          {/* Period Selector */}
          <div className="bg-white/70 p-4 rounded-2xl border border-white shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <span className="block text-[10px] font-bold uppercase tracking-wider text-[#04152d]/50 mb-1">
                Target Payroll Period
              </span>
              <div className="relative">
                <select
                  value={selectedPeriod}
                  onChange={(e) => {
                    setSelectedPeriod(e.target.value);
                    setIsGenerated(false);
                  }}
                  className="pl-3 pr-8 py-1.5 bg-white border border-white/90 shadow-xs rounded-xl text-[13px] font-bold text-[#04152d] outline-none cursor-pointer"
                >
                  {CONFIGURED_PERIODS.map(p => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsGenerated(true)}
                className="px-4 py-2 rounded-full text-[12px] font-bold bg-[#04152d] text-white hover:bg-[#0a1e3f] shadow-md transition-all active:scale-95 flex items-center gap-1.5"
              >
                <CheckCircle2 size={13} /> Compile Deduction List
              </button>
            </div>
          </div>

          {/* Aggregated Overview */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="bg-white/80 p-3.5 rounded-xl border border-white shadow-xs">
              <span className="block text-[10px] font-bold text-[#04152d]/50 uppercase tracking-widest mb-0.5">
                Total Valid Records
              </span>
              <span className="text-[20px] font-extrabold text-[#04152d] tracking-tight">
                {periodSchedules.length} Scheduled
              </span>
            </div>

            <div className="bg-emerald-50/80 p-3.5 rounded-xl border border-emerald-200/80 shadow-xs">
              <span className="block text-[10px] font-bold text-emerald-800 uppercase tracking-widest mb-0.5">
                Expected Liquidity Total
              </span>
              <span className="text-[20px] font-extrabold text-emerald-700 tracking-tight">
                {formatCurrency(totalExpectedAmount)}
              </span>
            </div>

            <div className="bg-blue-50/80 p-3.5 rounded-xl border border-blue-200/80 shadow-xs">
              <span className="block text-[10px] font-bold text-blue-800 uppercase tracking-widest mb-0.5">
                Deduction Status
              </span>
              <span className="text-[13px] font-bold text-blue-900 block mt-1">
                {flaggedCount === 0 ? '100% Validated & Non-Duplicate' : `${flaggedCount} Flagged for Review`}
              </span>
            </div>
          </div>

          {/* Deduction List Preview Table */}
          <div className="bg-white/60 rounded-2xl border border-white overflow-hidden shadow-xs">
            <div className="p-3 border-b border-white bg-white/40 flex items-center justify-between">
              <span className="text-[11px] font-bold text-[#04152d] uppercase tracking-wider flex items-center gap-1.5">
                <FileText size={13} className="text-blue-600" /> Compiled Records ({periodSchedules.length})
              </span>
              <span className="text-[10px] font-semibold text-[#04152d]/50">
                Non-duplicate records for {selectedPeriod}
              </span>
            </div>

            <div className="overflow-x-auto w-full max-h-[320px]">
              <table className="w-full text-left whitespace-nowrap border-collapse min-w-[650px]">
                <thead className="bg-white/80 text-[10px] font-bold text-[#04152d]/50 uppercase tracking-[0.14em] sticky top-0 z-10 border-b border-white">
                  <tr>
                    <th className="py-2.5 px-4">Member</th>
                    <th className="py-2.5 px-4">Classification</th>
                    <th className="py-2.5 px-4">Obligation Ref</th>
                    <th className="py-2.5 px-4 text-right">Expected Amount</th>
                    <th className="py-2.5 px-4 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/70 text-[12px] text-[#04152d]">
                  {periodSchedules.length > 0 ? (
                    periodSchedules.map((s) => (
                      <tr key={s.id} className="hover:bg-white/70 transition-colors">
                        <td className="py-3 px-4">
                          <p className="font-bold text-[#04152d]">{s.memberName}</p>
                          <p className="font-mono text-[10px] text-[#04152d]/50">{s.memberId}</p>
                        </td>

                        <td className="py-3 px-4 font-semibold text-[#04152d]/80">
                          {s.deductionType}
                        </td>

                        <td className="py-3 px-4">
                          <span className="font-mono text-[11px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                            {s.obligationRef}
                          </span>
                        </td>

                        <td className="py-3 px-4 text-right font-extrabold text-[13px] text-blue-900">
                          {formatCurrency(s.expectedAmount)}
                        </td>

                        <td className="py-3 px-4 text-center">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${
                            s.status === 'Scheduled' 
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                              : 'bg-amber-50 text-amber-700 border-amber-200'
                          }`}>
                            {s.status}
                          </span>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} className="py-12 text-center text-[#04152d]/50 italic">
                        No deduction schedules found for {selectedPeriod}.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Fixed Footer */}
        <div className="shrink-0 border-t border-white/70 pt-4 mt-3 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 rounded-full text-[13px] font-semibold text-[#04152d]/70 hover:bg-white transition-colors"
          >
            Close
          </button>

          <button
            type="button"
            onClick={handleExportCSV}
            disabled={periodSchedules.length === 0}
            className="px-6 py-2.5 rounded-full text-[13px] font-bold bg-[#04152d] text-white hover:bg-[#0a1e3f] disabled:opacity-50 transition-all shadow-md flex items-center gap-2 active:scale-95"
          >
            <Download size={14} /> Download Finalized Deduction List (.CSV)
          </button>
        </div>
      </div>
    </div>
  );
}
