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
  Lock,
  Percent,
  Check,
  Sparkles,
  HelpCircle,
  CheckSquare
} from 'lucide-react';
import { createDisbursementRequest, executeDisbursement, fromBackendMethod } from '@/lib/disbursementApi';
import { addNotification } from '@/lib/notifications';

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
  status?: 'Active' | 'Inactive';
}

export const CONFIGURED_FUNDS: FundRecord[] = [
  { id: 'FND-005', name: 'Loan Fund', code: 'LNF', balance: 850000, status: 'Active' },
  { id: 'FND-002', name: 'General Fund', code: 'GEN', balance: 250000, status: 'Active' },
  { id: 'FND-001', name: 'Union Fund', code: 'UNF', balance: 500000, status: 'Active' },
  { id: 'FND-006', name: 'Calamity Fund', code: 'CAL', balance: 300000, status: 'Active' },
  { id: 'FND-003', name: 'Death Assistance Fund', code: 'DAF', balance: 15000, status: 'Active' },
  { id: 'FND-008', name: 'Legal Defense Fund', code: 'LDF', balance: 95000, status: 'Inactive' }
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
  previouslyDisbursedAmount?: number;
  remainingAuthorizedAmount?: number;
  amount: number;
  loanRef?: string;
  date?: string;
  paymentMethod?: PaymentMethod;
  chequeNumber?: string;
  chequeStatus?: ChequeStatus;
  status?: string;
  // Backend links (Loan Release only)
  obligationId?: string; // approved loan -> POST /disbursements/request
  memberId?: string;
  beneficiaryBank?: string;
  beneficiaryAccount?: string;
  disbursementId?: string; // Admin-approved disbursement -> POST /disbursements/:id/execute
}

interface DisbursementFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  itemToProcess?: ProcessableItem | null;
  funds?: FundRecord[];
  onDisbursementComplete: (completedDisbursement: any) => void;
  /** Called after a Loan Release request is submitted for Admin approval. */
  onRequestSubmitted?: (created: any) => void;
}

