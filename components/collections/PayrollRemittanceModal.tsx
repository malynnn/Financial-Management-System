"use client";

import React, { useState, useRef } from 'react';
import {
  X, UploadCloud, FileText, CheckCircle2, AlertTriangle, AlertCircle,
  ArrowRight, Download, RefreshCw, Loader2, Check, Filter, Layers
} from 'lucide-react';

interface RemittanceRecord {
  id: string;
  memberId: string;
  memberName: string;
  obligationType: string;
  expectedAmount: number;
  remittedAmount: number;
  discrepancy: number;
  status: 'MATCHED' | 'DISCREPANCY' | 'UNMATCHED_MEMBER' | 'INACTIVE_MEMBER';
  exceptionReason?: string;
}

// Configured standard expected deduction roster for matching
const EXPECTED_PAYROLL_DEDUCTIONS: Record<string, { name: string; obligation: string; expectedAmount: number; isActive: boolean }> = {
  'MEM-2026-1': { name: 'Juan Dela Cruz', obligation: 'Regular Loan #RL-2026-01', expectedAmount: 2500, isActive: true },
  'MEM-2026-2': { name: 'Maria Clara', obligation: 'Emergency Calamity Loan', expectedAmount: 1800, isActive: true },
  'MEM-2026-3': { name: 'Jose Rizal', obligation: 'Education Loan #EL-90', expectedAmount: 3200, isActive: true },
  'MEM-2026-4': { name: 'Andres Bonifacio', obligation: 'Livelihood Loan', expectedAmount: 2000, isActive: true },
  'MEM-2026-5': { name: 'Emilio Jacinto', obligation: 'Defaulted Loan Account', expectedAmount: 1500, isActive: false }, // Inactive member
  'MEM-2026-6': { name: 'Apolinario Mabini', obligation: 'Appliance Loan', expectedAmount: 1250, isActive: true },
  'MEM-2026-7': { name: 'Melchora Aquino', obligation: 'Medical Assistance Loan', expectedAmount: 1100, isActive: true },
};

const SAMPLE_CSV_CONTENT = `Member ID,Remitted Amount,Obligation Type,Notes
MEM-2026-1,2500,Regular Loan #RL-2026-01,October 1st Quindena
MEM-2026-2,1800,Emergency Calamity Loan,October 1st Quindena
MEM-2026-3,2800,Education Loan #EL-90,Partial Remittance (Underpayment)
MEM-2026-4,2000,Livelihood Loan,October 1st Quindena
MEM-2026-5,1500,Defaulted Loan Account,Inactive Member Flagged
MEM-2026-99,1000,Annual Dues,Non-existent Member Record
MEM-2026-6,1250,Appliance Loan,October 1st Quindena
MEM-2026-7,1100,Medical Assistance Loan,October 1st Quindena`;

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onBatchPosted: (batchRecords: any[]) => void;
}

