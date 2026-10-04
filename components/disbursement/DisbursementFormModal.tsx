"use client";

import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  Calendar,
  User,
  DollarSign,
  FileText,
  Tag,
  Wallet,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Loader2,
  ArrowRight,
  ArrowLeft,
  ShieldCheck,
  Building2,
  FileCheck,
  CreditCard,
  Layers,
  Clock,
  Eye,
  Lock
} from 'lucide-react';

export type DisbursementType = 'Loan Release' | 'Expense' | 'Other Authorized Release';
export type PaymentMethod = 'Cheque' | 'Bank Transfer' | 'Cash Voucher';
export type ChequeStatus = 'Issued' | 'Encashed' | 'Cancelled/Void';

export const CONFIGURED_DISBURSEMENT_TYPES: DisbursementType[] = [
  'Loan Release',
  'Expense',
  'Other Authorized Release'
];

export const CONFIGURED_PAYMENT_METHODS: PaymentMethod[] = [
  'Cheque',
  'Bank Transfer',
  'Cash Voucher'
];

export const CONFIGURED_CHEQUE_STATUSES: ChequeStatus[] = [
  'Issued',
  'Encashed',
  'Cancelled/Void'
];

export const CONFIGURED_CATEGORIES = [
  'Loan Release',
  'Operational Expense',
  'Administrative Expense',
  'Member Benefit / Calamity Assistance',
  'Capital Expenditure',
  'Community Development'
] as const;

export interface FundRecord {
  id: string;
  name: string;
  code: string;
  balance: number;
}

export const CONFIGURED_FUNDS: FundRecord[] = [
  { id: 'FND-005', name: 'Loan Fund', code: 'LNF', balance: 850000 },
  { id: 'FND-002', name: 'General Fund', code: 'GEN', balance: 250000 },
  { id: 'FND-001', name: 'Union Fund', code: 'UNF', balance: 500000 },
  { id: 'FND-006', name: 'Calamity Fund', code: 'CAL', balance: 300000 },
  { id: 'FND-003', name: 'Death Assistance Fund', code: 'DAF', balance: 15000 }
];

export interface ProcessableItem {
  id: string;
  ref: string;
  type: DisbursementType;
  category: string;
  payee: string;
  purpose: string;
  fundSource: string;
  approvedAmount?: number;
  amount: number;
  loanRef?: string;
  date?: string;
  paymentMethod?: PaymentMethod;
  chequeNumber?: string;
  chequeStatus?: ChequeStatus;
}

interface DisbursementFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  itemToProcess?: ProcessableItem | null;
  funds?: FundRecord[];
  onDisbursementComplete: (completedDisbursement: any) => void;
}

