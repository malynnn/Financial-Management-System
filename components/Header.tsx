'use client';

import { useState, useEffect, useRef, useMemo, Suspense } from 'react';
import Link from 'next/link';
import { Bell, Settings, LogOut, User } from 'lucide-react';
import { usePathname, useSearchParams, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import ActionModal from '@/components/ActionModal';
import NotificationPanel from '@/components/notifications/NotificationPanel';
import NotificationDetailModal from '@/components/notifications/NotificationDetailModal';
import { 
  getStoredNotifications, 
  markNotificationAsRead, 
  markAllNotificationsAsRead, 
  deleteNotification, 
  NOTIFICATION_EVENT, 
  SystemNotification,
  UserRoleKey
} from '@/lib/notifications';

interface Props {
  unreadCount?: number;
  onUnreadCountChange?: (count: number) => void;
}

const ADMIN_TAB_TITLES: Record<string, string> = {
  members:               'Members',
  'pending-approvals':   'Pending Approvals',
  'create-officer':      'Add Officer',
  'create-member':       'Add Member',
  'beneficiary-requests':'Beneficiary Requests',
  events:                'Events',
  claims:                'Claims',
  activity:              'Activity Log',
  users:                 'User Management',
};

const PAGE_TITLES: Record<string, string> = {
  // Notifications
  '/notifications':                       'System Notification Center',
  // Collecting Officer routes
  '/collecting-officer':                  'Collecting Officer Dashboard',
  '/collecting-officer/collections':      'Collection Processing',
  '/collecting-officer/payroll':          'Payroll Processing',
  '/collecting-officer/funds':            'Funds Dashboard',
  '/collecting-officer/lifespan':         'Fund Lifespan Analytics',
  // Disbursing Officer routes
  '/disbursing-officer':                  'Disbursing Officer Dashboard',
  '/disbursing-officer/disbursement':     'Disbursement Processing',
  '/disbursing-officer/funds':            'Funds Dashboard',
  '/disbursing-officer/lifespan':         'Fund Lifespan Analytics',
  // Admin routes
  '/admin':                               'System Administration Dashboard',
  '/admin/dashboard':                     'User Management',
  '/admin/funds':                         'Fund Master',
  '/admin/lifespan':                      'Fund Lifespan Analytics',
  '/admin/disbursement':                  'Disbursement Processing',
  '/admin/settings':                      'Settings',
  // Auditor routes
  '/auditor':                             'Auditor Oversight Dashboard',
  '/auditor/dashboard':                   'Audit Oversight',
  '/auditor/collections':                 'Collections Audit',
  '/auditor/disbursement':                'Disbursement Audit',
  '/auditor/payroll':                     'Payroll Audit',
  '/auditor/funds':                       'Fund Oversight',
  '/auditor/lifespan':                    'Fund Lifespan Audit',
  // Misc
  '/profile':                             'Settings',
  '/events':                              'Events',
  '/documents':                           'Documents',
  '/election':                            'Elections',
  '/grievance':                           'Grievances',
};

function HeaderContent({ unreadCount: propUnreadCount }: Props) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  
  const [panelOpen, setPanelOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const settingsRef = useRef<HTMLDivElement>(null);

  const [greeting, setGreeting] = useState('');
  const [currentDate, setCurrentDate] = useState('');
  const [currentTime, setCurrentTime] = useState('');

  const { data: session } = useSession();

  let currentUserRoleKey: UserRoleKey = 'disbursing_officer';
  if (pathname.startsWith('/collecting-officer')) {
    currentUserRoleKey = 'collecting_officer';
    if (typeof window !== 'undefined') localStorage.setItem('bdoea_active_role', 'collecting_officer');
  } else if (pathname.startsWith('/disbursing-officer')) {
    currentUserRoleKey = 'disbursing_officer';
    if (typeof window !== 'undefined') localStorage.setItem('bdoea_active_role', 'disbursing_officer');
  } else if (pathname.startsWith('/admin')) {
    currentUserRoleKey = 'admin';
    if (typeof window !== 'undefined') localStorage.setItem('bdoea_active_role', 'admin');
  } else if (pathname.startsWith('/auditor')) {
    currentUserRoleKey = 'auditor';
    if (typeof window !== 'undefined') localStorage.setItem('bdoea_active_role', 'auditor');
  } else {
    const rawRole = (session?.user as any)?.role;
    if (typeof rawRole === 'string') {
      const lower = rawRole.toLowerCase().replace(/[\s-]+/g, '_');
      if (lower.includes('collecting')) currentUserRoleKey = 'collecting_officer';
      else if (lower.includes('disburs')) currentUserRoleKey = 'disbursing_officer';
      else if (lower.includes('audit')) currentUserRoleKey = 'auditor';
      else if (lower.includes('admin')) currentUserRoleKey = 'admin';
    } else if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('bdoea_active_role');
      if (saved === 'collecting_officer' || saved === 'disbursing_officer' || saved === 'auditor' || saved === 'admin') {
        currentUserRoleKey = saved;
      }
    }
  }

  // Notifications State (persists in localStorage across role switches)
  const [notifications, setNotifications] = useState<SystemNotification[]>([]);
  const [selectedNotification, setSelectedNotification] = useState<SystemNotification | null>(null);

  useEffect(() => {
    const load = () => {
      setNotifications(getStoredNotifications());
    };
    load();

    const handleUpdate = () => load();
    window.addEventListener(NOTIFICATION_EVENT, handleUpdate);
    window.addEventListener('storage', handleUpdate);
    return () => {
      window.removeEventListener(NOTIFICATION_EVENT, handleUpdate);
      window.removeEventListener('storage', handleUpdate);
    };
  }, []);

  const roleNotifications = useMemo(() => {
    return notifications.filter(n => {
      if (!n.targetRoles || n.targetRoles.length === 0) return false;
      return n.targetRoles.includes(currentUserRoleKey);
    });
  }, [notifications, currentUserRoleKey]);

  const unreadCount = propUnreadCount !== undefined ? propUnreadCount : roleNotifications.filter(n => !n.isRead).length;

  const [logoutModal, setLogoutModal] = useState<{
    isOpen: boolean;
    status: 'idle' | 'loading' | 'success' | 'error';
  }>({ isOpen: false, status: 'idle' });

  useEffect(() => {
    const updateDateTime = () => {
      const date = new Date();
      const hour = date.getHours();

      if (hour < 12) setGreeting('Good morning');
      else if (hour < 18) setGreeting('Good afternoon');
      else setGreeting('Good evening');

      setCurrentDate(date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }));
      setCurrentTime(date.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    };

    updateDateTime();
    const timerId = setInterval(updateDateTime, 1000);
    return () => clearInterval(timerId);
  }, []);

  let title = PAGE_TITLES[pathname];
  if (!title) {
    const matchedPrefix = Object.keys(PAGE_TITLES).find(k => pathname.startsWith(k));
    if (matchedPrefix) title = PAGE_TITLES[matchedPrefix];
  }
  if (!title) title = 'BDOEA';

  if (pathname === '/admin') {
    const tab = searchParams.get('tab') ?? '';
    title = ADMIN_TAB_TITLES[tab] ?? 'Administration';
  }

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setPanelOpen(false);
      }
      if (settingsRef.current && !settingsRef.current.contains(e.target as Node)) {
        setSettingsOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  useEffect(() => { 
    setPanelOpen(false); 
    setSettingsOpen(false);
  }, [pathname]);

  const triggerLogout = () => {
    setSettingsOpen(false);
    setLogoutModal({ isOpen: true, status: 'idle' });
  };

  const executeLogout = async () => {
    setLogoutModal(prev => ({ ...prev, status: 'loading' }));
    setTimeout(() => {
      router.push('/login');
      setLogoutModal({ isOpen: false, status: 'idle' });
    }, 800);
  };

  const handleSelectNotification = (notif: SystemNotification) => {
    markNotificationAsRead(notif.id);
    setSelectedNotification({ ...notif, isRead: true });
    setPanelOpen(false);
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

  return (
    <>
      <ActionModal
        isOpen={logoutModal.isOpen}
        title="Confirm Sign Out"
        message="Are you sure you want to securely sign out of your BDOEA account?"
        status={logoutModal.status}
        onConfirm={executeLogout}
        onClose={() => setLogoutModal({ isOpen: false, status: 'idle' })}
        confirmText="Sign Out"
      />

      {/* Notification Detail Modal */}
      <NotificationDetailModal
        isOpen={selectedNotification !== null}
        notification={selectedNotification}
        onClose={() => setSelectedNotification(null)}
        onToggleRead={handleToggleRead}
        onDelete={handleDeleteNotification}
      />

      <header
        className="glass-sheen !overflow-visible sticky top-0 z-40 flex items-center justify-between pl-16 md:pl-5 pr-4 py-2.5 bg-white/60 backdrop-blur-[40px] backdrop-saturate-[200%] border-b border-white/80 print:hidden will-change-auto"
        style={{ boxShadow: '0 1px 0 rgba(255,255,255,0.8) inset, 0 8px 32px rgba(4,21,45,0.1)' }}
      >
        <style jsx global>{`
          .glass-sheen { position: relative; isolation: isolate; }
          .glass-sheen::before {
            content: '';
            position: absolute;
            inset: 0;
            background: radial-gradient(140% 140% at 50% -30%, rgba(255,255,255,0.5), rgba(255,255,255,0) 60%);
            pointer-events: none;
            z-index: -1;
          }
          header.glass-sheen, header.glass-sheen * { transform: none; }
          header.glass-sheen button, header.glass-sheen a { transform: none !important; }
        `}</style>

        <h1 className="text-[13px] font-semibold text-[#04152d] tracking-tight select-none text-left">
          {title}
        </h1>

        <div className="flex items-center gap-3">
          {(currentDate && currentTime) && (
            <div className="hidden sm:flex items-center gap-2 text-[11px] font-medium text-gray-600 tracking-wide mr-1 bg-white/50 border border-white/70 rounded-full px-3 py-1.5 backdrop-blur-md">
              <span>{currentDate}</span>
              <span className="w-1 h-1 bg-gray-300 rounded-full"></span>
              <span>{currentTime}</span>
            </div>
          )}

          <div className="flex items-center gap-1.5">
            <div className="relative" ref={wrapperRef}>
              <button
                onClick={() => setPanelOpen(o => !o)}
                className={`relative flex items-center justify-center w-8 h-8 rounded-lg border transition-all duration-300 cursor-pointer ${
                  panelOpen 
                    ? 'bg-[#04152d] text-white border-[#04152d] shadow-sm' 
                    : 'text-gray-500 border-transparent hover:text-[#04152d] hover:bg-white/80 hover:border-white hover:shadow-[0_2px_10px_rgba(0,0,0,0.06)]'
                }`}
                title="Notifications"
                aria-label="Toggle notifications"
                suppressHydrationWarning
              >
                <Bell size={17} />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-rose-600 text-white text-[9px] font-extrabold rounded-full min-w-[15px] h-4 flex items-center justify-center px-1 leading-none shadow-xs border border-white animate-pulse">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>

              {/* Notification Dropdown Panel */}
              <NotificationPanel
                isOpen={panelOpen}
                notifications={roleNotifications}
                onClose={() => setPanelOpen(false)}
                onSelectNotification={handleSelectNotification}
                onMarkAllAsRead={() => markAllNotificationsAsRead(currentUserRoleKey)}
              />
            </div>

            <div className="relative" ref={settingsRef}>
              <button
                onClick={() => setSettingsOpen(o => !o)}
                className="flex items-center justify-center w-8 h-8 rounded-lg text-gray-400 border border-transparent hover:text-[#04152d] hover:bg-white/80 hover:border-white hover:shadow-[0_2px_10px_rgba(0,0,0,0.06)] transition-colors transition-shadow duration-300 cursor-pointer"
                title="Settings"
                suppressHydrationWarning
              >
                <Settings size={17} />
              </button>

              {settingsOpen && (
                <div className="absolute right-0 top-full mt-2 w-52 bg-white/90 backdrop-blur-2xl border border-white shadow-[0_8px_32px_rgba(4,21,45,0.12)] rounded-[20px] py-2 flex flex-col z-[100] animate-in fade-in zoom-in-95 duration-200">
                  <div className="px-4 py-2 border-b border-[#04152d]/10 mb-1">
                    <p className="text-[10px] font-semibold text-[#04152d]/50 uppercase tracking-widest">Account</p>
                  </div>
                  <Link
                    href="/notifications"
                    onClick={() => setSettingsOpen(false)}
                    className="flex items-center gap-3 px-4 py-2 text-[12.5px] font-medium text-[#04152d] hover:bg-gray-50 transition-colors text-left w-full outline-none"
                  >
                    <Bell size={15} className="text-blue-600" /> Notifications Center
                  </Link>
                  <div className="h-px bg-[#04152d]/10 my-1 mx-3" />
                  <button onClick={triggerLogout} className="flex items-center gap-3 px-4 py-2.5 text-[12.5px] font-medium text-red-600 hover:bg-red-50 transition-colors text-left w-full outline-none cursor-pointer">
                    <LogOut size={15} className="text-red-500" /> Sign Out
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>
    </>
  );
}

export default function Header(props: Props) {
  return (
    <Suspense fallback={
      <header
        className="sticky top-0 z-40 flex items-center justify-between pl-16 md:pl-5 pr-4 py-2.5 bg-white/60 backdrop-blur-[40px] border-b border-white/80 print:hidden"
        style={{ boxShadow: '0 1px 0 rgba(255,255,255,0.8) inset, 0 8px 32px rgba(4,21,45,0.1)' }}
      >
        <h1 className="text-[13px] font-semibold text-[#04152d] tracking-tight select-none">BDOEA</h1>
      </header>
    }>
      <HeaderContent {...props} />
    </Suspense>
  );
}