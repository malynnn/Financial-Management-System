"use client";

import React from 'react';
import { X, History } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  auditLogs: any[];
}

export default function AuditLogModal({ isOpen, onClose, auditLogs }: Props) {
  if (!isOpen) return null;

  const ultraGlassCard = "bg-white/80 backdrop-blur-[40px] backdrop-saturate-[200%] border border-white/90 shadow-[0_16px_40px_rgba(4,21,45,0.1),inset_0_2px_4px_rgba(255,255,255,1)] rounded-[24px] p-6 lg:p-8 relative overflow-hidden transition-all duration-400";

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 transition-opacity duration-300 opacity-100">
      <div className="absolute inset-0 bg-[#04152d]/40 backdrop-blur-md" onClick={onClose} />
      <div className={`relative w-full max-w-4xl max-h-[90vh] flex flex-col animate-modal-enter ${ultraGlassCard}`}>
        <div className="flex items-center justify-between border-b border-white/60 pb-4 mb-5 shrink-0">
          <h3 className="text-[18px] font-bold text-[#04152d] tracking-tight flex items-center gap-2">
            <History size={20} className="text-blue-600" /> System Audit Logs
          </h3>
          <button onClick={onClose} className="p-2 bg-white/50 hover:bg-white/80 rounded-full border border-white shadow-sm transition-colors outline-none">
            <X size={16} className="text-[#04152d]/60 hover:text-[#04152d]" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto hide-scrollbar rounded-[16px] border border-white/70 bg-white/30">
          <table className="w-full text-left">
            <thead className="bg-white/60 backdrop-blur-md shadow-[0_1px_0_rgba(255,255,255,0.9)] text-[10px] font-bold text-[#04152d]/60 uppercase tracking-[0.2em] sticky top-0 z-10">
              <tr>
                <th className="px-6 py-4 whitespace-nowrap border-b border-white/50">Timestamp (PHT)</th>
                <th className="px-6 py-4 border-b border-white/50">Action Sequence</th>
                <th className="px-6 py-4 whitespace-nowrap border-b border-white/50">Actor</th>
                <th className="px-6 py-4 text-right whitespace-nowrap border-b border-white/50">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/60 text-[12.5px] font-semibold text-[#04152d]">
              {auditLogs.length ? (
                auditLogs.map((log: any) => (
                  <tr key={log.id} className="hover:bg-white/60 transition-colors duration-300">
                    <td className="px-6 py-3.5 font-mono text-[11px] opacity-70 whitespace-nowrap">
                      {new Date(log.timestamp).toLocaleString('en-US', { timeZone: 'Asia/Manila', month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    </td>
                    <td className="px-6 py-3.5 tracking-tight whitespace-normal break-words min-w-[300px] leading-relaxed">
                      {log.action}
                    </td>
                    <td className="px-6 py-3.5 whitespace-nowrap">
                      <span className="bg-white/80 px-2.5 py-1 rounded-md border border-white shadow-sm">{log.actor}</span>
                    </td>
                    <td className="px-6 py-3.5 text-right whitespace-nowrap">
                      <span className={`inline-flex px-2.5 py-1 text-[9px] font-bold rounded-full uppercase tracking-widest border shadow-sm ${
                        log.status === 'success' ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-yellow-50 text-yellow-700 border-yellow-200'
                      }`}>
                        {log.status}
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} className="px-6 py-16 text-center text-[#04152d]/50 font-semibold text-[13px]">No system logs recorded.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}