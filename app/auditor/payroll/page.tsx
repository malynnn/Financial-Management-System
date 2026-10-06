"use client";

/**
 * Auditor — Payroll Audit & Reconciliation Page
 * Implements Sprint 4 User Story 15:
 * "As an Auditor, I want read-only access to payroll records so that payroll-related activities can be reviewed without modification.
 *  Rule: Auditor can view payroll schedules, remittance batches, validation results, exceptions, and audit history but cannot create, edit, upload, or post payroll transactions."
 */

import React, { useState, useMemo, useEffect } from 'react';
import { 
  Search, ChevronDown, ChevronLeft, ChevronRight, 
  Calendar, FileText, CheckCircle2, AlertTriangle, 
  Eye, SearchX, Layers, Filter
} from 'lucide-react';
import Header from '@/components/Header';
import BatchDetailsModal from '@/components/payroll/BatchDetailsModal';
import { 
  DeductionSchedule, PayrollBatch, CONFIGURED_PERIODS,
  getStoredSchedules, getStoredBatches
} from '@/lib/payrollData';

const ITEMS_PER_PAGE = 10;

export default function AuditorPayrollAuditPage() {
  const [activeTab, setActiveTab] = useState<'schedules' | 'batches'>('schedules');

  const [schedules, setSchedules] = useState<DeductionSchedule[]>([]);
  const [batches, setBatches] = useState<PayrollBatch[]>([]);

  // Schedule filters
  const [schedulePeriod, setSchedulePeriod] = useState<string>('All');
  const [scheduleSearch, setScheduleSearch] = useState('');
  const [schedulePage, setSchedulePage] = useState(1);

  // Batch filters
  const [batchSearch, setBatchSearch] = useState('');
  const [batchPage, setBatchPage] = useState(1);

  const [selectedBatch, setSelectedBatch] = useState<PayrollBatch | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);

  useEffect(() => {
    setSchedules(getStoredSchedules());
    setBatches(getStoredBatches());
  }, []);

  // Filtered schedules
  const filteredSchedules = useMemo(() => {
    return schedules.filter(s => {
      if (schedulePeriod !== 'All' && s.payrollPeriod !== schedulePeriod) return false;
      if (scheduleSearch) {
        const q = scheduleSearch.toLowerCase();
        const matchesMember = s.memberName.toLowerCase().includes(q) || s.memberId.toLowerCase().includes(q);
        const matchesType = s.deductionType.toLowerCase().includes(q);
        const matchesRef = s.obligationRef.toLowerCase().includes(q);
        if (!matchesMember && !matchesType && !matchesRef) return false;
      }
      return true;
    });
  }, [schedules, schedulePeriod, scheduleSearch]);

  const totalSchedulePages = Math.ceil(filteredSchedules.length / ITEMS_PER_PAGE) || 1;
  const paginatedSchedules = filteredSchedules.slice(
    (schedulePage - 1) * ITEMS_PER_PAGE,
    schedulePage * ITEMS_PER_PAGE
  );

  // Filtered batches
  const filteredBatches = useMemo(() => {
    return batches.filter(b => {
      if (batchSearch) {
        const q = batchSearch.toLowerCase();
        return b.batchRef.toLowerCase().includes(q) || b.payrollPeriod.toLowerCase().includes(q);
      }
      return true;
    });
  }, [batches, batchSearch]);

  const totalBatchPages = Math.ceil(filteredBatches.length / ITEMS_PER_PAGE) || 1;
  const paginatedBatches = filteredBatches.slice(
    (batchPage - 1) * ITEMS_PER_PAGE,
    batchPage * ITEMS_PER_PAGE
  );

  const formatCurrency = (val: number) => `₱${Number(val || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}`;

  const totalScheduledSum = useMemo(() => {
    return schedules.reduce((s, item) => s + Number(item.expectedAmount || 0), 0);
  }, [schedules]);

  const totalRemittedSum = useMemo(() => {
    return batches.reduce((s, b) => s + Number(b.remittedTotal || 0), 0);
  }, [batches]);

  const totalExceptionsSum = useMemo(() => {
    return batches.reduce((s, b) => s + Number(b.exceptionCount || 0), 0);
  }, [batches]);

  const ultraGlassCard = "bg-white/50 backdrop-blur-[40px] backdrop-saturate-[200%] border border-white/80 shadow-[0_8px_30px_rgba(4,21,45,0.06),inset_0_2px_3px_rgba(255,255,255,0.9)] rounded-[24px] p-6 relative overflow-hidden";
  const glassInput = "pl-10 pr-4 py-2.5 bg-white/60 hover:bg-white/80 focus:bg-white/90 backdrop-blur-xl border border-white/90 shadow-[inset_0_2px_4px_rgba(4,21,45,0.03)] rounded-[12px] text-[13px] font-semibold text-[#04152d] outline-none transition-all placeholder:text-[#04152d]/40 focus:shadow-[0_4px_16px_rgba(4,21,45,0.08)]";
  const pageBtn = "w-8 h-8 flex items-center justify-center rounded-full text-[12px] font-medium transition-all duration-300";

  return (
    <div className="relative flex flex-col min-h-screen bg-[#f4f5f7]">
      <style jsx global>{`
        @keyframes modal-fade-in { from { opacity: 0; transform: scale(0.96) translateY(8px); } to { opacity: 1; transform: scale(1) translateY(0); } }
        .animate-modal-enter { animation: modal-fade-in 0.25s cubic-bezier(0.25, 1, 0.5, 1) forwards; }
        .animate-fade-in { animation: modal-fade-in 0.35s ease-out forwards; }
        .hide-scrollbar::-webkit-scrollbar { display: none; }
      `}</style>

      {/* Top Header */}
      <div className="sticky top-0 z-40 w-full backdrop-blur-2xl bg-white/30 border-b border-white/50 shadow-[0_4px_30px_rgba(0,0,0,0.03)]">
        <Header />
      </div>

      <div className="p-4 md:p-6 max-w-[1400px] w-full mx-auto animate-fade-in flex-1 relative z-10 space-y-6 mt-2">
        
        {/* Metric Overview Row */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className={`${ultraGlassCard} !p-4 flex items-center gap-3.5`}>
            <div className="w-11 h-11 rounded-2xl bg-blue-50 border border-blue-200 text-blue-600 flex items-center justify-center shrink-0 shadow-xs">
              <Calendar size={22} />
            </div>
            <div>
              <span className="block text-[10px] font-bold text-[#04152d]/50 uppercase tracking-widest">
                Expected Scheduled Deductions
              </span>
              <span className="text-[22px] font-extrabold text-blue-700 tracking-tight">
                {formatCurrency(totalScheduledSum)}
              </span>
              <span className="text-[10px] text-[#04152d]/50 font-semibold block mt-0.5">
                {schedules.length} Active Roster Entries
              </span>
            </div>
          </div>

          <div className={`${ultraGlassCard} !p-4 flex items-center gap-3.5`}>
            <div className="w-11 h-11 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center shrink-0 shadow-xs">
              <CheckCircle2 size={22} />
            </div>
            <div>
              <span className="block text-[10px] font-bold text-[#04152d]/50 uppercase tracking-widest">
                Total Remitted Across Batches
              </span>
              <span className="text-[22px] font-extrabold text-emerald-700 tracking-tight">
                {formatCurrency(totalRemittedSum)}
              </span>
              <span className="text-[10px] text-emerald-700/80 font-semibold block mt-0.5">
                Across {batches.length} Historical Batches
              </span>
            </div>
          </div>

          <div className={`${ultraGlassCard} !p-4 flex items-center gap-3.5`}>
            <div className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 shadow-xs border ${
              totalExceptionsSum > 0 ? 'bg-rose-50 border-rose-200 text-rose-600' : 'bg-gray-50 border-gray-200 text-gray-500'
            }`}>
              <AlertTriangle size={22} />
            </div>
            <div>
              <span className="block text-[10px] font-bold text-[#04152d]/50 uppercase tracking-widest">
                Historical Exceptions
              </span>
              <span className={`text-[22px] font-extrabold tracking-tight ${totalExceptionsSum > 0 ? 'text-rose-700' : 'text-gray-700'}`}>
                {totalExceptionsSum} Flagged
              </span>
              <span className="text-[10px] text-[#04152d]/50 font-semibold block mt-0.5">
                Variances, unmatched & duplicates
              </span>
            </div>
          </div>
        </div>

        {/* Tab Controls */}
        <div className="flex items-center gap-2 border-b border-white/80 pb-1">
          <button
            onClick={() => setActiveTab('schedules')}
            className={`px-5 py-2.5 rounded-2xl text-[13px] font-bold transition-all flex items-center gap-2 ${
              activeTab === 'schedules'
                ? 'bg-[#04152d] text-white shadow-md'
                : 'bg-white/60 hover:bg-white text-[#04152d]/60 hover:text-[#04152d]'
            }`}
          >
            <Calendar size={15} /> Deduction Schedules ({schedules.length})
          </button>

          <button
            onClick={() => setActiveTab('batches')}
            className={`px-5 py-2.5 rounded-2xl text-[13px] font-bold transition-all flex items-center gap-2 ${
              activeTab === 'batches'
                ? 'bg-[#04152d] text-white shadow-md'
                : 'bg-white/60 hover:bg-white text-[#04152d]/60 hover:text-[#04152d]'
            }`}
          >
            <FileText size={15} /> Remittance Batches & Audit Trail ({batches.length})
          </button>
        </div>

        {/* TAB 1: SCHEDULES (READ-ONLY) */}
        {activeTab === 'schedules' && (
          <div className="space-y-4 animate-fade-in">
            {/* Filter Bar */}
            <div className={`${ultraGlassCard} !p-4 flex flex-col sm:flex-row gap-4 items-center justify-between`}>
              <div className="relative w-full sm:w-80">
                <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#04152d]/50" />
                <input
                  type="text"
                  placeholder="Search Member, Obligation Ref..."
                  value={scheduleSearch}
                  onChange={(e) => setScheduleSearch(e.target.value)}
                  className={`${glassInput} w-full`}
                />
              </div>

              <div className="relative w-full sm:w-auto">
                <select
                  value={schedulePeriod}
                  onChange={(e) => setSchedulePeriod(e.target.value)}
                  className={`${glassInput} !pl-3.5 appearance-none pr-9 cursor-pointer font-semibold`}
                >
                  <option value="All">All Payroll Periods</option>
                  {CONFIGURED_PERIODS.map(p => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
                <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#04152d]/50 pointer-events-none" />
              </div>
            </div>

            {/* Table */}
            <div className={`${ultraGlassCard} !p-0`}>
              <div className="overflow-x-auto w-full">
                <table className="w-full text-left whitespace-nowrap border-collapse min-w-[850px]">
                  <thead className="bg-white/60 text-[10px] font-bold text-[#04152d]/50 uppercase tracking-[0.16em] border-b border-white/50">
                    <tr>
                      <th className="py-3.5 px-6">Payroll Period</th>
                      <th className="py-3.5 px-6">Member ID & Name</th>
                      <th className="py-3.5 px-6">Classification</th>
                      <th className="py-3.5 px-6">Obligation Ref</th>
                      <th className="py-3.5 px-6 text-right">Expected Amount</th>
                      <th className="py-3.5 px-6 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/60 text-[13px] text-[#04152d] bg-white/30">
                    {paginatedSchedules.length > 0 ? (
                      paginatedSchedules.map((s) => (
                        <tr key={s.id} className="hover:bg-white/70 transition-colors">
                          <td className="py-3.5 px-6 font-semibold text-[#04152d]/80">
                            {s.payrollPeriod}
                          </td>

                          <td className="py-3.5 px-6">
                            <p className="font-bold text-[#04152d]">{s.memberName}</p>
                            <span className="font-mono text-[10px] text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200">
                              {s.memberId}
                            </span>
                          </td>

                          <td className="py-3.5 px-6 font-medium text-[#04152d]/80">
                            {s.deductionType}
                          </td>

                          <td className="py-3.5 px-6">
                            {s.obligationRef !== 'UNASSIGNED-REVIEW' ? (
                              <span className="font-mono font-bold text-blue-700 text-[11px] bg-blue-50/80 px-2 py-0.5 rounded border border-blue-200">
                                {s.obligationRef}
                              </span>
                            ) : (
                              <span className="text-amber-700 text-[10px] font-bold bg-amber-50 px-2 py-0.5 rounded border border-amber-200 flex items-center gap-1 w-fit">
                                <AlertTriangle size={11} /> Flagged
                              </span>
                            )}
                          </td>

                          <td className="py-3.5 px-6 text-right font-extrabold text-[14px] text-blue-900 tracking-tight">
                            {formatCurrency(s.expectedAmount)}
                          </td>

                          <td className="py-3.5 px-6 text-center">
                            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border shadow-xs ${
                              s.status === 'Scheduled'
                                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                : 'bg-amber-50 text-amber-800 border-amber-200'
                            }`}>
                              {s.status}
                            </span>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={6} className="py-16 text-center">
                          <div className="flex flex-col items-center justify-center space-y-2">
                            <SearchX size={26} className="text-[#04152d]/30" />
                            <p className="text-[13px] font-semibold text-[#04152d]">No scheduled deductions found</p>
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {totalSchedulePages > 1 && (
                <div className="p-4 border-t border-white/60 bg-white/40 flex items-center justify-between">
                  <p className="text-[12px] text-[#04152d]/60 font-medium">
                    Showing {((schedulePage - 1) * ITEMS_PER_PAGE) + 1} to {Math.min(schedulePage * ITEMS_PER_PAGE, filteredSchedules.length)} of {filteredSchedules.length}
                  </p>
                  
                  <div className="flex items-center gap-1">
                    <button 
                      onClick={() => setSchedulePage(prev => Math.max(1, prev - 1))} 
                      disabled={schedulePage === 1} 
                      className={`${pageBtn} bg-white/60 border border-white hover:bg-white shadow-xs disabled:opacity-50`}
                    >
                      <ChevronLeft size={16} />
                    </button>
                    <span className="text-[12px] font-bold px-2 text-[#04152d]">
                      {schedulePage} / {totalSchedulePages}
                    </span>
                    <button 
                      onClick={() => setSchedulePage(prev => Math.min(totalSchedulePages, prev + 1))} 
                      disabled={schedulePage === totalSchedulePages} 
                      className={`${pageBtn} bg-white/60 border border-white hover:bg-white shadow-xs disabled:opacity-50`}
                    >
                      <ChevronRight size={16} />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 2: REMITTANCE BATCHES (READ-ONLY AUDIT) */}
        {activeTab === 'batches' && (
          <div className="space-y-4 animate-fade-in">
            {/* Filter Bar */}
            <div className={`${ultraGlassCard} !p-4 flex flex-col sm:flex-row gap-4 items-center justify-between`}>
              <div className="relative w-full sm:w-80">
                <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#04152d]/50" />
                <input
                  type="text"
                  placeholder="Search Batch Ref, Period..."
                  value={batchSearch}
                  onChange={(e) => setBatchSearch(e.target.value)}
                  className={`${glassInput} w-full`}
                />
              </div>

              <span className="text-[12px] text-[#04152d]/60 font-medium">
                Auditing {batches.length} Remittance Batches
              </span>
            </div>

            {/* Table */}
            <div className={`${ultraGlassCard} !p-0`}>
              <div className="overflow-x-auto w-full">
                <table className="w-full text-left whitespace-nowrap border-collapse min-w-[900px]">
                  <thead className="bg-white/60 text-[10px] font-bold text-[#04152d]/50 uppercase tracking-[0.16em] border-b border-white/50">
                    <tr>
                      <th className="py-3.5 px-6">Batch Reference</th>
                      <th className="py-3.5 px-6">Payroll Period</th>
                      <th className="py-3.5 px-6 text-center">Record Count</th>
                      <th className="py-3.5 px-6 text-right">Expected Amount</th>
                      <th className="py-3.5 px-6 text-right">Actual Remitted</th>
                      <th className="py-3.5 px-6 text-center">Status</th>
                      <th className="py-3.5 px-6">Uploader</th>
                      <th className="py-3.5 px-6">Timestamp</th>
                      <th className="py-3.5 px-6 text-right">Audit</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/60 text-[13px] text-[#04152d] bg-white/30">
                    {paginatedBatches.length > 0 ? (
                      paginatedBatches.map((b) => (
                        <tr key={b.id} className="hover:bg-white/70 transition-colors">
                          <td className="py-3.5 px-6 font-mono font-bold text-[12px] text-blue-700">
                            {b.batchRef}
                          </td>

                          <td className="py-3.5 px-6 font-semibold text-[#04152d]">
                            {b.payrollPeriod}
                          </td>

                          <td className="py-3.5 px-6 text-center font-bold">
                            <span className="bg-white/80 px-2 py-0.5 rounded border border-white text-[12px]">
                              {b.recordCount} records
                            </span>
                          </td>

                          <td className="py-3.5 px-6 text-right font-semibold text-[#04152d]/70">
                            {formatCurrency(b.expectedTotal)}
                          </td>

                          <td className="py-3.5 px-6 text-right font-extrabold text-[14px] text-blue-900 tracking-tight">
                            {formatCurrency(b.remittedTotal)}
                          </td>

                          <td className="py-3.5 px-6 text-center">
                            <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border shadow-xs ${
                              b.status === 'Ready for Collection Processing'
                                ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                                : b.status === 'Exceptions Flagged'
                                ? 'bg-rose-100 text-rose-800 border-rose-300'
                                : 'bg-blue-100 text-blue-800 border-blue-300'
                            }`}>
                              {b.status}
                            </span>
                          </td>

                          <td className="py-3.5 px-6 text-[12px] text-[#04152d]/70">
                            {b.uploader}
                          </td>

                          <td className="py-3.5 px-6 font-medium text-[11px] text-[#04152d]/60">
                            {b.timestamp}
                          </td>

                          <td className="py-3.5 px-6 text-right">
                            <button
                              onClick={() => {
                                setSelectedBatch(b);
                                setIsDetailsOpen(true);
                              }}
                              className="text-[12px] font-bold text-blue-600 hover:text-blue-800 underline"
                            >
                              Inspect Records
                            </button>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={9} className="py-16 text-center">
                          <div className="flex flex-col items-center justify-center space-y-2">
                            <SearchX size={26} className="text-[#04152d]/30" />
                            <p className="text-[13px] font-semibold text-[#04152d]">No remittance batches found</p>
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

      </div>

      <BatchDetailsModal
        isOpen={isDetailsOpen}
        onClose={() => setIsDetailsOpen(false)}
        batch={selectedBatch}
        isAuditorView={true}
      />
    </div>
  );
}
