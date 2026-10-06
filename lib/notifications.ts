export type NotificationType = 
  | 'transaction_success'
  | 'disbursement_released'
  | 'collection_posted'
  | 'remittance_batch'
  | 'lifespan_alert'
  | 'system';

export type NotificationPriority = 'info' | 'success' | 'warning' | 'critical';

export type UserRoleKey = 'collecting_officer' | 'disbursing_officer' | 'auditor' | 'admin' | 'all';

export interface NotificationDetails {
  referenceNumber?: string;
  payeeOrPayer?: string;
  amount?: number;
  fundCode?: string;
  category?: string;
  actionBy?: string;
  particulars?: string;
  actionUrl?: string;
  actionLabel?: string;
  notes?: string;
}

export interface SystemNotification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  timestamp: string;
  isRead: boolean;
  priority: NotificationPriority;
  targetRoles?: UserRoleKey[];
  details?: NotificationDetails;
}

const STORAGE_KEY = 'bdoea_system_notifications_v5';
export const NOTIFICATION_EVENT = 'bdoea_notifications_updated';

export const INITIAL_NOTIFICATIONS: SystemNotification[] = [
  // --- DISBURSING OFFICER SPECIFIC ---
  {
    id: 'notif-disb-1',
    type: 'disbursement_released',
    title: 'Disbursement Voucher Released',
    message: 'Emergency Loan release of ₱15,000.00 for Maria Clara Santos executed via Cheque #982341.',
    timestamp: '2026-10-06 22:15:00',
    isRead: false,
    priority: 'success',
    targetRoles: ['disbursing_officer'],
    details: {
      referenceNumber: 'DV-2026-0042',
      payeeOrPayer: 'Maria Clara Santos',
      amount: 15000,
      fundCode: 'LNF',
      category: 'Member Loans',
      actionBy: 'Jose Reyes (Disbursing Officer)',
      particulars: 'Emergency Loan Proceeds Release via Cheque #982341',
      actionUrl: '/disbursing-officer/disbursement',
      actionLabel: 'View in Disbursement Console',
      notes: 'Cheque issued, payee voucher verified by disbursing console.'
    }
  },
  {
    id: 'notif-disb-2',
    type: 'lifespan_alert',
    title: 'DAF Fund Solvency Warning',
    message: 'Death Assistance Fund reserve runway is down to ~2.5 months under current outflow velocity.',
    timestamp: '2026-10-06 21:00:00',
    isRead: false,
    priority: 'warning',
    targetRoles: ['disbursing_officer'],
    details: {
      referenceNumber: 'SIM-2026-DAF',
      fundCode: 'DAF',
      amount: 130000,
      category: 'Solvency Monitoring',
      actionBy: 'Automated Lifespan Model',
      particulars: 'Reserve Balance: ₱130,000.00 • Monthly Outflow: ~₱52,000.00',
      actionUrl: '/disbursing-officer/lifespan',
      actionLabel: 'Inspect Depletion Timeline',
      notes: 'Solvency threshold alert triggered. Recommended review of reserve allocation or contribution policy.'
    }
  },
  {
    id: 'notif-disb-3',
    type: 'disbursement_released',
    title: 'Bereavement Claim Released',
    message: 'Bereavement assistance of ₱20,000.00 released to Beneficiary of late Member Fernando Ramos.',
    timestamp: '2026-10-06 18:30:00',
    isRead: true,
    priority: 'success',
    targetRoles: ['disbursing_officer'],
    details: {
      referenceNumber: 'DV-2026-0039',
      payeeOrPayer: 'Lourdes Ramos (Spouse)',
      amount: 20000,
      fundCode: 'DAF',
      category: 'Bereavement Assistance',
      actionBy: 'Jose Reyes (Disbursing Officer)',
      particulars: 'Death Assistance Claim Voucher Release',
      actionUrl: '/disbursing-officer/disbursement',
      actionLabel: 'Open Disbursement Ledger',
      notes: 'Death certificate and beneficiary documentation verified.'
    }
  },
  {
    id: 'notif-disb-4',
    type: 'system',
    title: '3 Vouchers Approved for Release',
    message: 'System Admin approved 3 queued vouchers ready for final cheque issuing and release.',
    timestamp: '2026-10-06 16:45:00',
    isRead: true,
    priority: 'info',
    targetRoles: ['disbursing_officer'],
    details: {
      referenceNumber: 'APP-2026-10-03',
      amount: 47500,
      category: 'Approval Queue',
      actionBy: 'System Administrator',
      particulars: 'Batch of 3 approved vouchers awaiting Cheque preparation',
      actionUrl: '/disbursing-officer/disbursement',
      actionLabel: 'Process Queued Releases',
      notes: 'Ready for cheque numbering and disbursing officer counter-signing.'
    }
  },

  // --- COLLECTING OFFICER SPECIFIC ---
  {
    id: 'notif-coll-1',
    type: 'collection_posted',
    title: 'Member Collection Posted',
    message: 'Direct over-the-counter collection of ₱3,500.00 received from Juan Dela Cruz.',
    timestamp: '2026-10-06 21:40:00',
    isRead: false,
    priority: 'info',
    targetRoles: ['collecting_officer'],
    details: {
      referenceNumber: 'CR-2026-0089',
      payeeOrPayer: 'Juan Dela Cruz',
      amount: 3500,
      fundCode: 'GEN',
      category: 'Direct Collections',
      actionBy: 'Maria Santos (Collecting Officer)',
      particulars: 'Monthly Dues & Loan Amortization Collection',
      actionUrl: '/collecting-officer/collections',
      actionLabel: 'Open Collections Register',
      notes: 'Validated with Bank Deposit slip verification.'
    }
  },
  {
    id: 'notif-coll-2',
    type: 'remittance_batch',
    title: 'Payroll Remittance Batch Validated',
    message: 'DepEd Batch PR-202610-01 (₱85,000.00) parsed: 48 valid matches, 0 blocking exceptions.',
    timestamp: '2026-10-06 19:30:00',
    isRead: false,
    priority: 'success',
    targetRoles: ['collecting_officer'],
    details: {
      referenceNumber: 'PR-202610-01',
      payeeOrPayer: 'Central DepEd Payroll Agency',
      amount: 85000,
      fundCode: 'GEN',
      category: 'Payroll Deduction',
      actionBy: 'Maria Santos (Collecting Officer)',
      particulars: 'Period: Oct 2026 - 48 Valid Matches, 0 Exceptions',
      actionUrl: '/collecting-officer/payroll',
      actionLabel: 'Examine Remittance Batch',
      notes: 'Automated cross-check matched 48 member account ledgers.'
    }
  },
  {
    id: 'notif-coll-3',
    type: 'collection_posted',
    title: 'Bank Deposit Slip Verified',
    message: 'Bank deposit of ₱12,000.00 confirmed and credited to General Fund account.',
    timestamp: '2026-10-06 17:15:00',
    isRead: true,
    priority: 'success',
    targetRoles: ['collecting_officer'],
    details: {
      referenceNumber: 'DEP-2026-104',
      payeeOrPayer: 'LandBank of the Philippines',
      amount: 12000,
      fundCode: 'GEN',
      category: 'Bank Deposit Proof',
      actionBy: 'Maria Santos (Collecting Officer)',
      particulars: 'Deposit Slip #LBP-88192 validated against physical receipt',
      actionUrl: '/collecting-officer/funds',
      actionLabel: 'View Inflow Accounts',
      notes: 'Physical slip scan verified and matched with counter register.'
    }
  },
  {
    id: 'notif-coll-4',
    type: 'system',
    title: 'Monthly Collection Target at 82%',
    message: 'October 2026 member collections have reached ₱150,000.00 of the ₱180,000.00 target.',
    timestamp: '2026-10-06 15:00:00',
    isRead: true,
    priority: 'info',
    targetRoles: ['collecting_officer'],
    details: {
      referenceNumber: 'TRG-2026-10',
      amount: 150000,
      category: 'Inflow Target',
      actionBy: 'Revenue Performance Tracker',
      particulars: 'Target: ₱180,000.00 • Posted: ₱150,000.00 (83.3%)',
      actionUrl: '/collecting-officer',
      actionLabel: 'Open Collecting Dashboard',
      notes: 'On track to meet monthly union treasury target.'
    }
  },

  // --- AUDITOR SPECIFIC ---
  {
    id: 'notif-aud-1',
    type: 'transaction_success',
    title: 'Master Ledger Reconciled: 99.8% Match',
    message: 'Auditor reconciled September 2026 cross-ledger balance with 99.8% match rate.',
    timestamp: '2026-10-06 20:10:00',
    isRead: false,
    priority: 'success',
    targetRoles: ['auditor'],
    details: {
      referenceNumber: 'REC-2026-09',
      fundCode: 'ALL',
      amount: 405000,
      category: 'Ledger Audit',
      actionBy: 'Elena Cruz (Auditor)',
      particulars: 'Cross-verification between Bank Statements and Union Ledgers',
      actionUrl: '/auditor',
      actionLabel: 'View Audit Dashboard',
      notes: 'Zero critical discrepancies found during periodic cross-audit.'
    }
  },
  {
    id: 'notif-aud-2',
    type: 'system',
    title: 'October Net Variance Logged',
    message: 'Net cashflow period variance for October 2026 recorded at -₱22,000.00 (Normal Seasonal Variance).',
    timestamp: '2026-10-06 18:20:00',
    isRead: false,
    priority: 'info',
    targetRoles: ['auditor'],
    details: {
      referenceNumber: 'AUD-VAR-202610',
      amount: 22000,
      category: 'Variance Audit',
      actionBy: 'Elena Cruz (Auditor)',
      particulars: 'Inflows: ₱150,000.00 vs Outflows: ₱172,000.00',
      actionUrl: '/auditor',
      actionLabel: 'Inspect Balance Verification',
      notes: 'Outflow higher due to peak semestral emergency loans and calamity grants.'
    }
  },
  {
    id: 'notif-aud-3',
    type: 'lifespan_alert',
    title: 'DAF Fund Solvency Depletion Flag',
    message: 'Auditor review flagged Death Assistance Fund for policy review due to ~2.5 month runway.',
    timestamp: '2026-10-06 14:00:00',
    isRead: true,
    priority: 'warning',
    targetRoles: ['auditor'],
    details: {
      referenceNumber: 'AUD-DAF-2026',
      fundCode: 'DAF',
      amount: 130000,
      category: 'Solvency Oversight',
      actionBy: 'Elena Cruz (Auditor)',
      particulars: 'Reserve: ₱130k • Burn velocity: ₱52k/mo',
      actionUrl: '/auditor/lifespan',
      actionLabel: 'Open Lifespan Audit',
      notes: 'Audit recommendation submitted for Board review.'
    }
  },

  // --- SYSTEM ADMIN SPECIFIC ---
  {
    id: 'notif-adm-1',
    type: 'system',
    title: 'Master Funds Capital Policy Validated',
    message: 'All 4 master fund allocation policies validated and operating within union parameters.',
    timestamp: '2026-10-06 20:00:00',
    isRead: false,
    priority: 'success',
    targetRoles: ['admin'],
    details: {
      referenceNumber: 'ADM-POL-01',
      category: 'Fund Governance',
      actionBy: 'System Administrator',
      particulars: 'General, DAF, Loan, and Calamity Master Fund rules validated',
      actionUrl: '/admin/funds',
      actionLabel: 'Manage Master Funds',
      notes: 'All compliance constraints active and enforcing limits.'
    }
  },
  {
    id: 'notif-adm-2',
    type: 'system',
    title: 'Officer Session Audit Logged',
    message: 'Active sessions verified for Disbursing Officer, Collecting Officer, and Auditor.',
    timestamp: '2026-10-06 19:00:00',
    isRead: true,
    priority: 'info',
    targetRoles: ['admin'],
    details: {
      referenceNumber: 'SEC-LOG-882',
      category: 'Security & Access',
      actionBy: 'Auth Security Monitor',
      particulars: 'Multi-officer role RBAC access validated',
      actionUrl: '/admin',
      actionLabel: 'View Admin Dashboard',
      notes: 'Zero unauthorized access attempts detected.'
    }
  }
];

