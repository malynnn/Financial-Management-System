'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { 
  Bell, CheckCircle2, ArrowDownLeft, ArrowUpRight, 
  Calendar, AlertTriangle, Info, Search, Check, 
  Trash2, Filter, ShieldCheck, ArrowRight, RefreshCw,
  Clock, DollarSign, ExternalLink
} from 'lucide-react';
import Header from '@/components/Header';
import NotificationDetailModal from '@/components/notifications/NotificationDetailModal';
import { useSession } from 'next-auth/react';
import { 
  getStoredNotifications, 
  markNotificationAsRead, 
  markAllNotificationsAsRead, 
  deleteNotification, 
  clearAllNotifications,
  NOTIFICATION_EVENT, 
  SystemNotification,
  UserRoleKey
} from '@/lib/notifications';

const ultraGlassCard = "bg-white/80 backdrop-blur-xl border border-white/90 shadow-[0_8px_30px_rgb(0,0,0,0.04)] rounded-[24px]";

const ROLE_OPTIONS: { key: UserRoleKey; label: string }[] = [
  { key: 'disbursing_officer', label: 'Disbursing Officer' },
  { key: 'collecting_officer', label: 'Collecting Officer' },
  { key: 'auditor', label: 'Auditor' },
  { key: 'admin', label: 'System Admin' },
];