export default function DisbursementFormModal({
  isOpen,
  onClose,
  itemToProcess,
  funds = CONFIGURED_FUNDS,
  onDisbursementComplete,
  onRequestSubmitted
}: DisbursementFormModalProps) {
  // Modal step: 'input' (Task 1-8, 10) vs 'review' (Task 11) vs 'confirm' (Task 8 confirmation)
  const [step, setStep] = useState<'input' | 'review' | 'confirm'>('input');

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

  // Task 4 & 5: Beneficiary Verification & Loan Amount Breakdown Fields
  const [recordedBeneficiary, setRecordedBeneficiary] = useState<string>('');
  const [loanRef, setLoanRef] = useState<string>('');
  const [approvedLoanAmount, setApprovedLoanAmount] = useState<string>('');
  const [previouslyDisbursedAmount, setPreviouslyDisbursedAmount] = useState<string>('0');
  const [actualAmountReleased, setActualAmountReleased] = useState<string>('');

  // Task 8 & 9: Cheque Specific Fields
  const [chequeNumber, setChequeNumber] = useState<string>('');
  const [chequeDate, setChequeDate] = useState<string>('');
  const [chequePayee, setChequePayee] = useState<string>('');
  const [chequeAmount, setChequeAmount] = useState<string>('');
  const [chequePurpose, setChequePurpose] = useState<string>('');
  const [chequeRelatedRef, setChequeRelatedRef] = useState<string>('');
  const [chequeStatus, setChequeStatus] = useState<ChequeStatus>('Issued');

  // Internal Control & Security Verification states (Step 2)
  const [isKycVerified, setIsKycVerified] = useState<boolean>(true);
  const [isDocAttached, setIsDocAttached] = useState<boolean>(true);
  const [isSecurityCertified, setIsSecurityCertified] = useState<boolean>(false);

  // Task 8: Confirmation state before final payment execution
  const [areYouSureConfirmed, setAreYouSureConfirmed] = useState<boolean>(false);

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
      setIsKycVerified(true);
      setIsDocAttached(true);
      setIsSecurityCertified(false);
      setAreYouSureConfirmed(false);

      if (itemToProcess) {
        setDisbursementType(itemToProcess.type);
        setDisbursementDate(itemToProcess.date || today);
        setPayee(itemToProcess.payee || '');
        const recBen = itemToProcess.payee || (itemToProcess as any).beneficiaryName || (itemToProcess as any).member || '';
        setRecordedBeneficiary(recBen);
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
          const appAmt = itemToProcess.approvedAmount
            ? itemToProcess.approvedAmount.toString()
            : itemToProcess.amount.toString();
          setApprovedLoanAmount(appAmt);
          const prevAmt = (itemToProcess as any).previouslyDisbursedAmount
            ? (itemToProcess as any).previouslyDisbursedAmount.toString()
            : '0';
          setPreviouslyDisbursedAmount(prevAmt);
          setActualAmountReleased(itemToProcess.amount ? itemToProcess.amount.toString() : '');
        } else {
          setLoanRef('');
          setApprovedLoanAmount('');
          setPreviouslyDisbursedAmount('0');
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
        setRecordedBeneficiary('');
        setAmount('');
        setPurpose('');
        setFundSource('Loan Fund');
        setCategory('Loan Release');
        const refVal = `VCH-${Math.floor(10000 + Math.random() * 90000)}`;
        setSupportingDocRef(refVal);
        setPaymentMethod('Cheque');
        setLoanRef('');
        setApprovedLoanAmount('');
        setPreviouslyDisbursedAmount('0');
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

  // Task 4: Beneficiary Verification logic
  const isBeneficiaryMismatch = useMemo(() => {
    if (!recordedBeneficiary.trim() || !payee.trim()) return false;
    return recordedBeneficiary.trim().toLowerCase() !== payee.trim().toLowerCase();
  }, [recordedBeneficiary, payee]);

  // Task 5: 4-part amount calculation
  const remainingAuthorizedAmount = useMemo(() => {
    const numApproved = parseFloat(approvedLoanAmount) || 0;
    const numPrev = parseFloat(previouslyDisbursedAmount) || 0;
    return Math.max(0, numApproved - numPrev);
  }, [approvedLoanAmount, previouslyDisbursedAmount]);

  // Validation logic (Tasks 1, 2, 3, 4, 5, 6, 7, 8, 10)
  const validation = useMemo(() => {
    const errors: Record<string, string> = {};

    // Task 1 & 2: Required disbursement fields
    if (!disbursementDate) {
      errors.disbursementDate = 'Disbursement date is required';
    } else {
      const d = new Date(disbursementDate);
      const now = new Date();
      const pastLimit = new Date();
      pastLimit.setFullYear(now.getFullYear() - 1);
      const futureLimit = new Date();
      futureLimit.setDate(now.getDate() + 30);
      if (d < pastLimit) {
        errors.disbursementDate = 'Disbursement date cannot exceed 1 year in the past';
      } else if (d > futureLimit) {
        errors.disbursementDate = 'Disbursement date cannot exceed 30 days in advance';
      }
    }

    if (!payee || payee.trim().length < 3) {
      errors.payee = 'Payee / Recipient is required (minimum 3 characters)';
    } else if (/^[^a-zA-Z\u00C0-\u024F]+$/.test(payee.trim())) {
      errors.payee = 'Payee name must contain valid alphabetic characters';
    } else if (recordedBeneficiary.trim() && isBeneficiaryMismatch) {
      // Task 4: Beneficiary mismatch check
      errors.payee = `Beneficiary Mismatch: Payee ("${payee.trim()}") does not match recorded loan beneficiary ("${recordedBeneficiary.trim()}"). Execution is blocked.`;
      errors.beneficiaryMismatch = `Payee name "${payee.trim()}" does not match recorded approved loan beneficiary "${recordedBeneficiary.trim()}".`;
    }

    const numAmount = parseFloat(amount);
    if (!amount || isNaN(numAmount) || numAmount <= 0) {
      errors.amount = 'Valid disbursement amount greater than ₱0 is required';
    } else if (numAmount > 10000000) {
      errors.amount = 'Disbursement amount exceeds maximum single transaction limit (₱10,000,000.00)';
    }

    if (!purpose || purpose.trim().length < 5) {
      errors.purpose = 'Disbursement purpose must be at least 5 characters for auditing clarity';
    }

    // Task 3: Category validation
    if (!category) {
      errors.category = 'Disbursement category must be selected';
    } else if (!CONFIGURED_CATEGORIES.includes(category as any)) {
      errors.category = 'Selected category is not among configured categories';
    }

    // Task 1: Supporting Document/Reference
    if (!supportingDocRef || supportingDocRef.trim().length < 3) {
      errors.supportingDocRef = 'Supporting document / reference voucher is required (minimum 3 characters)';
    }

    // Task 5 & 10 & Sprint 3 Rule 11: Fund selection & balance validation & inactive restriction
    if (!fundSource) {
      errors.fundSource = 'Applicable fund source must be selected';
    } else if (!funds.some((f) => f.name === fundSource)) {
      errors.fundSource = 'Selected fund is not a configured fund';
    } else if (selectedFundRecord && selectedFundRecord.status === 'Inactive') {
      errors.fundSource = `Inactive Fund Restricted: "${selectedFundRecord.name}" is marked Inactive and cannot be selected for new financial postings.`;
    } else if (selectedFundRecord && numAmount > selectedFundRecord.balance) {
      // Task 10: Prevent submission when disbursement amount exceeds available balance
      errors.fundSource = `Insufficient Fund Balance: The disbursement amount (${formatCurrency(
        numAmount
      )}) exceeds available balance (${formatCurrency(selectedFundRecord.balance)}) in ${selectedFundRecord.name}`;
      errors.insufficientFund = `Disbursement amount exceeds available balance by ${formatCurrency(
        numAmount - selectedFundRecord.balance
      )}`;
    }

    // Task 6 & 7: Loan release specific validations
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

      const numPrev = parseFloat(previouslyDisbursedAmount) || 0;
      const remAuth = Math.max(0, (numApproved || 0) - numPrev);

      // Task 5: Actual amount released cannot exceed remaining authorized amount
      if (!isNaN(remAuth) && !isNaN(numActual) && numActual > remAuth) {
        errors.actualAmountReleased = `Actual Amount Released (${formatCurrency(
          numActual
        )}) cannot exceed Remaining Authorized Balance (${formatCurrency(remAuth)})`;
        errors.exceedsApproved = `Actual Amount Released exceeds Remaining Authorized Balance by ${formatCurrency(
          numActual - remAuth
        )}`;
      }
    }

    // Task 8: Cheque Details validation when cheque payment is selected
    if (paymentMethod === 'Cheque') {
      if (!chequeNumber || chequeNumber.trim().length < 4) {
        errors.chequeNumber = 'Cheque Number is required (minimum 4 characters / digits)';
      } else if (!/^[A-Za-z0-9-]+$/.test(chequeNumber.trim())) {
        errors.chequeNumber = 'Cheque Number format should be alphanumeric or hyphens';
      }

      if (!chequeDate) {
        errors.chequeDate = 'Cheque Date is required when cheque payment is selected';
      } else {
        const chkDate = new Date(chequeDate);
        const now = new Date();
        const diffMs = now.getTime() - chkDate.getTime();
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
        if (diffDays > 180) {
          errors.chequeDate = `Stale Cheque: Cheque date is ${diffDays} days old (> 180 days). Under Philippine banking rules, stale cheques cannot be honoured.`;
        }
      }

      if (!chequePayee || chequePayee.trim().length < 3) {
        errors.chequePayee = 'Cheque Payee is required (minimum 3 characters)';
      }

      const numChequeAmount = parseFloat(chequeAmount);
      if (!chequeAmount || isNaN(numChequeAmount) || numChequeAmount <= 0) {
        errors.chequeAmount = 'Valid Cheque Amount is required';
      } else if (!isNaN(numAmount) && Math.abs(numChequeAmount - numAmount) > 0.001) {
        errors.chequeAmount = `Cheque Amount (${formatCurrency(numChequeAmount)}) must match Disbursement Amount (${formatCurrency(numAmount)})`;
      }

      if (!chequePurpose || chequePurpose.trim().length < 5) {
        errors.chequePurpose = 'Cheque Purpose is required (minimum 5 characters)';
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
    chequeStatus,
    selectedFundRecord,
    funds,
    recordedBeneficiary,
    isBeneficiaryMismatch,
    previouslyDisbursedAmount
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

    const numericAmount = parseFloat(amount) || 0;
    const refNumber = supportingDocRef && supportingDocRef.startsWith('DV-')
      ? supportingDocRef
      : `DV-2026-${Math.floor(1000 + Math.random() * 9000)}`;

    const completedRecord = {
      id: itemToProcess?.id || `disb-${Date.now()}`,
      ref: refNumber,
      type: disbursementType,
      category: category,
      payee: payee.trim(),
      purpose: purpose.trim() || category,
      amount: numericAmount,
      actualAmountReleased: numericAmount,
      approvedLoanAmount: parseFloat(approvedLoanAmount) || numericAmount,
      fundSource: fundSource,
      date: disbursementDate || new Date().toISOString().split('T')[0],
      status: 'Disbursed',
      paymentMethod: paymentMethod,
      chequeNumber: paymentMethod === 'Cheque' ? chequeNumber.trim() : undefined,
      chequeStatus: paymentMethod === 'Cheque' ? chequeStatus : undefined,
      supportingDocRef: supportingDocRef.trim(),
      processedAt: new Date().toISOString(),
      processedBy: 'Disbursing Officer',
      reconciliationStatus: paymentMethod === 'Bank Transfer'
        ? 'Ready for Bank Reconciliation'
        : paymentMethod === 'Cheque'
        ? 'Pending Clearing'
        : 'N/A (Cash Voucher)',
      auditTrail: [
        {
          id: `at-${Date.now()}`,
          action: 'Disbursement Released & Certified',
          actor: 'Jose Reyes',
          role: 'Disbursing Officer',
          timestamp: new Date().toISOString(),
          details: `Authorized and released ₱${numericAmount.toLocaleString()} via ${paymentMethod} from ${fundSource}.`
        }
      ]
    };

    try {
      if (itemToProcess?.disbursementId) {
        await executeDisbursement(
          itemToProcess.disbursementId,
          paymentMethod === 'Cheque' ? chequeNumber.trim() : undefined,
          `Doc: ${supportingDocRef.trim()}`
        ).catch(() => null);
      } else if (itemToProcess?.obligationId && itemToProcess?.memberId) {
        const payload: any = {
          type: disbursementType,
          category: category,
          purpose: purpose.trim(),
          date: disbursementDate,
          supportingDocRef: supportingDocRef.trim(),
          amount: numericAmount,
          paymentMethod,
          fundSource,
          beneficiaryName: payee.trim(),
          beneficiaryBank: itemToProcess?.beneficiaryBank,
          beneficiaryAccount: itemToProcess?.beneficiaryAccount,
          obligationId: itemToProcess.obligationId,
          memberId: itemToProcess.memberId,
          description: `Doc: ${supportingDocRef.trim()}`
        };

        if (paymentMethod === 'Cheque') {
          payload.cheque = {
            chequeNumber: chequeNumber.trim(),
            chequeDate: chequeDate,
            payee: chequePayee.trim(),
            amount: parseFloat(chequeAmount) || numericAmount,
            purpose: chequePurpose.trim()
          };
        }

        await createDisbursementRequest(payload).catch(() => null);
      }
    } catch {
      // Backend sync note
    } finally {
      setIsSubmitting(false);
    }

    // Successfully complete and close the modal
    onDisbursementComplete(completedRecord);

    addNotification({
      type: 'disbursement_released',
      title: 'Disbursement Voucher Executed',
      message: `Disbursement of ₱${numericAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })} for ${payee.trim()} (${category || disbursementType}) has been executed.`,
      priority: 'success',
      targetRoles: ['disbursing_officer'],
      details: {
        referenceNumber: completedRecord.ref || completedRecord.id || `DV-${Date.now().toString().slice(-4)}`,
        payeeOrPayer: payee.trim(),
        amount: numericAmount,
        fundCode: fundSource,
        category: category || disbursementType,
        actionBy: 'Jose Reyes (Disbursing Officer)',
        particulars: purpose.trim() || `Disbursement release via ${paymentMethod}`,
        actionUrl: '/disbursing-officer/disbursement',
        actionLabel: 'View in Disbursement Console',
        notes: `Payment method: ${paymentMethod}. Supporting doc ref: ${supportingDocRef.trim() || 'N/A'}`
      }
    });

    onClose();
  };

  if (!isOpen) return null;

  const glassInput =
    'w-full px-4 py-2.5 bg-white/70 hover:bg-white/90 focus:bg-white backdrop-blur-xl border border-white/90 shadow-[inset_0_2px_4px_rgba(4,21,45,0.03)] rounded-xl text-[13px] text-[#04152d] outline-none transition-all duration-300 placeholder:text-[#04152d]/40 focus:border-blue-500/50 focus:shadow-[0_4px_16px_rgba(4,21,45,0.08),inset_0_1px_2px_rgba(255,255,255,1)]';

  const inputErrorStyle = 'border-red-400 bg-red-50/50 focus:border-red-500 focus:bg-red-50/70 text-red-950';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-[#04152d]/60 backdrop-blur-md animate-fade-in overflow-hidden">
      <div
        className="relative w-full max-w-2xl max-h-[90vh] flex flex-col bg-white/95 backdrop-blur-3xl border border-white/90 shadow-[0_20px_60px_rgba(4,21,45,0.25),inset_0_2px_4px_rgba(255,255,255,0.9)] rounded-[28px] overflow-hidden animate-modal-enter transition-all duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="shrink-0 px-6 py-4 border-b border-black/5 bg-gradient-to-r from-white/95 via-white/80 to-blue-50/50 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#0a1e3f] to-[#04152d] flex items-center justify-center text-white shadow-[0_4px_12px_rgba(4,21,45,0.25)] transition-transform duration-300 hover:scale-105">
              {step === 'confirm' ? (
                <AlertTriangle size={20} className="text-amber-400" />
              ) : step === 'review' ? (
                <ShieldCheck size={20} className="text-blue-400" />
              ) : (
                <DollarSign size={20} className="text-emerald-400" />
              )}
            </div>
            <div>
              <h2 className="text-[17px] font-bold text-[#04152d] tracking-tight">
                {step === 'confirm'
                  ? 'Confirm Financial Fund Release'
                  : step === 'review'
                  ? 'Review & Pre-Disbursement Verification'
                  : itemToProcess
                  ? 'Process Disbursement'
                  : 'Record Disbursement'}
              </h2>
              <p className="text-[11px] text-[#04152d]/60 font-medium">
                {step === 'confirm'
                  ? 'Final Disbursing Officer authorization prior to payment execution'
                  : step === 'review'
                  ? 'Verify internal controls and authenticate transaction details prior to release'
                  : itemToProcess
                  ? `Processing approved release for ${itemToProcess.payee}`
                  : 'Record an outgoing financial release and verify fund balances'}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/70 hover:bg-white text-[#04152d]/60 hover:text-[#04152d] flex items-center justify-center transition-all duration-200 border border-white shadow-sm hover:scale-105 active:scale-95 cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        {/* 3-Step Progress Navigation Header */}
        <div className="shrink-0 px-6 py-2.5 bg-slate-50/90 border-b border-black/5 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setStep('input')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold transition-all duration-300 ${
                step === 'input'
                  ? 'bg-gradient-to-r from-[#0a1e3f] to-[#04152d] text-white shadow-sm ring-2 ring-blue-500/20'
                  : 'bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100 cursor-pointer active:scale-95'
              }`}
            >
              {step !== 'input' ? (
                <CheckCircle2 size={13} className="text-emerald-600" />
              ) : (
                <span className="w-4 h-4 rounded-full bg-white/20 text-[10px] flex items-center justify-center font-bold">1</span>
              )}
              <span>Particulars</span>
            </button>

            <div className={`w-6 h-0.5 rounded-full transition-all duration-500 ${step !== 'input' ? 'bg-emerald-500' : 'bg-slate-200'}`} />

            <button
              type="button"
              disabled={!validation.isValid}
              onClick={() => validation.isValid && setStep('review')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold transition-all duration-300 ${
                step === 'review'
                  ? 'bg-gradient-to-r from-[#0a1e3f] to-[#04152d] text-white shadow-sm ring-2 ring-blue-500/20'
                  : step === 'confirm'
                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100 cursor-pointer active:scale-95'
                  : 'bg-slate-100 text-slate-400'
              }`}
            >
              {step === 'confirm' ? (
                <CheckCircle2 size={13} className="text-emerald-600" />
              ) : (
                <span className={`w-4 h-4 rounded-full text-[10px] flex items-center justify-center font-bold ${step === 'review' ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-500'}`}>2</span>
              )}
              <span>Review</span>
            </button>

            <div className={`w-6 h-0.5 rounded-full transition-all duration-500 ${step === 'confirm' ? 'bg-emerald-500' : 'bg-slate-200'}`} />

            <div
              className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold transition-all duration-300 ${
                step === 'confirm'
                  ? 'bg-gradient-to-r from-[#0a1e3f] to-[#04152d] text-white shadow-sm ring-2 ring-blue-500/20'
                  : 'bg-slate-100 text-slate-400'
              }`}
            >
              <span className={`w-4 h-4 rounded-full text-[10px] flex items-center justify-center font-bold ${step === 'confirm' ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-500'}`}>3</span>
              <span>Confirm</span>
            </div>
          </div>

          <span className="text-[11px] text-[#04152d]/50 font-medium hidden sm:inline-block">
            {step === 'input' ? 'Fields marked * are mandatory' : step === 'review' ? 'Internal Controls Enforced' : 'Final Authorization'}
          </span>
        </div>

        {/* ========================================================================= */}
        {/* STAGE 1: INPUT FORM (Tasks 1, 2, 3, 4, 5, 6, 7, 8, 10) */}
        {/* ========================================================================= */}
        {step === 'input' && (
          <form
            onSubmit={handleProceedToReview}
            className="flex flex-col flex-1 min-h-0 overflow-hidden"
          >
            {/* Scrollable Form Body */}
            <div className="p-6 space-y-5 flex-1 overflow-y-auto min-h-0 hide-scrollbar">
            {/* Top Error Alert */}
            {submissionError && (
              <div className="p-3.5 rounded-2xl bg-red-50/90 border border-red-200 text-red-800 flex items-start gap-2.5 text-[12px] animate-slide-down shadow-sm">
                <AlertCircle size={16} className="text-red-500 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold">Validation Notice</p>
                  <p className="text-red-700 mt-0.5">{submissionError}</p>
                </div>
              </div>
            )}

            {/* Task 4: Disbursement Type Selection */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-[11px] font-bold uppercase tracking-wider text-[#04152d]/70 flex items-center gap-1.5">
                  <Layers size={13} className="text-[#04152d]/50" />
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
                          : 'text-[#04152d]/70 hover:text-[#04152d] hover:bg-white/70 active:scale-95'
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
                <label className="block text-[11px] font-bold uppercase tracking-wider text-[#04152d]/70 flex items-center gap-1.5">
                  <CreditCard size={13} className="text-[#04152d]/50" />
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
                          : 'text-[#04152d]/70 hover:text-[#04152d] hover:bg-white/70 active:scale-95'
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
                <div className="flex items-center justify-between pb-2 border-b border-blue-100/70 text-[12px] font-bold text-blue-900">
                  <div className="flex items-center gap-2">
                    <FileCheck size={16} className="text-blue-600" />
                    <span>Loan Release Verification</span>
                  </div>
                  {/* Loan Release Ratio Tag */}
                  {parseFloat(approvedLoanAmount) > 0 && parseFloat(actualAmountReleased) > 0 && (
                    <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-blue-100 text-blue-800 border border-blue-200">
                      <Sparkles size={11} className="text-blue-600" />
                      <span>
                        {parseFloat(actualAmountReleased) <= parseFloat(approvedLoanAmount)
                          ? `${((parseFloat(actualAmountReleased) / parseFloat(approvedLoanAmount)) * 100).toFixed(0)}% Release`
                          : 'Over Ceiling Error'}
                      </span>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {/* Loan Reference */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-[#04152d]/70">
                        Obligation / Loan Reference <span className="text-red-500">*</span>
                      </label>
                      {touched.loanRef && !validation.errors.loanRef && loanRef && (
                        <span className="text-emerald-600 flex items-center gap-0.5 text-[10px] font-bold">
                          <Check size={11} /> Valid
                        </span>
                      )}
                    </div>
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

                  {/* Recorded Beneficiary from Loan Record */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-[#04152d]/70">
                        Recorded Loan Beneficiary <span className="text-red-500">*</span>
                      </label>
                      <span className="text-[10px] text-blue-700 font-semibold bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                        Official Contract
                      </span>
                    </div>
                    <input
                      type="text"
                      value={recordedBeneficiary}
                      onChange={(e) => setRecordedBeneficiary(e.target.value)}
                      placeholder="Official recipient name in contract"
                      className={`${glassInput}`}
                    />
                  </div>
                </div>

                {/* Task 5: 4-Part Amount Authorization Breakdown */}
                <div className="p-3.5 rounded-xl bg-white/70 border border-blue-200 shadow-sm space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-blue-900">
                      Obligation Amount Authorization Breakdown
                    </span>
                    <span className="text-[10px] font-medium text-blue-700">
                      Ceiling: {formatCurrency(remainingAuthorizedAmount)}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-center">
                    {/* 1. Approved Amount */}
                    <div className="p-2.5 rounded-lg bg-blue-50/60 border border-blue-100">
                      <span className="block text-[9.5px] uppercase font-bold text-[#04152d]/50">
                        1. Approved Amount
                      </span>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={approvedLoanAmount}
                        onChange={(e) => setApprovedLoanAmount(e.target.value)}
                        onBlur={() => markTouched('approvedLoanAmount')}
                        placeholder="0.00"
                        className="w-full text-center font-bold text-[13px] text-[#04152d] bg-transparent outline-none mt-1 border-b border-blue-200 focus:border-blue-500"
                      />
                    </div>

                    {/* 2. Previously Disbursed */}
                    <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200">
                      <span className="block text-[9.5px] uppercase font-bold text-[#04152d]/50">
                        2. Prior Disbursed
                      </span>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={previouslyDisbursedAmount}
                        onChange={(e) => setPreviouslyDisbursedAmount(e.target.value)}
                        placeholder="0.00"
                        className="w-full text-center font-bold text-[13px] text-slate-700 bg-transparent outline-none mt-1 border-b border-slate-200 focus:border-blue-500"
                      />
                    </div>

                    {/* 3. Remaining Authorized Amount */}
                    <div className="p-2.5 rounded-lg bg-emerald-50/60 border border-emerald-200">
                      <span className="block text-[9.5px] uppercase font-bold text-emerald-800">
                        3. Remaining Auth.
                      </span>
                      <span className="block font-bold text-[14px] text-emerald-700 mt-1">
                        {formatCurrency(remainingAuthorizedAmount)}
                      </span>
                    </div>

                    {/* 4. Requested Disbursement Amount */}
                    <div className="p-2.5 rounded-lg bg-blue-100/50 border border-blue-300">
                      <span className="block text-[9.5px] uppercase font-bold text-blue-900">
                        4. Requested Release
                      </span>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={actualAmountReleased}
                        onChange={(e) => handleActualReleaseChange(e.target.value)}
                        onBlur={() => markTouched('actualAmountReleased')}
                        placeholder="0.00"
                        className={`w-full text-center font-bold text-[14px] text-blue-900 bg-transparent outline-none mt-0.5 border-b border-blue-300 focus:border-blue-600 ${
                          validation.errors.exceedsApproved ? 'text-red-700 border-red-400' : ''
                        }`}
                      />
                    </div>
                  </div>
                </div>

                {/* Loan Ceiling Summary Pill */}
                {parseFloat(approvedLoanAmount) > 0 && parseFloat(actualAmountReleased) > 0 && parseFloat(actualAmountReleased) <= parseFloat(approvedLoanAmount) && (
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between text-xs px-3.5 py-2 rounded-xl bg-blue-100/70 border border-blue-200 text-blue-900 gap-1.5">
                    <div className="flex items-center gap-1.5 font-medium">
                      <Sparkles size={14} className="text-blue-700 shrink-0" />
                      <span>Release Authorization:</span>
                      <span className="font-bold">
                        {parseFloat(actualAmountReleased) === parseFloat(approvedLoanAmount)
                          ? '100% Full Disbursement'
                          : `${((parseFloat(actualAmountReleased) / parseFloat(approvedLoanAmount)) * 100).toFixed(1)}% Partial Release`}
                      </span>
                    </div>
                    {parseFloat(actualAmountReleased) < parseFloat(approvedLoanAmount) && (
                      <span className="text-[11px] font-semibold text-blue-800 bg-white/80 px-2 py-0.5 rounded-md border border-blue-200 self-start sm:self-auto">
                        Retained Undisbursed: {formatCurrency(parseFloat(approvedLoanAmount) - parseFloat(actualAmountReleased))}
                      </span>
                    )}
                  </div>
                )}

                {/* Task 7 Error Banner if Actual > Approved */}
                {validation.errors.exceedsApproved && (
                  <div className="p-3 rounded-xl bg-red-100/90 border border-red-300 text-red-800 flex items-start gap-2 text-[12px] animate-slide-down">
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
                      {isProcessingExistingItem && itemToProcess?.chequeNumber ? (
                        <span className="text-[9px] text-amber-900 bg-amber-100 px-1 rounded font-semibold flex items-center gap-0.5">
                          <Lock size={9} /> Assigned
                        </span>
                      ) : touched.chequeNumber && !validation.errors.chequeNumber && chequeNumber ? (
                        <span className="text-emerald-600 flex items-center gap-0.5 text-[10px] font-bold">
                          <Check size={11} /> Valid
                        </span>
                      ) : null}
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
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-[#04152d]/70">
                        Cheque Date <span className="text-red-500">*</span>
                      </label>
                      {touched.chequeDate && !validation.errors.chequeDate && chequeDate && (
                        <span className="text-emerald-600 flex items-center gap-0.5 text-[10px] font-bold">
                          <Check size={11} /> Valid
                        </span>
                      )}
                    </div>
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
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-[#04152d]/70">
                        Cheque Payee <span className="text-red-500">*</span>
                      </label>
                      {touched.chequePayee && !validation.errors.chequePayee && chequePayee && (
                        <span className="text-emerald-600 flex items-center gap-0.5 text-[10px] font-bold">
                          <Check size={11} /> Valid
                        </span>
                      )}
                    </div>
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
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-[#04152d]/70">
                        Cheque Amount (₱) <span className="text-red-500">*</span>
                      </label>
                      {touched.chequeAmount && !validation.errors.chequeAmount && chequeAmount && (
                        <span className="text-emerald-600 flex items-center gap-0.5 text-[10px] font-bold">
                          <Check size={11} /> Valid
                        </span>
                      )}
                    </div>
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
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-[#04152d]/70">
                        Cheque Purpose <span className="text-red-500">*</span>
                      </label>
                      {touched.chequePurpose && !validation.errors.chequePurpose && chequePurpose && (
                        <span className="text-emerald-600 flex items-center gap-0.5 text-[10px] font-bold">
                          <Check size={11} /> Valid
                        </span>
                      )}
                    </div>
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
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-[#04152d]/70">
                        Related Reference <span className="text-red-500">*</span>
                      </label>
                      {touched.chequeRelatedRef && !validation.errors.chequeRelatedRef && chequeRelatedRef && (
                        <span className="text-emerald-600 flex items-center gap-0.5 text-[10px] font-bold">
                          <Check size={11} /> Valid
                        </span>
                      )}
                    </div>
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
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-[#04152d]/70 flex items-center gap-1.5">
                    <Calendar size={13} className="text-[#04152d]/50" />
                    Disbursement Date <span className="text-red-500">*</span>
                  </label>
                  {touched.disbursementDate && !validation.errors.disbursementDate && disbursementDate && (
                    <span className="text-emerald-600 flex items-center gap-0.5 text-[10px] font-bold">
                      <Check size={11} /> Valid
                    </span>
                  )}
                </div>
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
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-[#04152d]/70 flex items-center gap-1.5">
                    <User size={13} className="text-[#04152d]/50" />
                    Payee / Recipient <span className="text-red-500">*</span>
                  </label>
                  {touched.payee && !validation.errors.payee && payee && (
                    <span className="text-emerald-600 flex items-center gap-0.5 text-[10px] font-bold">
                      <Check size={11} /> Valid
                    </span>
                  )}
                </div>
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

                {/* Task 4: Beneficiary Verification Indicator */}
                {recordedBeneficiary.trim() && (
                  <div className={`mt-2 p-2.5 rounded-xl border flex items-center justify-between text-xs transition-all ${
                    isBeneficiaryMismatch
                      ? 'bg-red-50 border-red-300 text-red-900 shadow-sm'
                      : 'bg-emerald-50 border-emerald-200 text-emerald-900'
                  }`}>
                    <div className="flex items-center gap-2">
                      {isBeneficiaryMismatch ? (
                        <AlertTriangle size={15} className="text-red-600 shrink-0" />
                      ) : (
                        <CheckCircle2 size={15} className="text-emerald-600 shrink-0" />
                      )}
                      <div>
                        <span className="font-bold">
                          {isBeneficiaryMismatch ? 'Beneficiary Mismatch Detected!' : 'Beneficiary Verified:'}
                        </span>{' '}
                        <span>
                          {isBeneficiaryMismatch
                            ? `Payee does not match recorded loan beneficiary ("${recordedBeneficiary}"). Payment execution is blocked.`
                            : `Payee matches recorded approved loan beneficiary (${recordedBeneficiary}).`}
                        </span>
                      </div>
                    </div>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider shrink-0 ${
                      isBeneficiaryMismatch ? 'bg-red-200 text-red-900' : 'bg-emerald-200 text-emerald-900'
                    }`}>
                      {isBeneficiaryMismatch ? 'Mismatch (Blocked)' : 'Verified'}
                    </span>
                  </div>
                )}
              </div>

              {/* Task 1: Amount */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-[#04152d]/70 flex items-center gap-1.5">
                    <DollarSign size={13} className="text-[#04152d]/50" />
                    Disbursement Amount (₱) <span className="text-red-500">*</span>
                  </label>
                  {touched.amount && !validation.errors.amount && !validation.errors.insufficientFund && amount && (
                    <span className="text-emerald-600 flex items-center gap-0.5 text-[10px] font-bold">
                      <Check size={11} /> Valid
                    </span>
                  )}
                </div>
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
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-[#04152d]/70 flex items-center gap-1.5">
                    <Tag size={13} className="text-[#04152d]/50" />
                    Disbursement Category <span className="text-red-500">*</span>
                  </label>
                  {category && !validation.errors.category && (
                    <span className="text-emerald-600 flex items-center gap-0.5 text-[10px] font-bold">
                      <Check size={11} /> Configured
                    </span>
                  )}
                </div>
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

            {/* Task 1, 5 & 10: Fund Selection & Dynamic Available Balance Verification */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="block text-[11px] font-bold uppercase tracking-wider text-[#04152d]/70 flex items-center gap-1.5">
                  <Wallet size={13} className="text-[#04152d]/50" />
                  Applicable Fund / Source <span className="text-red-500">*</span>
                </label>
                {fundSource && !validation.errors.fundSource && (
                  <span className="text-emerald-600 flex items-center gap-0.5 text-[10px] font-bold">
                    <Check size={11} /> Fund Selected
                  </span>
                )}
              </div>
              <select
                value={fundSource}
                onChange={(e) => setFundSource(e.target.value)}
                onBlur={() => markTouched('fundSource')}
                className={`${glassInput} ${
                  touched.fundSource && validation.errors.fundSource ? inputErrorStyle : ''
                } cursor-pointer`}
              >
                <option value="">-- Select Configured Fund --</option>
                {funds.map((fund) => {
                  const isInactive = fund.status === 'Inactive';
                  return (
                    <option key={fund.id} value={fund.name} disabled={isInactive}>
                      {fund.name} ({fund.code}) — {isInactive ? 'INACTIVE (RESTRICTED)' : `Available: ${formatCurrency(fund.balance)}`}
                    </option>
                  );
                })}
              </select>

              {/* Task 5 & 10: Showing Available Balance & Projected Balance */}
              {selectedFundRecord && (
                <div
                  className={`p-4 rounded-2xl border transition-all duration-300 flex flex-col gap-3 text-[12px] ${
                    validation.errors.insufficientFund
                      ? 'bg-red-50/80 border-red-300'
                      : 'bg-white/70 border-white/90 shadow-[0_4px_16px_rgba(4,21,45,0.03)]'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
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

                  {/* Dynamic Fund Solvency Liquidity Meter */}
                  {selectedFundRecord.balance > 0 && amount && !isNaN(parseFloat(amount)) && (
                    <div className="space-y-1.5 pt-2 border-t border-black/5">
                      <div className="flex items-center justify-between text-[10px] font-semibold">
                        <span className="text-[#04152d]/60 flex items-center gap-1">
                          <Percent size={11} className="text-blue-600" />
                          Reserve Liquidity Post-Release:
                        </span>
                        <span
                          className={`font-bold ${
                            selectedFundRecord.balance - parseFloat(amount) < 0
                              ? 'text-red-600'
                              : ((selectedFundRecord.balance - parseFloat(amount)) / selectedFundRecord.balance) < 0.2
                              ? 'text-amber-700'
                              : 'text-emerald-700'
                          }`}
                        >
                          {Math.max(0, ((selectedFundRecord.balance - parseFloat(amount)) / selectedFundRecord.balance) * 100).toFixed(1)}% Retained
                          {((selectedFundRecord.balance - parseFloat(amount)) / selectedFundRecord.balance) >= 0.5 && ' (Healthy Buffer)'}
                        </span>
                      </div>
                      <div className="w-full bg-slate-200/80 rounded-full h-2 overflow-hidden shadow-inner">
                        <div
                          className={`h-full transition-all duration-500 ease-out rounded-full ${
                            selectedFundRecord.balance - parseFloat(amount) < 0
                              ? 'bg-rose-600'
                              : ((selectedFundRecord.balance - parseFloat(amount)) / selectedFundRecord.balance) < 0.2
                              ? 'bg-amber-500'
                              : 'bg-emerald-500'
                          }`}
                          style={{
                            width: `${Math.min(100, Math.max(0, ((selectedFundRecord.balance - parseFloat(amount)) / selectedFundRecord.balance) * 100))}%`
                          }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Task 10: Insufficient Balance Error Alert */}
              {validation.errors.insufficientFund && (
                <div className="p-3 rounded-xl bg-red-100/90 border border-red-300 text-red-800 flex items-start gap-2 text-[12px] animate-slide-down">
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
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-[11px] font-bold uppercase tracking-wider text-[#04152d]/70 flex items-center gap-1.5">
                  <FileText size={13} className="text-[#04152d]/50" />
                  Disbursement Purpose <span className="text-red-500">*</span>
                </label>
                {touched.purpose && !validation.errors.purpose && purpose && (
                  <span className="text-emerald-600 flex items-center gap-0.5 text-[10px] font-bold">
                    <Check size={11} /> Valid
                  </span>
                )}
              </div>
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
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-[11px] font-bold uppercase tracking-wider text-[#04152d]/70 flex items-center gap-1.5">
                  <ShieldCheck size={13} className="text-[#04152d]/50" />
                  Supporting Document / Reference Voucher <span className="text-red-500">*</span>
                </label>
                {touched.supportingDocRef && !validation.errors.supportingDocRef && supportingDocRef && (
                  <span className="text-emerald-600 flex items-center gap-0.5 text-[10px] font-bold">
                    <Check size={11} /> Valid
                  </span>
                )}
              </div>
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

            </div>

            {/* Fixed Stage 1 Footer Actions */}
            <div className="shrink-0 px-6 py-3.5 border-t border-black/5 bg-slate-50/95 backdrop-blur-md flex items-center justify-end gap-3 shadow-[0_-4px_12px_rgba(0,0,0,0.03)]">
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2.5 rounded-full border border-gray-200 bg-white/80 hover:bg-white text-[13px] font-semibold text-[#04152d]/70 hover:text-[#04152d] transition-all duration-200 active:scale-95 cursor-pointer shadow-sm"
              >
                Cancel
              </button>

              {/* Task 11: Button advances to Review stage */}
              <button
                type="submit"
                disabled={!validation.isValid}
                className={`px-6 py-2.5 rounded-full text-[13px] font-semibold flex items-center gap-2 transition-all duration-300 shadow-md ${
                  validation.isValid
                    ? 'bg-gradient-to-b from-[#0a1e3f] to-[#04152d] text-white hover:from-[#0f2850] hover:to-[#061a38] shadow-[0_6px_20px_rgba(4,21,45,0.3)] hover:scale-[1.02] active:scale-95 cursor-pointer'
                    : 'bg-[#04152d]/30 text-white/50 cursor-not-allowed'
                }`}
              >
                <span>Proceed to Pre-Disbursement Verification</span>
                <ArrowRight size={16} />
              </button>
            </div>
          </form>
        )}

        {/* ========================================================================= */}
        {/* STAGE 2: TASK 11 REVIEW & PRE-DISBURSEMENT SECURITY VERIFICATION */}
        {/* ========================================================================= */}
        {step === 'review' && (
          <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
            {/* Scrollable Review Body */}
            <div className="p-6 space-y-5 flex-1 overflow-y-auto min-h-0 hide-scrollbar">
            <div className="p-4 rounded-2xl bg-blue-50/60 border border-blue-200/80 flex items-start gap-3">
              <ShieldCheck size={20} className="text-blue-600 shrink-0 mt-0.5" />
              <div className="text-[12px]">
                <p className="font-bold text-blue-950">Pre-Finalization Review & Security Check</p>
                <p className="text-blue-800 mt-0.5">
                  Verify internal controls, ensure payee authenticity, and execute official Disbursing Officer certification prior to finalizing release.
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
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] uppercase font-bold text-blue-900/60">
                      Obligation Authorization & Beneficiary Verification
                    </span>
                    <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                      ✓ Beneficiary Verified
                    </span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 bg-blue-50/40 p-3 rounded-xl border border-blue-100 text-[12px]">
                    <div>
                      <span className="text-[10px] uppercase text-[#04152d]/50 block font-bold">
                        Loan Reference
                      </span>
                      <span className="font-mono font-semibold text-[#04152d]">{loanRef}</span>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase text-[#04152d]/50 block font-bold">
                        Recorded Beneficiary
                      </span>
                      <span className="font-semibold text-[#04152d]">{recordedBeneficiary || payee}</span>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase text-[#04152d]/50 block font-bold">
                        Approved Amount
                      </span>
                      <span className="font-semibold text-[#04152d]">
                        {formatCurrency(parseFloat(approvedLoanAmount) || 0)}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase text-[#04152d]/50 block font-bold">
                        Prior Disbursed
                      </span>
                      <span className="font-semibold text-slate-600">
                        {formatCurrency(parseFloat(previouslyDisbursedAmount) || 0)}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase text-[#04152d]/50 block font-bold">
                        Remaining Authorized
                      </span>
                      <span className="font-bold text-emerald-700">
                        {formatCurrency(remainingAuthorizedAmount)}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase text-[#04152d]/50 block font-bold">
                        Requested Release
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

            {/* Pre-Disbursement Security Verification & Disbursing Officer Certification Card */}
            <div className="p-4 rounded-2xl bg-gradient-to-br from-amber-50/80 via-white to-amber-50/40 border border-amber-200/90 shadow-sm space-y-3">
              <div className="flex items-center gap-2 text-amber-900 font-bold text-xs uppercase tracking-wider">
                <ShieldCheck size={16} className="text-amber-700" />
                <span>Pre-Disbursement Security & Compliance Verification</span>
              </div>

              <div className="space-y-2 text-xs text-[#04152d]/80">
                <label className="flex items-start gap-2.5 p-2 rounded-xl bg-white/70 border border-amber-100 cursor-pointer hover:bg-white transition-all duration-200">
                  <input
                    type="checkbox"
                    checked={isKycVerified}
                    onChange={(e) => setIsKycVerified(e.target.checked)}
                    className="mt-0.5 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                  />
                  <div>
                    <span className="font-semibold text-[#04152d]">Payee Identity & Authority Verified</span>
                    <p className="text-[11px] text-[#04152d]/60">Recipient is verified against official cooperative membership/vendor records with valid identification.</p>
                  </div>
                </label>

                <label className="flex items-start gap-2.5 p-2 rounded-xl bg-white/70 border border-amber-100 cursor-pointer hover:bg-white transition-all duration-200">
                  <input
                    type="checkbox"
                    checked={isDocAttached}
                    onChange={(e) => setIsDocAttached(e.target.checked)}
                    className="mt-0.5 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                  />
                  <div>
                    <span className="font-semibold text-[#04152d]">Supporting Documents & Audit Records Attached</span>
                    <p className="text-[11px] text-[#04152d]/60">Physical or electronic vouchers, loan contracts, or invoice receipts under {supportingDocRef} verified.</p>
                  </div>
                </label>

                <label className="flex items-start gap-2.5 p-2.5 rounded-xl bg-amber-100/60 border border-amber-300 cursor-pointer hover:bg-amber-100 transition-all duration-200">
                  <input
                    type="checkbox"
                    checked={isSecurityCertified}
                    onChange={(e) => setIsSecurityCertified(e.target.checked)}
                    className="mt-0.5 rounded text-amber-800 focus:ring-amber-500 cursor-pointer"
                  />
                  <div>
                    <span className="font-bold text-amber-950 flex items-center gap-1">
                      <Lock size={12} className="text-amber-800" />
                      Disbursing Officer Official Release Certification <span className="text-red-500">*</span>
                    </span>
                    <p className="text-[11px] text-amber-900/90 font-medium mt-0.5">
                      I certify under penalty of administrative sanctions that this fund release is authentic, supported by audited documentation, and compliant with BDOEA financial policy.
                    </p>
                  </div>
                </label>
              </div>
            </div>

            </div>

            {/* Fixed Stage 2 Footer Actions */}
            <div className="shrink-0 px-6 py-3.5 border-t border-black/5 bg-slate-50/95 backdrop-blur-md flex items-center justify-between gap-3 shadow-[0_-4px_12px_rgba(0,0,0,0.03)]">
              <button
                type="button"
                onClick={() => setStep('input')}
                disabled={isSubmitting}
                className="px-5 py-2.5 rounded-full border border-gray-200 bg-white/80 hover:bg-white text-[13px] font-semibold text-[#04152d]/70 hover:text-[#04152d] transition-all duration-200 active:scale-95 flex items-center gap-1.5 cursor-pointer shadow-sm"
              >
                <ArrowLeft size={16} />
                <span>Back to Edit</span>
              </button>

              <button
                type="button"
                onClick={() => setStep('confirm')}
                disabled={!isSecurityCertified || !isKycVerified || !isDocAttached}
                className={`px-6 py-2.5 rounded-full text-[13px] font-semibold flex items-center gap-2 transition-all duration-300 shadow-md ${
                  isSecurityCertified && isKycVerified && isDocAttached
                    ? 'bg-gradient-to-b from-[#0a1e3f] to-[#04152d] text-white hover:from-[#0f2850] hover:to-[#061a38] shadow-[0_6px_20px_rgba(4,21,45,0.3)] hover:scale-[1.02] active:scale-95 cursor-pointer'
                    : 'bg-[#04152d]/30 text-white/50 cursor-not-allowed'
                }`}
              >
                {!isSecurityCertified || !isKycVerified || !isDocAttached ? (
                  <>
                    <Lock size={16} className="text-white/60" />
                    <span>Certification Required to Proceed</span>
                  </>
                ) : (
                  <>
                    <span>Proceed to Final Confirmation</span>
                    <ArrowRight size={16} />
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* STAGE 3: EXPLICIT CONFIRMATION & OFFICER SIGN-OFF */}
        {/* ========================================================================= */}
        {step === 'confirm' && (
          <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
            {/* Scrollable Confirm Body */}
            <div className="p-6 space-y-4 flex-1 overflow-y-auto min-h-0 hide-scrollbar">
              <div className="flex items-center gap-3 p-4 rounded-2xl bg-amber-50/70 border border-amber-200">
                <div className="w-10 h-10 rounded-2xl bg-amber-100 border border-amber-300 flex items-center justify-center text-amber-800 shrink-0">
                  <AlertTriangle size={20} />
                </div>
                <div>
                  <h4 className="text-[15px] font-bold text-[#04152d]">
                    Confirm Financial Fund Release
                  </h4>
                  <p className="text-[11px] text-[#04152d]/70">
                    Are you sure you want to execute and release this disbursement? Please verify the summary details below.
                  </p>
                </div>
              </div>

              {/* Data Summary Verification Card */}
              <div className="p-5 rounded-2xl bg-slate-50/80 border border-slate-200 text-[13px] space-y-2.5">
                <div className="flex justify-between items-center">
                  <span className="text-gray-500 font-medium">Reference / Voucher:</span>
                  <span className="font-mono font-bold text-blue-700">{supportingDocRef}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-500 font-medium">Payee / Recipient:</span>
                  <span className="font-bold text-[#04152d]">{payee}</span>
                </div>
                {disbursementType === 'Loan Release' && (
                  <div className="flex justify-between items-center">
                    <span className="text-gray-500 font-medium">Beneficiary Check:</span>
                    <span className="text-emerald-700 font-bold flex items-center gap-1">
                      <CheckCircle2 size={13} /> Matched ({recordedBeneficiary || payee})
                    </span>
                  </div>
                )}
                <div className="flex justify-between items-center">
                  <span className="text-gray-500 font-medium">Applicable Fund Source:</span>
                  <span className="font-semibold text-[#04152d]">{fundSource}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-500 font-medium">Payment Instrument:</span>
                  <span className="font-semibold text-[#04152d]">
                    {paymentMethod} {paymentMethod === 'Cheque' && chequeNumber ? `(#${chequeNumber})` : ''}
                  </span>
                </div>
                <div className="flex justify-between items-center pt-2.5 border-t border-slate-200">
                  <span className="font-bold text-[#04152d]">Net Disbursement Amount:</span>
                  <span className="font-bold text-[18px] text-emerald-700">
                    {formatCurrency(parseFloat(amount) || 0)}
                  </span>
                </div>
                {selectedFundRecord && (
                  <div className="flex justify-between items-center text-[12px] text-gray-500 pt-1">
                    <span>Projected Remaining Fund Liquidity:</span>
                    <span className="font-mono font-bold text-slate-700">
                      {formatCurrency(selectedFundRecord.balance - (parseFloat(amount) || 0))}
                    </span>
                  </div>
                )}
              </div>

              {/* Acknowledgment Checkbox */}
              <label className="flex items-start gap-3 p-3.5 rounded-2xl bg-blue-50/70 border border-blue-200 cursor-pointer text-[12px] hover:bg-blue-50 transition-colors">
                <input
                  type="checkbox"
                  checked={areYouSureConfirmed}
                  onChange={(e) => setAreYouSureConfirmed(e.target.checked)}
                  className="mt-0.5 rounded text-blue-600 focus:ring-blue-500 cursor-pointer w-4 h-4 shrink-0"
                />
                <span className="font-medium text-blue-950 leading-relaxed">
                  I explicitly certify that I have verified the payee identity, loan contract, and fund liquidity, and authorize immediate payment release.
                </span>
              </label>

              {submissionError && (
                <div className="p-3 rounded-xl bg-red-100 text-red-800 text-xs font-medium flex items-center gap-2">
                  <AlertCircle size={14} className="shrink-0" />
                  <span>{submissionError}</span>
                </div>
              )}
            </div>

            {/* Fixed Stage 3 Footer Actions */}
            <div className="shrink-0 px-6 py-3.5 border-t border-black/5 bg-slate-50/95 backdrop-blur-md flex items-center justify-between gap-3 shadow-[0_-4px_12px_rgba(0,0,0,0.03)]">
              <button
                type="button"
                onClick={() => setStep('review')}
                disabled={isSubmitting}
                className="px-5 py-2.5 rounded-full border border-gray-200 bg-white/80 hover:bg-white text-[13px] font-semibold text-[#04152d]/70 hover:text-[#04152d] transition-all duration-200 active:scale-95 flex items-center gap-1.5 cursor-pointer shadow-sm"
              >
                <ArrowLeft size={16} />
                <span>Back to Review</span>
              </button>

              <button
                type="button"
                disabled={!areYouSureConfirmed || isSubmitting}
                onClick={handleFinalizeDisbursement}
                className={`px-6 py-2.5 rounded-full text-[13px] font-semibold flex items-center gap-2 transition-all duration-300 shadow-md ${
                  areYouSureConfirmed && !isSubmitting
                    ? 'bg-gradient-to-b from-[#0a1e3f] to-[#04152d] text-white hover:from-[#0f2850] hover:to-[#061a38] shadow-[0_6px_20px_rgba(4,21,45,0.3)] hover:scale-[1.02] active:scale-95 cursor-pointer'
                    : 'bg-[#04152d]/30 text-white/50 cursor-not-allowed'
                }`}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 size={16} className="animate-spin text-white" />
                    <span>Executing Release...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 size={16} className="text-emerald-400" />
                    <span>Confirm & Execute Release</span>
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
