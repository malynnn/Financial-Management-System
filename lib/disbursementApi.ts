import { API_BASE_URL } from '@/lib/config';
import type {
  FundRecord,
  PaymentMethod,
  ProcessableItem
} from '@/components/disbursement/DisbursementFormModal';

const BASE = `${API_BASE_URL}/disbursements`;

// Disbursing officer authentication header for backend requests
const MOCK_OFFICER_ID = 'usr-disbursing-officer-1';

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: { 
      'Content-Type': 'application/json',
      'x-user-id': MOCK_OFFICER_ID,
      ...(init?.headers || {}) 
    }
  });
  const body = await res.json().catch(() => null);
  if (!res.ok) {
    const msg = body?.message;
    throw new Error(Array.isArray(msg) ? msg.join(', ') : msg || `Request failed (${res.status})`);
  }
  return body as T;
}

export const toBackendMethod = (m: PaymentMethod): string =>
  m === 'Cheque' ? 'CHECK' : m === 'Bank Transfer' ? 'BANK_TRANSFER' : 'CASH';

export const fromBackendMethod = (m?: string): PaymentMethod => {
  const v = (m || '').toUpperCase().replace('_', ' ');
  if (v === 'CHECK') return 'Cheque';
  if (v === 'CASH') return 'Cash Voucher';
  return 'Bank Transfer';
};

export async function fetchFunds(): Promise<FundRecord[]> {
  const rows = await request<{ name: string; totalBalance: number; availableBalance: number }[]>('/funds/summary');
  return rows.map((f) => ({
    id: f.name,
    name: f.name,
    code: f.name.split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 3),
    balance: f.availableBalance
  }));
}

export async function fetchEligibleLoans(): Promise<ProcessableItem[]> {
  const loans = await request<any[]>('/eligible-loans');
  return loans
    .filter((l) => l.remainingAmount > 0)
    .map((l) => ({
      id: `loan-${l.id}`,
      ref: l.id,
      type: 'Loan Release',
      category: 'Loan Release',
      payee: l.beneficiary?.name || l.member,
      purpose: `${l.obligationType} release for ${l.member}`,
      fundSource: l.fundSource,
      approvedAmount: l.approvedAmount,
      amount: l.remainingAmount,
      loanRef: l.id,
      obligationId: l.id,
      memberId: l.memberId,
      beneficiaryBank: l.beneficiary?.bank,
      beneficiaryAccount: l.beneficiary?.account,
      date: new Date().toISOString().split('T')[0],
      paymentMethod: 'Bank Transfer'
    }));
}

export async function fetchDisbursementRecords(): Promise<any[]> {
  const res = await request<{ data: any[] }>('?limit=100');
  return res.data.map((d) => {
    const method = fromBackendMethod(d.method);
    return {
      id: d.id,
      disbursementId: d.id,
      ref: d.ref,
      type: d.type === 'LOAN_RELEASE' ? 'Loan Release' : d.type === 'EXPENSE' ? 'Expense' : 'Other Authorized Release',
      category: d.category,
      payee: d.beneficiary?.name || d.member,
      purpose: d.purpose || d.category,
      fundSource: d.fundSource,
      amount: d.amount,
      date: d.date,
      paymentMethod: method,
      status: d.status === 'EXECUTED' ? 'Disbursed' : d.status,
      chequeNumber: method === 'Cheque' ? d.chequeNumber || d.executionRef : undefined,
      chequeStatus: method === 'Cheque' ? d.chequeStatus || 'Issued' : undefined,
      supportingDocRef: d.supportingDocRef || d.ref,
      rejectionReason: d.rejectionReason,
      auditTrail: d.auditTrail,
      beneficiary: d.beneficiary,
      processedAt: d.auditTrail?.[d.auditTrail.length - 1]?.timestamp
    };
  });
}

export interface RequestPayload {
  type: string;
  category: string;
  purpose: string;
  date?: string;
  supportingDocRef?: string;
  obligationId?: string;
  memberId?: string;
  amount: number;
  paymentMethod: PaymentMethod;
  fundSource: string;
  beneficiaryName: string;
  beneficiaryBank?: string;
  beneficiaryAccount?: string;
  description?: string;
  cheque?: {
    chequeNumber: string;
    chequeDate: string;
    payee: string;
    amount: number;
    purpose: string;
  };
}

export function createDisbursementRequest(p: RequestPayload) {
  const backendType = p.type === 'Loan Release' ? 'LOAN_RELEASE' : p.type === 'Expense' ? 'EXPENSE' : 'OTHER_AUTHORIZED_RELEASE';
  return request<any>('/', {
    method: 'POST',
    body: JSON.stringify({
      ...p,
      type: backendType,
      paymentMethod: toBackendMethod(p.paymentMethod),
    })
  });
}

export function executeDisbursement(id: string, executionRefNo?: string, details?: string) {
  return request<any>(`/${id}/execute`, {
    method: 'POST',
    body: JSON.stringify({ executionRefNo, details })
  });
}
