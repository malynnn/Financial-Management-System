"use client";

import React, { useState, useMemo, useEffect } from 'react';
import {
  Search,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  FileText,
  CheckCircle2,
  AlertCircle,
  Info,
  Shield,
  ShieldCheck,
  Calendar,
  Wallet,
  Clock,
  Building2,
  DollarSign,
  Sparkles,
  CreditCard,
  Filter,
  RotateCcw,
  Eye,
  Lock
} from 'lucide-react';
import Header from '@/components/Header';
import DisbursementAuditModal from '@/components/disbursement/DisbursementAuditModal';
import DisbursementVoucherModal from '@/components/disbursement/DisbursementVoucherModal';
import {
  CONFIGURED_FUNDS,
  CONFIGURED_CATEGORIES,
  CONFIGURED_CHEQUE_STATUSES,
  DisbursementType,
  ChequeStatus
} from '@/components/disbursement/DisbursementFormModal';

const MOCK_AUDIT_DISBURSEMENTS = [
  {
    id: 'disb-101',
    ref: 'VCH-LN-2026-0891',
    payee: 'Maria Clara Santos',
    member: 'Maria Clara Santos',
    type: 'Loan Release' as DisbursementType,
    category: 'Loan Release',
    purpose: 'Approved Multi-Purpose Member Loan Release',
    amount: 48500,
    fundSource: 'Loan Fund',
    date: '2026-10-04',
    status: 'Disbursed',
    paymentMethod: 'Cheque',
    chequeNumber: 'CHK-2026-8801',
    chequeStatus: 'Issued' as ChequeStatus,
    loanRef: 'LN-2026-0891',
    beneficiary: { name: 'Maria Clara Santos', bank: 'BDO Unibank', account: '0012-3456-7890' },
    auditTrail: [
      {
        id: 'at-1',
        action: 'Disbursement Released via Cheque',
        actor: 'Maria Santos',
        role: 'Disbursing Officer',
        timestamp: '2026-10-04T08:15:00Z',
        details: 'Issued Cheque #CHK-2026-8801 for ₱48,500.00 from Loan Fund.'
      },
      {
        id: 'at-2',
        action: 'Voucher Approved',
        actor: 'Admin Approver',
        role: 'Admin',
        timestamp: '2026-10-03T16:00:00Z',
        details: 'Approved loan release voucher following credit committee recommendation.'
      }
    ]
  },
  {
    id: 'disb-102',
    ref: 'VCH-EXP-2026-0104',
    payee: 'Meralco Power Distribution Corp',
    member: 'Meralco Corporate',
    type: 'Expense' as DisbursementType,
    category: 'Operational Expense',
    purpose: 'Monthly Office Electricity Bill & Server Room Power',
    amount: 14850,
    fundSource: 'General Fund',
    date: '2026-10-03',
    status: 'Disbursed',
    paymentMethod: 'Bank Transfer',
    beneficiary: { name: 'Meralco Commercial Billing', bank: 'BPI', account: '9876-5432-10' },
    auditTrail: [
      {
        id: 'at-3',
        action: 'Electronic Bank Transfer Executed',
        actor: 'Maria Santos',
        role: 'Disbursing Officer',
        timestamp: '2026-10-03T11:20:00Z',
        details: 'Direct EFT payment executed to utility provider account.'
      }
    ]
  },
  {
    id: 'disb-103',
    ref: 'VCH-AUTH-2026-0312',
    payee: 'Jose Protacio Rizal',
    member: 'Jose Protacio Rizal',
    type: 'Other Authorized Release' as DisbursementType,
    category: 'Member Benefit / Calamity Assistance',
    purpose: 'Approved Typhoon Flooding Relief Assistance Grant',
    amount: 20000,
    fundSource: 'Calamity Fund',
    date: '2026-10-02',
    status: 'Disbursed',
    paymentMethod: 'Cheque',
    chequeNumber: 'CHK-2026-8790',
    chequeStatus: 'Encashed' as ChequeStatus,
    beneficiary: { name: 'Jose Rizal', bank: 'Landbank', account: '1102-4433-22' },
    auditTrail: [
      {
        id: 'at-4',
        action: 'Cheque Encashed by Payee',
        actor: 'Clearing Bank System',
        role: 'Bank',
        timestamp: '2026-10-04T14:10:00Z',
        details: 'Cheque #CHK-2026-8790 verified and cleared at teller counter.'
      },
      {
        id: 'at-5',
        action: 'Cheque Issued to Beneficiary',
        actor: 'Maria Santos',
        role: 'Disbursing Officer',
        timestamp: '2026-10-02T09:30:00Z',
        details: 'Handed official cheque to member in good standing.'
      }
    ]
  },
  {
    id: 'disb-104',
    ref: 'VCH-LN-2026-0888',
    payee: 'Emilio Aguinaldo',
    member: 'Emilio Aguinaldo',
    type: 'Loan Release' as DisbursementType,
    category: 'Loan Release',
    purpose: 'Agricultural Production & Livelihood Loan',
    amount: 75000,
    fundSource: 'Loan Fund',
    date: '2026-10-01',
    status: 'Disbursed',
    paymentMethod: 'Cheque',
    chequeNumber: 'CHK-2026-8785',
    chequeStatus: 'Issued' as ChequeStatus,
    loanRef: 'LN-2026-0888',
    beneficiary: { name: 'Emilio Aguinaldo', bank: 'BDO', account: '0099-8877-66' },
    auditTrail: [
      {
        id: 'at-6',
        action: 'Loan Disbursed via Cheque',
        actor: 'Maria Santos',
        role: 'Disbursing Officer',
        timestamp: '2026-10-01T15:45:00Z',
        details: 'Released ₱75,000.00 cheque following agricultural loan contract signing.'
      }
    ]
  },
  {
    id: 'disb-105',
    ref: 'VCH-EXP-2026-0099',
    payee: 'National Bookstore Corporate Sales',
    member: 'NBS Corporate',
    type: 'Expense' as DisbursementType,
    category: 'Administrative Expense',
    purpose: 'Annual Assembly Documentation & Printing Supplies',
    amount: 4320,
    fundSource: 'General Fund',
    date: '2026-09-28',
    status: 'Disbursed',
    paymentMethod: 'Cash Voucher',
    beneficiary: { name: 'NBS Manila Branch', bank: 'Over-The-Counter Cash', account: 'Cash Office' },
    auditTrail: [
      {
        id: 'at-7',
        action: 'Petty Cash Voucher Disbursed',
        actor: 'Maria Santos',
        role: 'Disbursing Officer',
        timestamp: '2026-09-28T13:00:00Z',
        details: 'Disbursed petty cash with verified official receipt attached.'
      }
    ]
  },
  {
    id: 'disb-106',
    ref: 'VCH-2026-0044',
    payee: 'PLDT Enterprise Broadband',
    member: 'PLDT Inc.',
    type: 'Expense' as DisbursementType,
    category: 'Administrative Expense',
    purpose: 'Cooperative HQ Internet & Cloud Line Connection',
    amount: 5499,
    fundSource: 'General Fund',
    date: '2026-09-27',
    status: 'Disbursed',
    paymentMethod: 'Bank Transfer',
    beneficiary: { name: 'PLDT Collections', bank: 'Metrobank', account: '5544-3322-11' },
    auditTrail: [
      {
        id: 'at-8',
        action: 'Online Payment Disbursed',
        actor: 'Maria Santos',
        role: 'Disbursing Officer',
        timestamp: '2026-09-27T10:15:00Z',
        details: 'Corporate bill settled through online corporate banking portal.'
      }
    ]
  },
  {
    id: 'disb-107',
    ref: 'VCH-2026-0043',
    payee: 'Andres Bonifacio',
    member: 'Andres Bonifacio',
    type: 'Loan Release' as DisbursementType,
    category: 'Loan Release',
    purpose: 'Educational Loan for Tertiary Tuition',
    amount: 30000,
    fundSource: 'Loan Fund',
    date: '2026-09-25',
    status: 'Disbursed',
    paymentMethod: 'Cheque',
    chequeNumber: 'CHK-2026-8710',
    chequeStatus: 'Cancelled/Void' as ChequeStatus,
    loanRef: 'LN-2026-0870',
    beneficiary: { name: 'Andres Bonifacio', bank: 'BDO', account: '4433-2211-00' },
    auditTrail: [
      {
        id: 'at-9',
        action: 'Cheque Marked Void Due to Stale Request',
        actor: 'Maria Santos',
        role: 'Disbursing Officer',
        timestamp: '2026-09-26T11:00:00Z',
        details: 'Member requested electronic bank payout instead. Cheque #CHK-2026-8710 cancelled and voided.'
      }
    ]
  }
];

