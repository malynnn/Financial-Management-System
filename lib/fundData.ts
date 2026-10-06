/**
 * Comprehensive Fund Management Data Layer & Shared State
 * Implements Sprint 3 requirements:
 * - Admin Fund Dashboard & Creation (Stories 1, 2, 3, 11)
 * - Collecting Officer Fund Inflows (Story 4)
 * - Disbursing Officer Fund Outflows & Balance Checks (Stories 5, 6)
 * - Auditor Ledger, Lineage Traceability & Balance Equation Breakdown (Stories 7, 8, 9, 10, 12)
 */

export interface Fund {
  id: string;
  name: string;
  code: string;
  description: string;
  openingBalance: number;
  targetUtilization: number;
  status: 'Active' | 'Inactive';
  createdAt: string;
}

export type MovementDirection = 'INFLOW' | 'OUTFLOW' | 'OPENING';
export type MovementType = 'Inflow (Collection)' | 'Outflow (Disbursement)' | 'Opening Balance';
export type SourceModule = 'Collection' | 'Disbursement' | 'System Initial' | 'Admin Opening Adjustment';

export interface FundTransaction {
  id: string;
  fundId: string;
  fundName: string;
  fundCode: string;
  direction: MovementDirection;
  type: MovementType;
  amount: number;
  date: string;
  timestamp: string;
  status: 'Posted' | 'Pending';
  sourceModule: SourceModule;
  sourceRef: string;
  payeeOrPayer: string;
  particulars: string;
  paymentMethod: string;
}

export interface FundBreakdown {
  fundId: string;
  fundName: string;
  fundCode: string;
  openingBalance: number;
  totalPostedInflows: number;
  totalPostedOutflows: number;
  netMovement: number;
  currentBalance: number;
  pendingInflows: number;
  pendingOutflows: number;
  availableBalance: number;
  status: 'Active' | 'Inactive';
  targetUtilization: number;
  isReconciled: boolean;
}

export const INITIAL_FUNDS: Fund[] = [
  {
    id: 'FND-001',
    name: 'Union Fund',
    code: 'UNF',
    description: 'Core operational fund dedicated to union membership activities, governance, and conventions.',
    openingBalance: 400000,
    targetUtilization: 80,
    status: 'Active',
    createdAt: '2026-01-01'
  },
  {
    id: 'FND-002',
    name: 'General Fund',
    code: 'GEN',
    description: 'Unrestricted treasury assets utilized for general administrative, operating, and utility overhead.',
    openingBalance: 200000,
    targetUtilization: 75,
    status: 'Active',
    createdAt: '2026-01-01'
  },
  {
    id: 'FND-003',
    name: 'Death Assistance Fund',
    code: 'DAF',
    description: 'Restricted reserve earmarked exclusively for member bereavement and immediate family funeral support.',
    openingBalance: 120000,
    targetUtilization: 50,
    status: 'Active',
    createdAt: '2026-01-01'
  },
  {
    id: 'FND-005',
    name: 'Loan Fund',
    code: 'LNF',
    description: 'Revolving capital credit facility providing livelihood, emergency, and appliance financing to members.',
    openingBalance: 700000,
    targetUtilization: 90,
    status: 'Active',
    createdAt: '2026-01-01'
  },
  {
    id: 'FND-006',
    name: 'Calamity Fund',
    code: 'CAL',
    description: 'Special emergency contingency reserves dedicated to disaster response and typhoon recovery grants.',
    openingBalance: 250000,
    targetUtilization: 60,
    status: 'Active',
    createdAt: '2026-01-01'
  },
  {
    id: 'FND-008',
    name: 'Legal Defense Fund',
    code: 'LDF',
    description: 'Retainer reserve for union counsel, collective bargaining litigation, and arbitration disputes.',
    openingBalance: 95000,
    targetUtilization: 30,
    status: 'Inactive',
    createdAt: '2026-01-01'
  }
];

