'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { 
  Bell, CheckCircle2, ArrowDownLeft, ArrowUpRight, 
  AlertTriangle, Info, Check, ExternalLink, Calendar,
  ShieldCheck, ArrowRight, Layers
} from 'lucide-react';
import { SystemNotification, NotificationPriority } from '@/lib/notifications';

interface Props {
  notifications: SystemNotification[];
  isOpen: boolean;
  onClose: () => void;
  onSelectNotification: (notif: SystemNotification) => void;
  onMarkAllAsRead: () => void;
}

export default function NotificationPanel({
  notifications,
  isOpen,
  onClose,
  onSelectNotification,
  onMarkAllAsRead
}: Props) {
  const [filter, setFilter] = useState<'all' | 'unread' | 'financial' | 'alerts'>('all');

  const unreadCount = useMemo(() => notifications.filter(n => !n.isRead).length, [notifications]);

  const filteredNotifications = useMemo(() => {
    return notifications.filter(n => {
      if (filter === 'unread') return !n.isRead;
      if (filter === 'financial') return ['disbursement_released', 'collection_posted', 'remittance_batch'].includes(n.type);
      if (filter === 'alerts') return n.type === 'lifespan_alert' || n.priority === 'warning' || n.priority === 'critical';
      return true;
    });
  }, [notifications, filter]);

  if (!isOpen) return null;

  const getNotificationIcon = (notif: SystemNotification) => {
    switch (notif.type) {
      case 'disbursement_released':
        return (
          <div className="w-8 h-8 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 flex items-center justify-center shrink-0">
            <ArrowDownLeft size={16} />
          </div>
        );
      case 'collection_posted':
        return (
          <div className="w-8 h-8 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 flex items-center justify-center shrink-0">
            <ArrowUpRight size={16} />
          </div>
        );
      case 'remittance_batch':
        return (
          <div className="w-8 h-8 rounded-xl bg-blue-50 border border-blue-200 text-blue-700 flex items-center justify-center shrink-0">
            <Calendar size={15} />
          </div>
        );
      case 'lifespan_alert':
        return (
          <div className="w-8 h-8 rounded-xl bg-amber-50 border border-amber-200 text-amber-700 flex items-center justify-center shrink-0">
            <AlertTriangle size={15} />
          </div>
        );
      case 'transaction_success':
      default:
        return (
          <div className="w-8 h-8 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-700 flex items-center justify-center shrink-0">
            <CheckCircle2 size={15} />
          </div>
        );
    }
  };

  const formatCurrency = (val?: number) => {
    if (val === undefined || val === null) return null;
    return `₱${Number(val).toLocaleString('en-US', { minimumFractionDigits: 0 })}`;
  };

  return (
    <div 
      className="absolute right-0 top-full mt-2 w-[380px] sm:w-[420px] max-w-[95vw] bg-white/95 backdrop-blur-2xl border border-white/90 shadow-[0_15px_40px_rgba(4,21,45,0.18)] rounded-[24px] overflow-hidden z-[100] animate-in fade-in zoom-in-95 duration-200 flex flex-col max-h-[82vh]"
      onClick={(e) => e.stopPropagation()}
    >
      {/* Top Header */}
      <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-blue-50/50 via-white to-gray-50/50 shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-[#04152d] text-white flex items-center justify-center shadow-2xs">
            <Bell size={14} />
          </div>
          <h3 className="text-[14px] font-bold text-[#04152d] tracking-tight">
            Notifications
          </h3>
          {unreadCount > 0 && (
            <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-blue-600 text-white shadow-2xs leading-none">
              {unreadCount} new
            </span>
          )}
        </div>

        {unreadCount > 0 && (
          <button
            onClick={onMarkAllAsRead}
            className="text-[11px] font-bold text-blue-700 hover:text-blue-900 transition-colors flex items-center gap-1 cursor-pointer"
          >
            <Check size={12} /> Mark all read
          </button>
        )}
      </div>

      {/* Filter Tabs */}
      <div className="px-4 py-2 border-b border-gray-100 bg-gray-50/60 flex items-center gap-1 shrink-0 overflow-x-auto hide-scrollbar text-[11px] font-bold">
        <button
          onClick={() => setFilter('all')}
          className={`px-3 py-1 rounded-full transition-all cursor-pointer ${
            filter === 'all' 
              ? 'bg-[#04152d] text-white shadow-2xs' 
              : 'text-[#04152d]/60 hover:text-[#04152d] hover:bg-white/80'
          }`}
        >
          All ({notifications.length})
        </button>

        <button
          onClick={() => setFilter('unread')}
          className={`px-3 py-1 rounded-full transition-all cursor-pointer ${
            filter === 'unread' 
              ? 'bg-[#04152d] text-white shadow-2xs' 
              : 'text-[#04152d]/60 hover:text-[#04152d] hover:bg-white/80'
          }`}
        >
          Unread ({unreadCount})
        </button>

        <button
          onClick={() => setFilter('financial')}
          className={`px-3 py-1 rounded-full transition-all cursor-pointer ${
            filter === 'financial' 
              ? 'bg-[#04152d] text-white shadow-2xs' 
              : 'text-[#04152d]/60 hover:text-[#04152d] hover:bg-white/80'
          }`}
        >
          Financial
        </button>

        <button
          onClick={() => setFilter('alerts')}
          className={`px-3 py-1 rounded-full transition-all cursor-pointer ${
            filter === 'alerts' 
              ? 'bg-[#04152d] text-white shadow-2xs' 
              : 'text-[#04152d]/60 hover:text-[#04152d] hover:bg-white/80'
          }`}
        >
          Alerts
        </button>
      </div>

      {/* Notifications List */}
      <div className="overflow-y-auto divide-y divide-gray-100 flex-1 max-h-[380px]">
        {filteredNotifications.length === 0 ? (
          <div className="py-12 text-center text-[#04152d]/50 space-y-2">
            <div className="w-10 h-10 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto text-gray-400">
              <Bell size={20} />
            </div>
            <p className="text-[12px] font-semibold">No notifications found</p>
            <p className="text-[10.5px]">System messages and financial notices will appear here.</p>
          </div>
        ) : (
          filteredNotifications.map((notif) => {
            const amount = notif.details?.amount;
            return (
              <div
                key={notif.id}
                onClick={() => onSelectNotification(notif)}
                className={`p-3.5 hover:bg-blue-50/40 transition-colors cursor-pointer flex items-start gap-3 relative group ${
                  !notif.isRead ? 'bg-blue-50/20' : ''
                }`}
              >
                {!notif.isRead && (
                  <span className="w-2 h-2 rounded-full bg-blue-600 absolute top-4 left-2 ring-2 ring-white" />
                )}

                <div className="pl-1 shrink-0">
                  {getNotificationIcon(notif)}
                </div>

                <div className="flex-1 min-w-0 pr-1">
                  <div className="flex items-center justify-between gap-1 mb-0.5">
                    <h4 className={`text-[12.5px] tracking-tight truncate ${!notif.isRead ? 'font-bold text-[#04152d]' : 'font-semibold text-[#04152d]/80'}`}>
                      {notif.title}
                    </h4>
                    {amount !== undefined && (
                      <span className={`text-[11px] font-mono font-bold shrink-0 ${
                        notif.type === 'disbursement_released' ? 'text-rose-700' : 'text-emerald-700'
                      }`}>
                        {notif.type === 'disbursement_released' ? '-' : '+'}{formatCurrency(amount)}
                      </span>
                    )}
                  </div>

                  <p className="text-[11px] text-[#04152d]/70 line-clamp-2 leading-relaxed">
                    {notif.message}
                  </p>

                  <div className="flex items-center justify-between mt-1.5 text-[10px] text-[#04152d]/40 font-medium">
                    <span>{notif.timestamp}</span>
                    <span className="text-blue-700 font-bold group-hover:underline flex items-center gap-0.5">
                      View Details &rarr;
                    </span>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Footer */}
      <div className="p-3 border-t border-gray-100 bg-gray-50/90 text-center shrink-0">
        <Link
          href="/notifications"
          onClick={onClose}
          className="w-full py-2 bg-white hover:bg-gray-100 text-[#04152d] border border-gray-200 rounded-full text-[11px] font-bold shadow-2xs transition-all flex items-center justify-center gap-1.5 active:scale-95 cursor-pointer"
        >
          <span>Open Full Notification Center</span>
          <ArrowRight size={13} />
        </Link>
      </div>
    </div>
  );
}