const ITEMS_PER_PAGE = 8;

export default function AuditorDisbursementPage() {
  const [disbursements] = useState<any[]>(MOCK_AUDIT_DISBURSEMENTS);

  // Filters (Task 13 in read-only audit view)
  const [searchRef, setSearchRef] = useState('');
  const [searchPayee, setSearchPayee] = useState('');
  const [fundFilter, setFundFilter] = useState('All');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [typeFilter, setTypeFilter] = useState('All');
  const [chequeStatusFilter, setChequeStatusFilter] = useState('All');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  // Read-only modal inspection
  const [selectedDisbursement, setSelectedDisbursement] = useState<any | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Official Voucher modal & PDF download
  const [selectedVoucherForModal, setSelectedVoucherForModal] = useState<any | null>(null);
  const [isVoucherModalOpen, setIsVoucherModalOpen] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'info' | 'error' } | null>(null);

  const showToast = (message: string, type: 'success' | 'info' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const handleResetFilters = () => {
    setSearchRef('');
    setSearchPayee('');
    setFundFilter('All');
    setCategoryFilter('All');
    setTypeFilter('All');
    setChequeStatusFilter('All');
    setStartDate('');
    setEndDate('');
    setCurrentPage(1);
  };

  // Filter logic
  const filteredDisbursements = useMemo(() => {
    return disbursements.filter((row) => {
      const refQ = searchRef.trim().toLowerCase();
      const matchesRef =
        !refQ ||
        row.ref.toLowerCase().includes(refQ) ||
        (row.loanRef && row.loanRef.toLowerCase().includes(refQ)) ||
        (row.chequeNumber && row.chequeNumber.toLowerCase().includes(refQ));

      const payeeQ = searchPayee.trim().toLowerCase();
      const matchesPayee =
        !payeeQ ||
        row.payee.toLowerCase().includes(payeeQ) ||
        (row.member && row.member.toLowerCase().includes(payeeQ));

      const matchesFund = fundFilter === 'All' || row.fundSource === fundFilter;
      const matchesCategory = categoryFilter === 'All' || row.category === categoryFilter;
      const matchesType = typeFilter === 'All' || row.type === typeFilter;

      let matchesCheque = true;
      if (chequeStatusFilter === 'Non-Cheque') {
        matchesCheque = row.paymentMethod !== 'Cheque' && !row.chequeStatus;
      } else if (chequeStatusFilter !== 'All') {
        matchesCheque = row.chequeStatus === chequeStatusFilter;
      }

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
    disbursements,
    searchRef,
    searchPayee,
    fundFilter,
    categoryFilter,
    typeFilter,
    chequeStatusFilter,
    startDate,
    endDate
  ]);

  useEffect(() => {
    setCurrentPage(1);
  }, [
    searchRef,
    searchPayee,
    fundFilter,
    categoryFilter,
    typeFilter,
    chequeStatusFilter,
    startDate,
    endDate
  ]);

  const totalPages = Math.ceil(filteredDisbursements.length / ITEMS_PER_PAGE) || 1;
  const paginatedDisbursements = filteredDisbursements.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const formatCurrency = (val: number) =>
    `₱${val.toLocaleString('en-US', { minimumFractionDigits: 2 })}`;

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

  const getChequeStatusBadge = (row: any) => {
    if (row.paymentMethod !== 'Cheque' && !row.chequeNumber) {
      return <span className="text-[10px] text-[#04152d]/40 font-medium">Non-Cheque</span>;
    }

    const status: ChequeStatus = row.chequeStatus || 'Issued';
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


        {/* Task 13: Auditor Filter Bar */}
        <div className={`${ultraGlassCard} !p-5 space-y-4`}>
          <div className="flex items-center justify-between pb-2 border-b border-white/60">
            <div className="flex items-center gap-2 text-[11px] font-bold text-[#04152d]/70 uppercase tracking-wider">
              <Filter size={13} className="text-blue-600" />
              <span>Audit Filters</span>
            </div>
            <button
              onClick={handleResetFilters}
              className="text-[11px] font-semibold text-blue-700 hover:text-blue-900 flex items-center gap-1 transition-colors"
            >
              <RotateCcw size={12} /> Reset Filters
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
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

            <div className="relative">
              <select
                value={fundFilter}
                onChange={(e) => setFundFilter(e.target.value)}
                className={`${glassInput} appearance-none pr-8 w-full cursor-pointer`}
              >
                <option value="All">All Funds</option>
                {CONFIGURED_FUNDS.map((f) => (
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
            <div className="relative">
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className={`${glassInput} appearance-none pr-8 w-full cursor-pointer`}
              >
                <option value="All">All Types</option>
                <option value="Loan Release">Loan Release</option>
                <option value="Expense">Expense</option>
                <option value="Other Authorized Release">Other Authorized Release</option>
              </select>
              <ChevronDown
                size={14}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#04152d]/50 pointer-events-none"
              />
            </div>

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

        {/* Read-Only Audit Table */}
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
                  <th className="py-4 px-6 border-b border-white/50 text-center">Audit Status</th>
                  <th className="py-4 px-6 border-b border-white/50 text-right">Audit Trail</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/60 text-[13px] text-[#04152d] bg-white/30">
                {paginatedDisbursements.length > 0 ? (
                  paginatedDisbursements.map((row) => (
                    <tr key={row.id} className="hover:bg-white/70 transition-all duration-200">
                      <td className="py-4 px-6">
                        <p className="font-mono text-[12px] font-semibold text-blue-700 tracking-tight">
                          {row.ref}
                        </p>
                        <p className="text-[11px] text-[#04152d]/50 flex items-center gap-1 mt-0.5">
                          <Calendar size={11} /> {row.date}
                        </p>
                      </td>

                      <td className="py-4 px-6 max-w-xs">
                        <p className="font-bold text-[#04152d] tracking-tight">{row.payee}</p>
                        <p className="text-[11px] text-[#04152d]/60 truncate mt-0.5">{row.purpose}</p>
                        {row.loanRef && (
                          <span className="inline-block mt-1 font-mono text-[10px] bg-blue-50 text-blue-800 px-1.5 py-0.5 rounded border border-blue-200">
                            Loan: {row.loanRef}
                          </span>
                        )}
                      </td>

                      <td className="py-4 px-6">
                        <div className="space-y-1">
                          {getTypeBadge(row.type)}
                          <p className="text-[11px] text-[#04152d]/60 font-medium pl-0.5">
                            {row.category}
                          </p>
                        </div>
                      </td>

                      <td className="py-4 px-6">
                        <div className="flex items-center gap-1.5 font-semibold text-[#04152d]">
                          <Wallet size={13} className="text-blue-600" />
                          <span>{row.fundSource}</span>
                        </div>
                      </td>

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

                      <td className="py-4 px-6 text-right">
                        <p className="font-bold text-[14px] text-[#04152d]">
                          {formatCurrency(row.amount)}
                        </p>
                      </td>

                      <td className="py-4 px-6 text-center">
                        <span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-md text-[10px] font-bold uppercase tracking-widest shadow-sm flex items-center gap-1 mx-auto w-fit">
                          <CheckCircle2 size={11} /> Verified
                        </span>
                      </td>

                      {/* Read-Only Action: Inspect Audit Trail & Voucher PDF */}
                      <td className="py-4 px-6 text-right">
                        <div className="flex items-center justify-end gap-1.5 ml-auto">
                          <button
                            onClick={() => {
                              setSelectedVoucherForModal(row);
                              setIsVoucherModalOpen(true);
                            }}
                            className="px-3.5 py-1.5 bg-blue-50/80 border border-blue-200 shadow-sm hover:shadow hover:bg-blue-100 rounded-full text-[11px] font-bold text-blue-800 uppercase tracking-wider transition-all duration-200 active:scale-95 flex items-center gap-1.5"
                          >
                            <FileText size={12} className="text-blue-700" />
                            <span>Voucher PDF</span>
                          </button>

                          <button
                            onClick={() => {
                              setSelectedDisbursement(row);
                              setIsModalOpen(true);
                            }}
                            className="p-1.5 bg-white border border-gray-200 hover:bg-gray-100 rounded-full text-gray-600 hover:text-gray-900 transition-all shadow-sm"
                            title="Inspect Audit Log"
                          >
                            <Eye size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-[#04152d]/50">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <FileText size={32} className="opacity-40" />
                        <p className="font-semibold text-[14px]">No audit records match your filters</p>
                        <button
                          onClick={handleResetFilters}
                          className="mt-2 px-3 py-1.5 bg-white/70 hover:bg-white text-[11px] font-semibold text-blue-700 rounded-full border border-white"
                        >
                          Clear All Filters
                        </button>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="p-4 border-t border-white/60 flex items-center justify-between">
              <span className="text-[12px] text-[#04152d]/60 font-medium">
                Showing page {currentPage} of {totalPages} ({filteredDisbursements.length} total records)
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

      {/* Official Voucher View & Direct PDF Download Modal */}
      <DisbursementVoucherModal
        isOpen={isVoucherModalOpen}
        onClose={() => {
          setIsVoucherModalOpen(false);
          setSelectedVoucherForModal(null);
        }}
        disbursement={selectedVoucherForModal}
      />

      {/* Audit Detail Modal (Read-Only) */}
      <DisbursementAuditModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedDisbursement(null);
        }}
        disbursement={selectedDisbursement}
        showToast={showToast}
      />
    </div>
  );
}