"use client";

/**
 * Collecting Officer — Payroll Processing Module
 * Implements Sprint 4 User Stories 1 through 14:
 * - Deduction Schedule Screen & Validations (User Stories 1 - 7)
 * - Remittance Upload, Previews, Mismatch Exceptions & Duplicate Warnings (User Stories 8 - 11)
 * - Batch Review, Ready Action & History (User Stories 12 - 14)
 */

import React, { useState, useMemo, useEffect } from 'react';
import { 
  Search, ChevronDown, ChevronLeft, ChevronRight, Plus, 
  Calendar, FileText, UploadCloud, CheckCircle2, AlertTriangle, 
  AlertCircle, Download, Check, Eye, SearchX, ArrowRight,
  Layers, RotateCcw, Filter, Clock
} from 'lucide-react';
import Header from '@/components/Header';
import NewScheduleModal from '@/components/payroll/NewScheduleModal';
import GenerateDeductionListModal from '@/components/payroll/GenerateDeductionListModal';
import RemittanceUploadModal from '@/components/payroll/RemittanceUploadModal';
import BatchDetailsModal from '@/components/payroll/BatchDetailsModal';
import ScheduleSuccessModal from '@/components/payroll/ScheduleSuccessModal';
import BatchSuccessModal from '@/components/payroll/BatchSuccessModal';
import { 
  DeductionSchedule, PayrollBatch, CONFIGURED_PERIODS,
  getStoredSchedules, saveStoredSchedules,
  getStoredBatches, saveStoredBatches
} from '@/lib/payrollData';

const ITEMS_PER_PAGE = 10;

