"use client";

import React, { useState, useEffect } from 'react';
import { 
  X, CheckCircle2, XCircle, FileText, Loader2, 
  ArrowRight, ShieldCheck, Info, Clock, User, Calculator
} from 'lucide-react';

interface AuditLog {
  id: string;
  action: string;
  actor: string;
  role: string;
  timestamp: string;
  details: string;
}

interface Collection {
  id: string;
  ref: string;
  memberId: string;
  memberName: string;
  amount: number;
  date: string;
  method: string;
  paymentRef: string;
  proofUrl: string;
  status: 'Pending' | 'For Verification' | 'Posted' | 'Rejected';
  isReconciled: boolean;
  rejectReason?: string;
  applicationData?: {
    obligationType: string;
    originalBalance: number;
    appliedAmount: number;
    remainingBalance: number;
    exceptionStatus: string;
  };
  auditTrail: AuditLog[];
}

const MOCK_OBLIGATIONS = [
  { id: 'ob1', memberId: 'MEM-2026-001', type: 'Annual Dues', outstandingBalance: 1500 },
  { id: 'ob2', memberId: 'MEM-2026-001', type: 'Emergency Loan', outstandingBalance: 5000 },
  { id: 'ob3', memberId: 'MEM-2026-003', type: 'Annual Dues', outstandingBalance: 1500 },
];

interface Props {
  isOpen: boolean;
  onClose: () => void;
  collection: Collection | null;
  onProcessSuccess: (id: string, newStatus: string) => void;
}

