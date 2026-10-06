/**
 * Comprehensive Fund Lifespan Prediction Data Layer & Analytics Engine
 * Implements Sprint 5 Requirements:
 * - Active Fund Selection & Historical Period Validation (Criteria 1 & 2)
 * - Current Balance, Inflows, Outflows & Net Movement (Criteria 3, 4, 5)
 * - Lifespan Prediction, Finite Depletion Date & Remaining Lifespan (Criteria 6, 7, 8)
 * - Projected Balance Trend & Actual vs Predicted Separation (Criteria 9 & 16)
 * - Condition Classification: Stable, Declining, At Risk, Projected to Deplete (Criteria 10)
 * - Data Sufficiency & Confidence / Data Quality (Criteria 11 & 12)
 * - Explainable Input Factors Summary (Criteria 13)
 * - Depletion-Risk Alert Notifications (Criteria 14)
 * - Auditor Read-Only Previous Predictions History & Model Versioning (Criteria 15)
 */

import { Fund, FundTransaction, getStoredFunds, getStoredTransactions } from './fundData';

export type FundCondition = 
  | 'Stable' 
  | 'Declining' 
  | 'At Risk' 
  | 'Projected to Deplete' 
  | 'Insufficient Data';

export interface MonthlyLedgerSummary {
  period: string; // e.g. "2026-04"
  label: string;  // e.g. "Apr 2026"
  inflows: number;
  outflows: number;
  netMovement: number; // inflows - outflows
  actualEndingBalance: number;
  isProjected: boolean;
}

export interface PredictionFactorBreakdown {
  currentBalance: number;
  balanceAsOfDate: string;
  totalHistoricalInflows: number;
  totalHistoricalOutflows: number;
  netMovementTotal: number;
  averageMonthlyBurnRate: number; // positive = net outflow / consumption
  analysisPeriodMonths: number;
  dataQualityScore: number; // 0 - 100%
  dataQualityLabel: 'High' | 'Moderate' | 'Low' | 'Insufficient';
}

export interface LifespanPredictionRecord {
  id: string; // e.g. "PRD-2026-001"
  fundId: string;
  fundCode: string;
  fundName: string;
  generatedAt: string;
  generatedBy: string;
  analysisPeriodStart: string;
  analysisPeriodEnd: string;
  condition: FundCondition;
  hasSufficientData: boolean;
  projectedDepletionDate: string | null; // e.g. "August 2027" or null
  estimatedRemainingLifespanMonths: number | null; // e.g. 10 or null
  remainingLifespanDisplay: string; // e.g. "10 Months", "Sustainable", "Insufficient Data"
  confidenceScore: number; // e.g. 91.5
  confidenceLevel: 'High' | 'Moderate' | 'Low';
  factors: PredictionFactorBreakdown;
  timeSeries: MonthlyLedgerSummary[];
  modelVersion: string; // e.g. "Lifespan-Engine v2.4 (Actuarial Run-Rate)"
  alertActive: boolean;
  alertSummary?: string;
  notes?: string;
}

const PREDICTIONS_STORAGE_KEY = 'fms_lifespan_predictions_v5';

/**
 * Baseline Seed Predictions for demonstration & audit history
 */
