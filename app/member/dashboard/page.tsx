"use client";

import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { 
  Wallet, Receipt, ArrowUpRight, Plus, CheckCircle2, 
  AlertCircle, Clock, FileText, XCircle, Info, RefreshCw,
  ExternalLink, Calendar, CreditCard, ShieldCheck, ChevronRight
} from 'lucide-react';
import Header from '@/components/Header';

interface Obligation {
  id: string;
  obligationType: string;
  originalAmount: number;
  outstandingBalance: number;
  dueDate: string | null;
  status: string;
  loanStatus?: string;
  approvedAmount?: number;
  disbursedAmount?: number;
  remainingLoanAmount?: number;
  beneficiaryName?: string;
}

interface CollectionItem {
  id: string;
  collectionRefNo: string | null;
  paymentAmount: number;
  paymentDate: string;
  paymentMethod: string;
  paymentReference: string;
  description: string | null;
  status: 'PENDING' | 'FOR_VERIFICATION' | 'VALIDATED' | 'POSTED' | 'REJECTED';
  rejectReason?: string | null;
  proofOfPaymentName?: string | null;
  proofOfPaymentPath?: string | null;
  createdAt: string;
  application?: {
    obligationId?: string;
    obligation?: { obligationType: string };
    appliedAmount: number;
    remainingBalance: number;
    exceptionStatus: string;
  } | null;
  auditTrail?: {
    id: string;
    action: string;
    actor: string;
    role: string;
    timestamp: string;
    details: string;
  }[];
}

const LOAN_TYPES = [
  { type: 'Emergency Loan', maxAmount: 10000, fundSource: 'Emergency Fund' },
  { type: 'Educational Loan', maxAmount: 20000, fundSource: 'Educational Fund' },
  { type: 'Calamity Loan', maxAmount: 25000, fundSource: 'Calamity Fund' },
];

