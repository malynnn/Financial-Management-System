import {
  PrismaClient,
  Role,
  PaymentMethod,
  CollectionStatus,
  DisbursementStatus,
  Prisma,
} from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('====================================================');
  console.log('Starting Full Database Reset and Seeding Procedure');
  console.log('====================================================');

  // ─────────────────────────────────────────────────────────────
  // 1. CLEAN RESET: Truncate tables in reverse foreign key order
  // ─────────────────────────────────────────────────────────────
  console.log('\n[1/7] Wiping existing data in reverse foreign key order (preserving migrations)...');
  const tables = [
    'DisbursementAuditLog',
    'CollectionAuditLog',
    'CollectionApplication',
    'Disbursement',
    'Collection',
    'FundTransaction',
    'FundTransfer',
    'FinancialObligation',
    'FundAccount',
    'Fund',
    'User',
  ];

  for (const table of tables) {
    await prisma.$executeRawUnsafe(`TRUNCATE TABLE "${table}" CASCADE;`);
  }
  console.log('✓ All application tables successfully truncated.');

  const passwordHash = await bcrypt.hash('password123', 10);

  // ─────────────────────────────────────────────────────────────
  // 2. USERS: Non-member management roles + 5 Functional Members
  // ─────────────────────────────────────────────────────────────
  console.log('\n[2/7] Seeding management users and 5 functional member accounts...');
  
  // Existing non-member management roles (untouched)
  const managementUsers = [
    {
      id: 'usr-admin-1',
      name: 'Admin Officer',
      email: 'admin@fms.com',
      passwordHash,
      role: Role.ADMIN,
    },
    {
      id: 'usr-treasurer-1',
      name: 'Maria Santos',
      email: 'treasurer@fms.com',
      passwordHash,
      role: Role.TREASURER,
    },
    {
      id: 'usr-auditor-1',
      name: 'Audit Inspector',
      email: 'auditor@fms.com',
      passwordHash,
      role: Role.AUDITOR,
    },
  ];

  // 5 distinct functional member accounts
  const memberUsers = [
    {
      id: 'usr-member-1',
      name: 'Juan Dela Cruz',
      email: 'member@fms.com',
      passwordHash,
      role: Role.MEMBER,
    },
    {
      id: 'usr-member-2',
      name: 'Maria Clara',
      email: 'maria@fms.com',
      passwordHash,
      role: Role.MEMBER,
    },
    {
      id: 'usr-member-3',
      name: 'Crisostomo Ibarra',
      email: 'crisostomo@fms.com',
      passwordHash,
      role: Role.MEMBER,
    },
    {
      id: 'usr-member-4',
      name: 'Elias Salome',
      email: 'elias@fms.com',
      passwordHash,
      role: Role.MEMBER,
    },
    {
      id: 'usr-member-5',
      name: 'Sisa Narcisa',
      email: 'sisa@fms.com',
      passwordHash,
      role: Role.MEMBER,
    },
  ];

  for (const user of [...managementUsers, ...memberUsers]) {
    await prisma.user.create({ data: user });
  }
  console.log(`✓ Seeded ${managementUsers.length} Management roles and ${memberUsers.length} Member users.`);

  // ─────────────────────────────────────────────────────────────
  // 3. FUND ALLOCATION: Master Fund and FundAccount buckets
  // ─────────────────────────────────────────────────────────────
  console.log('\n[3/7] Initializing Fund Allocation accounts/buckets with baseline balances...');

  // Master Fund definitions: Union Fund, General Fund, Death Assistance Fund, Foreign Assistance Fund, Loan Fund
  const fundDefinitions = [
    {
      id: 'fnd-union-01',
      name: 'Union Fund',
      code: 'UNF',
      description: 'Core operational fund for union activities and member programs.',
      openingBalance: 500000.0,
      targetUtilization: 80.0,
      status: 'Active',
    },
    {
      id: 'fnd-general-01',
      name: 'General Fund',
      code: 'GEN',
      description: 'Unrestricted assets for general administration, dues, and operational expenses.',
      openingBalance: 250000.0,
      targetUtilization: 75.0,
      status: 'Active',
    },
    {
      id: 'fnd-death-01',
      name: 'Death Assistance Fund',
      code: 'DAF',
      description: 'Restricted fund reserved for member bereavement support and funeral assistance.',
      openingBalance: 150000.0,
      targetUtilization: 50.0,
      status: 'Active',
    },
    {
      id: 'fnd-foreign-01',
      name: 'Foreign Assistance Fund',
      code: 'FAF',
      description: 'International solidarity, foreign humanitarian aid, and cross-border partnership assistance.',
      openingBalance: 80000.0,
      targetUtilization: 40.0,
      status: 'Active',
    },
    {
      id: 'fnd-loan-01',
      name: 'Loan Fund',
      code: 'LNF',
      description: 'Revolving credit and micro-financing facilities for union members.',
      openingBalance: 850000.0,
      targetUtilization: 90.0,
      status: 'Active',
    },
  ];

  for (const fd of fundDefinitions) {
    await prisma.fund.create({
      data: {
        id: fd.id,
        name: fd.name,
        code: fd.code,
        description: fd.description,
        openingBalance: new Prisma.Decimal(fd.openingBalance),
        currentBalance: new Prisma.Decimal(fd.openingBalance), // dynamically adjusted below
        targetUtilization: new Prisma.Decimal(fd.targetUtilization),
        status: fd.status,
      },
    });

    // Opening Balance Transaction for Fund ledger
    await prisma.fundTransaction.create({
      data: {
        fundId: fd.id,
        transactionRef: `OB-${fd.code}-2026`,
        transactionType: 'Opening Balance',
        amount: new Prisma.Decimal(fd.openingBalance),
        status: 'Posted',
        referenceType: 'OPENING_BALANCE',
        description: `Initial baseline opening balance configured for ${fd.name}.`,
        date: new Date('2026-01-01'),
      },
    });
  }

  // Matching FundAccount buckets (used by disbursements module)
  const fundAccountDefinitions = [
    { name: 'Union Fund', totalBalance: 500000.0, availableBalance: 500000.0, reservedBalance: 0.0 },
    { name: 'General Fund', totalBalance: 250000.0, availableBalance: 250000.0, reservedBalance: 0.0 },
    { name: 'Death Assistance Fund', totalBalance: 150000.0, availableBalance: 150000.0, reservedBalance: 0.0 },
    { name: 'Foreign Assistance Fund', totalBalance: 80000.0, availableBalance: 80000.0, reservedBalance: 0.0 },
    { name: 'Loan Fund', totalBalance: 850000.0, availableBalance: 850000.0, reservedBalance: 0.0 },
  ];

  for (const fa of fundAccountDefinitions) {
    await prisma.fundAccount.create({
      data: {
        name: fa.name,
        totalBalance: new Prisma.Decimal(fa.totalBalance),
        availableBalance: new Prisma.Decimal(fa.availableBalance),
        reservedBalance: new Prisma.Decimal(fa.reservedBalance),
      },
    });
  }
  console.log(`✓ Seeded ${fundDefinitions.length} master Funds and matching FundAccounts.`);

  // ─────────────────────────────────────────────────────────────
  // 4. FINANCIAL OBLIGATIONS: Dues and Approved Member Loans
  // ─────────────────────────────────────────────────────────────
  console.log('\n[4/7] Seeding financial obligations across all 5 members...');

  const obligationsData = [
    // Juan Dela Cruz (usr-member-1)
    {
      id: 'ob-juan-dues',
      memberId: 'usr-member-1',
      obligationType: 'Annual Dues',
      originalAmount: 1500.0,
      outstandingBalance: 1500.0, // Will be paid via Collection 1
      dueDate: new Date('2026-12-31'),
      status: 'UNPAID',
      loanStatus: 'Approved',
      approvedAmount: 1500.0,
      disbursedAmount: 0.0,
      remainingLoanAmount: 0.0,
      beneficiaryName: 'Juan Dela Cruz',
      beneficiaryBank: 'BDO',
      beneficiaryAccount: '00123456789',
      fundSource: 'General Fund',
    },
    {
      id: 'ob-juan-loan',
      memberId: 'usr-member-1',
      obligationType: 'Member Multi-Purpose Loan',
      originalAmount: 5000.0,
      outstandingBalance: 5000.0,
      dueDate: new Date('2026-10-15'),
      status: 'UNPAID',
      loanStatus: 'Approved', // Will be fully disbursed via Disbursement 1
      approvedAmount: 5000.0,
      disbursedAmount: 0.0,
      remainingLoanAmount: 5000.0,
      beneficiaryName: 'Juan Dela Cruz',
      beneficiaryBank: 'BDO',
      beneficiaryAccount: '00123456789',
      fundSource: 'Loan Fund',
    },

    // Maria Clara (usr-member-2)
    {
      id: 'ob-maria-dues',
      memberId: 'usr-member-2',
      obligationType: 'Annual Dues',
      originalAmount: 1500.0,
      outstandingBalance: 1500.0, // Will be paid via Collection 2
      dueDate: new Date('2026-12-31'),
      status: 'UNPAID',
      loanStatus: 'Approved',
      approvedAmount: 1500.0,
      disbursedAmount: 0.0,
      remainingLoanAmount: 0.0,
      beneficiaryName: 'Maria Clara',
      beneficiaryBank: 'BPI',
      beneficiaryAccount: '98765432100',
      fundSource: 'General Fund',
    },
    {
      id: 'ob-maria-edu',
      memberId: 'usr-member-2',
      obligationType: 'Educational Study Loan',
      originalAmount: 10000.0,
      outstandingBalance: 10000.0,
      dueDate: new Date('2026-11-30'),
      status: 'UNPAID',
      loanStatus: 'Approved', // Will be fully disbursed via Disbursement 2
      approvedAmount: 10000.0,
      disbursedAmount: 0.0,
      remainingLoanAmount: 10000.0,
      beneficiaryName: 'Maria Clara',
      beneficiaryBank: 'BPI',
      beneficiaryAccount: '98765432100',
      fundSource: 'Loan Fund',
    },

    // Crisostomo Ibarra (usr-member-3)
    {
      id: 'ob-crisostomo-dues',
      memberId: 'usr-member-3',
      obligationType: 'Annual Dues',
      originalAmount: 1500.0,
      outstandingBalance: 1500.0,
      dueDate: new Date('2026-12-31'),
      status: 'UNPAID',
      loanStatus: 'Approved',
      approvedAmount: 1500.0,
      disbursedAmount: 0.0,
      remainingLoanAmount: 0.0,
      beneficiaryName: 'Crisostomo Ibarra',
      beneficiaryBank: 'Metrobank',
      beneficiaryAccount: '20498172635',
      fundSource: 'General Fund',
    },
    {
      id: 'ob-crisostomo-bereavement',
      memberId: 'usr-member-3',
      obligationType: 'Bereavement Support Loan',
      originalAmount: 8000.0,
      outstandingBalance: 8000.0, // Disbursed 8,000; then Collection 3 pays 4,000 -> 4,000 remaining
      dueDate: new Date('2026-10-31'),
      status: 'UNPAID',
      loanStatus: 'Approved',
      approvedAmount: 8000.0,
      disbursedAmount: 0.0,
      remainingLoanAmount: 8000.0,
      beneficiaryName: 'Crisostomo Ibarra',
      beneficiaryBank: 'Metrobank',
      beneficiaryAccount: '20498172635',
      fundSource: 'Death Assistance Fund',
    },

    // Elias Salome (usr-member-4)
    {
      id: 'ob-elias-dues',
      memberId: 'usr-member-4',
      obligationType: 'Annual Dues',
      originalAmount: 1500.0,
      outstandingBalance: 1500.0, // Partial payment 500 under verification via Collection 4
      dueDate: new Date('2026-12-31'),
      status: 'UNPAID',
      loanStatus: 'Approved',
      approvedAmount: 1500.0,
      disbursedAmount: 0.0,
      remainingLoanAmount: 0.0,
      beneficiaryName: 'Elias Salome',
      beneficiaryBank: 'Landbank',
      beneficiaryAccount: '55667788990',
      fundSource: 'General Fund',
    },
    {
      id: 'ob-elias-mutual',
      memberId: 'usr-member-4',
      obligationType: 'Union Mutual Aid Loan',
      originalAmount: 6000.0,
      outstandingBalance: 6000.0,
      dueDate: new Date('2026-12-15'),
      status: 'UNPAID',
      loanStatus: 'Approved', // Disbursement 4 is Approved, awaiting release
      approvedAmount: 6000.0,
      disbursedAmount: 0.0,
      remainingLoanAmount: 6000.0,
      beneficiaryName: 'Elias Salome',
      beneficiaryBank: 'Landbank',
      beneficiaryAccount: '55667788990',
      fundSource: 'Union Fund',
    },

    // Sisa Narcisa (usr-member-5)
    {
      id: 'ob-sisa-dues',
      memberId: 'usr-member-5',
      obligationType: 'Annual Dues',
      originalAmount: 1500.0,
      outstandingBalance: 1500.0, // Pending submission via Collection 5
      dueDate: new Date('2026-12-31'),
      status: 'UNPAID',
      loanStatus: 'Approved',
      approvedAmount: 1500.0,
      disbursedAmount: 0.0,
      remainingLoanAmount: 0.0,
      beneficiaryName: 'Sisa Narcisa',
      beneficiaryBank: 'RCBC',
      beneficiaryAccount: '11223344556',
      fundSource: 'General Fund',
    },
    {
      id: 'ob-sisa-solidarity',
      memberId: 'usr-member-5',
      obligationType: 'Cross-Border Solidarity Grant',
      originalAmount: 3000.0,
      outstandingBalance: 3000.0,
      dueDate: new Date('2026-11-15'),
      status: 'UNPAID',
      loanStatus: 'Pending', // Disbursement 5 is Pending Approval
      approvedAmount: 3000.0,
      disbursedAmount: 0.0,
      remainingLoanAmount: 3000.0,
      beneficiaryName: 'Sisa Narcisa',
      beneficiaryBank: 'RCBC',
      beneficiaryAccount: '11223344556',
      fundSource: 'Foreign Assistance Fund',
    },
  ];

  for (const ob of obligationsData) {
    await prisma.financialObligation.create({
      data: {
        id: ob.id,
        memberId: ob.memberId,
        obligationType: ob.obligationType,
        originalAmount: new Prisma.Decimal(ob.originalAmount),
        outstandingBalance: new Prisma.Decimal(ob.outstandingBalance),
        dueDate: ob.dueDate,
        status: ob.status,
        loanStatus: ob.loanStatus,
        approvedAmount: ob.approvedAmount ? new Prisma.Decimal(ob.approvedAmount) : null,
        disbursedAmount: new Prisma.Decimal(ob.disbursedAmount),
        remainingLoanAmount: new Prisma.Decimal(ob.remainingLoanAmount),
        beneficiaryName: ob.beneficiaryName,
        beneficiaryBank: ob.beneficiaryBank,
        beneficiaryAccount: ob.beneficiaryAccount,
        fundSource: ob.fundSource,
      },
    });
  }
  console.log(`✓ Seeded ${obligationsData.length} Financial Obligations.`);

  // ─────────────────────────────────────────────────────────────
  // 5. INTERTWINED FINANCIAL FLOW: Collections & Inflow Credits
  // ─────────────────────────────────────────────────────────────
  console.log('\n[5/7] Seeding realistic collections, crediting funds and updating obligations...');

  // Collection 1: Juan Dela Cruz - Annual Dues (POSTED & Applied)
  const col1 = await prisma.collection.create({
    data: {
      id: 'col-juan-dues-01',
      collectionRefNo: 'COL-2026-00001',
      memberId: 'usr-member-1',
      fundId: 'fnd-general-01',
      paymentAmount: new Prisma.Decimal(1500.0),
      paymentDate: new Date('2026-08-15'),
      paymentMethod: PaymentMethod.GCASH,
      paymentReference: 'GCASH-901122334',
      description: 'Full payment for 2026 Annual Membership Dues',
      status: CollectionStatus.POSTED,
      isReadyForReconciliation: true,
      proofOfPaymentName: 'juan_gcash_receipt_1500.png',
      proofOfPaymentPath: 'uploads/proofs/juan_gcash_receipt_1500.png',
      application: {
        create: {
          obligationId: 'ob-juan-dues',
          originalBalance: new Prisma.Decimal(1500.0),
          appliedAmount: new Prisma.Decimal(1500.0),
          remainingBalance: new Prisma.Decimal(0.0),
          exceptionStatus: 'Exact Match',
          appliedAt: new Date('2026-08-16T09:00:00Z'),
        },
      },
      auditTrail: {
        create: [
          {
            userId: 'usr-member-1',
            collectionRefNo: 'COL-2026-00001',
            action: 'Collection Record Created',
            previousStatus: null,
            newStatus: CollectionStatus.PENDING,
            actor: 'Juan Dela Cruz',
            role: 'Member',
            timestamp: new Date('2026-08-15T10:00:00Z'),
            details: 'Member submitted payment details for ₱1,500.00 via GCASH (Ref: GCASH-901122334).',
          },
          {
            userId: 'usr-member-1',
            collectionRefNo: 'COL-2026-00001',
            action: 'Proof of Payment Uploaded',
            previousStatus: CollectionStatus.PENDING,
            newStatus: CollectionStatus.FOR_VERIFICATION,
            actor: 'Juan Dela Cruz',
            role: 'Member',
            timestamp: new Date('2026-08-15T10:05:00Z'),
            details: 'Proof of payment file "juan_gcash_receipt_1500.png" was attached successfully.',
          },
          {
            userId: 'usr-treasurer-1',
            collectionRefNo: 'COL-2026-00001',
            action: 'Collection Validated',
            previousStatus: CollectionStatus.FOR_VERIFICATION,
            newStatus: CollectionStatus.VALIDATED,
            actor: 'Maria Santos',
            role: 'Treasurer',
            timestamp: new Date('2026-08-16T08:30:00Z'),
            details: 'Treasurer confirmed GCASH payment of ₱1,500.00 matches transaction receipt.',
          },
          {
            userId: 'usr-treasurer-1',
            collectionRefNo: 'COL-2026-00001',
            action: 'Payment Posted',
            previousStatus: CollectionStatus.VALIDATED,
            newStatus: CollectionStatus.POSTED,
            actor: 'Maria Santos',
            role: 'Treasurer',
            timestamp: new Date('2026-08-16T09:00:00Z'),
            details: 'Payment of ₱1,500.00 was successfully posted and applied to Annual Dues. Exception Status: Exact Match. Ready for Reconciliation: Yes.',
          },
        ],
      },
    },
  });

  // Update Juan's Annual Dues obligation to Fully Paid
  await prisma.financialObligation.update({
    where: { id: 'ob-juan-dues' },
    data: {
      outstandingBalance: new Prisma.Decimal(0.0),
      status: 'Fully Paid',
    },
  });

  // Credit FundTransaction to General Fund
  await prisma.fundTransaction.create({
    data: {
      fundId: 'fnd-general-01',
      transactionRef: 'COL-2026-00001',
      transactionType: 'Inflow (Collection)',
      amount: new Prisma.Decimal(1500.0),
      status: 'Posted',
      referenceType: 'COLLECTION',
      referenceId: col1.id,
      description: 'Collection posted from Juan Dela Cruz: Annual Dues',
      date: new Date('2026-08-15'),
    },
  });

  // Collection 2: Maria Clara - Annual Dues (POSTED & Applied)
  const col2 = await prisma.collection.create({
    data: {
      id: 'col-maria-dues-02',
      collectionRefNo: 'COL-2026-00002',
      memberId: 'usr-member-2',
      fundId: 'fnd-general-01',
      paymentAmount: new Prisma.Decimal(1500.0),
      paymentDate: new Date('2026-08-18'),
      paymentMethod: PaymentMethod.BANK_TRANSFER,
      paymentReference: 'BPI-20260818-449',
      description: 'Full payment for 2026 Annual Membership Dues via BPI Transfer',
      status: CollectionStatus.POSTED,
      isReadyForReconciliation: true,
      proofOfPaymentName: 'maria_bpi_confirmation.pdf',
      proofOfPaymentPath: 'uploads/proofs/maria_bpi_confirmation.pdf',
      application: {
        create: {
          obligationId: 'ob-maria-dues',
          originalBalance: new Prisma.Decimal(1500.0),
          appliedAmount: new Prisma.Decimal(1500.0),
          remainingBalance: new Prisma.Decimal(0.0),
          exceptionStatus: 'Exact Match',
          appliedAt: new Date('2026-08-19T11:00:00Z'),
        },
      },
      auditTrail: {
        create: [
          {
            userId: 'usr-member-2',
            collectionRefNo: 'COL-2026-00002',
            action: 'Collection Record Created',
            previousStatus: null,
            newStatus: CollectionStatus.PENDING,
            actor: 'Maria Clara',
            role: 'Member',
            timestamp: new Date('2026-08-18T14:20:00Z'),
            details: 'Member recorded Bank Transfer payment of ₱1,500.00 (Ref: BPI-20260818-449).',
          },
          {
            userId: 'usr-member-2',
            collectionRefNo: 'COL-2026-00002',
            action: 'Proof of Payment Uploaded',
            previousStatus: CollectionStatus.PENDING,
            newStatus: CollectionStatus.FOR_VERIFICATION,
            actor: 'Maria Clara',
            role: 'Member',
            timestamp: new Date('2026-08-18T14:25:00Z'),
            details: 'Bank transfer receipt attached.',
          },
          {
            userId: 'usr-treasurer-1',
            collectionRefNo: 'COL-2026-00002',
            action: 'Payment Posted',
            previousStatus: CollectionStatus.FOR_VERIFICATION,
            newStatus: CollectionStatus.POSTED,
            actor: 'Maria Santos',
            role: 'Treasurer',
            timestamp: new Date('2026-08-19T11:00:00Z'),
            details: 'Payment of ₱1,500.00 was successfully posted and applied to Annual Dues. Ready for Reconciliation: Yes.',
          },
        ],
      },
    },
  });

  // Update Maria's Annual Dues obligation to Fully Paid
  await prisma.financialObligation.update({
    where: { id: 'ob-maria-dues' },
    data: {
      outstandingBalance: new Prisma.Decimal(0.0),
      status: 'Fully Paid',
    },
  });

  // Credit FundTransaction to General Fund
  await prisma.fundTransaction.create({
    data: {
      fundId: 'fnd-general-01',
      transactionRef: 'COL-2026-00002',
      transactionType: 'Inflow (Collection)',
      amount: new Prisma.Decimal(1500.0),
      status: 'Posted',
      referenceType: 'COLLECTION',
      referenceId: col2.id,
      description: 'Collection posted from Maria Clara: Annual Dues',
      date: new Date('2026-08-18'),
    },
  });

  // Collection 3: Crisostomo Ibarra - Bereavement Support Loan Partial Repayment (POSTED)
  const col3 = await prisma.collection.create({
    data: {
      id: 'col-crisostomo-bereavement-03',
      collectionRefNo: 'COL-2026-00003',
      memberId: 'usr-member-3',
      fundId: 'fnd-death-01',
      paymentAmount: new Prisma.Decimal(4000.0),
      paymentDate: new Date('2026-08-25'),
      paymentMethod: PaymentMethod.BANK_TRANSFER,
      paymentReference: 'MBTC-20260825-998',
      description: '1st Installment repayment for Bereavement Support Loan',
      status: CollectionStatus.POSTED,
      isReadyForReconciliation: true,
      proofOfPaymentName: 'ibarra_metrobank_receipt.png',
      proofOfPaymentPath: 'uploads/proofs/ibarra_metrobank_receipt.png',
      application: {
        create: {
          obligationId: 'ob-crisostomo-bereavement',
          originalBalance: new Prisma.Decimal(8000.0),
          appliedAmount: new Prisma.Decimal(4000.0),
          remainingBalance: new Prisma.Decimal(4000.0),
          exceptionStatus: 'Partial Payment',
          appliedAt: new Date('2026-08-26T14:00:00Z'),
        },
      },
      auditTrail: {
        create: [
          {
            userId: 'usr-member-3',
            collectionRefNo: 'COL-2026-00003',
            action: 'Collection Record Created',
            previousStatus: null,
            newStatus: CollectionStatus.PENDING,
            actor: 'Crisostomo Ibarra',
            role: 'Member',
            timestamp: new Date('2026-08-25T15:00:00Z'),
            details: 'Member submitted partial payment of ₱4,000.00 for Bereavement Support Loan.',
          },
          {
            userId: 'usr-member-3',
            collectionRefNo: 'COL-2026-00003',
            action: 'Proof of Payment Uploaded',
            previousStatus: CollectionStatus.PENDING,
            newStatus: CollectionStatus.FOR_VERIFICATION,
            actor: 'Crisostomo Ibarra',
            role: 'Member',
            timestamp: new Date('2026-08-25T15:04:00Z'),
            details: 'Metrobank transfer receipt uploaded.',
          },
          {
            userId: 'usr-treasurer-1',
            collectionRefNo: 'COL-2026-00003',
            action: 'Payment Posted',
            previousStatus: CollectionStatus.FOR_VERIFICATION,
            newStatus: CollectionStatus.POSTED,
            actor: 'Maria Santos',
            role: 'Treasurer',
            timestamp: new Date('2026-08-26T14:00:00Z'),
            details: 'Payment of ₱4,000.00 successfully posted. Exception Status: Partial Payment. Remaining Balance: ₱4,000.00.',
          },
        ],
      },
    },
  });

  // Update Crisostomo's obligation to PARTIALLY_PAID
  await prisma.financialObligation.update({
    where: { id: 'ob-crisostomo-bereavement' },
    data: {
      outstandingBalance: new Prisma.Decimal(4000.0),
      status: 'PARTIALLY_PAID',
    },
  });

  // Credit FundTransaction to Death Assistance Fund
  await prisma.fundTransaction.create({
    data: {
      fundId: 'fnd-death-01',
      transactionRef: 'COL-2026-00003',
      transactionType: 'Inflow (Collection)',
      amount: new Prisma.Decimal(4000.0),
      status: 'Posted',
      referenceType: 'COLLECTION',
      referenceId: col3.id,
      description: 'Collection posted from Crisostomo Ibarra: Bereavement Support Loan',
      date: new Date('2026-08-25'),
    },
  });

  // Collection 4: Elias Salome - Partial Annual Dues (FOR_VERIFICATION)
  await prisma.collection.create({
    data: {
      id: 'col-elias-dues-04',
      collectionRefNo: 'COL-2026-00004',
      memberId: 'usr-member-4',
      fundId: 'fnd-general-01',
      paymentAmount: new Prisma.Decimal(500.0),
      paymentDate: new Date('2026-09-01'),
      paymentMethod: PaymentMethod.GCASH,
      paymentReference: 'GCASH-771199331',
      description: 'Partial initial payment of ₱500.00 for Annual Dues',
      status: CollectionStatus.FOR_VERIFICATION,
      isReadyForReconciliation: false,
      proofOfPaymentName: 'elias_gcash_screenshot.jpg',
      proofOfPaymentPath: 'uploads/proofs/elias_gcash_screenshot.jpg',
      auditTrail: {
        create: [
          {
            userId: 'usr-member-4',
            collectionRefNo: 'COL-2026-00004',
            action: 'Collection Record Created',
            previousStatus: null,
            newStatus: CollectionStatus.PENDING,
            actor: 'Elias Salome',
            role: 'Member',
            timestamp: new Date('2026-09-01T08:15:00Z'),
            details: 'Member initiated payment record of ₱500.00 via GCASH.',
          },
          {
            userId: 'usr-member-4',
            collectionRefNo: 'COL-2026-00004',
            action: 'Proof of Payment Uploaded',
            previousStatus: CollectionStatus.PENDING,
            newStatus: CollectionStatus.FOR_VERIFICATION,
            actor: 'Elias Salome',
            role: 'Member',
            timestamp: new Date('2026-09-01T08:20:00Z'),
            details: 'Proof of payment file "elias_gcash_screenshot.jpg" attached. Awaiting Treasurer validation.',
          },
        ],
      },
    },
  });

  // Collection 5: Sisa Narcisa - Annual Dues (PENDING)
  await prisma.collection.create({
    data: {
      id: 'col-sisa-dues-05',
      collectionRefNo: 'COL-2026-00005',
      memberId: 'usr-member-5',
      fundId: 'fnd-general-01',
      paymentAmount: new Prisma.Decimal(1500.0),
      paymentDate: new Date('2026-09-02'),
      paymentMethod: PaymentMethod.CASH,
      paymentReference: 'CASH-REC-0089',
      description: 'Cash payment submission pending physical receipt verification',
      status: CollectionStatus.PENDING,
      isReadyForReconciliation: false,
      auditTrail: {
        create: [
          {
            userId: 'usr-member-5',
            collectionRefNo: 'COL-2026-00005',
            action: 'Collection Record Created',
            previousStatus: null,
            newStatus: CollectionStatus.PENDING,
            actor: 'Sisa Narcisa',
            role: 'Member',
            timestamp: new Date('2026-09-02T13:45:00Z'),
            details: 'Member submitted cash payment intent for ₱1,500.00. Pending physical proof submission.',
          },
        ],
      },
    },
  });

  console.log('✓ Seeded 5 realistic Collections across POSTED, FOR_VERIFICATION, and PENDING states.');

  // ─────────────────────────────────────────────────────────────
  // 6. INTERTWINED FINANCIAL FLOW: Disbursements & Fund Deductions
  // ─────────────────────────────────────────────────────────────
  console.log('\n[6/7] Seeding disbursements, deducting fund balances, and updating obligations...');

  // Disbursement 1: Juan Dela Cruz - Multi-Purpose Loan (EXECUTED)
  const disb1 = await prisma.disbursement.create({
    data: {
      id: 'disb-juan-loan-01',
      disbursementRefNo: 'REQ-2026-0001',
      obligationId: 'ob-juan-loan',
      memberId: 'usr-member-1',
      disbursedById: 'usr-treasurer-1',
      amount: new Prisma.Decimal(5000.0),
      fundSource: 'Loan Fund',
      fundId: 'fnd-loan-01',
      paymentMethod: PaymentMethod.BANK_TRANSFER,
      beneficiaryName: 'Juan Dela Cruz',
      beneficiaryBank: 'BDO',
      beneficiaryAccount: '00123456789',
      description: 'Member multi-purpose loan release',
      status: DisbursementStatus.EXECUTED,
      executionRefNo: 'PAY-991001',
      isReadyForReconciliation: true,
      date: new Date('2026-08-20'),
      auditTrail: {
        create: [
          {
            userId: 'usr-treasurer-1',
            disbursementRefNo: 'REQ-2026-0001',
            action: 'Disbursement Requested',
            previousStatus: null,
            newStatus: DisbursementStatus.PENDING_APPROVAL,
            actor: 'Maria Santos',
            role: 'Treasurer',
            timestamp: new Date('2026-08-19T10:00:00Z'),
            details: 'Requested release of ₱5,000.00 for Multi-Purpose Loan to BDO account 00123456789.',
          },
          {
            userId: 'usr-treasurer-1',
            disbursementRefNo: 'REQ-2026-0001',
            action: 'Disbursement Approved',
            previousStatus: DisbursementStatus.PENDING_APPROVAL,
            newStatus: DisbursementStatus.APPROVED,
            actor: 'Maria Santos',
            role: 'Treasurer',
            timestamp: new Date('2026-08-19T16:00:00Z'),
            details: 'Disbursement request approved. Funds verified and scheduled for release.',
          },
          {
            userId: 'usr-treasurer-1',
            disbursementRefNo: 'REQ-2026-0001',
            action: 'Payment Executed',
            previousStatus: DisbursementStatus.APPROVED,
            newStatus: DisbursementStatus.EXECUTED,
            actor: 'Maria Santos',
            role: 'Treasurer',
            timestamp: new Date('2026-08-20T10:30:00Z'),
            details: 'Funds successfully released (₱5,000.00) with payment reference "PAY-991001". Transaction marked Ready for Reconciliation.',
          },
        ],
      },
    },
  });

  // Update Juan's Loan obligation to Fully Disbursed
  await prisma.financialObligation.update({
    where: { id: 'ob-juan-loan' },
    data: {
      disbursedAmount: new Prisma.Decimal(5000.0),
      remainingLoanAmount: new Prisma.Decimal(0.0),
      loanStatus: 'Fully Disbursed',
    },
  });

  // Outflow transaction on Loan Fund
  await prisma.fundTransaction.create({
    data: {
      fundId: 'fnd-loan-01',
      transactionRef: 'PAY-991001',
      transactionType: 'Outflow (Disbursement)',
      amount: new Prisma.Decimal(5000.0),
      status: 'Posted',
      referenceType: 'DISBURSEMENT',
      referenceId: disb1.id,
      description: 'Disbursement released to Juan Dela Cruz: Member multi-purpose loan release',
      date: new Date('2026-08-20'),
    },
  });

  // Disbursement 2: Maria Clara - Educational Loan (EXECUTED)
  const disb2 = await prisma.disbursement.create({
    data: {
      id: 'disb-maria-educational-02',
      disbursementRefNo: 'REQ-2026-0002',
      obligationId: 'ob-maria-edu',
      memberId: 'usr-member-2',
      disbursedById: 'usr-treasurer-1',
      amount: new Prisma.Decimal(10000.0),
      fundSource: 'Loan Fund',
      fundId: 'fnd-loan-01',
      paymentMethod: PaymentMethod.BANK_TRANSFER,
      beneficiaryName: 'Maria Clara',
      beneficiaryBank: 'BPI',
      beneficiaryAccount: '98765432100',
      description: 'Educational tuition assistance study loan disbursement',
      status: DisbursementStatus.EXECUTED,
      executionRefNo: 'PAY-991002',
      isReadyForReconciliation: true,
      date: new Date('2026-08-22'),
      auditTrail: {
        create: [
          {
            userId: 'usr-treasurer-1',
            disbursementRefNo: 'REQ-2026-0002',
            action: 'Disbursement Requested',
            previousStatus: null,
            newStatus: DisbursementStatus.PENDING_APPROVAL,
            actor: 'Maria Santos',
            role: 'Treasurer',
            timestamp: new Date('2026-08-21T09:15:00Z'),
            details: 'Requested release of ₱10,000.00 for Educational Loan to BPI account 98765432100.',
          },
          {
            userId: 'usr-treasurer-1',
            disbursementRefNo: 'REQ-2026-0002',
            action: 'Disbursement Approved',
            previousStatus: DisbursementStatus.PENDING_APPROVAL,
            newStatus: DisbursementStatus.APPROVED,
            actor: 'Maria Santos',
            role: 'Treasurer',
            timestamp: new Date('2026-08-21T15:30:00Z'),
            details: 'Disbursement approved following verification of university enrollment documents.',
          },
          {
            userId: 'usr-treasurer-1',
            disbursementRefNo: 'REQ-2026-0002',
            action: 'Payment Executed',
            previousStatus: DisbursementStatus.APPROVED,
            newStatus: DisbursementStatus.EXECUTED,
            actor: 'Maria Santos',
            role: 'Treasurer',
            timestamp: new Date('2026-08-22T11:00:00Z'),
            details: 'Funds successfully released (₱10,000.00) with payment reference "PAY-991002". Transaction marked Ready for Reconciliation.',
          },
        ],
      },
    },
  });

  // Update Maria Clara's Educational Loan to Fully Disbursed
  await prisma.financialObligation.update({
    where: { id: 'ob-maria-edu' },
    data: {
      disbursedAmount: new Prisma.Decimal(10000.0),
      remainingLoanAmount: new Prisma.Decimal(0.0),
      loanStatus: 'Fully Disbursed',
    },
  });

  // Outflow transaction on Loan Fund
  await prisma.fundTransaction.create({
    data: {
      fundId: 'fnd-loan-01',
      transactionRef: 'PAY-991002',
      transactionType: 'Outflow (Disbursement)',
      amount: new Prisma.Decimal(10000.0),
      status: 'Posted',
      referenceType: 'DISBURSEMENT',
      referenceId: disb2.id,
      description: 'Disbursement released to Maria Clara: Educational study loan disbursement',
      date: new Date('2026-08-22'),
    },
  });

  // Disbursement 3: Crisostomo Ibarra - Bereavement Support (EXECUTED)
  const disb3 = await prisma.disbursement.create({
    data: {
      id: 'disb-crisostomo-bereavement-03',
      disbursementRefNo: 'REQ-2026-0003',
      obligationId: 'ob-crisostomo-bereavement',
      memberId: 'usr-member-3',
      disbursedById: 'usr-treasurer-1',
      amount: new Prisma.Decimal(8000.0),
      fundSource: 'Death Assistance Fund',
      fundId: 'fnd-death-01',
      paymentMethod: PaymentMethod.BANK_TRANSFER,
      beneficiaryName: 'Crisostomo Ibarra',
      beneficiaryBank: 'Metrobank',
      beneficiaryAccount: '20498172635',
      description: 'Bereavement assistance emergency disbursement',
      status: DisbursementStatus.EXECUTED,
      executionRefNo: 'PAY-991003',
      isReadyForReconciliation: true,
      date: new Date('2026-08-23'),
      auditTrail: {
        create: [
          {
            userId: 'usr-treasurer-1',
            disbursementRefNo: 'REQ-2026-0003',
            action: 'Disbursement Requested',
            previousStatus: null,
            newStatus: DisbursementStatus.PENDING_APPROVAL,
            actor: 'Maria Santos',
            role: 'Treasurer',
            timestamp: new Date('2026-08-22T14:00:00Z'),
            details: 'Requested release of ₱8,000.00 for Bereavement Support to Metrobank account 20498172635.',
          },
          {
            userId: 'usr-treasurer-1',
            disbursementRefNo: 'REQ-2026-0003',
            action: 'Disbursement Approved',
            previousStatus: DisbursementStatus.PENDING_APPROVAL,
            newStatus: DisbursementStatus.APPROVED,
            actor: 'Maria Santos',
            role: 'Treasurer',
            timestamp: new Date('2026-08-22T17:00:00Z'),
            details: 'Bereavement assistance approved under expedited funeral support protocol.',
          },
          {
            userId: 'usr-treasurer-1',
            disbursementRefNo: 'REQ-2026-0003',
            action: 'Payment Executed',
            previousStatus: DisbursementStatus.APPROVED,
            newStatus: DisbursementStatus.EXECUTED,
            actor: 'Maria Santos',
            role: 'Treasurer',
            timestamp: new Date('2026-08-23T09:45:00Z'),
            details: 'Funds successfully released (₱8,000.00) with payment reference "PAY-991003". Transaction marked Ready for Reconciliation.',
          },
        ],
      },
    },
  });

  // Update Crisostomo's Loan to Fully Disbursed
  await prisma.financialObligation.update({
    where: { id: 'ob-crisostomo-bereavement' },
    data: {
      disbursedAmount: new Prisma.Decimal(8000.0),
      remainingLoanAmount: new Prisma.Decimal(0.0),
      loanStatus: 'Fully Disbursed',
    },
  });

  // Outflow transaction on Death Assistance Fund
  await prisma.fundTransaction.create({
    data: {
      fundId: 'fnd-death-01',
      transactionRef: 'PAY-991003',
      transactionType: 'Outflow (Disbursement)',
      amount: new Prisma.Decimal(8000.0),
      status: 'Posted',
      referenceType: 'DISBURSEMENT',
      referenceId: disb3.id,
      description: 'Disbursement released to Crisostomo Ibarra: Bereavement assistance emergency disbursement',
      date: new Date('2026-08-23'),
    },
  });

  // Disbursement 4: Elias Salome - Mutual Aid (APPROVED)
  await prisma.disbursement.create({
    data: {
      id: 'disb-elias-mutual-04',
      disbursementRefNo: 'REQ-2026-0004',
      obligationId: 'ob-elias-mutual',
      memberId: 'usr-member-4',
      disbursedById: 'usr-treasurer-1',
      amount: new Prisma.Decimal(6000.0),
      fundSource: 'Union Fund',
      fundId: 'fnd-union-01',
      paymentMethod: PaymentMethod.BANK_TRANSFER,
      beneficiaryName: 'Elias Salome',
      beneficiaryBank: 'Landbank',
      beneficiaryAccount: '55667788990',
      description: 'Union Mutual Aid loan approved awaiting execution and release',
      status: DisbursementStatus.APPROVED,
      isReadyForReconciliation: false,
      date: new Date('2026-09-02'),
      auditTrail: {
        create: [
          {
            userId: 'usr-treasurer-1',
            disbursementRefNo: 'REQ-2026-0004',
            action: 'Disbursement Requested',
            previousStatus: null,
            newStatus: DisbursementStatus.PENDING_APPROVAL,
            actor: 'Maria Santos',
            role: 'Treasurer',
            timestamp: new Date('2026-09-01T11:00:00Z'),
            details: 'Requested release of ₱6,000.00 for Mutual Aid Loan to Landbank account 55667788990.',
          },
          {
            userId: 'usr-treasurer-1',
            disbursementRefNo: 'REQ-2026-0004',
            action: 'Disbursement Approved',
            previousStatus: DisbursementStatus.PENDING_APPROVAL,
            newStatus: DisbursementStatus.APPROVED,
            actor: 'Maria Santos',
            role: 'Treasurer',
            timestamp: new Date('2026-09-02T14:30:00Z'),
            details: 'Disbursement approved by Treasurer. Ready for batch electronic bank payout.',
          },
        ],
      },
    },
  });

  // Disbursement 5: Sisa Narcisa - Cross-Border Solidarity Grant (PENDING_APPROVAL)
  await prisma.disbursement.create({
    data: {
      id: 'disb-sisa-solidarity-05',
      disbursementRefNo: 'REQ-2026-0005',
      obligationId: 'ob-sisa-solidarity',
      memberId: 'usr-member-5',
      amount: new Prisma.Decimal(3000.0),
      fundSource: 'Foreign Assistance Fund',
      fundId: 'fnd-foreign-01',
      paymentMethod: PaymentMethod.CASH,
      beneficiaryName: 'Sisa Narcisa',
      beneficiaryBank: 'RCBC',
      beneficiaryAccount: '11223344556',
      description: 'Cross-border humanitarian solidarity grant application awaiting committee review',
      status: DisbursementStatus.PENDING_APPROVAL,
      isReadyForReconciliation: false,
      date: new Date('2026-09-03'),
      auditTrail: {
        create: [
          {
            userId: 'usr-treasurer-1',
            disbursementRefNo: 'REQ-2026-0005',
            action: 'Disbursement Requested',
            previousStatus: null,
            newStatus: DisbursementStatus.PENDING_APPROVAL,
            actor: 'Maria Santos',
            role: 'Treasurer',
            timestamp: new Date('2026-09-03T09:00:00Z'),
            details: 'Requested solidarity grant disbursement of ₱3,000.00 for Sisa Narcisa from Foreign Assistance Fund.',
          },
        ],
      },
    },
  });

  console.log('✓ Seeded 5 Disbursements across EXECUTED, APPROVED, and PENDING_APPROVAL states.');

  // ─────────────────────────────────────────────────────────────
  // 7. INTER-FUND TRANSFER & EXACT BALANCE RECONCILIATION
  // ─────────────────────────────────────────────────────────────
  console.log('\n[7/7] Recording inter-fund transfer and reconciling all dynamic balances...');

  // Seed Inter-Fund Transfer: ₱20,000 from General Fund to Loan Fund
  const transferAmount = 20000.0;
  const transferRecord = await prisma.fundTransfer.create({
    data: {
      amount: new Prisma.Decimal(transferAmount),
      fromAccount: 'General Fund',
      toAccount: 'Loan Fund',
      description: 'Authorized capital infusion from General Fund to Loan Fund revolving facility',
      transferredById: 'usr-treasurer-1',
      date: new Date('2026-08-17'),
    },
  });

  // Outflow transaction on General Fund for transfer
  await prisma.fundTransaction.create({
    data: {
      fundId: 'fnd-general-01',
      transactionRef: `TRF-OUT-${transferRecord.id.slice(-6).toUpperCase()}`,
      transactionType: 'Transfer Out',
      amount: new Prisma.Decimal(transferAmount),
      status: 'Posted',
      referenceType: 'TRANSFER',
      referenceId: transferRecord.id,
      description: 'Transfer Out to Loan Fund for revolving credit capital infusion',
      date: new Date('2026-08-17'),
    },
  });

  // Inflow transaction on Loan Fund for transfer
  await prisma.fundTransaction.create({
    data: {
      fundId: 'fnd-loan-01',
      transactionRef: `TRF-IN-${transferRecord.id.slice(-6).toUpperCase()}`,
      transactionType: 'Transfer In',
      amount: new Prisma.Decimal(transferAmount),
      status: 'Posted',
      referenceType: 'TRANSFER',
      referenceId: transferRecord.id,
      description: 'Transfer In from General Fund for revolving credit capital infusion',
      date: new Date('2026-08-17'),
    },
  });

  // ─────────────────────────────────────────────────────────────
  // 6.5 AI FORECASTING: Multi-month historical time-series ledger (FAI-001 through FAI-008)
  // Seeds posted transactions across 2026-05, 2026-06, 2026-07 to satisfy the 3+ period requirement
  // ─────────────────────────────────────────────────────────────
  console.log('\n[6.5/7] Seeding historical time-series posted transactions for AI Forecasting Module...');

  const historicalSeedTxs = [
    // Union Fund (fnd-union-01)
    { fundId: 'fnd-union-01', ref: 'HIST-UNF-202605', type: 'Inflow (Collection)', amount: 40000.0, date: new Date('2026-05-10'), desc: 'May Union Member Dues Batch' },
    { fundId: 'fnd-union-01', ref: 'HIST-UNF-202605-OUT', type: 'Outflow (Disbursement)', amount: 15000.0, date: new Date('2026-05-22'), desc: 'May Union Activities and Operations' },
    { fundId: 'fnd-union-01', ref: 'HIST-UNF-202606', type: 'Inflow (Collection)', amount: 45000.0, date: new Date('2026-06-12'), desc: 'June Union Member Dues Batch' },
    { fundId: 'fnd-union-01', ref: 'HIST-UNF-202606-OUT', type: 'Outflow (Disbursement)', amount: 20000.0, date: new Date('2026-06-25'), desc: 'June Member General Assembly Expense' },
    { fundId: 'fnd-union-01', ref: 'HIST-UNF-202607', type: 'Inflow (Collection)', amount: 50000.0, date: new Date('2026-07-08'), desc: 'July Union Member Dues Batch' },
    { fundId: 'fnd-union-01', ref: 'HIST-UNF-202607-OUT', type: 'Outflow (Disbursement)', amount: 18000.0, date: new Date('2026-07-22'), desc: 'July Education Seminar Expense' },

    // General Fund (fnd-general-01)
    { fundId: 'fnd-general-01', ref: 'HIST-GEN-202605', type: 'Inflow (Collection)', amount: 30000.0, date: new Date('2026-05-05'), desc: 'May General Administration Inflows' },
    { fundId: 'fnd-general-01', ref: 'HIST-GEN-202605-OUT', type: 'Outflow (Disbursement)', amount: 25000.0, date: new Date('2026-05-18'), desc: 'May Office Operations & Utilities' },
    { fundId: 'fnd-general-01', ref: 'HIST-GEN-202606', type: 'Inflow (Collection)', amount: 32000.0, date: new Date('2026-06-10'), desc: 'June General Administration Inflows' },
    { fundId: 'fnd-general-01', ref: 'HIST-GEN-202606-OUT', type: 'Outflow (Disbursement)', amount: 28000.0, date: new Date('2026-06-20'), desc: 'June Facility Maintenance' },
    { fundId: 'fnd-general-01', ref: 'HIST-GEN-202607', type: 'Inflow (Collection)', amount: 29000.0, date: new Date('2026-07-07'), desc: 'July General Administration Inflows' },
    { fundId: 'fnd-general-01', ref: 'HIST-GEN-202607-OUT', type: 'Outflow (Disbursement)', amount: 27000.0, date: new Date('2026-07-19'), desc: 'July Administrative Supplies' },

    // Death Assistance Fund (fnd-death-01)
    { fundId: 'fnd-death-01', ref: 'HIST-DAF-202605', type: 'Inflow (Collection)', amount: 18000.0, date: new Date('2026-05-15'), desc: 'May Bereavement Mutual Aid Inflow' },
    { fundId: 'fnd-death-01', ref: 'HIST-DAF-202605-OUT', type: 'Outflow (Disbursement)', amount: 6000.0, date: new Date('2026-05-28'), desc: 'May Bereavement Emergency Claim' },
    { fundId: 'fnd-death-01', ref: 'HIST-DAF-202606', type: 'Inflow (Collection)', amount: 20000.0, date: new Date('2026-06-14'), desc: 'June Bereavement Mutual Aid Inflow' },
    { fundId: 'fnd-death-01', ref: 'HIST-DAF-202606-OUT', type: 'Outflow (Disbursement)', amount: 8000.0, date: new Date('2026-06-26'), desc: 'June Funeral Support Disbursement' },
    { fundId: 'fnd-death-01', ref: 'HIST-DAF-202607', type: 'Inflow (Collection)', amount: 22000.0, date: new Date('2026-07-16'), desc: 'July Bereavement Mutual Aid Inflow' },
    { fundId: 'fnd-death-01', ref: 'HIST-DAF-202607-OUT', type: 'Outflow (Disbursement)', amount: 10000.0, date: new Date('2026-07-29'), desc: 'July Bereavement Assistance Release' },

    // Foreign Assistance Fund (fnd-foreign-01)
    { fundId: 'fnd-foreign-01', ref: 'HIST-FAF-202605', type: 'Inflow (Collection)', amount: 12000.0, date: new Date('2026-05-08'), desc: 'May Foreign Solidarity Contribution' },
    { fundId: 'fnd-foreign-01', ref: 'HIST-FAF-202605-OUT', type: 'Outflow (Disbursement)', amount: 4000.0, date: new Date('2026-05-24'), desc: 'May Cross-Border Humanitarian Aid' },
    { fundId: 'fnd-foreign-01', ref: 'HIST-FAF-202606', type: 'Inflow (Collection)', amount: 15000.0, date: new Date('2026-06-06'), desc: 'June Foreign Solidarity Contribution' },
    { fundId: 'fnd-foreign-01', ref: 'HIST-FAF-202606-OUT', type: 'Outflow (Disbursement)', amount: 5000.0, date: new Date('2026-06-22'), desc: 'June International Partner Support' },
    { fundId: 'fnd-foreign-01', ref: 'HIST-FAF-202607', type: 'Inflow (Collection)', amount: 16000.0, date: new Date('2026-07-09'), desc: 'July Foreign Solidarity Contribution' },
    { fundId: 'fnd-foreign-01', ref: 'HIST-FAF-202607-OUT', type: 'Outflow (Disbursement)', amount: 6000.0, date: new Date('2026-07-25'), desc: 'July Cross-Border Grant Release' },

    // Loan Fund (fnd-loan-01)
    { fundId: 'fnd-loan-01', ref: 'HIST-LNF-202605', type: 'Inflow (Collection)', amount: 75000.0, date: new Date('2026-05-08'), desc: 'May Loan Amortization Collections' },
    { fundId: 'fnd-loan-01', ref: 'HIST-LNF-202605-OUT', type: 'Outflow (Disbursement)', amount: 45000.0, date: new Date('2026-05-20'), desc: 'May Member Micro-Financing Releases' },
    { fundId: 'fnd-loan-01', ref: 'HIST-LNF-202606', type: 'Inflow (Collection)', amount: 80000.0, date: new Date('2026-06-08'), desc: 'June Loan Amortization Collections' },
    { fundId: 'fnd-loan-01', ref: 'HIST-LNF-202606-OUT', type: 'Outflow (Disbursement)', amount: 50000.0, date: new Date('2026-06-24'), desc: 'June Multi-Purpose Loan Releases' },
    { fundId: 'fnd-loan-01', ref: 'HIST-LNF-202607', type: 'Inflow (Collection)', amount: 85000.0, date: new Date('2026-07-11'), desc: 'July Loan Amortization Collections' },
    { fundId: 'fnd-loan-01', ref: 'HIST-LNF-202607-OUT', type: 'Outflow (Disbursement)', amount: 55000.0, date: new Date('2026-07-25'), desc: 'July Emergency Member Loans' },
  ];

  for (const htx of historicalSeedTxs) {
    await prisma.fundTransaction.create({
      data: {
        fundId: htx.fundId,
        transactionRef: htx.ref,
        transactionType: htx.type,
        amount: new Prisma.Decimal(htx.amount),
        status: 'Posted',
        referenceType: htx.type.includes('Inflow') ? 'COLLECTION' : 'DISBURSEMENT',
        description: htx.desc,
        date: htx.date,
      },
    });
  }
  console.log(`✓ Seeded ${historicalSeedTxs.length} historical time-series posted transactions across 5 funds.`);

  // Reconcile dynamic balances in master Fund table
  // Each fund's currentBalance = openingBalance + inflows (collections, transfers in) - outflows (disbursements, transfers out)
  const funds = await prisma.fund.findMany({
    include: { transactions: true },
  });

  for (const fund of funds) {
    let calculatedBalance = 0;
    const hasOpeningBalanceTxn = fund.transactions.some(
      (t) => t.referenceType === 'OPENING_BALANCE' || t.transactionType === 'Opening Balance',
    );

    if (!hasOpeningBalanceTxn) {
      calculatedBalance += Number(fund.openingBalance);
    }

    for (const tx of fund.transactions) {
      const amount = Number(tx.amount);
      const type = tx.transactionType.toLowerCase();

      if (type.includes('inflow') || type.includes('collection') || type.includes('opening') || type.includes('transfer in')) {
        calculatedBalance += amount;
      } else if (type.includes('outflow') || type.includes('disbursement') || type.includes('transfer out')) {
        calculatedBalance -= amount;
      }
    }

    calculatedBalance = Math.max(0, calculatedBalance);

    await prisma.fund.update({
      where: { id: fund.id },
      data: { currentBalance: new Prisma.Decimal(calculatedBalance) },
    });

    // Also reconcile corresponding FundAccount table
    const pendingDisbursements = await prisma.disbursement.aggregate({
      where: {
        OR: [
          { fundId: fund.id },
          { fundSource: { equals: fund.name, mode: 'insensitive' } },
        ],
        status: { in: [DisbursementStatus.PENDING_APPROVAL, DisbursementStatus.APPROVED] },
      },
      _sum: { amount: true },
    });

    const reservedAmount = Number(pendingDisbursements._sum.amount || 0);
    const availableAmount = Math.max(0, calculatedBalance - reservedAmount);

    await prisma.fundAccount.update({
      where: { name: fund.name },
      data: {
        totalBalance: new Prisma.Decimal(calculatedBalance),
        availableBalance: new Prisma.Decimal(availableAmount),
        reservedBalance: new Prisma.Decimal(reservedAmount),
      },
    });

    console.log(`  • ${fund.name.padEnd(25)}: Total: ₱${calculatedBalance.toLocaleString('en-US', { minimumFractionDigits: 2 })} | Available: ₱${availableAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })} | Reserved: ₱${reservedAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}`);
  }

  console.log('\n====================================================');
  console.log('Database Seeding & Verification Completed Successfully!');
  console.log('====================================================');
}

main()
  .catch((e) => {
    console.error('CRITICAL ERROR DURING DATABASE SEEDING:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