export const INITIAL_PREDICTIONS: LifespanPredictionRecord[] = [
  {
    id: 'PRD-2026-101',
    fundId: 'FND-001',
    fundCode: 'UNF',
    fundName: 'Union Fund',
    generatedAt: '2026-10-01 10:15:00',
    generatedBy: 'System AI Engine / Automated Audit Cycle',
    analysisPeriodStart: '2026-04-01',
    analysisPeriodEnd: '2026-09-30',
    condition: 'Stable',
    hasSufficientData: true,
    projectedDepletionDate: null,
    estimatedRemainingLifespanMonths: null,
    remainingLifespanDisplay: 'Sustainable / Indefinite',
    confidenceScore: 94.2,
    confidenceLevel: 'High',
    factors: {
      currentBalance: 500000,
      balanceAsOfDate: '2026-10-01',
      totalHistoricalInflows: 185000,
      totalHistoricalOutflows: 120000,
      netMovementTotal: 65000,
      averageMonthlyBurnRate: -10833, // net accumulation
      analysisPeriodMonths: 6,
      dataQualityScore: 96,
      dataQualityLabel: 'High',
    },
    timeSeries: [
      { period: '2026-04', label: 'Apr 2026', inflows: 30000, outflows: 20000, netMovement: 10000, actualEndingBalance: 445000, isProjected: false },
      { period: '2026-05', label: 'May 2026', inflows: 32000, outflows: 21000, netMovement: 11000, actualEndingBalance: 456000, isProjected: false },
      { period: '2026-06', label: 'Jun 2026', inflows: 28000, outflows: 18000, netMovement: 10000, actualEndingBalance: 466000, isProjected: false },
      { period: '2026-07', label: 'Jul 2026', inflows: 31000, outflows: 20000, netMovement: 11000, actualEndingBalance: 477000, isProjected: false },
      { period: '2026-08', label: 'Aug 2026', inflows: 31000, outflows: 22000, netMovement: 9000, actualEndingBalance: 486000, isProjected: false },
      { period: '2026-09', label: 'Sep 2026', inflows: 33000, outflows: 19000, netMovement: 14000, actualEndingBalance: 500000, isProjected: false },
      { period: '2026-10', label: 'Oct 2026 (Est)', inflows: 31000, outflows: 20000, netMovement: 11000, actualEndingBalance: 511000, isProjected: true },
      { period: '2026-11', label: 'Nov 2026 (Est)', inflows: 31000, outflows: 20000, netMovement: 11000, actualEndingBalance: 522000, isProjected: true },
      { period: '2026-12', label: 'Dec 2026 (Est)', inflows: 31000, outflows: 20000, netMovement: 11000, actualEndingBalance: 533000, isProjected: true },
    ],
    modelVersion: 'Lifespan-Engine v2.4 (Actuarial Run-Rate)',
    alertActive: false,
    notes: 'Healthy reserve surplus driven by regular member dues and positive monthly cashflows.',
  },
  {
    id: 'PRD-2026-102',
    fundId: 'FND-003',
    fundCode: 'DAF',
    fundName: 'Death Assistance Fund',
    generatedAt: '2026-10-02 14:30:00',
    generatedBy: 'System AI Engine / Automated Audit Cycle',
    analysisPeriodStart: '2026-04-01',
    analysisPeriodEnd: '2026-09-30',
    condition: 'Projected to Deplete',
    hasSufficientData: true,
    projectedDepletionDate: 'December 2026',
    estimatedRemainingLifespanMonths: 2.5,
    remainingLifespanDisplay: '2.5 Months',
    confidenceScore: 89.0,
    confidenceLevel: 'High',
    factors: {
      currentBalance: 150000,
      balanceAsOfDate: '2026-10-01',
      totalHistoricalInflows: 60000,
      totalHistoricalOutflows: 240000,
      netMovementTotal: -180000,
      averageMonthlyBurnRate: 60000, // consumes 60k/month
      analysisPeriodMonths: 6,
      dataQualityScore: 92,
      dataQualityLabel: 'High',
    },
    timeSeries: [
      { period: '2026-04', label: 'Apr 2026', inflows: 10000, outflows: 45000, netMovement: -35000, actualEndingBalance: 300000, isProjected: false },
      { period: '2026-05', label: 'May 2026', inflows: 10000, outflows: 45000, netMovement: -35000, actualEndingBalance: 265000, isProjected: false },
      { period: '2026-06', label: 'Jun 2026', inflows: 10000, outflows: 40000, netMovement: -30000, actualEndingBalance: 235000, isProjected: false },
      { period: '2026-07', label: 'Jul 2026', inflows: 10000, outflows: 35000, netMovement: -25000, actualEndingBalance: 210000, isProjected: false },
      { period: '2026-08', label: 'Aug 2026', inflows: 10000, outflows: 40000, netMovement: -30000, actualEndingBalance: 180000, isProjected: false },
      { period: '2026-09', label: 'Sep 2026', inflows: 10000, outflows: 40000, netMovement: -30000, actualEndingBalance: 150000, isProjected: false },
      { period: '2026-10', label: 'Oct 2026 (Est)', inflows: 10000, outflows: 60000, netMovement: -50000, actualEndingBalance: 100000, isProjected: true },
      { period: '2026-11', label: 'Nov 2026 (Est)', inflows: 10000, outflows: 60000, netMovement: -50000, actualEndingBalance: 50000, isProjected: true },
      { period: '2026-12', label: 'Dec 2026 (Est)', inflows: 10000, outflows: 60000, netMovement: -50000, actualEndingBalance: 0, isProjected: true },
    ],
    modelVersion: 'Lifespan-Engine v2.4 (Actuarial Run-Rate)',
    alertActive: true,
    alertSummary: 'Urgent: Death Assistance Fund will deplete in approximately 2.5 months (projected Dec 2026) due to elevated bereavement claims exceeding premium inflows.',
    notes: 'Recommended action: Schedule auxiliary capital transfer from General Fund or review premium levy.',
  },
  {
    id: 'PRD-2026-103',
    fundId: 'FND-002',
    fundCode: 'GEN',
    fundName: 'General Fund',
    generatedAt: '2026-10-03 16:00:00',
    generatedBy: 'System AI Engine / Automated Audit Cycle',
    analysisPeriodStart: '2026-04-01',
    analysisPeriodEnd: '2026-09-30',
    condition: 'Declining',
    hasSufficientData: true,
    projectedDepletionDate: 'March 2028',
    estimatedRemainingLifespanMonths: 17,
    remainingLifespanDisplay: '17 Months (1.4 Years)',
    confidenceScore: 84.5,
    confidenceLevel: 'High',
    factors: {
      currentBalance: 250000,
      balanceAsOfDate: '2026-10-01',
      totalHistoricalInflows: 80000,
      totalHistoricalOutflows: 170000,
      netMovementTotal: -90000,
      averageMonthlyBurnRate: 15000,
      analysisPeriodMonths: 6,
      dataQualityScore: 88,
      dataQualityLabel: 'High',
    },
    timeSeries: [
      { period: '2026-04', label: 'Apr 2026', inflows: 15000, outflows: 28000, netMovement: -13000, actualEndingBalance: 325000, isProjected: false },
      { period: '2026-05', label: 'May 2026', inflows: 12000, outflows: 30000, netMovement: -18000, actualEndingBalance: 307000, isProjected: false },
      { period: '2026-06', label: 'Jun 2026', inflows: 14000, outflows: 27000, netMovement: -13000, actualEndingBalance: 294000, isProjected: false },
      { period: '2026-07', label: 'Jul 2026', inflows: 13000, outflows: 29000, netMovement: -16000, actualEndingBalance: 278000, isProjected: false },
      { period: '2026-08', label: 'Aug 2026', inflows: 14000, outflows: 26000, netMovement: -12000, actualEndingBalance: 266000, isProjected: false },
      { period: '2026-09', label: 'Sep 2026', inflows: 12000, outflows: 28000, netMovement: -16000, actualEndingBalance: 250000, isProjected: false },
      { period: '2026-10', label: 'Oct 2026 (Est)', inflows: 13000, outflows: 28000, netMovement: -15000, actualEndingBalance: 235000, isProjected: true },
      { period: '2026-11', label: 'Nov 2026 (Est)', inflows: 13000, outflows: 28000, netMovement: -15000, actualEndingBalance: 220000, isProjected: true },
      { period: '2026-12', label: 'Dec 2026 (Est)', inflows: 13000, outflows: 28000, netMovement: -15000, actualEndingBalance: 205000, isProjected: true },
    ],
    modelVersion: 'Lifespan-Engine v2.4 (Actuarial Run-Rate)',
    alertActive: false,
    notes: 'Operational overhead exceeds miscellaneous fee income; manageable in medium term.',
  }
];

