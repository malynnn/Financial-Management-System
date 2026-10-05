-- CreateEnum
CREATE TYPE "DisbursementType" AS ENUM ('LOAN_RELEASE', 'EXPENSE', 'OTHER_AUTHORIZED_RELEASE');

-- CreateEnum
CREATE TYPE "ChequeStatus" AS ENUM ('ISSUED', 'ENCASHED', 'CANCELLED_VOID');

-- AlterTable
ALTER TABLE "Disbursement" ADD COLUMN     "approvedLoanAmount" DECIMAL(12,2),
ADD COLUMN     "category" TEXT NOT NULL DEFAULT 'Loan Release',
ADD COLUMN     "createdById" TEXT,
ADD COLUMN     "purpose" TEXT,
ADD COLUMN     "supportingDocRef" TEXT,
ADD COLUMN     "type" "DisbursementType" NOT NULL DEFAULT 'LOAN_RELEASE',
ALTER COLUMN "memberId" DROP NOT NULL;

-- CreateTable
CREATE TABLE "ChequeRecord" (
    "id" TEXT NOT NULL,
    "disbursementId" TEXT NOT NULL,
    "chequeNumber" TEXT NOT NULL,
    "chequeDate" TIMESTAMP(3) NOT NULL,
    "payee" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "purpose" TEXT NOT NULL,
    "relatedRef" TEXT NOT NULL,
    "status" "ChequeStatus" NOT NULL DEFAULT 'ISSUED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ChequeRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DisbursementSequence" (
    "year" INTEGER NOT NULL,
    "last" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "DisbursementSequence_pkey" PRIMARY KEY ("year")
);

-- CreateIndex
CREATE UNIQUE INDEX "ChequeRecord_disbursementId_key" ON "ChequeRecord"("disbursementId");

-- CreateIndex
CREATE UNIQUE INDEX "ChequeRecord_chequeNumber_key" ON "ChequeRecord"("chequeNumber");

-- AddForeignKey
ALTER TABLE "Disbursement" ADD CONSTRAINT "Disbursement_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChequeRecord" ADD CONSTRAINT "ChequeRecord_disbursementId_fkey" FOREIGN KEY ("disbursementId") REFERENCES "Disbursement"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DisbursementAuditLog" ADD CONSTRAINT "DisbursementAuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