export default function NotificationsPage() {
  const { data: session } = useSession();
  const rawRole = (session?.user as any)?.role;

  const detectedRole: UserRoleKey = useMemo(() => {
    if (typeof rawRole === 'string') {
      const lower = rawRole.toLowerCase().replace(/[\s-]+/g, '_');
      if (lower.includes('collecting')) return 'collecting_officer';
      if (lower.includes('disburs')) return 'disbursing_officer';
      if (lower.includes('audit')) return 'auditor';
      if (lower.includes('admin')) return 'admin';
    }
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('bdoea_active_role');
      if (saved === 'collecting_officer' || saved === 'disbursing_officer' || saved === 'auditor' || saved === 'admin') {
        return saved as UserRoleKey;
      }
    }
    return 'collecting_officer';
  }, [rawRole]);

  const [selectedRole, setSelectedRole] = useState<UserRoleKey>(detectedRole);

  useEffect(() => {
    setSelectedRole(detectedRole);
  }, [detectedRole]);

  const [notifications, setNotifications] = useState<SystemNotification[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'unread' | 'disbursement' | 'collection' | 'alerts'>('all');
  const [selectedNotification, setSelectedNotification] = useState<SystemNotification | null>(null);

  const loadNotifications = () => {
    setNotifications(getStoredNotifications());
  };

  useEffect(() => {
    loadNotifications();
    window.addEventListener(NOTIFICATION_EVENT, loadNotifications);
    window.addEventListener('storage', loadNotifications);
    return () => {
      window.removeEventListener(NOTIFICATION_EVENT, loadNotifications);
      window.removeEventListener('storage', loadNotifications);
    };
  }, []);

  const roleFilteredAll = useMemo(() => {
    return notifications.filter(n => {
      if (!n.targetRoles || n.targetRoles.length === 0) return false;
      return n.targetRoles.includes(selectedRole);
    });
  }, [notifications, selectedRole]);

  const unreadCount = useMemo(() => roleFilteredAll.filter(n => !n.isRead).length, [roleFilteredAll]);
  const financialCount = useMemo(() => roleFilteredAll.filter(n => ['disbursement_released', 'collection_posted', 'remittance_batch'].includes(n.type)).length, [roleFilteredAll]);
  const alertCount = useMemo(() => roleFilteredAll.filter(n => n.type === 'lifespan_alert' || n.priority === 'warning').length, [roleFilteredAll]);

  const filteredNotifications = useMemo(() => {
    return roleFilteredAll.filter(n => {
      // Tab filter
      if (activeTab === 'unread' && n.isRead) return false;
      if (activeTab === 'disbursement' && n.type !== 'disbursement_released') return false;
      if (activeTab === 'collection' && n.type !== 'collection_posted' && n.type !== 'remittance_batch') return false;
      if (activeTab === 'alerts' && n.type !== 'lifespan_alert' && n.priority !== 'warning') return false;

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const titleMatch = n.title.toLowerCase().includes(q);
        const msgMatch = n.message.toLowerCase().includes(q);
        const refMatch = n.details?.referenceNumber?.toLowerCase().includes(q) || false;
        const payeeMatch = n.details?.payeeOrPayer?.toLowerCase().includes(q) || false;
        const fundMatch = n.details?.fundCode?.toLowerCase().includes(q) || false;
        return titleMatch || msgMatch || refMatch || payeeMatch || fundMatch;
      }

      return true;
    });
  }, [roleFilteredAll, activeTab, searchQuery]);

  const handleSelectNotification = (notif: SystemNotification) => {
    markNotificationAsRead(notif.id);
    setSelectedNotification({ ...notif, isRead: true });
  };

  const handleToggleRead = (id: string) => {
    const notif = notifications.find(n => n.id === id);
    if (!notif) return;
    if (notif.isRead) {
      const updated = notifications.map(n => n.id === id ? { ...n, isRead: false } : n);
      setNotifications(updated);
      localStorage.setItem('bdoea_system_notifications', JSON.stringify(updated));
      setSelectedNotification(prev => prev && prev.id === id ? { ...prev, isRead: false } : prev);
    } else {
      markNotificationAsRead(id);
      setSelectedNotification(prev => prev && prev.id === id ? { ...prev, isRead: true } : prev);
    }
  };

  const handleDeleteNotification = (id: string) => {
    deleteNotification(id);
    if (selectedNotification?.id === id) {
      setSelectedNotification(null);
    }
  };

  const formatCurrency = (val?: number) => {
    if (val === undefined || val === null) return null;
    return `₱${Number(val).toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
  };

  const getNotificationIcon = (notif: SystemNotification) => {
    switch (notif.type) {
      case 'disbursement_released':
        return (
          <div className="w-10 h-10 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 flex items-center justify-center shrink-0 shadow-2xs">
            <ArrowDownLeft size={18} />
          </div>
        );
      case 'collection_posted':
        return (
          <div className="w-10 h-10 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-700 flex items-center justify-center shrink-0 shadow-2xs">
            <ArrowUpRight size={18} />
          </div>
        );
      case 'remittance_batch':
        return (
          <div className="w-10 h-10 rounded-2xl bg-blue-50 border border-blue-200 text-blue-700 flex items-center justify-center shrink-0 shadow-2xs">
            <Calendar size={18} />
          </div>
        );
      case 'lifespan_alert':
        return (
          <div className="w-10 h-10 rounded-2xl bg-amber-50 border border-amber-200 text-amber-700 flex items-center justify-center shrink-0 shadow-2xs">
            <AlertTriangle size={18} />
          </div>
        );
      case 'transaction_success':
      default:
        return (
          <div className="w-10 h-10 rounded-2xl bg-indigo-50 border border-indigo-200 text-indigo-700 flex items-center justify-center shrink-0 shadow-2xs">
            <CheckCircle2 size={18} />
          </div>
        );
    }
  };

  return (
    <div className="relative flex flex-col min-h-screen bg-[#f4f5f7]">
      {/* Sticky Header */}
      <div className="sticky top-0 z-40 w-full backdrop-blur-2xl bg-white/30 border-b border-white/50 shadow-[0_4px_30px_rgba(0,0,0,0.03)]">
        <Header />
      </div>

      {/* Detail Modal */}
      <NotificationDetailModal
        isOpen={selectedNotification !== null}
        notification={selectedNotification}
        onClose={() => setSelectedNotification(null)}
        onToggleRead={handleToggleRead}
        onDelete={handleDeleteNotification}
      />

      <div className="p-4 md:p-6 max-w-[1400px] w-full mx-auto animate-fade-in flex-1 relative z-10 space-y-6">
        
        {/* KPI Metrics Ribbon */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className={`${ultraGlassCard} !p-5 space-y-1`}>
            <div className="flex items-center justify-between gap-2">
              <span className="text-[10.5px] font-bold text-[#04152d]/60 uppercase tracking-wider truncate">
                Total System Notices
              </span>
              <span className="p-1 rounded-lg bg-blue-50 text-blue-700 border border-blue-200 shrink-0">
                <Bell size={14} />
              </span>
            </div>
            <div className="text-[22px] font-extrabold text-[#04152d] tracking-tight">
              {notifications.length}
            </div>
          </div>

          <div className={`${ultraGlassCard} !p-5 space-y-1`}>
            <div className="flex items-center justify-between gap-2">
              <span className="text-[10.5px] font-bold text-[#04152d]/60 uppercase tracking-wider truncate">
                Unread Messages
              </span>
              <span className="shrink-0 whitespace-nowrap inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-rose-50 text-rose-800 border border-rose-200 leading-none">
                Pending
              </span>
            </div>
            <div className="text-[22px] font-extrabold text-rose-700 tracking-tight">
              {unreadCount}
            </div>
          </div>

          <div className={`${ultraGlassCard} !p-5 space-y-1`}>
            <div className="flex items-center justify-between gap-2">
              <span className="text-[10.5px] font-bold text-[#04152d]/60 uppercase tracking-wider truncate">
                Financial Transactions
              </span>
              <span className="p-1 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 shrink-0">
                <DollarSign size={14} />
              </span>
            </div>
            <div className="text-[22px] font-extrabold text-emerald-700 tracking-tight">
              {financialCount}
            </div>
          </div>

          <div className={`${ultraGlassCard} !p-5 space-y-1`}>
            <div className="flex items-center justify-between gap-2">
              <span className="text-[10.5px] font-bold text-[#04152d]/60 uppercase tracking-wider truncate">
                Solvency & Risk Alerts
              </span>
              <span className="p-1 rounded-lg bg-amber-50 text-amber-700 border border-amber-200 shrink-0">
                <AlertTriangle size={14} />
              </span>
            </div>
            <div className="text-[22px] font-extrabold text-amber-700 tracking-tight">
              {alertCount}
            </div>
          </div>
        </div>

        {/* Role Scope Display Strip */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white/70 backdrop-blur-xl border border-white/80 p-3.5 rounded-2xl shadow-xs">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse" />
            <span className="text-[12px] font-bold text-[#04152d]">
              {detectedRole === 'admin' ? 'Admin Role Inspector:' : 'Active Role Console:'}
            </span>
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider bg-blue-100 text-blue-800 border border-blue-200">
              {ROLE_OPTIONS.find(o => o.key === selectedRole)?.label || 'Officer'}
            </span>
          </div>

          {detectedRole === 'admin' && (
            <div className="flex items-center gap-1.5 flex-wrap">
              {ROLE_OPTIONS.map((opt) => (
                <button
                  key={opt.key}
                  onClick={() => setSelectedRole(opt.key)}
                  className={`px-3 py-1 rounded-full text-[11px] font-bold transition-all cursor-pointer ${
                    selectedRole === opt.key
                      ? 'bg-[#04152d] text-white shadow-xs'
                      : 'bg-white hover:bg-gray-100 text-[#04152d]/70 border border-gray-200'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Search, Filter Tabs & Bulk Actions Bar */}
        <div className={`${ultraGlassCard} !p-4 flex flex-col md:flex-row md:items-center justify-between gap-4`}>
          {/* Search Box */}
          <div className="relative flex-1 max-w-md">
            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by title, reference #, payee, fund code..."
              className="w-full pl-9 pr-4 py-2 bg-white/90 border border-gray-200 rounded-full text-[12px] text-[#04152d] outline-none focus:border-blue-500 shadow-2xs placeholder:text-gray-400 transition-all"
            />
          </div>

          {/* Filter Tabs & Bulk Actions */}
          <div className="flex items-center justify-between md:justify-end gap-2 flex-wrap">
            <div className="flex items-center gap-1 bg-gray-100/80 p-1 rounded-full text-[11px] font-bold text-[#04152d]/60">
              <button
                onClick={() => setActiveTab('all')}
                className={`px-3 py-1 rounded-full transition-all cursor-pointer ${
                  activeTab === 'all' ? 'bg-[#04152d] text-white shadow-2xs' : 'hover:text-[#04152d]'
                }`}
              >
                All
              </button>
              <button
                onClick={() => setActiveTab('unread')}
                className={`px-3 py-1 rounded-full transition-all cursor-pointer ${
                  activeTab === 'unread' ? 'bg-[#04152d] text-white shadow-2xs' : 'hover:text-[#04152d]'
                }`}
              >
                Unread ({unreadCount})
              </button>
              <button
                onClick={() => setActiveTab('disbursement')}
                className={`px-3 py-1 rounded-full transition-all cursor-pointer ${
                  activeTab === 'disbursement' ? 'bg-[#04152d] text-white shadow-2xs' : 'hover:text-[#04152d]'
                }`}
              >
                Disbursements
              </button>
              <button
                onClick={() => setActiveTab('collection')}
                className={`px-3 py-1 rounded-full transition-all cursor-pointer ${
                  activeTab === 'collection' ? 'bg-[#04152d] text-white shadow-2xs' : 'hover:text-[#04152d]'
                }`}
              >
                Collections
              </button>
              <button
                onClick={() => setActiveTab('alerts')}
                className={`px-3 py-1 rounded-full transition-all cursor-pointer ${
                  activeTab === 'alerts' ? 'bg-[#04152d] text-white shadow-2xs' : 'hover:text-[#04152d]'
                }`}
              >
                Alerts
              </button>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              {unreadCount > 0 && (
                <button
                  onClick={() => markAllNotificationsAsRead(selectedRole)}
                  className="px-3 py-1.5 bg-white hover:bg-gray-50 text-blue-700 border border-blue-200 rounded-full text-[11px] font-bold shadow-2xs transition-all flex items-center gap-1 active:scale-95 cursor-pointer"
                >
                  <Check size={12} /> Mark All Read
                </button>
              )}

              <button
                onClick={() => clearAllNotifications(selectedRole)}
                className="px-3 py-1.5 bg-white hover:bg-rose-50 text-rose-700 border border-rose-200 rounded-full text-[11px] font-bold shadow-2xs transition-all flex items-center gap-1 active:scale-95 cursor-pointer"
                title="Clear all stored notices"
              >
                <Trash2 size={12} /> Clear All
              </button>
            </div>
          </div>
        </div>

        {/* Notifications List Card */}
        <div className={`${ultraGlassCard} !p-6 space-y-4`}>
          <div className="flex items-center justify-between border-b border-gray-100 pb-3">
            <div className="flex items-center gap-2">
              <ShieldCheck size={18} className="text-blue-700" />
              <h3 className="text-[15px] font-bold text-[#04152d] tracking-tight">
                System Messages & Audit Trail Log
              </h3>
            </div>
            <span className="text-[11px] text-[#04152d]/50 font-medium">
              Showing {filteredNotifications.length} of {notifications.length} notices
            </span>
          </div>

          <div className="space-y-3">
            {filteredNotifications.length === 0 ? (
              <div className="py-16 text-center text-[#04152d]/50 space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto text-gray-400">
                  <Bell size={24} />
                </div>
                <div>
                  <h4 className="text-[14px] font-bold text-[#04152d]">No notifications found</h4>
                  <p className="text-[11px] text-[#04152d]/60 mt-0.5">
                    There are no notices matching the selected filter or search keyword.
                  </p>
                </div>
              </div>
            ) : (
              filteredNotifications.map((notif) => {
                const amount = notif.details?.amount;
                const ref = notif.details?.referenceNumber;
                const payee = notif.details?.payeeOrPayer;

                return (
                  <div
                    key={notif.id}
                    onClick={() => handleSelectNotification(notif)}
                    className={`p-4 rounded-2xl border transition-all cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3 group hover:shadow-sm ${
                      !notif.isRead 
                        ? 'bg-blue-50/30 border-blue-200/80 hover:bg-blue-50/50 hover:border-blue-300' 
                        : 'bg-white border-gray-200/80 hover:bg-gray-50/80 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-start gap-3.5 min-w-0">
                      {getNotificationIcon(notif)}
                      
                      <div className="space-y-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className={`text-[13.5px] tracking-tight ${!notif.isRead ? 'font-extrabold text-[#04152d]' : 'font-bold text-[#04152d]/90'}`}>
                            {notif.title}
                          </h4>

                          {ref && (
                            <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded-md bg-gray-100 text-gray-700 border border-gray-200">
                              {ref}
                            </span>
                          )}

                          {!notif.isRead && (
                            <span className="px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider bg-blue-100 text-blue-800 border border-blue-200">
                              New
                            </span>
                          )}

                          {notif.targetRoles && notif.targetRoles.length > 0 && !notif.targetRoles.includes('all') && (
                            <span className="px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider bg-purple-50 text-purple-800 border border-purple-200">
                              {ROLE_OPTIONS.find(o => o.key === notif.targetRoles?.[0])?.label || 'Role Notice'}
                            </span>
                          )}
                        </div>

                        <p className="text-[11.5px] text-[#04152d]/70 font-medium line-clamp-2 leading-relaxed">
                          {notif.message}
                        </p>

                        <div className="flex items-center gap-3 text-[10.5px] text-[#04152d]/40 font-mono flex-wrap pt-0.5">
                          <span className="flex items-center gap-1">
                            <Clock size={11} /> {notif.timestamp}
                          </span>
                          {payee && (
                            <span>• Payee: <strong className="text-[#04152d]/70 font-sans">{payee}</strong></span>
                          )}
                          {notif.details?.fundCode && (
                            <span>• Fund: <strong className="text-[#04152d]/70">{notif.details.fundCode}</strong></span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-1 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-gray-100">
                      {amount !== undefined && (
                        <span className={`text-[14px] font-mono font-extrabold ${
                          notif.type === 'disbursement_released' ? 'text-rose-700' : 'text-emerald-700'
                        }`}>
                          {notif.type === 'disbursement_released' ? '-' : '+'}{formatCurrency(amount)}
                        </span>
                      )}

                      <span className="text-[11px] font-bold text-blue-700 group-hover:underline flex items-center gap-1">
                        View Audit Details &rarr;
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
