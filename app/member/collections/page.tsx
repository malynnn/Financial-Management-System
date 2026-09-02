"use client";

import React, { useState, useRef, useEffect, Suspense } from 'react';
import { useSession } from 'next-auth/react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  UploadCloud, AlertCircle, CheckCircle2, 
  Send, Loader2, FileText, X, ChevronDown, User, Calendar, Receipt, CreditCard, Info, ExternalLink
} from 'lucide-react';
import Header from '@/components/Header';

const SYSTEM_PAYMENT_METHODS = ["GCash", "Maya", "Bank Transfer", "Over-the-Counter", "Salary Deduction"];
const MAX_FILE_SIZE_MB = 5;
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'];
const MAX_PAYMENT_AMOUNT = 1000000;

interface Obligation {
  id: string;
  obligationType: string;
  outstandingBalance: number;
  originalAmount: number;
}

function CollectionFormContent() {
  const { data: session } = useSession();
  const searchParams = useSearchParams();
  const router = useRouter();

  const sessionMemberId = (session?.user as any)?.id || 'usr-member-1';
  const prefilledObligationId = searchParams.get('obligationId') || '';
  const prefilledAmount = searchParams.get('amount') || '';

  const [memberId, setMemberId] = useState(sessionMemberId);
  const [selectedObligationId, setSelectedObligationId] = useState(prefilledObligationId);
  const [activeObligations, setActiveObligations] = useState<Obligation[]>([]);
  const [amount, setAmount] = useState(prefilledAmount);
  const [paymentDate, setPaymentDate] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('GCash');
  const [reference, setReference] = useState('');
  const [description, setDescription] = useState('');
  
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [amountError, setAmountError] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionResult, setSubmissionResult] = useState<{
    id: string;
    refNo?: string;
    amount: number;
    reference: string;
  } | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [todayDate, setTodayDate] = useState('');

  useEffect(() => {
    setTodayDate(new Date().toISOString().split('T')[0]);
    setPaymentDate(new Date().toISOString().split('T')[0]);
  }, []);

  useEffect(() => {
    if (session?.user) {
      setMemberId((session.user as any).id || 'usr-member-1');
    }
  }, [session]);

  useEffect(() => {
    const fetchObligations = async () => {
      try {
        const res = await fetch(`http://localhost:3001/obligations/active/${memberId}`);
        if (res.ok) {
          const data = await res.json();
          setActiveObligations(data);
        }
      } catch {
        // Fallback
      }
    };
    if (memberId) {
      fetchObligations();
    }
  }, [memberId]);

  const handleObligationSelect = (obId: string) => {
    setSelectedObligationId(obId);
    const ob = activeObligations.find(o => o.id === obId);
    if (ob) {
      setAmount(String(ob.outstandingBalance));
      setDescription(`Payment for ${ob.obligationType}`);
      setAmountError(null);
    }
  };

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setAmount(val);
    
    if (val && Number(val) <= 0) {
      setAmountError("Amount must be greater than zero.");
    } else if (val && Number(val) > MAX_PAYMENT_AMOUNT) {
      setAmountError(`Amount cannot exceed ₱${MAX_PAYMENT_AMOUNT.toLocaleString()}.`);
    } else {
      setAmountError(null);
    }
  };

  const processFile = (file: File) => {
    setFileError(null);
    
    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      setFileError("Invalid file format. Please upload a JPG, PNG, or PDF.");
      setProofFile(null);
      return;
    }

    if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
      setFileError(`File size exceeds the ${MAX_FILE_SIZE_MB}MB limit.`);
      setProofFile(null);
      return;
    }

    setProofFile(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const clearFile = () => {
    setProofFile(null);
    setFileError(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const isFormValid = Boolean(
    memberId.trim() && 
    amount && Number(amount) > 0 && Number(amount) <= MAX_PAYMENT_AMOUNT &&
    paymentDate && 
    paymentMethod && 
    reference.trim() && 
    proofFile &&
    !amountError
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid) return;

    setIsSubmitting(true);
    setErrorMessage(null);

    let mappedMethod = 'GCASH';
    if (paymentMethod === 'Bank Transfer') mappedMethod = 'BANK_TRANSFER';
    else if (paymentMethod === 'Over-the-Counter') mappedMethod = 'CASH';
    else if (paymentMethod === 'Maya') mappedMethod = 'GCASH';
    else if (paymentMethod === 'Salary Deduction') mappedMethod = 'OTHER';

    try {
      const res = await fetch('http://localhost:3001/collections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          memberId,
          paymentAmount: Number(amount),
          paymentDate: new Date(paymentDate).toISOString(),
          paymentMethod: mappedMethod,
          paymentReference: reference.trim(),
          description: description.trim() || `Payment via ${paymentMethod}`,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || 'Failed to submit collection');
      }

      const collection = await res.json();

      if (proofFile) {
        const formData = new FormData();
        formData.append('file', proofFile);

        const proofRes = await fetch(`http://localhost:3001/collections/${collection.id}/proof`, {
          method: 'POST',
          body: formData,
        });

        if (proofRes.ok) {
          const updatedCollection = await proofRes.json();
          setSubmissionResult({
            id: updatedCollection.id,
            refNo: updatedCollection.collectionRefNo,
            amount: Number(amount),
            reference: reference.trim(),
          });
        } else {
          setSubmissionResult({
            id: collection.id,
            refNo: collection.collectionRefNo,
            amount: Number(amount),
            reference: reference.trim(),
          });
        }
      }

      setReference('');
      setDescription('');
      clearFile();
    } catch (err: any) {
      setErrorMessage(err.message || 'An unexpected error occurred during submission.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const ultraGlassCard = "bg-white/60 backdrop-blur-[40px] backdrop-saturate-[200%] border border-white/80 shadow-[0_8px_30px_rgba(4,21,45,0.06),inset_0_2px_3px_rgba(255,255,255,0.9)] rounded-[24px] p-6 lg:p-8 relative overflow-hidden transition-all duration-400";
  const glassInput = "w-full pl-11 pr-4 py-3.5 bg-white/70 hover:bg-white/90 focus:bg-white backdrop-blur-xl border border-white/90 shadow-[inset_0_2px_4px_rgba(4,21,45,0.03)] rounded-[16px] text-[13.5px] font-semibold text-[#04152d] outline-none transition-all duration-300 placeholder:text-[#04152d]/40 placeholder:font-medium focus:shadow-[0_4px_16px_rgba(4,21,45,0.08),inset_0_1px_2px_rgba(255,255,255,1)] disabled:opacity-50 disabled:cursor-not-allowed";
  const inputLabel = "block text-[11px] font-semibold text-[#04152d]/70 uppercase tracking-widest mb-2 pl-1 flex items-center gap-1";

  return (
    <div className="relative flex flex-col min-h-screen bg-[#f4f5f7]">
      <div className="sticky top-0 z-40 w-full backdrop-blur-2xl bg-white/30 border-b border-white/50 shadow-[0_4px_30px_rgba(0,0,0,0.03)]">
        <Header />
      </div>

      <div className="p-4 md:p-6 max-w-[1200px] w-full mx-auto animate-fade-in flex-1 relative z-10">

        {/* Success Alert */}
        {submissionResult && (
          <div className="mb-6 bg-emerald-50/90 backdrop-blur-md border border-emerald-200 shadow-[0_8px_20px_rgba(16,185,129,0.15)] p-5 rounded-[20px] flex items-start justify-between gap-4 animate-fade-in">
            <div className="flex items-start gap-3.5">
              <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center shrink-0 border border-emerald-200 mt-0.5">
                <CheckCircle2 size={22} className="text-emerald-600" />
              </div>
              <div>
                <p className="text-[15px] font-black text-emerald-900 tracking-tight">Payment Submitted Successfully!</p>
                <p className="text-[12.5px] font-medium text-emerald-800/90 mt-0.5">
                  Your payment of <span className="font-bold font-mono">₱{submissionResult.amount.toLocaleString()}</span> (Ref: <span className="font-mono font-bold">{submissionResult.reference}</span>) has been queued for Treasurer verification.
                </p>
                <p className="text-[11.5px] text-emerald-700/80 mt-1">
                  Status: <span className="font-bold uppercase bg-emerald-100 px-2 py-0.5 rounded text-[10px]">For Verification</span>
                </p>
              </div>
            </div>
            <Link
              href="/member/dashboard"
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-full text-[12px] font-bold tracking-wide transition-all shadow-sm shrink-0"
            >
              View My Summary
            </Link>
          </div>
        )}

        {/* Error Alert */}
        {errorMessage && (
          <div className="mb-6 bg-red-50/90 backdrop-blur-md border border-red-200 text-red-700 p-4 rounded-[16px] flex items-start gap-3 text-[13px] font-bold animate-fade-in">
            <AlertCircle size={18} className="shrink-0 mt-0.5 text-red-500" />
            <p className="leading-relaxed">{errorMessage}</p>
          </div>
        )}

        <div className="grid grid-cols-1 xl:grid-cols-5 gap-6 mt-2">
          
          {/* Main Form Fields */}
          <form onSubmit={handleSubmit} className="xl:col-span-3 space-y-6">
            <div className={ultraGlassCard}>
              <h3 className="text-[14px] font-black text-[#04152d] tracking-tight uppercase tracking-widest border-b border-white/60 pb-3 mb-6 flex items-center gap-2">
                <Receipt size={18} className="text-blue-600" /> Payment & Obligation Details
              </h3>
              
              <div className="space-y-5">
                
                {/* Target Obligation Selector */}
                {activeObligations.length > 0 && (
                  <div>
                    <label className={inputLabel}>Apply Payment Towards Obligation (Optional)</label>
                    <div className="relative">
                      <select
                        value={selectedObligationId}
                        onChange={(e) => handleObligationSelect(e.target.value)}
                        disabled={isSubmitting}
                        className={`${glassInput} pl-4 appearance-none cursor-pointer`}
                      >
                        <option value="">General Deposit / Unassigned Obligation</option>
                        {activeObligations.map((ob) => (
                          <option key={ob.id} value={ob.id}>
                            {ob.obligationType} — Balance: ₱{Number(ob.outstandingBalance).toLocaleString()}
                          </option>
                        ))}
                      </select>
                      <ChevronDown size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-[#04152d]/50 pointer-events-none" />
                    </div>
                  </div>
                )}

                <div>
                  <label className={inputLabel}>Member ID <span className="text-red-500 text-[14px] leading-none">*</span></label>
                  <div className="relative">
                    <User size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#04152d]/50" />
                    <input
                      type="text"
                      required
                      disabled={isSubmitting}
                      value={memberId}
                      onChange={(e) => setMemberId(e.target.value)}
                      className={glassInput}
                      placeholder="e.g. usr-member-1"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <label className={inputLabel}>Payment Amount <span className="text-red-500 text-[14px] leading-none">*</span></label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#04152d]/50 font-bold text-[14px]">₱</span>
                      <input
                        type="number"
                        min="0.01"
                        max={MAX_PAYMENT_AMOUNT}
                        step="0.01"
                        required
                        disabled={isSubmitting}
                        value={amount}
                        onChange={handleAmountChange}
                        className={`${glassInput} !pl-9 ${amountError ? '!border-red-400 !bg-red-50/50' : ''}`}
                        placeholder="0.00"
                      />
                    </div>
                    {amountError && (
                      <p className="text-[11px] font-semibold text-red-500 mt-1.5 ml-1 animate-fade-in flex items-center gap-1">
                        <AlertCircle size={10} /> {amountError}
                      </p>
                    )}
                  </div>
                  <div>
                    <label className={inputLabel}>Payment Date <span className="text-red-500 text-[14px] leading-none">*</span></label>
                    <div className="relative">
                      <Calendar size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#04152d]/50" />
                      <input
                        type="date"
                        required
                        max={todayDate}
                        disabled={isSubmitting}
                        value={paymentDate}
                        onChange={(e) => setPaymentDate(e.target.value)}
                        className={`${glassInput} cursor-pointer [&::-webkit-calendar-picker-indicator]:opacity-50`}
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <label className={inputLabel}>Payment Method <span className="text-red-500 text-[14px] leading-none">*</span></label>
                    <div className="relative">
                      <CreditCard size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#04152d]/50 z-10" />
                      <select
                        required
                        disabled={isSubmitting}
                        value={paymentMethod}
                        onChange={(e) => setPaymentMethod(e.target.value)}
                        className={`${glassInput} appearance-none cursor-pointer pl-11`}
                      >
                        {SYSTEM_PAYMENT_METHODS.map(method => (
                          <option key={method} value={method}>{method}</option>
                        ))}
                      </select>
                      <ChevronDown size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-[#04152d]/50 pointer-events-none" />
                    </div>
                  </div>
                  <div>
                    <label className={inputLabel}>Payment Reference <span className="text-red-500 text-[14px] leading-none">*</span></label>
                    <div className="relative">
                      <FileText size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#04152d]/50" />
                      <input
                        type="text"
                        required
                        disabled={isSubmitting}
                        value={reference}
                        onChange={(e) => setReference(e.target.value)}
                        className={glassInput}
                        placeholder="e.g. GCASH-998811 or Bank Ref No."
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label className={inputLabel}>Note / Remarks (Optional)</label>
                  <input
                    type="text"
                    disabled={isSubmitting}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className={glassInput}
                    placeholder="e.g. Annual Dues payment installment"
                  />
                </div>
              </div>
            </div>

            <div className="xl:hidden">
              <button
                type="submit"
                disabled={!isFormValid || isSubmitting}
                className="w-full bg-[#04152d] hover:bg-[#04152d]/90 disabled:bg-gray-400 text-white p-4 rounded-[16px] font-black text-[14px] shadow-lg flex justify-center items-center gap-2"
              >
                {isSubmitting ? <><Loader2 size={18} className="animate-spin" /> Submitting Payment...</> : <><Send size={18} /> Submit Collection</>}
              </button>
            </div>
          </form>

          {/* Proof Upload Area */}
          <div className="xl:col-span-2 space-y-6">
            <div className={ultraGlassCard}>
              <h3 className="text-[14px] font-black text-[#04152d] tracking-tight uppercase tracking-widest border-b border-white/60 pb-3 mb-6 flex items-center gap-2">
                <UploadCloud size={18} className="text-blue-600" /> Proof of Payment <span className="text-red-500 normal-case tracking-normal text-[16px] leading-none">*</span>
              </h3>

              <div 
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
                className={`flex flex-col items-center justify-center border-2 border-dashed rounded-[20px] p-8 text-center transition-all duration-300 ${
                  dragActive 
                    ? 'border-blue-500 bg-blue-50/70 scale-[1.02]' 
                    : 'border-blue-300/70 bg-blue-50/40 hover:bg-blue-50/60 hover:border-blue-400'
                } ${isSubmitting ? 'opacity-50 pointer-events-none' : ''}`}
              >
                {!proofFile ? (
                  <>
                    <div className="w-16 h-16 rounded-full flex items-center justify-center mb-4 bg-white border border-blue-100 shadow-sm">
                      <UploadCloud size={28} className="text-blue-500" />
                    </div>
                    <p className="text-[13px] font-bold text-[#04152d] mb-1">
                      {dragActive ? 'Drop receipt file here' : 'Drag & drop or click to upload'}
                    </p>
                    <p className="text-[11px] font-medium text-[#04152d]/50 mb-6">JPG, PNG, or PDF (Max {MAX_FILE_SIZE_MB}MB)</p>
                    <button 
                      type="button"
                      disabled={isSubmitting}
                      onClick={() => fileInputRef.current?.click()}
                      className="px-6 py-2.5 bg-white border border-white/80 shadow-sm rounded-full text-[12px] font-bold text-blue-600 hover:shadow-md transition-all active:scale-95"
                    >
                      Browse Files
                    </button>
                  </>
                ) : (
                  <div className="w-full flex items-center bg-white/90 border border-white shadow-sm rounded-[16px] p-4 text-left relative">
                    <FileText size={24} className="text-blue-500 shrink-0 mr-3" />
                    <div className="overflow-hidden pr-8 w-full">
                      <p className="text-[13px] font-bold text-[#04152d] truncate" title={proofFile.name}>{proofFile.name}</p>
                      <p className="text-[11px] font-medium text-[#04152d]/50">{(proofFile.size / 1024 / 1024).toFixed(2)} MB</p>
                    </div>
                    <button 
                      type="button"
                      onClick={clearFile}
                      disabled={isSubmitting}
                      className="absolute right-4 p-1.5 bg-red-50 text-red-500 hover:bg-red-100 rounded-full transition-colors"
                      title="Remove file"
                    >
                      <X size={14} />
                    </button>
                  </div>
                )}

                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept=".jpg,.jpeg,.png,.pdf"
                  className="hidden"
                  disabled={isSubmitting}
                />
              </div>

              {fileError && (
                <div className="mt-4 bg-red-50/80 border border-red-200 text-red-700 p-3 rounded-[12px] flex items-start gap-2 text-[12px] font-medium animate-fade-in">
                  <AlertCircle size={16} className="shrink-0 mt-0.5 text-red-500" />
                  <p className="leading-tight">{fileError}</p>
                </div>
              )}
            </div>

            <div className="hidden xl:block">
              <button
                type="button"
                onClick={handleSubmit}
                disabled={!isFormValid || isSubmitting}
                className="w-full bg-[#04152d] hover:bg-[#04152d]/90 disabled:bg-gray-400 disabled:cursor-not-allowed text-white p-4 rounded-[16px] font-black text-[14px] shadow-[0_8px_24px_rgba(4,21,45,0.3)] hover:-translate-y-[1px] active:translate-y-[2px] transition-all duration-300 flex justify-center items-center gap-2 border border-white/10"
              >
                {isSubmitting ? <><Loader2 size={18} className="animate-spin" /> Submitting Payment...</> : <><Send size={18} /> Submit Collection</>}
              </button>
              {!isFormValid && !isSubmitting && (
                <p className="text-[11px] font-semibold text-[#04152d]/50 text-center mt-3 flex items-center justify-center gap-1.5">
                  <AlertCircle size={12} /> Please enter all required details and attach proof.
                </p>
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}

export default function MemberCollectionPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-[#f4f5f7]">
        <Loader2 className="animate-spin text-[#04152d]" size={32} />
      </div>
    }>
      <CollectionFormContent />
    </Suspense>
  );
}