export const INITIAL_TRANSACTIONS: FundTransaction[] = [
  // --- Opening Balances (Audited Inception Baselines) ---
  {
    id: 'FTX-2026-0001',
    fundId: 'FND-001',
    fundName: 'Union Fund',
    fundCode: 'UNF',
    direction: 'OPENING',
    type: 'Opening Balance',
    amount: 400000,
    date: '2026-01-01',
    timestamp: '2026-01-01 08:00:00',
    status: 'Posted',
    sourceModule: 'System Initial',
    sourceRef: 'SYS-INIT-UNF',
    payeeOrPayer: 'Foundational General Assembly Allocation',
    particulars: 'Recorded opening balance baseline for Union Fund FY 2026.',
    paymentMethod: 'Bank Transfer'
  },
  {
    id: 'FTX-2026-0002',
    fundId: 'FND-002',
    fundName: 'General Fund',
    fundCode: 'GEN',
    direction: 'OPENING',
    type: 'Opening Balance',
    amount: 200000,
    date: '2026-01-01',
    timestamp: '2026-01-01 08:00:00',
    status: 'Posted',
    sourceModule: 'System Initial',
    sourceRef: 'SYS-INIT-GEN',
    payeeOrPayer: 'Treasury Board Resolution #01-2026',
    particulars: 'Recorded opening balance baseline for General Fund FY 2026.',
    paymentMethod: 'Bank Transfer'
  },
  {
    id: 'FTX-2026-0003',
    fundId: 'FND-003',
    fundName: 'Death Assistance Fund',
    fundCode: 'DAF',
    direction: 'OPENING',
    type: 'Opening Balance',
    amount: 120000,
    date: '2026-01-01',
    timestamp: '2026-01-01 08:00:00',
    status: 'Posted',
    sourceModule: 'System Initial',
    sourceRef: 'SYS-INIT-DAF',
    payeeOrPayer: 'Bereavement Reserve Mandate',
    particulars: 'Recorded opening balance baseline for Death Assistance Fund.',
    paymentMethod: 'Bank Transfer'
  },
  {
    id: 'FTX-2026-0004',
    fundId: 'FND-005',
    fundName: 'Loan Fund',
    fundCode: 'LNF',
    direction: 'OPENING',
    type: 'Opening Balance',
    amount: 700000,
    date: '2026-01-01',
    timestamp: '2026-01-01 08:00:00',
    status: 'Posted',
    sourceModule: 'System Initial',
    sourceRef: 'SYS-INIT-LNF',
    payeeOrPayer: 'Credit Committee Allocation',
    particulars: 'Recorded opening balance baseline for Member Loan Facility.',
    paymentMethod: 'Bank Transfer'
  },
  {
    id: 'FTX-2026-0005',
    fundId: 'FND-006',
    fundName: 'Calamity Fund',
    fundCode: 'CAL',
    direction: 'OPENING',
    type: 'Opening Balance',
    amount: 250000,
    date: '2026-01-01',
    timestamp: '2026-01-01 08:00:00',
    status: 'Posted',
    sourceModule: 'System Initial',
    sourceRef: 'SYS-INIT-CAL',
    payeeOrPayer: 'Disaster Relief Fund Carryover',
    particulars: 'Recorded opening balance baseline for Calamity Assistance Fund.',
    paymentMethod: 'Bank Transfer'
  },

  // --- Collection Inflows (Story 4 & Story 8 & Story 9) ---
  {
    id: 'FTX-2026-0101',
    fundId: 'FND-001',
    fundName: 'Union Fund',
    fundCode: 'UNF',
    direction: 'INFLOW',
    type: 'Inflow (Collection)',
    amount: 65000,
    date: '2026-09-05',
    timestamp: '2026-09-05 10:15:22',
    status: 'Posted',
    sourceModule: 'Collection',
    sourceRef: 'COL-2026-0012',
    payeeOrPayer: 'Juan Dela Cruz & 12 Members',
    particulars: 'Monthly Union Dues remittance for September 2026 (Batched).',
    paymentMethod: 'Bank Transfer'
  },
  {
    id: 'FTX-2026-0102',
    fundId: 'FND-005',
    fundName: 'Loan Fund',
    fundCode: 'LNF',
    direction: 'INFLOW',
    type: 'Inflow (Collection)',
    amount: 185000,
    date: '2026-09-12',
    timestamp: '2026-09-12 14:30:45',
    status: 'Posted',
    sourceModule: 'Collection',
    sourceRef: 'COL-2026-0038',
    payeeOrPayer: 'Payroll Automated Deduction Batch #24',
    particulars: 'Repayment installments on active regular loans.',
    paymentMethod: 'Bank Transfer'
  },
  {
    id: 'FTX-2026-0103',
    fundId: 'FND-003',
    fundName: 'Death Assistance Fund',
    fundCode: 'DAF',
    direction: 'INFLOW',
    type: 'Inflow (Collection)',
    amount: 35000,
    date: '2026-09-15',
    timestamp: '2026-09-15 11:20:10',
    status: 'Posted',
    sourceModule: 'Collection',
    sourceRef: 'COL-2026-0045',
    payeeOrPayer: 'General Membership Assessment',
    particulars: 'Bereavement contribution top-up levy per constitution.',
    paymentMethod: 'Over-the-Counter'
  },
  {
    id: 'FTX-2026-0104',
    fundId: 'FND-002',
    fundName: 'General Fund',
    fundCode: 'GEN',
    direction: 'INFLOW',
    type: 'Inflow (Collection)',
    amount: 55000,
    date: '2026-09-18',
    timestamp: '2026-09-18 16:05:00',
    status: 'Posted',
    sourceModule: 'Collection',
    sourceRef: 'COL-2026-0059',
    payeeOrPayer: 'Maria Clara',
    particulars: 'Union multipurpose hall rental & event fee collection.',
    paymentMethod: 'GCash'
  },
  {
    id: 'FTX-2026-0105',
    fundId: 'FND-006',
    fundName: 'Calamity Fund',
    fundCode: 'CAL',
    direction: 'INFLOW',
    type: 'Inflow (Collection)',
    amount: 60000,
    date: '2026-09-20',
    timestamp: '2026-09-20 09:42:15',
    status: 'Posted',
    sourceModule: 'Collection',
    sourceRef: 'COL-2026-0063',
    payeeOrPayer: 'Federation Disaster Relief Grant',
    particulars: 'Annual calamity subsidy grant received from National Union.',
    paymentMethod: 'Bank Transfer'
  },
  {
    id: 'FTX-2026-0106',
    fundId: 'FND-001',
    fundName: 'Union Fund',
    fundCode: 'UNF',
    direction: 'INFLOW',
    type: 'Inflow (Collection)',
    amount: 40000,
    date: '2026-09-25',
    timestamp: '2026-09-25 15:10:33',
    status: 'Posted',
    sourceModule: 'Collection',
    sourceRef: 'COL-2026-0078',
    payeeOrPayer: 'Jose Rizal & 8 Members',
    particulars: 'Special educational fund collection and annual dues.',
    paymentMethod: 'Maya'
  },

  // --- Disbursement Outflows (Story 5 & Story 8 & Story 9) ---
  {
    id: 'FTX-2026-0201',
    fundId: 'FND-001',
    fundName: 'Union Fund',
    fundCode: 'UNF',
    direction: 'OUTFLOW',
    type: 'Outflow (Disbursement)',
    amount: 45000,
    date: '2026-09-08',
    timestamp: '2026-09-08 13:40:00',
    status: 'Posted',
    sourceModule: 'Disbursement',
    sourceRef: 'DV-2026-0812',
    payeeOrPayer: 'National Labor Federation',
    particulars: 'Annual affiliation dues and legal convention delegate kits.',
    paymentMethod: 'Cheque'
  },
  {
    id: 'FTX-2026-0202',
    fundId: 'FND-002',
    fundName: 'General Fund',
    fundCode: 'GEN',
    direction: 'OUTFLOW',
    type: 'Outflow (Disbursement)',
    amount: 32000,
    date: '2026-09-14',
    timestamp: '2026-09-14 10:18:20',
    status: 'Posted',
    sourceModule: 'Disbursement',
    sourceRef: 'DV-2026-0845',
    payeeOrPayer: 'Manila Electric Company & Telecom',
    particulars: 'Headquarters electric power & fiber optic connectivity settlement.',
    paymentMethod: 'Bank Transfer'
  },
  {
    id: 'FTX-2026-0203',
    fundId: 'FND-003',
    fundName: 'Death Assistance Fund',
    fundCode: 'DAF',
    direction: 'OUTFLOW',
    type: 'Outflow (Disbursement)',
    amount: 25000,
    date: '2026-09-17',
    timestamp: '2026-09-17 14:11:05',
    status: 'Posted',
    sourceModule: 'Disbursement',
    sourceRef: 'DV-2026-0862',
    payeeOrPayer: 'Heirs of Roberto Santos',
    particulars: 'Bereavement assistance disbursement per Board Resolution #44.',
    paymentMethod: 'Cheque'
  },
  {
    id: 'FTX-2026-0204',
    fundId: 'FND-005',
    fundName: 'Loan Fund',
    fundCode: 'LNF',
    direction: 'OUTFLOW',
    type: 'Outflow (Disbursement)',
    amount: 150000,
    date: '2026-09-22',
    timestamp: '2026-09-22 16:50:30',
    status: 'Posted',
    sourceModule: 'Disbursement',
    sourceRef: 'DV-2026-0891',
    payeeOrPayer: 'Andres Bonifacio',
    particulars: 'Livelihood & emergency agricultural loan release #RL-2026-88.',
    paymentMethod: 'Bank Transfer'
  },
  {
    id: 'FTX-2026-0205',
    fundId: 'FND-006',
    fundName: 'Calamity Fund',
    fundCode: 'CAL',
    direction: 'OUTFLOW',
    type: 'Outflow (Disbursement)',
    amount: 40000,
    date: '2026-09-26',
    timestamp: '2026-09-26 11:35:10',
    status: 'Posted',
    sourceModule: 'Disbursement',
    sourceRef: 'DV-2026-0904',
    payeeOrPayer: 'Philippine Red Cross Emergency Relief',
    particulars: 'Emergency typhoon relief rations for 40 affected members.',
    paymentMethod: 'Cheque'
  },
  {
    id: 'FTX-2026-0206',
    fundId: 'FND-005',
    fundName: 'Loan Fund',
    fundCode: 'LNF',
    direction: 'OUTFLOW',
    type: 'Outflow (Disbursement)',
    amount: 48000,
    date: '2026-09-29',
    timestamp: '2026-09-29 09:20:00',
    status: 'Posted',
    sourceModule: 'Disbursement',
    sourceRef: 'DV-2026-0925',
    payeeOrPayer: 'Apolinario Mabini',
    particulars: 'Appliance & technology loan release.',
    paymentMethod: 'Cash Voucher'
  },

  // --- Pending Items (Unposted) ---
  {
    id: 'FTX-2026-0301',
    fundId: 'FND-001',
    fundName: 'Union Fund',
    fundCode: 'UNF',
    direction: 'INFLOW',
    type: 'Inflow (Collection)',
    amount: 15000,
    date: '2026-10-02',
    timestamp: '2026-10-02 11:00:00',
    status: 'Pending',
    sourceModule: 'Collection',
    sourceRef: 'COL-2026-0099',
    payeeOrPayer: 'Emilio Jacinto',
    particulars: 'Pending bank clearance for membership dues.',
    paymentMethod: 'Bank Transfer'
  },
  {
    id: 'FTX-2026-0302',
    fundId: 'FND-005',
    fundName: 'Loan Fund',
    fundCode: 'LNF',
    direction: 'OUTFLOW',
    type: 'Outflow (Disbursement)',
    amount: 30000,
    date: '2026-10-04',
    timestamp: '2026-10-04 15:45:00',
    status: 'Pending',
    sourceModule: 'Disbursement',
    sourceRef: 'DV-2026-0950',
    payeeOrPayer: 'Melchora Aquino',
    particulars: 'Approved loan pending final cheque clearance & disbursement release.',
    paymentMethod: 'Cheque'
  }
];

