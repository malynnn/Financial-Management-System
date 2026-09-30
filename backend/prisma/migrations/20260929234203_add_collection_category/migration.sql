-- AlterTable
ALTER TABLE "Collection" ADD COLUMN     "collectionCategory" TEXT;

-- CreateTable
CREATE TABLE "ForecastRecord" (
    "id" TEXT NOT NULL,
    "batchId" TEXT NOT NULL,
    "fundId" TEXT NOT NULL,
    "fundCode" TEXT NOT NULL,
    "fundName" TEXT NOT NULL,
    "forecastPeriod" TEXT NOT NULL,
    "forecastValue" DECIMAL(14,2) NOT NULL,
    "projectedInflow" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "projectedOutflow" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "projectedNet" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "baselineBalance" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "trendDirection" TEXT NOT NULL DEFAULT 'STABLE',
    "isValid" BOOLEAN NOT NULL DEFAULT true,
    "generationDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ForecastRecord_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ForecastRecord_fundId_idx" ON "ForecastRecord"("fundId");

-- CreateIndex
CREATE INDEX "ForecastRecord_fundCode_idx" ON "ForecastRecord"("fundCode");

-- CreateIndex
CREATE INDEX "ForecastRecord_forecastPeriod_idx" ON "ForecastRecord"("forecastPeriod");

-- CreateIndex
CREATE INDEX "ForecastRecord_batchId_idx" ON "ForecastRecord"("batchId");

-- CreateIndex
CREATE INDEX "ForecastRecord_isValid_idx" ON "ForecastRecord"("isValid");

-- AddForeignKey
ALTER TABLE "ForecastRecord" ADD CONSTRAINT "ForecastRecord_fundId_fkey" FOREIGN KEY ("fundId") REFERENCES "Fund"("id") ON DELETE CASCADE ON UPDATE CASCADE;
