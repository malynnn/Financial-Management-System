export const RABBITMQ_SERVICE = 'RABBITMQ_FINANCIAL_SERVICE';

export const FINANCIAL_PATTERNS = {
  // Collection Events
  COLLECTION_SUBMITTED: 'financial.collection.submitted',
  COLLECTION_VERIFIED: 'financial.collection.verified',
  COLLECTION_POSTED: 'financial.collection.posted',
  COLLECTION_REJECTED: 'financial.collection.rejected',

  // Disbursement Events
  DISBURSEMENT_REQUESTED: 'financial.disbursement.requested',
  DISBURSEMENT_APPROVED: 'financial.disbursement.approved',
  DISBURSEMENT_EXECUTED: 'financial.disbursement.executed',
  DISBURSEMENT_CANCELLED: 'financial.disbursement.cancelled',

  // Fund Events
  FUND_CREATED: 'financial.fund.created',
  FUND_UPDATED: 'financial.fund.updated',
  FUND_BALANCE_CHANGED: 'financial.fund.balance_changed',
  FUND_STATUS_TOGGLED: 'financial.fund.status_toggled',
  FUND_INSUFFICIENT_ALERT: 'financial.fund.insufficient_alert',
  FUND_UTILIZATION_WARNING: 'financial.fund.utilization_warning',
} as const;
