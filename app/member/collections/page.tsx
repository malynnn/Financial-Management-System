"use client";

import React, { useState, useRef, useEffect } from 'react';
import { 
  UploadCloud, AlertCircle, CheckCircle2, 
  Send, Loader2, FileText, X, ChevronDown, User, Calendar, Receipt, CreditCard
} from 'lucide-react';
import Header from '@/components/Header';

const SYSTEM_PAYMENT_METHODS = ["Bank Transfer", "GCash", "Maya", "Over-the-Counter", "Salary Deduction"];
const MAX_FILE_SIZE_MB = 5;
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'application/pdf'];
const MAX_PAYMENT_AMOUNT = 1000000;

export default function MemberCollectionPage() {
  const [memberId, setMemberId] = useState('');
  const [amount, setAmount] = useState('');
  const [paymentDate, setPaymentDate] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('');
  const [reference, setReference] = useState('');
  
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [amountError, setAmountError] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [todayDate, setTodayDate] = useState('');

  useEffect(() => {
    setTodayDate(new Date().toISOString().split('T')[0]);
  }, []);

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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid) return;

    setIsSubmitting(true);

    setTimeout(() => {
      setIsSubmitting(false);
      setShowSuccess(true);
      
      setMemberId('');
      setAmount('');
      setPaymentDate('');
      setPaymentMethod('');
      setReference('');
      clearFile();

      setTimeout(() => setShowSuccess(false), 4000);
    }, 1500);
  };

  const ultraGlassCard = "bg-white/50 backdrop-blur-[40px] backdrop-saturate-[200%] border border-white/80 shadow-[0_8px_30px_rgba(4,21,45,0.06),inset_0_2px_3px_rgba(255,255,255,0.9)] rounded-[24px] p-6 lg:p-8 relative overflow-hidden transition-all duration-400";
  const glassInput = "w-full pl-11 pr-4 py-3.5 bg-white/60 hover:bg-white/80 focus:bg-white/90 backdrop-blur-xl border border-white/90 shadow-[inset_0_2px_4px_rgba(4,21,45,0.03)] rounded-[16px] text-[13.5px] font-semibold text-[#04152d] outline-none transition-all duration-300 placeholder:text-[#04152d]/40 placeholder:font-medium focus:shadow-[0_4px_16px_rgba(4,21,45,0.08),inset_0_1px_2px_rgba(255,255,255,1)] disabled:opacity-50 disabled:cursor-not-allowed";
  const inputLabel = "block text-[11px] font-semibold text-[#04152d]/70 uppercase tracking-widest mb-2 pl-1 flex items-center gap-1";

  return (
    <div className="relative flex flex-col min-h-screen bg-[#f4f5f7]">
      <div className="sticky top-0 z-40 w-full backdrop-blur-2xl bg-white/30 border-b border-white/50 shadow-[0_4px_30px_rgba(0,0,0,0.03)]">
        <Header />
      </div>

      <div className="p-4 md:p-6 max-w-[1200px] w-full mx-auto animate-fade-in flex-1 relative z-10">
        
        {showSuccess && (
          <div className="mb-6 bg-emerald-50/80 backdrop-blur-md border border-emerald-200 shadow-[0_8px_20px_rgba(16,185,129,0.1),inset_0_1px_2px_rgba(255,255,255,1)] p-4 rounded-[16px] flex items-center gap-3 animate-fade-in">
            <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center shrink-0 border border-emerald-200">
              <CheckCircle2 size={20} className="text-emerald-600" />
            </div>
            <div>
              <p className="text-[14px] font-semibold text-emerald-900 tracking-tight">Submission Successful</p>
              <p className="text-[12px] font-medium text-emerald-700/80 mt-0.5">Your payment details have been forwarded to the Treasurer for verification.</p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 xl:grid-cols-5 gap-6 mt-4">
          <form onSubmit={handleSubmit} className="xl:col-span-3 space-y-6">
            <div className={ultraGlassCard}>
              <h3 className="text-[14px] font-semibold text-[#04152d] tracking-tight uppercase tracking-widest border-b border-white/60 pb-3 mb-6 flex items-center gap-2">
                <Receipt size={18} className="text-blue-600" /> Payment Details
              </h3>
              
              <div className="space-y-5">
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
                      placeholder="Enter your assigned Member ID"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <label className={inputLabel}>Payment Amount <span className="text-red-500 text-[14px] leading-none">*</span></label>
                    <div className="relative">
                      {/* Fixed: Replaced DollarSign icon with standard Peso sign text */}
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
                        className={`${glassInput} !pl-9 ${amountError ? '!border-red-400 !bg-red-50/50 focus:!shadow-[0_4px_16px_rgba(239,68,68,0.15),inset_0_1px_2px_rgba(255,255,255,1)]' : ''}`}
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
                        className={`${glassInput} cursor-pointer [&::-webkit-calendar-picker-indicator]:opacity-50 [&::-webkit-calendar-picker-indicator]:cursor-pointer`}
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
                        <option value="" disabled className="text-[#04152d]/40">Select configured method</option>
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
                        placeholder="Transaction or Receipt No."
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="xl:hidden">
              <button
                type="submit"
                disabled={!isFormValid || isSubmitting}
                className="w-full bg-[#04152d] hover:bg-[#04152d]/90 disabled:bg-gray-400 disabled:cursor-not-allowed text-white p-4 rounded-[16px] font-semibold text-[14px] shadow-[0_8px_24px_rgba(4,21,45,0.3)] hover:-translate-y-[1px] active:translate-y-[2px] disabled:hover:translate-y-0 transition-all duration-300 flex justify-center items-center gap-2 border border-white/10"
              >
                {isSubmitting ? <><Loader2 size={18} className="animate-spin" /> Processing...</> : <><Send size={18} /> Submit Collection</>}
              </button>
            </div>
          </form>

          <div className="xl:col-span-2 space-y-6">
            <div className={ultraGlassCard}>
              <h3 className="text-[14px] font-semibold text-[#04152d] tracking-tight uppercase tracking-widest border-b border-white/60 pb-3 mb-6 flex items-center gap-2">
                <UploadCloud size={18} className="text-blue-600" /> Proof of Payment <span className="text-red-500 normal-case tracking-normal text-[16px] leading-none">*</span>
              </h3>

              <div 
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
                className={`flex flex-col items-center justify-center border-2 border-dashed rounded-[20px] p-8 text-center transition-all duration-300 ease-[cubic-bezier(0.25,1,0.5,1)] ${
                  dragActive 
                    ? 'border-blue-500 bg-blue-50/60 scale-[1.02] shadow-[inset_0_4px_12px_rgba(37,99,235,0.1)]' 
                    : 'border-blue-300/60 bg-blue-50/40 hover:bg-blue-50/60 hover:border-blue-400'
                } ${isSubmitting ? 'opacity-50 pointer-events-none' : ''}`}
              >
                {!proofFile ? (
                  <>
                    <div className={`w-16 h-16 shadow-sm rounded-full flex items-center justify-center mb-4 border transition-colors duration-300 ${dragActive ? 'bg-blue-100 border-blue-300' : 'bg-white border-blue-100'}`}>
                      <UploadCloud size={28} className={dragActive ? 'text-blue-600' : 'text-blue-500'} />
                    </div>
                    <p className="text-[13px] font-semibold text-[#04152d] mb-1">
                      {dragActive ? 'Drop file here' : 'Drag & drop or click to upload'}
                    </p>
                    <p className="text-[11px] font-medium text-[#04152d]/50 mb-6">JPG, PNG, or PDF (Max {MAX_FILE_SIZE_MB}MB)</p>
                    <button 
                      type="button"
                      disabled={isSubmitting}
                      onClick={() => fileInputRef.current?.click()}
                      className="px-6 py-2.5 bg-white backdrop-blur-md border border-white/80 shadow-[0_2px_8px_rgba(4,21,45,0.05)] rounded-full text-[12px] font-semibold text-blue-600 hover:shadow-md transition-all active:scale-95 disabled:active:scale-100"
                    >
                      Browse Files
                    </button>
                  </>
                ) : (
                  <div className="w-full flex items-center bg-white/80 border border-white shadow-sm rounded-[16px] p-4 text-left relative group">
                    <FileText size={24} className="text-blue-500 shrink-0 mr-3" />
                    <div className="overflow-hidden pr-8 w-full">
                      <p className="text-[13px] font-semibold text-[#04152d] truncate" title={proofFile.name}>{proofFile.name}</p>
                      <p className="text-[11px] font-medium text-[#04152d]/50">{(proofFile.size / 1024 / 1024).toFixed(2)} MB</p>
                    </div>
                    <button 
                      onClick={clearFile}
                      disabled={isSubmitting}
                      className="absolute right-4 p-1.5 bg-red-50 text-red-500 hover:bg-red-100 rounded-full transition-colors disabled:opacity-50"
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
                <div className="mt-4 bg-red-50/80 backdrop-blur-md border border-red-200 text-red-700 p-3 rounded-[12px] flex items-start gap-2 text-[12px] font-medium animate-fade-in">
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
                className="w-full bg-[#04152d] hover:bg-[#04152d]/90 disabled:bg-gray-400 disabled:cursor-not-allowed text-white p-4 rounded-[16px] font-semibold text-[14px] shadow-[0_8px_24px_rgba(4,21,45,0.3)] hover:-translate-y-[1px] active:translate-y-[2px] disabled:hover:translate-y-0 transition-all duration-300 flex justify-center items-center gap-2 border border-white/10"
              >
                {isSubmitting ? <><Loader2 size={18} className="animate-spin" /> Processing...</> : <><Send size={18} /> Submit Collection</>}
              </button>
              {!isFormValid && !isSubmitting && (
                <p className="text-[11px] font-medium text-[#04152d]/50 text-center mt-3 flex items-center justify-center gap-1.5">
                  <AlertCircle size={12} /> Please fill all required fields and attach proof.
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}