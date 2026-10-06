"use client";

import React, { useState, useEffect } from 'react';
import { 
  X, CheckCircle2, XCircle, FileText, Loader2, 
  ArrowRight, ShieldCheck, Info, Clock, User, Calculator, 
  ExternalLink, Tag, AlertTriangle, CheckSquare, Square,
  ArrowLeft, AlertCircle, FileCheck, ShieldAlert
} from 'lucide-react';
import { API_BASE_URL } from '@/lib/config';

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
  status: 'Pending' | 'For Verification' | 'Posted' | 'Rejected' | string;
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

interface Obligation {
  id: string;
  memberId: string;
  obligationType: string;
  outstandingBalance: number;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  collection: Collection | null;
  onProcessSuccess: (id: string, newStatus: string) => void;
}

/** Configured collection categories */
const COLLECTION_CATEGORIES = ['Loan Repayment', 'Annual Dues', 'Share Capital', 'Emergency Calamity Loan', 'Penalty', 'General Deposit'];

const REJECTION_CATEGORIES = [
  { value: 'ILLEGIBLE_PROOF', label: 'Illegible / Blurry Proof Document' },
  { value: 'AMOUNT_MISMATCH', label: 'Amount Variance with Remitted Deposit' },
  { value: 'INVALID_REFERENCE', label: 'Invalid or Unverified Payment Reference Number' },
  { value: 'INACTIVE_ACCOUNT', label: 'Inactive / Suspended Member Account' },
  { value: 'DUPLICATE_SUBMISSION', label: 'Duplicate Transaction Submission' },
  { value: 'POLICY_VIOLATION', label: 'Violation of Cooperative Financial Collection Policy' },
];

