"use client";

import React, { useState } from 'react';
import {
  X,
  FileText,
  Download,
  Shield,
  Clock,
  ArrowRight,
  User,
  Banknote,
  CreditCard,
  Building2,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';

interface AuditLog {
  id: string;
  action: string;
  actor: string;
  role: string;
  timestamp: string;
  details: string;
}

interface DisbursementAuditData {
  id: string;
  ref: string;
  member?: string;
  payee?: string;
  loanType?: string;
  category?: string;
  type?: string;
  amount: number;
  status: string;
  date: string;
  beneficiary?: { name: string; bank: string; account: string };
  fundSource: string;
  method?: string;
  paymentMethod?: string;
  executionRef?: string;
  supportingDocRef?: string;
  chequeNumber?: string;
  chequeStatus?: 'Issued' | 'Encashed' | 'Cancelled/Void';
  chequeRecord?: {
    chequeNumber: string;
    chequeDate: string;
    payee: string;
    amount: number;
    purpose: string;
    relatedReference: string;
    status: 'Issued' | 'Encashed' | 'Cancelled/Void';
  };
  auditTrail?: AuditLog[];
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  disbursement: DisbursementAuditData | null;
  showToast?: (message: string, type: 'success' | 'info' | 'error') => void;
}

export default function DisbursementAuditModal({
  isOpen,
  onClose,
  disbursement,
  showToast
}: Props) {
  const [activeTab, setActiveTab] = useState<'details' | 'timeline'>('details');

  if (!isOpen || !disbursement) return null;

  const payeeName = disbursement.payee || disbursement.member || 'Member / Payee';
  const categoryName = disbursement.category || disbursement.loanType || 'Disbursement';
  const paymentMethod = disbursement.paymentMethod || disbursement.method || 'Bank Transfer';
  const chequeStatus =
    disbursement.chequeStatus || disbursement.chequeRecord?.status || 'Issued';
  const chequeNumber =
    disbursement.chequeNumber || disbursement.chequeRecord?.chequeNumber;

  const logs = disbursement.auditTrail || [
    {
      id: 'log-1',
      action: 'Disbursement Recorded & Funds Released',
      actor: 'Disbursing Officer',
      role: 'Disbursing Officer',
      timestamp: new Date().toISOString(),
      details: `Disbursed ₱${disbursement.amount.toLocaleString()} under reference ${
        disbursement.ref
      }.`
    }
  ];

  const formatCurrency = (val: number) =>
    `₱${val.toLocaleString('en-US', { minimumFractionDigits: 2 })}`;

  const handleExportLog = () => {
    const logContent =
      `DISBURSEMENT AUDIT LOG - ${disbursement.ref}\n` +
      `Payee: ${payeeName}\n` +
      `Amount: ${formatCurrency(disbursement.amount)}\n` +
      `Fund Source: ${disbursement.fundSource}\n` +
      `Date: ${disbursement.date}\n` +
      `Generated on: ${new Date().toISOString()}\n\n` +
      logs
        .map(
          (log) =>
            `[${new Date(log.timestamp).toLocaleString('en-US', {
              timeZone: 'Asia/Manila'
            })}] ${log.action}\nDetails: ${log.details}\nActor: ${log.actor} (${log.role})\n`
        )
        .join('\n----------------------------------------\n\n');

    const blob = new Blob([logContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Disbursement_Audit_${disbursement.ref}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    if (showToast) {
      showToast(`Audit log for ${disbursement.ref} successfully downloaded.`, 'success');
    }
  };

  const ultraGlassCard =
    'bg-white/85 backdrop-blur-[40px] backdrop-saturate-[200%] border border-white/90 shadow-[0_16px_40px_rgba(4,21,45,0.1),inset_0_2px_4px_rgba(255,255,255,1)] rounded-[24px] p-6 lg:p-8 relative overflow-hidden transition-all duration-400';

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 transition-opacity duration-300 opacity-100">
      <div className="absolute inset-0 bg-[#04152d]/40 backdrop-blur-md" onClick={onClose} />

      <div
        className={`relative w-full max-w-3xl max-h-[90vh] flex flex-col animate-modal-enter ${ultraGlassCard}`}
      >
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-white/60 pb-4 mb-4 gap-4">
          <div>
            <h3 className="text-[18px] font-semibold text-[#04152d] tracking-tight flex items-center gap-2">
              <Shield className="text-blue-600" size={20} />
              Disbursement Audit & Voucher View
            </h3>
            <div className="flex items-center gap-2 mt-1.5">
              <span className="px-2 py-0.5 bg-gray-100 border border-gray-200 rounded text-[10px] font-semibold text-gray-700 uppercase tracking-widest">
                Read-Only Audit Access
              </span>
              <span className="text-[12px] font-medium text-[#04152d]/60">
                Ref: <span className="font-mono text-blue-700 font-bold">{disbursement.ref}</span>
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 absolute top-6 right-6 sm:relative sm:top-0 sm:right-0">
            <button
              onClick={handleExportLog}
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-white border border-white/80 shadow-sm hover:shadow text-[11px] font-semibold text-[#04152d]/70 hover:text-[#04152d] rounded-md transition-all active:scale-95"
            >
              <Download size={14} /> Export Log
            </button>
            <button
              onClick={onClose}
              className="p-2 bg-white/50 hover:bg-white/80 rounded-full border border-white shadow-sm transition-colors"
            >
              <X size={16} className="text-[#04152d]/60 hover:text-[#04152d]" />
            </button>
          </div>
        </div>

        {/* Tab switch */}
        <div className="flex items-center gap-4 border-b border-white/60 mb-5 px-1">
          <button
            onClick={() => setActiveTab('details')}
            className={`pb-3 text-[13px] font-semibold transition-colors relative ${
              activeTab === 'details'
                ? 'text-blue-600'
                : 'text-[#04152d]/50 hover:text-[#04152d]/80'
            }`}
          >
            Transaction & Cheque Details
            {activeTab === 'details' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 rounded-t-full" />
            )}
          </button>
          <button
            onClick={() => setActiveTab('timeline')}
            className={`pb-3 text-[13px] font-semibold transition-colors relative ${
              activeTab === 'timeline'
                ? 'text-blue-600'
                : 'text-[#04152d]/50 hover:text-[#04152d]/80'
            }`}
          >
            Audit Trail ({logs.length})
            {activeTab === 'timeline' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 rounded-t-full" />
            )}
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto pr-2 hide-scrollbar">
          {activeTab === 'details' && (
            <div className="space-y-5 animate-fade-in text-[13px]">
              {/* Payee and Amount */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-white/60 p-4 rounded-[16px] border border-white shadow-sm">
                  <p className="text-[10px] font-bold text-[#04152d]/50 uppercase tracking-widest mb-1">
                    Payee / Recipient
                  </p>
                  <p className="text-[15px] font-bold text-[#04152d] truncate">{payeeName}</p>
                  <p className="text-[12px] font-medium text-[#04152d]/70 mt-0.5">
                    Category: {categoryName}
                  </p>
                </div>
                <div className="bg-white/60 p-4 rounded-[16px] border border-white shadow-sm">
                  <p className="text-[10px] font-bold text-[#04152d]/50 uppercase tracking-widest mb-1">
                    Disbursed Amount
                  </p>
                  <p className="text-[22px] font-bold text-emerald-700 tracking-tight">
                    {formatCurrency(disbursement.amount)}
                  </p>
                </div>
              </div>

              {/* Transaction Data */}
              <div className="bg-white/50 p-5 rounded-[16px] border border-white/80 space-y-3">
                <h4 className="text-[11px] font-bold text-[#04152d]/60 uppercase tracking-widest border-b border-white/60 pb-2">
                  Transaction Metadata
                </h4>
                <div className="grid grid-cols-2 gap-y-3">
                  <div>
                    <span className="text-[#04152d]/60 text-[11px] block">Disbursement Date:</span>
                    <span className="font-semibold text-[#04152d]">{disbursement.date}</span>
                  </div>
                  <div>
                    <span className="text-[#04152d]/60 text-[11px] block">Source Fund:</span>
                    <span className="font-semibold text-[#04152d]">{disbursement.fundSource}</span>
                  </div>
                  <div>
                    <span className="text-[#04152d]/60 text-[11px] block">Payment Release Method:</span>
                    <span className="font-semibold text-blue-900">{paymentMethod}</span>
                  </div>
                  <div>
                    <span className="text-[#04152d]/60 text-[11px] block">Status:</span>
                    <span className="inline-block px-2 py-0.5 rounded text-[11px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-800 border border-emerald-200">
                      {disbursement.status}
                    </span>
                  </div>
                </div>
              </div>

              {/* Task 8 & 9: Cheque Details if Cheque Payment */}
              {(paymentMethod === 'Cheque' || chequeNumber) && (
                <div className="bg-amber-50/70 p-5 rounded-[16px] border border-amber-200/80 space-y-3 animate-slide-up">
                  <div className="flex items-center justify-between border-b border-amber-200/60 pb-2">
                    <div className="flex items-center gap-2">
                      <CreditCard size={16} className="text-amber-700" />
                      <h4 className="text-[12px] font-bold text-amber-950 uppercase tracking-widest">
                        Linked Cheque Record
                      </h4>
                    </div>
                    {/* Task 9: Cheque Status Display */}
                    <div className="flex items-center gap-1.5">
                      <span className="text-[11px] text-amber-900/70 font-semibold">Cheque Status:</span>
                      <span
                        className={`px-2 py-0.5 rounded text-[11px] font-bold uppercase tracking-wider border ${
                          chequeStatus === 'Encashed'
                            ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                            : chequeStatus === 'Cancelled/Void'
                            ? 'bg-red-100 text-red-800 border-red-300'
                            : 'bg-amber-100 text-amber-900 border-amber-300'
                        }`}
                      >
                        {chequeStatus}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-amber-900/60 block">
                        Cheque Number
                      </span>
                      <span className="font-mono font-bold text-amber-950">
                        {chequeNumber || 'CHK-2026-9042'}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-bold text-amber-900/60 block">
                        Cheque Date
                      </span>
                      <span className="font-semibold text-amber-950">
                        {disbursement.chequeRecord?.chequeDate || disbursement.date}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-bold text-amber-900/60 block">
                        Cheque Payee
                      </span>
                      <span className="font-semibold text-amber-950">
                        {disbursement.chequeRecord?.payee || payeeName}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-bold text-amber-900/60 block">
                        Cheque Amount
                      </span>
                      <span className="font-bold text-amber-950">
                        {formatCurrency(disbursement.chequeRecord?.amount || disbursement.amount)}
                      </span>
                    </div>
                    <div className="col-span-2">
                      <span className="text-[10px] uppercase font-bold text-amber-900/60 block">
                        Related Reference
                      </span>
                      <span className="font-mono text-amber-950">
                        {disbursement.chequeRecord?.relatedReference ||
                          disbursement.supportingDocRef ||
                          disbursement.ref}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'timeline' && (
            <div className="p-4 animate-fade-in">
              <div className="relative border-l-2 border-blue-100 ml-3 space-y-6">
                {logs.map((log) => (
                  <div key={log.id} className="relative pl-6">
                    <div className="absolute -left-[9px] top-1 w-4 h-4 rounded-full bg-white border-2 border-blue-400 flex items-center justify-center">
                      <div className="w-1.5 h-1.5 bg-blue-600 rounded-full" />
                    </div>

                    <div className="bg-white/60 backdrop-blur-sm border border-white/80 shadow-sm p-4 rounded-[16px]">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                        <span className="text-[13px] font-semibold text-[#04152d]">
                          {log.action}
                        </span>
                        <div className="flex items-center gap-1 text-[11px] font-medium text-[#04152d]/50 font-mono">
                          <Clock size={12} />
                          {new Date(log.timestamp).toLocaleString('en-US', {
                            timeZone: 'Asia/Manila',
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </div>
                      </div>
                      <p className="text-[12px] text-[#04152d]/70 mb-3 leading-relaxed">
                        {log.details}
                      </p>

                      <div className="flex items-center gap-2 pt-3 border-t border-white/60 text-[11px]">
                        <User size={12} className="text-[#04152d]/40" />
                        <span className="font-medium text-[#04152d]/70">
                          Performed by:{' '}
                          <span className="font-semibold text-[#04152d]">{log.actor}</span>
                        </span>
                        <span className="px-1.5 py-0.5 bg-[#04152d]/5 rounded text-[#04152d]/60 uppercase tracking-widest text-[9px] ml-1 border border-white/80">
                          {log.role}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}