export default function DisbursementFormModal({
  isOpen,
  onClose,
  itemToProcess,
  funds = CONFIGURED_FUNDS,
  onDisbursementComplete
}: DisbursementFormModalProps) {
  // Modal step: 'input' (Task 1-8, 10) vs 'review' (Task 11)
  const [step, setStep] = useState<'input' | 'review'>('input');

  const isProcessingExistingItem = !!itemToProcess;

  // Primary Form fields (Task 1 & Task 4)
  const [disbursementType, setDisbursementType] = useState<DisbursementType>('Loan Release');
  const [disbursementDate, setDisbursementDate] = useState<string>('');
  const [payee, setPayee] = useState<string>('');
  const [amount, setAmount] = useState<string>('');
  const [purpose, setPurpose] = useState<string>('');
  const [fundSource, setFundSource] = useState<string>('');
  const [category, setCategory] = useState<string>('');
  const [supportingDocRef, setSupportingDocRef] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('Cheque');

  // Task 6 & 7: Loan Release Specific Fields
  const [loanRef, setLoanRef] = useState<string>('');
  const [approvedLoanAmount, setApprovedLoanAmount] = useState<string>('');
  const [actualAmountReleased, setActualAmountReleased] = useState<string>('');

  // Task 8 & 9: Cheque Specific Fields
  const [chequeNumber, setChequeNumber] = useState<string>('');
  const [chequeDate, setChequeDate] = useState<string>('');
  const [chequePayee, setChequePayee] = useState<string>('');
  const [chequeAmount, setChequeAmount] = useState<string>('');
  const [chequePurpose, setChequePurpose] = useState<string>('');
  const [chequeRelatedRef, setChequeRelatedRef] = useState<string>('');
  const [chequeStatus, setChequeStatus] = useState<ChequeStatus>('Issued');

  // Validation & submission state
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [submissionError, setSubmissionError] = useState<string | null>(null);

  // Initialize or reset form state
  useEffect(() => {
    if (isOpen) {
      const today = new Date().toISOString().split('T')[0];
      setStep('input');
      setTouched({});
      setSubmissionError(null);
      setIsSubmitting(false);

      if (itemToProcess) {
        setDisbursementType(itemToProcess.type);
        setDisbursementDate(itemToProcess.date || today);
        setPayee(itemToProcess.payee || '');
        setAmount(itemToProcess.amount ? itemToProcess.amount.toString() : '');
        setPurpose(itemToProcess.purpose || '');
        setFundSource(itemToProcess.fundSource || 'Loan Fund');
        setCategory(
          itemToProcess.category ||
            (itemToProcess.type === 'Loan Release' ? 'Loan Release' : 'Operational Expense')
        );
        const refVal = itemToProcess.ref
          ? `VCH-${itemToProcess.ref}`
          : `VCH-${Math.floor(10000 + Math.random() * 90000)}`;
        setSupportingDocRef(refVal);
        setPaymentMethod(itemToProcess.paymentMethod || 'Cheque');

        if (itemToProcess.type === 'Loan Release') {
          setLoanRef(itemToProcess.loanRef || itemToProcess.ref || '');
          setApprovedLoanAmount(
            itemToProcess.approvedAmount
              ? itemToProcess.approvedAmount.toString()
              : itemToProcess.amount.toString()
          );
          setActualAmountReleased(itemToProcess.amount ? itemToProcess.amount.toString() : '');
        } else {
          setLoanRef('');
          setApprovedLoanAmount('');
          setActualAmountReleased('');
        }

        // Initialize Cheque fields (Task 8)
        const chkNum = itemToProcess.chequeNumber || `CHK-2026-${Math.floor(1000 + Math.random() * 9000)}`;
        setChequeNumber(chkNum);
        setChequeDate(itemToProcess.date || today);
        setChequePayee(itemToProcess.payee || '');
        setChequeAmount(itemToProcess.amount ? itemToProcess.amount.toString() : '');
        setChequePurpose(itemToProcess.purpose || '');
        setChequeRelatedRef(itemToProcess.loanRef || itemToProcess.ref || refVal);
        setChequeStatus(itemToProcess.chequeStatus || 'Issued');
      } else {
        // Fresh record
        setDisbursementType('Loan Release');
        setDisbursementDate(today);
        setPayee('');
        setAmount('');
        setPurpose('');
        setFundSource('Loan Fund');
        setCategory('Loan Release');
        const refVal = `VCH-${Math.floor(10000 + Math.random() * 90000)}`;
        setSupportingDocRef(refVal);
        setPaymentMethod('Cheque');
        setLoanRef('');
        setApprovedLoanAmount('');
        setActualAmountReleased('');

        // Cheque fields
        setChequeNumber(`CHK-2026-${Math.floor(1000 + Math.random() * 9000)}`);
        setChequeDate(today);
        setChequePayee('');
        setChequeAmount('');
        setChequePurpose('');
        setChequeRelatedRef(refVal);
        setChequeStatus('Issued');
      }
    }
  }, [isOpen, itemToProcess]);

  // Sync Payee, Amount, Purpose, and RelatedRef to Cheque fields
  const handlePayeeChange = (val: string) => {
    setPayee(val);
    setChequePayee(val);
  };

  const handlePurposeChange = (val: string) => {
    setPurpose(val);
    setChequePurpose(val);
  };

  const handleSupportingDocRefChange = (val: string) => {
    setSupportingDocRef(val);
    setChequeRelatedRef(val);
  };

  const handleTypeChange = (newType: DisbursementType) => {
    setDisbursementType(newType);
    setSubmissionError(null);

    if (newType === 'Loan Release') {
      setCategory('Loan Release');
      setFundSource('Loan Fund');
      if (actualAmountReleased) {
        setAmount(actualAmountReleased);
        setChequeAmount(actualAmountReleased);
      }
    } else if (newType === 'Expense') {
      setCategory('Operational Expense');
      setFundSource('General Fund');
    } else {
      setCategory('Member Benefit / Calamity Assistance');
      setFundSource('Calamity Fund');
    }
  };

  const handleActualReleaseChange = (val: string) => {
    setActualAmountReleased(val);
    setAmount(val);
    setChequeAmount(val);
  };

  const handleAmountChange = (val: string) => {
    setAmount(val);
    setChequeAmount(val);
  };

  // Find selected fund details
  const selectedFundRecord = useMemo(() => {
    return funds.find((f) => f.name === fundSource);
  }, [fundSource, funds]);

  // Format currency helper
  const formatCurrency = (val: number) => {
    return `₱${val.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  // Validation logic (Tasks 1, 2, 3, 5, 6, 7, 8, 10)
  const validation = useMemo(() => {
    const errors: Record<string, string> = {};

    // Task 1 & 2: Required disbursement fields
    if (!disbursementDate) {
      errors.disbursementDate = 'Disbursement date is required';
    }

    if (!payee || payee.trim().length < 2) {
      errors.payee = 'Payee / Recipient is required (minimum 2 characters)';
    }

    const numAmount = parseFloat(amount);
    if (!amount || isNaN(numAmount) || numAmount <= 0) {
      errors.amount = 'Valid disbursement amount greater than ₱0 is required';
    }

    if (!purpose || purpose.trim().length < 3) {
      errors.purpose = 'Disbursement purpose is required';
    }

    // Task 3: Category validation
    if (!category) {
      errors.category = 'Disbursement category must be selected';
    } else if (!CONFIGURED_CATEGORIES.includes(category as any)) {
      errors.category = 'Selected category is not among configured categories';
    }

    // Task 1: Supporting Document/Reference
    if (!supportingDocRef || supportingDocRef.trim().length < 2) {
      errors.supportingDocRef = 'Supporting document / reference voucher is required';
    }

    // Task 5 & 10: Fund selection & balance validation
    if (!fundSource) {
      errors.fundSource = 'Applicable fund source must be selected';
    } else if (!funds.some((f) => f.name === fundSource)) {
      errors.fundSource = 'Selected fund is not a configured fund';
    } else if (selectedFundRecord && numAmount > selectedFundRecord.balance) {
      // Task 10: Prevent submission when disbursement amount exceeds available balance
      errors.fundSource = `Insufficient Fund Balance: The disbursement amount (${formatCurrency(
        numAmount
      )}) exceeds available balance (${formatCurrency(selectedFundRecord.balance)}) in ${selectedFundRecord.name}`;
      errors.insufficientFund = `Disbursement amount exceeds available balance by ${formatCurrency(
        numAmount - selectedFundRecord.balance
      )}`;
    }

    // Task 6: Loan release specific validations
    if (disbursementType === 'Loan Release') {
      if (!loanRef || loanRef.trim().length < 2) {
        errors.loanRef = 'Loan reference is required for loan releases';
      }

      const numApproved = parseFloat(approvedLoanAmount);
      if (!approvedLoanAmount || isNaN(numApproved) || numApproved <= 0) {
        errors.approvedLoanAmount = 'Valid approved loan amount is required';
      }

      const numActual = parseFloat(actualAmountReleased);
      if (!actualAmountReleased || isNaN(numActual) || numActual <= 0) {
        errors.actualAmountReleased = 'Actual amount released is required';
      }

      // Task 7: Actual amount released cannot exceed approved loan amount
      if (!isNaN(numApproved) && !isNaN(numActual) && numActual > numApproved) {
        errors.actualAmountReleased = `Actual Amount Released (${formatCurrency(
          numActual
        )}) cannot exceed Approved Loan Amount (${formatCurrency(numApproved)})`;
        errors.exceedsApproved = `Actual Amount Released exceeds Approved Loan Amount by ${formatCurrency(
          numActual - numApproved
        )}`;
      }
    }

    // Task 8: Cheque Details validation when cheque payment is selected
    if (paymentMethod === 'Cheque') {
      if (!chequeNumber || chequeNumber.trim().length < 2) {
        errors.chequeNumber = 'Cheque Number is required when cheque payment is selected';
      }

      if (!chequeDate) {
        errors.chequeDate = 'Cheque Date is required when cheque payment is selected';
      }

      if (!chequePayee || chequePayee.trim().length < 2) {
        errors.chequePayee = 'Cheque Payee is required';
      }

      const numChequeAmount = parseFloat(chequeAmount);
      if (!chequeAmount || isNaN(numChequeAmount) || numChequeAmount <= 0) {
        errors.chequeAmount = 'Valid Cheque Amount is required';
      }

      if (!chequePurpose || chequePurpose.trim().length < 3) {
        errors.chequePurpose = 'Cheque Purpose is required';
      }

      if (!chequeRelatedRef || chequeRelatedRef.trim().length < 2) {
        errors.chequeRelatedRef = 'Related Reference is required for the cheque';
      }

      // Business rule: Cannot disburse funds using a Cancelled/Void cheque
      if (chequeStatus === 'Cancelled/Void') {
        errors.chequeStatus = 'Cannot disburse funds with a Cancelled/Void cheque. Status must be "Issued" to execute release.';
      }
    }

    const isValid = Object.keys(errors).length === 0;
    return { errors, isValid };
  }, [
    disbursementDate,
    payee,
    amount,
    purpose,
    fundSource,
    category,
    supportingDocRef,
    disbursementType,
    paymentMethod,
    loanRef,
    approvedLoanAmount,
    actualAmountReleased,
    chequeNumber,
    chequeDate,
    chequePayee,
    chequeAmount,
    chequePurpose,
    chequeRelatedRef,
    selectedFundRecord,
    funds
  ]);

  const markTouched = (field: string) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
  };

  // Move to Task 11 Review Step
  const handleProceedToReview = (e: React.FormEvent) => {
    e.preventDefault();

    const allTouched: Record<string, boolean> = {
      disbursementDate: true,
      payee: true,
      amount: true,
      purpose: true,
      fundSource: true,
      category: true,
      supportingDocRef: true,
      loanRef: true,
      approvedLoanAmount: true,
      actualAmountReleased: true,
      chequeNumber: true,
      chequeDate: true,
      chequePayee: true,
      chequeAmount: true,
      chequePurpose: true,
      chequeRelatedRef: true
    };
    setTouched(allTouched);

    if (!validation.isValid) {
      setSubmissionError('Please correct the validation errors below before proceeding to review.');
      return;
    }

    setSubmissionError(null);
    setStep('review');
  };

  // Finalize disbursement (Task 11 & Task 14)
  const handleFinalizeDisbursement = async () => {
    setIsSubmitting(true);
    setSubmissionError(null);

    try {
      const numericAmount = parseFloat(amount);
      const prevBal = selectedFundRecord?.balance || 0;
      const updatedBal = prevBal - numericAmount;

      const disbursementRecord = {
        id: itemToProcess?.id || `disb-${Date.now()}`,
        ref: supportingDocRef.trim(),
        type: disbursementType,
        category: category,
        payee: payee.trim(),
        purpose: purpose.trim(),
        amount: numericAmount,
        fundSource: fundSource,
        date: disbursementDate,
        status: 'Disbursed',
        paymentMethod: paymentMethod,
        supportingDocRef: supportingDocRef.trim(),
        // Loan details
        loanRef: disbursementType === 'Loan Release' ? loanRef.trim() : undefined,
        approvedLoanAmount:
          disbursementType === 'Loan Release' ? parseFloat(approvedLoanAmount) : undefined,
        actualAmountReleased:
          disbursementType === 'Loan Release' ? parseFloat(actualAmountReleased) : numericAmount,
        // Task 8 & 9: Cheque details
        chequeRecord:
          paymentMethod === 'Cheque'
            ? {
                chequeNumber: chequeNumber.trim(),
                chequeDate: chequeDate,
                payee: chequePayee.trim(),
                amount: parseFloat(chequeAmount),
                purpose: chequePurpose.trim(),
                relatedReference: chequeRelatedRef.trim(),
                status: chequeStatus
              }
            : undefined,
        chequeNumber: paymentMethod === 'Cheque' ? chequeNumber.trim() : undefined,
        chequeStatus: paymentMethod === 'Cheque' ? chequeStatus : undefined,
        // Task 14: Balance effect details
        fundFinancialEffect: {
          fundName: fundSource,
          previousBalance: prevBal,
          disbursedAmount: numericAmount,
          updatedBalance: updatedBal
        },
        processedAt: new Date().toISOString(),
        processedBy: 'Treasurer'
      };

      await new Promise((r) => setTimeout(r, 600));

      onDisbursementComplete(disbursementRecord);
      onClose();
    } catch (err: any) {
      setSubmissionError(err.message || 'Failed to finalize disbursement. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  const glassInput =
    'w-full px-4 py-2.5 bg-white/70 hover:bg-white/90 focus:bg-white backdrop-blur-xl border border-white/90 shadow-[inset_0_2px_4px_rgba(4,21,45,0.03)] rounded-xl text-[13px] text-[#04152d] outline-none transition-all duration-300 placeholder:text-[#04152d]/40 focus:border-blue-500/50 focus:shadow-[0_4px_16px_rgba(4,21,45,0.08),inset_0_1px_2px_rgba(255,255,255,1)]';

  const inputErrorStyle = 'border-red-400 bg-red-50/50 focus:border-red-500 focus:bg-red-50/70 text-red-950';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#04152d]/60 backdrop-blur-md animate-fade-in overflow-y-auto">
      <div
        className="relative w-full max-w-2xl bg-white/85 backdrop-blur-3xl border border-white/90 shadow-[0_20px_60px_rgba(4,21,45,0.25),inset_0_2px_4px_rgba(255,255,255,0.9)] rounded-[28px] overflow-hidden animate-modal-enter my-6"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-5 border-b border-white/80 bg-gradient-to-r from-white/95 via-white/80 to-blue-50/50 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#0a1e3f] to-[#04152d] flex items-center justify-center text-white shadow-[0_4px_12px_rgba(4,21,45,0.25)]">
              {step === 'review' ? (
                <ShieldCheck size={20} className="text-blue-400" />
              ) : (
                <DollarSign size={20} className="text-emerald-400" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-[17px] font-bold text-[#04152d] tracking-tight">
                  {step === 'review'
                    ? 'Review Disbursement Details'
                    : itemToProcess
                    ? 'Process Disbursement'
                    : 'Record Disbursement'}
                </h2>
                {step === 'review' && (
                  <span className="px-2 py-0.5 bg-blue-100 text-blue-800 border border-blue-200 rounded-md text-[10px] font-bold uppercase tracking-wider">
                    Step 2 of 2: Verification
                  </span>
                )}
              </div>
              <p className="text-[11px] text-[#04152d]/60 font-medium">
                {step === 'review'
                  ? 'Verify all outgoing transaction and cheque details before finalization'
                  : itemToProcess
                  ? `Processing approved release for ${itemToProcess.payee}`
                  : 'Record an outgoing financial release and verify fund balances'}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/70 hover:bg-white text-[#04152d]/60 hover:text-[#04152d] flex items-center justify-center transition-all duration-200 border border-white shadow-sm"
          >
            <X size={16} />
          </button>
        </div>

        {/* ========================================================================= */}
        {/* STAGE 1: INPUT FORM (Tasks 1, 2, 3, 4, 5, 6, 7, 8, 10) */}
        {/* ========================================================================= */}
        {step === 'input' && (
          <form
            onSubmit={handleProceedToReview}
            className="p-6 space-y-5 max-h-[80vh] overflow-y-auto hide-scrollbar"
          >
            {/* Top Error Alert */}
            {submissionError && (
              <div className="p-3.5 rounded-2xl bg-red-50/80 border border-red-200 text-red-700 flex items-start gap-2.5 text-[12px] animate-slide-up">
                <AlertCircle size={16} className="text-red-500 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold">Validation Required</p>
                  <p className="text-red-600 mt-0.5">{submissionError}</p>
                </div>
              </div>
            )}

            {/* Task 4: Disbursement Type Selection */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-[11px] font-bold uppercase tracking-wider text-[#04152d]/70">
                  Disbursement Type <span className="text-red-500">*</span>
                </label>
                {isProcessingExistingItem && (
                  <span className="text-[10px] text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-full flex items-center gap-1 font-semibold">
                    <Lock size={10} /> Pre-approved Payable Type
                  </span>
                )}
              </div>
              <div className="grid grid-cols-3 gap-2 p-1 bg-white/60 backdrop-blur-md rounded-2xl border border-white/80 shadow-[inset_0_1px_3px_rgba(4,21,45,0.04)]">
                {CONFIGURED_DISBURSEMENT_TYPES.map((type) => {
                  const isSelected = disbursementType === type;
                  return (
                    <button
                      key={type}
                      type="button"
                      disabled={isProcessingExistingItem && !isSelected}
                      onClick={() => !isProcessingExistingItem && handleTypeChange(type)}
                      className={`py-2 px-3 rounded-xl text-[12px] font-semibold transition-all duration-200 text-center ${
                        isSelected
                          ? 'bg-gradient-to-b from-[#0a1e3f] to-[#04152d] text-white shadow-[0_4px_12px_rgba(4,21,45,0.2)]'
                          : isProcessingExistingItem
                          ? 'text-[#04152d]/30 cursor-not-allowed opacity-50'
                          : 'text-[#04152d]/70 hover:text-[#04152d] hover:bg-white/70'
                      }`}
                    >
                      {type}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Payment Method Selector */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-[11px] font-bold uppercase tracking-wider text-[#04152d]/70">
                  Payment Release Method <span className="text-red-500">*</span>
                </label>
                {isProcessingExistingItem && (
                  <span className="text-[10px] text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-full flex items-center gap-1 font-semibold">
                    <Lock size={10} /> Designated Method
                  </span>
                )}
              </div>
              <div className="grid grid-cols-3 gap-2 p-1 bg-white/60 backdrop-blur-md rounded-2xl border border-white/80 shadow-[inset_0_1px_3px_rgba(4,21,45,0.04)]">
                {CONFIGURED_PAYMENT_METHODS.map((method) => {
                  const isSelected = paymentMethod === method;
                  return (
                    <button
                      key={method}
                      type="button"
                      disabled={isProcessingExistingItem && !isSelected}
                      onClick={() => !isProcessingExistingItem && setPaymentMethod(method)}
                      className={`py-2 px-3 rounded-xl text-[12px] font-semibold transition-all duration-200 text-center ${
                        isSelected
                          ? 'bg-gradient-to-b from-[#0a1e3f] to-[#04152d] text-white shadow-[0_4px_12px_rgba(4,21,45,0.2)]'
                          : isProcessingExistingItem
                          ? 'text-[#04152d]/30 cursor-not-allowed opacity-50'
                          : 'text-[#04152d]/70 hover:text-[#04152d] hover:bg-white/70'
                      }`}
                    >
                      {method}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Task 6 & 7: Loan Release Specific Section */}
            {disbursementType === 'Loan Release' && (
              <div className="p-4 rounded-2xl bg-blue-50/50 border border-blue-100 shadow-[inset_0_1px_2px_rgba(255,255,255,0.8)] space-y-4 animate-slide-up">
                <div className="flex items-center gap-2 pb-2 border-b border-blue-100/70 text-[12px] font-bold text-blue-900">
                  <FileCheck size={16} className="text-blue-600" />
                  <span>Loan Release Verification</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {/* Loan Reference */}
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-[#04152d]/70 mb-1">
                      Loan Reference <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={loanRef}
                      onChange={(e) => setLoanRef(e.target.value)}
                      onBlur={() => markTouched('loanRef')}
                      placeholder="e.g. LN-2026-0891"
                      className={`${glassInput} ${
                        touched.loanRef && validation.errors.loanRef ? inputErrorStyle : ''
                      }`}
                    />
                    {touched.loanRef && validation.errors.loanRef && (
                      <p className="mt-1 text-[11px] text-red-600 flex items-center gap-1 font-medium">
                        <AlertCircle size={11} /> {validation.errors.loanRef}
                      </p>
                    )}
                  </div>

                  {/* Approved Loan Amount */}
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-[#04152d]/70 mb-1">
                      Approved Amount (₱) <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={approvedLoanAmount}
                      onChange={(e) => setApprovedLoanAmount(e.target.value)}
                      onBlur={() => markTouched('approvedLoanAmount')}
                      placeholder="0.00"
                      className={`${glassInput} ${
                        touched.approvedLoanAmount && validation.errors.approvedLoanAmount
                          ? inputErrorStyle
                          : ''
                      }`}
                    />
                    {touched.approvedLoanAmount && validation.errors.approvedLoanAmount && (
                      <p className="mt-1 text-[11px] text-red-600 flex items-center gap-1 font-medium">
                        <AlertCircle size={11} /> {validation.errors.approvedLoanAmount}
                      </p>
                    )}
                  </div>

                  {/* Actual Amount Released */}
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-[#04152d]/70 mb-1">
                      Actual Released (₱) <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={actualAmountReleased}
                      onChange={(e) => handleActualReleaseChange(e.target.value)}
                      onBlur={() => markTouched('actualAmountReleased')}
                      placeholder="0.00"
                      className={`${glassInput} ${
                        (touched.actualAmountReleased && validation.errors.actualAmountReleased) ||
                        validation.errors.exceedsApproved
                          ? inputErrorStyle
                          : ''
                      }`}
                    />
                    {touched.actualAmountReleased && validation.errors.actualAmountReleased && (
                      <p className="mt-1 text-[11px] text-red-600 flex items-center gap-1 font-medium">
                        <AlertCircle size={11} /> {validation.errors.actualAmountReleased}
                      </p>
                    )}
                  </div>
                </div>

                {/* Task 7 Error Banner if Actual > Approved */}
                {validation.errors.exceedsApproved && (
                  <div className="p-3 rounded-xl bg-red-100/90 border border-red-300 text-red-800 flex items-start gap-2 text-[12px] animate-slide-up">
                    <AlertCircle size={16} className="text-red-600 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold">Validation Error: </span>
                      {validation.errors.actualAmountReleased}
                      <div className="text-[11px] text-red-700 mt-0.5">
                        Submissions exceeding the approved loan amount are strictly blocked.
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Task 8 & 9: Cheque Details Section when Cheque Payment is Selected */}
            {paymentMethod === 'Cheque' && (
              <div className="p-4 rounded-2xl bg-amber-50/60 border border-amber-200/80 shadow-[inset_0_1px_2px_rgba(255,255,255,0.8)] space-y-4 animate-slide-up">
                <div className="flex items-center justify-between pb-2 border-b border-amber-200/60">
                  <div className="flex items-center gap-2 text-[12px] font-bold text-amber-900">
                    <CreditCard size={16} className="text-amber-700" />
                    <span>Cheque Payment Details (Required for Cheque Releases)</span>
                  </div>
                  {/* Task 9: Cheque Status Display - Enforced & Locked to 'Issued' for new release */}
                  <div className="flex items-center gap-1.5 px-2.5 py-1 bg-amber-100/90 border border-amber-300 rounded-lg text-[11px] font-bold text-amber-900 shadow-sm">
                    <Lock size={11} className="text-amber-700" />
                    <span>Cheque Status: Issued</span>
                    <span className="text-[9px] bg-white/80 px-1 rounded text-amber-800 font-semibold">
                      (Active Release)
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {/* 1. Cheque Number */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-[#04152d]/70">
                        Cheque Number <span className="text-red-500">*</span>
                      </label>
                      {isProcessingExistingItem && itemToProcess?.chequeNumber && (
                        <span className="text-[9px] text-amber-900 bg-amber-100 px-1 rounded font-semibold flex items-center gap-0.5">
                          <Lock size={9} /> Assigned
                        </span>
                      )}
                    </div>
                    <input
                      type="text"
                      value={chequeNumber}
                      disabled={isProcessingExistingItem && !!itemToProcess?.chequeNumber}
                      onChange={(e) => setChequeNumber(e.target.value)}
                      onBlur={() => markTouched('chequeNumber')}
                      placeholder="e.g. CHK-2026-9042"
                      className={`${glassInput} ${
                        isProcessingExistingItem && !!itemToProcess?.chequeNumber
                          ? 'bg-white/40 cursor-not-allowed opacity-80 font-mono font-bold'
                          : ''
                      } ${
                        touched.chequeNumber && validation.errors.chequeNumber ? inputErrorStyle : ''
                      }`}
                    />
                    {touched.chequeNumber && validation.errors.chequeNumber && (
                      <p className="mt-1 text-[11px] text-red-600 flex items-center gap-1 font-medium">
                        <AlertCircle size={11} /> {validation.errors.chequeNumber}
                      </p>
                    )}
                  </div>

                  {/* 2. Cheque Date */}
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-[#04152d]/70 mb-1">
                      Cheque Date <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="date"
                      value={chequeDate}
                      onChange={(e) => setChequeDate(e.target.value)}
                      onBlur={() => markTouched('chequeDate')}
                      className={`${glassInput} ${
                        touched.chequeDate && validation.errors.chequeDate ? inputErrorStyle : ''
                      }`}
                    />
                    {touched.chequeDate && validation.errors.chequeDate && (
                      <p className="mt-1 text-[11px] text-red-600 flex items-center gap-1 font-medium">
                        <AlertCircle size={11} /> {validation.errors.chequeDate}
                      </p>
                    )}
                  </div>

                  {/* 3. Cheque Payee */}
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-[#04152d]/70 mb-1">
                      Cheque Payee <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={chequePayee}
                      onChange={(e) => setChequePayee(e.target.value)}
                      onBlur={() => markTouched('chequePayee')}
                      placeholder="Payee on Cheque"
                      className={`${glassInput} ${
                        touched.chequePayee && validation.errors.chequePayee ? inputErrorStyle : ''
                      }`}
                    />
                    {touched.chequePayee && validation.errors.chequePayee && (
                      <p className="mt-1 text-[11px] text-red-600 flex items-center gap-1 font-medium">
                        <AlertCircle size={11} /> {validation.errors.chequePayee}
                      </p>
                    )}
                  </div>

                  {/* 4. Cheque Amount */}
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-[#04152d]/70 mb-1">
                      Cheque Amount (₱) <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={chequeAmount}
                      onChange={(e) => {
                        setChequeAmount(e.target.value);
                        setAmount(e.target.value);
                      }}
                      onBlur={() => markTouched('chequeAmount')}
                      placeholder="0.00"
                      className={`${glassInput} ${
                        touched.chequeAmount && validation.errors.chequeAmount ? inputErrorStyle : ''
                      }`}
                    />
                    {touched.chequeAmount && validation.errors.chequeAmount && (
                      <p className="mt-1 text-[11px] text-red-600 flex items-center gap-1 font-medium">
                        <AlertCircle size={11} /> {validation.errors.chequeAmount}
                      </p>
                    )}
                  </div>

                  {/* 5. Cheque Purpose */}
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-[#04152d]/70 mb-1">
                      Cheque Purpose <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={chequePurpose}
                      onChange={(e) => setChequePurpose(e.target.value)}
                      onBlur={() => markTouched('chequePurpose')}
                      placeholder="Purpose written on cheque"
                      className={`${glassInput} ${
                        touched.chequePurpose && validation.errors.chequePurpose ? inputErrorStyle : ''
                      }`}
                    />
                    {touched.chequePurpose && validation.errors.chequePurpose && (
                      <p className="mt-1 text-[11px] text-red-600 flex items-center gap-1 font-medium">
                        <AlertCircle size={11} /> {validation.errors.chequePurpose}
                      </p>
                    )}
                  </div>

                  {/* 6. Related Reference */}
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-[#04152d]/70 mb-1">
                      Related Reference <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={chequeRelatedRef}
                      onChange={(e) => setChequeRelatedRef(e.target.value)}
                      onBlur={() => markTouched('chequeRelatedRef')}
                      placeholder="e.g. Loan Ref or Voucher Ref"
                      className={`${glassInput} ${
                        touched.chequeRelatedRef && validation.errors.chequeRelatedRef
                          ? inputErrorStyle
                          : ''
                      }`}
                    />
                    {touched.chequeRelatedRef && validation.errors.chequeRelatedRef && (
                      <p className="mt-1 text-[11px] text-red-600 flex items-center gap-1 font-medium">
                        <AlertCircle size={11} /> {validation.errors.chequeRelatedRef}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Grid for Primary Disbursement Fields */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Task 1: Disbursement Date */}
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-[#04152d]/70 mb-1.5 flex items-center gap-1.5">
                  <Calendar size={13} className="text-[#04152d]/50" />
                  Disbursement Date <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={disbursementDate}
                  onChange={(e) => {
                    setDisbursementDate(e.target.value);
                    if (!chequeDate) setChequeDate(e.target.value);
                  }}
                  onBlur={() => markTouched('disbursementDate')}
                  className={`${glassInput} ${
                    touched.disbursementDate && validation.errors.disbursementDate ? inputErrorStyle : ''
                  }`}
                />
                {touched.disbursementDate && validation.errors.disbursementDate && (
                  <p className="mt-1 text-[11px] text-red-600 flex items-center gap-1 font-medium">
                    <AlertCircle size={11} /> {validation.errors.disbursementDate}
                  </p>
                )}
              </div>

              {/* Task 1: Payee / Recipient */}
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-[#04152d]/70 mb-1.5 flex items-center gap-1.5">
                  <User size={13} className="text-[#04152d]/50" />
                  Payee / Recipient <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={payee}
                  onChange={(e) => handlePayeeChange(e.target.value)}
                  onBlur={() => markTouched('payee')}
                  placeholder="e.g. Maria Santos / Office Supplier"
                  className={`${glassInput} ${
                    touched.payee && validation.errors.payee ? inputErrorStyle : ''
                  }`}
                />
                {touched.payee && validation.errors.payee && (
                  <p className="mt-1 text-[11px] text-red-600 flex items-center gap-1 font-medium">
                    <AlertCircle size={11} /> {validation.errors.payee}
                  </p>
                )}
              </div>

              {/* Task 1: Amount */}
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-[#04152d]/70 mb-1.5 flex items-center gap-1.5">
                  <DollarSign size={13} className="text-[#04152d]/50" />
                  Disbursement Amount (₱) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={amount}
                  disabled={disbursementType === 'Loan Release' && !!actualAmountReleased}
                  onChange={(e) => handleAmountChange(e.target.value)}
                  onBlur={() => markTouched('amount')}
                  placeholder="0.00"
                  className={`${glassInput} ${
                    disbursementType === 'Loan Release' ? 'bg-white/40 cursor-not-allowed' : ''
                  } ${touched.amount && validation.errors.amount ? inputErrorStyle : ''}`}
                />
                {touched.amount && validation.errors.amount && (
                  <p className="mt-1 text-[11px] text-red-600 flex items-center gap-1 font-medium">
                    <AlertCircle size={11} /> {validation.errors.amount}
                  </p>
                )}
              </div>

              {/* Task 1 & 3: Category Selection */}
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-[#04152d]/70 mb-1.5 flex items-center gap-1.5">
                  <Tag size={13} className="text-[#04152d]/50" />
                  Disbursement Category <span className="text-red-500">*</span>
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  onBlur={() => markTouched('category')}
                  className={`${glassInput} ${
                    touched.category && validation.errors.category ? inputErrorStyle : ''
                  } cursor-pointer`}
                >
                  <option value="">-- Select Configured Category --</option>
                  {CONFIGURED_CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
                {touched.category && validation.errors.category && (
                  <p className="mt-1 text-[11px] text-red-600 flex items-center gap-1 font-medium">
                    <AlertCircle size={11} /> {validation.errors.category}
                  </p>
                )}
              </div>
            </div>

            {/* Task 1, 5 & 10: Fund Selection & Available Balance Verification */}
            <div className="space-y-2">
              <label className="block text-[11px] font-bold uppercase tracking-wider text-[#04152d]/70 flex items-center gap-1.5">
                <Wallet size={13} className="text-[#04152d]/50" />
                Applicable Fund / Source <span className="text-red-500">*</span>
              </label>
              <select
                value={fundSource}
                onChange={(e) => setFundSource(e.target.value)}
                onBlur={() => markTouched('fundSource')}
                className={`${glassInput} ${
                  touched.fundSource && validation.errors.fundSource ? inputErrorStyle : ''
                } cursor-pointer`}
              >
                <option value="">-- Select Configured Fund --</option>
                {funds.map((fund) => (
                  <option key={fund.id} value={fund.name}>
                    {fund.name} ({fund.code}) — Available: {formatCurrency(fund.balance)}
                  </option>
                ))}
              </select>

              {/* Task 5 & 10: Showing Available Balance & Projected Balance */}
              {selectedFundRecord && (
                <div
                  className={`p-3.5 rounded-2xl border transition-all duration-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[12px] ${
                    validation.errors.insufficientFund
                      ? 'bg-red-50/80 border-red-300'
                      : 'bg-white/70 border-white/90 shadow-[0_4px_16px_rgba(4,21,45,0.03)]'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Building2
                      size={16}
                      className={validation.errors.insufficientFund ? 'text-red-600' : 'text-blue-600'}
                    />
                    <div>
                      <span className="font-semibold text-[#04152d]">{selectedFundRecord.name}</span>
                      <span className="text-[11px] text-[#04152d]/50 ml-1.5">
                        ({selectedFundRecord.code})
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-[#04152d]/50 block">
                        Available Balance
                      </span>
                      <span className="font-bold text-[#04152d]">
                        {formatCurrency(selectedFundRecord.balance)}
                      </span>
                    </div>

                    {amount && !isNaN(parseFloat(amount)) && (
                      <div className="border-l border-[#04152d]/10 pl-4">
                        <span className="text-[10px] uppercase font-bold text-[#04152d]/50 block">
                          Projected Balance
                        </span>
                        <span
                          className={`font-bold ${
                            selectedFundRecord.balance - parseFloat(amount) < 0
                              ? 'text-red-600'
                              : 'text-emerald-700'
                          }`}
                        >
                          {formatCurrency(selectedFundRecord.balance - parseFloat(amount))}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Task 10: Insufficient Balance Error Alert */}
              {validation.errors.insufficientFund && (
                <div className="p-3 rounded-xl bg-red-100/90 border border-red-300 text-red-800 flex items-start gap-2 text-[12px] animate-slide-up">
                  <AlertCircle size={16} className="text-red-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold">Fund Availability Error: </span>
                    {validation.errors.fundSource}
                    <div className="text-[11px] text-red-700 mt-0.5 font-medium">
                      Release cannot proceed without sufficient fund liquidity. Submission is disabled.
                    </div>
                  </div>
                </div>
              )}

              {touched.fundSource && validation.errors.fundSource && !validation.errors.insufficientFund && (
                <p className="mt-1 text-[11px] text-red-600 flex items-center gap-1 font-medium">
                  <AlertCircle size={11} /> {validation.errors.fundSource}
                </p>
              )}
            </div>

            {/* Task 1: Purpose */}
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-[#04152d]/70 mb-1.5 flex items-center gap-1.5">
                <FileText size={13} className="text-[#04152d]/50" />
                Disbursement Purpose <span className="text-red-500">*</span>
              </label>
              <textarea
                rows={2}
                value={purpose}
                onChange={(e) => handlePurposeChange(e.target.value)}
                onBlur={() => markTouched('purpose')}
                placeholder="State the official business purpose or reason for disbursement release..."
                className={`${glassInput} !rounded-2xl resize-none ${
                  touched.purpose && validation.errors.purpose ? inputErrorStyle : ''
                }`}
              />
              {touched.purpose && validation.errors.purpose && (
                <p className="mt-1 text-[11px] text-red-600 flex items-center gap-1 font-medium">
                  <AlertCircle size={11} /> {validation.errors.purpose}
                </p>
              )}
            </div>

            {/* Task 1: Supporting Document / Reference */}
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-[#04152d]/70 mb-1.5 flex items-center gap-1.5">
                <ShieldCheck size={13} className="text-[#04152d]/50" />
                Supporting Document / Reference Voucher <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={supportingDocRef}
                onChange={(e) => handleSupportingDocRefChange(e.target.value)}
                onBlur={() => markTouched('supportingDocRef')}
                placeholder="e.g. VCH-2026-0042 / Check #98124 / OR #1129"
                className={`${glassInput} ${
                  touched.supportingDocRef && validation.errors.supportingDocRef ? inputErrorStyle : ''
                }`}
              />
              {touched.supportingDocRef && validation.errors.supportingDocRef && (
                <p className="mt-1 text-[11px] text-red-600 flex items-center gap-1 font-medium">
                  <AlertCircle size={11} /> {validation.errors.supportingDocRef}
                </p>
              )}
            </div>

            {/* Footer Actions */}
            <div className="pt-4 border-t border-white/80 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2.5 rounded-full border border-white/80 bg-white/60 hover:bg-white text-[13px] font-semibold text-[#04152d]/70 hover:text-[#04152d] transition-all duration-200 active:scale-95"
              >
                Cancel
              </button>

              {/* Task 11: Button advances to Review stage */}
              <button
                type="submit"
                disabled={!validation.isValid}
                className={`px-6 py-2.5 rounded-full text-[13px] font-semibold flex items-center gap-2 transition-all duration-300 shadow-md ${
                  validation.isValid
                    ? 'bg-gradient-to-b from-[#0a1e3f] to-[#04152d] text-white hover:from-[#0f2850] hover:to-[#061a38] shadow-[0_6px_20px_rgba(4,21,45,0.3)] active:scale-95'
                    : 'bg-[#04152d]/30 text-white/50 cursor-not-allowed'
                }`}
              >
                <span>Review Disbursement Details</span>
                <ArrowRight size={16} />
              </button>
            </div>
          </form>
        )}

        {/* ========================================================================= */}
        {/* STAGE 2: TASK 11 REVIEW & VERIFICATION BEFORE FINALIZATION */}
        {/* ========================================================================= */}
        {step === 'review' && (
          <div className="p-6 space-y-5 max-h-[80vh] overflow-y-auto hide-scrollbar animate-slide-up">
            <div className="p-4 rounded-2xl bg-blue-50/60 border border-blue-200/80 flex items-start gap-3">
              <ShieldCheck size={20} className="text-blue-600 shrink-0 mt-0.5" />
              <div className="text-[12px]">
                <p className="font-bold text-blue-950">Pre-Finalization Review</p>
                <p className="text-blue-800 mt-0.5">
                  Please carefully verify each detail below before finalizing fund release. Outgoing
                  transactions will immediately affect ledger balances.
                </p>
              </div>
            </div>

            {/* Task 11 Criteria Checklist Summary */}
            <div className="bg-white/70 backdrop-blur-md rounded-2xl border border-white/90 p-5 space-y-4 shadow-sm text-[13px]">
              <h3 className="font-bold text-[#04152d] text-[14px] pb-2 border-b border-white/80 flex items-center justify-between">
                <span>Transaction Verification Summary</span>
                <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                  Ready to Finalize
                </span>
              </h3>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                {/* 1. Reference Number */}
                <div className="space-y-0.5">
                  <span className="text-[10px] uppercase font-bold text-[#04152d]/50 block">
                    Reference Number
                  </span>
                  <span className="font-mono font-bold text-blue-700">{supportingDocRef}</span>
                </div>

                {/* 2. Date */}
                <div className="space-y-0.5">
                  <span className="text-[10px] uppercase font-bold text-[#04152d]/50 block">
                    Disbursement Date
                  </span>
                  <span className="font-semibold text-[#04152d]">{disbursementDate}</span>
                </div>

                {/* 3. Payee */}
                <div className="space-y-0.5">
                  <span className="text-[10px] uppercase font-bold text-[#04152d]/50 block">
                    Payee / Recipient
                  </span>
                  <span className="font-bold text-[#04152d]">{payee}</span>
                </div>

                {/* 4. Amount */}
                <div className="space-y-0.5">
                  <span className="text-[10px] uppercase font-bold text-[#04152d]/50 block">
                    Disbursement Amount
                  </span>
                  <span className="font-bold text-[16px] text-emerald-700">
                    {formatCurrency(parseFloat(amount) || 0)}
                  </span>
                </div>

                {/* 5. Fund / Source */}
                <div className="space-y-0.5">
                  <span className="text-[10px] uppercase font-bold text-[#04152d]/50 block">
                    Fund / Source
                  </span>
                  <span className="font-semibold text-[#04152d]">{fundSource}</span>
                </div>

                {/* 6. Category */}
                <div className="space-y-0.5">
                  <span className="text-[10px] uppercase font-bold text-[#04152d]/50 block">
                    Disbursement Category
                  </span>
                  <span className="font-semibold text-[#04152d]">{category}</span>
                </div>

                {/* 7. Type */}
                <div className="space-y-0.5">
                  <span className="text-[10px] uppercase font-bold text-[#04152d]/50 block">
                    Disbursement Type
                  </span>
                  <span className="font-semibold text-[#04152d]">{disbursementType}</span>
                </div>

                {/* 8. Supporting Reference */}
                <div className="space-y-0.5">
                  <span className="text-[10px] uppercase font-bold text-[#04152d]/50 block">
                    Supporting Reference
                  </span>
                  <span className="font-medium text-[#04152d]">{supportingDocRef}</span>
                </div>

                {/* 9. Payment Method */}
                <div className="space-y-0.5">
                  <span className="text-[10px] uppercase font-bold text-[#04152d]/50 block">
                    Payment Method
                  </span>
                  <span className="font-bold text-blue-900">{paymentMethod}</span>
                </div>
              </div>

              {/* Purpose */}
              <div className="pt-2 border-t border-white/60 space-y-0.5">
                <span className="text-[10px] uppercase font-bold text-[#04152d]/50 block">Purpose</span>
                <p className="font-medium text-[#04152d]/80 bg-white/50 p-2.5 rounded-xl border border-white/80 text-[12px]">
                  {purpose}
                </p>
              </div>

              {/* Loan Details if Loan Release */}
              {disbursementType === 'Loan Release' && (
                <div className="pt-2 border-t border-white/60">
                  <span className="text-[10px] uppercase font-bold text-blue-900/60 block mb-2">
                    Loan Verification Details
                  </span>
                  <div className="grid grid-cols-3 gap-3 bg-blue-50/40 p-3 rounded-xl border border-blue-100">
                    <div>
                      <span className="text-[10px] uppercase text-[#04152d]/50 block font-bold">
                        Loan Reference
                      </span>
                      <span className="font-mono font-semibold text-[#04152d]">{loanRef}</span>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase text-[#04152d]/50 block font-bold">
                        Approved Loan Amount
                      </span>
                      <span className="font-semibold text-[#04152d]">
                        {formatCurrency(parseFloat(approvedLoanAmount) || 0)}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase text-[#04152d]/50 block font-bold">
                        Actual Amount Released
                      </span>
                      <span className="font-bold text-blue-700">
                        {formatCurrency(parseFloat(actualAmountReleased) || 0)}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Cheque Details if Payment Method is Cheque */}
              {paymentMethod === 'Cheque' && (
                <div className="pt-2 border-t border-white/60">
                  <span className="text-[10px] uppercase font-bold text-amber-900/60 block mb-2">
                    Cheque Release Details
                  </span>
                  <div className="grid grid-cols-3 gap-3 bg-amber-50/40 p-3 rounded-xl border border-amber-200/80 text-[12px]">
                    <div>
                      <span className="text-[10px] uppercase text-[#04152d]/50 block font-bold">
                        Cheque Number
                      </span>
                      <span className="font-mono font-bold text-[#04152d]">{chequeNumber}</span>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase text-[#04152d]/50 block font-bold">
                        Cheque Date
                      </span>
                      <span className="font-semibold text-[#04152d]">{chequeDate}</span>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase text-[#04152d]/50 block font-bold">
                        Cheque Status
                      </span>
                      <span className="px-2 py-0.5 rounded font-bold text-[11px] bg-amber-100 text-amber-900 border border-amber-300 inline-block">
                        {chequeStatus}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase text-[#04152d]/50 block font-bold">
                        Cheque Payee
                      </span>
                      <span className="font-medium text-[#04152d]">{chequePayee}</span>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase text-[#04152d]/50 block font-bold">
                        Cheque Amount
                      </span>
                      <span className="font-bold text-[#04152d]">
                        {formatCurrency(parseFloat(chequeAmount) || 0)}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase text-[#04152d]/50 block font-bold">
                        Related Reference
                      </span>
                      <span className="font-mono text-[#04152d]/80">{chequeRelatedRef}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Task 14: Projected Balance Impact */}
              {selectedFundRecord && (
                <div className="pt-3 border-t border-white/60">
                  <span className="text-[10px] uppercase font-bold text-[#04152d]/50 block mb-2">
                    Financial Impact On Fund
                  </span>
                  <div className="grid grid-cols-3 gap-3 bg-white/70 p-3 rounded-xl border border-white/90 text-center">
                    <div>
                      <span className="text-[10px] uppercase text-[#04152d]/50 block font-bold">
                        Previous Balance
                      </span>
                      <span className="font-bold text-[#04152d]">
                        {formatCurrency(selectedFundRecord.balance)}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase text-[#04152d]/50 block font-bold">
                        Disbursed Outflow
                      </span>
                      <span className="font-bold text-red-600">
                        - {formatCurrency(parseFloat(amount) || 0)}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase text-[#04152d]/50 block font-bold">
                        Updated Balance
                      </span>
                      <span className="font-bold text-emerald-700">
                        {formatCurrency(selectedFundRecord.balance - (parseFloat(amount) || 0))}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Stage 2 Footer Actions */}
            <div className="pt-4 border-t border-white/80 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => setStep('input')}
                disabled={isSubmitting}
                className="px-5 py-2.5 rounded-full border border-white/80 bg-white/60 hover:bg-white text-[13px] font-semibold text-[#04152d]/70 hover:text-[#04152d] transition-all duration-200 active:scale-95 flex items-center gap-1.5"
              >
                <ArrowLeft size={16} />
                <span>Back to Edit</span>
              </button>

              <button
                type="button"
                onClick={handleFinalizeDisbursement}
                disabled={isSubmitting}
                className="px-6 py-2.5 rounded-full text-[13px] font-semibold flex items-center gap-2 transition-all duration-300 shadow-md bg-gradient-to-b from-[#0a1e3f] to-[#04152d] text-white hover:from-[#0f2850] hover:to-[#061a38] shadow-[0_6px_20px_rgba(4,21,45,0.3)] active:scale-95"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 size={16} className="animate-spin text-white" />
                    <span>Finalizing Release...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 size={16} className="text-emerald-400" />
                    <span>Finalize & Disburse Funds</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
