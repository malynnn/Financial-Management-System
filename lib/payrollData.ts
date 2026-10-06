/**
 * Comprehensive Payroll Processing Data Layer
 * Implements Sprint 4 requirements:
 * - Deduction Schedules & Validations (User Stories 1 - 7)
 * - Remittance Upload, Previews, Mismatch Exceptions & Duplicate Warnings (User Stories 8 - 11)
 * - Batch Review, Ready Action & History (User Stories 12 - 14)
 * - Auditor Read-Only Access (User Story 15)
 */

export const CONFIGURED_DEDUCTION_TYPES = [
  'Regular Loan Amortization',
  'Emergency Loan Amortization',
  'Educational Loan Amortization',
  'Annual Membership Dues',
  'Share Capital Contribution',
  'Bereavement Assistance Levy',
  'Mutual Aid Fund'
] as const;

export type DeductionType = typeof CONFIGURED_DEDUCTION_TYPES[number];

export interface MemberRecord {
  id: string;
  name: string;
  department: string;
  status: 'ACTIVE' | 'INACTIVE';
  obligations: {
    obligationRef: string;
    deductionType: DeductionType;
    monthlyAmount: number;
    remainingBalance: number;
  }[];
}

export const CONFIGURED_MEMBERS_MASTER: Record<string, MemberRecord> = {
  'MEM-2026-1': {
    id: 'MEM-2026-1',
    name: 'Juan Dela Cruz',
    department: 'Operations',
    status: 'ACTIVE',
    obligations: [
      { obligationRef: 'RL-2026-01', deductionType: 'Regular Loan Amortization', monthlyAmount: 2500, remainingBalance: 12500 },
      { obligationRef: 'DUES-2026', deductionType: 'Annual Membership Dues', monthlyAmount: 500, remainingBalance: 1500 },
    ]
  },
  'MEM-2026-2': {
    id: 'MEM-2026-2',
    name: 'Maria Clara',
    department: 'Finance & Administration',
    status: 'ACTIVE',
    obligations: [
      { obligationRef: 'CAL-2026-04', deductionType: 'Emergency Loan Amortization', monthlyAmount: 1800, remainingBalance: 8000 },
      { obligationRef: 'CAP-2026', deductionType: 'Share Capital Contribution', monthlyAmount: 1000, remainingBalance: 3000 },
    ]
  },
  'MEM-2026-3': {
    id: 'MEM-2026-3',
    name: 'Jose Rizal',
    department: 'Research & Legal',
    status: 'ACTIVE',
    obligations: [
      { obligationRef: 'EL-90', deductionType: 'Educational Loan Amortization', monthlyAmount: 3200, remainingBalance: 20000 },
    ]
  },
  'MEM-2026-4': {
    id: 'MEM-2026-4',
    name: 'Andres Bonifacio',
    department: 'Security & Facilities',
    status: 'ACTIVE',
    obligations: [
      { obligationRef: 'LIV-2026-88', deductionType: 'Regular Loan Amortization', monthlyAmount: 2000, remainingBalance: 15000 },
      { obligationRef: 'DUES-2026', deductionType: 'Annual Membership Dues', monthlyAmount: 500, remainingBalance: 1500 },
    ]
  },
  'MEM-2026-5': {
    id: 'MEM-2026-5',
    name: 'Emilio Jacinto',
    department: 'Public Relations',
    status: 'INACTIVE', // Inactive member to test validation rule
    obligations: [
      { obligationRef: 'DEF-99', deductionType: 'Regular Loan Amortization', monthlyAmount: 1500, remainingBalance: 5000 },
    ]
  },
  'MEM-2026-6': {
    id: 'MEM-2026-6',
    name: 'Apolinario Mabini',
    department: 'Legal Counsel',
    status: 'ACTIVE',
    obligations: [
      { obligationRef: 'APP-2026-12', deductionType: 'Regular Loan Amortization', monthlyAmount: 1250, remainingBalance: 6500 },
    ]
  },
  'MEM-2026-7': {
    id: 'MEM-2026-7',
    name: 'Melchora Aquino',
    department: 'Member Welfare',
    status: 'ACTIVE',
    obligations: [
      { obligationRef: 'MED-2026-03', deductionType: 'Emergency Loan Amortization', monthlyAmount: 1100, remainingBalance: 4200 },
      { obligationRef: 'BAL-2026', deductionType: 'Bereavement Assistance Levy', monthlyAmount: 400, remainingBalance: 1200 },
    ]
  }
};

