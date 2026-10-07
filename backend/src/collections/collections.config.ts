import { PaymentMethod } from '@prisma/client';

/**
 * CPS-004 / CPS-005: Configured payment methods.
 * Only methods with `enabled: true` are accepted; `requiresReference`
 * controls whether a Payment Reference must be supplied.
 * Mirrors the frontend NewCollectionModal configuration
 * (Maya is submitted as OTHER, Check Deposit as CHECK).
 */
export interface PaymentMethodConfig {
  enabled: boolean;
  requiresReference: boolean;
}

export const PAYMENT_METHOD_CONFIG: Record<PaymentMethod, PaymentMethodConfig> = {
  [PaymentMethod.CASH]: { enabled: true, requiresReference: false },
  [PaymentMethod.BANK_TRANSFER]: { enabled: true, requiresReference: true },
  [PaymentMethod.GCASH]: { enabled: true, requiresReference: true },
  [PaymentMethod.CHECK]: { enabled: true, requiresReference: true },
  [PaymentMethod.OTHER]: { enabled: true, requiresReference: true },
};

/** CPS-001: Configured collection categories (same list used by the UI). */
export const COLLECTION_CATEGORIES = [
  'Loan Repayment',
  'Annual Dues',
  'Share Capital',
  'Emergency Fund Contribution',
  'Penalty / Late Fee',
  'General Deposit',
];
