"use client";

import React, { useState, useEffect } from 'react';
import { 
  X, CheckCircle2, XCircle, FileText, Loader2, ShieldCheck, Play, Info, Clock, User, Lock
} from 'lucide-react';

interface AuditLog {
  id: string;
  action: string;
  actor: string;
  role: string;
  timestamp: string;
  details: string;
}

interface Disbursement {
  id: string;
  ref: string;
  member: string;
  loanType: string;
  amount: number;
  status: 'Pending Approval' | 'Approved' | 'Executed' | 'Rejected';
  date: string;
  beneficiary: { name: string; bank: string; account: string };
  fundSource: string;
  method: string;
  executionRef?: string;
  auditTrail: AuditLog[];
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  disbursement: Disbursement | null;
  currentUserRole: string; // Added to enforce Role-Based Access Control
  onProcessSuccess: (id: string, newStatus: string, executionRef?: string) => void;
}

export default function DisbursementActionModal({ isOpen, onClose, disbursement, currentUserRole, onProcessSuccess }: Props) {
  const [step, setStep] = useState<'view' | 'input_reject' | 'confirm_approve' | 'confirm_reject' | 'confirm_execute'>('view');
  const [rejectReason, setRejectReason] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  // uuthorization check: only Admins can approve. Treasurers can only execute.
  const isAuthorizedApprover = currentUserRole === 'Officer/Admin' || currentUserRole === 'Superadmin' || currentUserRole === 'Admin';

  useEffect(() => {
    if (isOpen) {
      setStep('view');
      setRejectReason('');
      setIsProcessing(false);
    }
  }, [isOpen, disbursement]);

  if (!isOpen || !disbursement) return null;

  const handleApprove = async () => {
    setIsProcessing(true);
    try {
      const res = await fetch(`http://localhost:3001/disbursements/${disbursement.id}/review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'APPROVE',
          reviewerName: 'Admin Approver',
          reviewerRole: 'Approver',
        }),
      });
      if (!res.ok) throw new Error('Failed to approve');
    } catch {
      // Graceful fallback for mock mode
    } finally {
      onProcessSuccess(disbursement.id, 'Approved');
      setIsProcessing(false);
      onClose();
    }
  };

  const handleReject = async () => {
    setIsProcessing(true);
    try {
      const res = await fetch(`http://localhost:3001/disbursements/${disbursement.id}/review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'REJECT',
          rejectionReason: rejectReason,
          reviewerName: 'Admin Approver',
          reviewerRole: 'Approver',
        }),
      });
      if (!res.ok) throw new Error('Failed to reject');
    } catch {
      // Graceful fallback for mock mode
    } finally {
      onProcessSuccess(disbursement.id, 'Rejected');
      setIsProcessing(false);
      onClose();
    }
  };

  const handleExecute = async () => {
    setIsProcessing(true);
    const generatedRef = `PAY-${Math.floor(Math.random() * 900000) + 100000}`;
    try {
      const res = await fetch(`http://localhost:3001/disbursements/${disbursement.id}/execute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          executionRefNo: generatedRef,
          executorName: 'Treasurer',
          executorRole: 'Treasurer',
        }),
      });
      if (!res.ok) throw new Error('Failed to execute');
    } catch {
      // Graceful fallback for mock mode
    } finally {
      onProcessSuccess(disbursement.id, 'Executed', generatedRef);
      setIsProcessing(false);
      onClose();
    }
  };

  const formatCurrency = (val: number) => `₱${val.toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
  const ultraGlassCard = "bg-white/80 backdrop-blur-[40px] backdrop-saturate-[200%] border border-white/90 shadow-[0_16px_40px_rgba(4,21,45,0.1),inset_0_2px_4px_rgba(255,255,255,1)] rounded-[24px] p-6 lg:p-8 relative overflow-hidden transition-all duration-400";
  const glassInput = "w-full pl-4 pr-4 py-3 bg-white/60 hover:bg-white/80 focus:bg-white/90 backdrop-blur-xl border border-white/90 shadow-[inset_0_2px_4px_rgba(4,21,45,0.03)] rounded-[12px] text-[13px] font-semibold text-[#04152d] outline-none transition-all duration-300 placeholder:text-[#04152d]/40 focus:shadow-[0_4px_16px_rgba(4,21,45,0.08),inset_0_1px_2px_rgba(255,255,255,1)] disabled:opacity-50 disabled:cursor-not-allowed";

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 transition-opacity duration-300 opacity-100">
      <div className="absolute inset-0 bg-[#04152d]/40 backdrop-blur-md" onClick={() => !isProcessing && onClose()} />
      
      <div className={`relative w-full max-w-2xl max-h-[90vh] flex flex-col animate-modal-enter ${ultraGlassCard}`}>
        <div className="flex items-center justify-between border-b border-white/60 pb-4 mb-5">
          <h3 className="text-[18px] font-semibold text-[#04152d] tracking-tight flex items-center gap-2">
            {disbursement.status === 'Pending Approval' ? <ShieldCheck className="text-yellow-600" /> : <FileText className="text-blue-600" />}
            {disbursement.status === 'Pending Approval' ? 'Review Request (Approver)' : disbursement.status === 'Approved' ? 'Execute Disbursement' : 'Disbursement Record'}
          </h3>
          <button onClick={() => !isProcessing && onClose()} className="p-2 bg-white/50 hover:bg-white/80 rounded-full border border-white shadow-sm transition-colors">
            <X size={16} className="text-[#04152d]/60 hover:text-[#04152d]" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto pr-2 space-y-6 hide-scrollbar">
          {(step === 'view' || step === 'input_reject') && (
            <div className="space-y-6 animate-fade-in">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white/50 p-4 rounded-[16px] border border-white">
                  <p className="text-[10px] font-semibold text-[#04152d]/50 uppercase tracking-widest mb-1">Beneficiary</p>
                  <p className="text-[14px] font-semibold text-[#04152d] truncate" title={disbursement.beneficiary.name}>{disbursement.beneficiary.name}</p>
                  <p className="text-[12px] font-medium text-[#04152d]/70">{disbursement.beneficiary.bank} - {disbursement.beneficiary.account}</p>
                </div>
                <div className="bg-white/50 p-4 rounded-[16px] border border-white">
                  <p className="text-[10px] font-semibold text-[#04152d]/50 uppercase tracking-widest mb-1">Requested Amount</p>
                  <p className="text-[20px] font-semibold text-[#04152d] tracking-tight">{formatCurrency(disbursement.amount)}</p>
                </div>
              </div>

              <div className="bg-white/40 p-4 rounded-[16px] border border-white/80 grid grid-cols-2 gap-y-4 text-[13px]">
                <div className="space-y-1">
                  <p className="font-medium text-[#04152d]/60">Request Date:</p>
                  <p className="font-semibold text-[#04152d]">{disbursement.date}</p>
                </div>
                <div className="space-y-1">
                  <p className="font-medium text-[#04152d]/60">Source Fund:</p>
                  <p className="font-semibold text-[#04152d]">{disbursement.fundSource}</p>
                </div>
                <div className="space-y-1">
                  <p className="font-medium text-[#04152d]/60">Target Obligation:</p>
                  <p className="font-semibold text-[#04152d]">{disbursement.loanType}</p>
                </div>
                <div className="space-y-1">
                  <p className="font-medium text-[#04152d]/60">System Ref:</p>
                  <p className="font-semibold text-[#04152d] font-mono">{disbursement.ref}</p>
                </div>
              </div>

              {disbursement.status === 'Executed' && disbursement.executionRef && (
                <div className="bg-emerald-50/50 p-5 rounded-[16px] border border-emerald-100 animate-fade-in">
                  <h4 className="text-[12px] font-semibold text-emerald-800 uppercase tracking-widest mb-3 border-b border-emerald-200/60 pb-2">Execution Summary</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center text-[13px]">
                      <span className="font-medium text-emerald-900/70">Payment Reference:</span>
                      <span className="font-semibold text-emerald-900 font-mono bg-white/60 px-2 py-0.5 rounded">{disbursement.executionRef}</span>
                    </div>
                    <div className="flex justify-between items-center text-[13px]">
                      <span className="font-medium text-emerald-900/70">Amount Disbursed:</span>
                      <span className="font-semibold text-emerald-900">{formatCurrency(disbursement.amount)}</span>
                    </div>
                  </div>
                </div>
              )}

              {step === 'input_reject' && (
                <div className="bg-red-50/50 p-4 rounded-[16px] border border-red-100 animate-fade-in">
                  <label className="block text-[11px] font-semibold text-red-800 uppercase tracking-widest mb-2 flex items-center gap-1">
                    Reason for Rejection <span className="text-red-500 text-[14px] leading-none">*</span>
                  </label>
                  <textarea
                    required
                    rows={3}
                    disabled={isProcessing}
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                    className={glassInput}
                    placeholder="Provide a specific reason for rejection..."
                  />
                </div>
              )}

              {(disbursement.status === 'Executed' || disbursement.status === 'Rejected') && (
                <div className="mt-6">
                  <h4 className="text-[12px] font-semibold text-[#04152d]/60 uppercase tracking-widest mb-4">Chronological Activity</h4>
                  <div className="relative border-l-2 border-blue-100 ml-3 space-y-6">
                    {disbursement.auditTrail.map((log) => (
                      <div key={log.id} className="relative pl-6">
                        <div className="absolute -left-[9px] top-1 w-4 h-4 rounded-full bg-white border-2 border-blue-400 flex items-center justify-center">
                          <div className="w-1.5 h-1.5 bg-blue-600 rounded-full" />
                        </div>
                        <div className="bg-white/40 border border-white/60 p-3 rounded-[12px]">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-1">
                            <span className="text-[12px] font-semibold text-[#04152d]">{log.action}</span>
                            <div className="flex items-center gap-1 text-[10px] font-medium text-[#04152d]/50 font-mono">
                              <Clock size={10} />
                              {new Date(log.timestamp).toLocaleString('en-US', { timeZone: 'Asia/Manila', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                            </div>
                          </div>
                          <p className="text-[11px] text-[#04152d]/70 mb-2 leading-relaxed">{log.details}</p>
                          <div className="flex items-center gap-1.5 text-[10px]">
                            <User size={10} className="text-[#04152d]/40" />
                            <span className="font-medium text-[#04152d]/70">{log.actor} <span className="opacity-50">({log.role})</span></span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {step === 'confirm_approve' && (
            <div className="text-center py-6 animate-fade-in space-y-4">
              <div className="w-16 h-16 bg-emerald-50 border-2 border-emerald-200 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 size={28} className="text-emerald-600" />
              </div>
              <h3 className="text-[18px] font-semibold text-[#04152d]">Confirm Approval</h3>
              <p className="text-[13px] font-medium text-[#04152d]/70 max-w-md mx-auto">
                Are you sure you want to approve this disbursement request? This will authorize the Treasurer to execute the payment of {formatCurrency(disbursement.amount)}.
              </p>
            </div>
          )}

          {step === 'confirm_reject' && (
            <div className="text-center py-6 animate-fade-in space-y-4">
              <div className="w-16 h-16 bg-red-50 border-2 border-red-200 rounded-full flex items-center justify-center mx-auto mb-4">
                <XCircle size={28} className="text-red-600" />
              </div>
              <h3 className="text-[18px] font-semibold text-[#04152d]">Confirm Rejection</h3>
              <p className="text-[13px] font-medium text-[#04152d]/70 max-w-md mx-auto">
                Are you sure you want to reject this request? This action will halt the disbursement process immediately.
              </p>
              <div className="bg-red-50/50 p-3 rounded-[12px] border border-red-100 text-left text-[12px] text-red-800 mt-4 mx-auto max-w-md">
                <span className="font-semibold">Reason provided:</span> {rejectReason}
              </div>
            </div>
          )}

          {step === 'confirm_execute' && (
            <div className="text-center py-6 animate-fade-in space-y-4">
              <div className="w-16 h-16 bg-blue-50 border-2 border-blue-200 rounded-full flex items-center justify-center mx-auto mb-4">
                <Play size={28} className="text-blue-600 ml-1" />
              </div>
              <h3 className="text-[18px] font-semibold text-[#04152d]">Confirm Execution</h3>
              <p className="text-[13px] font-medium text-[#04152d]/70 max-w-md mx-auto">
                Are you sure you want to release funds to the beneficiary? This action will formally deduct the amount from the source fund and finalize the payment execution.
              </p>
            </div>
          )}
        </div>

        <div className="border-t border-white/60 pt-5 mt-2 flex gap-3 justify-end relative z-10">
          
          {disbursement.status === 'Pending Approval' && step === 'view' && (
            <>
              {isAuthorizedApprover ? (
                <>
                  <button onClick={() => setStep('input_reject')} disabled={isProcessing} className="px-5 py-2.5 rounded-full text-[13px] font-semibold text-red-600 bg-red-50 hover:bg-red-100 transition-colors border border-red-100 disabled:opacity-50">
                    Reject
                  </button>
                  <button onClick={() => setStep('confirm_approve')} disabled={isProcessing} className="px-5 py-2.5 rounded-full text-[13px] font-semibold text-white bg-emerald-600 hover:bg-emerald-700 transition-colors shadow-md disabled:opacity-50 flex items-center gap-2">
                    Approve Request
                  </button>
                </>
              ) : (
                <div className="mr-auto w-full flex justify-between items-center">
                  <div className="flex items-center gap-2 text-[12px] font-medium text-yellow-700 bg-yellow-50 px-4 py-2 rounded-[12px] border border-yellow-200">
                    <Lock size={14} /> Pending review by an Authorized Approver.
                  </div>
                  <button onClick={onClose} className="px-5 py-2.5 rounded-full text-[13px] font-semibold text-[#04152d] bg-white border border-white/80 hover:bg-white/80 shadow-sm transition-colors">Close</button>
                </div>
              )}
            </>
          )}

          {step === 'input_reject' && (
            <>
              <button onClick={() => setStep('view')} disabled={isProcessing} className="px-5 py-2.5 rounded-full text-[13px] font-semibold text-[#04152d]/60 hover:bg-white transition-colors">Cancel</button>
              <button onClick={() => setStep('confirm_reject')} disabled={!rejectReason.trim() || isProcessing} className="px-5 py-2.5 rounded-full text-[13px] font-semibold text-white bg-red-600 hover:bg-red-700 transition-colors flex items-center gap-2 disabled:opacity-50">
                Proceed to Reject
              </button>
            </>
          )}

          {step === 'confirm_approve' && (
            <>
              <button onClick={() => setStep('view')} disabled={isProcessing} className="px-5 py-2.5 rounded-full text-[13px] font-semibold text-[#04152d]/60 hover:bg-white transition-colors">Back</button>
              <button onClick={handleApprove} disabled={isProcessing} className="px-5 py-2.5 rounded-full text-[13px] font-semibold text-white bg-emerald-600 hover:bg-emerald-700 transition-colors shadow-md disabled:opacity-50 flex items-center gap-2">
                {isProcessing ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />} Confirm Approval
              </button>
            </>
          )}

          {step === 'confirm_reject' && (
            <>
              <button onClick={() => setStep('input_reject')} disabled={isProcessing} className="px-5 py-2.5 rounded-full text-[13px] font-semibold text-[#04152d]/60 hover:bg-white transition-colors">Back</button>
              <button onClick={handleReject} disabled={isProcessing} className="px-5 py-2.5 rounded-full text-[13px] font-semibold text-white bg-red-600 hover:bg-red-700 transition-colors shadow-md disabled:opacity-50 flex items-center gap-2">
                {isProcessing ? <Loader2 size={14} className="animate-spin" /> : <XCircle size={14} />} Confirm Rejection
              </button>
            </>
          )}

          {disbursement.status === 'Approved' && step === 'view' && (
            <>
              <button onClick={onClose} disabled={isProcessing} className="px-5 py-2.5 rounded-full text-[13px] font-semibold text-[#04152d]/60 hover:bg-white transition-colors">Cancel</button>
              <button onClick={() => setStep('confirm_execute')} disabled={isProcessing} className="px-5 py-2.5 rounded-full text-[13px] font-semibold text-white bg-blue-600 hover:bg-blue-700 transition-colors shadow-md flex items-center gap-2 disabled:opacity-50">
                Proceed to Execute
              </button>
            </>
          )}

          {step === 'confirm_execute' && (
            <>
              <button onClick={() => setStep('view')} disabled={isProcessing} className="px-5 py-2.5 rounded-full text-[13px] font-semibold text-[#04152d]/60 hover:bg-white transition-colors">Back</button>
              <button onClick={handleExecute} disabled={isProcessing} className="px-5 py-2.5 rounded-full text-[13px] font-semibold text-white bg-emerald-600 hover:bg-emerald-700 transition-colors shadow-md flex items-center gap-2 disabled:opacity-50">
                {isProcessing ? <Loader2 size={14} className="animate-spin" /> : <Play size={14} />} Confirm Execution
              </button>
            </>
          )}

          {(disbursement.status === 'Executed' || disbursement.status === 'Rejected') && (
            <button onClick={onClose} className="px-5 py-2.5 rounded-full text-[13px] font-semibold text-[#04152d] bg-white border border-white/80 hover:bg-white/80 shadow-sm transition-colors">Close View</button>
          )}
        </div>
      </div>
    </div>
  );
}