export interface DeductionSchedule {
  id: string;
  payrollPeriod: string; // e.g. "2026-10-15" (October 1-15, 2026)
  memberId: string;
  memberName: string;
  deductionType: DeductionType;
  expectedAmount: number;
  obligationRef: string;
  status: 'Scheduled' | 'Flagged for Review';
  createdAt: string;
}

export type RemittanceStatus = 
  | 'VALID'
  | 'AMOUNT_MISMATCH'
  | 'MISSING_MEMBER'
  | 'UNMATCHED_DEDUCTION'
  | 'INACTIVE_MEMBER'
  | 'DUPLICATE_REFERENCE';

export interface RemittanceRecord {
  id: string;
  memberId: string;
  memberName: string;
  payrollPeriod: string;
  deductionType: string;
  expectedAmount: number;
  actualRemittedAmount: number;
  variance: number;
  reference: string;
  status: RemittanceStatus;
  exceptionReason?: string;
  isDuplicate?: boolean;
}

export interface PayrollBatch {
  id: string;
  batchRef: string; // e.g. "PR-2026-10-15-B1"
  payrollPeriod: string;
  recordCount: number;
  validCount: number;
  exceptionCount: number;
  expectedTotal: number;
  remittedTotal: number;
  varianceTotal: number;
  status: 'Draft' | 'Validated' | 'Exceptions Flagged' | 'Ready for Collection Processing' | 'Posted';
  uploader: string;
  timestamp: string;
  records: RemittanceRecord[];
  notes?: string;
}

export const CONFIGURED_PERIODS = [
  'October 1–15, 2026',
  'October 16–31, 2026',
  'September 16–30, 2026',
  'September 1–15, 2026'
];

