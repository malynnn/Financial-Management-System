"use client";

import React, { useState, useRef, useMemo } from 'react';
import { 
  X, UploadCloud, FileText, CheckCircle2, AlertTriangle, 
  AlertCircle, Download, RefreshCw, Loader2, ArrowRight, 
  ArrowLeft, ShieldCheck, Check, Layers, Copy
} from 'lucide-react';
import { 
  RemittanceRecord, PayrollBatch, DeductionSchedule, 
  CONFIGURED_PERIODS, CONFIGURED_MEMBERS_MASTER, 
  SAMPLE_REMITTANCE_CSV, RemittanceStatus 
} from '@/lib/payrollData';
import { addNotification } from '@/lib/notifications';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  schedules: DeductionSchedule[];
  existingBatches: PayrollBatch[];
  onBatchSaved: (newBatch: PayrollBatch) => void;
}

export default function RemittanceUploadModal({
  isOpen,
  onClose,
  schedules,
  existingBatches,
  onBatchSaved
}: Props) {
  // Wizard steps: 'upload' -> 'preview_exceptions' -> 'review_handoff'
  const [step, setStep] = useState<'upload' | 'preview_exceptions' | 'review_handoff'>('upload');
  
  const [selectedPeriod, setSelectedPeriod] = useState(CONFIGURED_PERIODS[0]);
  const [fileName, setFileName] = useState('');
  const [fileError, setFileError] = useState<string | null>(null);
  const [isParsing, setIsParsing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [records, setRecords] = useState<RemittanceRecord[]>([]);
  const [activeFilter, setActiveFilter] = useState<'ALL' | 'VALID' | 'EXCEPTIONS'>('ALL');
  const [confirmReadyOpen, setConfirmReadyOpen] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDownloadTemplate = () => {
    const blob = new Blob([SAMPLE_REMITTANCE_CSV], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'Payroll_Remittance_Template.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // User Story 8: Validate file format & required columns
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const ext = file.name.split('.').pop()?.toLowerCase();
    if (ext !== 'csv' && ext !== 'txt') {
      setFileError('Unsupported file format. Please upload a .CSV or .TXT remittance file.');
      return;
    }

    setFileName(file.name);
    setIsParsing(true);
    setFileError(null);

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      parseAndValidateRemittanceData(content, file.name);
    };
    reader.readAsText(file);
  };

  const parseAndValidateRemittanceData = (csvText: string, name: string) => {
    const lines = csvText.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 0);
    
    if (lines.length < 2) {
      setFileError('The uploaded file contains no data rows.');
      setIsParsing(false);
      return;
    }

    const header = lines[0].toLowerCase();
    
    // User Story 8: Reject files with missing required columns
    const hasMemberCol = header.includes('member');
    const hasAmountCol = header.includes('amount') || header.includes('remitted');
    const hasTypeCol = header.includes('type') || header.includes('deduction');

    if (!hasMemberCol || !hasAmountCol) {
      setFileError('File format invalid. Missing mandatory headers: "Member ID" and "Remitted Amount".');
      setIsParsing(false);
      return;
    }

    // Collect all historical references to detect duplicate references (User Story 11)
    const historicalReferences = new Set<string>();
    existingBatches.forEach(b => {
      b.records.forEach(r => {
        if (r.reference) historicalReferences.add(r.reference.trim().toUpperCase());
      });
    });

    const parsed: RemittanceRecord[] = [];
    const currentBatchReferences = new Set<string>();

    for (let i = 1; i < lines.length; i++) {
      const cols = lines[i].split(',').map(c => c.trim().replace(/^"|"$/g, ''));
      if (cols.length < 2) continue;

      const rawMemId = cols[0].toUpperCase();
      const rawAmount = parseFloat(cols[1]);
      const rawType = cols[2] || 'Regular Loan Amortization';
      const rawPeriod = cols[3] || selectedPeriod;
      const rawRef = (cols[4] || `REM-${Date.now().toString().slice(-4)}-${i}`).toUpperCase();

      const member = CONFIGURED_MEMBERS_MASTER[rawMemId];

      // Find matching scheduled expected deduction
      const matchedSchedule = schedules.find(
        s => s.payrollPeriod === rawPeriod &&
             s.memberId === rawMemId &&
             s.deductionType === rawType
      );

      const expectedAmount = matchedSchedule ? matchedSchedule.expectedAmount : 
                             member?.obligations.find(o => o.deductionType === rawType)?.monthlyAmount || 0;

      const variance = (isNaN(rawAmount) ? 0 : rawAmount) - expectedAmount;

      let status: RemittanceStatus = 'VALID';
      let reason: string | undefined = undefined;
      let isDuplicate = false;

      // User Story 11: Duplicate Reference Detection
      if (historicalReferences.has(rawRef) || currentBatchReferences.has(rawRef)) {
        status = 'DUPLICATE_REFERENCE';
        reason = `Duplicate Reference Warning: "${rawRef}" was already processed in a previous payroll batch.`;
        isDuplicate = true;
      }
      // User Story 10: Missing Member Detection
      else if (!member) {
        status = 'MISSING_MEMBER';
        reason = `Member ID "${rawMemId}" does not exist in master records.`;
      }
      // User Story 10: Inactive Member Detection
      else if (member.status === 'INACTIVE') {
        status = 'INACTIVE_MEMBER';
        reason = `Member "${member.name}" is marked INACTIVE. Salary deductions cannot be credited.`;
      }
      // User Story 10: Unmatched Deduction Schedule
      else if (!matchedSchedule && expectedAmount === 0) {
        status = 'UNMATCHED_DEDUCTION';
        reason = `No active deduction schedule or obligation found for ${rawType}.`;
      }
      // User Story 10: Amount Mismatch (Underpayment or Overpayment variance)
      else if (Math.abs(variance) > 0.01) {
        status = 'AMOUNT_MISMATCH';
        reason = `Remittance variance of ₱${Math.abs(variance).toFixed(2)} detected (Expected: ₱${expectedAmount.toFixed(2)}, Remitted: ₱${rawAmount.toFixed(2)}).`;
      }

      currentBatchReferences.add(rawRef);

      parsed.push({
        id: `rec-${i}`,
        memberId: rawMemId,
        memberName: member?.name || 'Unrecognized Member',
        payrollPeriod: rawPeriod,
        deductionType: rawType,
        expectedAmount,
        actualRemittedAmount: isNaN(rawAmount) ? 0 : rawAmount,
        variance,
        reference: rawRef,
        status,
        exceptionReason: reason,
        isDuplicate
      });
    }

    setRecords(parsed);
    setIsParsing(false);
    setStep('preview_exceptions');
  };

  // Summary metrics (User Story 12)
  const summary = useMemo(() => {
    const totalRecords = records.length;
    const validRecords = records.filter(r => r.status === 'VALID').length;
    const exceptionRecords = records.filter(r => r.status !== 'VALID').length;
    
    const expectedTotal = records.reduce((s, r) => s + Number(r.expectedAmount || 0), 0);
    const remittedTotal = records.reduce((s, r) => s + Number(r.actualRemittedAmount || 0), 0);
    const varianceTotal = remittedTotal - expectedTotal;

    const hasBlockingExceptions = exceptionRecords > 0;

    return {
      totalRecords,
      validRecords,
      exceptionRecords,
      expectedTotal,
      remittedTotal,
      varianceTotal,
      hasBlockingExceptions
    };
  }, [records]);

  const filteredRecords = useMemo(() => {
    if (activeFilter === 'VALID') return records.filter(r => r.status === 'VALID');
    if (activeFilter === 'EXCEPTIONS') return records.filter(r => r.status !== 'VALID');
    return records;
  }, [records, activeFilter]);

  const formatCurrency = (val: number) => `₱${Number(val || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}`;

  // User Story 13: Mark as Ready for Collection Processing
  const handleFinalizeBatch = (status: 'Draft' | 'Validated' | 'Ready for Collection Processing') => {
    setIsSubmitting(true);

    const newBatch: PayrollBatch = {
      id: `BAT-${Date.now().toString().slice(-6)}`,
      batchRef: `PR-${selectedPeriod.replace(/[^a-zA-Z0-9]/g, '')}-${(existingBatches.length + 1).toString().padStart(2, '0')}`,
      payrollPeriod: selectedPeriod,
      recordCount: summary.totalRecords,
      validCount: summary.validRecords,
      exceptionCount: summary.exceptionRecords,
      expectedTotal: summary.expectedTotal,
      remittedTotal: summary.remittedTotal,
      varianceTotal: summary.varianceTotal,
      status: status,
      uploader: 'Maria Santos (Collecting Officer)',
      timestamp: new Date().toISOString().replace('T', ' ').slice(0, 19),
      records
    };

    setTimeout(() => {
      onBatchSaved(newBatch);

      addNotification({
        type: 'remittance_batch',
        title: `Payroll Batch ${newBatch.batchRef} (${status})`,
        message: `Batch ${newBatch.batchRef} for ${selectedPeriod} has been processed: ${summary.validRecords} valid records, ₱${summary.remittedTotal.toLocaleString()} remitted.`,
        priority: status === 'Ready for Collection Processing' ? 'success' : 'info',
        targetRoles: ['collecting_officer'],
        details: {
          referenceNumber: newBatch.batchRef,
          payeeOrPayer: 'Central DepEd Payroll Agency',
          amount: summary.remittedTotal,
          fundCode: 'GEN',
          category: 'Payroll Deduction',
          actionBy: 'Maria Santos (Collecting Officer)',
          particulars: `Period: ${selectedPeriod} • ${summary.validRecords} valid records, ${summary.exceptionRecords} exceptions`,
          actionUrl: '/collecting-officer/payroll',
          actionLabel: 'Open Payroll Console',
          notes: `Batch status: ${status}. Expected: ₱${summary.expectedTotal.toLocaleString()} vs Actual: ₱${summary.remittedTotal.toLocaleString()}`
        }
      });

      setIsSubmitting(false);
      onClose();
    }, 400);
  };

  if (!isOpen) return null;

  const ultraGlassCard = "bg-white/95 backdrop-blur-[40px] backdrop-saturate-[200%] border border-white/90 shadow-[0_24px_60px_rgba(4,21,45,0.18),inset_0_2px_4px_rgba(255,255,255,1)] rounded-[26px] p-6 lg:p-8 relative overflow-hidden";

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-3 sm:p-6 transition-opacity duration-300">
      <div 
        className="absolute inset-0 bg-[#04152d]/50 backdrop-blur-md" 
        onClick={() => !isSubmitting && onClose()} 
      />

      <div className={`relative w-full max-w-4xl max-h-[92vh] flex flex-col animate-modal-enter ${ultraGlassCard}`}>
        {/* Fixed Header */}
        <div className="flex items-center justify-between border-b border-white/70 pb-4 mb-4 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-50 border border-blue-200 text-blue-700 flex items-center justify-center shadow-xs">
              <UploadCloud size={20} />
            </div>
            <div>
              <h3 className="text-[17px] font-bold text-[#04152d] tracking-tight">
                {step === 'upload' ? 'Upload Actual Payroll Remittance' :
                 step === 'preview_exceptions' ? 'Remittance Preview & Exception Verification' :
                 'Final Batch Review & Collection Handoff'}
              </h3>
              <p className="text-[11px] text-[#04152d]/60 font-medium">
                {step === 'upload' ? 'Import payroll deduction remittance files (.CSV / .TXT)' :
                 step === 'preview_exceptions' ? 'Audit expected vs remitted deductions and investigate exceptions' :
                 'Confirm batch integrity before marking ready for collection processing'}
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
          
          {/* STEP 1: UPLOAD */}
          {step === 'upload' && (
            <div className="space-y-4 animate-fade-in">
              <div className="bg-white/70 p-4 rounded-2xl border border-white shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <span className="block text-[10px] font-bold uppercase tracking-wider text-[#04152d]/50 mb-1">
                    Payroll Period Target
                  </span>
                  <select
                    value={selectedPeriod}
                    onChange={(e) => setSelectedPeriod(e.target.value)}
                    className="pl-3 pr-8 py-1.5 bg-white border border-white/90 shadow-xs rounded-xl text-[13px] font-bold text-[#04152d] outline-none cursor-pointer"
                  >
                    {CONFIGURED_PERIODS.map(p => (
                      <option key={p} value={p}>{p}</option>
                    ))}
                  </select>
                </div>

                <button
                  type="button"
                  onClick={handleDownloadTemplate}
                  className="px-4 py-2 rounded-full text-[12px] font-bold bg-white text-blue-700 hover:bg-blue-50 border border-blue-200 shadow-xs transition-all flex items-center gap-1.5 self-start sm:self-auto"
                >
                  <Download size={13} /> Download Sample Remittance Template
                </button>
              </div>

              {/* Upload Dropzone */}
              <div 
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-blue-300 hover:border-blue-500 bg-blue-50/40 hover:bg-blue-50/70 p-8 rounded-2xl flex flex-col items-center justify-center text-center cursor-pointer transition-all group"
              >
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  accept=".csv,.txt" 
                  onChange={handleFileChange} 
                  className="hidden" 
                />
                
                <div className="w-14 h-14 rounded-2xl bg-white shadow-md border border-white flex items-center justify-center text-blue-600 mb-3 group-hover:scale-105 transition-transform">
                  {isParsing ? <Loader2 size={26} className="animate-spin" /> : <UploadCloud size={26} />}
                </div>

                <p className="text-[14px] font-bold text-[#04152d]">
                  Click to select or drag and drop payroll remittance file
                </p>
                <p className="text-[12px] text-[#04152d]/60 mt-1">
                  Supported formats: Standard Comma-Separated Values (<code className="font-mono font-bold">.CSV</code>, <code className="font-mono font-bold">.TXT</code>)
                </p>
                <p className="text-[10px] text-blue-700 font-semibold mt-2 bg-blue-100/60 px-3 py-1 rounded-full border border-blue-200">
                  Required Columns: Member ID, Remitted Amount, Deduction Type, Reference
                </p>
              </div>

              {fileError && (
                <div className="bg-rose-50 border border-rose-200 text-rose-700 p-3.5 rounded-xl flex items-start gap-2.5 text-[12px] font-medium animate-fade-in shadow-xs">
                  <AlertCircle size={16} className="shrink-0 mt-0.5 text-rose-600" />
                  <p>{fileError}</p>
                </div>
              )}
            </div>
          )}

          {/* STEP 2: PREVIEW & EXCEPTIONS (User Stories 9, 10, 11) */}
          {step === 'preview_exceptions' && (
            <div className="space-y-4 animate-fade-in">
              {/* Summary Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-[12px]">
                <div className="bg-white/80 p-3 rounded-xl border border-white shadow-xs">
                  <span className="block text-[10px] font-bold text-[#04152d]/50 uppercase tracking-widest mb-0.5">Total Records</span>
                  <span className="text-[18px] font-extrabold text-[#04152d]">{summary.totalRecords}</span>
                </div>

                <div className="bg-emerald-50/80 p-3 rounded-xl border border-emerald-200 shadow-xs">
                  <span className="block text-[10px] font-bold text-emerald-800 uppercase tracking-widest mb-0.5">Matched & Valid</span>
                  <span className="text-[18px] font-extrabold text-emerald-700">{summary.validRecords}</span>
                </div>

                <div className={`p-3 rounded-xl border shadow-xs ${
                  summary.exceptionRecords > 0 ? 'bg-rose-50/80 border-rose-200' : 'bg-gray-50 border-gray-200'
                }`}>
                  <span className="block text-[10px] font-bold text-rose-800 uppercase tracking-widest mb-0.5">Exceptions Flagged</span>
                  <span className={`text-[18px] font-extrabold ${summary.exceptionRecords > 0 ? 'text-rose-700' : 'text-gray-500'}`}>
                    {summary.exceptionRecords}
                  </span>
                </div>

                <div className="bg-blue-50/80 p-3 rounded-xl border border-blue-200 shadow-xs">
                  <span className="block text-[10px] font-bold text-blue-800 uppercase tracking-widest mb-0.5">Remitted Total</span>
                  <span className="text-[18px] font-extrabold text-blue-700">{formatCurrency(summary.remittedTotal)}</span>
                </div>
              </div>

              {/* Blocking Exception Notice (User Story 10 & 13) */}
              {summary.hasBlockingExceptions && (
                <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-[12px] flex items-start gap-2.5">
                  <AlertTriangle size={16} className="shrink-0 mt-0.5 text-rose-600" />
                  <div>
                    <span className="font-bold block">Blocking Remittance Exceptions Detected:</span>
                    <p className="mt-0.5 leading-relaxed">
                      {summary.exceptionRecords} record(s) contain amount mismatches, unverified members, or duplicate references. Per financial controls, records with exceptions cannot be marked as Ready for Collection Processing until investigated.
                    </p>
                  </div>
                </div>
              )}

              {/* Filter Pills */}
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 bg-white/80 p-1 rounded-full border border-white shadow-xs">
                  <button
                    type="button"
                    onClick={() => setActiveFilter('ALL')}
                    className={`px-3 py-1 rounded-full text-[11px] font-bold transition-all ${
                      activeFilter === 'ALL' ? 'bg-[#04152d] text-white shadow-xs' : 'text-[#04152d]/60 hover:text-[#04152d]'
                    }`}
                  >
                    All Records ({records.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveFilter('VALID')}
                    className={`px-3 py-1 rounded-full text-[11px] font-bold transition-all ${
                      activeFilter === 'VALID' ? 'bg-emerald-600 text-white shadow-xs' : 'text-emerald-700 hover:text-emerald-900'
                    }`}
                  >
                    Valid Only ({summary.validRecords})
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveFilter('EXCEPTIONS')}
                    className={`px-3 py-1 rounded-full text-[11px] font-bold transition-all ${
                      activeFilter === 'EXCEPTIONS' ? 'bg-rose-600 text-white shadow-xs' : 'text-rose-700 hover:text-rose-900'
                    }`}
                  >
                    Exceptions ({summary.exceptionRecords})
                  </button>
                </div>

                <span className="text-[11px] text-[#04152d]/50 font-medium">
                  File: <code className="font-bold text-[#04152d]">{fileName}</code>
                </span>
              </div>

              {/* Remittance Records Preview Table (User Story 9) */}
              <div className="bg-white/70 rounded-2xl border border-white overflow-hidden shadow-xs">
                <div className="overflow-x-auto w-full max-h-[300px]">
                  <table className="w-full text-left whitespace-nowrap border-collapse min-w-[700px]">
                    <thead className="bg-white/80 text-[10px] font-bold text-[#04152d]/50 uppercase tracking-[0.14em] sticky top-0 z-10 border-b border-white">
                      <tr>
                        <th className="py-2.5 px-4">Member ID & Name</th>
                        <th className="py-2.5 px-4">Reference</th>
                        <th className="py-2.5 px-4 text-right">Expected</th>
                        <th className="py-2.5 px-4 text-right">Actual Remitted</th>
                        <th className="py-2.5 px-4 text-center">Status & Findings</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/70 text-[12px] text-[#04152d]">
                      {filteredRecords.map((r) => {
                        const isValid = r.status === 'VALID';
                        return (
                          <tr key={r.id} className={`hover:bg-white/80 transition-colors ${!isValid ? 'bg-rose-50/40' : ''}`}>
                            <td className="py-3 px-4">
                              <p className="font-bold text-[#04152d]">{r.memberName}</p>
                              <p className="font-mono text-[10px] text-[#04152d]/50">{r.memberId}</p>
                            </td>

                            <td className="py-3 px-4 font-mono font-semibold text-[11px] text-blue-700">
                              {r.reference}
                            </td>

                            <td className="py-3 px-4 text-right font-semibold text-[#04152d]/70">
                              {formatCurrency(r.expectedAmount)}
                            </td>

                            <td className="py-3 px-4 text-right font-extrabold text-[13px] text-[#04152d]">
                              {formatCurrency(r.actualRemittedAmount)}
                            </td>

                            <td className="py-3 px-4 text-center">
                              {isValid ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-800 border border-emerald-300">
                                  <CheckCircle2 size={11} /> Matched
                                </span>
                              ) : (
                                <div className="inline-flex flex-col items-center">
                                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-rose-100 text-rose-800 border border-rose-300">
                                    <AlertTriangle size={11} /> {r.status.replace('_', ' ')}
                                  </span>
                                  {r.exceptionReason && (
                                    <span className="text-[10px] text-rose-600 font-medium mt-0.5 max-w-[240px] truncate" title={r.exceptionReason}>
                                      {r.exceptionReason}
                                    </span>
                                  )}
                                </div>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: REVIEW & HANDOFF (User Story 12 & 13) */}
          {step === 'review_handoff' && (
            <div className="space-y-4 animate-fade-in text-[12px]">
              <div className="bg-blue-50/70 p-4 rounded-2xl border border-blue-200 space-y-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-blue-900 flex items-center gap-1.5">
                  <ShieldCheck size={14} /> Batch Reconciliation & Handoff Review
                </span>
                <p className="text-[#04152d]/80 leading-relaxed font-medium">
                  Review the aggregated batch totals below. Once marked as <strong>Ready for Collection Processing</strong>, this batch will be queued for formal collection receipt issuance and treasury fund crediting.
                </p>
              </div>

              {/* User Story 12: Review screen metrics */}
              <div className="bg-white/80 p-5 rounded-2xl border border-white space-y-3">
                <div className="flex justify-between items-center pb-2.5 border-b border-white">
                  <span className="text-[#04152d]/60 font-semibold uppercase text-[10px]">Payroll Period:</span>
                  <span className="font-bold text-[#04152d]">{selectedPeriod}</span>
                </div>

                <div className="flex justify-between items-center pb-2.5 border-b border-white">
                  <span className="text-[#04152d]/60 font-semibold uppercase text-[10px]">Total Deduction Records:</span>
                  <span className="font-bold text-[#04152d]">{summary.totalRecords} entries</span>
                </div>

                <div className="flex justify-between items-center pb-2.5 border-b border-white">
                  <span className="text-[#04152d]/60 font-semibold uppercase text-[10px]">Valid Clean Records:</span>
                  <span className="font-bold text-emerald-700">{summary.validRecords} entries</span>
                </div>

                <div className="flex justify-between items-center pb-2.5 border-b border-white">
                  <span className="text-[#04152d]/60 font-semibold uppercase text-[10px]">Exception Records:</span>
                  <span className={`font-bold ${summary.exceptionRecords > 0 ? 'text-rose-700' : 'text-gray-600'}`}>
                    {summary.exceptionRecords} entries
                  </span>
                </div>

                <div className="flex justify-between items-center pb-2.5 border-b border-white">
                  <span className="text-[#04152d]/60 font-semibold uppercase text-[10px]">Expected Scheduled Total:</span>
                  <span className="font-bold text-[#04152d]">{formatCurrency(summary.expectedTotal)}</span>
                </div>

                <div className="flex justify-between items-center pb-2.5 border-b border-white">
                  <span className="text-[#04152d]/60 font-semibold uppercase text-[10px]">Actual Remitted Total:</span>
                  <span className="font-extrabold text-[16px] text-blue-700">{formatCurrency(summary.remittedTotal)}</span>
                </div>

                <div className="flex justify-between items-center pt-1">
                  <span className="text-[#04152d]/60 font-semibold uppercase text-[10px]">Batch Variance:</span>
                  <span className={`font-bold ${summary.varianceTotal === 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                    {summary.varianceTotal >= 0 ? '+' : ''}{formatCurrency(summary.varianceTotal)}
                  </span>
                </div>
              </div>

              {summary.hasBlockingExceptions ? (
                <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-[11px] flex items-start gap-2">
                  <AlertCircle size={15} className="shrink-0 mt-0.5 text-rose-600" />
                  <p>
                    <strong>Blocking Control:</strong> This batch cannot be marked as Ready for Collection Processing because {summary.exceptionRecords} exception(s) remain unresolved. You may save this batch as a <strong>Draft</strong> for further reconciliation.
                  </p>
                </div>
              ) : (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-[11px] flex items-center gap-2">
                  <CheckCircle2 size={15} className="shrink-0 text-emerald-600" />
                  <p>
                    <strong>Validation Complete:</strong> All records match scheduled active deductions without duplicates or variances. Ready for collection processing.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Fixed Footer */}
        <div className="shrink-0 border-t border-white/70 pt-4 mt-3 flex items-center justify-between gap-3">
          {step === 'upload' ? (
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-5 py-2.5 rounded-full text-[13px] font-semibold text-[#04152d]/70 hover:bg-white transition-colors"
            >
              Cancel
            </button>
          ) : step === 'preview_exceptions' ? (
            <>
              <button
                type="button"
                onClick={() => setStep('upload')}
                disabled={isSubmitting}
                className="px-5 py-2.5 rounded-full text-[13px] font-semibold text-[#04152d]/70 hover:bg-white transition-colors flex items-center gap-1.5"
              >
                <ArrowLeft size={14} /> Re-upload File
              </button>

              <button
                type="button"
                onClick={() => setStep('review_handoff')}
                className="px-6 py-2.5 rounded-full text-[13px] font-bold bg-[#04152d] text-white hover:bg-[#0a1e3f] shadow-md flex items-center gap-2 active:scale-95 transition-all"
              >
                Proceed to Batch Review <ArrowRight size={14} />
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={() => setStep('preview_exceptions')}
                disabled={isSubmitting}
                className="px-5 py-2.5 rounded-full text-[13px] font-semibold text-[#04152d]/70 hover:bg-white transition-colors flex items-center gap-1.5"
              >
                <ArrowLeft size={14} /> Back to Preview
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleFinalizeBatch('Draft')}
                  disabled={isSubmitting}
                  className="px-5 py-2.5 rounded-full text-[12px] font-bold bg-white text-[#04152d] hover:bg-gray-100 border border-white shadow-xs transition-all active:scale-95"
                >
                  Save as Draft Batch
                </button>

                {/* User Story 13: Ready action available only when no blocking exceptions remain */}
                <button
                  type="button"
                  onClick={() => setConfirmReadyOpen(true)}
                  disabled={isSubmitting || summary.hasBlockingExceptions}
                  className="px-6 py-2.5 rounded-full text-[12px] font-bold bg-emerald-700 text-white hover:bg-emerald-800 disabled:opacity-50 disabled:cursor-not-allowed shadow-md transition-all active:scale-95 flex items-center gap-1.5"
                >
                  <CheckCircle2 size={14} /> Mark as Ready for Collection Processing
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* User Story 13: Confirmation Modal before marking Ready */}
      {confirmReadyOpen && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 transition-opacity duration-300">
          <div 
            className="absolute inset-0 bg-[#04152d]/50 backdrop-blur-sm"
            onClick={() => setConfirmReadyOpen(false)}
          />
          <div className="relative w-full max-w-md bg-white/95 backdrop-blur-2xl border border-white p-6 rounded-[24px] shadow-2xl animate-modal-enter space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center shadow-xs">
                <CheckCircle2 size={20} />
              </div>
              <div>
                <h4 className="text-[16px] font-bold text-[#04152d]">
                  Confirm Collection-Ready Handoff
                </h4>
                <p className="text-[11px] text-[#04152d]/60">
                  {selectedPeriod} • {summary.validRecords} Records
                </p>
              </div>
            </div>

            <p className="text-[13px] text-[#04152d]/80 leading-relaxed font-medium">
              Are you sure you want to mark this validated batch as <strong>Ready for Collection Processing</strong>? This will finalize the {formatCurrency(summary.remittedTotal)} remittance total and queue individual member collection entries for posting.
            </p>

            <div className="flex justify-end gap-2.5 pt-2 border-t border-white/80">
              <button
                type="button"
                onClick={() => setConfirmReadyOpen(false)}
                className="px-4 py-2 rounded-full text-[12px] font-semibold text-[#04152d]/70 hover:bg-white"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  setConfirmReadyOpen(false);
                  handleFinalizeBatch('Ready for Collection Processing');
                }}
                className="px-5 py-2 rounded-full text-[12px] font-bold text-white bg-emerald-700 hover:bg-emerald-800 shadow-md active:scale-95 transition-all"
              >
                Confirm & Mark Ready
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
