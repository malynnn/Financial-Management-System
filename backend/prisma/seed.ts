import { PrismaClient, Role, PaymentMethod, CollectionStatus, DisbursementStatus } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('--- Starting Database Seeding ---');

  const passwordHash = await bcrypt.hash('password123', 10);

  // 1. Seed Users
  const usersData = [
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
      id: 'usr-treasurer-1',
      name: 'Maria Santos',
      email: 'treasurer@fms.com',
      passwordHash,
      role: Role.TREASURER,
    },
    {
      id: 'usr-admin-1',
      name: 'Admin Officer',
      email: 'admin@fms.com',
      passwordHash,
      role: Role.ADMIN,
    },
    {
      id: 'usr-auditor-1',
      name: 'Audit Inspector',
      email: 'auditor@fms.com',
      passwordHash,
      role: Role.AUDITOR,
    },
  ];

  for (const u of usersData) {
    await prisma.user.upsert({
      where: { email: u.email },
      update: {
        id: u.id,
        name: u.name,
        passwordHash: u.passwordHash,
        role: u.role,
      },
      create: u,
    });
  }
  console.log('Seeded 5 Users.');

  // 2. Seed Fund Accounts
  const fundsData = [
    { name: 'General Fund', totalBalance: 500000.0, availableBalance: 450000.0, reservedBalance: 50000.0 },
    { name: 'Emergency Fund', totalBalance: 300000.0, availableBalance: 280000.0, reservedBalance: 20000.0 },
    { name: 'Educational Fund', totalBalance: 200000.0, availableBalance: 180000.0, reservedBalance: 20000.0 },
    { name: 'Calamity Fund', totalBalance: 250000.0, availableBalance: 250000.0, reservedBalance: 0.0 },
  ];

  for (const f of fundsData) {
    await prisma.fundAccount.upsert({
      where: { name: f.name },
      update: f,
      create: f,
    });
  }
  console.log('Seeded 4 Fund Accounts.');

  // 3. Seed Financial Obligations for Members
  const obligationsData = [
    {
      id: 'ob-juan-dues',
      memberId: 'usr-member-1',
      obligationType: 'Annual Dues',
      originalAmount: 1500.0,
      outstandingBalance: 1500.0,
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
      obligationType: 'Emergency Loan',
      originalAmount: 5000.0,
      outstandingBalance: 5000.0,
      dueDate: new Date('2026-10-15'),
      status: 'UNPAID',
      loanStatus: 'Approved',
      approvedAmount: 5000.0,
      disbursedAmount: 0.0,
      remainingLoanAmount: 5000.0,
      beneficiaryName: 'Juan Dela Cruz',
      beneficiaryBank: 'BDO',
      beneficiaryAccount: '00123456789',
      fundSource: 'Emergency Fund',
    },
    {
      id: 'ob-maria-dues',
      memberId: 'usr-member-2',
      obligationType: 'Annual Dues',
      originalAmount: 1500.0,
      outstandingBalance: 1500.0,
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
      obligationType: 'Educational Loan',
      originalAmount: 10000.0,
      outstandingBalance: 10000.0,
      dueDate: new Date('2026-11-30'),
      status: 'UNPAID',
      loanStatus: 'Approved',
      approvedAmount: 10000.0,
      disbursedAmount: 0.0,
      remainingLoanAmount: 10000.0,
      beneficiaryName: 'Maria Clara',
      beneficiaryBank: 'BPI',
      beneficiaryAccount: '98765432100',
      fundSource: 'Educational Fund',
    },
  ];

  for (const ob of obligationsData) {
    await prisma.financialObligation.upsert({
      where: { id: ob.id },
      update: ob,
      create: ob,
    });
  }
  console.log('Seeded 4 Financial Obligations.');

  // 4. Seed a Sample Baseline Collection in FOR_VERIFICATION state
  const existingCol = await prisma.collection.findFirst({
    where: {
      OR: [
        { id: 'col-sample-1' },
        { collectionRefNo: 'COL-2026-00001' },
        { paymentReference: 'GCASH-100200300' },
      ],
    },
  });

  if (!existingCol) {
    await prisma.collection.create({
      data: {
        id: 'col-sample-1',
        collectionRefNo: 'COL-2026-00001',
        memberId: 'usr-member-1',
        paymentAmount: 500.0,
        paymentDate: new Date('2026-09-01'),
        paymentMethod: PaymentMethod.GCASH,
        paymentReference: 'GCASH-100200300',
        description: 'Partial initial payment for Annual Dues',
        status: CollectionStatus.FOR_VERIFICATION,
        proofOfPaymentName: 'gcash_receipt_sample.png',
        proofOfPaymentPath: 'uploads/proofs/gcash_receipt_sample.png',
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
              details: 'Member submitted payment details for ₱500.00 via GCASH (Ref: GCASH-100200300).',
            },
            {
              userId: 'usr-member-1',
              collectionRefNo: 'COL-2026-00001',
              action: 'Proof of Payment Uploaded',
              previousStatus: CollectionStatus.PENDING,
              newStatus: CollectionStatus.FOR_VERIFICATION,
              actor: 'System',
              role: 'Automated',
              details: 'Proof of payment file "gcash_receipt_sample.png" was attached successfully.',
            },
          ],
        },
      },
    });
    console.log('Seeded Sample Collection for verification.');
  }

  // 5. Seed a Sample Baseline Disbursement Request in PENDING_APPROVAL state
  const existingDisb = await prisma.disbursement.findFirst({
    where: {
      OR: [
        { id: 'disb-sample-1' },
        { disbursementRefNo: 'REQ-2026-0001' },
      ],
    },
  });

  if (!existingDisb) {
    await prisma.disbursement.create({
      data: {
        id: 'disb-sample-1',
        disbursementRefNo: 'REQ-2026-0001',
        obligationId: 'ob-juan-loan',
        memberId: 'usr-member-1',
        amount: 5000.0,
        fundSource: 'Emergency Fund',
        paymentMethod: PaymentMethod.BANK_TRANSFER,
        beneficiaryName: 'Juan Dela Cruz',
        beneficiaryBank: 'BDO',
        beneficiaryAccount: '00123456789',
        description: 'Emergency assistance fund release request',
        status: DisbursementStatus.PENDING_APPROVAL,
        auditTrail: {
          create: {
            disbursementRefNo: 'REQ-2026-0001',
            action: 'Disbursement Requested',
            previousStatus: null,
            newStatus: DisbursementStatus.PENDING_APPROVAL,
            actor: 'Maria Santos',
            role: 'Treasurer',
            details: 'Requested disbursement of ₱5,000.00 for Emergency Loan via Bank Transfer.',
          },
        },
      },
    });
    console.log('Seeded Sample Disbursement.');
  }

  console.log('--- Database Seeding Completed Successfully! ---');
}

main()
  .catch((e) => {
    console.error('Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
