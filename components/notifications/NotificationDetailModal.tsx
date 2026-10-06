'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { 
  X, CheckCircle2, ArrowDownLeft, ArrowUpRight, 
  Calendar, AlertTriangle, Info, Trash2, Check, 
  ExternalLink, Clock, ShieldCheck, Tag, UserCheck
} from 'lucide-react';
import { SystemNotification, NotificationPriority } from '@/lib/notifications';

interface Props {
  notification: SystemNotification | null;
  isOpen: boolean;
  onClose: () => void;
  onToggleRead: (id: string) => void;
  onDelete: (id: string) => void;
}

export default function NotificationDetailModal({
  notification,
  isOpen,
  onClose,
  onToggleRead,
  onDelete
}: Props) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted || !isOpen || !notification) return null;

  const getPriorityStyle = (priority: NotificationPriority) => {
    switch (priority) {
      case 'success':
        return {
          icon: <CheckCircle2 size={22} className="text-emerald-500" />,
          bg: 'bg-emerald-50 text-emerald-800 border-emerald-200',
          badge: 'Success',
          headerBg: 'from-emerald-50/70 via-white to-emerald-50/20'
        };
      case 'warning':
      case 'critical':
        return {
          icon: <AlertTriangle size={22} className="text-amber-500" />,
          bg: 'bg-amber-50 text-amber-800 border-amber-200',
          badge: 'Warning',
          headerBg: 'from-amber-50/70 via-white to-amber-50/20'
        };
      case 'info':
      default:
        return {
          icon: <Info size={22} className="text-blue-500" />,
          bg: 'bg-blue-50 text-blue-800 border-blue-200',
          badge: 'Informational',
          headerBg: 'from-blue-50/70 via-white to-blue-50/20'
        };
    }
  };

  const style = getPriorityStyle(notification.priority);
  const details = notification.details;

  const formatCurrency = (val?: number) => {
    if (val === undefined || val === null) return null;
    return `₱${Number(val).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const roleNameMap: Record<string, string> = {
    disbursing_officer: 'Disbursing Officer',
    collecting_officer: 'Collecting Officer',
    auditor: 'Auditor',
    admin: 'System Admin',
    all: 'All Officers'
  };

  const modalContent = (
    <div 
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6 bg-[#04152d]/65 backdrop-blur-sm animate-fade-in overflow-y-auto"
      onClick={onClose}
    >
      <div 
        className="relative w-full max-w-lg bg-white/95 backdrop-blur-3xl border border-white/90 shadow-[0_25px_60px_rgba(4,21,45,0.35)] rounded-[26px] overflow-hidden flex flex-col max-h-[88vh] my-auto animate-modal-enter transition-all"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className={`px-6 py-5 border-b border-gray-100 bg-gradient-to-r ${style.headerBg} flex items-start justify-between shrink-0`}>
          <div className="flex items-start gap-3.5 pr-2">
            <div className="w-10 h-10 rounded-2xl bg-white border border-gray-200/80 shadow-xs flex items-center justify-center shrink-0">
              {style.icon}
            </div>
            <div>
              <div className="flex items-center gap-1.5 flex-wrap mb-1">
                <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider border ${style.bg}`}>
                  {style.badge}
                </span>

                <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider border ${
                  notification.isRead ? 'bg-gray-100 text-gray-600 border-gray-200' : 'bg-blue-100 text-blue-800 border-blue-200'
                }`}>
                  {notification.isRead ? 'Read' : 'New'}
                </span>

                {notification.targetRoles && notification.targetRoles.length > 0 && !notification.targetRoles.includes('all') && (
                  <span className="px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider bg-purple-50 text-purple-800 border border-purple-200">
                    {roleNameMap[notification.targetRoles[0]] || 'Role Target'}
                  </span>
                )}
              </div>

              <h3 className="text-[16px] font-bold text-[#04152d] tracking-tight leading-snug">
                {notification.title}
              </h3>
              <p className="text-[10.5px] text-[#04152d]/50 font-mono mt-0.5 flex items-center gap-1">
                <Clock size={11} /> {notification.timestamp}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/80 hover:bg-white text-gray-500 hover:text-[#04152d] flex items-center justify-center transition-all border border-gray-200 shadow-2xs hover:scale-105 active:scale-95 cursor-pointer shrink-0"
          >
            <X size={15} />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="p-6 space-y-4 overflow-y-auto flex-1 text-[12px]">
          {/* Main Message Box */}
          <div className="p-3.5 bg-gray-50/90 rounded-2xl border border-gray-200/80 text-[#04152d]/80 leading-relaxed font-medium">
            {notification.message}
          </div>

          {/* Transaction & Audit Details (if available) */}
          {details && (
            <div className="space-y-3">
              <h4 className="text-[11px] font-bold uppercase tracking-wider text-[#04152d]/60 flex items-center gap-1.5">
                <ShieldCheck size={14} className="text-blue-600" />
                Audit & Transaction Details
              </h4>

              <div className="bg-white rounded-2xl border border-gray-200 p-4 space-y-2.5 shadow-2xs">
                {details.referenceNumber && (
                  <div className="flex items-center justify-between py-1 border-b border-gray-100">
                    <span className="text-[#04152d]/50 text-[11px]">Reference / Voucher #</span>
                    <span className="font-mono font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200">
                      {details.referenceNumber}
                    </span>
                  </div>
                )}

                {details.amount !== undefined && (
                  <div className="flex items-center justify-between py-1 border-b border-gray-100">
                    <span className="text-[#04152d]/50 text-[11px]">Amount</span>
                    <span className="font-mono font-extrabold text-[#04152d] text-[14px]">
                      {formatCurrency(details.amount)}
                    </span>
                  </div>
                )}

                {details.payeeOrPayer && (
                  <div className="flex items-center justify-between py-1 border-b border-gray-100">
                    <span className="text-[#04152d]/50 text-[11px]">Payee / Payer</span>
                    <span className="font-bold text-[#04152d]">
                      {details.payeeOrPayer}
                    </span>
                  </div>
                )}

                {details.fundCode && (
                  <div className="flex items-center justify-between py-1 border-b border-gray-100">
                    <span className="text-[#04152d]/50 text-[11px]">Master Fund Code</span>
                    <span className="font-mono font-semibold text-[#04152d]">
                      {details.fundCode}
                    </span>
                  </div>
                )}

                {details.category && (
                  <div className="flex items-center justify-between py-1 border-b border-gray-100">
                    <span className="text-[#04152d]/50 text-[11px]">Category</span>
                    <span className="font-semibold text-[#04152d]/80">
                      {details.category}
                    </span>
                  </div>
                )}

                {details.actionBy && (
                  <div className="flex items-center justify-between py-1 border-b border-gray-100">
                    <span className="text-[#04152d]/50 text-[11px]">Executed / Logged By</span>
                    <span className="font-medium text-[#04152d]/80">
                      {details.actionBy}
                    </span>
                  </div>
                )}

                {details.particulars && (
                  <div className="py-1">
                    <span className="text-[#04152d]/50 text-[11px] block mb-0.5">Particulars</span>
                    <p className="text-[11.5px] text-[#04152d]/80 font-medium bg-gray-50 p-2 rounded-xl border border-gray-100">
                      {details.particulars}
                    </p>
                  </div>
                )}

                {details.notes && (
                  <div className="py-1">
                    <span className="text-[#04152d]/50 text-[11px] block mb-0.5">Verification Notes</span>
                    <p className="text-[11px] text-emerald-800 bg-emerald-50/70 p-2 rounded-xl border border-emerald-200 font-medium">
                      {details.notes}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-gray-100 bg-gray-50/80 flex items-center justify-between shrink-0 gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                onToggleRead(notification.id);
              }}
              className="px-3 py-1.5 rounded-full text-[11px] font-bold bg-white text-[#04152d] border border-gray-200 hover:bg-gray-100 transition-all flex items-center gap-1 shadow-2xs cursor-pointer active:scale-95"
            >
              <Check size={12} />
              {notification.isRead ? 'Mark as Unread' : 'Mark as Read'}
            </button>

            <button
              onClick={() => {
                onDelete(notification.id);
                onClose();
              }}
              className="px-3 py-1.5 rounded-full text-[11px] font-bold text-rose-700 bg-white border border-rose-200 hover:bg-rose-50 transition-all flex items-center gap-1 shadow-2xs cursor-pointer active:scale-95"
            >
              <Trash2 size={12} />
              Delete
            </button>
          </div>

          <div className="flex items-center gap-2">
            {details?.actionUrl && (
              <Link
                href={details.actionUrl}
                onClick={onClose}
                className="px-4 py-1.5 bg-[#04152d] hover:bg-[#0a2347] text-white rounded-full text-[11px] font-bold shadow-xs transition-all flex items-center gap-1.5 active:scale-95 cursor-pointer"
              >
                <span>{details.actionLabel || 'View Record'}</span>
                <ExternalLink size={12} />
              </Link>
            )}

            <button
              onClick={onClose}
              className="px-4 py-1.5 bg-gray-200 hover:bg-gray-300 text-[#04152d] rounded-full text-[11px] font-bold transition-all active:scale-95 cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