export default function MemberDashboardPage() {
  const { data: session } = useSession();
  const memberId = (session?.user as any)?.id || 'usr-member-1';
  const memberName = session?.user?.name || 'Juan Dela Cruz';

  const [obligations, setObligations] = useState<Obligation[]>([]);
  const [collections, setCollections] = useState<CollectionItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Loan Request Modal State
  const [isLoanModalOpen, setIsLoanModalOpen] = useState(false);
  const [loanType, setLoanType] = useState('Emergency Loan');
  const [loanAmount, setLoanAmount] = useState('');
  const [bankName, setBankName] = useState('BDO');
  const [accountNumber, setAccountNumber] = useState('');
  const [loanNote, setLoanNote] = useState('');
  const [isSubmittingLoan, setIsSubmittingLoan] = useState(false);

  // View Audit Trail / Details Modal State
  const [selectedCollection, setSelectedCollection] = useState<CollectionItem | null>(null);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);

  // Notification Toast
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4500);
  };

  const fetchData = async () => {
    try {
      // 1. Fetch Member's Obligations
      const obRes = await fetch(`http://localhost:3001/obligations?memberId=${memberId}`);
      if (obRes.ok) {
        const obData = await obRes.json();
        setObligations(obData);
      }

      // 2. Fetch Member's Collections
      const colRes = await fetch(`http://localhost:3001/collections?memberId=${memberId}`);
      if (colRes.ok) {
        const colData = await colRes.json();
        setCollections(colData);
      }
    } catch {
      // Offline fallback: Use initial mock state if server unreachable
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [memberId]);

  const handleManualRefresh = () => {
    setIsRefreshing(true);
    fetchData();
  };

  const handleLoanSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loanAmount || Number(loanAmount) <= 0) return;

    setIsSubmittingLoan(true);
    const selectedMeta = LOAN_TYPES.find(l => l.type === loanType) || LOAN_TYPES[0];

    try {
      const res = await fetch('http://localhost:3001/obligations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          memberId,
          obligationType: loanType,
          originalAmount: Number(loanAmount),
          dueDate: new Date(Date.now() + 90 * 86400000).toISOString().split('T')[0],
          loanStatus: 'Approved',
          approvedAmount: Number(loanAmount),
          beneficiaryName: memberName,
          beneficiaryBank: bankName,
          beneficiaryAccount: accountNumber || '00123456789',
          fundSource: selectedMeta.fundSource,
        }),
      });

      if (res.ok) {
        showToast(`Your ${loanType} application for ₱${Number(loanAmount).toLocaleString()} was submitted and approved!`, 'success');
        setIsLoanModalOpen(false);
        setLoanAmount('');
        setAccountNumber('');
        setLoanNote('');
        fetchData();
      } else {
        const err = await res.json();
        showToast(err.message || 'Failed to submit loan request', 'error');
      }
    } catch {
      showToast('Network error connecting to backend.', 'error');
    } finally {
      setIsSubmittingLoan(false);
    }
  };

  // KPI Calculations
  const totalOutstanding = obligations.reduce((sum, o) => sum + Number(o.outstandingBalance || 0), 0);
  const activeObligationsCount = obligations.filter(o => Number(o.outstandingBalance) > 0).length;
  const pendingSubmissionsCount = collections.filter(c => c.status === 'PENDING' || c.status === 'FOR_VERIFICATION' || c.status === 'VALIDATED').length;
  const totalPaid = collections
    .filter(c => c.status === 'POSTED')
    .reduce((sum, c) => sum + Number(c.paymentAmount || 0), 0);

  const formatCurrency = (val: number) => `₱${Number(val || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'POSTED':
        return <span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-md text-[10px] font-semibold uppercase tracking-widest shadow-sm">Posted</span>;
      case 'FOR_VERIFICATION':
        return <span className="px-2.5 py-1 bg-blue-50 text-blue-700 border border-blue-200 rounded-md text-[10px] font-semibold uppercase tracking-widest shadow-sm">For Verification</span>;
      case 'VALIDATED':
        return <span className="px-2.5 py-1 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-md text-[10px] font-semibold uppercase tracking-widest shadow-sm">Validated</span>;
      case 'REJECTED':
        return <span className="px-2.5 py-1 bg-red-50 text-red-700 border border-red-200 rounded-md text-[10px] font-semibold uppercase tracking-widest shadow-sm">Rejected</span>;
      default:
        return <span className="px-2.5 py-1 bg-yellow-50 text-yellow-700 border border-yellow-200 rounded-md text-[10px] font-semibold uppercase tracking-widest shadow-sm">Pending</span>;
    }
  };

  const ultraGlassCard = "bg-white/60 backdrop-blur-[40px] backdrop-saturate-[200%] border border-white/80 shadow-[0_8px_30px_rgba(4,21,45,0.06),inset_0_2px_3px_rgba(255,255,255,0.9)] rounded-[24px] p-6 relative overflow-hidden transition-all duration-300";
  const glassInput = "w-full pl-4 pr-4 py-3 bg-white/70 hover:bg-white/90 focus:bg-white backdrop-blur-xl border border-white/90 shadow-[inset_0_2px_4px_rgba(4,21,45,0.03)] rounded-[14px] text-[13px] font-semibold text-[#04152d] outline-none transition-all duration-300 placeholder:text-[#04152d]/40 focus:shadow-[0_4px_16px_rgba(4,21,45,0.08),inset_0_1px_2px_rgba(255,255,255,1)]";
  const inputLabel = "block text-[11px] font-semibold text-[#04152d]/70 uppercase tracking-widest mb-1.5 pl-1";

  return (
    <div className="relative flex flex-col min-h-screen bg-[#f4f5f7]">
      <div className="sticky top-0 z-40 w-full backdrop-blur-2xl bg-white/30 border-b border-white/50 shadow-[0_4px_30px_rgba(0,0,0,0.03)]">
        <Header />
      </div>

      <div className="p-4 md:p-6 max-w-[1400px] w-full mx-auto animate-fade-in flex-1 relative z-10 space-y-6 mt-2">
        
        {/* Welcome & Action Bar */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-[22px] font-black text-[#04152d] tracking-tight">
                Hello, {memberName}
              </h2>
              <span className="px-2.5 py-0.5 bg-blue-100/70 border border-blue-200 text-blue-700 text-[10px] font-black uppercase tracking-widest rounded-full">
                Member Portal
              </span>
            </div>
            <p className="text-[12.5px] font-medium text-[#04152d]/60 mt-0.5">
              Member ID: <span className="font-bold text-[#04152d]">{memberId}</span> — Real-time account summary and financial activities.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleManualRefresh}
              disabled={isRefreshing}
              className="p-2.5 bg-white/70 hover:bg-white text-[#04152d] border border-white/80 rounded-full shadow-sm hover:shadow transition-all active:scale-95 disabled:opacity-50"
              title="Refresh Data"
            >
              <RefreshCw size={15} className={isRefreshing ? "animate-spin text-blue-600" : "text-[#04152d]/60"} />
            </button>

            <button
              onClick={() => setIsLoanModalOpen(true)}
              className="px-4 py-2.5 bg-white/80 hover:bg-white text-blue-600 border border-blue-200/80 shadow-[0_2px_8px_rgba(37,99,235,0.08)] hover:shadow-md rounded-full text-[12px] font-bold tracking-wide transition-all active:scale-95 flex items-center gap-1.5"
            >
              <Plus size={15} /> Apply for Loan
            </button>

            <Link
              href="/member/collections"
              className="px-5 py-2.5 bg-[#04152d] hover:bg-[#04152d]/90 text-white shadow-[0_6px_20px_rgba(4,21,45,0.25)] hover:shadow-lg rounded-full text-[12px] font-bold tracking-wide transition-all active:scale-95 flex items-center gap-1.5 border border-white/10"
            >
              <Receipt size={15} /> Submit Payment
            </Link>
          </div>
        </div>

        {/* Top 4 KPI Metrics */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          <div className={ultraGlassCard}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold text-[#04152d]/50 uppercase tracking-widest">Total Outstanding</span>
              <div className="w-8 h-8 rounded-full bg-red-50 border border-red-100 flex items-center justify-center text-red-500">
                <Wallet size={16} />
              </div>
            </div>
            <p className="text-[24px] font-black text-[#04152d] tracking-tight">{formatCurrency(totalOutstanding)}</p>
            <p className="text-[11px] font-medium text-[#04152d]/50 mt-1">Across {activeObligationsCount} active obligation(s)</p>
          </div>

          <div className={ultraGlassCard}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold text-[#04152d]/50 uppercase tracking-widest">Active Obligations</span>
              <div className="w-8 h-8 rounded-full bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-500">
                <FileText size={16} />
              </div>
            </div>
            <p className="text-[24px] font-black text-[#04152d] tracking-tight">{activeObligationsCount}</p>
            <p className="text-[11px] font-medium text-[#04152d]/50 mt-1">Dues & loan balances</p>
          </div>

          <div className={ultraGlassCard}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold text-[#04152d]/50 uppercase tracking-widest">In Verification</span>
              <div className="w-8 h-8 rounded-full bg-yellow-50 border border-yellow-100 flex items-center justify-center text-yellow-600">
                <Clock size={16} />
              </div>
            </div>
            <p className="text-[24px] font-black text-amber-600 tracking-tight">{pendingSubmissionsCount}</p>
            <p className="text-[11px] font-medium text-[#04152d]/50 mt-1">Pending Treasurer Review</p>
          </div>

          <div className={ultraGlassCard}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold text-[#04152d]/50 uppercase tracking-widest">Total Paid To Date</span>
              <div className="w-8 h-8 rounded-full bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600">
                <CheckCircle2 size={16} />
              </div>
            </div>
            <p className="text-[24px] font-black text-emerald-700 tracking-tight">{formatCurrency(totalPaid)}</p>
            <p className="text-[11px] font-medium text-[#04152d]/50 mt-1">Confirmed & Posted payments</p>
          </div>
        </div>

        {/* Section 1: Active Financial Obligations & Loans */}
        <div className={ultraGlassCard}>
          <div className="flex items-center justify-between border-b border-white/60 pb-3 mb-4">
            <h3 className="text-[14px] font-black text-[#04152d] uppercase tracking-widest flex items-center gap-2">
              <Wallet size={16} className="text-blue-600" /> My Financial Obligations & Loans
            </h3>
            <span className="text-[11px] font-bold text-[#04152d]/50 uppercase tracking-wider">
              {obligations.length} Record(s) Found
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left whitespace-nowrap border-collapse min-w-[700px]">
              <thead>
                <tr className="border-b border-white/60 text-[10px] font-bold text-[#04152d]/50 uppercase tracking-widest">
                  <th className="py-3 px-4">Obligation Type</th>
                  <th className="py-3 px-4">Original Amount</th>
                  <th className="py-3 px-4">Outstanding Balance</th>
                  <th className="py-3 px-4">Due Date</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/60 text-[13px] text-[#04152d]">
                {obligations.length > 0 ? (
                  obligations.map((ob) => {
                    const isFullyPaid = Number(ob.outstandingBalance) === 0;
                    return (
                      <tr key={ob.id} className="hover:bg-white/50 transition-colors">
                        <td className="py-3.5 px-4 font-bold text-[#04152d]">
                          {ob.obligationType}
                          {ob.loanStatus && (
                            <span className="ml-2 text-[10px] font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded border border-blue-100">
                              Loan: {ob.loanStatus}
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 font-mono font-medium">{formatCurrency(Number(ob.originalAmount))}</td>
                        <td className="py-3.5 px-4 font-mono font-bold">
                          <span className={isFullyPaid ? "text-emerald-600" : "text-red-600"}>
                            {formatCurrency(Number(ob.outstandingBalance))}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-[12px] text-[#04152d]/70">
                          {ob.dueDate ? new Date(ob.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'No Due Date'}
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          {isFullyPaid ? (
                            <span className="px-2.5 py-0.5 bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-full text-[10px] font-black uppercase tracking-widest">
                              Fully Paid
                            </span>
                          ) : (
                            <span className="px-2.5 py-0.5 bg-amber-100 text-amber-800 border border-amber-200 rounded-full text-[10px] font-black uppercase tracking-widest">
                              Unpaid / Balance
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          {!isFullyPaid ? (
                            <Link
                              href={`/member/collections?obligationId=${ob.id}&amount=${ob.outstandingBalance}`}
                              className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-full text-[11px] font-bold uppercase tracking-wider transition-all shadow-sm hover:shadow active:scale-95 inline-flex items-center gap-1"
                            >
                              Pay Now <ArrowUpRight size={12} />
                            </Link>
                          ) : (
                            <span className="text-[11px] font-semibold text-emerald-600 inline-flex items-center gap-1">
                              <CheckCircle2 size={13} /> Cleared
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-[#04152d]/40 text-[12px] uppercase font-bold tracking-widest">
                      No financial obligations found for this account.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Section 2: Recent Payment Submissions & Workflow Status */}
        <div className={ultraGlassCard}>
          <div className="flex items-center justify-between border-b border-white/60 pb-3 mb-4">
            <div>
              <h3 className="text-[14px] font-black text-[#04152d] uppercase tracking-widest flex items-center gap-2">
                <Receipt size={16} className="text-blue-600" /> My Payment Submissions & Status
              </h3>
              <p className="text-[11px] font-medium text-[#04152d]/50 mt-0.5">
                Track payments submitted to Treasurer and their real-time validation / posting status.
              </p>
            </div>
            <Link
              href="/member/collections"
              className="text-[11px] font-bold text-blue-600 hover:underline uppercase tracking-wider flex items-center gap-1"
            >
              New Submission <ChevronRight size={13} />
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left whitespace-nowrap border-collapse min-w-[800px]">
              <thead>
                <tr className="border-b border-white/60 text-[10px] font-bold text-[#04152d]/50 uppercase tracking-widest">
                  <th className="py-3 px-4">Tracking Ref</th>
                  <th className="py-3 px-4">Date & Method</th>
                  <th className="py-3 px-4">Payment Reference</th>
                  <th className="py-3 px-4 text-right">Amount</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-center">Applied Target</th>
                  <th className="py-3 px-4 text-right">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/60 text-[13px] text-[#04152d]">
                {collections.length > 0 ? (
                  collections.map((col) => (
                    <tr key={col.id} className="hover:bg-white/50 transition-colors">
                      <td className="py-3.5 px-4 font-mono text-[12px] font-bold text-blue-600">
                        {col.collectionRefNo || 'PENDING-ASSIGN'}
                      </td>
                      <td className="py-3.5 px-4">
                        <p className="font-semibold text-[#04152d]">{new Date(col.paymentDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</p>
                        <p className="text-[11px] text-[#04152d]/60 font-medium">{col.paymentMethod}</p>
                      </td>
                      <td className="py-3.5 px-4 font-mono text-[12px] text-[#04152d]">
                        {col.paymentReference}
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono font-bold text-[14px]">
                        {formatCurrency(Number(col.paymentAmount))}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        {getStatusBadge(col.status)}
                      </td>
                      <td className="py-3.5 px-4 text-center text-[12px]">
                        {col.application?.obligation?.obligationType ? (
                          <span className="font-semibold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                            {col.application.obligation.obligationType} ({col.application.exceptionStatus})
                          </span>
                        ) : col.status === 'POSTED' ? (
                          <span className="text-[#04152d]/60 italic font-medium">Unapplied Deposit</span>
                        ) : (
                          <span className="text-[#04152d]/40 italic">Pending Mapping</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <button
                          onClick={() => {
                            setSelectedCollection(col);
                            setIsDetailsModalOpen(true);
                          }}
                          className="px-3 py-1 bg-white hover:bg-white/80 border border-white/80 rounded-full text-[11px] font-bold text-blue-600 shadow-sm transition-all active:scale-95"
                        >
                          View Log
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-[#04152d]/40 text-[12px] uppercase font-bold tracking-widest">
                      No payment submissions recorded yet. Use the Submit Payment button to submit a collection.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>

      {/* Loan Application Modal */}
      {isLoanModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-[#04152d]/40 backdrop-blur-md" onClick={() => setIsLoanModalOpen(false)} />
          <div className={`relative w-full max-w-lg animate-modal-enter ${ultraGlassCard} !p-6 sm:!p-8 z-10`}>
            <div className="flex items-center justify-between border-b border-white/60 pb-3 mb-5">
              <h3 className="text-[16px] font-black text-[#04152d] uppercase tracking-wide flex items-center gap-2">
                <CreditCard size={18} className="text-blue-600" /> Apply for Loan / Assistance
              </h3>
              <button onClick={() => setIsLoanModalOpen(false)} className="p-1.5 hover:bg-white rounded-full text-[#04152d]/60">
                ✕
              </button>
            </div>

            <form onSubmit={handleLoanSubmit} className="space-y-4">
              <div>
                <label className={inputLabel}>Select Assistance / Loan Type</label>
                <select
                  value={loanType}
                  onChange={(e) => setLoanType(e.target.value)}
                  className={glassInput}
                >
                  {LOAN_TYPES.map(l => (
                    <option key={l.type} value={l.type}>
                      {l.type} (Max ₱{l.maxAmount.toLocaleString()} — {l.fundSource})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className={inputLabel}>Requested Loan Amount (₱)</label>
                <input
                  type="number"
                  min="500"
                  step="100"
                  required
                  placeholder="e.g. 5000.00"
                  value={loanAmount}
                  onChange={(e) => setLoanAmount(e.target.value)}
                  className={glassInput}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={inputLabel}>Disbursement Bank</label>
                  <select
                    value={bankName}
                    onChange={(e) => setBankName(e.target.value)}
                    className={glassInput}
                  >
                    <option value="BDO">BDO Unibank</option>
                    <option value="BPI">BPI</option>
                    <option value="GCash">GCash</option>
                    <option value="Maya">Maya</option>
                    <option value="Landbank">Landbank</option>
                  </select>
                </div>
                <div>
                  <label className={inputLabel}>Account Number</label>
                  <input
                    type="text"
                    required
                    placeholder="00123456789"
                    value={accountNumber}
                    onChange={(e) => setAccountNumber(e.target.value)}
                    className={glassInput}
                  />
                </div>
              </div>

              <div>
                <label className={inputLabel}>Purpose / Note (Optional)</label>
                <textarea
                  rows={2}
                  placeholder="Briefly describe the purpose for this loan..."
                  value={loanNote}
                  onChange={(e) => setLoanNote(e.target.value)}
                  className={glassInput}
                />
              </div>

              <div className="pt-3 flex gap-3 justify-end border-t border-white/60">
                <button
                  type="button"
                  onClick={() => setIsLoanModalOpen(false)}
                  className="px-4 py-2 bg-white/70 hover:bg-white text-[#04152d]/70 rounded-full text-[12px] font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingLoan || !loanAmount}
                  className="px-5 py-2 bg-[#04152d] hover:bg-[#04152d]/90 text-white rounded-full text-[12px] font-bold shadow-md active:scale-95 disabled:opacity-50"
                >
                  {isSubmittingLoan ? 'Submitting...' : 'Submit Application'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Collection Details & Audit Trail Modal */}
      {isDetailsModalOpen && selectedCollection && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-[#04152d]/40 backdrop-blur-md" onClick={() => setIsDetailsModalOpen(false)} />
          <div className={`relative w-full max-w-lg animate-modal-enter ${ultraGlassCard} !p-6 z-10 max-h-[90vh] overflow-y-auto`}>
            <div className="flex items-center justify-between border-b border-white/60 pb-3 mb-4">
              <div>
                <h3 className="text-[15px] font-black text-[#04152d] tracking-tight">
                  Submission Details: {selectedCollection.collectionRefNo || 'Pending'}
                </h3>
                <span className="text-[11px] font-bold text-[#04152d]/60">
                  Ref: {selectedCollection.paymentReference}
                </span>
              </div>
              <button onClick={() => setIsDetailsModalOpen(false)} className="p-1.5 hover:bg-white rounded-full text-[#04152d]/60">
                ✕
              </button>
            </div>

            <div className="space-y-4 text-[13px]">
              <div className="grid grid-cols-2 gap-3 bg-white/50 p-3.5 rounded-[14px] border border-white">
                <div>
                  <span className="text-[10px] font-bold text-[#04152d]/50 uppercase tracking-widest block">Amount</span>
                  <span className="text-[16px] font-black text-blue-600">{formatCurrency(Number(selectedCollection.paymentAmount))}</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-[#04152d]/50 uppercase tracking-widest block">Current Status</span>
                  <span className="mt-1 inline-block">{getStatusBadge(selectedCollection.status)}</span>
                </div>
              </div>

              {selectedCollection.rejectReason && (
                <div className="bg-red-50 p-3.5 rounded-[14px] border border-red-200">
                  <p className="text-[11px] font-bold text-red-800 uppercase tracking-widest mb-1 flex items-center gap-1">
                    <AlertCircle size={13} /> Rejection Reason from Treasurer
                  </p>
                  <p className="text-[12.5px] font-medium text-red-700">{selectedCollection.rejectReason}</p>
                </div>
              )}

              {selectedCollection.proofOfPaymentName && (
                <div className="bg-blue-50/50 p-3 rounded-[12px] border border-blue-100 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FileText size={16} className="text-blue-600" />
                    <span className="text-[12px] font-bold text-[#04152d] truncate max-w-[200px]">{selectedCollection.proofOfPaymentName}</span>
                  </div>
                  {selectedCollection.proofOfPaymentPath && (
                    <a
                      href={`http://localhost:3001/${selectedCollection.proofOfPaymentPath}`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-[11px] font-bold text-blue-600 hover:underline flex items-center gap-1"
                    >
                      View <ExternalLink size={12} />
                    </a>
                  )}
                </div>
              )}

              {/* Audit Timeline */}
              <div>
                <h4 className="text-[11px] font-bold text-[#04152d]/60 uppercase tracking-widest mb-2 border-b border-white/60 pb-1 flex items-center gap-1">
                  <ShieldCheck size={13} /> Lifecycle Audit Trail
                </h4>
                <div className="space-y-2 mt-2">
                  {selectedCollection.auditTrail && selectedCollection.auditTrail.length > 0 ? (
                    selectedCollection.auditTrail.map((log) => (
                      <div key={log.id} className="p-2.5 bg-white/60 rounded-[12px] border border-white text-[12px]">
                        <div className="flex justify-between items-center mb-1">
                          <span className="font-bold text-[#04152d]">{log.action}</span>
                          <span className="text-[10px] text-[#04152d]/50 font-mono">
                            {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <p className="text-[11px] text-[#04152d]/70">{log.details}</p>
                        <p className="text-[9.5px] font-bold text-[#04152d]/40 uppercase tracking-wider mt-1">
                          By: {log.actor} ({log.role})
                        </p>
                      </div>
                    ))
                  ) : (
                    <p className="text-[11px] text-[#04152d]/40 italic">Audit log recorded by system.</p>
                  )}
                </div>
              </div>
            </div>

            <div className="mt-5 pt-3 border-t border-white/60 text-right">
              <button
                onClick={() => setIsDetailsModalOpen(false)}
                className="px-4 py-2 bg-white hover:bg-white/80 text-[#04152d] rounded-full text-[12px] font-bold shadow-sm"
              >
                Close View
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-[150] animate-slide-up bg-white/90 backdrop-blur-2xl border border-white shadow-[0_8px_30px_rgba(0,0,0,0.12)] p-4 rounded-[16px] flex items-center gap-3 min-w-[300px]">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 border ${
            toast.type === 'success' ? 'bg-emerald-100 border-emerald-200 text-emerald-600' :
            toast.type === 'error' ? 'bg-red-100 border-red-200 text-red-600' :
            'bg-blue-100 border-blue-200 text-blue-600'
          }`}>
            {toast.type === 'success' ? <CheckCircle2 size={16} /> :
             toast.type === 'error' ? <AlertCircle size={16} /> :
             <Info size={16} />}
          </div>
          <p className="text-[13px] font-bold text-[#04152d] leading-tight pr-4">
            {toast.message}
          </p>
        </div>
      )}
    </div>
  );
}