const FUNDS_STORAGE_KEY = 'fms_funds_master_v3';
const TXNS_STORAGE_KEY = 'fms_fund_transactions_v3';

export function getStoredFunds(): Fund[] {
  if (typeof window === 'undefined') return INITIAL_FUNDS;
  try {
    const raw = localStorage.getItem(FUNDS_STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(FUNDS_STORAGE_KEY, JSON.stringify(INITIAL_FUNDS));
      return INITIAL_FUNDS;
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : INITIAL_FUNDS;
  } catch (err) {
    return INITIAL_FUNDS;
  }
}

export function saveStoredFunds(funds: Fund[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(FUNDS_STORAGE_KEY, JSON.stringify(funds));
  } catch (err) {
    console.error('Failed to save funds to storage', err);
  }
}

export function getStoredTransactions(): FundTransaction[] {
  if (typeof window === 'undefined') return INITIAL_TRANSACTIONS;
  try {
    const raw = localStorage.getItem(TXNS_STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(TXNS_STORAGE_KEY, JSON.stringify(INITIAL_TRANSACTIONS));
      return INITIAL_TRANSACTIONS;
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : INITIAL_TRANSACTIONS;
  } catch (err) {
    return INITIAL_TRANSACTIONS;
  }
}

export function saveStoredTransactions(txns: FundTransaction[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(TXNS_STORAGE_KEY, JSON.stringify(txns));
  } catch (err) {
    console.error('Failed to save transactions to storage', err);
  }
}

/**
 * Calculates the exact audited 4-part balance breakdown:
 * Current Balance = Opening Balance + Total Posted Inflows - Total Posted Outflows
 */
export function calculateFundBreakdown(
  fund: Fund,
  transactions: FundTransaction[]
): FundBreakdown {
  const fundTxns = transactions.filter(t => t.fundId === fund.id || t.fundName === fund.name);

  // Separate recorded opening balance
  const openingBalance = Number(fund.openingBalance || 0);

  // Subsequent posted inflows (Collections)
  const totalPostedInflows = fundTxns
    .filter(t => t.status === 'Posted' && t.direction === 'INFLOW')
    .reduce((sum, t) => sum + Number(t.amount || 0), 0);

  // Subsequent posted outflows (Disbursements)
  const totalPostedOutflows = fundTxns
    .filter(t => t.status === 'Posted' && t.direction === 'OUTFLOW')
    .reduce((sum, t) => sum + Number(t.amount || 0), 0);

  // Pending unposted movements
  const pendingInflows = fundTxns
    .filter(t => t.status === 'Pending' && t.direction === 'INFLOW')
    .reduce((sum, t) => sum + Number(t.amount || 0), 0);

  const pendingOutflows = fundTxns
    .filter(t => t.status === 'Pending' && t.direction === 'OUTFLOW')
    .reduce((sum, t) => sum + Number(t.amount || 0), 0);

  // Audited Formula: Opening + Inflows - Outflows
  const currentBalance = openingBalance + totalPostedInflows - totalPostedOutflows;
  const netMovement = totalPostedInflows - totalPostedOutflows;
  const availableBalance = currentBalance - pendingOutflows;

  return {
    fundId: fund.id,
    fundName: fund.name,
    fundCode: fund.code,
    openingBalance,
    totalPostedInflows,
    totalPostedOutflows,
    netMovement,
    currentBalance,
    pendingInflows,
    pendingOutflows,
    availableBalance,
    status: fund.status,
    targetUtilization: fund.targetUtilization,
    isReconciled: true
  };
}

/**
 * Validates fund code uniqueness (Case-insensitive)
 */
export function validateFundCode(
  code: string,
  existingFunds: Fund[],
  currentFundId?: string | null
): { isValid: boolean; error?: string } {
  const trimmed = code.trim().toUpperCase();
  if (!trimmed) {
    return { isValid: false, error: 'Fund code is required.' };
  }
  if (trimmed.length < 2 || trimmed.length > 4) {
    return { isValid: false, error: 'Fund code must be strictly 2 to 4 characters.' };
  }
  if (!/^[A-Z0-9]+$/.test(trimmed)) {
    return { isValid: false, error: 'Fund code must contain only letters and numbers.' };
  }
  const isDuplicate = existingFunds.some(
    f => f.code.toUpperCase() === trimmed && f.id !== currentFundId
  );
  if (isDuplicate) {
    return {
      isValid: false,
      error: `Duplicate Fund Code: "${trimmed}" is already assigned to an existing fund.`
    };
  }
  return { isValid: true };
}

/**
 * Registers a new fund and generates its baseline opening balance transaction
 */
export function createFundRecord(
  fundData: {
    name: string;
    code: string;
    description: string;
    openingBalance: number;
    targetUtilization: number;
  },
  existingFunds: Fund[],
  existingTxns: FundTransaction[]
): { updatedFunds: Fund[]; updatedTxns: FundTransaction[]; newFund: Fund } {
  const cleanCode = fundData.code.trim().toUpperCase();
  const cleanName = fundData.name.trim();

  const newFund: Fund = {
    id: `FND-${(existingFunds.length + 1).toString().padStart(3, '0')}`,
    name: cleanName,
    code: cleanCode,
    description: fundData.description.trim(),
    openingBalance: Number(fundData.openingBalance) || 0,
    targetUtilization: Number(fundData.targetUtilization) || 75,
    status: 'Active',
    createdAt: new Date().toISOString().split('T')[0]
  };

  const openingTxn: FundTransaction = {
    id: `FTX-${Date.now().toString().slice(-6)}`,
    fundId: newFund.id,
    fundName: newFund.name,
    fundCode: newFund.code,
    direction: 'OPENING',
    type: 'Opening Balance',
    amount: newFund.openingBalance,
    date: newFund.createdAt,
    timestamp: `${newFund.createdAt} 09:00:00`,
    status: 'Posted',
    sourceModule: 'Admin Opening Adjustment',
    sourceRef: `INIT-${cleanCode}`,
    payeeOrPayer: 'Fund Registration Initial Balance',
    particulars: `Recorded starting baseline balance upon fund creation for ${cleanName}.`,
    paymentMethod: 'Bank Transfer'
  };

  const updatedFunds = [newFund, ...existingFunds];
  const updatedTxns = [openingTxn, ...existingTxns];

  saveStoredFunds(updatedFunds);
  saveStoredTransactions(updatedTxns);

  return { updatedFunds, updatedTxns, newFund };
}