export const INITIAL_SCHEDULES: DeductionSchedule[] = [
  {
    id: 'SCH-2026-001',
    payrollPeriod: 'October 1–15, 2026',
    memberId: 'MEM-2026-1',
    memberName: 'Juan Dela Cruz',
    deductionType: 'Regular Loan Amortization',
    expectedAmount: 2500,
    obligationRef: 'RL-2026-01',
    status: 'Scheduled',
    createdAt: '2026-10-01'
  },
  {
    id: 'SCH-2026-002',
    payrollPeriod: 'October 1–15, 2026',
    memberId: 'MEM-2026-1',
    memberName: 'Juan Dela Cruz',
    deductionType: 'Annual Membership Dues',
    expectedAmount: 500,
    obligationRef: 'DUES-2026',
    status: 'Scheduled',
    createdAt: '2026-10-01'
  },
  {
    id: 'SCH-2026-003',
    payrollPeriod: 'October 1–15, 2026',
    memberId: 'MEM-2026-2',
    memberName: 'Maria Clara',
    deductionType: 'Emergency Loan Amortization',
    expectedAmount: 1800,
    obligationRef: 'CAL-2026-04',
    status: 'Scheduled',
    createdAt: '2026-10-01'
  },
  {
    id: 'SCH-2026-004',
    payrollPeriod: 'October 1–15, 2026',
    memberId: 'MEM-2026-2',
    memberName: 'Maria Clara',
    deductionType: 'Share Capital Contribution',
    expectedAmount: 1000,
    obligationRef: 'CAP-2026',
    status: 'Scheduled',
    createdAt: '2026-10-01'
  },
  {
    id: 'SCH-2026-005',
    payrollPeriod: 'October 1–15, 2026',
    memberId: 'MEM-2026-3',
    memberName: 'Jose Rizal',
    deductionType: 'Educational Loan Amortization',
    expectedAmount: 3200,
    obligationRef: 'EL-90',
    status: 'Scheduled',
    createdAt: '2026-10-01'
  },
  {
    id: 'SCH-2026-006',
    payrollPeriod: 'October 1–15, 2026',
    memberId: 'MEM-2026-4',
    memberName: 'Andres Bonifacio',
    deductionType: 'Regular Loan Amortization',
    expectedAmount: 2000,
    obligationRef: 'LIV-2026-88',
    status: 'Scheduled',
    createdAt: '2026-10-01'
  },
  {
    id: 'SCH-2026-007',
    payrollPeriod: 'October 1–15, 2026',
    memberId: 'MEM-2026-6',
    memberName: 'Apolinario Mabini',
    deductionType: 'Regular Loan Amortization',
    expectedAmount: 1250,
    obligationRef: 'APP-2026-12',
    status: 'Scheduled',
    createdAt: '2026-10-01'
  },
  {
    id: 'SCH-2026-008',
    payrollPeriod: 'October 1–15, 2026',
    memberId: 'MEM-2026-7',
    memberName: 'Melchora Aquino',
    deductionType: 'Emergency Loan Amortization',
    expectedAmount: 1100,
    obligationRef: 'MED-2026-03',
    status: 'Scheduled',
    createdAt: '2026-10-01'
  },
  {
    id: 'SCH-2026-009',
    payrollPeriod: 'October 1–15, 2026',
    memberId: 'MEM-2026-7',
    memberName: 'Melchora Aquino',
    deductionType: 'Bereavement Assistance Levy',
    expectedAmount: 400,
    obligationRef: 'BAL-2026',
    status: 'Scheduled',
    createdAt: '2026-10-01'
  }
];