export function getStoredPredictions(): LifespanPredictionRecord[] {
  if (typeof window === 'undefined') return INITIAL_PREDICTIONS;
  try {
    const raw = localStorage.getItem(PREDICTIONS_STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(PREDICTIONS_STORAGE_KEY, JSON.stringify(INITIAL_PREDICTIONS));
      return INITIAL_PREDICTIONS;
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : INITIAL_PREDICTIONS;
  } catch {
    return INITIAL_PREDICTIONS;
  }
}

export function saveStoredPredictions(predictions: LifespanPredictionRecord[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(PREDICTIONS_STORAGE_KEY, JSON.stringify(predictions));
  } catch (err) {
    console.error('Failed to save predictions', err);
  }
}

/**
 * Calculates monthly inflow, outflow, and net movements from posted transactions (Criteria 4 & 5)
 */
export function aggregateFundHistoricalMovements(
  fundIdOrCode: string,
  transactions: FundTransaction[],
  startDateStr?: string,
  endDateStr?: string
): {
  monthlySummary: { period: string; label: string; inflows: number; outflows: number; netMovement: number }[];
  totalInflows: number;
  totalOutflows: number;
  netMovementTotal: number;
  hasSufficientData: boolean;
  dataQualityScore: number;
  monthsCount: number;
} {
  const filtered = transactions.filter(t => {
    const matchesFund = t.fundId === fundIdOrCode || t.fundCode === fundIdOrCode || t.fundName === fundIdOrCode;
    if (!matchesFund) return false;
    if (t.status !== 'Posted') return false; // Rule: Posted transactions only
    if (startDateStr && t.date < startDateStr) return false;
    if (endDateStr && t.date > endDateStr) return false;
    return true;
  });

  const monthMap: Record<string, { inflows: number; outflows: number }> = {};

  filtered.forEach(tx => {
    const period = tx.date.slice(0, 7); // "YYYY-MM"
    if (!monthMap[period]) monthMap[period] = { inflows: 0, outflows: 0 };
    if (tx.direction === 'INFLOW' || (tx.type && tx.type.includes('Inflow'))) {
      monthMap[period].inflows += Number(tx.amount || 0);
    } else if (tx.direction === 'OUTFLOW' || (tx.type && tx.type.includes('Outflow'))) {
      monthMap[period].outflows += Number(tx.amount || 0);
    }
  });

  const sortedPeriods = Object.keys(monthMap).sort();
  const monthsCount = sortedPeriods.length;

  let totalInflows = 0;
  let totalOutflows = 0;

  const monthlySummary = sortedPeriods.map(period => {
    const data = monthMap[period];
    totalInflows += data.inflows;
    totalOutflows += data.outflows;
    const net = data.inflows - data.outflows;

    const [year, month] = period.split('-');
    const dateObj = new Date(Number(year), Number(month) - 1, 1);
    const label = dateObj.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });

    return {
      period,
      label,
      inflows: data.inflows,
      outflows: data.outflows,
      netMovement: net,
    };
  });

  // Criteria 11: Minimum data requirements (minimum 3 posted distinct monthly periods)
  const hasSufficientData = monthsCount >= 3;

  // Criteria 12: Data quality score computation
  let dataQualityScore = Math.min(100, Math.round((monthsCount / 6) * 70 + (filtered.length >= 10 ? 30 : filtered.length * 3)));
  if (!hasSufficientData) dataQualityScore = Math.min(45, dataQualityScore);

  return {
    monthlySummary,
    totalInflows,
    totalOutflows,
    netMovementTotal: totalInflows - totalOutflows,
    hasSufficientData,
    dataQualityScore,
    monthsCount,
  };
}