export function getStoredNotifications(): SystemNotification[] {
  if (typeof window === 'undefined') return INITIAL_NOTIFICATIONS;

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(INITIAL_NOTIFICATIONS));
      return INITIAL_NOTIFICATIONS;
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed;
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(INITIAL_NOTIFICATIONS));
    return INITIAL_NOTIFICATIONS;
  } catch (err) {
    console.error('Failed to read notifications from localStorage', err);
    return INITIAL_NOTIFICATIONS;
  }
}

export function saveStoredNotifications(notifs: SystemNotification[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(notifs));
    window.dispatchEvent(new Event(NOTIFICATION_EVENT));
  } catch (err) {
    console.error('Failed to save notifications to localStorage', err);
  }
}

export function getNotificationsForRole(role: UserRoleKey): SystemNotification[] {
  const all = getStoredNotifications();
  if (role === 'all') return all;

  return all.filter(n => {
    if (!n.targetRoles || n.targetRoles.length === 0) return false;
    return n.targetRoles.includes(role);
  });
}

export function addNotification(notif: Omit<SystemNotification, 'id' | 'timestamp' | 'isRead'> & { 
  id?: string; 
  timestamp?: string;
  targetRoles?: UserRoleKey[];
}): SystemNotification {
  const current = getStoredNotifications();
  const now = new Date();
  const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;

  // Automatically assign strict single-role if not explicitly specified
  let assignedRoles = notif.targetRoles;
  if (!assignedRoles || assignedRoles.length === 0) {
    if (notif.type === 'disbursement_released') {
      assignedRoles = ['disbursing_officer'];
    } else if (notif.type === 'collection_posted' || notif.type === 'remittance_batch') {
      assignedRoles = ['collecting_officer'];
    } else if (notif.type === 'lifespan_alert') {
      assignedRoles = ['disbursing_officer'];
    } else {
      assignedRoles = ['admin'];
    }
  }

  const created: SystemNotification = {
    id: notif.id || `notif-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    type: notif.type,
    title: notif.title,
    message: notif.message,
    timestamp: notif.timestamp || dateStr,
    isRead: false,
    priority: notif.priority || 'info',
    targetRoles: assignedRoles,
    details: notif.details
  };

  const updated = [created, ...current];
  saveStoredNotifications(updated);
  return created;
}

export function markNotificationAsRead(id: string): void {
  const current = getStoredNotifications();
  const updated = current.map(n => n.id === id ? { ...n, isRead: true } : n);
  saveStoredNotifications(updated);
}

export function markAllNotificationsAsRead(forRole?: UserRoleKey): void {
  const current = getStoredNotifications();
  const updated = current.map(n => {
    if (!forRole || forRole === 'all') return { ...n, isRead: true };
    if (n.targetRoles && n.targetRoles.includes(forRole)) {
      return { ...n, isRead: true };
    }
    return n;
  });
  saveStoredNotifications(updated);
}

export function deleteNotification(id: string): void {
  const current = getStoredNotifications();
  const updated = current.filter(n => n.id !== id);
  saveStoredNotifications(updated);
}

export function clearAllNotifications(forRole?: UserRoleKey): void {
  if (!forRole || forRole === 'all') {
    saveStoredNotifications([]);
  } else {
    const current = getStoredNotifications();
    const updated = current.filter(n => {
      return !n.targetRoles || !n.targetRoles.includes(forRole);
    });
    saveStoredNotifications(updated);
  }
}