export const INITIAL_BATCHES: PayrollBatch[] = [
  {
    id: 'BAT-2026-09B',
    batchRef: 'PR-2026-09-30-01',
    payrollPeriod: 'September 16–30, 2026',
    recordCount: 8,
    validCount: 8,
    exceptionCount: 0,
    expectedTotal: 13750,
    remittedTotal: 13750,
    varianceTotal: 0,
    status: 'Ready for Collection Processing',
    uploader: 'Maria Santos (Collecting Officer)',
    timestamp: '2026-09-30 16:45:00',
    records: [
      {
        id: 'rec-09b-1',
        memberId: 'MEM-2026-1',
        memberName: 'Juan Dela Cruz',
        payrollPeriod: 'September 16–30, 2026',
        deductionType: 'Regular Loan Amortization',
        expectedAmount: 2500,
        actualRemittedAmount: 2500,
        variance: 0,
        reference: 'REM-2026-09-101',
        status: 'VALID'
      },
      {
        id: 'rec-09b-2',
        memberId: 'MEM-2026-2',
        memberName: 'Maria Clara',
        payrollPeriod: 'September 16–30, 2026',
        deductionType: 'Emergency Loan Amortization',
        expectedAmount: 1800,
        actualRemittedAmount: 1800,
        variance: 0,
        reference: 'REM-2026-09-102',
        status: 'VALID'
      },
      {
        id: 'rec-09b-3',
        memberId: 'MEM-2026-3',
        memberName: 'Jose Rizal',
        payrollPeriod: 'September 16–30, 2026',
        deductionType: 'Educational Loan Amortization',
        expectedAmount: 3200,
        actualRemittedAmount: 3200,
        variance: 0,
        reference: 'REM-2026-09-103',
        status: 'VALID'
      },
      {
        id: 'rec-09b-4',
        memberId: 'MEM-2026-4',
        memberName: 'Andres Bonifacio',
        payrollPeriod: 'September 16–30, 2026',
        deductionType: 'Regular Loan Amortization',
        expectedAmount: 2000,
        actualRemittedAmount: 2000,
        variance: 0,
        reference: 'REM-2026-09-104',
        status: 'VALID'
      },
      {
        id: 'rec-09b-5',
        memberId: 'MEM-2026-6',
        memberName: 'Apolinario Mabini',
        payrollPeriod: 'September 16–30, 2026',
        deductionType: 'Regular Loan Amortization',
        expectedAmount: 1250,
        actualRemittedAmount: 1250,
        variance: 0,
        reference: 'REM-2026-09-105',
        status: 'VALID'
      },
      {
        id: 'rec-09b-6',
        memberId: 'MEM-2026-7',
        memberName: 'Melchora Aquino',
        payrollPeriod: 'September 16–30, 2026',
        deductionType: 'Emergency Loan Amortization',
        expectedAmount: 1100,
        actualRemittedAmount: 1100,
        variance: 0,
        reference: 'REM-2026-09-106',
        status: 'VALID'
      },
      {
        id: 'rec-09b-7',
        memberId: 'MEM-2026-1',
        memberName: 'Juan Dela Cruz',
        payrollPeriod: 'September 16–30, 2026',
        deductionType: 'Annual Membership Dues',
        expectedAmount: 500,
        actualRemittedAmount: 500,
        variance: 0,
        reference: 'REM-2026-09-107',
        status: 'VALID'
      },
      {
        id: 'rec-09b-8',
        memberId: 'MEM-2026-7',
        memberName: 'Melchora Aquino',
        payrollPeriod: 'September 16–30, 2026',
        deductionType: 'Bereavement Assistance Levy',
        expectedAmount: 400,
        actualRemittedAmount: 400,
        variance: 0,
        reference: 'REM-2026-09-108',
        status: 'VALID'
      }
    ]
  }
];

const SCHEDULES_KEY = 'fms_payroll_schedules_v4';
const BATCHES_KEY = 'fms_payroll_batches_v4';

