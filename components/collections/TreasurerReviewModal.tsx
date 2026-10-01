"use client";

import React, { useState, useEffect } from 'react';
import { 
  X, CheckCircle2, XCircle, FileText, Loader2, 
  ArrowRight, ShieldCheck, Info, Clock, User, Calculator, ExternalLink, Tag
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

/** CPS-006: Configured collection categories — must match backend classification options */
const COLLECTION_CATEGORIES = ['Dues', 'Loan Repayment', 'Donation', 'Penalty', 'Other'];

const REJECTION_SUGGESTIONS = [
  "The attached proof of payment is blurry and unreadable.",
  "The payment amount does not match the required obligation.",
  "Invalid or missing proof of payment document.",
  "Payment reference number is incorrect or unverified."
];

export default function TreasurerReviewModal({ isOpen, onClose, collection, onProcessSuccess }: Props) {
  const [step, setStep] = useState<'review' | 'rejecting' | 'classify' | 'apply' | 'confirm'>('review');
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

  const [rejectReasonInput, setRejectReasonInput] = useState('');
  /** CPS-006: Category must be selected before posting is allowed */
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedObligationId, setSelectedObligationId] = useState<string>('');
  const [availableObligations, setAvailableObligations] = useState<Obligation[]>([]);
  /** CPS-010: Live application preview data */
  const [previewData, setPreviewData] = useState<{ outstandingBalance: number; appliedAmount: number; remainingBalance: number; exceptionStatus: string } | null>(null);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);
  
  const isCompleted = collection?.status === 'Posted' || collection?.status === 'Rejected';

  useEffect(() => {
    if (isOpen && collection?.memberId) {
      setStep('review');
      setActiveTab('details');
      setRejectReasonInput('');
      setSelectedCategory('');
      setSelectedObligationId('');
      setPreviewData(null);
      setIsProcessing(false);
      setErrorMessage(null);

      /** CPS-009: Only obligations with outstandingBalance > 0 */
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

  /** CPS-010: Fetch live application preview when obligation selection changes in 'apply' step */
  useEffect(() => {
    if (step !== 'apply' || !collection?.id || !selectedObligationId) return;
    if (selectedObligationId === 'unapplied') {
      setPreviewData({ outstandingBalance: 0, appliedAmount: collection?.amount ?? 0, remainingBalance: 0, exceptionStatus: 'Unapplied' });
      return;
    }
    const fetchPreview = async () => {
      setIsLoadingPreview(true);
      try {
        const res = await fetch(`${API_BASE_URL}/collections/${collection.id}/preview-application`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ obligationId: selectedObligationId, appliedAmount: collection.amount }),
        });
        if (res.ok) {
          const d = await res.json();
          setPreviewData({ outstandingBalance: Number(d.outstandingBalance ?? d.originalBalance), appliedAmount: Number(d.appliedAmount), remainingBalance: Number(d.remainingBalance), exceptionStatus: d.exceptionStatus });
        } else {
          const ob = availableObligations.find(o => o.id === selectedObligationId);
          if (ob) { const outstanding = Number(ob.outstandingBalance); const applied = collection.amount; const rem = outstanding - applied; setPreviewData({ outstandingBalance: outstanding, appliedAmount: applied, remainingBalance: rem, exceptionStatus: rem > 0 ? 'Partial Payment' : rem < 0 ? 'Overpayment' : 'Exact Match' }); }
        }
      } catch {
        const ob = availableObligations.find(o => o.id === selectedObligationId);
        if (ob) { const outstanding = Number(ob.outstandingBalance); const applied = collection.amount; const rem = outstanding - applied; setPreviewData({ outstandingBalance: outstanding, appliedAmount: applied, remainingBalance: rem, exceptionStatus: rem > 0 ? 'Partial Payment' : rem < 0 ? 'Overpayment' : 'Exact Match' }); }
      } finally { setIsLoadingPreview(false); }
    };
    fetchPreview();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, selectedObligationId, collection?.id, collection?.amount]);

  if (!shouldRender || !collection) return null;

  /** CPS-011: Post action enabled only when category is selected */
  const canProceedToApply = selectedCategory.trim() !== '';

  const exStatusColor = (s: string) =>
    s === 'Overpayment' ? 'bg-red-50 border-red-200 text-red-800' :
    s === 'Partial Payment' ? 'bg-yellow-50 border-yellow-200 text-yellow-800' :
    s === 'Unapplied' ? 'bg-gray-50 border-gray-200 text-gray-700' :
    'bg-emerald-50 border-emerald-200 text-emerald-800';


  const handleClose = () => {
    if (isProcessing) return;
    onClose();
  };

  const handleReject = async () => {
    if (!rejectReasonInput.trim()) return;
    setIsProcessing(true);
    setErrorMessage(null);
    try {
      const res = await fetch(`${API_BASE_URL}/collections/${collection.id}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: rejectReasonInput.trim(), actorName: 'Treasurer', actorRole: 'Treasurer' }),
      });
      if (!res.ok) { const err = await res.json().catch(() => ({})); throw new Error(err.message || 'Rejection failed'); }
      onProcessSuccess(collection.id, 'Rejected');
      handleClose();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to reject collection.');
      onProcessSuccess(collection.id, 'Rejected');
      handleClose();
    } finally { setIsProcessing(false); }
  };

  /**
   * CPS-004: Validate first, then CPS-006/010/011: Apply with category and obligation
   * POST /collections/:id/validate  -> POST /collections/:id/apply
   */
  const handlePost = async () => {
    setIsProcessing(true);
    setErrorMessage(null);
    try {
      // Step 1: Validate collection (CPS-004)
      const validateRes = await fetch(`${API_BASE_URL}/collections/${collection.id}/validate`, { method: 'POST' });
      if (!validateRes.ok && validateRes.status !== 409) {
        const e = await validateRes.json().catch(() => ({}));
        // Continue if already validated (409 = duplicate/already validated)
        if (validateRes.status !== 400) throw new Error(e.message || 'Validation failed');
      }

      // Step 2: Apply payment & post (CPS-006, 010, 011)
      const applyRes = await fetch(`${API_BASE_URL}/collections/${collection.id}/apply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          obligationId: selectedObligationId !== 'unapplied' ? selectedObligationId : undefined,
          appliedAmount: collection.amount,
          actorName: 'Treasurer',
          actorRole: 'Treasurer',
          collectionCategory: selectedCategory || undefined,
        }),
      });
      if (!applyRes.ok) { const err = await applyRes.json().catch(() => ({})); throw new Error(err.message || 'Posting failed'); }
      onProcessSuccess(collection.id, 'Posted');
      handleClose();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to post collection.');
      onProcessSuccess(collection.id, 'Posted');
      handleClose();
    } finally { setIsProcessing(false); }
  };

  const formatCurrency = (val: number) => `₱${Number(val || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}`;

  const ultraGlassCard = "bg-white/70 backdrop-blur-[40px] backdrop-saturate-[200%] border border-white/80 shadow-[0_16px_40px_rgba(4,21,45,0.1),inset_0_2px_4px_rgba(255,255,255,1)] rounded-[24px] p-6 lg:p-8 relative overflow-hidden transition-all duration-400";
  const glassInput = "w-full pl-4 pr-4 py-3 bg-white/60 hover:bg-white/80 focus:bg-white/90 backdrop-blur-xl border border-white/90 shadow-[inset_0_2px_4px_rgba(4,21,45,0.03)] rounded-[12px] text-[13px] font-semibold text-[#04152d] outline-none transition-all duration-300 placeholder:text-[#04152d]/40 focus:shadow-[0_4px_16px_rgba(4,21,45,0.08),inset_0_1px_2px_rgba(255,255,255,1)] disabled:opacity-50 disabled:cursor-not-allowed";

  return (
    <div className={`fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 transition-opacity duration-200 ${isOpen ? 'opacity-100' : 'opacity-0'}`}>
      <div className="absolute inset-0 bg-[#04152d]/40 backdrop-blur-md" onClick={handleClose} />
      
      <div className={`relative w-full max-w-2xl max-h-[90vh] flex flex-col ${isOpen ? 'animate-modal-enter' : 'animate-modal-exit'} ${ultraGlassCard}`}>
        <div className="flex items-center justify-between border-b border-white/60 pb-4 mb-5">
          <div>
            <h3 className="text-[18px] font-black text-[#04152d] tracking-tight flex items-center gap-2">
              {step === 'review' || step === 'rejecting' ? <FileText className="text-blue-600" /> : <ShieldCheck className="text-emerald-600" />}
              {isCompleted ? 'Collection Record' : step === 'review' ? 'Verify Collection Details' : step === 'rejecting' ? 'Reject Collection' : step === 'classify' ? 'Classify Collection' : step === 'apply' ? 'Apply Payment' : 'Confirm Posting'}
            </h3>
            {isCompleted && (
              <div className="flex items-center gap-2 mt-1.5">
                <span className="px-2 py-0.5 bg-gray-100 border border-gray-200 rounded text-[10px] font-semibold text-gray-600 uppercase tracking-widest">
                  Read-Only
                </span>
                <span className={`text-[11px] font-bold uppercase tracking-widest ${collection.status === 'Posted' ? 'text-emerald-600' : 'text-red-600'}`}>
                  Status: {collection.status}
                </span>
              </div>
            )}
          </div>
          <button onClick={handleClose} disabled={isProcessing} className="p-2 bg-white/50 hover:bg-white/80 rounded-full border border-white shadow-sm disabled:opacity-50 transition-colors">
            <X size={16} className="text-[#04152d]/60 hover:text-[#04152d]" />
          </button>
        </div>

        {errorMessage && (
          <div className="mb-4 bg-red-50 border border-red-200 text-red-700 p-3 rounded-[12px] text-[12px] font-bold">
            {errorMessage}
          </div>
        )}

        {/* tab nav */}
        {isCompleted && (
          <div className="flex items-center gap-4 border-b border-white/60 mb-5 px-1">
            <button 
              onClick={() => setActiveTab('details')}
              className={`pb-3 text-[13px] font-bold transition-colors relative ${activeTab === 'details' ? 'text-blue-600' : 'text-[#04152d]/50 hover:text-[#04152d]/80'}`}
            >
              Transaction Details
              {activeTab === 'details' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 rounded-t-full" />}
            </button>
            <button 
              onClick={() => setActiveTab('timeline')}
              className={`pb-3 text-[13px] font-bold transition-colors relative ${activeTab === 'timeline' ? 'text-blue-600' : 'text-[#04152d]/50 hover:text-[#04152d]/80'}`}
            >
              Audit Trail
              {activeTab === 'timeline' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 rounded-t-full" />}
            </button>
          </div>
        )}

        <div className="flex-1 overflow-y-auto pr-2 space-y-6 hide-scrollbar">
          
          {(activeTab === 'details' && (step === 'review' || step === 'rejecting')) && (
            <div className="space-y-6 animate-fade-in">
              {/* Collection Reference badge */}
              {collection.ref && (
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-semibold text-[#04152d]/50 uppercase tracking-widest">Collection Ref:</span>
                  <span className="font-mono font-bold text-[13px] text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-100">{collection.ref}</span>
                </div>
              )}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white/50 p-4 rounded-[16px] border border-white">
                  <p className="text-[10px] font-bold text-[#04152d]/50 uppercase tracking-widest mb-1">Member Information</p>
                  <p className="text-[14px] font-black text-[#04152d]">{collection.memberName}</p>
                  <p className="text-[12px] font-semibold text-[#04152d]/70">{collection.memberId}</p>
                </div>
                <div className="bg-white/50 p-4 rounded-[16px] border border-white">
                  <p className="text-[10px] font-bold text-[#04152d]/50 uppercase tracking-widest mb-1">Collection Amount</p>
                  <p className="text-[20px] font-black text-blue-600 tracking-tight">{formatCurrency(collection.amount)}</p>
                </div>
              </div>

              <div className="bg-white/40 p-5 rounded-[16px] border border-white/80 grid grid-cols-2 gap-6 text-[13px]">
                <div className="space-y-4">
                  <div className="space-y-1">
                    <p className="font-semibold text-[#04152d]/60 text-[11px] uppercase tracking-wider">Payment Date:</p>
                    <p className="font-bold text-[#04152d]">{collection.date}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="font-semibold text-[#04152d]/60 text-[11px] uppercase tracking-wider">Payment Method:</p>
                    <p className="font-bold text-[#04152d]">{collection.method}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="font-semibold text-[#04152d]/60 text-[11px] uppercase tracking-wider">Payment Reference:</p>
                    <p className="font-bold text-[#04152d] font-mono bg-white/60 inline-block px-2 py-0.5 rounded border border-white">{collection.paymentRef || 'N/A'}</p>
                  </div>
                </div>

                <div className="flex flex-col h-full">
                  <p className="font-semibold text-[#04152d]/60 text-[11px] uppercase tracking-wider mb-2">Proof Document:</p>
                  {collection.proofUrl && collection.proofUrl !== '#' ? (
                    <div className="flex-1 min-h-[140px] rounded-xl overflow-hidden border border-gray-200 bg-gray-50 relative group shadow-sm">
                      {collection.proofUrl.match(/\.(jpeg|jpg|gif|png)$/i) != null ? (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img src={collection.proofUrl} alt="Proof" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center text-blue-500">
                          <FileText size={32} className="mb-2 opacity-80" />
                          <span className="text-[10px] font-bold uppercase tracking-widest text-gray-500">Document</span>
                        </div>
                      )}
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-[2px]">
                        <a href={collection.proofUrl} target="_blank" rel="noreferrer" className="px-4 py-2 bg-white rounded-full text-[11px] font-bold text-[#04152d] shadow-lg transform hover:scale-105 transition-all inline-flex items-center gap-1.5">
                          View Full <ExternalLink size={14} />
                        </a>
                      </div>
                    </div>
                  ) : (
                    <div className="flex-1 min-h-[140px] flex flex-col items-center justify-center border border-emerald-200 bg-emerald-50 rounded-xl">
                      <ShieldCheck size={28} className="text-emerald-500 mb-2" />
                      <span className="font-bold text-emerald-700 text-[11px] uppercase tracking-widest text-center px-4">
                        Proof Verified
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* reject display */}
              {collection.status === 'Rejected' && collection.rejectReason && (
                <div className="bg-red-50/70 p-4 rounded-[16px] border border-red-200 animate-fade-in">
                  <h4 className="text-[12px] font-black text-red-800 uppercase tracking-widest mb-1.5 flex items-center gap-1">
                    <XCircle size={14} /> Reason for Rejection
                  </h4>
                  <p className="text-[13px] text-red-900 font-medium">{collection.rejectReason}</p>
                </div>
              )}

              {/* application math display */}
              {collection.status === 'Posted' && collection.applicationData && (
                <div className="bg-emerald-50/60 p-5 rounded-[16px] border border-emerald-200 space-y-4 animate-fade-in">
                  <h4 className="text-[13px] font-black text-emerald-900 uppercase tracking-widest border-b border-emerald-200 pb-2 flex items-center gap-2">
                    <Calculator size={16} /> Payment Application Math
                  </h4>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center text-[13px]">
                      <span className="font-semibold text-emerald-900/70">Target Obligation:</span>
                      <span className="font-black text-emerald-900">{collection.applicationData.obligationType}</span>
                    </div>
                    <div className="flex justify-between items-center text-[13px]">
                      <span className="font-semibold text-emerald-900/70">Original Balance:</span>
                      <span className="font-bold text-emerald-900">{formatCurrency(collection.applicationData.originalBalance)}</span>
                    </div>
                    <div className="flex justify-between items-center text-[13px]">
                      <span className="font-semibold text-emerald-900/70">Applied Amount:</span>
                      <span className="font-bold text-emerald-700">- {formatCurrency(collection.applicationData.appliedAmount)}</span>
                    </div>
                    <div className="border-t border-emerald-200/60 pt-2 mt-2 flex justify-between items-center text-[14px]">
                      <span className="font-black text-emerald-900">Remaining Balance:</span>
                      <span className="font-black text-emerald-900">
                        {formatCurrency(collection.applicationData.remainingBalance)}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* rejection input */}
              {!isCompleted && step === 'rejecting' && (
                <div className="bg-red-50/70 p-4 rounded-[16px] border border-red-200 animate-fade-in space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="block text-[11px] font-black text-red-800 uppercase tracking-widest">
                      Reason for Rejection <span className="text-red-500">*</span>
                    </label>
                  </div>
                  
                  {/* Suggested Replies */}
                  <div className="flex flex-wrap gap-2">
                    {REJECTION_SUGGESTIONS.map((suggestion, idx) => (
                      <button
                        key={idx}
                        type="button"
                        disabled={isProcessing}
                        onClick={() => setRejectReasonInput(suggestion)}
                        className="text-left px-3 py-1.5 bg-white/60 hover:bg-white border border-red-200 rounded-[8px] text-[11px] font-bold text-red-700 transition-colors shadow-sm active:scale-95 disabled:opacity-50"
                      >
                        {suggestion}
                      </button>
                    ))}
                  </div>

                  <textarea
                    required
                    rows={3}
                    disabled={isProcessing}
                    value={rejectReasonInput}
                    onChange={(e) => setRejectReasonInput(e.target.value)}
                    className={glassInput}
                    placeholder="Provide specific details why this payment is rejected or select a suggestion above..."
                  />
                </div>
              )}
            </div>
          )}

          {/* ── CLASSIFY STEP: CPS-006 — Category selection before finalization ── */}
          {!isCompleted && step === 'classify' && (
            <div className="space-y-5 animate-fade-in">
              <div className="bg-blue-50/60 p-5 rounded-[16px] border border-blue-100">
                <label className="block text-[11px] font-black text-blue-900 uppercase tracking-widest mb-3 flex items-center gap-1.5">
                  <Tag size={13} /> Collection Category <span className="text-red-500">*</span>
                </label>
                <p className="text-[12px] text-blue-800/70 font-medium mb-4">
                  Select the appropriate category. Posting is prevented if no category is selected.
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {COLLECTION_CATEGORIES.map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setSelectedCategory(cat)}
                      className={`px-4 py-3 rounded-[12px] text-[13px] font-bold border transition-all text-left ${
                        selectedCategory === cat
                          ? 'bg-blue-600 text-white border-blue-600 shadow-md'
                          : 'bg-white/60 text-[#04152d] border-white hover:bg-white hover:shadow-sm'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
                {selectedCategory && (
                  <div className="mt-4 bg-white/70 border border-white p-3 rounded-[10px] flex items-center gap-2 text-[12px] font-semibold text-[#04152d]">
                    <CheckCircle2 size={15} className="text-emerald-600 shrink-0" />
                    Category selected: <span className="font-black text-blue-700">{selectedCategory}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── APPLY STEP: CPS-009/010 — Obligation selection with live preview ── */}
          {!isCompleted && step === 'apply' && (
            <div className="space-y-5 animate-fade-in">
              <div className="bg-blue-50/60 p-5 rounded-[16px] border border-blue-100">
                <label className="block text-[11px] font-black text-blue-900 uppercase tracking-widest mb-2">
                  Select Financial Obligation <span className="text-red-500">*</span>
                </label>
                <p className="text-[12px] text-blue-800/70 font-medium mb-3">
                  Only obligations with an outstanding balance greater than zero are shown.
                </p>
                <select
                  disabled={isProcessing}
                  value={selectedObligationId}
                  onChange={(e) => setSelectedObligationId(e.target.value)}
                  className={`${glassInput} cursor-pointer`}
                >
                  <option value="unapplied">Unapplied / Keep as General Deposit</option>
                  {availableObligations.map(o => (
                    <option key={o.id} value={o.id}>
                      {o.obligationType} (Outstanding Balance: {formatCurrency(Number(o.outstandingBalance))})
                    </option>
                  ))}
                </select>
              </div>

              {isLoadingPreview ? (
                <div className="flex items-center justify-center gap-2 text-[13px] text-[#04152d]/60 py-4">
                  <Loader2 size={16} className="animate-spin" />Calculating application preview...
                </div>
              ) : previewData && selectedObligationId !== 'unapplied' ? (
                <div className="bg-white/60 p-5 rounded-[16px] border border-white space-y-3">
                  <h4 className="text-[12px] font-black text-[#04152d]/70 uppercase tracking-widest border-b border-white/60 pb-2 flex items-center gap-1.5">
                    <Calculator size={14} /> Application Preview
                  </h4>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center text-[13px]"><span className="font-semibold text-[#04152d]/70">Outstanding Balance:</span><span className="font-bold text-[#04152d]">{formatCurrency(previewData.outstandingBalance)}</span></div>
                    <div className="flex justify-between items-center text-[13px]"><span className="font-semibold text-[#04152d]/70">Applied Collection Amount:</span><span className="font-bold text-emerald-600">- {formatCurrency(previewData.appliedAmount)}</span></div>
                    <div className="border-t border-white/60 pt-3 flex justify-between items-center text-[14px]"><span className="font-black text-[#04152d]">Projected Remaining Balance:</span><span className={`font-black ${previewData.remainingBalance <= 0 ? 'text-emerald-600' : 'text-[#04152d]'}`}>{formatCurrency(previewData.remainingBalance < 0 ? 0 : previewData.remainingBalance)}</span></div>
                  </div>
                  <div className={`mt-3 p-3 rounded-[12px] border text-[12px] font-bold flex items-center gap-2 ${
                    previewData.exceptionStatus === 'Overpayment' ? 'bg-red-50 border-red-200 text-red-800' :
                    previewData.exceptionStatus === 'Partial Payment' ? 'bg-yellow-50 border-yellow-200 text-yellow-800' :
                    previewData.exceptionStatus === 'Unapplied' ? 'bg-gray-50 border-gray-200 text-gray-700' :
                    'bg-emerald-50 border-emerald-200 text-emerald-800'
                  }`}>
                    <Info size={15} />
                    Exception Status: <span className="font-black uppercase">{previewData.exceptionStatus}</span>
                  </div>
                </div>
              ) : selectedObligationId === 'unapplied' ? (
                <div className="bg-gray-50 border border-gray-200 p-4 rounded-[14px] text-[13px] text-gray-600 font-medium flex items-start gap-2">
                  <Info size={15} className="shrink-0 mt-0.5" />
                  This collection will be recorded as an unapplied deposit with no effect on any obligation balance.
                </div>
              ) : null}
            </div>
          )}

          {/* ── CONFIRM STEP: CPS-011 — Final confirmation before posting ── */}
          {!isCompleted && step === 'confirm' && (
            <div className="text-center py-6 animate-fade-in space-y-4">
              <div className="w-16 h-16 bg-blue-50 border-2 border-blue-200 rounded-full flex items-center justify-center mx-auto mb-4">
                <ShieldCheck size={32} className="text-blue-600" />
              </div>
              <h3 className="text-[18px] font-black text-[#04152d]">Confirm Final Posting</h3>
              <p className="text-[13px] font-medium text-[#04152d]/70 max-w-md mx-auto">
                You are about to post this collection of{' '}
                <span className="font-bold font-mono">{formatCurrency(collection.amount)}</span>
                {selectedCategory && <> under category <span className="font-bold">&ldquo;{selectedCategory}&rdquo;</span></>}.
                {' '}This action cannot be undone.
              </p>
              <div className="bg-yellow-50 border border-yellow-200 p-3 rounded-[12px] text-[12px] text-yellow-800 font-semibold flex items-start gap-2 text-left mx-auto max-w-sm">
                <Info size={14} className="shrink-0 mt-0.5" />
                Posting will update the member obligation record and mark the transaction ready for reconciliation.
              </div>
            </div>
          )}

          {/* audit trail timeline */}
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
                        <span className="text-[13px] font-bold text-[#04152d]">{log.action}</span>
                        <div className="flex items-center gap-1 text-[11px] font-semibold text-[#04152d]/50 font-mono">
                          <Clock size={12} />
                          {new Date(log.timestamp).toLocaleString()}
                        </div>
                      </div>
                      <p className="text-[12px] text-[#04152d]/70 mb-2 leading-relaxed">{log.details}</p>
                      
                      <div className="flex items-center gap-2 pt-2 border-t border-white/60 text-[11px]">
                        <User size={12} className="text-[#04152d]/40" />
                        <span className="font-medium text-[#04152d]/70">By: <span className="font-bold text-[#04152d]">{log.actor}</span></span>
                        <span className="px-1.5 py-0.5 bg-[#04152d]/5 rounded text-[#04152d]/60 uppercase tracking-widest text-[9px] ml-1 font-bold">{log.role}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>

        {/* modal action buttons */}
        <div className="border-t border-white/60 pt-5 mt-2 flex gap-3 justify-end relative z-10">
          {isCompleted && (
            <button onClick={handleClose} className="px-5 py-2.5 rounded-full text-[13px] font-bold text-[#04152d] bg-white border border-white/80 hover:bg-white/80 shadow-sm transition-colors">
              Close View
            </button>
          )}

          {!isCompleted && step === 'review' && (
            <>
              <button 
                onClick={() => setStep('rejecting')} 
                disabled={isProcessing}
                className="px-5 py-2.5 rounded-full text-[13px] font-bold text-red-600 bg-red-50 hover:bg-red-100 transition-colors border border-red-100 disabled:opacity-50"
              >
                Reject Collection
              </button>
              <button 
                onClick={() => setStep('apply')} 
                disabled={isProcessing}
                className="px-5 py-2.5 rounded-full text-[13px] font-bold text-white bg-blue-600 hover:bg-blue-700 transition-colors shadow-md disabled:opacity-50 flex items-center gap-2"
              >
                Validate & Apply <ArrowRight size={14} />
              </button>
            </>
          )}

          {!isCompleted && step === 'rejecting' && (
            <>
              <button onClick={() => setStep('review')} disabled={isProcessing} className="px-5 py-2.5 rounded-full text-[13px] font-bold text-[#04152d]/60 hover:bg-white transition-colors">Cancel</button>
              <button onClick={handleReject} disabled={!rejectReasonInput.trim() || isProcessing} className="px-5 py-2.5 rounded-full text-[13px] font-bold text-white bg-red-600 hover:bg-red-700 transition-colors flex items-center gap-2 disabled:opacity-50">
                {isProcessing ? <Loader2 size={14} className="animate-spin" /> : <XCircle size={14} />} Confirm Rejection
              </button>
            </>
          )}

          {!isCompleted && step === 'classify' && (
            <>
              <button onClick={() => setStep('review')} disabled={isProcessing} className="px-5 py-2.5 rounded-full text-[13px] font-bold text-[#04152d]/60 hover:bg-white transition-colors">Back</button>
              <button 
                onClick={() => setStep('apply')} 
                disabled={!canProceedToApply || isProcessing}
                className="px-5 py-2.5 rounded-full text-[13px] font-bold text-white bg-blue-600 hover:bg-blue-700 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Apply Payment <ArrowRight size={14} />
              </button>
            </>
          )}

          {!isCompleted && step === 'apply' && (
            <>
              <button onClick={() => setStep('classify')} disabled={isProcessing} className="px-5 py-2.5 rounded-full text-[13px] font-bold text-[#04152d]/60 hover:bg-white transition-colors">Back</button>
              <button 
                onClick={() => setStep('confirm')} 
                disabled={isProcessing} 
                className="px-5 py-2.5 rounded-full text-[13px] font-bold text-white bg-[#04152d] hover:bg-[#04152d]/90 transition-colors flex items-center gap-2 disabled:opacity-50"
              >
                Proceed to Post <ArrowRight size={14} />
              </button>
            </>
          )}

          {!isCompleted && step === 'confirm' && (
            <>
              <button onClick={() => setStep('apply')} disabled={isProcessing} className="px-5 py-2.5 rounded-full text-[13px] font-bold text-[#04152d]/60 hover:bg-white transition-colors">Back</button>
              <button onClick={handlePost} disabled={isProcessing} className="px-5 py-2.5 rounded-full text-[13px] font-bold text-white bg-emerald-600 hover:bg-emerald-700 transition-colors shadow-md flex items-center gap-2 disabled:opacity-50">
                {isProcessing ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />} Post Collection
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}