/**
 * Predicts fund lifespan, depletion point, and condition classification (Criteria 6, 7, 8, 10, 11)
 */
export function computeFundLifespanPrediction(
  fund: Fund,
  currentBalance: number,
  historicalData: ReturnType<typeof aggregateFundHistoricalMovements>,
  analysisPeriodStart: string,
  analysisPeriodEnd: string,
  userName: string = 'Financial Officer'
): LifespanPredictionRecord {
  const { hasSufficientData, monthlySummary, totalInflows, totalOutflows, netMovementTotal, monthsCount, dataQualityScore } = historicalData;

  // If minimum data requirements are not met (Criteria 11)
  if (!hasSufficientData || monthsCount === 0) {
    return {
      id: `PRD-${Date.now().toString().slice(-6)}`,
      fundId: fund.id,
      fundCode: fund.code,
      fundName: fund.name,
      generatedAt: new Date().toISOString().replace('T', ' ').slice(0, 19),
      generatedBy: userName,
      analysisPeriodStart,
      analysisPeriodEnd,
      condition: 'Insufficient Data',
      hasSufficientData: false,
      projectedDepletionDate: null,
      estimatedRemainingLifespanMonths: null,
      remainingLifespanDisplay: 'Insufficient Data',
      confidenceScore: dataQualityScore,
      confidenceLevel: 'Low',
      factors: {
        currentBalance,
        balanceAsOfDate: new Date().toISOString().split('T')[0],
        totalHistoricalInflows: totalInflows,
        totalHistoricalOutflows: totalOutflows,
        netMovementTotal,
        averageMonthlyBurnRate: 0,
        analysisPeriodMonths: monthsCount,
        dataQualityScore,
        dataQualityLabel: 'Insufficient',
      },
      timeSeries: [],
      modelVersion: 'Lifespan-Engine v2.4 (Actuarial Run-Rate)',
      alertActive: false,
      notes: 'Insufficient historical posted transactions to establish a statistical trend. Minimum 3 distinct monthly data points required.',
    };
  }

  // Calculate average monthly net burn rate:
  // positive burn rate means fund is losing money (outflow > inflow)
  const averageMonthlyNetFlow = netMovementTotal / monthsCount; // e.g. -25,000 / month
  const averageMonthlyBurnRate = -averageMonthlyNetFlow; // e.g. +25,000 / month consumed

  let condition: FundCondition = 'Stable';
  let projectedDepletionDate: string | null = null;
  let estimatedRemainingLifespanMonths: number | null = null;
  let remainingLifespanDisplay = 'Sustainable / Indefinite';
  let alertActive = false;
  let alertSummary = '';

  if (averageMonthlyBurnRate <= 0) {
    // Net positive or zero: Sustainable
    condition = 'Stable';
    remainingLifespanDisplay = 'Sustainable / Indefinite';
  } else {
    // Net negative: calculates finite depletion point (Criteria 7 & 8)
    const monthsToDepletion = currentBalance / averageMonthlyBurnRate;
    estimatedRemainingLifespanMonths = Math.max(0, Math.round(monthsToDepletion * 10) / 10);

    // Format remaining lifespan display
    if (estimatedRemainingLifespanMonths < 1) {
      remainingLifespanDisplay = 'Less than 1 Month';
    } else if (estimatedRemainingLifespanMonths <= 12) {
      remainingLifespanDisplay = `${estimatedRemainingLifespanMonths} Months`;
    } else {
      const years = (estimatedRemainingLifespanMonths / 12).toFixed(1);
      remainingLifespanDisplay = `${estimatedRemainingLifespanMonths} Months (~${years} Years)`;
    }

    // Projected Depletion Date calculation
    const now = new Date();
    const futureDate = new Date(now.getFullYear(), now.getMonth() + Math.ceil(estimatedRemainingLifespanMonths), 1);
    projectedDepletionDate = futureDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

    // Criteria 10: Condition classification
    if (estimatedRemainingLifespanMonths <= 6) {
      condition = 'Projected to Deplete';
      alertActive = true;
      alertSummary = `Critical: ${fund.name} (${fund.code}) is projected to deplete within ${remainingLifespanDisplay} (Estimated ${projectedDepletionDate}). Current burn rate is ₱${averageMonthlyBurnRate.toLocaleString('en-US', { minimumFractionDigits: 2 })}/month.`;
    } else if (estimatedRemainingLifespanMonths <= 18) {
      condition = 'At Risk';
      alertActive = true;
      alertSummary = `Warning: ${fund.name} (${fund.code}) has an elevated net outflow rate with an estimated remaining lifespan of ${remainingLifespanDisplay}. Action recommended before reserves deplete.`;
    } else {
      condition = 'Declining';
      alertActive = false;
    }
  }

  // Construct combined time series with clear Actual vs Projected separation (Criteria 9 & 16)
  let rollingBal = currentBalance;
  // Historical entries
  let cumBal = currentBalance - netMovementTotal;
  const timeSeries: MonthlyLedgerSummary[] = monthlySummary.map(m => {
    cumBal += m.netMovement;
    return {
      period: m.period,
      label: m.label,
      inflows: m.inflows,
      outflows: m.outflows,
      netMovement: m.netMovement,
      actualEndingBalance: cumBal,
      isProjected: false, // Explicit actual marker
    };
  });

  // Future projected entries (next 6 months)
  const now = new Date();
  let simBalance = currentBalance;
  for (let i = 1; i <= 6; i++) {
    const futureMonth = new Date(now.getFullYear(), now.getMonth() + i, 1);
    const period = `${futureMonth.getFullYear()}-${String(futureMonth.getMonth() + 1).padStart(2, '0')}`;
    const label = `${futureMonth.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })} (Est)`;
    
    // Average projected flows
    const estInflow = Math.max(0, Math.round(totalInflows / monthsCount));
    const estOutflow = Math.max(0, Math.round(totalOutflows / monthsCount));
    const estNet = estInflow - estOutflow;
    simBalance = Math.max(0, simBalance + estNet);

    timeSeries.push({
      period,
      label,
      inflows: estInflow,
      outflows: estOutflow,
      netMovement: estNet,
      actualEndingBalance: simBalance,
      isProjected: true, // Explicit prediction marker
    });
  }

  const confidenceLevel = dataQualityScore >= 80 ? 'High' : dataQualityScore >= 50 ? 'Moderate' : 'Low';

  return {
    id: `PRD-${Date.now().toString().slice(-6)}`,
    fundId: fund.id,
    fundCode: fund.code,
    fundName: fund.name,
    generatedAt: new Date().toISOString().replace('T', ' ').slice(0, 19),
    generatedBy: userName,
    analysisPeriodStart,
    analysisPeriodEnd,
    condition,
    hasSufficientData: true,
    projectedDepletionDate,
    estimatedRemainingLifespanMonths,
    remainingLifespanDisplay,
    confidenceScore: dataQualityScore,
    confidenceLevel,
    factors: {
      currentBalance,
      balanceAsOfDate: new Date().toISOString().split('T')[0],
      totalHistoricalInflows: totalInflows,
      totalHistoricalOutflows: totalOutflows,
      netMovementTotal,
      averageMonthlyBurnRate,
      analysisPeriodMonths: monthsCount,
      dataQualityScore,
      dataQualityLabel: confidenceLevel,
    },
    timeSeries,
    modelVersion: 'Lifespan-Engine v2.4 (Actuarial Run-Rate)',
    alertActive,
    alertSummary,
    notes: condition === 'Stable' 
      ? 'Reserves remain solvent with sustainable or positive cashflow.'
      : `Net burn rate is averaging ₱${averageMonthlyBurnRate.toLocaleString('en-US', { minimumFractionDigits: 2 })} monthly.`,
  };
}