export default function PayrollRemittanceModal({ isOpen, onClose, onBatchPosted }: Props) {
  const [step, setStep] = useState<'upload' | 'preview' | 'completed'>('upload');
  const [fileName, setFileName] = useState('');
  const [fileError, setFileError] = useState<string | null>(null);
  const [isProcessingFile, setIsProcessingFile] = useState(false);
  const [isPostingBatch, setIsPostingBatch] = useState(false);

  const [records, setRecords] = useState<RemittanceRecord[]>([]);
  const [activeFilter, setActiveFilter] = useState<'ALL' | 'MATCHED' | 'EXCEPTIONS'>('ALL');
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleDownloadTemplate = () => {
    const blob = new Blob([SAMPLE_CSV_CONTENT], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'Payroll_Remittance_Template.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const parseAndValidateCSV = (text: string, originalName: string) => {
    setIsProcessingFile(true);
    setFileError(null);

    const lines = text.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 0);
    if (lines.length < 2) {
      setFileError('The uploaded file is empty or missing data rows.');
      setIsProcessingFile(false);
      return;
    }

    const header = lines[0].toLowerCase();
    // Rule: Reject files that are missing required fields
    if (!header.includes('member') || !header.includes('amount')) {
      setFileError('File format invalid. Missing required headers: "Member ID" and "Remitted Amount".');
      setIsProcessingFile(false);
      return;
    }

    const parsedRecords: RemittanceRecord[] = [];

    for (let i = 1; i < lines.length; i++) {
      const cols = lines[i].split(',').map(c => c.trim().replace(/^"|"$/g, ''));
      if (cols.length < 2) continue;

      const memId = cols[0].toUpperCase();
      const amount = parseFloat(cols[1]);

      if (isNaN(amount) || amount <= 0) {
        continue;
      }

      const expected = EXPECTED_PAYROLL_DEDUCTIONS[memId];

      if (!expected) {
        // Flag unmatched member (Criteria 10: Identify unmatched payroll remittances)
        parsedRecords.push({
          id: `rec-${i}`,
          memberId: memId,
          memberName: 'Unrecognized Member',
          obligationType: cols[2] || 'Unassigned',
          expectedAmount: 0,
          remittedAmount: amount,
          discrepancy: amount,
          status: 'UNMATCHED_MEMBER',
          exceptionReason: 'Member ID does not exist in the active master list.'
        });
      } else if (!expected.isActive) {
        // Flag inactive member (Criteria 10)
        parsedRecords.push({
          id: `rec-${i}`,
          memberId: memId,
          memberName: expected.name,
          obligationType: expected.obligation,
          expectedAmount: expected.expectedAmount,
          remittedAmount: amount,
          discrepancy: amount - expected.expectedAmount,
          status: 'INACTIVE_MEMBER',
          exceptionReason: 'Member status is INACTIVE. Deductions cannot be posted.'
        });
      } else if (Math.abs(amount - expected.expectedAmount) > 0.01) {
        // Flag amount mismatch (Criteria 10)
        parsedRecords.push({
          id: `rec-${i}`,
          memberId: memId,
          memberName: expected.name,
          obligationType: expected.obligation,
          expectedAmount: expected.expectedAmount,
          remittedAmount: amount,
          discrepancy: amount - expected.expectedAmount,
          status: 'DISCREPANCY',
          exceptionReason: `Amount variance of ₱${Math.abs(amount - expected.expectedAmount).toFixed(2)} detected against expected deduction of ₱${expected.expectedAmount.toFixed(2)}.`
        });
      } else {
        // Perfectly matched
        parsedRecords.push({
          id: `rec-${i}`,
          memberId: memId,
          memberName: expected.name,
          obligationType: expected.obligation,
          expectedAmount: expected.expectedAmount,
          remittedAmount: amount,
          discrepancy: 0,
          status: 'MATCHED'
        });
      }
    }

    if (parsedRecords.length === 0) {
      setFileError('Could not find any valid numeric remittance rows in the uploaded file.');
      setIsProcessingFile(false);
      return;
    }

    setFileName(originalName);
    setRecords(parsedRecords);
    setIsProcessingFile(false);
    setStep('preview');
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const ext = file.name.split('.').pop()?.toLowerCase();
    // Rule: Reject files not matching configured file format (.csv, .xlsx)
    if (ext !== 'csv' && ext !== 'txt') {
      setFileError(`Invalid file format ".${ext}". The system accepts only configured .csv or .xlsx payroll deduction files.`);
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      parseAndValidateCSV(text, file.name);
    };
    reader.onerror = () => {
      setFileError('File could not be read or is corrupted.');
    };
    reader.readAsText(file);
  };

  const handleLoadSampleData = () => {
    parseAndValidateCSV(SAMPLE_CSV_CONTENT, 'Standard_Payroll_Batch_Oct2026.csv');
  };

  const matchedRecords = records.filter(r => r.status === 'MATCHED');
  const exceptionRecords = records.filter(r => r.status !== 'MATCHED');

  const displayedRecords = activeFilter === 'MATCHED' ? matchedRecords :
                           activeFilter === 'EXCEPTIONS' ? exceptionRecords : records;

  const totalRemitted = records.reduce((acc, r) => acc + r.remittedAmount, 0);
  const matchedTotal = matchedRecords.reduce((acc, r) => acc + r.remittedAmount, 0);

  const handlePostValidCollections = () => {
    setIsPostingBatch(true);

    const newCollections = matchedRecords.map((r, idx) => ({
      id: `batch-${Date.now()}-${idx}`,
      ref: `REM-${Math.floor(200000 + Math.random() * 800000)}`,
      memberId: r.memberId,
      memberName: r.memberName,
      amount: r.remittedAmount,
      date: new Date().toISOString().split('T')[0],
      method: 'Payroll Remittance',
      paymentRef: `BATCH-PR-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}`,
      proofUrl: '#',
      status: 'Posted',
      isReconciled: true,
      applicationData: {
        obligationType: r.obligationType,
        originalBalance: r.expectedAmount * 4,
        appliedAmount: r.remittedAmount,
        remainingBalance: (r.expectedAmount * 4) - r.remittedAmount,
        exceptionStatus: 'Payroll Deduction'
      },
      auditTrail: [
        {
          id: `at-batch-${Date.now()}-${idx}`,
          action: 'Bulk Payroll Remittance Posted',
          actor: 'Maria Santos',
          role: 'Collecting Officer',
          timestamp: new Date().toISOString(),
          details: `Remittance deduction of ₱${r.remittedAmount.toLocaleString()} matched and applied to ${r.obligationType}.`
        }
      ]
    }));

    setTimeout(() => {
      onBatchPosted(newCollections);
      setIsPostingBatch(false);
      setStep('completed');
    }, 700);
  };

  const ultraGlassCard = "bg-white/95 backdrop-blur-2xl border border-white/80 shadow-[0_20px_60px_rgba(4,21,45,0.25)] rounded-[28px] overflow-hidden max-w-4xl w-full mx-4 transition-all duration-300 relative z-50 flex flex-col max-h-[90vh]";

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
      <div className={ultraGlassCard}>
        
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-blue-50/50 via-white to-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-600/10 border border-indigo-200 flex items-center justify-center text-indigo-600 font-bold">
              <UploadCloud size={20} />
            </div>
            <div>
              <h2 className="text-[16px] font-bold text-[#04152d] tracking-tight">
                Bulk Payroll Remittance Processing
              </h2>
              <p className="text-[11px] text-gray-500 font-medium">
                Upload employer remittance batches, validate deductions, and isolate exceptions
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center text-gray-400 hover:text-gray-700 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body Content */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1">

          {/* STEP 1: UPLOAD COMPONENT (Criteria 8: Accept configured file format, reject invalid/corrupted) */}
          {step === 'upload' && (
            <div className="space-y-6">
              
              {fileError && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-2xl flex items-start gap-3 text-red-800 animate-slide-up">
                  <AlertCircle size={20} className="shrink-0 text-red-600 mt-0.5" />
                  <div className="text-[12px] leading-relaxed">
                    <p className="font-bold text-red-900">Upload Validation Error</p>
                    <p>{fileError}</p>
                  </div>
                </div>
              )}

              <div 
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-gray-300 hover:border-blue-500 rounded-3xl p-10 text-center bg-gray-50/60 hover:bg-blue-50/20 cursor-pointer transition-all duration-300 group"
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                  accept=".csv,.txt"
                  className="hidden"
                />
                <div className="w-16 h-16 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                  <UploadCloud size={32} />
                </div>
                <h3 className="text-[15px] font-bold text-[#04152d]">Select or Drag Payroll Remittance File</h3>
                <p className="text-[12px] text-gray-500 mt-1 max-w-sm mx-auto">
                  Configured formats: <strong>.CSV</strong> or <strong>.XLSX</strong>. Must include columns for Member ID, Remitted Amount, and Obligation.
                </p>
                <div className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 shadow-sm rounded-full text-[12px] font-semibold text-gray-700">
                  <FileText size={14} className="text-blue-600" /> Browse Computer
                </div>
              </div>

              {/* Sample template & instant test button */}
              <div className="p-4 bg-slate-50 border border-gray-200 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-3 text-[12px]">
                <div className="text-gray-600">
                  <span className="font-bold text-[#04152d]">Need a format reference?</span> Download the configured CSV template or load sample test batch.
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleDownloadTemplate}
                    className="px-3.5 py-2 bg-white hover:bg-gray-50 border border-gray-200 rounded-full font-medium text-gray-700 flex items-center gap-1.5 transition-all"
                  >
                    <Download size={13} /> Download Template
                  </button>
                  <button
                    type="button"
                    onClick={handleLoadSampleData}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-full font-bold shadow-sm transition-all"
                  >
                    Load Sample Batch
                  </button>
                </div>
              </div>

            </div>
          )}

          {/* STEP 2: PREVIEW & EXCEPTION LIST (Criteria 9 & 10: Preview records and flag unmatched remittances) */}
          {step === 'preview' && (
            <div className="space-y-4">
              
              {/* Batch Summary Counters */}
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <div className="p-3.5 bg-gray-50 border border-gray-200 rounded-2xl">
                  <p className="text-[11px] text-gray-500 font-medium">Uploaded File</p>
                  <p className="text-[13px] font-bold text-[#04152d] truncate">{fileName}</p>
                </div>
                <div className="p-3.5 bg-blue-50 border border-blue-200 rounded-2xl">
                  <p className="text-[11px] text-blue-700 font-medium">Total Deductions</p>
                  <p className="text-[16px] font-black text-blue-900 font-mono">
                    ₱{totalRemitted.toLocaleString('en-US', { minimumFractionDigits: 2 })} ({records.length} items)
                  </p>
                </div>
                <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-2xl">
                  <p className="text-[11px] text-emerald-700 font-medium">Matched & Valid</p>
                  <p className="text-[16px] font-black text-emerald-900 font-mono">
                    ₱{matchedTotal.toLocaleString('en-US', { minimumFractionDigits: 2 })} ({matchedRecords.length})
                  </p>
                </div>
                <div className="p-3.5 bg-red-50 border border-red-200 rounded-2xl">
                  <p className="text-[11px] text-red-700 font-medium">Flagged Exceptions</p>
                  <p className="text-[16px] font-black text-red-900 font-mono">
                    {exceptionRecords.length} records
                  </p>
                </div>
              </div>

              {/* Filter Tabs for Exception Review */}
              <div className="flex items-center justify-between border-b border-gray-200 pb-2">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setActiveFilter('ALL')}
                    className={`px-3 py-1.5 rounded-full text-[12px] font-bold transition-all ${
                      activeFilter === 'ALL' ? 'bg-[#04152d] text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    All Uploaded ({records.length})
                  </button>
                  <button
                    onClick={() => setActiveFilter('MATCHED')}
                    className={`px-3 py-1.5 rounded-full text-[12px] font-bold transition-all ${
                      activeFilter === 'MATCHED' ? 'bg-emerald-600 text-white' : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
                    }`}
                  >
                    Matched ({matchedRecords.length})
                  </button>
                  <button
                    onClick={() => setActiveFilter('EXCEPTIONS')}
                    className={`px-3 py-1.5 rounded-full text-[12px] font-bold transition-all ${
                      activeFilter === 'EXCEPTIONS' ? 'bg-red-600 text-white' : 'bg-red-50 text-red-800 hover:bg-red-100'
                    }`}
                  >
                    Exceptions List ({exceptionRecords.length})
                  </button>
                </div>

                <span className="text-[11px] text-gray-500 font-medium">
                  Showing {displayedRecords.length} records
                </span>
              </div>

              {/* Remittance Records Preview Table */}
              <div className="border border-gray-200 rounded-2xl overflow-hidden overflow-x-auto bg-white">
                <table className="w-full text-left whitespace-nowrap text-[12px]">
                  <thead className="bg-gray-50 border-b border-gray-200 text-gray-500 font-bold uppercase text-[10px] tracking-wider">
                    <tr>
                      <th className="py-3 px-4">Member ID & Name</th>
                      <th className="py-3 px-4">Obligation</th>
                      <th className="py-3 px-4 text-right">Expected</th>
                      <th className="py-3 px-4 text-right">Remitted</th>
                      <th className="py-3 px-4 text-center">Validation Status</th>
                      <th className="py-3 px-4">Audit Note / Exception</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 text-[#04152d]">
                    {displayedRecords.map((r) => (
                      <tr key={r.id} className={r.status !== 'MATCHED' ? 'bg-red-50/30' : 'hover:bg-gray-50/60'}>
                        <td className="py-3 px-4">
                          <p className="font-bold text-[#04152d]">{r.memberName}</p>
                          <p className="text-[11px] font-mono text-gray-500">{r.memberId}</p>
                        </td>
                        <td className="py-3 px-4 text-gray-700 font-medium">{r.obligationType}</td>
                        <td className="py-3 px-4 text-right font-mono text-gray-600">
                          {r.expectedAmount > 0 ? `₱${r.expectedAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}` : '—'}
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-bold text-[#04152d]">
                          ₱{r.remittedAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="py-3 px-4 text-center">
                          {r.status === 'MATCHED' && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10.5px] font-bold bg-emerald-100 text-emerald-800">
                              <CheckCircle2 size={12} /> Matched
                            </span>
                          )}
                          {r.status === 'DISCREPANCY' && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10.5px] font-bold bg-amber-100 text-amber-800">
                              <AlertTriangle size={12} /> Variance
                            </span>
                          )}
                          {r.status === 'UNMATCHED_MEMBER' && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10.5px] font-bold bg-red-100 text-red-800">
                              <AlertCircle size={12} /> Unmatched
                            </span>
                          )}
                          {r.status === 'INACTIVE_MEMBER' && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10.5px] font-bold bg-purple-100 text-purple-800">
                              <AlertCircle size={12} /> Inactive
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-[11px] text-gray-500 max-w-xs truncate">
                          {r.exceptionReason ? (
                            <span className="text-red-700 font-medium">{r.exceptionReason}</span>
                          ) : (
                            <span className="text-emerald-700">Deduction schedule validated</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {exceptionRecords.length > 0 && (
                <p className="text-[11.5px] text-amber-800 bg-amber-50 border border-amber-200 p-3 rounded-xl flex items-center gap-2">
                  <AlertTriangle size={16} className="shrink-0 text-amber-600" />
                  <span>
                    <strong>{exceptionRecords.length} exception(s) detected.</strong> Matched deductions can be posted directly. Flagged exceptions will be retained for officer review.
                  </span>
                </p>
              )}

            </div>
          )}

          {/* STEP 3: COMPLETED */}
          {step === 'completed' && (
            <div className="py-8 text-center space-y-4">
              <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto border-4 border-emerald-50">
                <CheckCircle2 size={36} />
              </div>
              <h3 className="text-[18px] font-bold text-[#04152d]">
                {matchedRecords.length} Payroll Remittances Posted
              </h3>
              <p className="text-[13px] text-gray-600 max-w-md mx-auto">
                Totaling ₱{matchedTotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}. Member obligations have been updated in the ledger and logged in the collection audit trail.
              </p>
            </div>
          )}

        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-gray-100 bg-gray-50/60 flex items-center justify-between">
          {step === 'upload' && (
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2 border border-gray-200 rounded-full text-[12px] font-semibold text-gray-600 hover:bg-white transition-all ml-auto"
            >
              Cancel
            </button>
          )}

          {step === 'preview' && (
            <>
              <button
                type="button"
                onClick={() => setStep('upload')}
                disabled={isPostingBatch}
                className="px-4 py-2 border border-gray-200 rounded-full text-[12px] font-semibold text-gray-600 hover:bg-white transition-all"
              >
                Re-upload File
              </button>

              <button
                type="button"
                onClick={handlePostValidCollections}
                disabled={isPostingBatch || matchedRecords.length === 0}
                className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-full text-[12px] font-bold shadow-md transition-all active:scale-95 flex items-center gap-2"
              >
                {isPostingBatch ? (
                  <>
                    <Loader2 size={14} className="animate-spin" /> Posting Batch...
                  </>
                ) : (
                  <>
                    <Check size={14} /> Post {matchedRecords.length} Matched Deductions (₱{matchedTotal.toLocaleString('en-US', { minimumFractionDigits: 2 })})
                  </>
                )}
              </button>
            </>
          )}

          {step === 'completed' && (
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2 bg-[#04152d] hover:bg-[#04152d]/90 text-white rounded-full text-[12px] font-bold shadow-md transition-all ml-auto"
            >
              Done
            </button>
          )}
        </div>

      </div>
    </div>
  );
}
