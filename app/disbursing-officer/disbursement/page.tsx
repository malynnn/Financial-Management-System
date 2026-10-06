"use client";

import React, { useState, useMemo, useEffect } from 'react';
import {
  Search,
  ChevronDown,
  CheckCircle2,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Info,
  Plus,
  Calendar,
  DollarSign,
  Wallet,
  Clock,
  ArrowUpRight,
  FileCheck,
  Building2,
  FileText,
  Tag,
  ShieldCheck,
  Sparkles,
  Eye,
  CreditCard,
  Filter,
  RotateCcw,
  X
} from 'lucide-react';
import Header from '@/components/Header';
import DisbursementFormModal, {
  ProcessableItem,
  CONFIGURED_FUNDS,
  CONFIGURED_CATEGORIES,
  CONFIGURED_CHEQUE_STATUSES,
  DisbursementType,
  PaymentMethod,
  ChequeStatus,
  FundRecord
} from '@/components/disbursement/DisbursementFormModal';
import DisbursementSuccessModal from '@/components/disbursement/DisbursementSuccessModal';
import DisbursementAuditModal from '@/components/disbursement/DisbursementAuditModal';
import DisbursementVoucherModal from '@/components/disbursement/DisbursementVoucherModal';
import {
  fetchFunds,
  fetchEligibleLoans,
  fetchDisbursementRecords
} from '@/lib/disbursementApi';

const ITEMS_PER_PAGE = 8;

const SAMPLE_FUNDS: FundRecord[] = [
  { id: 'FND-005', name: 'Loan Fund', code: 'LNF', balance: 1250000 },
  { id: 'FND-002', name: 'General Fund', code: 'GEN', balance: 450000 },
  { id: 'FND-003', name: 'Calamity Fund', code: 'CAL', balance: 320000 },
  { id: 'FND-004', name: 'Reserve Fund', code: 'RES', balance: 680000 },
  { id: 'FND-001', name: 'Education & Training Fund', code: 'ETF', balance: 180000 }
];

const SAMPLE_PENDING_QUEUE: ProcessableItem[] = [
  {
    id: 'loan-LN-2026-0891',
    ref: 'LN-2026-0891',
    loanRef: 'LN-2026-0891',
    obligationId: 'OBG-2026-0891',
    memberId: 'MEM-001',
    payee: 'Maria Clara Santos',
    type: 'Loan Release',
    category: 'Loan Release',
    purpose: 'Approved Multi-Purpose Member Loan Release',
    fundSource: 'Loan Fund',
    approvedAmount: 50000,
    previouslyDisbursedAmount: 0,
    remainingAuthorizedAmount: 50000,
    amount: 50000,
    date: '2026-10-06',
    paymentMethod: 'Bank Transfer',
    beneficiaryBank: 'BDO Unibank',
    beneficiaryAccount: '0012-3456-7890'
  },
  {
    id: 'loan-LN-2026-0904',
    ref: 'LN-2026-0904',
    loanRef: 'LN-2026-0904',
    obligationId: 'OBG-2026-0904',
    memberId: 'MEM-002',
    payee: 'Juan Dela Cruz',
    type: 'Loan Release',
    category: 'Loan Release',
    purpose: 'Agricultural Machinery Financing - 2nd Tranche Release',
    fundSource: 'Loan Fund',
    approvedAmount: 100000,
    previouslyDisbursedAmount: 40000,
    remainingAuthorizedAmount: 60000,
    amount: 60000,
    date: '2026-10-06',
    paymentMethod: 'Cheque',
    chequeNumber: 'CHK-2026-9042',
    chequeStatus: 'Issued',
    beneficiaryBank: 'Landbank',
    beneficiaryAccount: '9876-5432-10'
  },
  {
    id: 'loan-LN-2026-0912',
    ref: 'LN-2026-0912',
    loanRef: 'LN-2026-0912',
    obligationId: 'OBG-2026-0912',
    memberId: 'MEM-003',
    payee: 'Antonio Luna',
    type: 'Loan Release',
    category: 'Member Benefit / Calamity Assistance',
    purpose: 'Typhoon Disaster Emergency Relief Loan',
    fundSource: 'Calamity Fund',
    approvedAmount: 25000,
    previouslyDisbursedAmount: 0,
    remainingAuthorizedAmount: 25000,
    amount: 25000,
    date: '2026-10-05',
    paymentMethod: 'Bank Transfer',
    beneficiaryBank: 'BPI',
    beneficiaryAccount: '5544-3322-11'
  },
  {
    id: 'req-disb-105',
    ref: 'VCH-REQ-2026-015',
    type: 'Expense',
    category: 'Operational Expense',
    payee: 'Silicon Valley Tech Supplies Inc.',
    purpose: 'IT Workstations and Cloud Security Server Setup',
    fundSource: 'General Fund',
    approvedAmount: 38500,
    previouslyDisbursedAmount: 0,
    remainingAuthorizedAmount: 38500,
    amount: 38500,
    date: '2026-10-05',
    paymentMethod: 'Cheque',
    chequeNumber: 'CHK-2026-9045',
    chequeStatus: 'Issued',
    status: 'Approved'
  }
];