export default function CollectingOfficerPayrollPage() {
  const [activeTab, setActiveTab] = useState<'schedules' | 'batches'>('schedules');

  const [schedules, setSchedules] = useState<DeductionSchedule[]>([]);
  const [batches, setBatches] = useState<PayrollBatch[]>([]);
  const [isClient, setIsClient] = useState(false);

  // Filters for schedules
  const [schedulePeriod, setSchedulePeriod] = useState<string>('All');
  const [scheduleSearch, setScheduleSearch] = useState('');
  const [schedulePage, setSchedulePage] = useState(1);

  // Filters for batches
  const [batchSearch, setBatchSearch] = useState('');
  const [batchPage, setBatchPage] = useState(1);

  // Modals state
  const [isNewScheduleOpen, setIsNewScheduleOpen] = useState(false);
  const [isGenerateListOpen, setIsGenerateListOpen] = useState(false);
  const [isUploadRemittanceOpen, setIsUploadRemittanceOpen] = useState(false);
  const [selectedBatch, setSelectedBatch] = useState<PayrollBatch | null>(null);
  const [isBatchDetailsOpen, setIsBatchDetailsOpen] = useState(false);

  // Success Confirmation Modals state
  const [createdSchedule, setCreatedSchedule] = useState<DeductionSchedule | null>(null);
  const [isScheduleSuccessOpen, setIsScheduleSuccessOpen] = useState(false);

  const [createdBatch, setCreatedBatch] = useState<PayrollBatch | null>(null);
  const [isBatchSuccessOpen, setIsBatchSuccessOpen] = useState(false);

  const [toast, setToast] = useState<{ message: string, type: 'success' | 'info' | 'error' } | null>(null);

  useEffect(() => {
    setIsClient(true);
    setSchedules(getStoredSchedules());
    setBatches(getStoredBatches());
  }, []);

  const showToast = (message: string, type: 'success' | 'info' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const handleScheduleAdded = (newSchedule: DeductionSchedule) => {
    const updated = [newSchedule, ...schedules];
    setSchedules(updated);
    saveStoredSchedules(updated);
    setCreatedSchedule(newSchedule);
    setIsScheduleSuccessOpen(true);
    showToast(`Deduction scheduled for ${newSchedule.memberName} (${newSchedule.memberId}).`, 'success');
  };

  const handleBatchSaved = (newBatch: PayrollBatch) => {
    const updated = [newBatch, ...batches];
    setBatches(updated);
    saveStoredBatches(updated);
    setCreatedBatch(newBatch);
    setIsBatchSuccessOpen(true);
    showToast(`Payroll remittance batch "${newBatch.batchRef}" recorded (${newBatch.status}).`, 'success');
  };

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

  const totalExpectedScheduled = useMemo(() => {
    return schedules.reduce((s, item) => s + Number(item.expectedAmount || 0), 0);
  }, [schedules]);

  const readyBatchesCount = useMemo(() => {
    return batches.filter(b => b.status === 'Ready for Collection Processing').length;
  }, [batches]);

  const ultraGlassCard = "bg-white/50 backdrop-blur-[40px] backdrop-saturate-[200%] border border-white/80 shadow-[0_8px_30px_rgba(4,21,45,0.06),inset_0_2px_3px_rgba(255,255,255,0.9)] rounded-[24px] p-6 relative overflow-hidden";
  const glassInput = "pl-10 pr-4 py-2.5 bg-white/60 hover:bg-white/80 focus:bg-white/90 backdrop-blur-xl border border-white/90 shadow-[inset_0_2px_4px_rgba(4,21,45,0.03)] rounded-[12px] text-[13px] font-semibold text-[#04152d] outline-none transition-all placeholder:text-[#04152d]/40 focus:shadow-[0_4px_16px_rgba(4,21,45,0.08)]";
  const pageBtn = "w-8 h-8 flex items-center justify-center rounded-full text-[12px] font-medium transition-all duration-300";

  return (
    <div className="relative flex flex-col min-h-screen bg-[#f4f5f7]">
      <style jsx global>{`
        @keyframes modal-fade-in { from { opacity: 0; transform: scale(0.96) translateY(8px); } to { opacity: 1; transform: scale(1) translateY(0); } }
        @keyframes slide-up { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
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
                Expected Deduction Total
              </span>
              <span className="text-[22px] font-extrabold text-blue-700 tracking-tight">
                {formatCurrency(totalExpectedScheduled)}
              </span>
              <span className="text-[10px] text-[#04152d]/50 font-semibold block mt-0.5">
                Across {schedules.length} active scheduled deductions
              </span>
            </div>
          </div>

          <div className={`${ultraGlassCard} !p-4 flex items-center gap-3.5`}>
            <div className="w-11 h-11 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center shrink-0 shadow-xs">
              <CheckCircle2 size={22} />
            </div>
            <div>
              <span className="block text-[10px] font-bold text-[#04152d]/50 uppercase tracking-widest">
                Collection-Ready Batches
              </span>
              <span className="text-[22px] font-extrabold text-emerald-700 tracking-tight">
                {readyBatchesCount}
              </span>
              <span className="text-[10px] text-emerald-700/80 font-semibold block mt-0.5">
                Cleared of all blocking exceptions
              </span>
            </div>
          </div>

          <div className={`${ultraGlassCard} !p-4 flex items-center gap-3.5`}>
            <div className="w-11 h-11 rounded-2xl bg-purple-50 border border-purple-200 text-purple-600 flex items-center justify-center shrink-0 shadow-xs">
              <FileText size={22} />
            </div>
            <div>
              <span className="block text-[10px] font-bold text-[#04152d]/50 uppercase tracking-widest">
                Total Remittance Batches
              </span>
              <span className="text-[22px] font-extrabold text-[#04152d] tracking-tight">
                {batches.length}
              </span>
              <span className="text-[10px] text-[#04152d]/50 font-semibold block mt-0.5">
                Recorded in payroll history
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
            <UploadCloud size={15} /> Remittance Batches & History ({batches.length})
          </button>
        </div>

        {/* TAB 1: DEDUCTION SCHEDULES (User Stories 1 - 7) */}
        {activeTab === 'schedules' && (
          <div className="space-y-4 animate-fade-in">
            {/* Action Bar */}
            <div className={`${ultraGlassCard} !p-4 flex flex-col lg:flex-row gap-4 items-center justify-between`}>
              <div className="relative w-full lg:w-1/3">
                <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#04152d]/50" />
                <input
                  type="text"
                  placeholder="Search Member, Obligation Ref, Type..."
                  value={scheduleSearch}
                  onChange={(e) => setScheduleSearch(e.target.value)}
                  className={`${glassInput} w-full`}
                />
              </div>

              <div className="flex w-full lg:w-auto gap-2.5 items-center flex-wrap sm:flex-nowrap">
                {/* Period Filter */}
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

                {/* User Story 7: Generate Deduction List */}
                <button
                  onClick={() => setIsGenerateListOpen(true)}
                  className="px-4 py-2.5 bg-white text-[#04152d] hover:bg-gray-100 border border-white shadow-xs rounded-full text-[12px] font-bold transition-all active:scale-95 flex items-center gap-1.5 whitespace-nowrap"
                >
                  <FileText size={14} /> Generate Deduction List
                </button>

                {/* User Story 1 & 2: Add Deduction Schedule */}
                <button
                  onClick={() => setIsNewScheduleOpen(true)}
                  className="px-5 py-2.5 bg-[#04152d] hover:bg-[#0a1e3f] text-white shadow-md rounded-full text-[12px] font-bold transition-all active:scale-95 flex items-center gap-1.5 whitespace-nowrap"
                >
                  <Plus size={14} /> Schedule Deduction
                </button>
              </div>
            </div>

            {/* Deduction Schedule Table (User Story 1) */}
            <div className={`${ultraGlassCard} !p-0`}>
              <div className="overflow-x-auto w-full">
                <table className="w-full text-left whitespace-nowrap border-collapse min-w-[920px]">
                  <thead className="bg-white/60 text-[10px] font-bold text-[#04152d]/50 uppercase tracking-[0.16em] border-b border-white/50">
                    <tr>
                      <th className="py-3.5 px-6">Payroll Period</th>
                      <th className="py-3.5 px-6">Member ID & Name</th>
                      <th className="py-3.5 px-6">Deduction Classification</th>
                      <th className="py-3.5 px-6">Applicable Obligation Ref</th>
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

                          {/* User Story 6: Obligation Reference */}
                          <td className="py-3.5 px-6">
                            {s.obligationRef !== 'UNASSIGNED-REVIEW' ? (
                              <span className="font-mono font-bold text-blue-700 text-[11px] bg-blue-50/80 px-2 py-0.5 rounded border border-blue-200">
                                {s.obligationRef}
                              </span>
                            ) : (
                              <span className="text-amber-700 text-[10px] font-bold bg-amber-50 px-2 py-0.5 rounded border border-amber-200 flex items-center gap-1 w-fit">
                                <AlertTriangle size={11} /> Flagged: No Obligation
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
                            <p className="text-[13px] font-semibold text-[#04152d]">No deduction schedules match your query</p>
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {totalSchedulePages > 1 && (
                <div className="p-4 border-t border-white/60 bg-white/40 flex items-center justify-between">
                  <p className="text-[12px] text-[#04152d]/60 font-medium">
                    Showing {((schedulePage - 1) * ITEMS_PER_PAGE) + 1} to {Math.min(schedulePage * ITEMS_PER_PAGE, filteredSchedules.length)} of {filteredSchedules.length} schedules
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

        {/* TAB 2: REMITTANCE BATCHES & HISTORY (User Stories 8 - 14) */}
        {activeTab === 'batches' && (
          <div className="space-y-4 animate-fade-in">
            {/* Action Bar */}
            <div className={`${ultraGlassCard} !p-4 flex flex-col sm:flex-row gap-4 items-center justify-between`}>
              <div className="relative w-full sm:w-72">
                <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#04152d]/50" />
                <input
                  type="text"
                  placeholder="Search Batch Reference, Period..."
                  value={batchSearch}
                  onChange={(e) => setBatchSearch(e.target.value)}
                  className={`${glassInput} w-full`}
                />
              </div>

              {/* User Story 8: Upload Actual Payroll Remittance Data */}
              <button
                onClick={() => setIsUploadRemittanceOpen(true)}
                className="px-5 py-2.5 bg-[#04152d] hover:bg-[#0a1e3f] text-white shadow-md rounded-full text-[12px] font-bold transition-all active:scale-95 flex items-center gap-2 whitespace-nowrap self-start sm:self-auto"
              >
                <UploadCloud size={15} /> Upload Remittance Data (.CSV)
              </button>
            </div>

            {/* Batch History Table (User Story 14) */}
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
                      <th className="py-3.5 px-6 text-center">Batch Status</th>
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

                          {/* Status: Draft / Ready for Collection Processing */}
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
                                setIsBatchDetailsOpen(true);
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

      {/* Modals */}
      <NewScheduleModal
        isOpen={isNewScheduleOpen}
        onClose={() => setIsNewScheduleOpen(false)}
        existingSchedules={schedules}
        onSuccess={handleScheduleAdded}
      />

      <GenerateDeductionListModal
        isOpen={isGenerateListOpen}
        onClose={() => setIsGenerateListOpen(false)}
        schedules={schedules}
      />

      <RemittanceUploadModal
        isOpen={isUploadRemittanceOpen}
        onClose={() => setIsUploadRemittanceOpen(false)}
        schedules={schedules}
        existingBatches={batches}
        onBatchSaved={handleBatchSaved}
      />

      <BatchDetailsModal
        isOpen={isBatchDetailsOpen}
        onClose={() => setIsBatchDetailsOpen(false)}
        batch={selectedBatch}
        isAuditorView={false}
      />

      {/* Task Receipt Confirmation Modals */}
      <ScheduleSuccessModal
        isOpen={isScheduleSuccessOpen}
        onClose={() => setIsScheduleSuccessOpen(false)}
        schedule={createdSchedule}
        onScheduleAnother={() => {
          setIsScheduleSuccessOpen(false);
          setIsNewScheduleOpen(true);
        }}
      />

      <BatchSuccessModal
        isOpen={isBatchSuccessOpen}
        onClose={() => setIsBatchSuccessOpen(false)}
        batch={createdBatch}
      />

      {/* Toast Notification */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-[150] animate-slide-up bg-white/90 backdrop-blur-2xl border border-white shadow-[0_8px_30px_rgba(0,0,0,0.12)] p-4 rounded-[16px] flex items-center gap-3 min-w-[320px]">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 border ${
            toast.type === 'success' ? 'bg-emerald-100/60 border-emerald-200 text-emerald-600' :
            toast.type === 'error' ? 'bg-rose-100/60 border-rose-200 text-rose-600' :
            'bg-blue-100/60 border-blue-200 text-blue-600'
          }`}>
            {toast.type === 'success' ? <CheckCircle2 size={16} /> :
             toast.type === 'error' ? <AlertCircle size={16} /> :
             <AlertTriangle size={16} />}
          </div>
          <p className="text-[13px] font-medium text-[#04152d] leading-tight pr-4">
            {toast.message}
          </p>
        </div>
      )}
    </div>
  );
}