export default function TreasurerReviewModal({ isOpen, onClose, collection, onProcessSuccess }: Props) {
  const [step, setStep] = useState<'review' | 'rejecting' | 'apply' | 'confirm'>('review');
  const [activeTab, setActiveTab] = useState<'details' | 'timeline'>('details');
  const [isProcessing, setIsProcessing] = useState(false);
  
  const [rejectReasonInput, setRejectReasonInput] = useState('');
  const [selectedObligationId, setSelectedObligationId] = useState<string>('');
  
  const isCompleted = collection?.status === 'Posted' || collection?.status === 'Rejected';

  const availableObligations = MOCK_OBLIGATIONS.filter(o => o.memberId === collection?.memberId && o.outstandingBalance > 0);
  const selectedObligation = availableObligations.find(o => o.id === selectedObligationId);
  
  const appliedAmount = collection?.amount || 0;
  const outstandingBalance = selectedObligation?.outstandingBalance || 0;
  const remainingBalance = selectedObligation ? outstandingBalance - appliedAmount : 0;

  let exceptionStatus = 'Unapplied';
  if (selectedObligation) {
    if (remainingBalance > 0) exceptionStatus = 'Partial Payment';
    else if (remainingBalance < 0) exceptionStatus = 'Overpayment';
    else exceptionStatus = 'Exact Match';
  }

  useEffect(() => {
    if (isOpen) {
      setStep('review');
      setActiveTab('details');
      setRejectReasonInput('');
      setSelectedObligationId('');
      setIsProcessing(false);
    }
  }, [isOpen, collection]);

  if (!isOpen || !collection) return null;

  const handleClose = () => {
    if (isProcessing) return;
    onClose();
  };

  const handleReject = () => {
    if (!rejectReasonInput.trim()) return;
    setIsProcessing(true);
    setTimeout(() => {
      onProcessSuccess(collection.id, 'Rejected');
      setIsProcessing(false);
      handleClose();
    }, 1000);
  };

  const handlePost = () => {
    setIsProcessing(true);
    setTimeout(() => {
      onProcessSuccess(collection.id, 'Posted');
      setIsProcessing(false);
      handleClose();
    }, 1500);
  };

  const formatCurrency = (val: number) => `₱${val.toLocaleString('en-US', { minimumFractionDigits: 2 })}`;

  const ultraGlassCard = "bg-white/70 backdrop-blur-[40px] backdrop-saturate-[200%] border border-white/80 shadow-[0_16px_40px_rgba(4,21,45,0.1),inset_0_2px_4px_rgba(255,255,255,1)] rounded-[24px] p-6 lg:p-8 relative overflow-hidden transition-all duration-400";
  const glassInput = "w-full pl-4 pr-4 py-3 bg-white/60 hover:bg-white/80 focus:bg-white/90 backdrop-blur-xl border border-white/90 shadow-[inset_0_2px_4px_rgba(4,21,45,0.03)] rounded-[12px] text-[13px] font-semibold text-[#04152d] outline-none transition-all duration-300 placeholder:text-[#04152d]/40 focus:shadow-[0_4px_16px_rgba(4,21,45,0.08),inset_0_1px_2px_rgba(255,255,255,1)] disabled:opacity-50 disabled:cursor-not-allowed";

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 transition-opacity duration-300 opacity-100">
      <div className="absolute inset-0 bg-[#04152d]/40 backdrop-blur-md" onClick={handleClose} />
      
      <div className={`relative w-full max-w-2xl max-h-[90vh] flex flex-col animate-modal-enter ${ultraGlassCard}`}>
        <div className="flex items-center justify-between border-b border-white/60 pb-4 mb-5">
          <div>
            <h3 className="text-[18px] font-semibold text-[#04152d] tracking-tight flex items-center gap-2">
              {step === 'review' || step === 'rejecting' ? <FileText className="text-blue-600" /> : <ShieldCheck className="text-emerald-600" />}
              {isCompleted ? 'Collection Record View' : step === 'review' ? 'Verify Collection Details' : step === 'rejecting' ? 'Reject Collection' : step === 'apply' ? 'Apply Payment' : 'Confirm Posting'}
            </h3>
            {isCompleted && (
              <div className="flex items-center gap-2 mt-1.5">
                <span className="px-2 py-0.5 bg-gray-100 border border-gray-200 rounded text-[10px] font-semibold text-gray-600 uppercase tracking-widest">
                  Read-Only
                </span>
                <span className={`text-[11px] font-semibold uppercase tracking-widest ${collection.status === 'Posted' ? 'text-emerald-600' : 'text-red-600'}`}>
                  Status: {collection.status}
                </span>
              </div>
            )}
          </div>
          <button onClick={handleClose} disabled={isProcessing} className="p-2 bg-white/50 hover:bg-white/80 rounded-full border border-white shadow-sm disabled:opacity-50 transition-colors">
            <X size={16} className="text-[#04152d]/60 hover:text-[#04152d]" />
          </button>
        </div>

        {/* Tab Navigation (Only visible if the transaction is completed) */}
        {isCompleted && (
          <div className="flex items-center gap-4 border-b border-white/60 mb-5 px-1">
            <button 
              onClick={() => setActiveTab('details')}
              className={`pb-3 text-[13px] font-semibold transition-colors relative ${activeTab === 'details' ? 'text-blue-600' : 'text-[#04152d]/50 hover:text-[#04152d]/80'}`}
            >
              Transaction Details
              {activeTab === 'details' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 rounded-t-full" />}
            </button>
            <button 
              onClick={() => setActiveTab('timeline')}
              className={`pb-3 text-[13px] font-semibold transition-colors relative ${activeTab === 'timeline' ? 'text-blue-600' : 'text-[#04152d]/50 hover:text-[#04152d]/80'}`}
            >
              Audit Trail
              {activeTab === 'timeline' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 rounded-t-full" />}
            </button>
          </div>
        )}

        <div className="flex-1 overflow-y-auto pr-2 space-y-6 hide-scrollbar">
          
          {(activeTab === 'details' && (step === 'review' || step === 'rejecting')) && (
            <div className="space-y-6 animate-fade-in">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white/50 p-4 rounded-[16px] border border-white">
                  <p className="text-[10px] font-semibold text-[#04152d]/50 uppercase tracking-widest mb-1">Member Information</p>
                  <p className="text-[14px] font-semibold text-[#04152d]">{collection.memberName}</p>
                  <p className="text-[12px] font-medium text-[#04152d]/70">{collection.memberId}</p>
                </div>
                <div className="bg-white/50 p-4 rounded-[16px] border border-white">
                  <p className="text-[10px] font-semibold text-[#04152d]/50 uppercase tracking-widest mb-1">Collection Amount</p>
                  <p className="text-[20px] font-semibold text-blue-600 tracking-tight">{formatCurrency(collection.amount)}</p>
                </div>
              </div>

              <div className="bg-white/40 p-5 rounded-[16px] border border-white/80 grid grid-cols-2 gap-y-4 text-[13px]">
                <div className="space-y-1">
                  <p className="font-medium text-[#04152d]/60">Payment Date:</p>
                  <p className="font-semibold text-[#04152d]">{collection.date}</p>
                </div>
                <div className="space-y-1">
                  <p className="font-medium text-[#04152d]/60">Payment Method:</p>
                  <p className="font-semibold text-[#04152d]">{collection.method}</p>
                </div>
                <div className="space-y-1">
                  <p className="font-medium text-[#04152d]/60">Reference Number:</p>
                  <p className="font-semibold text-[#04152d] font-mono bg-white/60 inline-block px-2 py-0.5 rounded border border-white">{collection.paymentRef || 'N/A'}</p>
                </div>
                <div className="space-y-1">
                  <p className="font-medium text-[#04152d]/60">Proof of Payment:</p>
                  <a href={collection.proofUrl} target="_blank" rel="noreferrer" className="font-semibold text-blue-600 hover:underline flex items-center gap-1">
                    View Document <ArrowRight size={12} />
                  </a>
                </div>
              </div>

              {/* Read-Only: Display Rejection Reason if Rejected */}
              {collection.status === 'Rejected' && collection.rejectReason && (
                <div className="bg-red-50/50 p-4 rounded-[16px] border border-red-100 animate-fade-in">
                  <h4 className="text-[12px] font-semibold text-red-800 uppercase tracking-widest mb-2 flex items-center gap-1">
                    <XCircle size={14} /> Reason for Rejection
                  </h4>
                  <p className="text-[13px] text-red-900 leading-relaxed font-medium">{collection.rejectReason}</p>
                </div>
              )}

              {/* Read-Only: Display Application Data if Posted */}
              {collection.status === 'Posted' && collection.applicationData && (
                <div className="bg-emerald-50/50 p-5 rounded-[16px] border border-emerald-100 space-y-4 animate-fade-in">
                  <h4 className="text-[13px] font-semibold text-emerald-900 uppercase tracking-widest border-b border-emerald-200/60 pb-2 flex items-center gap-2">
                    <Calculator size={16} /> Payment Application Math
                  </h4>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center text-[13px]">
                      <span className="font-medium text-emerald-900/70">Target Obligation:</span>
                      <span className="font-semibold text-emerald-900">{collection.applicationData.obligationType}</span>
                    </div>
                    <div className="flex justify-between items-center text-[13px]">
                      <span className="font-medium text-emerald-900/70">Outstanding Balance:</span>
                      <span className="font-semibold text-emerald-900">{formatCurrency(collection.applicationData.originalBalance)}</span>
                    </div>
                    <div className="flex justify-between items-center text-[13px]">
                      <span className="font-medium text-emerald-900/70">Applied Amount:</span>
                      <span className="font-semibold text-emerald-700">- {formatCurrency(collection.applicationData.appliedAmount)}</span>
                    </div>
                    <div className="border-t border-emerald-200/60 pt-2 mt-2 flex justify-between items-center text-[14px]">
                      <span className="font-semibold text-emerald-900">Remaining Balance:</span>
                      <span className={`font-semibold tracking-tight ${collection.applicationData.remainingBalance < 0 ? 'text-red-600' : 'text-emerald-900'}`}>
                        {formatCurrency(collection.applicationData.remainingBalance < 0 ? 0 : collection.applicationData.remainingBalance)}
                      </span>
                    </div>
                  </div>
                  <div className="mt-4 p-3 rounded-[12px] bg-white/60 border border-white/80 flex items-center gap-2 text-[12px] font-medium text-[#04152d]">
                    <Info size={14} className="shrink-0 text-blue-500" />
                    Recorded Exception Status: <span className="font-semibold uppercase tracking-wide">{collection.applicationData.exceptionStatus}</span>
                  </div>
                </div>
              )}

              {/* Active Input: Rejection Reason (Only if not completed) */}
              {!isCompleted && step === 'rejecting' && (
                <div className="bg-red-50/50 p-4 rounded-[16px] border border-red-100 animate-fade-in">
                  <label className="block text-[11px] font-semibold text-red-800 uppercase tracking-widest mb-2 flex items-center gap-1">
                    Reason for Rejection <span className="text-red-500 text-[14px] leading-none">*</span>
                  </label>
                  <textarea
                    required
                    rows={3}
                    disabled={isProcessing}
                    value={rejectReasonInput}
                    onChange={(e) => setRejectReasonInput(e.target.value)}
                    className={glassInput}
                    placeholder="Provide a specific reason for rejection..."
                  />
                </div>
              )}
            </div>
          )}

          {/* Active Flow: Application Setup (Only if not completed) */}
          {!isCompleted && step === 'apply' && (
            <div className="space-y-6 animate-fade-in">
              <div className="bg-blue-50/50 p-5 rounded-[16px] border border-blue-100">
                <label className="block text-[11px] font-semibold text-blue-800 uppercase tracking-widest mb-2 flex items-center gap-1">
                  Select Financial Obligation <span className="text-red-500 text-[14px] leading-none">*</span>
                </label>
                <select
                  disabled={isProcessing}
                  value={selectedObligationId}
                  onChange={(e) => setSelectedObligationId(e.target.value)}
                  className={`${glassInput} cursor-pointer`}
                >
                  <option value="" disabled>Select target obligation</option>
                  <option value="unapplied">Keep as Unapplied / Deposit</option>
                  {availableObligations.map(o => (
                    <option key={o.id} value={o.id}>{o.type} (Balance: {formatCurrency(o.outstandingBalance)})</option>
                  ))}
                </select>
              </div>

              {selectedObligationId && selectedObligationId !== 'unapplied' && (
                <div className="bg-white/50 p-5 rounded-[16px] border border-white space-y-4">
                  <h4 className="text-[12px] font-semibold text-[#04152d]/60 uppercase tracking-widest mb-2 border-b border-white/60 pb-2">Application Math</h4>
                  <div className="flex justify-between items-center text-[13px]">
                    <span className="font-medium text-[#04152d]/70">Outstanding Balance:</span>
                    <span className="font-semibold text-[#04152d]">{formatCurrency(outstandingBalance)}</span>
                  </div>
                  <div className="flex justify-between items-center text-[13px]">
                    <span className="font-medium text-[#04152d]/70">Applied Amount:</span>
                    <span className="font-semibold text-emerald-600">- {formatCurrency(appliedAmount)}</span>
                  </div>
                  <div className="border-t border-white/60 pt-3 flex justify-between items-center text-[14px]">
                    <span className="font-semibold text-[#04152d]">Remaining Balance:</span>
                    <span className={`font-semibold tracking-tight ${remainingBalance < 0 ? 'text-red-600' : 'text-[#04152d]'}`}>
                      {formatCurrency(remainingBalance < 0 ? 0 : remainingBalance)}
                    </span>
                  </div>

                  <div className={`mt-4 p-3 rounded-[12px] flex items-center gap-2 text-[12px] font-medium border ${
                    exceptionStatus === 'Overpayment' ? 'bg-red-50 border-red-100 text-red-700' :
                    exceptionStatus === 'Partial Payment' ? 'bg-yellow-50 border-yellow-100 text-yellow-700' :
                    'bg-emerald-50 border-emerald-100 text-emerald-700'
                  }`}>
                    <Info size={14} className="shrink-0" />
                    Transaction yields an exception status of: <span className="font-semibold uppercase tracking-wide">{exceptionStatus}</span>
                  </div>
                </div>
              )}

              {selectedObligationId === 'unapplied' && (
                <div className="p-4 rounded-[12px] bg-yellow-50 border border-yellow-100 flex items-center gap-2 text-[12px] font-medium text-yellow-700">
                  <Info size={14} className="shrink-0" />
                  Transaction will be recorded with status: <span className="font-semibold uppercase tracking-wide">Unapplied</span>
                </div>
              )}
            </div>
          )}

          {/* Active Flow: Confirm Posting (Only if not completed) */}
          {!isCompleted && step === 'confirm' && (
            <div className="text-center py-6 animate-fade-in space-y-4">
              <div className="w-16 h-16 bg-blue-50 border-2 border-blue-200 rounded-full flex items-center justify-center mx-auto mb-4">
                <ShieldCheck size={32} className="text-blue-600" />
              </div>
              <h3 className="text-[18px] font-semibold text-[#04152d]">Confirm Posting</h3>
              <p className="text-[13px] font-medium text-[#04152d]/70 max-w-md mx-auto">
                You are about to finalize this collection and update the corresponding financial records. This action cannot be undone.
              </p>
            </div>
          )}

          {/* Read-Only: Audit Trail Timeline (Visible for completed transactions on timeline tab) */}
          {isCompleted && activeTab === 'timeline' && (
            <div className="p-4 animate-fade-in">
              <div className="relative border-l-2 border-blue-100 ml-3 space-y-6">
                {collection.auditTrail.map((log) => (
                  <div key={log.id} className="relative pl-6">
                    <div className="absolute -left-[9px] top-1 w-4 h-4 rounded-full bg-white border-2 border-blue-400 flex items-center justify-center">
                      <div className="w-1.5 h-1.5 bg-blue-600 rounded-full" />
                    </div>
                    <div className="bg-white/60 backdrop-blur-sm border border-white/80 shadow-sm p-4 rounded-[16px]">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                        <span className="text-[13px] font-semibold text-[#04152d]">{log.action}</span>
                        <div className="flex items-center gap-1 text-[11px] font-medium text-[#04152d]/50 font-mono">
                          <Clock size={12} />
                          {new Date(log.timestamp).toLocaleString('en-US', { timeZone: 'Asia/Manila', month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </div>
                      <p className="text-[12px] text-[#04152d]/70 mb-3 leading-relaxed">{log.details}</p>
                      
                      <div className="flex items-center gap-2 pt-3 border-t border-white/60 text-[11px]">
                        <User size={12} className="text-[#04152d]/40" />
                        <span className="font-medium text-[#04152d]/70">Performed by: <span className="font-semibold text-[#04152d]">{log.actor}</span></span>
                        <span className="px-1.5 py-0.5 bg-[#04152d]/5 rounded text-[#04152d]/60 uppercase tracking-widest text-[9px] ml-1 border border-white/80">{log.role}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>

        {/* Action Buttons (Intelligently Hidden if Completed) */}
        <div className="border-t border-white/60 pt-5 mt-2 flex gap-3 justify-end relative z-10">
          
          {/* If the transaction is completed, only allow closing the modal */}
          {isCompleted && (
            <button onClick={handleClose} className="px-5 py-2.5 rounded-full text-[13px] font-semibold text-[#04152d] bg-white border border-white/80 hover:bg-white/80 shadow-sm transition-colors">
              Close View
            </button>
          )}

          {/* Active Flow Buttons */}
          {!isCompleted && step === 'review' && (
            <>
              <button 
                onClick={() => setStep('rejecting')} 
                disabled={isProcessing}
                className="px-5 py-2.5 rounded-full text-[13px] font-semibold text-red-600 bg-red-50 hover:bg-red-100 transition-colors border border-red-100 disabled:opacity-50"
              >
                Reject
              </button>
              <button 
                onClick={() => setStep('apply')} 
                disabled={isProcessing}
                className="px-5 py-2.5 rounded-full text-[13px] font-semibold text-white bg-blue-600 hover:bg-blue-700 transition-colors shadow-md disabled:opacity-50 flex items-center gap-2"
              >
                Approve & Apply <ArrowRight size={14} />
              </button>
            </>
          )}

          {!isCompleted && step === 'rejecting' && (
            <>
              <button onClick={() => setStep('review')} disabled={isProcessing} className="px-5 py-2.5 rounded-full text-[13px] font-semibold text-[#04152d]/60 hover:bg-white transition-colors">Cancel</button>
              <button onClick={handleReject} disabled={!rejectReasonInput.trim() || isProcessing} className="px-5 py-2.5 rounded-full text-[13px] font-semibold text-white bg-red-600 hover:bg-red-700 transition-colors flex items-center gap-2 disabled:opacity-50">
                {isProcessing ? <Loader2 size={14} className="animate-spin" /> : <XCircle size={14} />} Confirm Rejection
              </button>
            </>
          )}

          {!isCompleted && step === 'apply' && (
            <>
              <button onClick={() => setStep('review')} disabled={isProcessing} className="px-5 py-2.5 rounded-full text-[13px] font-semibold text-[#04152d]/60 hover:bg-white transition-colors">Back</button>
              <button 
                onClick={() => setStep('confirm')} 
                disabled={!selectedObligationId || isProcessing} 
                className="px-5 py-2.5 rounded-full text-[13px] font-semibold text-white bg-[#04152d] hover:bg-[#04152d]/90 transition-colors flex items-center gap-2 disabled:opacity-50"
              >
                Proceed to Post <ArrowRight size={14} />
              </button>
            </>
          )}

          {!isCompleted && step === 'confirm' && (
            <>
              <button onClick={() => setStep('apply')} disabled={isProcessing} className="px-5 py-2.5 rounded-full text-[13px] font-semibold text-[#04152d]/60 hover:bg-white transition-colors">Back</button>
              <button onClick={handlePost} disabled={isProcessing} className="px-5 py-2.5 rounded-full text-[13px] font-semibold text-white bg-emerald-600 hover:bg-emerald-700 transition-colors shadow-md flex items-center gap-2 disabled:opacity-50">
                {isProcessing ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />} Post Collection
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}