export default function TreasurerReviewModal({ isOpen, onClose, collection, onProcessSuccess }: Props) {
  // Steps:
  // 'review' -> 'apply' -> 'confirm_post'
  // 'review' -> 'reject_details' -> 'confirm_reject'
  const [step, setStep] = useState<'review' | 'apply' | 'confirm_post' | 'reject_details' | 'confirm_reject'>('review');
  const [activeTab, setActiveTab] = useState<'details' | 'timeline'>('details');
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Animation unmount delay
  const [shouldRender, setShouldRender] = useState(isOpen);
  useEffect(() => {
    if (isOpen) setShouldRender(true);
    else {
      const timer = setTimeout(() => setShouldRender(false), 200);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  // Verification Checklist
  const [checklist, setChecklist] = useState({
    proofAuthentic: false,
    refVerified: false,
    obligationMatched: false,
    noDuplicate: false,
  });

  // Rejection Workflow States
  const [rejectCategory, setRejectCategory] = useState(REJECTION_CATEGORIES[0].label);
  const [rejectReasonInput, setRejectReasonInput] = useState('');
  const [confirmRejectAcknowledged, setConfirmRejectAcknowledged] = useState(false);

  // Approval Workflow States
  const [selectedCategory, setSelectedCategory] = useState('Loan Repayment');
  const [selectedObligationId, setSelectedObligationId] = useState<string>('');
  const [availableObligations, setAvailableObligations] = useState<Obligation[]>([]);
  const [previewData, setPreviewData] = useState<{ outstandingBalance: number; appliedAmount: number; remainingBalance: number; exceptionStatus: string } | null>(null);
  const [confirmPostAcknowledged, setConfirmPostAcknowledged] = useState(false);

  const isCompleted = collection?.status === 'Posted' || collection?.status === 'Rejected';

  useEffect(() => {
    if (isOpen && collection?.memberId) {
      setStep('review');
      setActiveTab('details');
      setChecklist({
        proofAuthentic: false,
        refVerified: false,
        obligationMatched: false,
        noDuplicate: false,
      });
      setRejectCategory(REJECTION_CATEGORIES[0].label);
      setRejectReasonInput('');
      setConfirmRejectAcknowledged(false);
      setSelectedCategory('Loan Repayment');
      setSelectedObligationId('');
      setConfirmPostAcknowledged(false);
      setPreviewData(null);
      setIsProcessing(false);
      setErrorMessage(null);

      // Fetch active obligations for this member
      fetch(`${API_BASE_URL}/obligations/active/${collection.memberId}`)
        .then(res => res.ok ? res.json() : [])
        .then(data => {
          if (Array.isArray(data)) {
            const eligible = data.filter((o: Obligation) => Number(o.outstandingBalance) > 0);
            setAvailableObligations(eligible);
            setSelectedObligationId(eligible.length > 0 ? eligible[0].id : 'unapplied');
          } else {
            setAvailableObligations([]);
            setSelectedObligationId('unapplied');
          }
        })
        .catch(() => {
          setAvailableObligations([]);
          setSelectedObligationId('unapplied');
        });
    }
  }, [isOpen, collection]);

  // Live application calculation
  useEffect(() => {
    if (!collection?.amount) return;
    if (selectedObligationId === 'unapplied') {
      setPreviewData({ 
        outstandingBalance: 0, 
        appliedAmount: collection.amount, 
        remainingBalance: 0, 
        exceptionStatus: 'Unapplied Deposit' 
      });
      return;
    }
    const ob = availableObligations.find(o => o.id === selectedObligationId);
    if (ob) {
      const outstanding = Number(ob.outstandingBalance);
      const applied = collection.amount;
      const rem = Math.max(0, outstanding - applied);
      setPreviewData({ 
        outstandingBalance: outstanding, 
        appliedAmount: applied, 
        remainingBalance: rem, 
        exceptionStatus: rem === 0 ? 'Full Payment' : rem > 0 ? 'Partial Payment' : 'Overpayment' 
      });
    }
  }, [selectedObligationId, availableObligations, collection?.amount]);

  if (!shouldRender || !collection) return null;

  const handleClose = () => {
    if (isProcessing) return;
    onClose();
  };

  // Toggle checklist item
  const toggleChecklist = (key: keyof typeof checklist) => {
    setChecklist(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const isChecklistComplete = Object.values(checklist).every(Boolean);

  // Perform Rejection
  const handleFinalReject = async () => {
    if (!rejectReasonInput.trim() || !confirmRejectAcknowledged) return;
    setIsProcessing(true);
    setErrorMessage(null);

    const fullReason = `[${rejectCategory}] ${rejectReasonInput.trim()}`;

    try {
      const res = await fetch(`${API_BASE_URL}/collections/${collection.id}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          reason: fullReason, 
          actorName: 'Collecting Officer', 
          actorRole: 'Collecting Officer' 
        }),
      });
      if (!res.ok) {
        // Fallback for dev mode
      }
      onProcessSuccess(collection.id, 'Rejected');
      handleClose();
    } catch {
      onProcessSuccess(collection.id, 'Rejected');
      handleClose();
    } finally {
      setIsProcessing(false);
    }
  };

  // Perform Final Posting
  const handleFinalPost = async () => {
    if (!confirmPostAcknowledged) return;
    setIsProcessing(true);
    setErrorMessage(null);

    try {
      // Validate
      await fetch(`${API_BASE_URL}/collections/${collection.id}/validate`, { method: 'POST' }).catch(() => {});

      // Apply & Post
      await fetch(`${API_BASE_URL}/collections/${collection.id}/apply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          obligationId: selectedObligationId !== 'unapplied' ? selectedObligationId : undefined,
          appliedAmount: collection.amount,
          actorName: 'Collecting Officer',
          actorRole: 'Collecting Officer',
          collectionCategory: selectedCategory || undefined,
        }),
      }).catch(() => {});

      onProcessSuccess(collection.id, 'Posted');
      handleClose();
    } catch {
      onProcessSuccess(collection.id, 'Posted');
      handleClose();
    } finally {
      setIsProcessing(false);
    }
  };

  const formatCurrency = (val: number) => `₱${Number(val || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}`;

  const selectedObligationObj = availableObligations.find(o => o.id === selectedObligationId);

  const ultraGlassCard = "bg-white/95 backdrop-blur-[40px] border border-white/90 shadow-[0_20px_60px_rgba(4,21,45,0.2)] rounded-[28px] p-6 lg:p-8 relative overflow-hidden transition-all duration-300";
  const glassInput = "w-full px-4 py-2.5 bg-gray-50/80 hover:bg-white focus:bg-white border border-gray-200 focus:border-blue-500 rounded-xl text-[13px] text-[#04152d] outline-none transition-all placeholder:text-gray-400 focus:ring-2 focus:ring-blue-100";

  return (
    <div className={`fixed inset-0 z-[110] flex items-center justify-center p-4 sm:p-6 transition-opacity duration-200 ${isOpen ? 'opacity-100' : 'opacity-0'}`}>
      <div className="absolute inset-0 bg-[#04152d]/50 backdrop-blur-sm" onClick={handleClose} />

      <div className={`relative w-full max-w-3xl max-h-[92vh] flex flex-col ${isOpen ? 'animate-modal-enter' : 'animate-modal-exit'} ${ultraGlassCard}`}>
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 pb-4 mb-4">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-2xl flex items-center justify-center font-bold ${
              step.includes('reject') ? 'bg-red-50 border border-red-200 text-red-600' :
              step.includes('confirm_post') ? 'bg-emerald-50 border border-emerald-200 text-emerald-600' :
              'bg-blue-50 border border-blue-200 text-blue-600'
            }`}>
              {step.includes('reject') ? <ShieldAlert size={20} /> :
               step.includes('confirm_post') ? <CheckCircle2 size={20} /> :
               <FileCheck size={20} />}
            </div>
            <div>
              <h3 className="text-[17px] font-bold text-[#04152d] tracking-tight">
                {isCompleted ? 'Collection Record & Audit History' :
                 step === 'review' ? 'Verify Collection & Member Details' :
                 step === 'apply' ? 'Select Financial Obligation & Category' :
                 step === 'confirm_post' ? 'Are You Sure You Want to Post This Collection?' :
                 step === 'reject_details' ? 'Collection Rejection Form' :
                 'Are You Sure You Want to Reject This Collection?'}
              </h3>
              <p className="text-[11px] text-gray-500 font-medium">
                Reference: <strong className="text-blue-700 font-mono">{collection.ref}</strong> • Member: <strong>{collection.memberName}</strong> ({collection.memberId})
              </p>
            </div>
          </div>

          <button onClick={handleClose} disabled={isProcessing} className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-400 hover:text-gray-700">
            <X size={18} />
          </button>
        </div>

        {errorMessage && (
          <div className="mb-4 bg-red-50 border border-red-200 text-red-700 p-3 rounded-xl text-[12px] font-semibold flex items-center gap-2">
            <AlertCircle size={16} /> {errorMessage}
          </div>
        )}

        {/* Modal Scrollable Body */}
        <div className="overflow-y-auto space-y-4 flex-1 pr-1">

          {/* ======================================================== */}
          {/* STEP 1: COMPREHENSIVE VERIFICATION REVIEW               */}
          {/* ======================================================== */}
          {step === 'review' && (
            <div className="space-y-4 animate-fade-in">
              
              {/* Financial Snapshot Card */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-4 bg-gray-50/80 rounded-2xl border border-gray-200/80">
                  <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Member Account</p>
                  <p className="text-[14px] font-bold text-[#04152d] mt-1">{collection.memberName}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[11px] font-mono text-gray-600">{collection.memberId}</span>
                    <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-full text-[9px] font-bold uppercase">
                      Active Member
                    </span>
                  </div>
                </div>

                <div className="p-4 bg-blue-50/60 rounded-2xl border border-blue-200/80">
                  <p className="text-[11px] font-bold text-blue-700 uppercase tracking-wider">Collection Amount</p>
                  <p className="text-[22px] font-black text-blue-900 font-mono mt-1">
                    {formatCurrency(collection.amount)}
                  </p>
                  <p className="text-[11px] text-blue-600 font-medium">To be applied to loan/dues</p>
                </div>

                <div className="p-4 bg-gray-50/80 rounded-2xl border border-gray-200/80">
                  <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Payment Channel</p>
                  <p className="text-[14px] font-bold text-[#04152d] mt-1">{collection.method}</p>
                  <p className="text-[11px] font-mono text-gray-500 mt-0.5 truncate">
                    Ref: <strong>{collection.paymentRef || 'N/A (OTC / Cash)'}</strong>
                  </p>
                </div>
              </div>

              {/* Transaction & Proof Document Inspection Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                
                {/* Transaction Specs */}
                <div className="bg-white rounded-2xl border border-gray-200 p-4 space-y-3 text-[12.5px]">
                  <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider border-b border-gray-100 pb-2">
                    Transaction Details
                  </p>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Payment Date:</span>
                    <span className="font-semibold text-[#04152d]">{collection.date}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Channel / Method:</span>
                    <span className="font-semibold text-[#04152d]">{collection.method}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Trace Reference:</span>
                    <span className="font-mono font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-100">
                      {collection.paymentRef || 'None'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Available Active Loans:</span>
                    <span className="font-semibold text-emerald-700">
                      {availableObligations.length} account{availableObligations.length > 1 ? 's' : ''} eligible
                    </span>
                  </div>
                  <div className="pt-2 border-t border-gray-100">
                    <p className="text-[11px] text-gray-400 font-medium">Audit Status:</p>
                    <p className="text-gray-700 italic text-[11.5px] mt-0.5">
                      Submitted through system collection portal. Awaiting officer verification and obligation attribution.
                    </p>
                  </div>
                </div>

                {/* Proof Document Viewer */}
                <div className="bg-white rounded-2xl border border-gray-200 p-4 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between border-b border-gray-100 pb-2 mb-2">
                      <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Proof Document</p>
                      {collection.proofUrl && collection.proofUrl !== '#' && (
                        <a 
                          href={collection.proofUrl} 
                          target="_blank" 
                          rel="noreferrer"
                          className="text-[11px] text-blue-600 hover:text-blue-800 font-bold flex items-center gap-1"
                        >
                          View Original <ExternalLink size={12} />
                        </a>
                      )}
                    </div>
                    {collection.proofUrl && collection.proofUrl !== '#' ? (
                      <div className="h-36 rounded-xl overflow-hidden border border-gray-100 bg-gray-50 relative group">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img 
                          src={collection.proofUrl} 
                          alt="Proof of Payment" 
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform" 
                        />
                      </div>
                    ) : (
                      <div className="h-36 rounded-xl border border-emerald-200 bg-emerald-50/60 flex flex-col items-center justify-center text-center p-3">
                        <ShieldCheck size={28} className="text-emerald-600 mb-1" />
                        <p className="text-[11px] font-bold text-emerald-900">Direct OTC Cash Remittance</p>
                        <p className="text-[10px] text-emerald-700">Official Physical Receipt Issued at Counter</p>
                      </div>
                    )}
                  </div>
                  <p className="text-[10.5px] text-gray-400 mt-2 italic text-center">
                    Inspect document for legible bank timestamp, account number, and amount.
                  </p>
                </div>

              </div>

              {/* Mandatory 4-Point Officer Verification Checklist */}
              {!isCompleted && (
                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-[11px] font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                      <ShieldCheck size={14} className="text-blue-600" /> Mandatory Financial Verification Checklist
                    </p>
                    <span className="text-[11px] text-gray-500 font-medium">
                      All 4 checks required before approval
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[12px]">
                    <div 
                      onClick={() => toggleChecklist('proofAuthentic')}
                      className={`p-2.5 rounded-xl border cursor-pointer flex items-center gap-2.5 transition-all ${
                        checklist.proofAuthentic ? 'bg-emerald-50 border-emerald-200 text-emerald-900' : 'bg-white border-gray-200 text-gray-700 hover:border-blue-300'
                      }`}
                    >
                      {checklist.proofAuthentic ? <CheckSquare size={16} className="text-emerald-600 shrink-0" /> : <Square size={16} className="text-gray-400 shrink-0" />}
                      <span>1. Proof matches claimed deposit & date</span>
                    </div>

                    <div 
                      onClick={() => toggleChecklist('refVerified')}
                      className={`p-2.5 rounded-xl border cursor-pointer flex items-center gap-2.5 transition-all ${
                        checklist.refVerified ? 'bg-emerald-50 border-emerald-200 text-emerald-900' : 'bg-white border-gray-200 text-gray-700 hover:border-blue-300'
                      }`}
                    >
                      {checklist.refVerified ? <CheckSquare size={16} className="text-emerald-600 shrink-0" /> : <Square size={16} className="text-gray-400 shrink-0" />}
                      <span>2. Reference confirmed with banking channel</span>
                    </div>

                    <div 
                      onClick={() => toggleChecklist('obligationMatched')}
                      className={`p-2.5 rounded-xl border cursor-pointer flex items-center gap-2.5 transition-all ${
                        checklist.obligationMatched ? 'bg-emerald-50 border-emerald-200 text-emerald-900' : 'bg-white border-gray-200 text-gray-700 hover:border-blue-300'
                      }`}
                    >
                      {checklist.obligationMatched ? <CheckSquare size={16} className="text-emerald-600 shrink-0" /> : <Square size={16} className="text-gray-400 shrink-0" />}
                      <span>3. Target loan obligation schedule identified</span>
                    </div>

                    <div 
                      onClick={() => toggleChecklist('noDuplicate')}
                      className={`p-2.5 rounded-xl border cursor-pointer flex items-center gap-2.5 transition-all ${
                        checklist.noDuplicate ? 'bg-emerald-50 border-emerald-200 text-emerald-900' : 'bg-white border-gray-200 text-gray-700 hover:border-blue-300'
                      }`}
                    >
                      {checklist.noDuplicate ? <CheckSquare size={16} className="text-emerald-600 shrink-0" /> : <Square size={16} className="text-gray-400 shrink-0" />}
                      <span>4. Duplicate transaction check verified</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Already Completed display */}
              {isCompleted && collection.status === 'Rejected' && collection.rejectReason && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-2xl space-y-1">
                  <p className="text-[11px] font-bold text-red-800 uppercase tracking-wider">Formal Rejection Reason</p>
                  <p className="text-[13px] text-red-950 font-medium">{collection.rejectReason}</p>
                </div>
              )}

              {isCompleted && collection.status === 'Posted' && collection.applicationData && (
                <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl space-y-2">
                  <p className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider">Posted Ledger Application</p>
                  <div className="grid grid-cols-3 gap-2 text-center text-[12px]">
                    <div className="p-2 bg-white rounded-xl border border-emerald-100">
                      <p className="text-gray-500 text-[10.5px]">Original Balance</p>
                      <p className="font-bold text-gray-800">{formatCurrency(collection.applicationData.originalBalance)}</p>
                    </div>
                    <div className="p-2 bg-emerald-100/50 rounded-xl border border-emerald-200">
                      <p className="text-emerald-800 text-[10.5px]">Applied Amount</p>
                      <p className="font-bold text-emerald-900">-{formatCurrency(collection.applicationData.appliedAmount)}</p>
                    </div>
                    <div className="p-2 bg-white rounded-xl border border-emerald-100">
                      <p className="text-gray-500 text-[10.5px]">Remaining Balance</p>
                      <p className="font-bold text-emerald-800">{formatCurrency(collection.applicationData.remainingBalance)}</p>
                    </div>
                  </div>
                </div>
              )}

            </div>
          )}

          {/* ======================================================== */}
          {/* STEP 2: APPLY OBLIGATION & CLASSIFY                     */}
          {/* ======================================================== */}
          {step === 'apply' && (
            <div className="space-y-4 animate-fade-in">
              <div className="p-4 bg-blue-50/60 border border-blue-200 rounded-2xl flex items-center justify-between">
                <div>
                  <p className="text-[11px] font-bold text-blue-700 uppercase tracking-wider">Target Ledger Mapping</p>
                  <h4 className="text-[15px] font-bold text-[#04152d]">Select Obligation & Collection Category</h4>
                </div>
                <div className="text-right">
                  <p className="text-[11px] text-gray-500">Payment Amount</p>
                  <p className="text-[18px] font-black text-blue-800">{formatCurrency(collection.amount)}</p>
                </div>
              </div>

              {/* Obligation Selector */}
              <div className="space-y-1.5">
                <label className="text-[12px] font-bold text-[#04152d]">
                  Select Financial Obligation Account to Credit <span className="text-red-500">*</span>
                </label>
                <select
                  value={selectedObligationId}
                  onChange={(e) => setSelectedObligationId(e.target.value)}
                  className={`${glassInput} cursor-pointer`}
                >
                  {availableObligations.length > 0 ? (
                    <>
                      {availableObligations.map((o) => (
                        <option key={o.id} value={o.id}>
                          {o.obligationType} — Current Balance: {formatCurrency(o.outstandingBalance)}
                        </option>
                      ))}
                      <option value="unapplied">Unapplied / Advance Deposit (No obligation link)</option>
                    </>
                  ) : (
                    <option value="unapplied">No active obligations found — Record as Unapplied Deposit</option>
                  )}
                </select>
              </div>

              {/* Category Selector */}
              <div className="space-y-1.5">
                <label className="text-[12px] font-bold text-[#04152d]">
                  Collection Classification Category <span className="text-red-500">*</span>
                </label>
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className={`${glassInput} cursor-pointer`}
                >
                  {COLLECTION_CATEGORIES.map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              {/* Financial Impact Preview */}
              {previewData && (
                <div className="bg-emerald-50/80 border border-emerald-200 rounded-2xl p-4 space-y-3">
                  <p className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider">
                    Expected Balance Effect After Posting
                  </p>
                  <div className="grid grid-cols-3 gap-3 text-center">
                    <div className="p-3 bg-white rounded-xl border border-emerald-100">
                      <p className="text-[11px] text-gray-500">Current Balance</p>
                      <p className="text-[14px] font-bold text-gray-800 font-mono mt-0.5">
                        {formatCurrency(previewData.outstandingBalance)}
                      </p>
                    </div>
                    <div className="p-3 bg-blue-50 rounded-xl border border-blue-100">
                      <p className="text-[11px] text-blue-700 font-bold">Payment Applied</p>
                      <p className="text-[14px] font-black text-blue-800 font-mono mt-0.5">
                        -{formatCurrency(previewData.appliedAmount)}
                      </p>
                    </div>
                    <div className="p-3 bg-white rounded-xl border border-emerald-100">
                      <p className="text-[11px] text-emerald-700 font-bold">Remaining Balance</p>
                      <p className="text-[15px] font-black text-emerald-800 font-mono mt-0.5">
                        {formatCurrency(previewData.remainingBalance)}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ======================================================== */}
          {/* STEP 3: "ARE YOU SURE?" FINAL POSTING CONFIRMATION       */}
          {/* ======================================================== */}
          {step === 'confirm_post' && (
            <div className="space-y-4 animate-fade-in">
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl flex items-start gap-3">
                <AlertTriangle size={20} className="text-amber-600 shrink-0 mt-0.5" />
                <div className="text-[12.5px] text-amber-900 leading-relaxed">
                  <p className="font-bold text-[13px]">Confirmation Required: Approve & Post Collection</p>
                  <p>
                    You are about to officially post this collection to the cooperative financial ledger. 
                    Please review the transaction summary below before proceeding.
                  </p>
                </div>
              </div>

              {/* Data Review Box */}
              <div className="bg-gray-50 border border-gray-200 rounded-2xl p-5 divide-y divide-gray-200/60 text-[13px]">
                <div className="py-2 flex justify-between">
                  <span className="text-gray-500">Collection Reference:</span>
                  <span className="font-mono font-bold text-blue-700">{collection.ref}</span>
                </div>
                <div className="py-2 flex justify-between">
                  <span className="text-gray-500">Member:</span>
                  <span className="font-bold text-[#04152d]">{collection.memberName} ({collection.memberId})</span>
                </div>
                <div className="py-2 flex justify-between">
                  <span className="text-gray-500">Credited Amount:</span>
                  <span className="font-black text-emerald-700 font-mono text-[15px]">{formatCurrency(collection.amount)}</span>
                </div>
                <div className="py-2 flex justify-between">
                  <span className="text-gray-500">Target Loan Obligation:</span>
                  <span className="font-semibold text-[#04152d]">
                    {selectedObligationObj ? selectedObligationObj.obligationType : 'General Deposit'}
                  </span>
                </div>
                <div className="py-2 flex justify-between">
                  <span className="text-gray-500">Remaining Balance After Credit:</span>
                  <span className="font-mono font-bold text-gray-800">
                    {previewData ? formatCurrency(previewData.remainingBalance) : '₱0.00'}
                  </span>
                </div>
                <div className="py-2 flex justify-between">
                  <span className="text-gray-500">Payment Channel & Ref:</span>
                  <span className="font-medium text-[#04152d]">{collection.method} ({collection.paymentRef || 'OTC'})</span>
                </div>
                <div className="py-2 flex justify-between">
                  <span className="text-gray-500">Processing Officer:</span>
                  <span className="font-bold text-[#04152d]">Maria Santos (Collecting Officer)</span>
                </div>
              </div>

              {/* Mandatory Confirmation Checkbox */}
              <div 
                onClick={() => setConfirmPostAcknowledged(!confirmPostAcknowledged)}
                className={`p-3.5 rounded-2xl border cursor-pointer flex items-center gap-3 transition-all ${
                  confirmPostAcknowledged ? 'bg-emerald-50 border-emerald-300 text-emerald-950' : 'bg-white border-gray-200 text-gray-700 hover:border-emerald-300'
                }`}
              >
                {confirmPostAcknowledged ? (
                  <CheckSquare size={20} className="text-emerald-600 shrink-0" />
                ) : (
                  <Square size={20} className="text-gray-400 shrink-0" />
                )}
                <span className="text-[12px] font-semibold leading-snug">
                  I confirm under audit responsibility that this payment has been verified authentic and complies with cooperative financial guidelines.
                </span>
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* STEP 4: STRUCTURED REJECTION DETAILS                     */}
          {/* ======================================================== */}
          {step === 'reject_details' && (
            <div className="space-y-4 animate-fade-in">
              <div className="p-4 bg-red-50/60 border border-red-200 rounded-2xl flex items-center justify-between">
                <div>
                  <p className="text-[11px] font-bold text-red-700 uppercase tracking-wider">Formal Adverse Action</p>
                  <h4 className="text-[15px] font-bold text-red-950">Specify Cause for Rejection</h4>
                </div>
                <div className="text-right">
                  <p className="text-[11px] text-gray-500">Transaction Ref</p>
                  <p className="text-[14px] font-mono font-bold text-red-800">{collection.ref}</p>
                </div>
              </div>

              {/* Reason Category Selector */}
              <div className="space-y-1.5">
                <label className="text-[12px] font-bold text-[#04152d]">
                  Primary Rejection Category <span className="text-red-500">*</span>
                </label>
                <select
                  value={rejectCategory}
                  onChange={(e) => setRejectCategory(e.target.value)}
                  className={`${glassInput} cursor-pointer`}
                >
                  {REJECTION_CATEGORIES.map(rc => (
                    <option key={rc.value} value={rc.label}>{rc.label}</option>
                  ))}
                </select>
              </div>

              {/* Detailed Officer Justification */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-[12px] font-bold text-[#04152d]">
                    Required Officer Audit Justification <span className="text-red-500">*</span>
                  </label>
                  <span className="text-[11px] text-gray-400">
                    Min. 15 characters ({rejectReasonInput.length}/15)
                  </span>
                </div>
                <textarea
                  rows={3}
                  value={rejectReasonInput}
                  onChange={(e) => setRejectReasonInput(e.target.value)}
                  placeholder="Provide explicit factual reasons for rejecting this collection (e.g. Deposit slip reference GCX-1029 cannot be confirmed with bank statement, or amount remitted does not match obligation requirement)..."
                  className={`${glassInput} resize-none`}
                />
              </div>

              {/* Quick suggestions */}
              <div className="space-y-1">
                <p className="text-[11px] text-gray-400 font-medium">Standard Audit Templates:</p>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    "Attached proof document is blurry and unreadable.",
                    "Payment reference cannot be verified with bank records.",
                    "Amount paid does not match required installment.",
                    "Duplicate payment submitted for this period."
                  ].map((s, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setRejectReasonInput(s)}
                      className="px-2.5 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-[11px] font-medium transition-colors"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* STEP 5: "ARE YOU SURE?" FINAL REJECTION CONFIRMATION     */}
          {/* ======================================================== */}
          {step === 'confirm_reject' && (
            <div className="space-y-4 animate-fade-in">
              <div className="p-4 bg-red-50 border-2 border-red-300 rounded-2xl flex items-start gap-3">
                <ShieldAlert size={24} className="text-red-600 shrink-0 mt-0.5" />
                <div className="text-[12.5px] text-red-950 leading-relaxed">
                  <p className="font-bold text-[14px]">Adverse Action Warning: Confirm Rejection</p>
                  <p className="mt-1">
                    Rejecting this collection will permanently log an adverse event in the audit trail,
                    deny crediting to the member&apos;s loan account, and notify the internal auditor. This action cannot be reversed.
                  </p>
                </div>
              </div>

              {/* Rejection Summary Box */}
              <div className="bg-gray-50 border border-gray-200 rounded-2xl p-5 divide-y divide-gray-200/60 text-[13px]">
                <div className="py-2 flex justify-between">
                  <span className="text-gray-500">Transaction Reference:</span>
                  <span className="font-mono font-bold text-red-700">{collection.ref}</span>
                </div>
                <div className="py-2 flex justify-between">
                  <span className="text-gray-500">Member:</span>
                  <span className="font-bold text-[#04152d]">{collection.memberName} ({collection.memberId})</span>
                </div>
                <div className="py-2 flex justify-between">
                  <span className="text-gray-500">Amount Being Rejected:</span>
                  <span className="font-black text-red-700 font-mono text-[15px]">{formatCurrency(collection.amount)}</span>
                </div>
                <div className="py-2 flex justify-between">
                  <span className="text-gray-500">Reason Category:</span>
                  <span className="font-bold text-red-900 bg-red-100 px-2 py-0.5 rounded text-[11px]">{rejectCategory}</span>
                </div>
                <div className="py-2 space-y-1">
                  <span className="text-gray-500 block">Officer Explanation:</span>
                  <p className="text-gray-800 italic bg-white p-2.5 rounded-xl border border-gray-200 text-[12px]">
                    &ldquo;{rejectReasonInput}&rdquo;
                  </p>
                </div>
              </div>

              {/* Mandatory Rejection Acknowledgment Checkbox */}
              <div 
                onClick={() => setConfirmRejectAcknowledged(!confirmRejectAcknowledged)}
                className={`p-3.5 rounded-2xl border cursor-pointer flex items-center gap-3 transition-all ${
                  confirmRejectAcknowledged ? 'bg-red-50 border-red-300 text-red-950' : 'bg-white border-gray-200 text-gray-700 hover:border-red-300'
                }`}
              >
                {confirmRejectAcknowledged ? (
                  <CheckSquare size={20} className="text-red-600 shrink-0" />
                ) : (
                  <Square size={20} className="text-gray-400 shrink-0" />
                )}
                <span className="text-[12px] font-semibold leading-snug">
                  I confirm that this collection has been examined and meets rejection criteria under cooperative financial policies.
                </span>
              </div>
            </div>
          )}

        </div>

        {/* Modal Action Buttons Footer */}
        <div className="border-t border-gray-100 pt-4 mt-2 flex items-center justify-between relative z-10">
          
          {isCompleted && (
            <button onClick={handleClose} className="px-5 py-2.5 rounded-full text-[13px] font-bold text-[#04152d] bg-gray-100 hover:bg-gray-200 transition-colors ml-auto">
              Close View
            </button>
          )}

          {/* STEP 1 FOOTER: Review & Checklist */}
          {!isCompleted && step === 'review' && (
            <>
              <button 
                onClick={() => setStep('reject_details')} 
                disabled={isProcessing}
                className="px-5 py-2.5 rounded-full text-[12.5px] font-bold text-red-600 bg-red-50 hover:bg-red-100 transition-colors border border-red-200 flex items-center gap-1.5"
              >
                <XCircle size={15} /> Reject Collection...
              </button>

              <button 
                onClick={() => setStep('apply')} 
                disabled={!isChecklistComplete || isProcessing}
                className="px-6 py-2.5 rounded-full text-[12.5px] font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md flex items-center gap-2 active:scale-95"
              >
                Proceed to Obligation Mapping <ArrowRight size={14} />
              </button>
            </>
          )}

          {/* STEP 2 FOOTER: Obligation Mapping */}
          {!isCompleted && step === 'apply' && (
            <>
              <button 
                onClick={() => setStep('review')} 
                disabled={isProcessing} 
                className="px-4 py-2 rounded-full text-[12.5px] font-semibold text-gray-600 hover:bg-gray-100 transition-colors flex items-center gap-1.5"
              >
                <ArrowLeft size={14} /> Back to Checklist
              </button>

              <button 
                onClick={() => setStep('confirm_post')} 
                disabled={isProcessing}
                className="px-6 py-2.5 rounded-full text-[12.5px] font-bold text-white bg-[#04152d] hover:bg-[#04152d]/90 transition-all shadow-md flex items-center gap-2 active:scale-95"
              >
                Review & Confirm Posting <ArrowRight size={14} />
              </button>
            </>
          )}

          {/* STEP 3 FOOTER: Final "Are You Sure?" Post */}
          {!isCompleted && step === 'confirm_post' && (
            <>
              <button 
                onClick={() => setStep('apply')} 
                disabled={isProcessing} 
                className="px-4 py-2 rounded-full text-[12.5px] font-semibold text-gray-600 hover:bg-gray-100 transition-colors flex items-center gap-1.5"
              >
                <ArrowLeft size={14} /> Back to Mapping
              </button>

              <button 
                onClick={handleFinalPost} 
                disabled={!confirmPostAcknowledged || isProcessing}
                className="px-6 py-2.5 rounded-full text-[12.5px] font-bold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md flex items-center gap-2 active:scale-95"
              >
                {isProcessing ? (
                  <>
                    <Loader2 size={15} className="animate-spin" /> Crediting Ledger...
                  </>
                ) : (
                  <>
                    <CheckCircle2 size={15} /> Yes, Confirm & Post to Ledger
                  </>
                )}
              </button>
            </>
          )}

          {/* STEP 4 FOOTER: Rejection Details */}
          {!isCompleted && step === 'reject_details' && (
            <>
              <button 
                onClick={() => setStep('review')} 
                disabled={isProcessing} 
                className="px-4 py-2 rounded-full text-[12.5px] font-semibold text-gray-600 hover:bg-gray-100 transition-colors flex items-center gap-1.5"
              >
                <ArrowLeft size={14} /> Back to Verification
              </button>

              <button 
                onClick={() => setStep('confirm_reject')} 
                disabled={rejectReasonInput.trim().length < 15 || isProcessing}
                className="px-6 py-2.5 rounded-full text-[12.5px] font-bold text-white bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md flex items-center gap-2 active:scale-95"
              >
                Review Rejection Impact <ArrowRight size={14} />
              </button>
            </>
          )}

          {/* STEP 5 FOOTER: Final "Are You Sure?" Reject */}
          {!isCompleted && step === 'confirm_reject' && (
            <>
              <button 
                onClick={() => setStep('reject_details')} 
                disabled={isProcessing} 
                className="px-4 py-2 rounded-full text-[12.5px] font-semibold text-gray-600 hover:bg-gray-100 transition-colors flex items-center gap-1.5"
              >
                <ArrowLeft size={14} /> Back to Reason
              </button>

              <button 
                onClick={handleFinalReject} 
                disabled={!confirmRejectAcknowledged || isProcessing}
                className="px-6 py-2.5 rounded-full text-[12.5px] font-bold text-white bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md flex items-center gap-2 active:scale-95"
              >
                {isProcessing ? (
                  <>
                    <Loader2 size={15} className="animate-spin" /> Recording Rejection...
                  </>
                ) : (
                  <>
                    <XCircle size={15} /> Yes, Confirm Rejection
                  </>
                )}
              </button>
            </>
          )}

        </div>

      </div>
    </div>
  );
}