const SAMPLE_DISBURSED_RECORDS = [
  {
    id: 'disb-101',
    ref: 'DV-2026-0891',
    payee: 'Maria Clara Santos',
    member: 'Maria Clara Santos',
    type: 'Loan Release' as DisbursementType,
    category: 'Loan Release',
    purpose: 'Approved Multi-Purpose Member Loan Release',
    amount: 48500,
    fundSource: 'Loan Fund',
    date: '2026-10-04',
    status: 'Disbursed',
    paymentMethod: 'Cheque' as PaymentMethod,
    chequeNumber: 'CHK-2026-8801',
    chequeStatus: 'Issued' as ChequeStatus,
    loanRef: 'LN-2026-0891',
    reconciliationStatus: 'Ready for Bank Reconciliation',
    beneficiary: { name: 'Maria Clara Santos', bank: 'BDO Unibank', account: '0012-3456-7890' },
    auditTrail: [
      {
        id: 'at-1',
        action: 'Disbursement Released via Cheque',
        actor: 'Jose Reyes',
        role: 'Disbursing Officer',
        timestamp: '2026-10-04T08:15:00Z',
        details: 'Issued Cheque #CHK-2026-8801 for ₱48,500.00 from Loan Fund.'
      },
      {
        id: 'at-2',
        action: 'Voucher Approved',
        actor: 'Admin Approver',
        role: 'System Admin',
        timestamp: '2026-10-03T16:00:00Z',
        details: 'Approved loan release voucher following credit committee recommendation.'
      }
    ]
  },
  {
    id: 'disb-102',
    ref: 'DV-2026-0104',
    payee: 'Meralco Power Distribution Corp',
    member: 'Meralco Corporate',
    type: 'Expense' as DisbursementType,
    category: 'Operational Expense',
    purpose: 'Monthly Office Electricity Bill & Server Power',
    amount: 14850,
    fundSource: 'General Fund',
    date: '2026-10-03',
    status: 'Disbursed',
    paymentMethod: 'Bank Transfer' as PaymentMethod,
    reconciliationStatus: 'Reconciled',
    beneficiary: { name: 'Meralco Commercial Billing', bank: 'BPI', account: '9876-5432-10' },
    auditTrail: [
      {
        id: 'at-3',
        action: 'Electronic Bank Transfer Executed',
        actor: 'Jose Reyes',
        role: 'Disbursing Officer',
        timestamp: '2026-10-03T11:20:00Z',
        details: 'Direct EFT payment executed to utility provider account.'
      }
    ]
  },
  {
    id: 'disb-103',
    ref: 'DV-2026-0312',
    payee: 'Jose Protacio Rizal',
    member: 'Jose Protacio Rizal',
    type: 'Other Authorized Release' as DisbursementType,
    category: 'Member Benefit / Calamity Assistance',
    purpose: 'Approved Typhoon Flooding Relief Assistance Grant',
    amount: 20000,
    fundSource: 'Calamity Fund',
    date: '2026-10-02',
    status: 'Disbursed',
    paymentMethod: 'Cheque' as PaymentMethod,
    chequeNumber: 'CHK-2026-8790',
    chequeStatus: 'Encashed' as ChequeStatus,
    reconciliationStatus: 'Pending Clearing',
    beneficiary: { name: 'Jose Rizal', bank: 'Landbank', account: '1102-4433-22' },
    auditTrail: [
      {
        id: 'at-4',
        action: 'Cheque Issued to Beneficiary',
        actor: 'Jose Reyes',
        role: 'Disbursing Officer',
        timestamp: '2026-10-02T09:30:00Z',
        details: 'Handed official cheque to member in good standing.'
      }
    ]
  },
  {
    id: 'disb-104',
    ref: 'DV-2026-0888',
    payee: 'Emilio Aguinaldo',
    member: 'Emilio Aguinaldo',
    type: 'Loan Release' as DisbursementType,
    category: 'Loan Release',
    purpose: 'Agricultural Production & Livelihood Loan',
    amount: 75000,
    fundSource: 'Loan Fund',
    date: '2026-10-01',
    status: 'Disbursed',
    paymentMethod: 'Cheque' as PaymentMethod,
    chequeNumber: 'CHK-2026-8785',
    chequeStatus: 'Issued' as ChequeStatus,
    loanRef: 'LN-2026-0888',
    reconciliationStatus: 'Ready for Bank Reconciliation',
    beneficiary: { name: 'Emilio Aguinaldo', bank: 'BDO', account: '0099-8877-66' },
    auditTrail: [
      {
        id: 'at-5',
        action: 'Loan Disbursed via Cheque',
        actor: 'Jose Reyes',
        role: 'Disbursing Officer',
        timestamp: '2026-10-01T15:45:00Z',
        details: 'Released ₱75,000.00 cheque following agricultural loan contract signing.'
      }
    ]
  },
  {
    id: 'disb-105',
    ref: 'DV-2026-0099',
    payee: 'National Bookstore Corporate Sales',
    member: 'NBS Corporate',
    type: 'Expense' as DisbursementType,
    category: 'Administrative Expense',
    purpose: 'Annual Assembly Documentation & Printing Supplies',
    amount: 4320,
    fundSource: 'General Fund',
    date: '2026-09-28',
    status: 'Disbursed',
    paymentMethod: 'Cash Voucher' as PaymentMethod,
    reconciliationStatus: 'N/A (Cash Voucher)',
    beneficiary: { name: 'NBS Manila Branch', bank: 'Over-The-Counter Cash', account: 'Cash Office' },
    auditTrail: [
      {
        id: 'at-6',
        action: 'Petty Cash Voucher Disbursed',
        actor: 'Jose Reyes',
        role: 'Disbursing Officer',
        timestamp: '2026-09-28T13:00:00Z',
        details: 'Disbursed petty cash with verified official receipt attached.'
      }
    ]
  },
  {
    id: 'disb-106',
    ref: 'DV-2026-0044',
    payee: 'PLDT Enterprise Broadband',
    member: 'PLDT Inc.',
    type: 'Expense' as DisbursementType,
    category: 'Administrative Expense',
    purpose: 'Cooperative HQ Internet & Cloud Line Connection',
    amount: 5499,
    fundSource: 'General Fund',
    date: '2026-09-27',
    status: 'Disbursed',
    paymentMethod: 'Bank Transfer' as PaymentMethod,
    reconciliationStatus: 'Reconciled',
    beneficiary: { name: 'PLDT Collections', bank: 'Metrobank', account: '5544-3322-11' },
    auditTrail: [
      {
        id: 'at-7',
        action: 'Online Payment Disbursed',
        actor: 'Jose Reyes',
        role: 'Disbursing Officer',
        timestamp: '2026-09-27T10:15:00Z',
        details: 'Corporate bill settled through online corporate banking portal.'
      }
    ]
  }
];

/**
 * Disbursing Officer — Disbursement Processing Page
 */
