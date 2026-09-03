"use client";

import React, { useState } from 'react';
import { 
  X, FileText, Download, Shield, Clock, ArrowRight, User
} from 'lucide-react';
import PaymentApplicationModal from './PaymentApplicationModal';

interface AuditLog {
  id: string;
  action: string;
  actor: string;
  role: string;
  timestamp: string;
  details: string;
}

interface CollectionAuditData {
  id: string;
  ref: string;
  memberId: string;
  memberName: string;
  amount: number;
  date: string;
  method: string;
  paymentRef: string;
  proofUrl: string;
  status: string;
  applicationData?: any;
  auditTrail: AuditLog[];
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  collection: CollectionAuditData | null;
  showToast: (message: string, type: 'success' | 'info' | 'error') => void;
}

export default function AuditHistoryModal({ isOpen, onClose, collection, showToast }: Props) {
  const [activeTab, setActiveTab] = useState<'details' | 'timeline'>('details');

  if (!isOpen || !collection) return null;

  const formatCurrency = (val: number) => `₱${val.toLocaleString('en-US', { minimumFractionDigits: 2 })}`;

  const handleExportLog = () => {
    // dynamically generate a text file containing the audit trail
    const logContent = `AUDIT LOG - ${collection.ref}\nGenerated on: ${new Date().toISOString()}\n\n` + 
      collection.auditTrail.map(log => 
        `[${new Date(log.timestamp).toLocaleString('en-US', { timeZone: 'Asia/Manila' })}] ${log.action}\nDetails: ${log.details}\nActor: ${log.actor} (${log.role})\n`
      ).join('\n----------------------------------------\n\n');

    const blob = new Blob([logContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Audit_Log_${collection.ref}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    showToast(`Audit log for ${collection.ref} successfully downloaded.`, 'success');
  };

  const ultraGlassCard = "bg-white/80 backdrop-blur-[40px] backdrop-saturate-[200%] border border-white/90 shadow-[0_16px_40px_rgba(4,21,45,0.1),inset_0_2px_4px_rgba(255,255,255,1)] rounded-[24px] p-6 lg:p-8 relative overflow-hidden transition-all duration-400";

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 transition-opacity duration-300 opacity-100">
      <div className="absolute inset-0 bg-[#04152d]/40 backdrop-blur-md" onClick={onClose} />
      
      <div className={`relative w-full max-w-3xl max-h-[90vh] flex flex-col animate-modal-enter ${ultraGlassCard}`}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-white/60 pb-4 mb-5 gap-4">
          <div>
            <h3 className="text-[18px] font-semibold text-[#04152d] tracking-tight flex items-center gap-2">
              <Shield className="text-blue-600" size={20} />
              Collection Audit View
            </h3>
            <div className="flex items-center gap-2 mt-1.5">
              <span className="px-2 py-0.5 bg-gray-100 border border-gray-200 rounded text-[10px] font-semibold text-gray-600 uppercase tracking-widest">
                Read-Only Access
              </span>
              <span className="text-[12px] font-medium text-[#04152d]/60">Ref: {collection.ref}</span>
            </div>
          </div>
          
          <div className="flex items-center gap-2 absolute top-6 right-6 sm:relative sm:top-0 sm:right-0">
            <button 
              onClick={handleExportLog} 
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-white border border-white/80 shadow-sm hover:shadow text-[11px] font-semibold text-[#04152d]/70 hover:text-[#04152d] rounded-md transition-all active:scale-95"
            >
              <Download size={14} /> Export Log
            </button>
            <button onClick={onClose} className="p-2 bg-white/50 hover:bg-white/80 rounded-full border border-white shadow-sm transition-colors">
              <X size={16} className="text-[#04152d]/60 hover:text-[#04152d]" />
            </button>
          </div>
        </div>

        <div className="flex items-center gap-4 border-b border-white/60 mb-5 px-1">
          <button 
            onClick={() => setActiveTab('details')}
            className={`pb-3 text-[13px] font-semibold transition-colors relative ${activeTab === 'details' ? 'text-blue-600' : 'text-[#04152d]/50 hover:text-[#04152d]/80'}`}
          >
            Transaction Details
            {activeTab === 'details' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 rounded-t-full" />}
          </button>
          <button 
            onClick={() => setActiveTab('timeline')}
            className={`pb-3 text-[13px] font-semibold transition-colors relative ${activeTab === 'timeline' ? 'text-blue-600' : 'text-[#04152d]/50 hover:text-[#04152d]/80'}`}
          >
            Audit Trail
            {activeTab === 'timeline' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 rounded-t-full" />}
          </button>
        </div>

        <div className="flex-1 overflow-y-auto pr-2 hide-scrollbar">
          
          {activeTab === 'details' && (
            <div className="space-y-6 animate-fade-in">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-white/50 p-4 rounded-[16px] border border-white">
                  <p className="text-[10px] font-semibold text-[#04152d]/50 uppercase tracking-widest mb-1">Member Information</p>
                  <p className="text-[14px] font-semibold text-[#04152d]">{collection.memberName}</p>
                  <p className="text-[12px] font-medium text-[#04152d]/70">{collection.memberId}</p>
                </div>
                <div className="bg-white/50 p-4 rounded-[16px] border border-white">
                  <p className="text-[10px] font-semibold text-[#04152d]/50 uppercase tracking-widest mb-1">Collection Amount</p>
                  <p className="text-[20px] font-semibold text-[#04152d] tracking-tight">{formatCurrency(collection.amount)}</p>
                </div>
              </div>

              <div className="bg-white/40 p-5 rounded-[16px] border border-white/80">
                <h4 className="text-[12px] font-semibold text-[#04152d]/60 uppercase tracking-widest mb-4 border-b border-white/60 pb-2">Submission Data</h4>
                <div className="grid grid-cols-2 gap-y-4 text-[13px]">
                  <div className="space-y-1">
                    <p className="font-medium text-[#04152d]/60">Payment Date:</p>
                    <p className="font-semibold text-[#04152d]">{collection.date}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="font-medium text-[#04152d]/60">Payment Method:</p>
                    <p className="font-semibold text-[#04152d]">{collection.method}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="font-medium text-[#04152d]/60">Reference Number:</p>
                    <p className="font-semibold text-[#04152d] font-mono bg-white/60 inline-block px-2 py-0.5 rounded border border-white">{collection.paymentRef || 'N/A'}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="font-medium text-[#04152d]/60">Proof of Payment:</p>
                    <a href={collection.proofUrl} target="_blank" rel="noreferrer" className="font-semibold text-blue-600 hover:underline flex items-center gap-1">
                      View Document <ArrowRight size={12} />
                    </a>
                  </div>
                </div>
              </div>

              <PaymentApplicationModal data={collection.applicationData} />
            </div>
          )}

          {activeTab === 'timeline' && (
            <div className="p-4 animate-fade-in">
              <div className="relative border-l-2 border-blue-100 ml-3 space-y-8">
                {collection.auditTrail.map((log) => (
                  <div key={log.id} className="relative pl-6">
                    <div className="absolute -left-[9px] top-1 w-4 h-4 rounded-full bg-white border-2 border-blue-400 flex items-center justify-center">
                      <div className="w-1.5 h-1.5 bg-blue-600 rounded-full" />
                    </div>
                    
                    <div className="bg-white/60 backdrop-blur-sm border border-white/80 shadow-sm p-4 rounded-[16px]">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                        <span className="text-[13px] font-semibold text-[#04152d]">{log.action}</span>
                        <div className="flex items-center gap-1 text-[11px] font-medium text-[#04152d]/50 font-mono">
                          <Clock size={12} />
                          {new Date(log.timestamp).toLocaleString('en-US', { timeZone: 'Asia/Manila', month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </div>
                      <p className="text-[12px] text-[#04152d]/70 mb-3 leading-relaxed">{log.details}</p>
                      
                      <div className="flex items-center gap-2 pt-3 border-t border-white/60 text-[11px]">
                        <User size={12} className="text-[#04152d]/40" />
                        <span className="font-medium text-[#04152d]/70">Performed by: <span className="font-semibold text-[#04152d]">{log.actor}</span></span>
                        <span className="px-1.5 py-0.5 bg-[#04152d]/5 rounded text-[#04152d]/60 uppercase tracking-widest text-[9px] ml-1 border border-white/80">{log.role}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}