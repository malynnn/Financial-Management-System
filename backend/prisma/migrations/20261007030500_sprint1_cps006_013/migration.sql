-- AlterTable
ALTER TABLE "User" ADD COLUMN "isActive" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "FinancialObligation" ADD COLUMN "monthlyDeduction" DECIMAL(12,2);

-- CreateTable
CREATE TABLE "RemittanceBatch" (
    "id" TEXT NOT NULL,
    "batchRef" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "fileHash" TEXT NOT NULL,
    "payrollPeriod" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'UPLOADED',
    "totalLines" INTEGER NOT NULL,
    "totalAmount" DECIMAL(14,2) NOT NULL,
    "uploadedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RemittanceBatch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RemittanceLine" (
    "id" TEXT NOT NULL,
    "batchId" TEXT NOT NULL,
    "lineNo" INTEGER NOT NULL,
    "memberId" TEXT NOT NULL,
    "obligationId" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "matchStatus" TEXT NOT NULL DEFAULT 'PENDING',
    "matchReasons" TEXT[] DEFAULT ARRAY[]::TEXT[],

    CONSTRAINT "RemittanceLine_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "RemittanceBatch_batchRef_key" ON "RemittanceBatch"("batchRef");

-- CreateIndex
CREATE UNIQUE INDEX "RemittanceBatch_fileHash_key" ON "RemittanceBatch"("fileHash");

-- CreateIndex
CREATE INDEX "RemittanceLine_batchId_idx" ON "RemittanceLine"("batchId");

-- AddForeignKey
ALTER TABLE "RemittanceLine" ADD CONSTRAINT "RemittanceLine_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "RemittanceBatch"("id") ON DELETE CASCADE ON UPDATE CASCADE;
