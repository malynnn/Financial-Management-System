"use client";

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { 
  X, History, Activity, Calendar, ShieldCheck, 
  TrendingDown, TrendingUp, AlertTriangle, Filter, Search, Eye
} from 'lucide-react';
import { LifespanPredictionRecord } from '@/lib/lifespanData';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  predictions: LifespanPredictionRecord[];
  isAuditorView?: boolean;
  onSelectPrediction?: (prediction: LifespanPredictionRecord) => void;
}

export default function PredictionHistoryModal({
  isOpen,
  onClose,
  predictions,
  isAuditorView = false,
  onSelectPrediction
}: Props) {
  const [mounted, setMounted] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<LifespanPredictionRecord | null>(null);
  const [fundFilter, setFundFilter] = useState('All');
  const [search, setSearch] = useState('');

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!isOpen || !mounted) return null;

  const formatCurrency = (val: number) => 
    `₱${Number(val || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}`;

  const filtered = predictions.filter(p => {
    if (fundFilter !== 'All' && p.fundCode !== fundFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      return p.fundName.toLowerCase().includes(q) || p.fundCode.toLowerCase().includes(q) || p.id.toLowerCase().includes(q);
    }
    return true;
  });

  const getConditionStyle = (cond: string) => {
    switch (cond) {
      case 'Stable':
        return 'bg-emerald-100 text-emerald-800 border-emerald-300';
      case 'Declining':
        return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'At Risk':
        return 'bg-amber-100 text-amber-800 border-amber-300';
      case 'Projected to Deplete':
        return 'bg-rose-100 text-rose-800 border-rose-300';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-300';
    }
  };

  const modalContent = (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-6 overflow-hidden">
      {/* Full-screen backdrop */}
      <div 
        className="fixed inset-0 bg-[#04152d]/60 backdrop-blur-md animate-fade-in" 
        onClick={onClose} 
      />

      {/* Modal Dialog Card */}
      <div 
        className="relative w-full max-w-4xl max-h-[88vh] flex flex-col bg-white/95 backdrop-blur-3xl border border-white/90 shadow-[0_24px_60px_rgba(4,21,45,0.25),inset_0_2px_4px_rgba(255,255,255,0.9)] rounded-[28px] overflow-hidden p-5 sm:p-7 z-10 animate-modal-enter"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Fixed Header */}
        <div className="flex items-center justify-between border-b border-gray-100 pb-4 mb-3 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-50 border border-blue-200 text-blue-700 flex items-center justify-center shadow-xs shrink-0">
              <History size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-[17px] font-bold text-[#04152d] tracking-tight">
                  Historical Lifespan Predictions & Model Audit Trail
                </h3>
                {isAuditorView && (
                  <span className="px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase bg-indigo-50 text-indigo-700 border border-indigo-200 tracking-wider">
                    Auditor Review
                  </span>
                )}
              </div>
              <p className="text-[11px] text-[#04152d]/60 font-medium">
                Review previous simulation runs, input factors, timestamps, and model version provenance
              </p>
            </div>
          </div>

          <button 
            onClick={onClose} 
            className="w-8 h-8 rounded-full bg-white hover:bg-gray-100 text-[#04152d]/60 hover:text-[#04152d] flex items-center justify-center border border-gray-200 shadow-xs transition-colors cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        {/* Scrollable Content Body - inner only */}
        <div className="flex-1 overflow-y-auto pr-1 space-y-4 hide-scrollbar min-h-0 text-[12px]">
          {/* Search & Filter Bar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-gray-50/80 p-3 rounded-2xl border border-gray-200">
            <div className="relative w-full sm:w-64">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#04152d]/40" />
              <input
                type="text"
                placeholder="Search Reference, Fund..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-1.5 bg-white rounded-full text-[12px] font-semibold text-[#04152d] outline-none border border-gray-200 focus:border-blue-500 shadow-2xs"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <span className="text-[11px] text-[#04152d]/50 font-semibold uppercase">Fund Filter:</span>
              <select
                value={fundFilter}
                onChange={(e) => setFundFilter(e.target.value)}
                className="px-3 py-1.5 bg-white rounded-full text-[12px] font-semibold text-[#04152d] outline-none border border-gray-200 cursor-pointer shadow-2xs"
              >
                <option value="All">All Funds</option>
                <option value="UNF">UNF - Union Fund</option>
                <option value="GEN">GEN - General Fund</option>
                <option value="DAF">DAF - Death Assistance Fund</option>
                <option value="FAF">FAF - Foreign Assistance Fund</option>
                <option value="LNF">LNF - Loan Fund</option>
              </select>
            </div>
          </div>

          {/* Table */}
          <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left whitespace-nowrap">
                <thead className="bg-[#04152d]/5 text-[10px] font-bold text-[#04152d]/60 uppercase tracking-widest border-b border-gray-200">
                  <tr>
                    <th className="py-3 px-4">Ref & Date</th>
                    <th className="py-3 px-4">Fund</th>
                    <th className="py-3 px-4">Condition</th>
                    <th className="py-3 px-4">Projected Depletion</th>
                    <th className="py-3 px-4">Lifespan</th>
                    <th className="py-3 px-4 text-center">Confidence</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-[12px]">
                  {filtered.length > 0 ? (
                    filtered.map((record) => (
                      <tr key={record.id} className="hover:bg-blue-50/40 transition-colors">
                        <td className="py-3 px-4">
                          <p className="font-mono font-bold text-blue-700">{record.id}</p>
                          <p className="text-[10px] text-[#04152d]/50">{record.generatedAt}</p>
                        </td>

                        <td className="py-3 px-4 font-semibold text-[#04152d]">
                          <p>{record.fundName}</p>
                          <span className="font-mono text-[10px] text-[#04152d]/50">{record.fundCode}</span>
                        </td>

                        <td className="py-3 px-4">
                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border shadow-xs ${getConditionStyle(record.condition)}`}>
                            {record.condition}
                          </span>
                        </td>

                        <td className="py-3 px-4">
                          {record.projectedDepletionDate ? (
                            <span className="font-bold text-rose-700">{record.projectedDepletionDate}</span>
                          ) : (
                            <span className="text-[#04152d]/60 font-medium">None (Solvent)</span>
                          )}
                        </td>

                        <td className="py-3 px-4 font-bold text-[#04152d]">
                          {record.remainingLifespanDisplay}
                        </td>

                        <td className="py-3 px-4 text-center">
                          <span className="font-bold text-blue-700">{record.confidenceScore}%</span>
                          <span className="text-[10px] text-[#04152d]/50 block">({record.confidenceLevel})</span>
                        </td>

                        <td className="py-3 px-4 text-right">
                          <button
                            type="button"
                            onClick={() => setSelectedRecord(record)}
                            className="px-3 py-1 bg-white hover:bg-gray-100 border border-gray-200 text-[#04152d] rounded-full text-[11px] font-bold shadow-xs transition-all flex items-center gap-1 ml-auto cursor-pointer"
                          >
                            <Eye size={12} /> Inspect Run
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-[#04152d]/50 font-medium">
                        No prediction records found matching criteria.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Inspected Record Explainable Factors Pane */}
          {selectedRecord && (
            <div className="bg-white p-5 rounded-2xl border border-blue-200 shadow-xs space-y-3.5 animate-modal-enter">
              <div className="flex items-center justify-between border-b border-gray-100 pb-2">
                <div className="flex items-center gap-2">
                  <Activity size={16} className="text-blue-700" />
                  <h4 className="font-bold text-[#04152d] text-[13px]">
                    Actuarial Input Factors & Provenance for {selectedRecord.id}
                  </h4>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedRecord(null)}
                  className="text-[11px] text-blue-700 hover:underline font-semibold cursor-pointer"
                >
                  Collapse Details
                </button>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-[11px]">
                <div className="bg-gray-50 p-2.5 rounded-xl border border-gray-200">
                  <span className="text-[9px] uppercase font-bold text-[#04152d]/50 block">Baseline Balance</span>
                  <span className="text-[14px] font-bold text-blue-700">{formatCurrency(selectedRecord.factors.currentBalance)}</span>
                </div>

                <div className="bg-gray-50 p-2.5 rounded-xl border border-gray-200">
                  <span className="text-[9px] uppercase font-bold text-[#04152d]/50 block">Historical Inflows</span>
                  <span className="text-[14px] font-bold text-emerald-700">+{formatCurrency(selectedRecord.factors.totalHistoricalInflows)}</span>
                </div>

                <div className="bg-gray-50 p-2.5 rounded-xl border border-gray-200">
                  <span className="text-[9px] uppercase font-bold text-[#04152d]/50 block">Historical Outflows</span>
                  <span className="text-[14px] font-bold text-rose-700">-{formatCurrency(selectedRecord.factors.totalHistoricalOutflows)}</span>
                </div>

                <div className="bg-gray-50 p-2.5 rounded-xl border border-gray-200">
                  <span className="text-[9px] uppercase font-bold text-[#04152d]/50 block">Net Burn Rate</span>
                  <span className={`text-[14px] font-bold ${selectedRecord.factors.averageMonthlyBurnRate > 0 ? 'text-rose-700' : 'text-emerald-700'}`}>
                    {selectedRecord.factors.averageMonthlyBurnRate > 0 ? '-' : '+'}
                    {formatCurrency(Math.abs(selectedRecord.factors.averageMonthlyBurnRate))} / mo
                  </span>
                </div>
              </div>

              <div className="p-3 bg-blue-50/60 rounded-xl border border-blue-100 text-[11px] text-[#04152d]/80 space-y-1">
                <p>
                  <strong>Analysis Method:</strong> Actuarial Run-Rate Projection • Evaluated at {selectedRecord.generatedAt} by {selectedRecord.generatedBy}
                </p>
                <p>
                  <strong>Analysis Time Window:</strong> {selectedRecord.analysisPeriodStart} to {selectedRecord.analysisPeriodEnd} ({selectedRecord.factors.analysisPeriodMonths} active monthly periods)
                </p>
                {selectedRecord.notes && (
                  <p>
                    <strong>Officer Notes:</strong> {selectedRecord.notes}
                  </p>
                )}
              </div>

              {onSelectPrediction && (
                <div className="flex justify-end pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      onSelectPrediction(selectedRecord);
                      onClose();
                    }}
                    className="px-4 py-2 bg-[#04152d] text-white hover:bg-[#0a1e3f] rounded-full text-[11px] font-bold shadow-xs transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
                  >
                    Examine Forecast Chart on Dashboard <Eye size={13} />
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Fixed Footer */}
        <div className="shrink-0 border-t border-gray-100 pt-3 mt-2 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-2 rounded-full text-[12px] font-bold bg-[#04152d] text-white hover:bg-[#0a1e3f] shadow-sm transition-all active:scale-95 cursor-pointer"
          >
            Close Audit History
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