export function getStoredSchedules(): DeductionSchedule[] {
  if (typeof window === 'undefined') return INITIAL_SCHEDULES;
  try {
    const raw = localStorage.getItem(SCHEDULES_KEY);
    if (!raw) {
      localStorage.setItem(SCHEDULES_KEY, JSON.stringify(INITIAL_SCHEDULES));
      return INITIAL_SCHEDULES;
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : INITIAL_SCHEDULES;
  } catch {
    return INITIAL_SCHEDULES;
  }
}

export function saveStoredSchedules(schedules: DeductionSchedule[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(SCHEDULES_KEY, JSON.stringify(schedules));
  } catch (err) {
    console.error('Failed to save schedules', err);
  }
}

export function getStoredBatches(): PayrollBatch[] {
  if (typeof window === 'undefined') return INITIAL_BATCHES;
  try {
    const raw = localStorage.getItem(BATCHES_KEY);
    if (!raw) {
      localStorage.setItem(BATCHES_KEY, JSON.stringify(INITIAL_BATCHES));
      return INITIAL_BATCHES;
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : INITIAL_BATCHES;
  } catch {
    return INITIAL_BATCHES;
  }
}

export function saveStoredBatches(batches: PayrollBatch[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(BATCHES_KEY, JSON.stringify(batches));
  } catch (err) {
    console.error('Failed to save batches', err);
  }
}

/**
 * Validates a new Deduction Schedule entry (User Stories 2, 3, 4, 5, 6)
 */
export function validateDeductionSchedule(
  data: {
    payrollPeriod: string;
    memberId: string;
    deductionType: string;
    amount: string | number;
  },
  existingSchedules: DeductionSchedule[]
): {
  isValid: boolean;
  errors: Record<string, string>;
  member?: MemberRecord;
  obligationRef?: string;
  status: 'Scheduled' | 'Flagged for Review';
} {
  const errors: Record<string, string> = {};

  // User Story 2: Required-field validation
  if (!data.payrollPeriod || !data.payrollPeriod.trim()) {
    errors.payrollPeriod = 'Payroll period is mandatory.';
  }

  const cleanMemId = (data.memberId || '').trim().toUpperCase();
  if (!cleanMemId) {
    errors.memberId = 'Member ID is mandatory.';
  }

  if (!data.deductionType || !data.deductionType.trim()) {
    errors.deductionType = 'Deduction type is mandatory.';
  }

  // User Story 3: Amount validation (> 0)
  const numAmount = Number(data.amount);
  if (isNaN(numAmount) || numAmount <= 0) {
    errors.amount = 'Deduction amount must be a numeric value greater than zero.';
  }

  // User Story 4: Select from configured deduction types
  if (data.deductionType && !CONFIGURED_DEDUCTION_TYPES.includes(data.deductionType as DeductionType)) {
    errors.deductionType = 'Invalid deduction type. Please select from configured values.';
  }

  // User Story 5: Validate member reference
  let member: MemberRecord | undefined;
  if (cleanMemId) {
    member = CONFIGURED_MEMBERS_MASTER[cleanMemId];
    if (!member) {
      errors.memberId = `Member ID "${cleanMemId}" not found in master records.`;
    } else if (member.status === 'INACTIVE') {
      errors.memberId = `Member "${member.name}" is INACTIVE. Deductions cannot be scheduled.`;
    }
  }

  // User Story 6: Applicable obligation reference
  let obligationRef = '';
  let status: 'Scheduled' | 'Flagged for Review' = 'Scheduled';

  if (member && member.status === 'ACTIVE') {
    const matchedObligation = member.obligations.find(
      ob => ob.deductionType === data.deductionType
    );
    if (matchedObligation) {
      obligationRef = matchedObligation.obligationRef;
    } else {
      // If none exists, the record must be flagged for review per criteria
      obligationRef = 'UNASSIGNED-REVIEW';
      status = 'Flagged for Review';
    }
  }

  // Duplicate check within same payroll period
  if (cleanMemId && data.deductionType && data.payrollPeriod) {
    const isDuplicate = existingSchedules.some(
      s => s.payrollPeriod === data.payrollPeriod &&
           s.memberId === cleanMemId &&
           s.deductionType === data.deductionType
    );
    if (isDuplicate) {
      errors.deductionType = `A deduction for ${data.deductionType} is already scheduled for ${cleanMemId} in ${data.payrollPeriod}.`;
    }
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
    member,
    obligationRef,
    status
  };
}

/**
 * Standard CSV Template for Payroll Remittance upload
 */
export const SAMPLE_REMITTANCE_CSV = `Member ID,Remitted Amount,Deduction Type,Payroll Period,Reference
MEM-2026-1,2500,Regular Loan Amortization,October 1–15, 2026,REM-2026-10-001
MEM-2026-1,500,Annual Membership Dues,October 1–15, 2026,REM-2026-10-002
MEM-2026-2,1800,Emergency Loan Amortization,October 1–15, 2026,REM-2026-10-003
MEM-2026-2,1000,Share Capital Contribution,October 1–15, 2026,REM-2026-10-004
MEM-2026-3,2800,Educational Loan Amortization,October 1–15, 2026,REM-2026-10-005
MEM-2026-4,2000,Regular Loan Amortization,October 1–15, 2026,REM-2026-10-006
MEM-2026-6,1250,Regular Loan Amortization,October 1–15, 2026,REM-2026-10-007
MEM-2026-7,1100,Emergency Loan Amortization,October 1–15, 2026,REM-2026-10-008
MEM-2026-7,400,Bereavement Assistance Levy,October 1–15, 2026,REM-2026-10-009`;
