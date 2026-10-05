export const DISBURSEMENT_TYPES = [
  'LOAN_RELEASE',
  'EXPENSE',
  'OTHER_AUTHORIZED_RELEASE'
] as const;

export const DISBURSEMENT_CATEGORIES = [
  'Loan Release',
  'Operational Expense',
  'Administrative Expense',
  'Member Benefit / Calamity Assistance',
  'Capital Expenditure',
  'Community Development'
] as const;

export const REQUIRES_SUPPORTING_DOC: Record<string, boolean> = {
  LOAN_RELEASE: true,
  EXPENSE: true,
  OTHER_AUTHORIZED_RELEASE: true
};