export default function DisbursingOfficerDisbursementPage() {
  // Live fund balances from GET /disbursements/funds/summary (DMP-011, DMP-012)
  const [funds, setFunds] = useState<FundRecord[]>(SAMPLE_FUNDS);

  // Pending queue (approved loans to request + Admin-approved disbursements to release),
  // Processed (EXECUTED) and in-flight records (Pending Approval / Rejected)
  const [processingQueue, setProcessingQueue] = useState<ProcessableItem[]>(SAMPLE_PENDING_QUEUE);
  const [processedDisbursements, setProcessedDisbursements] = useState<any[]>(SAMPLE_DISBURSED_RECORDS);
  const [otherRecords, setOtherRecords] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const loadData = async (forceSample = false) => {
    if (forceSample) {
      setFunds(SAMPLE_FUNDS);
      setProcessingQueue(SAMPLE_PENDING_QUEUE);
      setProcessedDisbursements(SAMPLE_DISBURSED_RECORDS);
      setOtherRecords([]);
      showToast('Sample test data successfully reloaded.', 'info');
      return;
    }

    try {
      const [fundRows, loans, records] = await Promise.all([
        fetchFunds().catch(() => []),
        fetchEligibleLoans().catch(() => []),
        fetchDisbursementRecords().catch(() => [])
      ]);
      const approved = (records || [])
        .filter((r) => r.status === 'Approved')
        .map((r) => ({ ...r, disbursementId: r.id }));

      const effectiveFunds = fundRows && fundRows.length > 0 ? fundRows : SAMPLE_FUNDS;
      const combinedQueue = [...approved, ...(loans || [])];
      const effectiveQueue = combinedQueue.length > 0 ? combinedQueue : SAMPLE_PENDING_QUEUE;
      const disbursedRecords = (records || []).filter((r) => r.status === 'Disbursed');
      const effectiveDisbursed = disbursedRecords.length > 0 ? disbursedRecords : SAMPLE_DISBURSED_RECORDS;
      const other = (records || []).filter((r) => r.status === 'Pending Approval' || r.status === 'Rejected');

      setFunds(effectiveFunds);
      setProcessingQueue(effectiveQueue);
      setProcessedDisbursements(effectiveDisbursed);
      setOtherRecords(other);
    } catch {
      setFunds(SAMPLE_FUNDS);
      setProcessingQueue(SAMPLE_PENDING_QUEUE);
      setProcessedDisbursements(SAMPLE_DISBURSED_RECORDS);
      setOtherRecords([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);


  // Modals state
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [selectedItemForProcessing, setSelectedItemForProcessing] = useState<ProcessableItem | null>(null);

  // Task 14: Confirmation modal
  const [lastFinalizedDisbursement, setLastFinalizedDisbursement] = useState<any | null>(null);
  const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(false);

  // Audit modal
  const [selectedDisbursementForAudit, setSelectedDisbursementForAudit] = useState<any | null>(null);
  const [isAuditModalOpen, setIsAuditModalOpen] = useState(false);

  // Official Voucher modal & PDF download
  const [selectedDisbursementForVoucher, setSelectedDisbursementForVoucher] = useState<any | null>(null);
  const [isVoucherModalOpen, setIsVoucherModalOpen] = useState(false);

  // Tab controls
  const [activeTab, setActiveTab] = useState<'pending' | 'disbursed' | 'all'>('pending');

  // Task 13: Filters (Reference, Payee, Fund, Category, Type, Cheque Status, Date Range)
  const [searchRef, setSearchRef] = useState('');
  const [searchPayee, setSearchPayee] = useState('');
  const [typeFilter, setTypeFilter] = useState('All');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [fundFilter, setFundFilter] = useState('All');
  const [chequeStatusFilter, setChequeStatusFilter] = useState('All');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  // Toast feedback
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'info' | 'error' } | null>(null);

  const showToast = (message: string, type: 'success' | 'info' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  // Open modal to process a specific item from the list
  const handleProcessItem = (item: ProcessableItem) => {
    setSelectedItemForProcessing(item);
    setIsFormModalOpen(true);
  };

  // Open modal to record a fresh disbursement
  const handleRecordNewDisbursement = () => {
    setSelectedItemForProcessing(null);
    setIsFormModalOpen(true);
  };

  // After a Loan Release request is submitted for Admin approval
  const handleRequestSubmitted = (created: any) => {
    showToast(
      `Request ${created?.disbursementRefNo || ''} submitted for Admin approval.`.replace('  ', ' '),
      'success'
    );
    loadData();
  };

  // When a disbursement is finalized (Task 11, 14)
  const handleDisbursementComplete = (completedDisbursement: any) => {
    const effectiveAmount =
      Number(completedDisbursement.actualAmountReleased || completedDisbursement.amount) || 0;

    // 1. Remove from pending queue
    setProcessingQueue((prev) =>
      prev.filter(
        (item) =>
          item.id !== completedDisbursement.id &&
          item.ref !== completedDisbursement.ref &&
          (!completedDisbursement.loanRef || item.loanRef !== completedDisbursement.loanRef)
      )
    );

    // 2. Add to processed history with generated DV ref and reconciliation status
    const refNumber =
      completedDisbursement.ref && completedDisbursement.ref.startsWith('DV-')
        ? completedDisbursement.ref
        : `DV-2026-${Math.floor(1000 + Math.random() * 9000)}`;

    const newRecord = {
      ...completedDisbursement,
      ref: refNumber,
      status: 'Disbursed',
      date: completedDisbursement.date || new Date().toISOString().split('T')[0],
      amount: effectiveAmount,
      reconciliationStatus:
        completedDisbursement.paymentMethod === 'Bank Transfer'
          ? 'Ready for Bank Reconciliation'
          : completedDisbursement.paymentMethod === 'Cheque'
          ? 'Pending Clearing'
          : 'N/A (Cash Voucher)',
      auditTrail: [
        ...(completedDisbursement.auditTrail || []),
        {
          id: `at-${Date.now()}`,
          action: 'Disbursement Released & Certified',
          actor: 'Jose Reyes',
          role: 'Disbursing Officer',
          timestamp: new Date().toISOString(),
          details: `Authorized and released ₱${effectiveAmount.toLocaleString()} via ${
            completedDisbursement.paymentMethod || 'Cheque'
          } from ${completedDisbursement.fundSource || 'Loan Fund'}.`
        }
      ]
    };

    setProcessedDisbursements((prev) => [newRecord, ...prev]);

    // 3. Deduct from fund balance in state
    setFunds((prevFunds) =>
      prevFunds.map((fund) =>
        fund.name === completedDisbursement.fundSource
          ? { ...fund, balance: Math.max(0, fund.balance - effectiveAmount) }
          : fund
      )
    );

    // 4. Open success modal with updated balance impact
    setLastFinalizedDisbursement(newRecord);
    setIsSuccessModalOpen(true);

    showToast(
      `Disbursement for ${completedDisbursement.payee} (₱${effectiveAmount.toLocaleString()}) finalized!`,
      'success'
    );
  };

  // Reset all filters (Task 13 helper)
  const handleResetFilters = () => {
    setSearchRef('');
    setSearchPayee('');
    setTypeFilter('All');
    setCategoryFilter('All');
    setFundFilter('All');
    setChequeStatusFilter('All');
    setStartDate('');
    setEndDate('');
    setCurrentPage(1);
  };

  // Unified items list based on tab
  const allRows = useMemo(() => {
    const pendingWithStatus = processingQueue.map((item) => ({
      ...item,
      status: 'Pending Processing'
    }));

    if (activeTab === 'pending') return pendingWithStatus;
    if (activeTab === 'disbursed') return processedDisbursements;
    return [...pendingWithStatus, ...otherRecords, ...processedDisbursements];
  }, [activeTab, processingQueue, processedDisbursements, otherRecords]);

  // Task 13: Multi-criteria filtering
  const filteredRows = useMemo(() => {
    return allRows.filter((row) => {
      // 1. Reference filter
      const refQ = searchRef.trim().toLowerCase();
      const matchesRef =
        !refQ ||
        row.ref?.toLowerCase().includes(refQ) ||
        (row.loanRef && row.loanRef.toLowerCase().includes(refQ)) ||
        (row.chequeNumber && row.chequeNumber.toLowerCase().includes(refQ));

      // 2. Payee filter
      const payeeQ = searchPayee.trim().toLowerCase();
      const matchesPayee = !payeeQ || row.payee?.toLowerCase().includes(payeeQ);

      // 3. Fund filter
      const matchesFund = fundFilter === 'All' || row.fundSource === fundFilter;

      // 4. Category filter
      const matchesCategory = categoryFilter === 'All' || row.category === categoryFilter;

      // 5. Disbursement Type filter
      const matchesType = typeFilter === 'All' || row.type === typeFilter;

      // 6. Cheque Status filter
      let matchesCheque = true;
      if (chequeStatusFilter === 'Non-Cheque') {
        matchesCheque = row.paymentMethod !== 'Cheque' && !row.chequeStatus;
      } else if (chequeStatusFilter !== 'All') {
        matchesCheque =
          row.chequeStatus === chequeStatusFilter ||
          row.chequeRecord?.status === chequeStatusFilter;
      }

      // 7. Date Range filter
      const itemDate = row.date ? new Date(row.date) : null;
      const matchesStartDate = startDate && itemDate ? itemDate >= new Date(startDate) : true;
      const matchesEndDate = endDate && itemDate ? itemDate <= new Date(endDate) : true;

      return (
        matchesRef &&
        matchesPayee &&
        matchesFund &&
        matchesCategory &&
        matchesType &&
        matchesCheque &&
        matchesStartDate &&
        matchesEndDate
      );
    });
  }, [
    allRows,
    searchRef,
    searchPayee,
    fundFilter,
    categoryFilter,
    typeFilter,
    chequeStatusFilter,
    startDate,
    endDate
  ]);

  // Reset pagination on filter change
  useEffect(() => {
    setCurrentPage(1);
  }, [
    activeTab,
    searchRef,
    searchPayee,
    fundFilter,
    categoryFilter,
    typeFilter,
    chequeStatusFilter,
    startDate,
    endDate
  ]);

  const totalPages = Math.ceil(filteredRows.length / ITEMS_PER_PAGE) || 1;
  const paginatedRows = filteredRows.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  // Calculations for summary metrics
  const totalPendingAmount = useMemo(() => {
    return processingQueue.reduce((acc, curr) => acc + (curr.amount || 0), 0);
  }, [processingQueue]);

  const totalDisbursedAmount = useMemo(() => {
    return processedDisbursements.reduce((acc, curr) => acc + (curr.amount || 0), 0);
  }, [processedDisbursements]);

  const formatCurrency = (val: number) =>
    `₱${val.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  // Design Tokens
  const ultraGlassCard =
    'bg-white/50 backdrop-blur-[40px] backdrop-saturate-[200%] border border-white/80 shadow-[0_8px_30px_rgba(4,21,45,0.06),inset_0_2px_3px_rgba(255,255,255,0.9)] rounded-[24px] p-6 relative overflow-hidden';
  const glassInput =
    'pl-9 pr-3 py-2 bg-white/60 hover:bg-white/80 focus:bg-white/90 backdrop-blur-xl border border-white/90 shadow-[inset_0_2px_4px_rgba(4,21,45,0.03)] rounded-full text-[12px] text-[#04152d] outline-none transition-all duration-300 placeholder:text-[#04152d]/40 focus:shadow-[0_4px_16px_rgba(4,21,45,0.08),inset_0_1px_2px_rgba(255,255,255,1)]';

  const getTypeBadge = (type: string) => {
    switch (type) {
      case 'Loan Release':
        return (
          <span className="px-2.5 py-1 bg-blue-50 text-blue-700 border border-blue-200/80 rounded-full text-[10px] font-bold uppercase tracking-wider shadow-sm flex items-center gap-1 w-fit">
            <DollarSign size={10} /> Loan Release
          </span>
        );
      case 'Expense':
        return (
          <span className="px-2.5 py-1 bg-purple-50 text-purple-700 border border-purple-200/80 rounded-full text-[10px] font-bold uppercase tracking-wider shadow-sm flex items-center gap-1 w-fit">
            <Building2 size={10} /> Expense
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-1 bg-amber-50 text-amber-700 border border-amber-200/80 rounded-full text-[10px] font-bold uppercase tracking-wider shadow-sm flex items-center gap-1 w-fit">
            <Sparkles size={10} /> Authorized Release
          </span>
        );
    }
  };

  const getStatusBadge = (status: string) => {
    if (status === 'Disbursed') {
      return (
        <span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-md text-[10px] font-bold uppercase tracking-widest shadow-sm flex items-center gap-1 mx-auto w-fit">
          <CheckCircle2 size={11} /> Disbursed
        </span>
      );
    }
    if (status === 'Pending Approval' || status === 'Rejected') {
      const rejected = status === 'Rejected';
      return (
        <span
          className={`px-2.5 py-1 border rounded-md text-[10px] font-bold uppercase tracking-widest shadow-sm flex items-center gap-1 mx-auto w-fit ${
            rejected ? 'bg-red-50 text-red-700 border-red-200' : 'bg-blue-50 text-blue-700 border-blue-200'
          }`}
        >
          {rejected ? <AlertCircle size={11} /> : <Clock size={11} />} {status}
        </span>
      );
    }
    return (
      <span className="px-2.5 py-1 bg-amber-50 text-amber-800 border border-amber-200 rounded-md text-[10px] font-bold uppercase tracking-widest shadow-sm flex items-center gap-1 mx-auto w-fit">
        <Clock size={11} /> Pending Release
      </span>
    );
  };

  // Task 9: Cheque Status Badge
  const getChequeStatusBadge = (row: any) => {
    if (row.paymentMethod !== 'Cheque' && !row.chequeNumber) {
      return (
        <span className="text-[10px] text-[#04152d]/40 font-medium">Non-Cheque</span>
      );
    }

    const status: ChequeStatus = row.chequeStatus || row.chequeRecord?.status || 'Issued';
    switch (status) {
      case 'Encashed':
        return (
          <span className="px-2 py-0.5 bg-emerald-50 text-emerald-800 border border-emerald-300 rounded text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 w-fit">
            <CheckCircle2 size={10} /> Encashed
          </span>
        );
      case 'Cancelled/Void':
        return (
          <span className="px-2 py-0.5 bg-red-50 text-red-800 border border-red-300 rounded text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 w-fit">
            <AlertCircle size={10} /> Cancelled/Void
          </span>
        );
      default:
        return (
          <span className="px-2 py-0.5 bg-amber-50 text-amber-900 border border-amber-300 rounded text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 w-fit">
            <CreditCard size={10} /> Issued
          </span>
        );
    }
  };

  return (
    <div className="relative flex flex-col min-h-screen bg-[#f4f5f7]">
      <style jsx global>{`
        @keyframes modal-fade-in {
          from {
            opacity: 0;
            transform: scale(0.96) translateY(8px);
          }
          to {
            opacity: 1;
            transform: scale(1) translateY(0);
          }
        }
        @keyframes slide-up {
          from {
            opacity: 0;
            transform: translateY(14px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-modal-enter {
          animation: modal-fade-in 0.28s cubic-bezier(0.2, 0.9, 0.4, 1) forwards;
        }
        .animate-fade-in {
          animation: modal-fade-in 0.35s ease-out forwards;
        }
        .animate-slide-up {
          animation: slide-up 0.3s cubic-bezier(0.2, 0.9, 0.4, 1) forwards;
        }
        .hide-scrollbar::-webkit-scrollbar {
          display: none;
        }
      `}</style>

      {/* Global Header */}
      <div className="sticky top-0 z-40 w-full backdrop-blur-2xl bg-white/30 border-b border-white/50 shadow-[0_4px_30px_rgba(0,0,0,0.03)]">
        <Header />
      </div>

      <div className="p-4 md:p-6 max-w-[1400px] w-full mx-auto animate-fade-in flex-1 relative z-10 space-y-6 mt-2">
        {/* Toast Feedback */}
        {toast && (
          <div className="fixed top-20 right-6 z-50 animate-slide-up">
            <div
              className={`px-5 py-3 rounded-2xl shadow-xl border flex items-center gap-3 text-[13px] font-medium backdrop-blur-xl ${
                toast.type === 'success'
                  ? 'bg-emerald-500/90 border-emerald-400 text-white shadow-emerald-500/20'
                  : 'bg-red-500/90 border-red-400 text-white shadow-red-500/20'
              }`}
            >
              <CheckCircle2 size={18} />
              <span>{toast.message}</span>
            </div>
          </div>
        )}

        {/* Top Summary Metrics & Fund Solvency */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Card 1: Pending Releases */}
          <div className={`${ultraGlassCard} flex items-center justify-between`}>
            <div className="space-y-1">
              <span className="text-[11px] uppercase font-bold tracking-wider text-[#04152d]/50">
                Releases Pending Processing
              </span>
              <div className="text-[26px] font-bold text-[#04152d] tracking-tight">
                {processingQueue.length}{' '}
                <span className="text-[14px] font-normal text-[#04152d]/60">items</span>
              </div>
              <p className="text-[12px] font-semibold text-amber-700">
                Total: {formatCurrency(totalPendingAmount)}
              </p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-700 shadow-sm">
              <Clock size={24} />
            </div>
          </div>

          {/* Card 2: Processed Disbursements */}
          <div className={`${ultraGlassCard} flex items-center justify-between`}>
            <div className="space-y-1">
              <span className="text-[11px] uppercase font-bold tracking-wider text-[#04152d]/50">
                Disbursements Processed
              </span>
              <div className="text-[26px] font-bold text-[#04152d] tracking-tight">
                {processedDisbursements.length}{' '}
                <span className="text-[14px] font-normal text-[#04152d]/60">released</span>
              </div>
              <p className="text-[12px] font-semibold text-emerald-700">
                Disbursed: {formatCurrency(totalDisbursedAmount)}
              </p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-700 shadow-sm">
              <CheckCircle2 size={24} />
            </div>
          </div>

          {/* Card 3: Key Configured Funds & Available Balances (Task 5 & 14) */}
          <div className={`${ultraGlassCard} flex flex-col justify-between`}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] uppercase font-bold tracking-wider text-[#04152d]/50">
                Live Fund Liquidity
              </span>
              <Wallet size={16} className="text-blue-600" />
            </div>
            <div className="space-y-1.5">
              {funds.slice(0, 3).map((f) => (
                <div key={f.id} className="flex items-center justify-between text-[12px]">
                  <span className="text-[#04152d]/70 font-medium">
                    {f.name} ({f.code})
                  </span>
                  <span className="font-bold text-[#04152d]">{formatCurrency(f.balance)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Tab Controls, Search, and Task 13 Filter Bar */}
        <div className={`${ultraGlassCard} !p-5 space-y-4`}>
          {/* Tabs row & Main Action Button */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-white/60">
            <div className="flex items-center gap-1.5 p-1 bg-white/60 backdrop-blur-md rounded-full border border-white/90 shadow-[inset_0_1px_3px_rgba(4,21,45,0.03)]">
              <button
                onClick={() => setActiveTab('pending')}
                className={`px-4 py-1.5 rounded-full text-[12px] font-bold transition-all duration-200 flex items-center gap-1.5 ${
                  activeTab === 'pending'
                    ? 'bg-gradient-to-b from-[#0a1e3f] to-[#04152d] text-white shadow-sm'
                    : 'text-[#04152d]/60 hover:text-[#04152d]'
                }`}
              >
                <span>Pending Processing</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                    activeTab === 'pending' ? 'bg-white/20 text-white' : 'bg-black/5 text-[#04152d]/60'
                  }`}
                >
                  {processingQueue.length}
                </span>
              </button>

              <button
                onClick={() => setActiveTab('disbursed')}
                className={`px-4 py-1.5 rounded-full text-[12px] font-bold transition-all duration-200 flex items-center gap-1.5 ${
                  activeTab === 'disbursed'
                    ? 'bg-gradient-to-b from-[#0a1e3f] to-[#04152d] text-white shadow-sm'
                    : 'text-[#04152d]/60 hover:text-[#04152d]'
                }`}
              >
                <span>Disbursed History</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                    activeTab === 'disbursed' ? 'bg-white/20 text-white' : 'bg-black/5 text-[#04152d]/60'
                  }`}
                >
                  {processedDisbursements.length}
                </span>
              </button>

              <button
                onClick={() => setActiveTab('all')}
                className={`px-4 py-1.5 rounded-full text-[12px] font-bold transition-all duration-200 ${
                  activeTab === 'all'
                    ? 'bg-gradient-to-b from-[#0a1e3f] to-[#04152d] text-white shadow-sm'
                    : 'text-[#04152d]/60 hover:text-[#04152d]'
                }`}
              >
                All Records
              </button>
            </div>

            {/* Primary Action Button */}
            <button
              onClick={handleRecordNewDisbursement}
              className="px-5 py-2.5 bg-gradient-to-b from-[#0a1e3f] to-[#04152d] text-white border border-[#04152d] shadow-[0_6px_20px_rgba(4,21,45,0.3),inset_0_1px_1px_rgba(255,255,255,0.15)] hover:shadow-[0_8px_25px_rgba(4,21,45,0.4),inset_0_1px_1px_rgba(255,255,255,0.25)] hover:from-[#0f2850] hover:to-[#061a38] rounded-full text-[13px] font-semibold transition-all duration-300 flex items-center gap-2 active:scale-95 whitespace-nowrap self-end sm:self-auto"
            >
              <Plus size={16} /> Record Disbursement
            </button>
          </div>

          {/* Task 13: Dedicated Multi-Criteria Filter Controls */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-[11px] font-bold text-[#04152d]/70 uppercase tracking-wider">
                <Filter size={13} className="text-blue-600" />
                <span>Filter Outgoing Disbursements</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => loadData(true)}
                  className="text-[11px] font-semibold text-emerald-700 hover:text-emerald-900 flex items-center gap-1 transition-colors px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200 shadow-sm"
                  title="Reload test records and funds"
                >
                  <RotateCcw size={11} /> Reset Sample Data
                </button>
                <button
                  onClick={handleResetFilters}
                  className="text-[11px] font-semibold text-blue-700 hover:text-blue-900 flex items-center gap-1 transition-colors"
                >
                  <RotateCcw size={12} /> Reset Filters
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {/* 1. Filter: Disbursement Reference */}
              <div className="relative">
                <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#04152d]/50" />
                <input
                  type="text"
                  placeholder="Filter by Reference..."
                  value={searchRef}
                  onChange={(e) => setSearchRef(e.target.value)}
                  className={`${glassInput} w-full`}
                />
              </div>

              {/* 2. Filter: Payee */}
              <div className="relative">
                <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#04152d]/50" />
                <input
                  type="text"
                  placeholder="Filter by Payee..."
                  value={searchPayee}
                  onChange={(e) => setSearchPayee(e.target.value)}
                  className={`${glassInput} w-full`}
                />
              </div>

              {/* 3. Filter: Fund */}
              <div className="relative">
                <select
                  value={fundFilter}
                  onChange={(e) => setFundFilter(e.target.value)}
                  className={`${glassInput} appearance-none pr-8 w-full cursor-pointer`}
                >
                  <option value="All">All Funds</option>
                  {funds.map((f) => (
                    <option key={f.id} value={f.name}>
                      {f.name}
                    </option>
                  ))}
                </select>
                <ChevronDown
                  size={14}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#04152d]/50 pointer-events-none"
                />
              </div>

              {/* 4. Filter: Category */}
              <div className="relative">
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className={`${glassInput} appearance-none pr-8 w-full cursor-pointer`}
                >
                  <option value="All">All Categories</option>
                  {CONFIGURED_CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
                <ChevronDown
                  size={14}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#04152d]/50 pointer-events-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* 5. Filter: Disbursement Type */}
              <div className="relative">
                <select
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value)}
                  className={`${glassInput} appearance-none pr-8 w-full cursor-pointer`}
                >
                  <option value="All">All Disbursement Types</option>
                  <option value="Loan Release">Loan Release</option>
                  <option value="Expense">Expense</option>
                  <option value="Other Authorized Release">Other Authorized Release</option>
                </select>
                <ChevronDown
                  size={14}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#04152d]/50 pointer-events-none"
                />
              </div>

              {/* 6. Filter: Cheque Status (Task 9 & 13) */}
              <div className="relative">
                <select
                  value={chequeStatusFilter}
                  onChange={(e) => setChequeStatusFilter(e.target.value)}
                  className={`${glassInput} appearance-none pr-8 w-full cursor-pointer`}
                >
                  <option value="All">All Cheque Statuses</option>
                  <option value="Issued">Issued</option>
                  <option value="Encashed">Encashed</option>
                  <option value="Cancelled/Void">Cancelled/Void</option>
                  <option value="Non-Cheque">Non-Cheque</option>
                </select>
                <ChevronDown
                  size={14}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#04152d]/50 pointer-events-none"
                />
              </div>

              {/* 7. Filter: Date Range */}
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <Calendar size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#04152d]/50" />
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className={`${glassInput} !pl-8 w-full text-[11px] [&::-webkit-calendar-picker-indicator]:opacity-50`}
                  />
                </div>
                <span className="text-[#04152d]/40 font-bold">-</span>
                <div className="relative flex-1">
                  <Calendar size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#04152d]/50" />
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className={`${glassInput} !pl-8 w-full text-[11px] [&::-webkit-calendar-picker-indicator]:opacity-50`}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Processing Table of Outgoing Transactions */}
        <div className={`${ultraGlassCard} !p-0`}>
          <div className="overflow-x-auto w-full">
            <table className="w-full text-left whitespace-nowrap border-collapse min-w-[1050px]">
              <thead className="bg-white/60 backdrop-blur-md shadow-[0_1px_0_rgba(255,255,255,1)] text-[10px] font-semibold text-[#04152d]/50 uppercase tracking-[0.2em]">
                <tr>
                  <th className="py-4 px-6 border-b border-white/50">Reference & Date</th>
                  <th className="py-4 px-6 border-b border-white/50">Payee & Purpose</th>
                  <th className="py-4 px-6 border-b border-white/50">Type & Category</th>
                  <th className="py-4 px-6 border-b border-white/50">Fund Source</th>
                  <th className="py-4 px-6 border-b border-white/50">Cheque Status</th>
                  <th className="py-4 px-6 border-b border-white/50 text-right">Amount</th>
                  <th className="py-4 px-6 border-b border-white/50 text-center">Status</th>
                  <th className="py-4 px-6 border-b border-white/50 text-center">Reconciliation</th>
                  <th className="py-4 px-6 border-b border-white/50 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/60 text-[13px] text-[#04152d] bg-white/30">
                {paginatedRows.length > 0 ? (
                  paginatedRows.map((row) => {
                    const isPending = row.status === 'Pending Processing';
                    return (
                      <tr key={row.id} className="hover:bg-white/70 transition-all duration-200">
                        {/* Reference & Date */}
                        <td className="py-4 px-6">
                          <p className="font-mono text-[12px] font-semibold text-blue-600 tracking-tight">
                            {row.ref}
                          </p>
                          <p className="text-[11px] text-[#04152d]/50 flex items-center gap-1 mt-0.5">
                            <Calendar size={11} /> {row.date || 'Today'}
                          </p>
                        </td>

                        {/* Payee & Purpose */}
                        <td className="py-4 px-6 max-w-xs">
                          <p className="font-bold text-[#04152d] tracking-tight">{row.payee}</p>
                          <p className="text-[11px] text-[#04152d]/60 truncate mt-0.5">{row.purpose}</p>
                          {row.loanRef && (
                            <span className="inline-block mt-1 font-mono text-[10px] bg-blue-50 text-blue-800 px-1.5 py-0.5 rounded border border-blue-200">
                              Loan: {row.loanRef}
                            </span>
                          )}
                        </td>

                        {/* Type & Category */}
                        <td className="py-4 px-6">
                          <div className="space-y-1">
                            {getTypeBadge(row.type)}
                            <p className="text-[11px] text-[#04152d]/60 font-medium pl-0.5">
                              {row.category}
                            </p>
                          </div>
                        </td>

                        {/* Fund Source */}
                        <td className="py-4 px-6">
                          <div className="flex items-center gap-1.5 font-semibold text-[#04152d]">
                            <Wallet size={13} className="text-blue-600" />
                            <span>{row.fundSource}</span>
                          </div>
                        </td>

                        {/* Task 9: Cheque Status */}
                        <td className="py-4 px-6">
                          <div className="space-y-1">
                            {getChequeStatusBadge(row)}
                            {row.chequeNumber && (
                              <span className="font-mono text-[10px] text-[#04152d]/60 block">
                                {row.chequeNumber}
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Amount */}
                        <td className="py-4 px-6 text-right">
                          <p className="font-bold text-[14px] text-[#04152d]">
                            {formatCurrency(row.actualAmountReleased || row.amount)}
                          </p>
                          {row.approvedLoanAmount && row.approvedLoanAmount !== row.amount && (
                            <p className="text-[10px] text-[#04152d]/50">
                              Approved: {formatCurrency(row.approvedLoanAmount)}
                            </p>
                          )}
                        </td>

                        {/* Status */}
                        <td className="py-4 px-6 text-center">{getStatusBadge(row.status)}</td>

                        {/* Task 11: Reconciliation Status */}
                        <td className="py-4 px-6 text-center">
                          {row.status === 'Disbursed' ? (
                            row.paymentMethod === 'Bank Transfer' ? (
                              <span className="px-2.5 py-1 bg-blue-50 text-blue-700 border border-blue-200 rounded-md text-[10px] font-bold uppercase tracking-wider inline-flex items-center gap-1 shadow-sm">
                                <FileCheck size={11} className="text-blue-600" /> Ready for Reconciliation
                              </span>
                            ) : row.paymentMethod === 'Cheque' ? (
                              row.chequeStatus === 'Encashed' ? (
                                <span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-md text-[10px] font-bold uppercase tracking-wider inline-flex items-center gap-1 shadow-sm">
                                  <CheckCircle2 size={11} className="text-emerald-600" /> Reconciled
                                </span>
                              ) : (
                                <span className="px-2.5 py-1 bg-amber-50 text-amber-800 border border-amber-200 rounded-md text-[10px] font-bold uppercase tracking-wider inline-flex items-center gap-1 shadow-sm">
                                  <Clock size={11} className="text-amber-600" /> Pending Clearing
                                </span>
                              )
                            ) : (
                              <span className="px-2 py-0.5 bg-gray-100 text-gray-500 rounded text-[10px] font-medium">
                                N/A (Cash Voucher)
                              </span>
                            )
                          ) : (
                            <span className="text-[10px] text-[#04152d]/30 uppercase tracking-widest font-mono">
                              Awaiting Release
                            </span>
                          )}
                        </td>

                        {/* Action */}
                        <td className="py-4 px-6 text-right">
                          {isPending ? (
                            <button
                              onClick={() => handleProcessItem(row)}
                              className="px-4 py-2 bg-gradient-to-b from-[#0a1e3f] to-[#04152d] text-white shadow-sm hover:shadow-md rounded-full text-[11px] font-bold uppercase tracking-wider transition-all duration-200 active:scale-95 flex items-center gap-1.5 ml-auto hover:from-[#0f2850] hover:to-[#061a38]"
                            >
                              <span>Process</span>
                              <ArrowUpRight size={13} />
                            </button>
                          ) : (
                            <div className="flex items-center justify-end gap-1.5 ml-auto">
                              <button
                                onClick={() => {
                                  setSelectedDisbursementForVoucher(row);
                                  setIsVoucherModalOpen(true);
                                }}
                                className="px-3.5 py-1.5 bg-blue-50/80 border border-blue-200 shadow-sm hover:shadow hover:bg-blue-100/80 rounded-full text-[11px] font-bold text-blue-800 uppercase tracking-wider transition-all duration-200 active:scale-95 flex items-center gap-1.5"
                              >
                                <FileText size={12} className="text-blue-700" />
                                <span>Voucher & PDF</span>
                              </button>

                              <button
                                onClick={() => {
                                  setSelectedDisbursementForAudit({
                                    ...row,
                                    member: row.payee,
                                    loanType: row.category,
                                    paymentMethod: row.paymentMethod || 'Cheque',
                                    chequeStatus: row.chequeStatus || 'Issued',
                                    chequeNumber: row.chequeNumber,
                                    beneficiary: {
                                      name: row.payee,
                                      bank: 'Commercial Bank',
                                      account: 'Verified'
                                    },
                                    method: row.paymentMethod || 'Cheque',
                                    auditTrail: row.auditTrail || [
                                      {
                                        id: 'at-1',
                                        action: 'Funds Released & Recorded',
                                        actor: 'Disbursing Officer',
                                        role: 'Disbursing Officer',
                                        timestamp: row.processedAt || new Date().toISOString(),
                                        details: `Disbursed ${formatCurrency(row.amount)} under reference ${
                                          row.supportingDocRef || row.ref
                                        }.`
                                      }
                                    ]
                                  });
                                  setIsAuditModalOpen(true);
                                }}
                                className="p-1.5 bg-white border border-gray-200 hover:bg-gray-100 rounded-full text-gray-600 hover:text-gray-900 transition-all shadow-sm"
                                title="View Audit Trail"
                              >
                                <Eye size={13} />
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={9} className="py-12 text-center text-[#04152d]/50">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <FileText size={32} className="opacity-40" />
                        <p className="font-semibold text-[14px]">No transactions match your criteria</p>
                        <p className="text-[12px] text-[#04152d]/60">
                          Try adjusting your search filters or reload the test sample data to test all disbursing flows.
                        </p>
                        <div className="mt-2 flex items-center justify-center gap-2">
                          <button
                            onClick={handleResetFilters}
                            className="px-3.5 py-1.5 bg-white/80 hover:bg-white text-[11px] font-semibold text-blue-700 rounded-full border border-blue-200 shadow-sm transition-colors"
                          >
                            Clear All Filters
                          </button>
                          <button
                            onClick={() => loadData(true)}
                            className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-[11px] font-semibold text-white rounded-full shadow-sm transition-colors"
                          >
                            Reload Sample Data
                          </button>
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="p-4 border-t border-white/60 flex items-center justify-between">
              <span className="text-[12px] text-[#04152d]/60 font-medium">
                Showing page {currentPage} of {totalPages} ({filteredRows.length} total records)
              </span>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="p-1.5 rounded-full border border-white/80 bg-white/60 hover:bg-white text-[#04152d] disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                >
                  <ChevronLeft size={16} />
                </button>
                {Array.from({ length: totalPages }).map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setCurrentPage(i + 1)}
                    className={`w-7 h-7 rounded-full text-[12px] font-semibold transition-all ${
                      currentPage === i + 1
                        ? 'bg-[#04152d] text-white shadow-sm'
                        : 'bg-white/50 text-[#04152d]/70 hover:bg-white'
                    }`}
                  >
                    {i + 1}
                  </button>
                ))}
                <button
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="p-1.5 rounded-full border border-white/80 bg-white/60 hover:bg-white text-[#04152d] disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Task 1 to Task 11: Disbursement Processing & Recording Form Modal */}
      <DisbursementFormModal
        isOpen={isFormModalOpen}
        onClose={() => {
          setIsFormModalOpen(false);
          setSelectedItemForProcessing(null);
        }}
        itemToProcess={selectedItemForProcessing}
        funds={funds}
        onDisbursementComplete={handleDisbursementComplete}
        onRequestSubmitted={handleRequestSubmitted}
      />

      {/* Task 14: Updated Fund Balance Display Confirmation Modal */}
      <DisbursementSuccessModal
        isOpen={isSuccessModalOpen}
        onClose={() => {
          setIsSuccessModalOpen(false);
          setLastFinalizedDisbursement(null);
        }}
        onViewVoucher={() => {
          setSelectedDisbursementForVoucher(lastFinalizedDisbursement);
          setIsVoucherModalOpen(true);
          setIsSuccessModalOpen(false);
        }}
        disbursement={lastFinalizedDisbursement}
      />

      {/* Official Voucher View & Direct PDF Download Modal */}
      <DisbursementVoucherModal
        isOpen={isVoucherModalOpen}
        onClose={() => {
          setIsVoucherModalOpen(false);
          setSelectedDisbursementForVoucher(null);
        }}
        disbursement={selectedDisbursementForVoucher}
      />

      {/* Audit Trail Inspection Modal */}
      <DisbursementAuditModal
        isOpen={isAuditModalOpen}
        onClose={() => {
          setIsAuditModalOpen(false);
          setSelectedDisbursementForAudit(null);
        }}
        disbursement={selectedDisbursementForAudit}
        showToast={showToast}
      />

      {/* Floating Animated Toast Notification */}
      {toast && (
        <div className="fixed top-6 right-6 z-50 animate-slide-down flex items-center gap-3 px-4 py-3 rounded-2xl bg-white/95 backdrop-blur-2xl border border-white/90 shadow-[0_12px_40px_rgba(4,21,45,0.18)] max-w-md transition-all duration-300">
          <div
            className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
              toast.type === 'success'
                ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20'
                : toast.type === 'error'
                ? 'bg-rose-500/10 text-rose-600 border border-rose-500/20'
                : 'bg-blue-500/10 text-blue-600 border border-blue-500/20'
            }`}
          >
            {toast.type === 'success' ? (
              <CheckCircle2 size={18} />
            ) : toast.type === 'error' ? (
              <AlertCircle size={18} />
            ) : (
              <Info size={18} />
            )}
          </div>

          <div className="flex-1 pr-2">
            <p className="text-[10px] font-bold uppercase tracking-wider text-[#04152d]/50">
              {toast.type === 'success' ? 'Transaction Success' : toast.type === 'error' ? 'Security Notice' : 'System Information'}
            </p>
            <p className="text-[13px] font-semibold text-[#04152d] leading-snug">
              {toast.message}
            </p>
          </div>

          <button
            onClick={() => setToast(null)}
            className="w-6 h-6 rounded-full hover:bg-black/5 text-[#04152d]/40 hover:text-[#04152d] flex items-center justify-center transition-colors cursor-pointer"
          >
            <X size={14} />
          </button>
        </div>
      )}
    </div>
  );
}
