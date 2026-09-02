/*
  Warnings:

  - A unique constraint covering the columns `[collectionRefNo]` on the table `Collection` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[disbursementRefNo]` on the table `Disbursement` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `beneficiaryName` to the `Disbursement` table without a default value. This is not possible if the table is not empty.
  - Added the required column `memberId` to the `Disbursement` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "DisbursementStatus" AS ENUM ('PENDING_APPROVAL', 'APPROVED', 'EXECUTED', 'REJECTED');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "CollectionStatus" ADD VALUE 'FOR_VERIFICATION';
ALTER TYPE "CollectionStatus" ADD VALUE 'VALIDATED';
ALTER TYPE "CollectionStatus" ADD VALUE 'POSTED';

-- DropForeignKey
ALTER TABLE "Disbursement" DROP CONSTRAINT "Disbursement_disbursedById_fkey";

-- AlterTable
ALTER TABLE "Collection" ADD COLUMN     "collectionRefNo" TEXT,
ADD COLUMN     "isReadyForReconciliation" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "reconciledAt" TIMESTAMP(3),
ADD COLUMN     "rejectReason" TEXT;

-- AlterTable
ALTER TABLE "Disbursement" ADD COLUMN     "beneficiaryAccount" TEXT,
ADD COLUMN     "beneficiaryBank" TEXT,
ADD COLUMN     "beneficiaryName" TEXT NOT NULL,
ADD COLUMN     "disbursementRefNo" TEXT,
ADD COLUMN     "executionRefNo" TEXT,
ADD COLUMN     "fundSource" TEXT NOT NULL DEFAULT 'General Fund',
ADD COLUMN     "isReadyForReconciliation" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "memberId" TEXT NOT NULL,
ADD COLUMN     "obligationId" TEXT,
ADD COLUMN     "paymentMethod" "PaymentMethod" NOT NULL DEFAULT 'BANK_TRANSFER',
ADD COLUMN     "reconciledAt" TIMESTAMP(3),
ADD COLUMN     "rejectionReason" TEXT,
ADD COLUMN     "status" "DisbursementStatus" NOT NULL DEFAULT 'PENDING_APPROVAL',
ALTER COLUMN "disbursedById" DROP NOT NULL;

-- CreateTable
CREATE TABLE "FinancialObligation" (
    "id" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "obligationType" TEXT NOT NULL,
    "originalAmount" DECIMAL(12,2) NOT NULL,
    "outstandingBalance" DECIMAL(12,2) NOT NULL,
    "dueDate" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'UNPAID',
    "loanStatus" TEXT DEFAULT 'Approved',
    "approvedAmount" DECIMAL(12,2),
    "disbursedAmount" DECIMAL(12,2) DEFAULT 0,
    "remainingLoanAmount" DECIMAL(12,2),
    "beneficiaryName" TEXT,
    "beneficiaryBank" TEXT,
    "beneficiaryAccount" TEXT,
    "fundSource" TEXT DEFAULT 'General Fund',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FinancialObligation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CollectionApplication" (
    "id" TEXT NOT NULL,
    "collectionId" TEXT NOT NULL,
    "obligationId" TEXT,
    "originalBalance" DECIMAL(12,2) NOT NULL,
    "appliedAmount" DECIMAL(12,2) NOT NULL,
    "remainingBalance" DECIMAL(12,2) NOT NULL,
    "exceptionStatus" TEXT NOT NULL,
    "appliedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CollectionApplication_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CollectionAuditLog" (
    "id" TEXT NOT NULL,
    "collectionId" TEXT NOT NULL,
    "userId" TEXT,
    "collectionRefNo" TEXT,
    "action" TEXT NOT NULL,
    "previousStatus" TEXT,
    "newStatus" TEXT,
    "actor" TEXT NOT NULL DEFAULT 'Treasurer',
    "role" TEXT NOT NULL DEFAULT 'Treasurer',
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "details" TEXT NOT NULL,

    CONSTRAINT "CollectionAuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FundAccount" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "totalBalance" DECIMAL(14,2) NOT NULL,
    "availableBalance" DECIMAL(14,2) NOT NULL,
    "reservedBalance" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FundAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DisbursementAuditLog" (
    "id" TEXT NOT NULL,
    "disbursementId" TEXT NOT NULL,
    "userId" TEXT,
    "disbursementRefNo" TEXT,
    "action" TEXT NOT NULL,
    "previousStatus" TEXT,
    "newStatus" TEXT,
    "actor" TEXT NOT NULL DEFAULT 'Treasurer',
    "role" TEXT NOT NULL DEFAULT 'Treasurer',
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "details" TEXT NOT NULL,

    CONSTRAINT "DisbursementAuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CollectionApplication_collectionId_key" ON "CollectionApplication"("collectionId");

-- CreateIndex
CREATE UNIQUE INDEX "FundAccount_name_key" ON "FundAccount"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Collection_collectionRefNo_key" ON "Collection"("collectionRefNo");

-- CreateIndex
CREATE UNIQUE INDEX "Disbursement_disbursementRefNo_key" ON "Disbursement"("disbursementRefNo");

-- AddForeignKey
ALTER TABLE "FinancialObligation" ADD CONSTRAINT "FinancialObligation_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CollectionApplication" ADD CONSTRAINT "CollectionApplication_collectionId_fkey" FOREIGN KEY ("collectionId") REFERENCES "Collection"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CollectionApplication" ADD CONSTRAINT "CollectionApplication_obligationId_fkey" FOREIGN KEY ("obligationId") REFERENCES "FinancialObligation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CollectionAuditLog" ADD CONSTRAINT "CollectionAuditLog_collectionId_fkey" FOREIGN KEY ("collectionId") REFERENCES "Collection"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Disbursement" ADD CONSTRAINT "Disbursement_disbursedById_fkey" FOREIGN KEY ("disbursedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Disbursement" ADD CONSTRAINT "Disbursement_obligationId_fkey" FOREIGN KEY ("obligationId") REFERENCES "FinancialObligation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DisbursementAuditLog" ADD CONSTRAINT "DisbursementAuditLog_disbursementId_fkey" FOREIGN KEY ("disbursementId") REFERENCES "Disbursement"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
